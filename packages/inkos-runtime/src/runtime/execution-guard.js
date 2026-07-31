/**
 * Runtime Execution Guard — 稳定层（不修改 Pipeline 架构）
 * Scene Lock · Task ID · Event Ordering · State Snapshot · Debug Log
 */
import fs from 'node:fs';
import path from 'node:path';
import { exists, readJson, writeJson, writeText, readText } from '../../../inkos-core/src/lib/paths.js';

const STALE_LOCK_MS = Number(process.env.INKOS_LOCK_STALE_MS || 300000);
const DEBUG_MAX_LINES = 5000;

function padChapter(n) {
  return String(n).padStart(4, '0');
}

function padScene(n) {
  return String(n).padStart(2, '0');
}

export function generateTaskId() {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function getGuardPaths(bookDir) {
  const base = path.join(bookDir, 'novel', '_system', 'runtime');
  return {
    base,
    locks: path.join(base, 'locks'),
    state: path.join(base, 'runtime_state.json'),
    debugDir: path.join(base, 'runtime-debug'),
    eventsLog: path.join(base, 'runtime-debug', 'events.log'),
  };
}

function ensureDirs(paths) {
  fs.mkdirSync(paths.locks, { recursive: true });
  fs.mkdirSync(paths.debugDir, { recursive: true });
}

function sceneLockFile(paths, chapter, scene) {
  return path.join(paths.locks, `ch_${padChapter(chapter)}_scene_${padScene(scene)}.lock`);
}

function chapterRunLockFile(paths, chapter) {
  return path.join(paths.locks, `ch_${padChapter(chapter)}_run.lock`);
}

function readLock(file) {
  if (!exists(file)) return null;
  try {
    return readJson(file);
  } catch {
    return null;
  }
}

function isStale(lock) {
  if (!lock?.startedAt) return true;
  return Date.now() - new Date(lock.startedAt).getTime() > STALE_LOCK_MS;
}

/**
 * @param {string} bookDir
 */
const GENERIC_ABORT_REASONS = new Set([
  'pipelineFailed', 'sceneRejected', 'reviewFailed', 'sceneReviewFailed',
  'decisionRejected', 'chapterReviewFailed', 'criticRejected', 'validationRejected',
  'Pipeline 失败', 'Pipeline Failed', '系统内部错误，请联系技术支持',
]);

function isGenericAbortReason(reason) {
  if (!reason) return true;
  const text = String(reason);
  if (GENERIC_ABORT_REASONS.has(text)) return true;
  if (text.startsWith('daemon_blocked:')) return true;
  if (/^Pipeline\s*失败$/i.test(text.trim())) return true;
  return false;
}

function extractPipelineFailureReason(payload = {}) {
  const pipeline = payload.pipeline;
  return payload.error
    || payload.message
    || payload.userMessage
    || pipeline?.error
    || pipeline?.userMessage
    || pipeline?.message
    || null;
}

function describeFailureReason(event, payload = {}) {
  const sr = payload.sceneResult;
  if (sr?.consistency?.failures?.length) {
    return sr.consistency.failures.map((f) => `${f.dimension}: ${f.reason || '未通过'}`).join('；');
  }
  if (event === 'reviewFailed' && payload.consistency?.failures?.length) {
    return payload.consistency.failures.map((f) => `${f.dimension}: ${f.reason || '未通过'}`).join('；');
  }
  if (sr?.review?.issues?.length) {
    return `Scene Review 未通过：${sr.review.issues.join('；')}`;
  }
  if (sr?.error && !/停止生成$/.test(sr.error)) return sr.error;
  if (payload.error && !/停止生成$/.test(String(payload.error))) return payload.error;
  if (payload.message) return payload.message;
  if (event === 'sceneRejected') return 'Scene 被拒绝（校验未通过，不会自动重试）';
  return event;
}

export function createExecutionGuard(bookDir) {
  const paths = getGuardPaths(bookDir);
  ensureDirs(paths);

  let currentTaskId = null;
  let taskAborted = false;
  let abortReason = '';
  let lastAcceptedSeq = 0;
  const sceneProgress = new Map();

  function appendDebugLog(type, data = {}) {
    const line = JSON.stringify({
      type,
      timestamp: new Date().toISOString(),
      taskId: currentTaskId,
      ...data,
    });
    try {
      fs.appendFileSync(paths.eventsLog, `${line}\n`, 'utf8');
      const raw = exists(paths.eventsLog) ? readText(paths.eventsLog) : '';
      const lines = raw.split('\n').filter(Boolean);
      if (lines.length > DEBUG_MAX_LINES) {
        writeText(paths.eventsLog, `${lines.slice(-DEBUG_MAX_LINES).join('\n')}\n`);
      }
    } catch { /* ignore */ }
  }

  function readState() {
    if (!exists(paths.state)) return {};
    try {
      return readJson(paths.state);
    } catch {
      return {};
    }
  }

  function writeState(patch) {
    const prev = readState();
    const next = {
      ...prev,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    // 禁止用泛化文案覆盖已有具体失败原因（如 Scene N Writer 超时 → Pipeline 失败）
    if (
      Object.prototype.hasOwnProperty.call(patch, 'error')
      && patch.error != null
      && prev.error
      && !isGenericAbortReason(prev.error)
      && isGenericAbortReason(patch.error)
    ) {
      next.error = prev.error;
    }
    writeJson(paths.state, next);
    return next;
  }

  function beginTask(chapter, meta = {}) {
    if (currentTaskId && !taskAborted) {
      appendDebugLog('task_superseded', {
        chapter,
        oldTaskId: currentTaskId,
        reason: meta.supersedeReason || '已被新的生成请求取代',
      });
      // 标记旧任务中止，但马上换新 taskId；旧 Writer 须用 isStaleTask 自检
      taskAborted = true;
      abortReason = meta.supersedeReason || '已被新的生成请求取代';
    }
    currentTaskId = generateTaskId();
    taskAborted = false;
    abortReason = '';
    lastAcceptedSeq = 0;
    sceneProgress.clear();
    if (chapter != null) {
      clearOrphanedSceneLocks(chapter, currentTaskId);
      releaseChapterRun(chapter);
    }
    writeState({
      chapter,
      currentScene: meta.currentScene ?? null,
      phase: meta.phase || 'starting',
      taskId: currentTaskId,
      status: 'running',
      error: null,
    });
    appendDebugLog('task_start', { chapter, taskId: currentTaskId, ...meta });
    return currentTaskId;
  }

  function abortTask(reason, meta = {}) {
    const nextReason = reason || 'Pipeline 失败';
    if (taskAborted && abortReason) {
      // 已有具体原因时，禁止用「Pipeline 失败」等泛化文案覆盖
      if (!isGenericAbortReason(abortReason) && isGenericAbortReason(nextReason)) return;
    }
    taskAborted = true;
    abortReason = nextReason;
    writeState({ phase: 'failed', status: 'aborted', error: nextReason, ...meta });
    appendDebugLog('rollback', { reason: nextReason, ...meta });
    if (meta.chapter != null) clearChapterSceneLocks(meta.chapter);
  }

  /** 旧 Writer / 旧异步事件：taskId 已不是当前任务 */
  function isStaleTask(taskId) {
    if (!taskId || !currentTaskId) return false;
    return taskId !== currentTaskId;
  }

  /** 重新生成前：清章锁与进度，允许 Scene 1 重跑 */
  function resetChapterForRerun(chapter, reason = '重新生成') {
    if (chapter == null) return;
    if (currentTaskId && !taskAborted) {
      abortTask(reason, { chapter });
    }
    sceneProgress.delete(`progress:${chapter}`);
    releaseChapterRun(chapter);
    clearChapterSceneLocks(chapter);
    if (exists(paths.locks)) {
      for (const f of fs.readdirSync(paths.locks)) {
        if (!f.startsWith(`ch_${padChapter(chapter)}_`)) continue;
        try { fs.unlinkSync(path.join(paths.locks, f)); } catch { /* */ }
      }
    }
    const state = readState();
    if (state.chapter === chapter) {
      writeState({
        chapter,
        currentScene: null,
        phase: 'idle',
        status: 'ready',
        taskId: null,
        error: null,
      });
    }
    appendDebugLog('chapter_reset_for_rerun', { chapter, reason });
  }

  /** 延长章节运行锁，避免长章节被当成 stale 后并行重跑 */
  function touchChapterRun(chapter) {
    const file = chapterRunLockFile(paths, chapter);
    const existing = readLock(file);
    if (!existing || existing.status !== 'running') return;
    writeJson(file, {
      ...existing,
      startedAt: new Date().toISOString(),
      taskId: existing.taskId || currentTaskId,
    });
  }

  function isTaskAborted() {
    return taskAborted;
  }

  function getAbortReason() {
    return abortReason;
  }

  function getTaskId() {
    return currentTaskId;
  }

  function acquireChapterRun(chapter, taskId) {
    const file = chapterRunLockFile(paths, chapter);
    const existing = readLock(file);
    if (existing?.status === 'running' && existing.taskId !== taskId && !isStale(existing)) {
      const err = `第 ${chapter} 章已有 Pipeline 运行中（${existing.taskId}）`;
      appendDebugLog('chapter_run_blocked', { chapter, existingTaskId: existing.taskId, taskId });
      throw new Error(err);
    }
    if (existing && isStale(existing)) {
      appendDebugLog('chapter_run_stale_lock', { chapter, existing });
      releaseChapterRun(chapter);
    }
    writeJson(file, {
      chapter,
      status: 'running',
      startedAt: new Date().toISOString(),
      taskId,
    });
    appendDebugLog('chapter_run_lock', { chapter, taskId });
    return true;
  }

  function releaseChapterRun(chapter) {
    const file = chapterRunLockFile(paths, chapter);
    if (exists(file)) fs.unlinkSync(file);
    appendDebugLog('chapter_run_unlock', { chapter, taskId: currentTaskId });
  }

  function clearSceneLock(chapter, scene) {
    const file = sceneLockFile(paths, chapter, scene);
    if (exists(file)) fs.unlinkSync(file);
    appendDebugLog('scene_lock_released', { chapter, scene, taskId: currentTaskId });
  }

  function clearChapterSceneLocks(chapter) {
    if (!exists(paths.locks)) return;
    for (const f of fs.readdirSync(paths.locks)) {
      if (!f.startsWith(`ch_${padChapter(chapter)}_scene_`)) continue;
      const lock = readLock(path.join(paths.locks, f));
      if (lock?.status === 'writing') {
        fs.unlinkSync(path.join(paths.locks, f));
        appendDebugLog('scene_lock_force_release', { file: f, chapter, taskId: lock.taskId });
      }
    }
  }

  function clearOrphanedSceneLocks(chapter, taskId) {
    if (!exists(paths.locks)) return;
    for (const f of fs.readdirSync(paths.locks)) {
      if (!f.startsWith(`ch_${padChapter(chapter)}_scene_`)) continue;
      const file = path.join(paths.locks, f);
      const lock = readLock(file);
      if (!lock) continue;
      const orphaned = lock.taskId !== taskId || isStale(lock) || lock.status === 'writing';
      if (orphaned) {
        fs.unlinkSync(file);
        appendDebugLog('scene_lock_orphan_cleared', { file: f, chapter, oldTaskId: lock.taskId, newTaskId: taskId });
      }
    }
  }

  function acquireSceneLock(chapter, scene, taskId) {
    if (taskAborted) {
      throw new Error(`Pipeline 已中止，禁止启动 Scene ${scene}：${abortReason}`);
    }
    const file = sceneLockFile(paths, chapter, scene);
    const existing = readLock(file);
    if (existing?.status === 'writing' && existing.taskId !== taskId) {
      if (isStale(existing)) {
        appendDebugLog('scene_lock_stale', { chapter, scene, existing });
        clearSceneLock(chapter, scene);
      } else {
        const err = new Error(
          `Scene ${scene} 正在写入（${existing.taskId}），禁止重复启动。`
          + ` 请运行 inkos runtime debug 查看锁状态，或等待上次任务结束。`,
        );
        err.code = 'SCENE_LOCK_BLOCKED';
        err.details = { chapter, scene, existingTaskId: existing.taskId, taskId };
        appendDebugLog('scene_lock_blocked', { chapter, scene, existingTaskId: existing.taskId, taskId });
        throw err;
      }
    }
    writeJson(file, {
      chapter,
      scene,
      status: 'writing',
      startedAt: new Date().toISOString(),
      taskId,
    });
    const progressKey = `progress:${chapter}`;
    const prev = sceneProgress.get(progressKey) ?? 0;
    if (scene < prev) {
      const err = `Scene 状态回退被拒绝：${scene} < ${prev}`;
      appendDebugLog('scene_rollback_blocked', { chapter, scene, previous: prev });
      throw new Error(err);
    }
    sceneProgress.set(progressKey, Math.max(prev, scene));
    writeState({ chapter, currentScene: scene, phase: 'writing', taskId });
    appendDebugLog('scene_start', { chapter, scene, taskId });
    return true;
  }

  function releaseSceneLock(chapter, scene, status = 'done') {
    const file = sceneLockFile(paths, chapter, scene);
    if (exists(file)) {
      writeJson(file, {
        chapter,
        scene,
        status,
        finishedAt: new Date().toISOString(),
        taskId: currentTaskId,
      });
    }
    appendDebugLog(status === 'failed' ? 'scene_failed' : 'scene_complete', { chapter, scene, taskId: currentTaskId });
  }

  /**
   * Writer 超时：确认无返回 → 释放 lock → 允许重试（不自动 replan）
   */
  function handleWriterTimeout(chapter, scene, { llmReturned = false } = {}) {
    appendDebugLog('llm_timeout', { chapter, scene, llmReturned, taskId: currentTaskId });
    if (llmReturned) {
      return { action: 'noop', message: 'LLM 已返回，忽略超时' };
    }
    clearSceneLock(chapter, scene);
    abortTask(`Scene ${scene} Writer 超时`, { chapter, scene });
    return { action: 'aborted', message: abortReason };
  }

  function enrichEvent(event, payload = {}) {
    const seq = ++lastAcceptedSeq;
    const timestamp = new Date().toISOString();
    const scene = payload.scene?.index ?? payload.scene ?? payload.sceneIndex ?? null;
    const enriched = {
      event,
      chapter: payload.chapter ?? null,
      scene,
      taskId: payload.taskId || currentTaskId,
      timestamp,
      seq,
      at: timestamp,
      payload: { ...payload, taskId: payload.taskId || currentTaskId, timestamp, seq },
    };

    const failEvents = ['sceneRejected', 'sceneReviewFailed', 'decisionRejected', 'chapterReviewFailed',
      'criticRejected', 'validationRejected', 'reviewFailed'];
    if (event === 'pipelineFailed') {
      let reason = extractPipelineFailureReason(payload) || 'Pipeline 失败';
      if (isGenericAbortReason(reason) && abortReason && !isGenericAbortReason(abortReason)) {
        reason = abortReason;
      }
      enriched.payload = { ...enriched.payload, error: reason };
      abortTask(reason, { chapter: enriched.chapter, scene: enriched.scene });
      if (enriched.chapter != null && enriched.scene != null) {
        clearSceneLock(enriched.chapter, enriched.scene);
      }
    } else if (failEvents.includes(event)) {
      const reason = describeFailureReason(event, payload);
      abortTask(reason, { chapter: enriched.chapter, scene: enriched.scene });
      enriched.payload = { ...enriched.payload, error: reason };
      if (enriched.chapter != null && enriched.scene != null) {
        clearSceneLock(enriched.chapter, enriched.scene);
      }
    }

    if (event === 'sceneFinished') {
      const ch = enriched.chapter;
      const sc = enriched.scene;
      if (ch != null && sc != null) {
        const key = `${ch}:${sc}`;
        const prev = sceneProgress.get(`progress:${ch}`) ?? 0;
        if (sc >= prev) sceneProgress.set(`progress:${ch}`, sc);
        releaseSceneLock(ch, sc, 'done');
        writeState({ chapter: ch, currentScene: sc, phase: 'review' });
        appendDebugLog('review_complete', { chapter: ch, scene: sc });
      }
    }

    if (event === 'memoryUpdated') {
      appendDebugLog('memory_update', { chapter: enriched.chapter, scene: enriched.scene });
      writeState({ phase: 'memory' });
    }

    if (event === 'pipelineStage' && payload.stage === 'writer') {
      appendDebugLog(payload.status === 'done' ? 'llm_return' : 'llm_call', {
        chapter: payload.chapter,
        scene: payload.scene,
        detail: payload.detail,
      });
    }

    appendDebugLog('event', { event, chapter: enriched.chapter, scene: enriched.scene, seq });
    return enriched;
  }

  /**
   * 单调事件接受：禁止旧 scene / 旧 seq 覆盖新状态
   */
  function shouldAcceptEvent(enriched) {
    const state = readState();
    if (state.taskId && enriched.taskId && enriched.taskId !== state.taskId) {
      appendDebugLog('event_rejected_stale_task', {
        event: enriched.event,
        eventTaskId: enriched.taskId,
        currentTaskId: state.taskId,
      });
      return false;
    }
    const ch = enriched.chapter;
    const sc = enriched.scene;
    if (ch != null && sc != null && typeof sc === 'number') {
      const prev = sceneProgress.get(`progress:${ch}`) ?? 0;
      if (sc < prev && !['pipelineFailed', 'rollback'].includes(enriched.event)) {
        appendDebugLog('event_rejected_rollback', { scene: sc, previous: prev, event: enriched.event });
        return false;
      }
    }
    return true;
  }

  function completeTask(chapter, result = {}) {
    writeState({
      chapter,
      phase: result.pass === false ? 'failed' : 'completed',
      status: result.pass === false ? 'failed' : 'done',
      currentScene: null,
      taskId: currentTaskId,
      error: result.error || null,
    });
    releaseChapterRun(chapter);
    clearChapterSceneLocks(chapter);
    appendDebugLog('task_complete', { chapter, pass: result.pass, taskId: currentTaskId });
    currentTaskId = null;
  }

  function getDebugReport() {
    const state = readState();
    const locks = exists(paths.locks)
      ? fs.readdirSync(paths.locks).filter((f) => f.endsWith('.lock')).map((f) => ({
        file: f,
        ...readLock(path.join(paths.locks, f)),
      }))
      : [];
    const recentEvents = exists(paths.eventsLog)
      ? readText(paths.eventsLog).split('\n').filter(Boolean).slice(-10).map((l) => {
        try { return JSON.parse(l); } catch { return { raw: l }; }
      })
      : [];
    return {
      chapter: state.chapter ?? null,
      currentScene: state.currentScene ?? null,
      phase: state.phase ?? 'idle',
      taskId: state.taskId ?? currentTaskId,
      status: state.status ?? 'idle',
      locks,
      activeTask: currentTaskId,
      taskAborted,
      abortReason,
      recentEvents,
      state,
    };
  }

  return {
    paths,
    beginTask,
    completeTask,
    abortTask,
    isTaskAborted,
    isStaleTask,
    resetChapterForRerun,
    touchChapterRun,
    getAbortReason,
    getTaskId,
    acquireChapterRun,
    releaseChapterRun,
    acquireSceneLock,
    releaseSceneLock,
    clearSceneLock,
    handleWriterTimeout,
    enrichEvent,
    shouldAcceptEvent,
    readState,
    writeState,
    appendDebugLog,
    getDebugReport,
  };
}

/**
 * 禁止 Daemon 自动 retry / replan（稳定层策略：宁愿报错也不自动重写）
 */
export function applyDaemonExecutionGuard(daemon, guard) {
  const blocks = [
    'onSceneRejected',
    'onSceneReviewFailed',
    'onCriticRejected',
    'onValidationRejected',
    'onMetricsLow',
  ];

  for (const key of blocks) {
    if (daemon.handlers[key]) {
      daemon.handlers[key] = async (payload) => {
        guard.appendDebugLog('daemon_auto_retry_blocked', { handler: key, chapter: payload.chapter });
        return payload;
      };
    }
  }

  return daemon;
}

/** SSE / 事件缓冲：按 timestamp + seq 排序，过滤回退事件 */
export function sortAndFilterEvents(events, guard) {
  const sorted = [...events].sort((a, b) => {
    const ta = new Date(a.timestamp || a.at || 0).getTime();
    const tb = new Date(b.timestamp || b.at || 0).getTime();
    if (ta !== tb) return ta - tb;
    return (a.seq || 0) - (b.seq || 0);
  });
  if (!guard) return sorted;
  return sorted.filter((e) => guard.shouldAcceptEvent(e));
}

export function formatDebugReport(report) {
  const lines = [
    '═══ InkOS Runtime Debug ═══',
    `Chapter:     ${report.chapter ?? '—'}`,
    `Scene:       ${report.currentScene ?? '—'}`,
    `Phase:       ${report.phase ?? '—'}`,
    `Active Task: ${report.activeTask ?? report.taskId ?? '—'}`,
    `Status:      ${report.status ?? '—'}`,
    taskAbortedLine(report),
    '',
    '── Locks ──',
    ...(report.locks?.length
      ? report.locks.map((l) => `  ${l.file}: ${l.status} task=${l.taskId} scene=${l.scene ?? '—'}`)
      : ['  (none)']),
    '',
    '── Recent Events (last 10) ──',
    ...(report.recentEvents?.length
      ? report.recentEvents.map((e) => `  [${e.type || e.event}] ch=${e.chapter ?? '—'} sc=${e.scene ?? '—'} ${e.timestamp || ''}`)
      : ['  (none)']),
  ];
  return lines.join('\n');
}

function taskAbortedLine(report) {
  if (report.taskAborted) return `Aborted:     ${report.abortReason || 'yes'}`;
  return '';
}
