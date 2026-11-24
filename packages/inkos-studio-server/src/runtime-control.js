/**
 * Runtime Control — 唯一允许写入的路径
 * 全部委托 Runtime 公开 API，禁止直写业务文件
 */
import { runFullPipeline } from '../../inkos-runtime/src/index.js';
import { isLlmConfigured } from '../../inkos-brain/src/writer/llm-writer.js';
import { rollback } from '../../inkos-brain/src/memory/git-memory.js';
import { getBookMeta } from './book-service.js';
import { prepareChapterRun, runPostChapterEvolution } from './living-novel-engine.js';
import { studioEmitRuntimeEvent } from './event-stream.js';
import { getChapterTimeoutMs } from './studio-llm-writer.js';
import { getBookExecutionGuard } from './execution-guard-store.js';
import { runChapterReview } from '@inkos/director';
import { loadScenes } from './book-service.js';
import { getChapterText, resolveNextWritableChapter } from './chapter-service.js';
import { ensureChapterMarkdownSaved } from './studio-orchestrator.js';
import { MemoryUnit, rollbackToChapter } from '../../inkos-runtime/src/memory/memory-unit.js';

export class RuntimePipelineError extends Error {
  constructor(message, result = {}) {
    super(message);
    this.name = 'RuntimePipelineError';
    this.result = { pass: false, error: message, ...result };
  }
}

async function emitStage(bookDir, bookId, chapter, stage, status, detail) {
  studioEmitRuntimeEvent(bookDir, bookId, 'pipelineStage', { chapter, stage, status, detail });
}

function failPipeline(bookDir, bookId, chapter, error, extra = {}) {
  const guard = getBookExecutionGuard(bookDir);
  const prior = guard.getAbortReason?.() || '';
  const resolved = (prior && !/^Pipeline\s*失败$/i.test(prior) && /^Pipeline\s*失败$/i.test(String(error || '')))
    ? prior
    : (error || prior || 'Pipeline 失败');
  studioEmitRuntimeEvent(bookDir, bookId, 'pipelineFailed', { bookDir, chapter, error: resolved, ...extra });
  throw new RuntimePipelineError(resolved, { chapter, bookDir, ...extra });
}

/** 通过 Daemon 运行 Pipeline，事件会进入 SSE Event Bus */
async function runViaDaemon(daemon, bookDir, bookId, chapter, { force, resume } = {}) {
  const guard = getBookExecutionGuard(bookDir);

  if (!isLlmConfigured()) {
    return failPipeline(bookDir, bookId, chapter, '未配置 LLM API Key，无法自动生成正文。请在系统设置或 .env 中配置 INKOS_LLM_API_KEY。');
  }

  let taskId;
  try {
    taskId = guard.beginTask(chapter, { phase: 'planner', currentScene: null });
    guard.acquireChapterRun(chapter, taskId);
  } catch (err) {
    return failPipeline(bookDir, bookId, chapter, err.message);
  }

  await emitStage(bookDir, bookId, chapter, 'planner', 'running', '加载章节任务与 Story Context…');

  const heartbeat = setInterval(() => {
    if (guard.isTaskAborted()) return;
    try { guard.touchChapterRun?.(chapter); } catch { /* ignore */ }
    studioEmitRuntimeEvent(bookDir, bookId, 'pipelineHeartbeat', {
      chapter,
      stage: 'writer',
      message: 'Writer 仍在调用 LLM，请耐心等待…',
    });
  }, 20000);

  const totalTimeoutMs = getChapterTimeoutMs();
  const runPromise = resume
    ? daemon.resumeChapter(chapter, { force, deferCommit: true })
    : daemon.runChapter(chapter, { force, deferCommit: true });

  let result;
  try {
    result = await Promise.race([
      runPromise,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`章节生成总超时（${Math.round(totalTimeoutMs / 60000)} 分钟），请稍后重试`)), totalTimeoutMs);
      }),
    ]);
  } catch (err) {
    clearInterval(heartbeat);
    if (err.name === 'RuntimePipelineError') throw err;
    guard.releaseChapterRun(chapter);
    if (guard.isTaskAborted()) {
      throw new RuntimePipelineError(guard.getAbortReason() || err.message || String(err), { chapter });
    }
    guard.abortTask(err.message || String(err), { chapter, taskId });
    throw new RuntimePipelineError(err.message || String(err), { chapter });
  } finally {
    clearInterval(heartbeat);
  }

  if (guard.isTaskAborted()) {
    guard.releaseChapterRun(chapter);
    throw new RuntimePipelineError(guard.getAbortReason() || 'Pipeline 已中止', { chapter });
  }

  if (result?.awaiting === 'writer') {
    guard.abortTask(result.message || 'Writer 未产出正文', { chapter, taskId });
    guard.releaseChapterRun(chapter);
    return failPipeline(
      bookDir,
      bookId,
      chapter,
      result.message || 'Writer 未产出正文，请检查 LLM 配置或重试',
      { awaiting: 'writer', pipeline: result },
    );
  }

  if (result?.pass === false || result?.error) {
    const err = result.error || result.message || 'Pipeline 未通过（可能因 Scene 校验失败）';
    guard.abortTask(err, { chapter, taskId });
    guard.releaseChapterRun(chapter);
    return failPipeline(bookDir, bookId, chapter, err, { pipeline: result });
  }

  await emitStage(bookDir, bookId, chapter, 'writer', 'done');
  await emitStage(bookDir, bookId, chapter, 'review', 'running', '检查一致性与质量…');
  await emitStage(bookDir, bookId, chapter, 'review', 'done');
  await emitStage(bookDir, bookId, chapter, 'memory', 'running', '更新记忆…');
  await emitStage(bookDir, bookId, chapter, 'memory', 'done');

  try {
    const scenes = loadScenes(bookDir, chapter) || result?.scenes || [];
    const chapterReview = runChapterReview({
      bookDir,
      chapter,
      scenes,
      intent: result?.intent || {},
    });
      studioEmitRuntimeEvent(bookDir, bookId, 'chapterReviewReport', {
      bookDir,
      chapter,
      pass: chapterReview.pass,
      reportPath: chapterReview.reportPath,
      readerCurvePath: chapterReview.readerCurvePath,
      readerFeedbackPath: chapterReview.readerFeedbackPath,
      readerAddictionScore: chapterReview.readerAddictionScore,
      hookDensity: chapterReview.hookDensity,
      questionDensity: chapterReview.questionDensity,
      payoffDensity: chapterReview.payoffDensity,
      readerCuriosity: chapterReview.readerCuriosity,
      readerWhyContinue: chapterReview.readerWhyContinue,
      nextChapterGuidance: chapterReview.nextChapterGuidance,
      failedSceneCount: chapterReview.failedSceneCount,
    });
    await emitStage(
      bookDir,
      bookId,
      chapter,
      'chapter-review',
      chapterReview.pass ? 'done' : 'warning',
      chapterReview.pass
        ? 'Chapter Review 通过'
        : `Chapter Review · ${chapterReview.failedSceneCount} Scene 待 Adaptive Planner`,
    );
  } catch { /* non-blocking */ }

  studioEmitRuntimeEvent(bookDir, bookId, 'pipelineCompleted', { bookDir, chapter, result });
  guard.completeTask(chapter, result, taskId);

  return result;
}

export async function controlRun(bookDir, { chapter, force, resume, plan, living = false, bookId: bookIdOpt } = {}, daemon = null) {
  const meta = getBookMeta(bookDir);
  const bookId = bookIdOpt || meta.id || meta.bookId;
  const ch = chapter ?? (meta.currentChapter || 0) + 1;

  // 审计门禁：locked / pending_audit 不可生成
  try {
    const { assertChapterUnlocked } = await import('./chapter-audit.js');
    assertChapterUnlocked(bookDir, ch);
  } catch (err) {
    return failPipeline(bookDir, bookId, ch, err.message || String(err));
  }

  if (living) {
    await prepareChapterRun(bookDir, ch, plan || null);
  }

  const result = daemon
    ? await runViaDaemon(daemon, bookDir, bookId, ch, { force: force ?? false, resume })
    : await runFullPipeline(bookDir, { chapter: ch, force, resume, deferCommit: living });

  if (living && result?.pass === true && !result?.awaiting && !result?.error) {
    try {
      // MemoryUnit 已在 Chapter Pipeline 落盘；此处仅校验正文存在
      const written = getChapterText(bookDir, ch);
      if (!written?.text?.trim()) {
        const chapterFile = ensureChapterMarkdownSaved(bookDir, ch, {
          chapterText: result.chapterText,
          intent: result.intent,
          scenes: result.scenes || loadScenes(bookDir, ch).scenes,
        });
        if (!chapterFile || !getChapterText(bookDir, ch).text?.trim()) {
          return failPipeline(
            bookDir,
            bookId,
            ch,
            `第 ${ch} 章 Pipeline 通过但未找到正文文件，请重试生成`,
            { pipeline: result },
          );
        }
      }
      // 待审计：不自动解锁下一章
      const { markPendingAudit } = await import('./chapter-audit.js');
      markPendingAudit(bookDir, ch, {
        deferredCommit: Boolean(result.deferredCommit),
        pendingCommitFile: result.pendingCommitFile || null,
      });

      await emitStage(bookDir, bookId, ch, 'review', 'running', 'Living 提案（analysis-only）');
      const evolution = await runPostChapterEvolution(bookDir, ch);
      await emitStage(bookDir, bookId, ch, 'review', 'done');
      await emitStage(bookDir, bookId, ch, 'memory', 'done', '待审计 · 接受后才正式 commit');
      studioEmitRuntimeEvent(bookDir, bookId, 'pipelineCompleted', {
        bookDir,
        chapter: ch,
        living: true,
        pendingAudit: true,
      });
      return {
        ...result,
        pendingAudit: true,
        chapterFile: result.chapterFile || result.memoryCommit?.chapterFile || written?.source,
        livingEvolution: evolution,
      };
    } catch (err) {
      return failPipeline(bookDir, bookId, ch, err.message);
    }
  }
  if (living && result?.pass !== true) {
    return failPipeline(
      bookDir,
      bookId,
      ch,
      result?.error || result?.message || '章节生成未完成（无 pass）',
      { pipeline: result },
    );
  }
  return result;
}

export async function controlRunLiving(bookDir, options = {}, daemon = null) {
  return controlRun(bookDir, { ...options, living: true }, daemon);
}

export async function controlResume(bookDir, chapter, { force, bookId } = {}, daemon = null) {
  const meta = getBookMeta(bookDir);
  const id = bookId || meta.id || meta.bookId;
  if (daemon) return runViaDaemon(daemon, bookDir, id, chapter, { force: force ?? false, resume: true });
  return runFullPipeline(bookDir, { chapter, force, resume: true });
}

export async function controlRetry(bookDir, chapter, daemon = null) {
  return controlResume(bookDir, chapter, { force: true }, daemon);
}

export async function controlReplan(bookDir, chapter, daemon = null) {
  return controlRun(bookDir, { chapter, force: true }, daemon);
}

export async function controlNext(bookDir, daemon = null) {
  const meta = getBookMeta(bookDir);
  const chapter = resolveNextWritableChapter(bookDir);
  return controlRun(bookDir, { chapter, living: true, bookId: meta.id || meta.bookId }, daemon);
}

export function controlRollback(bookDir, snapshotId) {
  // 支持 snapshotId 或 chapter:N / 纯数字章号
  if (snapshotId == null) throw new Error('rollback 需要 snapshotId 或 chapter');
  const asChapter = String(snapshotId).match(/^(?:chapter:)?(\d+)$/);
  if (asChapter) {
    return rollbackToChapter(bookDir, Number(asChapter[1]));
  }
  return rollback(bookDir, snapshotId);
}

export function controlPause(daemon) {
  daemon.stop();
  return { ok: true, status: 'paused' };
}

export function controlDaemonStart(daemon) {
  if (!daemon.running) daemon.start();
  return { ok: true, status: daemon.getStatus() };
}

export function controlDaemonStop(daemon) {
  daemon.stop();
  return { ok: true };
}
