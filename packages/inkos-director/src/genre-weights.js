import { REVIEW_DIMENSIONS } from './quality-score.js';

/** @typedef {'commercial'|'literary'|'suspense'|'romance'|'default'} GenreProfile */

const PROFILES = {
  commercial: {
    hookDensity: 0.22,
    questionDensity: 0.18,
    readerCuriosity: 0.20,
    twistStrength: 0.15,
    payoffDensity: 0.10,
    dialogue: 0.08,
    conflict: 0.07,
  },
  literary: {
    readerCuriosity: 0.22,
    payoffDensity: 0.18,
    twistStrength: 0.15,
    hookDensity: 0.12,
    questionDensity: 0.12,
    dialogue: 0.12,
    conflict: 0.09,
  },
  suspense: {
    hookDensity: 0.22,
    questionDensity: 0.22,
    readerCuriosity: 0.18,
    twistStrength: 0.18,
    payoffDensity: 0.08,
    dialogue: 0.06,
    conflict: 0.06,
  },
  romance: {
    readerCuriosity: 0.20,
    dialogue: 0.20,
    hookDensity: 0.15,
    questionDensity: 0.12,
    payoffDensity: 0.12,
    twistStrength: 0.11,
    conflict: 0.10,
  },
  default: {
    hookDensity: 0.18,
    questionDensity: 0.16,
    readerCuriosity: 0.18,
    twistStrength: 0.14,
    payoffDensity: 0.12,
    dialogue: 0.11,
    conflict: 0.11,
  },
};

const GENRE_HINTS = [
  { profile: 'literary', re: /文学|纯文学|严肃文学|literary/i },
  { profile: 'suspense', re: /悬疑|推理|惊悚|侦探|mystery|thriller|suspense/i },
  { profile: 'romance', re: /恋爱|言情|感情|爱情|romance|甜宠|耽美|百合/i },
  { profile: 'commercial', re: /商业|爽文|升级|玄幻|都市|科幻|奇幻|webnovel|男频|女频/i },
];

export function resolveGenreProfile(storyDna = {}, writingBible = '') {
  const corpus = [
    storyDna.genre,
    storyDna.commercial_direction,
    storyDna.reader,
    storyDna.audience,
    storyDna.core_hook,
    writingBible?.slice?.(0, 400),
  ].filter(Boolean).join(' ');

  for (const { profile, re } of GENRE_HINTS) {
    if (re.test(corpus)) return profile;
  }
  return 'default';
}

export function getGenreWeights(profile = 'default') {
  const base = PROFILES[profile] || PROFILES.default;
  const weights = {};
  for (const dim of REVIEW_DIMENSIONS) {
    weights[dim] = base[dim] ?? PROFILES.default[dim] ?? (1 / REVIEW_DIMENSIONS.length);
  }
  return weights;
}

export function resolveReviewWeights(storyDna = {}, writingBible = '') {
  const profile = resolveGenreProfile(storyDna, writingBible);
  return {
    profile,
    weights: getGenreWeights(profile),
  };
}

export function computeWeightedScore(scores, weights) {
  let sum = 0;
  let wSum = 0;
  for (const dim of REVIEW_DIMENSIONS) {
    const w = weights[dim] ?? 0;
    sum += (scores[dim] ?? 0) * w;
    wSum += w;
  }
  if (wSum <= 0) {
    const vals = REVIEW_DIMENSIONS.map((d) => scores[d] ?? 0);
    return Math.round(vals.reduce((a, b) => a + b, 0) / Math.max(vals.length, 1));
  }
  return Math.round(sum / wSum);
}
