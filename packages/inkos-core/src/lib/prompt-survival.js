/**
 * F1 — Final Prompt Survival helpers
 *
 * Story Clock + Information Boundary = semantic protected context.
 * Not SR, not Canon, not Reality Authority — consumption priority only.
 */
import { resolveStoryClock, formatStoryClockForPrompt } from './story-clock.js';

const CLOCK_HEAD = /Story Clock|故事钟/u;
const IB_HEAD = /信息边界|Information Boundary/u;

function firstHeadingLine(head = '') {
  return String(head || '').split('\n')[0] || '';
}

function isClockHeading(head = '') {
  const line = firstHeadingLine(head);
  return CLOCK_HEAD.test(line) && !/Semantic Protected/u.test(line);
}

function isIbHeading(head = '') {
  const line = firstHeadingLine(head);
  return IB_HEAD.test(line) && !/Semantic Protected/u.test(line);
}

/**
 * Extract markdown sections whose heading matches predictor.
 * @param {string} text
 * @param {(head: string) => boolean} pred
 */
export function extractSectionsByHeading(text = '', pred) {
  const raw = String(text || '');
  if (!raw.trim()) return [];
  const sections = raw.split(/(?=^#{1,3}\s)/mu).filter((s) => String(s || '').trim());
  const out = [];
  for (const sec of sections) {
    const head = sec.slice(0, 160);
    if (pred(head)) out.push(sec.trim());
  }
  return out.filter(Boolean);
}

export function extractStoryClockFromText(text = '') {
  const secs = extractSectionsByHeading(text, isClockHeading);
  return secs[0] || '';
}

export function extractInformationBoundaryFromText(text = '') {
  const secs = extractSectionsByHeading(text, isIbHeading);
  const seen = new Set();
  const uniq = [];
  for (const s of secs) {
    const key = s.replace(/\s+/g, ' ').slice(0, 120);
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(s);
  }
  return uniq.join('\n\n');
}

export function hasStoryClock(text = '') {
  const t = String(text || '');
  return CLOCK_HEAD.test(t) && /Canonical|故事钟（锁定）|当前 Scene 日期|月\d+日|\d+月/u.test(t);
}

export function hasInformationBoundary(text = '') {
  return IB_HEAD.test(String(text || ''));
}

/**
 * Build / rebuild protected semantic block for P1 / Beat.
 * Prefer extracting from L2 lore; fall back to resolving clock from ctx.
 */
export function buildProtectedSemanticContext({
  loreText = '',
  ctx = {},
  intent = {},
  scene = {},
} = {}) {
  let clock = extractStoryClockFromText(loreText);
  let ib = extractInformationBoundaryFromText(loreText);

  // Nested / hollow extract (matched wrong section) → rebuild
  if (!clock || !/Canonical|故事钟（锁定）|月/u.test(clock)) {
    const resolved = resolveStoryClock({ ctx, intent, scene });
    clock = formatStoryClockForPrompt(resolved);
  }
  if (!ib) {
    ib = [
      '## 信息边界（Phase 1.R · 必守）',
      '- Scene 目标 / 冲突 / 章目标中的事实 = 写作任务与世界信息，**不是** POV 角色的先验 Awareness。',
      '- 若 Character Subjective State 中该角色 Awareness = omit：禁止写成其「已经知道 / 亲眼看见 / 确知」这些任务事实；允许本场新获知并写出获得过程。',
      '- World / Narration ≠ Character Knowledge。',
    ].join('\n');
  }

  return [
    '### Semantic Protected Context（F1 · 绝对保护 · 非 SR）',
    '> Story Clock + Information Boundary：语义保护上下文。优先于任何 Historical Prior / 续写原文中的月日。',
    '',
    clock.trim(),
    '',
    ib.trim(),
  ].filter(Boolean).join('\n');
}

/**
 * Historical prior / excerpt — keep text, demote vs Current Clock.
 */
export function wrapHistoricalPriorExcerpt(excerpt = '') {
  const body = String(excerpt || '').trim();
  if (!body) return '';
  if (/Historical Continuity|非当前日历|不得覆盖.*Story Clock/u.test(body)) {
    return body;
  }
  return [
    '### Prior Excerpt（Historical Continuity · 非当前日历）',
    '> **角色：Historical。** 以下为前序正文摘录。其中出现的月日 = 历史/旧稿提及，**不得**覆盖 Semantic Protected Context 中的 Story Clock Canonical。',
    '',
    body,
  ].join('\n');
}

export function markContinuationHistorical(block = '') {
  const raw = String(block || '').trim();
  if (!raw) return '';
  if (/Historical Continuity|不得覆盖.*Story Clock|非当前日历/u.test(raw)) return raw;
  return [
    raw,
    '',
    '> **Historical Continuity**：续写锚点 / 环境余韵中的月日 ≠ 当前 Story Clock；当前日期以 Semantic Protected Context 为准。',
  ].join('\n');
}
