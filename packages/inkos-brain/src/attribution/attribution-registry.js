/**
 * Phase 4.4.1a — Attribution Registry (sidecar only)
 *
 * Sole Authority locus for Attribution-equivalent system facts (FG-2).
 * Write path is Gate-scoped: only ATTRIBUTION_GATE_WRITER may mint/update records.
 * Gate implementation itself is Phase 4.4.1b — this module only enforces the write boundary.
 *
 * Does NOT:
 * - implement Attribution Gate / Evidence adapters / LLM
 * - modify Actual → State / SR pipelines
 * - create a second writable Causal History store
 * - auto-mint PASS from Existing data
 *
 * @see docs/design/phase-4.4/06_final-design-gate.md
 * @see docs/design/phase-4.4/10_implementation-plan.md
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ATTRIBUTION_GATE_WRITE_KEY } from './write-key.js';

export const ATTRIBUTION_REGISTRY_VERSION = 'attribution-registry-1';
export const ATTRIBUTION_REGISTRY_ENGINE = 'attribution-registry';

/** Writer identity string (necessary but not sufficient — also requires WRITE_KEY). */
export const ATTRIBUTION_GATE_WRITER = 'attribution_gate';

export const ATTRIBUTION_STATUSES = Object.freeze(['PASS', 'UNKNOWN', 'INVALID']);

/** Fields that must never appear on AttributionRecord (AA21). */
export const FORBIDDEN_ATTRIBUTION_FIELDS = Object.freeze([
  'confidence',
  'attributionConfidence',
  'importance',
  'emotion',
  'choice',
  'consequence',
  'causalStrength',
  'likelihood',
  'densificationScore',
]);

function brainSystemDir(bookDir) {
  return path.join(bookDir, 'novel', '_system', 'brain');
}

export function attributionDir(bookDir) {
  return path.join(brainSystemDir(bookDir), 'attribution');
}

export function attributionChapterPath(bookDir, chapter) {
  return path.join(attributionDir(bookDir), `ch_${String(chapter).padStart(4, '0')}.json`);
}

function emptyChapterState(chapter) {
  return {
    version: ATTRIBUTION_REGISTRY_VERSION,
    engine: ATTRIBUTION_REGISTRY_ENGINE,
    chapter: Number(chapter),
    records: [],
    updatedAt: null,
    meta: {
      writesCanon: false,
      writesTimeline: false,
      writesFacts: false,
      writesActual: false,
      writesSR: false,
      isAttributionAuthority: true,
      path: 'attribution_sidecar_only',
      soleMintPath: 'attribution_gate → PASS|UNKNOWN|INVALID → registry',
    },
  };
}

/**
 * Load chapter Attribution Registry sidecar. Missing file → empty state (not null).
 */
export function loadAttributionChapter(bookDir, chapter) {
  if (!bookDir || chapter == null) return emptyChapterState(chapter || 0);
  const file = attributionChapterPath(bookDir, chapter);
  if (!fs.existsSync(file)) return emptyChapterState(chapter);
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    const records = Array.isArray(raw?.records) ? raw.records : [];
    return {
      ...emptyChapterState(chapter),
      ...raw,
      chapter: Number(chapter),
      records,
      version: raw?.version || ATTRIBUTION_REGISTRY_VERSION,
      engine: raw?.engine || ATTRIBUTION_REGISTRY_ENGINE,
    };
  } catch {
    return emptyChapterState(chapter);
  }
}

/**
 * Persist chapter state. Internal — prefer Gate-scoped append API for mutations.
 */
export function saveAttributionChapter(bookDir, chapter, state) {
  if (!bookDir || chapter == null || !state) {
    return { written: false, reason: 'missing_args' };
  }
  const dir = attributionDir(bookDir);
  fs.mkdirSync(dir, { recursive: true });
  const file = attributionChapterPath(bookDir, chapter);
  const payload = {
    ...state,
    version: ATTRIBUTION_REGISTRY_VERSION,
    engine: ATTRIBUTION_REGISTRY_ENGINE,
    chapter: Number(chapter),
    records: Array.isArray(state.records) ? state.records : [],
    updatedAt: new Date().toISOString(),
    meta: {
      ...(emptyChapterState(chapter).meta),
      ...(state.meta || {}),
      writesCanon: false,
      writesTimeline: false,
      writesFacts: false,
      writesActual: false,
      writesSR: false,
      isAttributionAuthority: true,
      path: 'attribution_sidecar_only',
    },
  };
  fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return { written: true, path: file };
}

function hasForbiddenField(obj) {
  if (!obj || typeof obj !== 'object') return null;
  for (const k of FORBIDDEN_ATTRIBUTION_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] != null) return k;
  }
  return null;
}

/**
 * Validate a record payload before write. Does not check Gate writer identity.
 */
export function validateAttributionRecord(record = {}) {
  const errors = [];
  if (!record || typeof record !== 'object') {
    return { ok: false, errors: ['record_not_object'] };
  }
  const forbidden = hasForbiddenField(record);
  if (forbidden) errors.push(`forbidden_field:${forbidden}`);

  if (!String(record.characterId || '').trim()) errors.push('characterId_required');
  if (!String(record.actionDescription || '').trim()) errors.push('actionDescription_required');

  const status = String(record.status || '');
  if (!ATTRIBUTION_STATUSES.includes(status)) {
    errors.push('status_invalid');
  }

  if (record.provenance != null && record.provenance !== 'attribution_gate') {
    errors.push('provenance_must_be_attribution_gate');
  }

  if (record.evidenceRefs != null && !Array.isArray(record.evidenceRefs)) {
    errors.push('evidenceRefs_must_be_array');
  }

  return { ok: errors.length === 0, errors };
}

function assertGateWriter(opts = {}) {
  const writer = opts.writer || opts.authority;
  if (writer !== ATTRIBUTION_GATE_WRITER) {
    return {
      ok: false,
      reason: 'write_forbidden_not_attribution_gate',
      detail: 'Only attribution_gate may write Attribution Registry (FG-2)',
    };
  }
  // 4.4.1b: string writer alone is forgeable — require unexported Symbol key
  if (opts.writeKey !== ATTRIBUTION_GATE_WRITE_KEY) {
    return {
      ok: false,
      reason: 'write_forbidden_missing_gate_key',
      detail: 'Registry write requires ATTRIBUTION_GATE_WRITE_KEY (Gate-owned only)',
    };
  }
  return { ok: true };
}

function normalizeRecord(input = {}, chapter) {
  const id = String(input.id || '').trim()
    || `attr_ch${String(chapter).padStart(4, '0')}_${crypto.randomBytes(4).toString('hex')}`;
  return {
    id,
    characterId: String(input.characterId || '').trim(),
    actionDescription: String(input.actionDescription || '').trim(),
    status: String(input.status || ''),
    evidenceRefs: Array.isArray(input.evidenceRefs) ? input.evidenceRefs.slice() : [],
    storyClock: input.storyClock != null ? input.storyClock : null,
    sceneId: input.sceneId != null ? String(input.sceneId) : null,
    occurrenceRef: input.occurrenceRef != null ? String(input.occurrenceRef) : null,
    provenance: 'attribution_gate',
    gateVersion: String(input.gateVersion || 'attribution-gate-pending'),
    createdAt: input.createdAt || new Date().toISOString(),
  };
}

/**
 * Gate-scoped append. Call only from future Attribution Gate (opts.writer = attribution_gate).
 * Public modules must NOT pass status PASS without going through Gate.
 *
 * @param {object} opts
 * @param {'attribution_gate'} opts.writer — required
 */
export function appendAttributionFromGate(bookDir, chapter, recordInput, opts = {}) {
  const auth = assertGateWriter(opts);
  if (!auth.ok) return { written: false, ...auth };

  const forbiddenIn = hasForbiddenField(recordInput);
  if (forbiddenIn) {
    return {
      written: false,
      reason: 'validation_failed',
      errors: [`forbidden_field:${forbiddenIn}`],
    };
  }

  const record = normalizeRecord(recordInput, chapter);
  const v = validateAttributionRecord(record);
  if (!v.ok) return { written: false, reason: 'validation_failed', errors: v.errors };

  const state = loadAttributionChapter(bookDir, chapter);
  if (state.records.some((r) => r.id === record.id)) {
    return { written: false, reason: 'duplicate_id', id: record.id };
  }
  state.records.push(record);
  const save = saveAttributionChapter(bookDir, chapter, state);
  return {
    written: save.written,
    path: save.path,
    record,
    reason: save.written ? 'ok' : save.reason,
  };
}

/**
 * Gate-scoped replace-by-id (e.g. Gate re-adjudicates). Same writer boundary.
 */
export function upsertAttributionFromGate(bookDir, chapter, recordInput, opts = {}) {
  const auth = assertGateWriter(opts);
  if (!auth.ok) return { written: false, ...auth };

  const forbiddenIn = hasForbiddenField(recordInput);
  if (forbiddenIn) {
    return {
      written: false,
      reason: 'validation_failed',
      errors: [`forbidden_field:${forbiddenIn}`],
    };
  }

  const record = normalizeRecord(recordInput, chapter);
  const v = validateAttributionRecord(record);
  if (!v.ok) return { written: false, reason: 'validation_failed', errors: v.errors };

  const state = loadAttributionChapter(bookDir, chapter);
  const idx = state.records.findIndex((r) => r.id === record.id);
  if (idx >= 0) {
    record.createdAt = state.records[idx].createdAt || record.createdAt;
    state.records[idx] = record;
  } else {
    state.records.push(record);
  }
  const save = saveAttributionChapter(bookDir, chapter, state);
  return {
    written: save.written,
    path: save.path,
    record,
    reason: save.written ? 'ok' : save.reason,
  };
}

/**
 * Read helpers — no Authority mint.
 */
export function listAttributionRecords(bookDir, chapter, filter = {}) {
  const state = loadAttributionChapter(bookDir, chapter);
  let rows = state.records.slice();
  if (filter.characterId) {
    const id = String(filter.characterId);
    rows = rows.filter((r) => r.characterId === id);
  }
  if (filter.status) {
    rows = rows.filter((r) => r.status === filter.status);
  }
  return rows;
}

/**
 * Character Causal History projection (read-only): Registry PASS only.
 * Not a separate writable store.
 */
export function listAttributedActions(bookDir, chapter, filter = {}) {
  return listAttributionRecords(bookDir, chapter, {
    ...filter,
    status: 'PASS',
  });
}

/**
 * Deliberately not exported as a general mint API.
 * Kept to document the forbidden pattern in tests.
 */
export function __forbiddenPublicCreateAttribution() {
  return {
    ok: false,
    reason: 'forbidden_public_create',
    detail: 'Use appendAttributionFromGate with writer=attribution_gate only',
  };
}
