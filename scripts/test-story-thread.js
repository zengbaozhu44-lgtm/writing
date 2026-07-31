/**
 * @inkos/story-thread 单元验证
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  analyzeSceneThreads,
  runStoryThreadAfterScene,
  MAIN_PROGRESS_MIN,
  CONSECUTIVE_LOW_MAIN_SCENES,
} from '../packages/inkos-story-thread/src/index.js';

const intent = {
  mainGoal: '林晓必须在维修任务与取药之间做出选择，揭示系统僵化',
  chapterIntent: '展现维修工林晓在系统规则与人性需求之间的博弈',
  pov: '林晓',
};

const storyDna = {
  core_hook: '个体在AI系统缝隙中生存',
  main_conflict: '系统效率与人性需求',
};

const goodText = `
林晓推开维修舱门，必须在六台机器人维修与女儿取药之间分配时间。系统拒绝跨区处方，他不得不寻找社区管理员手动授权。冲突不断升级，信用档案被永久标记——这正是主线要揭示的系统僵化。
`;

const lowMainText = `
天空灰蓝，空气里有消毒水味。街道两侧玻璃幕墙反射柔白阳光。远处建筑群像沉默纪念碑，温度由中央调节。人们习惯便利，很少思考背后意味着什么。因此社会呈现表面稳定，本质上却是被精密计算的平衡。
`;

const subHeavyText = `
林晓开始维修。与此同时，另一边的外卖员张北在老旧小区送餐。支线任务里，张北与数字隔离户老人交谈，这是额外的插叙。顺便一提，社区花园里的机器人也在另一场无关事件里故障。
`;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-thread-'));
const scene = { index: 1, id: 'ch1_s1', goal: intent.mainGoal };

const good = analyzeSceneThreads(goodText, scene, intent, storyDna);
const low = analyzeSceneThreads(lowMainText, scene, intent, storyDna);
const sub = analyzeSceneThreads(subHeavyText, scene, intent, storyDna);

console.log('good main', good.mainProgress, 'sub%', good.subPercent);
console.log('low main', low.mainProgress);
console.log('sub heavy', sub.subPercent, 'failures', sub.failures.length);

const r1 = runStoryThreadAfterScene({
  bookDir: tmp,
  chapter: 1,
  scene,
  intent,
  storyDna,
  sceneResult: { scene: { ...scene, text: lowMainText } },
});

const r2 = runStoryThreadAfterScene({
  bookDir: tmp,
  chapter: 1,
  scene: { ...scene, index: 2, id: 'ch1_s2' },
  intent,
  storyDna,
  sceneResult: { scene: { text: lowMainText } },
});

console.log('consecutive replan', r2.shouldReplan, r2.replanReason);
console.log('report exists', fs.existsSync(r2.reportPath));

if (good.mainProgress < MAIN_PROGRESS_MIN) {
  console.error('FAIL: good text should advance main thread');
  process.exit(1);
}
if (low.mainProgress >= MAIN_PROGRESS_MIN) {
  console.error('FAIL: lore-only should have low main progress');
  process.exit(1);
}
if (!sub.failures.some((f) => f.includes('支线'))) {
  console.error('FAIL: sub-heavy should fail sub ratio');
  process.exit(1);
}
if (!r2.shouldReplan) {
  console.error('FAIL: two low-main scenes should trigger replan');
  process.exit(1);
}
if (!r2.reportPath?.endsWith('story_progress.json')) {
  console.error('FAIL: story_progress.json not written');
  process.exit(1);
}
console.log('OK', { MAIN_PROGRESS_MIN, CONSECUTIVE_LOW_MAIN_SCENES });
