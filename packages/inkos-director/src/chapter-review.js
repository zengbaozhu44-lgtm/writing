import {
  loadSceneReviewReports,
  persistChapterReviewReport,
  persistReaderCurveReport,
} from './review-report.js';
import { recordAdaptiveHint } from './adaptive-planner.js';
import { REVIEW_PASS_MIN } from './quality-score.js';
import { buildChapterCurvePlan, buildReaderCurveReport } from './reader-curve.js';
import { finalizeChapterReaderFeedback } from './reader-feedback.js';

/**
 * Chapter Review — 章级 Reader Curve + nextChapterGuidance（指导下一章 Director）
 * 最高目标：Reader Addiction — 输出读者为什么会继续看
 */
export function runChapterReview({
  bookDir,
  chapter,
  scenes = [],
  intent = {},
} = {}) {
  const sceneReports = bookDir
    ? loadSceneReviewReports(bookDir, chapter)
    : [];

  const retryScenes = sceneReports.filter((r) => r.verdict === 'retry' || r.retry);
  const warningScenes = sceneReports.filter((r) => r.verdict === 'warning' || r.warning);
  const scoreOf = (r) => r.weightedScore ?? r.total ?? 0;
  const avgWeighted = sceneReports.length
    ? Math.round(sceneReports.reduce((s, r) => s + scoreOf(r), 0) / sceneReports.length)
    : 0;
  const pass = avgWeighted >= REVIEW_PASS_MIN && retryScenes.length === 0;

  const curvePlan = buildChapterCurvePlan(intent, chapter, scenes.length || sceneReports.length);
  const readerCurveReport = buildReaderCurveReport(sceneReports, { chapter, curvePlan });

  const adaptiveHints = retryScenes.flatMap((r) =>
    (r.suggestions || (r.weakest || []).map((w) => `${w.id}=${w.score}`)).slice(0, 2).map((msg) => ({
      sceneIndex: r.scene?.index,
      message: msg,
    })),
  );

  for (const g of readerCurveReport.nextChapterGuidance || []) {
    adaptiveHints.push({ sceneIndex: 1, message: g, source: 'reader-curve' });
  }

  const report = {
    version: 'chapter-review-5',
    role: 'chapter-review',
    mode: 'reader-addiction-curve',
    chapter,
    pass,
    blocking: false,
    policy: '章级 Reader Curve Report → nextChapterGuidance 输入下一章 Director；不阻塞章完成',
    averageWeightedScore: avgWeighted,
    averageTotal: avgWeighted,
    // Reader Addiction 核心指标（Chapter Review 标准输出）
    readerAddictionScore: readerCurveReport.readerAddictionScore,
    hookDensity: readerCurveReport.hookDensity,
    questionDensity: readerCurveReport.questionDensity,
    payoffDensity: readerCurveReport.payoffDensity,
    readerCuriosity: readerCurveReport.readerCuriosity,
    readerWhyContinue: readerCurveReport.readerWhyContinue,
    readerCurveReport,
    sceneCount: scenes.length || sceneReports.length,
    sceneReviews: sceneReports.map((r) => ({
      sceneIndex: r.scene?.index,
      weightedScore: scoreOf(r),
      total: scoreOf(r),
      verdict: r.verdict,
      scores: r.scores,
      weights: r.weights,
      suggestions: r.suggestions,
      weakest: (r.weakest || []).slice(0, 2),
      readerCurves: r.readerCurves?.summary,
      hookDensity: r.scores?.hookDensity,
      questionDensity: r.scores?.questionDensity,
      payoffDensity: r.scores?.payoffDensity,
      readerCuriosity: r.scores?.readerCuriosity,
    })),
    retrySceneCount: retryScenes.length,
    warningSceneCount: warningScenes.length,
    adaptiveHints: adaptiveHints.slice(0, 12),
    nextChapterGuidance: readerCurveReport.nextChapterGuidance,
    intent: {
      mainGoal: intent.mainGoal,
      pov: intent.pov,
    },
    generatedAt: new Date().toISOString(),
  };

  let reportPath = null;
  let readerCurvePath = null;
  let feedbackFinal = null;
  if (bookDir && chapter != null) {
    reportPath = persistChapterReviewReport(bookDir, chapter, report);
    readerCurvePath = persistReaderCurveReport(bookDir, chapter, readerCurveReport);

    feedbackFinal = finalizeChapterReaderFeedback({
      bookDir,
      chapter,
      readerCurveReport,
    });

    if (retryScenes.length > 0 || readerCurveReport.nextChapterGuidance?.length) {
      recordAdaptiveHint(bookDir, chapter + 1, {
        source: 'chapter-review',
        targetSceneIndex: 1,
        items: [
          ...adaptiveHints.slice(0, 4).map((h) => h.message),
          ...(readerCurveReport.nextChapterGuidance || []).slice(0, 5),
        ],
        message: retryScenes.length > 0
          ? `第 ${chapter} 章 ${retryScenes.length} Scene 加权分 <70，下一章请参考 Reader Curve`
          : `第 ${chapter} 章 Reader Curve → nextChapterGuidance 已生成，下一章 Director 须响应`,
        fromChapter: chapter,
        averageWeightedScore: avgWeighted,
        readerAddictionScore: readerCurveReport.readerAddictionScore,
        readerCurveReport,
      });
    }
  }

  return {
    ...report,
    reportPath,
    readerCurvePath,
    readerFeedbackPath: feedbackFinal?.feedbackPath ?? null,
    readerFeedbackFinal: feedbackFinal || null,
    failedSceneCount: retryScenes.length,
  };
}
