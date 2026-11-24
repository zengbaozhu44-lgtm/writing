/**
 * Phase 4.4.1c — Soft Attribution wiring (non-blocking)
 *
 * After Actual (and optionally after StateDiff): build TypedEvidence → Gate → Registry.
 * NEVER blocks Actual / State / SR / Memory / Writer.
 * NEVER accepts Situation / Plan / Desire / Pressure / causal_chain / Writer dump as Evidence.
 *
 * Cue policy: A conservative defaults + B extremely narrow excerpt-only detectors.
 * Full-context LLM forbidden.
 *
 * @see docs/design/phase-4.4/13_phase-4.4.1c-wiring-readiness-audit.md
 */
import { runAttributionGate } from './attribution-gate.js';
import { resolveCharacter } from '../../../inkos-core/src/lib/entity-identity.js';
import {
  evidenceFromProseExcerpt,
  evidenceFromOccurrence,
  evidenceFromOccurrenceActor,
  evidenceFromStateSlice,
  evidenceFromSRSlots,
  evidenceFromCharacterHint,
} from './typed-evidence.js';

export const ATTRIBUTION_WIRING_VERSION = 'attribution-wiring-1';

/**
 * Narrow excerpt-only cue detection (policy B, minimal).
 * Default all false (policy A) unless patterns fire.
 */
export function detectAttributionCues(excerpt = '', characterId = '') {
  const text = String(excerpt || '');
  const cues = {
    subjectAbsent: false,
    subjectPresentCue: false,
    agencyCue: false,
    coercionTradeoffCue: false,
    policy: 'A+narrow-B',
  };

  if (!text.trim()) return cues;

  // Subject absence (INVALID path) — keep narrow
  if (/(昏迷|失去意识|人事不省|睡梦中|无意识地|被人.*替她|替他.*把)/u.test(text)) {
    cues.subjectAbsent = true;
    return cues;
  }

  // Agency / deliberation markers (excerpt only)
  if (/(犹豫|还是|决定|咬牙|主动|权衡|忍住|终于|尽管.*仍|却还是)/u.test(text)) {
    cues.agencyCue = true;
    cues.subjectPresentCue = true;
  }

  // Conscious coercion tradeoff (P07-class narrow)
  if (/(枪口|枪指|抵着|威胁)/u.test(text)
    && /(还是|决定|权衡|交出|塞进|打开|忍着)/u.test(text)) {
    cues.coercionTradeoffCue = true;
    cues.subjectPresentCue = true;
  }

  // If character name appears and we already have agency/coercion, subject present already set.
  // Do NOT set subjectPresentCue from name+verb alone (would over-PASS "她推开门").
  void characterId;

  return cues;
}

function excerptForEvent(scene, ev) {
  const fromEv = ev?.evidence?.excerpt || ev?.evidence?.text;
  if (fromEv) return String(fromEv).slice(0, 500);
  const action = String(ev?.action || '');
  const text = String(scene?.text || '');
  if (action && text.includes(action.slice(0, 12))) {
    const idx = text.indexOf(action.slice(0, Math.min(12, action.length)));
    if (idx >= 0) return text.slice(Math.max(0, idx - 20), idx + 120);
  }
  return text.slice(0, 200);
}

function srPayloadForCharacter(characterSRState, characterId) {
  const block = characterSRState?.characters?.[characterId]
    || characterSRState?.[characterId]
    || null;
  if (!block) return null;
  return {
    characterId,
    awareness: block.awareness?.items || [],
    belief: block.belief?.items || [],
    stance: block.stance?.items || [],
  };
}

function buildEvidenceForCandidate({
  scene,
  ev,
  characterId,
  stateProperties = null,
  characterHints = null,
  characterSRState = null,
}) {
  const evidence = [];
  const excerpt = excerptForEvent(scene, ev);
  const cues = detectAttributionCues(excerpt, characterId);

  const prose = evidenceFromProseExcerpt({
    excerpt,
    characterId,
    sceneId: scene?.id || scene?.sceneId || null,
    eventRef: ev?.id || null,
    offset: ev?.evidence?.offset,
    pov: scene?.pov || null,
    subjectAbsent: cues.subjectAbsent,
    subjectPresentCue: cues.subjectPresentCue,
    agencyCue: cues.agencyCue,
    coercionTradeoffCue: cues.coercionTradeoffCue,
  });
  if (prose) evidence.push(prose);

  const occ = evidenceFromOccurrence({
    eventId: ev?.id,
    action: ev?.action,
    kind: ev?.kind,
    sceneId: scene?.id || null,
  });
  if (occ) evidence.push(occ);

  const actorEv = evidenceFromOccurrenceActor({
    characterId,
    eventId: ev?.id,
    sceneId: scene?.id || null,
  });
  if (actorEv) evidence.push(actorEv);

  if (stateProperties && typeof stateProperties === 'object') {
    const st = evidenceFromStateSlice({
      characterId,
      properties: stateProperties,
      sceneId: scene?.id || null,
      eventRef: ev?.id || null,
    });
    if (st) evidence.push(st);
  }

  const sr = srPayloadForCharacter(characterSRState || scene?.characterSRState, characterId);
  if (sr) {
    const srev = evidenceFromSRSlots({
      ...sr,
      sceneId: scene?.id || null,
      eventRef: ev?.id || null,
    });
    if (srev) evidence.push(srev);
  }

  // characterHints → Evidence adapter ONLY (never Registry)
  if (Array.isArray(characterHints)) {
    for (const hint of characterHints) {
      if (!hint || hint.character !== characterId) continue;
      if (hint.eventId && ev?.id && hint.eventId !== ev.id) continue;
      const hev = evidenceFromCharacterHint({
        hint,
        characterId,
        sceneId: scene?.id || null,
      });
      if (hev) evidence.push(hev);
    }
  }

  return { evidence, cues };
}

function candidatesFromScene(scene, bookDir = null) {
  const events = Array.isArray(scene?.actualEvents) ? scene.actualEvents : [];
  const out = [];
  for (const ev of events) {
    // EO-G1-C-01：无合法 Event Identity 的事件不归因（不铸 attr 引用，fail-closed）
    if (!String(ev?.id || '').trim()) continue;
    const actors = Array.isArray(ev?.actors) && ev.actors.length
      ? ev.actors
      : (scene?.pov ? [scene.pov] : []);
    for (const characterId of actors) {
      const name = String(characterId || '').trim();
      if (!name) continue;
      // G1-A：Attribution Subject 只认 RESOLVED Character（含 pov 兜底）；
      // UNRESOLVED surface/role 不物化为归因主体（fail-closed，仅计数观测）
      if (bookDir) {
        const r = resolveCharacter(bookDir, name);
        if (r.status !== 'RESOLVED') continue;
        out.push({ ev, characterId: r.canonical, via: r.via });
        continue;
      }
      out.push({ ev, characterId: name });
    }
  }
  return out;
}

/**
 * Soft: after Actual (+ optional SR). Never throws to caller for Gate failures.
 */
export function applyAttributionAfterActual(bookDir, chapter, scene, opts = {}) {
  const result = {
    version: ATTRIBUTION_WIRING_VERSION,
    attempted: 0,
    written: 0,
    statuses: [],
    skipped: false,
    error: null,
  };

  if (!bookDir || chapter == null || !scene) {
    result.skipped = true;
    result.error = 'missing_args';
    return result;
  }
  if (!String(scene.text || '').trim()) {
    result.skipped = true;
    result.error = 'no_prose';
    return result;
  }
  if (!(scene.actualEvents || []).length) {
    result.skipped = true;
    result.error = 'no_actual_events';
    return result;
  }

  try {
    const characterSRState = opts.characterSRState || scene.characterSRState || null;
    const characterHints = Array.isArray(opts.characterHints) ? opts.characterHints : null;
    const stateProperties = opts.stateProperties || null;

    for (const { ev, characterId } of candidatesFromScene(scene, bookDir)) {
      result.attempted += 1;
      const { evidence } = buildEvidenceForCandidate({
        scene,
        ev,
        characterId,
        stateProperties,
        characterHints,
        characterSRState,
      });

      // Never pass Writer/plan/causal — only TypedEvidence[]
      const out = runAttributionGate(bookDir, chapter, {
        characterId,
        actionDescription: String(ev.action || 'action').slice(0, 200),
        evidence,
        storyClock: opts.storyClock != null ? opts.storyClock : chapter,
        sceneId: scene.id || `scene_${scene.index || ''}`,
        occurrenceRef: ev.id || null,
        recordId: `attr_${ev.id || 'evt'}_${characterId}`.replace(/[^\w\u4e00-\u9fff.-]/g, '_').slice(0, 120),
      }, { writeMode: 'upsert' });

      result.statuses.push({
        characterId,
        eventId: ev.id || null,
        status: out.judgment?.status || null,
        written: Boolean(out.write?.written),
      });
      if (out.write?.written) result.written += 1;
    }

    scene.attributionRun = {
      version: ATTRIBUTION_WIRING_VERSION,
      attempted: result.attempted,
      written: result.written,
      statuses: result.statuses,
    };
  } catch (err) {
    // Soft-fail: never block pipeline
    result.error = err?.message || String(err);
    console.warn('[attribution] soft wiring skipped:', result.error);
  }

  return result;
}

/**
 * Optional chapter-end enrichment with StateDiff evolution hints / properties.
 * Soft / non-blocking. Must NOT be a precondition of MemoryUnit.commit.
 */
export function enrichAttributionAfterStateDiff(bookDir, chapter, scenes = [], stateDiff = null, opts = {}) {
  const result = {
    version: ATTRIBUTION_WIRING_VERSION,
    scenes: 0,
    attempted: 0,
    written: 0,
    error: null,
  };
  if (!bookDir || chapter == null) {
    result.error = 'missing_args';
    return result;
  }

  try {
    const hints = stateDiff?.evolution?.characterHints || null;
    const stateProperties = {
      timelineEventCount: stateDiff?.evolution?.timelineEvents?.length || 0,
      ...(opts.stateProperties || {}),
    };

    for (const scene of scenes) {
      if (!scene?.text || !(scene.actualEvents || []).length) continue;
      result.scenes += 1;
      const r = applyAttributionAfterActual(bookDir, chapter, scene, {
        characterHints: hints,
        stateProperties,
        characterSRState: scene.characterSRState || null,
        storyClock: opts.storyClock != null ? opts.storyClock : chapter,
      });
      result.attempted += r.attempted || 0;
      result.written += r.written || 0;
    }
  } catch (err) {
    result.error = err?.message || String(err);
    console.warn('[attribution] chapter enrichment skipped:', result.error);
  }
  return result;
}
