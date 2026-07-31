import { loadChapterStoryMemory, buildStoryMemoryDashboard } from '@inkos/story-memory';

export function readStoryMemory(bookDir, chapter) {
  const rollup = loadChapterStoryMemory(bookDir, chapter);
  const dashboard = rollup.dashboard || buildStoryMemoryDashboard(rollup.metrics || {}, {});
  return {
    chapter,
    metrics: rollup.metrics,
    hints: rollup.hints || [],
    dashboard,
    scenes: rollup.scenes || [],
    updatedAt: rollup.updatedAt,
  };
}
