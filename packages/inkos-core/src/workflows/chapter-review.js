import path from 'node:path';
import YAML from 'yaml';
import { readJson, writeJson, writeText } from '../lib/paths.js';
import { getBookPaths } from '../lib/book.js';
import { readYaml, writeYaml } from '../lib/yaml-store.js';

const DIMENSIONS = [
  'goal_progress',
  'conflict',
  'character_growth',
  'info_release',
  'foreshadow',
  'pacing',
  'readability',
  'world_progress',
  'emotion_curve',
];

const LABELS = {
  goal_progress: '目标推进',
  conflict: '冲突',
  character_growth: '人物成长',
  info_release: '信息释放',
  foreshadow: '伏笔',
  pacing: '节奏',
  readability: '可读性',
  world_progress: '世界推进',
  emotion_curve: '情绪曲线',
};

const THRESHOLD = 80;

export function runChapterReview(bookDir, chapter, scores = {}) {
  const bp = getBookPaths(bookDir);
  if (bp.version !== 4) throw new Error(`仅支持 V4`);

  const review = { chapter, threshold: THRESHOLD, dimensions: {}, total: 0, pass: false, suggestions: [], checklist: {} };

  let sum = 0;
  for (const dim of DIMENSIONS) {
    const score = Number(scores[dim] ?? 0);
    review.dimensions[dim] = { label: LABELS[dim], score };
    sum += score;
    if (score < THRESHOLD) review.suggestions.push(suggest(dim, score));
  }

  review.total = Math.round(sum / DIMENSIONS.length);
  review.pass = review.total >= THRESHOLD;
  if (!review.pass) review.suggestions.unshift(`总分 ${review.total} 低于 ${THRESHOLD}，建议修改本章。`);

  review.checklist = {
    plot_advanced: (scores.goal_progress ?? 0) >= 70,
    info_added: (scores.info_release ?? 0) >= 70,
    character_moved: (scores.character_growth ?? 0) >= 70,
    situation_changed: (scores.world_progress ?? 0) >= 70,
    hook_left: (scores.foreshadow ?? 0) >= 70,
  };

  const outPath = path.join(bp.modules.chapter_review, `ch_${String(chapter).padStart(4, '0')}.yaml`);
  writeText(outPath, YAML.stringify(review, { lineWidth: 0 }));

  const manifest = readJson(bp.manifest);
  manifest.lastReviewScore = review.total;
  manifest.lastReviewChapter = chapter;
  writeJson(bp.manifest, manifest);

  return { ...review, path: outPath };
}

function suggest(dim, score) {
  const map = {
    goal_progress: '现实目标未清晰推进，检查 09_current_chapter。',
    conflict: '冲突不足，增加利益阻碍或代价。',
    character_growth: '缺少主动决策，补利益计算后的选择。',
    info_release: '信息释放失衡，遵守信息收费。',
    foreshadow: '伏笔未埋设/推进，更新 12_foreshadow_db。',
    pacing: '节奏单调，考虑硬切或缓冲。',
    readability: '解释性文字过多，回归身体先行。',
    world_progress: '局势未变，更新 07_state_board。',
    emotion_curve: '情绪平坦，增加感官反差。',
  };
  return `[${LABELS[dim]} ${score}] ${map[dim]}`;
}

export function reviewFromDelta(bookDir, chapter, delta) {
  return runChapterReview(bookDir, chapter, delta.review || {});
}
