import { charCount, splitSentences, hasDialogue, hasConflictMarker, hasAction } from './utils.js';

export const POLISH_TAIL_MIN = 300;
export const POLISH_TAIL_MAX = 500;

const HOOK_ENDINGS = [
  '——他还没想好下一步。',
  '——而答案，似乎还藏在更暗的地方。',
  '——这一次，他还能赌吗？',
  '——门在身后合上，退路断了。',
];

/**
 * 提取可润色尾部（300~500 字，不含空白）
 */
export function extractPolishTail(text, { min = POLISH_TAIL_MIN, max = POLISH_TAIL_MAX } = {}) {
  const body = String(text || '');
  const compactLen = charCount(body);
  if (compactLen <= min) {
    return { prefix: '', tail: body, tailStart: 0, tailChars: compactLen };
  }

  let tailChars = 0;
  let i = body.length;
  while (i > 0 && tailChars < max) {
    i -= 1;
    if (!/\s/.test(body[i])) tailChars += 1;
  }

  while (i > 0 && tailChars < min) {
    i -= 1;
    if (!/\s/.test(body[i])) tailChars += 1;
  }

  const prefix = body.slice(0, i);
  const tail = body.slice(i);
  return { prefix, tail, tailStart: i, tailChars: charCount(tail) };
}

export function buildPolishInstructions(scores = {}, weakest = [], scene = {}) {
  const weak = weakest.length
    ? weakest
    : Object.entries(scores).map(([id, score]) => ({ id, score })).sort((a, b) => a.score - b.score).slice(0, 3);

  const targets = new Set(weak.filter((w) => w.score < 78).map((w) => w.id));
  const lines = [
    '局部润色（仅结尾 300~500 字）',
    `Scene 目标：${scene.goal || '—'}`,
    '',
    '允许修改：结尾、高潮、Hook、过渡、对白',
    '禁止：全文重写、改变剧情事实、改变人物关系',
    '',
    '薄弱维度：',
  ];

  for (const w of weak.slice(0, 4)) {
    lines.push(`- ${w.id}: ${w.score}/100`);
  }

  lines.push('', '润色要点：');
  if (targets.has('hook')) lines.push('- 结尾留悬念或未完成动作，避免平收');
  if (targets.has('climax')) lines.push('- 后段抬升张力，加入可见代价或升级');
  if (targets.has('pacing')) lines.push('- 打断长说明，插入动作或对白');
  if (targets.has('commercialPleasure')) lines.push('- 加入小反转、爽点或压迫释放');
  if (targets.has('dialogue')) lines.push('- 用一句对白推进冲突，而非纯叙述');
  if (targets.has('infoRelease')) lines.push('- 信息点到为止，不要连续解释');
  if (targets.has('styleConsistency')) lines.push('- 短句、硬切、身体先行');
  if (targets.has('characterConsistency')) lines.push('- 保持 POV 限知，人物反应一致');

  return lines.join('\n');
}

function polishHookTail(tail) {
  const trimmed = tail.trimEnd();
  const last = trimmed.slice(-80);
  if (/[？?]$/.test(trimmed) || /吗[？?]?$|呢[？?]?$|能否|会不会|到底|究竟/u.test(last)) {
    return tail;
  }
  if (/[。！]$/.test(trimmed)) {
    return trimmed.replace(/[。！]$/, '？') + '\n';
  }
  const ending = HOOK_ENDINGS[Math.floor(Math.random() * HOOK_ENDINGS.length)];
  return `${trimmed}${ending}\n`;
}

function polishClimaxTail(tail) {
  const sentences = splitSentences(tail);
  if (!sentences.length) return tail;
  const last = sentences[sentences.length - 1];
  if (hasConflictMarker(last) && hasAction(last)) return tail;
  if (/却|然而|突然|猛地|一沉|一紧/u.test(last)) return tail;
  sentences[sentences.length - 1] = last.replace(/[。！？?]$/, '') + '——局势骤然收紧。';
  return sentences.join('');
}

function polishPacingTail(tail) {
  const sentences = splitSentences(tail);
  const out = sentences.map((s) => {
    if (charCount(s) > 45 && !hasDialogue(s)) {
      const mid = Math.floor(s.length / 2);
      const punct = s.search(/[，,；;]/);
      if (punct > 10 && punct < s.length - 8) {
        return `${s.slice(0, punct + 1)}${s.slice(punct + 1).trimStart()}`;
      }
    }
    return s;
  });
  return out.join('');
}

function polishDialogueTail(tail, scene = {}) {
  if (hasDialogue(tail)) return tail;
  const pov = scene.pov || '他';
  const sentences = splitSentences(tail);
  if (sentences.length < 2) return tail;
  const last = sentences[sentences.length - 1].replace(/[。！？?]$/, '');
  if (last.length < 8) return tail;
  sentences[sentences.length - 1] = `「${last.slice(0, 24)}……」${pov}低声说。`;
  return sentences.join('');
}

function polishCommercialTail(tail) {
  if (/却|然而|没想到|突然|一沉|一紧/u.test(tail.slice(-120))) return tail;
  const sentences = splitSentences(tail);
  if (!sentences.length) return tail;
  const last = sentences[sentences.length - 1];
  sentences[sentences.length - 1] = last.replace(/[。！？?]$/, '') + '——却在这时出了变数。';
  return sentences.join('');
}

function polishTransitionTail(tail) {
  if (/^\s*[\n]/m.test(tail) || tail.startsWith('\n')) return tail;
  const sentences = splitSentences(tail);
  if (sentences.length <= 2) return `\n${tail.trimStart()}`;
  const head = sentences.slice(0, -2).join('');
  const rest = sentences.slice(-2).join('');
  return `${head}\n\n${rest}`;
}

/**
 * 规则 Auto Polish — 仅尾部 300~500 字
 */
export function applyRuleAutoPolish(text, { scores = {}, weakest = [], scene = {} } = {}) {
  const { prefix, tail, tailStart, tailChars } = extractPolishTail(text);
  if (!tail.trim()) {
    return {
      text,
      polished: text,
      changed: false,
      tailRegion: { tailStart, tailChars, prefixLen: prefix.length },
      edits: [],
    };
  }

  const weakIds = new Set(
    (weakest.length ? weakest : Object.entries(scores).map(([id, score]) => ({ id, score })))
      .filter((w) => w.score < 78)
      .map((w) => w.id),
  );

  let polishedTail = tail;
  const edits = [];

  if (weakIds.has('pacing') || weakIds.has('infoRelease')) {
    const next = polishPacingTail(polishedTail);
    if (next !== polishedTail) { edits.push('pacing'); polishedTail = next; }
  }
  if (weakIds.has('climax')) {
    const next = polishClimaxTail(polishedTail);
    if (next !== polishedTail) { edits.push('climax'); polishedTail = next; }
  }
  if (weakIds.has('commercialPleasure')) {
    const next = polishCommercialTail(polishedTail);
    if (next !== polishedTail) { edits.push('commercialPleasure'); polishedTail = next; }
  }
  if (weakIds.has('dialogue')) {
    const next = polishDialogueTail(polishedTail, scene);
    if (next !== polishedTail) { edits.push('dialogue'); polishedTail = next; }
  }
  if (weakIds.has('hook') || weakIds.has('climax')) {
    const next = polishHookTail(polishedTail);
    if (next !== polishedTail) { edits.push('hook'); polishedTail = next; }
  }
  if (weakIds.has('pacing') || weakIds.has('styleConsistency')) {
    const next = polishTransitionTail(polishedTail);
    if (next !== polishedTail) { edits.push('transition'); polishedTail = next; }
  }

  const polished = `${prefix}${polishedTail}`;
  return {
    text: polished,
    polished,
    draft: text,
    changed: polished !== text,
    tailRegion: { tailStart, tailChars, prefixLen: prefix.length },
    edits,
  };
}

/**
 * Auto Polish — 规则 + 可选 LLM 尾部润色
 */
export async function runAutoPolish({
  text,
  scores = {},
  weakest = [],
  scene = {},
  intent = {},
  instructions = '',
  polishFn = null,
} = {}) {
  const ruleResult = applyRuleAutoPolish(text, { scores, weakest, scene });
  let polished = ruleResult.polished;
  let polishMode = 'rule';
  const edits = [...ruleResult.edits];

  if (typeof polishFn === 'function') {
    const { prefix, tail } = extractPolishTail(polished);
    try {
      const llmTail = await polishFn(tail, instructions, { scene, intent, scores });
      const cleaned = String(llmTail || '').trim();
      if (cleaned && charCount(cleaned) >= Math.min(80, charCount(tail) * 0.5)) {
        polished = `${prefix}${cleaned}`;
        polishMode = 'rule+llm';
        edits.push('llm-tail');
      }
    } catch {
      /* 规则结果兜底，不阻塞 */
    }
  }

  return {
    draft: text,
    polished,
    text: polished,
    changed: polished !== text,
    polishMode,
    edits,
    tailRegion: ruleResult.tailRegion,
    instructions,
  };
}
