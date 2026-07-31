import { persistSceneMetrics, loadChapterMetrics, aggregateSceneMetrics, normalizeSceneMetrics } from './store.js';

export function recordScenePromptMetrics(bookDir, chapter, scene, data) {
  return persistSceneMetrics(bookDir, chapter, scene, data);
}

export { loadChapterMetrics, aggregateSceneMetrics, normalizeSceneMetrics } from './store.js';
export { getPromptMetricsDir } from './store.js';
