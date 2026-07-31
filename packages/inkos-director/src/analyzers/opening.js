import { charCount, hasEvent, isEnvironmentSentence, longestRun, splitSentences } from '../utils.js';

const OPENING_EVENT_CHARS = 300;
const MAX_ENV_RUN = 150;
const MAX_EXPOSITION_RUN = 200;

/** Opening：是否拖沓（首窗口） */
export function analyzeOpeningDrag(windowText, { isFirst, fullText }) {
  if (!isFirst) return { pass: true, failures: [], score: 100 };

  const failures = [];
  const opening = String(fullText || windowText).replace(/\s/g, '').slice(0, OPENING_EVENT_CHARS);

  if (charCount(fullText || windowText) >= 80 && !hasEvent(opening)) {
    failures.push(`Opening：前 ${OPENING_EVENT_CHARS} 字无事件，开篇拖沓`);
  }

  const sentences = splitSentences(windowText);
  const envRun = longestRun(sentences, isEnvironmentSentence);
  if (envRun > MAX_ENV_RUN) {
    failures.push(`Opening：连续环境描写 ${envRun} 字（>${MAX_ENV_RUN}），拖沓`);
  }

  const expoRun = longestRun(sentences, (s) => !hasEvent(s) && isEnvironmentSentence(s));
  if (expoRun > MAX_EXPOSITION_RUN) {
    failures.push(`Opening：连续说明/环境 ${expoRun} 字无事件推进`);
  }

  return {
    id: 'opening',
    pass: failures.length === 0,
    failures,
    score: failures.length ? Math.max(0, 100 - failures.length * 30) : 100,
  };
}
