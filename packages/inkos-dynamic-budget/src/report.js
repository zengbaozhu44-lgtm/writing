import fs from 'node:fs';
import path from 'node:path';

export function buildBudgetReport({ chapter, scene, budget, intent }) {
  return {
    version: 'dynamic-budget-3',
    chapter,
    scene: { id: scene?.id, index: scene?.index, goal: scene?.goal },
    totalTokens: budget.totalTokens,
    budgetRange: budget.budgetRange,
    sceneType: budget.sceneType,
    complexity: budget.complexity,
    dynamic: true,
    tierless: true,
    allocation: budget.allocation,
    pie: budget.pie,
    limits: budget.limits,
    intent: { mainGoal: intent?.mainGoal, pov: intent?.pov },
    generatedAt: new Date().toISOString(),
  };
}

export function getBudgetDir(bookDir, chapter) {
  return path.join(
    bookDir,
    'novel',
    '_system',
    'studio',
    'dynamic-budget',
    `ch_${String(chapter).padStart(4, '0')}`,
  );
}

export function persistBudgetReport(bookDir, chapter, scene, report) {
  try {
    const dir = path.join(
      getBudgetDir(bookDir, chapter),
      `scene_${String(scene?.index ?? 0).padStart(2, '0')}`,
    );
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'budget.json');
    fs.writeFileSync(file, JSON.stringify(report, null, 2), 'utf8');
    return file;
  } catch {
    return null;
  }
}
