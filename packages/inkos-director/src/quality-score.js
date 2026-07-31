/**
 * Scene Review 商业导演评分 — Reader Addiction 维度 + 对白/冲突辅助
 */
import { analyzePacing } from '../pacing/analyzer.js';
import { analyzeSceneReaderCurves } from './reader-curve.js';
import {
  charCount,
  splitCheckpoints,
  splitSentences,
  hasEvent,
  hasConflictMarker,
  hasEscalation,
  hasAction,
  longestRun,
  isEnvironmentSentence,
  isLoreSentence,
} from './utils.js';
import {
  resolveReviewWeights,
  computeWeightedScore,
} from './genre-weights.js';

export const REVIEW_PASS_MIN = 80;
export const REVIEW_WARNING_MIN = 70;

/** 商业小说导演主维度 */
export const COMMERCIAL_REVIEW_DIMENSIONS = [
  'hookDensity',
  'questionDensity',
  'payoffDensity',
  'readerCuriosity',
  'twistStrength',
];

/** 辅助维度 */
export const SUPPORT_REVIEW_DIMENSIONS = ['dialogue', 'conflict'];

export const REVIEW_DIMENSIONS = [
  ...COMMERCIAL_REVIEW_DIMENSIONS,
  ...SUPPORT_REVIEW_DIMENSIONS,
];

const DIALOGUE_RE = /[「""『][^」""』\n]{2,}?[」""』]/g;
const HOOK_TAIL_RE = /[？?]|吗[？?]?$|呢[？?]?$|能否|会不会|到底|究竟|要不要|难道/u;
const QUESTION_RE = /[？?]|谁|什么|为什么|为何|怎么|如何|能否|会不会|到底|究竟|难道/u;
const PAYOFF_RE = /原来|终于|意味着|证实|揭晓|兑现|呼应|回收|答案|真相|明白了|难怪/u;
const TWIST_RE = /却|然而|没想到|竟然|居然|反而|竟是|反转|翻盘|反杀|身份/u;
const CURIOSITY_RE = /想知道|忍不住|必须知道|到底|究竟|怎么办|选哪|来不及|来不及|危险|代价/u;
const EMOTIONS = [
  { name: '怒', re: /怒|愤|火|咬牙|攥拳/u },
  { name: '惧', re: /惧|怕|恐|慌|紧张|发冷/u },
  { name: '悲', re: /悲伤|伤心|失落|灰心|沮丧|沉沉/u },
  { name: '喜', re: /喜|笑|松|轻/u },
  { name: '疑', re: /疑|惑|犹豫|迟疑/u },
  { name: '焦', re: /焦|急|躁|等不及/u },
];

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function markerDensity(text, re, { base = 40, perHit = 12, windowBonus = 18 } = {}) {
  const len = Math.max(charCount(text), 1);
  const hits = (text.match(new RegExp(re.source, 'gu')) || []).length;
  const windows = splitCheckpoints(text, 450);
  const windowHits = windows.filter((w) => re.test(w.text)).length;
  let score = base + (hits / len) * 500 * perHit + (windowHits / Math.max(windows.length, 1)) * windowBonus;
  return clamp(score);
}

/** Hook Density — 全文钩子密度 + 章尾峰值 */
export function scoreHookDensity(text) {
  const curves = analyzeSceneReaderCurves(text);
  const tail = String(text || '').replace(/\s/g, '').slice(-120);
  let score = curves.summary.hookAvg;
  if (HOOK_TAIL_RE.test(tail)) score += 14;
  if (hasAction(tail.slice(-50))) score += 6;
  if (/[。！]$/.test(tail) && !/[？?]/.test(tail.slice(-30))) score -= 10;
  return {
    score: clamp(score),
    metrics: { hookAvg: curves.summary.hookAvg, tailHook: HOOK_TAIL_RE.test(tail) },
    readerCurves: curves,
  };
}

/** Question Density — 疑问与悬念密度 */
export function scoreQuestionDensity(text) {
  const score = markerDensity(text, QUESTION_RE, { base: 38, perHit: 14, windowBonus: 20 });
  const tail = String(text || '').slice(-100);
  const tailBonus = QUESTION_RE.test(tail) ? 12 : 0;
  return { score: clamp(score + tailBonus), metrics: { tailQuestion: tailBonus > 0 } };
}

/** Payoff Density — 伏笔回收与信息兑现 */
export function scorePayoffDensity(text) {
  const score = markerDensity(text, PAYOFF_RE, { base: 36, perHit: 16, windowBonus: 16 });
  const hasReveal = /发现|看出|意识到|证实|确认/u.test(text);
  return { score: clamp(score + (hasReveal ? 10 : 0)), metrics: { hasReveal } };
}

/** Reader Curiosity — 阅读驱动力 */
export function scoreReaderCuriosity(text, scene = {}, intent = {}) {
  const len = charCount(text);
  let score = markerDensity(text, CURIOSITY_RE, { base: 42, perHit: 10, windowBonus: 22 });
  const tail = String(text || '').replace(/\s/g, '').slice(-100);
  if (HOOK_TAIL_RE.test(tail)) score += 12;
  if (hasEscalation(text)) score += 10;
  if (hasConflictMarker(`${text} ${scene.goal || ''} ${intent.mainGoal || ''}`)) score += 8;
  if (len > 300 && !QUESTION_RE.test(tail) && !hasAction(tail)) score -= 12;
  const pacing = analyzePacing(text, scene, intent);
  if (pacing.beats?.sequenceMatched) score += 8;
  return {
    score: clamp(score),
    metrics: { tailCuriosity: HOOK_TAIL_RE.test(tail), sequenceMatched: Boolean(pacing.beats?.sequenceMatched) },
  };
}

/** Twist Strength — 反转力度 */
export function scoreTwistStrength(text) {
  const hits = (text.match(new RegExp(TWIST_RE.source, 'gu')) || []).length;
  const windows = splitCheckpoints(text, 400);
  const windowHits = windows.filter((w) => TWIST_RE.test(w.text)).length;
  let score = 40 + hits * 9 + (windowHits / Math.max(windows.length, 1)) * 24;
  const sentences = splitSentences(text);
  const midTwist = sentences.slice(Math.floor(sentences.length / 3)).some((s) => TWIST_RE.test(s));
  if (midTwist) score += 12;
  return { score: clamp(score), metrics: { twistHits: hits, windowHits } };
}

/** Dialogue — 对白密度（辅助） */
export function scoreDialogue(text) {
  const len = charCount(text);
  if (len < 80) return { score: 70, metrics: { dialogueBlocks: 0, density: 0 } };

  const blocks = (text.match(DIALOGUE_RE) || []).length
    + (text.match(/[\u4e00-\u9fa5]{2,4}(?:说|问|道|喊|叫|低声|沉声|开口)[：:]/g) || []).length;

  const per500 = (blocks / Math.max(len, 1)) * 500;
  let score = 45 + per500 * 28;
  if (blocks === 0) score = Math.max(35, 55 - len / 40);
  if (blocks >= 2) score = Math.min(100, score + 10);

  return { score: clamp(score), metrics: { dialogueBlocks: blocks, density: per500 } };
}

/** Conflict — 冲突张力（辅助） */
export function scoreConflict(text, scene = {}, intent = {}) {
  const corpus = `${text} ${scene.goal || ''} ${scene.conflict || ''} ${intent.mainGoal || ''}`;
  let score = 40;
  if (hasConflictMarker(text)) score += 22;
  if (hasEscalation(text)) score += 18;
  if (hasEvent(text)) score += 12;
  if (hasConflictMarker(corpus)) score += 8;
  const windows = splitCheckpoints(text, 500);
  const windowHits = windows.filter((w) => hasConflictMarker(w.text) || hasEscalation(w.text)).length;
  if (windows.length > 1) score += clamp((windowHits / windows.length) * 20, 0, 20);
  return { score: clamp(score), metrics: { windowHits, windows: windows.length } };
}

/** @deprecated 使用 scoreHookDensity */
export function scoreHook(text) {
  const r = scoreHookDensity(text);
  return { score: r.score, metrics: r.metrics };
}

/** @deprecated */
export function scoreEmotion(text) {
  const hits = EMOTIONS.filter((e) => e.re.test(text)).map((e) => e.name);
  let score = 38 + hits.length * 14;
  if (hits.length >= 2) score += 10;
  return { score: clamp(score), metrics: { emotions: hits } };
}

/** @deprecated */
export function scoreStyle(text) {
  const len = charCount(text);
  if (len < 40) return { score: 65, metrics: {} };
  let score = 58;
  const opening = text.replace(/\s/g, '').slice(0, 300);
  if (hasEvent(opening)) score += 14;
  const sentences = splitSentences(text);
  score -= clamp(longestRun(sentences, isEnvironmentSentence) / 15, 0, 22);
  score -= clamp(Math.max(0, longestRun(sentences, isLoreSentence) - 120) / 12, 0, 25);
  return { score: clamp(score), metrics: {} };
}

/** @deprecated */
export function scorePacing(text, scene = {}, intent = {}) {
  const curiosity = scoreReaderCuriosity(text, scene, intent);
  return { score: curiosity.score, metrics: curiosity.metrics, pacing: null };
}

export function resolveReviewVerdict(totalScore) {
  if (totalScore >= REVIEW_PASS_MIN) {
    return { verdict: 'pass', pass: true, warning: false, retry: false };
  }
  if (totalScore >= REVIEW_WARNING_MIN) {
    return { verdict: 'warning', pass: false, warning: true, retry: false };
  }
  return { verdict: 'retry', pass: false, warning: false, retry: true };
}

const SUGGESTION_TEMPLATES = {
  hookDensity: '提高钩子密度 — 每段留未完成动作，章尾禁止平收',
  questionDensity: '增加疑问密度 — 让读者不断追问「为什么/会怎样」',
  payoffDensity: '加强伏笔回收 — 兑现前文悬念或部分揭晓',
  readerCuriosity: '提升阅读驱动力 — 代价逼近、选择收窄、好奇心悬而未决',
  twistStrength: '加强反转力度 — 预期违背、信息翻盘或身份反转',
  dialogue: '用对白推进冲突，避免说明式旁白',
  conflict: '让目标与阻力同场升级，代价可见',
};

export function buildReviewSuggestions(scores, weights, { limit = 5 } = {}) {
  const ranked = REVIEW_DIMENSIONS
    .map((id) => ({ id, score: scores[id] ?? 0, weight: weights[id] ?? 0 }))
    .sort((a, b) => (a.score * (1 - a.weight)) - (b.score * (1 - b.weight)));

  const suggestions = [];
  for (const item of ranked) {
    if (item.score >= 80) continue;
    const tpl = SUGGESTION_TEMPLATES[item.id];
    if (tpl) suggestions.push(`${item.id}: ${tpl}（${item.score}/100）`);
    if (suggestions.length >= limit) break;
  }
  return suggestions;
}

/**
 * Scene 商业导演评分 + Genre 加权
 */
export function computeSceneQualityScore({
  text,
  scene = {},
  intent = {},
  storyDna = {},
  writingBible = '',
} = {}) {
  const body = String(text || '').trim();
  const hookD = scoreHookDensity(body);
  const questionD = scoreQuestionDensity(body);
  const payoffD = scorePayoffDensity(body);
  const curiosityD = scoreReaderCuriosity(body, scene, intent);
  const twistD = scoreTwistStrength(body);
  const dialogue = scoreDialogue(body);
  const conflict = scoreConflict(body, scene, intent);

  const scores = {
    hookDensity: hookD.score,
    questionDensity: questionD.score,
    payoffDensity: payoffD.score,
    readerCuriosity: curiosityD.score,
    twistStrength: twistD.score,
    dialogue: dialogue.score,
    conflict: conflict.score,
    // legacy aliases — Adaptive Learning 兼容
    hook: hookD.score,
    emotion: curiosityD.score,
    style: twistD.score,
    pacing: curiosityD.score,
  };

  const { profile, weights } = resolveReviewWeights(storyDna, writingBible);
  const weightedScore = computeWeightedScore(scores, weights);
  const verdictInfo = resolveReviewVerdict(weightedScore);
  const suggestions = buildReviewSuggestions(scores, weights);

  const weak = REVIEW_DIMENSIONS
    .map((id) => ({ id, score: scores[id], weight: weights[id] ?? 0 }))
    .sort((a, b) => a.score - b.score);

  return {
    ...verdictInfo,
    scores,
    weights,
    weightedScore,
    total: weightedScore,
    genreProfile: profile,
    suggestions,
    weak,
    weakest: weak.slice(0, 3),
    readerCurves: hookD.readerCurves,
    metrics: {
      hookDensity: hookD.metrics,
      questionDensity: questionD.metrics,
      payoffDensity: payoffD.metrics,
      readerCuriosity: curiosityD.metrics,
      twistStrength: twistD.metrics,
      dialogue: dialogue.metrics,
      conflict: conflict.metrics,
    },
    totalChars: charCount(body),
  };
}
