import fs from 'node:fs';
import path from 'node:path';
import { computeModuleHashes } from './collect.js';
import { invalidateAllPromptCaches } from './engine.js';
import {
  loadCanonHashState,
  saveCanonHashState,
  modulesForCanonKey,
  getHashDependencyRoot,
} from './canon-state.js';
import { buildHashDependencyTree, persistDependencyTree } from './tree.js';
import { invalidateBookByCanonChange } from './graph.js';

function listChapterCacheDirs(bookDir) {
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

export function invalidateAllBookPromptCaches(bookDir) {
  const cleared = [];
  const chapters = listChapterCacheDirs(bookDir);
  if (!chapters.length) {
    const meta = getBookMetaChapter(bookDir);
    chapters.push(meta || 1);
  }
  for (const ch of chapters) {
    const r = invalidateAllPromptCaches(bookDir, ch);
    cleared.push(...r.cleared);
  }
  return { cleared, chapters };
}

function getBookMetaChapter(bookDir) {
  try {
    const metaPath = path.join(bookDir, 'book.json');
    if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      return meta.currentChapter || 1;
    }
  } catch { /* ignore */ }
  return 1;
}

/**
 * Canon 修改 → 自动更新 Hash + 依赖树 + Invalidate
 */
export function onCanonModified({
  bookDir,
  chapter = 1,
  ctx = {},
  storyDna = {},
  styleDna = {},
  trigger = null,
  triggerKey = null,
} = {}) {
  if (!bookDir) return null;

  const hashes = computeModuleHashes(ctx, { storyDna, styleDna });
  const previousCanon = loadCanonHashState(bookDir);

  const changed = [];
  if (previousCanon) {
    for (const key of Object.keys(hashes)) {
      if (previousCanon[key] && previousCanon[key] !== hashes[key]) {
        changed.push(key);
      }
    }
  } else {
    changed.push(...Object.keys(hashes));
  }

  const triggeredModules = triggerKey ? modulesForCanonKey(triggerKey) : [];
  const invalidated = changed.length > 0;
  let invalidateResult = { cleared: [], chapters: [], selective: false };

  if (invalidated) {
    const modules = changed.length ? changed : triggeredModules;
    invalidateResult = invalidateBookByCanonChange(bookDir, modules, { fromChapter: chapter });
  }

  saveCanonHashState(bookDir, hashes, {
    trigger,
    triggerKey,
    changed,
    invalidated,
    triggeredModules,
  });

  const tree = buildHashDependencyTree({
    bookDir,
    chapter,
    hashes,
    previousHashes: previousCanon,
    changed,
    invalidated,
    firstRun: !previousCanon,
    trigger: trigger || triggerKey,
  });

  const treePath = persistDependencyTree(bookDir, chapter, tree);

  return {
    hashes,
    changed,
    invalidated,
    invalidateResult,
    tree,
    treePath,
    triggeredModules,
  };
}
