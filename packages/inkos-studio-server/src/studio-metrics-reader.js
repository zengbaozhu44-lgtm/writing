/**
 * Studio 层 Prompt Metrics / Dynamic Budget 只读
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadChapterMetrics } from '@inkos/prompt-metrics';
import { getBudgetDir } from '@inkos/dynamic-budget';

export function readStudioPromptMetrics(bookDir, chapter) {
  const data = loadChapterMetrics(bookDir, chapter);
  return {
    source: 'studio/prompt-metrics/rollup.json',
    chapter,
    scenes: data.scenes || [],
    aggregate: data.aggregate || null,
    updatedAt: data.updatedAt || null,
  };
}

export function readSceneBudget(bookDir, chapter, sceneIndex) {
  const file = path.join(
    getBudgetDir(bookDir, chapter),
    `scene_${String(sceneIndex).padStart(2, '0')}`,
    'budget.json',
  );
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

export function readChapterBudgets(bookDir, chapter) {
  const dir = getBudgetDir(bookDir, chapter);
  if (!fs.existsSync(dir)) return [];
  const budgets = [];
  for (const name of fs.readdirSync(dir)) {
    if (!name.startsWith('scene_')) continue;
    const file = path.join(dir, name, 'budget.json');
    if (fs.existsSync(file)) {
      try {
        budgets.push(JSON.parse(fs.readFileSync(file, 'utf8')));
      } catch { /* skip */ }
    }
  }
  return budgets.sort((a, b) => (a.scene?.index ?? 0) - (b.scene?.index ?? 0));
}
