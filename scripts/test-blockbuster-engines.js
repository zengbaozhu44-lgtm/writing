/**
 * 爆款引擎接线验证 — Character Desire · Emotion · Situation v2 · Reader Question · Prompt Priority
 */
import {
  buildSceneEngineBundle,
  buildSceneExecutionPlan,
  buildCharacterDesireProfile,
  buildSceneEmotionCurvePlan,
  buildSceneSituation,
  buildSceneQuestionPlan,
  classifyPromise,
  compileLayeredStudioBlock,
  buildWriterExecutionChecklist,
  formatWriterExecutionChecklist,
} from '../packages/inkos-director/src/index.js';
import { compileStudioWriterPrompt } from '../packages/inkos-studio-server/src/writer-optimization/compile-writer-prompt.js';

const storyDna = {
  core_hook: '世界每天四点重置',
  protagonist: '林夜',
  character_desires: {
    林夜: {
      externalGoal: '阻止世界重置',
      internalDesire: '证明自己不是疯子',
      fear: '再次失去重要的人',
      wound: '过去救不了妹妹',
      belief: '只要够努力就能改变命运',
      changeArc: '从逃避真相到主动改变世界',
    },
  },
};

const intent = {
  pov: '林夜',
  mainGoal: '弄清四点重置真相',
  keyCharacter: '苏晚',
  scenes: [],
  _storyDna: storyDna,
};

const scene = {
  index: 1,
  goal: '林夜相信世界正常',
  obstacle: '系统拒绝跨区处方',
  choice: '上报还是隐瞒',
  consequence: '信用档案亮黄灯',
  newInformation: '苏晚是唯一知情者',
  cliffhanger: '林夜今晚能不能救妹妹？',
};

const plan = {
  goal: scene.goal,
  obstacle: scene.obstacle,
  choice: scene.choice,
  consequence: scene.consequence,
  newInformation: scene.newInformation,
  cliffhanger: scene.cliffhanger,
};

const engines = buildSceneEngineBundle({
  scene,
  intent,
  plan,
  chapter: 1,
  sceneIndex: 1,
  sceneCount: 4,
  storyDna,
  hookLadder: null,
  prevScene: null,
});

if (!engines.characterDesire?.externalGoal?.includes('阻止')) {
  console.error('FAIL: character desire', engines.characterDesire);
  process.exit(1);
}
if (engines.characterDesire?.missing) {
  console.error('FAIL: desire should not be missing when DNA provides fields', engines.characterDesire);
  process.exit(1);
}

// 无 DNA desire 时必须 missing，不得 DEFAULT 伪造
const emptyDesire = buildCharacterDesireProfile({
  storyDna: { protagonist: '路人甲' },
  intent: { pov: '路人甲' },
  chapter: 1,
});
if (!emptyDesire.missing || emptyDesire.fear || emptyDesire.belief) {
  console.error('FAIL: DEFAULT_DESIRE still forging psyche', emptyDesire);
  process.exit(1);
}
if ((engines.situation.dimensionsChanged ?? engines.situation.changedDimensions?.length) < 2) {
  console.error('FAIL: situation v2 dims', engines.situation);
  process.exit(1);
}
if (!engines.situation.relationshipState?.before?.includes('苏晚')) {
  console.error('FAIL: relationship state', engines.situation.relationshipState);
  process.exit(1);
}
if (!engines.questions.readerQuestion?.readerQuestion?.includes('妹妹')) {
  console.error('FAIL: reader question', engines.questions);
  process.exit(1);
}
if (!engines.emotionCurve?.emotionStart) {
  console.error('FAIL: emotion curve', engines.emotionCurve);
  process.exit(1);
}

const mainP = classifyPromise('为什么世界每天四点重置');
const smallP = classifyPromise('林夜今晚能不能救妹妹', { source: 'actionHook' });
if (mainP.type !== 'main' || smallP.type !== 'small') {
  console.error('FAIL: promise priority', mainP, smallP);
  process.exit(1);
}

const executionPlan = buildSceneExecutionPlan({
  scene: { ...scene, scenePlan: { ...plan, ...engines } },
  intent,
  chapter: 1,
  storyDna,
});

const checklist = formatWriterExecutionChecklist(
  buildWriterExecutionChecklist({ executionPlan, intent, chapter: 1, sceneIndex: 1 }),
);
if (!checklist.includes('[P1]') || !checklist.includes('Reader Question')) {
  console.error('FAIL: checklist priorities', checklist);
  process.exit(1);
}

const layered = compileLayeredStudioBlock({
  executionPlan,
  commercialRules: '风格参考',
  writerChecklist: checklist,
  policyBlock: 'Writer First',
});
if (!layered.includes('Priority 1') || !layered.includes('Priority 3')) {
  console.error('FAIL: layered prompt', layered.slice(0, 500));
  process.exit(1);
}
if (!layered.includes('Character Goal') || !layered.includes('三维状态变化')) {
  console.error('FAIL: P1 blocks missing');
  process.exit(1);
}

const compiled = compileStudioWriterPrompt({
  basePrompt: '### base',
  scene,
  chapter: 1,
  intent: { ...intent, scenes: [scene] },
  ctx: {},
  storyDna,
});
if (!compiled.prompt.includes('inkos-prompt-compiler') && !compiled.prompt.includes('writer-prompt-priority-v1')) {
  console.error('FAIL: studio prompt not layered / unified');
  process.exit(1);
}
if (!compiled.prompt.includes('Character Goal · 角色必推进') && !compiled.prompt.includes('Character Goal')) {
  console.error('FAIL: character block in prompt');
  process.exit(1);
}

console.log('desire', engines.characterDesire.internalDesire);
console.log('readerQ', engines.questions.readerQuestion.readerQuestion);
console.log('situation dims', engines.situation.changedDimensions?.join('+'));
console.log('emotion', `${engines.emotionCurve.emotionStart}→${engines.emotionCurve.emotionEnd}`);
console.log('OK: blockbuster engines wired');
