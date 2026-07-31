/**
 * 商业小说核心驱动力 — Conflict · Climax · Voice DNA
 */
import {
  buildSceneConflict,
  buildChapterClimaxPlan,
  buildSceneExecutionPlan,
  buildChapterDirectorBrief,
  resolveVoiceDna,
  formatVoiceDnaBlock,
  compileLayeredStudioBlock,
  buildWriterExecutionChecklist,
  formatWriterExecutionChecklist,
} from '../packages/inkos-director/src/index.js';
import { compileStudioWriterPrompt } from '../packages/inkos-studio-server/src/writer-optimization/compile-writer-prompt.js';

const storyDna = {
  genre: '近未来科幻悬疑',
  core_hook: '世界每天四点重置',
  main_conflict: '个人意志与系统秩序的对抗',
  protagonist: '林夜',
};

const intent = {
  pov: '林夜',
  mainGoal: '阻止世界重置',
  keyCharacter: '苏晚',
  obstacles: ['系统拒绝跨区处方'],
  sceneCount: 4,
  _storyDna: storyDna,
};

const scenes = [
  {
    index: 4,
    goal: '打开配送网后门',
    obstacle: '门可以打开',
    choice: '开门救人还是保全信用',
    consequence: '开门后妹妹暴露于系统清算',
    newInformation: '四点重置不是故障，是人为设计',
    cliffhanger: '林夜必须在三十秒内决定：上报还是背叛系统',
  },
];

const chapterDir = buildChapterDirectorBrief(intent, 1, { storyDna });
if (!chapterDir.chapterClimax?.maxConflict) {
  console.error('FAIL: chapter climax plan', chapterDir.chapterClimax);
  process.exit(1);
}
if (!chapterDir.brief.includes('Chapter Climax')) {
  console.error('FAIL: chapter brief missing climax');
  process.exit(1);
}

const scene = scenes[0];
const executionPlan = buildSceneExecutionPlan({
  scene: { ...scene, scenePlan: scene },
  intent: { ...intent, scenes },
  chapter: 1,
  storyDna,
  chapterDir,
});

if (!executionPlan.conflict?.valid) {
  console.error('FAIL: conflict should be valid', executionPlan.conflict);
  process.exit(1);
}
const costCorpus = `${executionPlan.conflict.cost}${executionPlan.conflict.loss}`;
if (!/妹妹|代价|关系|信用|生命/u.test(costCorpus)) {
  console.error('FAIL: conflict cost not sacrifice-based', executionPlan.conflict);
  process.exit(1);
}
if (!executionPlan.climaxRole?.isClimax) {
  console.error('FAIL: climax role', executionPlan.climaxRole);
  process.exit(1);
}

const voice = resolveVoiceDna({ storyDna, styleDna: { name: '悬疑紧凑', dimensions: { dialogueRatio: 0.52 } } });
const voiceBlock = formatVoiceDnaBlock(voice);
if (!voiceBlock.includes('不禁') || !voiceBlock.includes('对话比例')) {
  console.error('FAIL: voice dna block');
  process.exit(1);
}

const checklist = formatWriterExecutionChecklist(
  buildWriterExecutionChecklist({ executionPlan, intent, chapter: 1, sceneIndex: 4 }),
);
if (!checklist.includes('代价型冲突') || !checklist.includes('章高潮')) {
  console.error('FAIL: checklist', checklist);
  process.exit(1);
}

const layered = compileLayeredStudioBlock({
  executionPlan,
  voiceDna: voice,
  writerChecklist: checklist,
  policyBlock: 'Writer First',
});
if (!layered.includes('Conflict Engine') || !layered.includes('Climax Scene')) {
  console.error('FAIL: layered prompt missing conflict/climax');
  process.exit(1);
}
if (!layered.includes('Voice DNA')) {
  console.error('FAIL: layered prompt missing voice dna');
  process.exit(1);
}

const compiled = compileStudioWriterPrompt({
  basePrompt: '### base',
  scene,
  chapter: 1,
  intent: { ...intent, scenes },
  ctx: { styleDna: { name: '悬疑', dimensions: { dialogueRatio: 0.5 } } },
  storyDna,
  chapterDir,
});
if (!compiled.prompt.includes('Voice DNA') || !compiled.prompt.includes('代价型冲突')) {
  console.error('FAIL: compiled studio prompt');
  process.exit(1);
}

console.log('conflict cost', executionPlan.conflict.cost.slice(0, 50));
console.log('climax shift', chapterDir.chapterClimax.storyShift.slice(0, 50));
console.log('voice', voice.label, `dialogue ${Math.round(voice.dialogueRatio * 100)}%`);
console.log('OK: commercial core drivers');
