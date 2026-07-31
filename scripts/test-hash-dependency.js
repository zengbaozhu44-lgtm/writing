/**
 * @inkos/hash-dependency 单元验证
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  runHashDependencyCheck,
  invalidateAllPromptCaches,
  onCanonModified,
  MODULE_KEYS,
} from '../packages/inkos-hash-dependency/src/index.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-hash-dep-'));
const chapter = 1;
const scene = { index: 1, id: 'ch1_s1' };

const baseCtx = {
  bookDir: tmp,
  chapter,
  worldBible: '未来都市',
  writingBible: '硬切、身体先行',
  facts: [{ fact: '主角在 Day 2' }],
  timeline: [{ day: 2, chapter: 1, events: ['起床'] }],
  relationships: [{ from: '林远', to: '系统', trust: 3, hostility: 0 }],
  knowledge: { matrix: [['林远', '知道', '切片规则']] },
  resources: { by_character: { 林远: { credits: 100 } } },
  pov: '林远',
  present: ['林远'],
  characters: { 林远: { raw: '冷静、观察型主角' } },
};

const storyDna = { genre: '科幻日常', hook: '切片人生' };
const styleDna = { rhythm: '短句', atmosphere: '冷感' };

const first = runHashDependencyCheck({
  bookDir: tmp,
  chapter,
  scene,
  ctx: baseCtx,
  storyDna,
  styleDna,
});

if (!first.mustRecompile || first.valid) {
  console.error('FAIL: first run should mustRecompile and not valid');
  process.exit(1);
}
if (!first.reportPath?.endsWith('cache_dependency.json')) {
  console.error('FAIL: cache_dependency.json not written');
  process.exit(1);
}
for (const key of MODULE_KEYS) {
  if (!first.hashes[key]) {
    console.error('FAIL: missing module hash', key);
    process.exit(1);
  }
}

const cacheDir = path.join(tmp, 'novel', '_system', 'brain', 'prompt-cache', 'ch_0001', 'prompts');
fs.mkdirSync(cacheDir, { recursive: true });
fs.writeFileSync(path.join(cacheDir, 'stale.txt'), 'old prompt', 'utf8');

const second = runHashDependencyCheck({
  bookDir: tmp,
  chapter,
  scene: { index: 2, id: 'ch1_s2' },
  ctx: baseCtx,
  storyDna,
  styleDna,
});

if (!second.valid || second.mustRecompile) {
  console.error('FAIL: unchanged ctx should stay valid');
  process.exit(1);
}
if (!fs.existsSync(path.join(cacheDir, 'stale.txt'))) {
  console.error('FAIL: stable hash should not invalidate cache');
  process.exit(1);
}

const changedCtx = {
  ...baseCtx,
  worldBible: '未来都市 · 已修订世界观',
};
const third = runHashDependencyCheck({
  bookDir: tmp,
  chapter,
  scene: { index: 2, id: 'ch1_s2' },
  ctx: changedCtx,
  storyDna,
  styleDna,
  persistState: false,
});

if (!third.invalidated || !third.changed.includes('world')) {
  console.error('FAIL: world hash change should invalidate', third);
  process.exit(1);
}
if (fs.existsSync(path.join(cacheDir, 'stale.txt'))) {
  console.error('FAIL: cache should be cleared after world change');
  process.exit(1);
}

const fourth = runHashDependencyCheck({
  bookDir: tmp,
  chapter,
  scene: { index: 2, id: 'ch1_s2' },
  ctx: changedCtx,
  storyDna,
  styleDna,
  persistState: true,
});

if (!fourth.mustRecompile || !fourth.changed.includes('world')) {
  console.error('FAIL: first persist after world change should recompile', fourth);
  process.exit(1);
}

const fifth = runHashDependencyCheck({
  bookDir: tmp,
  chapter,
  scene: { index: 3, id: 'ch1_s3' },
  ctx: changedCtx,
  storyDna,
  styleDna,
  persistState: true,
});

if (!fifth.valid || fifth.mustRecompile) {
  console.error('FAIL: after persist, same ctx should be valid');
  process.exit(1);
}

const cleared = invalidateAllPromptCaches(tmp, chapter);
if (!Array.isArray(cleared.cleared)) {
  console.error('FAIL: invalidateAllPromptCaches');
  process.exit(1);
}

if (!fifth.tree || !fifth.tree.nodes?.length) {
  console.error('FAIL: dependency tree should be built');
  process.exit(1);
}
if (fifth.tree.summary?.cached == null) {
  console.error('FAIL: tree summary missing');
  process.exit(1);
}

const canonSync = onCanonModified({
  bookDir: tmp,
  chapter,
  ctx: changedCtx,
  storyDna,
  styleDna,
  triggerKey: 'world_bible',
});
if (!canonSync?.tree || !canonSync.hashes?.world) {
  console.error('FAIL: onCanonModified');
  process.exit(1);
}

console.log('changed', third.changed.join(','));
console.log('tree nodes', fifth.tree.nodes.length);
console.log('modules', MODULE_KEYS.length);
console.log('OK');
