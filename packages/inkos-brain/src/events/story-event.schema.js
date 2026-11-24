/**
 * Phase 1 — StoryEvent schema (Actual Event Foundation)
 *
 * Freeze (from _AI_ACTUAL_FLOW_AUDIT.md):
 * - Source of truth for extraction = scene.text only
 * - Never invent from Plan / closingWorldState / Expected
 * - Phase 1 events are structured Actual records; writesCanon/writesSR stay false
 * - Canon timeline writes remain EO-P2 blocked until State Evolution (Phase 2)
 *
 * Required fields (roadmap):
 *   id, sceneId, actors, action, consequence, stateChanges, affectedEntities
 */
export const STORY_EVENT_VERSION = 'story-event-1';

export const STORY_EVENT_SOURCES = Object.freeze({
  SCENE_TEXT: 'scene.text',
  /** Explicit human/tool annotation grounded in text — still needs evidence */
  ANNOTATED: 'annotated',
});

/** Forbidden as Reality sources for StoryEvent.action / consequence */
export const FORBIDDEN_EVENT_SOURCES = Object.freeze([
  'plan',
  'plan.goal',
  'plan.closingWorldState',
  'closingWorldState',
  'expected',
  'beat.expected',
  'modelled',
  'causalChain',
  'scene.goal',
  'intent.goal',
]);

/**
 * @typedef {object} StoryEventEvidence
 * @property {string} excerpt — must appear in scene.text
 * @property {number} [offset]
 */

/**
 * @typedef {object} StoryEvent
 * @property {string} id
 * @property {string} sceneId
 * @property {string} [version]
 * @property {string[]} actors
 * @property {string} action
 * @property {string} [intent] — character/action intent if text-grounded; optional
 * @property {string} [consequence] — OPTIONAL（R2 Seal：空=合法 Experience）；非空 = World Consequence Assertion 标记（独立 grounding 在 gate/WCT 层）
 * @property {string[]} stateChanges
 * @property {string[]} affectedEntities
 * @property {StoryEventEvidence} evidence
 * @property {string} source — STORY_EVENT_SOURCES
 * @property {boolean} writesCanon
 * @property {boolean} writesSR
 * @property {boolean} writesReality
 * @property {string} [kind] — e.g. open_choice | choice_settled | action | speech
 */

/**
 * Normalize / create a StoryEvent. Does not validate evidence against text.
 * @param {Partial<StoryEvent> & { sceneId: string, action: string }} input
 * @returns {StoryEvent}
 */
export function createStoryEvent(input = {}) {
  const sceneId = String(input.sceneId || '').trim() || 'scene_unknown';
  const action = String(input.action || '').trim();
  // EO-G1-C-01：无 evidence anchor 不铸 Truth Event Identity（hash fallback 已废；
  // 空 id 由下游消费 fail-closed 跳过，绝不代以 action hash）
  const id = String(input.id || '').trim();

  return {
    id,
    sceneId,
    version: STORY_EVENT_VERSION,
    actors: normalizeStringList(input.actors),
    action,
    intent: input.intent != null ? String(input.intent).trim() : '',
    consequence: String(input.consequence || '').trim(),
    stateChanges: normalizeStringList(input.stateChanges),
    affectedEntities: normalizeStringList(input.affectedEntities),
    evidence: normalizeEvidence(input.evidence),
    source: String(input.source || STORY_EVENT_SOURCES.SCENE_TEXT),
    kind: input.kind ? String(input.kind) : 'action',
    writesCanon: false,
    writesSR: false,
    writesReality: false,
  };
}

function normalizeStringList(v) {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.map((x) => String(x || '').trim()).filter(Boolean))];
}

function normalizeEvidence(ev) {
  if (!ev || typeof ev !== 'object') return { excerpt: '' };
  return {
    excerpt: String(ev.excerpt || '').trim(),
    ...(Number.isFinite(ev.offset) ? { offset: Number(ev.offset) } : {}),
  };
}

function hashShort(s) {
  let h = 0;
  const t = String(s || '');
  for (let i = 0; i < t.length; i += 1) h = ((h << 5) - h + t.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36).slice(0, 8);
}

/**
 * Strip Plan / Expected fields from a scene-like object for Plan-deletion tests.
 * Keeps only Actual-relevant surface: id, index, text, pov (if literal metadata).
 */
export function stripPlanFromScene(scene = {}) {
  return {
    id: scene.id,
    index: scene.index,
    text: scene.text,
    pov: scene.pov,
    characters: Array.isArray(scene.characters)
      ? scene.characters.map((c) => (typeof c === 'string' ? c : c?.name)).filter(Boolean)
      : undefined,
  };
}
