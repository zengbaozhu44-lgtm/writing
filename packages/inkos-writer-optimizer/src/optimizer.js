import {
  analyzeOpening,
  analyzePacing,
  analyzeConflictChain,
  analyzeDialogue,
  analyzeEmotion,
  analyzeInfoDensity,
  analyzeHookEnd,
} from './analyzers/index.js';
import { computeCommercialScore, computeSuspenseScore, COMMERCIAL_THRESHOLD } from './commercial-score.js';
import { buildRewritePrompt } from './rewrite.js';
import { trimSceneText } from './trim.js';

export const MAX_REWRITES = Number(process.env.INKOS_WRITER_REWRITE_MAX || 2);
export { COMMERCIAL_THRESHOLD };

/**
 * 分析 Writer 输出的 Scene 正文（Writer → Optimizer → Review）
 */
export function analyzeCommercialScene({
  text,
  scene = {},
  chapter = null,
  intent = {},
  boundaries = {},
  priorText = '',
}) {
  const opening = analyzeOpening(text);
  const pacing = analyzePacing(text);
  const conflict = analyzeConflictChain(text, scene, intent);
  const dialogue = analyzeDialogue(text);
  const emotion = analyzeEmotion(text);
  const infoDensity = analyzeInfoDensity(text);
  const hook = analyzeHookEnd(text, scene);
  const suspense = computeSuspenseScore(hook, text);

  const dimensions = {
    opening,
    pacing,
    conflict,
    dialogue,
    emotion,
    infoDensity,
    hook,
  };

  const scores = computeCommercialScore({
    hook,
    conflict,
    emotion,
    dialogue,
    pacing,
    suspense,
  });

  const ruleFailures = [
    ...opening.failures,
    ...pacing.failures,
    ...conflict.failures,
    ...dialogue.failures,
    ...emotion.failures,
    ...infoDensity.failures,
    ...hook.failures,
  ];

  const commercialPass = scores.commercial_score >= COMMERCIAL_THRESHOLD;
  const rulesPass = ruleFailures.length === 0;

  const failures = [...ruleFailures];
  if (!commercialPass) {
    const weak = Object.entries(scores)
      .filter(([k, v]) => k !== 'commercial_score' && typeof v === 'number' && v < COMMERCIAL_THRESHOLD)
      .map(([k, v]) => `${k}=${v}`);
    failures.push(
      `Commercial Score：${scores.commercial_score} 低于 ${COMMERCIAL_THRESHOLD}`
      + (weak.length ? `（薄弱项：${weak.join('、')}）` : ''),
    );
  }

  const pass = commercialPass && rulesPass;

  return {
    pass,
    shouldRewrite: !pass,
    failures,
    commercialPass,
    rulesPass,
    scores,
    dimensions,
    chapter,
    sceneIndex: scene?.index ?? null,
    priorTextLength: priorText?.length ?? 0,
    rewriteInstructions: pass ? '' : buildRewritePrompt({ failures, scores }, boundaries),
  };
}

/**
 * Writer Optimizer 主循环 — Runtime 不可见，由 Studio Writer 包装器调用
 *
 * @param {object} opts
 * @param {string} opts.text — Writer 原始输出
 * @param {Function} opts.rewriteFn — async (rewriteInstructions, round) => string
 */
export async function runWriterOptimizer({
  text,
  scene,
  chapter,
  intent,
  boundaries,
  priorText = '',
  rewriteFn,
  maxRewrites = MAX_REWRITES,
}) {
  let trimmed = trimSceneText(text, boundaries);
  let currentText = trimmed.text;
  let rewriteRound = 0;
  let analysis = analyzeCommercialScene({
    text: currentText,
    scene,
    chapter,
    intent,
    boundaries,
    priorText,
  });

  while (!analysis.pass && rewriteRound < maxRewrites) {
    if (typeof rewriteFn !== 'function') break;

    rewriteRound += 1;
    const rewritten = await rewriteFn(analysis.rewriteInstructions, rewriteRound);
    trimmed = trimSceneText(String(rewritten || ''), boundaries);
    currentText = trimmed.text;

    if (!currentText.trim()) {
      throw new Error(`Writer Optimizer：第 ${rewriteRound} 轮重写返回空正文`);
    }

    analysis = analyzeCommercialScene({
      text: currentText,
      scene,
      chapter,
      intent,
      boundaries,
      priorText,
    });
  }

  return {
    text: currentText,
    trimmed: trimmed.trimmed,
    trimReasons: trimmed.reasons,
    analysis,
    pass: analysis.pass,
    rewriteRound,
    scores: analysis.scores,
    failures: analysis.failures,
    rewriteInstructions: analysis.rewriteInstructions,
  };
}
