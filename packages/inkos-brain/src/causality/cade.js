/**
 * EO-P4-Causal-Bridge-01 — Character-side Action Decision Evidence (CADE)
 *
 * Explicit character-side decision/commitment evidence for Action Y.
 * NOT Choice · NOT Candidate Option · NOT Agency · NOT Goal · NOT SR · NOT Attribution.
 *
 * Forbidden sole sources: Plan / Director / Writer / Desire / GGC / SR / Attribution / L1.
 */
export const CADE_VERSION = 'cade-1';
export const CADE_PROVENANCE = 'character_action_decision';
export const CADE_ENGINE = 'cade';

/** sourceRef / channel markers that must never mint CADE */
export const FORBIDDEN_CADE_SOURCE_MARKERS = Object.freeze([
  'plan.',
  'plan_',
  'chapter_plans',
  'mainGoal',
  'scene.goal',
  'priorityGoal',
  'causal_chain',
  'causalChain',
  'expectedAction',
  'expected_action',
  'director.',
  'director_',
  'directorBrief',
  'beat.action',
  'beat.choice',
  'beatPlan',
  'writer.',
  'writer_',
  'writer_output',
  'writer_prose',
  'desire',
  'desire-alone',
  'characterDesire',
  'ggc',
  'grounded_goal',
  'groundedGoalCandidate',
  'sr.',
  'sr_',
  'characterSR',
  'character_sr',
  'attribution',
  'attribution_pass',
  'l1',
  'l1_valid',
  'observeL1',
  'actual.',
  'actual_event',
]);

/** Fields that must never appear on CADE (no Choice/Option/Agency expansion) */
export const FORBIDDEN_CADE_FIELDS = Object.freeze([
  'choice',
  'choiceId',
  'choice_id',
  'options',
  'candidateOption',
  'candidateOptions',
  'agency',
  'agencyScore',
  'goalId',
  'goal_id',
  'ggc',
  'confidence',
  'confidenceId',
  'confidence_id',
]);

function norm(v) {
  return String(v || '').trim();
}

function sourceRefLooksForbidden(sourceRef = '') {
  const s = norm(sourceRef);
  if (!s) return true;
  const lower = s.toLowerCase();
  for (const marker of FORBIDDEN_CADE_SOURCE_MARKERS) {
    if (lower.includes(String(marker).toLowerCase())) return true;
  }
  return false;
}

/**
 * Reject foreign authority bags used as CADE mint attempts.
 * @returns {{ ok: boolean, reason?: string }}
 */
export function rejectForeignCADEAuthority(input = {}) {
  if (input == null || typeof input !== 'object') {
    return { ok: false, reason: 'cade_input_required' };
  }
  const keys = Object.keys(input);
  for (const f of FORBIDDEN_CADE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, f) && input[f] != null) {
      return { ok: false, reason: `forbidden_cade_field:${f}` };
    }
  }
  // Explicit foreign authority tags (tests + laundering probes)
  const authority = norm(input.authority || input.fromAuthority || input.sourceAuthority);
  if (authority) {
    const a = authority.toLowerCase();
    const banned = [
      'plan', 'director', 'writer', 'desire', 'sr', 'attribution', 'l1',
      'ggc', 'goal', 'actual', 'beat', 'causal',
    ];
    if (banned.some((b) => a === b || a.startsWith(`${b}.`) || a.startsWith(`${b}_`))) {
      return { ok: false, reason: `forbidden_authority:${authority}` };
    }
  }
  if (sourceRefLooksForbidden(input.sourceRef)) {
    return { ok: false, reason: `forbidden_sourceRef:${input.sourceRef || '(empty)'}` };
  }
  // Refuse if caller embeds plan/goal payloads as sole basis
  if (input.plan != null || input.mainGoal != null || input.sceneGoal != null
    || input.directorBrief != null || input.writerOutput != null
    || input.desireAlone != null || input.characterSR != null
    || input.attributionPass != null || input.l1Valid != null
    || input.ggc != null) {
    return { ok: false, reason: 'forbidden_embedded_authority_payload' };
  }
  void keys;
  return { ok: true };
}

/**
 * EO-P4-Intent-Realization-Correspondence-V2-01 — optional authored anchors.
 * anchors 是 Author 提供的语义辅助约束（object/action/terminal 三组），
 * 用于确定性 realization 判定；本身不是 Reality Truth，不携带任何 authority。
 * 非法结构 → 整项拒绝（fail-closed，不静默剥离）。
 */
function anchorsValid(anchors) {
  if (!anchors || typeof anchors !== 'object' || Array.isArray(anchors)) return false;
  // 只允许三组键；多余键（含 Choice-shaped 污染）→ 整项拒绝
  const keys = Object.keys(anchors);
  if (keys.some((k) => !['object', 'action', 'terminal'].includes(k))) return false;
  let total = 0;
  for (const g of ['object', 'action', 'terminal']) {
    const list = anchors[g];
    if (!Array.isArray(list) || !list.length) return false;
    for (const a of list) {
      if (typeof a !== 'string') return false;
      const s = norm(a);
      if (!s || s.length > 12) return false;
      total += 1;
    }
    if (list.length > 6) return false;
  }
  if (total < 3 || total > 12) return false;
  return true;
}

/**
 * Create validated CADE. Fail-closed.
 * @returns {{ ok: true, cade: object } | { ok: false, reason: string, cade: null }}
 */
export function createCADE(input = {}) {
  const guard = rejectForeignCADEAuthority(input);
  if (!guard.ok) {
    return { ok: false, reason: guard.reason, cade: null };
  }
  // anchors（optional）：非法结构整项拒绝（fail-closed）
  if (input.anchors != null && !anchorsValid(input.anchors)) {
    return { ok: false, reason: 'anchors_invalid', cade: null };
  }

  const characterId = norm(input.characterId || input.character || input.x);
  const actionContent = norm(input.actionContent || input.actionY || input.y || input.action);
  const provenance = norm(input.provenance) || CADE_PROVENANCE;
  const sourceRef = norm(input.sourceRef);
  const decisionKind = norm(input.decisionKind || 'commits');

  if (!characterId) return { ok: false, reason: 'characterId_required', cade: null };
  if (!actionContent) return { ok: false, reason: 'actionContent_required', cade: null };
  if (provenance !== CADE_PROVENANCE) {
    return { ok: false, reason: `provenance_must_be_${CADE_PROVENANCE}`, cade: null };
  }
  // Character-facing decision/commitment orientation (not Plan task wording alone)
  const allowedKinds = new Set(['decides', 'commits', 'self_endorsed', 'character_decision']);
  if (!allowedKinds.has(decisionKind)) {
    return { ok: false, reason: `decisionKind_invalid:${decisionKind}`, cade: null };
  }

  const id = norm(input.id)
    || `cade_${characterId}_${actionContent}`.replace(/[^\w\u4e00-\u9fff.-]/g, '_').slice(0, 120);

  const cade = {
    id,
    version: CADE_VERSION,
    characterId,
    actionContent,
    provenance: CADE_PROVENANCE,
    sourceRef,
    decisionKind,
    sceneId: input.sceneId != null ? norm(input.sceneId) : null,
    chapter: input.chapter != null ? Number(input.chapter) : null,
    // EO-P4-Correspondence-V2: optional authored anchors（语义辅助，非 Truth）
    ...(input.anchors ? { anchors: input.anchors } : {}),
    // Explicit non-identity with Choice
    isChoice: false,
    isCandidateOption: false,
  };

  return { ok: true, reason: null, cade };
}

/**
 * Validate an existing CADE record.
 */
export function validateCADE(cade = {}) {
  return createCADE(cade);
}
