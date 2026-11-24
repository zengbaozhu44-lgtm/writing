/**
 * Forbidden Guards — read-only negative tests.
 *
 * PASS = forbidden behavior is NOT occurring (or gap is correctly open).
 * These should remain PASS through migration unless semantics change.
 *
 * NO Reality Engine. Semantic rulings deferred to R2/R3/R4.
 */

import { buildStateDelta, resolveTimelineEvents, isActualTimelineEvent } from '../../../packages/inkos-brain/src/memory/state-updater.js';
import { parseChapterTaskProvenance } from '../../../packages/inkos-brain/src/authored/authored-input-sanitize.js';

/**
 * G01: scene.goal / mainGoal must not enter timeline.events (S6.1)
 */
export function guardSkeletonGoalsNotInTimeline() {
  const events = resolveTimelineEvents({
    intent: { mainGoal: '第17章：神级计算器' },
    scenes: [{ goal: '克服阻碍：资源不足或时间压力' }],
  });
  const pass = events.length === 0;
  return {
    pass,
    detail: pass ? 'skeleton goals blocked' : `leaked: ${JSON.stringify(events)}`,
  };
}

/**
 * G02: B-class template strings rejected by isActualTimelineEvent
 */
export function guardTemplateFallbackRejected() {
  const pass = !isActualTimelineEvent('资源不足或时间压力')
    && !isActualTimelineEvent('克服阻碍：no_causal_basis');
  return {
    pass,
    detail: pass ? 'templates rejected' : 'template accepted as timeline event',
  };
}

/**
 * G03: buildStateDelta source does not include chapterText in timeline path
 * (structural guard — function has no prose parameter in resolveTimelineEvents)
 */
export function guardResolveTimelineEventsNoProseParam() {
  const src = String(resolveTimelineEvents);
  const pass = !src.includes('chapterText') && !src.includes('scene.text');
  return {
    pass,
    detail: pass ? 'resolveTimelineEvents has no prose input' : 'prose param may exist',
  };
}

/**
 * G04: unknown provenance ≠ authored (S3.4)
 */
export function guardUnknownProvenanceNotAuthored() {
  const prov = parseChapterTaskProvenance('# 09 Current Chapter\n\n- **目标**：test\n');
  const pass = prov.kind === 'unknown';
  return {
    pass,
    detail: JSON.stringify(prov),
  };
}

/**
 * G05: empty causal + empty scenes → empty timeline (宁缺勿滥)
 */
export function guardEmptyTimelineWhenNoConsequence() {
  const events = resolveTimelineEvents({ intent: {}, scenes: [], causalChain: null });
  const pass = events.length === 0;
  return {
    pass,
    detail: `events=${JSON.stringify(events)}`,
  };
}

/**
 * G06: prose-only chapterText does not enter facts (EO-P2: facts=[] from plan path)
 */
export function guardProseNotInFactsBeyondMainGoal() {
  const delta = buildStateDelta('/tmp', 3, {
    intent: { mainGoal: '推进', pov: '主角' },
    chapterText: '盟友战死。李明死亡。全城毁灭。',
    scenes: [],
  });
  const factsBlob = JSON.stringify(delta.facts || []);
  const pass = !/盟友|李明死亡|全城毁灭/.test(factsBlob)
    && !(delta.facts || []).some((f) => /推进/.test(String(f?.fact || '')));
  return {
    pass,
    detail: factsBlob,
  };
}

const GUARD_MAP = {
  guardSkeletonGoalsNotInTimeline: guardSkeletonGoalsNotInTimeline,
  guardTemplateFallbackRejected: guardTemplateFallbackRejected,
  guardResolveTimelineEventsNoProseParam: guardResolveTimelineEventsNoProseParam,
  guardUnknownProvenanceNotAuthored: guardUnknownProvenanceNotAuthored,
  guardEmptyTimelineWhenNoConsequence: guardEmptyTimelineWhenNoConsequence,
  guardProseNotInFactsBeyondMainGoal: guardProseNotInFactsBeyondMainGoal,
};

/**
 * @param {string} assertionId
 */
export function runGuard(assertionId) {
  const fn = GUARD_MAP[assertionId];
  if (!fn) {
    return { pass: false, detail: `Unknown guard: ${assertionId}` };
  }
  return fn();
}

export function listGuardIds() {
  return Object.keys(GUARD_MAP);
}
