import path from 'node:path';
import { RuntimeDaemon, applyDaemonExecutionGuard } from '../packages/inkos-runtime/src/index.js';
import { StudioRuntimeOrchestrator } from '../packages/inkos-studio-server/src/studio-orchestrator.js';
import { createStudioLlmWriter } from '../packages/inkos-studio-server/src/studio-llm-writer.js';
import { createSceneLifecycleHook } from '../packages/inkos-studio-server/src/scene-lifecycle-bridge.js';
import { getBookExecutionGuard } from '../packages/inkos-studio-server/src/execution-guard-store.js';
import { isLlmConfigured } from '../packages/inkos-brain/src/writer/llm-writer.js';

const BOOK = '/Users/zora/Desktop/ai/InkOS/books/我的小说/books/赛博修仙我靠玩家暴打克苏鲁旧日神';
const BOOK_ID = '赛博修仙我靠玩家暴打克苏鲁旧日神';

console.log('STEP 0: imports done');
const guard = getBookExecutionGuard(BOOK);
console.log('STEP 1: guard got');
const writer = isLlmConfigured() ? createStudioLlmWriter(BOOK, BOOK_ID, guard) : null;
console.log('STEP 2: writer created, configured=', Boolean(writer));
const sceneLifecycleHook = createSceneLifecycleHook(BOOK, BOOK_ID);
console.log('STEP 3: hook created');
const daemon = new RuntimeDaemon(BOOK, { writer, autoWrite: Boolean(writer), sceneLifecycleHook });
console.log('STEP 4: daemon created');
daemon.runtime = new StudioRuntimeOrchestrator(BOOK, { bus: daemon.bus, writer, autoWrite: Boolean(writer), sceneLifecycleHook });
console.log('STEP 5: runtime assigned');
applyDaemonExecutionGuard(daemon, guard);
console.log('STEP 6: guard applied, calling runChapter...');
const result = await daemon.runChapter(7, { force: false, deferCommit: true });
console.log('STEP 7: runChapter returned');
console.log('\nRESULT:', JSON.stringify({ pass: result.pass, status: result.status, awaiting: result.awaiting, error: result.error, message: result.message, stage: result.stage }, null, 2));
process.exit(0);
