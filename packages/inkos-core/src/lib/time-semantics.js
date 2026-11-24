/**
 * F5 — Time Semantics Contract (READ / resolve helpers only)
 *
 * Four distinct semantics — do NOT conflate:
 *
 * 1. Narrative Order  — chapter, scene.index, beat.order
 *    Reader/story sequence. NOT a calendar date. NOT World Event Day.
 *
 * 2. Current Story Clock — resolveStoryClock().canonical
 *    “Now” for the narrative (intent.time / currentDate → prior → 08).
 *    Prefer over historical prior. NOT chapter number.
 *
 * 3. Historical Reference — prior excerpt / old scene text / “六月十七日那天…”
 *    Cited past. Legal context. ≠ current clock.
 *
 * 4. World Event Day — 11_timeline.yaml days[].day when authoritatively known
 *    Occurrence index/date for world events. unknown if unset.
 *    NEVER: chapter N → day N (silent).
 *
 * No Timeline Engine. No occurrence_at / narrated_at dual axis.
 */
import { extractCalendarHints } from './story-clock.js';

export const TIME_SEMANTICS = Object.freeze({
  NARRATIVE_ORDER: 'narrative_order',
  STORY_CLOCK: 'story_clock',
  HISTORICAL_REFERENCE: 'historical_reference',
  WORLD_EVENT_DAY: 'world_event_day',
});

/** Fields that are Narrative Order only — never World Day / Clock */
export const NARRATIVE_ORDER_FIELDS = Object.freeze([
  'chapter',
  'scene.index',
  'beat.order',
]);

/**
 * Extract World Event Day number ONLY from an explicit Day-N time string.
 * Does not accept chapter / scene.index.
 * @returns {number|null}
 */
export function extractExplicitWorldDay(timeStr) {
  if (!timeStr) return null;
  const m = String(timeStr).match(/Day\s*(\d+)/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

/**
 * Resolve World Event Day for 11_timeline entry.
 * F5 contract: never fall back to chapter or scene.index.
 *
 * @param {{ time?: string, currentDate?: string, explicitDay?: number|null, chapter?: number, sceneIndex?: number }} opts
 * @returns {{ day: number|null, status: 'known'|'unknown', source: string }}
 */
export function resolveWorldEventDay(opts = {}) {
  const {
    time,
    currentDate,
    explicitDay = null,
    chapter,
    sceneIndex,
  } = opts;

  // Explicit numeric day (authored) — only if finite and not a disguised chapter alias
  if (explicitDay != null && Number.isFinite(Number(explicitDay))) {
    return {
      day: Number(explicitDay),
      status: 'known',
      source: 'explicit_day',
    };
  }

  const fromTime = extractExplicitWorldDay(time)
    ?? extractExplicitWorldDay(currentDate);
  if (fromTime != null) {
    return {
      day: fromTime,
      status: 'known',
      source: 'intent_time_day_token',
    };
  }

  // Calendar strings (10月27日) are Story Clock material — not silent Day-N indices
  const cal = extractCalendarHints([time, currentDate].filter(Boolean).join(' '));
  if (cal.length && !/^Day\s*\d+$/i.test(cal[0]) && !/^第\d+天$/.test(cal[0])) {
    return {
      day: null,
      status: 'unknown',
      source: 'calendar_string_not_day_index',
    };
  }

  // Explicitly reject narrative order as world day
  void chapter;
  void sceneIndex;

  return {
    day: null,
    status: 'unknown',
    source: 'unavailable',
  };
}

/**
 * 08 / plan “时间” cell — Story Clock string or unknown.
 * Never invent `Day ${chapter}`.
 */
export function resolveStateTimeLabel({ time, currentDate, chapter } = {}) {
  const t = String(time || currentDate || '').trim();
  if (t) return t;
  void chapter;
  return 'unknown';
}

/**
 * Contract: scene.index is narrative order only.
 * @returns {{ semantic: string, isWorldDate: false, isNarrativeOrder: true }}
 */
export function classifySceneIndex(sceneIndex) {
  return {
    value: sceneIndex,
    semantic: TIME_SEMANTICS.NARRATIVE_ORDER,
    isWorldDate: false,
    isNarrativeOrder: true,
    isStoryClock: false,
  };
}

/**
 * Detect forbidden silent alias: worldDay === chapter when day was invented from chapter.
 * Safe when day came from explicit "Day N" in time that happens to equal chapter number.
 */
export function isForbiddenChapterAsWorldDay({ chapter, worldDay, daySource } = {}) {
  if (worldDay == null || chapter == null) return false;
  if (Number(worldDay) !== Number(chapter)) return false;
  // Same number is only forbidden when source was chapter fallback
  return daySource === 'chapter' || daySource === 'chapter_fallback' || daySource === 'day||chapter';
}

export const F5_CONTRACT = Object.freeze({
  noChapterAsWorldDay: true,
  noSceneIndexAsWorldDay: true,
  noDualAxisFields: true,
  storyClockPrecedenceOverHistorical: true,
});
