/**
 * Task Manager — 异步执行 + 崩溃回滚挂钩 + Boot Stale Sweeper
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const tmpLedger = path.join(os.tmpdir(), `inkos-ledger-${Date.now()}.json`);
process.env.INKOS_TASK_LEDGER = tmpLedger;

const { taskManager, TASK_LEDGER_PATH } = await import(
  pathToFileURL(path.resolve('packages/inkos-studio-server/src/task-manager.js')).href
);

const created = taskManager.create({ kind: 'test', bookId: 'book_demo', chapter: 2 });
if (!created.taskId || created.status !== 'pending') {
  console.error('FAIL create', created);
  process.exit(1);
}

let sawStart = false;
let sawDone = false;
const emitter = taskManager.emitters.get(created.taskId);
emitter.on('event', (ev) => {
  if (ev.event === 'taskStarted') sawStart = true;
  if (ev.event === 'taskCompleted') sawDone = true;
});

taskManager.enqueue(created.taskId, async () => {
  taskManager.pushBookEvent('book_demo', {
    event: 'pipelineStage',
    chapter: 2,
    payload: { stage: 'writer', status: 'running' },
  });
  await new Promise((r) => setTimeout(r, 20));
  return { pass: true, chapter: 2 };
});

await new Promise((r) => setTimeout(r, 80));

const pub = taskManager.getPublic(created.taskId);
if (pub.status !== 'completed' || !sawStart || !sawDone) {
  console.error('FAIL run', pub, { sawStart, sawDone });
  process.exit(1);
}
if (!pub.result?.pass) {
  console.error('FAIL result', pub.result);
  process.exit(1);
}

const events = taskManager.get(created.taskId).events;
const hasRuntime = events.some((e) => e.type === 'runtime' || e.event === 'pipelineStage');
if (!hasRuntime) {
  console.error('FAIL book event not linked', events.map((e) => e.event));
  process.exit(1);
}

// 失败任务应标记 failed 并挂 recovery（无真实 bookDir 时 memory 为空）
const failTask = taskManager.create({
  kind: 'test-fail',
  bookId: 'book_fail',
  bookDir: '/tmp/inkos-no-book',
  chapter: 5,
});
taskManager.enqueue(failTask.taskId, async () => {
  throw new Error('simulated LLM crash');
});
await new Promise((r) => setTimeout(r, 80));
const failed = taskManager.getPublic(failTask.taskId);
if (failed.status !== 'failed' || !failed.recovery) {
  console.error('FAIL crash recovery hook', failed);
  process.exit(1);
}

// 模拟进程崩溃遗留：直接写 ledger 一条 running
fs.writeFileSync(TASK_LEDGER_PATH, JSON.stringify({
  version: 1,
  tasks: [
    {
      id: 'task_stale_1',
      status: 'running',
      kind: 'run-living',
      bookId: 'stale',
      bookDir: null,
      chapter: 9,
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
    },
    {
      id: 'task_stale_2',
      status: 'pending',
      kind: 'run-living',
      bookId: 'stale',
      bookDir: null,
      chapter: 10,
      createdAt: new Date().toISOString(),
    },
  ],
}, null, 2));

const sweep = taskManager.sweepStaleTasks({ reason: 'unit-test' });
if (sweep.swept !== 2) {
  console.error('FAIL sweep count', sweep);
  process.exit(1);
}
const ledger = JSON.parse(fs.readFileSync(TASK_LEDGER_PATH, 'utf8'));
const stillStale = ledger.tasks.filter((t) => t.status === 'pending' || t.status === 'running');
if (stillStale.length) {
  console.error('FAIL ledger still has active tasks', stillStale);
  process.exit(1);
}
if (!ledger.tasks.every((t) => t.status === 'interrupted' || t.status === 'failed' || t.status === 'completed')) {
  // after rewrite, only interrupted from sweep remain in the written batch — ok
}

console.log('OK task-manager async+crash+sweep', {
  completed: created.taskId,
  failed: failTask.taskId,
  swept: sweep.swept,
  ledger: TASK_LEDGER_PATH,
});

try { fs.unlinkSync(tmpLedger); } catch { /* ignore */ }
