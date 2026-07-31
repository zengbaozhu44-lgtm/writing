/**
 * Studio Scene Pipeline — Analysis Only
 * 有正文即 pass；Review/Consistency 只读分析由 Runtime scene-pipeline / Director reviewed 承担
 * 禁止 Decision / Consistency 触发 Scene Replan / Rewrite
 */
import { analyzeSceneReadOnly } from '../../inkos-runtime/src/pipeline/scene-pipeline.js';

export async function runNonBlockingScenePipeline(bookDir, {
  chapter,
  scene,
  intent,
  ctx,
  bus,
} = {}) {
  if (!scene?.text?.trim()) {
    return {
      pass: false,
      awaiting: 'writer',
      scene,
      log: [{ stage: 'gate', pass: false, reason: 'empty-text' }],
      analysisOnly: true,
      message: '等待 Writer 填入 Scene 正文',
    };
  }

  let analysis = null;
  try {
    analysis = await analyzeSceneReadOnly(bookDir, {
      chapter,
      scene,
      intent,
      ctx,
    });
  } catch (err) {
    console.warn('[non-blocking-scene] 软分析失败（忽略）:', err?.message || err);
    analysis = {
      review: { pass: true, issues: [], analysisOnly: true },
      consistency: { pass: true, failures: [], analysisOnly: true },
      decision: { pass: true, analysisOnly: true },
      log: [{ stage: 'analysis', softError: err?.message || String(err), analysisOnly: true }],
      hints: [],
    };
  }

  const len = scene.text.replace(/\s/g, '').length;
  scene.review = {
    ...(analysis.review || {}),
    sceneId: scene.id,
    pass: true,
    wordCount: analysis.review?.wordCount ?? len,
    issues: analysis.review?.issues || [],
    mode: 'analysis-only',
    blocking: false,
  };
  scene.consistency = analysis.consistency;
  scene.decision = analysis.decision;
  scene.adaptiveHints = analysis.hints || [];
  scene.status = 'done';
  scene.wordCount = scene.review.wordCount;

  if (bus) {
    try {
      await bus.emit('sceneFinished', { bookDir, chapter, scene, analysisOnly: true });
      await bus.emit('memoryUpdated', { bookDir, chapter, scope: 'scene', sceneId: scene.id });
    } catch (err) {
      console.warn('[non-blocking-scene] 事件失败（忽略）:', err?.message || err);
    }
  }

  return {
    pass: true,
    scene,
    review: scene.review,
    consistency: analysis.consistency,
    decision: analysis.decision,
    log: analysis.log || [{ stage: 'review', pass: true, analysisOnly: true }],
    hints: analysis.hints || [],
    analysisOnly: true,
    blocking: false,
    nonBlocking: true,
  };
}
