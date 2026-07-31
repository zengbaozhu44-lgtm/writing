import fs from 'node:fs';
import path from 'node:path';

export function getStoryThreadDir(bookDir) {
  return path.join(bookDir, 'novel', '_system', 'studio', 'story-thread');
}

export function getStoryThreadStatePath(bookDir) {
  return path.join(getStoryThreadDir(bookDir), 'state.json');
}

export function loadStoryThreadState(bookDir) {
  const p = getStoryThreadStatePath(bookDir);
  try {
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch { /* ignore */ }
  return {
    version: 1,
    recentScenes: [],
    consecutiveLowMain: 0,
    lastReplanAt: null,
  };
}

export function saveStoryThreadState(bookDir, state) {
  const dir = getStoryThreadDir(bookDir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(getStoryThreadStatePath(bookDir), JSON.stringify({
    ...state,
    updatedAt: new Date().toISOString(),
  }, null, 2), 'utf8');
}

export function getStoryProgressReportDir(bookDir, chapter) {
  return path.join(getStoryThreadDir(bookDir), `ch_${String(chapter).padStart(4, '0')}`);
}

export function persistStoryProgressReport(bookDir, chapter, scene, report) {
  try {
    const dir = path.join(
      getStoryProgressReportDir(bookDir, chapter),
      `scene_${String(scene?.index ?? 0).padStart(2, '0')}`,
    );
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'story_progress.json');
    fs.writeFileSync(file, JSON.stringify(report, null, 2), 'utf8');
    return file;
  } catch {
    return null;
  }
}
