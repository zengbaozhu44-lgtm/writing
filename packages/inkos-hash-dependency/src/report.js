import fs from 'node:fs';
import path from 'node:path';
import { hashCombined } from './hash.js';
import { MODULE_KEYS } from './collect.js';

export function getHashDependencyDir(bookDir, chapter) {
  return path.join(
    bookDir,
    'novel',
    '_system',
    'studio',
    'hash-dependency',
    `ch_${String(chapter).padStart(4, '0')}`,
  );
}

export function buildCacheDependencyReport({
  chapter,
  scene,
  hashes,
  previousHashes,
  changed,
  invalidated,
  mustRecompile,
  combinedHash,
  affectedScenes = [],
  semanticPreserved = [],
}) {
  return {
    version: 'hash-dependency-2',
    chapter,
    scene: {
      id: scene?.id,
      index: scene?.index,
    },
    modules: MODULE_KEYS.reduce((acc, key) => {
      acc[key] = {
        hash: hashes[key],
        previous: previousHashes?.[key] ?? null,
        changed: changed.includes(key),
        semanticPreserved: semanticPreserved.includes(key),
      };
      return acc;
    }, {}),
    combinedHash,
    previousCombinedHash: previousHashes ? hashCombined(previousHashes) : null,
    changed,
    semanticPreserved,
    affectedScenes,
    invalidated,
    mustRecompile,
    policy: 'Semantic Hash Cache · 语义等价保留 Cache；实质变化才 Invalidate',
    generatedAt: new Date().toISOString(),
  };
}

export function persistCacheDependencyReport(bookDir, chapter, scene, report) {
  try {
    const dir = path.join(
      getHashDependencyDir(bookDir, chapter),
      `scene_${String(scene?.index ?? 0).padStart(2, '0')}`,
    );
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'cache_dependency.json');
    fs.writeFileSync(file, JSON.stringify(report, null, 2), 'utf8');
    return file;
  } catch {
    return null;
  }
}

export function loadPreviousHashes(bookDir, chapter) {
  const statePath = path.join(getHashDependencyDir(bookDir, chapter), 'state.json');
  if (!fs.existsSync(statePath)) return null;
  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    return state.hashes || null;
  } catch {
    return null;
  }
}

export function loadPreviousModuleTexts(bookDir, chapter) {
  const statePath = path.join(getHashDependencyDir(bookDir, chapter), 'state.json');
  if (!fs.existsSync(statePath)) return null;
  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    return state.moduleTexts || null;
  } catch {
    return null;
  }
}

export function saveChapterHashState(bookDir, chapter, hashes, meta = {}) {
  const dir = getHashDependencyDir(bookDir, chapter);
  fs.mkdirSync(dir, { recursive: true });
  const prevPath = path.join(dir, 'state.json');
  let prev = {};
  if (fs.existsSync(prevPath)) {
    try { prev = JSON.parse(fs.readFileSync(prevPath, 'utf8')); } catch { /* fresh */ }
  }
  fs.writeFileSync(
    path.join(dir, 'state.json'),
    JSON.stringify({
      hashes,
      moduleTexts: meta.moduleTexts ?? prev.moduleTexts ?? null,
      semanticHashes: meta.semanticHashes ?? prev.semanticHashes ?? null,
      semanticPreserved: meta.semanticPreserved ?? prev.semanticPreserved ?? [],
      updatedAt: new Date().toISOString(),
    }, null, 2),
    'utf8',
  );
}
