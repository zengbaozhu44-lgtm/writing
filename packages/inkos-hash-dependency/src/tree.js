import fs from 'node:fs';
import path from 'node:path';
import { MODULE_KEYS } from './collect.js';
import { hashCombined } from './hash.js';
import { MODULE_LABELS, MODULE_CANON_SOURCE, STATUS } from './labels.js';
import { getHashDependencyRoot } from './canon-state.js';
import { atomicWriteJson } from './atomic.js';

function promptCacheExists(bookDir, chapter) {
  const ch = `ch_${String(chapter).padStart(4, '0')}`;
  const brain = path.join(bookDir, 'novel', '_system', 'brain', 'prompt-cache', ch);
  const studio = path.join(bookDir, 'novel', '_system', 'studio', 'compiled-prompts', ch);
  return {
    brain: fs.existsSync(brain),
    studio: fs.existsSync(studio),
    brainPath: brain,
    studioPath: studio,
    exists: fs.existsSync(brain) || fs.existsSync(studio),
  };
}

function resolveModuleStatus({
  isChanged,
  hash,
  previous,
  invalidated,
  regenerating,
  cacheExists,
  firstRun,
}) {
  if (regenerating && isChanged) return STATUS.REGENERATING;
  if (isChanged) {
    if (invalidated || !cacheExists) return STATUS.INVALID;
    return STATUS.MODIFIED;
  }
  if (firstRun) return STATUS.MODIFIED;
  if (!cacheExists) return STATUS.INVALID;
  if (previous && previous === hash) return STATUS.CACHED;
  return STATUS.CACHED;
}

/**
 * 构建 Hash Dependency Tree — Modified / Cached / Invalid / Regenerating
 */
export function buildHashDependencyTree({
  bookDir,
  chapter,
  hashes,
  previousHashes = null,
  canonHashes = null,
  changed = [],
  invalidated = false,
  regenerating = false,
  firstRun = false,
  trigger = null,
  graph = null,
} = {}) {
  const cache = bookDir ? promptCacheExists(bookDir, chapter) : { exists: false, brain: false, studio: false };
  const baseline = previousHashes || canonHashes || null;

  const nodes = MODULE_KEYS.map((key) => {
    const prev = previousHashes?.[key] ?? canonHashes?.[key] ?? null;
    const nodeChanged = changed.includes(key) || (prev && hashes[key] !== prev);

    const status = resolveModuleStatus({
      isChanged: nodeChanged,
      hash: hashes[key],
      previous: prev,
      invalidated,
      regenerating,
      cacheExists: cache.exists,
      firstRun,
    });

    return {
      id: key,
      label: MODULE_LABELS[key] || key,
      hash: hashes[key],
      previous: prev,
      changed: nodeChanged,
      status,
      canonSource: MODULE_CANON_SOURCE[key],
      dependsOn: ['prompt-cache'],
    };
  });

  let promptCacheStatus = STATUS.CACHED;
  if (regenerating) promptCacheStatus = STATUS.REGENERATING;
  else if (invalidated || changed.length > 0) promptCacheStatus = STATUS.INVALID;
  else if (!cache.exists && !firstRun) promptCacheStatus = STATUS.INVALID;
  else if (firstRun) promptCacheStatus = STATUS.MODIFIED;

  const summary = nodes.reduce((acc, n) => {
    acc[n.status] = (acc[n.status] || 0) + 1;
    return acc;
  }, {});
  summary[promptCacheStatus] = (summary[promptCacheStatus] || 0) + 1;

  return {
    version: 'hash-dependency-tree-2',
    chapter,
    combinedHash: hashCombined(hashes),
    previousCombinedHash: baseline ? hashCombined(baseline) : null,
    trigger,
    promptCache: {
      status: promptCacheStatus,
      brain: cache.brain,
      studio: cache.studio,
      paths: {
        brain: cache.brainPath,
        studio: cache.studioPath,
      },
    },
    nodes,
    sceneNodes: graph?.sceneNodes || [],
    graph: graph
      ? {
        affectedScenes: graph.affectedScenes,
        sceneCount: graph.sceneCount,
        triggerScene: graph.triggerScene,
        summary: graph.summary,
      }
      : null,
    edges: [
      ...MODULE_KEYS.map((key) => ({ from: key, to: 'prompt-cache', type: 'hash' })),
      ...(graph?.edges || []),
      { from: 'prompt-cache', to: 'compiled-prompt', type: 'compile' },
    ],
    summary: {
      cached: summary[STATUS.CACHED] || 0,
      modified: summary[STATUS.MODIFIED] || 0,
      invalid: summary[STATUS.INVALID] || 0,
      regenerating: summary[STATUS.REGENERATING] || 0,
    },
    invalidated,
    regenerating,
    changed,
    updatedAt: new Date().toISOString(),
  };
}

export function persistDependencyTree(bookDir, chapter, tree) {
  try {
    const dir = path.join(
      getHashDependencyRoot(bookDir),
      `ch_${String(chapter).padStart(4, '0')}`,
    );
    const file = path.join(dir, 'dependency_tree.json');
    atomicWriteJson(file, tree);

    const rootFile = path.join(getHashDependencyRoot(bookDir), 'dependency_tree.json');
    atomicWriteJson(rootFile, { ...tree, latestChapter: chapter });
    return file;
  } catch {
    return null;
  }
}

export function loadDependencyTree(bookDir, chapter) {
  const file = path.join(
    getHashDependencyRoot(bookDir),
    `ch_${String(chapter).padStart(4, '0')}`,
    'dependency_tree.json',
  );
  if (fs.existsSync(file)) {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch { /* fall through */ }
  }
  const rootFile = path.join(getHashDependencyRoot(bookDir), 'dependency_tree.json');
  if (fs.existsSync(rootFile)) {
    try {
      return JSON.parse(fs.readFileSync(rootFile, 'utf8'));
    } catch { /* skip */ }
  }
  return null;
}
