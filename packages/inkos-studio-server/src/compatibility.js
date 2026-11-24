/**
 * Compatibility Layer — API 版本适配
 * Runtime 2.x 升级时，在此做响应映射，Studio UI 无需修改
 */
import { envelope, API_VERSION, getRuntimeVersion } from './version.js';

/** Runtime 2.0 → Studio API 1.0 响应规范化 */
export function normalizeDashboard(raw) {
  return envelope({
    book: raw.book,
    chapter: raw.chapter,
    runtime: raw.runtime,
    health: {
      overall: raw.health?.overall ?? raw.healthRaw?.overallScore ?? 0,
      source: 'live:metrics_dashboard',
      raw: raw.healthRaw ?? null,
    },
    scenes: raw.scenes ?? [],
    plan: raw.plan,
    run: raw.run,
    brainStages: raw.brainStages ?? [],
    state: raw.state ?? raw.currentState ?? {},
    world: raw.world ?? raw.stateBoard ?? [],
    events: raw.events ?? [],
    adaptive: raw.adaptive,
    adaptiveHistory: raw.adaptiveHistory,
    console: raw.console ?? [],
    promptAnalytics: raw.promptAnalytics ?? null,
  });
}

export function normalizeScenes(chapter, data) {
  return envelope({
    chapter,
    scenes: data.scenes ?? [],
    updatedAt: data.updatedAt,
  });
}

export function normalizePlanner(chapter, plan) {
  return envelope({
    chapter,
    ...plan,
  });
}

export function normalizeHealth(healthData) {
  // P3.1b：退役 story_health.json 后，入参为实时计算的 health 对象（无 current/history 壳）；
  // 兼容旧持久化形状（{current, history}）与实时形状两种。
  return envelope({
    source: 'live:metrics_dashboard',
    current: healthData?.current ?? healthData ?? null,
    history: healthData?.history ?? [],
  });
}

export function normalizeEvents(events) {
  return envelope({ events });
}

export function normalizeMemory(snapshots, diff = null) {
  const result = envelope({ snapshots });
  if (diff) result.diff = diff;
  return result;
}

export function normalizeVersion() {
  return {
    apiVersion: API_VERSION,
    runtimeVersion: getRuntimeVersion(),
    runtimeLabel: `Runtime ${getRuntimeVersion().split('.')[0]}.${getRuntimeVersion().split('.')[1]}`,
    locked: true,
    schemas: [
      'dashboard.schema.json',
      'scene.schema.json',
      'planner.schema.json',
      'health.schema.json',
      'events.schema.json',
      'memory.schema.json',
    ],
  };
}

/** UI 事件名映射 — Runtime Event Bus → Studio UI */
export const UI_EVENT_MAP = {
  sceneFinished: 'sceneChanged',
  sceneReviewFailed: 'sceneChanged',
  sceneRejected: 'sceneChanged',
  chapterFinished: 'chapterFinished',
  chapterReviewFailed: 'chapterFinished',
  memoryUpdated: 'memoryUpdated',
  pipelineCompleted: 'healthUpdated',
  pipelineFailed: 'runtimeStopped',
  nextChapterPlanned: 'plannerUpdated',
  reviewFailed: 'runtimeStopped',
  decisionRejected: 'runtimeStopped',
  metricsLow: 'healthUpdated',
  criticRejected: 'runtimeStopped',
  validationRejected: 'runtimeStopped',
};

export function toUiEvent(runtimeEvent) {
  return {
    ...runtimeEvent,
    uiEvent: UI_EVENT_MAP[runtimeEvent.event] || runtimeEvent.event,
  };
}
