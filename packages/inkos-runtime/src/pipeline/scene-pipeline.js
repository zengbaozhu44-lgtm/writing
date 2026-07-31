/**
 * Scene Pipeline — Analysis Only（软分析）
 *
 * 唯一允许阻断 nextScene 的条件：正文为空（awaiting writer）。
 * Review / Consistency / Decision 只产 Adaptive Hints，禁止 Replan / Rewrite 循环。
 * 硬核写入拦截只在 Writer Runtime V2/Craft（写时）。
 */
import { loadBrainContext } from '../../../inkos-brain/src/loader.js';
import { evaluateDecisions } from '../../../inkos-brain/src/decision/decision.js';
import { checkConsistency } from '../../../inkos-brain/src/consistency/consistency.js';
import { reviewScene } from '../../../inkos-brain/src/scene/scene.js';
import { saveSceneArtifacts } from '../../../inkos-brain/src/memory/memory.js';

/**
 * 将软分析结果写入 Adaptive Hints 缓冲区（失败只 log，不抛）
 */
async function appendAdaptiveHintsSafe(bookDir, chapter, hints = []) {
  if (!bookDir || chapter == null || !hints.length) return [];
  const written = [];
  let recordAdaptiveHint;
  try {
    ({ recordAdaptiveHint } = await import('../../../inkos-director/src/adaptive-planner.js'));
  } catch (err) {
    console.warn('[scene-pipeline] Adaptive Hint 模块不可用（忽略）:', err?.message || err);
    return [];
  }
  for (const hint of hints) {
    if (!hint) continue;
    try {
      const file = recordAdaptiveHint(bookDir, chapter, {
        ...hint,
        mode: 'analysis-only',
        blocking: false,
      });
      if (file) written.push(file);
    } catch (err) {
      console.warn('[scene-pipeline] Adaptive Hint 写入失败（忽略）:', err?.message || err);
    }
  }
  return written;
}

function hintFromBrainReview(review, scene) {
  if (!review || review.pass) return null;
  const issues = (review.issues || []).slice(0, 4);
  if (!issues.length) return null;
  return {
    source: 'scene-pipeline-review',
    mode: 'analysis-only',
    blocking: false,
    sceneIndex: scene?.index,
    targetSceneIndex: (scene?.index ?? 0) + 1,
    items: issues.map((i) => i.reason || i.message || JSON.stringify(i)).filter(Boolean),
    message: `Scene Review 软分析 · ${issues.length} 项提示`,
  };
}

function hintFromConsistency(consistency, scene) {
  if (!consistency || consistency.pass) return null;
  const failures = (consistency.failures || []).slice(0, 4);
  if (!failures.length) return null;
  return {
    source: 'scene-pipeline-consistency',
    mode: 'analysis-only',
    blocking: false,
    sceneIndex: scene?.index,
    targetSceneIndex: (scene?.index ?? 0) + 1,
    items: failures.map((f) => `${f.dimension || 'consistency'}: ${f.reason || '未通过'}`),
    message: `Consistency 软分析 · ${failures.length} 项提示`,
  };
}

function hintFromDecision(sceneDecision, scene) {
  if (!sceneDecision || sceneDecision.pass) return null;
  const failures = (sceneDecision.failures || []).slice(0, 4);
  if (!failures.length && !sceneDecision.reason) return null;
  return {
    source: 'scene-pipeline-decision',
    mode: 'analysis-only',
    blocking: false,
    sceneIndex: scene?.index,
    targetSceneIndex: (scene?.index ?? 0) + 1,
    items: failures.length
      ? failures.map((f) => f.reason || f.message || String(f))
      : [sceneDecision.reason || 'Decision soft fail'],
    message: 'Decision 软分析 · 仅 Hint，不触发 Replan',
  };
}

/**
 * 单次只读分析（无循环）
 */
export async function analyzeSceneReadOnly(bookDir, {
  chapter,
  scene,
  intent,
  ctx,
  importMode = false,
} = {}) {
  const log = [];
  const hints = [];

  const review = reviewScene(scene, scene.text, { importMode });
  log.push({
    stage: 'review',
    pass: review.pass,
    analysisOnly: true,
    blocking: false,
    issues: review.issues,
  });
  const rh = hintFromBrainReview(review, scene);
  if (rh) hints.push(rh);

  let consistency = { pass: true, failures: [], analysisOnly: true, blocking: false };
  try {
    consistency = {
      ...checkConsistency(ctx, intent, '', scene),
      analysisOnly: true,
      blocking: false,
    };
  } catch (err) {
    consistency = {
      pass: true,
      analysisOnly: true,
      blocking: false,
      softError: err?.message || String(err),
      failures: [],
    };
    console.warn('[scene-pipeline] Consistency 分析失败（忽略）:', consistency.softError);
  }
  log.push({
    stage: 'consistency',
    pass: consistency.pass,
    analysisOnly: true,
    failures: consistency.failures,
    softError: consistency.softError || null,
  });
  const ch = hintFromConsistency(consistency, scene);
  if (ch) hints.push(ch);

  let sceneDecision = { pass: true, analysisOnly: true, blocking: false };
  try {
    const sceneIntent = { ...intent, scenes: [scene], mainGoal: scene.goal };
    const decision = evaluateDecisions(ctx, sceneIntent);
    sceneDecision = {
      ...(decision.decisions.find((d) => d.sceneId === scene.id) || decision.decisions[0] || { pass: decision.pass }),
      analysisOnly: true,
      blocking: false,
    };
  } catch (err) {
    sceneDecision = {
      pass: true,
      analysisOnly: true,
      blocking: false,
      softError: err?.message || String(err),
    };
    console.warn('[scene-pipeline] Decision 分析失败（忽略）:', sceneDecision.softError);
  }
  log.push({
    stage: 'decision',
    pass: sceneDecision?.pass ?? true,
    analysisOnly: true,
    softError: sceneDecision.softError || null,
  });
  const dh = hintFromDecision(sceneDecision, scene);
  if (dh) hints.push(dh);

  const hintPaths = await appendAdaptiveHintsSafe(bookDir, chapter, hints);

  return {
    review,
    consistency,
    decision: sceneDecision,
    log,
    hints,
    hintPaths,
    analysisOnly: true,
    blocking: false,
  };
}

/**
 * Scene 管线入口 — 永远推进（有正文则 pass），分析失败不挡 nextScene
 */
export async function runScenePipeline(bookDir, {
  chapter,
  scene,
  intent,
  ctx,
  bus,
  importMode,
} = {}) {
  if (!ctx) {
    try {
      ctx = loadBrainContext(bookDir, { chapter, pov: intent?.pov });
    } catch (err) {
      console.warn('[scene-pipeline] Context 加载失败，使用空快照（软分析）:', err?.message || err);
      ctx = { facts: [], characters: [], softError: err?.message || String(err) };
    }
  }
  if (!intent) throw new Error('Scene pipeline 需要 intent');

  const currentScene = { ...scene };
  const log = [];

  if (!currentScene.text?.trim()) {
    return {
      pass: false,
      awaiting: 'writer',
      scene: currentScene,
      log,
      analysisOnly: true,
      message: '等待 Writer 填入 Scene 正文',
    };
  }

  let analysis;
  try {
    analysis = await analyzeSceneReadOnly(bookDir, {
      chapter,
      scene: currentScene,
      intent,
      ctx,
      importMode,
    });
    log.push(...analysis.log);
  } catch (err) {
    const msg = err?.message || String(err);
    console.warn('[scene-pipeline] 只读分析异常（不阻断 Scene）:', msg);
    log.push({ stage: 'analysis', pass: true, analysisOnly: true, softError: msg });
    analysis = {
      review: { pass: true, wordCount: currentScene.text.replace(/\s/g, '').length, issues: [], analysisOnly: true },
      consistency: { pass: true, failures: [], analysisOnly: true },
      decision: { pass: true, analysisOnly: true },
      hints: [],
      hintPaths: [],
    };
    if (bus) {
      try {
        await bus.emit('pipelineStage', {
          bookDir,
          chapter,
          scene: currentScene.index,
          stage: 'scene-analysis',
          status: 'warning',
          detail: `Scene 软分析失败已忽略：${msg}`,
        });
      } catch { /* ignore */ }
    }
  }

  const len = currentScene.text.replace(/\s/g, '').length;
  currentScene.review = {
    ...analysis.review,
    sceneId: currentScene.id,
    wordCount: analysis.review?.wordCount ?? len,
    mode: 'analysis-only',
    blocking: false,
  };
  currentScene.consistency = analysis.consistency;
  currentScene.decision = analysis.decision;
  currentScene.adaptiveHints = analysis.hints;
  currentScene.status = 'done';
  currentScene.wordCount = currentScene.review.wordCount;

  if (bus) {
    try {
      await bus.emit('sceneFinished', { bookDir, chapter, scene: currentScene, analysisOnly: true });
      await bus.emit('memoryUpdated', { bookDir, chapter, scope: 'scene', sceneId: currentScene.id });
      if (analysis.hints?.length) {
        await bus.emit('sceneAnalysisHints', {
          bookDir,
          chapter,
          scene: currentScene.index,
          hints: analysis.hints,
          hintPaths: analysis.hintPaths,
          blocking: false,
        });
      }
    } catch (err) {
      console.warn('[scene-pipeline] 事件广播失败（忽略）:', err?.message || err);
    }
  }

  return {
    pass: true,
    scene: currentScene,
    review: currentScene.review,
    consistency: analysis.consistency,
    decision: analysis.decision,
    log,
    hints: analysis.hints,
    analysisOnly: true,
    blocking: false,
    nonBlocking: true,
  };
}

export function persistScenes(bookDir, chapter, scenes) {
  return saveSceneArtifacts(bookDir, chapter, scenes);
}
