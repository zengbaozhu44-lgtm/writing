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

/**
 * Thread Markers — 从共享配置层读取（消除硬编码）
 * @see packages/inkos-core/src/config/director-markers.js
 */
import {
  SUB_THREAD_MARKERS,
  WORLD_THREAD_MARKERS,
  CHARACTER_THREAD_MARKERS,
} from '../../inkos-core/src/config/director-markers.js';

export { SUB_THREAD_MARKERS, WORLD_THREAD_MARKERS, CHARACTER_THREAD_MARKERS };
