/**
 * Story Route V1 — frozen input/output contract slots.
 * @see golden/reality/story-route-v1/SPEC.md
 */

export const ROUTE_VERSION = 'story-route-v1';

export const CANDIDATE_COUNT = { min: 3, max: 5 };

export const DEFAULT_LITERARY_ORIENTATION = {
  observe_self: false,
  observe_others: false,
  observe_world: false,
  stuck_in_things: false,
  trapped_in_heart: false,
  lost_in_others: false,
  lost_nature: false,
  notes: '',
};

export const FORBIDDEN_SELECTOR_KEYS = new Set([
  'literary_score',
  'classicness',
  'numeric_ranking',
  'must_include_events',
  'predicted_outcome',
  'ranking',
]);

/** @returns {import('./types.js').LiteraryOrientation} */
export function normalizeLiteraryOrientation(raw = {}) {
  const base = { ...DEFAULT_LITERARY_ORIENTATION };
  if (!raw || typeof raw !== 'object') return base;
  for (const key of Object.keys(base)) {
    if (key === 'notes') {
      base.notes = String(raw.notes ?? raw.note ?? '').trim();
    } else if (typeof raw[key] === 'boolean') {
      base[key] = raw[key];
    } else if (raw[key] != null) {
      base[key] = Boolean(raw[key]);
    }
  }
  return base;
}

/** @returns {string[]} */
export function normalizeHardConstraints(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x ?? '').trim()).filter(Boolean);
  }
  if (typeof raw === 'object' && Array.isArray(raw.constraints)) {
    return raw.constraints.map((x) => String(x ?? '').trim()).filter(Boolean);
  }
  return [];
}

/** @param {unknown} candidate */
export function isValidCandidateShape(candidate) {
  if (!candidate || typeof candidate !== 'object') return false;
  const c = /** @type {Record<string, unknown>} */ (candidate);
  return Boolean(
    c.id
    && c.kind === 'possibility'
    && c.provenance === ROUTE_VERSION
    && typeof c.title === 'string'
    && typeof c.direction === 'string'
    && Array.isArray(c.tensions)
    && Array.isArray(c.relationship_shifts),
  );
}

/** Strip forbidden scoring keys from LLM output. */
export function stripForbiddenSelectorFields(obj = {}) {
  const out = { ...obj };
  for (const key of FORBIDDEN_SELECTOR_KEYS) {
    delete out[key];
  }
  return out;
}
