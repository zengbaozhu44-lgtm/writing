/**
 * @inkos/hash-dependency Semantic Hash Cache 单元验证
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  runHashDependencyCheck,
  isSemanticallyEquivalent,
  semanticSimilarity,
} from '../packages/inkos-hash-dependency/src/index.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-semantic-'));
const chapter = 1;
const scene = { index: 1, id: 'ch1_s1' };

const baseCtx = {
  worldBible: '未来都市，冷漠的秩序笼罩一切',
  writingBible: '硬切、身体先行',
  facts: [{ fact: '主角在 Day 2 保持冷静' }],
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

const sim = semanticSimilarity('冷漠', '更加冷漠');
if (sim < 0.5) {
  console.error('FAIL: similar phrases should score high', sim);
  process.exit(1);
}
if (!isSemanticallyEquivalent('未来都市，冷漠的秩序笼罩一切', '未来都市，更加冷漠的秩序笼罩一切', 'world')) {
  console.error('FAIL: world minor change should be equivalent');
  process.exit(1);
}

runHashDependencyCheck({
  bookDir: tmp,
  chapter,
  scene,
  ctx: baseCtx,
  storyDna,
  styleDna,
  persistState: true,
});

const minorCtx = {
  ...baseCtx,
  worldBible: '未来都市，更加冷漠的秩序笼罩一切',
};

const second = runHashDependencyCheck({
  bookDir: tmp,
  chapter,
  scene: { index: 2, id: 'ch1_s2' },
  ctx: minorCtx,
  storyDna,
  styleDna,
  persistState: false,
});

if (!second.semanticPreserved?.includes('world')) {
  console.error('FAIL: world should be semantic preserved', second);
  process.exit(1);
}
if (second.changed.includes('world')) {
  console.error('FAIL: world should not be in changed list');
  process.exit(1);
}
if (!second.valid) {
  console.error('FAIL: semantic equivalent should stay valid');
  process.exit(1);
}

const majorCtx = {
  ...baseCtx,
  worldBible: '完全不同的异星文明与殖民规则',
};

const third = runHashDependencyCheck({
  bookDir: tmp,
  chapter,
  scene: { index: 2, id: 'ch1_s2' },
  ctx: majorCtx,
  storyDna,
  styleDna,
  persistState: false,
});

if (!third.changed.includes('world')) {
  console.error('FAIL: major world change should invalidate');
  process.exit(1);
}

console.log('preserved', second.semanticPreserved.join(','));
console.log('OK');
