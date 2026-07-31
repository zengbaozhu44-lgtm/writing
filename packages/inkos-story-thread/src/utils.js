export const THREAD_TYPES = ['main', 'sub', 'world', 'character'];

export const MAIN_PROGRESS_MIN = 5;
export const MAX_SUB_THREAD_RATIO = 0.2;
export const CONSECUTIVE_LOW_MAIN_SCENES = 2;

export function charCount(text) {
  return String(text || '').replace(/\s/g, '').length;
}

export function splitSentences(text) {
  return String(text || '')
    .split(/(?<=[。！？!?…])\s*|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 从主线描述提取关键词（2~4 字中文） */
export function extractMainKeywords(intent = {}, storyDna = {}) {
  const corpus = [
    intent.mainGoal,
    intent.chapterIntent,
    storyDna?.core_hook,
    storyDna?.main_conflict,
    storyDna?.main_question,
    intent.volumeGoals?.[0],
  ].filter(Boolean).join(' ');

  const words = new Set();
  const re = /[\u4e00-\u9fa5]{2,4}/g;
  let m;
  while ((m = re.exec(corpus)) !== null) {
    const w = m[0];
    if (!/因此|所以|一个|这种|他们|我们|可以|已经|进行|通过|展现|之间|做出|选择|必须|系统|规则|揭示/.test(w)) {
      words.add(w);
    }
  }
  return [...words].slice(0, 12);
}

export const SUB_THREAD_MARKERS = /支线|与此同时|另一边|顺便|额外|插叙|番外|支线任务|次要|无关/u;
export const WORLD_THREAD_MARKERS = /世界观|设定|系统|规则|协议|算法|机制|背景|历史上|2055|未来|城市|AI/u;
export const CHARACTER_THREAD_MARKERS = /心里|情绪|关系|信任|恐惧|愤怒|犹豫|抉择|性格|成长|回忆/u;
