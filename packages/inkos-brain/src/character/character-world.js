/**
 * EO-CW-Store-Seed-01 — Character World Store + Authored Seed
 *
 * Human Seal S1–S6（2026-09-18 冻结）：
 * - S1 Model A：book-level World store（≠ SR；SR 保持章域）
 * - S3 authored seed 四槽（knowledge/interpretation/belief/stance；disposition 延期）
 * - S4 epistemic boundary：basis 强制且可追溯（in-file authored experience 引用，
 *   或 Actual occurrence 引用并经 characterCanAccessActualEvent 验证）；缺 basis 即拒
 * - 本 EO 无 Projection / 无 T2 / 无 T3 / 无自动内化 / 无 Goal·Choice·Action
 *
 * 反洗白结构保证：World 只能由显式 authored seed 产生；无 Canon/Actual 写路径；
 * 未知/无 seed → 空 World（绝非 bible/SR/personality 副本）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { readYaml } from '../../../inkos-core/src/lib/yaml-store.js';
import { resolveCharacter, resolveCanonicalSet } from '../../../inkos-core/src/lib/entity-identity.js';
import { characterCanAccessActualEvent } from './character-sr-updater.js';

export const CHARACTER_WORLD_VERSION = 'character-world-1';
export const CHARACTER_WORLD_SEED_VERSION = 'character-world-seed-1';
export const CHARACTER_WORLD_ENGINE = 'character-world';
export const SEED_SOURCE = 'authored_seed';

export const SEED_BASES = Object.freeze([
  'past_experience', 'witnessed', 'told_by', 'inferred_from_known',
]);

export const FORBIDDEN_SEED_FIELDS = Object.freeze([
  'goal', 'desire', 'choice', 'agency', 'option', 'options', 'candidateOption',
  'action', 'emotionScore', 'personalityScore', 'importanceScore', 'memoryScore',
  'disposition', 'personality',
]);

const norm = (v) => String(v || '').trim();

function worldDir(bookDir) {
  return path.join(bookDir, 'novel', '_system', 'brain', 'character_world');
}
function worldFile(bookDir) {
  return path.join(worldDir(bookDir), 'world.json');
}
export function seedFile(bookDir) {
  return path.join(bookDir, 'novel', '_system', 'character_world_seeds.yaml');
}

/** 载入 book-level World（无文件 → 空 World；绝不回退 bible/SR） */
export function loadCharacterWorld(bookDir) {
  const f = worldFile(bookDir);
  if (!fs.existsSync(f)) return emptyWorld();
  try {
    const raw = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (!raw || raw.version !== CHARACTER_WORLD_VERSION) return emptyWorld();
    return raw;
  } catch {
    return emptyWorld();
  }
}

export function saveCharacterWorld(bookDir, world) {
  if (!bookDir || !world) return { written: false, reason: 'missing_args' };
  fs.mkdirSync(worldDir(bookDir), { recursive: true });
  const payload = {
    ...world,
    version: CHARACTER_WORLD_VERSION,
    updatedAt: new Date().toISOString(),
    meta: {
      ...(world.meta || {}),
      writesCanon: false,
      writesActual: false,
      isRealityAuthority: false,
      source: 'authored_seed_only',
      projection: 'not_implemented',
    },
  };
  fs.writeFileSync(worldFile(bookDir), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return { written: true, path: worldFile(bookDir) };
}

function emptyWorld() {
  return {
    version: CHARACTER_WORLD_VERSION,
    characters: {},
    rejected: [],
    meta: {
      writesCanon: false, writesActual: false, isRealityAuthority: false,
      source: 'authored_seed_only', projection: 'not_implemented',
    },
  };
}

/** 载入 authored seed 文件（无文件 → null） */
export function loadCharacterWorldSeed(bookDir) {
  const f = seedFile(bookDir);
  if (!fs.existsSync(f)) return null;
  try {
    const raw = readYaml(f);
    if (!raw || raw.version !== CHARACTER_WORLD_SEED_VERSION) return null;
    return raw;
  } catch {
    return null;
  }
}

/** 扫描既有 Actual occurrences（prior chapters scenes sidecars）供 basisRef 验证 */
function collectActualOccurrences(bookDir) {
  const dir = path.join(bookDir, 'novel', '_system', 'brain');
  const out = [];
  try {
    for (const name of fs.readdirSync(dir)) {
      const m = name.match(/^ch_(\d{4})_scenes\.json$/);
      if (!m) continue;
      try {
        const bag = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
        for (const scene of bag.scenes || []) {
          for (const ev of scene.actualEvents || []) {
            out.push({ chapter: Number(m[1]), scene, ev });
          }
        }
      } catch { /* skip broken sidecar */ }
    }
  } catch { /* brain dir missing */ }
  return out;
}

/**
 * basisRef 双路解析（可追溯，非装饰字符串）：
 *  (a) 命中 seed 文件内同角色 authored experience 声明（人类显式权威）；
 *  (b) 命中既有 Actual occurrence 且该角色经 IB（characterCanAccessActualEvent）可及。
 */
function resolveBasisRef({ ref, characterId, seed, actualPool }) {
  const r = norm(ref);
  if (!r) return { ok: false, reason: 'basisRef_missing' };
  // (a) in-file authored experience
  for (const exp of seed.experiences || []) {
    if (norm(exp?.id) === r) {
      if (norm(exp?.characterId) !== characterId) {
        return { ok: false, reason: `basisRef_experience_of_other_character:${r}` };
      }
      return { ok: true, kind: 'authored_experience', ref: r };
    }
  }
  // (b) Actual occurrence + character access 验证
  const evId = r.startsWith('evt:') ? r.slice(4) : r;
  const hit = actualPool.find(({ ev }) => norm(ev.id) === evId);
  if (hit) {
    const accessible = characterCanAccessActualEvent(characterId, hit.ev, hit.scene);
    return accessible
      ? { ok: true, kind: 'actual_occurrence', ref: evId }
      : { ok: false, reason: `basisRef_actual_not_accessible:${evId}` };
  }
  return { ok: false, reason: `basisRef_unresolvable:${r}` };
}

function makeProvenance({ characterId, field, basis, basisResolution }) {
  return {
    characterId,
    field,
    source: SEED_SOURCE,
    basis,
    basisKind: basisResolution.kind,
    basisRef: basisResolution.ref,
    engine: CHARACTER_WORLD_ENGINE,
    version: CHARACTER_WORLD_VERSION,
    authoredAt: null,
  };
}

/**
 * Materialize：seed → 验证 → World。逐项 fail-closed（rejected 记录原因，合法项照常入）。
 * @returns {{ world, rejected }}
 */
export function materializeWorldFromSeeds(bookDir, opts = {}) {
  const seed = opts.seed !== undefined ? opts.seed : loadCharacterWorldSeed(bookDir);
  const actualPool = opts.actualPool !== undefined
    ? opts.actualPool
    : collectActualOccurrences(bookDir);
  // EO-CW-Trace-01：重跑 seed materialize 不得清除既有 T2 experiences
  //（含从未 seed、仅因 T2 而有块的角色）
  const priorWorld = opts.priorWorld !== undefined ? opts.priorWorld : loadCharacterWorld(bookDir);
  const world = emptyWorld();
  const rejected = [];

  if (!seed) return { world, rejected };

  for (const [name, block] of Object.entries(seed.characters || {})) {
    const characterId = norm(name);
    // G1-A / S-A（S11）：seed key = Reference——必须 resolve 到 03 录取的 Character；
    // UNRESOLVED → 不建块、不物化、零 Identity（fail-closed，rejected 可审计）。
    const resolution = resolveCharacter(bookDir, characterId);
    if (resolution.status !== 'RESOLVED') {
      rejected.push({ characterId, field: 'seed_subject', reason: `character_unresolved:${resolution.reason}` });
      continue;
    }
    const w = { knowledge: [], interpretation: [], belief: [], stance: [], experiences: [], formations: [] };
    const unknowns = (block.unknown || []).map(norm).filter(Boolean);

    const textHitUnknown = (t) => unknowns.some((u) => norm(t).includes(u));

    const pushItem = (field, item, textForUnknown) => {
      // 禁字段（含 personality/disposition 等伪装）
      for (const f of FORBIDDEN_SEED_FIELDS) {
        if (item && Object.prototype.hasOwnProperty.call(item, f)) {
          rejected.push({ characterId, field, reason: `forbidden_field:${f}` });
          return;
        }
      }
      // Case C：显式 unknown 标记 —— 同内容 seed 一律拒绝
      if (textHitUnknown(textForUnknown)) {
        rejected.push({ characterId, field, reason: 'declared_unknown' });
        return;
      }
      const basis = norm(item?.basis);
      if (!SEED_BASES.includes(basis)) {
        rejected.push({ characterId, field, reason: `basis_invalid:${basis || 'missing'}` });
        return;
      }
      const res = resolveBasisRef({ ref: item?.basisRef, characterId, seed, actualPool });
      if (!res.ok) {
        rejected.push({ characterId, field, reason: res.reason });
        return;
      }
      w[field].push({
        ...(field === 'knowledge' ? { info: norm(item.info), level: 'know' } : {}),
        ...(field === 'interpretation' ? { of: norm(item.of), as: norm(item.as) } : {}),
        ...(field === 'belief' ? { proposition: norm(item.proposition) } : {}),
        ...(field === 'stance' ? { stance: norm(item.stance).toLowerCase(), about: norm(item.about) || null } : {}),
        provenance: makeProvenance({ characterId, field, basis, basisResolution: res }),
      });
    };

    for (const k of block.knowledge || []) {
      if (!norm(k?.info)) { rejected.push({ characterId, field: 'knowledge', reason: 'empty_info' }); continue; }
      pushItem('knowledge', k, k.info);
    }
    for (const it of block.interpretation || []) {
      if (!norm(it?.of) || !norm(it?.as)) { rejected.push({ characterId, field: 'interpretation', reason: 'empty_of_as' }); continue; }
      pushItem('interpretation', it, `${it.of} ${it.as}`);
    }
    for (const b of block.belief || []) {
      const p = norm(b?.proposition);
      if (!p) { rejected.push({ characterId, field: 'belief', reason: 'empty_proposition' }); continue; }
      pushItem('belief', b, p);
    }
    for (const s of block.stance || []) {
      const st = norm(s?.stance).toLowerCase();
      if (!['believes', 'suspects', 'uncertain', 'rejects', 'unknown'].includes(st)) {
        rejected.push({ characterId, field: 'stance', reason: `stance_invalid:${st || 'missing'}` });
        continue;
      }
      pushItem('stance', s, `${st} ${norm(s?.about)}`);
    }
    // Channel B：authored formation seal（作者明确声明已形成稳定认识；≠ Actual-derived）
    for (const f of block.formations_seal || block.formations || []) {
      const kind = norm(f?.kind);
      const content = norm(f?.content);
      if (!T3_KINDS.includes(kind) || !content) {
        rejected.push({ characterId, field: 'formations', reason: `formation_seal_invalid:${kind || 'kind'}` });
        continue;
      }
      let badField = null;
      for (const ff of FORBIDDEN_SEED_FIELDS) {
        if (f && Object.prototype.hasOwnProperty.call(f, ff)) { badField = ff; break; }
      }
      if (badField) { rejected.push({ characterId, field: 'formations', reason: `forbidden_field:${badField}` }); continue; }
      w.formations.push({
        formationId: `t3_${characterId}_${kind}_${content}`.replace(/[^\w\u4e00-\u9fff_-]/g, '_').slice(0, 140),
        characterId, kind, content,
        ...(f.of != null ? { of: norm(f.of) } : {}), ...(f.as != null ? { as: norm(f.as) } : {}),
        ...(f.about != null ? { about: norm(f.about) } : {}),
        source: T3_AUTHORED_FORMATION,
        basisRefs: [], // authored seal 无 Actual 依据——与 t3_repeated_actual 严格分源
        formedAt: null,
        provenance: { source: T3_AUTHORED_FORMATION, engine: CHARACTER_WORLD_ENGINE, version: CHARACTER_WORLD_VERSION, formedAt: null },
      });
    }
    // 角色块级禁字段（personality: cautious 等 —— Case F：无槽不落）
    for (const f of FORBIDDEN_SEED_FIELDS) {
      if (block && Object.prototype.hasOwnProperty.call(block, f)) {
        rejected.push({ characterId, field: 'block', reason: `forbidden_block_field:${f}` });
      }
    }
    // G1-A/S-A：seed key 经 resolution 后按 canonical 归位（别名 key → canonical 块）
    const subjectId = resolution.canonical;
    world.characters[subjectId] = w;
    // 保留既有 T2 experiences + T3 formations（seed 重跑不清历史）
    const priorBlock = priorWorld?.characters?.[subjectId] || priorWorld?.characters?.[characterId];
    if (priorBlock) {
      if (Array.isArray(priorBlock.experiences)) w.experiences = priorBlock.experiences;
      if (Array.isArray(priorBlock.formations)) {
        const byId = new Map(w.formations.map((x) => [x.formationId, x]));
        for (const pf of priorBlock.formations) if (!byId.has(pf.formationId)) w.formations.push(pf);
      }
    }
  }

  // 从未 seed、仅因 T2 存块的角色：整块保留
  for (const [name, priorBlock] of Object.entries(priorWorld?.characters || {})) {
    if (!world.characters[norm(name)]) {
      world.characters[norm(name)] = { ...emptyCharacterBlock(), experiences: priorBlock.experiences || [] };
    }
  }

  world.rejected = rejected;
  return { world, rejected };
}

/** orchestrator 最小挂载入口：seed 存在 → materialize+save；不存在 → 不落盘（World=空） */
export function syncCharacterWorldFromSeeds(bookDir) {
  if (!bookDir) return { synced: false, reason: 'missing_args' };
  const seed = loadCharacterWorldSeed(bookDir);
  if (!seed) return { synced: false, reason: 'no_seed_file' };
  const priorWorld = loadCharacterWorld(bookDir);
  const { world, rejected } = materializeWorldFromSeeds(bookDir, { seed, priorWorld });
  const saved = saveCharacterWorld(bookDir, world);
  return { synced: true, saved, rejectedCount: rejected.length, rejected };
}

// ─────────────────────────────────────────────────────────────
// EO-CW-Trace-01 — T2 Episodic Trace（Actual+Access → World.experiences）
// 「这个角色经历过/合法获知过这件与自己有关的实际事件」——仅此而已：
// 不产生 belief/interpretation/stance/goal/choice/action/disposition。
// ─────────────────────────────────────────────────────────────
export const T2_TRACE_SOURCE = 't2_actual_trace';
export const T3_AUTHORED_FORMATION = 'authored_formation';
export const T3_REPEATED_ACTUAL = 't3_repeated_actual';
export const T3_KINDS = Object.freeze(['interpretation', 'belief', 'stance']);

function emptyCharacterBlock() {
  return { knowledge: [], interpretation: [], belief: [], stance: [], experiences: [], formations: [] };
}

function ensureCharacterBlock(world, name) {
  if (!world.characters[name]) world.characters[name] = emptyCharacterBlock();
  if (!Array.isArray(world.characters[name].experiences)) {
    world.characters[name].experiences = [];
  }
  return world.characters[name];
}

/**
 * 场景级 T2 追加：对候选名单内每个角色 × 每个 Actual occurrence，
 * 经 characterCanAccessActualEvent 硬门槛后追加引用式 experience（幂等去重）。
 * access 二分（不冒用 seed 的 basis 枚举）：
 *   participant（actors/affected 命中——亲历参与）
 *   present_witness（场景在场 + kind 白名单——可及见证，弱于 witnessed）
 * @returns {{ appended: number, world: object }}
 */
export function appendT2Experiences(bookDir, { scene = {}, chapter = null, candidateNames = [] } = {}) {
  if (!bookDir) return { appended: 0, reason: 'missing_args' };
  const world = loadCharacterWorld(bookDir);
  const events = Array.isArray(scene.actualEvents) ? scene.actualEvents : [];
  // G1-A：T2 Subject 只认 RESOLVED Character——surface string/role/mention 永不物化为主体
  const subjects = [];
  let unresolvedCount = 0;
  for (const raw of [...new Set((candidateNames || []).map(norm).filter(Boolean))]) {
    const r = resolveCharacter(bookDir, raw);
    if (r.status === 'RESOLVED') subjects.push(r.canonical);
    else unresolvedCount += 1;
  }
  const names = [...new Set(subjects)];
  let appended = 0;

  for (const name of names) {
    const block = ensureCharacterBlock(world, name);
    for (const ev of events) {
      if (!ev || !norm(ev.id)) continue; // 无稳定 id 的 occurrence 不入 T2（fail-closed）
      // G1-A resolution-aware：事件 actors/affected 先 resolve 到 canonical 再比对
      //（别名提及的经历归属 canonical，非字符串相等）
      const actorCanonicals = resolveCanonicalSet(bookDir, Array.isArray(ev.actors) ? ev.actors : []);
      const affectedCanonicals = resolveCanonicalSet(bookDir, Array.isArray(ev.affectedEntities) ? ev.affectedEntities : []);
      const isParticipant = actorCanonicals.has(name) || affectedCanonicals.has(name);
      const accessible = isParticipant || witnessViaCanonical(bookDir, name, ev, scene);
      if (!accessible) continue; // T2-02/隔离硬门槛
      const actualRef = norm(ev.id);
      if (block.experiences.some((x) => x.actualRef === actualRef)) continue; // 幂等
      const access = isParticipant ? 'participant' : 'present_witness';
      block.experiences.push({
        experienceId: `exp_${name}_${actualRef}`.replace(/[^\w\u4e00-\u9fff_-]/g, '_').slice(0, 120),
        characterId: name,
        actualRef,
        chapterRef: chapter != null ? Number(chapter) : null,
        sceneRef: norm(scene.id) || null,
        access,
        kind: String(ev.kind || 'action'),
        summary: String(ev.action || '').slice(0, 80), // Actual 自身 action 行（非解读）
        provenance: {
          source: T2_TRACE_SOURCE,
          engine: CHARACTER_WORLD_ENGINE,
          version: CHARACTER_WORLD_VERSION,
          chapter: chapter != null ? Number(chapter) : null,
          accessKind: access,
          identityResolvedBy: 'g1a_character_bible',
        },
      });
      appended += 1;
    }
  }

  if (appended) saveCharacterWorld(bookDir, world);
  return { appended, world, unresolvedSubjects: unresolvedCount };
}

/** 在场见证（Experience 级 Access 不变；G1-A：场名单 resolve 到 canonical 后比对） */
function witnessViaCanonical(bookDir, canonicalName, ev, scene) {
  const presentRaw = [scene?.pov, ...(scene?.present || []), ...(scene?.characters || [])]
    .map((n) => String(n || '').trim()).filter(Boolean);
  const presentCanonicals = resolveCanonicalSet(bookDir, presentRaw);
  if (!presentCanonicals.has(canonicalName)) return false;
  const kind = String(ev.kind || 'action');
  return ['action', 'speech', 'open_choice', 'choice_settled', 'presence'].includes(kind);
}

// ─────────────────────────────────────────────────────────────
// EO-CW-Formation-01 — T3 Durable Formation
// T2=我经历过什么；T3=我形成了什么稳定认识；T3 ≠ 所以我想做什么。
// Channel A（repeated-actual）：本模块只验证已具明确 content 的 Formation
// Candidate——不自动推导新 content（无 LLM/similarity/heuristic/scoring）。
// 当前生产无 Candidate Producer ⇒ Channel A = DEFINED BUT NOT MATERIALIZABLE
//（合法状态，非失败）。Channel B（authored seal）：seed 声明，直接成形。
// ─────────────────────────────────────────────────────────────

/**
 * Channel A：验证 Formation Candidate 并 materialize（幂等）。
 * Candidate：{ characterId, kind∈T3_KINDS, content, of?, as?, about?, basisRefs[]≥2 }
 * 每个 basisRef 须命中同一角色的合法 T2（有 actualRef、经 Access）；actualRef 互异。
 * @returns {{ ok: boolean, reason?, formation? }}
 */
export function materializeT3Formation(bookDir, candidate = {}, opts = {}) {
  const who = norm(candidate.characterId);
  const kind = norm(candidate.kind);
  const content = norm(candidate.content);
  if (!who) return { ok: false, reason: 'characterId_missing' };
  if (!T3_KINDS.includes(kind)) return { ok: false, reason: `kind_invalid:${kind || 'missing'}` };
  if (!content) return { ok: false, reason: 'content_missing' };
  for (const f of FORBIDDEN_SEED_FIELDS) {
    if (candidate[f] != null) return { ok: false, reason: `forbidden_field:${f}` };
  }
  const refs = Array.isArray(candidate.basisRefs) ? candidate.basisRefs.map(norm).filter(Boolean) : [];
  if (refs.length < 2) return { ok: false, reason: 'basisRefs_lt_2' };

  const world = opts.world !== undefined ? opts.world : loadCharacterWorld(bookDir);
  const block = world.characters[who];
  const exps = Array.isArray(block?.experiences) ? block.experiences : [];
  const actualRefs = new Set();
  for (const r of refs) {
    const t2 = exps.find((e) => e.experienceId === r || e.actualRef === r);
    if (!t2) return { ok: false, reason: `basisRef_not_t2:${r}` };            // T3-06/07
    if (t2.characterId !== who) return { ok: false, reason: `basisRef_other_character:${r}` };
    if (!t2.actualRef || t2.provenance?.source !== T2_TRACE_SOURCE) {
      return { ok: false, reason: `basisRef_not_actual_grounded:${r}` };
    }
    if (t2.provenance?.accessKind !== 'participant' && t2.provenance?.accessKind !== 'present_witness') {
      return { ok: false, reason: `basisRef_access_invalid:${r}` };
    }
    actualRefs.add(t2.actualRef);
  }
  if (actualRefs.size < 2) return { ok: false, reason: 'basisRefs_not_independent' }; // T3-04：同 Actual 不算二

  const formedAt = opts.formedAt != null ? Number(opts.formedAt) : null;
  const formation = {
    formationId: `t3_${who}_${kind}_${content}`.replace(/[^\w\u4e00-\u9fff_-]/g, '_').slice(0, 140),
    characterId: who,
    kind,
    content,
    ...(candidate.of != null ? { of: norm(candidate.of) } : {}),
    ...(candidate.as != null ? { as: norm(candidate.as) } : {}),
    ...(candidate.about != null ? { about: norm(candidate.about) } : {}),
    source: T3_REPEATED_ACTUAL,
    basisRefs: [...actualRefs],
    formedAt, // = materialize 时间位（非事件时间——事件经 basisRefs 追溯）
    provenance: {
      source: T3_REPEATED_ACTUAL,
      engine: CHARACTER_WORLD_ENGINE,
      version: CHARACTER_WORLD_VERSION,
      formedAt,
      basisKinds: refs.map(() => T2_TRACE_SOURCE),
    },
  };
  if (!Array.isArray(block.formations)) block.formations = [];
  if (block.formations.some((x) => x.formationId === formation.formationId)) {
    return { ok: true, reason: 'idempotent_existing', formation }; // T3-25
  }
  block.formations.push(formation);
  if (opts.world === undefined) saveCharacterWorld(bookDir, world);
  return { ok: true, formation };
}

/** 投影映射：formation → SR 槽形条目（belief/interpretation/stance 三槽；无 Goal/Choice/Action） */
function formationToSRItem(f) {
  const base = {
    provenance: { ...f.provenance },
    fromT3: true,
  };
  if (f.kind === 'belief') return { proposition: f.content, ...base };
  if (f.kind === 'interpretation') return { of: f.of || f.content, as: f.as || f.content, ...base };
  return { stance: f.content, about: f.about || null, ...base };
}

// ─────────────────────────────────────────────────────────────
// EO-CW-Projection-01 — World → Projection/Activation → SR(t)
// 只做 select/activate/project（无 Goal/Choice/Action 推理）；
// fail-closed：无 World 内容 → 不投影（绝不从 bible/plan/personality 补）。
// ─────────────────────────────────────────────────────────────
export const CHARACTER_WORLD_PROJECTION = 'character-world-projection';

function normForOverlap(s) {
  return String(s || '')
    .replace(/\s+/g, '')
    .replace(/[「」『』""''。，、！？!?：；;:（）()【】\[\]…—\-·]/g, '');
}

/** 确定性相关性激活：条目文本与当前场景（正文+Actual）存在 ≥3 字连续重叠 → context_active */
function activationOf(itemText, contextNorm) {
  const t = normForOverlap(itemText);
  if (!t || !contextNorm || t.length < 3) return 'background';
  const win = 3;
  for (let i = 0; i + win <= t.length; i += 1) {
    if (contextNorm.includes(t.slice(i, i + win))) return 'context_active';
  }
  return 'background';
}

/**
 * 场景级投影：world.characters[name] 四槽 → SR 槽形条目
 * （world.knowledge → SR awareness；interpretation/belief/stance 同名直映）。
 * provenance 链保留（seed 原始 provenance + projectedBy 标记）；不改 World。
 * @returns {Record<string, {awareness:[], interpretation:[], belief:[], stance:[]}>}
 */
export function projectWorldToSRScene({ world, characterNames, scene, chapter = null, bookDir = null } = {}) {
  const names = [...new Set((characterNames || []).map(norm).filter(Boolean))];
  // G1-A/Q7：quarantined legacy 主体不投影（分类≠身份权威；仅门控 legacy 块的消费）
  const quarantined = bookDir ? loadQuarantinedNames(bookDir) : new Set();
  const events = Array.isArray(scene?.actualEvents) ? scene.actualEvents : [];
  const contextNorm = normForOverlap(
    `${String(scene?.text || '')} ${events.map((e) => `${e.action || ''} ${e.consequence || ''}`).join(' ')}`,
  );
  const out = {};
  for (const name of names) {
    if (quarantined.has(name)) continue;
    const w = world?.characters?.[name];
    if (!w) continue; // 空 World → 不投影（P1/P12 fail-closed）
    const mark = (item, textForActivation) => ({
      ...item,
      activation: activationOf(textForActivation, contextNorm),
      provenance: {
        ...item.provenance,
        projectedBy: CHARACTER_WORLD_PROJECTION,
        projectedChapter: chapter,
        projectedSceneId: scene?.id || scene?.sceneId || null,
      },
    });
    out[name] = {
      awareness: [
        ...(w.knowledge || []).map((i) => mark(i, i.info)),
        // EO-CW-Trace-01 §12：T2 经历作为历史背景——仅 context_active 时入 SR awareness
        //（「我知道我经历过此事」= knowledge，非 belief/interpretation；background 留 World）
        ...(w.experiences || [])
          .filter((e) => activationOf(e.summary, contextNorm) === 'context_active')
          .map((e) => mark({
            info: e.summary,
            level: 'know',
            fromT2: true,
            provenance: e.provenance,
          }, e.summary)),
      ],
      interpretation: [
        ...(w.interpretation || []).map((i) => mark(i, `${i.of} ${i.as}`)),
        // EO-CW-Formation-01：T3 formations 投影入对应三槽（fromT3 标记）
        ...(w.formations || []).filter((f) => f.kind === 'interpretation').map((f) => mark(formationToSRItem(f), `${f.of || f.content} ${f.as || f.content}`)),
      ],
      belief: [
        ...(w.belief || []).map((i) => mark(i, i.proposition)),
        ...(w.formations || []).filter((f) => f.kind === 'belief').map((f) => mark(formationToSRItem(f), f.content)),
      ],
      stance: [
        ...(w.stance || []).map((i) => mark(i, `${i.stance} ${i.about || ''}`)),
        ...(w.formations || []).filter((f) => f.kind === 'stance').map((f) => mark(formationToSRItem(f), `${f.content} ${f.about || ''}`)),
      ],
    };
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// G1-A / Q7 — Historical Quarantine（Preserve → Classify → Quarantine → Future Migration）
// classifier ≠ Identity Authority：分类是运营记账，不创造/不修改 Identity；
// world.json 只读；manifest 为旁路 sidecar；迁移=独立 Named EO。
// ─────────────────────────────────────────────────────────────

const QUARANTINE_FILE = 'identity_quarantine.json';

function quarantinePath(bookDir) {
  return path.join(bookDir, 'novel', '_system', 'brain', QUARANTINE_FILE);
}

/** 历史 invalid 证据特征（rationale 记录进 manifest；unknown 保留不确定性） */
function historicalInvalidEvidence(name) {
  if (/^[「『"'“”‘’（(【\[]/u.test(name)) return 'starts_with_punct';
  if (/^(他|她|它)(?![一-龥]{2})/u.test(name)) return 'pronoun_like';
  if (name.length === 1) return 'single_char';
  if (/^(又|了|的|着|在|而|且|就|也|都)$/.test(name)) return 'function_word';
  return null;
}

export function loadQuarantinedNames(bookDir) {
  try {
    const raw = JSON.parse(fs.readFileSync(quarantinePath(bookDir), 'utf8'));
    return new Set((raw.entries || []).map((e) => norm(e.name)).filter(Boolean));
  } catch {
    return new Set();
  }
}

/**
 * 只读分类现存 world 主体并（幂等）生成 quarantine manifest sidecar。
 * @returns {{ valid: string[], invalid: Array, unknown: Array, manifestPath: string, worldTouched: false }}
 */
export function ensureIdentityQuarantine(bookDir) {
  const world = loadCharacterWorld(bookDir);
  const valid = [];
  const invalid = [];
  const unknown = [];
  for (const name of Object.keys(world.characters || {})) {
    const r = resolveCharacter(bookDir, name);
    if (r.status === 'RESOLVED') { valid.push(name); continue; }
    const evidence = historicalInvalidEvidence(name);
    const entry = { name, resolutionReason: r.reason, ...(evidence ? { evidence } : {}) };
    (evidence ? invalid : unknown).push(entry);
  }
  const manifest = {
    eo: 'G1-A',
    generatedAt: new Date().toISOString(),
    note: 'classifier≠IdentityAuthority；world.json 只读；迁移须独立 Named EO',
    entries: [...invalid, ...unknown].map((e) => ({ ...e, classification: e.evidence ? 'invalid' : 'unknown' })),
  };
  const p = quarantinePath(bookDir);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(manifest, null, 2));
  return { valid, invalid, unknown, manifestPath: p, worldTouched: false };
}
