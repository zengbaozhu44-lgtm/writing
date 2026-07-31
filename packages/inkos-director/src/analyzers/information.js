import { isLoreSentence, longestRun, splitSentences } from '../utils.js';

const MAX_LORE_RUN = 200;

/** Information：世界观/说明是否过多 */
export function analyzeInformationOverload(windowText) {
  const sentences = splitSentences(windowText);
  const loreRun = longestRun(sentences, isLoreSentence);
  const failures = [];

  if (loreRun > MAX_LORE_RUN) {
    failures.push(`Information：世界观解释连续 ${loreRun} 字（>${MAX_LORE_RUN}）`);
  }

  return {
    id: 'information',
    pass: failures.length === 0,
    failures,
    score: loreRun > MAX_LORE_RUN ? Math.max(0, 60 - loreRun / 10) : 100,
    metrics: { loreRun },
  };
}
