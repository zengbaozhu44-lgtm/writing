import { MEMORY_CATEGORIES } from './collect.js';

export function analyzeStoryMemory(collected = {}) {
  const byCategory = collected.byCategory || {};
  const foreshadows = byCategory.foreshadow || [];
  const openForeshadows = foreshadows.filter((f) => !f.meta?.resolved && f.meta?.status !== 'resolved');
  const resolvedForeshadows = foreshadows.filter((f) => f.meta?.resolved || f.meta?.status === 'resolved');
  const callbacks = byCategory.callback || [];
  const longGoals = [...(byCategory.longGoal || []), ...(byCategory.promise || [])];
  const characterArcs = byCategory.characterArc || [];

  const recoveryRate = foreshadows.length
    ? Math.round((resolvedForeshadows.length / foreshadows.length) * 100)
    : null;

  return {
    openForeshadowCount: openForeshadows.length,
    openForeshadows: openForeshadows.slice(0, 12),
    resolvedForeshadowCount: resolvedForeshadows.length,
    recoveryRate,
    longGoals: longGoals.slice(0, 8),
    characterArcs: characterArcs.slice(0, 8),
    mysteries: (byCategory.mystery || []).slice(0, 6),
    themes: (byCategory.theme || []).slice(0, 4),
    readerExpectations: (byCategory.readerExpectation || []).slice(0, 6),
    callbacks: callbacks.slice(0, 8),
    categoryCounts: Object.fromEntries(
      MEMORY_CATEGORIES.map((c) => [c, (byCategory[c] || []).length]),
    ),
  };
}

/**
 * Adaptive Planner 注入块 — 引用 Story Memory
 */
export function buildStoryMemoryBlock(analysis = {}, { sceneIndex = null } = {}) {
  if (!analysis || analysis.openForeshadowCount === 0 && !analysis.longGoals?.length) {
    return '';
  }

  const lines = [
    '<!-- inkos-story-memory -->',
    '## Story Memory · 长篇一致性参考',
  ];

  if (analysis.longGoals?.length) {
    lines.push('', '**长期目标**');
    for (const g of analysis.longGoals.slice(0, 4)) {
      lines.push(`- ${g.text}`);
    }
  }

  if (analysis.openForeshadows?.length) {
    lines.push('', `**未回收伏笔（${analysis.openForeshadowCount}）**`);
    for (const f of analysis.openForeshadows.slice(0, 5)) {
      lines.push(`- ${f.text}`);
    }
  }

  if (analysis.characterArcs?.length) {
    lines.push('', '**角色成长**');
    for (const a of analysis.characterArcs.slice(0, 3)) {
      lines.push(`- ${a.text}`);
    }
  }

  if (analysis.recoveryRate != null) {
    lines.push('', `剧情回收率：${analysis.recoveryRate}%`);
  }

  if (sceneIndex != null) {
    lines.push('', `（当前 Scene ${sceneIndex} · Adaptive Planner 自动引用）`);
  }

  return lines.join('\n');
}
