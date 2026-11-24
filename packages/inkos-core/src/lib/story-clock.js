/**
 * Phase 1.R — Story Clock (R2-B1)
 *
 * Plan/State date consistency for Writer prompts.
 * NOT an SR field. NOT Reality Authority.
 * NOT chapter / scene.index (those are Narrative Order — see time-semantics.js F5).
 *
 * Priority:
 *   explicit intent.currentDate / intent.time  (plan lock — beats polluted summaries)
 *   → prior scene established calendar (this run)
 *   → 08 state「时间」
 */
function norm(v) {
  return String(v || '').trim();
}

/** Extract first calendar-like hint from prose / plan text */
export function extractCalendarHints(text = '') {
  const t = String(text || '');
  const patterns = [
    /(\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日)/,
    /(\d{1,2}\s*月\s*\d{1,2}\s*日)/,
    /([一二三四五六七八九十]+月[一二三四五六七八九十]+日)/,
    /(Day\s*\d+)/i,
    /(第\s*\d+\s*天)/,
  ];
  const hits = [];
  for (const re of patterns) {
    const m = t.match(re);
    if (m?.[1]) {
      const raw = norm(m[1]);
      // Keep "Day N" readable; compress only CJK date spacing
      hits.push(/Day/i.test(raw) ? raw.replace(/\s+/g, ' ') : raw.replace(/\s+/g, ''));
    }
  }
  return [...new Set(hits)];
}

function prevScene(intent, scene) {
  if (!scene || !intent?.scenes) return null;
  const idx = Number(scene.index);
  if (!Number.isFinite(idx) || idx <= 1) return null;
  return (intent.scenes || []).find((s) => Number(s.index) === idx - 1) || null;
}

/**
 * @returns {{
 *   canonical: string|null,
 *   source: string,
 *   isDayOnly: boolean,
 *   lockRule: string,
 * }}
 */
export function resolveStoryClock({ ctx = {}, intent = {}, scene = {} } = {}) {
  const prev = prevScene(intent, scene);
  const fromPrev = extractCalendarHints(prev?.text || '');
  const fromIntent = extractCalendarHints(
    [intent.currentDate, intent.time, scene.storyDate, scene.time].filter(Boolean).join(' '),
  );
  const stateTime = norm(ctx.state?.['时间'] || ctx.state?.时间 || '');
  const fromState = stateTime ? extractCalendarHints(stateTime).concat(stateTime ? [stateTime] : []) : [];

  let canonical = null;
  let source = 'none';

  // Explicit plan lock first — Round 3 showed disk prev-summaries can inject 六月 while intent locks 10月
  if (fromIntent.length) {
    canonical = fromIntent.find((h) => /月/.test(h)) || fromIntent[0];
    source = 'intent_or_scene_field';
  } else if (fromPrev.length) {
    canonical = fromPrev.find((h) => /月/.test(h)) || fromPrev[0];
    source = 'prior_scene_text';
  } else if (fromState.length) {
    canonical = fromState[0];
    source = '08_current_state';
  }

  const isDayOnly = Boolean(
    canonical && (/^Day\s*\d+$/i.test(canonical) || /^第\d+天$/.test(canonical)),
  );

  const lockRule = !canonical
    ? '无已确立故事日历：本场不要无故发明互相冲突的「×月×日」系统；若必须出现日期，全章保持同一套，并与上一场一致。'
    : isDayOnly
      ? `故事钟：${canonical}。禁止另起无关的「×月×日」日历（除非上一场正文已确立具体月日）。相对时间（今早/昨夜）可以。`
      : `故事钟（锁定）：${canonical}。后续 Scene 必须沿用此日历，禁止改换另一套月日（如 10月↔六月）。`;

  return {
    canonical,
    source,
    isDayOnly,
    lockRule: canonical
      ? `${lockRule} **若前序摘要 / Scene Memory / 旧草稿出现不同月日，以本 Canonical 为准，禁止跟随冲突日期。**`
      : lockRule,
  };
}

/** Prompt block for Writer */
export function formatStoryClockForPrompt(clock) {
  if (!clock) return '';
  const lines = [
    '## Story Clock（Phase 1.R · Plan/State · 非 SR）',
    clock.canonical ? `- **Canonical**：${clock.canonical}（source=${clock.source}）` : '- **Canonical**：未确立',
    `- ${clock.lockRule}`,
  ];
  return lines.join('\n');
}
