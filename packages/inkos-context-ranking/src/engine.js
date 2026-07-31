import { DEFAULT_BUDGET_CHARS } from './utils.js';
import { rankContextForCompiler } from './compiler-rank.js';
import { buildContextRankReport, persistContextRankReport } from './report.js';
import { formatRankedContextBlock } from './format.js';

/**
 * Context Ranking Engine 主入口 — 五类 Context 各自 TopK
 */
export function runContextRanking({
  bookDir = null,
  chapter,
  scene = {},
  intent = {},
  ctx = {},
  storyDna = {},
  budget = null,
  topK,
  budgetChars = DEFAULT_BUDGET_CHARS,
}) {
  const flatBudget = budget || {
    character: 200,
    world: 150,
    facts: 280,
    history: 200,
    relationship: 180,
    knowledge: 150,
  };

  const ranked = rankContextForCompiler(ctx, scene, intent, {
    budget: flatBudget,
    storyDna,
    chapter: chapter ?? ctx.chapter,
    present: ctx.present,
  });

  const allSelected = Object.values(ranked.bySource).flatMap((s) => s.selected);
  const allTrimmed = Object.values(ranked.bySource).flatMap((s) => s.trimmed);

  const rankResult = {
    topK: allSelected,
    trimmed: allTrimmed,
    totalCandidates: ranked.totalCandidates,
    selectedCount: ranked.totalSelected,
    trimmedCount: ranked.totalTrimmed,
    usedChars: allSelected.reduce((s, e) => s + e.charCount, 0),
    budgetChars,
    topKLimit: topK ?? null,
    bySource: ranked.bySource,
    policy: ranked.policy,
  };

  const report = buildContextRankReport({
    chapter,
    scene,
    rankResult,
    intent,
  });

  const reportPath = bookDir
    ? persistContextRankReport(bookDir, chapter, scene, report)
    : null;

  const promptBlock = formatRankedContextBlock(allSelected);

  return {
    topK: rankResult.topK,
    trimmed: rankResult.trimmed,
    bySource: ranked.bySource,
    report,
    reportPath,
    promptBlock,
    budget: report.budget,
  };
}
