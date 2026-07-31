/**
 * AI 创作助手 — 汇总 Story Memory / Optimizer / Review / Adaptive / Metrics
 */
import fs from 'node:fs';
import path from 'node:path';
import { readStoryMemory } from './story-memory-bridge.js';
import { readChapterWriterOptimizer } from './writer-optimizer-reader.js';
import { readStudioPromptMetrics } from './studio-metrics-reader.js';
import { loadAdaptiveLearningState } from '@inkos/adaptive-learning';
import { getBookMeta } from './book-service.js';

function loadReviewReports(bookDir, chapter) {
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
    const file = path.join(base, name, 'review_report.json');
    if (!fs.existsSync(file)) continue;
    try {
      rows.push(JSON.parse(fs.readFileSync(file, 'utf8')));
    } catch { /* skip */ }
  }
  return rows.sort((a, b) => (a.scene?.index ?? 0) - (b.scene?.index ?? 0));
}

function pushSuggestion(list, item) {
  if (!item?.text) return;
  list.push({
    id: item.id || `s_${list.length}`,
    source: item.source || 'system',
    priority: item.priority || 'medium',
    category: item.category || 'general',
    text: item.text,
    action: item.action || null,
  });
}

export function buildCreationSuggestions(bookDir, chapter) {
  const suggestions = [];
  const memory = readStoryMemory(bookDir, chapter);
  const reviews = loadReviewReports(bookDir, chapter);
  const optimizers = readChapterWriterOptimizer(bookDir, chapter);
  const metrics = readStudioPromptMetrics(bookDir, chapter);
  const adaptive = loadAdaptiveLearningState(bookDir);

  for (const h of memory.hints || []) {
    pushSuggestion(suggestions, {
      id: `memory_${h.type}_${h.itemId || suggestions.length}`,
      source: 'story-memory',
      priority: h.priority || 'medium',
      category: h.type,
      text: h.text,
      action: 'planner',
    });
  }

  const openFs = memory.dashboard?.openForeshadow || [];
  for (const f of openFs.slice(0, 3)) {
    pushSuggestion(suggestions, {
      id: `foreshadow_${f.id}`,
      source: 'story-memory',
      priority: 'high',
      category: 'foreshadow',
      text: `建议回收伏笔：${f.text}`,
      action: 'write',
    });
  }

  if ((memory.dashboard?.mainThreadProgress ?? 100) < 35) {
    pushSuggestion(suggestions, {
      id: 'main_thread_stall',
      source: 'story-memory',
      priority: 'high',
      category: 'longGoal',
      text: `主线推进率仅 ${memory.dashboard?.mainThreadProgress}% — 建议推动长期目标`,
      action: 'planner',
    });
  }

  if ((memory.dashboard?.characterArcCompletion ?? 100) < 45) {
    pushSuggestion(suggestions, {
      id: 'arc_stall',
      source: 'story-memory',
      priority: 'medium',
      category: 'characterArc',
      text: '主角成长停滞 — 建议增加角色抉择或代价场景',
      action: 'write',
    });
  }

  for (const r of reviews) {
    const weak = (r.weakest || []).filter((w) => (w.score ?? 100) < 70);
    for (const w of weak.slice(0, 2)) {
      pushSuggestion(suggestions, {
        id: `review_ch${chapter}_s${r.scene?.index}_${w.id}`,
        source: 'director-review',
        priority: 'high',
        category: w.id,
        text: `Scene ${r.scene?.index} ${w.id} 评分 ${w.score} — 建议加强`,
        action: 'rewrite',
      });
    }
    if ((r.scores?.hookDensity ?? r.scores?.hook ?? 100) < 70) {
      pushSuggestion(suggestions, {
        id: `hook_weak_ch${chapter}_s${r.scene?.index}`,
        source: 'director-review',
        priority: 'high',
        category: 'hook',
        text: `当前 Hook 密度不足（Scene ${r.scene?.index} Hook=${r.scores?.hookDensity ?? r.scores?.hook}）`,
        action: 'rewrite',
      });
    }
    if ((r.scores?.readerCuriosity ?? 100) < 68) {
      pushSuggestion(suggestions, {
        id: `curiosity_weak_ch${chapter}_s${r.scene?.index}`,
        source: 'director-review',
        priority: 'high',
        category: 'curiosity',
        text: `阅读驱动力偏低（Scene ${r.scene?.index} Curiosity=${r.scores.readerCuriosity}）`,
        action: 'rewrite',
      });
    }
  }

  const readerCurveFile = path.join(
    bookDir,
    'novel',
    '_system',
    'studio',
    'director',
    'reviews',
    `ch_${String(chapter).padStart(4, '0')}`,
    'reader_curve_report.json',
  );
  if (fs.existsSync(readerCurveFile)) {
    try {
      const curve = JSON.parse(fs.readFileSync(readerCurveFile, 'utf8'));
      for (const g of (curve.nextChapterGuidance || []).slice(0, 3)) {
        pushSuggestion(suggestions, {
          id: `reader_curve_${suggestions.length}`,
          source: 'director-review',
          priority: 'high',
          category: 'readerCurve',
          text: g,
          action: 'planner',
        });
      }
    } catch { /* skip */ }
  }

  for (const opt of optimizers) {
    const mods = opt.modules || opt.report?.modules || {};
    for (const [key, m] of Object.entries(mods)) {
      if (m.scoreBefore != null && m.scoreBefore < 72 && !m.changed) {
        pushSuggestion(suggestions, {
          id: `optimizer_${opt.sceneIndex}_${key}`,
          source: 'writer-optimizer',
          priority: 'medium',
          category: key,
          text: `Scene ${opt.sceneIndex} ${key} 模块偏弱（${m.scoreBefore} 分）— 可手动润色`,
          action: 'optimizer',
        });
      }
    }
    if ((opt.total ?? 100) < 75) {
      pushSuggestion(suggestions, {
        id: `optimizer_low_ch${chapter}_s${opt.sceneIndex}`,
        source: 'writer-optimizer',
        priority: 'medium',
        category: 'quality',
        text: `Scene ${opt.sceneIndex} 写作质量 ${opt.total} 分 — 建议查看 Diff 润色`,
        action: 'optimizer',
      });
    }
  }

  for (const s of adaptive?.suggestions || []) {
    pushSuggestion(suggestions, { ...s, source: 'adaptive' });
  }

  const agg = metrics.aggregate;
  if (agg?.avgBudgetUsage != null && agg.avgBudgetUsage > 95) {
    pushSuggestion(suggestions, {
      id: 'metrics_budget_high',
      source: 'prompt-metrics',
      priority: 'low',
      category: 'budget',
      text: `Prompt Budget 使用率 ${agg.avgBudgetUsage}% 偏高 — 考虑精简 Context`,
      action: 'metrics',
    });
  }
  if (agg?.avgCommercialScore != null && agg.avgCommercialScore < 72) {
    pushSuggestion(suggestions, {
      id: 'metrics_quality_low',
      source: 'prompt-metrics',
      priority: 'medium',
      category: 'quality',
      text: `章节平均质量 ${agg.avgCommercialScore} 分 — 建议加强冲突与 Hook`,
      action: 'metrics',
    });
  }

  if (!suggestions.some((s) => s.category === 'world' || /世界/.test(s.text))) {
    const needsWorld = reviews.some((r) => (r.scores?.style ?? 100) < 68);
    if (needsWorld) {
      pushSuggestion(suggestions, {
        id: 'world_event',
        source: 'system',
        priority: 'medium',
        category: 'world',
        text: '建议增加一次世界事件 — 推动局势变化',
        action: 'world',
      });
    }
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9));

  return {
    version: 'creation-assistant-1',
    chapter,
    generatedAt: new Date().toISOString(),
    summary: suggestions.length
      ? `今日 ${suggestions.length} 条创作建议`
      : '暂无紧急建议 — 继续推进剧情',
    suggestions: suggestions.slice(0, 12),
    sources: {
      storyMemory: Boolean(memory.hints?.length || memory.dashboard),
      directorReview: reviews.length,
      writerOptimizer: optimizers.length,
      adaptive: Boolean(adaptive?.adjustments?.activeDimensions?.length),
      promptMetrics: Boolean(agg),
    },
    adaptive: adaptive?.trends || null,
    memory: memory.dashboard || null,
  };
}

export function readCreationSuggestions(bookDir, chapter) {
  const ch = chapter || getBookMeta(bookDir).currentChapter || 1;
  return buildCreationSuggestions(bookDir, ch);
}
