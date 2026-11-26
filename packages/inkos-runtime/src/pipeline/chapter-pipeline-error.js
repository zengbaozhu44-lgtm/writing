import fs from 'node:fs';
import path from 'node:path';

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
  // LLM 请求失败（401 key 过期 / 429 限流 / 5xx）：属环境配置问题，必须透出真实原因供排查
  if (/超时|中止|取代|未配置 LLM|Scene 锁|Scene 状态回退|禁止启动|Writer 超时|重新生成|LLM 请求失败 \d{3}/i.test(raw)) {
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
  // 「系统内部错误」必须可诊断：真实异常堆栈无条件落盘（不再依赖 INKOS_DEBUG）。
  // 否则用户只在 UI 看到「系统内部错误」，服务端又不透出堆栈，问题无法排查。
  if (ctx.bookDir) {
    try {
      const dir = path.join(ctx.bookDir, 'novel', '_system', 'runtime', 'runtime-debug');
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, 'orchestrator-error.log');
      const entry = JSON.stringify({
        at: new Date().toISOString(),
        chapter: ctx.chapter ?? null,
        bookDir: ctx.bookDir,
        name: err?.constructor?.name || 'Error',
        message: err?.message || String(err),
        stack: err?.stack || '',
      });
      fs.appendFileSync(file, `${entry}\n`, 'utf8');
    } catch { /* 落盘失败不影响主流程 */ }
  }
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
