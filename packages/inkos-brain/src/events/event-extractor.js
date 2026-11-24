/**
 * Phase 1 — StoryEvent extractor (text → Actual candidates)
 *
 * Rules:
 * - Read scene.text only (plus optional knownNames that literally appear in text)
 * - Never read plan / closingWorldState / goal / expected / causalChain
 * - Prefer 宁缺勿滥; validator still filters
 *
 * This is a deterministic foundation extractor (not LLM). Phase 1.3 may add
 * LLM-assisted extract behind the same schema + validator.
 */
import { createStoryEvent, STORY_EVENT_SOURCES, stripPlanFromScene } from './story-event.schema.js';
import { validateStoryEvent } from './event-validator.js';
import { mintEventIdentity } from './event-identity.js';

const OPEN_CHOICE_RE = /两个选择|跟我走|或者留|还是留|你有三十秒|三十秒内|你选/u;
const CHOICE_SETTLED_RE = /跟着.{0,8}走了|选择了|决定跟|跟她走了|跟他走了|点头跟|答应跟|留在这/u;
const SPEECH_RE = /([^\s「」“”]{1,8})(?:说|道|问|喊|冷冷道)[：「:“”]?\s*[「“]([^」”]{2,80})[」”]/gu;
const ACTION_RE = /([^\s，。！？]{1,8})(推开|拉开|拔掉|抓住|松开|转身|坐下|站起|递出|按下|砸碎|撕开|拔出)([^\n。！？]{0,24})/gu;

/**
 * Extract Actual StoryEvents from scene prose.
 * @param {object} scene
 * @param {{ knownNames?: string[] }} [opts]
 * @returns {{ events: object[], rejected: object[], meta: object }}
 */
export function extractStoryEventsFromScene(scene = {}, opts = {}) {
  const clean = stripPlanFromScene(scene);
  const text = String(clean.text || '').trim();
  const sceneId = String(clean.id || `scene_${clean.index || '?'}`);
  const knownNames = resolveKnownNames(clean, opts.knownNames);
  const candidates = [];

  if (!text) {
    return {
      events: [],
      rejected: [],
      meta: { sceneId, source: STORY_EVENT_SOURCES.SCENE_TEXT, empty: true },
    };
  }

  // --- Open choice offer ---
  const choiceHit = text.match(OPEN_CHOICE_RE);
  if (choiceHit) {
    const idx = text.search(OPEN_CHOICE_RE);
    const start = Math.max(0, idx - 24);
    const excerpt = sliceEvidence(text, idx, choiceHit[0].length);
    const actors = actorsInExcerpt(excerpt, knownNames, text);
    const who = actors.length ? actors : inferActorsFromText(text, knownNames);
    // action must be text-grounded (validator checks tokens ∈ text)
    const actionPhrase = collapseForAction(excerpt) || choiceHit[0];
    const idMint = mintEventIdentity({ sceneId, excerpt, offset: start });
    candidates.push(createStoryEvent({
      id: idMint.ok ? idMint.id : "",
      sceneId,
      kind: 'open_choice',
      actors: who,
      action: actionPhrase.slice(0, 80),
      intent: '迫使对方在时限内表态',
      consequence: '选择压力仍悬置；下一场必须回答或明确延期',
      stateChanges: ['open_loop:choice=OPEN'],
      affectedEntities: who,
      evidence: { excerpt, offset: Math.max(0, idx - 24) },
      source: STORY_EVENT_SOURCES.SCENE_TEXT,
    }));
  }

  // --- Choice settled ---
  const settled = text.match(CHOICE_SETTLED_RE);
  if (settled) {
    const idx = text.search(CHOICE_SETTLED_RE);
    const excerpt = sliceEvidence(text, idx, settled[0].length);
    const actors = actorsInExcerpt(excerpt, knownNames, text);
    const mSettled = mintEventIdentity({ sceneId, excerpt, offset: Math.max(0, idx - 24) });
    candidates.push(createStoryEvent({
      id: mSettled.ok ? mSettled.id : '',
      sceneId,
      kind: 'choice_settled',
      actors: actors.length ? actors : inferActorsFromText(text, knownNames),
      action: `选择落地：${settled[0]}`,
      consequence: '开放选择已结算为已发生行动',
      stateChanges: ['open_loop:choice=PAID'],
      affectedEntities: actors.length ? actors : inferActorsFromText(text, knownNames),
      evidence: { excerpt, offset: Math.max(0, idx - 24) },
      source: STORY_EVENT_SOURCES.SCENE_TEXT,
    }));
  }

  // --- Speech acts ---
  SPEECH_RE.lastIndex = 0;
  let sm;
  let speechCount = 0;
  while ((sm = SPEECH_RE.exec(text)) && speechCount < 4) {
    const speaker = String(sm[1] || '').trim();
    const quote = String(sm[2] || '').trim();
    if (!speaker || !quote) continue;
    if (knownNames.length && !knownNames.includes(speaker) && !/[一-龥]{2,}/u.test(speaker)) continue;
    const excerpt = sm[0].slice(0, 120);
    const mSpeech = mintEventIdentity({ sceneId, excerpt, offset: sm.index });
    candidates.push(createStoryEvent({
      id: mSpeech.ok ? mSpeech.id : "",
      sceneId,
      kind: 'speech',
      actors: [speaker],
      action: `${speaker}说出：「${quote.slice(0, 40)}${quote.length > 40 ? '…' : ''}」`,
      intent: '',
      consequence: '对白成为场面已发生事实',
      stateChanges: [`speech:${speaker}`],
      affectedEntities: unique([speaker, ...actorsMentioned(quote, knownNames)]),
      evidence: { excerpt, offset: sm.index },
      source: STORY_EVENT_SOURCES.SCENE_TEXT,
    }));
    speechCount += 1;
  }

  // --- Physical actions ---
  ACTION_RE.lastIndex = 0;
  let am;
  let actionCount = 0;
  while ((am = ACTION_RE.exec(text)) && actionCount < 4) {
    const actor = String(am[1] || '').trim();
    const verb = String(am[2] || '').trim();
    const rest = String(am[3] || '').trim();
    if (!actor || !verb) continue;
    const excerpt = sliceEvidence(text, am.index, am[0].length);
    const mAct = mintEventIdentity({ sceneId, excerpt, offset: Math.max(0, am.index - 24) });
    candidates.push(createStoryEvent({
      id: mAct.ok ? mAct.id : "",
      sceneId,
      kind: 'action',
      actors: [actor],
      action: `${actor}${verb}${rest}`.slice(0, 80),
      consequence: `场面动作已发生：${verb}`,
      stateChanges: [`action:${actor}:${verb}`],
      affectedEntities: unique([actor, ...actorsMentioned(rest, knownNames)]),
      evidence: { excerpt, offset: Math.max(0, am.index - 24) },
      source: STORY_EVENT_SOURCES.SCENE_TEXT,
    }));
    actionCount += 1;
  }

  const passed = [];
  const rejected = [];
  for (const c of candidates) {
    const v = validateStoryEvent(c, { text, scene: clean });
    if (v.ok) passed.push(v.event);
    else rejected.push({ event: c, errors: v.errors });
  }

  // EO-EXTRACT-HARDEN-01 R3：presence 兜底仅被「有效候选」抑制（原为「有候选」抑制——
  // 一个自身被拒的候选即可抑制恒有产出的兜底，导致零事件杀死整章）。
  // presence 仍完整经过 validateStoryEvent，不新增事实类别、不改既有 consequence 公式。
  if (!passed.length) {
    const names = inferActorsFromText(text, knownNames);
    // EO-G1-C-01：presence 证据=raw 尾片（不折叠空白——excerpt 须可逐字定位）
    const rawTail = text.slice(-120);
    const tail = rawTail.replace(/\s+/g, ' ').trim();
    if (tail.length >= 12) {
      const actors = names.length ? names.slice(0, 3) : ['场面'];
      const mPres = mintEventIdentity({ sceneId, excerpt: rawTail, offset: Math.max(0, text.length - 120) });
      const presence = createStoryEvent({
        id: mPres.ok ? mPres.id : '',
        sceneId,
        kind: 'presence',
        actors,
        action: tail.slice(0, 80),
        consequence: '场面叙述成为后续可引用事实',
        stateChanges: [`presence:${actors[0]}`],
        affectedEntities: actors,
        evidence: { excerpt: rawTail, offset: Math.max(0, text.length - 120) },
        source: STORY_EVENT_SOURCES.SCENE_TEXT,
      });
      const v = validateStoryEvent(presence, { text, scene: clean });
      if (v.ok) passed.push(v.event);
      else rejected.push({ event: presence, errors: v.errors });
    }
  }

  return {
    events: dedupeEvents(passed),
    rejected,
    meta: {
      sceneId,
      source: STORY_EVENT_SOURCES.SCENE_TEXT,
      candidateCount: candidates.length,
      planFieldsIgnored: true,
    },
  };
}

/**
 * Attach actualEvents onto a scene object (in-memory). Does not persist.
 * Strips plan before extract when opts.stripPlan is true (default true).
 */
export function ensureActualEvents(scene = {}, opts = {}) {
  if (Array.isArray(scene.actualEvents) && scene.actualEvents.length && opts.reextract !== true) {
    return scene;
  }
  const base = opts.stripPlan === false ? scene : stripPlanFromScene(scene);
  base.text = scene.text;
  base.id = scene.id || base.id;
  base.index = scene.index ?? base.index;
  const { events, rejected, meta } = extractStoryEventsFromScene(
    { ...base, text: scene.text },
    opts,
  );
  scene.actualEvents = events;
  scene.actualEventMeta = { ...meta, rejectedCount: rejected.length };
  return scene;
}

function resolveKnownNames(scene, extra) {
  const fromScene = Array.isArray(scene.characters) ? scene.characters : [];
  const pov = scene.pov ? [String(scene.pov)] : [];
  return unique([...(extra || []), ...fromScene, ...pov].map(String).filter(Boolean));
}

function inferActorsFromText(text, knownNames) {
  const found = knownNames.filter((n) => n && text.includes(n));
  if (found.length) return found.slice(0, 4);
  // Common dual cast fallback only if literally present
  const defaults = ['苏晚', '林夜', '陈默'];
  return defaults.filter((n) => text.includes(n)).slice(0, 4);
}

function actorsInExcerpt(excerpt, knownNames, fullText) {
  const hit = knownNames.filter((n) => excerpt.includes(n) || fullText.includes(n));
  return hit.length ? unique(hit).slice(0, 4) : inferActorsFromText(fullText, knownNames);
}

function actorsMentioned(fragment, knownNames) {
  return knownNames.filter((n) => fragment.includes(n));
}

function sliceEvidence(text, index, len) {
  const start = Math.max(0, index - 24);
  const end = Math.min(text.length, index + len + 48);
  return text.slice(start, end).replace(/\s+/g, ' ').trim().slice(0, 160);
}

function unique(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function dedupeEvents(events) {
  const seen = new Set();
  const out = [];
  for (const e of events) {
    const key = `${e.kind}|${e.action}|${e.evidence?.excerpt || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

function collapseForAction(excerpt) {
  return String(excerpt || '').replace(/\s+/g, ' ').trim();
}
