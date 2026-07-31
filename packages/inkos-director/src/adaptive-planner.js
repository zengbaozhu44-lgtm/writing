import fs from 'node:fs';
import path from 'node:path';
import { getAdaptivePlannerDir } from './review-report.js';
import { buildAdaptiveDirectorOverrides } from './writer-first.js';

function hintsPath(bookDir, chapter) {
  return path.join(getAdaptivePlannerDir(bookDir, chapter), 'hints.json');
}

function directorOverridesPath(bookDir, chapter) {
  return path.join(getAdaptivePlannerDir(bookDir, chapter), 'director_overrides.json');
}

/**
 * 持久化 Adaptive → 下一章 Director 结构化覆盖（不是 Hint）
 */
export function persistDirectorOverrides(bookDir, chapter, overrides) {
  if (!bookDir || chapter == null || !overrides) return null;
  try {
    const dir = getAdaptivePlannerDir(bookDir, chapter);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(directorOverridesPath(bookDir, chapter), JSON.stringify(overrides, null, 2), 'utf8');
    return directorOverridesPath(bookDir, chapter);
  } catch {
    return null;
  }
}

export function loadDirectorOverrides(bookDir, chapter) {
  if (!bookDir || chapter == null) return null;
  try {
    const file = directorOverridesPath(bookDir, chapter);
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch { /* ignore */ }
  return null;
}

/**
 * 记录 Adaptive — 同时写入 Director Overrides（下一章直接生效）
 */
export function recordAdaptiveHint(bookDir, chapter, hint) {
  if (!bookDir || chapter == null) return null;
  try {
    const dir = getAdaptivePlannerDir(bookDir, chapter);
    fs.mkdirSync(dir, { recursive: true });
    const file = hintsPath(bookDir, chapter);
    let state = { hints: [], updatedAt: null };
    if (fs.existsSync(file)) {
      state = JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    state.hints = [...(state.hints || []), { ...hint, at: new Date().toISOString() }].slice(-30);
    state.updatedAt = new Date().toISOString();
    fs.writeFileSync(file, JSON.stringify(state, null, 2), 'utf8');

    if (hint.adjustments || hint.readerPreference || hint.items?.length) {
      const existing = loadDirectorOverrides(bookDir, chapter) || {};
      const merged = buildAdaptiveDirectorOverrides({
        adjustments: { ...existing, ...hint.adjustments },
        readerPreference: hint.readerPreference || existing.readerPreference,
        directives: hint.items || hint.directives || [],
        hints: state.hints,
      });
      persistDirectorOverrides(bookDir, chapter, merged);
    }

    return file;
  } catch {
    return null;
  }
}

export function loadAdaptiveHints(bookDir, chapter) {
  const file = hintsPath(bookDir, chapter);
  if (!fs.existsSync(file)) return [];
  try {
    const state = JSON.parse(fs.readFileSync(file, 'utf8'));
    return state.hints || [];
  } catch {
    return [];
  }
}

/**
 * Adaptive → Writer 执行指令（不是分析报告）
 */
export function buildWriterAdaptiveDirectives(hints = [], overrides = null) {
  const lines = [];
  if (overrides?.writerDirectives?.length) {
    for (const d of overrides.writerDirectives.slice(0, 6)) {
      lines.push(`- ${d}`);
    }
  }
  if (overrides?.libraryPrefer?.length) {
    lines.push(`- **Beat Library 优先**（Preference → Writer）：${overrides.libraryPrefer.join('、')}`);
  }
  if (overrides?.firstScreenExplosion) {
    lines.push('- **开篇强制**（Adaptive → Writer）：前 300 字须爆点');
  }
  if (overrides?.readerPreference?.recommendation) {
    lines.push(`- **放大偏好**（Preference → Writer）：${overrides.readerPreference.recommendation}`);
  }
  for (const h of (hints || []).slice(-3)) {
    for (const item of (h.items || []).slice(0, 2)) {
      if (!lines.some((l) => l.includes(item.slice(0, 20)))) {
        lines.push(`- ${item}`);
      }
    }
  }
  return lines;
}

/**
 * @deprecated 分析 Hint 块 — 优先使用 buildWriterExecutionChecklist
 * 保留兼容：转为 Writer 执行指令，不生成分析报告语气
 */
export function buildAdaptivePlannerBlock(hints = [], {
  sceneIndex = null,
  storyMemoryBlock = '',
  directorOverrides = null,
} = {}) {
  const parts = [];
  if (storyMemoryBlock) parts.push(storyMemoryBlock);

  const directives = buildWriterAdaptiveDirectives(hints, directorOverrides);
  if (!directives.length && !hints.length) return parts.join('\n\n');

  const lines = [
    '<!-- inkos-adaptive-writer-directives -->',
    '## Adaptive → Writer 执行指令（下一章/下一 Scene 须落地）',
    '',
    '**Writer First**：以下由 Reader Feedback 学习得出，须写入正文，不是报告。',
    ...directives,
  ];

  return [...parts, lines.join('\n')].filter(Boolean).join('\n\n');
}

export function hintsFromSceneReview(review) {
  if (!review) return null;
  const qualityVerdict = review.quality?.verdict || review.verdict;
  const qualityPass = review.quality?.pass ?? review.analysisPass;
  if (qualityPass === true || qualityVerdict === 'pass') return null;

  const weak = (review.weakest || review.quality?.weakest || [])
    .map((w) => `${w.id}=${w.score}`)
    .join('、');

  const suggestionItems = review.suggestions?.length
    ? review.suggestions
    : (review.weakest || review.quality?.weakest || []).map((w) => `${w.id} 评分 ${w.score}/100`);

  if (!suggestionItems.length && !weak) return null;

  return {
    source: 'scene-review',
    mode: 'analysis-only',
    blocking: false,
    targetSceneIndex: (review.scene?.index ?? 0) + 1,
    items: suggestionItems.slice(0, 4),
    suggestions: suggestionItems,
    message: `Scene Review 软分析 ${review.weightedScore ?? review.total} 分 · 薄弱：${weak || '综合质量'}`,
    sceneIndex: review.scene?.index,
    weightedScore: review.weightedScore ?? review.total,
    scores: review.scores,
    weights: review.weights,
  };
}

export function hintsFromStoryThread(threadResult) {
  if (!threadResult) return null;
  // shouldReplan 仅表示「主线提示」，写入 Hint，禁止章内 Replan
  if (!threadResult.shouldReplan && !(threadResult.analysis?.suggestions?.length)) return null;
  return {
    source: 'story-thread',
    mode: 'analysis-only',
    blocking: false,
    targetSceneIndex: null,
    items: threadResult.analysis?.suggestions?.slice(0, 6)
      || threadResult.analysis?.notes?.slice(0, 6)
      || [],
    message: threadResult.replanReason || '主线推进软提示',
    mainProgress: threadResult.analysis?.mainProgress,
  };
}
