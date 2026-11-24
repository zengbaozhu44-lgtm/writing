/**
 * EO-P4-Causal-Bridge-01 — public exports
 */
export {
  CADE_VERSION,
  CADE_PROVENANCE,
  CADE_ENGINE,
  FORBIDDEN_CADE_SOURCE_MARKERS,
  FORBIDDEN_CADE_FIELDS,
  rejectForeignCADEAuthority,
  createCADE,
  validateCADE,
} from './cade.js';

export {
  ACTION_INTENT_TRUTH_VERSION,
  deriveActionIntentTruth,
  refuseIntentFromForeignAuthority,
  readActionIntentForRealization,
  formatActionIntentTruthForPrompt,
  assertWriterCannotMintIntent,
} from './action-intent-truth.js';

export {
  CADE_SIDECAR_DIR,
  cadeDir,
  cadeChapterPath,
  loadCADEChapter,
  writeCADEToChapter,
  resolveSceneCADE,
  attachActionIntentTruthFromCADE,
  mintCADEFromAuthoredDecisions,
  intentTruthAfterSRUpdateOnly,
} from './bridge.js';

export {
  CHARACTER_ACTION_TRUTH_VERSION,
  CHARACTER_ACTION_PROVENANCE,
  FORBIDDEN_CHARACTER_ACTION_FIELDS,
  normalizeActionContent,
  occurrenceCorrespondsToIntent,
  evaluateRealization,
  TERMINAL_NEGATION_MARKERS,
  deriveCharacterActionTruth,
  attachCharacterActionTruth,
  assertWriterCannotMintCharacterAction,
  refuseCharacterActionFromForeignAuthority,
} from './character-action-truth.js';

export {
  WORLD_CONSEQUENCE_TRUTH_VERSION,
  WORLD_CONSEQUENCE_PROVENANCE,
  FORBIDDEN_WORLD_CONSEQUENCE_FIELDS,
  isActionEchoOfY,
  isGroundedInAftermath,
  occurrenceYieldsGroundedWorldChange,
  deriveWorldConsequenceTruth,
  attachWorldConsequenceTruth,
  assertWriterCannotMintWorldConsequence,
  refuseWorldConsequenceFromForeignAuthority,
} from './world-consequence-truth.js';
