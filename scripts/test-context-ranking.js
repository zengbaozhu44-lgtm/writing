/**
 * @inkos/context-ranking 单元验证
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  runContextRanking,
  rankContextForCompiler,
  RANKABLE_SOURCES,
} from '../packages/inkos-context-ranking/src/index.js';
import { allocateDynamicBudget } from '../packages/inkos-dynamic-budget/src/index.js';

const ctx = {
  chapter: 3,
  pov: '林晓',
  present: ['林晓', '张北'],
  facts: [
    { fact: '第2章完成：林晓为女儿取药付出信用代价', immutable: true, chapter: 2 },
    { fact: '张北在清晨目睹数字隔离户老人困境', chapter: 1 },
    { fact: '无关背景：某城市百年史', chapter: 0 },
    { fact: '另一无关事实：天气很好', chapter: 0 },
    { fact: '林晓维修任务与药房冲突升级', chapter: 2 },
  ],
  timeline: [
    { day: 1, chapter: 1, events: ['张北失去对数字隔离户的远程访问权限'] },
    { day: 2, chapter: 2, events: ['林晓在药房冲突中暴露信用代价并失去配额'] },
    { day: 3, chapter: 3, events: ['林晓发现日志后系统锁定维修通道'] },
  ],
  knowledge: {
    matrix: [
      { info: '碳配额上调计划', 林晓: 'unknown', 张北: 'rumor' },
      { info: '无关政策', 林晓: 'known' },
    ],
  },
  relationships: [
    { from: '林晓', to: '张北', trust: 2, hostility: 1 },
    { from: '林晓', to: '系统', trust: 1, hostility: 4 },
  ],
  resources: {
    by_character: {
      林晓: { credit: 45, cash: 1200 },
    },
  },
};

const scene = {
  index: 1,
  id: 'ch3_s1',
  goal: '林晓发现机器人日志中的传单计划',
  conflict: '系统追踪维修记录',
  entities: ['林晓'],
};

const intent = {
  mainGoal: '林晓在维修任务中发现反抗传单线索',
  pov: '林晓',
};

const storyDna = { core_hook: '个体在AI缝隙生存', main_conflict: '系统与人性' };
const { allocation } = allocateDynamicBudget(scene, intent);
const budget = Object.fromEntries(
  Object.entries(allocation).map(([k, v]) => [k, v.tokens]),
);

const ranked = rankContextForCompiler(ctx, scene, intent, { budget, storyDna });

console.log('sources', RANKABLE_SOURCES.join(','));
console.log('facts', ranked.bySource.facts.selectedCount, '/', ranked.bySource.facts.totalCandidates);
console.log('timeline', ranked.bySource.timeline.selectedCount);
console.log('totalTrimmed', ranked.totalTrimmed);

if (RANKABLE_SOURCES.length !== 5) {
  console.error('FAIL: expected 5 sources');
  process.exit(1);
}
if (ranked.bySource.facts.selectedCount >= ranked.bySource.facts.totalCandidates) {
  console.error('FAIL: facts should trim');
  process.exit(1);
}
if (!ranked.bySource.facts.selected.some((e) => e.text.includes('林晓'))) {
  console.error('FAIL: relevant fact should rank high');
  process.exit(1);
}
if (!ranked.bySource.timeline.selected.length) {
  console.error('FAIL: timeline should have selections');
  process.exit(1);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-ctx-rank-'));
const result = runContextRanking({
  bookDir: tmp,
  chapter: 3,
  scene,
  intent,
  ctx,
  storyDna,
  topK: 5,
  budgetChars: 800,
});

if (!result.reportPath?.endsWith('context_rank.json')) {
  console.error('FAIL: context_rank.json not written');
  process.exit(1);
}

console.log('OK');
