/**
 * Reader Addiction 模块 — Question/Promise Lifecycle · Reader Emotion · Writer Scene Arc
 */
import {
  buildQuestionRegistry,
  applyQuestionLifecycle,
  buildSceneQuestionPlan,
  buildScenePromiseLifecycle,
  buildChapterPromisePlan,
  buildReaderEmotionCurve,
  buildWriterSceneArc,
  buildSceneExecutionPlan,
  buildChapterDirectorBrief,
  compileLayeredStudioBlock,
  buildWriterExecutionChecklist,
  formatWriterExecutionChecklist,
  QUESTION_STATES,
} from '../packages/inkos-director/src/index.js';
import { compileStudioWriterPrompt } from '../packages/inkos-studio-server/src/writer-optimization/compile-writer-prompt.js';

const storyDna = { core_hook: '世界四点重置', genre: '悬疑' };
const intent = {
  pov: '林夜',
  mainGoal: '阻止重置',
  sceneCount: 4,
  _storyDna: storyDna,
  scenes: [
    { index: 1, scenePlan: { questions: { newReaderQuestions: [{ readerQuestion: '血字谁写的？' }] } } },
    { index: 2, scenePlan: { questions: { newReaderQuestions: [{ readerQuestion: '苏晚可信吗？' }] } } },
  ],
};

const registry = buildQuestionRegistry({ intent, chapter: 3, sceneIndex: 3 });
if (!registry.active?.length) {
  console.error('FAIL: question registry', registry);
  process.exit(1);
}

const questions = applyQuestionLifecycle({
  questions: buildSceneQuestionPlan({
    scene: { index: 3, cliffhanger: '林夜今晚能不能救妹妹？' },
    intent,
    chapter: 3,
    sceneIndex: 3,
    sceneCount: 4,
  }),
  registry,
  chapter: 3,
  sceneIndex: 3,
});
if (!questions.lifecycle?.created?.length && !questions.lifecycle?.answered) {
  console.error('FAIL: question lifecycle', questions.lifecycle);
  process.exit(1);
}
if (!QUESTION_STATES.created) {
  console.error('FAIL: question states');
  process.exit(1);
}

const scene = {
  index: 3,
  goal: '林夜相信世界正常',
  obstacle: '系统可绕过',
  choice: '开门还是放弃',
  consequence: '妹妹暴露',
  newInformation: '重置是人为设计',
  cliffhanger: '三十秒内必须上报',
};
const plan = { ...scene };

const readerEmotion = buildReaderEmotionCurve({
  characterEmotionCurve: { emotionStart: '疑惑', emotionEnd: '希望' },
  plan,
  scene,
  questions,
  conflict: { cost: '开门以后妹妹会死', risk: '来不及' },
  situation: { characterState: { before: '林夜相信世界正常' } },
  hookOutput: { plantedPromise: '必须在天亮前行动' },
});
if (!readerEmotion.dramaticIrony && !readerEmotion.knowledgeGap) {
  console.error('FAIL: reader emotion', readerEmotion);
  process.exit(1);
}

const promiseLc = buildScenePromiseLifecycle({
  reward: { valid: true, promise: '妹妹能活下来', payoff: '妹妹活下来了', promiseType: 'small' },
  hookOutput: { plantedPromise: '系统已锁定林夜' },
  plan,
  scene,
  chapter: 1,
  sceneIndex: 3,
  sceneCount: 4,
});
if (!promiseLc.payoff || !promiseLc.newPromise) {
  console.error('FAIL: promise lifecycle', promiseLc);
  process.exit(1);
}

const chapterDir = buildChapterDirectorBrief(intent, 1, { storyDna });
if (!chapterDir.chapterPromisePlan?.mustPayoffCount) {
  console.error('FAIL: chapter promise plan');
  process.exit(1);
}

const executionPlan = buildSceneExecutionPlan({
  scene: { ...scene, scenePlan: plan },
  intent: { ...intent, scenes: [...intent.scenes, scene] },
  chapter: 1,
  storyDna,
  chapterDir,
});

if (!executionPlan.readerEmotion || !executionPlan.promiseLifecycle || !executionPlan.writerSceneArc) {
  console.error('FAIL: execution plan missing addiction fields', {
    readerEmotion: !!executionPlan.readerEmotion,
    promiseLifecycle: !!executionPlan.promiseLifecycle,
    writerSceneArc: !!executionPlan.writerSceneArc,
    questionRegistry: !!executionPlan.questionRegistry,
  });
  process.exit(1);
}

const checklist = formatWriterExecutionChecklist(
  buildWriterExecutionChecklist({ executionPlan, intent, chapter: 1, sceneIndex: 3 }),
);
if (!checklist.includes('Scene Arc') || !checklist.includes('读者情绪')) {
  console.error('FAIL: checklist', checklist);
  process.exit(1);
}

const layered = compileLayeredStudioBlock({ executionPlan, policyBlock: 'WF', writerChecklist: checklist });
if (!layered.includes('Question Lifecycle') || !layered.includes('Promise Lifecycle')) {
  console.error('FAIL: layered prompt missing lifecycles');
  process.exit(1);
}
if (!layered.includes('Reader Emotion') || !layered.includes('Writer Scene Arc')) {
  console.error('FAIL: layered prompt missing reader emotion / scene arc');
  process.exit(1);
}

const compiled = compileStudioWriterPrompt({
  basePrompt: '### base',
  scene,
  chapter: 1,
  intent: { ...intent, scenes: [...intent.scenes, scene] },
  ctx: {},
  storyDna,
  chapterDir,
});
if (!compiled.prompt.includes('Question Lifecycle') || !compiled.prompt.includes('Writer Scene Arc')) {
  console.error('FAIL: studio prompt');
  process.exit(1);
}

console.log('questions active', executionPlan.questionRegistry?.active?.length);
console.log('reader emotion', readerEmotion.readerEmotionStart, '→', readerEmotion.readerEmotionEnd);
console.log('promise chain', promiseLc.stage);
console.log('OK: Reader Addiction module wired');
