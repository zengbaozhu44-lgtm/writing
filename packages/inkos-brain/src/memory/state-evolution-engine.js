/**
 * Phase 2 — State Evolution Engine (minimal WRAP)
 *
 * Sole semantic constructor for chapter StateDiff (via buildStateDiff).
 * - Timeline events: ONLY from scene.actualEvents (text-grounded StoryEvents)
 * - Plan / modelled / closingWorldState: NEVER (EO-P2 preserved on resolveTimelineEvents)
 * - facts: still [] this step
 * - characterHints: tags only; does not call writeCharacterBrain
 *
 * @see _AI_STATE_EVOLUTION_DESIGN.md
 * @see _AI_STATE_WRITE_AUDIT.md
 */
import { ensureActualEvents } from '../events/event-extractor.js';
import { buildStateDelta, isActualTimelineEvent } from './state-updater.js';

export const STATE_EVOLUTION_VERSION = 'state-evolution-1';
export const STATE_EVOLUTION_ENGINE = 'state-evolution-engine';

const MAX_TIMELINE_EVENTS = 12;

/**
 * Evolve chapter state from Actual Events + operational intent metadata.
 *
 * @param {object} opts
 * @param {string} opts.bookDir
 * @param {number} opts.chapter
 * @param {object[]} [opts.scenes]
 * @param {object} [opts.intent]
 * @param {string} [opts.chapterText]
 * @param {object} [opts.metrics]
 * @param {object} [opts.nextChapterPlan]
 * @param {boolean} [opts.force]
 * @param {object} [opts.livingPrepare]
 * @param {object} [opts.readerSimulator]
 * @returns {object} StateDiff with evolution + provenance
 */
export function evolveFromChapter(opts = {}) {
  const {
    bookDir,
    chapter,
    scenes = [],
    intent = {},
    chapterText = '',
    metrics = null,
    nextChapterPlan = null,
    force = false,
    livingPrepare = null,
    readerSimulator = null,
  } = opts;

  const sceneList = Array.isArray(scenes) ? scenes : [];
  const collected = collectActualEventsFromScenes(sceneList);
  const mapped = mapActualEventsToEvolution(collected.events);
  // EO-P4-World-Consequence-Consumption-01: consume asserted World Consequence
  // Truth as truth-grounded world hints (consume-only; never mints, never Plan)
  const wctCollected = collectWorldConsequencesFromScenes(sceneList);
  const worldHints = [...mapped.worldHints];
  for (const w of wctCollected.hints) {
    if (!worldHints.includes(w)) worldHints.push(w);
  }

  // Operational shell still from buildStateDelta (08 / day / empty plan-path events)
  const baseDelta = buildStateDelta(bookDir, chapter, {
    intent,
    chapterText,
    metrics,
    scenes: sceneList,
    nextChapterPlan,
  });

  const canonDelta = {
    ...baseDelta,
    timeline: {
      ...(baseDelta.timeline || {}),
      // Overlay: Actual-derived only (never Plan). Empty if none qualify.
      events: mapped.timelineEvents.slice(0, MAX_TIMELINE_EVENTS),
    },
  };

  const provenance = {
    engine: STATE_EVOLUTION_ENGINE,
    version: STATE_EVOLUTION_VERSION,
    source: 'actual_events',
    at: new Date().toISOString(),
    writesCanonTimeline: mapped.timelineEvents.length > 0,
    writesFacts: false,
    writesCharacterBrain: false,
    actualEventCount: collected.events.length,
    timelineEventCount: mapped.timelineEvents.length,
    consumesWorldConsequenceTruth: wctCollected.count > 0,
    worldConsequenceCount: wctCollected.count,
  };

  return {
    version: 'state-diff-1',
    chapter,
    chapterText: chapterText || '',
    chapterTitle: intent?.chapterTitle || `第${chapter}章`,
    intent: intent || {},
    metrics,
    scenes: sceneList,
    nextChapterPlan,
    livingPrepare,
    readerSimulator,
    force: Boolean(force),
    canonDelta,
    evolution: {
      version: STATE_EVOLUTION_VERSION,
      actualEventIds: collected.events.map((e) => e.id).filter(Boolean),
      timelineEvents: mapped.timelineEvents,
      characterHints: mapped.characterHints,
      openLoops: mapped.openLoops,
      worldHints,
      worldConsequences: wctCollected.records,
      rejected: mapped.rejected,
    },
    provenance,
    builtAt: new Date().toISOString(),
  };
}

/**
 * Collect StoryEvents from scenes (reextract if missing).
 * Never reads Plan fields (ensureActualEvents strips Plan).
 */
export function collectActualEventsFromScenes(scenes = [], opts = {}) {
  const list = Array.isArray(scenes) ? scenes : [];
  const events = [];
  const sources = [];

  for (const scene of list) {
    if (!scene || !String(scene.text || '').trim()) continue;
    ensureActualEvents(scene, {
      knownNames: opts.knownNames,
      stripPlan: true,
      reextract: opts.reextract === true,
    });
    const attached = Array.isArray(scene.actualEvents) ? scene.actualEvents : [];
    if (!attached.length) continue;
    sources.push({
      sceneId: scene.id || `scene_${scene.index}`,
      index: scene.index,
      count: attached.length,
    });
    for (const ev of attached) {
      events.push({ ...ev, fromScene: scene.index, fromSceneId: scene.id });
    }
  }

  return { events, sources };
}

/**
 * Map Actual Events → timeline strings + hints.
 * Plan-derived text must never appear here (input is StoryEvent only).
 */
export function mapActualEventsToEvolution(actualEvents = []) {
  const timelineEvents = [];
  const characterHints = [];
  const openLoops = [];
  const worldHints = [];
  const rejected = [];
  const seen = new Set();

  for (const ev of actualEvents) {
    if (!ev || typeof ev !== 'object') continue;
    const candidate = formatTimelineCandidate(ev);
    if (!candidate) {
      rejected.push({ id: ev.id, reason: 'empty_candidate' });
      continue;
    }
    if (!isActualTimelineEvent(candidate)) {
      rejected.push({ id: ev.id, reason: 'isActualTimelineEvent_reject', candidate });
      continue;
    }
    const key = candidate.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      timelineEvents.push(candidate);
    }

    const actors = Array.isArray(ev.actors) ? ev.actors : [];
    for (const name of actors) {
      characterHints.push({
        character: name,
        action: String(ev.action || '').slice(0, 80),
        stateChanges: Array.isArray(ev.stateChanges) ? ev.stateChanges : [],
        eventId: ev.id,
      });
    }

    for (const sc of ev.stateChanges || []) {
      const s = String(sc);
      if (s.startsWith('open_loop:')) openLoops.push(s);
      else worldHints.push(s);
    }
  }

  return {
    timelineEvents,
    characterHints,
    openLoops: [...new Set(openLoops)],
    worldHints: [...new Set(worldHints)].slice(0, 24),
    rejected,
  };
}

/**
 * Collect asserted World Consequence Truths from scenes (consume-only).
 * Only reads scene.worldConsequenceTruth minted by the bridge; never mints,
 * never falls back to Plan/occurrence/stateChanges alone. Absent → empty.
 */
export function collectWorldConsequencesFromScenes(scenes = []) {
  const list = Array.isArray(scenes) ? scenes : [];
  const records = [];
  const hints = [];
  const seen = new Set();

  for (const scene of list) {
    if (!scene || typeof scene !== 'object') continue;
    const wct = scene.worldConsequenceTruth;
    if (!wct || wct.status !== 'asserted') continue;
    const w = String(wct.worldChangeContent || '').trim();
    if (!w) continue;
    const key = `${wct.occurrenceRef || ''}|${w}`;
    if (seen.has(key)) continue;
    seen.add(key);
    records.push({
      characterId: wct.characterId || null,
      actionContent: String(wct.actionContent || '').slice(0, 80),
      worldChangeContent: w.slice(0, 120),
      occurrenceRef: wct.occurrenceRef || null,
      provenance: wct.provenance || null,
      fromScene: scene.index ?? null,
      fromSceneId: scene.id || null,
    });
    hints.push(`wct:${w.slice(0, 60)}`);
  }

  return { records, hints, count: records.length };
}

function formatTimelineCandidate(ev) {
  const actors = (Array.isArray(ev.actors) ? ev.actors : []).filter(Boolean);
  const action = String(ev.action || '').trim();
  if (!action) return '';
  // Reject Plan skeletons on the action alone (actor prefix must not launder them)
  if (!isActualTimelineEvent(action)) return '';
  const who = actors.length ? `${actors.slice(0, 3).join('/')}：` : '';
  const line = `${who}${action}`.replace(/\s+/g, ' ').trim();
  if (!isActualTimelineEvent(line) && !isActualTimelineEvent(action)) return '';
  return line.slice(0, 120);
}
