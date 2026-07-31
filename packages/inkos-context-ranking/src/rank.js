import { DEFAULT_TOP_K, DEFAULT_BUDGET_CHARS } from './utils.js';
import { collectAllContext } from './collect.js';
import { scoreContextEntry } from './score.js';

/**
 * 排序 + Budget 裁剪（不发送全部 Context）
 */
export function rankContextItems(items, {
  topK = DEFAULT_TOP_K,
  budgetChars = DEFAULT_BUDGET_CHARS,
  scene = {},
  intent = {},
  storyDna = {},
  chapter = 1,
  present = [],
} = {}) {
  const scored = items.map((entry) => scoreContextEntry(entry, {
    scene,
    intent,
    storyDna,
    chapter,
    present,
    budgetChars,
  }));

  scored.sort((a, b) => (b.scores.finalScore - a.scores.finalScore) || (a.charCount - b.charCount));

  const selected = [];
  const trimmed = [];
  let usedChars = 0;

  for (const entry of scored) {
    if (selected.length >= topK) {
      trimmed.push({ ...entry, trimReason: '超过 Top K' });
      continue;
    }
    if (usedChars + entry.charCount > budgetChars && selected.length > 0) {
      trimmed.push({ ...entry, trimReason: 'Budget 不足' });
      continue;
    }
    selected.push(entry);
    usedChars += entry.charCount;
  }

  return {
    topK: selected,
    trimmed,
    totalCandidates: items.length,
    selectedCount: selected.length,
    trimmedCount: trimmed.length,
    usedChars,
    budgetChars,
    topKLimit: topK,
  };
}

export function rankBrainContext(ctx, options = {}) {
  const items = collectAllContext(ctx);
  return rankContextItems(items, {
    ...options,
    chapter: options.chapter ?? ctx.chapter,
    present: options.present ?? ctx.present,
  });
}
