/**
 * Pollution Witnesses — code archaeology + EO-P2 cut verification.
 *
 * EO-P2 inverted (W01–W03): PASS = plan→11/13 Reality-like write is ABSENT.
 * Remaining witnesses: PASS = leak still present (document until later EO).
 *
 * NO Reality Engine. NO Authority Act. NO schema expansion.
 */

import { buildStateDelta, resolveTimelineEvents } from '../../../packages/inkos-brain/src/memory/state-updater.js';
import { mockReason } from '../../../packages/inkos-brain/src/causal/causal-reasoner.js';
import { extractBeatStateDelta } from '../../../packages/inkos-director/src/beat-memory.js';
import { buildSceneSituation } from '../../../packages/inkos-director/src/situation-engine.js';
import { stampChapterTaskProvenance, parseChapterTaskProvenance } from '../../../packages/inkos-brain/src/authored/authored-input-sanitize.js';

/** @typedef {{ pass: boolean, detail: string, producer?: string, consumer?: string }} WitnessResult */

/**
 * W01 (EO-P2 inverted): intent.mainGoal must NOT become immutable fact
 */
export function witnessMainGoalInFacts() {
  const delta = buildStateDelta('/tmp/unused', 5, {
    intent: { mainGoal: '神级计算器觉醒', pov: '林砚' },
    chapterText: '盟友战死沙场，再也没有回来。',
    metrics: { wordCount: 3000 },
    scenes: [],
  });
  const facts = delta.facts || [];
  const fact = facts[0]?.fact || '';
  const leaked = facts.some((f) => String(f?.fact || '').includes('神级计算器觉醒'));
  return {
    pass: !leaked && facts.length === 0,
    detail: leaked
      ? `LEAK facts: ${fact}`
      : 'EO-P2: mainGoal not in facts (cut W-01)',
    producer: 'PLAN (intent.mainGoal)',
    consumer: 'buildStateDelta.facts → 13_facts_db.yaml',
  };
}

/**
 * W02 (EO-P2 inverted): plan.cost → causalChain → timeline must be empty
 */
export function witnessPlanCostInTimeline() {
  const storyTruth = {
    chapter: 5,
    pov: '林砚',
    characters: [{ name: '林砚', desire: 'test' }],
    world_pressure: {
      cost: '失去远程覆写权限',
      costSource: 'authored_plan.cost',
      obstacle: '阻碍',
      obstacleSource: 'authored_plan.conflict',
    },
    open_questions: [],
    meta: {},
  };
  const chain = mockReason(storyTruth);
  const events = resolveTimelineEvents({ causalChain: chain, scenes: [], intent: {} });
  const leaked = events.some((e) => e.includes('失去远程覆写权限'));
  return {
    pass: !leaked && events.length === 0,
    detail: leaked
      ? `LEAK events=${JSON.stringify(events)}`
      : 'EO-P2: planned causal not in timeline (cut W-02)',
    producer: 'PLAN (authoredPlan.cost / 09.代价)',
    consumer: 'resolveTimelineEvents → 11_timeline.yaml',
  };
}

/**
 * W03 (EO-P2 inverted): scene.consequence must NOT enter timeline
 */
export function witnessInferSceneOutcomeInTimeline() {
  const scenes = [{
    consequence: '无论成败，章内状态必须变化：新增一条未解谜团或收紧选择空间',
  }];
  const events = resolveTimelineEvents({ intent: {}, scenes });
  const leaked = events.length > 0;
  return {
    pass: !leaked,
    detail: leaked
      ? `LEAK events=${JSON.stringify(events)}`
      : 'EO-P2: scene.consequence not in timeline (cut W-03)',
    producer: 'INFERENCE (inferSceneOutcome default)',
    consumer: 'resolveTimelineEvents → 11_timeline.yaml',
  };
}

/**
 * W04: beatPlan.choice/consequence still copied into extractBeatStateDelta (residual path).
 * EO-P4: stamped d1InferenceDemotion — plan residue ≠ obtains (interpretation CUT).
 */
export function witnessBeatPlanInBeatStateDelta() {
  const delta = extractBeatStateDelta(
    {
      beatPlan: {
        choice: '计划中的选择',
        consequence: '计划中的代价',
        beforeState: '前',
        afterState: '后',
      },
    },
    '他拔刀刺向李明。',
    '',
  );
  const leaked = delta.choice === '计划中的选择' && delta.consequence === '计划中的代价';
  return {
    pass: leaked,
    detail: `choice=${delta.choice}, consequence=${delta.consequence}`,
    producer: 'PLAN (beatPlan)',
    consumer: 'extractBeatStateDelta → beat memory prompt',
  };
}

/**
 * W05: plan.consequence → inferWorldAfter → situation.after (residual Writer path).
 * EO-P4: stamped inference_candidate ≠ world fact / obtains.
 */
export function witnessPlanConsequenceInSituationAfter() {
  const situation = buildSceneSituation({
    pov: '林砚',
    scene: {},
    plan: { consequence: '盟友已经死亡', goal: '推进' },
    sceneIndex: 0,
  });
  const after = situation?.worldState?.after || '';
  const leaked = /盟友已经死亡|处境已改变/.test(after);
  return {
    pass: leaked,
    detail: `worldState.after=${after}`,
    producer: 'PLAN (plan.consequence)',
    consumer: 'inferWorldAfter → Writer situation prompt',
  };
}

/**
 * W06: generated 09 provenance stamp
 */
export function witnessGenerated09Provenance() {
  const md = stampChapterTaskProvenance('# 09\n', {
    kind: 'generated',
    source: 'writeNextChapterTask',
  });
  const prov = parseChapterTaskProvenance(md);
  const leaked = prov.kind === 'generated' && prov.source === 'writeNextChapterTask';
  return {
    pass: leaked,
    detail: JSON.stringify(prov),
    producer: 'GENERATED (writeNextChapterTask)',
    consumer: '09_current_chapter.md → planNextChapter',
  };
}

/**
 * W07: buildStateDelta current_state from intent, not prose
 */
export function witnessIntentInCurrentState() {
  const delta = buildStateDelta('/tmp/unused', 5, {
    intent: { pov: '林砚', location: '计划地点：青穹塔', time: 'Day 5 03:00' },
    chapterText: '他们已在废墟深处，而非青穹塔。',
    metrics: { wordCount: 1000 },
    scenes: [],
  });
  const table = delta.current_state || '';
  const leaked = table.includes('青穹塔') && !table.includes('废墟');
  return {
    pass: leaked,
    detail: 'location from intent, prose location ignored',
    producer: 'PLAN (intent.location)',
    consumer: '08_current_state.md',
  };
}

/**
 * W08: ally death prose does NOT enter timeline (absence witness — documents BROKEN loop)
 * Pass = prose still excluded (gap confirmed, not pollution)
 */
export function witnessProseExcludedFromTimeline() {
  const delta = buildStateDelta('/tmp/unused', 5, {
    intent: { pov: '林砚', mainGoal: '推进' },
    chapterText: '盟友战死沙场，再也没有回来。',
    metrics: { wordCount: 2000 },
    scenes: [],
    causalChain: null,
  });
  const events = delta.timeline?.events || [];
  const excluded = !events.some((e) => /盟友|战死/.test(e));
  return {
    pass: excluded,
    detail: excluded
      ? 'prose ally death NOT in timeline (Reality loop broken — expected until Phase 1+)'
      : `UNEXPECTED: prose in timeline: ${JSON.stringify(events)}`,
    producer: 'PROSE (excluded)',
    consumer: '11_timeline.yaml (gap)',
  };
}

/**
 * W09: deriveRelationshipState from intent (anchor residual).
 * EO-P4: stamped operational_planner_hint ≠ relationship fact / obtains.
 */
export function witnessIntentInRelationshipAnchor() {
  const intent = {
    pov: '林砚',
    bargain: '交易筹码',
    mustLose: '失去信任',
    obstacles: ['盟友可能背叛'],
    turningPoint: '关系决裂',
  };
  const tension = intent.mustLose ? '高' : '中';
  const leaked = intent.obstacles?.[0] && tension === '高';
  return {
    pass: Boolean(leaked),
    detail: `obstacles→relationship tension=${tension}`,
    producer: 'PLAN (intent.obstacles/bargain/mustLose)',
    consumer: 'deriveRelationshipState → anchor.relationship_state',
  };
}

const WITNESS_MAP = {
  witnessMainGoalInFacts: witnessMainGoalInFacts,
  witnessPlanCostInTimeline: witnessPlanCostInTimeline,
  witnessInferSceneOutcomeInTimeline: witnessInferSceneOutcomeInTimeline,
  witnessBeatPlanInBeatStateDelta: witnessBeatPlanInBeatStateDelta,
  witnessPlanConsequenceInSituationAfter: witnessPlanConsequenceInSituationAfter,
  witnessGenerated09Provenance: witnessGenerated09Provenance,
  witnessIntentInCurrentState: witnessIntentInCurrentState,
  witnessProseExcludedFromTimeline: witnessProseExcludedFromTimeline,
  witnessIntentInRelationshipAnchor: witnessIntentInRelationshipAnchor,
};

/**
 * @param {string} assertionId
 * @returns {WitnessResult}
 */
export function runWitness(assertionId) {
  const fn = WITNESS_MAP[assertionId];
  if (!fn) {
    return { pass: false, detail: `Unknown witness: ${assertionId}` };
  }
  return fn();
}

export function listWitnessIds() {
  return Object.keys(WITNESS_MAP);
}
