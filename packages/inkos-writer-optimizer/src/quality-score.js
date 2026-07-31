/**
 * Writer Optimizer 七维质量评分 — 0~100
 */
import { charCount, splitSentences, hasDialogue, hasAction, hasConflictMarker, hasEvent, longestRun, isExpositionSentence, isLoreSentence } from './utils.js';
import { analyzePacing } from './analyzers/pacing.js';
import { analyzeHookEnd } from './analyzers/hook-end.js';

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function avg(nums) {
  if (!nums.length) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

/** 节奏评分 */
export function scorePacingRhythm(text) {
  const pacing = analyzePacing(text);
  return { score: clamp(pacing.score), metrics: pacing.metrics };
}

/** 高潮评分 — 后段张力抬升 */
export function scoreClimax(text, scene = {}, intent = {}) {
  const len = charCount(text);
  if (len < 120) return { score: 55, metrics: { len } };

  const mid = Math.floor(text.length / 2);
  const first = text.slice(0, mid);
  const second = text.slice(mid);
  const corpus = `${text} ${scene.conflict || ''} ${intent.mainGoal || ''}`;

  let score = 42;
  const escFirst = /更|加剧|升级|恶化|紧迫|来不及|只能|被迫/u.test(first) ? 1 : 0;
  const escSecond = /更|加剧|升级|恶化|紧迫|来不及|只能|被迫|突然|猛地|一声/u.test(second) ? 1 : 0;
  if (escSecond > escFirst) score += 22;
  else if (escSecond) score += 12;

  if (hasConflictMarker(second)) score += 18;
  if (/怒|惧|惊|颤|僵|冷|烧|沉|紧/u.test(second)) score += 14;
  if (/代价|失去|牺牲|暴露|危险|威胁/u.test(corpus)) score += 12;
  if (hasAction(second.slice(-Math.min(second.length, 400)))) score += 10;

  return { score: clamp(score), metrics: { escFirst, escSecond } };
}

/** Hook 评分 */
export function scoreHook(text, scene = {}) {
  const hook = analyzeHookEnd(text, scene);
  return { score: clamp(hook.score), metrics: hook.metrics };
}

/** 商业爽点评分 */
export function scoreCommercialPleasure(text, scene = {}, intent = {}) {
  let score = 40;
  const t = String(text || '');

  if (/反转|没想到|却|然而|但是|打脸|碾压|反杀|翻盘|突破|觉醒|爆发/u.test(t)) score += 18;
  if (/爽|痛快|解气|扬眉|赢|胜|成|拿到|得到|突破|解锁/u.test(t)) score += 12;
  if (hasDialogue(t) && hasConflictMarker(t)) score += 14;
  if (/系统|奖励|积分|升级|权限|认可|通过/u.test(t)) score += 10;
  if (hasEvent(t)) score += 8;

  const len = charCount(t);
  const dialogBlocks = (t.match(/[「""『]/g) || []).length;
  if (len > 300 && dialogBlocks >= 2) score += 8;

  if (scene.goal && t.includes(String(scene.goal).slice(0, 6))) score += 6;

  return { score: clamp(score), metrics: { dialogBlocks, len } };
}

/** 文风一致性 */
export function scoreStyleConsistency(text, ctx = {}, styleDna = {}) {
  let score = 58;
  const writingBible = String(ctx.writingBible || '');
  const rhythm = styleDna.rhythm || styleDna.sentence_style || '';
  const atmosphere = styleDna.atmosphere || styleDna.tone || '';

  const sentences = splitSentences(text);
  const shortRatio = sentences.filter((s) => charCount(s) <= 30).length / Math.max(sentences.length, 1);
  if (/短句|硬切|利落/.test(writingBible + rhythm) && shortRatio >= 0.35) score += 16;
  if (/身体先行|感官|触觉|呼吸|心跳/.test(writingBible) && /手|指|肩|背|喉|眼|心跳|呼吸|僵|抖|攥|抹|推|撞/u.test(text)) score += 14;
  if (/冷感|克制|疏离/.test(writingBible + atmosphere) && !/哈哈|嘻嘻|太棒了/u.test(text)) score += 8;
  if (/限知|POV|视角/.test(writingBible)) score += 6;

  const expoRun = longestRun(sentences, isExpositionSentence);
  score -= clamp(expoRun / 20, 0, 20);

  return { score: clamp(score), metrics: { shortRatio: Math.round(shortRatio * 100), expoRun } };
}

/** 人物一致性 */
export function scoreCharacterConsistency(text, ctx = {}, intent = {}) {
  const pov = intent.pov || ctx.pov || '';
  const present = ctx.present || (pov ? [pov] : []);
  const names = [...new Set([pov, ...present].filter(Boolean))];
  let score = 50;

  if (pov && text.includes(pov.slice(0, 1))) score += 12;
  if (pov && new RegExp(pov.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(text)) score += 18;

  const mentioned = names.filter((n) => n.length >= 2 && text.includes(n)).length;
  score += clamp((mentioned / Math.max(names.length, 1)) * 24, 0, 24);

  const wrongPov = /全知|众所周知|读者|作者|事实上|其实/u.test(text);
  if (wrongPov) score -= 15;

  for (const n of names) {
    const card = ctx.characters?.[n]?.raw || '';
    if (!card) continue;
    const trait = card.slice(0, 8);
    if (trait.length >= 2 && text.includes(trait.slice(0, 4))) score += 4;
  }

  return { score: clamp(score), metrics: { pov, present: names, mentioned } };
}

/** 信息释放节奏 */
export function scoreInfoRelease(text) {
  const sentences = splitSentences(text);
  const loreRun = longestRun(sentences, isLoreSentence);
  const len = charCount(text);
  let score = 72;

  score -= clamp(Math.max(0, loreRun - 100) / 8, 0, 35);

  const chunks = [];
  let cur = 0;
  for (const s of sentences) {
    cur += charCount(s);
    if (cur >= 180) {
      chunks.push(cur);
      cur = 0;
    }
  }
  const hasStagger = sentences.some((s) => hasEvent(s) || hasDialogue(s))
    && sentences.some(isLoreSentence);
  if (hasStagger) score += 12;
  if (len > 400 && chunks.length >= 2) score += 8;
  if (/发现|注意到|原来|竟然|才知道|意味着/u.test(text)) score += 10;

  return { score: clamp(score), metrics: { loreRun, stagger: hasStagger } };
}

export const OPTIMIZER_DIMENSIONS = [
  'pacing',
  'climax',
  'hook',
  'commercialPleasure',
  'styleConsistency',
  'characterConsistency',
  'infoRelease',
];

export function computeWriterOptimizerScore({
  text,
  scene = {},
  chapter = null,
  intent = {},
  ctx = {},
  styleDna = {},
} = {}) {
  const pacing = scorePacingRhythm(text);
  const climax = scoreClimax(text, scene, intent);
  const hook = scoreHook(text, scene);
  const commercialPleasure = scoreCommercialPleasure(text, scene, intent);
  const styleConsistency = scoreStyleConsistency(text, ctx, styleDna);
  const characterConsistency = scoreCharacterConsistency(text, ctx, intent);
  const infoRelease = scoreInfoRelease(text);

  const scores = {
    pacing: pacing.score,
    climax: climax.score,
    hook: hook.score,
    commercialPleasure: commercialPleasure.score,
    styleConsistency: styleConsistency.score,
    characterConsistency: characterConsistency.score,
    infoRelease: infoRelease.score,
  };

  const total = avg(Object.values(scores));
  const weak = OPTIMIZER_DIMENSIONS
    .map((id) => ({ id, score: scores[id] }))
    .sort((a, b) => a.score - b.score);

  return {
    scores,
    total,
    weak,
    weakest: weak.slice(0, 3),
    metrics: {
      pacing: pacing.metrics,
      climax: climax.metrics,
      hook: hook.metrics,
      commercialPleasure: commercialPleasure.metrics,
      styleConsistency: styleConsistency.metrics,
      characterConsistency: characterConsistency.metrics,
      infoRelease: infoRelease.metrics,
    },
    chapter,
    sceneIndex: scene?.index ?? null,
    totalChars: charCount(text),
  };
}
