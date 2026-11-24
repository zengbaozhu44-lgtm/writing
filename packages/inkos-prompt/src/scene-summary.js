/**
 * Scene Summary — 从前序 Scene 文本提取摘要，供 Scene2+ 引用
 * Phase 1.R2: prior summaries = historical continuity, not Scene Current Date.
 */
import { extractCalendarHints } from '../../inkos-core/src/lib/story-clock.js';

export function extractSceneSummary(scene, text) {
  if (!text?.trim()) return null;
  const clean = text.replace(/\s+/g, ' ').trim();
  const sentences = clean.split(/[。！？]/).filter((s) => s.length > 4);
  const summary = sentences.slice(0, 2).join('。') + (sentences.length ? '。' : '');
  return {
    sceneId: scene.id,
    index: scene.index,
    title: scene.title,
    summary: summary.slice(0, 200) || clean.slice(0, 120),
    wordCount: clean.replace(/\s/g, '').length,
    sourceTextHash: simpleTextHash(clean),
    newFacts: [],
    resourceDiff: {},
    relationshipDiff: {},
    knowledgeDiff: {},
    generatedAt: new Date().toISOString(),
  };
}

function simpleTextHash(text) {
  let h = 0;
  const s = String(text || '');
  for (let i = 0; i < s.length; i += 1) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return String(h);
}

function normalizeDateKey(d) {
  return String(d || '').replace(/\s+/g, '');
}

/**
 * @param {object[]} summaries
 * @param {{ canonical?: string|null }} [clock]
 */
export function formatPreviousSummaries(summaries, clock = {}) {
  if (!summaries?.length) return '';
  const canonical = clock?.canonical || null;
  const lines = [
    '### 前序 Scene 摘要',
    '> **角色：Historical Continuity（历史承接）** — 不是当前 Scene 日历。',
    canonical
      ? `> 当前 Story Clock Canonical = **${canonical}**。摘要中若出现其他月日，视为历史/旧稿提及，**不得**当作「今天」。`
      : '> 当前日期以 Story Clock 为准（若上方有 Canonical）。',
  ];
  for (const s of summaries) {
    let body = s.summary;
    if (canonical) {
      const hints = extractCalendarHints(body);
      const bad = hints.filter((d) => /月/.test(d) && normalizeDateKey(d) !== normalizeDateKey(canonical));
      if (bad.length) {
        body = `${body} 〔历史日期提及：${bad.join('、')} ≠ 当前钟 ${canonical}；当前 Scene 日期以 Canonical 为准〕`;
      }
    }
    lines.push(`- **Scene ${s.index}** (${s.title}): ${body}`);
  }
  return lines.join('\n');
}

/**
 * @param {number} sceneIndex
 * @param {string} [prevSummary]
 * @param {{ canonical?: string|null }} [clock]
 */
export function buildContinuationBlock(sceneIndex, prevSummary, clock = {}) {
  if (sceneIndex <= 1) return '';
  const canonical = clock?.canonical || null;
  const prevConflicts = canonical
    && prevSummary
    && extractCalendarHints(prevSummary).some(
      (d) => /月/.test(d) && normalizeDateKey(d) !== normalizeDateKey(canonical),
    );
  return [
    '### 续写指令',
    `Continue from Scene ${sceneIndex - 1}.`,
    'Do NOT repeat previous narration.',
    'Maintain tone. Continue naturally.',
    canonical
      ? `**当前 Scene 日期 = Story Clock Canonical「${canonical}」（优先于下方 Previous 中的任何月日）。**`
      : '',
    prevSummary
      ? `Previous（历史承接，非当前日历）: ${prevSummary}${
        prevConflicts ? ` 〔若含其他月日，禁止当作今天；今天=${canonical}〕` : ''
      }`
      : '',
  ].filter(Boolean).join('\n');
}
