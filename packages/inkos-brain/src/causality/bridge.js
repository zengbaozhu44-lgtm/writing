/**
 * EO-P4-Causal-Bridge-01 — CADE sidecar + scene attach (beside SR, not in SR)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createCADE, validateCADE, CADE_VERSION, FORBIDDEN_CADE_FIELDS } from './cade.js';
import {
  deriveActionIntentTruth,
  formatActionIntentTruthForPrompt,
  readActionIntentForRealization,
} from './action-intent-truth.js';

export const CADE_SIDECAR_DIR = 'cade';

function brainSystemDir(bookDir) {
  return path.join(bookDir, 'novel', '_system', 'brain');
}

export function cadeDir(bookDir) {
  return path.join(brainSystemDir(bookDir), CADE_SIDECAR_DIR);
}

export function cadeChapterPath(bookDir, chapter) {
  return path.join(cadeDir(bookDir), `ch_${String(chapter).padStart(4, '0')}.json`);
}

export function loadCADEChapter(bookDir, chapter) {
  const file = cadeChapterPath(bookDir, chapter);
  if (!fs.existsSync(file)) {
    return { version: CADE_VERSION, chapter: Number(chapter), items: [] };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    return {
      version: raw.version || CADE_VERSION,
      chapter: Number(chapter),
      meta: raw.meta || null,
      items: Array.isArray(raw.items) ? raw.items : [],
    };
  } catch {
    return { version: CADE_VERSION, chapter: Number(chapter), meta: null, items: [] };
  }
}

/**
 * Persist a validated CADE into chapter sidecar (explicit producer path).
 */
export function writeCADEToChapter(bookDir, chapter, cadeInput = {}) {
  const created = createCADE({ ...cadeInput, chapter });
  if (!created.ok) {
    return { written: false, reason: created.reason, cade: null, path: null };
  }
  const dir = cadeDir(bookDir);
  fs.mkdirSync(dir, { recursive: true });
  const file = cadeChapterPath(bookDir, chapter);
  const prior = loadCADEChapter(bookDir, chapter);
  const items = prior.items.filter((x) => x?.id !== created.cade.id);
  items.push(created.cade);
  const payload = {
    version: CADE_VERSION,
    chapter: Number(chapter),
    updatedAt: new Date().toISOString(),
    meta: {
      writesCanon: false,
      writesSR: false,
      path: 'cade_sidecar_only',
      note: 'CADE ≠ Choice; Action Intent derived only from CADE',
    },
    items,
  };
  fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return { written: true, reason: null, cade: created.cade, path: file };
}

/**
 * Resolve explicit scene CADE or chapter sidecar item for scene.
 * Does NOT invent from Plan/SR/Writer.
 */
export function resolveSceneCADE(scene = {}, bookDir = null, chapter = null) {
  const explicit = scene?.characterActionDecisionEvidence
    || scene?.cade
    || scene?.characterSideActionDecision
    || null;
  if (explicit) {
    const v = validateCADE(explicit);
    if (v.ok) return v.cade;
    return null;
  }
  if (!bookDir || chapter == null) return null;
  const sceneId = scene?.id || (scene?.index != null ? `scene_${scene.index}` : null);
  const pov = String(scene?.pov || '').trim();
  const chapterBag = loadCADEChapter(bookDir, chapter);
  const items = chapterBag.items || [];
  // Prefer scene-scoped CADE, else POV-matched latest
  const byScene = sceneId
    ? items.filter((c) => c.sceneId && String(c.sceneId) === String(sceneId))
    : [];
  if (byScene.length) return byScene[byScene.length - 1];
  if (pov) {
    const byPov = items.filter((c) => String(c.characterId) === pov);
    if (byPov.length) return byPov[byPov.length - 1];
  }
  return null;
}

/**
 * EO-P4-Authored-CADE-Channel-01 — mint CADE from the authored
 * character-decision channel (intent.characterDecisions).
 *
 * Legal per EO-P4-Causal-Bridge-01 design gate §B: "Explicit character-decision
 * authoring into the CADE channel (same pattern as authored Character SR)".
 *
 * Rules:
 * - ONLY reads intent.characterDecisions (explicit authored channel).
 *   Never scans mainGoal / scene.goal / causalChain / beats (STORY CONTROL).
 * - Per-item fail-closed: forbidden fields (choice/options/agency — Choice-shaped
 *   probes) are REJECTED, never silently stripped; createCADE guards the rest.
 * - sceneIndex → sceneId `ch{chapter}_s{index}` for scene-scoped resolution.
 * - Idempotent: writeCADEToChapter dedupes by CADE id.
 *
 * @returns {{ minted: object[], rejected: {index:number, reason:string}[] }}
 */
export function mintCADEFromAuthoredDecisions(bookDir, chapter, intent = {}) {
  const decisions = Array.isArray(intent?.characterDecisions) ? intent.characterDecisions : [];
  const minted = [];
  const rejected = [];
  for (let i = 0; i < decisions.length; i += 1) {
    const d = decisions[i];
    if (!d || typeof d !== 'object') {
      rejected.push({ index: i, reason: 'decision_not_object' });
      continue;
    }
    // Choice-shaped fields on an authored decision = laundering probe → reject
    // the item (fail-closed), never strip-and-accept.
    const forbiddenField = FORBIDDEN_CADE_FIELDS.find(
      (f) => Object.prototype.hasOwnProperty.call(d, f) && d[f] != null,
    );
    if (forbiddenField) {
      rejected.push({ index: i, reason: `forbidden_cade_field:${forbiddenField}` });
      continue;
    }
    const sceneId = d.sceneIndex != null && Number.isFinite(Number(d.sceneIndex))
      ? `ch${Number(chapter)}_s${Number(d.sceneIndex)}`
      : (d.sceneId != null ? String(d.sceneId) : null);
    const res = writeCADEToChapter(bookDir, chapter, {
      characterId: d.characterId,
      actionContent: d.actionContent,
      decisionKind: d.decisionKind,
      sceneId,
      anchors: d.anchors, // EO-P4-Correspondence-V2: optional authored anchors（非法由 createCADE 整项拒绝）
      sourceRef: 'authored.character_decision',
    });
    if (res.written) minted.push(res.cade);
    else rejected.push({ index: i, reason: res.reason || 'mint_failed' });
  }
  return { minted, rejected };
}

/**
 * Attach Action Intent Truth to scene from CADE only (absent-by-default).
 * Call before Writer. Never writes from SR/Actual/Attribution.
 */
export function attachActionIntentTruthFromCADE(bookDir, chapter, scene, opts = {}) {
  if (!scene || typeof scene !== 'object') {
    return { truth: deriveActionIntentTruth(null), cade: null };
  }
  const cade = opts.cade !== undefined
    ? opts.cade
    : resolveSceneCADE(scene, bookDir, chapter);
  const truth = deriveActionIntentTruth(cade);
  scene.actionIntentTruth = truth;
  scene._actionIntentPromptBlock = formatActionIntentTruthForPrompt(truth);
  return { truth, cade: cade || null };
}

/**
 * SR update must not create Intent — helper for tests / regression guard.
 */
export function intentTruthAfterSRUpdateOnly() {
  return deriveActionIntentTruth(null);
}

export {
  deriveActionIntentTruth,
  formatActionIntentTruthForPrompt,
  readActionIntentForRealization,
};
