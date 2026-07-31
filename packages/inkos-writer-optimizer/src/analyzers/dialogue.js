import { charCount } from '../utils.js';

const DIALOGUE_RE = /[「""『][^」""』\n]{2,}?[」""』]/g;

export function countDialogueBlocks(text) {
  return (String(text || '').match(DIALOGUE_RE) || []).length;
}

export function analyzeDialogue(text) {
  const len = charCount(text);
  const blocks = countDialogueBlocks(text);
  const required = Math.max(1, Math.ceil(len / 1000));
  const failures = [];

  if (blocks < required) {
    failures.push(`Dialogue：每 1000 字至少 1 次对话（当前 ${len} 字 / ${blocks} 次，需 ≥${required}）`);
  }

  const ratio = len ? Math.min(1, blocks / required) : 0;
  const score = Math.round(Math.min(100, ratio * 100));

  return {
    id: 'dialogue',
    pass: failures.length === 0,
    failures,
    score,
    metrics: { charCount: len, dialogueBlocks: blocks, required },
  };
}
