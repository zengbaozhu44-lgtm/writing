// 精确复刻 runViaDaemon: beginTask + acquireChapterRun + daemon.runChapter(force=true)
import { RuntimeDaemon, applyDaemonExecutionGuard } from '../packages/inkos-runtime/src/index.js';
import { StudioRuntimeOrchestrator } from '../packages/inkos-studio-server/src/studio-orchestrator.js';
import { createStudioLlmWriter } from '../packages/inkos-studio-server/src/studio-llm-writer.js';
import { createSceneLifecycleHook } from '../packages/inkos-studio-server/src/scene-lifecycle-bridge.js';
import { getBookExecutionGuard } from '../packages/inkos-studio-server/src/execution-guard-store.js';
import { isLlmConfigured } from '../packages/inkos-brain/src/writer/llm-writer.js';

const BOOK = '/Users/zora/Desktop/ai/InkOS/books/我的小说/books/赛博修仙我靠玩家暴打克苏鲁旧日神';
const BOOK_ID = '赛博修仙我靠玩家暴打克苏鲁旧日神';
const CHAPTER = 7;

const guard = getBookExecutionGuard(BOOK);
const taskId = guard.beginTask(CHAPTER, { phase: 'planner', currentScene: null });
guard.acquireChapterRun(CHAPTER, taskId);
console.log('[runViaDaemon] taskId:', taskId);

const writer = createStudioLlmWriter(BOOK, BOOK_ID, guard);
const sceneLifecycleHook = createSceneLifecycleHook(BOOK, BOOK_ID);
const daemon = new RuntimeDaemon(BOOK, { writer, autoWrite: true, sceneLifecycleHook });
daemon.runtime = new StudioRuntimeOrchestrator(BOOK, { bus: daemon.bus, writer, autoWrite: true, sceneLifecycleHook });
applyDaemonExecutionGuard(daemon, guard);

console.log('[runViaDaemon] running ch7 force=true...');
const result = await daemon.runChapter(CHAPTER, { force: true, deferCommit: true });
console.log('\nRESULT:', JSON.stringify({ pass: result.pass, status: result.status, awaiting: result.awaiting, error: result.error, message: result.message, stage: result.stage }, null, 2));
process.exit(0);
