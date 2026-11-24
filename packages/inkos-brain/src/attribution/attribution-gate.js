/**
 * Phase 4.4.1b — Attribution Gate (deterministic)
 *
 * Consumes TypedEvidence[] only. Writes Registry only via Gate-owned write key.
 * Does NOT: LLM context dump, Choice/Consequence output, pipeline wiring (4.4.1c),
 * densify UNKNOWN×N → PASS.
 *
 * @see docs/design/phase-4.4/06_final-design-gate.md
 */
import {
  appendAttributionFromGate,
  upsertAttributionFromGate,
  ATTRIBUTION_GATE_WRITER,
} from './attribution-registry.js';
import { ATTRIBUTION_GATE_WRITE_KEY } from './write-key.js';
import {
  assertNoForbiddenEvidenceSources,
  validateTypedEvidence,
  FORBIDDEN_EVIDENCE_SOURCES,
} from './typed-evidence.js';

export const ATTRIBUTION_GATE_VERSION = 'attribution-gate-1';
export const ATTRIBUTION_GATE_ENGINE = 'attribution-gate';

/**
 * Deterministic adjudication.
 * Conservative: prefer UNKNOWN over false PASS.
 */
export function adjudicateAttribution(input = {}) {
  const characterId = String(input.characterId || '').trim();
  const actionDescription = String(input.actionDescription || '').trim();
  const evidence = Array.isArray(input.evidence) ? input.evidence : [];
  const reasons = [];

  if (!characterId) {
    return { status: 'UNKNOWN', reasons: ['characterId_required'], choice: undefined, consequence: undefined };
  }
  if (!actionDescription) {
    return { status: 'UNKNOWN', reasons: ['actionDescription_required'], choice: undefined, consequence: undefined };
  }

  try {
    assertNoForbiddenEvidenceSources(evidence);
  } catch (err) {
    return {
      status: 'UNKNOWN',
      reasons: [err.message || 'forbidden_evidence'],
      choice: undefined,
      consequence: undefined,
    };
  }

  for (const ev of evidence) {
    const v = validateTypedEvidence(ev);
    if (!v.ok) {
      return {
        status: 'UNKNOWN',
        reasons: [`invalid_evidence:${v.errors.join(',')}`],
        choice: undefined,
        consequence: undefined,
      };
    }
  }

  let subjectAbsent = false;
  let subjectPresentCue = false;
  let agencyCue = false;
  let coercionTradeoffCue = false;
  let hasProse = false;
  let onlyInsufficientAlone = evidence.length > 0;

  for (const ev of evidence) {
    const p = ev.payload || {};
    if (p.subjectAbsent === true) subjectAbsent = true;
    if (p.subjectPresentCue === true) subjectPresentCue = true;
    if (p.agencyCue === true) agencyCue = true;
    if (p.coercionTradeoffCue === true) coercionTradeoffCue = true;
    if (ev.source === 'prose') hasProse = true;
    if (p.sufficientAlone === false || p.sufficientAlone == null) {
      /* most sources are insufficient alone */
    } else {
      onlyInsufficientAlone = false;
    }
  }

  if (subjectAbsent) {
    reasons.push('subject_absent');
    return {
      status: 'INVALID',
      reasons,
      choice: undefined,
      consequence: undefined,
    };
  }

  // AA16: State (or any insufficient-alone set) without prose subject+agency → UNKNOWN
  const agencyOk = agencyCue || coercionTradeoffCue;
  if (hasProse && subjectPresentCue && agencyOk) {
    reasons.push('prose_subject_and_agency');
    return {
      status: 'PASS',
      reasons,
      choice: undefined,
      consequence: undefined,
    };
  }

  if (evidence.length === 0) {
    reasons.push('no_evidence');
  } else if (!hasProse) {
    reasons.push('no_prose_evidence');
  } else if (!subjectPresentCue) {
    reasons.push('no_subject_present_cue');
  } else if (!agencyOk) {
    reasons.push('no_agency_cue');
  }

  // AA21: never upgrade by counting UNKNOWN evidence items
  reasons.push('insufficient_for_pass');
  return {
    status: 'UNKNOWN',
    reasons,
    choice: undefined,
    consequence: undefined,
  };
}

function gateWriteOpts() {
  return {
    writer: ATTRIBUTION_GATE_WRITER,
    writeKey: ATTRIBUTION_GATE_WRITE_KEY,
  };
}

/**
 * Adjudicate and write to Registry (Gate-owned path only).
 * Does not touch Actual/State/SR pipelines.
 */
export function runAttributionGate(bookDir, chapter, input = {}, opts = {}) {
  const judgment = adjudicateAttribution(input);
  const recordInput = {
    id: opts.recordId || input.recordId || undefined,
    characterId: input.characterId,
    actionDescription: input.actionDescription,
    status: judgment.status,
    evidenceRefs: (Array.isArray(input.evidence) ? input.evidence : []).map((ev, i) => ({
      source: ev.source,
      provenance: ev.provenance,
      eventRef: ev.eventRef || null,
      index: i,
    })),
    storyClock: input.storyClock != null ? input.storyClock : null,
    sceneId: input.sceneId != null ? input.sceneId : null,
    occurrenceRef: input.occurrenceRef != null ? input.occurrenceRef : null,
    gateVersion: ATTRIBUTION_GATE_VERSION,
  };

  const writeMode = opts.writeMode || 'append';
  let write;
  if (writeMode === 'upsert') {
    write = upsertAttributionFromGate(bookDir, chapter, recordInput, gateWriteOpts());
  } else {
    write = appendAttributionFromGate(bookDir, chapter, recordInput, gateWriteOpts());
  }

  return {
    judgment,
    write,
    record: write.record || null,
    // Explicit non-outputs
    choice: undefined,
    consequence: undefined,
  };
}

export { FORBIDDEN_EVIDENCE_SOURCES, ATTRIBUTION_GATE_WRITE_KEY };
