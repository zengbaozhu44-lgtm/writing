/**
 * @inkos/dynamic-budget 单元验证 — Dynamic Budget 1800~3200
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  runDynamicBudget,
  BUDGET_MIN_TOKENS,
  BUDGET_MAX_TOKENS,
  BUDGET_MODULES,
  allocationToCompilerBudget,
  resolveTargetBudget,
} from '../packages/inkos-dynamic-budget/src/index.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-budget-'));
const scene = { index: 1, goal: '建立 POV 当下目标，呈现未来世界日常', id: 's1' };
const intent = { mainGoal: '展现未来世界', scenes: [{ index: 1 }, { index: 2 }, { index: 3 }, { index: 4 }] };

const r = runDynamicBudget({ bookDir: tmp, chapter: 1, scene, intent });

console.log('sceneType', r.budget.sceneType);
console.log('totalTokens', r.budget.totalTokens);
console.log('modules', r.pie.map((p) => p.key).join(','));

const sum = r.pie.reduce((s, p) => s + p.tokens, 0);
if (sum !== r.budget.totalTokens) {
  console.error('FAIL: token sum', sum, '!=', r.budget.totalTokens);
  process.exit(1);
}
if (r.budget.sceneType !== 'opening') {
  console.error('FAIL: expected opening scene type');
  process.exit(1);
}
if (r.budget.totalTokens < BUDGET_MIN_TOKENS || r.budget.totalTokens > BUDGET_MAX_TOKENS) {
  console.error('FAIL: budget out of range', r.budget.totalTokens);
  process.exit(1);
}
const openingTarget = resolveTargetBudget('opening');
if (Math.abs(r.budget.totalTokens - openingTarget) > 250) {
  console.error('FAIL: opening budget should be near target', r.budget.totalTokens, openingTarget);
  process.exit(1);
}
if (r.pie.length !== BUDGET_MODULES.length) {
  console.error('FAIL: expected', BUDGET_MODULES.length, 'modules got', r.pie.length);
  process.exit(1);
}
if (!r.reportPath?.endsWith('budget.json')) {
  console.error('FAIL: budget.json not written');
  process.exit(1);
}

const compilerBudget = allocationToCompilerBudget(r.budget.allocation);
if (!compilerBudget.goal || !compilerBudget.knowledge) {
  console.error('FAIL: compiler budget missing modules', compilerBudget);
  process.exit(1);
}

const dialogue = runDynamicBudget({
  scene: { index: 2, goal: '两人对白谈判', conflict: '谈判破裂' },
  intent: { scenes: [{}, {}, {}, {}] },
});
if (dialogue.budget.sceneType !== 'dialogue') {
  console.error('FAIL: dialogue scene type', dialogue.budget.sceneType);
  process.exit(1);
}
if (dialogue.budget.allocation.character.tokens <= dialogue.budget.allocation.world.tokens) {
  console.error('FAIL: dialogue should favor character over world');
  process.exit(1);
}
if (dialogue.budget.totalTokens >= r.budget.totalTokens) {
  console.error('FAIL: dialogue budget should be lower than opening');
  process.exit(1);
}

const ending = runDynamicBudget({
  scene: { index: 4, goal: '结尾钩子', conflict: '悬念' },
  intent: { scenes: [{}, {}, {}, {}] },
});
if (ending.budget.sceneType !== 'ending') {
  console.error('FAIL: ending scene type', ending.budget.sceneType);
  process.exit(1);
}

const complex = runDynamicBudget({
  scene: {
    index: 2,
    goal: '大规模战斗与多人对白谈判，揭露真相与线索',
    conflict: '军团围攻与系统对抗',
    entities: ['林晓', '张北', '系统', '管理员'],
  },
  intent: {
    mainGoal: '冲突升级',
    obstacles: ['时间', '信用', '追踪'],
    scenes: [{}, {}, {}, {}],
  },
  ctx: { present: ['林晓', '张北', '系统', '管理员'] },
});
const simple = runDynamicBudget({
  scene: { index: 2, goal: '林晓独处', entities: ['林晓'] },
  intent: { scenes: [{}, {}, {}, {}] },
  ctx: { present: ['林晓'] },
});
if (!complex.budget.complexity || complex.budget.complexity.level !== 'high') {
  console.error('FAIL: complex scene should be high', complex.budget.complexity);
  process.exit(1);
}
if (complex.budget.totalTokens <= simple.budget.totalTokens) {
  console.error('FAIL: complex scene should have higher budget');
  process.exit(1);
}

console.log('complexity', complex.budget.complexity.level, complex.budget.totalTokens);
console.log('OK');
