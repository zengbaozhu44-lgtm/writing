/**
 * Chapter Author Goal 快速验证
 */
import {
  buildChapterAuthorGoal,
  buildChapterDirectorBrief,
  formatChapterAuthorGoalBlock,
} from '../packages/inkos-director/src/index.js';

const storyDna = {
  protagonist: '林夜',
  core_hook: '世界四点重置',
  main_question: '谁在重置世界？',
};

const g1 = buildChapterAuthorGoal({
  chapter: 1,
  intent: { pov: '林夜', mainGoal: '确认重置' },
  storyDna,
});

if (g1.readerEmotionStart !== '好奇' || g1.readerEmotionEnd !== '恐惧') {
  console.error('FAIL: ch1 emotions', g1);
  process.exit(1);
}
if (!/不是唯一被重置|更危险/u.test(`${g1.mustRemember}${g1.mainFeeling}`)) {
  console.error('FAIL: ch1 content', g1);
  process.exit(1);
}

const g2 = buildChapterAuthorGoal({
  chapter: 2,
  intent: { pov: '林夜' },
  storyDna,
  priorGoal: g1,
});
if (g2.readerEmotionStart !== '恐惧') {
  console.error('FAIL: ch2 should continue from ch1 end', g2);
  process.exit(1);
}

const brief = buildChapterDirectorBrief(
  { pov: '林夜', mainGoal: '确认重置', sceneCount: 4 },
  1,
  { storyDna },
);
if (!brief.chapterAuthorGoal?.mustRemember) {
  console.error('FAIL: chapter director missing author goal');
  process.exit(1);
}
if (!formatChapterAuthorGoalBlock(brief.chapterAuthorGoal).includes('Chapter Author Goal')) {
  console.error('FAIL: format');
  process.exit(1);
}
if (!brief.brief.includes('Chapter Author Goal')) {
  console.error('FAIL: brief missing author goal block');
  process.exit(1);
}

console.log('ch1', g1.readerEmotionStart, '→', g1.readerEmotionEnd, g1.mustRemember);
console.log('OK: Chapter Author Goal');
