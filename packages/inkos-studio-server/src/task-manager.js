/**
 * Task Manager — 异步任务队列 + 崩溃自愈 + 启动态清扫
 *
 * - HTTP 立刻返回 taskId；Runtime 在后台跑；进度经 EventEmitter → SSE
 * - 任务摘要持久化到 ledger，进程重启可 sweep 遗留 pending/running
 * - running 未捕获异常 → failed + recoverFailedChapter(chapter)（回滚到上一章）
 */
import { EventEmitter } from 'node:events';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, writeJson, readJson, exists } from '../../inkos-core/src/lib/paths.js';
import { recoverFailedChapter } from '../../inkos-runtime/src/memory/memory-unit.js';
import { getBookExecutionGuard } from './execution-guard-store.js';

/** @typedef {'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'interrupted'} TaskStatus */

/**
 * @typedef {object} TaskState
 * @property {string} id
 * @property {TaskStatus} status
 * @property {string} kind
 * @property {string} [bookId]
 * @property {string} [bookDir]
 * @property {number} [chapter]
 * @property {string} createdAt
 * @property {string} [startedAt]
 * @property {string} [finishedAt]
 * @property {string} [error]
 * @property {unknown} [result]
 * @property {unknown} [recovery]
 * @property {object[]} events
 * @property {Record<string, unknown>} [meta]
 */

const MAX_EVENTS_PER_TASK = 300;
const MAX_TASKS = 200;
const TASK_TTL_MS = 60 * 60 * 1000;
const LEDGER_PATH = process.env.INKOS_TASK_LEDGER
  || path.join(ROOT, '.inkos-studio', 'task-ledger.json');

function newTaskId() {
  return `task_${Date.now()}_${randomBytes(4).toString('hex')}`;
}

function isTerminal(status) {
  return status === 'completed'
    || status === 'failed'
    || status === 'cancelled'
    || status === 'interrupted';
}

function ensureLedgerDir() {
  fs.mkdirSync(path.dirname(LEDGER_PATH), { recursive: true });
}

function loadLedger() {
  if (!exists(LEDGER_PATH)) return { version: 1, tasks: [] };
  try {
    const data = readJson(LEDGER_PATH);
    return {
      version: 1,
      tasks: Array.isArray(data?.tasks) ? data.tasks : [],
    };
  } catch {
    return { version: 1, tasks: [] };
  }
}

function toLedgerEntry(task) {
  return {
    id: task.id,
    status: task.status,
    kind: task.kind,
    bookId: task.bookId || null,
    bookDir: task.bookDir || task.meta?.bookDir || null,
    chapter: task.chapter ?? null,
    createdAt: task.createdAt,
    startedAt: task.startedAt || null,
    finishedAt: task.finishedAt || null,
    error: task.error || null,
    recovery: task.recovery || null,
  };
}

class TaskManager {
  constructor() {
    /** @type {Map<string, TaskState>} */
    this.tasks = new Map();
    /** @type {Map<string, EventEmitter>} */
    this.emitters = new Map();
    /** bookId → Set<taskId> */
    /** @type {Map<string, Set<string>>} */
    this.bookIndex = new Map();
    this._swept = false;
  }

  /**
   * @param {{ kind: string, bookId?: string, bookDir?: string, chapter?: number, meta?: Record<string, unknown> }} opts
   */
  create(opts = {}) {
    this.#gc();
    const id = newTaskId();
    const bookDir = opts.bookDir || opts.meta?.bookDir || null;
    /** @type {TaskState} */
    const state = {
      id,
      status: 'pending',
      kind: opts.kind || 'generic',
      bookId: opts.bookId,
      bookDir,
      chapter: opts.chapter,
      createdAt: new Date().toISOString(),
      events: [],
      meta: { ...(opts.meta || {}), bookDir },
    };
    this.tasks.set(id, state);
    this.emitters.set(id, new EventEmitter());
    if (opts.bookId) {
      if (!this.bookIndex.has(opts.bookId)) this.bookIndex.set(opts.bookId, new Set());
      this.bookIndex.get(opts.bookId).add(id);
    }
    this.#persist(state);
    this.#emit(id, {
      type: 'task',
      event: 'taskCreated',
      taskId: id,
      status: 'pending',
      bookId: opts.bookId,
      chapter: opts.chapter,
      at: state.createdAt,
    });
    return this.getPublic(id);
  }

  get(id) {
    return this.tasks.get(id) || null;
  }

  getPublic(id) {
    const t = this.get(id);
    if (!t) return null;
    return {
      taskId: t.id,
      id: t.id,
      status: t.status,
      kind: t.kind,
      bookId: t.bookId,
      bookDir: t.bookDir,
      chapter: t.chapter,
      createdAt: t.createdAt,
      startedAt: t.startedAt,
      finishedAt: t.finishedAt,
      error: t.error || null,
      recovery: t.recovery || null,
      result: t.status === 'completed' ? t.result : undefined,
      eventCount: t.events.length,
    };
  }

  /**
   * 非阻塞入队：创建后立刻返回；执行在下一个 macrotask
   * @param {string} id
   * @param {() => Promise<unknown>} runner
   */
  enqueue(id, runner) {
    const task = this.get(id);
    if (!task) throw new Error(`Task not found: ${id}`);
    if (task.status !== 'pending') throw new Error(`Task ${id} is not pending`);

    setImmediate(() => {
      void this.#run(id, runner);
    });
  }

  /**
   * Boot：扫描 ledger 中残留的 pending/running → interrupted + rollback
   */
  sweepStaleTasks({ reason = 'server-boot' } = {}) {
    const ledger = loadLedger();
    const stale = ledger.tasks.filter((t) => t.status === 'pending' || t.status === 'running');
    const results = [];

    for (const entry of stale) {
      const recovery = this.#recoverCrash(entry, reason);
      const updated = {
        ...entry,
        status: 'interrupted',
        finishedAt: new Date().toISOString(),
        error: entry.error || `进程异常中断（${reason}），任务已标记 interrupted`,
        recovery,
      };
      results.push(updated);

      // 若内存里已有同 id（极少），同步状态
      const live = this.get(entry.id);
      if (live) {
        live.status = 'interrupted';
        live.finishedAt = updated.finishedAt;
        live.error = updated.error;
        live.recovery = recovery;
        this.#unlinkBook(entry.id);
      }
    }

    if (stale.length) {
      const kept = ledger.tasks
        .filter((t) => !(t.status === 'pending' || t.status === 'running'))
        .concat(results.map(toLedgerEntry));
      this.#writeLedger({ version: 1, tasks: kept.slice(-MAX_TASKS) });
      console.warn(`[TaskManager] Stale Task Sweeper: ${stale.length} 个残留任务 → interrupted`);
    }

    this._swept = true;
    return { swept: results.length, tasks: results };
  }

  /**
   * Runtime / Studio 进度事件 → 绑定到该书下所有 running/pending 任务
   */
  pushBookEvent(bookId, entry) {
    if (!bookId) return;
    const ids = this.bookIndex.get(bookId);
    if (!ids?.size) return;
    for (const taskId of ids) {
      const t = this.get(taskId);
      if (!t || isTerminal(t.status)) continue;
      this.#emit(taskId, {
        type: 'runtime',
        ...entry,
        taskId,
        bookId,
      });
    }
  }

  /**
   * SSE：订阅任务事件；发送历史后持续推送
   * @param {string} id
   * @param {import('http').ServerResponse} res
   */
  subscribeSSE(id, res) {
    const task = this.get(id);
    if (!task) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'TASK_NOT_FOUND', taskId: id }));
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    const write = (payload) => {
      try {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      } catch { /* closed */ }
    };

    write({
      type: 'connected',
      taskId: id,
      status: task.status,
      message: 'Task stream connected',
    });

    for (const ev of task.events) write(ev);

    if (isTerminal(task.status)) {
      write({
        type: 'task',
        event: task.status === 'completed' ? 'taskCompleted' : 'taskFailed',
        taskId: id,
        status: task.status,
        error: task.error || null,
        recovery: task.recovery || null,
        result: task.status === 'completed' ? task.result : undefined,
        at: task.finishedAt,
      });
      return;
    }

    const emitter = this.emitters.get(id);
    const onEvent = (ev) => write(ev);
    emitter?.on('event', onEvent);
    res.on('close', () => {
      emitter?.off('event', onEvent);
    });
  }

  async #run(id, runner) {
    const task = this.get(id);
    if (!task) return;

    task.status = 'running';
    task.startedAt = new Date().toISOString();
    this.#persist(task);
    this.#emit(id, {
      type: 'task',
      event: 'taskStarted',
      taskId: id,
      status: 'running',
      bookId: task.bookId,
      chapter: task.chapter,
      at: task.startedAt,
    });

    try {
      const result = await runner();
      const current = this.get(id);
      if (!current || current.status === 'cancelled') return;

      current.status = 'completed';
      current.result = result;
      current.finishedAt = new Date().toISOString();
      this.#persist(current);
      this.#emit(id, {
        type: 'task',
        event: 'taskCompleted',
        taskId: id,
        status: 'completed',
        bookId: current.bookId,
        chapter: current.chapter,
        result,
        at: current.finishedAt,
      });
    } catch (err) {
      const current = this.get(id);
      if (!current || current.status === 'cancelled') return;

      // 崩溃自愈：若 Daemon 已回滚则只补释锁；否则 full recoverFailedChapter
      let recovery;
      if (err?.inkosRecovered || err?.recovery?.ok) {
        recovery = err.recovery || { skipped: true, reason: 'already-recovered-by-daemon' };
        const bookDir = current.bookDir || current.meta?.bookDir;
        const chapter = Number(current.chapter);
        if (bookDir && Number.isFinite(chapter) && chapter >= 1) {
          try {
            getBookExecutionGuard(bookDir).releaseChapterRun(chapter);
          } catch { /* 锁可能已释放 */ }
        }
      } else {
        recovery = this.#recoverCrash(current, err?.message || String(err));
      }
      current.status = 'failed';
      current.error = err?.message || String(err);
      current.result = err?.result || { pass: false, error: current.error };
      current.recovery = recovery;
      current.finishedAt = new Date().toISOString();
      this.#persist(current);
      this.#emit(id, {
        type: 'task',
        event: 'taskFailed',
        taskId: id,
        status: 'failed',
        bookId: current.bookId,
        chapter: current.chapter,
        error: current.error,
        recovery,
        result: current.result,
        at: current.finishedAt,
      });
    } finally {
      this.#unlinkBook(id);
    }
  }

  /**
   * 章锁释放 + MemoryUnit.recoverFailedChapter（rollbackToChapter(n-1)）
   */
  #recoverCrash(taskLike, reason) {
    const bookDir = taskLike.bookDir || taskLike.meta?.bookDir;
    const chapter = Number(taskLike.chapter);
    let release = null;
    let memory = null;

    if (bookDir && Number.isFinite(chapter) && chapter >= 1) {
      try {
        const guard = getBookExecutionGuard(bookDir);
        guard.releaseChapterRun(chapter);
        release = { chapter, ok: true };
      } catch (err) {
        release = { chapter, ok: false, error: err?.message || String(err) };
      }

      try {
        memory = recoverFailedChapter(bookDir, chapter, {
          reason: typeof reason === 'string' ? reason : 'task-failed',
        });
      } catch (err) {
        memory = { ok: false, error: err?.message || String(err) };
        console.warn('[TaskManager] recoverFailedChapter 失败:', memory.error);
      }
    }

    return {
      at: new Date().toISOString(),
      bookDir: bookDir || null,
      chapter: Number.isFinite(chapter) ? chapter : null,
      rolledBackTo: memory?.rolledBackTo ?? (Number.isFinite(chapter) ? chapter - 1 : null),
      release,
      memory,
    };
  }

  #persist(task) {
    try {
      ensureLedgerDir();
      const ledger = loadLedger();
      const entry = toLedgerEntry(task);
      const idx = ledger.tasks.findIndex((t) => t.id === task.id);
      if (idx >= 0) ledger.tasks[idx] = entry;
      else ledger.tasks.push(entry);
      if (ledger.tasks.length > MAX_TASKS) {
        ledger.tasks = ledger.tasks.slice(-MAX_TASKS);
      }
      this.#writeLedger(ledger);
    } catch (err) {
      console.warn('[TaskManager] ledger 写入失败:', err?.message || err);
    }
  }

  #writeLedger(ledger) {
    ensureLedgerDir();
    writeJson(LEDGER_PATH, {
      ...ledger,
      updatedAt: new Date().toISOString(),
    });
  }

  #emit(id, payload) {
    const task = this.get(id);
    const emitter = this.emitters.get(id);
    if (!task) return;
    const entry = { ...payload, at: payload.at || new Date().toISOString() };
    task.events.push(entry);
    if (task.events.length > MAX_EVENTS_PER_TASK) task.events.shift();
    emitter?.emit('event', entry);
  }

  #unlinkBook(id) {
    const task = this.get(id);
    if (!task?.bookId) return;
    const set = this.bookIndex.get(task.bookId);
    set?.delete(id);
    if (set && set.size === 0) this.bookIndex.delete(task.bookId);
  }

  #gc() {
    if (this.tasks.size < MAX_TASKS) return;
    const now = Date.now();
    for (const [id, t] of this.tasks) {
      const done = isTerminal(t.status);
      const age = now - Date.parse(t.finishedAt || t.createdAt);
      if (done && age > TASK_TTL_MS) {
        this.emitters.get(id)?.removeAllListeners();
        this.emitters.delete(id);
        this.#unlinkBook(id);
        this.tasks.delete(id);
      }
    }
  }
}

export const taskManager = new TaskManager();
export { LEDGER_PATH as TASK_LEDGER_PATH };
