/**
 * Brain Runtime Legacy — V1 顺序管线（CLI --legacy 时使用）
 */
import path from 'node:path';
import { writeJson, readJson, exists } from '../../../inkos-core/src/lib/paths.js';
import { loadBrainContext } from '../loader.js';
import { planChapter, replan } from '../planner/planner.js';
import { evaluateDecisions } from '../decision/decision.js';
import { evaluateConflict } from '../conflict/conflict.js';
import {
  buildScenePlan,
  buildSceneWritePrompt,
  reviewScene,
  assembleChapter,
} from '../scene/scene.js';
import { checkConsistency } from '../consistency/consistency.js';
import { simulateReaders } from '../reader/reader.js';
import { computeMetrics, appendToDashboard } from '../metrics/metrics.js';
import { buildDynamicPrompt } from '../prompt/dynamic-prompt.js';
import { validateChapter } from '../validation/validation.js';
import {
  saveChapterPlan,
  saveSceneArtifacts,
  saveBrainRun,
  ensureBrainDir,
} from '../memory/memory.js';
import { brainSystemDir } from '../loader.js';

const MAX_REPLAN = 3;

export function runBrainPipelineLegacy(bookDir, options = {}) {
  const chapter = options.chapter;
  const ctx = loadBrainContext(bookDir, { chapter, pov: options.pov, present: options.present });
  const pipeline = {
    version: 'brain-1.0-legacy',
    bookDir,
    chapter: ctx.chapter,
    startedAt: new Date().toISOString(),
    stages: [],
    pass: false,
  };

  ensureBrainDir(bookDir);

  let intent = null;
  let decisionResult = null;
  let conflictResult = null;
  let replanCount = 0;

  while (replanCount < MAX_REPLAN) {
    intent = planChapter(ctx, replanCount + 1);
    pipeline.stages.push({ stage: 'planner', attempt: replanCount + 1 });

    decisionResult = evaluateDecisions(ctx, intent);
    conflictResult = evaluateConflict(ctx, intent);

    if (decisionResult.pass && conflictResult.pass) break;

    const reasons = [];
    if (!decisionResult.pass) {
      reasons.push(...decisionResult.decisions.flatMap((d) => d.failures.map((f) => ({ type: 'decision', ...f, attempt: replanCount + 1 }))));
    }
    if (!conflictResult.pass) {
      reasons.push({ type: 'conflict', suggestObstacle: conflictResult.suggestObstacle, attempt: replanCount + 1 });
    }
    intent = replan(ctx, reasons);
    replanCount += 1;
  }

  saveChapterPlan(bookDir, ctx.chapter, { intent, decisionResult, conflictResult, replanCount });

  if (!decisionResult.pass || !conflictResult.pass) {
    pipeline.error = 'Planner 未通过';
    saveBrainRun(bookDir, ctx.chapter, pipeline);
    return pipeline;
  }

  const scenes = buildScenePlan(intent);
  for (const scene of scenes) {
    const dynamicPrompt = buildDynamicPrompt(ctx, scene);
    scene.prompt = buildSceneWritePrompt(ctx, intent, scene, dynamicPrompt);
    const provided = options.scenes?.find((s) => s.id === scene.id || s.index === scene.index);
    if (provided?.text) {
      scene.text = provided.text;
      scene.review = reviewScene(scene, provided.text);
    }
  }
  saveSceneArtifacts(bookDir, ctx.chapter, scenes);

  const chapterText = options.chapterText || assembleChapter(scenes);
  if (!chapterText.trim()) {
    pipeline.awaiting = 'writer';
    saveBrainRun(bookDir, ctx.chapter, pipeline);
    return pipeline;
  }

  const consistency = checkConsistency(ctx, intent, chapterText);
  const metrics = computeMetrics(chapterText, intent, scenes, conflictResult);
  const readerResult = simulateReaders(chapterText, intent, metrics);
  const validation = validateChapter(chapterText, intent, metrics, readerResult);

  pipeline.pass = consistency.pass && validation.pass;
  pipeline.metrics = metrics;
  pipeline.finishedAt = new Date().toISOString();
  saveBrainRun(bookDir, ctx.chapter, pipeline);
  return pipeline;
}

export function getScenePrompt(bookDir, chapter, sceneIndex, options = {}) {
  const ctx = loadBrainContext(bookDir, { chapter, ...options });
  const intent = planChapter(ctx);
  const scenes = buildScenePlan(intent);
  const scene = scenes.find((s) => s.index === sceneIndex) || scenes[sceneIndex - 1];
  if (!scene) throw new Error(`Scene ${sceneIndex} 不存在`);
  const dynamicPrompt = buildDynamicPrompt(ctx, scene);
  return {
    chapter,
    scene,
    prompt: buildSceneWritePrompt(ctx, intent, scene, dynamicPrompt),
    dynamic: dynamicPrompt,
  };
}

export function loadBrainRun(bookDir, chapter) {
  const file = path.join(brainSystemDir(bookDir), `ch_${String(chapter).padStart(4, '0')}_run.json`);
  if (!exists(file)) return null;
  return readJson(file);
}
