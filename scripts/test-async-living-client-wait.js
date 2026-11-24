/**
 * 验证 runtimeRunLiving 对 202 异步任务的等待与结果归一化
 * （不启动真实 Pipeline / LLM）
 */
import assert from 'node:assert/strict';
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

// 复用 living-task + task-manager 真实路径
const { acceptLivingChapterRun, getLivingTask } = await import(
  pathToFileURL(path.resolve('packages/inkos-studio-server/src/living-task.js')).href
);

// 伪造 daemon / controlRunLiving：通过 monkey patch 会较重；
// 这里直接测 task accept → enqueue 自定义 runner 语义，并模拟前端 wait 逻辑。

const { taskManager } = await import(
  pathToFileURL(path.resolve('packages/inkos-studio-server/src/task-manager.js')).href
);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForLivingTask(base, taskId, { timeoutMs = 5000, intervalMs = 50 } = {}) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const res = await fetch(`${base}/tasks/${encodeURIComponent(taskId)}`);
    const pub = await res.json();
    if (['completed', 'failed', 'interrupted', 'cancelled'].includes(pub.status)) return pub;
    await sleep(intervalMs);
  }
  throw new Error('timeout');
}

function normalizeLivingRunPayload(payload) {
  if (!payload) return { result: {}, livingEvolution: undefined };
  const nested = payload.result;
  const pipeline = nested && typeof nested === 'object' && !Array.isArray(nested) ? nested : payload;
  return {
    result: { ...pipeline, pass: pipeline.pass ?? payload.pass, chapter: pipeline.chapter ?? payload.chapter },
    livingEvolution: payload.livingEvolution || pipeline.livingEvolution,
  };
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname.startsWith('/tasks/') && req.method === 'GET') {
    const id = decodeURIComponent(url.pathname.slice('/tasks/'.length));
    const out = getLivingTask(id);
    res.writeHead(out.statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(out.body));
    return;
  }
  if (url.pathname === '/run-living' && req.method === 'POST') {
    // 模拟 acceptLivingChapterRun，但 runner 立即成功（不跑真实 Pipeline）
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const parsed = JSON.parse(body || '{}');
      const chapter = Number(parsed.chapter) || 1;
      const task = taskManager.create({
        kind: 'run-living',
        bookId: 'demo',
        bookDir: '/tmp/demo',
        chapter,
      });
      taskManager.enqueue(task.taskId, async () => {
        await sleep(80);
        return {
          pass: true,
          chapter,
          bookId: 'demo',
          result: { pass: true, chapter, scenes: [], message: 'ok' },
          livingEvolution: { editorFeedback: { commercial_score: 80 } },
        };
      });
      res.writeHead(202, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        async: true,
        taskId: task.taskId,
        status: 'pending',
        chapter,
      }));
    });
    return;
  }
  res.writeHead(404);
  res.end('no');
});

await new Promise((r) => server.listen(0, '0.0.0.0', r));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

const accept = await fetch(`${base}/run-living`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ chapter: 3 }),
});
assert.equal(accept.status, 202);
const accepted = await accept.json();
assert.ok(accepted.taskId);

const done = await waitForLivingTask(base, accepted.taskId);
assert.equal(done.status, 'completed');

const normalized = normalizeLivingRunPayload(done.result);
assert.equal(normalized.result.pass, true);
assert.equal(normalized.result.chapter, 3);
assert.equal(normalized.livingEvolution.editorFeedback.commercial_score, 80);

// 旧 bug 复现：若不等待直接用 202 body，pass 会缺失
const buggy = normalizeLivingRunPayload(accepted.result || accepted);
assert.notEqual(buggy.result.pass, true, '202 body 本身不应被当成成功结果');

server.close();
console.log('OK async living wait + normalize');
