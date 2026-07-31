/**
 * Promise Manager 模块 2 冒烟
 */
import {
  createPromiseManager,
  introducePromise,
  markPromisePaid,
  listOverduePromises,
  pickPromisePointer,
  buildScenePromiseLifecycle,
  buildChapterPromisePlan,
  PromiseManager,
} from '../packages/inkos-director/src/promise-lifecycle.js';

let mgr = createPromiseManager();
({ manager: mgr } = introducePromise(mgr, {
  id: 'p_old',
  text: '门后到底是谁',
  introducedBeat: 'beat_1',
  introducedBeatOrder: 1,
  introducedScene: 1,
  chapter: 1,
  expectedPayoff: 'scene_2',
}));

// 未超时
let overdue = listOverduePromises(mgr, { chapter: 1, sceneIndex: 1, beatOrder: 2, overdueScenes: 2, overdueBeats: 6 });
if (overdue.some((p) => p.id === 'p_old')) {
  console.error('FAIL should not be overdue yet', overdue);
  process.exit(1);
}

// Scene 跨度超时
overdue = listOverduePromises(mgr, { chapter: 1, sceneIndex: 4, overdueScenes: 2 });
if (!overdue.length || overdue[0].id !== 'p_old') {
  console.error('FAIL overdue by scene', overdue);
  process.exit(1);
}

const pick = pickPromisePointer(mgr, { chapter: 1, sceneIndex: 4 });
if (pick.promisePointer !== 'p_old' || pick.reason !== 'overdue') {
  console.error('FAIL pointer', pick);
  process.exit(1);
}

({ manager: mgr } = markPromisePaid(mgr, 'p_old', { paidAtBeat: 'beat_9' }));
if (listOverduePromises(mgr, { chapter: 1, sceneIndex: 4 }).length) {
  console.error('FAIL paid should clear overdue');
  process.exit(1);
}

// lifecycle 兼容：种 newPromise 并产出 pointer
const lc = buildScenePromiseLifecycle({
  reward: { valid: true, promise: '救下妹妹', promiseId: 'p_sis', payoff: '妹妹活着醒来' },
  hookOutput: { plantedPromise: '名单第三行是谁' },
  plan: {},
  chapter: 2,
  sceneIndex: 2,
  sceneCount: 4,
  prevScenes: [{
    index: 1,
    executionPlan: { hookOutput: { plantedPromise: '旧坑：电梯密码' } },
  }],
  attachRegistry: true,
});
if (!lc.valid || !lc.promisePointer) {
  console.error('FAIL lifecycle manager attach', lc);
  process.exit(1);
}
if (!lc._promiseRegistry?.promises?.length) {
  console.error('FAIL registry empty', lc._promiseRegistry);
  process.exit(1);
}

const chapterPlan = buildChapterPromisePlan({
  chapter: 3,
  sceneCount: 4,
  intent: {
    scenes: [
      { index: 1, executionPlan: { hookOutput: { plantedPromise: '章初挖的坑' } } },
      { index: 4, scenePlan: { cliffhanger: '章尾钩子' } },
    ],
  },
});
if (!chapterPlan.avoidUnpaidPits || chapterPlan.mustPayoffCount !== 1) {
  console.error('FAIL chapter plan', chapterPlan);
  process.exit(1);
}

if (typeof PromiseManager.create !== 'function') {
  console.error('FAIL PromiseManager facade');
  process.exit(1);
}

console.log('OK promise-manager module-2', {
  pointer: lc.promisePointer,
  registry: lc._promiseRegistry.promises.length,
  chapterOverdue: chapterPlan.overdueCount,
});
