import fs from 'node:fs';
import path from 'node:path';

export function getStoryMemoryDir(bookDir, chapter) {
  return path.join(
    bookDir,
    'novel',
    '_system',
    'studio',
    'story-memory',
    `ch_${String(chapter).padStart(4, '0')}`,
  );
}

export function buildStoryMemoryReport({ chapter, scene, collected, analysis }) {
  return {
    version: 'story-memory-1',
    chapter,
    scene: { id: scene?.id, index: scene?.index },
    total: collected.total,
    categoryCounts: analysis.categoryCounts,
    openForeshadowCount: analysis.openForeshadowCount,
    recoveryRate: analysis.recoveryRate,
    longGoals: analysis.longGoals,
    characterArcs: analysis.characterArcs,
    openForeshadows: analysis.openForeshadows,
    generatedAt: new Date().toISOString(),
  };
}

export function persistStoryMemoryReport(bookDir, chapter, scene, report) {
  try {
    const dir = path.join(
      getStoryMemoryDir(bookDir, chapter),
      `scene_${String(scene?.index ?? 0).padStart(2, '0')}`,
    );
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'story_memory.json');
    fs.writeFileSync(file, JSON.stringify(report, null, 2), 'utf8');

    const rollupPath = path.join(getStoryMemoryDir(bookDir, chapter), 'rollup.json');
    fs.writeFileSync(rollupPath, JSON.stringify(report, null, 2), 'utf8');
    return file;
  } catch {
    return null;
  }
}

export function loadStoryMemoryRollup(bookDir, chapter) {
  const file = path.join(getStoryMemoryDir(bookDir, chapter), 'rollup.json');
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}
