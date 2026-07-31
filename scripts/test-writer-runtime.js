/**
 * Professional Writer Runtime 验证
 */
import {
  buildBeatWriterIntent,
  buildAuthorMode,
  buildSceneWriterRuntime,
  formatSceneWriterRuntimeBlock,
  formatCurrentBeatRuntimeBlock,
  WRITER_RUNTIME_POLICY,
  buildSceneExecutionPlan,
  compileLayeredStudioBlock,
  buildWriterExecutionChecklist,
  formatWriterExecutionChecklist,
} from '../packages/inkos-director/src/index.js';
import { compileStudioWriterPrompt } from '../packages/inkos-studio-server/src/writer-optimization/compile-writer-prompt.js';
import { compileSingleBeatPrompt } from '../packages/inkos-studio-server/src/writer-optimization/beat-execution.js';

const storyDna = { genre: '悬疑', core_hook: '世界四点重置', protagonist: '林夜' };
const plan = {
  goal: '打开配送网后门',
  choice: '为了妹妹欺骗系统',
  consequence: '妹妹知道世界重置',
  newInformation: '系统发现林夜拥有记忆',
  cliffhanger: '三十秒内必须上报',
  obstacle: '门可以打开',
};

const intent = {
  choice: '为了妹妹欺骗系统',
  consequence: '妹妹知道世界重置',
  newInformation: '系统发现林夜拥有记忆',
  cliffhanger: '三十秒内必须上报',
  obstacle: '门可以打开',
  goal: '打开配送网后门',
  pov: '林夜',
  sceneCount: 4,
  scenes: [{ index: 4, ...plan }],
};

const choiceIntent = buildBeatWriterIntent({
  structuralBeat: 'choice',
  beatOrder: 3,
  plan,
  characterTransformation: { changedDimensions: ['belief'] },
});
if (!choiceIntent.writerIntent || !choiceIntent.emotionDirective?.directive) {
  console.error('FAIL: buildBeatWriterIntent', choiceIntent);
  process.exit(1);
}
if (choiceIntent.writerIntent !== '误导读者') {
  console.error('FAIL: choice intent variant', choiceIntent.writerIntent);
  process.exit(1);
}

const authorMode = buildAuthorMode({
  plan,
  storyDna,
  sceneIndex: 1,
});
if (!authorMode.readerManipulation || !authorMode.tensionControl || !authorMode.sceneFocus) {
  console.error('FAIL: authorMode fields', authorMode);
  process.exit(1);
}
if (!/怀疑.*疯|认知落差|不要马上证明/u.test(authorMode.readerManipulation)) {
  console.error('FAIL: authorMode readerManipulation craft', authorMode.readerManipulation);
  process.exit(1);
}

const scene = { index: 4, ...plan };
const chapterDir = {
  chapterRhythm: { phases: ['fast', 'slow', 'fast', 'explosion'] },
  chapterClimax: { maxCost: '最大代价', storyShift: '格局永久改变' },
  chapterReaderSatisfaction: { payoffs: ['妹妹活下来'], newPromises: ['系统锁定林夜'] },
};

const executionPlan = buildSceneExecutionPlan({
  scene: { ...scene, scenePlan: plan },
  intent: { ...intent, scenes: [scene] },
  chapter: 1,
  storyDna,
  chapterDir,
});

if (!executionPlan.writerRuntime?.beats?.length) {
  console.error('FAIL: writerRuntime missing');
  process.exit(1);
}
if (!executionPlan.writerRuntime.authorMode?.readerManipulation) {
  console.error('FAIL: scene authorMode missing', executionPlan.writerRuntime.authorMode);
  process.exit(1);
}

const choiceBeat = executionPlan.beats.find((b) => b.structuralBeat === 'choice');
if (!choiceBeat?.writerIntent || !choiceBeat?.writerRuntime?.writerRhythm) {
  console.error('FAIL: beat writerRuntime', choiceBeat);
  process.exit(1);
}

const hookBeat = executionPlan.beats.find((b) => b.structuralBeat === 'hook');
const runtimeBlock = formatSceneWriterRuntimeBlock(executionPlan.writerRuntime);
if (!runtimeBlock.includes('WRITER_RUNTIME_POLICY') || !runtimeBlock.includes('Writer Intent')) {
  console.error('FAIL: runtime block');
  process.exit(1);
}
if (!runtimeBlock.includes('Author Mode')) {
  console.error('FAIL: runtime block missing Author Mode');
  process.exit(1);
}

const beatPrompt = compileSingleBeatPrompt({
  beat: choiceBeat,
  executionPlan,
  basePrompt: '### base',
  sceneIndex: 4,
  totalBeats: 6,
});
if (!beatPrompt.includes('Writer Intent') || !beatPrompt.includes('Emotion Directive')) {
  console.error('FAIL: single beat prompt', beatPrompt.slice(0, 400));
  process.exit(1);
}
if (!beatPrompt.includes('Author Mode')) {
  console.error('FAIL: beat prompt missing Author Mode', beatPrompt.slice(0, 600));
  process.exit(1);
}

const checklist = formatWriterExecutionChecklist(
  buildWriterExecutionChecklist({ executionPlan, intent, chapter: 1, sceneIndex: 4 }),
);
if (!checklist.includes('[P0]') || !checklist.includes('Intent')) {
  console.error('FAIL: checklist P0 intents', checklist.slice(0, 500));
  process.exit(1);
}

const layered = compileLayeredStudioBlock({
  executionPlan,
  policyBlock: 'WF',
  writerChecklist: checklist,
});
if (!layered.includes('Professional Writer Runtime') || !layered.includes(WRITER_RUNTIME_POLICY.core.slice(0, 10))) {
  console.error('FAIL: layered prompt runtime');
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
if (!compiled.prompt.includes('Writer Intent') || !compiled.prompt.includes('Professional Writer Runtime')) {
  console.error('FAIL: studio prompt runtime');
  process.exit(1);
}

console.log('authorMode', executionPlan.writerRuntime.authorMode.id, executionPlan.writerRuntime.authorMode.readerManipulation.slice(0, 50));
console.log('choice intent', choiceBeat.writerIntent);
console.log('hook intent', hookBeat.writerIntent);
console.log('emotion', choiceBeat.writerRuntime.emotionDirective.directive.slice(0, 40));
console.log('rhythm', hookBeat.writerRuntime.writerRhythm.rules.join('/'));
console.log('OK: Professional Writer Runtime wired');
