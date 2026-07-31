import fs from 'node:fs';
import path from 'node:path';
import { computeModuleHashes, MODULE_KEYS, extractModuleTexts } from './collect.js';
import { hashCombined } from './hash.js';
import {
  buildCacheDependencyReport,
  persistCacheDependencyReport,
  loadPreviousHashes,
  loadPreviousModuleTexts,
  saveChapterHashState,
} from './report.js';
import {
  isSemanticallyEquivalent,
  computeSemanticHashes,
} from './semantic-hash.js';
import { loadCanonHashState } from './canon-state.js';
import { buildHashDependencyTree, persistDependencyTree } from './tree.js';
import {
  invalidateAffectedPromptCaches,
  buildDependencyGraph,
  persistDependencyGraph,
} from './graph.js';

function brainPromptCacheDir(bookDir, chapter) {
  return path.join(
    bookDir,
    'novel',
    '_system',
    'brain',
    'prompt-cache',
    `ch_${String(chapter).padStart(4, '0')}`,
  );
}

function studioPromptCacheDir(bookDir, chapter) {
  return path.join(
    bookDir,
    'novel',
    '_system',
    'studio',
    'compiled-prompts',
    `ch_${String(chapter).padStart(4, '0')}`,
  );
}

/** 清除 Brain Prompt Cache + Studio 编译缓存 — 禁止使用旧 Prompt */
export function invalidateAllPromptCaches(bookDir, chapter) {
  const cleared = [];

  for (const base of [brainPromptCacheDir(bookDir, chapter), studioPromptCacheDir(bookDir, chapter)]) {
    if (fs.existsSync(base)) {
      fs.rmSync(base, { recursive: true, force: true });
      cleared.push(base);
    }
  }

  return { cleared };
}

/**
 * Hash Dependency 检查 — Dependency Graph 仅失效受影响 Scene
 */
export function runHashDependencyCheck({
  bookDir,
  chapter,
  scene = {},
  ctx = {},
  intent = {},
  storyDna = {},
  styleDna = {},
  forceRecompile = false,
  persistState = true,
  regenerating = false,
  trigger = null,
}) {
  const hashes = computeModuleHashes(ctx, { storyDna, styleDna });
  const moduleTexts = extractModuleTexts(ctx, { storyDna, styleDna });
  const semanticHashes = computeSemanticHashes(moduleTexts);
  const previousHashes = bookDir ? loadPreviousHashes(bookDir, chapter) : null;
  const previousTexts = bookDir ? loadPreviousModuleTexts(bookDir, chapter) : null;
  const canonHashes = bookDir ? loadCanonHashState(bookDir) : null;
  const combinedHash = hashCombined(hashes);

  const sceneIndex = scene.index ?? 1;
  const sceneCount = scene.totalScenes || intent?.scenes?.length || 4;

  const changed = [];
  const semanticPreserved = [];
  if (previousHashes) {
    for (const key of MODULE_KEYS) {
      if (previousHashes[key] && previousHashes[key] !== hashes[key]) {
        const prevText = previousTexts?.[key] ?? '';
        const nextText = moduleTexts[key] ?? '';
        if (isSemanticallyEquivalent(prevText, nextText, key)) {
          hashes[key] = previousHashes[key];
          semanticPreserved.push(key);
          continue;
        }
        changed.push(key);
      }
    }
  }

  const firstRun = !previousHashes;
  const mustRecompile = forceRecompile || firstRun || changed.length > 0;
  let invalidated = false;
  let invalidateResult = { cleared: [], affectedScenes: [], globalChange: false };

  if (changed.length > 0 && bookDir) {
    invalidateResult = invalidateAffectedPromptCaches(bookDir, chapter, {
      changedModules: changed,
      sceneIndex,
      sceneCount,
    });
    invalidated = true;
  }

  if (mustRecompile && persistState) {
    saveChapterHashState(bookDir, chapter, hashes, {
      moduleTexts,
      semanticHashes,
      semanticPreserved,
    });
  }

  const report = buildCacheDependencyReport({
    chapter,
    scene,
    hashes,
    previousHashes,
    changed,
    invalidated,
    mustRecompile,
    combinedHash,
    affectedScenes: invalidateResult.affectedScenes,
    semanticPreserved,
  });

  const reportPath = bookDir
    ? persistCacheDependencyReport(bookDir, chapter, scene, report)
    : null;

  const graph = buildDependencyGraph({
    bookDir,
    chapter,
    sceneIndex,
    sceneCount,
    hashes,
    previousHashes,
    changed,
    invalidated,
    regenerating,
    trigger,
  });

  const tree = buildHashDependencyTree({
    bookDir,
    chapter,
    hashes,
    previousHashes,
    canonHashes,
    changed,
    invalidated,
    regenerating,
    firstRun,
    trigger,
    graph,
  });

  const treePath = bookDir ? persistDependencyTree(bookDir, chapter, tree) : null;
  const graphPath = bookDir ? persistDependencyGraph(bookDir, chapter, graph) : null;

  return {
    valid: changed.length === 0 && !firstRun,
    mustRecompile,
    invalidated,
    changed,
    hashes,
    combinedHash,
    report,
    reportPath,
    tree,
    treePath,
    graph,
    graphPath,
    affectedScenes: invalidateResult.affectedScenes,
    semanticPreserved,
  };
}
