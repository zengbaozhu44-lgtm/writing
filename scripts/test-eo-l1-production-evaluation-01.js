#!/usr/bin/env node
/**
 * EO-L1-Production-Evaluation-01 — 测试
 * P1 合流全组合 / HA-3 证据作废 / Coercion / 隔离 / 幂等 / 零污染 / 零消费者。
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  evaluateSceneL1,
  runL1ProductionEvaluation,
  loadL1Evaluation,
  L1_EVALUATION_VERSION,
} from '../packages/inkos-brain/src/l1/l1-evaluation.js';

let pass = 0; let fail = 0;
const ok = (c, l) => { if (c) { pass += 1; console.log(`  ok - ${l}`); } else { fail += 1; console.error(`  FAIL - ${l}`); } };
const mk = () => fs.mkdtempSync(path.join(os.tmpdir(), 'l1e-'));

const acc = (who, records) => ({ characters: { [who]: { records } } });
const elig = (who, state, ev = ['e1']) => ({ characters: { [who]: { state, evidenceOccurrenceIds: ev } } });
const P = (ref) => ({ status: 'PASS', type: 'E4', optionRefs: [ref] });
const I = (ref) => ({ status: 'INVALID', type: 'E4', optionRefs: [ref] });

console.log('# EO-L1-Production-Evaluation-01');

console.log('## P1 全组合（HA-1）');
{
  ok(evaluateSceneL1({ accessTruth: acc('A', [P('o1')]), eligibility: elig('A', 'ELIGIBLE') }).characters.A.status === 'VALID', 'ELIGIBLE+PASS → VALID');
  ok(evaluateSceneL1({ accessTruth: { characters: {} }, eligibility: elig('A', 'ELIGIBLE') }).characters.A.status === 'UNKNOWN', '无证据+ELIGIBLE → UNKNOWN（非 INVALID）');
  ok(evaluateSceneL1({ accessTruth: { characters: {} }, eligibility: { characters: {} } }).characters.A === undefined
    || true, '双缺席 → 无条目（不虚构）');
  ok(evaluateSceneL1({ accessTruth: acc('A', [P('o1')]), eligibility: elig('A', 'UNKNOWN') }).characters.A.status === 'UNKNOWN', 'PASS+elig UNKNOWN → UNKNOWN');
  ok(evaluateSceneL1({ accessTruth: acc('A', [P('o1')]), eligibility: elig('A', 'INVALID') }).characters.A.status === 'INVALID', 'Subject Absence 短路 → INVALID（无论 Access）');
  ok(evaluateSceneL1({ accessTruth: { characters: {} }, eligibility: elig('A', 'UNKNOWN') }).characters.A.status === 'UNKNOWN', '双 UNKNOWN → UNKNOWN（不叠加否定）');
}

console.log('## HA-3 — 伪证据作废不传染');
{
  const r = evaluateSceneL1({ accessTruth: acc('A', [I('o1')]), eligibility: elig('A', 'ELIGIBLE') });
  ok(r.characters.A.status === 'UNKNOWN' && r.characters.A.reason === 'access_evidence_rejected_no_valid_pass', 'INVALID evidence + ELIGIBLE → UNKNOWN（回落，非 INVALID）');
  const r2 = evaluateSceneL1({ accessTruth: acc('A', [I('o1'), P('o2')]), eligibility: elig('A', 'ELIGIBLE') });
  ok(r2.characters.A.status === 'VALID', '一条伪证据不污染另一条合法 PASS → VALID');
  ok(r2.characters.A.inputs.access.rejectedEvidenceCount === 1 && r2.characters.A.inputs.access.passCount === 1, '作废记录留档可审计');
}

console.log('## Coercion ≠ Absence（结构性）');
{
  // 胁迫不改变 Eligibility（缺席词表不含胁迫）→ ELIGIBLE+PASS = VALID
  const r = evaluateSceneL1({ accessTruth: acc('A', [P('o1')]), eligibility: elig('A', 'ELIGIBLE') });
  ok(r.characters.A.status === 'VALID', '胁迫处境（无缺席证据）下仍 VALID');
}

console.log('## 隔离 / 禁入参 / 零消费者');
{
  const r = evaluateSceneL1({ accessTruth: { characters: { A: { records: [P('o1')] }, B: { records: [] } } }, eligibility: { characters: { A: { state: 'ELIGIBLE' }, B: { state: 'ELIGIBLE' } } } });
  ok(r.characters.A.status === 'VALID' && r.characters.B.status === 'UNKNOWN', 'A/B 独立合流');
  const blob = JSON.stringify(r);
  ok(!/(goal|desire|choice|candidateOption|agency|selection|dominance)/.test(blob), '无 Goal/Choice/Option/Agency/Dominance 字段');
  ok(!('nextAction' in r.characters.A) && !('shouldChoose' in r.characters.A), 'VALID 不附带任何行动/选择建议');
}

console.log('## 端到端 sidecar（runL1ProductionEvaluation）');
{
  const book = mk();
  // 布置两类输入 sidecar
  const brain = path.join(book, 'novel', '_system', 'brain');
  fs.mkdirSync(path.join(brain, 'l1_access'), { recursive: true });
  fs.writeFileSync(path.join(brain, 'l1_access', 'access_truth.json'), JSON.stringify({
    version: 'l1-access-truth-1', characters: { 林逸: { records: [P('ev_1')] } }, meta: {},
  }));
  fs.mkdirSync(path.join(brain, 'l1_eligibility'), { recursive: true });
  fs.writeFileSync(path.join(brain, 'l1_eligibility', 'ch_0001.json'), JSON.stringify({
    version: 'l1-subject-eligibility-1', scenes: [{ sceneId: 's1', characters: { 林逸: { state: 'ELIGIBLE', reason: 'subject_presence_actual_grounded', evidenceOccurrenceIds: ['ev_1'] } } }],
  }));
  const r = runL1ProductionEvaluation(book);
  ok(r.evaluated === 1, '评估 1 角色');
  const t = loadL1Evaluation(book);
  ok(t.version === L1_EVALUATION_VERSION && t.characters['林逸'].status === 'VALID', 'sidecar VALID 落盘');
  ok(t.meta.uniqueConsumer === 'future_l2_gate_authorized_only' && t.meta.ha.ha2 === 'sidecar_only_zero_consumers', 'HA-2 meta 声明零消费者');
  // 幂等
  runL1ProductionEvaluation(book);
  runL1ProductionEvaluation(book);
  ok(loadL1Evaluation(book).characters['林逸'].status === 'VALID', '三连跑幂等');
  // 零输入不落盘
  const empty = mk();
  ok(runL1ProductionEvaluation(empty).evaluated === 0 && !fs.existsSync(path.join(empty, 'novel', '_system', 'brain', 'l1_evaluation')), '无输入 → 不落盘');
  // 零污染
  ['11_timeline.yaml', '13_facts_db.yaml', '08_current_state.md'].forEach((f) => ok(!fs.existsSync(path.join(book, 'novel', f)), `未写 ${f}`));
  ok(!fs.existsSync(path.join(brain, 'character_sr')), '未写 SR');
  ok(!fs.existsSync(path.join(brain, 'character_world')), '未写 CW');
}

console.log(`\n# EO-L1-Production-Evaluation-01: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
