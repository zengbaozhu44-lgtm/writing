/**
 * Phase 1 — Minimal Subjective Reality (READ-ONLY VIEW)
 * Phase 3.2 — merges Actual→IB→CharacterSR runtime state (projection still ≠ Reality Authority)
 *
 * Projection only: Existing Evidence / State → characterSR.
 * Not a psychology DB, Persistence Engine, Character State authority, or Reality Authority.
 *
 * Binding:
 * - 03 bible = long-term motive seed / context only — never auto-current Motive
 * - Phase 3.2 may attach character_sr sidecar / scene.characterSRState (not Canon)
 * - No LLM completion; missing → unknown / omit
 * - Character SR ↛ obtains / Reality Authority
 * - Forbidden SR facts: causal_chain / Situation / Desire / Living / heroKnows / Plan
 *
 * @see golden/story-architecture/PHASE-1-SPEC.md
 * @see _AI_SR_DESIGN_GATE.md
 */

export const MINIMAL_SR_ROLE = 'read_only_projection_view';
export const PRODUCES_OBTAINS = false;
export const IS_REALITY_AUTHORITY = false;

const STANCE_VALUES = new Set(['believes', 'suspects', 'uncertain', 'rejects', 'unknown']);
const VALIDITY_VALUES = new Set(['current', 'past', 'changed', 'uncertain']);
const AWARE_LEVELS = new Set(['know', 'known', 'partial']);

function norm(v) {
  return String(v || '').trim();
}

function provenance(source, sourceType, sourceRef = null) {
  const p = { source: String(source), source_type: String(sourceType) };
  if (sourceRef != null && sourceRef !== '') p.source_ref = sourceRef;
  return p;
}

function emptySlot(kind) {
  return {
    items: [],
    status: 'omit',
    kind,
  };
}

function normalizeStance(v) {
  const s = norm(v).toLowerCase();
  return STANCE_VALUES.has(s) ? s : null;
}

function normalizeValidity(v) {
  const s = norm(v).toLowerCase();
  return VALIDITY_VALUES.has(s) ? s : 'current';
}

function normalizeKnowLevel(level) {
  const s = norm(level).toLowerCase();
  if (s === 'known') return 'know';
  if (s === 'know' || s === 'partial') return s;
  return null;
}

/**
 * Bible fields are seeds only — never copied into current Motive.
 * @returns {{ seeds: object[], note: string }}
 */
export function extractMotiveSeedsFromBible(character = {}) {
  const seeds = [];
  const fields = [
    ['publicGoal', '公开目标'],
    ['realGoal', '真实目标'],
    ['values', '价值观'],
    ['fear', '恐惧'],
    ['personality', '性格'],
  ];
  for (const [key, label] of fields) {
    const val = norm(character[key]);
    if (!val) continue;
    seeds.push({
      field: key,
      label,
      text: val,
      role: 'long_term_motive_seed',
      activates_current_motive: false,
      provenance: provenance(`03_character_bible:${character.name || '?'}`, 'character_bible_seed', key),
    });
  }
  return {
    seeds,
    note: 'Bible = long-term context / motive seed only; does not become current Motive without scene evidence.',
  };
}

/**
 * Authored per-character subjective payload (if present). No inference.
 */
function readAuthoredCharacterBlock(ctx = {}, scene = {}, name) {
  const bags = [
    scene?.characterSubjective,
    scene?.characterSR,
    scene?.subjectiveReality,
    ctx?.authoredCharacterSR,
    ctx?.intent?.characterSubjective,
    ctx?.intent?.characterSR,
  ];
  for (const bag of bags) {
    if (!bag || typeof bag !== 'object') continue;
    const block = bag[name];
    if (block && typeof block === 'object') return block;
  }
  return null;
}

function projectAwareness(ctx, scene, name) {
  const items = [];
  const matrix = ctx?.knowledge?.matrix || [];

  for (const row of matrix) {
    if (!row || !row.info) continue;
    const level = normalizeKnowLevel(row[name]);
    if (!level) continue; // unknown / absent → not awareness (Awareness boundary)
    items.push({
      info: String(row.info),
      level,
      provenance: provenance('06_knowledge_matrix', 'knowledge_matrix', row.info),
    });
  }

  const authored = readAuthoredCharacterBlock(ctx, scene, name);
  const authoredAware = authored?.awareness;
  if (Array.isArray(authoredAware)) {
    for (const a of authoredAware) {
      const info = typeof a === 'string' ? norm(a) : norm(a?.info);
      if (!info) continue;
      items.push({
        info,
        level: normalizeKnowLevel(a?.level) || 'know',
        provenance: provenance(
          a?.source || 'authored_character_subjective',
          'authored_character_facing',
          a?.source_ref || info,
        ),
      });
    }
  }

  // Explicit scene characterFacing awareness map
  const facing = scene?.characterFacing?.[name]?.awareness;
  if (Array.isArray(facing)) {
    for (const a of facing) {
      const info = typeof a === 'string' ? norm(a) : norm(a?.info);
      if (!info) continue;
      items.push({
        info,
        level: 'know',
        provenance: provenance('scene.characterFacing', 'scene_character_facing', info),
      });
    }
  }

  if (!items.length) return emptySlot('awareness');
  return { items, status: 'present', kind: 'awareness' };
}

function projectStance(ctx, scene, name) {
  const items = [];
  const authored = readAuthoredCharacterBlock(ctx, scene, name);
  const list = authored?.stance;
  if (Array.isArray(list)) {
    for (const s of list) {
      if (typeof s === 'string') {
        const stance = normalizeStance(s);
        if (stance) {
          items.push({
            stance,
            about: null,
            provenance: provenance('authored_character_subjective', 'authored_character_facing', stance),
          });
        }
        continue;
      }
      const stance = normalizeStance(s?.stance || s?.value);
      if (!stance) continue;
      items.push({
        stance,
        about: norm(s?.about) || null,
        provenance: provenance(
          s?.source || 'authored_character_subjective',
          'authored_character_facing',
          s?.source_ref || stance,
        ),
      });
    }
  }

  const facing = scene?.characterFacing?.[name]?.stance;
  if (Array.isArray(facing)) {
    for (const s of facing) {
      const stance = normalizeStance(typeof s === 'string' ? s : s?.stance);
      if (!stance) continue;
      items.push({
        stance,
        about: typeof s === 'object' ? norm(s?.about) || null : null,
        provenance: provenance('scene.characterFacing', 'scene_character_facing', stance),
      });
    }
  }

  if (!items.length) return emptySlot('stance');
  return { items, status: 'present', kind: 'stance' };
}

/**
 * Current Motive — NEVER from bible alone / behavior / personality / LLM.
 * Bible seeds may activate only when authored scene evidence explicitly references them
 * via activateMotiveSeed: true + text (still requires authored evidence object).
 */
function projectMotive(ctx, scene, name, bibleSeeds = []) {
  const items = [];
  const authored = readAuthoredCharacterBlock(ctx, scene, name);

  const pushMotive = (text, source, sourceType, sourceRef, meta = {}) => {
    const t = norm(text);
    if (!t) return;
    items.push({
      text: t,
      polarity: meta.polarity === 'avoid' ? 'avoid' : 'pursue',
      provenance: provenance(source, sourceType, sourceRef || t),
    });
  };

  if (Array.isArray(authored?.motive)) {
    for (const m of authored.motive) {
      if (typeof m === 'string') {
        pushMotive(m, 'authored_character_subjective', 'authored_character_facing', m);
      } else if (m && typeof m === 'object') {
        // Explicit activation of a bible seed still requires authored evidence object
        if (m.activateMotiveSeed === true && m.text) {
          pushMotive(
            m.text,
            m.source || 'authored_activate_bible_seed',
            'authored_character_facing',
            m.source_ref || m.text,
            { polarity: m.polarity },
          );
        } else if (m.text || m.want || m.avoid) {
          pushMotive(
            m.text || m.want || m.avoid,
            m.source || 'authored_character_subjective',
            'authored_character_facing',
            m.source_ref || m.text || m.want || m.avoid,
            { polarity: m.polarity || (m.avoid ? 'avoid' : 'pursue') },
          );
        }
      }
    }
  }

  // Single-string authored motive on block
  if (typeof authored?.motive === 'string') {
    pushMotive(authored.motive, 'authored_character_subjective', 'authored_character_facing', authored.motive);
  }

  const facing = scene?.characterFacing?.[name]?.motive;
  if (Array.isArray(facing)) {
    for (const m of facing) {
      pushMotive(
        typeof m === 'string' ? m : m?.text || m?.want,
        'scene.characterFacing',
        'scene_character_facing',
        typeof m === 'string' ? m : m?.text,
        { polarity: typeof m === 'object' ? m?.polarity : undefined },
      );
    }
  } else if (typeof facing === 'string') {
    pushMotive(facing, 'scene.characterFacing', 'scene_character_facing', facing);
  }

  // Chapter/scene goal is NOT character Motive (system / plan attribution forbidden)
  void bibleSeeds; // seeds never auto-copied

  if (!items.length) return emptySlot('motive');
  return { items, status: 'present', kind: 'motive' };
}

// EO-G1-B（Q5′ Seal=C）：全局关系图事实不得直投 SR affect——图边循环已切断。
// affect 槽唯一合法源 = authored per-character affect（下方 authored 路径）。
// 被切断的投影仅计数观测（≠Truth 载体，不持久化）。
let affectSeveredBySeal = 0;
export function getAffectSeveredBySeal() { return affectSeveredBySeal; }
export function __resetAffectSeveredForTests() { affectSeveredBySeal = 0; }

function projectAffectRelationship(ctx, scene, name) {
  const items = [];
  const edges = ctx?.relationships || [];

  // Seal 切断：图边（含 trust/hostility/cooperation/debt/hidden）不再进入 affect 槽——
  // 关系世界事实仍经「关系 TopK」世界层到达 Writer（展示≠SR 主体状态）
  for (const e of edges) {
    if (e && (e.from === name || e.to === name)) affectSeveredBySeal += 1;
  }

  const authored = readAuthoredCharacterBlock(ctx, scene, name);
  const affect = authored?.affect_relationship || authored?.affect || authored?.relationship;
  if (Array.isArray(affect)) {
    for (const a of affect) {
      const text = typeof a === 'string' ? norm(a) : norm(a?.text);
      if (!text) continue;
      items.push({
        text,
        with: typeof a === 'object' ? a?.with || null : null,
        trust: null,
        hostility: null,
        provenance: provenance(
          a?.source || 'authored_character_subjective',
          'authored_character_facing',
          a?.source_ref || text,
        ),
      });
    }
  } else if (typeof affect === 'string' && norm(affect)) {
    items.push({
      text: norm(affect),
      with: null,
      trust: null,
      hostility: null,
      provenance: provenance('authored_character_subjective', 'authored_character_facing', affect),
    });
  }

  if (!items.length) return emptySlot('affect_relationship');
  return { items, status: 'present', kind: 'affect_relationship' };
}

function projectValidity(ctx, scene, name) {
  const authored = readAuthoredCharacterBlock(ctx, scene, name);
  if (authored?.validity != null) {
    return {
      value: normalizeValidity(authored.validity),
      provenance: provenance('authored_character_subjective', 'authored_character_facing', 'validity'),
    };
  }
  // Phase 1: no cross-scene persistence — default current; never infer duration
  return {
    value: 'current',
    provenance: provenance('phase1_default', 'projection_default', 'validity=current'),
  };
}

/** Runtime CharacterSR sidecar / scene attach (Phase 3.2) — never Plan/Reasoner */
function readRuntimeCharacterSR(ctx = {}, scene = {}, name) {
  const bags = [
    scene?.characterSRState?.characters,
    ctx?.characterSRRuntime?.characters,
    ctx?.characterSRState?.characters,
  ];
  for (const bag of bags) {
    if (bag?.[name] && typeof bag[name] === 'object') return bag[name];
  }
  return null;
}

function mergeSlot(baseSlot, runtimeSlot, kind) {
  const base = baseSlot?.items || [];
  const extra = runtimeSlot?.items || [];
  if (!base.length && !extra.length) return emptySlot(kind);
  const seen = new Set();
  const items = [];
  for (const it of [...base, ...extra]) {
    const key = JSON.stringify(it?.info ?? it?.of ?? it?.proposition ?? it?.stance ?? it?.eventId ?? it);
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(it);
  }
  return { items, status: 'present', kind };
}

function projectInterpretation(ctx, scene, name) {
  const items = [];
  const authored = readAuthoredCharacterBlock(ctx, scene, name);
  const list = authored?.interpretation;
  if (Array.isArray(list)) {
    for (const it of list) {
      const of = norm(it?.of);
      const as = norm(it?.as);
      if (!of || !as) continue;
      items.push({
        of,
        as,
        eventId: it.eventId || null,
        provenance: provenance(
          it?.source || 'authored_character_subjective',
          'authored_character_facing',
          `${of}→${as}`,
        ),
      });
    }
  }
  const facing = scene?.characterFacing?.[name]?.interpretation;
  if (Array.isArray(facing)) {
    for (const it of facing) {
      const of = norm(it?.of);
      const as = norm(it?.as);
      if (!of || !as) continue;
      items.push({
        of,
        as,
        eventId: it.eventId || null,
        provenance: provenance('scene.characterFacing', 'scene_character_facing', `${of}→${as}`),
      });
    }
  }
  if (!items.length) return emptySlot('interpretation');
  return { items, status: 'present', kind: 'interpretation' };
}

function projectBelief(ctx, scene, name) {
  const items = [];
  const authored = readAuthoredCharacterBlock(ctx, scene, name);
  const list = authored?.belief;
  if (Array.isArray(list)) {
    for (const b of list) {
      const proposition = typeof b === 'string' ? norm(b) : norm(b?.proposition || b?.text || b?.as);
      if (!proposition) continue;
      items.push({
        proposition,
        eventId: typeof b === 'object' ? b?.eventId || null : null,
        provenance: provenance(
          typeof b === 'object' ? b?.source || 'authored_character_subjective' : 'authored_character_subjective',
          'authored_character_facing',
          proposition,
        ),
      });
    }
  }
  const facing = scene?.characterFacing?.[name]?.belief;
  if (Array.isArray(facing)) {
    for (const b of facing) {
      const proposition = typeof b === 'string' ? norm(b) : norm(b?.proposition || b?.text);
      if (!proposition) continue;
      items.push({
        proposition,
        eventId: typeof b === 'object' ? b?.eventId || null : null,
        provenance: provenance('scene.characterFacing', 'scene_character_facing', proposition),
      });
    }
  }
  if (!items.length) return emptySlot('belief');
  return { items, status: 'present', kind: 'belief' };
}

function projectRelevance(ctx, scene, name) {
  const items = [];
  const authored = readAuthoredCharacterBlock(ctx, scene, name);
  const list = authored?.relevance;
  if (Array.isArray(list)) {
    for (const r of list) {
      const level = norm(r?.level).toLowerCase();
      if (!['high', 'low', 'omit'].includes(level) || level === 'omit') continue;
      items.push({
        eventId: r.eventId || null,
        info: norm(r.info) || r.eventId || null,
        level,
        provenance: provenance('authored_character_subjective', 'authored_character_facing', level),
      });
    }
  }
  if (!items.length) return emptySlot('relevance');
  return { items, status: 'present', kind: 'relevance' };
}

/**
 * Assemble Minimal SR for one character — pure projection (+ Phase 3.2 runtime merge).
 */
export function assembleCharacterMinimalSR(ctx = {}, scene = {}, name) {
  const character = ctx?.characters?.[name] || {};
  const seedPack = extractMotiveSeedsFromBible(character);
  const runtime = readRuntimeCharacterSR(ctx, scene, name);

  let awareness = projectAwareness(ctx, scene, name);
  let stance = projectStance(ctx, scene, name);
  let interpretation = projectInterpretation(ctx, scene, name);
  let belief = projectBelief(ctx, scene, name);
  let relevance = projectRelevance(ctx, scene, name);

  if (runtime) {
    awareness = mergeSlot(awareness, runtime.awareness, 'awareness');
    stance = mergeSlot(stance, runtime.stance, 'stance');
    interpretation = mergeSlot(interpretation, runtime.interpretation, 'interpretation');
    belief = mergeSlot(belief, runtime.belief, 'belief');
    relevance = mergeSlot(relevance, runtime.relevance, 'relevance');
  }

  const motive = projectMotive(ctx, scene, name, seedPack.seeds);
  const affect_relationship = projectAffectRelationship(ctx, scene, name);
  const validity = projectValidity(ctx, scene, name);

  const hasAny = [awareness, stance, motive, affect_relationship, interpretation, belief, relevance]
    .some((s) => s.status === 'present');

  return {
    name,
    awareness,
    interpretation,
    belief,
    stance,
    relevance,
    motive,
    affect_relationship,
    validity,
    // Diagnostic only — NOT Writer Motive; not rendered as current want
    long_term_motive_seeds: seedPack.seeds,
    _meta: {
      role: MINIMAL_SR_ROLE,
      producesObtains: PRODUCES_OBTAINS,
      isRealityAuthority: IS_REALITY_AUTHORITY,
      phase: 'Phase-3.2',
      empty: !hasAny,
      bibleSeedsDoNotEqualMotive: true,
      hasRuntimeSR: Boolean(runtime),
    },
  };
}

/**
 * @param {{ ctx?: object, scene?: object, names?: string[] }} args
 * @returns {Record<string, object>}
 */
export function assembleMinimalSR({ ctx = {}, scene = null, names = null } = {}) {
  const nameSet = new Set();
  if (Array.isArray(names)) {
    for (const n of names) if (norm(n)) nameSet.add(norm(n));
  }
  if (norm(ctx.pov)) nameSet.add(norm(ctx.pov));
  for (const n of ctx.present || []) if (norm(n)) nameSet.add(norm(n));
  if (scene) {
    if (norm(scene.pov)) nameSet.add(norm(scene.pov));
    for (const n of scene.present || scene.characters || []) if (norm(n)) nameSet.add(norm(n));
    for (const n of scene.entities || []) if (norm(n)) nameSet.add(norm(n));
  }

  const out = {};
  for (const name of nameSet) {
    out[name] = assembleCharacterMinimalSR(ctx, scene || {}, name);
  }

  return out;
}

/**
 * Writer-facing prompt block. Omits empty slots; never dumps provenance graph / seeds as Motive.
 * Phase 1.R: includes Information Boundary consumption rules (R2-A1/A2).
 */
export function formatInformationBoundaryRules(characterSR = {}) {
  const names = Object.keys(characterSR || {});
  const omitAware = names.filter((n) => characterSR[n]?.awareness?.status !== 'present');
  const lines = [
    '### Information Boundary（消费纪律 · Phase 1.R）',
    '- **World / Narration ≠ Character Knowledge**。',
    '- Scene Goal、冲突、时间线、世界设定、其他角色经历 = 世界/任务信息，**不是** POV 已知事实。',
    '- Character Subjective State 有明确 Awareness → 可写为该角色已知/经历。',
    '- Awareness = omit / unknown → **禁止**写成该角色「已经知道 / 亲眼看见 / 明确确认」该信息。',
    '- 仍允许：其他角色告知、本场新发现、叙述描写但不归因于角色先验知识。',
    '- 禁止：把 Goal 里的情节事实直接写成角色此前已知。',
  ];
  if (omitAware.length) {
    lines.push(`- 当前 Awareness=omit 的角色：${omitAware.join('、')} — 对其不得使用「亲眼看见/确知/早就知道」等先验断言（除非本场新获得并写出获得过程）。`);
  }
  return lines.join('\n');
}

export function formatCharacterSRForPrompt(characterSR = {}, relevantNames = null) {
  const names = Array.isArray(relevantNames) && relevantNames.length
    ? relevantNames.filter((n) => characterSR[n])
    : Object.keys(characterSR);

  const sections = [];
  for (const name of names) {
    const sr = characterSR[name];
    if (!sr) continue;
    const lines = [`### ${name}`];

    if (sr.awareness?.status === 'present' && sr.awareness.items.length) {
      lines.push('- **Awareness**：');
      for (const a of sr.awareness.items) {
        lines.push(`  - [${a.level}] ${a.info}`);
      }
    } else {
      lines.push('- **Awareness**：omit / unknown（无合法知悉证据 → 不得写成角色先验已知）');
    }

    if (sr.interpretation?.status === 'present' && sr.interpretation.items.length) {
      lines.push('- **Interpretation**：');
      for (const it of sr.interpretation.items) {
        lines.push(`  - ${it.of} → ${it.as}`);
      }
    } else {
      lines.push('- **Interpretation**：omit / unknown（无合法解释证据）');
    }

    if (sr.belief?.status === 'present' && sr.belief.items.length) {
      lines.push('- **Belief**：');
      for (const b of sr.belief.items) {
        lines.push(`  - ${b.proposition}`);
      }
    } else {
      lines.push('- **Belief**：omit / unknown（无合法信念证据；Belief 可与 Canon 不符）');
    }

    if (sr.stance?.status === 'present' && sr.stance.items.length) {
      lines.push('- **Stance**：');
      for (const s of sr.stance.items) {
        lines.push(`  - ${s.stance}${s.about ? ` · ${s.about}` : ''}`);
      }
    } else {
      lines.push('- **Stance**：omit / unknown（无合法立场证据）');
    }

    if (sr.relevance?.status === 'present' && sr.relevance.items.length) {
      lines.push('- **Relevance**：');
      for (const r of sr.relevance.items) {
        lines.push(`  - [${r.level}] ${r.info || r.eventId || '?'}`);
      }
    }

    if (sr.motive?.status === 'present' && sr.motive.items.length) {
      lines.push('- **Motive**：');
      for (const m of sr.motive.items) {
        lines.push(`  - [${m.polarity}] ${m.text}`);
      }
    } else {
      lines.push('- **Motive**：omit / unknown（无当前场景合法动机证据；Bible 不得自动生成）');
    }

    if (sr.affect_relationship?.status === 'present' && sr.affect_relationship.items.length) {
      lines.push('- **Affect / Relationship**：');
      for (const a of sr.affect_relationship.items) {
        lines.push(`  - ${a.text}`);
      }
    } else {
      lines.push('- **Affect / Relationship**：omit / unknown');
    }

    lines.push(`- **Validity**：${sr.validity?.value || 'current'}`);
    sections.push(lines.join('\n'));
  }

  if (!sections.length) return '';
  return [
    '（Minimal SR = 只读投影 View；≠ Reality Authority；≠ Character Brain；缺少证据则 omit）',
    formatInformationBoundaryRules(characterSR),
    ...sections,
  ].join('\n\n');
}

/** Structural guard for tests / callers */
export function assertMinimalSRReadOnlyContract(srMap = {}) {
  for (const sr of Object.values(srMap)) {
    if (sr?._meta?.producesObtains) {
      throw new Error('Minimal SR must not produce obtains');
    }
    if (sr?._meta?.isRealityAuthority) {
      throw new Error('Minimal SR must not be Reality Authority');
    }
    // Bible seeds must not appear inside motive.items
    const seedTexts = new Set((sr.long_term_motive_seeds || []).map((s) => s.text));
    for (const m of sr.motive?.items || []) {
      if (m.provenance?.source_type === 'character_bible_seed') {
        throw new Error('Bible seed leaked into current Motive');
      }
      // Auto-copy of seed text without authored activation is banned:
      // if motive provenance is character_bible*, fail
      if (String(m.provenance?.source_type || '').includes('character_bible')) {
        throw new Error('Bible-derived Motive provenance forbidden');
      }
      void seedTexts;
    }
  }
  return true;
}
