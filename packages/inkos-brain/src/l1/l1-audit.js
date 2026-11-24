/**
 * L1 Audit-only Production Observation（诊断旁路）
 *
 * MODE: DIAGNOSTIC ONLY —— observeL1 ≠ L1 Truth。
 * - 只读既有生产输出（Actual occurrences / characterCanAccessActualEvent / prose）
 * - 输出 vocabulary：OBSERVED / NOT_OBSERVED / UNKNOWN（禁止 Truth-certificate 词）
 * - candidate ≠ valid ≠ choice：绝不铸造 L1 Truth / Choice / Agency Truth / Option
 * - 旁路：不写 Actual/SR/State/WCT/causal history；仅落 l1_audit sidecar
 * - provenance：scene/character/eventId/detector 全可追溯，diagnostic-only
 *
 * @see docs/design/phase-4/03_l1-production-boundary-v0.2.md（audit 用途边界）
 * @see docs/design/phase-4/phase-4.1-candidate-option-access-agency-archaeology.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { characterCanAccessActualEvent } from '../character/character-sr-updater.js';
import {
  assessAccess,
  assessAgency,
  assessSubjectAbsent,
} from './observe-l1.js';

export const L1_AUDIT_VERSION = 'l1-audit-1';
export const L1_AUDIT_SIGNALS = Object.freeze(['OBSERVED', 'NOT_OBSERVED', 'UNKNOWN']);

const norm = (v) => String(v || '').trim();

/**
 * @param {{ scene?: object, characterNames?: string[] }} input
 * @returns {object} audit record（纯诊断，无 Truth 语义）
 */
export function runL1CharacterAudit(input = {}) {
  const scene = input.scene || {};
  const text = String(scene.text || '');
  const events = Array.isArray(scene.actualEvents) ? scene.actualEvents : [];
  const names = [...new Set((input.characterNames || []).map(norm).filter(Boolean))];

  const perCharacter = names.map((name) => {
    // Access（Fact / Information Boundary 意义——不是 Option Access）
    const accessibleEvents = events.filter((ev) => characterCanAccessActualEvent(name, ev, scene));
    const access_fact_ib = events.length
      ? (accessibleEvents.length ? 'OBSERVED' : 'NOT_OBSERVED')
      : 'UNKNOWN';

    // Presence（EO-L1-Subject-Eligibility-01 Frozen #10：仅 Actual 字段——
    // 移除 scene.pov/present plan-roster 混用，防其污染 EO 证据源；诊断语义不扩大）
    const participating = events.filter(
      (ev) => (ev.actors || []).includes(name) || (ev.affectedEntities || []).includes(name),
    );
    const presence_event = participating.length ? 'OBSERVED' : 'NOT_OBSERVED';

    // Agency candidate（prose 启发式，non-authoritative；无标记 ≠ 无 Agency）
    const agency_candidate = text && assessAgency(text) ? 'OBSERVED' : 'UNKNOWN';

    // Subject candidate：在场 + 非 subject-absent（≠ 主体资格认证）
    const subjectAbsent = text && assessSubjectAbsent(text);
    const subject_candidate = subjectAbsent
      ? 'NOT_OBSERVED'
      : (presence_event === 'OBSERVED' ? 'OBSERVED' : 'UNKNOWN');

    // L1 candidate（diagnostic）：三件套齐备才有候选；任一 UNKNOWN → UNKNOWN；
    // subject 缺席 → NOT_OBSERVED（Subject Absence → INVALID 是冻结 Golden 规则）
    let l1_candidate;
    if (subjectAbsent) l1_candidate = 'NOT_OBSERVED';
    else if (access_fact_ib === 'OBSERVED' && agency_candidate === 'OBSERVED' && subject_candidate === 'OBSERVED') l1_candidate = 'OBSERVED';
    else l1_candidate = 'UNKNOWN';

    return {
      character: name,
      access_fact_ib,
      accessibleEventIds: accessibleEvents.map((e) => e.id).slice(0, 6),
      presence_event,
      participatingEventIds: participating.map((e) => e.id).slice(0, 6),
      agency_candidate,
      agency_detector: 'observeL1.assessAgency(prose-heuristic) · non-authoritative',
      subject_candidate,
      l1_candidate,
      provenance: { sceneId: scene.id || scene.sceneId || null, detector: 'l1-audit-1', diagnostic_only: true },
    };
  });

  return {
    version: L1_AUDIT_VERSION,
    sceneId: scene.id || scene.sceneId || null,
    perCharacter,
    meta: {
      diagnostic_only: true,
      is_truth: false,
      mints_choice: false,
      vocabulary: L1_AUDIT_SIGNALS,
      note: 'observeL1 ≠ L1 Truth · candidate ≠ valid ≠ character_choice',
    },
  };
}

/** 旁路落盘：仅写 l1_audit sidecar，不触碰任何 Truth 载体 */
export function saveL1Audit(bookDir, chapter, record) {
  if (!bookDir || !chapter || !record) return { written: false, reason: 'missing_args' };
  const dir = path.join(bookDir, 'novel', '_system', 'brain', 'l1_audit');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `ch_${String(chapter).padStart(4, '0')}.json`);
  const prior = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { scenes: [] };
  prior.version = L1_AUDIT_VERSION;
  prior.chapter = Number(chapter);
  prior.updatedAt = new Date().toISOString();
  prior.meta = record.meta;
  prior.scenes = (prior.scenes || []).filter((s) => s.sceneId !== record.sceneId);
  prior.scenes.push({ sceneId: record.sceneId, perCharacter: record.perCharacter });
  fs.writeFileSync(file, `${JSON.stringify(prior, null, 2)}\n`, 'utf8');
  return { written: true, path: file };
}
