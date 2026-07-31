/**
 * Studio LLM Writer — Beat Execution + Writer Optimizer
 * 不修改 inkos-brain / inkos-runtime Pipeline 核心
 *
 * 流程：Prompt Compiler → 五 Beat 顺序执行 → Writer Optimizer → Novel
 */
import { chatCompletion } from '../../inkos-brain/src/writer/llm-writer.js';
import {
  shouldTriggerOptimizer,
  OPTIMIZER_HOOK_FLOOR,
} from '../../inkos-runtime/src/pipeline/cost-controls.js';
import { recordScenePromptMetrics } from '@inkos/prompt-metrics';
import { runHashDependencyCheck } from '@inkos/hash-dependency';
import { buildTokenRecord, countTokens } from '../../inkos-prompt/src/token-meter.js';
import { compileScenePrompt } from '../../inkos-prompt/src/index.js';
import { loadInkOsConfig } from '../../inkos-core/src/lib/config.js';
import { loadPromptMetrics } from '../../inkos-prompt/src/metrics.js';
import { studioEmitRuntimeEvent } from './event-stream.js';
import { readStoryDna, readSystemFile } from './system-store.js';
import {
  compileStudioWriterPrompt,
  persistWriterOptimizationMeta,
  persistBeatExecutionLog,
  getWriterOptimizationDir,
} from './writer-optimization/index.js';
import { runWriterOptimizer } from '@inkos/writer-optimizer';
import { executeBeatSequence } from './writer-optimization/beat-execution.js';
import {
  createContinuityState,
} from './writer-optimization/beat-continuity.js';
import { readJson, writeJson, exists } from '../../inkos-core/src/lib/paths.js';
import path from 'node:path';
import fs from 'node:fs';
import {
  executeSceneWrite,
  resolveWriterModeForScene,
  resolveGoldenSample,
} from './writer-optimization/sample-driven-writer.js';
import {
  buildExecutionIntelligence,
  persistExecutionIntelligence,
} from './writer-optimization/execution-intelligence.js';
import { processSceneReaderFeedback } from '@inkos/director';
import { readSceneBudget } from './studio-metrics-reader.js';
import { runStoryMemory } from '@inkos/story-memory';

const SCENE_TIMEOUT_MS = Number(process.env.INKOS_SCENE_TIMEOUT_MS || process.env.INKOS_AI_TIMEOUT_MS || 300000);
const TOTAL_TIMEOUT_MS = Number(process.env.INKOS_CHAPTER_TIMEOUT_MS || 45 * 60 * 1000);

function continuityPath(bookDir, chapter) {
  return path.join(
    getWriterOptimizationDir(bookDir),
    `ch_${String(chapter).padStart(4, '0')}`,
    'continuity.json',
  );
}

function loadChapterContinuity(bookDir, chapter) {
  try {
    const file = continuityPath(bookDir, chapter);
    if (!exists(file)) return createContinuityState();
    return createContinuityState(readJson(file));
  } catch {
    return createContinuityState();
  }
}

function saveChapterContinuity(bookDir, chapter, state) {
  try {
    const file = continuityPath(bookDir, chapter);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    writeJson(file, { ...state, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.warn('[studio-llm-writer] continuity save failed:', err?.message || err);
  }
}

export function getChapterTimeoutMs() {
  return TOTAL_TIMEOUT_MS;
}

async function callWriterWithTimeout(fn, sceneLabel) {
  let llmReturned = false;
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`${sceneLabel} 生成超时`)), SCENE_TIMEOUT_MS);
  });
  try {
    return await Promise.race([
      fn().then((r) => {
        llmReturned = true;
        return r;
      }),
      timeoutPromise,
    ]);
  } catch (err) {
    err.llmReturned = llmReturned;
    throw err;
  }
}

function stripFences(text) {
  return String(text || '')
    .replace(/^```[\w]*\n?/m, '')
    .replace(/\n?```$/m, '')
    .trim();
}

/**
 * @param {string} bookDir
 * @param {string} bookId
 * @param {ReturnType<import('../../inkos-runtime/src/runtime/execution-guard.js').createExecutionGuard>} [guard]
 */
export function createStudioLlmWriter(bookDir, bookId, guard = null) {
  return async function studioLlmWriter({ scene, prompt, chapter, bookDir: bd, ctx, intent, trace = null }) {
    const sceneIndex = scene?.index ?? null;
    const sceneLabel = `Scene ${sceneIndex ?? '?'}/${intent?.scenes?.length ?? '?'}`;
    const taskId = guard?.getTaskId?.() ?? null;
    const runBookDir = bd || bookDir;

    if (guard?.isTaskAborted?.()) {
      const reason = guard.getAbortReason() || 'Pipeline 已中止';
      const err = new Error(reason.startsWith('Pipeline') ? reason : `Pipeline 已中止：${reason}`);
      studioEmitRuntimeEvent(bookDir, bookId, 'pipelineFailed', { bookDir, chapter, error: err.message, scene: sceneIndex });
      throw err;
    }
    if (guard?.isStaleTask?.(taskId)) {
      const err = new Error('任务已被新的生成请求取代');
      studioEmitRuntimeEvent(bookDir, bookId, 'pipelineFailed', { bookDir, chapter, error: err.message, scene: sceneIndex });
      throw err;
    }

    if (guard && sceneIndex != null) {
      try {
        guard.acquireSceneLock(chapter, sceneIndex, taskId);
      } catch (err) {
        studioEmitRuntimeEvent(bookDir, bookId, 'pipelineFailed', {
          bookDir,
          chapter,
          error: err.message,
          scene: sceneIndex,
        });
        throw err;
      }
    }

    const storyDna = readStoryDna(runBookDir) || {};
    const styleDna = readSystemFile(runBookDir, 'style_dna') || {};

    let hashDep = scene?._hashDependency;
    if (!hashDep) {
      hashDep = runHashDependencyCheck({
        bookDir: runBookDir,
        chapter,
        scene,
        ctx,
        storyDna,
        styleDna,
        persistState: true,
      });
    } else if (hashDep.mustRecompile) {
      hashDep = runHashDependencyCheck({
        bookDir: runBookDir,
        chapter,
        scene,
        ctx,
        storyDna,
        styleDna,
        persistState: false,
        regenerating: true,
      });
      studioEmitRuntimeEvent(bookDir, bookId, 'hashDependencyTreeUpdated', {
        chapter,
        scene: sceneIndex,
        tree: hashDep.tree,
        regenerating: true,
      });
    } else {
      runHashDependencyCheck({
        bookDir: runBookDir,
        chapter,
        scene,
        ctx,
        storyDna,
        styleDna,
        persistState: true,
      });
    }

    let basePrompt = prompt;
    if (hashDep.mustRecompile) {
      studioEmitRuntimeEvent(bookDir, bookId, 'pipelineStage', {
        chapter,
        scene: sceneIndex,
        stage: 'hash-dependency',
        status: 'running',
        detail: hashDep.invalidated || hashDep.changed.length > 0
          ? `${sceneLabel} Hash 变化 · 重新 Compile Prompt`
          : `${sceneLabel} 首次 Hash 基准 · 重新 Compile Prompt`,
      });
      basePrompt = compileScenePrompt(ctx, scene).text;
      const persisted = runHashDependencyCheck({
        bookDir: runBookDir,
        chapter,
        scene,
        ctx,
        storyDna,
        styleDna,
        persistState: true,
      });
      studioEmitRuntimeEvent(bookDir, bookId, 'hashDependencyTreeUpdated', {
        chapter,
        scene: sceneIndex,
        tree: persisted.tree,
        changed: persisted.changed,
        invalidated: false,
      });
    }

    const compileT0 = performance.now();
    const storyMem = runStoryMemory({
      bookDir: runBookDir,
      chapter,
      scene,
      ctx,
      storyDna,
    });

    const chapterDir = scene._chapterDirector || intent._chapterDirector || null;

    const { prompt: optimizedPrompt, compiled, meta: optMeta } = compileStudioWriterPrompt({
      basePrompt,
      scene,
      chapter,
      intent,
      ctx: { ...ctx, bookDir: runBookDir, styleDna },
      storyMemoryBlock: storyMem.writerBlock,
      storyDna,
      chapterDir,
    });
    // 密封产物：禁止再 splice / join 原始字符串
    if (compiled?.append) {
      // 保持引用以便调试；调用 append 会抛错
    }
    const compileMs = Math.round(performance.now() - compileT0);
    persistWriterOptimizationMeta(runBookDir, chapter, scene, optMeta);

    studioEmitRuntimeEvent(bookDir, bookId, 'pipelineStage', {
      chapter,
      scene: sceneIndex,
      stage: 'prompt-compiler',
      status: 'done',
      detail: `${sceneLabel} PromptCompiler · tokens=${optMeta.tokens?.total ?? '?'} · clipped=${(optMeta.budget?.clipped || []).join(',') || 'none'}`,
    });

    const executionPlan = optMeta.executionPlan;
    const beatCount = executionPlan?.beats?.length || 0;
    const modeDecision = resolveWriterModeForScene({
      scene,
      executionPlan,
      forceScene: scene?.forceSceneWrite || executionPlan?.forceSceneWrite,
    });
    const writerMode = modeDecision.mode;
    const sceneTypeForSample = executionPlan?.sceneType || scene?.sceneType || 'standard';
    const goldenSample = resolveGoldenSample({
      bookDir: runBookDir,
      styleDna,
      writingBible: ctx?.writingBible || '',
      sceneType: sceneTypeForSample,
    });

    studioEmitRuntimeEvent(bookDir, bookId, 'pipelineStage', {
      chapter,
      scene: sceneIndex,
      stage: 'writer',
      status: 'running',
      detail: writerMode === 'scene'
        ? `${sceneLabel} Scene 例外 · ${modeDecision.reason}`
        : `${sceneLabel} Beat Slimmer · ${beatCount} 段 · ${modeDecision.reason}`,
    });

    const llmConfig = loadInkOsConfig().llm;
    let llmCalls = 0;
    let totalLlmLatency = 0;
    let accInputTokens = 0;
    let accOutputTokens = 0;
    let accCachedTokens = 0;
    let tokenSource = 'estimated';

    const llmFn = async ({ system, userPrompt, beat, temperature, model: modelOverride, maxTokensHint }) => {
      if (guard?.isTaskAborted?.() || guard?.isStaleTask?.(taskId)) {
        throw new Error(guard.getAbortReason?.() || '任务已被新的生成请求取代');
      }
      if (!llmConfig.apiKey) {
        throw new Error('未配置 LLM API Key（INKOS_LLM_API_KEY / LLM_API_KEY / OPENAI_API_KEY）');
      }
      llmCalls += 1;
      const t0 = performance.now();
      const beatTemp = Number.isFinite(temperature) ? temperature : 0.85;
      const maxTok = maxTokensHint
        || Math.min(llmConfig.maxTokens || 2400, Math.round((beat?.wordBudget || 800) * 2.5));
      const llmResult = await callWriterWithTimeout(async () => chatCompletion({
        baseUrl: llmConfig.baseUrl,
        apiKey: llmConfig.apiKey,
        model: modelOverride || llmConfig.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userPrompt },
        ],
        maxTokens: maxTok,
        temperature: beatTemp,
      }), writerMode === 'scene'
        ? `${sceneLabel} Scene`
        : `${sceneLabel} Beat ${beat?.order}/${beatCount}`);

      totalLlmLatency += Math.round(performance.now() - t0);
      if (llmResult.usage) {
        accInputTokens += llmResult.usage.prompt_tokens ?? llmResult.usage.input_tokens ?? 0;
        accOutputTokens += llmResult.usage.completion_tokens ?? llmResult.usage.output_tokens ?? 0;
        accCachedTokens += llmResult.usage.prompt_cache_hit_tokens
          ?? llmResult.usage.cached_tokens
          ?? 0;
        tokenSource = 'llm_api';
      } else {
        accInputTokens += countTokens(`${system}\n${userPrompt}`);
        accOutputTokens += countTokens(llmResult.content);
      }
      return stripFences(llmResult.content);
    };

    try {
      const beatResult = writerMode === 'scene'
        ? await executeSceneWrite({
          executionPlan,
          basePrompt: optimizedPrompt,
          llmFn,
          intent: { ...intent, _bookDir: runBookDir, _styleDna: styleDna, styleDna },
          scene: { ...scene, _bookDir: runBookDir },
          goldenSample,
          bookDir: runBookDir,
          onStart: () => {
            studioEmitRuntimeEvent(bookDir, bookId, 'pipelineStage', {
              chapter,
              scene: sceneIndex,
              stage: 'writer-scene',
              status: 'running',
              detail: `${sceneLabel} · Scene 级生成中…`,
            });
          },
          onComplete: () => {
            studioEmitRuntimeEvent(bookDir, bookId, 'pipelineStage', {
              chapter,
              scene: sceneIndex,
              stage: 'writer-scene',
              status: 'done',
              detail: `${sceneLabel} · Scene 完成`,
            });
          },
        })
        : await executeBeatSequence({
          executionPlan,
          basePrompt: optimizedPrompt,
          llmFn,
          intent: {
            ...intent,
            _bookDir: runBookDir,
            _styleDna: styleDna,
            styleDna,
            _continuityState: loadChapterContinuity(runBookDir, chapter),
          },
          scene: { ...scene, _bookDir: runBookDir },
          continuityState: loadChapterContinuity(runBookDir, chapter),
          onBeatStart: (beat) => {
            studioEmitRuntimeEvent(bookDir, bookId, 'pipelineStage', {
              chapter,
              scene: sceneIndex,
              stage: 'writer-beat',
              status: 'running',
              detail: `${sceneLabel} · Beat ${beat.order}/${beatCount} ${beat.label} [${beat.libraryBeat}]`,
            });
          },
          onBeatComplete: (beat) => {
            studioEmitRuntimeEvent(bookDir, bookId, 'pipelineStage', {
              chapter,
              scene: sceneIndex,
              stage: 'writer-beat',
              status: 'done',
              detail: `${sceneLabel} · Beat ${beat.order} ${beat.label} 完成`,
            });
          },
        });

      if (beatResult.continuityState) {
        saveChapterContinuity(runBookDir, chapter, beatResult.continuityState);
        scene.continuityState = beatResult.continuityState;
      }
      persistBeatExecutionLog(runBookDir, chapter, scene, beatResult);
      scene.sceneOutcome = beatResult.sceneOutcome;
      scene.executionPlan = executionPlan;
      scene.beatArtifacts = beatResult.beatArtifacts || [];
      if (trace?.recordBeat) {
        for (const art of scene.beatArtifacts) {
          trace.recordBeat(sceneIndex || 1, art.order ?? art.beatOrder ?? 0, art);
        }
      }

      const draftText = beatResult.text;
      if (!draftText) throw new Error(`${sceneLabel} Beat Execution 返回空正文`);

      // 先落 Scene 正文，避免后续 Intelligence/Optimizer 异常导致「有 Beat 无章节」
      scene.text = draftText;
      scene.status = scene.status === 'done' ? 'done' : 'draft';
      if (beatResult.needsHumanReview) {
        scene.needsHumanReview = true;
        scene.reviewReason = 'writer_v2_gate_failed_after_degrade';
      }

      const intelligence = buildExecutionIntelligence({
        beatResult,
        executionPlan,
        scene,
        intent,
        draftText,
      });
      const intelligencePath = persistExecutionIntelligence(runBookDir, chapter, scene, intelligence);

      studioEmitRuntimeEvent(bookDir, bookId, 'beatExecutionComplete', {
        bookDir,
        chapter,
        scene: sceneIndex,
        beatCount,
        libraryTypes: executionPlan.libraryTypesUsed,
        hookLadder: executionPlan.hookLadderEntry?.type || executionPlan.hookLadderEntry?.id,
        hookOutput: intelligence.hookLevel?.hookOutput,
        sceneOutcome: beatResult.sceneOutcome,
      });

      const readerFeedback = processSceneReaderFeedback({
        bookDir: runBookDir,
        chapter,
        scene,
        intent,
        readerSimulation: intelligence.readerSimulation,
        beatMemory: intelligence.beatMemory,
        executionPlan,
        storyMemoryHints: storyMem.hints,
        storyMemoryMetrics: storyMem.metrics,
        draftText,
        emotionCurve: intelligence.emotionCurve,
      });

      studioEmitRuntimeEvent(bookDir, bookId, 'readerFeedbackLoop', {
        bookDir,
        chapter,
        scene: sceneIndex,
        continueProbability: intelligence.readerSimulation?.continueProbability,
        dropRisk: intelligence.readerSimulation?.dropRisk,
        questionCount: intelligence.readerSimulation?.questionCount,
        curiosity: intelligence.readerSimulation?.curiosity,
        directives: readerFeedback.analysis?.directives?.slice(0, 4),
        adjustments: readerFeedback.analysis?.adjustments,
        feedbackPath: readerFeedback.feedbackPath,
        hookLadderChapterBoost: readerFeedback.hookLadderChapterBoost,
        elementEngagement: readerFeedback.engagement,
      });

      studioEmitRuntimeEvent(bookDir, bookId, 'writerExecutionIntelligence', {
        bookDir,
        chapter,
        scene: sceneIndex,
        sceneType: executionPlan.sceneType,
        curiosity: intelligence.readerSimulation?.curiosity,
        continueProbability: intelligence.readerSimulation?.continueProbability,
        dropRisk: intelligence.readerSimulation?.dropRisk,
        beatCompliance: intelligence.beatCompliance,
        emotionCurve: intelligence.emotionCurve?.scenePeak,
        hookLevel: intelligence.hookLevel,
        hookOutput: intelligence.hookLevel?.hookOutput,
        reward: intelligence.reward,
        rewardDelivery: intelligence.rewardDelivery,
        intelligencePath,
      });

      studioEmitRuntimeEvent(bookDir, bookId, 'pipelineStage', {
        chapter,
        scene: sceneIndex,
        stage: 'writer-optimizer',
        status: 'running',
        detail: `${sceneLabel} Writer Optimizer · 条件触发检查…`,
      });

      // 降本：启发式追读分折算 hookScore；≥ 7 跳过 Optimizer LLM 调用
      const approxHook = Math.round(
        (Number(intelligence.readerSimulation?.continueProbability) || 50) / 10,
      );
      const optimizerGate = {
        hookScore: approxHook,
        dragSections: intelligence.readerSimulation?.dropRisk >= 60
          ? ['drop-risk-high']
          : [],
      };
      const runOptimizer = shouldTriggerOptimizer(optimizerGate);

      let optimized;
      if (!runOptimizer) {
        optimized = {
          text: draftText,
          polishedText: draftText,
          total: approxHook * 10,
          totalBefore: approxHook * 10,
          scores: {},
          scoresBefore: {},
          modules: [],
          polish: { changed: false },
          beatCompliance: intelligence.beatCompliance,
          readerSimulation: intelligence.readerSimulation,
          emotionCurve: intelligence.emotionCurve,
          reportPath: null,
          draftPath: null,
          polishedPath: null,
          skipped: true,
          skipReason: `approxHook=${approxHook} ≥ ${OPTIMIZER_HOOK_FLOOR}`,
        };
        studioEmitRuntimeEvent(bookDir, bookId, 'pipelineStage', {
          chapter,
          scene: sceneIndex,
          stage: 'writer-optimizer',
          status: 'skipped',
          detail: `${sceneLabel} Optimizer 跳过（${optimized.skipReason}）`,
        });
      } else {
        const polishFn = llmConfig.apiKey
          ? async (module, fragment, instructions) => {
            const res = await chatCompletion({
              baseUrl: llmConfig.baseUrl,
              apiKey: llmConfig.apiKey,
              model: llmConfig.model,
              messages: [
                {
                  role: 'system',
                  content: [
                    `你是小说 ${module} 局部优化器，只改写用户提供的片段。`,
                    '禁止全文重写，禁止改变剧情事实、人物关系与事件结果。',
                    '只输出优化后的片段正文，不要解释，不要 markdown 代码块。',
                  ].join('\n'),
                },
                { role: 'user', content: `${instructions}\n\n【待优化片段 · ${module}】\n${fragment}` },
              ],
              maxTokens: Math.min(900, llmConfig.maxTokens || 900),
              temperature: Math.min(0.85, llmConfig.temperature ?? 0.7),
            });
            return res.content;
          }
          : null;

        if (typeof runWriterOptimizer !== 'function') {
          throw new Error('runWriterOptimizer 未加载（@inkos/writer-optimizer）');
        }
        optimized = await runWriterOptimizer({
          text: draftText,
          scene,
          chapter,
          intent,
          ctx,
          styleDna,
          bookDir: runBookDir,
          polishFn,
          beatParts: beatResult.parts,
          executionPlan,
          beatCompliance: intelligence.beatCompliance,
          readerSimulation: intelligence.readerSimulation,
          emotionCurve: intelligence.emotionCurve,
          executionIntelligence: intelligence,
        });
      }

      const finalText = optimized.polishedText || optimized.text;

      studioEmitRuntimeEvent(bookDir, bookId, 'pipelineStage', {
        chapter,
        scene: sceneIndex,
        stage: 'writer-optimizer',
        status: optimized.skipped ? 'skipped' : 'done',
        detail: optimized.skipped
          ? `${sceneLabel} Optimizer 跳过 · ${optimized.skipReason}`
          : `${sceneLabel} Optimizer ${optimized.total} 分${optimized.polish?.changed ? ' · 四模块优化' : ''}`,
      });

      studioEmitRuntimeEvent(bookDir, bookId, 'writerOptimizerReport', {
        bookDir,
        chapter,
        scene: sceneIndex,
        total: optimized.total,
        totalBefore: optimized.totalBefore,
        scores: optimized.scores,
        scoresBefore: optimized.scoresBefore,
        modules: optimized.modules,
        polishChanged: optimized.polish?.changed,
        beatCompliance: optimized.beatCompliance,
        readerSimulation: optimized.readerSimulation,
        emotionCurve: optimized.emotionCurve,
        reportPath: optimized.reportPath,
        draftPath: optimized.draftPath,
        polishedPath: optimized.polishedPath,
        skipped: Boolean(optimized.skipped),
        skipReason: optimized.skipReason || null,
      });

      let cachedTokens = accCachedTokens;
      let cacheHit = accCachedTokens > 0;
      try {
        const brainMetrics = loadPromptMetrics(runBookDir, chapter);
        const brainEntry = brainMetrics.scenes?.find((s) => s.sceneId === scene.id);
        if (brainEntry && !accCachedTokens) {
          cachedTokens = brainEntry.cached_tokens ?? 0;
          cacheHit = Boolean(brainEntry.cache_hit);
        }
      } catch { /* ignore */ }

      const budgetReport = sceneIndex != null
        ? readSceneBudget(runBookDir, chapter, sceneIndex)
        : null;

      const tokenRecord = buildTokenRecord({
        inputText: optimizedPrompt,
        outputText: finalText,
        usage: tokenSource === 'llm_api'
          ? { prompt_tokens: accInputTokens, completion_tokens: accOutputTokens }
          : null,
        model: llmConfig.model,
        temperature: llmConfig.temperature,
        latencyMs: totalLlmLatency,
        retryCount: 0,
        cacheHit,
      });

      const metricsPayload = recordScenePromptMetrics(runBookDir, chapter, scene, {
        ...tokenRecord,
        input_tokens: accInputTokens || (tokenRecord.input_tokens ?? countTokens(optimizedPrompt)),
        output_tokens: accOutputTokens || (tokenRecord.output_tokens ?? countTokens(finalText)),
        cached_tokens: cachedTokens,
        cache_hit: cacheHit,
        compile_time_ms: compileMs,
        compile_time: compileMs,
        llm_latency_ms: totalLlmLatency,
        llm_latency: totalLlmLatency,
        llm_calls: llmCalls,
        beat_count: beatCount,
        beat_execution: true,
        reader_curiosity: intelligence.readerSimulation?.curiosity,
        continue_probability: intelligence.readerSimulation?.continueProbability,
        drop_risk: intelligence.readerSimulation?.dropRisk,
        beat_compliance_avg: intelligence.beatCompliance?.average,
        optimizer_rewrites: 0,
        optimizer_total: optimized.total,
        optimizer_scores: optimized.scores,
        commercial_score: optimized.total,
        quality: optimized.total,
        budget_usage: budgetReport?.totalTokens
          ? Math.min(100, Math.round(((accInputTokens || countTokens(optimizedPrompt)) / budgetReport.totalTokens) * 100))
          : null,
        token_source: tokenSource,
        budget: budgetReport
          ? {
            sceneType: budgetReport.sceneType,
            totalTokens: budgetReport.totalTokens,
            limits: budgetReport.limits,
          }
          : null,
      });

      studioEmitRuntimeEvent(bookDir, bookId, 'promptMetricsUpdated', {
        bookDir,
        chapter,
        scene: sceneIndex,
        metrics: metricsPayload.metrics,
      });

      studioEmitRuntimeEvent(bookDir, bookId, 'pipelineStage', {
        chapter,
        scene: sceneIndex,
        stage: 'writer',
        status: 'done',
        detail: `${sceneLabel} 完成（${finalText.replace(/\s/g, '').length} 字）· ${beatCount} Beat · 追读 ${intelligence.readerSimulation?.continueProbability ?? '?'}% · Optimizer ${optimized.total} 分`,
      });

      return finalText;
    } catch (err) {
      if (guard && sceneIndex != null && err.message?.includes('超时')) {
        const outcome = guard.handleWriterTimeout(chapter, sceneIndex, { llmReturned: Boolean(err.llmReturned) });
        const msg = outcome.message || err.message;
        studioEmitRuntimeEvent(bookDir, bookId, 'pipelineFailed', {
          bookDir,
          chapter,
          error: msg,
          scene: sceneIndex,
          aborted: outcome.action === 'aborted',
        });
        throw new Error(msg);
      }
      // Beat 正文已写出时，后置 Intelligence/Optimizer 失败不吞稿
      const salvage = String(scene.text || '').trim();
      if (salvage) {
        studioEmitRuntimeEvent(bookDir, bookId, 'pipelineStage', {
          chapter,
          scene: sceneIndex,
          stage: 'writer',
          status: 'warning',
          detail: `${sceneLabel} 后置步骤失败，已保留 Beat 正文（${salvage.replace(/\s/g, '').length} 字）：${err.message}`,
        });
        if (guard && sceneIndex != null) {
          guard.clearSceneLock(chapter, sceneIndex);
        }
        return salvage;
      }
      if (guard && sceneIndex != null) {
        guard.clearSceneLock(chapter, sceneIndex);
      }
      studioEmitRuntimeEvent(bookDir, bookId, 'pipelineFailed', {
        bookDir,
        chapter,
        error: err.message,
        scene: sceneIndex,
      });
      throw err;
    }
  };
}
