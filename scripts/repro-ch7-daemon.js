/**
 * Repro ch7「系统内部错误」v2 — 用 server 完全相同的装配跑 Daemon，
 * 让 orchestrator 顶层 console.error 打印真实异常。
 * 不复用 lock/state 冲突：直接构造，不写 ch7 正文（scene.text 不动，失败即回滚）
 */
import path from 'node:path';
import { RuntimeDaemon, applyDaemonExecutionGuard } from '../packages/inkos-runtime/src/index.js';
import { StudioRuntimeOrchestrator } from '../packages/inkos-studio-server/src/studio-orchestrator.js';
import { createStudioLlmWriter } from '../packages/inkos-studio-server/src/studio-llm-writer.js';
import { createSceneLifecycleHook } from '../packages/inkos-studio-server/src/scene-lifecycle-bridge.js';
import { getBookExecutionGuard } from '../packages/inkos-studio-server/src/execution-guard-store.js';
import { isLlmConfigured } from '../packages/inkos-brain/src/writer/llm-writer.js';

const BOOK = '/Users/zora/Desktop/ai/InkOS/books/我的小说/books/赛博修仙我靠玩家暴打克苏鲁旧日神';
const BOOK_ID = '赛博修仙我靠玩家暴打克苏鲁旧日神';

const guard = getBookExecutionGuard(BOOK);
const writer = isLlmConfigured() ? createStudioLlmWriter(BOOK, BOOK_ID, guard) : null;
const sceneLifecycleHook = createSceneLifecycleHook(BOOK, BOOK_ID);
const daemon = new RuntimeDaemon(BOOK, { writer, autoWrite: Boolean(writer), sceneLifecycleHook });
daemon.runtime = new StudioRuntimeOrchestrator(BOOK, {
  bus: daemon.bus,
  writer,
  autoWrite: Boolean(writer),
  sceneLifecycleHook,
});
applyDaemonExecutionGuard(daemon, guard);

console.log('Running ch7... (真实异常会由 wrapOrchestratorError console.error 打印)');
try {
  const result = await daemon.runChapter(7, { force: false, deferCommit: true });
  console.log('\nRESULT:', JSON.stringify({ pass: result.pass, status: result.status, awaiting: result.awaiting, error: result.error, message: result.message, stage: result.stage }, null, 2));
} catch (err) {
  console.error('\nDAEMON THREW:', err.constructor.name, err.message);
  console.error('recovery:', err.recovery);
  console.error(err.stack);
}
process.exit(0);
