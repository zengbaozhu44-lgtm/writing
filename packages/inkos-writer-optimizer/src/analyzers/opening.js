import {
  charCount,
  hasEvent,
  isEnvironmentSentence,
  splitSentences,
  longestRun,
} from '../utils.js';

const OPENING_WINDOW = 300;
const MAX_ENV_RUN = 150;

export function analyzeOpening(text) {
  const t = String(text || '');
  const compact = t.replace(/\s/g, '');
  const opening = compact.slice(0, OPENING_WINDOW);
  const failures = [];

  if (opening.length >= 80 && !hasEvent(opening)) {
    failures.push(`Opening：前 ${OPENING_WINDOW} 字未出现事件（动作/对话/冲突）`);
  }

  const sentences = splitSentences(t);
  const envRun = longestRun(sentences, isEnvironmentSentence);
  if (envRun > MAX_ENV_RUN) {
    failures.push(`Opening：连续环境描写 ${envRun} 字（>${MAX_ENV_RUN}）`);
  }

  const score = failures.length
    ? Math.max(0, 100 - failures.length * 35)
    : Math.min(100, 70 + (hasEvent(opening) ? 30 : 0));

  return {
    id: 'opening',
    pass: failures.length === 0,
    failures,
    score,
    metrics: { openingChars: charCount(opening), envRun, hasEvent: hasEvent(opening) },
  };
}
