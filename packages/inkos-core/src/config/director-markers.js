/**
 * Director Markers — 共享配置层
 *
 * 所有 Director / Story-Thread 层硬编码词表收敛到此。
 * 支持 book 级覆盖（未来实现）。
 *
 * 迁移自：
 * - packages/inkos-director/src/reader-curve.js
 * - packages/inkos-director/src/hook-rotation.js
 * - packages/inkos-story-thread/src/utils.js
 */

export const DEFAULT_HOOK_MARKERS = /[？?]|吗[？?]?$|呢[？?]?$|能否|会不会|到底|究竟|要不要|难道|突然|猛地|愣住|停住|沉默|抉择|未|还|仍/u;
export const DEFAULT_QUESTION_MARKERS = /[？?]|谁|什么|为什么|为何|怎么|如何|能否|会不会|到底|究竟|难道|是不是|会不会|要不要/u;
export const DEFAULT_PAYOFF_MARKERS = /原来|终于|意味着|证实|揭晓|兑现|呼应|回收|答案|真相|明白了|难怪|怪不得|正如|早就/u;
export const DEFAULT_TWIST_MARKERS = /却|然而|没想到|竟然|居然|反而|竟是|不是.*而是|身份|反转|翻盘|反杀/u;

export const DEFAULT_SUB_THREAD_MARKERS = /支线|与此同时|另一边|顺便|额外|插叙|番外|支线任务|次要|无关/u;
export const DEFAULT_WORLD_THREAD_MARKERS = /世界观|设定|系统|规则|协议|算法|机制|背景|历史上|未来|城市|AI/u;
export const DEFAULT_CHARACTER_THREAD_MARKERS = /心里|情绪|关系|信任|恐惧|愤怒|犹豫|抉择|性格|成长|回忆/u;

export const DEFAULT_BEAT_HOOK_TYPES = Object.freeze([
  'Curiosity',
  'Danger',
  'Cost',
  'Truth',
  'Pressure',
  'Irony',
  'Promise',
  'PointOfNoReturn',
]);

export const DEFAULT_STRUCTURAL_DEFAULT_HOOK = Object.freeze({
  goal: 'Curiosity',
  escalation: 'Danger',
  newInformation: 'Truth',
  choice: 'Cost',
  consequence: 'Pressure',
  hook: 'Promise',
});

/**
 * 获取 Director Markers（当前返回默认值，未来支持 book 覆盖）
 * @param {string} [bookDir]
 * @returns {object}
 */
export function getDirectorMarkers(bookDir = null) {
  void bookDir;
  return {
    hook: DEFAULT_HOOK_MARKERS,
    question: DEFAULT_QUESTION_MARKERS,
    payoff: DEFAULT_PAYOFF_MARKERS,
    twist: DEFAULT_TWIST_MARKERS,
    subThread: DEFAULT_SUB_THREAD_MARKERS,
    worldThread: DEFAULT_WORLD_THREAD_MARKERS,
    characterThread: DEFAULT_CHARACTER_THREAD_MARKERS,
    beatHookTypes: DEFAULT_BEAT_HOOK_TYPES,
    structuralDefaultHook: DEFAULT_STRUCTURAL_DEFAULT_HOOK,
  };
}

export {
  DEFAULT_HOOK_MARKERS as HOOK_MARKERS,
  DEFAULT_QUESTION_MARKERS as QUESTION_MARKERS,
  DEFAULT_PAYOFF_MARKERS as PAYOFF_MARKERS,
  DEFAULT_TWIST_MARKERS as TWIST_MARKERS,
  DEFAULT_SUB_THREAD_MARKERS as SUB_THREAD_MARKERS,
  DEFAULT_WORLD_THREAD_MARKERS as WORLD_THREAD_MARKERS,
  DEFAULT_CHARACTER_THREAD_MARKERS as CHARACTER_THREAD_MARKERS,
  DEFAULT_BEAT_HOOK_TYPES as BEAT_HOOK_TYPES,
  DEFAULT_STRUCTURAL_DEFAULT_HOOK as STRUCTURAL_DEFAULT_HOOK,
};
