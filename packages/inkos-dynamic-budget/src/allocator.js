import {
  TOTAL_BUDGET_TOKENS,
  BUDGET_MIN_TOKENS,
  BUDGET_MAX_TOKENS,
  SCENE_TYPE_WEIGHTS,
  BUDGET_MODULES,
  CONTEXT_MODULES,
  MODULE_LABELS,
  MODULE_COLORS,
} from './constants.js';
import { inferSceneType, adjustWeights, resolveTargetBudget } from './scene-type.js';
import {
  analyzeSceneComplexity,
  applyComplexityToTargetBudget,
  applyComplexityToWeights,
} from './scene-complexity.js';

export function allocateDynamicBudget(scene = {}, intent = {}, options = {}) {
  const sceneType = options.sceneType ?? inferSceneType(scene, intent);
  const complexity = options.complexity ?? analyzeSceneComplexity(scene, intent, options.ctx);
  const baseTarget = resolveTargetBudget(sceneType);
  const totalTokens = options.totalTokens ?? applyComplexityToTargetBudget(baseTarget, complexity);
  const base = SCENE_TYPE_WEIGHTS[sceneType] || SCENE_TYPE_WEIGHTS.standard;
  let weights = adjustWeights(base, scene, intent, totalTokens);
  weights = applyComplexityToWeights(weights, complexity);

  const allocation = {};
  const pie = [];
  let allocated = 0;

  for (const key of BUDGET_MODULES) {
    const weight = weights[key] ?? 0;
    const tokens = Math.round(totalTokens * weight);
    allocation[key] = {
      key,
      label: MODULE_LABELS[key] || key,
      weight: Number(weight.toFixed(4)),
      tokens,
      pct: Number((weight * 100).toFixed(1)),
      color: MODULE_COLORS[key],
    };
    allocated += tokens;
    pie.push({
      key,
      label: MODULE_LABELS[key],
      tokens,
      pct: allocation[key].pct,
      color: MODULE_COLORS[key],
    });
  }

  const remainder = totalTokens - allocated;
  if (remainder !== 0) {
    allocation.goal.tokens += remainder;
    allocation.goal.pct = Number(((allocation.goal.tokens / totalTokens) * 100).toFixed(1));
    const pieGoal = pie.find((p) => p.key === 'goal');
    if (pieGoal) {
      pieGoal.tokens += remainder;
      pieGoal.pct = allocation.goal.pct;
    }
  }

  const limits = {};
  for (const key of BUDGET_MODULES) {
    limits[`${key}Tokens`] = allocation[key].tokens;
  }

  const contextTokenBudget = CONTEXT_MODULES.reduce(
    (sum, key) => sum + allocation[key].tokens,
    0,
  );

  return {
    totalTokens,
    sceneType,
    complexity,
    budgetRange: { min: BUDGET_MIN_TOKENS, max: BUDGET_MAX_TOKENS, target: totalTokens },
    dynamic: true,
    tierless: true,
    modules: BUDGET_MODULES,
    allocation,
    pie,
    limits,
    contextTokenBudget,
  };
}

export function tokensToCharBudget(tokens) {
  return Math.round(tokens * 1.5);
}

/** 供 Prompt Compiler 使用的扁平 Token 上限 */
export function allocationToCompilerBudget(allocation) {
  const budget = {};
  for (const key of BUDGET_MODULES) {
    budget[key] = allocation[key]?.tokens ?? 0;
  }
  return budget;
}
