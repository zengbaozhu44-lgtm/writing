/**
 * 架构成熟期验证 — Transformation · Irreversible · Satisfaction · Rhythm · Ending · Voice Rhythm
 */
import {
  buildSceneCharacterTransformation,
  buildSceneConflict,
  buildReaderSatisfaction,
  buildChapterRhythmPlan,
  getSceneRhythmRole,
  selectSceneEnding,
  resolveVoiceDna,
  buildSceneExecutionPlan,
  buildChapterDirectorBrief,
  compileLayeredStudioBlock,
  buildWriterExecutionChecklist,
  formatWriterExecutionChecklist,
} from '../packages/inkos-director/src/index.js';
import { compileStudioWriterPrompt } from '../packages/inkos-studio-server/src/writer-optimization/compile-writer-prompt.js';

const storyDna = { genre: '悬疑', core_hook: '世界四点重置', protagonist: '林夜' };
const desire = {
  name: '林夜',
  belief: '林夜相信规则可以保护自己',
  externalGoal: '阻止世界重置',
  internalDesire: '证明自己不是疯子',
  fear: '再次失去妹妹',
  changeArc: '从逃避到主动反抗',
};

const plan = {
  goal: '打开配送网后门',
  choice: '为了妹妹欺骗系统',
  consequence: '妹妹知道世界重置',
  newInformation: '系统发现林夜拥有记忆',
  cliffhanger: '三十秒内必须上报',
  obstacle: '门可以打开',
};
const situation = {
  worldState: { before: '世界正常', after: '重置被确认' },
  characterState: { before: '林夜相信规则', after: '林夜开始反抗' },
  relationshipState: { before: '苏晚只是同事', after: '苏晚成为知情者' },
  dimensionsChanged: 3,
};

const tx = buildSceneCharacterTransformation({ desire, plan, situation });
if (!tx.valid || !tx.changedDimensions?.length) {
  console.error('FAIL: character transformation', tx);
  process.exit(1);
}

const conflict = buildSceneConflict({
  plan: { ...plan, situation },
  scene: plan,
  intent: { pov: '林夜', keyCharacter: '苏晚' },
  characterDesire: desire,
  chapterClimax: { maxCost: '最大代价', storyShift: '格局永久改变' },
  sceneIndex: 4,
  sceneCount: 4,
});
if (!conflict.irreversibleChange) {
  console.error('FAIL: irreversible conflict', conflict);
  process.exit(1);
}

const satisfaction = buildReaderSatisfaction({
  questions: { answeredQuestion: '能救妹妹吗？' },
  reward: { valid: true, promise: '妹妹能活', payoff: '妹妹活下来了' },
  promiseLifecycle: { payoff: { payoff: '妹妹活下来了' }, newPromise: { text: '系统已锁定林夜' } },
  sceneIndex: 4,
  sceneCount: 4,
});
if (!satisfaction.payoff || !satisfaction.newPromise) {
  console.error('FAIL: reader satisfaction', satisfaction);
  process.exit(1);
}

const rhythm = buildChapterRhythmPlan({ chapter: 1, sceneCount: 4 });
const sceneRhythm = getSceneRhythmRole({ sceneIndex: 4, chapterRhythm: rhythm, sceneCount: 4 });
if (sceneRhythm.phase !== 'explosion') {
  console.error('FAIL: chapter rhythm climax', sceneRhythm);
  process.exit(1);
}

const ending = selectSceneEnding({ sceneIndex: 3, sceneCount: 4, chapter: 1, plan, intent: { scenes: [] } });
if (!ending.type || !ending.label) {
  console.error('FAIL: scene ending', ending);
  process.exit(1);
}

const voice = resolveVoiceDna({
  storyDna,
  sceneRhythm,
  climaxRole: { isClimax: true },
  readerEmotion: { dramaticIrony: '读者领先', readerEmotionPeak: '揪心' },
});
if (!voice.sentenceRhythm?.rules?.length) {
  console.error('FAIL: voice sentence rhythm', voice.sentenceRhythm);
  process.exit(1);
}

const scene = { index: 4, ...plan };
const chapterDir = buildChapterDirectorBrief(
  { pov: '林夜', sceneCount: 4, scenes: [scene] },
  1,
  { storyDna },
);
if (!chapterDir.chapterRhythm || !chapterDir.chapterReaderSatisfaction) {
  console.error('FAIL: chapter director maturity fields');
  process.exit(1);
}

const executionPlan = buildSceneExecutionPlan({
  scene: { ...scene, scenePlan: plan },
  intent: { pov: '林夜', scenes: [scene], sceneCount: 4 },
  chapter: 1,
  storyDna,
  chapterDir,
});

const hookBeat = executionPlan.beats.find((b) => b.structuralBeat === 'hook');
const choiceBeat = executionPlan.beats.find((b) => b.structuralBeat === 'choice');
if (!hookBeat?.content?.includes('Hook Beat') && !hookBeat?.content?.includes('Ending')) {
  console.error('FAIL: hook beat missing ending hint', hookBeat?.content);
  process.exit(1);
}
if (!choiceBeat?.content?.includes('人物')) {
  console.error('FAIL: choice beat missing transformation', choiceBeat?.content);
  process.exit(1);
}

const checklist = formatWriterExecutionChecklist(
  buildWriterExecutionChecklist({ executionPlan, intent: {}, chapter: 1, sceneIndex: 4 }),
);
if (!checklist.includes('人物转变') || !checklist.includes('不可逆')) {
  console.error('FAIL: checklist maturity', checklist);
  process.exit(1);
}

const layered = compileLayeredStudioBlock({ executionPlan, policyBlock: 'WF', writerChecklist: checklist, voiceDna: voice });
if (!layered.includes('Character Transformation') || !layered.includes('Reader Satisfaction')) {
  console.error('FAIL: layered prompt maturity');
  process.exit(1);
}

const compiled = compileStudioWriterPrompt({
  basePrompt: '### base',
  scene,
  chapter: 1,
  intent: { scenes: [scene], sceneCount: 4 },
  ctx: {},
  storyDna,
  chapterDir,
});
if (!compiled.prompt.includes('句读节奏') || !compiled.prompt.includes('不可逆')) {
  console.error('FAIL: studio prompt maturity');
  process.exit(1);
}

console.log('tx', tx.after.belief.slice(0, 35));
console.log('irreversible', conflict.irreversibleChange.slice(0, 40));
console.log('ending', executionPlan.sceneEnding?.label);
console.log('voice rhythm', voice.sentenceRhythm.label);
console.log('OK: maturity phase wired');
