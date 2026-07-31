import fs from 'node:fs';
import path from 'node:path';
import { getWriterOptimizerDir } from '@inkos/writer-optimizer';

function readTextIfExists(file) {
  if (!fs.existsSync(file)) return null;
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function readJsonIfExists(file) {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

export function readWriterOptimizerScene(bookDir, chapter, sceneIndex) {
  const dir = path.join(
    getWriterOptimizerDir(bookDir, chapter),
    `scene_${String(sceneIndex).padStart(2, '0')}`,
  );
  const report = readJsonIfExists(path.join(dir, 'optimizer_report.json'));
  const draft = readTextIfExists(path.join(dir, 'draft.md'));
  const polished = readTextIfExists(path.join(dir, 'polished_draft.md'));

  return {
    chapter,
    sceneIndex,
    dir,
    report,
    draft,
    polished: polished ?? draft,
    diffLines: report?.diffLines ?? [],
    scores: report?.scores ?? null,
    scoresBefore: report?.scoresBefore ?? null,
    total: report?.total ?? null,
    totalBefore: report?.totalBefore ?? null,
    polish: report?.polish ?? null,
    modules: report?.modules ?? report?.polish?.modules ?? null,
  };
}

export function readChapterWriterOptimizer(bookDir, chapter) {
  const root = getWriterOptimizerDir(bookDir, chapter);
  if (!fs.existsSync(root)) return [];
  const scenes = [];
  for (const name of fs.readdirSync(root)) {
    if (!name.startsWith('scene_')) continue;
    const m = name.match(/^scene_(\d+)$/);
    if (!m) continue;
    scenes.push(readWriterOptimizerScene(bookDir, chapter, Number(m[1])));
  }
  return scenes.sort((a, b) => a.sceneIndex - b.sceneIndex);
}
