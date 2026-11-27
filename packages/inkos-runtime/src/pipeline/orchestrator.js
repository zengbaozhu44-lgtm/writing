/**
 * Runtime Orchestrator — 全自动闭环
 * World → State → Planner → Decision → Conflict → Scene → Writer → Review → ...
 */
import path from 'node:path';
import fs from 'node:fs';
import { writeText, writeJson, exists, readJson } from '../../../inkos-core/src/lib/paths.js';
import { loadInkOsConfig } from '../../../inkos-core/src/lib/config.js';
import { loadBrainContext, brainSystemDir } from '../../../inkos-brain/src/loader.js';
import { planChapter, replan, loadPriorChapterAnchor, loadAuthoredChapterPlan, isAuthoredPlanSpecific, serializeAuthoredPlanToIntent } from '../../../inkos-brain/src/planner/planner.js';
import { applyStoryMapToIntent } from '../../../inkos-brain/src/planner/story-map.js';
import { evaluateDecisions } from '../../../inkos-brain/src/decision/decision.js';
import { evaluateConflict } from '../../../inkos-brain/src/conflict/conflict.js';
import { detectIntraSceneRepetition, formatNoRepeatAddendum } from '../../../inkos-brain/src/quality/repetition-guard.js';
// 2a/2b: Scene 级语义因果门控（判定 + 按 failureReasons 分流重写；与复读护栏、八项词面校验独立）
import { evaluateSceneCausality, decideGateAction, formatCausalRewriteAddendum, formatMetricsHints, detectRewriteStaticRegression } from '../../../inkos-brain/src/validation/causal-gate.js';
// 3b-1: scene 级效率指标（feedback / rerank 共用，不重算）
import { computeSceneEfficiencyMetrics } from '../../../inkos-brain/src/metrics/metrics.js';
import { buildScenePlan, buildSceneWritePrompt, assembleChapter } from '../../../inkos-brain/src/scene/scene.js';
import { buildDynamicPrompt } from '../../../inkos-brain/src/prompt/dynamic-prompt.js';
import { ensureChapterCausalChain } from '../../../inkos-brain/src/causal/causal-reasoner.js';
import { createLlmWriter, isLlmConfigured } from '../../../inkos-brain/src/writer/llm-writer.js';
import {
  saveChapterPlan,
  saveSceneArtifacts,
  ensureBrainDir,
} from '../../../inkos-brain/src/memory/memory.js';
import { loadAdaptiveState } from '../../../inkos-brain/src/planner/adaptive.js';
import { EventBus } from '../event-bus.js';
import { Scheduler } from '../scheduler.js';
import { runScenePipeline, persistScenes } from './scene-pipeline.js';
import { runChapterPipeline } from './chapter-pipeline.js';
import { createChapterTrace } from './trace.js';
import { ChapterPipelineError, wrapOrchestratorError } from './chapter-pipeline-error.js';
import { ensureObservedContinuity } from '../../../inkos-prompt/src/scene-observed-continuity.js';
import { ensureActualEventsWithExtraction } from '../../../inkos-brain/src/events/index.js';
import { applyCharacterSRAfterActual } from '../../../inkos-brain/src/character/character-sr-updater.js';
import { syncCharacterWorldFromSeeds, loadCharacterWorld, projectWorldToSRScene, appendT2Experiences, ensureIdentityQuarantine } from '../../../inkos-brain/src/character/character-world.js';
import { runL1CharacterAudit, saveL1Audit } from '../../../inkos-brain/src/l1/l1-audit.js';
import { evaluateSceneSubjectEligibility, saveL1Eligibility } from '../../../inkos-brain/src/l1/l1-eligibility.js';
import { collectAccessEvidenceFromScene, runAccessGate } from '../../../inkos-brain/src/l1/access-gate.js';
import { runL1ProductionEvaluation } from '../../../inkos-brain/src/l1/l1-evaluation.js';
import { applyAttributionAfterActual } from '../../../inkos-brain/src/attribution/index.js';
import { attachActionIntentTruthFromCADE, attachCharacterActionTruth, attachWorldConsequenceTruth, mintCADEFromAuthoredDecisions } from '../../../inkos-brain/src/causality/index.js';
import { ensurePlanValidity } from '../../../inkos-prompt/src/plan-validity.js';

export class RuntimeOrchestrator {
  constructor(bookDir, options = {}) {
    this.bookDir = bookDir;
    this.config = loadInkOsConfig();
    this.options = options;
    this.bus = options.bus || new EventBus();
    this.scheduler = new Scheduler();
    this.maxReplan = options.maxReplan ?? this.config.runtime?.maxReplan ?? 3;
    this.writer = options.writer ?? (options.autoWrite !== false && isLlmConfigured() ? createLlmWriter(options.llm) : null);
    /** @type {(phase: string, payload: object) => Promise<object|null>} */
    this.sceneLifecycleHook = options.sceneLifecycleHook ?? null;
  }

  async _invokeSceneLifecycleHook(phase, payload) {
    if (!this.sceneLifecycleHook) return null;
    try {
      return await this.sceneLifecycleHook(phase, payload);
    } catch (err) {
      if (process.env.INKOS_DEBUG === '1' && this.bookDir) {
        try {
          const fs = await import('node:fs');
          const path = await import('node:path');
          const dir = path.join(this.bookDir, 'novel', '_system', 'runtime', 'runtime-debug');
          fs.mkdirSync(dir, { recursive: true });
          const file = path.join(dir, 'scene-lifecycle-hook-error.log');
          const entry = JSON.stringify({
            at: new Date().toISOString(),
            phase,
            chapter: payload?.chapter ?? null,
            scene: payload?.scene?.index ?? payload?.scene ?? null,
            name: err?.constructor?.name || 'Error',
            message: err?.message || String(err),
            stack: err?.stack || '',
          });
          fs.appendFileSync(file, `${entry}\n`, 'utf8');
        } catch { /* ignore */ }
      }
      return null;
    }
  }

  async runChapter(options = {}) {
    return this.scheduler.enqueue(async () => {
      try {
        return await this._runChapter(options);
      } catch (err) {
        const wrapped = wrapOrchestratorError(err, {
          chapter: options.chapter,
          bookDir: this.bookDir,
        });
        try {
          await this.bus.emit('pipelineFailed', {
            bookDir: this.bookDir,
            chapter: options.chapter,
            error: wrapped.error || wrapped.userMessage || wrapped.message || 'Pipeline 失败',
            pipeline: wrapped,
          });
        } catch { /* ignore */ }
        return wrapped;
      }
    }, { type: 'chapter', chapter: options.chapter });
  }

  async resumeChapter(chapter, options = {}) {
    const scenesFile = path.join(brainSystemDir(this.bookDir), `ch_${String(chapter).padStart(4, '0')}_scenes.json`);
    const planFile = path.join(brainSystemDir(this.bookDir), `ch_${String(chapter).padStart(4, '0')}_plan.json`);
    if (!exists(scenesFile) || !exists(planFile)) {
      return this.runChapter({ chapter, ...options });
    }
    const { scenes } = readJson(scenesFile);
    const plan = readJson(planFile);
    return this._runScenesAndChapter(chapter, plan.intent, scenes, {
      ...options,
      conflictResult: plan.conflictResult,
    });
  }

  async _runChapter(options = {}) {
    const ctx = loadBrainContext(this.bookDir, {
      chapter: options.chapter,
      pov: options.pov,
      present: options.present,
    });
    const trace = options._trace || createChapterTrace(this.bookDir, ctx.chapter, {
      label: options.label || 'runtime-chapter',
    });
    // 每章执行上下文：章节重规划 / 场景重规划共用同一预算（有界重入 _runChapter 的依据）。
    // attempt=执行轮次；chapterReplanCount=metrics/validation replanIntent 重入次数；
    // sceneReplanCount=scene 失败重入次数；sceneHardFailCount=Studio 硬失败重规划次数（镜像）。
    const execCtx = options._execCtx
      || { attempt: 1, chapterReplanCount: 0, sceneReplanCount: 0, sceneHardFailCount: 0, reasons: [] };
    if (!options._execCtx) options._execCtx = execCtx;
    const pipeline = {
      version: 'runtime-2.0',
      bookDir: this.bookDir,
      chapter: ctx.chapter,
      traceId: trace.traceId,
      startedAt: new Date().toISOString(),
      stages: [],
      pass: false,
    };

    ensureBrainDir(this.bookDir);
    trace.recordStage('start', { chapter: ctx.chapter, options: { pov: options.pov, force: options.force } });

    // 强制加载上一章 Anchor（ch_(N-1)_anchor.yaml）；第 1 章无 prior
    const priorChapter = Number(ctx.chapter) - 1;
    let priorAnchor = null;
    if (priorChapter >= 1) {
      priorAnchor = loadPriorChapterAnchor(this.bookDir, priorChapter, { required: true });
      console.log('[anchor] loaded prior', `states/ch_${String(priorChapter).padStart(4, '0')}_anchor.yaml`);
    }
    const planCtx = { ...ctx, priorAnchor };

    // 章节重规划重入（metrics/validation 失败 → replanIntent → _resolveChapterResult → presetIntent）。
    // 必须在 authored-plan 之前：重规划时 authored plan 仍存在，若不优先用修正后的 intent，
    // 会重新走同一份 authored intent → 同样的失败 → 重规划永不生效（只有预算打满）。
    if (options.presetIntent) {
      const presetIntent = options.presetIntent;
      const presetSource = presetIntent._replanSource || 'preset_intent';
      const presetConflict = {
        pass: true,
        types: [String(presetIntent.conflict || 'no_causal_basis')],
        primary: String(presetIntent.conflict || 'no_causal_basis'),
      };
      trace.recordStage('planner', {
        attempt: execCtx.chapterReplanCount + 1,
        summary: presetIntent?.mainGoal || presetIntent?.chapterIntent,
        intent: summarizeIntent(presetIntent),
        source: presetSource,
      });
      trace.recordStage('decision', { pass: true, source: presetSource });
      trace.recordStage('conflict', { pass: true, types: presetConflict.types, source: presetSource });
      const scenes = buildScenePlan(presetIntent);
      trace.recordStage('scene_plan', {
        count: scenes.length,
        scenes: scenes.map((s) => ({ id: s.id, index: s.index, goal: s.goal })),
      });
      return this._resolveChapterResult(
        ctx.chapter,
        await this._runScenesAndChapter(ctx.chapter, presetIntent, scenes, {
          ...options,
          conflictResult: presetConflict,
          ctx,
          pipeline,
          _trace: trace,
        }),
        options,
        ctx,
        trace,
      );
    }

    // 优先采用 Studio 导演/人工确认的 chapter_{N}_plan.yaml（具体计划，权威）
    // 仅当不存在具体计划时才走 planChapter/decision/conflict 重试循环。
    const authoredPlan = loadAuthoredChapterPlan(this.bookDir, ctx.chapter);
    if (isAuthoredPlanSpecific(authoredPlan)) {
      console.log(`[orchestrator] ch${ctx.chapter} 使用已确认的具体章节计划（${authoredPlan._file}），跳过派生规划`);
      let authoredIntent = serializeAuthoredPlanToIntent(authoredPlan, ctx.chapter, priorAnchor);
      try { authoredIntent = applyStoryMapToIntent(authoredIntent, this.bookDir, ctx.chapter); } catch { /* ignore */ }
      const authoredConflict = {
        pass: true,
        types: [String(authoredPlan.conflict || 'no_causal_basis')],
        primary: String(authoredPlan.conflict || 'no_causal_basis'),
      };
      trace.recordStage('planner', {
        attempt: 1,
        summary: authoredIntent?.mainGoal || authoredIntent?.chapterIntent,
        intent: summarizeIntent(authoredIntent),
        source: 'authored_plan',
      });
      trace.recordStage('decision', { pass: true, source: 'authored_plan' });
      trace.recordStage('conflict', { pass: true, types: authoredConflict.types, source: 'authored_plan' });

      const scenes = buildScenePlan(authoredIntent);
      trace.recordStage('scene_plan', {
        count: scenes.length,
        scenes: scenes.map((s) => ({ id: s.id, index: s.index, goal: s.goal })),
      });
      return this._resolveChapterResult(
        ctx.chapter,
        await this._runScenesAndChapter(ctx.chapter, authoredIntent, scenes, {
          ...options,
          conflictResult: authoredConflict,
          ctx,
          pipeline,
          _trace: trace,
        }),
        options,
        ctx,
        trace,
      );
    }

    const weights = loadAdaptiveState(this.bookDir).weights;
    let intent = null;
    let decisionResult = null;
    let conflictResult = null;
    let replanCount = 0;

    while (replanCount < this.maxReplan) {
      intent = planChapter(planCtx, replanCount + 1, { weights, priorAnchor });
      pipeline.stages.push({ stage: 'planner', attempt: replanCount + 1, intent: summarizeIntent(intent) });
      trace.recordStage('planner', {
        attempt: replanCount + 1,
        summary: intent?.mainGoal || intent?.chapterIntent,
        intent: summarizeIntent(intent),
        voiceDnaForced: Boolean(intent?.voiceDna?.forced || intent?.anchorConstraints?.voiceDnaForced),
        bannedCount: intent?.bannedElements?.length || 0,
      });

      decisionResult = evaluateDecisions(ctx, intent);
      pipeline.stages.push({ stage: 'decision', pass: decisionResult.pass });
      trace.recordStage('decision', { pass: decisionResult.pass, attempt: replanCount + 1 });

      if (!decisionResult.pass) {
        await this.bus.emit('decisionRejected', { bookDir: this.bookDir, chapter: ctx.chapter, decisionResult });
        const reasons = decisionResult.decisions.flatMap((d) =>
          d.failures.map((f) => ({ type: 'decision', ...f, attempt: replanCount + 1 }))
        );
        intent = replan(planCtx, reasons);
        replanCount += 1;
        continue;
      }

      conflictResult = evaluateConflict(ctx, intent);
      pipeline.stages.push({ stage: 'conflict', pass: conflictResult.pass, types: conflictResult.types });
      trace.recordStage('conflict', {
        pass: conflictResult.pass,
        types: conflictResult.types,
        attempt: replanCount + 1,
      });

      if (!conflictResult.pass) {
        intent = replan(planCtx, [{ type: 'conflict', suggestObstacle: conflictResult.suggestObstacle, attempt: replanCount + 1 }]);
        replanCount += 1;
        continue;
      }

      break;
    }

    saveChapterPlan(this.bookDir, ctx.chapter, { intent, decisionResult, conflictResult, replanCount });

    if (!decisionResult?.pass || !conflictResult?.pass) {
      const stage = !decisionResult?.pass ? 'decision' : 'conflict';
      const detail = stage === 'decision'
        ? (decisionResult?.decisions || [])
          .filter((d) => !d.pass)
          .flatMap((d) => (d.failures || []).map((f) => f.reason))
          .slice(0, 3)
          .join('；')
        : (conflictResult?.suggestObstacle || '未检出有效冲突');
      const softWarnings = (decisionResult?.warnings || []).slice(0, 3);
      const biz = new ChapterPipelineError({
        stage,
        message: detail || `Planner 在最大重试后未通过 ${stage}`,
        recoverable: true,
        details: {
          replanCount,
          decisionPass: decisionResult?.pass ?? null,
          conflictPass: conflictResult?.pass ?? null,
          warnings: softWarnings,
        },
        userMessage: stage === 'decision'
          ? `【Decision 阶段失败】${detail || '决策校验未通过，请调整章任务或角色设定后重试'}`
          : `【Conflict 阶段失败】${detail}`,
      });
      Object.assign(pipeline, biz.toPipelineResult());
      pipeline.error = biz.userMessage;
      const finalized = trace.finalize({ pass: false, error: pipeline.error });
      pipeline.traceHtml = finalized.htmlPath;
      await this.bus.emit('pipelineFailed', { bookDir: this.bookDir, chapter: ctx.chapter, pipeline });
      return pipeline;
    }

    const scenes = buildScenePlan(intent);
    trace.recordStage('scene_plan', {
      count: scenes.length,
      scenes: scenes.map((s) => ({ id: s.id, index: s.index, goal: s.goal })),
    });
    return this._resolveChapterResult(
      ctx.chapter,
      await this._runScenesAndChapter(ctx.chapter, intent, scenes, {
        ...options,
        conflictResult,
        ctx,
        pipeline,
        _trace: trace,
      }),
      options,
      ctx,
      trace,
    );
  }

  /**
   * 章节结果解析 — replanIntent 有界重入 _runChapter 的唯一出口。
   * 仅当 result.pass===false 且携带 replanIntent 且非 force 时，用新 intent 重入（presetIntent）。
   * 预算 execCtx.chapterReplanCount 达到 this.maxReplan → 返回 replanExhausted，不再递归。
   * 重入前调用 _resetGuardForReplan（Studio 覆盖为 ExecutionGuard 单调闸复位）。
   */
  async _resolveChapterResult(chapter, result, baseOptions, ctx, trace) {
    if (!result || result.pass !== false || !result.replanIntent || baseOptions.force) {
      return result;
    }
    const execCtx = baseOptions._execCtx
      || (baseOptions._execCtx = { attempt: 1, chapterReplanCount: 0, sceneReplanCount: 0, sceneHardFailCount: 0, reasons: [] });
    if (execCtx.chapterReplanCount >= this.maxReplan) {
      trace.recordStage('chapter_replan_exhausted', {
        count: execCtx.chapterReplanCount,
        max: this.maxReplan,
        source: result.error || 'unknown',
      });
      return { ...result, pass: false, replanExhausted: true };
    }
    execCtx.chapterReplanCount += 1;
    const source = String(result.error || '').includes('Validation') ? 'validation_replan' : 'metrics_replan';
    execCtx.reasons.push(`chapter_replan#${execCtx.chapterReplanCount}(${source}): ${result.error || ''}`);
    const newIntent = result.replanIntent;
    newIntent._replanSource = source;
    newIntent.attempt = (newIntent.attempt || 1) + 1;
    trace.recordStage('chapter_replan', {
      count: execCtx.chapterReplanCount,
      max: this.maxReplan,
      source,
      summary: newIntent?.mainGoal || newIntent?.chapterIntent,
    });
    const guardReset = this._resetGuardForReplan(chapter, 'chapter_replan');
    if (guardReset?.error) {
      trace.recordStage('chapter_replan', {
        count: execCtx.chapterReplanCount,
        max: this.maxReplan,
        source,
        guardReset: guardReset.error,
      });
      return { ...result, pass: false, replanExhausted: true, error: `${result.error}；且 ExecutionGuard 重置失败：${guardReset.error}` };
    }
    return this._runChapter({
      ...baseOptions,
      chapter,
      _execCtx: execCtx,
      presetIntent: newIntent,
      _trace: trace,
    });
  }

  /** Scene 级重规划预算闸：计数 + 上限检查。Runtime 默认与章节共用 maxReplan。 */
  _consumeSceneReplanBudget(chapter, scene, sceneResult, options) {
    const execCtx = options._execCtx
      || (options._execCtx = { attempt: 1, chapterReplanCount: 0, sceneReplanCount: 0, sceneHardFailCount: 0, reasons: [] });
    execCtx.sceneReplanCount += 1;
    execCtx.reasons.push(`scene_${scene.index}: ${sceneResult.error || sceneResult.message || 'scene 失败'}`);
    return { allow: execCtx.sceneReplanCount <= this.maxReplan, execCtx };
  }

  /** 章节重规划前守卫重置钩子：Runtime 无 sceneProgress 单调闸，默认 no-op。Studio 覆盖为 ExecutionGuard 复位。 */
  _resetGuardForReplan(chapter, reason) {
    return null;
  }

  async _runScenesAndChapter(chapter, intent, scenes, options = {}) {
    // D3.2：章级因果链唯一入口（与 Studio 共用 ensureChapterCausalChain）。
    // 已有 intent.causalChain 不重推；失败不抛，下游缺块 / no_causal_basis。
    ensureChapterCausalChain(this.bookDir, intent, { chapter });
    const trace = options._trace || createChapterTrace(this.bookDir, chapter, {
      label: options.label || 'runtime-resume',
    });
    const pipeline = options.pipeline || {
      version: 'runtime-2.0',
      bookDir: this.bookDir,
      chapter,
      traceId: trace.traceId,
      startedAt: new Date().toISOString(),
      stages: [],
      pass: false,
    };
    pipeline.traceId = pipeline.traceId || trace.traceId;
    const ctx = options.ctx || loadBrainContext(this.bookDir, { chapter, pov: intent?.pov });
    // EO-CW-Store-Seed-01: book-level Character World（authored seed → validate → store；
    // 无 Projection / 无消费者——World 不进 prompt/Task/Writer）
    try {
      const cw = syncCharacterWorldFromSeeds(this.bookDir);
      if (cw.synced && cw.rejectedCount) {
        console.warn('[runtime] Character World seeds rejected items:', cw.rejectedCount);
      }
      // G1-A/Q7：historical quarantine 分类（只读 world.json；sidecar manifest 幂等生成）
      try {
        const q = ensureIdentityQuarantine(this.bookDir);
        if (q.invalid.length || q.unknown.length) {
          console.warn(`[g1a] quarantine manifest: invalid=${q.invalid.length} unknown=${q.unknown.length}`);
        }
      } catch (qErr) {
        console.warn('[g1a] quarantine classifier skipped:', qErr?.message || qErr);
      }
    } catch (cwErr) {
      console.warn('[runtime] Character World sync skipped:', cwErr?.message || cwErr);
    }
    // EO-CW-Projection-01: World 一次加载，逐场景投影进 SR（经既有 SR 通道；无 World→Writer 直连）
    const cwWorld = loadCharacterWorld(this.bookDir);
    const sceneResults = [];
    const useChapterText = Boolean(options.chapterText?.trim());
    const activeWriter = useChapterText ? null : this.writer;

    // EO-P4-Authored-CADE-Channel-01: authored 人物决策 → CADE sidecar
    //（唯一合法 CADE 生产通道；逐项 fail-closed；不扫 Plan 字段）
    try {
      const mint = mintCADEFromAuthoredDecisions(this.bookDir, chapter, intent);
      if (mint.rejected.length) {
        console.warn('[runtime] Authored CADE rejected items:', mint.rejected);
      }
    } catch (cadeMintErr) {
      console.warn('[runtime] Authored CADE mint skipped:', cadeMintErr?.message || cadeMintErr);
    }

    for (const scene of scenes) {
      if (scene.status === 'done' && scene.text?.trim()) {
        sceneResults.push({ pass: true, scene });
        continue;
      }

      // D3：compiler 只读 scene.causalChain（ctx 无 intent），逐 scene 携带整章因果链
      scene.causalChain = scene.causalChain || intent.causalChain || null;

      // Phase 1.R2：挂载 intent，使 compileScenePrompt 优先消费本轮 scenes[].text
      //（Studio/Runtime 整章结束才 persistScenes；否则 Scene2+ 会误读磁盘旧稿日期）
      ctx.intent = intent;
      ctx.chapterIntent = intent;

      // F8.3: Actual-aware Plan Validity BEFORE Director locks stale Goal/situation
      // (session/prompt diagnostic; ≠ Canon / Reality / SR; Repair ≠ Regenerate)
      ensurePlanValidity(scene, intent);

      // EO-P4-Causal-Bridge-01: CADE → Action Intent Truth (beside SR; Writer consume-only)
      try {
        attachActionIntentTruthFromCADE(this.bookDir, chapter, scene);
      } catch (cadeErr) {
        console.warn('[runtime] Action Intent bridge skipped:', cadeErr?.message || cadeErr);
      }

      const dynamicPrompt = buildDynamicPrompt(ctx, scene);
      scene.prompt = buildSceneWritePrompt(ctx, intent, scene, dynamicPrompt);
      scene.dynamic = dynamicPrompt;

      const planHook = await this._invokeSceneLifecycleHook('plan', {
        chapter,
        scene,
        intent,
        ctx,
      });
      if (planHook?.promptAppend) {
        scene.prompt = [scene.prompt, planHook.promptAppend].join('\n\n');
      }
      if (planHook?.scene?.directorBrief) {
        scene.directorBrief = planHook.scene.directorBrief;
      }
      // Director 富化产物回填：runDirectorPhase('plan') 把 enrichedIntent（含 _chapterDirector）
      // 只放进返回值，不污染原 intent。若不回填，studio writer 的 chapterDir 恒为 null，
      // buildSceneExecutionPlan 读不到 chapterEmotionWave.sceneTargets → beat 情绪落回机械轮转。
      if (planHook?.intent) {
        const directorKeys = [
          '_storyDirector', '_chapterDirector', '_storyDna', '_storyMemory',
          'hookLadder', 'hookCurve', 'mysteryCurve', 'payoffCurve',
          'nextChapterGuidanceInput', 'readerWhyContinue', 'readerAddictionGoal',
          'bookQuestion', 'chapterQuestion',
          '_readerPreference', 'readerPreference',
          '_adaptiveDirectorOverrides', '_adaptiveWriterDirectives',
        ];
        for (const key of directorKeys) {
          if (planHook.intent[key] !== undefined) intent[key] = planHook.intent[key];
        }
      }
      if (planHook?.scene) {
        const dirScene = planHook.scene;
        for (const key of [
          'goal', 'obstacle', 'choice', 'consequence', 'escalation',
          'newInformation', 'cliffhanger', 'hook',
          'scenePlan', 'situation', 'questions', 'readerWhy', 'sceneOutcome',
        ]) {
          if (dirScene[key] !== undefined) scene[key] = dirScene[key];
        }
        // 导演已用富化 intent 构建的语义 executionPlan（含 chapterEmotionWave 映射的 beat 情绪），
        // 回填后 resolveExecutionPlan 直接采用，无需重建
        if (dirScene.executionPlan?.beats?.length) {
          scene.executionPlan = dirScene.executionPlan;
        }
      }

      // F8.3: re-evaluate after Director may refresh goal text (still ≠ regenerate)
      ensurePlanValidity(scene, intent);

      const provided = options.scenes?.find((s) => s.id === scene.id || s.index === scene.index);
      if (provided?.text) scene.text = provided.text;

      if (!scene.text?.trim() && options.chapterText) {
        const parts = splitChapterToScenes(options.chapterText, scenes.length);
        scene.text = parts[scene.index - 1] || '';
      }

      if (!scene.text?.trim() && activeWriter) {
        scene.text = await activeWriter({
          bookDir: this.bookDir,
          chapter,
          scene,
          prompt: scene.prompt,
          ctx,
          intent,
          trace,
        });
      }

      // 2a/2b: 语义因果门控——单次写出后、章级 validate 前判定局面是否真变。
      // 2a 只记录；2b 按 failureReasons 分流：none→重写（计失败）、weak→重写一次
      // （不计失败）、strong+空→通过、strong+仅上游缺陷→通过+upstreamDefects 标记
      // （重写解决不了输入缺失）、strong+静态描摹→重写一次（有推进但夹静态段）。
      // INKOS_CAUSAL_GATE=0 时门控和重写都关闭。
      if (scene.text?.trim() && process.env.INKOS_CAUSAL_GATE !== '0' && activeWriter) {
        const maxGateRewrites = Number(process.env.INKOS_CAUSAL_GATE_REWRITES || 2);
        let gateFailures = 0; // 计失败次数（none 重写消耗；weak/strong+静态 不计）
        let gateRewrites = 0; // 总重写次数（上限）
        let gate;
        try {
          const goalLine = () => String(scene.prompt || '').split('\n').find((l) => l.startsWith('- 目标:')) || '';
          const prevLine = () => String(scene.prompt || '').split('\n').find((l) => l.startsWith('- 上一章结尾状态:')) || '';
          const runGate = () => evaluateSceneCausality({
            sceneText: scene.text,
            sceneContext: {
              goal: goalLine().replace('- 目标: ', '').slice(0, 200),
              conflict: String(scene.conflict || '').slice(0, 100),
              goalSlotFallback: scene.stateSummarySource === 'fallback',
            },
            prevState: {
              summary: prevLine().replace('- 上一章结尾状态: ', '').slice(0, 100),
              stateSummarySource: scene.stateSummarySource || '',
            },
            llm: this.options.causalGateLlm || null,
          });

          gate = await runGate();
          let decision = decideGateAction(gate);

          // 3b-1: 首版 metrics（重写循环前——hints 与反升检测需要首版基线）
          try {
            scene.metrics = computeSceneEfficiencyMetrics(scene.text, { causalGate: gate });
          } catch { /* metrics 可选 */ }

          // 2b 分流（写死，不做三档一刀切）：
          // - none → 重写（计失败次数），可重试至预算耗尽
          // - weak → 重写一次（不计失败）；重写后仍 weak 放行
          // - strong+空 → 通过
          // - strong+仅上游缺陷 → 通过 + upstreamDefects（重写解决不了输入缺失）
          // - strong+静态描摹 → 重写一次（不计失败）
          let weakOrStaticRewritten = false;
          const isWeakOrStatic = (d) => !d.countFailure; // weak / strong+静态
          while (decision.action === 'rewrite' && gateRewrites < maxGateRewrites && activeWriter) {
            // weak / strong+静态 只重写一次：已重写过则放行（记录但不阻塞）
            if (isWeakOrStatic(decision) && weakOrStaticRewritten) {
              console.warn(`[causal-gate] ch${chapter} scene${scene.index}: 重写后仍 ${gate.changeStrength} — 放行（不阻塞），已记录`);
              break;
            }
            gateRewrites += 1;
            if (decision.countFailure) gateFailures += 1;
            if (isWeakOrStatic(decision)) weakOrStaticRewritten = true;
            scene.causalGate = gate;
            console.warn(`[causal-gate] ch${chapter} scene${scene.index}: strength=${gate.changeStrength}` +
              ` failures=[${gate.failureReasons.join(',')}] → 重写 ${gateRewrites}/${maxGateRewrites}` +
              (decision.countFailure ? '（计失败）' : '（不计失败，一次）'));

            // 重写 addendum：具体缺失项 + evidence 短句（禁止只写「无不可逆变化」）
            // + 3b-2 metrics hints（dragSpan/信息密度/静态描写；与 gate 指令同类去重）
            // + 3b-4 反升检测（重写后 singlePurpose 上升 > 0.03 → 追加描写约束）
            const preRewriteMetrics = scene.metrics || null;
            const gateAddendum = formatCausalRewriteAddendum(gate);
            const metricsHints = formatMetricsHints(preRewriteMetrics);
            const staticReg = preRewriteMetrics && preRewriteMetrics._preRewriteSinglePurpose != null
              ? detectRewriteStaticRegression(preRewriteMetrics._preRewriteSinglePurpose, preRewriteMetrics.singlePurposeDescriptionRatio)
              : null;
            const hintLines = [...metricsHints];
            if (staticReg) {
              hintLines.push(staticReg.instruction);
              scene.rewriteStaticRegression = staticReg.feedback;
              console.warn(`[causal-gate] ch${chapter} scene${scene.index}: ${staticReg.feedback} — 追加描写约束`);
            }
            const addendum = [gateAddendum, hintLines.length ? hintLines.map((h) => `- ${h}`).join('\n') : '']
              .filter(Boolean).join('\n');
            const basePrompt = gateRewrites === 1
              ? scene.prompt
              : scene.prompt.split('<!-- causal-gate-rewrite v1 -->')[0].trim();
            scene.prompt = addendum ? [basePrompt, addendum].join('\n\n') : basePrompt;
            scene.text = await activeWriter({
              bookDir: this.bookDir,
              chapter,
              scene,
              prompt: scene.prompt,
              ctx,
              intent,
              trace,
            });

            // 3b-4: 重写后重算 metrics，记录 preRewrite 基准供下一轮反升检测
            try {
              const postMetrics = computeSceneEfficiencyMetrics(scene.text, { causalGate: gate });
              if (preRewriteMetrics && postMetrics) {
                postMetrics._preRewriteSinglePurpose = preRewriteMetrics.singlePurposeDescriptionRatio;
              }
              if (postMetrics) scene.metrics = postMetrics;
            } catch { /* metrics 可选 */ }

            gate = await runGate();
            decision = decideGateAction(gate);
          }

          // 出口：通过 / 超预算
          scene.causalGate = gate;
          if (decision.action === 'rewrite') {
            // 预算耗尽仍需重写：none 记录失败交章级处理；weak 放行不阻塞
            scene.causalGate.rewriteExhausted = true;
            scene.causalGate.gateRewrites = gateRewrites;
            if (gate.changeStrength === 'none') {
              scene.causalGate.gateFailed = true;
              console.warn(`[causal-gate] ch${chapter} scene${scene.index}: 重写预算耗尽仍 none — 记录失败，交章级处理`);
            } else {
              console.warn(`[causal-gate] ch${chapter} scene${scene.index}: 重写后仍 ${gate.changeStrength} — 放行（不阻塞），已记录`);
            }
          } else if (decision.upstreamDefects.length) {
            scene.causalGate.upstreamDefects = decision.upstreamDefects;
            console.warn(`[causal-gate] ch${chapter} scene${scene.index}: 正文通过但输入缺失，已标记上游缺陷 [${decision.upstreamDefects.join(',')}]`);
          }
          scene.causalGate.gateRewrites = gateRewrites;
          scene.causalGate.gateFailures = gateFailures;
          // 3b-1: 最终 metrics 与最终 gate 对齐（重写过则 gate 透传字段已变）
          try {
            scene.metrics = computeSceneEfficiencyMetrics(scene.text, { causalGate: gate });
          } catch { /* metrics 可选 */ }
          console.log(`[causal-gate] ch${chapter} scene${scene.index}: 最终 strength=${gate.changeStrength}` +
            (gate.failureReasons.length ? ` failures=[${gate.failureReasons.join(',')}]` : '') +
            (gate.degraded ? ` degraded(${gate.degradeReason})` : '') +
            ` rewrites=${gateRewrites} failures=${gateFailures}`);
          try {
            trace.recordStage('causal_gate', {
              chapter,
              scene: scene.index,
              changeStrength: gate.changeStrength,
              failureReasons: gate.failureReasons,
              irreversibleChanges: gate.irreversibleChanges?.length || 0,
              degraded: Boolean(gate.degraded),
              rewrites: gateRewrites,
              countedFailures: gateFailures,
              rewriteExhausted: Boolean(scene.causalGate.rewriteExhausted),
              upstreamDefects: decision.upstreamDefects,
            });
          } catch { /* trace 可选 */ }
        } catch (gateErr) {
          console.warn('[causal-gate] failed (ignored):', gateErr?.message || gateErr);
        }
      }

      // 3b-1: scene.metrics 落定——门控开启时已随循环维护（含重写后重算）；
      // 门控关闭时在此计算（metrics 不依赖 LLM）。feedback 注入与第 5 步 rerank
      // 读同一份 scene.metrics，不重算。
      if (scene.text?.trim() && !scene.metrics) {
        try {
          scene.metrics = computeSceneEfficiencyMetrics(scene.text, scene);
        } catch (mErr) {
          console.warn('[scene-metrics] failed (ignored):', mErr?.message || mErr);
        }
      }

      // L2 复读护栏：场景内整句/整段逐字复读 → 附加禁复述指令重写该 Scene
      // （限次；不整章 replan。INKOS_REPETITION_GUARD=0 关闭，STRICT=1 超限按场景失败）
      if (scene.text?.trim() && process.env.INKOS_REPETITION_GUARD !== '0') {
        const maxRewrites = Number(process.env.INKOS_REPETITION_REWRITES || 2);
        let rewrites = 0;
        let rep = detectIntraSceneRepetition(scene.text);
        while (rep.hit && activeWriter && rewrites < maxRewrites) {
          rewrites += 1;
          scene.prompt = [scene.prompt, formatNoRepeatAddendum(rep.examples)].join('\n\n');
          console.warn(`[repetition-guard] ch${chapter} scene${scene.index}: 逐字复读 ×${rep.score}，重写 ${rewrites}/${maxRewrites}`);
          scene.text = await activeWriter({
            bookDir: this.bookDir,
            chapter,
            scene,
            prompt: scene.prompt,
            ctx,
            intent,
            trace,
          });
          rep = detectIntraSceneRepetition(scene.text);
        }
        if (rep.hit) {
          scene.repetition = { ...rep, rewrites };
          try {
            trace.recordStage('repetition_guard', {
              chapter,
              scene: scene.index,
              hit: rep.hit,
              examples: rep.examples,
              score: rep.score,
              rewrites,
            });
          } catch { /* trace 可选 */ }
          if (process.env.INKOS_REPETITION_STRICT === '1') {
            const err = new Error(`Scene ${scene.index}: 复读护栏超限（${(rep.examples[0] || '').slice(0, 60)}）`);
            err.code = 'REPETITION_GUARD';
            throw err;
          }
        }
      }

      // 场景正文已产出 → 回写 intent.scenes，供下一 Scene 的续写引擎读取（continuation-engine / collectPriorScenesText）
      // F6.2: attach scene-local observedContinuity (text projection; not Canon / SR)
      // Phase 1: Actual Events from text (Plan stripped); required before next scene/chapter
      if (scene.text?.trim()) {
        ensureObservedContinuity(scene);
        await ensureActualEventsWithExtraction(scene, {
          knownNames: collectKnownNames(scene, intent),
          stripPlan: true,
          bookDir: this.bookDir,
          // Phase 1.3 opt-in：options.extraction === 'llm-assisted' 时启用（默认关闭）
          extraction: this.options.extraction || null,
          llm: this.options.extractionLlm || null,
        });
        if (!(scene.actualEvents || []).length) {
          const err = new Error(`Scene ${scene.index}: 正文存在但无有效 Actual Event`);
          err.code = 'ACTUAL_EVENT_REQUIRED';
          throw err;
        }
        // EO-P4-Character-Action-Bridge-01: Intent + matching occurrence → Character Action
        try {
          attachCharacterActionTruth(scene);
        } catch (caErr) {
          console.warn('[runtime] Character Action bridge skipped:', caErr?.message || caErr);
        }
        // EO-P4-World-Consequence-Bridge-01: Character Action + grounded world-change W
        try {
          attachWorldConsequenceTruth(scene);
        } catch (wcErr) {
          console.warn('[runtime] World Consequence bridge skipped:', wcErr?.message || wcErr);
        }
        // Phase 3.2: Actual → IB → CharacterSR（+ EO-CW-Projection-01: World 投影合并）
        try {
          // 场景内 SR 名单 = knownNames ∪ Actual actors（Truth 级在场者）
          const rosterNames = [...new Set([
            ...collectKnownNames(scene, intent),
            ...(scene.actualEvents || []).flatMap((e) => e.actors || []),
          ])].filter(Boolean);
          applyCharacterSRAfterActual(this.bookDir, chapter, scene, {
            authoredCharacterSR: intent?.characterSR || intent?.authoredCharacterSR || null,
            // 接线补齐：authored 路径 scene 不携带 pov/present/characters，
            // 名单经既有 extraNames 通道供给（Actual actors 已在事件内，
            // IB 由 characterCanAccessActualEvent 逐事件把守——封存语义不变）
            extraNames: rosterNames,
            worldProjection: projectWorldToSRScene({
              world: cwWorld,
              characterNames: rosterNames,
              scene,
              chapter,
              bookDir: this.bookDir, // G1-A/Q7：跳过 quarantined legacy 主体
            }),
          });
        } catch (srErr) {
          if (srErr?.code === 'SR_FORBIDDEN_SOURCE') throw srErr;
          console.warn('[runtime] CharacterSR update skipped:', srErr?.message || srErr);
        }
        // L1 audit-only observation（诊断旁路；observeL1 ≠ L1 Truth；零 Truth 变更）
        try {
          const audit = runL1CharacterAudit({
            scene,
            characterNames: [...new Set([
              ...collectKnownNames(scene, intent),
              ...(scene.actualEvents || []).flatMap((e) => e.actors || []),
            ])],
          });
          if (audit.perCharacter.length) saveL1Audit(this.bookDir, chapter, audit);
        } catch (l1Err) {
          console.warn('[runtime] L1 audit skipped:', l1Err?.message || l1Err);
        }
        // EO-L1-Subject-Eligibility-01: Actual-grounded Subject Presence → L1-internal
        // eligibility（粗三态；sidecar 旁路；零 Truth 消费者；不触 Agency/CO/Choice）
        try {
          const eligibility = evaluateSceneSubjectEligibility({
            scene,
            // 枚举名单仅取 knownNames（枚举≠证据；Frozen #10 禁 roster 作证据——
            // occurrence actors 并集会把回退路径的伪 actor 枚举成 ELIGIBLE）
            characterNames: collectKnownNames(scene, intent),
          });
          scene.l1Eligibility = eligibility;
          if (Object.keys(eligibility.characters || {}).length) {
            saveL1Eligibility(this.bookDir, chapter, eligibility);
          }
        } catch (eligErr) {
          console.warn('[runtime] L1 eligibility skipped:', eligErr?.message || eligErr);
        }
        // EO-CW-Trace-01 / EO-L1-Access-Carrier-01 共用枚举名单（仅枚举 ≠ 证据）
        const rosterNames2 = [...new Set([
          ...collectKnownNames(scene, intent),
          ...(scene.actualEvents || []).flatMap((e) => e.actors || []),
        ])].filter(Boolean);
        // EO-CW-Trace-01: Actual + Access → T2 episodic trace（幂等；引用式；零解读）
        try {
          appendT2Experiences(this.bookDir, { scene, chapter, candidateNames: rosterNames2 });
        } catch (t2Err) {
          console.warn('[runtime] T2 trace skipped:', t2Err?.message || t2Err);
        }
        // EO-L1-Access-Carrier-01: prose→TypedEvidence→Access Gate→Access Truth
        //（sidecar-only；唯一消费者=未来 L1 生产评估——本 EO 不实现消费者）
        try {
          const evidence = collectAccessEvidenceFromScene({ scene, characterNames: rosterNames2 });
          if (evidence.length) {
            const gated = runAccessGate(this.bookDir, { evidence, scene, chapter });
            if (gated.refused) console.warn('[runtime] L1 Access gate refused:', gated.refused);
          }
        } catch (accErr) {
          console.warn('[runtime] L1 Access carrier skipped:', accErr?.message || accErr);
        }
        // EO-L1-Production-Evaluation-01: AccessTruth + Eligibility → P1 合流
        //（三态 sidecar-only；零消费者；HA-2：VALID 不产生 Choice/Option）
        try {
          runL1ProductionEvaluation(this.bookDir);
        } catch (l1EvalErr) {
          console.warn('[runtime] L1 evaluation skipped:', l1EvalErr?.message || l1EvalErr);
        }
        // Phase 4.4.1c: soft Attribution (parallel; never blocks Actual/State)
        try {
          applyAttributionAfterActual(this.bookDir, chapter, scene, {            characterSRState: scene.characterSRState || null,
          });
        } catch (attrErr) {
          console.warn('[runtime] Attribution soft wiring skipped:', attrErr?.message || attrErr);
        }
        const target = (intent.scenes || []).find((s) => s.index === scene.index)
          || (intent.scenes || [])[scene.index - 1];
        if (target) {
          target.text = scene.text;
          if (scene.observedContinuity) target.observedContinuity = scene.observedContinuity;
          if (scene.actualEvents) target.actualEvents = scene.actualEvents;
          if (scene.characterSRState) target.characterSRState = scene.characterSRState;
          if (scene.actionIntentTruth) target.actionIntentTruth = scene.actionIntentTruth;
          if (scene.characterActionTruth) target.characterActionTruth = scene.characterActionTruth;
          if (scene.worldConsequenceTruth) target.worldConsequenceTruth = scene.worldConsequenceTruth;
        }
      }

      // 若 Writer 返回了 beatArtifacts，写入 Trace Beat 级 I/O
      recordBeatArtifacts(trace, scene);

      const sceneResult = await runScenePipeline(this.bookDir, {
        chapter,
        scene,
        intent,
        ctx,
        bus: this.bus,
        importMode: useChapterText,
      });

      sceneResults.push(sceneResult);
      trace.recordStage(`scene_${scene.index}`, {
        pass: sceneResult.pass,
        awaiting: sceneResult.awaiting || null,
        summary: scene.goal || scene.id,
        chars: scene.text ? String(scene.text).replace(/\s/g, '').length : 0,
        validation: sceneResult.validation || sceneResult.checks || null,
        score: sceneResult.metrics || sceneResult.score || null,
      });

      if (!sceneResult.pass) {
        if (sceneResult.awaiting === 'writer') {
          persistScenes(this.bookDir, chapter, scenes);
          pipeline.awaiting = 'writer';
          // 只为已生成 prompt 的 Scene 落盘：循环逐场建 prompt，
          // 某场 awaiting-writer 提前 return 时，后续场景 prompt 尚为 undefined，
          // 无条件 writeText(undefined) 会抛 ERR_INVALID_ARG_TYPE（被吞成「系统内部错误」）。
          pipeline.scenePrompts = scenes
            .filter((s) => s.prompt?.trim())
            .map((s) => ({
              id: s.id,
              index: s.index,
              chars: s.prompt?.length,
              promptPath: writeScenePromptFile(this.bookDir, chapter, s),
            }));
          pipeline.scenes = scenes;
          pipeline.message = 'Scene prompts 已生成，Writer 填入后 Daemon 自动继续';
          const finalized = trace.finalize({ pass: false, awaiting: 'writer' });
          pipeline.traceHtml = finalized.htmlPath;
          return pipeline;
        }

        await this.bus.emit('sceneRejected', { bookDir: this.bookDir, chapter, scene, sceneResult });
        const budget = this._consumeSceneReplanBudget(chapter, scene, sceneResult, options);
        if (!budget.allow) {
          trace.recordStage('scene_replan_exhausted', {
            count: budget.execCtx.sceneReplanCount,
            max: this.maxReplan,
            scene: scene.index,
          });
          pipeline.pass = false;
          pipeline.error = `场景重规划 ${budget.execCtx.sceneReplanCount} 次仍无法通过：${sceneResult.error || sceneResult.message || ''}`;
          const finalized = trace.finalize({ pass: false, error: pipeline.error });
          pipeline.traceHtml = finalized.htmlPath;
          return pipeline;
        }
        const newIntent = replan(ctx, [{ type: 'scene', suggestObstacle: sceneResult.error, attempt: (intent.attempt || 1) + 1 }]);
        return this._runChapter({ ...options, chapter, _replanFromScene: true, pov: intent.pov, _trace: trace });
      }

      const reviewedHook = await this._invokeSceneLifecycleHook('reviewed', {
        chapter,
        scene,
        intent,
        ctx,
        sceneResult,
      });

      // Analysis Only：禁止 Scene Review / Story Thread 触发章内 Replan
      if (reviewedHook && !reviewedHook.analysisOnly && reviewedHook.shouldReplan) {
        await this.bus.emit('storyThreadReplan', {
          bookDir: this.bookDir,
          chapter,
          scene,
          reason: reviewedHook.replanReason,
          storyThread: reviewedHook.storyThread,
          blocking: false,
          deferred: true,
          note: '已降级为 Adaptive Hint，不执行 Replan',
        });
      }

      Object.assign(scene, sceneResult.scene);

      await this._invokeSceneLifecycleHook('memorized', {
        chapter,
        scene,
        intent,
        ctx,
        sceneResult,
      });
    }

    persistScenes(this.bookDir, chapter, scenes);
    pipeline.stages.push({ stage: 'scenes', count: scenes.length, passed: sceneResults.filter((r) => r.pass).length });
    trace.recordStage('scenes', {
      pass: sceneResults.every((r) => r.pass),
      count: scenes.length,
      passed: sceneResults.filter((r) => r.pass).length,
    });

    // 防碎片：干净 scenes 组装优先，外部注入 chapterText（可能含重开草稿堆叠）仅兜底
    const assembledText = assembleChapter(scenes);
    const chapterText = assembledText.trim() ? assembledText : (options.chapterText || '');
    if (!chapterText.trim()) {
      pipeline.awaiting = 'writer';
      pipeline.scenes = scenes;
      const finalized = trace.finalize({ pass: false, awaiting: 'writer' });
      pipeline.traceHtml = finalized.htmlPath;
      return pipeline;
    }

    const chapterResult = await runChapterPipeline(
      this.bookDir,
      {
        chapter,
        chapterText,
        intent,
        scenes,
        conflictResult: options.conflictResult,
        ctx,
        force: options.force,
        dualReviewer: options.dualReviewer,
        deferCommit: Boolean(options.deferCommit),
      },
      this.bus
    );

    for (const entry of chapterResult.log || []) {
      trace.recordStage(entry.stage || 'chapter_stage', {
        pass: entry.pass,
        summary: entry.error || (entry.hookScore != null ? `hook=${entry.hookScore}` : null),
        ...entry,
      });
    }

    pipeline.stages.push({ stage: 'chapter_pipeline', pass: chapterResult.pass });
    Object.assign(pipeline, chapterResult);
    pipeline.pass = chapterResult.pass;
    pipeline.finishedAt = new Date().toISOString();
    pipeline.traceId = trace.traceId;

    if (chapterResult.pass && options.saveChapter !== false) {
      const chapterFile = saveChapterFile(this.bookDir, chapter, chapterText, intent);
      pipeline.chapterFile = chapterFile;
    }

    if (chapterResult.pass && this.config.runtime?.autoNextChapter && !options.noAutoNext) {
      pipeline.autoNext = { chapter: chapter + 1, ready: true };
    }

    const finalized = trace.finalize({
      pass: pipeline.pass,
      chapterFile: pipeline.chapterFile || null,
      readerSimulator: chapterResult.readerSimulator || null,
      validation: chapterResult.validation || null,
    });
    pipeline.traceHtml = finalized.htmlPath;
    pipeline.traceDir = trace.dir;

    return pipeline;
  }

  on(event, handler) {
    return this.bus.on(event, handler);
  }
}

export function createRuntime(bookDir, options = {}) {
  return new RuntimeOrchestrator(bookDir, options);
}

export async function runFullPipeline(bookDir, options = {}) {
  const runtime = createRuntime(bookDir, options);
  if (options.resume) {
    const chapter = options.chapter ?? loadBrainContext(bookDir).chapter;
    return runtime.resumeChapter(chapter, options);
  }
  return runtime.runChapter(options);
}

function collectKnownNames(scene = {}, intent = {}) {
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

function summarizeIntent(intent) {
  return {
    chapterIntent: intent.chapterIntent,
    mainGoal: intent.mainGoal,
    sceneCount: intent.scenes?.length || 0,
    voiceDna: intent.voiceDna?.id || intent.voiceDna?.label || null,
    bannedElements: (intent.bannedElements || []).slice(0, 3),
  };
}

/** 将 Writer / Beat 执行产物写入 Trace */
function recordBeatArtifacts(trace, scene) {
  if (!trace || !scene) return;
  const artifacts = scene.beatArtifacts
    || scene.meta?.beatArtifacts
    || scene.writerMeta?.beatArtifacts
    || [];
  if (!Array.isArray(artifacts) || !artifacts.length) {
    // 无 Beat 级产物时，至少记 Scene 正文摘要
    if (scene.text?.trim()) {
      trace.recordBeat(scene.index || 1, 0, {
        libraryBeat: 'scene-aggregate',
        prompt: scene.prompt || '',
        text: scene.text,
        validation: scene.validation || null,
        score: scene.score || null,
      });
    }
    return;
  }
  for (const art of artifacts) {
    trace.recordBeat(scene.index || art.sceneIndex || 1, art.order ?? art.beatOrder ?? 0, {
      beat: art.beat || { libraryBeat: art.libraryBeat, content: art.content },
      libraryBeat: art.libraryBeat,
      prompt: art.userPrompt || art.prompt || '',
      userPrompt: art.userPrompt || art.prompt || '',
      text: art.text || art.output || '',
      validation: art.validation || art.v2 || null,
      score: art.score || null,
      chars: art.chars,
    });
  }
}

function writeScenePromptFile(bookDir, chapter, scene) {
  const dir = path.join(brainSystemDir(bookDir), 'prompts');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `ch_${String(chapter).padStart(4, '0')}_${scene.id}.md`);
  writeText(file, scene.prompt);
  return file;
}

function saveChapterFile(bookDir, chapter, text, intent) {
  const dir = path.join(bookDir, 'chapters');
  fs.mkdirSync(dir, { recursive: true });
  // no_causal_basis / 模板占位符不落文件名（曾产出 0002_no_causa.md）；
  // 归一化为「第N章」，与 memory-unit writeChapterMarkdown 的 fallback 同口径
  const rawTitle = intent.mainGoal?.slice(0, 8) || '';
  const isPlaceholder = !rawTitle
    || rawTitle.includes('no_causal_basis')
    || rawTitle.trim() === '章';
  const title = isPlaceholder ? `第${chapter}章` : rawTitle;
  const pad = String(chapter).padStart(4, '0');
  // 同章幂等：与 MemoryUnit.writeChapterMarkdown 是两条写盘路径，
  // 写前清掉本章旧文件，避免 rerun / 双写累积重复章节
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith(`${pad}_`) && name.endsWith('.md')) {
      fs.unlinkSync(path.join(dir, name));
    }
  }
  const file = path.join(dir, `${pad}_${sanitize(title)}.md`);
  writeText(file, text);
  return file;
}

function sanitize(s) {
  return s.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '') || '章';
}

function splitChapterToScenes(text, count) {
  const paras = text.split(/\n\n+/).filter(Boolean);
  if (!paras.length) return Array(count).fill(text);
  if (paras.length >= count) {
    const per = Math.ceil(paras.length / count);
    const parts = [];
    for (let i = 0; i < count; i++) {
      const chunk = paras.slice(i * per, (i + 1) * per).join('\n\n');
      parts.push(chunk || paras[paras.length - 1] || text);
    }
    return parts;
  }
  const parts = [...paras];
  while (parts.length < count) parts.push(paras[paras.length - 1]);
  return parts.slice(0, count);
}
