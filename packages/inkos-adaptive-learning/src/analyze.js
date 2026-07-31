import {
  LEARNING_DIMENSIONS,
  LOW_SCORE_THRESHOLD,
  MIN_LOW_STREAK,
} from './constants.js';

function longestLowStreak(scores, threshold = LOW_SCORE_THRESHOLD) {
  let max = 0;
  let cur = 0;
  for (const s of scores) {
    if (s != null && s < threshold) {
      cur += 1;
      max = Math.max(max, cur);
    } else {
      cur = 0;
    }
  }
  return max;
}

function recentAvg(scores) {
  const valid = scores.filter((s) => s != null);
  if (!valid.length) return null;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}

/**
 * 分析各维度最近趋势与连续低分
 */
export function analyzeLearningTrends(entries = []) {
  const trends = {};

  for (const dim of LEARNING_DIMENSIONS) {
    const series = entries.map((e) => e.dimScores?.[dim] ?? null).filter((s) => s != null);
    const streak = longestLowStreak(series);
    const average = recentAvg(series);
    trends[dim] = {
      dimension: dim,
      average,
      streak,
      low: average != null && average < LOW_SCORE_THRESHOLD,
      needsBoost: streak >= MIN_LOW_STREAK,
      sampleCount: series.length,
    };
  }

  return trends;
}
