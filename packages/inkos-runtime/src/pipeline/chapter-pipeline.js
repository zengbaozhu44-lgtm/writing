/**
 * Chapter Pipeline — Chapter Finished → Metrics → Reader → Critic → Memory → Next Planner
 */
import path from 'node:path';
import { writeJson, exists, readJson } from '../../../inkos-core/src/lib/paths.js';
import { loadBrainContext, brainSystemDir } from '../../../inkos-brain/src/loader.js';
import { computeMetrics, appendToDashboard, analyzeMetricsFeedback } from '../../../inkos-brain/src/metrics/metrics.js';
import { simulateReaders } from '../../../inkos-brain/src/reader/reader.js';
import { runCritic } from '../../../inkos-brain/src/critic/critic.js';
import { validateChapter } from '../../../inkos-brain/src/validation/validation.js';
import { checkConsistency } from '../../../inkos-brain/src/consistency/consistency.js';
import { computeStoryHealth, saveStoryHealth, loadStoryHealth } from '../../../inkos-brain/src/health/story-health.js';
import { applyAdaptiveFeedback } from '../../../inkos-brain/src/planner/adaptive.js';
import { replan, planNextChapter } from '../../../inkos-brain/src/planner/planner.js';
import {
  appendSceneHistory,
  saveBrainRun,
  saveChapterPlan,
  ensureBrainDir,
} from '../../../inkos-brain/src/memory/memory.js';
import { MemoryUnit, buildStateDiff } from '../memory/memory-unit.js';
import { writeChapterOnly } from '../memory/memory-unit.js';
import {
  runChapterReaderSimulator,
  polishChapterAfterReaderSim,
} from './reader-simulator.js';
import {
  shouldTriggerOptimizer,
  shouldRunAbTest,
  OPTIMIZER_HOOK_FLOOR,
} from './cost-controls.js';
import { runTemperatureAbTest } from './ab-test.js';

export async function runChapterPipeline(bookDir, payload, bus) {
  const { chapter, chapterText, intent, scenes, conflictResult, ctx: existingCtx } = payload;
  const ctx = existingCtx || loadBrainContext(bookDir, { chapter, pov: intent?.pov });
  const log = [];
  ensureBrainDir(bookDir);

  if (bus) await bus.emit('chapterFinished', { bookDir, chapter, text: chapterText, intent });

  const consistency = checkConsistency(ctx, intent, chapterText);
  log.push({ stage: 'consistency', pass: consistency.pass });
  if (!consistency.pass && !payload.force) {
    if (bus) await bus.emit('reviewFailed', { bookDir, chapter, consistency });
    if (bus) await bus.emit('chapterReviewFailed', { bookDir, chapter, consistency });
    return { pass: false, consistency, log, error: 'Chapter Consistency 失败' };
  }

  const metrics = computeMetrics(chapterText, intent, scenes, conflictResult);
  const dashboardPath = path.join(brainSystemDir(bookDir), 'metrics_dashboard.json');
  const dashboard = appendToDashboard(dashboardPath, metrics);
  log.push({ stage: 'metrics', metrics });

  const feedback = analyzeMetricsFeedback(metrics, dashboard, scenes);
  if (feedback.low) {
    if (bus) await bus.emit('metricsLow', { bookDir, chapter, feedback, metrics });
    if (feedback.needsReplan && !payload.force) {
      const newIntent = replan(ctx, feedback.suggestions.map((s) => ({
        type: 'metrics',
        suggestObstacle: s.suggestObstacle,
        suggestGoal: s.suggestGoal,
        attempt: intent.attempt,
      })));
      return {
        pass: false,
        metrics,
        feedback,
        replanIntent: newIntent,
        log,
        error: 'Metrics 反馈触发重新规划',
      };
    }
  }

  const readerResult = simulateReaders(chapterText, intent, metrics);
  log.push({ stage: 'reader', pass: readerResult.pass, readingDrive: readerResult.readingDrive });

  const criticResult = runCritic(chapterText, intent, metrics, readerResult);
  log.push({ stage: 'critic', pass: criticResult.pass, overall: criticResult.overall });
  appendCriticHistory(bookDir, chapter, criticResult);

  if (!criticResult.pass && !payload.force) {
    if (bus) await bus.emit('criticRejected', { bookDir, chapter, critic: criticResult });
    if (bus) await bus.emit('chapterReviewFailed', { bookDir, chapter, critic: criticResult });
    return { pass: false, critic: criticResult, metrics, reader: readerResult, log, error: 'Critic 拒绝' };
  }

  const validation = validateChapter(chapterText, intent, metrics, readerResult);
  log.push({ stage: 'validation', pass: validation.pass, checks: validation.checks });
  if (!validation.pass && !payload.force) {
    if (bus) await bus.emit('validationRejected', { bookDir, chapter, validation });
    const newIntent = replan(ctx, [{ type: 'validation', attempt: intent.attempt }]);
    return {
      pass: false,
      validation,
      replanIntent: newIntent,
      log,
      error: 'Validation 七项未全部通过 — 重新规划',
    };
  }

  // Validation 后：Reader Simulator（轻量 LLM）→ softFail 触发 Optimizer
  let workingText = chapterText;
  let readerSimulator = null;
  let readerSimPolish = null;
  try {
    readerSimulator = await runChapterReaderSimulator(workingText, {
      temperature: 0.3,
      maxTokens: 500,
      bookDir,
      chapter,
      dualReviewer: payload.dualReviewer !== false,
      secondTemperature: 0.7,
    });
    log.push({
      stage: 'reader_simulator',
      hookScore: readerSimulator.hookScore,
      softFail: readerSimulator.softFail,
      dragCount: readerSimulator.dragSections?.length || 0,
      threshold: readerSimulator.threshold,
      dualReviewer: readerSimulator.dualReviewer,
      degraded: Boolean(readerSimulator.degraded),
    });
    if (bus) {
      await bus.emit('readerSimulator', {
        bookDir,
        chapter,
        softFail: readerSimulator.softFail,
        hookScore: readerSimulator.hookScore,
      });
    }
    if (shouldTriggerOptimizer(readerSimulator)) {
      readerSimPolish = await polishChapterAfterReaderSim(workingText, readerSimulator, {
        scene: scenes?.[0] || {},
        chapter,
        intent,
        bookDir,
      });
      if (readerSimPolish?.text?.trim()) {
        workingText = readerSimPolish.text;
      }
      log.push({
        stage: 'reader_simulator_optimizer',
        triggered: true,
        reason: `hookScore=${readerSimulator.hookScore} < ${OPTIMIZER_HOOK_FLOOR} 或拖戏过多`,
        polishChanged: Boolean(readerSimPolish?.optimizer?.polishChanged),
      });
    } else {
      log.push({
        stage: 'reader_simulator_optimizer',
        triggered: false,
        reason: `hookScore=${readerSimulator.hookScore} ≥ ${OPTIMIZER_HOOK_FLOOR}，跳过 Optimizer 降本`,
      });
    }
  } catch (err) {
    log.push({
      stage: 'reader_simulator',
      softError: err?.message || String(err),
    });
    console.warn('[chapter-pipeline] Reader Simulator 失败（忽略）:', err?.message || err);
  }

  // 每 5 章一次 Temperature AB（共享 ExecutionPlan，只比文笔）
  let abTest = null;
  if (shouldRunAbTest(chapter, { force: Boolean(payload.forceAbTest) })) {
    try {
      const plan = scenes?.[0]?.executionPlan
        || scenes?.find((s) => s.executionPlan?.beats?.length)?.executionPlan
        || null;
      if (plan?.beats?.length) {
        abTest = await runTemperatureAbTest({
          executionPlan: plan,
          bookDir,
          chapter,
          persist: true,
          generateFn: async (temperature, label) => ({
            // 无 Writer 注入时仅用现有正文做骨架一致性对照（真实并行写需外部 generateFn）
            text: workingText,
            meta: {
              executionPlan: plan,
              temperature,
              label,
              note: 'chapter-pipeline cadence AB：复用本章正文作对照样本',
            },
          }),
        });
        log.push({
          stage: 'ab_test',
          scheduled: true,
          invalidTest: abTest.invalidTest,
          winner: abTest.winner,
          reportPath: abTest.reportPath,
        });
      } else {
        log.push({ stage: 'ab_test', scheduled: true, skipped: 'no-execution-plan' });
      }
    } catch (err) {
      log.push({ stage: 'ab_test', softError: err?.message || String(err) });
    }
  } else {
    log.push({ stage: 'ab_test', scheduled: false, reason: `非第 ${5} 章倍数，跳过` });
  }

  // 仅 Validation 通过（或 force）后进入唯一 Memory 出口
  const adaptive = applyAdaptiveFeedback(bookDir, {
    metrics,
    reader: readerResult,
    critic: criticResult,
    dashboard,
    readerSimulator,
  });
  log.push({ stage: 'adaptive', weights: adaptive.weights });

  const health = computeStoryHealth(bookDir, dashboard, loadCriticHistory(bookDir), [{ pass: consistency.pass }]);
  saveStoryHealth(bookDir, health);
  log.push({ stage: 'story_health', overallScore: health.overallScore });

  // 先 commit 写出 ch_XXXX_anchor.yaml，再规划下一章（禁止在失忆态 planNext）
  // Studio 审计模式：deferCommit → 只写 pending，不 commit / 不 planNext（接受后再解锁）
  const stateDiff = buildStateDiff(bookDir, chapter, {
    intent,
    chapterText: workingText,
    chapterTitle: intent?.chapterTitle,
    metrics,
    scenes,
    nextChapterPlan: null,
    force: Boolean(payload.force),
    readerSimulator,
  });

  if (payload.deferCommit) {
    const pendingDir = path.join(bookDir, 'novel', '_system', 'pending_commit');
    const pendingFile = path.join(pendingDir, `ch_${String(chapter).padStart(4, '0')}.json`);
    try {
      const fs = await import('node:fs');
      fs.mkdirSync(pendingDir, { recursive: true });
      writeJson(pendingFile, { ...stateDiff, deferredAt: new Date().toISOString(), skipGitCli: true });
    } catch (err) {
      console.warn('[chapter-pipeline] save pending_commit failed:', err?.message || err);
    }

    const chapterFile = writeChapterOnly(bookDir, chapter, stateDiff);

    appendSceneHistory(bookDir, chapter, scenes);
    const result = {
      pass: true,
      chapter,
      chapterText: workingText,
      chapterFile,
      metrics,
      reader: readerResult,
      critic: criticResult,
      validation,
      readerSimulator,
      readerSimPolish: readerSimPolish?.optimizer || null,
      abTest: abTest
        ? { invalidTest: abTest.invalidTest, winner: abTest.winner, reportPath: abTest.reportPath }
        : null,
      adaptive: adaptive.weights,
      health,
      snapshot: null,
      memoryCommit: null,
      deferredCommit: true,
      pendingAudit: true,
      pendingCommitFile: pendingFile,
      nextChapterPlan: null,
      stateUpdate: null,
      log: [...log, { stage: 'memory_commit', deferred: true, pendingFile }],
    };
    saveBrainRun(bookDir, chapter, {
      version: 'runtime-2.0',
      chapter,
      finishedAt: new Date().toISOString(),
      ...result,
    });
    if (bus) await bus.emit('pipelineCompleted', { bookDir, chapter, result });
    return result;
  }

  const memoryCommit = MemoryUnit.commit(bookDir, chapter, stateDiff);
  log.push({
    stage: 'memory_commit',
    chapterFile: memoryCommit.chapterFile,
    stateFile: memoryCommit.stateFile,
    anchorFile: memoryCommit.anchorFile,
    hierarchyFile: memoryCommit.hierarchy?.file || null,
    compression: memoryCommit.hierarchy?.compression?.atChapter || null,
    snapshotId: memoryCommit.snapshot?.id,
  });
  if (memoryCommit.anchorFile) {
    console.log('[anchor] written to', memoryCommit.anchorFile);
  }

  const nextChapterPlan = planNextChapter(bookDir, chapter, ctx, adaptive.weights);
  // 回写 nextChapter 摘要到 states JSON（commit 时尚未有 plan）
  try {
    if (memoryCommit.stateFile && exists(memoryCommit.stateFile)) {
      const blob = readJson(memoryCommit.stateFile);
      blob.nextChapter = {
        chapter: chapter + 1,
        intent: nextChapterPlan.intent || null,
        priorAnchorApplied: Boolean(nextChapterPlan.priorAnchor),
      };
      writeJson(memoryCommit.stateFile, blob);
    }
  } catch (err) {
    console.warn('[anchor] failed to patch nextChapter into state:', err?.message || err);
  }

  if (bus) await bus.emit('memoryUpdated', { bookDir, chapter, snapshot: memoryCommit.snapshot, memoryCommit });

  appendSceneHistory(bookDir, chapter, scenes);

  saveChapterPlan(bookDir, chapter + 1, {
    intent: nextChapterPlan.intent,
    fromChapter: chapter,
    weights: adaptive.weights,
    priorAnchor: nextChapterPlan.priorAnchor || null,
  });

  if (bus) await bus.emit('nextChapterPlanned', { bookDir, chapter: chapter + 1, plan: nextChapterPlan });

  const result = {
    pass: true,
    chapter,
    chapterText: workingText,
    chapterFile: memoryCommit.chapterFile,
    metrics,
    reader: readerResult,
    critic: criticResult,
    validation,
    readerSimulator,
    readerSimPolish: readerSimPolish?.optimizer || null,
    abTest: abTest
      ? { invalidTest: abTest.invalidTest, winner: abTest.winner, reportPath: abTest.reportPath }
      : null,
    adaptive: adaptive.weights,
    health,
    snapshot: memoryCommit.snapshot,
    memoryCommit,
    nextChapterPlan,
    stateUpdate: memoryCommit.canon,
    log,
  };

  saveBrainRun(bookDir, chapter, {
    version: 'runtime-2.0',
    chapter,
    finishedAt: new Date().toISOString(),
    ...result,
  });

  if (bus) await bus.emit('pipelineCompleted', { bookDir, chapter, result });
  return result;
}

function appendCriticHistory(bookDir, chapter, critic) {
  const file = path.join(brainSystemDir(bookDir), 'critic_history.json');
  const db = exists(file) ? readJson(file) : { entries: [] };
  db.entries.push({ chapter, at: new Date().toISOString(), overall: critic.overall, scores: critic.scores, hints: critic.plannerHints });
  writeJson(file, db);
}

function loadCriticHistory(bookDir) {
  const file = path.join(brainSystemDir(bookDir), 'critic_history.json');
  if (!exists(file)) return [];
  return readJson(file).entries || [];
}
