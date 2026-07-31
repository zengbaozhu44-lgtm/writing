/**
 * 节奏规则 — 事件带 + 连续说明/心理/设定
 */
import { charCount, hasEvent, splitSentences } from '../src/utils.js';
import {
  isExpositionOnly,
  isPsychologySentence,
  isSettingSentence,
  isExplanationSentence,
  longestTypedRun,
} from './segment-types.js';

export const BAND_MIN = 800;
export const BAND_MAX = 1200;
export const MAX_EXPOSITION_RUN = 250;
export const MAX_PSYCHOLOGY_RUN = 180;
export const MAX_SETTING_RUN = 150;

export function splitPacingBands(text, min = BAND_MIN, max = BAND_MAX) {
  const sentences = splitSentences(text);
  const bands = [];
  let cur = { sentences: [], chars: 0 };

  for (const s of sentences) {
    const c = charCount(s);
    if (cur.chars >= min && cur.chars + c > max) {
      bands.push(cur);
      cur = { sentences: [s], chars: c };
    } else {
      cur.sentences.push(s);
      cur.chars += c;
    }
  }
  if (cur.chars > 0) bands.push(cur);

  if (!bands.length && charCount(text) > 0) {
    bands.push({ sentences: splitSentences(text).length ? splitSentences(text) : [text], chars: charCount(text) });
  }

  return bands.map((b, index) => ({
    index,
    charCount: b.chars,
    text: b.sentences.join(''),
    hasEvent: b.sentences.some((s) => hasEvent(s)),
  }));
}

function isExpositionRunSentence(s) {
  return isExpositionOnly(s) || isExplanationSentence(s);
}

export function analyzeEventBands(text) {
  const bands = splitPacingBands(text);
  const failures = [];

  for (const band of bands) {
    if (band.charCount >= BAND_MIN && !band.hasEvent) {
      failures.push(`Pacing：节奏带 ${band.index + 1}（${band.charCount} 字，${BAND_MIN}~${BAND_MAX}）未发生事件`);
    }
  }

  return { bands, failures, pass: failures.length === 0 };
}

export function analyzeContinuousRuns(text) {
  const sentences = splitSentences(text);
  const failures = [];

  const expositionRun = longestTypedRun(sentences, isExpositionRunSentence);
  if (expositionRun > MAX_EXPOSITION_RUN) {
    failures.push(`Pacing：连续说明 ${expositionRun} 字（>${MAX_EXPOSITION_RUN}）→ 须加入事件`);
  }

  const psychologyRun = longestTypedRun(sentences, isPsychologySentence);
  if (psychologyRun > MAX_PSYCHOLOGY_RUN) {
    failures.push(`Pacing：连续心理描写 ${psychologyRun} 字（>${MAX_PSYCHOLOGY_RUN}）→ 须加入动作`);
  }

  const settingRun = longestTypedRun(sentences, isSettingSentence);
  if (settingRun > MAX_SETTING_RUN) {
    failures.push(`Pacing：连续设定 ${settingRun} 字（>${MAX_SETTING_RUN}）→ 须加入对话`);
  }

  return {
    pass: failures.length === 0,
    failures,
    runs: {
      exposition: expositionRun,
      psychology: psychologyRun,
      setting: settingRun,
      limits: {
        exposition: MAX_EXPOSITION_RUN,
        psychology: MAX_PSYCHOLOGY_RUN,
        setting: MAX_SETTING_RUN,
      },
    },
  };
}

export function analyzeRealtimeWindow(text, offsetChars = 0) {
  /** 实时窗口 — 对任意切片执行连续规则（供流式扩展） */
  const runs = analyzeContinuousRuns(text);
  return {
    offsetChars,
    charCount: charCount(text),
    ...runs,
  };
}
