/**
 * Continuation Engine — 上一 Scene 尾部 + 情绪摘要作为续写锚点
 */
const MIN_ANCHOR = 200;
const MAX_ANCHOR = 500;

function inferEmotionHint(text = '') {
  const t = String(text || '');
  if (/喘|汗|颤|冰|死寂|不敢/.test(t)) return '窒息的紧绷';
  if (/笑|松|暖/.test(t)) return '短暂的松弛（随时会被撕开）';
  if (/停|愣|盯|沉默/.test(t)) return '被钉住的停顿';
  if (/跑|冲|追/.test(t)) return '还未落定的奔跑感';
  return '未安放的不安';
}

function inferBodyHint(text = '') {
  const t = String(text || '');
  if (/手|掌|指/.test(t) && /汗|颤|凉|紧/.test(t)) return '手心发紧/发凉，却仍强迫动作稳定';
  if (/背|颈|肩/.test(t)) return '肩背发僵，呼吸压得很浅';
  return '身体尽量显稳，细节会泄露紧绷';
}

function charLen(s) {
  return String(s || '').replace(/\s/g, '').length;
}

export function extractContinuationAnchor(prevText, { min = MIN_ANCHOR, max = MAX_ANCHOR } = {}) {
  const raw = String(prevText || '').trim();
  if (!raw) return { anchor: '', chars: 0, hasPrev: false };

  const paragraphs = raw.split(/\n{2,}/).filter(Boolean);
  let chunk = paragraphs[paragraphs.length - 1] || raw;
  if (charLen(chunk) < min && paragraphs.length > 1) {
    chunk = paragraphs.slice(-2).join('\n\n');
  }
  while (charLen(chunk) > max && chunk.length > max) {
    chunk = chunk.slice(-max);
  }
  if (charLen(chunk) > max) {
    chunk = chunk.slice(Math.floor(chunk.length * 0.4));
  }
  return { anchor: chunk.trim(), chars: charLen(chunk), hasPrev: true };
}

export function buildContinuationBlock({ scene, intent, scenes = [], chapter = 1 } = {}) {
  const idx = scene?.index ?? 1;
  if (idx <= 1) {
    const ch1Open = chapter === 1
      ? '前 300 字内必须出现异常事件或冲突；先发生事情，再解释原因。'
      : '章首 300 字内须出现事件、冲突或异常信号。';
    return {
      block: [
        '## 续写锚点',
        `本章第一个 Scene：${ch1Open}`,
        '禁止开篇：背景介绍、世界观、人物履历、环境铺陈。',
        '正确顺序：动作/异常先行 → 角色反应 → 必要时才补原因。',
        '仍禁止冗长背景综述与重复性主角介绍。',
      ].join('\n'),
      anchor: null,
    };
  }

  const prev = scenes.find((s) => s.index === idx - 1) || intent?.scenes?.find((s) => s.index === idx - 1);
  const prevText = prev?.text || '';
  const { anchor, chars, hasPrev } = extractContinuationAnchor(prevText);

  if (!hasPrev || !anchor) {
    return {
      block: [
        '## 续写锚点',
        '上一 Scene 尚无正文缓存：从本 Scene Start 自然进入，禁止重新介绍主角、禁止重新开篇。',
      ].join('\n'),
      anchor: null,
    };
  }

  const emotion = inferEmotionHint(anchor);
  const body = inferBodyHint(anchor);

  return {
    block: [
      '## 前文情绪锚定（必须承接）',
      `- 上一 Scene 结尾情绪：「${emotion}」`,
      `- 角色身体状态：${body}`,
      `- 环境余韵（上一 Scene 末尾约 ${chars} 字）：`,
      '---',
      anchor,
      '---',
      '- 从上述情绪与段落**紧接**续写；不要重新介绍主角，不要时间回溯，不要另起新篇。',
      '- 下一 Scene 须把情绪往前推（更深的恐惧 / 试探性同盟 / 短暂希望被撕开），不要原地复读事实。',
    ].join('\n'),
    anchor,
    emotion,
  };
}
