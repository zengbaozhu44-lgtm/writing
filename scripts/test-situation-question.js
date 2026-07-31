/**
 * Situation Engine + Question Engine 单元验证
 */
import {
  buildSceneSituation,
  runChapterDirector,
  runSceneDirector,
} from '../packages/inkos-director/src/index.js';
import { compileSingleBeatPrompt } from '../packages/inkos-studio-server/src/writer-optimization/beat-execution.js';

const storyDna = { main_question: '为什么世界每天都会重置？' };
const intent = {
  pov: '林夜',
  mainGoal: '弄清世界异常',
  sceneCount: 4,
  mainQuestion: '为什么世界每天都会重置？',
};

const chapterDir = runChapterDirector({ intent, chapter: 1, storyDna });
if (!chapterDir.bookQuestion || chapterDir.bookQuestion.indexOf('重置') < 0) {
  console.error('FAIL: book question', chapterDir.bookQuestion);
  process.exit(1);
}
if (!chapterDir.chapterQuestion) {
  console.error('FAIL: chapter question missing');
  process.exit(1);
}

const scene1 = {
  index: 1,
  goal: '林夜认为世界正常，只想修好闹钟',
  newInformation: '林夜确认世界每天四点都会重置',
  consequence: '林夜再也无法假装一切正常',
  cliffhanger: '镜子上的血字是谁写的？',
  openingWorldState: '林夜认为世界正常',
  closingWorldState: '林夜确认世界每天四点都会重置',
};

const sceneDir = runSceneDirector({ scene: scene1, intent, chapterDir });
const plan = sceneDir.scenePlan;
const sit = plan.situation || {};

if (!sit.openingWorldState || !sit.closingWorldState) {
  console.error('FAIL: situation missing', sit);
  process.exit(1);
}
if (sit.openingWorldState === sit.closingWorldState) {
  console.error('FAIL: situation should differ');
  process.exit(1);
}
const qs = plan.questions || {};
if (!qs.bookQuestion || !qs.sceneQuestion) {
  console.error('FAIL: questions missing', qs);
  process.exit(1);
}
if (!qs.newQuestions || qs.newQuestions.length < 2) {
  console.error('FAIL: need 2 new questions', qs);
  process.exit(1);
}

const stagnant = buildSceneSituation({
  scene: { goal: '调查异常', newInformation: '发现异常' },
  intent,
  plan: { goal: '调查异常', newInformation: '发现异常' },
});
if (!stagnant.stagnant) {
  console.error('FAIL: should detect stagnant investigation', stagnant);
  process.exit(1);
}

const exec = sceneDir.executionPlan;
if (!exec.situation || !exec.questions) {
  console.error('FAIL: execution plan missing engines');
  process.exit(1);
}
const firstBeat = exec.beatStatePlans && exec.beatStatePlans[0];
if (!firstBeat || firstBeat.beforeState !== sit.openingWorldState) {
  console.error('FAIL: beat chain should start from opening state', firstBeat);
  process.exit(1);
}

const hookBeat = exec.beats.find((b) => b.structuralBeat === 'hook');
const prompt = compileSingleBeatPrompt({
  beat: hookBeat,
  executionPlan: exec,
  basePrompt: 'base',
  accumulatedText: '前文',
  sceneIndex: 1,
  totalBeats: 6,
});
if (prompt.indexOf('Question Engine') < 0 || prompt.indexOf('Situation Engine') < 0) {
  console.error('FAIL: beat prompt missing engines');
  process.exit(1);
}
if (prompt.indexOf('提出新问题') < 0) {
  console.error('FAIL: hook beat should remind new questions');
  process.exit(1);
}

const scene2 = {
  index: 2,
  goal: '查清镜子血字来源',
  newInformation: '血字是系统留下的警告',
  cliffhanger: '系统为什么要警告林夜？',
};
const sceneDir2 = runSceneDirector({
  scene: scene2,
  intent: { ...intent, scenes: [scene1, scene2], _chapterDirector: chapterDir },
  chapterDir,
});
if (!sceneDir2.scenePlan.questions.answeredQuestion) {
  console.error('FAIL: scene2 should have answer target');
  process.exit(1);
}

console.log('situation', sit.openingWorldState.slice(0, 20), '→', sit.closingWorldState.slice(0, 20));
console.log('questions', qs.sceneQuestion);
console.log('OK');
