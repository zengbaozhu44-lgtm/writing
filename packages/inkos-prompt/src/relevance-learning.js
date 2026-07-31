/**
 * Context Relevance Learning — 轻量使用统计，降低长期无用上下文权重
 */
import fs from 'node:fs';
import path from 'node:path';
import { exists, readJson, writeJson } from '../../inkos-core/src/lib/paths.js';
import { promptCacheDir } from './cache.js';

function statsFile(bookDir) {
  return path.join(path.dirname(promptCacheDir(bookDir, 1)), 'relevance_stats.json');
}

export function loadRelevanceStats(bookDir) {
  const file = statsFile(bookDir);
  if (!exists(file)) return { facts: {}, modules: {} };
  return readJson(file);
}

export function recordContextUsage(bookDir, { factIds = [], moduleKeys = [] }) {
  const file = statsFile(bookDir);
  const stats = loadRelevanceStats(bookDir);
  for (const id of factIds) {
    stats.facts[id] = (stats.facts[id] || 0) + 1;
  }
  for (const key of moduleKeys) {
    stats.modules[key] = (stats.modules[key] || 0) + 1;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  writeJson(file, { ...stats, updatedAt: new Date().toISOString() });
}

export function relevanceBoost(factText, stats) {
  const uses = stats.facts?.[factText] || 0;
  if (uses === 0) return -0.05;
  if (uses >= 5) return 0.08;
  return 0;
}
