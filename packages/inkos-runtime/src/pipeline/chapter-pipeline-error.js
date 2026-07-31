/**
 * Chapter Pipeline 业务错误 — 前端可读，禁止把 TypeError 原文甩给用户
 */
export class ChapterPipelineError extends Error {
  /**
   * @param {{ stage: string, message: string, recoverable?: boolean, details?: unknown, userMessage?: string }} opts
   */
  constructor({ stage, message, recoverable = false, details = null, userMessage = null }) {
    super(message);
    this.name = 'ChapterPipelineError';
    this.stage = stage;
    this.recoverable = recoverable;
    this.details = details;
    this.userMessage = userMessage || `【${String(stage)} 阶段失败】${message}`;
  }

  toPipelineResult() {
    return {
      pass: false,
      status: 'failed',
      stage: this.stage,
      message: this.message,
      userMessage: this.userMessage,
      error: this.userMessage,
      recoverable: this.recoverable,
      details: this.details,
    };
  }
}

/**
 * 将未知异常包装为可读 pipeline 结果（系统错误不暴露堆栈给 UI）
 * @param {unknown} err
 * @param {{ chapter?: number, bookDir?: string }} [ctx]
 */
export function wrapOrchestratorError(err, ctx = {}) {
  if (err instanceof ChapterPipelineError) {
    return {
      ...err.toPipelineResult(),
      chapter: ctx.chapter,
      bookDir: ctx.bookDir,
    };
  }
  const raw = err?.message || String(err);
  // 超时 / 中止 / 用户可读业务错误：原样透出，勿吞成「系统内部错误」
  if (/超时|中止|取代|未配置 LLM|Scene 锁|Scene 状态回退|禁止启动|Writer 超时|重新生成/i.test(raw)) {
    return {
      pass: false,
      status: 'failed',
      stage: 'writer',
      message: raw,
      userMessage: raw,
      error: raw,
      recoverable: /超时|重新生成|取代/i.test(raw),
      chapter: ctx.chapter,
      bookDir: ctx.bookDir,
    };
  }
  console.error('[Orchestrator] Unexpected error:', err);
  return {
    pass: false,
    status: 'error',
    stage: 'system',
    message: '系统内部错误，请联系技术支持',
    userMessage: '系统内部错误，请联系技术支持',
    error: '系统内部错误，请联系技术支持',
    recoverable: false,
    chapter: ctx.chapter,
    bookDir: ctx.bookDir,
    details: process.env.INKOS_DEBUG === '1'
      ? { raw }
      : null,
  };
}
