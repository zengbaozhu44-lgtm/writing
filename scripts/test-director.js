/**
 * @inkos/director 单元验证 — 商业导演 Review + Reader Curve
 */
import {
  runStoryDirector,
  runChapterDirector,
  runSceneDirector,
  runSceneReview,
  runChapterReview,
  computeSceneQualityScore,
  resolveReviewWeights,
  REVIEW_PASS_MIN,
  REVIEW_WARNING_MIN,
  COMMERCIAL_REVIEW_DIMENSIONS,
  buildReaderCurveReport,
} from '../packages/inkos-director/src/index.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const scene = {
  index: 1,
  id: 'ch1_s1',
  goal: '林晓必须在维修与取药之间抉择',
  conflict: '系统拒绝跨区处方',
  obstacle: '系统拒绝跨区处方',
  escalation: '信用档案亮黄灯，选择收窄',
  newInformation: '配送网传传单阴谋',
  cliffhanger: '上报还是假装没看见？',
};

const intent = { pov: '林晓', mainGoal: scene.goal, obstacles: [scene.conflict], sceneCount: 4 };

const goodText = `
林晓推开维修舱门，工具箱砸在脚边——他迟到了。

「还有几台？」调度 AI 的声音没有起伏。

「三台。」他抹了把汗，「但我女儿的药——」

「规则优先。」AI 打断他。

林晓攥紧扳手，心里一沉，却又烧起一股怒意。十五分钟前药房 AI 拒了药；现在信用档案亮黄灯，他必须在完成维修与赶去授权之间选一条路——而系统还在不断加码。

他深吸一口气，转向最后一台机器人。芯片里跳出未加密日志：有人要在共识日利用配送网传传单。林晓盯着屏幕，指尖发冷——他到底该上报，还是假装没看见？
`;

const badText = `
2055 年的城市在算法下运行。天空是灰蓝色的，空气里带着消毒水的味道。街道两侧是整齐的玻璃幕墙，阳光被过滤成一种柔和的白。系统每天推送最优路线，健康评分决定你能买什么、住哪里。这是一个被精密优化的未来，每个人都生活在数据编织的网里，历史告诉我们这种秩序源于上世纪末的协议与算法机制。城市的轮廓在晨雾中缓缓展开，远处的建筑群像沉默的纪念碑。空气里弥漫着一种被过滤过的清新，温度湿度都由中央系统调节。人们习惯了这种便利，很少去想背后的规则意味着什么。因此整个社会呈现出一种表面上的稳定，本质上却是被精密计算的平衡。所谓个体选择，指的是在系统给出的选项里挑选最优解。背景是这样形成的：算法接管了交通、医疗、教育和信用。机制确保了效率，协议约束了越界行为。设定上的铁律是任何偏离都会被评分系统记录。世界观在此展开，像一层透明的罩子扣在每个人肩上。
`;

const story = runStoryDirector({ storyDna: { core_hook: '切片人生', genre: '科幻' } });
const chapter = runChapterDirector({ intent, chapter: 1 });
const sceneDir = runSceneDirector({ scene, intent });

if (!story.brief.includes('Reader Addiction')) {
  console.error('FAIL: story director should prioritize Reader Addiction');
  process.exit(1);
}
if (!chapter.hookCurve?.length || !chapter.mysteryCurve?.length) {
  console.error('FAIL: chapter director curves missing', chapter);
  process.exit(1);
}
if (!sceneDir.scenePlan?.goal || !sceneDir.scenePlan?.cliffhanger) {
  console.error('FAIL: scene director five elements', sceneDir.scenePlan);
  process.exit(1);
}

const goodQuality = computeSceneQualityScore({
  text: goodText,
  scene,
  intent,
  storyDna: { genre: '科幻悬疑', commercial_direction: '悬疑揭秘流' },
});
const badQuality = computeSceneQualityScore({
  text: badText,
  scene,
  intent,
  storyDna: { genre: '科幻悬疑', commercial_direction: '悬疑揭秘流' },
});

if (goodQuality.weightedScore == null || !goodQuality.weights?.hookDensity) {
  console.error('FAIL: weighted score / commercial weights missing', goodQuality);
  process.exit(1);
}

for (const dim of COMMERCIAL_REVIEW_DIMENSIONS) {
  if (goodQuality.scores[dim] == null) {
    console.error('FAIL: missing commercial dimension', dim);
    process.exit(1);
  }
}

if (goodQuality.weightedScore < REVIEW_WARNING_MIN) {
  console.error('FAIL: good sample should score >= warning', goodQuality);
  process.exit(1);
}
if (badQuality.weightedScore >= REVIEW_PASS_MIN) {
  console.error('FAIL: bad sample should score below pass', badQuality);
  process.exit(1);
}

const goodReview = runSceneReview({ text: goodText, scene, intent, chapter: 1 });
const badReview = runSceneReview({ text: badText, scene, intent, chapter: 1 });

if (!['pass', 'warning'].includes(goodReview.verdict)) {
  console.error('FAIL: good review verdict', goodReview.verdict, goodReview.total);
  process.exit(1);
}
if (badReview.verdict !== 'retry') {
  console.error('FAIL: bad review should be retry', badReview.verdict, badReview.total);
  process.exit(1);
}
if (goodReview.version !== 'scene-review-4') {
  console.error('FAIL: scene review version');
  process.exit(1);
}
if (!goodReview.readerCurves?.summary) {
  console.error('FAIL: reader curves missing');
  process.exit(1);
}

const weights = resolveReviewWeights({ genre: '商业科幻' });
if (weights.profile !== 'commercial' && weights.weights.hookDensity < 0.15) {
  console.error('FAIL: commercial genre weights', weights);
  process.exit(1);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-dir-review-'));
runSceneReview({ text: badText, scene, intent, chapter: 1, bookDir: tmp });
const chapterReview = runChapterReview({ bookDir: tmp, chapter: 1, scenes: [scene], intent });

if (!chapterReview.readerCurveReport?.nextChapterGuidance?.length) {
  console.error('FAIL: reader curve report missing', chapterReview);
  process.exit(1);
}
if (!chapterReview.readerCurvePath?.endsWith('reader_curve_report.json')) {
  console.error('FAIL: reader curve report not persisted');
  process.exit(1);
}

const curve = buildReaderCurveReport([badReview], { chapter: 1, curvePlan: chapter.curvePlan });
if (!curve.nextChapterGuidance?.length) {
  console.error('FAIL: buildReaderCurveReport');
  process.exit(1);
}

console.log('good', goodReview.total, goodReview.verdict, goodReview.scores.hookDensity);
console.log('bad', badReview.total, badReview.verdict);
console.log('guidance', chapterReview.nextChapterGuidance?.[0]);
console.log('OK');
