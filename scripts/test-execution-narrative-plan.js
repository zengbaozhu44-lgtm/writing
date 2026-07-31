/**
 * Module 4：ExecutionPlan InformationGap + Emotion Wave + NarrativeBeatPlan
 */
import { runChapterDirector } from '../packages/inkos-director/src/chapter-director.js';
import { buildScenePlan } from '../packages/inkos-director/src/scene-director.js';
import { buildSceneExecutionPlan } from '../packages/inkos-director/src/scene-execution.js';

const storyDna = { premise: '时间重置', coreMystery: '谁在重置世界', theme: '代价' };
const intent = {
  chapter: 1,
  chapterTitle: '重置',
  mainGoal: '进入机房救出妹妹',
  pov: '林夜',
  obstacles: ['权限封锁'],
  sceneCount: 4,
  scenes: [
    { index: 1, goal: '进入机房', conflict: '权限', cliffhanger: '门开了' },
    { index: 2, goal: '读名单', conflict: '发现异常', cliffhanger: '第三行红色' },
  ],
};
const scene = {
  index: 3,
  goal: '救妹妹',
  conflict: '时间不够',
  cliffhanger: '身后有人',
  wordTarget: 800,
  choice: '冲进去或假装离开',
  consequence: '权限暴露、退路缩短',
};

const chapterDir = runChapterDirector({ intent, chapter: 1, storyDna });
if (!chapterDir.chapterInformationGap || !chapterDir.chapterEmotionWave?.sequence?.length) {
  console.error('FAIL chapter narrative fields', {
    gap: chapterDir.chapterInformationGap,
    wave: chapterDir.chapterEmotionWave,
  });
  process.exit(1);
}
if (!chapterDir.brief.includes('信息差铁律') || !chapterDir.brief.includes('Emotion Wave')) {
  console.error('FAIL chapter brief missing narrative rules');
  process.exit(1);
}

const plan = buildScenePlan(scene, intent);
const ep = buildSceneExecutionPlan({
  scene: { ...scene, scenePlan: plan },
  intent: { ...intent, scenes: [...intent.scenes, scene] },
  chapter: 1,
  storyDna,
  chapterDir,
});

if (ep.version !== 'scene-execution-9' && ep.version !== 'scene-execution-8') {
  console.error('FAIL version', ep.version);
  process.exit(1);
}
if (!ep.informationGap?.readerKnows || !ep.narrativeBeatPlan?.goal) {
  console.error('FAIL ep narrative', {
    gap: ep.informationGap,
    narrative: ep.narrativeBeatPlan,
  });
  process.exit(1);
}
if (!ep.emotionWave?.sequence?.length) {
  console.error('FAIL emotionWave', ep.emotionWave);
  process.exit(1);
}

const withTarget = (ep.beats || []).filter((b) => b.targetEmotion);
if (withTarget.length < 4) {
  console.error('FAIL beats missing targetEmotion', ep.beats.map((b) => b.targetEmotion));
  process.exit(1);
}

const same = ep.informationGap.readerKnows.join('|') === ep.informationGap.heroKnows.join('|')
  && ep.informationGap.heroKnows.join('|') === ep.informationGap.enemyKnows.join('|')
  && ep.informationGap.readerKnows.length > 0;
if (same) {
  console.error('FAIL informationGap identical sets', ep.informationGap);
  process.exit(1);
}

if (!ep.rules.some((r) => r.includes('信息差铁律'))) {
  console.error('FAIL rules missing gap iron rule');
  process.exit(1);
}

console.log('OK execution-plan module-4', {
  version: ep.version,
  wave: ep.emotionWave.sequence.join('→'),
  gapValid: ep.informationGap.valid,
  beatEmotions: ep.beats.map((b) => b.targetEmotion),
  narrative: {
    goal: ep.narrativeBeatPlan.goal?.slice(0, 20),
    choice: ep.narrativeBeatPlan.choice?.slice(0, 20),
    cost: ep.narrativeBeatPlan.cost?.slice(0, 20),
  },
});
