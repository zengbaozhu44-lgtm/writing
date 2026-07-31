/**
 * 段落/句子节奏类型分类
 */
import {
  charCount,
  hasAction,
  hasDialogue,
  hasEvent,
  hasConflictMarker,
  isLoreSentence,
  isEnvironmentSentence,
  splitSentences,
} from '../src/utils.js';

const PSYCH_RE = /想|心想|觉得|感到|意识到|回忆|脑海|心里|内心|情绪|犹豫|纠结|不安|暗想|琢磨|盘算/u;
const EXPLAIN_RE = /意味着|因此|所以|换句话说|所谓|指的是|本质上|由此可见|这意味着|也就是说|总之|综上/u;
const HOOK_RE = /[？?]|吗[？?]?$|呢[？?]?$|能否|到底|究竟|要不要|沉默|抉择|愣住|还是/u;

export const BEAT_TYPES = ['action', 'dialogue', 'conflict', 'explanation', 'hook', 'psychology', 'setting', 'exposition', 'event'];

export function isPsychologySentence(sentence) {
  if (hasDialogue(sentence) || hasAction(sentence)) return false;
  return PSYCH_RE.test(sentence);
}

export function isSettingSentence(sentence) {
  if (hasDialogue(sentence)) return false;
  return isEnvironmentSentence(sentence) || isLoreSentence(sentence)
    || /世界观|设定|背景|系统|规则|机制|协议|算法/u.test(sentence);
}

export function isExplanationSentence(sentence) {
  if (hasDialogue(sentence) || hasAction(sentence)) return false;
  return EXPLAIN_RE.test(sentence) || isLoreSentence(sentence);
}

export function isExpositionOnly(sentence) {
  if (hasDialogue(sentence) || hasAction(sentence) || hasEvent(sentence) || hasConflictMarker(sentence)) {
    return false;
  }
  return !isPsychologySentence(sentence) && !isSettingSentence(sentence);
}

export function classifySentence(sentence, { isLast = false } = {}) {
  if (isLast && HOOK_RE.test(sentence)) return 'hook';
  if (hasDialogue(sentence)) return 'dialogue';
  if (hasAction(sentence)) return 'action';
  if (hasConflictMarker(sentence)) return 'conflict';
  if (isExplanationSentence(sentence)) return 'explanation';
  if (isPsychologySentence(sentence)) return 'psychology';
  if (isSettingSentence(sentence)) return 'setting';
  if (hasEvent(sentence)) return 'event';
  if (isExpositionOnly(sentence)) return 'exposition';
  return 'exposition';
}

/** 按段落切分并标注主 beat */
export function segmentParagraphs(text) {
  const paras = String(text || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (!paras.length && text?.trim()) paras.push(text.trim());

  return paras.map((para, i) => {
    const sentences = splitSentences(para);
    const types = sentences.map((s, si) => classifySentence(s, { isLast: i === paras.length - 1 && si === sentences.length - 1 }));
    const primary = pickPrimaryBeat(types);
    return {
      index: i,
      text: para,
      charCount: charCount(para),
      sentences: sentences.length,
      types,
      beat: primary,
    };
  });
}

function pickPrimaryBeat(types) {
  const order = ['dialogue', 'action', 'conflict', 'hook', 'explanation', 'psychology', 'setting', 'event', 'exposition'];
  for (const t of order) {
    if (types.includes(t)) return t;
  }
  return types[0] || 'exposition';
}

export function longestTypedRun(sentences, predicate) {
  let best = 0;
  let cur = 0;
  for (const s of sentences) {
    if (predicate(s)) {
      cur += charCount(s);
      best = Math.max(best, cur);
    } else {
      cur = 0;
    }
  }
  return best;
}
