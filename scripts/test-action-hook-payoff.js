/**
 * Action Hook + Promise→Payoff 单元验证
 */
import {
  buildActionHookOutput,
  buildHookOutput,
  computeHookLevel,
  buildSceneReward,
  collectOpenPromises,
  detectRewardDelivery,
  runSceneDirector,
} from '../packages/inkos-director/src/index.js';

// --- Action Hook ---
const cognitive = buildHookOutput({ type: 'Danger' });
const actionHook = buildActionHookOutput(cognitive, {
  plan: {
    cliffhanger: '如果现在不行动，妹妹今晚就会死',
    newInformation: '门后有人',
  },
  intent: { pov: '林夜' },
});
if (actionHook.hookKind !== 'ActionHook') {
  console.error('FAIL: hookKind', actionHook);
  process.exit(1);
}
if (!actionHook.actionDeadline || !actionHook.newAction || !actionHook.plantedPromise) {
  console.error('FAIL: action hook fields', actionHook);
  process.exit(1);
}

const hookText = '她发现门后有人。但如果现在不行动，妹妹今晚就会死。林夜冲向走廊。';
const scores = computeHookLevel(hookText, { level: 2, type: 'Danger' });
if (!scores.forcesAction) {
  console.error('FAIL: should force action', scores);
  process.exit(1);
}

// --- Promise → Payoff ---
const storyMemory = {
  promise: [{ id: 'p1', text: '妹妹会死', status: 'open' }],
  foreshadow: [{ id: 'f1', text: '枪终于修好了', status: 'open' }],
};
const open = collectOpenPromises({ storyMemory });
if (open.length < 2) {
  console.error('FAIL: open promises', open);
  process.exit(1);
}

const reward = buildSceneReward({
  scene: { index: 2, payoff: '妹妹活下来了' },
  intent: { scenes: [{ index: 1 }] },
  plan: { consequence: '成功救人' },
  storyMemory,
  sceneIndex: 2,
});
if (!reward.valid || !reward.promise || !reward.payoff) {
  console.error('FAIL: reward binding', reward);
  process.exit(1);
}
if (reward.promise.indexOf('妹妹') < 0) {
  console.error('FAIL: should bind sister promise', reward);
  process.exit(1);
}

const noPromise = buildSceneReward({
  scene: { index: 1 },
  intent: { scenes: [] },
  plan: { goal: '调查' },
  storyMemory: { promise: [], foreshadow: [] },
  sceneIndex: 1,
});
if (noPromise.valid !== false || !noPromise.requiresPromise) {
  console.error('FAIL: should reject reward without promise', noPromise);
  process.exit(1);
}

const delivery = detectRewardDelivery('林夜冲进去，妹妹活下来了。她瘫在墙角，还在发抖。', reward);
if (!delivery.delivered) {
  console.error('FAIL: payoff delivery', delivery);
  process.exit(1);
}

const scene = {
  index: 2,
  goal: '救人',
  cliffhanger: '如果现在不行动，妹妹今晚就会死',
  newInformation: '门后有人',
  promise: '妹妹会死',
  payoff: '妹妹活下来了',
};
const sceneDir = runSceneDirector({
  scene,
  intent: { pov: '林夜', scenes: [{ index: 1, cliffhanger: '妹妹会死' }], sceneCount: 4 },
  chapterDir: { chapter: 1, bookQuestion: '为什么世界重置？', chapterQuestion: '为什么只有林夜记得？' },
});
if (!sceneDir.executionPlan.hookOutput.actionDeadline) {
  console.error('FAIL: scene director action hook', sceneDir.executionPlan.hookOutput);
  process.exit(1);
}
if (!sceneDir.executionPlan.reward.valid) {
  console.error('FAIL: scene reward should be valid with explicit promise', sceneDir.executionPlan.reward);
  process.exit(1);
}

console.log('actionHook', actionHook.actionDeadline.slice(0, 30));
console.log('payoff', reward.payoff);
console.log('OK');
