/**
 * Compiler 模块格式化 — 仅 TopK 条目
 */
export function formatRankedFacts(ranked = {}) {
  const items = ranked.selected || [];
  if (!items.length) return '';
  return items.map((e) =>
    `- [rel=${e.scores?.relevance ?? '—'}] ${e.text}`,
  ).join('\n');
}

export function formatRankedKnowledge(ranked = {}) {
  const items = ranked.selected || [];
  if (!items.length) return '';
  return items.map((e) =>
    `- [rel=${e.scores?.relevance ?? '—'}] ${e.text}`,
  ).join('\n');
}

export function formatRankedResources(ranked = {}) {
  const items = ranked.selected || [];
  if (!items.length) return '';
  return items.map((e) =>
    `- [rel=${e.scores?.relevance ?? '—'}] ${e.text}`,
  ).join('\n');
}

export function formatRankedRelationships(ranked = {}) {
  const items = ranked.selected || [];
  if (!items.length) return '';
  return items.map((e) =>
    `- [rel=${e.scores?.relevance ?? '—'}] ${e.text}`,
  ).join('\n');
}

export function formatRankedTimeline(ranked = {}) {
  const items = ranked.selected || [];
  if (!items.length) return '';
  return items.map((e) =>
    `- [rel=${e.scores?.relevance ?? '—'}] ${e.text}`,
  ).join('\n');
}

/**
 * 将 Top-K Context 格式化为 Writer Prompt 块（Studio 观测用）
 */
export function formatRankedContextBlock(topK = []) {
  if (!topK.length) return '';

  const lines = [
    '<!-- inkos-context-ranking top-k -->',
    '## Ranked Context（Top-K，已裁剪）',
    '',
  ];

  for (const [i, entry] of topK.entries()) {
    lines.push(
      `### ${i + 1}. [${entry.source}] rel=${entry.scores?.relevance ?? '—'} score=${entry.scores?.finalScore ?? '—'}`,
      entry.text,
      '',
    );
  }

  lines.push('> 仅使用以上 Ranked Context，勿假设未列出的设定。');
  return lines.join('\n');
}
