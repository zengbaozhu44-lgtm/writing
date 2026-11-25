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
import { computeStoryHealth } from '../../../inkos-brain/src/health/story-health.js';
import { applyAdaptiveFeedback } from '../../../inkos-brain/src/planner/adaptive.js';
import { replan, planNextChapter } from '../../../inkos-brain/src/planner/planner.js';
import {
  saveBrainRun,
  saveChapterPlan,
  ensureBrainDir,
} from '../../../inkos-brain/src/memory/memory.js';
import { MemoryUnit, buildStateDiff } from '../memory/memory-unit.js';
import { enrichAttributionAfterStateDiff } from '../../../inkos-brain/src/attribution/index.js';
import { writeChapterOnly } from '../memory/memory-unit.js';
import { writeNextChapterTask, deriveNextChapterIntent } from '../../../inkos-brain/src/memory/state-updater.js';
import {
  runChapterReaderSimulator,
  polishChapterAfterReaderSim,
} from './reader-simulator.js';
import {
  shouldTriggerOptimizer,
  OPTIMIZER_HOOK_FLOOR,
} from './cost-controls.js';

export async function runChapterPipeline(bookDir, payload, bus) {
  const { chapter, chapterText, intent, scenes, conflictResult, ctx: existingCtx } = payload;
  const ctx = existingCtx || loadBrainContext(bookDir, { chapter, pov: intent?.pov });
  const log = [];
  ensureBrainDir(bookDir);

  // NOTE: chapterFinished 不在入口处发射——它必须是「最终完成」语义（见 saveBrainRun 后的两处 success 出口）。
  // 过早发射会让 Daemon 的 run?.pass 守卫拦不住 re-entry（loadBrainRun 尚未写入 pass），
  // 同一正文被重复跑一遍 runChapterPipeline → 双 commit / 非最终尝试也被记为「章节完成」。

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
  log.push({
    stage: 'reader',
    pass: readerResult.pass,
    readingDrive: readerResult.readingDrive,
    withheld: readerResult.highlights?.withheld || null,
  });

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
      error: 'Validation 八项未全部通过 — 重新规划',
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

  // Phase 4.4.1c: optional soft enrichment with StateDiff hints (never blocks commit)
  try {
    enrichAttributionAfterStateDiff(bookDir, chapter, scenes, stateDiff, {
      storyClock: chapter,
    });
  } catch (attrErr) {
    console.warn('[chapter-pipeline] Attribution enrichment skipped:', attrErr?.message || attrErr);
  }

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
    // 最终完成语义：saveBrainRun 已写入 pass:true，Daemon 的 run?.pass 守卫可拦截 re-entry。
    if (bus) await bus.emit('chapterFinished', { bookDir, chapter, text: workingText, intent, result });
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
  // 09 任务卡回填：commit 时 nextChapterPlan 尚为 null → MemoryUnit 写卡分支永不触发，
  // 必须在此（planNext 之后）立即写卡，否则 09_current_chapter.md 永远空白模板。
  // B 回声切断：写卡前强制派生（planNextChapter 兜底路径会复读本章旧卡，
  // 已支付代价/交割动作若不剥离将逐章重演）；本章 anchor 已 commit，作为前瞻供料。
  const derivedNextIntent = nextChapterPlan?.intent
    ? deriveNextChapterIntent(nextChapterPlan.intent, memoryCommit.anchor, { nextChapter: chapter + 1 })
    : null;
  if (derivedNextIntent) {
    try {
      writeNextChapterTask(bookDir, chapter + 1, derivedNextIntent);
    } catch (err) {
      console.warn('[chapter-pipeline] writeNextChapterTask 失败（已忽略）:', err?.message || err);
    }
  }
  // 回写 nextChapter 摘要到 states JSON（commit 时尚未有 plan）；
  // intent 用派生后版本，与 09 卡保持同源，避免下游读到回声 intent
  try {
    if (memoryCommit.stateFile && exists(memoryCommit.stateFile)) {
      const blob = readJson(memoryCommit.stateFile);
      blob.nextChapter = {
        chapter: chapter + 1,
        intent: derivedNextIntent || null,
        priorAnchorApplied: Boolean(nextChapterPlan.priorAnchor),
      };
      writeJson(memoryCommit.stateFile, blob);
    }
  } catch (err) {
    console.warn('[anchor] failed to patch nextChapter into state:', err?.message || err);
  }

  if (bus) await bus.emit('memoryUpdated', { bookDir, chapter, snapshot: memoryCommit.snapshot, memoryCommit });

  saveChapterPlan(bookDir, chapter + 1, {
    intent: derivedNextIntent || nextChapterPlan.intent,
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

  // 最终完成语义：saveBrainRun 已写入 pass:true，Daemon 的 run?.pass 守卫可拦截 re-entry。
  if (bus) await bus.emit('chapterFinished', { bookDir, chapter, text: workingText, intent, result });
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

