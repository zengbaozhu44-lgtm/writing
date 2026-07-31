/**
 * @inkos/story-memory 单元验证 — Hint + Dashboard
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  runStoryMemory,
  buildStoryMemoryHints,
  buildStoryMemoryPlannerBlock,
  buildStoryMemoryWriterBlock,
  MEMORY_CATEGORIES,
} from '../packages/inkos-story-memory/src/index.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-story-mem-'));
const ctx = {
  chapter: 5,
  foreshadow: [
    { text: '机器人日志中的传单计划', status: 'open', chapter: 1 },
    { text: '碳配额上调', status: 'resolved', chapter: 1, payoff_chapter: 3 },
  ],
  characters: {
    林晓: { raw: '冷静维修工', arc: '从顺从到反抗', arc_stage: 'developing' },
  },
  facts: [{ fact: '回收伏笔：传单与维修记录呼应', chapter: 4 }],
};
const storyDna = {
  theme: '个体在系统缝隙生存',
  mainGoal: '林晓发现反抗线索',
  long_goals: [{ text: '救出女儿', progress: 20 }],
};

const result = runStoryMemory({
  bookDir: tmp,
  chapter: 5,
  scene: { index: 1, id: 'ch5_s1' },
  ctx,
  storyDna,
});

console.log('hints', result.hints.length);
console.log('dashboard recovery', result.dashboard.recoveryRate);

if (MEMORY_CATEGORIES.length !== 8) {
  console.error('FAIL: expected 8 categories');
  process.exit(1);
}
if (!result.hints.length) {
  console.error('FAIL: should generate hints');
  process.exit(1);
}
if (!result.plannerBlock.includes('Story Memory Hint')) {
  console.error('FAIL: planner block');
  process.exit(1);
}
if (!result.writerBlock.includes('Story Memory')) {
  console.error('FAIL: writer block');
  process.exit(1);
}
if (result.dashboard.callbackRecoveryRate == null) {
  console.error('FAIL: callback recovery rate');
  process.exit(1);
}
if (result.dashboard.mainThreadProgress !== 20) {
  console.error('FAIL: main thread progress', result.dashboard.mainThreadProgress);
  process.exit(1);
}
if (!result.reportPath?.endsWith('story_memory.json')) {
  console.error('FAIL: report not written');
  process.exit(1);
}

const hintsOnly = buildStoryMemoryHints(result.memory, result.metrics, { chapter: 5 });
const planner = buildStoryMemoryPlannerBlock(hintsOnly, result.metrics, { chapter: 5 });
const writer = buildStoryMemoryWriterBlock(hintsOnly, result.metrics, result.memory);
if (!planner || !writer) {
  console.error('FAIL: hint blocks empty');
  process.exit(1);
}

console.log('OK');
