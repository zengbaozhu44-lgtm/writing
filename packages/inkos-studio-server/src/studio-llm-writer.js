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
import { ensureObservedContinuity } from '../../inkos-prompt/src/scene-observed-continuity.js';
import { ensureActualEvents } from '../../inkos-brain/src/events/index.js';
import { applyCharacterSRAfterActual } from '../../inkos-brain/src/character/character-sr-updater.js';
import { applyAttributionAfterActual } from '../../inkos-brain/src/attribution/index.js';
import { attachActionIntentTruthFromCADE, attachCharacterActionTruth, attachWorldConsequenceTruth } from '../../inkos-brain/src/causality/index.js';
import { buildSceneWritePrompt } from '../../inkos-brain/src/scene/scene.js';
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
import {
  persistFinalContextCompile,
  persistFinalContextWriterCall,
  hashPromptText,
} from './writer-optimization/final-context-viewer.js';
import { resolveStoryClock } from '../../inkos-core/src/lib/story-clock.js';
import { runWriterOptimizer } from '@inkos/writer-optimizer';
import { executeBeatSequence } from './writer-optimization/beat-execution.js';
import {
  createContinuityState,
  deriveBodyStateFromFacts,
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

function loadChapterContinuity(bookDir, chapter, facts = null) {
  // B) F013 播种：事实库确立的左臂焦毁/知觉丧失 → 注入连续状态，
  //    使 validateCrossBeatConsistency 从 Scene1 首拍就拦截左臂主动作（而非后置修正）。
  const seedFactBody = (base) => {
    const factBody = deriveBodyStateFromFacts(facts);
    if (factBody.leftArm) base.leftArm = factBody.leftArm;
    if (factBody.rightArm) base.rightArm = factBody.rightArm;
    return base;
  };
  try {
    const file = continuityPath(bookDir, chapter);
    if (!exists(file)) return seedFactBody(createContinuityState());
    return seedFactBody(createContinuityState(readJson(file)));
  } catch {
    return seedFactBody(createContinuityState());
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

/**
 * 书籍档案：world bible + facts + state board + 写作 bible + 角色 bible 名单 + POV。
 * 供 beat-continuity 按书籍语境门控 cyberpunk 意象规则（青穹/浮空城/权限/机械左臂…）：
 * 本书世界数据没提及的设定 → 对应提取规则不触发。
 * 非 cyberpunk 书（如《二手书店老板的最后一周》）不再把「铸铁煤炉」误判成「拘束操作台」、
 * 不再把普通动作误判成「系统界面/权限操作」、不再把新角色名误判成 林砚 系幻觉名。
 * 按章缓存（每章构建一次；Scene 间复用）。
 */
function buildContinuityProfile(ctx = {}) {
  const vocabParts = [
    ctx.worldBible,
    ctx.stateBoard,
    ctx.writingBible,
    (ctx.facts || []).map((f) => f?.fact || f?.text || '').join('\n'),
  ];
  const names = new Set();
  try {
    const bibleDir = ctx.modules?.character_bible;
    if (bibleDir && fs.existsSync(bibleDir)) {
      for (const f of fs.readdirSync(bibleDir)) {
        if (!f.endsWith('.md') || f.startsWith('_')) continue;
        names.add(f.replace(/\.md$/, '').replace(/（[^）]*）$/, '').trim());
      }
    }
  } catch { /* 角色档目录缺失时忽略 */ }
  if (ctx.pov) names.add(String(ctx.pov).replace(/（[^）]*）$/, '').trim());
  for (const p of ctx.present || []) names.add(String(p).replace(/（[^）]*）$/, '').trim());
  return {
    vocab: vocabParts.filter(Boolean).join('\n'),
    characters: [...names].filter(Boolean),
    pov: ctx.pov || null,
  };
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

/** Names that may appear in prose — never from Plan goals. */
function collectSceneKnownNames(scene = {}, intent = {}) {
  const names = [];
  if (scene.pov) names.push(String(scene.pov));
  if (intent.pov) names.push(String(intent.pov));
  for (const c of scene.characters || []) {
    names.push(typeof c === 'string' ? c : c?.name);
  }
  for (const c of intent.characters || intent.cast || []) {
    names.push(typeof c === 'string' ? c : c?.name);
  }
  return [...new Set(names.map((n) => String(n || '').trim()).filter(Boolean))];
}

/**
 * @param {string} bookDir
 * @param {string} bookId
 * @param {ReturnType<import('../../inkos-runtime/src/runtime/execution-guard.js').createExecutionGuard>} [guard]
 */
export function createStudioLlmWriter(bookDir, bookId, guard = null) {
  // 跨 Scene 预防式防复读：本章内已判复读的短语累积，传给后续 Scene 首稿 prompt（换章清空）
  let chapterUsedImages = new Set();
  let chapterUsedImagesChapter = null;
  // 书籍档案按章缓存（vocab/角色名/POV 每章构建一次）
  let chapterProfileCache = { chapter: null, profile: null };
  return async function studioLlmWriter({ scene, prompt, chapter, bookDir: bd, ctx, intent, trace = null }) {
    const sceneIndex = scene?.index ?? null;
    const sceneLabel = `Scene ${sceneIndex ?? '?'}/${intent?.scenes?.length ?? '?'}`;
    const taskId = guard?.getTaskId?.() ?? null;
    const runBookDir = bd || bookDir;

    // 换章时重置跨 Scene 累积
    if (chapterUsedImagesChapter !== chapter) {
      chapterUsedImages = new Set();
      chapterUsedImagesChapter = chapter;
    }

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

    // EO-P4-Causal-Bridge-01: CADE → Action Intent Truth (consume-only; absent-by-default)
    // Must run before Prompt compile so Writer can realize Y without minting Intent.
    try {
      attachActionIntentTruthFromCADE(runBookDir, chapter, scene);
    } catch (cadeErr) {
      console.warn('[studio-writer] Action Intent bridge skipped:', cadeErr?.message || cadeErr);
      scene.actionIntentTruth = scene.actionIntentTruth || {
        status: 'absent',
        reason: 'bridge_error',
        isChoice: false,
      };
    }

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
    // Action Intent Truth 由 compiler 的 action_intent_truth 模块（canonical）注入；
    // 此处曾手工追加 scene._actionIntentPromptBlock 造成 Studio prompt 双重注入，已移除
    // （presentation cleanup · 不改 Truth / 不影响 Runtime）。
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
      // F1: never replace L2 with bare compileScenePrompt (drops Clock / IB header)
      const dynamic = compileScenePrompt(ctx, scene);
      basePrompt = buildSceneWritePrompt(ctx, intent || {}, scene, dynamic);
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
      storyMemory: storyMem,
      storyDna,
      chapterDir,
    });
    // 密封产物：禁止再 splice / join 原始字符串
    if (compiled?.append) {
      // 保持引用以便调试；调用 append 会抛错
    }
    const compileMs = Math.round(performance.now() - compileT0);
    persistWriterOptimizationMeta(runBookDir, chapter, scene, optMeta);

    // F2: READ-ONLY final-context snapshot (L1/L2/L3) — observability only
    try {
      const l1Text = typeof scene?.dynamic === 'string'
        ? scene.dynamic
        : (scene?.dynamic?.text || '');
      const clock = resolveStoryClock({ ctx, intent, scene });
      persistFinalContextCompile(runBookDir, chapter, scene, {
        l1Text,
        l2Text: basePrompt,
        l3Text: optimizedPrompt,
        sealedHash: hashPromptText(optimizedPrompt),
        clockSource: clock?.source || null,
        ibSource: 'buildSceneWritePrompt / Semantic Protected Context',
        intent,
        ctx,
        l1Modules: typeof scene?.dynamic === 'object' ? scene.dynamic?.modules : null,
      });
    } catch {
      /* observability must not break Writer */
    }

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
      // F2: record exact userPrompt hash for the Writer call (READ-ONLY artifact)
      try {
        persistFinalContextWriterCall(runBookDir, chapter, scene, {
          userPrompt,
          beatOrder: beat?.order ?? null,
          callId: `s${sceneIndex}-b${beat?.order ?? 'x'}-c${llmCalls}`,
          systemPrompt: system,
          intent,
          ctx,
        });
      } catch {
        /* observability must not break Writer */
      }
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
          intent: { ...intent, _bookDir: runBookDir, _chapter: chapter, _styleDna: styleDna, styleDna },
          scene: { ...scene, _bookDir: runBookDir, _chapter: chapter },
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
            _chapter: chapter,
            _styleDna: styleDna,
            styleDna,
            _continuityState: loadChapterContinuity(runBookDir, chapter, ctx?.facts),
          },
          scene: { ...scene, _bookDir: runBookDir, _chapter: chapter },
          continuityState: loadChapterContinuity(runBookDir, chapter, ctx?.facts),
          profile: (() => {
            if (chapterProfileCache.chapter !== chapter || !chapterProfileCache.profile) {
              chapterProfileCache = { chapter, profile: buildContinuityProfile(ctx || {}) };
            }
            return chapterProfileCache.profile;
          })(),
          // 跨 Scene 防重复：把本章已生成的前序 scene 正文并入比对基准（Beat 层同章重复检测）
          chapterTextSoFar: (intent?.scenes || [])
            .filter((s) => s.index != null && s.index < sceneIndex && s.text?.trim())
            .map((s) => s.text.trim())
            .join('\n\n'),
          // 跨 Scene 预防式：本章已 flag 的复读短语 → 注入本 Scene 首稿 prompt
          usedImagesSeed: [...chapterUsedImages],
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
      // 回传本 Scene 新 flag 的复读短语，累积进章级 usedImages（供后续 Scene 预防式注入）
      if (Array.isArray(beatResult.usedImages)) {
        for (const im of beatResult.usedImages) chapterUsedImages.add(im);
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

      // A) 防复读/身体禁令硬失败 → 场景级拒绝（Orchestrator 捕获后触发有界 replan）。
      //    必须在 scene.text 落盘前抛：正文不落盘 → 坏稿不进正文。
      if (beatResult.hardFail) {
        // 上抛前先把本 scene 已 flag 的复读短语累积进章级集合，
        // 供重规划后的重跑首稿 prompt 预防式避用（换章由外层清空）。
        if (Array.isArray(beatResult.usedImages)) {
          for (const im of beatResult.usedImages) chapterUsedImages.add(im);
        }
        const hardErr = new Error(`${sceneLabel} 硬失败：${beatResult.hardFailReason || '防复读/身体禁令未通过'}`);
        hardErr.code = 'SCENE_HARD_FAIL';
        hardErr.sceneIndex = sceneIndex;
        hardErr.llmReturned = true;
        // 续写锚句随错误上抛：重规划修正指令据此点名「从哪续写」（见 buildHardFailCorrection）
        hardErr.hardFailAnchor = beatResult.hardFailAnchor || '';
        studioEmitRuntimeEvent(bookDir, bookId, 'pipelineStage', {
          chapter,
          scene: sceneIndex,
          stage: 'writer-beat',
          status: 'retry',
          detail: `${sceneLabel} · 硬失败（拒绝接受 → 场景重规划）：${beatResult.hardFailReason || '防复读未通过'}`,
        });
        throw hardErr;
      }

      // 先落 Scene 正文，避免后续 Intelligence/Optimizer 异常导致「有 Beat 无章节」
      scene.text = draftText;
      // F6.2: scene-local Observed Continuity (projection from text; not Canon / SR)
      ensureObservedContinuity(scene);
      // Phase 1: Actual Event from text only (never Plan); persist with scenes JSON
      ensureActualEvents(scene, {
        knownNames: collectSceneKnownNames(scene, intent),
        stripPlan: true,
      });
      if (String(scene.text || '').trim() && !(scene.actualEvents || []).length) {
        const hardErr = new Error(`${sceneLabel} 硬失败：正文存在但无有效 Actual Event`);
        hardErr.code = 'ACTUAL_EVENT_REQUIRED';
        hardErr.sceneIndex = sceneIndex;
        hardErr.llmReturned = true;
        throw hardErr;
      }
      // EO-P4-Character-Action-Bridge-01: Intent Truth + matching occurrence → Character Action
      // (beside Actual; does not redefine occurrence; Attribution not required)
      try {
        attachCharacterActionTruth(scene);
      } catch (caErr) {
        console.warn('[studio-writer] Character Action bridge skipped:', caErr?.message || caErr);
        scene.characterActionTruth = scene.characterActionTruth || {
          status: 'absent',
          reason: 'bridge_error',
          isChoice: false,
        };
      }
      // EO-P4-World-Consequence-Bridge-01: Character Action + grounded W → World Consequence
      // (Studio Living 主路径必须与 Runtime Orchestrator 对齐；否则 N+1 读不到 WCT)
      try {
        attachWorldConsequenceTruth(scene);
      } catch (wcErr) {
        console.warn('[studio-writer] World Consequence bridge skipped:', wcErr?.message || wcErr);
        scene.worldConsequenceTruth = scene.worldConsequenceTruth || {
          status: 'absent',
          reason: 'bridge_error',
          isChoice: false,
        };
      }
      // Phase 3.2: Actual → IB → CharacterSR (never Plan / Reasoner / Living)
      try {
        applyCharacterSRAfterActual(runBookDir || bookDir, chapter, scene, {
          authoredCharacterSR: intent?.characterSR || intent?.authoredCharacterSR || null,
        });
      } catch (srErr) {
        if (srErr?.code === 'SR_FORBIDDEN_SOURCE') throw srErr;
        console.warn('[studio-writer] CharacterSR update skipped:', srErr?.message || srErr);
      }
      // Phase 4.4.1c: soft Attribution (never blocks Actual / later State)
      try {
        applyAttributionAfterActual(runBookDir || bookDir, chapter, scene, {
          characterSRState: scene.characterSRState || null,
        });
      } catch (attrErr) {
        console.warn('[studio-writer] Attribution soft wiring skipped:', attrErr?.message || attrErr);
      }
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
      if (err?.code === 'SCENE_HARD_FAIL') {
        // 硬失败不走 failEvent：guard 的 enrichEvent 会把 pipelineFailed 视为 failEvent →
        // abortTask 标记整个 task aborted，Orchestrator 的重规划再进 Writer 会立刻被
        // isTaskAborted 拦下（2026-08-13 新书第一章误伤案就是如此：replan 根本没跑 LLM）。
        // 只清 scene 锁 + 原样上抛，由 Orchestrator 捕获并发起有界重规划。
        if (guard && sceneIndex != null) guard.clearSceneLock(chapter, sceneIndex);
        throw err;
      }
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
