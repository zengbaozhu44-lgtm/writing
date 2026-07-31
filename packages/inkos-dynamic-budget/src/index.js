import { allocateDynamicBudget, tokensToCharBudget } from './allocator.js';
import { buildBudgetReport, persistBudgetReport } from './report.js';

export function runDynamicBudget({
  bookDir = null,
  chapter,
  scene = {},
  intent = {},
  ctx = {},
  totalTokens,
}) {
  const budget = allocateDynamicBudget(scene, intent, { totalTokens, ctx });
  const report = buildBudgetReport({ chapter, scene, budget, intent });
  const reportPath = bookDir ? persistBudgetReport(bookDir, chapter, scene, report) : null;

  return {
    budget,
    report,
    reportPath,
    contextCharBudget: tokensToCharBudget(budget.contextTokenBudget),
    contextTokenBudget: budget.contextTokenBudget,
    pie: budget.pie,
  };
}

export {
  allocateDynamicBudget,
  tokensToCharBudget,
  allocationToCompilerBudget,
} from './allocator.js';
export {
  TOTAL_BUDGET_TOKENS,
  TARGET_BUDGET_TOKENS,
  BUDGET_MIN_TOKENS,
  BUDGET_MAX_TOKENS,
  SCENE_TYPE_TOKEN_TARGETS,
  BUDGET_MODULES,
  CONTEXT_MODULES,
  SCENE_TYPE_WEIGHTS,
  MODULE_LABELS,
} from './constants.js';
export { inferSceneType, resolveTargetBudget } from './scene-type.js';
export {
  analyzeSceneComplexity,
  applyComplexityToTargetBudget,
  applyComplexityToWeights,
} from './scene-complexity.js';
export { persistBudgetReport, getBudgetDir } from './report.js';
export { formatBudgetBlock } from './format.js';
