/**
 * Scene 节拍序列 — 禁止连续解释；要求 动作→对白→冲突→解释→动作→Hook
 */
import { segmentParagraphs } from './segment-types.js';

const REQUIRED_SEQUENCE = ['action', 'dialogue', 'conflict', 'explanation', 'action', 'hook'];
const MAX_CONSECUTIVE_EXPLANATION = 3;

function normalizeBeat(beat) {
  if (beat === 'event') return 'action';
  if (beat === 'exposition' || beat === 'setting' || beat === 'psychology') return 'explanation';
  return beat;
}

function hasSubsequence(beats, sequence) {
  let si = 0;
  for (const b of beats) {
    const norm = normalizeBeat(b);
    if (norm === sequence[si] || (si > 0 && norm === sequence[si - 1])) {
      if (norm === sequence[si]) si += 1;
    }
    if (si >= sequence.length) return true;
  }
  return si >= sequence.length;
}

export function analyzeBeatSequence(text) {
  const paragraphs = segmentParagraphs(text);
  const beats = paragraphs.map((p) => p.beat);
  const allTypes = paragraphs.flatMap((p) => p.types || [p.beat]);
  const normalized = allTypes.map(normalizeBeat);
  const failures = [];

  let consecExplain = 0;
  let maxConsecExplain = 0;
  for (const b of beats.map(normalizeBeat)) {
    if (b === 'explanation') {
      consecExplain += 1;
      maxConsecExplain = Math.max(maxConsecExplain, consecExplain);
    } else {
      consecExplain = 0;
    }
  }

  if (maxConsecExplain >= MAX_CONSECUTIVE_EXPLANATION + 1) {
    failures.push(`Pacing：Scene 连续 ${maxConsecExplain} 段解释（禁止解释×4）`);
  }

  const present = {
    action: normalized.includes('action'),
    dialogue: normalized.includes('dialogue'),
    conflict: normalized.includes('conflict'),
    explanation: normalized.includes('explanation'),
    hook: normalized.includes('hook'),
  };

  const totalChars = paragraphs.reduce((s, p) => s + p.charCount, 0);
  const sequenceOk = hasSubsequence(allTypes, REQUIRED_SEQUENCE)
    || (present.action && present.dialogue && present.conflict && present.hook);

  if (totalChars >= 600 && paragraphs.length >= 4 && !sequenceOk) {
    failures.push(
      'Pacing：Scene 节拍须含 动作→对白→冲突→解释→动作→Hook 顺序',
    );
  }

  if (totalChars >= 400 && paragraphs.length >= 3) {
    for (const [key, label] of Object.entries({
      action: '动作',
      dialogue: '对白',
      conflict: '冲突',
      hook: 'Hook',
    })) {
      if (!present[key]) {
        failures.push(`Pacing：Scene 缺少「${label}」节拍`);
      }
    }
  }

  return {
    pass: failures.length === 0,
    failures,
    beats,
    normalized,
    paragraphs: paragraphs.map((p) => ({ index: p.index, beat: p.beat, charCount: p.charCount })),
    requiredSequence: REQUIRED_SEQUENCE,
    sequenceMatched: sequenceOk,
    maxConsecutiveExplanation: maxConsecExplain,
  };
}
