/** Dynamic Budget 模块表 — 注入 Prompt 元数据 */
export function formatBudgetBlock(budgetResult) {
  const b = budgetResult?.budget;
  if (!b?.pie?.length) return '';

  const lines = [
    '<!-- inkos-dynamic-budget -->',
    `## Dynamic Budget · ${b.totalTokens} tokens · ${b.sceneType}`,
    '',
    '| 模块 | Tokens | % |',
    '| --- | --- | --- |',
    ...b.pie.map((s) => `| ${s.label} | ${s.tokens} | ${s.pct}% |`),
    '',
    `> Context Ranking 上限 ${budgetResult.contextTokenBudget ?? b.contextTokenBudget ?? '—'} tok`,
  ];
  return lines.join('\n');
}
