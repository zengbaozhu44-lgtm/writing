/**
 * Story Memory Hint — Planner / Writer 自动生成
 */
import { MEMORY_CATEGORIES } from './collect.js';

function chapterGap(item, currentChapter) {
  const planted = item.chapter ?? item.plantedChapter ?? 1;
  return Math.max(0, currentChapter - planted);
}

export function buildStoryMemoryHints(memory = {}, metrics = {}, { chapter = 1 } = {}) {
  const hints = [];

  for (const f of memory.foreshadow || []) {
    if (f.status === 'resolved') continue;
    const gap = chapterGap(f, chapter);
    if (gap >= 2) {
      hints.push({
        type: 'foreshadow',
        priority: gap >= 4 ? 'high' : 'medium',
        text: `伏笔「${f.text}」已 ${gap} 章未回收，建议本章推进或兑现`,
        itemId: f.id,
        gap,
      });
    }
  }

  for (const p of memory.promise || []) {
    if (p.status === 'fulfilled') continue;
    hints.push({
      type: 'promise',
      priority: 'medium',
      text: `承诺待兑现：${p.text}`,
      itemId: p.id,
    });
  }

  for (const m of memory.mystery || []) {
    if (m.solved) continue;
    hints.push({
      type: 'mystery',
      priority: 'medium',
      text: `悬而未决：${m.text}`,
      itemId: m.id,
    });
  }

  for (const a of memory.characterArc || []) {
    const stagnant = /developing|停滞|opening|初期/i.test(a.stage || '');
    if (stagnant || !a.stage || a.stage === 'developing') {
      hints.push({
        type: 'characterArc',
        priority: 'medium',
        text: `${a.character} 成长停滞（${a.stage || 'developing'}），建议推动角色弧光`,
        itemId: a.id,
        character: a.character,
      });
    }
  }

  for (const g of memory.longGoal || []) {
    const progress = g.progress ?? 0;
    if (progress < 35) {
      hints.push({
        type: 'longGoal',
        priority: 'high',
        text: `主线长期未推进：${g.text}（进度 ${progress}%）`,
        itemId: g.id,
        progress,
      });
    }
  }

  for (const c of memory.callback || []) {
    if (!/回收|呼应|兑现/.test(c.text)) {
      hints.push({
        type: 'callback',
        priority: 'low',
        text: `可呼应前文：${c.text}`,
        itemId: c.id,
      });
    }
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return hints.sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9));
}

export function buildStoryMemoryPlannerBlock(hints = [], metrics = {}, { chapter = null } = {}) {
  if (!hints.length && !metrics.openForeshadowCount) return '';

  const lines = [
    '<!-- inkos-story-memory-hints -->',
    '## Story Memory · Adaptive Planner 优先处理',
    '',
    '以下由 Story Memory 自动读取，**下一章 Director 须优先处理**（禁止像重新开始）：',
  ];

  for (const h of hints.slice(0, 8)) {
    lines.push(`- **[${h.type}]** ${h.text}`);
  }

  if (metrics.recoveryRate != null) {
    lines.push('', `伏笔回收率：${metrics.recoveryRate}% · 未回收 ${metrics.openForeshadowCount ?? 0} 条`);
  }
  if (chapter != null) lines.push(`（Chapter ${chapter} · Planner 自动引用）`);

  return lines.join('\n');
}

export function buildStoryMemoryWriterBlock(hints = [], metrics = {}, memory = {}) {
  const lines = [
    '<!-- inkos-story-memory-writer -->',
    '## Story Memory · 写作一致性（必须参考）',
  ];

  if (metrics.theme) lines.push(`- **Theme**：${metrics.theme}`);
  if (metrics.longGoals?.length) {
    lines.push('- **Long Goal**：' + metrics.longGoals.slice(0, 3).map((g) => g.text).join('；'));
  }
  if (metrics.openForeshadow?.length) {
    lines.push('- **未回收伏笔（勿遗忘）**：' + metrics.openForeshadow.slice(0, 4).map((f) => f.text).join('；'));
  }
  if (metrics.resolvedForeshadow?.length) {
    lines.push('- **已兑现伏笔（可呼应）**：' + metrics.resolvedForeshadow.slice(0, 2).map((f) => f.text).join('；'));
  }
  if (metrics.characterArcs?.length) {
    lines.push('- **角色成长**：' + metrics.characterArcs.slice(0, 3).map((a) => `${a.character}（${a.stage || '—'}）`).join('、'));
  }

  const highHints = hints.filter((h) => h.priority === 'high').slice(0, 3);
  if (highHints.length) {
    lines.push('', '**本章优先处理**：');
    for (const h of highHints) lines.push(`- ${h.text}`);
  }

  if (lines.length <= 2) return '';
  return lines.join('\n');
}

export { MEMORY_CATEGORIES };
