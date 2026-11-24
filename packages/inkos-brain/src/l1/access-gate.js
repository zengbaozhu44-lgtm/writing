/**
 * EO-L1-Access-Carrier-01 — L1 Choice Access Gate + Access Truth sidecar
 *
 * Human Seal HS-1…5（2026-09-20 冻结）：
 * - L1 Access = 「行动选项进入角色模型」的证据级成立（Golden SPEC E1/E2/E4/E3/E5 + U03）
 * - 唯一 Truth Authority = Access Gate（prose/authored 均 Evidence-only）
 * - 三态：PASS / UNKNOWN（缺证据≠没Access） / INVALID（仅=IB 伪 Access）
 * - 不等式：Actual/IB Access ≠ Choice Access ≠ Observer Access；
 *   Knowing ≠ Considering Options ≠ Choice；Action ≠ Prior Option Access
 * - 复用 4.4.1b TypedEvidence（validate/forbidden sources/forbiddenAsAuthority）
 *   与 4.4.1b Gate-write-key 模式；不建第二套架构。
 * - 防火墙：SR/CW/Agency/Choice/L2/Plan/Writer 零通道。
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  validateTypedEvidence,
  assertNoForbiddenEvidenceSources,
  evidenceFromProseExcerpt,
} from '../attribution/typed-evidence.js';
import { characterCanAccessActualEvent } from '../character/character-sr-updater.js';

export const L1_ACCESS_GATE_VERSION = 'l1-access-gate-1';
export const L1_ACCESS_TRUTH_VERSION = 'l1-access-truth-1';

/** Gate 独占写键（Symbol 不可伪造；不进公共 barrel） */
export const L1_ACCESS_GATE_WRITE_KEY = Symbol('inkos.l1_access_gate_write_key');

const norm = (v) => String(v || '').trim();

// ── 冻结结构判据（HS-3；确定性构式，无 LLM/embedding/score） ──────────────
// E4 取舍构式：两支明确（「是A还是B」/「要么A，要么B」/「A，还是B」）
const E4_RE = /(?:是|要么|宁愿|宁可)[^。！？\n]{1,24}(?:还是|，还是|或者|，或者)[^。！？\n]{1,24}/u;
// E1 显式多选项：同一语境 ≥2 路径（与 E4 同族构式 + 「A或B」对举）
const E1_RE = /[^\s。！？]{1,16}(?:还是|或者|或)[^\s。！？]{1,16}/u;
// E2 否定构式：被否路径明确（「决定不X」「没有走X」「不再X」——排除纯「没做X」叙事）
const E2_RE = /(决定不|决定放弃|选择不|没有走|没有选|不再?去?|放弃了?)[^。！？\n]{1,20}/u;
// E3 纯否定（无决策构式）：仅叙事「没做」
const E3_RE = /(没(?:有)?做|没(?:有)?去|没(?:有)?进|没(?:有)?拿|没(?:有)?开)/u;
// counterfactual（R6）：「本可以」「本该」「原本可以」
const CF_RE = /(本可以|本该|原本可以|本来可以|要是当初)/u;

/**
 * prose → 候选 evidence 判型（结构层；grounding/IB 在 Gate 层）
 * @returns {{type:'E1'|'E2'|'E4'|null, counterfactual:boolean, paths:string[]}}
 */
export function classifyAccessExcerpt(excerpt = '') {
  const t = norm(excerpt);
  if (!t) return { type: null, counterfactual: false, paths: [] };
  if (CF_RE.test(t)) return { type: null, counterfactual: true, paths: [] }; // R6：不产 evidence
  const e4 = t.match(E4_RE);
  if (e4) {
    return { type: 'E4', counterfactual: false, paths: [e4[0].slice(0, 60)] };
  }
  const e1 = t.match(E1_RE);
  if (e1 && /考虑|犹豫|权衡|选择|决定|还是/.test(t)) { // 须处考量语境（非纯叙述对举）
    return { type: 'E1', counterfactual: false, paths: [e1[0].slice(0, 60)] };
  }
  const e2 = t.match(E2_RE);
  if (e2) {
    return { type: 'E2', counterfactual: false, paths: [e2[0].slice(0, 60)] };
  }
  return { type: null, counterfactual: false, paths: [] }; // E3/E5/其余：不产 evidence
}

/**
 * Channel A adapter：scene actualEvents → prose TypedEvidence 候选
 * （grounding = occurrence excerpt 字面；IB 由 Gate 后置验证）
 */
export function collectAccessEvidenceFromScene({ scene = {}, characterNames = [] } = {}) {
  const out = [];
  const events = Array.isArray(scene.actualEvents) ? scene.actualEvents : [];
  const names = [...new Set((characterNames || []).map(norm).filter(Boolean))];
  for (const name of names) {
    for (const ev of events) {
      if (!ev || !norm(ev.id)) continue;
      // Choice Access evidence 是「角色内部考量」的表现——只能绑定到
      // occurrence 的 actor（考量者本人）；在场见证者可及事件但不可及他人内心
      const actors = Array.isArray(ev.actors) ? ev.actors.map(norm) : [];
      if (!actors.includes(name)) continue;
      const ex = norm(ev.evidence?.excerpt || ev.evidence?.text || '');
      if (!ex) continue;
      const cls = classifyAccessExcerpt(`${ev.action || ''}。${ex}`);
      if (!cls.type) continue; // E3/E5/counterfactual：不产 evidence
      const te = evidenceFromProseExcerpt({
        excerpt: cls.paths[0],
        eventRef: norm(ev.id),
        sceneId: norm(scene.id) || ev.sceneId,
        pov: name,
        characterId: name,
      });
      if (te) {
        te.payload.accessType = cls.type;
        te.payload.characterId = name;
        te.payload.occurrenceExcerpt = ex.slice(0, 160);
        out.push(te);
      }
    }
  }
  return out;
}

/** Channel B adapter：authored Access Evidence（同过 Gate；无直授） */
export function authoredAccessEvidence({ characterId, accessType, paths = [], occurrenceRef, sceneId } = {}) {
  const who = norm(characterId);
  const type = norm(accessType);
  if (!who || !['E1', 'E2', 'E4'].includes(type)) return null;
  if (!paths.filter(Boolean).length) return null;
  const te = evidenceFromProseExcerpt({
    excerpt: paths.filter(Boolean).join('; ').slice(0, 200),
    eventRef: occurrenceRef != null ? norm(occurrenceRef) : null,
    sceneId: sceneId != null ? norm(sceneId) : null,
    pov: who,
    characterId: who,
  });
  if (!te) return null;
  te.source = 'authored';
  te.provenance = 'authored:access_evidence';
  te.payload.accessType = type;
  te.payload.characterId = who;
  te.payload.authoredChannel = true;
  return te;
}

// ── Access Gate（唯一 Truth Authority） ────────────────────────────────────

function accessTruthDir(bookDir) {
  return path.join(bookDir, 'novel', '_system', 'brain', 'l1_access');
}
function accessTruthFile(bookDir) {
  return path.join(accessTruthDir(bookDir), 'access_truth.json');
}

function emptyTruth() {
  return {
    version: L1_ACCESS_TRUTH_VERSION,
    characters: {},
    meta: {
      gateVersion: L1_ACCESS_GATE_VERSION,
      writesCanon: false, writesSR: false, writesActual: false,
      writesCharacterWorld: false, writesChoice: false, writesAgency: false,
      uniqueConsumer: 'future_l1_production_evaluation',
    },
  };
}

export function loadAccessTruth(bookDir) {
  const f = accessTruthFile(bookDir);
  if (!fs.existsSync(f)) return emptyTruth();
  try {
    const raw = JSON.parse(fs.readFileSync(f, 'utf8'));
    return raw && raw.version === L1_ACCESS_TRUTH_VERSION ? raw : emptyTruth();
  } catch {
    return emptyTruth();
  }
}

function saveAccessTruth(bookDir, truth, writeKey) {
  if (writeKey !== L1_ACCESS_GATE_WRITE_KEY) {
    const err = new Error('AccessTruth writes are Gate-exclusive');
    err.code = 'L1_ACCESS_WRITE_KEY_REQUIRED';
    throw err;
  }
  fs.mkdirSync(accessTruthDir(bookDir), { recursive: true });
  truth.updatedAt = new Date().toISOString();
  fs.writeFileSync(accessTruthFile(bookDir), `${JSON.stringify(truth, null, 2)}\n`, 'utf8');
  return { written: true, path: accessTruthFile(bookDir) };
}

/**
 * 确定性 Access Gate：TypedEvidence[] + IB → 三态 Truth 写入（sidecar-only）。
 * @returns {{ perCharacter: Record<string, {status,type,scope?,optionRefs,reason}>, written }}
 */
export function runAccessGate(bookDir, { evidence = [], scene = {}, chapter = null } = {}) {
  let list = [];
  try {
    assertNoForbiddenEvidenceSources(evidence);
    list = evidence;
  } catch (err) {
    return { perCharacter: {}, refused: String(err.message || err), written: false };
  }
  for (const ev of list) {
    const v = validateTypedEvidence(ev);
    if (!v.ok) return { perCharacter: {}, refused: `invalid_evidence:${v.errors.join(',')}`, written: false };
  }

  const truth = loadAccessTruth(bookDir);
  const perCharacter = {};
  const events = Array.isArray(scene.actualEvents) ? scene.actualEvents : [];

  const byChar = new Map();
  for (const ev of list) {
    const who = norm(ev.payload?.characterId);
    if (!who) continue;
    if (!byChar.has(who)) byChar.set(who, []);
    byChar.get(who).push(ev);
  }

  for (const [who, evs] of byChar) {
    let status = 'UNKNOWN';
    let type = null; let scope = null; let reason = 'no_qualified_evidence';
    const optionRefs = [];
    for (const ev of evs) {
      const t = ev.payload?.accessType;
      const occRef = norm(ev.eventRef);
      // grounding：必须存在可解析的 occurrenceRef（free-floating string 不算）
      const occ = occRef ? events.find((e) => norm(e.id) === occRef)
        || (String(ev.payload?.occurrenceExcerpt || '').length > 0 ? { id: occRef, __excerptOnly: true } : null)
        : null;
      if (!occ) { reason = 'grounding_missing'; continue; } // 测试 1-3
      // IB：occurrence 可及性（excerpt-only 伪 occurrence 无法过 IB → 该路径不 PASS）
      const ibOk = occ.__excerptOnly ? false : characterCanAccessActualEvent(who, occ, scene);
      if (!ibOk) { status = 'INVALID'; reason = 'ib_violation'; type = t || null; continue; } // 测试 4 / R-IB
      // E2 U03：scope 锁定被否路径
      const sc = t === 'E2' ? 'rejected-path-only' : null;
      status = 'PASS'; type = t; scope = sc;
      reason = t === 'E2' ? 'e2_u03_rejected_path_only' : `pass_${t.toLowerCase()}`;
      optionRefs.push(occRef);
    }
    const rec = {
      characterId: who,
      status, type, scope,
      reason,
      optionRefs: [...new Set(optionRefs)].slice(0, 8),
      provenance: {
        gate: L1_ACCESS_GATE_VERSION,
        evidenceSources: [...new Set(evs.map((e) => e.source))],
        evidenceRefs: evs.map((e) => norm(e.eventRef)).filter(Boolean).slice(0, 8),
        forbiddenAsAuthority: true, // sources 均非 Authority——Gate 唯一
      },
      gateVersion: L1_ACCESS_GATE_VERSION,
      formedAt: { chapter: chapter != null ? Number(chapter) : null, sceneId: norm(scene.id) || null },
    };
    perCharacter[who] = rec;
    if (!truth.characters[who]) truth.characters[who] = { records: [] };
    // 幂等：同 type+scope+optionRefs 去重
    const key = `${rec.status}|${rec.type}|${rec.scope}|${rec.optionRefs.join(',')}`;
    if (!truth.characters[who].records.some((r) => `${r.status}|${r.type}|${r.scope}|${(r.optionRefs || []).join(',')}` === key)) {
      truth.characters[who].records.push(rec);
    }
  }

  const written = Object.keys(perCharacter).length > 0;
  if (written) saveAccessTruth(bookDir, truth, L1_ACCESS_GATE_WRITE_KEY);
  return { perCharacter, written };
}
