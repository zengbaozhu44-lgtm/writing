/**
 * Story Health — 全书长期健康度 Dashboard
 */
import path from 'node:path';
import { exists, readJson } from '../../../inkos-core/src/lib/paths.js';
import { brainSystemDir } from '../loader.js';

export function computeStoryHealth(bookDir, dashboard, criticHistory = [], consistencyRuns = []) {
  const chapters = dashboard?.chapters ?? [];
  const n = chapters.length || 1;

  const avgConflict = chapters.reduce((s, c) => s + (c.conflictDensity ?? 0), 0) / n;
  const avgDialogue = chapters.reduce((s, c) => s + (c.dialogueRatio ?? 0), 0) / n;
  const foreshadowRate = chapters.filter((c) => c.foreshadowRate > 0).length / n;

  const climaxGaps = [];
  for (let i = 1; i < chapters.length; i++) {
    const gap = chapters[i].chapter - chapters[i - 1].chapter;
    if (gap > 3) climaxGaps.push({ from: chapters[i - 1].chapter, to: chapters[i].chapter, gap });
  }

  const criticAvg = criticHistory.length
    ? criticHistory.reduce((s, c) => s + (c.overall ?? 0), 0) / criticHistory.length
    : null;

  const consistencyPassRate = consistencyRuns.length
    ? consistencyRuns.filter((r) => r.pass).length / consistencyRuns.length
    : 1;

  const health = {
    characterConsistency: round(consistencyPassRate * 100),
    foreshadowRecoveryRate: round(foreshadowRate * 100),
    climaxIntervalAvg: climaxGaps.length ? round(climaxGaps.reduce((s, g) => s + g.gap, 0) / climaxGaps.length) : 1,
    conflictDensityAvg: round(avgConflict),
    worldProgressTotal: chapters.reduce((s, c) => s + (c.worldProgress ?? 0), 0),
    relationshipChanges: chapters.filter((c) => c.characterGrowth > 0).length,
    resourceDeltaChapters: chapters.filter((c) => c.wordCount > 0).length,
    rhythmWaveform: chapters.map((c) => ({
      chapter: c.chapter,
      intensity: (c.conflictDensity ?? 0) * 20 + (c.dialogueRatio ?? 0) * 30,
    })),
    infoDensityAvg: round(chapters.reduce((s, c) => s + (c.infoDensity ?? 0), 0) / n),
    criticScoreAvg: criticAvg != null ? round(criticAvg) : null,
    dialogueRatioAvg: round(avgDialogue),
    overallScore: 0,
    updatedAt: new Date().toISOString(),
  };

  health.overallScore = round(
    health.characterConsistency * 0.2 +
    health.foreshadowRecoveryRate * 0.1 +
    Math.min(health.conflictDensityAvg * 25, 100) * 0.15 +
    (health.criticScoreAvg ?? 70) * 0.25 +
    Math.min(health.infoDensityAvg * 10, 100) * 0.1 +
    (100 - Math.min(health.climaxIntervalAvg * 15, 100)) * 0.2
  );

  return health;
}

/**
 * 实时健康度 — Author View：从已有运行产物（metrics_dashboard + critic_history）现算，
 * 不再持久化 story_health.json（P3.1b：退役持久化，保留 Author View 能力）。
 */
export function computeCurrentHealth(bookDir) {
  const dashboardPath = path.join(brainSystemDir(bookDir), 'metrics_dashboard.json');
  const dashboard = exists(dashboardPath) ? readJson(dashboardPath) : { chapters: [] };
  const criticPath = path.join(brainSystemDir(bookDir), 'critic_history.json');
  const criticHistory = exists(criticPath) ? (readJson(criticPath).entries ?? []) : [];
  return computeStoryHealth(bookDir, dashboard, criticHistory, []);
}

function round(n) {
  return Math.round(n * 100) / 100;
}
