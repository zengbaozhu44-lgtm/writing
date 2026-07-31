import { charCount } from '../utils.js';

const DIALOGUE_RE = /[「""『][^」""』\n]{2,}?[」""』]/g;
const SPEECH_RE = /[\u4e00-\u9fa5]{2,4}(?:说|问|道|喊|叫|低声|沉声|开口)[：:][^\n]{2,}/g;

/** Dialogue：是否不足（每 500 字至少 1 次对话） */
export function analyzeDialogueDensity(windowText, { charCount: winChars }) {
  const quoted = (String(windowText).match(DIALOGUE_RE) || []).length;
  const speech = (String(windowText).match(SPEECH_RE) || []).length;
  const count = quoted + speech;
  const failures = [];

  const len = winChars || charCount(windowText);
  if (len >= 200 && count < 1) {
    failures.push(`Dialogue：本检测点 ${len} 字对话不足（需 ≥1 次）`);
  }

  return {
    id: 'dialogue',
    pass: failures.length === 0,
    failures,
    score: count >= 1 ? 100 : Math.max(0, 50 - len / 20),
    metrics: { dialogueBlocks: count, charCount: len },
  };
}
