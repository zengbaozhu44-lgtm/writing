/**
 * EO-L1-Production-Evaluation-01 — L1 Production Evaluator
 *
 * #32 Human Seal（HA-1/2/3，2026-09-20 冻结）：
 * - P1 合流：Eligibility INVALID → L1 INVALID（短路）；
 *   ELIGIBLE ∧ Access PASS → VALID；其余合法未知组合 → UNKNOWN（缺证据≠否定）
 * - HA-3：Access INVALID Evidence 仅作废该证据，L1 回落 UNKNOWN（不污染）
 * - HA-2：三态 sidecar-only；零生产消费者；L1=VALID 不产生 Choice/Option/Selection
 * - Coercion ≠ Absence（缺席词表结构性不含胁迫 → 胁迫下仍可 VALID）
 * - 禁：L2/Choice/CandidateOption/Agency/Goal/Desire/改 CW/SR/Access/Eligibility
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadAccessTruth } from './access-gate.js';
import { loadCharacterSRState } from '../character/character-sr-updater.js';

export const L1_EVALUATION_VERSION = 'l1-production-evaluation-1';

const norm = (v) => String(v || '').trim();

function evalDir(bookDir) {
  return path.join(bookDir, 'novel', '_system', 'brain', 'l1_evaluation');
}
function evalFile(bookDir) {
  return path.join(evalDir(bookDir), 'l1_evaluation.json');
}

function emptyEval() {
  return {
    version: L1_EVALUATION_VERSION,
    characters: {},
    meta: {
      rule: 'P1_short_circuit',
      ha: { ha1: 'sealed', ha2: 'sidecar_only_zero_consumers', ha3: 'invalid_evidence_rejected_not_l1_invalid' },
      writesCanon: false, writesSR: false, writesChoice: false, writesAgency: false,
      uniqueConsumer: 'future_l2_gate_authorized_only',
      note: 'L1=VALID 不自动产生 Choice/Option/Selection',
    },
  };
}

export function loadL1Evaluation(bookDir) {
  const f = evalFile(bookDir);
  if (!fs.existsSync(f)) return emptyEval();
  try {
    const raw = JSON.parse(fs.readFileSync(f, 'utf8'));
    return raw && raw.version === L1_EVALUATION_VERSION ? raw : emptyEval();
  } catch {
    return emptyEval();
  }
}

function saveL1Evaluation(bookDir, record) {
  fs.mkdirSync(evalDir(bookDir), { recursive: true });
  record.updatedAt = new Date().toISOString();
  fs.writeFileSync(evalFile(bookDir), `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  return { written: true, path: evalFile(bookDir) };
}

/**
 * 场景级 L1 评估（确定性；二轴合流；HA-3 证据作废语义）。
 * 输入只读两类既有 sidecar：AccessTruth + L1 Eligibility（含 scene 附加态）。
 * @returns {{ characters: Record<string, {status,reason,inputs}> }}
 */
export function evaluateSceneL1({ accessTruth = { characters: {} }, eligibility = { characters: {} } } = {}) {
  const out = {};
  const names = new Set([
    ...Object.keys(accessTruth.characters || {}),
    ...Object.keys(eligibility.characters || {}),
  ]);

  for (const name of names) {
    const who = norm(name);
    if (!who) continue;
    const elig = eligibility.characters?.[who];
    const eligState = elig?.state || 'UNKNOWN';
    const eligEv = (elig?.evidenceOccurrenceIds || []).slice(0, 6);

    const accRecs = accessTruth.characters?.[who]?.records || [];
    const passRecs = [];
    const rejectedEvidence = [];
    for (const r of accRecs) {
      if (r.status === 'PASS') passRecs.push(r);
      else if (r.status === 'INVALID') rejectedEvidence.push(r); // HA-3：作废不传染
    }

    let status; let reason;
    if (eligState === 'INVALID') {
      status = 'INVALID'; reason = 'subject_absence_short_circuit'; // HA-1 短路（无论 Access）
    } else if (eligState === 'ELIGIBLE' && passRecs.length > 0) {
      status = 'VALID'; reason = 'eligible_and_access_pass';
    } else if (eligState === 'ELIGIBLE') {
      status = 'UNKNOWN'; reason = rejectedEvidence.length
        ? 'access_evidence_rejected_no_valid_pass' // HA-3：伪证据作废 → 回落 UNKNOWN
        : 'access_unknown_absence_not_negation'; // HA-1：缺证据≠否定
    } else {
      status = 'UNKNOWN'; reason = 'eligibility_unknown';
    }

    out[who] = {
      characterId: who,
      status,
      reason,
      inputs: {
        eligibility: { state: eligState, evidenceOccurrenceIds: eligEv },
        access: {
          passCount: passRecs.length,
          rejectedEvidenceCount: rejectedEvidence.length,
          passRefs: passRecs.map((r) => (r.optionRefs || []).join('+')).slice(0, 4),
          rejectedRefs: rejectedEvidence.map((r) => (r.optionRefs || []).join('+')).slice(0, 4),
        },
      },
      provenance: {
        evaluator: L1_EVALUATION_VERSION,
        rule: 'P1_short_circuit',
        sources: ['l1_access_truth_sidecar', 'l1_eligibility_sidecar'],
      },
    };
  }
  return { characters: out };
}

/**
 * orchestrator 挂载入口：读两类既有 sidecar → 合流 → L1 sidecar（幂等）。
 * 无任何 Truth 写出本 sidecar 之外；零消费者。
 */
export function runL1ProductionEvaluation(bookDir) {
  if (!bookDir) return { evaluated: 0, reason: 'missing_args' };
  const accessTruth = loadAccessTruth(bookDir);
  const eligibility = loadL1EligibilitySidecar(bookDir);
  const { characters } = evaluateSceneL1({ accessTruth, eligibility });
  const record = emptyEval();
  record.characters = characters;
  if (!Object.keys(characters).length) {
    return { evaluated: 0, reason: 'no_inputs' }; // 不落空盘
  }
  saveL1Evaluation(bookDir, record);
  return { evaluated: Object.keys(characters).length, record };
}

/** 读取既有 l1_eligibility sidecar（章级，取最新章） */
function loadL1EligibilitySidecar(bookDir) {
  const dir = path.join(bookDir, 'novel', '_system', 'brain', 'l1_eligibility');
  try {
    const files = fs.readdirSync(dir).filter((f) => /^ch_\d{4}\.json$/.test(f)).sort();
    if (!files.length) return { characters: {} };
    const raw = JSON.parse(fs.readFileSync(path.join(dir, files[files.length - 1]), 'utf8'));
    const characters = {};
    for (const s of raw.scenes || []) {
      for (const [n, c] of Object.entries(s.characters || {})) characters[n] = c;
    }
    return { characters };
  } catch {
    return { characters: {} };
  }
}
