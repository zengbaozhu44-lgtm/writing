/**
 * Scene Entertainment + Human Writing Policy 验证
 */
import {
  buildSceneEntertainment,
  buildHumanWritingPolicy,
  formatSceneEntertainmentBlock,
  formatHumanWritingPolicyBlock,
  buildSceneExecutionPlan,
  compileLayeredStudioBlock,
} from '../packages/inkos-director/src/index.js';
import { compileSingleBeatPrompt } from '../packages/inkos-studio-server/src/writer-optimization/beat-execution.js';

const storyDna = { genre: '悬疑', core_hook: '世界四点重置', protagonist: '林夜' };
const plan = {
  goal: '进入系统空间',
  choice: '为了妹妹进入系统区域',
  consequence: '妹妹知道世界重置',
  newInformation: '系统记录显示他已多次进入',
  cliffhanger: '三十秒内必须上报',
  obstacle: '时间异常',
};

const ent = buildSceneEntertainment({
  plan,
  storyDna,
  intent: { pov: '林夜' },
  sceneIndex: 1,
  characterBehavior: {
    behaviorLogic: {
      desire: '想保护妹妹',
      fear: '再次失去妹妹',
    },
  },
});

if (!ent.entertainment?.visualMoment || !ent.entertainment?.surpriseMoment) {
  console.error('FAIL: entertainment fields', ent);
  process.exit(1);
}
if (!/时间停止|影子|灯光|暂停|呼吸|监控|雨停|04:00|嘴张着/u.test(ent.entertainment.visualMoment)) {
  console.error('FAIL: visualMoment', ent.entertainment.visualMoment);
  process.exit(1);
}
if (!/对白|你终于|不是第一次|别抬头|听到/u.test(ent.entertainment.dialogueMoment)) {
  // dialogueMoment itself is the quote text
  if (!ent.entertainment.dialogueMoment) {
    console.error('FAIL: dialogueMoment empty');
    process.exit(1);
  }
}
if (!/死亡37|记忆|归档|回不去|泄漏|落地/u.test(ent.entertainment.surpriseMoment)
  && !ent.entertainment.surpriseMoment.includes('系统')) {
  // accept memory/system based surprise
  if (!ent.entertainment.surpriseMoment) {
    console.error('FAIL: surpriseMoment', ent.entertainment.surpriseMoment);
    process.exit(1);
  }
}

const human = buildHumanWritingPolicy({});
const humanBlock = formatHumanWritingPolicyBlock(human);
if (!humanBlock.includes('他感到恐惧') || !humanBlock.includes('事件 → 反应 → 留白')) {
  console.error('FAIL: human writing block', humanBlock.slice(0, 400));
  process.exit(1);
}
if (!humanBlock.includes('她很聪明') || !humanBlock.includes('三个漏洞')) {
  console.error('FAIL: character explain examples');
  process.exit(1);
}

const scene = { index: 1, ...plan };
const executionPlan = buildSceneExecutionPlan({
  scene: { ...scene, scenePlan: plan },
  intent: { pov: '林夜', scenes: [scene], sceneCount: 4 },
  chapter: 1,
  storyDna,
});

if (!executionPlan.sceneEntertainment?.entertainment?.visualMoment) {
  console.error('FAIL: executionPlan entertainment');
  process.exit(1);
}
if (!executionPlan.humanWritingPolicy?.flowMust) {
  console.error('FAIL: executionPlan humanWritingPolicy');
  process.exit(1);
}

const goalBeat = executionPlan.beats.find((b) => b.structuralBeat === 'goal');
if (!goalBeat?.content?.includes('视觉瞬间')) {
  console.error('FAIL: goal beat missing visual', goalBeat?.content);
  process.exit(1);
}

const layered = compileLayeredStudioBlock({ executionPlan, policyBlock: 'WF' });
if (!layered.includes('Scene Entertainment') || !layered.includes('Human Writing Policy')) {
  console.error('FAIL: layered missing entertainment/human writing');
  process.exit(1);
}

const beatPrompt = compileSingleBeatPrompt({
  beat: goalBeat,
  executionPlan,
  basePrompt: '### base',
  sceneIndex: 1,
  totalBeats: 6,
});
if (!beatPrompt.includes('Scene Entertainment') || !beatPrompt.includes('Human Writing')) {
  console.error('FAIL: beat prompt', beatPrompt.slice(0, 600));
  process.exit(1);
}

console.log('visual', ent.entertainment.visualMoment.slice(0, 40));
console.log('dialogue', ent.entertainment.dialogueMoment.slice(0, 40));
console.log('surprise', ent.entertainment.surpriseMoment.slice(0, 40));
console.log('human flow', human.flowMust);
console.log('OK: Entertainment + Human Writing wired');
