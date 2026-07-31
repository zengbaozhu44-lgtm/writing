import { persistSceneReviewReport } from './review-report.js';
import {
  recordAdaptiveHint,
  hintsFromSceneReview,
} from './adaptive-planner.js';
import {
  computeSceneQualityScore,
  REVIEW_DIMENSIONS,
  COMMERCIAL_REVIEW_DIMENSIONS,
  REVIEW_PASS_MIN,
  REVIEW_WARNING_MIN,
} from './quality-score.js';

/**
 * Scene Review — Analysis Only（商业导演评分）
 *
 * 只读分析：产出 Critique / Scores / Hints → Adaptive 缓冲区。
 * 禁止：硬拦截、Replan、Rewrite。评分失败/超时由调用方吞掉，不得挡 nextScene。
 */
export function runSceneReview({
  text,
  scene = {},
  intent = {},
  chapter = null,
  bookDir = null,
  storyDna = {},
  writingBible = '',
} = {}) {
  const quality = computeSceneQualityScore({ text, scene, intent, storyDna, writingBible });

  const report = {
    version: 'scene-review-5-analysis',
    role: 'scene-review',
    mode: 'analysis-only',
    chapter,
    scene: {
      id: scene.id,
      index: scene.index,
      goal: scene.goal,
      scenePlan: scene.scenePlan,
    },
    scores: quality.scores,
    weights: quality.weights,
    weightedScore: quality.weightedScore,
    total: quality.weightedScore,
    genreProfile: quality.genreProfile,
    dimensions: REVIEW_DIMENSIONS,
    commercialDimensions: COMMERCIAL_REVIEW_DIMENSIONS,
    readerCurves: quality.readerCurves,
    verdict: quality.verdict,
    /** 兼容字段：分析层从不挡写 */
    pass: true,
    analysisPass: quality.pass,
    warning: quality.warning,
    retry: false,
    suggestions: quality.suggestions,
    blocking: false,
    analysisOnly: true,
    thresholds: {
      pass: REVIEW_PASS_MIN,
      warning: REVIEW_WARNING_MIN,
    },
    policy: 'Analysis Only · 评分写入 Adaptive Hints · 禁止 Replan/Rewrite · 不阻断 nextScene',
    weakest: quality.weakest,
    totalChars: quality.totalChars,
    generatedAt: new Date().toISOString(),
  };

  let reportPath = null;
  if (bookDir && chapter != null) {
    try {
      reportPath = persistSceneReviewReport(bookDir, chapter, scene, report);
    } catch (err) {
      console.warn('[scene-review] 报告持久化失败（忽略）:', err?.message || err);
    }

    try {
      const hint = hintsFromSceneReview({
        ...report,
        pass: quality.pass,
        verdict: quality.verdict,
      });
      if (hint) recordAdaptiveHint(bookDir, chapter, hint);
    } catch (err) {
      console.warn('[scene-review] Adaptive Hint 写入失败（忽略）:', err?.message || err);
    }
  }

  return {
    ...report,
    reportPath,
    quality,
  };
}
