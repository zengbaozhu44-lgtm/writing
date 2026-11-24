/**
 * Reality Input Projection — Route may only see `confirmed` *eligibility* slices.
 * Does NOT modify disk. Does NOT re-implement Reality Engine / Authority Act.
 *
 * EO-P1 Dual BLOCK A: `confirmed` = Route projection eligibility ≠ obtains.
 * Filtered / persisted slices ≠ Reality Status. Persistence ≠ Reality Status.
 *
 * RouteReality(N) = Projection(CanonEvidence ∩ KnownByChapter(N) − PlanResidue)
 *
 * @see golden/reality/story-route-v1/SPEC.md §1
 * @see golden/reality/d1-implementation-contract/INTERPRETATION-BLOCK.md
 */
import { filterCanonicalTimelineEvents } from '../../inkos-context-ranking/src/timeline-canon.js';
import { isTemplateFallback } from '../../inkos-brain/src/authored/authored-input-sanitize.js';
import { stampEligibilityLabel } from '../../inkos-core/src/lib/legacy-read-preference.js';

const L02_FACT_RE = /^第\d+章完成[：:]/u;

/** Plan / scaffold text — not Route confirmed reality (even if on disk at chapter N). */
export function isRoutePlanResidue(text = '') {
  const t = String(text || '').trim();
  if (!t) return true;
  if (isTemplateFallback(t)) return true;
  if (/^建立\s*POV\b/u.test(t)) return true;
  if (/当下目标[：:]/u.test(t)) return true;
  if (/^克服阻碍[：:]/u.test(t)) return true;
  if (/^承接上章推进/u.test(t)) return true;
  if (/待规划第\d+章/u.test(t)) return true;
  if (/^推进阻碍[（(]/u.test(t)) return true;
  return false;
}

/** @param {string} text */
function isL02MainGoalFact(text = '') {
  return L02_FACT_RE.test(String(text || '').trim());
}

/** @param {unknown} fact */
function factText(fact) {
  if (typeof fact === 'string') return fact;
  if (fact && typeof fact === 'object') {
    return String(fact.fact || fact.text || '').trim();
  }
  return '';
}

function dayChapter(day) {
  const n = Number(day?.chapter);
  return Number.isFinite(n) && n >= 1 ? n : null;
}

/**
 * POV / present known by end of chapter N (from timeline characters_present).
 * @param {object[]} daysInScope
 * @param {number} chapter
 */
export function resolveKnownCastAtChapter(daysInScope, chapter) {
  const atChapter = daysInScope.filter((d) => dayChapter(d) === chapter);
  const pool = atChapter.length ? atChapter : daysInScope;
  const present = new Set();
  for (const day of pool) {
    for (const name of day.characters_present || []) {
      if (name) present.add(String(name).trim());
    }
  }
  const pov = [...present][0] || '';
  return { pov, present: [...present] };
}

/**
 * @param {import('../../inkos-brain/src/loader.js').BrainContext} ctx
 * @param {{ priorAnchor?: object|null, chapter?: number, pov?: string, present?: string[] }} [options]
 */
export function projectRouteRealityInput(ctx, options = {}) {
  const chapter = Number(options.chapter ?? ctx.chapter ?? 1);
  const excluded = [];

  const rawTimeline = Array.isArray(ctx.timeline) ? ctx.timeline : [];

  // --- timeline: KnownByChapter(N) → S6.3 → plan residue ---
  const timeline = [];
  let timelineRejected = 0;
  let planResidueRejected = 0;
  let futureChapterRejected = 0;

  const daysInScope = [];
  for (const day of rawTimeline) {
    const dc = dayChapter(day);
    if (dc != null && dc > chapter) {
      futureChapterRejected += (day.events || []).length;
      excluded.push({
        source: 'timeline',
        reason: 'future_chapter',
        dayChapter: dc,
        routeChapter: chapter,
        count: (day.events || []).length,
      });
      continue;
    }
    daysInScope.push(day);
  }
  if (futureChapterRejected > 0) {
    excluded.push({
      source: 'timeline',
      reason: 'future_chapter_batch',
      routeChapter: chapter,
      count: futureChapterRejected,
    });
  }

  for (const day of daysInScope) {
    const rawEvents = day?.events || [];
    const canonAllowed = filterCanonicalTimelineEvents(rawEvents);
    timelineRejected += rawEvents.length - canonAllowed.length;

    const allowed = [];
    for (const ev of canonAllowed) {
      if (isRoutePlanResidue(ev)) {
        planResidueRejected += 1;
        excluded.push({
          source: 'timeline',
          reason: 'plan_residue',
          sample: String(ev).slice(0, 80),
          dayChapter: dayChapter(day),
        });
        continue;
      }
      allowed.push(ev);
    }
    if (!allowed.length) continue;
    timeline.push({
      day: day.day,
      chapter: day.chapter,
      characters_present: [...(day.characters_present || [])],
      events: allowed,
      provenance: {
        kind: 'confirmed',
        source: '11_timeline.yaml',
        filter: 'known_by_chapter_N+S6.3+no_plan_residue',
        routeChapter: chapter,
        d1LegacyReadPreference: stampEligibilityLabel('confirmed', { carrier: '11_timeline' }),
      },
    });
  }
  if (timelineRejected > 0) {
    excluded.push({ source: 'timeline', reason: 'non_A_class_or_template', count: timelineRejected });
  }
  if (planResidueRejected > 0) {
    excluded.push({ source: 'timeline', reason: 'plan_residue_batch', count: planResidueRejected });
  }

  const { pov: timelinePov, present: timelinePresent } = resolveKnownCastAtChapter(daysInScope, chapter);
  const resolvedPov = options.pov || timelinePov || options.priorAnchor?.pov || '';
  const resolvedPresent = options.present?.length
    ? [...options.present]
    : timelinePresent;

  // --- facts: KnownByChapter(N) + reject L02/templates ---
  const rawFacts = Array.isArray(ctx.facts) ? ctx.facts : [];
  const facts = [];
  for (const f of rawFacts) {
    const text = factText(f);
    if (!text) continue;
    const fc = Number(f?.chapter);
    if (Number.isFinite(fc) && fc > chapter) {
      excluded.push({ source: 'facts', reason: 'future_chapter', factChapter: fc, routeChapter: chapter });
      continue;
    }
    if (isTemplateFallback(text)) {
      excluded.push({ source: 'facts', reason: 'template_fallback', sample: text.slice(0, 60) });
      continue;
    }
    if (isL02MainGoalFact(text)) {
      excluded.push({ source: 'facts', reason: 'L02_mainGoal_fact', sample: text.slice(0, 80) });
      continue;
    }
    facts.push({
      fact: text,
      immutable: Boolean(f?.immutable),
      chapter: f?.chapter,
      provenance: {
        kind: 'confirmed',
        source: '13_facts_db.yaml',
        routeChapter: chapter,
        d1LegacyReadPreference: stampEligibilityLabel('confirmed', {
          carrier: '13_facts_db',
          immutableRole: 'retention_not_truth',
        }),
      },
    });
  }

  // --- 08: only if disk table matches route chapter N (not "latest book state") ---
  const state = ctx.state || {};
  const diskChapter = parseInt(String(state['当前章节'] ?? ''), 10);
  const currentState = {};
  const stateRejected = [];

  if (Number.isFinite(diskChapter) && diskChapter !== chapter) {
    excluded.push({
      source: '08_current_state',
      reason: 'stale_disk_state_not_route_chapter',
      diskChapter,
      routeChapter: chapter,
    });
  } else if (Number.isFinite(diskChapter) && diskChapter === chapter) {
    const allowedStateKeys = new Set(['POV', '当前章节', '本章字数', '最后更新']);
    for (const [key, value] of Object.entries(state)) {
      if (allowedStateKeys.has(key) && value && value !== '—') {
        currentState[key] = value;
      } else if (['地点', '时间', '任务', '当前位置'].includes(key)) {
        stateRejected.push(key);
      }
    }
    if (stateRejected.length) {
      excluded.push({ source: '08_current_state', reason: 'plan_derived_fields', fields: stateRejected });
    }
  }

  // --- anchor: end of chapter N-1 only ---
  const priorAnchor = options.priorAnchor ?? null;
  const anchorSlice = priorAnchor ? {
    pov: priorAnchor.pov || null,
    location: priorAnchor.location || null,
    current_date: priorAnchor.current_date || null,
    provenance: {
      kind: 'confirmed',
      source: 'states_anchor',
      note: 'relationship_state excluded',
      d1LegacyReadPreference: stampEligibilityLabel('confirmed', { carrier: 'states_anchor' }),
    },
  } : null;
  if (priorAnchor?.relationship_state) {
    excluded.push({ source: 'anchor', reason: 'L06_plan_relationship_state', field: 'relationship_state' });
  }

  // --- people: only resolved cast at chapter N (not loader's stale POV set) ---
  const castNames = new Set([resolvedPov, ...resolvedPresent].filter(Boolean));
  const people = {};
  for (const name of castNames) {
    const char = ctx.characters?.[name];
    if (!char) continue;
    people[name] = {
      name,
      identity: char.identity || '',
      publicGoal: char.publicGoal || '',
      realGoal: char.realGoal || '',
      fear: char.fear || '',
      bottomLine: char.bottomLine || '',
      values: char.values || '',
      provenance: { kind: 'authored', source: '03_character_bible' },
    };
  }
  if (castNames.size && Object.keys(people).length < castNames.size) {
    const missing = [...castNames].filter((n) => !people[n]);
    excluded.push({ source: 'people', reason: 'no_character_bible', names: missing });
  }

  // --- relations: static graph (unchanged) ---
  const relations = (ctx.relationships || []).map((e) => ({
    from: e.from,
    to: e.to,
    trust: e.trust,
    hostility: e.hostility,
    note: e.note || '',
    provenance: { kind: 'authored', source: '05_relationship_graph.yaml' },
  }));

  const world = {
    bible: String(ctx.worldBible || '').trim(),
    state_board: String(ctx.stateBoard || '').trim(),
    provenance: { kind: 'authored', source: '01_world_bible,07_state_board' },
  };

  // --- foreshadow: NOT confirmed Route reality ---
  const foreshadowCount = Array.isArray(ctx.foreshadow) ? ctx.foreshadow.length : 0;
  if (foreshadowCount > 0) {
    excluded.push({
      source: 'foreshadow',
      reason: 'possibility_not_confirmed_reality',
      count: foreshadowCount,
    });
  }

  const history = {
    timeline,
    facts,
    knowledge: ctx.knowledge || { matrix: [] },
  };

  const effectivePov = resolvedPov
    || currentState.POV
    || anchorSlice?.pov
    || '';

  const currentReality = {
    chapter,
    pov: effectivePov,
    present: [...resolvedPresent],
    state: Object.keys(currentState).length
      ? currentState
      : (effectivePov ? { POV: effectivePov } : {}),
    anchor: anchorSlice,
  };

  excluded.push(
    { source: '09_current_chapter', reason: 'plan_direction_never_route_reality', action: 'excluded' },
    { source: 'chapter_plans', reason: 'plan_never_route_reality', action: 'excluded' },
    { source: 'volume_outline', reason: 'plan_never_route_reality', action: 'excluded' },
  );

  return {
    version: 'story-route-v1',
    chapter,
    resolvedPov: effectivePov,
    resolvedPresent: [...resolvedPresent],
    excluded,
    confirmed: {
      world,
      people,
      relations,
      history,
      current_reality: currentReality,
      d1LegacyReadPreference: stampEligibilityLabel('confirmed', {
        path: 'projectRouteRealityInput',
        audit: 'R-03/I-06',
      }),
    },
  };
}
