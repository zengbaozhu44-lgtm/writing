import fs from 'node:fs';
import path from 'node:path';
import {
  collectStoryMemory,
  buildStoryMemoryMetrics,
  buildStoryMemoryBlock,
  MEMORY_CATEGORIES,
} from './collect.js';
import {
  buildStoryMemoryHints,
  buildStoryMemoryPlannerBlock,
  buildStoryMemoryWriterBlock,
} from './hints.js';

/** 原子写 — 并发生成时避免 rollup/dashboard 半截 JSON */
function atomicWriteJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  try {
    fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    fs.renameSync(tmp, filePath);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
    throw err;
  }
}

export function getStoryMemoryDir(bookDir) {
  return path.join(bookDir, 'novel', '_system', 'studio', 'story-memory');
}

export function buildStoryMemoryReport({ chapter, scene, memory, metrics, hints }) {
  return {
    version: 'story-memory-2',
    chapter,
    scene: { id: scene?.id, index: scene?.index },
    categories: MEMORY_CATEGORIES,
    memory,
    metrics,
    hints,
    generatedAt: new Date().toISOString(),
  };
}

export function persistStoryMemoryReport(bookDir, chapter, scene, report) {
  try {
    const dir = path.join(
      getStoryMemoryDir(bookDir),
      `ch_${String(chapter).padStart(4, '0')}`,
      `scene_${String(scene?.index ?? 0).padStart(2, '0')}`,
    );
    const file = path.join(dir, 'story_memory.json');
    atomicWriteJson(file, report);

    const rollupPath = path.join(getStoryMemoryDir(bookDir), `ch_${String(chapter).padStart(4, '0')}`, 'rollup.json');
    let rollup = { chapter, scenes: [], metrics: null, hints: [], dashboard: null, updatedAt: null };
    if (fs.existsSync(rollupPath)) {
      try {
        rollup = JSON.parse(fs.readFileSync(rollupPath, 'utf8'));
      } catch { /* 并发半截文件 → 从空状态重建 */ }
    }
    const idx = rollup.scenes.findIndex((s) => s.index === scene?.index);
    const entry = { index: scene?.index, metrics: report.metrics, hints: report.hints };
    if (idx >= 0) rollup.scenes[idx] = entry;
    else rollup.scenes.push(entry);
    rollup.metrics = report.metrics;
    rollup.hints = report.hints;
    rollup.dashboard = buildStoryMemoryDashboard(report.metrics, report.memory);
    rollup.updatedAt = new Date().toISOString();
    atomicWriteJson(rollupPath, rollup);

    const bookRollupPath = path.join(getStoryMemoryDir(bookDir), 'dashboard.json');
    atomicWriteJson(bookRollupPath, {
      chapter,
      dashboard: rollup.dashboard,
      hints: report.hints,
      updatedAt: rollup.updatedAt,
    });

    return file;
  } catch {
    return null;
  }
}

export function buildStoryMemoryDashboard(metrics = {}, memory = {}) {
  return {
    openForeshadow: metrics.openForeshadow || [],
    resolvedForeshadow: metrics.resolvedForeshadow || [],
    openForeshadowCount: metrics.openForeshadowCount ?? 0,
    resolvedForeshadowCount: metrics.resolvedForeshadowCount ?? 0,
    recoveryRate: metrics.recoveryRate ?? null,
    callbackRecoveryRate: metrics.callbackRecoveryRate ?? null,
    mainThreadProgress: metrics.mainThreadProgress ?? null,
    characterArcCompletion: metrics.characterArcCompletion ?? null,
    openPromises: metrics.openPromises ?? 0,
    openMysteries: metrics.openMysteries ?? 0,
    longGoals: metrics.longGoals || [],
    characterArcs: metrics.characterArcs || [],
    theme: metrics.theme || null,
    callbacks: memory.callback || [],
  };
}

export function loadChapterStoryMemory(bookDir, chapter) {
  const rollupPath = path.join(getStoryMemoryDir(bookDir), `ch_${String(chapter).padStart(4, '0')}`, 'rollup.json');
  if (!fs.existsSync(rollupPath)) {
    const dashPath = path.join(getStoryMemoryDir(bookDir), 'dashboard.json');
    if (fs.existsSync(dashPath)) {
      try {
        return JSON.parse(fs.readFileSync(dashPath, 'utf8'));
      } catch { /* fall through */ }
    }
    return { chapter, scenes: [], metrics: null, dashboard: null, hints: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(rollupPath, 'utf8'));
  } catch {
    return { chapter, scenes: [], metrics: null, dashboard: null, hints: [] };
  }
}

export function runStoryMemory({
  bookDir = null,
  chapter,
  scene = {},
  ctx = {},
  storyDna = {},
}) {
  const memory = collectStoryMemory(ctx, storyDna, { chapter });
  const metrics = buildStoryMemoryMetrics(memory, { chapter });
  const hints = buildStoryMemoryHints(memory, metrics, { chapter });
  const block = buildStoryMemoryBlock(memory, metrics, { sceneIndex: scene?.index });
  const plannerBlock = buildStoryMemoryPlannerBlock(hints, metrics, { chapter });
  const writerBlock = buildStoryMemoryWriterBlock(hints, metrics, memory);
  const dashboard = buildStoryMemoryDashboard(metrics, memory);
  const report = buildStoryMemoryReport({ chapter, scene, memory, metrics, hints });
  const reportPath = bookDir ? persistStoryMemoryReport(bookDir, chapter, scene, report) : null;

  return {
    memory,
    metrics,
    hints,
    dashboard,
    block,
    plannerBlock,
    writerBlock,
    report,
    reportPath,
  };
}

export {
  collectStoryMemory,
  buildStoryMemoryMetrics,
  buildStoryMemoryBlock,
  MEMORY_CATEGORIES,
};
export {
  buildStoryMemoryHints,
  buildStoryMemoryPlannerBlock,
  buildStoryMemoryWriterBlock,
};
