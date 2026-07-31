/**
 * EventBus — 事件总线
 */
const EVENTS = [
  'sceneFinished',
  'sceneReviewFailed',
  'sceneRejected',
  'chapterFinished',
  'chapterReviewFailed',
  'memoryUpdated',
  'reviewFailed',
  'decisionRejected',
  'metricsLow',
  'criticRejected',
  'validationRejected',
  'pipelineCompleted',
  'pipelineFailed',
  'nextChapterPlanned',
];

export class EventBus {
  constructor() {
    this.handlers = new Map();
    this.log = [];
    for (const e of EVENTS) this.handlers.set(e, []);
  }

  on(event, handler, { priority = 0 } = {}) {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event).push({ handler, priority });
    this.handlers.get(event).sort((a, b) => b.priority - a.priority);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    const list = this.handlers.get(event);
    if (!list) return;
    const idx = list.findIndex((h) => h.handler === handler);
    if (idx >= 0) list.splice(idx, 1);
  }

  async emit(event, payload = {}) {
    const entry = { event, at: new Date().toISOString(), payload };
    this.log.push(entry);
    const handlers = this.handlers.get(event) || [];
    const results = [];
    for (const { handler } of handlers) {
      try {
        const r = await handler({ ...payload, event, bus: this });
        results.push(r);
      } catch (err) {
        results.push({ error: err.message });
        await this.emit('pipelineFailed', { ...payload, cause: event, error: err.message });
      }
    }
    return { event, results };
  }

  getLog(since = 0) {
    return this.log.slice(since);
  }
}

export const RuntimeEvents = Object.fromEntries(EVENTS.map((e) => [e, e]));
