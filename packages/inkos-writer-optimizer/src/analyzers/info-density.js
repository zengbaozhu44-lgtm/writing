import { isLoreSentence, longestRun, splitSentences } from '../utils.js';

const MAX_LORE_RUN = 200;

export function analyzeInfoDensity(text) {
  const sentences = splitSentences(text);
  const loreRun = longestRun(sentences, isLoreSentence);
  const failures = [];

  if (loreRun > MAX_LORE_RUN) {
    failures.push(`Information Density：世界观解释连续 ${loreRun} 字（>${MAX_LORE_RUN}）`);
  }

  const loreHits = sentences.filter(isLoreSentence).length;
  const score = loreRun > MAX_LORE_RUN
    ? Math.max(0, 70 - Math.floor((loreRun - MAX_LORE_RUN) / 15))
    : Math.min(100, 85 - loreHits * 5);

  return {
    id: 'infoDensity',
    pass: failures.length === 0,
    failures,
    score,
    metrics: { loreRun, loreHits },
  };
}
