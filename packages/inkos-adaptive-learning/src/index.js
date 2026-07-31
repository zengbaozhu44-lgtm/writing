import { collectRecentScores } from './collect.js';
import { analyzeLearningTrends } from './analyze.js';
import {
  buildPromptAdjustments,
  applyAdjustmentsToBudget,
  buildAdaptivePromptBlock,
} from './adjustments.js';
import {
  loadAdaptiveLearningState,
  saveAdaptiveLearningState,
  loadAdaptiveAdjustments,
} from './store.js';

export {
  LEARNING_DIMENSIONS,
  LOW_SCORE_THRESHOLD,
  MIN_LOW_STREAK,
  MAX_CHAPTERS,
} from './constants.js';

/**
 * Adaptive Learning 主入口 — 统计近 10 章 → 生成 Prompt 调权
 */
export function runAdaptiveLearning(bookDir, options = {}) {
  if (!bookDir) return null;

  const { chapters, entries } = collectRecentScores(bookDir, options);
  const trends = analyzeLearningTrends(entries);
  const adjustments = buildPromptAdjustments(trends);

  const state = {
    version: 'adaptive-learning-1',
    chaptersAnalyzed: chapters,
    entryCount: entries.length,
    trends,
    adjustments,
    suggestions: buildAdaptiveSuggestions(trends, adjustments),
  };

  const statePath = saveAdaptiveLearningState(bookDir, state);
  return { ...state, statePath };
}

export function buildAdaptiveSuggestions(trends = {}, adjustments = {}) {
  const suggestions = [];
  for (const dim of adjustments.activeDimensions || []) {
    const t = trends[dim];
    suggestions.push({
      id: `adaptive_${dim}`,
      source: 'adaptive',
      priority: 'high',
      dimension: dim,
      text: `${dim} 连续 ${t?.streak ?? 0} 次低于 70 分（均分 ${t?.average ?? '—'}）→ 已自动调权 Prompt`,
    });
  }
  return suggestions;
}

export {
  collectRecentScores,
  analyzeLearningTrends,
  buildPromptAdjustments,
  applyAdjustmentsToBudget,
  buildAdaptivePromptBlock,
  loadAdaptiveLearningState,
  saveAdaptiveLearningState,
  loadAdaptiveAdjustments,
};
