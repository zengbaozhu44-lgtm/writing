/**
 * Phase 1.R — Story calendar lock (Prompt/Context only).
 * Not an SR field. Not Reality Authority.
 *
 * Resolves a single chapter-local calendar lock from prior prose / summaries /
 * intent / 08 state when a calendar-like date is already established.
 * Prevents Writer inventing conflicting calendar dates (R2-B1).
 */

const CALENDAR_RE = [
  /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/,
  /([一二三四五六七八九十]+|\d{1,2})\s*月\s*([一二三四五六七八九十]+|\d{1,2})\s*日/,
  /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/,
  /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/,
];

const DAY_ONLY_RE = /^Day\s*\d+$/i;

function norm(v) {
  return String(v || '').trim();
}

/**
 * @param {string} text
 * @returns {string|null} first calendar-like date phrase
 */
export function extractFirstCalendarDate(text = '') {
  const s = String(text || '');
  if (!s) return null;
  for (const re of CALENDAR_RE) {
    const m = s.match(re);
    if (m) return m[0].replace(/\s+/g, '');
  }
  return null;
}

/**
 * @param {{
 *   ctx?: object,
 *   scene?: object,
 *   summaries?: Array<{ summary?: string }>,
 *   priorTexts?: string[],
 * }} args
 */
export function resolveStoryCalendarLock({
  ctx = {},
  scene = {},
  summaries = [],
  priorTexts = [],
} = {}) {
  const sources = [];

  for (const t of priorTexts || []) {
    const d = extractFirstCalendarDate(t);
    if (d) sources.push({ date: d, source: 'prior_scene_text' });
  }
  for (const s of summaries || []) {
    const d = extractFirstCalendarDate(s?.summary || s?.text || '');
    if (d) sources.push({ date: d, source: 'prior_scene_summary' });
  }

  const intentDate = norm(ctx.intent?.currentDate || ctx.intent?.time || scene.currentDate);
  if (intentDate && !DAY_ONLY_RE.test(intentDate) && extractFirstCalendarDate(intentDate)) {
    sources.push({ date: extractFirstCalendarDate(intentDate) || intentDate, source: 'intent' });
  } else if (intentDate && !DAY_ONLY_RE.test(intentDate) && /月|日|year|Year|\d{4}/.test(intentDate)) {
    sources.push({ date: intentDate, source: 'intent' });
  }

  const stateTime = norm(ctx.state?.['时间'] || ctx.state?.time);
  if (stateTime && !DAY_ONLY_RE.test(stateTime)) {
    const d = extractFirstCalendarDate(stateTime) || (/月|日|\d{4}/.test(stateTime) ? stateTime : null);
    if (d) sources.push({ date: d, source: '08_current_state' });
  }

  const locked = sources[0] || null;
  const dayLabel = DAY_ONLY_RE.test(stateTime) ? stateTime : (DAY_ONLY_RE.test(intentDate) ? intentDate : null);

  return {
    lockedDate: locked?.date || null,
    lockedSource: locked?.source || null,
    dayLabel: dayLabel || null,
    candidates: sources,
  };
}

/**
 * Writer-facing calendar lock block.
 */
export function formatStoryCalendarLock(lock = {}) {
  const lines = [
    '### Story Calendar Lock',
    '- 同一章连续 Scene 必须共用同一故事历法。',
    '- 禁止无依据地另造冲突公历（例如上一场已是「六月十七日」，下一场不得写成「10月14日」）。',
  ];
  if (lock.lockedDate) {
    lines.push(`- **已锁定公历**：${lock.lockedDate}（来源：${lock.lockedSource || 'prior'}）`);
    lines.push('- 本 Scene 凡出现具体日期，必须与此锁定一致，除非本场剧情明确发生「日期回退/刷新」且写出可见依据。');
  } else if (lock.dayLabel) {
    lines.push(`- **当前仅有运营日标签**：${lock.dayLabel}（非公历）`);
    lines.push('- 若必须写公历：全章第一次写出后须前后一致；不得在后续 Scene 改换成另一套月日。');
  } else {
    lines.push('- 尚无已锁定公历：若本场首次写出具体月日，后续 Scene 必须继承，不得无故更换。');
  }
  return lines.join('\n');
}
