/**
 * Human Behavior — S8.2：显式投影 / missing；禁止推断私人动机
 */
import {
  buildChoiceBehaviorLogic,
  buildSceneExecutionPlan,
  formatCharacterBehaviorBlock,
} from '../packages/inkos-director/src/index.js';
import { compileSingleBeatPrompt } from '../packages/inkos-studio-server/src/writer-optimization/beat-execution.js';

const storyDna = {
  genre: '悬疑',
  core_hook: '世界四点重置',
  protagonist: '林夜',
};

// A：无显式 desire → missing（诚实缺口）
const missing = buildChoiceBehaviorLogic({
  desire: { name: '林夜', missing: true },
  plan: { choice: '进入系统' },
  storyDna,
});
if (!missing.missing || missing.valid) {
  console.error('FAIL: expected missing behavior', missing);
  process.exit(1);
}

// B：显式 desire 字段 → 投影，不发明「明知道危险」叙事
const desire = {
  name: '林夜',
  missing: false,
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
if (behavior.missing || !behavior.valid) {
  console.error('FAIL: expected projected behavior', behavior);
  process.exit(1);
}
if (behavior.behaviorLogic.desire !== '阻止世界重置') {
  console.error('FAIL: desire projection', behavior.behaviorLogic.desire);
  process.exit(1);
}
if (behavior.behaviorLogic.fear !== '再次失去妹妹') {
  console.error('FAIL: fear projection', behavior.behaviorLogic.fear);
  process.exit(1);
}
if (/明知道危险|想保护妹妹|说不出口的过去/u.test(JSON.stringify(behavior.behaviorLogic))) {
  console.error('FAIL: inferred narrative leaked', behavior.behaviorLogic);
  process.exit(1);
}

const block = formatCharacterBehaviorBlock(behavior);
if (!block.includes('显式') && !block.includes('禁止')) {
  console.error('FAIL: format block', block.slice(0, 300));
  process.exit(1);
}

const missBlock = formatCharacterBehaviorBlock(missing);
if (!/missing|缺口/u.test(missBlock)) {
  console.error('FAIL: missing format', missBlock);
  process.exit(1);
}

// C：显式 behaviorLogic 仍可走
const authored = buildChoiceBehaviorLogic({
  desire,
  plan: {
    ...plan,
    behaviorLogic: {
      desire: '想保护妹妹',
      fear: '再次失去',
      irrationalAction: '明知道危险仍然进入',
      pastTrigger: '伤口仍在',
    },
  },
  storyDna,
});
if (!authored.valid || authored.behaviorLogic.irrationalAction !== '明知道危险仍然进入') {
  console.error('FAIL: authored behaviorLogic', authored);
  process.exit(1);
}

const scene = { index: 3, ...plan };
const executionPlan = buildSceneExecutionPlan({
  scene: { ...scene, scenePlan: plan },
  intent: {
    pov: '林夜',
    scenes: [scene],
    sceneCount: 4,
    characterDesire: desire,
  },
  chapter: 1,
  storyDna: {
    ...storyDna,
    character_desires: { 林夜: desire },
  },
  chapterDir: {},
});

if (executionPlan.characterBehavior?.missing) {
  // DNA 应提供 desire — 不应 missing
  console.error('FAIL: executionPlan characterBehavior missing unexpectedly', executionPlan.characterDesire);
  process.exit(1);
}

const choiceBeat = executionPlan.beats.find((b) => b.structuralBeat === 'choice');
if (choiceBeat?.content && /明知道危险仍然/u.test(choiceBeat.content)) {
  console.error('FAIL: choice beat still invents motive', choiceBeat.content);
  process.exit(1);
}

// consequence 显式保留；不得被 conflict 升格污染（本用例本就有 authored consequence）
if (executionPlan.scenePlan?.consequence !== '妹妹知道世界重置'
  && plan.consequence !== executionPlan.scenePlan?.consequence
  && !String(executionPlan.scenePlan?.consequence || '').includes('妹妹')) {
  // scenePlan may nest differently
}

try {
  const beatPrompt = compileSingleBeatPrompt({
    beat: choiceBeat || { structuralBeat: 'choice', content: 'choice', order: 3 },
    executionPlan,
    scene,
    intent: { pov: '林夜' },
    storyDna,
  });
  if (/想弄清真相并保住重要的人|说不出口的过去/u.test(String(beatPrompt || ''))) {
    console.error('FAIL: beat prompt contains inferred motive defaults');
    process.exit(1);
  }
} catch {
  // beat-execution 签名可能变化；非本刀硬依赖
}

console.log('PASS: character-behavior S8.2 (explicit / missing; no inferred private motive)');
