/**
 * Living Chapter Task — 异步章生成入口
 * POST 立刻 202 + taskId；Runtime 在后台执行；进度走 Task SSE / 书本 SSE
 */
import { controlRunLiving, RuntimePipelineError } from './runtime-control.js';
import { taskManager } from './task-manager.js';
import { normalizeVersion } from './compatibility.js';

/**
 * 接受 Living 生成请求：创建任务并非阻塞启动 Daemon
 * @returns {{ statusCode: number, body: Record<string, unknown> }}
 */
export function acceptLivingChapterRun({
  bookDir,
  bookId,
  body = {},
  daemon,
} = {}) {
  const chapter = Number(body.chapter);
  if (!Number.isFinite(chapter) || chapter < 1) {
    return {
      statusCode: 400,
      body: {
        ...normalizeVersion(),
        ok: false,
        error: '无效的 chapter',
      },
    };
  }

  const task = taskManager.create({
    kind: 'run-living',
    bookId,
    bookDir,
    chapter,
    meta: {
      bookDir,
      force: body.force !== false,
      resume: Boolean(body.resume),
    },
  });

  taskManager.enqueue(task.taskId, async () => {
    try {
      const result = await controlRunLiving(
        bookDir,
        {
          chapter,
          force: body.force !== false,
          resume: Boolean(body.resume),
          plan: body.plan || null,
          bookId,
        },
        daemon,
      );
      if (result?.pass !== true || result?.awaiting || result?.error) {
        const err = new RuntimePipelineError(
          result?.error || result?.message || '章节生成未完成',
          { chapter, bookDir, pipeline: result },
        );
        throw err;
      }
      return {
        pass: true,
        chapter,
        bookId,
        result,
        livingEvolution: result.livingEvolution,
      };
    } catch (err) {
      if (err?.name === 'RuntimePipelineError') throw err;
      const wrapped = new Error(err?.message || String(err));
      wrapped.name = 'RuntimePipelineError';
      wrapped.result = { pass: false, error: wrapped.message, chapter, bookDir };
      throw wrapped;
    }
  });

  return {
    statusCode: 202,
    body: {
      ...normalizeVersion(),
      ok: true,
      accepted: true,
      async: true,
      taskId: task.taskId,
      status: 'pending',
      chapter,
      bookId,
      stream: `/api/tasks/${encodeURIComponent(task.taskId)}/stream`,
      statusUrl: `/api/tasks/${encodeURIComponent(task.taskId)}`,
      message: '章节生成已受理，请订阅 SSE 或轮询任务状态',
    },
  };
}

/** GET 任务快照 */
export function getLivingTask(taskId) {
  const pub = taskManager.getPublic(taskId);
  if (!pub) {
    return {
      statusCode: 404,
      body: { ...normalizeVersion(), ok: false, error: 'TASK_NOT_FOUND', taskId },
    };
  }
  return {
    statusCode: 200,
    body: { ...normalizeVersion(), ok: true, ...pub },
  };
}

/** GET 任务 SSE */
export function streamLivingTask(taskId, res) {
  taskManager.subscribeSSE(taskId, res);
}
