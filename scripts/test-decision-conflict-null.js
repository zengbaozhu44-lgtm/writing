/**
 * 回归：Decision 耗尽重试后 Conflict 为 null 不得崩；剧情词不得误杀
 */
import { evaluateDecisions } from '../packages/inkos-brain/src/decision/decision.js';
import { appendConflictHistory, appendDecisionHistory } from '../packages/inkos-brain/src/memory/memory.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-decision-'));
fs.mkdirSync(path.join(tmp, 'novel', '_system', 'brain'), { recursive: true });

assert(appendConflictHistory(tmp, 1, null) === null, 'null conflictResult 应跳过');
assert(appendDecisionHistory(tmp, 1, null) === null, 'null decisionResult 应跳过');

const ctx = {
  pov: '林砚',
  characters: {
    林砚: {
      bottomLine: '绝不利用无辜普通人献祭、绝不放任邪神污染现世',
    },
  },
  knowledge: { matrix: [] },
  relationships: [],
  resources: {},
  facts: [],
};

const intentFalsePositive = {
  mainGoal: '重生逆转',
  scenes: [
    {
      id: 's1',
      goal: '前世他倾尽所有守护人族，换来背叛惨死。这一世手握权柄。',
      conflict: '局势改变',
      beat: 'hook',
    },
    {
      id: 's2',
      goal: '克服阻碍',
      conflict: '底线受阻需换路径',
      beat: 'complication',
    },
  ],
  present: ['林砚'],
  mustLose: '神魂',
};

const ok = evaluateDecisions(ctx, intentFalsePositive);
assert(ok.pass === true, `不应因旁白「背叛/底线」误杀，got ${JSON.stringify(ok.decisions)}`);

const intentHard = {
  mainGoal: '行动',
  scenes: [
    {
      id: 's1',
      goal: '发动颜色革命',
      conflict: '颠覆政权',
      beat: 'turn',
    },
  ],
  present: ['林砚'],
  mustLose: 'x',
};
const bad = evaluateDecisions(ctx, intentHard);
assert(bad.pass === false, '政治敏感应失败');
assert(bad.decisions[0]?.failures?.[0]?.level === 'HARD_BLOCK', '须 HARD_BLOCK');
assert(
  !String(bad.decisions[0]?.failures?.[0]?.suggestObstacle || '').includes('底线受阻'),
  'suggestObstacle 不得再含「底线受阻需换路径」',
);

fs.rmSync(tmp, { recursive: true, force: true });
console.log('OK test-decision-conflict-null');
