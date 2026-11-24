/**
 * F2 — Final Context Viewer (READ-ONLY observability)
 *
 * Persists L1–L4 prompt snapshots + hashes for Studio inspection.
 * Does NOT change Prompt semantics, Canon, SR, or Runtime authority.
 * Not a Context Engine / Prompt Authority / business database.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { writeJson, readJson, exists } from '../../../inkos-core/src/lib/paths.js';
import {
  hasStoryClock,
  hasInformationBoundary,
} from '../../../inkos-core/src/lib/prompt-survival.js';
import { hasObservedContinuityMarkers } from '../../../inkos-prompt/src/scene-observed-continuity.js';
import { getWriterOptimizationDir } from './compile-writer-prompt.js';
import { buildContextProvenanceTrace } from './context-provenance.js';

export const FINAL_CONTEXT_ROLE = 'read_only_observability';
export const FINAL_CONTEXT_WRITES_CANON = false;
export const FINAL_CONTEXT_WRITES_SR = false;

export function hashPromptText(text = '') {
  const raw = String(text || '');
  return crypto.createHash('sha256').update(raw, 'utf8').digest('hex').slice(0, 16);
}

export function survivalFlags(text = '') {
  const t = String(text || '');
  return {
    clock: hasStoryClock(t),
    ib: hasInformationBoundary(t),
    /** F6.2 — Previous Scene Observed Continuity visible in layer (read-only) */
    observedContinuity: hasObservedContinuityMarkers(t),
    chars: t.length,
  };
}

function finalContextDir(bookDir, chapter) {
  return path.join(
    getWriterOptimizationDir(bookDir),
    `ch_${String(chapter).padStart(4, '0')}`,
    'final-context',
  );
}

function sceneMetaPath(bookDir, chapter, sceneIndex) {
  return path.join(
    finalContextDir(bookDir, chapter),
    `scene_${String(sceneIndex).padStart(2, '0')}.json`,
  );
}

function layerTextPath(bookDir, chapter, sceneIndex, layer) {
  return path.join(
    finalContextDir(bookDir, chapter),
    `scene_${String(sceneIndex).padStart(2, '0')}_${layer}.md`,
  );
}

function layerSummary(text = '') {
  const raw = String(text || '');
  const present = Boolean(raw.trim());
  const flags = survivalFlags(raw);
  return {
    present,
    hash: present ? hashPromptText(raw) : null,
    chars: flags.chars,
    clock: present ? flags.clock : false,
    ib: present ? flags.ib : false,
    observedContinuity: present ? flags.observedContinuity : false,
  };
}

function readExistingMeta(bookDir, chapter, sceneIndex) {
  const file = sceneMetaPath(bookDir, chapter, sceneIndex);
  if (!exists(file)) return null;
  try {
    return readJson(file);
  } catch {
    return null;
  }
}

/**
 * Record compile-time layers (L1/L2/L3). Read-only artifact write under studio debug dir.
 */
export function persistFinalContextCompile(bookDir, chapter, scene, {
  l1Text = '',
  l2Text = '',
  l3Text = '',
  sealedHash = null,
  clockSource = null,
  ibSource = null,
  writerCallId = null,
  intent = null,
  ctx = null,
  l1Modules = null,
} = {}) {
  if (!bookDir || chapter == null || scene?.index == null) return null;
  const dir = finalContextDir(bookDir, chapter);
  fs.mkdirSync(dir, { recursive: true });

  const sceneIndex = scene.index;
  const prev = readExistingMeta(bookDir, chapter, sceneIndex) || {};

  const L1 = layerSummary(l1Text);
  const L2 = layerSummary(l2Text);
  const L3 = layerSummary(l3Text);
  if (sealedHash && L3.present) L3.sealedHash = sealedHash;
  else if (L3.present) L3.sealedHash = L3.hash;

  if (L1.present) {
    fs.writeFileSync(layerTextPath(bookDir, chapter, sceneIndex, 'L1'), String(l1Text), 'utf8');
  }
  if (L2.present) {
    fs.writeFileSync(layerTextPath(bookDir, chapter, sceneIndex, 'L2'), String(l2Text), 'utf8');
  }
  if (L3.present) {
    fs.writeFileSync(layerTextPath(bookDir, chapter, sceneIndex, 'L3'), String(l3Text), 'utf8');
  }

  // F3: provenance from compile layers (L4 filled later on Writer call)
  const provenance = buildContextProvenanceTrace({
    l1Text,
    l2Text,
    l3Text,
    l4Text: '',
    intent: intent || ctx?.intent || {},
    scene,
    ctx: ctx || {},
    l1Modules: l1Modules || (typeof scene?.dynamic === 'object' ? scene.dynamic?.modules : null),
  });
  fs.writeFileSync(
    path.join(dir, `scene_${String(sceneIndex).padStart(2, '0')}_provenance.json`),
    JSON.stringify(provenance, null, 2),
    'utf8',
  );

  const meta = {
    role: FINAL_CONTEXT_ROLE,
    readOnly: true,
    writesCanon: false,
    writesSR: false,
    sceneId: scene.id || `ch${chapter}_s${sceneIndex}`,
    sceneIndex,
    chapter: Number(chapter),
    layers: {
      L1,
      L2,
      L3,
      L4: prev.layers?.L4 || { present: false, hash: null, clock: false, ib: false },
    },
    clockSource: clockSource || prev.clockSource || null,
    ibSource: ibSource || prev.ibSource || 'buildSceneWritePrompt / Semantic Protected Context',
    provenance,
    writerCalls: Array.isArray(prev.writerCalls) ? prev.writerCalls : [],
    writerCallId: writerCallId || prev.writerCallId || null,
    updatedAt: new Date().toISOString(),
  };

  writeJson(sceneMetaPath(bookDir, chapter, sceneIndex), meta);
  return meta;
}

/**
 * Record an actual Writer/LLM userPrompt call (L4).
 * Hash must match the exact string passed to the model.
 */
export function persistFinalContextWriterCall(bookDir, chapter, scene, {
  userPrompt = '',
  beatOrder = null,
  callId = null,
  systemPrompt = '',
  intent = null,
  ctx = null,
} = {}) {
  if (!bookDir || chapter == null || scene?.index == null) return null;
  const dir = finalContextDir(bookDir, chapter);
  fs.mkdirSync(dir, { recursive: true });

  const sceneIndex = scene.index;
  const prev = readExistingMeta(bookDir, chapter, sceneIndex) || {
    role: FINAL_CONTEXT_ROLE,
    readOnly: true,
    sceneId: scene.id || `ch${chapter}_s${sceneIndex}`,
    sceneIndex,
    chapter: Number(chapter),
    layers: {},
    writerCalls: [],
  };

  const L4 = layerSummary(userPrompt);
  L4.beatOrder = beatOrder;
  L4.beatUserPromptHash = L4.hash;
  L4.writerCallId = callId || `s${sceneIndex}-b${beatOrder ?? '?'}-${Date.now()}`;

  fs.writeFileSync(layerTextPath(bookDir, chapter, sceneIndex, 'L4'), String(userPrompt), 'utf8');
  if (beatOrder != null) {
    fs.writeFileSync(
      layerTextPath(bookDir, chapter, sceneIndex, `L4_b${String(beatOrder).padStart(2, '0')}`),
      String(userPrompt),
      'utf8',
    );
  }

  const calls = Array.isArray(prev.writerCalls) ? [...prev.writerCalls] : [];
  calls.push({
    callId: L4.writerCallId,
    beatOrder,
    hash: L4.hash,
    clock: L4.clock,
    ib: L4.ib,
    chars: L4.chars,
    systemHash: systemPrompt ? hashPromptText(systemPrompt) : null,
    at: new Date().toISOString(),
  });

  // F3: refresh provenance with actual L4 text
  const l1Text = exists(layerTextPath(bookDir, chapter, sceneIndex, 'L1'))
    ? fs.readFileSync(layerTextPath(bookDir, chapter, sceneIndex, 'L1'), 'utf8')
    : '';
  const l2Text = exists(layerTextPath(bookDir, chapter, sceneIndex, 'L2'))
    ? fs.readFileSync(layerTextPath(bookDir, chapter, sceneIndex, 'L2'), 'utf8')
    : '';
  const l3Text = exists(layerTextPath(bookDir, chapter, sceneIndex, 'L3'))
    ? fs.readFileSync(layerTextPath(bookDir, chapter, sceneIndex, 'L3'), 'utf8')
    : '';
  const provenance = buildContextProvenanceTrace({
    l1Text,
    l2Text,
    l3Text,
    l4Text: userPrompt,
    intent: intent || ctx?.intent || {},
    scene,
    ctx: ctx || {},
    l1Modules: typeof scene?.dynamic === 'object' ? scene.dynamic?.modules : null,
  });
  fs.writeFileSync(
    path.join(dir, `scene_${String(sceneIndex).padStart(2, '0')}_provenance.json`),
    JSON.stringify(provenance, null, 2),
    'utf8',
  );

  const meta = {
    ...prev,
    role: FINAL_CONTEXT_ROLE,
    readOnly: true,
    writesCanon: false,
    writesSR: false,
    layers: {
      ...(prev.layers || {}),
      L4,
    },
    provenance,
    writerCalls: calls.slice(-24),
    writerCallId: L4.writerCallId,
    updatedAt: new Date().toISOString(),
  };

  writeJson(sceneMetaPath(bookDir, chapter, sceneIndex), meta);
  return meta;
}

/** READ-ONLY load */
export function loadFinalContextSnapshot(bookDir, chapter, sceneIndex, { includeText = false } = {}) {
  const meta = readExistingMeta(bookDir, chapter, sceneIndex);
  if (!meta) return null;
  if (!includeText) return meta;

  const texts = {};
  for (const layer of ['L1', 'L2', 'L3', 'L4']) {
    const p = layerTextPath(bookDir, chapter, sceneIndex, layer);
    if (exists(p)) texts[layer] = fs.readFileSync(p, 'utf8');
  }
  return { ...meta, texts };
}

export function listFinalContextSnapshots(bookDir, chapter) {
  const dir = finalContextDir(bookDir, chapter);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => /^scene_\d+\.json$/.test(f))
    .map((f) => {
      try {
        return readJson(path.join(dir, f));
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => (a.sceneIndex || 0) - (b.sceneIndex || 0));
}

/**
 * Verify viewer hash matches recorded L4 / sealed L3.
 */
export function verifyFinalContextIntegrity(snapshot) {
  if (!snapshot) return { ok: false, reasons: ['missing snapshot'] };
  const reasons = [];
  const L3 = snapshot.layers?.L3;
  const L4 = snapshot.layers?.L4;
  if (L3?.present && L3.sealedHash && L3.hash && L3.sealedHash !== L3.hash) {
    reasons.push(`L3 sealedHash mismatch: ${L3.sealedHash} != ${L3.hash}`);
  }
  if (L4?.present && L4.beatUserPromptHash && L4.hash && L4.beatUserPromptHash !== L4.hash) {
    reasons.push(`L4 beatUserPromptHash mismatch`);
  }
  if (L4?.present && snapshot.writerCallId && L4.writerCallId && snapshot.writerCallId !== L4.writerCallId) {
    // allow meta.writerCallId to track latest
  }
  const lastCall = (snapshot.writerCalls || []).at(-1);
  if (L4?.present && lastCall?.hash && lastCall.hash !== L4.hash) {
    reasons.push(`L4 hash != last writerCall hash`);
  }
  return { ok: reasons.length === 0, reasons };
}

/** Assert artifact writes never touch novel Canon / SR paths */
export function assertFinalContextReadOnlyContract(bookDir, chapter, sceneIndex) {
  const dir = finalContextDir(bookDir, chapter);
  const allowedPrefix = path.join(getWriterOptimizationDir(bookDir));
  if (!dir.startsWith(allowedPrefix)) {
    return { ok: false, reason: 'final-context outside writer-optimization' };
  }
  const meta = sceneMetaPath(bookDir, chapter, sceneIndex);
  if (exists(meta)) {
    const data = readJson(meta);
    if (data.writesCanon || data.writesSR || data.readOnly === false) {
      return { ok: false, reason: 'meta claims write authority' };
    }
  }
  return { ok: true };
}
