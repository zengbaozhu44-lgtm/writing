export {
  ATTRIBUTION_REGISTRY_VERSION,
  ATTRIBUTION_REGISTRY_ENGINE,
  ATTRIBUTION_GATE_WRITER,
  ATTRIBUTION_STATUSES,
  FORBIDDEN_ATTRIBUTION_FIELDS,
  attributionDir,
  attributionChapterPath,
  loadAttributionChapter,
  saveAttributionChapter,
  validateAttributionRecord,
  appendAttributionFromGate,
  upsertAttributionFromGate,
  listAttributionRecords,
  listAttributedActions,
  __forbiddenPublicCreateAttribution,
} from './attribution-registry.js';

export {
  TYPED_EVIDENCE_VERSION,
  EVIDENCE_SOURCES,
  FORBIDDEN_EVIDENCE_SOURCES,
  validateTypedEvidence,
  assertNoForbiddenEvidenceSources,
  evidenceFromSituation,
  evidenceFromProseExcerpt,
  evidenceFromOccurrence,
  evidenceFromOccurrenceActor,
  evidenceFromStateSlice,
  evidenceFromSRSlots,
  evidenceFromCharacterHint,
  evidenceFromPriorPass,
  evidenceFromTimeline,
  evidenceFromL1,
} from './typed-evidence.js';

export {
  ATTRIBUTION_GATE_VERSION,
  ATTRIBUTION_GATE_ENGINE,
  adjudicateAttribution,
  runAttributionGate,
} from './attribution-gate.js';

export {
  ATTRIBUTION_WIRING_VERSION,
  detectAttributionCues,
  applyAttributionAfterActual,
  enrichAttributionAfterStateDiff,
} from './attribution-wiring.js';

// WRITE_KEY intentionally NOT re-exported from package public index
