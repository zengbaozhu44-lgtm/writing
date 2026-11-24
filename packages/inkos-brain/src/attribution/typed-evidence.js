/**
 * Phase 4.4.1b — Typed Evidence (FG-1)
 *
 * Adapters produce TypedEvidence only. No Situation / Plan / Desire / Pressure /
 * causal_chain / Writer raw context adapters.
 *
 * @see docs/design/phase-4.4/06_final-design-gate.md
 * @see docs/design/phase-4.4/10_implementation-plan.md
 */

export const TYPED_EVIDENCE_VERSION = 'typed-evidence-1';

export const EVIDENCE_SOURCES = Object.freeze([
  // EO-L1-Access-Carrier-01 (HS-5)：authored Access Evidence 通道（仍 Evidence-only，
  // 须过 Access Gate；非 certificate 直授）
  'authored',
  'prose',
  'occurrence',
  'occurrence_actor',
  'state',
  'sr',
  'character_hint',
  'historical_attribution',
  'historical_occurrence',
  'l1_judgment',
]);

/** Explicitly rejected as Evidence Authority / adapters (FG-1 / AA20). */
export const FORBIDDEN_EVIDENCE_SOURCES = Object.freeze([
  'situation',
  'plan',
  'desire',
  'pressure',
  'causal_chain',
  'causalChain',
  'writer_context',
  'writer_intent',
  'context_dump',
  'llm_plausibility',
]);

function baseEvidence(source, provenance, fields = {}) {
  return {
    source,
    role: 'evidence',
    provenance,
    time: fields.time != null ? fields.time : null,
    eventRef: fields.eventRef != null ? String(fields.eventRef) : null,
    sceneId: fields.sceneId != null ? String(fields.sceneId) : null,
    forbiddenAsAuthority: true,
    payload: fields.payload || {},
  };
}

export function validateTypedEvidence(ev) {
  const errors = [];
  if (!ev || typeof ev !== 'object') return { ok: false, errors: ['not_object'] };
  if (ev.role !== 'evidence') errors.push('role_must_be_evidence');
  if (!EVIDENCE_SOURCES.includes(ev.source)) errors.push(`source_invalid:${ev.source}`);
  if (FORBIDDEN_EVIDENCE_SOURCES.includes(ev.source)) errors.push(`source_forbidden:${ev.source}`);
  if (ev.forbiddenAsAuthority !== true) errors.push('forbiddenAsAuthority_required');
  if (!String(ev.provenance || '').trim()) errors.push('provenance_required');
  return { ok: errors.length === 0, errors };
}

export function assertNoForbiddenEvidenceSources(list = []) {
  const bad = [];
  for (const ev of list) {
    if (FORBIDDEN_EVIDENCE_SOURCES.includes(ev?.source)) bad.push(ev.source);
    if (ev?.role === 'attribution' || ev?.role === 'certificate') {
      bad.push(`illegal_role:${ev.role}`);
    }
  }
  if (bad.length) {
    const err = new Error(`FORBIDDEN_EVIDENCE_SOURCE:${bad.join(',')}`);
    err.code = 'FORBIDDEN_EVIDENCE_SOURCE';
    throw err;
  }
  return true;
}

/** Reject building evidence from Situation. */
export function evidenceFromSituation() {
  return {
    ok: false,
    reason: 'situation_not_evidence',
    detail: 'Situation = Context only (AA20); no Evidence adapter',
  };
}

export function evidenceFromProseExcerpt(opts = {}) {
  const excerpt = String(opts.excerpt || '').trim();
  if (!excerpt) return null;
  return baseEvidence('prose', 'adapter:prose_excerpt', {
    time: opts.time,
    eventRef: opts.eventRef,
    sceneId: opts.sceneId,
    payload: {
      excerpt: excerpt.slice(0, 500),
      offset: opts.offset != null ? opts.offset : null,
      pov: opts.pov || null,
      characterId: opts.characterId || null,
      subjectAbsent: opts.subjectAbsent === true,
      subjectPresentCue: opts.subjectPresentCue === true,
      agencyCue: opts.agencyCue === true,
      coercionTradeoffCue: opts.coercionTradeoffCue === true,
    },
  });
}

export function evidenceFromOccurrence(opts = {}) {
  const action = String(opts.action || '').trim();
  if (!action && !opts.eventId) return null;
  return baseEvidence('occurrence', 'adapter:occurrence', {
    time: opts.time,
    eventRef: opts.eventId || opts.eventRef,
    sceneId: opts.sceneId,
    payload: {
      eventId: opts.eventId || null,
      action: action.slice(0, 200),
      kind: opts.kind || null,
      // Occurrence alone is never sufficient for PASS (Gate rule)
      sufficientAlone: false,
    },
  });
}

export function evidenceFromOccurrenceActor(opts = {}) {
  const name = String(opts.characterId || opts.name || '').trim();
  if (!name) return null;
  return baseEvidence('occurrence_actor', 'adapter:occurrence_actor', {
    time: opts.time,
    eventRef: opts.eventId || opts.eventRef,
    sceneId: opts.sceneId,
    payload: {
      characterId: name,
      // Grammar/participant mention ≠ Attributed Actor (AA18)
      isAttributedActor: false,
      sufficientAlone: false,
    },
  });
}

export function evidenceFromStateSlice(opts = {}) {
  return baseEvidence('state', 'adapter:state_slice', {
    time: opts.time,
    eventRef: opts.eventRef,
    sceneId: opts.sceneId,
    payload: {
      characterId: opts.characterId || null,
      properties: opts.properties && typeof opts.properties === 'object' ? { ...opts.properties } : {},
      // State alone ↛ Attribution (AA16)
      sufficientAlone: false,
      isAuthority: false,
    },
  });
}

export function evidenceFromSRSlots(opts = {}) {
  return baseEvidence('sr', 'adapter:sr_slots', {
    time: opts.time,
    eventRef: opts.eventRef,
    sceneId: opts.sceneId,
    payload: {
      characterId: opts.characterId || null,
      awareness: Array.isArray(opts.awareness) ? opts.awareness.slice(0, 20) : [],
      belief: Array.isArray(opts.belief) ? opts.belief.slice(0, 20) : [],
      stance: Array.isArray(opts.stance) ? opts.stance.slice(0, 20) : [],
      // SR ≠ Causal History Authority (AA19)
      sufficientAlone: false,
      isCausalHistoryAuthority: false,
    },
  });
}

export function evidenceFromCharacterHint(opts = {}) {
  const hint = opts.hint && typeof opts.hint === 'object' ? opts.hint : null;
  if (!hint) return null;
  return baseEvidence('character_hint', 'adapter:character_hint', {
    time: opts.time,
    eventRef: hint.eventId || opts.eventRef,
    sceneId: opts.sceneId,
    payload: {
      characterId: hint.character || opts.characterId || null,
      action: hint.action || null,
      stateChanges: Array.isArray(hint.stateChanges) ? hint.stateChanges.slice(0, 20) : [],
      kind: 'occurrence_derived_hint',
      authority: false,
      sufficientAlone: false,
    },
  });
}

export function evidenceFromPriorPass(opts = {}) {
  return baseEvidence('historical_attribution', 'adapter:prior_attribution', {
    time: opts.time,
    eventRef: opts.eventRef,
    sceneId: opts.sceneId,
    payload: {
      priorRecordId: opts.priorRecordId || null,
      priorStatus: opts.priorStatus || null,
      priorCharacterId: opts.characterId || null,
      // Historical PASS ↛ auto current PASS (A5 / AA10)
      transfersToCurrent: false,
      sufficientAlone: false,
    },
  });
}

export function evidenceFromTimeline(opts = {}) {
  const line = String(opts.line || opts.candidate || '').trim();
  if (!line) return null;
  return baseEvidence('historical_occurrence', 'adapter:timeline', {
    time: opts.time,
    eventRef: opts.eventRef,
    sceneId: opts.sceneId,
    payload: {
      line: line.slice(0, 300),
      sufficientAlone: false,
    },
  });
}

export function evidenceFromL1(opts = {}) {
  const judgment = String(opts.judgment || opts.status || '').toUpperCase();
  if (!['VALID', 'UNKNOWN', 'INVALID'].includes(judgment)) return null;
  return baseEvidence('l1_judgment', 'adapter:l1_judgment', {
    time: opts.time,
    eventRef: opts.eventRef,
    sceneId: opts.sceneId,
    payload: {
      judgment,
      // L1 ≠ Attribution Authority
      sufficientAlone: false,
      isAttributionAuthority: false,
    },
  });
}
