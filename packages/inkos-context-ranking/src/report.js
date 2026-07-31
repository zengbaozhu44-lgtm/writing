import fs from 'node:fs';
import path from 'node:path';
import { WEIGHTS } from './score.js';

export function buildContextRankReport({
  chapter,
  scene,
  rankResult,
  intent,
}) {
  return {
    version: 'context-rank-1',
    chapter,
    scene: {
      id: scene?.id,
      index: scene?.index,
      goal: scene?.goal,
    },
    weights: WEIGHTS,
    budget: {
      maxChars: rankResult.budgetChars,
      topK: rankResult.topKLimit,
      usedChars: rankResult.usedChars,
      selectedCount: rankResult.selectedCount,
      trimmedCount: rankResult.trimmedCount,
      totalCandidates: rankResult.totalCandidates,
    },
    topK: rankResult.topK.map((e) => ({
      id: e.id,
      source: e.source,
      text: e.text,
      charCount: e.charCount,
      scores: e.scores,
    })),
    trimmed: rankResult.trimmed.slice(0, 20).map((e) => ({
      id: e.id,
      source: e.source,
      finalScore: e.scores?.finalScore,
      trimReason: e.trimReason,
      charCount: e.charCount,
    })),
    policy: rankResult.policy || 'Context Ranking · 仅 TopK · 禁止全量 Context',
    bySource: rankResult.bySource
      ? Object.fromEntries(
        Object.entries(rankResult.bySource).map(([k, v]) => [k, {
          selectedCount: v.selectedCount,
          totalCandidates: v.totalCandidates,
          topK: v.topK,
        }]),
      )
      : null,
    intent: {
      mainGoal: intent?.mainGoal,
      pov: intent?.pov,
    },
    generatedAt: new Date().toISOString(),
  };
}

export function getContextRankDir(bookDir, chapter) {
  return path.join(
    bookDir,
    'novel',
    '_system',
    'studio',
    'context-ranking',
    `ch_${String(chapter).padStart(4, '0')}`,
  );
}

export function persistContextRankReport(bookDir, chapter, scene, report) {
  try {
    const dir = path.join(
      getContextRankDir(bookDir, chapter),
      `scene_${String(scene?.index ?? 0).padStart(2, '0')}`,
    );
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'context_rank.json');
    fs.writeFileSync(file, JSON.stringify(report, null, 2), 'utf8');
    return file;
  } catch {
    return null;
  }
}
