import { tokensToCharBudget } from '@inkos/dynamic-budget';
import { collectRankableContext, RANKABLE_SOURCES, BUDGET_KEY_MAP } from './collect.js';
import { scoreContextEntry } from './score.js';

function tokensToTopK(tokens, avgItemTokens = 55) {
  return Math.max(2, Math.min(10, Math.floor(tokens / avgItemTokens)));
}

function splitFactsBudget(tokens) {
  return {
    facts: Math.max(80, Math.floor(tokens * 0.65)),
    resources: Math.max(40, Math.floor(tokens * 0.35)),
  };
}

/**
 * 单源 TopK — 按 relevance score 排序
 */
export function rankSourcePool(items, options = {}) {
  const {
    topK = 6,
    scene = {},
    intent = {},
    storyDna = {},
    chapter = 1,
    present = [],
    budgetChars = 2000,
  } = options;

  const scored = items.map((entry) => scoreContextEntry(entry, {
    scene,
    intent,
    storyDna,
    chapter,
    present,
    budgetChars,
  }));

  scored.sort((a, b) =>
    (b.scores.finalScore - a.scores.finalScore)
    || (b.scores.relevance - a.scores.relevance)
    || (a.charCount - b.charCount),
  );

  const selected = [];
  const trimmed = [];
  let usedChars = 0;

  for (const entry of scored) {
    if (selected.length >= topK) {
      trimmed.push({ ...entry, trimReason: '超过 TopK' });
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
    selected,
    trimmed,
    topK,
    totalCandidates: items.length,
    selectedCount: selected.length,
    trimmedCount: trimmed.length,
    usedChars,
    budgetChars,
  };
}

/**
 * Prompt Compiler 入口 — 五类 Context 各自 TopK，不发送全量
 */
export function rankContextForCompiler(ctx = {}, scene = {}, intent = {}, options = {}) {
  const {
    budget = {},
    storyDna = {},
    factPool = null,
    chapter = ctx.chapter,
    present = ctx.present,
  } = options;

  const pools = collectRankableContext(ctx, { factPool });
  const baseOpts = { scene, intent, storyDna, chapter, present };
  const bySource = {};
  let totalSelected = 0;
  let totalCandidates = 0;
  let totalTrimmed = 0;

  for (const source of RANKABLE_SOURCES) {
    const budgetKey = BUDGET_KEY_MAP[source];
    let tokens = budget[budgetKey] ?? 120;

    if (source === 'facts' || source === 'resources') {
      const split = splitFactsBudget(budget.facts ?? tokens);
      tokens = source === 'facts' ? split.facts : split.resources;
    }

    const topK = tokensToTopK(tokens);
    const budgetChars = tokensToCharBudget(tokens);

    bySource[source] = rankSourcePool(pools[source], {
      ...baseOpts,
      topK,
      budgetChars,
    });

    totalSelected += bySource[source].selectedCount;
    totalCandidates += bySource[source].totalCandidates;
    totalTrimmed += bySource[source].trimmedCount;
  }

  return {
    bySource,
    totalSelected,
    totalCandidates,
    totalTrimmed,
    policy: 'Context Ranking · 仅 TopK · 禁止全量 Context',
  };
}
