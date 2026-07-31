/**
 * Human Behavior — Choice 真人动机验证
 */
import {
  buildChoiceBehaviorLogic,
  buildSceneExecutionPlan,
  compileLayeredStudioBlock,
  formatCharacterBehaviorBlock,
} from '../packages/inkos-director/src/index.js';
import { compileSingleBeatPrompt } from '../packages/inkos-studio-server/src/writer-optimization/beat-execution.js';

const storyDna = {
  genre: '悬疑',
  core_hook: '世界四点重置',
  protagonist: '林夜',
};
const desire = {
  name: '林夜',
  belief: '林夜相信规则可以保护自己',
  externalGoal: '阻止世界重置',
  internalDesire: '证明自己不是疯子',
  fear: '再次失去妹妹',
  wound: '过去救不了妹妹',
  changeArc: '从逃避到主动反抗',
};
const plan = {
  goal: '打开配送网后门',
  choice: '为了妹妹进入系统区域',
  consequence: '妹妹知道世界重置',
  newInformation: '系统发现林夜拥有记忆',
  cliffhanger: '三十秒内必须上报',
  obstacle: '门可以打开',
};

const behavior = buildChoiceBehaviorLogic({ desire, plan, storyDna });
if (!behavior.valid || !behavior.behaviorLogic?.irrationalAction) {
  console.error('FAIL: behaviorLogic', behavior);
  process.exit(1);
}
if (behavior.behaviorLogic.desire !== '想保护妹妹'
  && !/保护妹妹|阻止世界/u.test(behavior.behaviorLogic.desire)) {
  console.error('FAIL: desire', behavior.behaviorLogic.desire);
  process.exit(1);
}
if (!/恐惧|害怕|失去/u.test(behavior.behaviorLogic.fear)) {
  console.error('FAIL: fear', behavior.behaviorLogic.fear);
  process.exit(1);
}
if (!/没有疯|证明/u.test(behavior.behaviorLogic.hiddenNeed)) {
  console.error('FAIL: hiddenNeed', behavior.behaviorLogic.hiddenNeed);
  process.exit(1);
}
if (!/明知道危险/u.test(behavior.behaviorLogic.irrationalAction)) {
  console.error('FAIL: irrationalAction', behavior.behaviorLogic.irrationalAction);
  process.exit(1);
}

const block = formatCharacterBehaviorBlock(behavior);
if (!block.includes('剧情需要') || !block.includes('欲望') || !block.includes('❌')) {
  console.error('FAIL: format block', block.slice(0, 300));
  process.exit(1);
}

const scene = { index: 3, ...plan };
const executionPlan = buildSceneExecutionPlan({
  scene: { ...scene, scenePlan: plan },
  intent: { pov: '林夜', scenes: [scene], sceneCount: 4 },
  chapter: 1,
  storyDna,
  chapterDir: {},
});

if (!executionPlan.characterBehavior?.behaviorLogic?.irrationalAction) {
  console.error('FAIL: executionPlan characterBehavior');
  process.exit(1);
}

const choiceBeat = executionPlan.beats.find((b) => b.structuralBeat === 'choice');
if (!choiceBeat?.content?.includes('真人动机') && !choiceBeat?.behaviorLogic) {
  console.error('FAIL: choice beat behavior', choiceBeat?.content);
  process.exit(1);
}

const layered = compileLayeredStudioBlock({ executionPlan, policyBlock: 'WF' });
if (!layered.includes('Human Behavior') || !layered.includes('irrationalAction')) {
  console.error('FAIL: layered missing Human Behavior');
  process.exit(1);
}

const beatPrompt = compileSingleBeatPrompt({
  beat: choiceBeat,
  executionPlan,
  basePrompt: '### base',
  sceneIndex: 3,
  totalBeats: 6,
});
if (!beatPrompt.includes('Human Behavior') || !beatPrompt.includes('想保护妹妹') && !beatPrompt.includes('欲望')) {
  if (!beatPrompt.includes('Human Behavior')) {
    console.error('FAIL: beat prompt missing behavior', beatPrompt.slice(0, 800));
    process.exit(1);
  }
}

console.log('desire', behavior.behaviorLogic.desire);
console.log('fear', behavior.behaviorLogic.fear);
console.log('hiddenNeed', behavior.behaviorLogic.hiddenNeed);
console.log('irrational', behavior.behaviorLogic.irrationalAction.slice(0, 50));
console.log('OK: Human Behavior wired');
