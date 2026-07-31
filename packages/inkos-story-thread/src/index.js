/**
 * @inkos/story-thread — Story Thread Engine（主线控制）
 *
 * 维护 Main / Sub / World / Character 四条线程进度。
 * 每 Scene 结束检查主线推进；连续 2 Scene 主线 <5% 触发 Replan。
 */
export {
  runStoryThreadAfterScene,
  buildStoryProgressReport,
} from './engine.js';

export { analyzeSceneThreads } from './threads.js';

export {
  loadStoryThreadState,
  saveStoryThreadState,
  persistStoryProgressReport,
  getStoryThreadDir,
} from './state.js';

export {
  THREAD_TYPES,
  MAIN_PROGRESS_MIN,
  MAX_SUB_THREAD_RATIO,
  CONSECUTIVE_LOW_MAIN_SCENES,
} from './utils.js';
