import {
  MAIN_PROGRESS_MIN,
  CONSECUTIVE_LOW_MAIN_SCENES,
  MAX_SUB_THREAD_RATIO,
} from './utils.js';
import { analyzeSceneThreads } from './threads.js';
import {
  loadStoryThreadState,
  saveStoryThreadState,
  persistStoryProgressReport,
} from './state.js';

export function buildStoryProgressReport({
  chapter,
  scene,
  intent,
  storyDna,
  analysis,
  state,
  shouldReplan,
  replanReason,
}) {
  return {
    version: 'story-thread-1',
    chapter,
    scene: {
      id: scene?.id,
      index: scene?.index,
      goal: scene?.goal,
    },
    threads: analysis.threads,
    mainProgress: analysis.mainProgress,
    subPercent: analysis.subPercent,
    advancesMainThread: analysis.advancesMainThread,
    limits: {
      mainProgressMin: MAIN_PROGRESS_MIN,
      maxSubPercent: MAX_SUB_THREAD_RATIO * 100,
      consecutiveLowMainScenes: CONSECUTIVE_LOW_MAIN_SCENES,
    },
    consecutiveLowMain: state.consecutiveLowMain,
    shouldReplan,
    replanReason,
    failures: analysis.failures,
    intent: {
      mainGoal: intent?.mainGoal,
      chapterIntent: intent?.chapterIntent,
      pov: intent?.pov,
    },
    storyDna: {
      core_hook: storyDna?.core_hook,
      main_conflict: storyDna?.main_conflict,
    },
    recentScenes: state.recentScenes.slice(-6),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * 每 Scene 结束 — 检查主线推进，维护 Thread 状态
 */
export function runStoryThreadAfterScene({
  bookDir,
  chapter,
  scene,
  intent = {},
  storyDna = {},
  sceneResult = {},
}) {
  const text = sceneResult?.scene?.text || scene?.text || '';
  const analysis = analyzeSceneThreads(text, sceneResult?.scene || scene, intent, storyDna);

  const state = loadStoryThreadState(bookDir);
  const lowMain = analysis.mainProgress < MAIN_PROGRESS_MIN;

  if (lowMain) {
    state.consecutiveLowMain = (state.consecutiveLowMain || 0) + 1;
  } else {
    state.consecutiveLowMain = 0;
  }

  const sceneRecord = {
    chapter,
    sceneIndex: scene?.index,
    sceneId: scene?.id,
    mainProgress: analysis.mainProgress,
    subPercent: analysis.subPercent,
    at: new Date().toISOString(),
  };

  state.recentScenes = [...(state.recentScenes || []), sceneRecord].slice(-20);
  saveStoryThreadState(bookDir, state);

  const shouldReplan = state.consecutiveLowMain >= CONSECUTIVE_LOW_MAIN_SCENES;
  const replanReason = shouldReplan
    ? `连续 ${CONSECUTIVE_LOW_MAIN_SCENES} 个 Scene 主线推进 < ${MAIN_PROGRESS_MIN}%（最近：${analysis.mainProgress}%）`
    : null;

  const report = buildStoryProgressReport({
    chapter,
    scene,
    intent,
    storyDna,
    analysis,
    state,
    shouldReplan,
    replanReason,
  });

  const reportPath = bookDir
    ? persistStoryProgressReport(bookDir, chapter, scene, report)
    : null;

  return {
    pass: analysis.failures.length === 0 && !shouldReplan,
    shouldReplan,
    replanReason,
    analysis,
    report,
    reportPath,
    consecutiveLowMain: state.consecutiveLowMain,
  };
}
