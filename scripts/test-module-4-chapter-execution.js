/**
 * 模块 4：Chapter Director → ExecutionPlan 叙事字段下沉
 */
import { runChapterDirector, buildChapterNarrativePlan } from '../packages/inkos-director/src/chapter-director.js';
import { buildSceneExecutionPlan } from '../packages/inkos-director/src/scene-execution.js';
import { buildScenePlan } from '../packages/inkos-director/src/scene-director.js';

const storyDna = { coreMystery: '谁在重置世界', premise: '时间重置' };
const intent = {
  chapter: 2,
  mainGoal: '潜入档案室',
  pov: '林夜',
  obstacles: ['门禁升级', '同伴动摇'],
  sceneCount: 4,
  scenes: [
    { index: 1, goal: '进楼', conflict: '安检' },
    { index: 2, goal: '开锁', conflict: '警报' },
  ],
};

const chapterDir = runChapterDirector({ intent, chapter: 2, storyDna });
const cnp = chapterDir.chapterNarrativePlan;
if (!cnp?.goal || !cnp.choice || !cnp.cost || !cnp.escalation || !cnp.informationGap) {
  console.error('FAIL chapterNarrativePlan', cnp);
  process.exit(1);
}
if (!chapterDir.chapterEmotionWave?.sceneTargets?.length) {
  console.error('FAIL sceneTargets', chapterDir.chapterEmotionWave);
  process.exit(1);
}
if (!chapterDir.brief.includes('章级 Narrative 字段')) {
  console.error('FAIL brief narrative section');
  process.exit(1);
}
if (!chapterDir.promisePointer) {
  console.error('FAIL chapter promisePointer');
  process.exit(1);
}

// 导出函数可独立调用
const standalone = buildChapterNarrativePlan({
  intent,
  chapter: 2,
  mainGoal: 'x',
  obstacles: ['y'],
  chapterInformationGap: chapterDir.chapterInformationGap,
  chapterEmotionWave: chapterDir.chapterEmotionWave,
  chapterPromisePlan: chapterDir.chapterPromisePlan,
});
if (standalone.version !== 'chapter-narrative-plan-1') {
  console.error('FAIL standalone', standalone);
  process.exit(1);
}

const scene = { index: 2, goal: '开锁', wordTarget: 700 };
const plan = buildScenePlan(scene, intent, chapterDir);
const ep = buildSceneExecutionPlan({
  scene: { ...scene, scenePlan: plan },
  intent: { ...intent, scenes: [...intent.scenes, scene] },
  chapter: 2,
  storyDna,
  chapterDir,
});

// P3.3：顶层 choice / narrativeReward 投影已删（0 消费者）。
// choice 本体经 scenePlan.choice / narrativeBeatPlan.choice 保留；reward 读 narrativeBeatPlan.reward。
if (ep.version !== 'scene-execution-10') {
  console.error('FAIL ep version', ep.version);
  process.exit(1);
}
for (const k of ['cost', 'escalation', 'targetEmotion', 'informationGap', 'promisePointer']) {
  if (ep[k] == null || ep[k] === '') {
    console.error('FAIL ep top-level', k, ep[k]);
    process.exit(1);
  }
}
if (!ep.narrativeBeatPlan?.reward) {
  console.error('FAIL reward field');
  process.exit(1);
}
if (ep.emotionWave?.source && !String(ep.emotionWave.source).includes('chapter')) {
  // source may be chapter-director+scene
}
if (!ep.chapterNarrativePlan) {
  console.error('FAIL chapterNarrativePlan not attached');
  process.exit(1);
}
// 章级 Scene2 情绪应对齐 sceneTargets
const expected = chapterDir.chapterEmotionWave.sceneTargets.find((s) => s.sceneIndex === 2)?.targetEmotion;
if (expected && ep.beats[0]?.targetEmotion !== expected && ep.targetEmotion !== expected) {
  // first beat may follow chapter scene target
  if (ep.emotionWave?.sceneTargetEmotion !== expected) {
    console.error('FAIL chapter scene wave sink', {
      expected,
      beat0: ep.beats[0]?.targetEmotion,
      sceneTarget: ep.emotionWave?.sceneTargetEmotion,
    });
    process.exit(1);
  }
}

console.log('OK module-4 chapter→execution', {
  chapterPointer: chapterDir.promisePointer,
  epChoice: String(ep.scenePlan?.choice || ep.narrativeBeatPlan?.choice).slice(0, 24),
  epCost: String(ep.cost).slice(0, 24),
  epTarget: ep.targetEmotion,
  waveSource: ep.emotionWave?.source,
  sceneWave: ep.emotionWave?.sceneTargetEmotion,
});
