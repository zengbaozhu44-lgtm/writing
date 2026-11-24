// Repro ch7 Studio-path failure — 独立于 server，带 INKOS_DEBUG=1 落盘堆栈
import { createExecutionGuard, applyDaemonExecutionGuard, RuntimeDaemon } from '/Users/zora/Desktop/ai/InkOS/packages/inkos-runtime/src/index.js';
import { createStudioLlmWriter } from '/Users/zora/Desktop/ai/InkOS/packages/inkos-studio-server/src/studio-llm-writer.js';
import { StudioRuntimeOrchestrator } from '/Users/zora/Desktop/ai/InkOS/packages/inkos-studio-server/src/studio-orchestrator.js';
import { isLlmConfigured } from '/Users/zora/Desktop/ai/InkOS/packages/inkos-brain/src/writer/llm-writer.js';
import { loadInkOsConfig } from '/Users/zora/Desktop/ai/InkOS/packages/inkos-core/src/lib/config.js';
import { createSceneLifecycleHook } from '/Users/zora/Desktop/ai/InkOS/packages/inkos-studio-server/src/scene-lifecycle-bridge.js';

const bookDir = '/tmp/inkos-repro-book';
const bookId = '赛博修仙我靠玩家暴打克苏鲁旧日神';

const cfg = loadInkOsConfig();
console.log('[repro] llm configured:', isLlmConfigured(), '| model:', cfg.llm.model, '| baseUrl:', cfg.llm.baseUrl);

const guard = createExecutionGuard(bookDir);
const sceneLifecycleHook = createSceneLifecycleHook(bookDir, bookId);
const writer = isLlmConfigured() ? createStudioLlmWriter(bookDir, bookId, guard) : null;
const daemon = new RuntimeDaemon(bookDir, { writer, autoWrite: Boolean(writer), sceneLifecycleHook });
const orchestrator = new StudioRuntimeOrchestrator(bookDir, {
  bus: daemon.bus,
  writer,
  autoWrite: Boolean(writer),
  sceneLifecycleHook,
});
applyDaemonExecutionGuard(daemon, guard);

try {
  console.log('[repro] running chapter 7...');
  const result = await orchestrator.runChapter({ chapter: 7, force: true });
  console.log('[repro] result pass=', result.pass, '| awaiting=', result.awaiting, '| error=', result.error || result.message);
} catch (err) {
  console.error('[repro] THREW:', err.constructor.name, err.message);
  console.error(err.stack);
}
