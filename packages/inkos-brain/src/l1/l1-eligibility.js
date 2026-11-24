/**
 * EO-L1-Subject-Eligibility-01 — L1-internal subject eligibility predicate
 *
 * Human Seal（2026-09-18，冻结）：
 * - Model A：eligibility ≡ Subject Presence
 * - 生产证据 = Actual-grounded ONLY（裸 Prose 无 Eligibility Truth Authority）
 * - 粗三态：ELIGIBLE | INVALID | UNKNOWN
 * - 不建 Agency Truth/runtime object；不吸收 Access/SR/Capability/Opportunity/
 *   Coercion/Goal/Desire/Option；不触 CO/Choice/Action/Attribution/L2/Consequence/
 *   Survival/Director；Phase 5–7 FROZEN
 * - 缺席识别仅消费**已合法进入 Actual** 的结构化字段；不实现/补建/扩展
 *   prose→Actual 缺席提取（独立未来 EO）。当前无此提取 ⇒ INVALID 结构性罕见，
 *   无证据 ⇒ UNKNOWN（fail-closed）。
 */
import fs from 'node:fs';
import path from 'node:path';

export const L1_ELIGIBILITY_VERSION = 'l1-subject-eligibility-1';

const norm = (v) => String(v || '').trim();

/** 封存 SubjectAbsent 标记族（Golden 观察者集，此处仅施于已 grounded 的 Actual 字段） */
function absenceMarked(text) {
  const t = String(text || '');
  if (/(昏迷|人事不省)/u.test(t)) return true;
  if (/(睡着了|梦游)/u.test(t)) return true;
  if (/不知道自己正在做什么/u.test(t)) return true;
  if (/像被线提着/u.test(t)) return true;
  if (/失去.?了?.?意识/u.test(t)) return true;
  if (/电击/u.test(t) && /抽动/u.test(t)) return true;
  if (/(替她|替他)/u.test(t) && /(握着|失去|意识)/u.test(t)) return true;
  return false;
}

function involvedIn(ev, characterId) {
  const actors = Array.isArray(ev?.actors) ? ev.actors.map(norm) : [];
  const affected = Array.isArray(ev?.affectedEntities) ? ev.affectedEntities.map(norm) : [];
  return actors.includes(characterId) || affected.includes(characterId);
}

/** Actual 结构化字段（action/consequence/stateChanges）——不含裸 prose */
function actualSpan(ev) {
  return [
    ev?.action || '',
    ev?.consequence || '',
    ...(Array.isArray(ev?.stateChanges) ? ev.stateChanges : []),
  ].join('\n');
}

const refOf = (ev) => norm(ev?.id); // EO-G1-C-01：refOf fallback 已废

/**
 * 单角色 eligibility（fail-closed，无 LLM，无 prose 判定）。
 * @returns {{ version, characterId, state: 'ELIGIBLE'|'INVALID'|'UNKNOWN', reason,
 *             evidenceOccurrenceIds: string[], provenance: object }}
 */
export function evaluateSubjectEligibility({ characterId, occurrences = [] } = {}) {
  const who = norm(characterId);
  const base = {
    version: L1_ELIGIBILITY_VERSION,
    characterId: who || null,
    provenance: {
      predicate: L1_ELIGIBILITY_VERSION,
      source: 'actual_occurrences',
      actual_grounded_only: true,
      is_agency_truth: false,
      l1_internal: true,
    },
  };
  if (!who) return { ...base, state: 'UNKNOWN', reason: 'characterId_missing', evidenceOccurrenceIds: [] };

  const list = Array.isArray(occurrences) ? occurrences.filter(Boolean) : [];

  // INVALID：仅当已进入 Actual 的结构化字段载有该角色的缺席态（当前提取能力下罕见）
  const absenceEv = list.find((ev) => involvedIn(ev, who) && absenceMarked(actualSpan(ev)));
  if (absenceEv) {
    return {
      ...base,
      state: 'INVALID',
      reason: 'subject_absence_actual_grounded',
      evidenceOccurrenceIds: [refOf(absenceEv)],
    };
  }

  // ELIGIBLE：Actual 在场（actors/affectedEntities，Truth 级证据）
  const present = list.filter((ev) => involvedIn(ev, who));
  if (present.length) {
    return {
      ...base,
      state: 'ELIGIBLE',
      reason: 'subject_presence_actual_grounded',
      evidenceOccurrenceIds: present.slice(0, 6).map(refOf),
    };
  }

  // 无 Presence 亦无 Absence 证据 → UNKNOWN（不猜）
  return { ...base, state: 'UNKNOWN', reason: 'no_actual_evidence', evidenceOccurrenceIds: [] };
}

/**
 * 场景级：对名单内每角色求值（名单仅用于枚举，不作为 eligibility 证据）。
 * @returns {{ version, sceneId, characters: Record<string, object> }}
 */
export function evaluateSceneSubjectEligibility({ scene = {}, characterNames = [] } = {}) {
  const occurrences = Array.isArray(scene.actualEvents) ? scene.actualEvents : [];
  const characters = {};
  for (const name of [...new Set((characterNames || []).map(norm).filter(Boolean))]) {
    characters[name] = evaluateSubjectEligibility({ characterId: name, occurrences });
  }
  return {
    version: L1_ELIGIBILITY_VERSION,
    sceneId: scene.id || scene.sceneId || null,
    characters,
    meta: {
      l1_internal: true,
      is_truth_authority_over_agency: false,
      consumes: 'actual_events_only',
      note: 'eligibility ≡ Subject Presence · Model A · 粗三态',
    },
  };
}

/** 旁路落盘（sidecar-only；零 Truth 消费者） */
export function saveL1Eligibility(bookDir, chapter, record) {
  if (!bookDir || !chapter || !record) return { written: false, reason: 'missing_args' };
  const dir = path.join(bookDir, 'novel', '_system', 'brain', 'l1_eligibility');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `ch_${String(chapter).padStart(4, '0')}.json`);
  const prior = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { scenes: [] };
  prior.version = L1_ELIGIBILITY_VERSION;
  prior.chapter = Number(chapter);
  prior.updatedAt = new Date().toISOString();
  prior.meta = record.meta;
  prior.scenes = (prior.scenes || []).filter((s) => s.sceneId !== record.sceneId);
  prior.scenes.push({ sceneId: record.sceneId, characters: record.characters });
  fs.writeFileSync(file, `${JSON.stringify(prior, null, 2)}\n`, 'utf8');
  return { written: true, path: file };
}
