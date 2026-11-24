/**
 * EO-P4-World-Consequence-Bridge-01 — World Consequence Truth
 *
 * World Consequence = Character Action Truth(X,Y) asserted
 *                   + corresponding text-grounded world-change evidence W
 *                     on the same occurrence chain
 *
 * ≠ Character Action alone · ≠ occurrence alone · ≠ stateChanges alone
 * ≠ Plan/Beat/Director/Writer consequence · ≠ Attribution PASS · ≠ Choice
 *
 * Design gate: docs/design/phase-4/phase-4-minimal-character-action-world-consequence-design-gate.md
 */
import { normalizeActionContent } from './character-action-truth.js';

export const WORLD_CONSEQUENCE_TRUTH_VERSION = 'world-consequence-truth-1';
export const WORLD_CONSEQUENCE_PROVENANCE = 'character_action_world_consequence';

export const FORBIDDEN_WORLD_CONSEQUENCE_FIELDS = Object.freeze([
  'choice',
  'choiceId',
  'choice_id',
  'optionId',
  'candidateOption',
  'candidateOptions',
  'agency',
  'agencyScore',
  'goalId',
  'goal_id',
  'lifecycle',
  'evidenceGraph',
  'authorityFramework',
]);

/** Extractor echo labels: stateChanges/consequence that merely restate the action. */
const ECHO_STATE_CHANGE_PREFIXES = Object.freeze([
  'action',
  'speech',
  'presence',
  'open_loop',
]);

const WORLD_CONSEQUENCE_ECHO_MARKERS = Object.freeze([
  '场面动作已发生',
  '对白成为场面已发生事实',
  '场面叙述成为后续可引用事实',
  '开放选择已结算为已发生行动',
]);

const GROUND_WINDOW = 4; // contiguous normalized chars required for text grounding (CJK-safe)

function norm(s) {
  return String(s || '').trim();
}

/**
 * W is a mere restatement of action Y (action-echo) when either normalized
 * string contains the other, or W is a canned echo marker.
 */
export function isActionEchoOfY(w, y) {
  const wN = normalizeActionContent(w);
  const yN = normalizeActionContent(y);
  if (!wN) return true;
  if (!yN) return false;
  if (wN.includes(yN) || yN.includes(wN)) return true;
  // Sliding-window overlap: a W that shares a contiguous chunk (~half of the
  // shorter string) with Y is a restatement of the action, not a world change.
  const win = Math.max(2, Math.floor(Math.min(wN.length, yN.length) / 2));
  for (let i = 0; i + win <= yN.length; i += 1) {
    if (wN.includes(yN.slice(i, i + win))) return true;
  }
  return WORLD_CONSEQUENCE_ECHO_MARKERS.some((m) => wN.includes(normalizeActionContent(m)));
}

/**
 * Text grounding: some contiguous normalized window (≥ GROUND_WINDOW chars)
 * of W must literally appear in the normalized scene text at/after the
 * occurrence's evidence offset (aftermath region). Fail-closed; no LLM.
 */
export function isGroundedInAftermath(w, sceneText, fromOffset = 0) {
  const wN = normalizeActionContent(w);
  if (wN.length < GROUND_WINDOW) return false;
  const tN = normalizeActionContent(String(sceneText || '').slice(Math.max(0, fromOffset)));
  if (!tN) return false;
  const win = Math.min(wN.length, GROUND_WINDOW);
  for (let i = 0; i + win <= wN.length; i += 1) {
    if (tN.includes(wN.slice(i, i + win))) return true;
  }
  return false;
}

/**
 * Fail-closed correspondence: same occurrence chain as Character Action;
 * W text-grounded, not action-echo of Y.
 * @returns {{ ok: boolean, worldChangeContent: string|null, reason: string }}
 */
export function occurrenceYieldsGroundedWorldChange(characterActionTruth, occurrence = {}, sceneText = '') {
  const y = norm(characterActionTruth?.actionContent);
  if (!y) return { ok: false, worldChangeContent: null, reason: 'action_content_missing' };

  const offset = Number.isFinite(occurrence?.evidence?.offset)
    ? occurrence.evidence.offset
    : 0;

  // Candidate 1: occurrence.consequence — non-echo + aftermath-grounded
  const consequence = norm(occurrence.consequence);
  if (consequence
    && !isActionEchoOfY(consequence, y)
    && isGroundedInAftermath(consequence, sceneText, offset)) {
    return { ok: true, worldChangeContent: consequence, reason: 'consequence_grounded' };
  }

  // Candidate 2: stateChanges entries that are not action-echo labels of Y.
  // Echo-prefixed labels (action:/speech:/presence:/open_loop:) are rejected
  // unless their payload survives echo + grounding checks.
  const stateChanges = Array.isArray(occurrence.stateChanges) ? occurrence.stateChanges : [];
  for (const raw of stateChanges) {
    let entry = norm(raw);
    if (!entry) continue;
    const colon = entry.indexOf(':');
    if (colon > 0 && ECHO_STATE_CHANGE_PREFIXES.includes(entry.slice(0, colon))) {
      entry = norm(entry.slice(colon + 1));
    }
    if (!entry || isActionEchoOfY(entry, y)) continue;
    if (isGroundedInAftermath(entry, sceneText, offset)) {
      return { ok: true, worldChangeContent: entry, reason: 'state_change_grounded' };
    }
  }

  return {
    ok: false,
    worldChangeContent: null,
    reason: consequence || stateChanges.length ? 'world_change_not_grounded_or_echo' : 'no_world_change_evidence',
  };
}

function absent(reason = 'no_inputs') {
  return {
    version: WORLD_CONSEQUENCE_TRUTH_VERSION,
    status: 'absent',
    characterId: null,
    characterActionRef: null,
    actionContent: null,
    worldChangeContent: null,
    occurrenceRef: null,
    reason,
    provenance: null,
    isChoice: false,
  };
}

/**
 * Derive World Consequence Truth. Fail-closed. No LLM.
 */
export function deriveWorldConsequenceTruth(opts = {}) {
  const actionTruth = opts.characterActionTruth || opts.actionTruth || null;
  const occurrences = Array.isArray(opts.occurrences)
    ? opts.occurrences
    : (Array.isArray(opts.actualEvents) ? opts.actualEvents : []);
  const sceneText = String(opts.sceneText ?? '');

  // Refuse foreign-authority mint probes
  if (opts.fromAuthority || opts.authority) {
    const a = String(opts.fromAuthority || opts.authority || '').toLowerCase();
    const banned = ['plan', 'director', 'beat', 'writer', 'attribution', 'prose',
      'desire', 'ggc', 'l1', 'sr', 'statechanges', 'statechange'];
    if (banned.some((b) => a === b || a.startsWith(`${b}.`) || a.startsWith(`${b}_`))) {
      return absent(`refused_foreign_authority:${a}`);
    }
  }
  if (opts.planConsequence != null || opts.beatConsequence != null || opts.directorConsequence != null
    || opts.writerIntention != null || opts.attributionPass != null || opts.stateChangesAlone != null) {
    return absent('refused_embedded_foreign_authority');
  }
  for (const f of FORBIDDEN_WORLD_CONSEQUENCE_FIELDS) {
    if (opts[f] != null) return absent(`forbidden_field:${f}`);
  }

  if (!actionTruth || actionTruth.status !== 'asserted') {
    return absent(actionTruth ? 'character_action_not_asserted' : 'character_action_absent');
  }
  if (!norm(actionTruth.characterId) || !norm(actionTruth.actionContent) || !norm(actionTruth.occurrenceRef)) {
    return absent('character_action_incomplete');
  }
  if (!occurrences.length) {
    return absent('no_occurrence');
  }

  const occurrenceRef = norm(actionTruth.occurrenceRef);
  // Same occurrence chain: exact id match, else normalized-action fallback ref
  const occurrence = occurrences.find((ev) => ev && norm(ev.id) === occurrenceRef)
    || occurrences.find((ev) => {
      if (!ev) return false;
      const fallback = `occurrence:${normalizeActionContent(ev.action).slice(0, 40)}`;
      return fallback === occurrenceRef;
    })
    || null;
  if (!occurrence) {
    return absent('occurrence_not_found');
  }

  const match = occurrenceYieldsGroundedWorldChange(actionTruth, occurrence, sceneText);
  if (!match.ok) {
    return absent(match.reason);
  }

  const characterActionRef = norm(actionTruth.intentRef)
    || `character_action:${normalizeActionContent(actionTruth.characterId)}:${normalizeActionContent(actionTruth.actionContent).slice(0, 40)}`;

  return {
    version: WORLD_CONSEQUENCE_TRUTH_VERSION,
    status: 'asserted',
    characterId: norm(actionTruth.characterId),
    characterActionRef,
    actionContent: norm(actionTruth.actionContent),
    worldChangeContent: match.worldChangeContent,
    occurrenceRef,
    reason: match.reason,
    provenance: WORLD_CONSEQUENCE_PROVENANCE,
    isChoice: false,
    characterActionTruthVersion: actionTruth.version || null,
  };
}

/**
 * Attach World Consequence Truth on scene after Character Action Truth.
 * Does not mutate actualEvents / SR / State. Does not use Attribution.
 */
export function attachWorldConsequenceTruth(scene = {}, opts = {}) {
  if (!scene || typeof scene !== 'object') {
    return { truth: absent('no_scene') };
  }
  const actionTruth = opts.characterActionTruth !== undefined
    ? opts.characterActionTruth
    : (scene.characterActionTruth || null);
  const occurrences = opts.occurrences !== undefined
    ? opts.occurrences
    : (scene.actualEvents || []);
  const sceneText = opts.sceneText !== undefined ? opts.sceneText : scene.text;

  const truth = deriveWorldConsequenceTruth({
    characterActionTruth: actionTruth,
    occurrences,
    sceneText,
    ...opts.probe,
  });
  scene.worldConsequenceTruth = truth;
  return { truth };
}

/** Writer must not mint World Consequence. */
export function assertWriterCannotMintWorldConsequence() {
  const err = new Error('Writer must not mint World Consequence Truth');
  err.code = 'WRITER_WORLD_CONSEQUENCE_MINT_FORBIDDEN';
  throw err;
}

/** Explicit refusals for tests (Plan / Attribution / stateChanges alone). */
export function refuseWorldConsequenceFromForeignAuthority(kind, payload = {}) {
  void payload;
  return absent(`refused_foreign_authority:${String(kind || 'unknown').toLowerCase()}`);
}
