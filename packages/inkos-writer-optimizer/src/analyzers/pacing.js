import {
  charCount,
  hasAction,
  hasConflictMarker,
  hasDialogue,
  hasEvent,
  isExpositionSentence,
  splitSentences,
  longestRun,
} from '../utils.js';

const MAX_EXPOSITION_RUN = 250;

export function analyzePacing(text) {
  const sentences = splitSentences(text);
  const expositionRun = longestRun(sentences, isExpositionSentence);
  const failures = [];

  if (expositionRun > MAX_EXPOSITION_RUN) {
    failures.push(
      `Pacing：连续说明 ${expositionRun} 字（>${MAX_EXPOSITION_RUN}），需插入人物动作/对话/事件/冲突`,
    );
  }

  const len = charCount(text);
  const actionHits = (String(text).match(/[走跑推拉拿转看听敲按握选拒躲冲]/gu) || []).length;
  const dialogHits = (String(text).match(/[「""]/g) || []).length;
  const eventHits = hasEvent(text) ? 1 : 0;
  const conflictHits = hasConflictMarker(text) ? 1 : 0;

  const variety = [actionHits > 0, dialogHits > 0, eventHits, conflictHits].filter(Boolean).length;
  const rhythmBonus = variety >= 3 ? 20 : variety >= 2 ? 10 : 0;
  const score = expositionRun > MAX_EXPOSITION_RUN
    ? Math.max(0, 60 - Math.floor((expositionRun - MAX_EXPOSITION_RUN) / 20))
    : Math.min(100, 65 + rhythmBonus + (len > 400 ? 10 : 0));

  return {
    id: 'pacing',
    pass: failures.length === 0,
    failures,
    score,
    metrics: { expositionRun, actionHits, dialogHits, variety },
  };
}
