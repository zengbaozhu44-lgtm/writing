/**
 * Runtime Orchestrator — 全自动闭环
 * World → State → Planner → Decision → Conflict → Scene → Writer → Review → ...
 */
import path from 'node:path';
import fs from 'node:fs';
import { writeText, writeJson, exists, readJson } from '../../../inkos-core/src/lib/paths.js';
import { loadInkOsConfig } from '../../../inkos-core/src/lib/config.js';
import { loadBrainContext, brainSystemDir } from '../../../inkos-brain/src/loader.js';
import { planChapter, replan, loadPriorChapterAnchor } from '../../../inkos-brain/src/planner/planner.js';
import { evaluateDecisions } from '../../../inkos-brain/src/decision/decision.js';
import { evaluateConflict } from '../../../inkos-brain/src/conflict/conflict.js';
import { buildScenePlan, buildSceneWritePrompt, assembleChapter } from '../../../inkos-brain/src/scene/scene.js';
import { buildDynamicPrompt } from '../../../inkos-brain/src/prompt/dynamic-prompt.js';
import { createLlmWriter, isLlmConfigured } from '../../../inkos-brain/src/writer/llm-writer.js';
import {
  saveChapterPlan,
  saveSceneArtifacts,
  appendDecisionHistory,
  appendConflictHistory,
  ensureBrainDir,
} from '../../../inkos-brain/src/memory/memory.js';
import { loadAdaptiveState } from '../../../inkos-brain/src/planner/adaptive.js';
import { EventBus } from '../event-bus.js';
import { Scheduler } from '../scheduler.js';
import { runScenePipeline, persistScenes } from './scene-pipeline.js';
import { runChapterPipeline } from './chapter-pipeline.js';
import { createChapterTrace } from './trace.js';
import { ChapterPipelineError, wrapOrchestratorError } from './chapter-pipeline-error.js';

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
    } catch {
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
    if (decisionResult) appendDecisionHistory(this.bookDir, ctx.chapter, decisionResult);
    if (conflictResult) appendConflictHistory(this.bookDir, ctx.chapter, conflictResult);

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
    return this._runScenesAndChapter(ctx.chapter, intent, scenes, {
      ...options,
      conflictResult,
      ctx,
      pipeline,
      _trace: trace,
    });
  }

  async _runScenesAndChapter(chapter, intent, scenes, options = {}) {
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
    const sceneResults = [];
    const useChapterText = Boolean(options.chapterText?.trim());
    const activeWriter = useChapterText ? null : this.writer;

    for (const scene of scenes) {
      if (scene.status === 'done' && scene.text?.trim()) {
        sceneResults.push({ pass: true, scene });
        continue;
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
          pipeline.scenePrompts = scenes.map((s) => ({
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

    const chapterText = options.chapterText || assembleChapter(scenes);
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
  const title = intent.mainGoal?.slice(0, 8) || '章';
  const file = path.join(dir, `${String(chapter).padStart(4, '0')}_${sanitize(title)}.md`);
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
