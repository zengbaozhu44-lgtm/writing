import fs from 'node:fs';
import path from 'node:path';
import {
  LEARNING_DIMENSIONS,
  DIMENSION_REVIEW_KEYS,
  DIMENSION_OPTIMIZER_KEYS,
  MAX_CHAPTERS,
} from './constants.js';

function listChapterDirs(root, prefix = 'ch_') {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root)
    .filter((n) => n.startsWith(prefix))
    .map((n) => Number(n.replace(prefix, '')))
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => b - a);
}

function avg(nums) {
  const valid = nums.filter((n) => typeof n === 'number' && !Number.isNaN(n));
  if (!valid.length) return null;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function loadReviewScores(bookDir, chapter) {
  const base = path.join(
    bookDir,
    'novel',
    '_system',
    'studio',
    'director',
    'reviews',
    `ch_${String(chapter).padStart(4, '0')}`,
  );
  if (!fs.existsSync(base)) return [];
  const rows = [];
  for (const name of fs.readdirSync(base)) {
    if (!name.startsWith('scene_')) continue;
    const report = readJson(path.join(base, name, 'review_report.json'));
    if (!report?.scores) continue;
    rows.push({
      chapter,
      sceneIndex: report.scene?.index ?? Number(name.replace('scene_', '')),
      source: 'review',
      scores: report.scores,
      weightedScore: report.weightedScore ?? report.total,
    });
  }
  return rows;
}

function loadOptimizerScores(bookDir, chapter) {
  const base = path.join(
    bookDir,
    'novel',
    '_system',
    'studio',
    'writer-optimizer',
    `ch_${String(chapter).padStart(4, '0')}`,
  );
  if (!fs.existsSync(base)) return [];
  const rows = [];
  for (const name of fs.readdirSync(base)) {
    if (!name.startsWith('scene_')) continue;
    const report = readJson(path.join(base, name, 'optimizer_report.json'));
    if (!report?.scores) continue;
    rows.push({
      chapter,
      sceneIndex: report.scene?.index ?? Number(name.replace('scene_', '')),
      source: 'optimizer',
      scores: report.scores,
      total: report.total,
    });
  }
  return rows;
}

function dimensionScoreFromRow(row, dimension) {
  const reviewKeys = DIMENSION_REVIEW_KEYS[dimension] || [];
  const optKeys = DIMENSION_OPTIMIZER_KEYS[dimension] || [];
  const vals = [];
  for (const k of reviewKeys) {
    if (row.scores?.[k] != null) vals.push(row.scores[k]);
  }
  for (const k of optKeys) {
    if (row.scores?.[k] != null) vals.push(row.scores[k]);
  }
  return avg(vals);
}

/**
 * 收集最近 N 章 Scene 评分（Director Review + Writer Optimizer）
 */
export function collectRecentScores(bookDir, { maxChapters = MAX_CHAPTERS } = {}) {
  const reviewRoot = path.join(bookDir, 'novel', '_system', 'studio', 'director', 'reviews');
  const optRoot = path.join(bookDir, 'novel', '_system', 'studio', 'writer-optimizer');
  const chapters = [...new Set([
    ...listChapterDirs(reviewRoot),
    ...listChapterDirs(optRoot),
  ])].sort((a, b) => b - a).slice(0, maxChapters);

  const entries = [];
  for (const ch of chapters) {
    const rows = [...loadReviewScores(bookDir, ch), ...loadOptimizerScores(bookDir, ch)];
    for (const row of rows) {
      const dimScores = {};
      for (const d of LEARNING_DIMENSIONS) {
        dimScores[d] = dimensionScoreFromRow(row, d);
      }
      entries.push({
        chapter: row.chapter,
        sceneIndex: row.sceneIndex,
        source: row.source,
        dimScores,
        weightedScore: row.weightedScore ?? row.total ?? null,
      });
    }
  }

  entries.sort((a, b) => (b.chapter - a.chapter) || (b.sceneIndex - a.sceneIndex));
  return { chapters, entries: entries.slice(0, maxChapters * 8) };
}
