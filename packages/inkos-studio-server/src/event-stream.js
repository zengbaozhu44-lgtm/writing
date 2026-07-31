/**
 * Event Stream — Studio 唯一事件来源：Runtime Event Bus
 * 禁止：监听文件系统变化驱动 UI
 */
import { sortAndFilterEvents } from '../../inkos-runtime/src/index.js';
import { toUiEvent } from './compatibility.js';
import { formatStreamPayload } from './runtime-ui-map.js';
import { getBookExecutionGuard } from './execution-guard-store.js';
import { taskManager } from './task-manager.js';

const EVENT_LABELS = {
  sceneFinished: 'Scene Finished',
  sceneReviewFailed: 'Scene Review Failed',
  sceneRejected: 'Scene Rejected',
  chapterFinished: 'Chapter Finished',
  chapterReviewFailed: 'Chapter Review Failed',
  memoryUpdated: 'Memory Updated',
  pipelineCompleted: 'Pipeline Completed',
  pipelineFailed: 'Pipeline Failed',
  nextChapterPlanned: 'Next Chapter Planned',
  metricsLow: 'Metrics Low',
  criticRejected: 'Critic Rejected',
  decisionRejected: 'Decision Rejected',
  validationRejected: 'Validation Rejected',
  reviewFailed: 'Review Failed',
  pipelineStage: 'Pipeline Stage',
  pipelineHeartbeat: 'Pipeline Heartbeat',
};

export function formatRuntimeEvent(e) {
  const formatted = {
    ...e,
    label: EVENT_LABELS[e.event] || e.event,
    time: e.at ? new Date(e.at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '',
  };
  const ui = toUiEvent(formatted);
  return { ...ui, stream: formatStreamPayload(ui) };
}

/** @type {Map<string, Set<import('http').ServerResponse>>} */
const sseClients = new Map();

/** @type {Map<string, { bookId: string; buffer: unknown[] }>} */
const eventRegistry = new Map();

export function registerEventBuffer(bookDir, bookId, buffer) {
  eventRegistry.set(bookDir, { bookId, buffer });
}

function buildEventEntry(bookDir, event, payload = {}) {
  const guard = getBookExecutionGuard(bookDir);
  const enriched = guard.enrichEvent(event, payload);
  if (!guard.shouldAcceptEvent(enriched)) return null;
  return {
    event: enriched.event,
    chapter: enriched.chapter,
    scene: enriched.scene,
    taskId: enriched.taskId,
    timestamp: enriched.timestamp,
    seq: enriched.seq,
    at: enriched.timestamp,
    error: enriched.payload?.error || null,
    payload: enriched.payload,
  };
}

/** Studio 层直接推送 Runtime 进度（不依赖 Runtime 内部 emit 列表） */
export function studioEmitRuntimeEvent(bookDir, bookId, event, payload = {}) {
  const entry = buildEventEntry(bookDir, event, payload);
  if (!entry) return null;
  const reg = eventRegistry.get(bookDir);
  if (reg?.buffer) {
    reg.buffer.push(entry);
    if (reg.buffer.length > 500) reg.buffer.shift();
  }
  broadcastEvent(bookId || reg?.bookId, entry);
  return entry;
}

export function getEventBufferSlice(bookDir, since = 0) {
  const reg = eventRegistry.get(bookDir);
  const guard = getBookExecutionGuard(bookDir);
  const buf = reg?.buffer || [];
  return sortAndFilterEvents(buf.slice(since), guard);
}

export function subscribeSSE(bookId, res) {
  if (!sseClients.has(bookId)) sseClients.set(bookId, new Set());
  sseClients.get(bookId).add(res);
  res.on('close', () => sseClients.get(bookId)?.delete(res));
}

export function broadcastEvent(bookId, event) {
  const clients = sseClients.get(bookId);
  if (clients?.size) {
    const payload = formatRuntimeEvent(event);
    const data = `data: ${JSON.stringify(payload)}\n\n`;
    for (const client of clients) {
      try { client.write(data); } catch { /* closed */ }
    }
  }
  // 同步挂到异步任务 SSE（解耦 HTTP 后的进度通道）
  try {
    taskManager.pushBookEvent(bookId, event);
  } catch { /* ignore */ }
}

export function wireEventBroadcast(bookDir, bookId, daemon, eventBuffer) {
  registerEventBuffer(bookDir, bookId, eventBuffer);
  const origEmit = daemon.bus.emit.bind(daemon.bus);
  daemon.bus.emit = (event, payload) => {
    studioEmitRuntimeEvent(bookDir, bookId, event, payload);
    return origEmit(event, payload);
  };
}
