/**
 * Scene Lifecycle 桥接 — Director + Story Thread + Context Ranking
 * Runtime 仅通过 sceneLifecycleHook 感知
 *
 * Director 五层：Story → Chapter → Scene（plan）
 * Scene Review + Story Thread（reviewed，不阻塞）
 */
import {
  runDirectorPhase,
  persistDirectorLog,
  recordAdaptiveHint,
  hintsFromStoryThread,
} from '@inkos/director';
import { runStoryThreadAfterScene } from '@inkos/story-thread';
import { runContextRanking } from '@inkos/context-ranking';
import { runDynamicBudget, formatBudgetBlock, allocationToCompilerBudget } from '@inkos/dynamic-budget';
import { runHashDependencyCheck } from '@inkos/hash-dependency';
import { runStoryMemory } from '@inkos/story-memory';
import { runAdaptiveLearning, loadAdaptiveAdjustments, applyAdjustmentsToBudget } from '@inkos/adaptive-learning';
import { readStoryDna, readSystemFile } from './system-store.js';
import { studioEmitRuntimeEvent } from './event-stream.js';

function mergePromptAppend(...parts) {
  return parts.filter(Boolean).join('\n\n');
}

export function createSceneLifecycleHook(bookDir, bookId) {
  return async function sceneLifecycleHook(phase, payload) {
    const sceneIndex = payload.scene?.index;

    if (phase === 'plan') {
      const storyDna = readStoryDna(bookDir) || {};
      const styleDna = readSystemFile(bookDir, 'style_dna') || {};

      studioEmitRuntimeEvent(bookDir, bookId, 'pipelineStage', {
        chapter: payload.chapter,
        scene: sceneIndex,
        stage: 'hash-dependency',
        status: 'running',
        detail: 'Hash Dependency · 模块 Hash 检测',
      });

      // Hash Dependency 为软分析：失败不阻断 Writer（并发 canon 写入会间歇性致半截文件）
      let hashDep = null;
      let hashErr = null;
      try {
        hashDep = runHashDependencyCheck({
          bookDir,
          chapter: payload.chapter,
          scene: payload.scene,
          ctx: payload.ctx,
          storyDna,
          styleDna,
          persistState: false,
        });
      } catch (err) {
        hashErr = err;
        console.warn('[scene-lifecycle] Hash Dependency 失败（跳过，不阻断）:', err?.message || err);
      }

      if (hashDep?.mustRecompile) {
        payload.scene._hashDependency = hashDep;
      }

      studioEmitRuntimeEvent(bookDir, bookId, 'hashDependencyChecked', {
        bookDir,
        chapter: payload.chapter,
        scene: sceneIndex,
        changed: hashDep?.changed ?? [],
        invalidated: hashDep?.invalidated ?? false,
        mustRecompile: hashDep?.mustRecompile ?? false,
        combinedHash: hashDep?.combinedHash ?? null,
        reportPath: hashDep?.reportPath ?? null,
        tree: hashDep?.tree ?? null,
        error: hashErr?.message ?? null,
      });

      studioEmitRuntimeEvent(bookDir, bookId, 'hashDependencyTreeUpdated', {
        chapter: payload.chapter,
        tree: hashDep?.tree ?? null,
        changed: hashDep?.changed ?? [],
        invalidated: hashDep?.invalidated ?? false,
      });

      studioEmitRuntimeEvent(bookDir, bookId, 'pipelineStage', {
        chapter: payload.chapter,
        scene: sceneIndex,
        stage: 'hash-dependency',
        status: hashErr ? 'warning' : (hashDep?.invalidated ? 'warning' : 'done'),
        detail: hashErr
          ? `Hash 检测失败已跳过：${hashErr.message}`
          : (hashDep?.invalidated
            ? `Hash 变化 · ${hashDep.changed.join(', ')} · 已 Invalidate`
            : (hashDep?.valid
              ? 'Hash 稳定 · 无变化'
              : '首次 Hash 基准')),
      });

      studioEmitRuntimeEvent(bookDir, bookId, 'pipelineStage', {
        chapter: payload.chapter,
        scene: sceneIndex,
        stage: 'budget',
        status: 'running',
        detail: 'Dynamic Budget · Type + Complexity',
      });

      // Dynamic Budget 为软分析：失败不阻断 Writer，用默认预算兜底
      let budgetResult = null;
      try {
        budgetResult = runDynamicBudget({
          bookDir,
          chapter: payload.chapter,
          scene: payload.scene,
          intent: payload.intent,
          ctx: payload.ctx,
        });
      } catch (err) {
        console.warn('[scene-lifecycle] Dynamic Budget 失败（使用默认预算）:', err?.message || err);
        budgetResult = {
          budget: { sceneType: 'opening', complexity: { level: 'low' }, allocation: null, totalTokens: 4000 },
          pie: null,
          contextTokenBudget: 2000,
          contextCharBudget: 4000,
        };
      }

      studioEmitRuntimeEvent(bookDir, bookId, 'pipelineStage', {
        chapter: payload.chapter,
        scene: sceneIndex,
        stage: 'budget',
        status: 'done',
        detail: `${budgetResult.budget.sceneType} · 复杂度 ${budgetResult.budget.complexity?.level ?? '—'} · ${budgetResult.contextTokenBudget} tok`,
      });

      studioEmitRuntimeEvent(bookDir, bookId, 'budgetAllocated', {
        bookDir,
        chapter: payload.chapter,
        scene: sceneIndex,
        pie: budgetResult.pie,
        sceneType: budgetResult.budget.sceneType,
        totalTokens: budgetResult.budget.totalTokens,
      });

      studioEmitRuntimeEvent(bookDir, bookId, 'pipelineStage', {
        chapter: payload.chapter,
        scene: sceneIndex,
        stage: 'context-ranking',
        status: 'running',
        detail: 'Context Ranking · Top-K 筛选',
      });

      // Context Ranking + Story Memory 均为软分析：任一失败跳过，不阻断 Writer
      let contextRank = null;
      let storyMem = null;
      try {
        let compilerBudget = allocationToCompilerBudget(budgetResult.budget.allocation);
        const adaptiveAdj = loadAdaptiveAdjustments(bookDir);
        if (adaptiveAdj) {
          compilerBudget = applyAdjustmentsToBudget(compilerBudget, adaptiveAdj, payload.scene);
        }

        contextRank = runContextRanking({
          bookDir,
          chapter: payload.chapter,
          scene: payload.scene,
          intent: payload.intent,
          ctx: payload.ctx,
          storyDna,
          budget: compilerBudget,
          budgetChars: budgetResult.contextCharBudget,
        });

        storyMem = runStoryMemory({
          bookDir,
          chapter: payload.chapter,
          scene: payload.scene,
          ctx: payload.ctx,
          storyDna,
        });
      } catch (err) {
        console.warn('[scene-lifecycle] Context Ranking / Story Memory 失败（跳过，不阻断）:', err?.message || err);
      }

      studioEmitRuntimeEvent(bookDir, bookId, 'storyMemoryUpdated', {
        chapter: payload.chapter,
        scene: sceneIndex,
        metrics: storyMem?.metrics ?? null,
        hints: storyMem?.hints ?? null,
        dashboard: storyMem?.dashboard ?? null,
        reportPath: storyMem?.reportPath ?? null,
      });

      studioEmitRuntimeEvent(bookDir, bookId, 'pipelineStage', {
        chapter: payload.chapter,
        scene: sceneIndex,
        stage: 'context-ranking',
        status: 'done',
        detail: contextRank
          ? `Top-${contextRank.report?.budget?.selectedCount ?? contextRank.topK?.length ?? 0} / ${contextRank.report?.budget?.totalCandidates ?? 0} · 五类 TopK`
          : 'Context Ranking 失败已跳过',
      });

      studioEmitRuntimeEvent(bookDir, bookId, 'pipelineStage', {
        chapter: payload.chapter,
        scene: sceneIndex,
        stage: 'director',
        status: 'running',
        detail: 'Director · Reader Addiction 规划（Story / Chapter / Scene）',
      });

      // Director 规划为软分析：失败不阻断 Writer（不污染 scene 状态）
      let directorResult = { pass: true, blocking: false, promptAppend: '' };
      try {
        directorResult = await runDirectorPhase(phase, {
          ...payload,
          bookDir,
          bookId,
          storyDna,
        });
      } catch (err) {
        console.warn('[scene-lifecycle] Director 规划失败（跳过，不阻断）:', err?.message || err);
      }

      studioEmitRuntimeEvent(bookDir, bookId, 'pipelineStage', {
        chapter: payload.chapter,
        scene: sceneIndex,
        stage: 'director',
        status: 'done',
        detail: 'Director · Reader Addiction 规划完成（不拦截 Writer）',
      });

      return {
        ...directorResult,
        hashDependency: hashDep,
        dynamicBudget: budgetResult,
        contextRanking: contextRank,
        storyMemory: storyMem,
        promptAppend: mergePromptAppend(
          formatBudgetBlock(budgetResult),
          directorResult?.promptAppend || '',
        ),
      };
    }

    if (phase === 'reviewed') {
      const storyDna = readStoryDna(bookDir) || {};
      const writingBible = payload.ctx?.writingBible || '';

      studioEmitRuntimeEvent(bookDir, bookId, 'pipelineStage', {
        chapter: payload.chapter,
        scene: sceneIndex,
        stage: 'scene-review',
        status: 'running',
        detail: 'Scene Review · Analysis Only（不阻断）',
      });

      let directorResult;
      try {
        directorResult = await runDirectorPhase(phase, {
          ...payload,
          bookDir,
          bookId,
          storyDna,
          writingBible,
        });
      } catch (err) {
        console.warn('[scene-lifecycle] Director Review 失败（忽略）:', err?.message || err);
        studioEmitRuntimeEvent(bookDir, bookId, 'pipelineStage', {
          chapter: payload.chapter,
          scene: sceneIndex,
          stage: 'scene-review',
          status: 'warning',
          detail: `Scene Review 软分析失败已忽略：${err?.message || err}`,
        });
        directorResult = {
          pass: true,
          blocking: false,
          analysisOnly: true,
          verdict: 'warning',
          softError: err?.message || String(err),
        };
      }

      if (payload.chapter && payload.scene) {
        try {
          persistDirectorLog(bookDir, payload.chapter, payload.scene, {
            phase: 'scene-review',
            mode: 'analysis-only',
            total: directorResult.total,
            verdict: directorResult.verdict,
            scores: directorResult.scores,
            blocking: false,
            analysisOnly: true,
            reportPath: directorResult.reportPath,
          });
        } catch { /* ignore */ }
      }

      const reviewStatus = directorResult.softError
        ? 'warning'
        : directorResult.verdict === 'pass' || directorResult.analysisPass
          ? 'done'
          : 'warning';

      studioEmitRuntimeEvent(bookDir, bookId, 'pipelineStage', {
        chapter: payload.chapter,
        scene: sceneIndex,
        stage: 'scene-review',
        status: reviewStatus,
        detail: directorResult.softError
          ? `Review 软失败已忽略 · Adaptive 未阻断`
          : `Review 软分析 ${directorResult.weightedScore ?? directorResult.total ?? '—'} 分 · Hints 已记录`,
      });

      if (directorResult.verdict && directorResult.verdict !== 'pass') {
        studioEmitRuntimeEvent(bookDir, bookId, 'sceneReviewReport', {
          bookDir,
          chapter: payload.chapter,
          scene: sceneIndex,
          weightedScore: directorResult.weightedScore ?? directorResult.total,
          total: directorResult.weightedScore ?? directorResult.total,
          verdict: directorResult.verdict,
          scores: directorResult.scores,
          weights: directorResult.weights,
          readerCurves: directorResult.review?.readerCurves,
          suggestions: directorResult.suggestions,
          reportPath: directorResult.reportPath,
          analysisOnly: true,
          blocking: false,
        });
      }

      studioEmitRuntimeEvent(bookDir, bookId, 'pipelineStage', {
        chapter: payload.chapter,
        scene: sceneIndex,
        stage: 'story-thread',
        status: 'running',
        detail: 'Story Thread · 软分析（不阻断）',
      });

      let threadResult = {
        shouldReplan: false,
        analysis: { mainProgress: 0, subPercent: 0, suggestions: [] },
      };
      try {
        threadResult = runStoryThreadAfterScene({
          bookDir,
          chapter: payload.chapter,
          scene: payload.scene,
          intent: payload.intent,
          storyDna,
          sceneResult: payload.sceneResult,
        });
      } catch (err) {
        console.warn('[scene-lifecycle] Story Thread 失败（忽略）:', err?.message || err);
      }

      if (threadResult.shouldReplan || threadResult.analysis?.suggestions?.length) {
        try {
          const hint = hintsFromStoryThread(threadResult);
          if (hint) recordAdaptiveHint(bookDir, payload.chapter, hint);
        } catch { /* ignore */ }

        studioEmitRuntimeEvent(bookDir, bookId, 'storyThreadReplan', {
          bookDir,
          chapter: payload.chapter,
          scene: sceneIndex,
          reason: threadResult.replanReason,
          mainProgress: threadResult.analysis?.mainProgress,
          consecutiveLowMain: threadResult.consecutiveLowMain,
          blocking: false,
          deferred: true,
          analysisOnly: true,
          note: '已记录 Adaptive Hint，禁止章内 Replan',
        });
      }

      studioEmitRuntimeEvent(bookDir, bookId, 'pipelineStage', {
        chapter: payload.chapter,
        scene: sceneIndex,
        stage: 'story-thread',
        status: threadResult.shouldReplan ? 'warning' : 'done',
        detail: threadResult.shouldReplan
          ? `主线软提示 · ${threadResult.replanReason || '已写入 Adaptive'}`
          : `主线 ${threadResult.analysis?.mainProgress ?? '—'}% · 支线 ${threadResult.analysis?.subPercent ?? '—'}%`,
      });

      let adaptiveLearning = null;
      try {
        adaptiveLearning = runAdaptiveLearning(bookDir);
        if (adaptiveLearning?.adjustments?.activeDimensions?.length) {
          studioEmitRuntimeEvent(bookDir, bookId, 'adaptiveLearningUpdated', {
            chapter: payload.chapter,
            scene: sceneIndex,
            trends: adaptiveLearning.trends,
            adjustments: adaptiveLearning.adjustments,
            suggestions: adaptiveLearning.suggestions,
          });
        }
      } catch (err) {
        console.warn('[scene-lifecycle] Adaptive Learning 失败（忽略）:', err?.message || err);
      }

      return {
        ...directorResult,
        storyThread: threadResult,
        adaptiveLearning,
        shouldReplan: false,
        replanReason: null,
        analysisOnly: true,
        blocking: false,
        sceneReviewDeferred: false,
        storyThreadDeferred: Boolean(threadResult.shouldReplan),
      };
    }

    if (phase === 'memorized') {
      return runDirectorPhase(phase, { ...payload, bookDir, bookId });
    }

    return runDirectorPhase(phase, { ...payload, bookDir, bookId });
  };
}
