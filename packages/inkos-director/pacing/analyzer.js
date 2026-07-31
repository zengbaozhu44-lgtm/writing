/**
 * Pacing 实时节奏分析 — 主入口
 */
import { charCount } from '../src/utils.js';
import { analyzeEventBands } from './rhythm-rules.js';
import { analyzeContinuousRuns } from './rhythm-rules.js';
import { analyzeBeatSequence } from './beat-sequence.js';
import { buildPacingReport } from './report.js';

export function analyzePacing(text, scene = {}, intent = {}, meta = {}) {
  const totalChars = charCount(text);

  const bands = analyzeEventBands(text);
  const runs = analyzeContinuousRuns(text);
  const beats = analyzeBeatSequence(text);

  const failures = [
    ...bands.failures,
    ...runs.failures,
    ...beats.failures,
  ];

  const pass = failures.length === 0;

  const report = buildPacingReport({
    pass,
    failures: [...new Set(failures)],
    totalChars,
    bands: bands.bands,
    runs: runs.runs,
    beats: {
      sequence: beats.beats,
      normalized: beats.normalized,
      paragraphs: beats.paragraphs,
      requiredSequence: beats.requiredSequence,
      sequenceMatched: beats.sequenceMatched,
      maxConsecutiveExplanation: beats.maxConsecutiveExplanation,
    },
    scene: { id: scene?.id, index: scene?.index, goal: scene?.goal },
    intent: { pov: intent?.pov, mainGoal: intent?.mainGoal },
    meta,
  });

  return {
    pass,
    failures: report.failures,
    report,
    bands: bands.bands,
    runs: runs.runs,
    beats,
    totalChars,
    rewriteHints: failures.map((f) => {
      if (f.includes('说明')) return '插入事件打断说明';
      if (f.includes('心理')) return '插入人物动作打断心理描写';
      if (f.includes('设定')) return '插入对话打断设定说明';
      if (f.includes('节拍')) return '重排 Scene 为 动作→对白→冲突→解释→动作→Hook';
      if (f.includes('事件')) return '在本节奏带加入可见事件';
      return '调整节奏';
    }),
  };
}

export { buildPacingReport } from './report.js';
export { persistPacingReport } from './report.js';
