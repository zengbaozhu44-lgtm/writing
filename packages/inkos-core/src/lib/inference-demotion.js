/**
 * EO-P4 — Inference / Anchor semantic demotion
 *
 * Binding: Inference → candidate / evidence / ops hint only.
 * Inference ↛ fact / obtains / Reality Authority.
 *
 * Does NOT produce obtains. Authority Act is a separate EO-P6 module.
 *
 * @see golden/reality/d1-implementation-contract/INFERENCE-DEMOTION.md
 */

export const AUTHORITY_ACT_STATUS = 'NOT_AN_AUTHORITY_ACT';
export const CLAIM_LEVEL_AUTHORITY = 'NOT_THIS_PATH';

/** @returns {object} */
export function stampInferenceCandidate(extra = {}) {
  return {
    eo: 'EO-P4',
    role: 'inference_candidate',
    producesObtains: false,
    isRealityAuthority: false,
    isWorldFact: false,
    authorityAct: AUTHORITY_ACT_STATUS,
    claimLevelAuthority: CLAIM_LEVEL_AUTHORITY,
    note: 'Inference ≠ fact. Candidate / evidence / Writer instruction only.',
    ...extra,
  };
}

/** @returns {object} */
export function stampOpsHint(extra = {}) {
  return {
    eo: 'EO-P4',
    role: 'operational_planner_hint',
    producesObtains: false,
    isRealityAuthority: false,
    isCharacterReality: false,
    isRelationshipFact: false,
    authorityAct: AUTHORITY_ACT_STATUS,
    claimLevelAuthority: CLAIM_LEVEL_AUTHORITY,
    note: 'Anchor / heuristic ops hint ≠ Reality / obtains.',
    ...extra,
  };
}

/**
 * @param {object} stamped — object carrying d1InferenceDemotion
 */
export function assertInferenceDemoted(stamped) {
  const d = stamped?.d1InferenceDemotion;
  if (!d) return { pass: false, detail: 'missing d1InferenceDemotion' };
  const pass = d.producesObtains === false
    && d.isRealityAuthority === false
    && d.authorityAct === 'NOT_AN_AUTHORITY_ACT'
    && d.claimLevelAuthority === 'NOT_THIS_PATH'
    && (d.role === 'inference_candidate' || d.role === 'operational_planner_hint');
  return {
    pass,
    detail: pass ? `demoted as ${d.role}` : JSON.stringify(d),
  };
}
