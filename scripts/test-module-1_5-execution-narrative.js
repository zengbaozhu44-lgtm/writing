/**
 * 模块 1.5：ExecutionPlan + Director Narrative 字段
 * 范围：scene-execution / chapter-director / scene-director
 * 禁止：Writer Runtime 挂接、Rewrite、Memory、Promise Registry
 */
import { runChapterDirector } from '../packages/inkos-director/src/chapter-director.js';
import { runSceneDirector, buildScenePlan } from '../packages/inkos-director/src/scene-director.js';
import { buildSceneExecutionPlan } from '../packages/inkos-director/src/scene-execution.js';

const storyDna = { premise: '时间重置', coreMystery: '谁在重置世界', theme: '代价' };
const intent = {
  chapter: 1,
  mainGoal: '进入机房救出妹妹',
  pov: '林夜',
  obstacles: ['权限封锁'],
  sceneCount: 4,
  scenes: [
    { index: 1, goal: '进入机房', conflict: '权限', cliffhanger: '门开了' },
    { index: 2, goal: '读名单', conflict: '异常', cliffhanger: '第三行红' },
  ],
};

const scene = {
  index: 3,
  goal: '救妹妹',
  conflict: '时间不够',
  cliffhanger: '身后有人',
  choice: '冲进去或假装离开',
  cost: '权限暴露',
  consequence: '权限暴露、退路缩短',
  escalation: '倒计时逼近',
  reward: '妹妹瞬息可及',
  wordTarget: 800,
  promisePointer: 'ptr_sis_rescue',
  informationGap: {
    readerKnows: ['门后有埋伏'],
    heroKnows: [],
    enemyKnows: ['林夜已到门口'],
  },
};

const chapterDir = runChapterDirector({ intent, chapter: 1, storyDna });
const requiredChapter = ['chapterInformationGap', 'chapterEmotionWave'];
for (const k of requiredChapter) {
  if (!chapterDir[k]) {
    console.error('FAIL chapter missing', k);
    process.exit(1);
  }
}
if (!chapterDir.brief.includes('信息差铁律')) {
  console.error('FAIL chapter brief');
  process.exit(1);
}

const plan = buildScenePlan(scene, intent, chapterDir);
if (!plan.choice || !plan.escalation || !plan.promisePointer) {
  console.error('FAIL scene plan narrative seeds', plan);
  process.exit(1);
}

const ep = buildSceneExecutionPlan({
  scene: { ...scene, scenePlan: plan },
  intent: { ...intent, scenes: [...intent.scenes, scene] },
  chapter: 1,
  storyDna,
  chapterDir,
});

const nb = ep.narrativeBeatPlan;
const need = ['goal', 'conflict', 'choice', 'cost', 'reward', 'escalation', 'targetEmotion', 'informationGap', 'promisePointer'];
for (const k of need) {
  if (nb[k] == null || nb[k] === '') {
    console.error('FAIL narrativeBeatPlan missing', k, nb);
    process.exit(1);
  }
}
if (ep.promisePointer !== 'ptr_sis_rescue') {
  console.error('FAIL promisePointer lightweight', ep.promisePointer);
  process.exit(1);
}
if (!ep.informationGap?.readerKnows?.includes('门后有埋伏')) {
  console.error('FAIL gap merge from plan', ep.informationGap);
  process.exit(1);
}
if (!ep.emotionWave?.sequence?.length) {
  console.error('FAIL emotion wave', ep.emotionWave);
  process.exit(1);
}
if (!(ep.beats || []).every((b) => b.targetEmotion)) {
  console.error('FAIL beat targetEmotion', ep.beats.map((b) => b.targetEmotion));
  process.exit(1);
}
// 不接 Registry：不得挂 _promiseRegistry
if (ep._promiseRegistry || ep.promiseManager?.promises) {
  console.error('FAIL must not attach Promise Registry', ep.promiseManager);
  process.exit(1);
}

const sceneDir = runSceneDirector({ scene, intent, chapterDir });
if (!sceneDir.brief.includes('Narrative Beat Plan')) {
  console.error('FAIL scene director brief');
  process.exit(1);
}
if (!sceneDir.informationGap || !sceneDir.emotionWave || !sceneDir.narrativeBeatPlan) {
  console.error('FAIL scene director return narrative fields');
  process.exit(1);
}
if (sceneDir.promisePointer !== 'ptr_sis_rescue') {
  console.error('FAIL scene director pointer', sceneDir.promisePointer);
  process.exit(1);
}

console.log('OK module-1.5 execution-narrative', {
  choice: nb.choice.slice(0, 16),
  cost: nb.cost.slice(0, 16),
  reward: String(nb.reward).slice(0, 16),
  escalation: nb.escalation.slice(0, 16),
  targetEmotion: nb.targetEmotion,
  promisePointer: ep.promisePointer,
  wave: ep.emotionWave.sequence.join('→'),
  gapReader: ep.informationGap.readerKnows[0],
});
