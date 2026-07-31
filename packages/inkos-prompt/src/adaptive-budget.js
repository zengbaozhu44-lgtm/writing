/**
 * Adaptive Prompt Budget — Dynamic Budget + Adaptive Learning 调权
 */
import {
  allocateDynamicBudget,
  allocationToCompilerBudget,
  TOTAL_BUDGET_TOKENS,
  inferSceneType,
} from '@inkos/dynamic-budget';
import {
  loadAdaptiveAdjustments,
  applyAdjustmentsToBudget,
  buildAdaptivePromptBlock,
} from '@inkos/adaptive-learning';

export const SCENE_INPUT_MAX_TOKENS = TOTAL_BUDGET_TOKENS;

export function detectSceneProfile(scene, intent = {}) {
  return inferSceneType(scene, intent);
}

export function getAdaptiveBudget(scene, intent = {}, options = {}) {
  const { bookDir = null, ctx = null } = options;
  const result = allocateDynamicBudget(scene, intent, { ctx });
  let budget = allocationToCompilerBudget(result.allocation);

  const adjustments = bookDir ? loadAdaptiveAdjustments(bookDir) : null;
  if (adjustments) {
    budget = applyAdjustmentsToBudget(budget, adjustments, scene);
  }

  const adaptiveBlock = adjustments ? buildAdaptivePromptBlock(adjustments) : '';

  return {
    profile: result.sceneType,
    budget,
    totalTokens: result.totalTokens,
    allocation: result.allocation,
    pie: result.pie,
    contextTokenBudget: result.contextTokenBudget,
    complexity: result.complexity,
    adaptiveBlock,
    adjustments,
  };
}

export function budgetUsage(modules, budget) {
  const usage = {};
  for (const key of Object.keys(budget)) usage[key] = 0;
  for (const m of modules) {
    const cat = m.category || 'other';
    usage[cat] = (usage[cat] || 0) + (m.tokens || 0);
  }
  const pct = {};
  for (const [k, limit] of Object.entries(budget)) {
    pct[k] = limit ? Math.round(((usage[k] || 0) / limit) * 100) : 0;
  }
  return { usage, pct };
}
