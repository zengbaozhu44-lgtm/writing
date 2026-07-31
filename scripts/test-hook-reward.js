/**
 * Hook Ladder v3 + Reward Engine 单元验证
 */
import {
  buildChapterHookLadder,
  buildHookLadder,
  buildHookOutput,
  buildActionHookOutput,
  computeHookLevel,
  buildSceneReward,
  detectRewardDelivery,
  runChapterDirector,
  runSceneDirector,
} from '../packages/inkos-director/src/index.js';

const storyDna = { main_question: '为什么时间停止？' };

const ch1Ladder = buildChapterHookLadder(1, 4, { storyDna });
if (!ch1Ladder[0].type || ch1Ladder[0].type !== 'Curiosity') {
  console.error('FAIL: ch1 scene1 should be Curiosity', ch1Ladder[0]);
  process.exit(1);
}
if (!ch1Ladder[0].hookOutput.actionDeadline) {
  console.error('FAIL: hook should have actionDeadline', ch1Ladder[0].hookOutput);
  process.exit(1);
}

const actionHook = buildActionHookOutput(buildHookOutput({ type: 'Danger' }), {
  plan: { cliffhanger: '三十秒后门永久关闭' },
  intent: { pov: '林晓' },
});
if (!actionHook.countdown) {
  console.error('FAIL: countdown', actionHook);
  process.exit(1);
}

const scene = {
  index: 2,
  goal: '在维修与取药之间做出选择',
  obstacle: '系统拒绝跨区处方',
  newInformation: '配送网存在未加密阴谋日志',
  cliffhanger: '如果现在不行动，信用档案今晚清零',
  promise: '信用档案会清零',
  payoff: '成功保住信用档案',
};
const intent = { pov: '林晓', sceneCount: 4, scenes: [{ index: 1, cliffhanger: '信用档案会清零' }, scene] };
const chapterDir = runChapterDirector({ intent, chapter: 1, storyDna });
const sceneDir = runSceneDirector({ scene, intent, chapterDir });

if (!sceneDir.scenePlan.reward.valid) {
  console.error('FAIL: scene plan reward', sceneDir.scenePlan.reward);
  process.exit(1);
}
if (!sceneDir.scenePlan.reward.promise || !sceneDir.scenePlan.reward.payoff) {
  console.error('FAIL: promise/payoff missing', sceneDir.scenePlan.reward);
  process.exit(1);
}

const plan = sceneDir.executionPlan;
const hookBeat = plan.beats.find((b) => b.structuralBeat === 'hook');
if (!hookBeat.hookOutput.actionDeadline) {
  console.error('FAIL: hook beat action hook', hookBeat.hookOutput);
  process.exit(1);
}

const delivery = detectRewardDelivery('她终于在时限前完成了操作，信用档案保住了。', plan.reward);
if (!delivery.delivered) {
  console.error('FAIL: detectRewardDelivery', delivery);
  process.exit(1);
}

console.log('hook', hookBeat.hookOutput.actionDeadline.slice(0, 35));
console.log('payoff', plan.reward.payoff.slice(0, 40));
console.log('OK');
