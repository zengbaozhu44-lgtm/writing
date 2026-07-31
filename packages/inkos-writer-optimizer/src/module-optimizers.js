/**
 * Writer Optimizer V5 — 四模块独立优化器
 * Dialogue · Conflict · Description · Ending
 * 仅修改对应片段，禁止全文重写
 */
import {
  charCount,
  splitSentences,
  hasDialogue,
  hasConflictMarker,
  isEnvironmentSentence,
} from './utils.js';
import { analyzeDialogue } from './analyzers/dialogue.js';
import { analyzeConflictChain } from './analyzers/conflict-chain.js';
import { analyzeHookEnd } from './analyzers/hook-end.js';
import { extractPolishTail, POLISH_TAIL_MIN, POLISH_TAIL_MAX } from './auto-polish.js';

export const MODULE_OPTIMIZERS = ['dialogue', 'conflict', 'description', 'ending'];

const DIALOGUE_BLOCK_RE = /[「""『][^」""』\n]{2,}?[」""』]/g;
const MODULE_THRESHOLD = 72;

/** @returns {{ start: number, end: number, text: string }[]} */
export function extractDialogueRegions(text) {
  const body = String(text || '');
  const regions = [];
  let m;
  const re = new RegExp(DIALOGUE_BLOCK_RE.source, 'g');
  while ((m = re.exec(body)) !== null) {
    let start = m.index;
    let end = start + m[0].length;
    const tail = body.slice(end, end + 36);
    const attr = tail.match(/^[^。！？\n]{0,28}[说道问答喊低声冷冷道]./u);
    if (attr) end += attr[0].length;
    regions.push({ start, end, text: body.slice(start, end) });
  }
  return regions;
}

/** @returns {{ start: number, end: number, text: string }[]} */
export function extractConflictRegions(text) {
  const body = String(text || '');
  const sentences = splitSentences(body);
  if (!sentences.length) return [];

  const regions = [];
  let offset = 0;
  let run = [];
  let runStart = 0;

  const flush = () => {
    if (!run.length) return;
    const frag = run.join('');
    if (charCount(frag) >= 24) {
      regions.push({ start: runStart, end: runStart + frag.length, text: frag });
    }
    run = [];
  };

  for (const s of sentences) {
    const idx = body.indexOf(s, offset);
    const pos = idx >= 0 ? idx : offset;
    if (hasConflictMarker(s) || /对抗|威胁|必须|不得不|却|然而/u.test(s)) {
      if (!run.length) runStart = pos;
      run.push(s);
    } else {
      flush();
    }
    offset = pos + s.length;
  }
  flush();

  if (!regions.length && body.length > 80) {
    const mid = Math.floor(body.length * 0.35);
    const end = Math.min(body.length, mid + Math.floor(body.length * 0.35));
    regions.push({ start: mid, end, text: body.slice(mid, end) });
  }
  return regions.slice(0, 3);
}

/** @returns {{ start: number, end: number, text: string }[]} */
export function extractDescriptionRegions(text) {
  const body = String(text || '');
  const sentences = splitSentences(body);
  const regions = [];
  let offset = 0;
  let run = [];
  let runStart = 0;

  const flush = () => {
    if (!run.length) return;
    const frag = run.join('');
    if (charCount(frag) >= 30) {
      regions.push({ start: runStart, end: runStart + frag.length, text: frag });
    }
    run = [];
  };

  for (const s of sentences) {
    const idx = body.indexOf(s, offset);
    const pos = idx >= 0 ? idx : offset;
    if (isEnvironmentSentence(s)) {
      if (!run.length) runStart = pos;
      run.push(s);
    } else {
      flush();
    }
    offset = pos + s.length;
  }
  flush();
  return regions.slice(0, 2);
}

export function extractEndingRegion(text, { min = POLISH_TAIL_MIN, max = POLISH_TAIL_MAX } = {}) {
  const { prefix, tail, tailStart, tailChars } = extractPolishTail(text, { min, max });
  if (!tail.trim()) return null;
  return {
    start: tailStart,
    end: text.length,
    text: tail,
    prefixLen: prefix.length,
    tailChars,
  };
}

export function scoreModuleFragment(fragment, module, scene = {}, intent = {}) {
  const t = String(fragment || '');
  switch (module) {
    case 'dialogue':
      return analyzeDialogue(t).score;
    case 'conflict':
      return analyzeConflictChain(t, scene, intent).score;
    case 'description': {
      const sentences = splitSentences(t);
      const env = sentences.filter(isEnvironmentSentence).length;
      const ratio = env / Math.max(sentences.length, 1);
      let score = 55;
      if (ratio >= 0.5 && charCount(t) <= 180) score += 25;
      if (/光|声|味|触|冷|热|湿|风|影|气息/u.test(t)) score += 15;
      if (charCount(t) > 220) score -= 20;
      return Math.max(0, Math.min(100, score));
    }
    case 'ending':
      return analyzeHookEnd(t, scene).score;
    default:
      return 0;
  }
}

function replaceRegion(text, region, replacement) {
  return text.slice(0, region.start) + replacement + text.slice(region.end);
}

function optimizeDialogueFragment(fragment, scene = {}) {
  if (!fragment.trim()) return { text: fragment, edits: [] };
  const edits = [];
  let out = fragment;

  if (!/[？?！]/.test(out) && out.length > 12) {
    out = out.replace(/([」""』])([^。！？\n]*)$/, '$1$2？');
    edits.push('dialogue-question');
  }
  if (!/低声|冷冷|顿了顿|沉默|咬牙/u.test(out) && out.length > 20) {
    const pov = scene.pov || '他';
    out = out.replace(/([」""』])$/, `$1${pov}顿了顿。`);
    edits.push('dialogue-beat');
  }
  return { text: out, edits };
}

function optimizeConflictFragment(fragment, scene = {}, intent = {}) {
  if (!fragment.trim()) return { text: fragment, edits: [] };
  const edits = [];
  let out = fragment;
  const corpus = `${scene.conflict || ''} ${intent.mainGoal || ''}`;

  if (!hasConflictMarker(out)) {
    out = out.replace(/([。！])$/, '——局势却更紧了$1');
    edits.push('conflict-marker');
  }
  if (!/代价|失去|暴露|风险|来不及/u.test(out) && /却|然而/.test(out)) {
    out = out.replace(/([。！])$/, '，代价正在逼近$1');
    edits.push('conflict-cost');
  }
  if (scene.conflict && corpus.length > 4 && !out.includes(String(scene.conflict).slice(0, 4))) {
    const tail = out.trimEnd().replace(/[。！？?]$/, '');
    out = `${tail}——${String(scene.conflict).slice(0, 20)}。`;
    edits.push('conflict-scene-goal');
  }
  return { text: out, edits };
}

function optimizeDescriptionFragment(fragment) {
  if (!fragment.trim()) return { text: fragment, edits: [] };
  const edits = [];
  let out = fragment;
  const sentences = splitSentences(out);

  if (charCount(out) > 200 && sentences.length > 2) {
    out = sentences.slice(0, 2).join('');
    edits.push('description-trim');
  }
  if (!/光|声|味|触|冷|热|湿|风|影|气息|指尖|呼吸/u.test(out)) {
    out = out.replace(/([。！])$/, '，空气里有一股说不清的凉意$1');
    edits.push('description-sensory');
  }
  return { text: out, edits };
}

function optimizeEndingFragment(fragment, scene = {}) {
  if (!fragment.trim()) return { text: fragment, edits: [] };
  const edits = [];
  let out = fragment.trimEnd();
  const tail = out.replace(/\s/g, '').slice(-120);

  if (!/[？?]|吗|呢|能否|到底|究竟/u.test(tail)) {
    if (/[。！]$/.test(out)) out = out.replace(/[。！]$/, '？');
    else out += '——下一步该怎么走？';
    edits.push('ending-hook');
  }
  if (!/却|然而|突然|声音|门|抉择/u.test(tail)) {
    out = out.replace(/([。！？?])$/, '，而变数正在靠近$1');
    edits.push('ending-suspense');
  }
  if (scene.goal && !out.includes(String(scene.goal).slice(0, 4))) {
    edits.push('ending-goal-echo');
  }
  return { text: out, edits };
}

const RULE_OPTIMIZERS = {
  dialogue: optimizeDialogueFragment,
  conflict: optimizeConflictFragment,
  description: optimizeDescriptionFragment,
  ending: optimizeEndingFragment,
};

export function buildModuleInstructions(module, scoreBefore, scene = {}, intent = {}) {
  const lines = [
    `【${module} Optimizer】仅改写下方片段，禁止全文重写`,
    `Scene 目标：${scene.goal || '—'}`,
    `当前模块评分：${scoreBefore}/100`,
    '禁止改变剧情事实、人物关系、事件结果',
    '只输出优化后的片段正文，不要解释',
  ];
  if (module === 'dialogue') lines.push('强化对白张力、潜台词与节奏，可加简短动作描写');
  if (module === 'conflict') lines.push('抬升冲突层级：目标→阻碍→升级→代价');
  if (module === 'description') lines.push('精简环境描写，加入 1 处感官细节，避免说明腔');
  if (module === 'ending') lines.push('结尾留悬念/未完成动作，避免平收');
  if (intent.pov) lines.push(`POV：${intent.pov}`);
  return lines.join('\n');
}

async function optimizeModule({
  text,
  module,
  scene,
  intent,
  polishFn,
  threshold = MODULE_THRESHOLD,
}) {
  let region = null;
  let regions = [];

  if (module === 'ending') {
    region = extractEndingRegion(text);
    if (!region) {
      const fb = scoreModuleFragment(text.slice(-120), module, scene, intent);
      return { text, changed: false, skipped: true, scoreBefore: fb, scoreAfter: fb, region: null, edits: [], mode: 'skip' };
    }
    regions = [region];
  } else if (module === 'dialogue') {
    regions = extractDialogueRegions(text);
    if (!regions.length) {
      const fb = scoreModuleFragment('', module, scene, intent);
      return { text, changed: false, skipped: true, scoreBefore: fb, scoreAfter: fb, region: null, edits: [], mode: 'skip' };
    }
    region = regions.reduce((best, r) => {
      const s = scoreModuleFragment(r.text, module, scene, intent);
      return !best || s < best.score ? { ...r, score: s } : best;
    }, null);
  } else if (module === 'conflict') {
    regions = extractConflictRegions(text);
    if (!regions.length) {
      const fb = scoreModuleFragment(text.slice(Math.floor(text.length * 0.35), Math.floor(text.length * 0.65)), module, scene, intent);
      return { text, changed: false, skipped: true, scoreBefore: fb, scoreAfter: fb, region: null, edits: [], mode: 'skip' };
    }
    region = regions[0];
  } else if (module === 'description') {
    regions = extractDescriptionRegions(text);
    if (!regions.length) {
      const sentences = splitSentences(text);
      const fallbackText = sentences.slice(0, 2).join('') || text.slice(0, 120);
      const fb = scoreModuleFragment(fallbackText, module, scene, intent);
      return { text, changed: false, skipped: true, scoreBefore: fb, scoreAfter: fb, region: null, edits: [], mode: 'skip' };
    }
    region = regions[0];
  }

  const scoreBefore = scoreModuleFragment(region.text, module, scene, intent);
  if (scoreBefore >= threshold) {
    return {
      text,
      changed: false,
      skipped: true,
      scoreBefore,
      scoreAfter: scoreBefore,
      region: { start: region.start, end: region.end, chars: charCount(region.text) },
      edits: [],
    };
  }

  const ruleFn = RULE_OPTIMIZERS[module];
  const ruleResult = module === 'description'
    ? ruleFn(region.text)
    : ruleFn(region.text, scene, intent);
  let optimized = ruleResult.text;
  let edits = ruleResult.edits || [];
  let mode = 'rule';

  if (typeof polishFn === 'function') {
    try {
      const instructions = buildModuleInstructions(module, scoreBefore, scene, intent);
      const llmOut = await polishFn(module, region.text, instructions, { scene, intent, scoreBefore });
      const cleaned = String(llmOut || '').trim();
      if (cleaned && charCount(cleaned) >= Math.min(40, charCount(region.text) * 0.45)) {
        optimized = cleaned;
        mode = 'rule+llm';
        edits = [...edits, 'llm'];
      }
    } catch {
      /* 规则结果兜底 */
    }
  }

  const nextText = replaceRegion(text, region, optimized);
  const newRegionText = nextText.slice(region.start, region.start + optimized.length);
  const scoreAfter = scoreModuleFragment(newRegionText, module, scene, intent);

  return {
    text: nextText,
    changed: optimized !== region.text,
    skipped: false,
    scoreBefore,
    scoreAfter,
    mode,
    region: { start: region.start, end: region.end, chars: charCount(region.text) },
    edits,
  };
}

/**
 * 四模块顺序优化 — Ending → Conflict → Dialogue → Description（由后向前减少索引漂移）
 */
export async function runModuleOptimizers({
  text,
  scene = {},
  intent = {},
  polishFn = null,
  threshold = MODULE_THRESHOLD,
} = {}) {
  const draft = String(text || '').trim();
  let current = draft;
  const modules = {};
  const order = ['description', 'dialogue', 'conflict', 'ending'];

  for (const key of order) {
    const result = await optimizeModule({
      text: current,
      module: key,
      scene,
      intent,
      polishFn,
      threshold,
    });
    current = result.text;
    modules[key] = {
      scoreBefore: result.scoreBefore,
      scoreAfter: result.scoreAfter,
      changed: result.changed,
      skipped: result.skipped,
      mode: result.mode || (result.skipped ? 'skip' : 'rule'),
      region: result.region || null,
      edits: result.edits || [],
    };
  }

  return {
    draft,
    polished: current,
    text: current,
    changed: current !== draft,
    modules,
  };
}
