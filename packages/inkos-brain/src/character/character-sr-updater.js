/**
 * Phase 3.2 — CharacterSR updater (Actual → IB → CharacterSR)
 *
 * Binding (_AI_SR_DESIGN_GATE.md + _AI_CAUSAL_CROSS_AUDIT.md):
 * - Allowed sources: Actual Event, F1/F4 IB, knowledge matrix baseline (via assemble), authored SR
 * - Forbidden as SR fact: causal_chain, Situation belief, Desire belief, Living brain,
 *   heroKnows, Beat stateChanges, Plan closingWorldState, Scene Goal, Expected, Writer intent,
 *   context-ranking, Reasoner output
 * - SR never writes Canon / timeline / facts / Actual Events
 * - No Choice / Cognitive / Emotion engine
 *
 * @see _AI_PHASE3_2 will document completion
 */
import fs from 'node:fs';
import path from 'node:path';
import { ensureActualEvents } from '../events/event-extractor.js';

export const CHARACTER_SR_ENGINE = 'character-sr';
export const CHARACTER_SR_VERSION = 'character-sr-1';

function brainSystemDir(bookDir) {
  return path.join(bookDir, 'novel', '_system', 'brain');
}

/** Sources that must NEVER be read as CharacterSR facts */
export const FORBIDDEN_SR_FACT_SOURCES = Object.freeze([
  'causal_chain',
  'causalChain',
  'situation.belief',
  'desire.belief',
  'living_brain',
  'character_brains',
  'heroKnows',
  'informationGap',
  'beat.stateChanges',
  'characterStateChanges',
  'closingWorldState',
  'plan.closingWorldState',
  'scene.goal',
  'expected',
  'expectedAction',
  'writer_intention',
  'context_ranking',
  'reasoner',
]);

/**
 * Information Boundary for Actual Events (consume F1/F4 spirit; no new Boundary Engine).
 * Character may access an event iff they are actor/affected OR present to witness it.
 */
export function characterCanAccessActualEvent(characterName, event, scene = {}) {
  const name = String(characterName || '').trim();
  if (!name || !event || typeof event !== 'object') return false;

  const actors = Array.isArray(event.actors) ? event.actors : [];
  const affected = Array.isArray(event.affectedEntities) ? event.affectedEntities : [];
  if (actors.includes(name) || affected.includes(name)) return true;

  const present = new Set(
    [scene.pov, ...(scene.present || []), ...(scene.characters || [])]
      .map((n) => String(n || '').trim())
      .filter(Boolean),
  );
  if (!present.has(name)) return false;

  // Present witness: may perceive grounded action/speech/choice in the same scene
  const kind = String(event.kind || 'action');
  return ['action', 'speech', 'open_choice', 'choice_settled', 'presence'].includes(kind);
}

/**
 * Reject accidental Plan/Reasoner contamination objects.
 * @throws if forbidden keys appear as SR fact bags
 */
export function assertNoForbiddenSRSources(payload = {}) {
  const blob = JSON.stringify(payload);
  for (const key of FORBIDDEN_SR_FACT_SOURCES) {
    // Only flag if used as top-level injection bags we refuse to merge
    if (payload && Object.prototype.hasOwnProperty.call(payload, key)) {
      const err = new Error(`CharacterSR refuses forbidden source: ${key}`);
      err.code = 'SR_FORBIDDEN_SOURCE';
      throw err;
    }
  }
  void blob;
  return true;
}

function norm(v) {
  return String(v || '').trim();
}

function makeProvenance({
  characterId,
  field,
  source,
  eventId = null,
  storyClock = null,
} = {}) {
  const p = {
    characterId: norm(characterId) || null,
    field: norm(field) || null,
    source: norm(source) || 'actual_event',
    engine: CHARACTER_SR_ENGINE,
    version: CHARACTER_SR_VERSION,
  };
  if (eventId) p.eventId = String(eventId);
  if (storyClock != null && storyClock !== '') p.storyClock = storyClock;
  return p;
}

function groundedInfoFromEvent(event) {
  const excerpt = norm(event?.evidence?.excerpt);
  if (excerpt) return excerpt.slice(0, 120);
  const actors = (event.actors || []).filter(Boolean).slice(0, 3).join('/');
  const action = norm(event.action);
  if (!action) return '';
  return (actors ? `${actors}：${action}` : action).slice(0, 120);
}

function emptyCharacterSR(name) {
  return {
    name,
    awareness: { items: [], status: 'omit', kind: 'awareness' },
    interpretation: { items: [], status: 'omit', kind: 'interpretation' },
    belief: { items: [], status: 'omit', kind: 'belief' },
    stance: { items: [], status: 'omit', kind: 'stance' },
    relevance: { items: [], status: 'omit', kind: 'relevance' },
    mutations: [],
  };
}

function ensureSlot(sr, kind) {
  if (!sr[kind] || typeof sr[kind] !== 'object') {
    sr[kind] = { items: [], status: 'omit', kind };
  }
  if (!Array.isArray(sr[kind].items)) sr[kind].items = [];
}

function pushUnique(items, keyFn, item) {
  const key = keyFn(item);
  if (items.some((x) => keyFn(x) === key)) return false;
  items.push(item);
  return true;
}

function readAuthoredBlock(authoredBags, name) {
  if (!authoredBags || typeof authoredBags !== 'object') return null;
  const bags = [
    authoredBags.characterSubjective,
    authoredBags.characterSR,
    authoredBags.subjectiveReality,
    authoredBags.authoredCharacterSR,
    authoredBags,
  ];
  for (const bag of bags) {
    if (!bag || typeof bag !== 'object') continue;
    if (bag[name] && typeof bag[name] === 'object') return bag[name];
  }
  return null;
}

/**
 * Update / create CharacterSR map from Actual Events (+ authored subjective fields only).
 *
 * @returns {{ characters: Record<string, object>, meta: object }}
 */
export function updateCharacterSRFromActual(opts = {}) {
  const {
    characterNames = [],
    scenes = [],
    events = null,
    authoredSR = null,
    storyClock = null,
    prior = null,
    worldProjection = null,
  } = opts;

  // Refuse accidental injection of forbidden bags at call site
  assertNoForbiddenSRSources(opts.forbiddenProbe || {});

  const names = [...new Set((characterNames || []).map(norm).filter(Boolean))];
  const sceneList = Array.isArray(scenes) ? scenes : [];

  // Collect events: explicit list OR from scenes (ensure extracted)
  let eventBag = [];
  if (Array.isArray(events)) {
    eventBag = events;
  } else {
    for (const scene of sceneList) {
      if (!scene || !norm(scene.text)) continue;
      ensureActualEvents(scene, { stripPlan: true });
      for (const ev of scene.actualEvents || []) {
        eventBag.push({ ...ev, _scene: scene });
      }
    }
  }

  const out = {};
  for (const name of names) {
    out[name] = prior?.characters?.[name]
      ? JSON.parse(JSON.stringify(prior.characters[name]))
      : emptyCharacterSR(name);
    out[name].name = name;
    for (const k of ['awareness', 'interpretation', 'belief', 'stance', 'relevance']) {
      ensureSlot(out[name], k);
    }
    if (!Array.isArray(out[name].mutations)) out[name].mutations = [];
  }

  for (const name of names) {
    const sr = out[name];
    const authored = readAuthoredBlock(authoredSR, name);

    for (const ev of eventBag) {
      const scene = ev._scene || {};
      const accessible = characterCanAccessActualEvent(name, ev, scene);
      const info = groundedInfoFromEvent(ev);
      const actors = ev.actors || [];
      const isActor = actors.includes(name);

      // Relevance (minimal)
      let relLevel = 'omit';
      if (accessible && isActor) relLevel = 'high';
      else if (accessible) relLevel = 'low';
      if (authored?.relevance != null) {
        const forced = String(authored.relevance).toLowerCase();
        if (['high', 'low', 'omit'].includes(forced)) relLevel = forced;
      }
      if (relLevel !== 'omit' && ev.id) {
        const relItem = {
          eventId: ev.id,
          info: info || ev.id,
          level: relLevel,
          provenance: makeProvenance({
            characterId: name,
            field: 'relevance',
            source: 'actual_event',
            eventId: ev.id,
            storyClock,
          }),
        };
        if (pushUnique(sr.relevance.items, (x) => `${x.eventId}:${x.level}`, relItem)) {
          sr.relevance.status = 'present';
          sr.mutations.push(relItem.provenance);
        }
      }

      if (!accessible || !info) continue;

      // Awareness from Actual (grounded evidence only — never Plan labels)
      const awareItem = {
        info,
        level: 'know',
        eventId: ev.id || null,
        provenance: makeProvenance({
          characterId: name,
          field: 'knowledge',
          source: 'actual_event',
          eventId: ev.id,
          storyClock,
        }),
      };
      if (pushUnique(sr.awareness.items, (x) => x.info, awareItem)) {
        sr.awareness.status = 'present';
        sr.mutations.push(awareItem.provenance);
      }
    }

    // Authored interpretation / belief / stance (explicit only — no LLM, no Plan)
    if (Array.isArray(authored?.interpretation)) {
      for (const it of authored.interpretation) {
        const of = norm(it?.of);
        const as = norm(it?.as);
        if (!of || !as) continue;
        const item = {
          of,
          as,
          eventId: it.eventId || null,
          provenance: makeProvenance({
            characterId: name,
            field: 'interpretation',
            source: 'authored',
            eventId: it.eventId || null,
            storyClock,
          }),
        };
        if (pushUnique(sr.interpretation.items, (x) => `${x.of}→${x.as}`, item)) {
          sr.interpretation.status = 'present';
          sr.mutations.push(item.provenance);
        }
      }
    }

    if (Array.isArray(authored?.belief)) {
      for (const b of authored.belief) {
        const proposition = typeof b === 'string' ? norm(b) : norm(b?.proposition || b?.text || b?.as);
        if (!proposition) continue;
        const item = {
          proposition,
          eventId: typeof b === 'object' ? b?.eventId || null : null,
          provenance: makeProvenance({
            characterId: name,
            field: 'belief',
            source: 'authored',
            eventId: typeof b === 'object' ? b?.eventId || null : null,
            storyClock,
          }),
        };
        if (pushUnique(sr.belief.items, (x) => x.proposition, item)) {
          sr.belief.status = 'present';
          sr.mutations.push(item.provenance);
        }
      }
    }

    if (Array.isArray(authored?.stance)) {
      for (const s of authored.stance) {
        const stance = norm(typeof s === 'string' ? s : s?.stance).toLowerCase();
        if (!['believes', 'suspects', 'uncertain', 'rejects', 'unknown'].includes(stance)) continue;
        const item = {
          stance,
          about: typeof s === 'object' ? norm(s?.about) || null : null,
          provenance: makeProvenance({
            characterId: name,
            field: 'stance',
            source: 'authored',
            storyClock,
          }),
        };
        if (pushUnique(sr.stance.items, (x) => `${x.stance}:${x.about || ''}`, item)) {
          sr.stance.status = 'present';
          sr.mutations.push(item.provenance);
        }
      }
    }

    // EO-CW-Projection-01: World → Projection → SR（保留式合并——不删不盖 Actual/authored
    // 项；provenance 原样保留含 projectedBy；冲突 COEXIST）
    const wp = worldProjection && typeof worldProjection === 'object'
      ? (worldProjection[name] || null) : null;
    if (wp) {
      const mergeWorld = (slot, items, keyFn) => {
        for (const item of items || []) {
          if (!item) continue;
          if (pushUnique(slot.items, keyFn, item)) {
            slot.status = 'present';
            if (item.provenance) sr.mutations.push(item.provenance);
          }
        }
      };
      mergeWorld(sr.awareness, wp.awareness, (x) => x.info);
      mergeWorld(sr.interpretation, wp.interpretation, (x) => `${x.of}→${x.as}`);
      mergeWorld(sr.belief, wp.belief, (x) => x.proposition);
      mergeWorld(sr.stance, wp.stance, (x) => `${x.stance}:${x.about || ''}`);
    }

    // Authored awareness extras
    if (Array.isArray(authored?.awareness)) {
      for (const a of authored.awareness) {
        const info = typeof a === 'string' ? norm(a) : norm(a?.info);
        if (!info) continue;
        const item = {
          info,
          level: 'know',
          eventId: typeof a === 'object' ? a?.eventId || null : null,
          provenance: makeProvenance({
            characterId: name,
            field: 'knowledge',
            source: 'authored',
            eventId: typeof a === 'object' ? a?.eventId || null : null,
            storyClock,
          }),
        };
        if (pushUnique(sr.awareness.items, (x) => x.info, item)) {
          sr.awareness.status = 'present';
          sr.mutations.push(item.provenance);
        }
      }
    }
  }

  return {
    version: CHARACTER_SR_VERSION,
    engine: CHARACTER_SR_ENGINE,
    characters: out,
    meta: {
      writesCanon: false,
      writesTimeline: false,
      writesFacts: false,
      writesActual: false,
      isRealityAuthority: false,
      eventCount: eventBag.length,
      characterCount: names.length,
    },
  };
}

export function characterSRDir(bookDir) {
  return path.join(brainSystemDir(bookDir), 'character_sr');
}

export function characterSRChapterPath(bookDir, chapter) {
  return path.join(characterSRDir(bookDir), `ch_${String(chapter).padStart(4, '0')}.json`);
}

export function loadCharacterSRState(bookDir, chapter) {
  const file = characterSRChapterPath(bookDir, chapter);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Persist CharacterSR sidecar only — never Canon modules.
 */
export function saveCharacterSRState(bookDir, chapter, state) {
  if (!bookDir || !chapter || !state) {
    return { written: false, reason: 'missing_args' };
  }
  const dir = characterSRDir(bookDir);
  fs.mkdirSync(dir, { recursive: true });
  const file = characterSRChapterPath(bookDir, chapter);
  const payload = {
    ...state,
    chapter: Number(chapter),
    updatedAt: new Date().toISOString(),
    meta: {
      ...(state.meta || {}),
      writesCanon: false,
      writesTimeline: false,
      writesFacts: false,
      path: 'character_sr_sidecar_only',
    },
  };
  fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return { written: true, path: file };
}

/**
 * After scene Actual extraction: update SR for names in scene and attach to scene.
 */
export function applyCharacterSRAfterActual(bookDir, chapter, scene, opts = {}) {
  const names = [
    scene?.pov,
    ...(scene?.present || []),
    ...(scene?.characters || []),
    ...(opts.extraNames || []),
  ].map(norm).filter(Boolean);

  const prior = bookDir && chapter ? loadCharacterSRState(bookDir, chapter) : null;
  const authoredSR = opts.authoredSR
    || {
      authoredCharacterSR: opts.authoredCharacterSR || scene?.characterSR || scene?.characterSubjective,
      characterFacing: scene?.characterFacing,
    };

  // Merge characterFacing into authored bags per name
  const facing = scene?.characterFacing || {};
  const mergedAuthored = { ...(authoredSR.authoredCharacterSR || authoredSR) };
  for (const [n, block] of Object.entries(facing)) {
    mergedAuthored[n] = { ...(mergedAuthored[n] || {}), ...block };
  }

  const state = updateCharacterSRFromActual({
    characterNames: names,
    scenes: [scene],
    authoredSR: mergedAuthored,
    storyClock: opts.storyClock || null,
    prior,
    worldProjection: opts.worldProjection || null,
  });

  scene.characterSRState = state;
  if (bookDir && chapter) {
    saveCharacterSRState(bookDir, chapter, state);
  }
  return state;
}
