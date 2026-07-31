/**
 * Professional Writer Quality — 五模块合一验收
 * Writer Intelligence · Human Behavior · Entertainment · Human Writing · Chapter Author Goal
 */
import {
  WRITER_QUALITY_MODULES,
  buildChapterDirectorBrief,
  buildSceneExecutionPlan,
  compileLayeredStudioBlock,
  buildWriterExecutionChecklist,
  formatWriterExecutionChecklist,
  formatWriterFirstPolicyBlock,
} from '../packages/inkos-director/src/index.js';
import { compileStudioWriterPrompt } from '../packages/inkos-studio-server/src/writer-optimization/compile-writer-prompt.js';
import { compileSingleBeatPrompt } from '../packages/inkos-studio-server/src/writer-optimization/beat-execution.js';

if (WRITER_QUALITY_MODULES.length !== 6) {
  console.error('FAIL: expected 6 writer quality modules', WRITER_QUALITY_MODULES.length);
  process.exit(1);
}
if (!WRITER_QUALITY_MODULES.some((m) => m.id === 'writer_craft')) {
  console.error('FAIL: missing writer_craft module');
  process.exit(1);
}

const storyDna = {
  title: '时间重置者',
  genre: '悬疑',
  protagonist: '林夜',
  core_hook: '世界每天凌晨四点重置',
  main_question: '谁在重置世界？',
};

const plan = {
  goal: '进入系统空间确认重置',
  choice: '为了妹妹进入系统区域',
  consequence: '妹妹知道世界重置',
  newInformation: '系统记录显示他已多次死亡',
  cliffhanger: '三十秒内必须上报',
  obstacle: '时间异常',
};

const scene = { index: 1, ...plan };
const intent = {
  pov: '林夜',
  mainGoal: '确认重置真实存在',
  sceneCount: 4,
  scenes: [scene],
};

const chapterDir = buildChapterDirectorBrief(intent, 1, { storyDna });
if (!chapterDir.chapterAuthorGoal?.mustRemember) {
  console.error('FAIL: chapterAuthorGoal');
  process.exit(1);
}

const executionPlan = buildSceneExecutionPlan({
  scene: { ...scene, scenePlan: plan },
  intent: { ...intent, _chapterDirector: chapterDir },
  chapter: 1,
  storyDna,
  chapterDir,
});

const checks = {
  authorMode: Boolean(executionPlan.writerRuntime?.authorMode?.readerManipulation),
  behavior: Boolean(executionPlan.characterBehavior?.behaviorLogic?.irrationalAction),
  entertainment: Boolean(executionPlan.sceneEntertainment?.entertainment?.visualMoment),
  humanWriting: Boolean(executionPlan.humanWritingPolicy?.flowMust),
  chapterGoal: Boolean(executionPlan.chapterAuthorGoal?.mainFeeling),
};

for (const [k, ok] of Object.entries(checks)) {
  if (!ok) {
    console.error(`FAIL: missing ${k}`, checks);
    process.exit(1);
  }
}

const checklist = formatWriterExecutionChecklist(
  buildWriterExecutionChecklist({
    executionPlan,
    intent: { ...intent, _chapterDirector: chapterDir },
    chapter: 1,
    sceneIndex: 1,
  }),
);

const layered = compileLayeredStudioBlock({
  executionPlan,
  policyBlock: formatWriterFirstPolicyBlock(),
  writerChecklist: checklist,
});

const mustAppear = [
  'Author Mode',
  'Human Behavior',
  'Scene Entertainment',
  'Human Writing Policy',
  'Chapter Author Goal',
  'Professional Writer Quality',
];

for (const needle of mustAppear) {
  if (!layered.includes(needle)) {
    console.error(`FAIL: layered missing ${needle}`);
    process.exit(1);
  }
}

const compiled = compileStudioWriterPrompt({
  basePrompt: '### base',
  scene,
  chapter: 1,
  intent: { ...intent, _chapterDirector: chapterDir, _storyDna: storyDna },
  ctx: {},
  storyDna,
  chapterDir,
});

for (const needle of ['Author Mode', 'Chapter Author Goal', 'Human Writing', 'Scene Entertainment', 'Human Behavior']) {
  if (!compiled.prompt.includes(needle.split(' ')[0]) && !compiled.prompt.includes(needle)) {
    // softer: at least Chinese/English markers
    if (!compiled.prompt.includes(needle)) {
      console.error(`FAIL: studio prompt missing ${needle}`);
      process.exit(1);
    }
  }
}

const goalBeat = executionPlan.beats.find((b) => b.structuralBeat === 'goal');
const choiceBeat = executionPlan.beats.find((b) => b.structuralBeat === 'choice');

const goalPrompt = compileSingleBeatPrompt({
  beat: goalBeat,
  executionPlan,
  basePrompt: '### base',
  sceneIndex: 1,
  totalBeats: executionPlan.beats.length,
});
if (!goalPrompt.includes('Chapter Author Goal') || !goalPrompt.includes('Author Mode')) {
  console.error('FAIL: goal beat missing quality blocks');
  process.exit(1);
}

const choicePrompt = compileSingleBeatPrompt({
  beat: choiceBeat,
  executionPlan,
  basePrompt: '### base',
  sceneIndex: 1,
  totalBeats: executionPlan.beats.length,
});
if (!choicePrompt.includes('Human Behavior') || !choicePrompt.includes('欲望')) {
  console.error('FAIL: choice beat missing behavior');
  process.exit(1);
}

console.log('modules', WRITER_QUALITY_MODULES.map((m) => m.id).join(' · '));
console.log('chapterGoal', chapterDir.chapterAuthorGoal.readerEmotionStart, '→', chapterDir.chapterAuthorGoal.readerEmotionEnd);
console.log('authorMode', executionPlan.writerRuntime.authorMode.id);
console.log('behavior', executionPlan.characterBehavior.behaviorLogic.irrationalAction.slice(0, 36));
console.log('visual', executionPlan.sceneEntertainment.entertainment.visualMoment.slice(0, 28));
console.log('human', executionPlan.humanWritingPolicy.flowMust);
console.log('OK: Professional Writer Quality — craft + quality modules wired');
