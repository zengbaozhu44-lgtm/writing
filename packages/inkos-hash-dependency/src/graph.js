import fs from 'node:fs';
import path from 'node:path';
import { MODULE_KEYS } from './collect.js';
import { STATUS } from './labels.js';
import { getHashDependencyRoot } from './canon-state.js';
import { atomicWriteJson } from './atomic.js';

/** global = 全章失效；forward = 从触发 Scene 起失效 */
export const MODULE_SCENE_SCOPE = {
  world: 'global',
  storyDna: 'global',
  style: 'global',
  writing: 'global',
  character: 'forward',
  facts: 'forward',
  timeline: 'forward',
  relationship: 'forward',
  knowledge: 'forward',
  resources: 'forward',
};

export function chapterCacheRoot(bookDir, chapter, kind = 'brain') {
  const sub = kind === 'studio' ? 'compiled-prompts' : 'prompt-cache';
  const sys = kind === 'studio' ? 'studio' : 'brain';
  return path.join(
    bookDir,
    'novel',
    '_system',
    sys,
    sub,
    `ch_${String(chapter).padStart(4, '0')}`,
  );
}

export function sceneCacheDir(chapterRoot, sceneIndex) {
  return path.join(chapterRoot, `scene_${String(sceneIndex).padStart(2, '0')}`);
}

export function getAffectedSceneIndices(changedModules = [], sceneIndex = 1, sceneCount = 4) {
  if (!changedModules.length) return [];

  const global = changedModules.some((m) => MODULE_SCENE_SCOPE[m] === 'global');
  if (global) {
    return Array.from({ length: sceneCount }, (_, i) => i + 1);
  }

  const affected = new Set();
  for (const mod of changedModules) {
    if (MODULE_SCENE_SCOPE[mod] === 'forward') {
      for (let i = sceneIndex; i <= sceneCount; i += 1) affected.add(i);
    } else {
      for (let i = 1; i <= sceneCount; i += 1) affected.add(i);
    }
  }
  return [...affected].sort((a, b) => a - b);
}

function loadInvalidSceneState(chapterRoot) {
  const file = path.join(chapterRoot, 'invalid_scenes.json');
  if (!fs.existsSync(file)) return { scenes: [] };
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return { scenes: [] };
  }
}

function persistInvalidSceneState(chapterRoot, sceneIndices) {
  const file = path.join(chapterRoot, 'invalid_scenes.json');
  const prev = loadInvalidSceneState(chapterRoot);
  const scenes = [...new Set([...(prev.scenes || []), ...sceneIndices])].sort((a, b) => a - b);
  atomicWriteJson(file, { scenes, updatedAt: new Date().toISOString() });
  return scenes;
}

/**
 * 仅失效受影响 Scene 的 Prompt Cache（全局模块仍整章清除）
 */
export function invalidateAffectedPromptCaches(bookDir, chapter, {
  changedModules = [],
  sceneIndex = 1,
  sceneCount = 4,
} = {}) {
  if (!bookDir || !changedModules.length) {
    return { cleared: [], affectedScenes: [], globalChange: false };
  }

  const affected = getAffectedSceneIndices(changedModules, sceneIndex, sceneCount);
  const globalChange = changedModules.some((m) => MODULE_SCENE_SCOPE[m] === 'global');
  const cleared = [];

  for (const kind of ['brain', 'studio']) {
    const root = chapterCacheRoot(bookDir, chapter, kind);
    if (!fs.existsSync(root)) continue;

    if (globalChange || affected.length >= sceneCount) {
      fs.rmSync(root, { recursive: true, force: true });
      cleared.push(root);
      continue;
    }

    for (const idx of affected) {
      const sd = sceneCacheDir(root, idx);
      if (fs.existsSync(sd)) {
        fs.rmSync(sd, { recursive: true, force: true });
        cleared.push(sd);
      }
    }
    persistInvalidSceneState(root, affected);
  }

  return { cleared, affectedScenes: affected, globalChange };
}

function resolveSceneStatus({
  sceneIndex,
  affectedScenes,
  invalidScenes,
  regenerating,
  changedModules,
  cacheExists,
}) {
  if (regenerating && affectedScenes.includes(sceneIndex)) return STATUS.REGENERATING;
  if (invalidScenes.includes(sceneIndex)) return STATUS.INVALID;
  if (affectedScenes.includes(sceneIndex) && changedModules.length) return STATUS.MODIFIED;
  if (!cacheExists) return STATUS.INVALID;
  return STATUS.CACHED;
}

/**
 * Dependency Graph — Module → Scene 节点，仅受影响 Scene 标记失效
 */
export function buildDependencyGraph({
  chapter,
  sceneIndex = 1,
  sceneCount = 4,
  hashes = {},
  previousHashes = null,
  changed = [],
  invalidated = false,
  regenerating = false,
  bookDir = null,
  trigger = null,
} = {}) {
  const affectedScenes = getAffectedSceneIndices(changed, sceneIndex, sceneCount);
  const brainRoot = bookDir ? chapterCacheRoot(bookDir, chapter, 'brain') : null;
  const invalidState = brainRoot ? loadInvalidSceneState(brainRoot) : { scenes: [] };
  const invalidScenes = invalidated ? affectedScenes : (invalidState.scenes || []);

  const moduleNodes = MODULE_KEYS.map((key) => ({
    id: key,
    type: 'module',
    label: key,
    hash: hashes[key],
    previous: previousHashes?.[key] ?? null,
    changed: changed.includes(key),
    scope: MODULE_SCENE_SCOPE[key] || 'forward',
    status: changed.includes(key) ? STATUS.MODIFIED : STATUS.CACHED,
  }));

  const sceneNodes = [];
  for (let i = 1; i <= sceneCount; i += 1) {
    const sceneCache = brainRoot ? sceneCacheDir(brainRoot, i) : null;
    const cacheExists = sceneCache ? fs.existsSync(sceneCache) : false;
    sceneNodes.push({
      id: `scene_${i}`,
      type: 'scene',
      label: `Scene ${i}`,
      index: i,
      status: resolveSceneStatus({
        sceneIndex: i,
        affectedScenes,
        invalidScenes,
        regenerating,
        changedModules: changed,
        cacheExists,
      }),
      mustRecompile: invalidScenes.includes(i) || (changed.length > 0 && affectedScenes.includes(i)),
    });
  }

  const edges = [];
  for (const mod of MODULE_KEYS) {
    const scope = MODULE_SCENE_SCOPE[mod] || 'forward';
    for (const sn of sceneNodes) {
      const linked = scope === 'global' || sn.index >= sceneIndex;
      if (linked) edges.push({ from: mod, to: sn.id, type: 'depends' });
    }
  }
  for (const sn of sceneNodes) {
    edges.push({ from: sn.id, to: 'compiled-prompt', type: 'compile' });
  }

  const summary = [...moduleNodes, ...sceneNodes].reduce((acc, n) => {
    acc[n.status] = (acc[n.status] || 0) + 1;
    return acc;
  }, {});

  return {
    version: 'hash-dependency-graph-1',
    chapter,
    triggerScene: sceneIndex,
    sceneCount,
    affectedScenes,
    invalidScenes,
    moduleNodes,
    sceneNodes,
    edges,
    summary: {
      cached: summary[STATUS.CACHED] || 0,
      modified: summary[STATUS.MODIFIED] || 0,
      invalid: summary[STATUS.INVALID] || 0,
      regenerating: summary[STATUS.REGENERATING] || 0,
    },
    invalidated,
    regenerating,
    changed,
    trigger,
    updatedAt: new Date().toISOString(),
  };
}

export function persistDependencyGraph(bookDir, chapter, graph) {
  try {
    const dir = path.join(
      getHashDependencyRoot(bookDir),
      `ch_${String(chapter).padStart(4, '0')}`,
    );
    const file = path.join(dir, 'dependency_graph.json');
    atomicWriteJson(file, graph);
    return file;
  } catch {
    return null;
  }
}

export function loadDependencyGraph(bookDir, chapter) {
  const file = path.join(
    getHashDependencyRoot(bookDir),
    `ch_${String(chapter).padStart(4, '0')}`,
    'dependency_graph.json',
  );
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

export function listCachedChapters(bookDir) {
  const roots = [
    path.join(bookDir, 'novel', '_system', 'brain', 'prompt-cache'),
    path.join(bookDir, 'novel', '_system', 'studio', 'compiled-prompts'),
  ];
  const chapters = new Set();
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const name of fs.readdirSync(root)) {
      const m = name.match(/^ch_(\d+)$/);
      if (m) chapters.add(Number(m[1]));
    }
  }
  return [...chapters].sort((a, b) => a - b);
}

export function invalidateBookByCanonChange(bookDir, changedModules, { fromChapter = 1 } = {}) {
  const global = changedModules.some((m) => MODULE_SCENE_SCOPE[m] === 'global');
  const chapters = listCachedChapters(bookDir);
  const cleared = [];

  if (global) {
    for (const ch of chapters) {
      for (const kind of ['brain', 'studio']) {
        const root = chapterCacheRoot(bookDir, ch, kind);
        if (fs.existsSync(root)) {
          fs.rmSync(root, { recursive: true, force: true });
          cleared.push(root);
        }
      }
    }
    return { cleared, chapters, selective: false, globalChange: true };
  }

  for (const ch of chapters) {
    if (ch < fromChapter) continue;
    const r = invalidateAffectedPromptCaches(bookDir, ch, {
      changedModules,
      sceneIndex: 1,
      sceneCount: 99,
    });
    cleared.push(...r.cleared);
  }
  return { cleared, chapters, selective: true, globalChange: false };
}
