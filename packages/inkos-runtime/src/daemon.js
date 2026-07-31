/**
 * Runtime Daemon — 监听文件变化，自动执行完整 Pipeline 闭环
 *
 * 崩溃自愈：章执行未捕获异常时自动 recoverFailedChapter → rollback 上一章
 */
import path from 'node:path';
import { exists, readJson, writeJson, ROOT } from '../../inkos-core/src/lib/paths.js';
import { loadInkOsConfig } from '../../inkos-core/src/lib/config.js';
import { isBrainEnabled } from '../../inkos-brain/src/loader.js';
import { createLlmWriter, isLlmConfigured } from '../../inkos-brain/src/writer/llm-writer.js';
import { EventBus } from './event-bus.js';
import { Trigger } from './trigger.js';
import { Dispatcher } from './dispatcher.js';
import { Scheduler } from './scheduler.js';
import { RuntimeOrchestrator } from './pipeline/orchestrator.js';
import { runChapterPipeline } from './pipeline/chapter-pipeline.js';
import { loadBrainContext } from '../../inkos-brain/src/loader.js';
import { loadBrainRun } from '../../inkos-brain/src/runtime/brain-runtime.js';
import { brainSystemDir } from '../../inkos-brain/src/loader.js';
import { recoverFailedChapter } from './memory/memory-unit.js';

export class RuntimeDaemon {
  constructor(bookDir, options = {}) {
    this.bookDir = path.isAbsolute(bookDir) ? bookDir : path.join(ROOT, bookDir);
    this.config = loadInkOsConfig();
    this.options = options;
    this.bus = new EventBus();
    this.scheduler = new Scheduler();
    this.trigger = new Trigger(this.bus, { debounceMs: options.debounceMs ?? 1000 });

    const writer = options.writer ?? (options.autoWrite !== false && isLlmConfigured() ? createLlmWriter() : null);
    this.runtime = new RuntimeOrchestrator(this.bookDir, {
      bus: this.bus,
      writer,
      autoWrite: options.autoWrite,
      sceneLifecycleHook: options.sceneLifecycleHook ?? null,
    });

    this.running = false;
    this.processing = new Set();
    this.stateFile = path.join(this.bookDir, 'novel', '_system', 'runtime_state.json');

    this.handlers = {
      onSceneFinished: this._onSceneFinished.bind(this),
      onSceneReviewFailed: this._onSceneReviewFailed.bind(this),
      onSceneRejected: this._onSceneRejected.bind(this),
      onChapterFinished: this._onChapterFinished.bind(this),
      onChapterReviewFailed: this._onChapterReviewFailed.bind(this),
      onMemoryUpdated: this._onMemoryUpdated.bind(this),
      onReviewFailed: this._onReviewFailed.bind(this),
      onDecisionRejected: this._onDecisionRejected.bind(this),
      onMetricsLow: this._onMetricsLow.bind(this),
      onCriticRejected: this._onCriticRejected.bind(this),
      onValidationRejected: this._onValidationRejected.bind(this),
      onPipelineCompleted: this._onPipelineCompleted.bind(this),
      onPipelineFailed: this._onPipelineFailed.bind(this),
      onNextChapterPlanned: this._onNextChapterPlanned.bind(this),
    };

    this.dispatcher = new Dispatcher(this.bus, this.handlers);
  }

  start() {
    if (this.running) return;
    if (!isBrainEnabled(this.bookDir)) {
      throw new Error('Brain 未启用，Daemon 需要 V4 + brainEnabled');
    }

    this.dispatcher.wire();

    this.trigger.watchChapterSaved(this.bookDir, (p) => this._handleExternalChapter(p));
    this.trigger.watchSceneArtifacts(this.bookDir, (p) => this._handleSceneUpdate(p));
    this.trigger.watchScenePrompts(this.bookDir, (p) => this._handleSceneUpdate(p));

    this.running = true;
    this._saveState({
      status: 'running',
      startedAt: new Date().toISOString(),
      llmConfigured: isLlmConfigured(),
      autoNextChapter: this.config.runtime?.autoNextChapter !== false,
    });

    if (this.options.autoStartChapter) {
      this.scheduler.enqueue(() => this._guardedChapterRun(this.options.autoStartChapter, {}));
    }

    return this;
  }

  stop() {
    this.trigger.stop();
    this.running = false;
    this._saveState({ status: 'stopped', stoppedAt: new Date().toISOString() });
  }

  async runChapter(chapter, options = {}) {
    return this.scheduler.enqueue(
      () => this._guardedChapterRun(chapter, options),
      { type: 'manual_chapter', chapter },
    );
  }

  async resumeChapter(chapter, options = {}) {
    return this.scheduler.enqueue(
      () => this._guardedResume(chapter, options),
      { type: 'resume_chapter', chapter },
    );
  }

  /**
   * 执行期崩溃自愈挂钩：失败 → recoverFailedChapter → rollbackToChapter(n-1)
   */
  async _guardedChapterRun(chapter, options = {}) {
    try {
      return await this.runtime.runChapter({ chapter, ...options });
    } catch (err) {
      const recovery = await this._recoverExecutionCrash(chapter, err);
      if (err && typeof err === 'object') {
        err.recovery = recovery;
        err.inkosRecovered = true;
      }
      throw err;
    }
  }

  async _guardedResume(chapter, options = {}) {
    try {
      return await this.runtime.resumeChapter(chapter, options);
    } catch (err) {
      const recovery = await this._recoverExecutionCrash(chapter, err);
      if (err && typeof err === 'object') {
        err.recovery = recovery;
        err.inkosRecovered = true;
      }
      throw err;
    }
  }

  async _recoverExecutionCrash(chapter, err) {
    const msg = err?.message || String(err);
    console.warn(`[Daemon] 第 ${chapter} 章执行崩溃，启动自愈回滚:`, msg);
    let recovery = null;
    try {
      recovery = recoverFailedChapter(this.bookDir, chapter, {
        reason: `daemon-crash: ${msg}`,
      });
    } catch (recoverErr) {
      recovery = { ok: false, error: recoverErr?.message || String(recoverErr) };
      console.warn('[Daemon] recoverFailedChapter 失败:', recovery.error);
    }

    this._saveState({
      lastFailure: 'execution_crash',
      lastCrashChapter: chapter,
      lastCrashAt: new Date().toISOString(),
      lastCrashError: msg,
      lastRecovery: recovery,
    });

    try {
      await this.bus.emit('pipelineFailed', {
        bookDir: this.bookDir,
        chapter,
        error: msg,
        recovery,
        crash: true,
      });
    } catch { /* bus 不可用时忽略 */ }

    return recovery;
  }

  async _handleSceneUpdate({ bookDir, chapter }) {
    if (!chapter || this.processing.has(`ch:${chapter}`)) return;
    const scenesFile = path.join(brainSystemDir(bookDir), `ch_${String(chapter).padStart(4, '0')}_scenes.json`);
    if (!exists(scenesFile)) return;

    const { scenes } = readJson(scenesFile);
    const needsWork = scenes?.some((s) => s.text?.trim() && s.status !== 'done');
    const awaiting = scenes?.some((s) => !s.text?.trim());

    if (needsWork || awaiting) {
      return this.scheduler.enqueue(
        () => this._guardedResume(chapter),
        { type: 'auto_resume', chapter },
      );
    }
  }

  async _handleExternalChapter({ bookDir, chapter, text }) {
    if (this.processing.has(`review:${chapter}`)) return;
    this.processing.add(`review:${chapter}`);
    try {
      await this._onChapterFinished({ bookDir, chapter, text, source: 'fs' });
    } finally {
      this.processing.delete(`review:${chapter}`);
    }
  }

  async _onChapterFinished(payload) {
    const { bookDir, chapter, text } = payload;
    const run = loadBrainRun(bookDir, chapter);
    if (run?.pass && !this.options.reprocess) return { skipped: true, reason: 'already passed' };

    const planFile = path.join(bookDir, 'novel', '_system', 'brain', `ch_${String(chapter).padStart(4, '0')}_plan.json`);
    if (!exists(planFile)) {
      return this._guardedChapterRun(chapter, { chapterText: text });
    }

    const plan = readJson(planFile);
    const scenesFile = path.join(bookDir, 'novel', '_system', 'brain', `ch_${String(chapter).padStart(4, '0')}_scenes.json`);
    const scenes = exists(scenesFile) ? readJson(scenesFile).scenes : [];
    const ctx = loadBrainContext(bookDir, { chapter });

    try {
      return await runChapterPipeline(
        bookDir,
        {
          chapter,
          chapterText: text,
          intent: plan.intent,
          scenes,
          conflictResult: plan.conflictResult,
          ctx,
        },
        this.bus,
      );
    } catch (err) {
      const recovery = await this._recoverExecutionCrash(chapter, err);
      if (err && typeof err === 'object') {
        err.recovery = recovery;
        err.inkosRecovered = true;
      }
      throw err;
    }
  }

  async _onSceneFinished(payload) {
    this._saveState({ lastScene: payload.scene?.id, chapter: payload.chapter });
    return payload;
  }

  async _onSceneReviewFailed(payload) {
    this._saveState({ lastFailure: 'scene_review', chapter: payload.chapter, scene: payload.scene?.id });
    if (payload.chapter) {
      return this.scheduler.enqueue(() => this._guardedResume(payload.chapter));
    }
    return payload;
  }

  async _onSceneRejected(payload) {
    this._saveState({ lastFailure: 'scene_rejected', chapter: payload.chapter });
    if (payload.chapter) {
      return this.scheduler.enqueue(() => this._guardedChapterRun(payload.chapter));
    }
    return payload;
  }

  async _onChapterReviewFailed(payload) {
    this._saveState({ lastFailure: 'chapter_review', chapter: payload.chapter });
    return payload;
  }

  async _onMemoryUpdated(payload) {
    this._saveState({ lastMemoryUpdate: payload.snapshot?.id, chapter: payload.chapter });
    return payload;
  }

  async _onReviewFailed(payload) {
    this._saveState({ lastFailure: 'review', at: new Date().toISOString(), chapter: payload.chapter });
    return payload;
  }

  async _onDecisionRejected(payload) {
    this._saveState({ lastFailure: 'decision', at: new Date().toISOString() });
    return payload;
  }

  async _onMetricsLow(payload) {
    this._saveState({ lastMetricsLow: payload.chapter, feedback: payload.feedback?.suggestions?.length });
    if (payload.feedback?.needsReplan && payload.chapter) {
      return this.scheduler.enqueue(() => this._guardedChapterRun(payload.chapter));
    }
    return payload;
  }

  async _onCriticRejected(payload) {
    this._saveState({ lastFailure: 'critic', chapter: payload.chapter });
    if (payload.chapter) {
      return this.scheduler.enqueue(() => this._guardedChapterRun(payload.chapter));
    }
    return payload;
  }

  async _onValidationRejected(payload) {
    this._saveState({ lastFailure: 'validation', chapter: payload.chapter });
    if (payload.chapter) {
      return this.scheduler.enqueue(() => this._guardedChapterRun(payload.chapter));
    }
    return payload;
  }

  async _onPipelineCompleted(payload) {
    const { chapter, result } = payload;
    this._saveState({
      lastCompletedChapter: chapter,
      healthScore: result?.health?.overallScore,
      nextChapter: chapter + 1,
    });

    if (this.config.runtime?.autoNextChapter !== false && result?.nextChapterPlan?.ready) {
      return this.scheduler.enqueue(
        () => this._guardedChapterRun(chapter + 1, { noAutoNext: false }),
        { type: 'auto_next_chapter', chapter: chapter + 1 },
      );
    }
    return payload;
  }

  async _onPipelineFailed(payload) {
    this._saveState({ lastFailure: 'pipeline', error: payload.error || payload.pipeline?.error });
    // 若尚未自愈（非 crash 路径），补一次回滚
    if (!payload?.crash && payload?.chapter && !payload?.recovery) {
      try {
        const recovery = recoverFailedChapter(this.bookDir, payload.chapter, {
          reason: 'pipeline-failed',
        });
        this._saveState({ lastRecovery: recovery });
        return { ...payload, recovery };
      } catch (err) {
        console.warn('[Daemon] pipelineFailed 自愈失败:', err?.message || err);
      }
    }
    return payload;
  }

  async _onNextChapterPlanned(payload) {
    this._saveState({ nextChapterPlanned: payload.chapter, planReady: true });
    return payload;
  }

  _saveState(patch) {
    const prev = exists(this.stateFile) ? readJson(this.stateFile) : {};
    writeJson(this.stateFile, { ...prev, ...patch, bookDir: this.bookDir, updatedAt: new Date().toISOString() });
  }

  getStatus() {
    const state = exists(this.stateFile) ? readJson(this.stateFile) : { status: 'idle' };
    return {
      ...state,
      running: this.running,
      eventLogSize: this.bus.getLog().length,
      queueSize: this.scheduler.queue.length,
      llmConfigured: isLlmConfigured(),
    };
  }

  getEventLog(since = 0) {
    return this.bus.getLog(since);
  }
}

export function startDaemon(bookDir, options = {}) {
  const daemon = new RuntimeDaemon(bookDir, options);
  daemon.start();
  return daemon;
}
