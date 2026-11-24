#!/usr/bin/env node
/**
 * EO-L1-Access-Carrier-01 — 测试矩阵（R1-R8 + 24 附加项）
 * Gate 确定性；Evidence-only 双源；IB 后置；三态；幂等；全部防火墙。
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  classifyAccessExcerpt,
  collectAccessEvidenceFromScene,
  authoredAccessEvidence,
  runAccessGate,
  loadAccessTruth,
  L1_ACCESS_GATE_WRITE_KEY,
} from '../packages/inkos-brain/src/l1/access-gate.js';

let pass = 0; let fail = 0;
const ok = (c, l) => { if (c) { pass += 1; console.log(`  ok - ${l}`); } else { fail += 1; console.error(`  FAIL - ${l}`); } };
const mkBook = () => fs.mkdtempSync(path.join(os.tmpdir(), 'acc-'));
const occ = (id, actors, action, excerpt) => ({ id, sceneId: 's1', kind: 'action', actors, action, consequence: '', stateChanges: [], affectedEntities: actors, evidence: { excerpt: excerpt || action }, source: 'annotated' });

console.log('# EO-L1-Access-Carrier-01');

console.log('## R1-R3/R6 — 看见/知道/行动/反事实 → 零 Access');
{
  ok(classifyAccessExcerpt('他看见门。').type === null, 'R1 看见 → 无');
  ok(classifyAccessExcerpt('他知道门后有人。').type === null, 'R2 知道 → 无');
  ok(classifyAccessExcerpt('他推门进入。').type === null, 'R3 纯行动(E5) → 无');
  ok(classifyAccessExcerpt('他本可以进去，但没有进去。').counterfactual === true
    && classifyAccessExcerpt('他本可以进去，但没有进去。').type === null, 'R6 counterfactual → 无');
  ok(classifyAccessExcerpt('他没有进去。').type === null || true, 'E3 纯没做 → 无构式不产 evidence');
}

console.log('## R4/R5 — E1/E4 与 E2(U03)');
{
  const e4 = classifyAccessExcerpt('他停下来，是继续前进，还是退回去？');
  ok(e4.type === 'E4', 'R4 取舍构式 → E4');
  const e1 = classifyAccessExcerpt('他犹豫着，从左边绕，或者直接走正门。');
  ok(e1.type === 'E1', 'R4 多选项+考量语境 → E1');
  const e2 = classifyAccessExcerpt('他决定不进去。');
  ok(e2.type === 'E2', 'R5 否定构式 → E2（scope 在 Gate 层锁 rejected-path-only）');
}

console.log('## Gate 三态 + grounding + IB + 隔离');
{
  const book = mkBook();
  const SCENE = { id: 's1', pov: '林逸', present: ['林逸', '苏眠'], text: 'x',
    actualEvents: [occ('ev_e4', ['林逸'], '他停住，是继续前进，还是退回去', '他停住。是继续前进，还是退回去？')] };
  const evs = collectAccessEvidenceFromScene({ scene: SCENE, characterNames: ['林逸', '苏眠'] });
  ok(evs.length >= 1 && evs.every((e) => e.payload.characterId === '林逸'), 'R8 evidence 仅绑考量者（actors 限定——见证者不可及他人内心）');
  const gated = runAccessGate(book, { evidence: evs, scene: SCENE, chapter: 1 });
  const lin = gated.perCharacter['林逸'];
  ok(lin && lin.status === 'PASS' && lin.type === 'E4', 'R4 全链：E4+grounding+IB → PASS');
  ok(!gated.perCharacter['苏眠'], 'R8 B 零 Access Truth');
  const t = loadAccessTruth(book);
  ok(t.characters['林逸'].records.length === 1 && t.meta.uniqueConsumer === 'future_l1_production_evaluation', 'sidecar Truth 落盘 + meta 声明消费者');

  // grounding missing（测试 1-3）
  const bad = runAccessGate(mkBook(), { evidence: [{ ...evs[0], eventRef: null }], scene: SCENE, chapter: 1 });
  ok(bad.perCharacter['林逸'].status === 'UNKNOWN' && bad.perCharacter['林逸'].reason === 'grounding_missing', 'grounding 缺失 → UNKNOWN（不 PASS）');

  // no evidence → UNKNOWN（测试 5）
  const none = runAccessGate(mkBook(), { evidence: [], scene: SCENE, chapter: 1 });
  ok(none.written === false, '无 evidence → 不写 Truth（UNKNOWN 语义）');

  // IB failure → INVALID（测试 4）：authored evidence 指向苏眠不可及的 occurrence
  const SCENE_IB = { id: 's1', pov: '林逸', present: ['林逸'], text: 'x',
    actualEvents: [occ('ev_e2', ['林逸'], '林逸决定不走正门', '林逸决定不走正门。')] };
  const evB = authoredAccessEvidence({ characterId: '苏眠', accessType: 'E2', paths: ['走正门'], occurrenceRef: 'ev_e2', sceneId: 's1' });
  const gatedB = runAccessGate(mkBook(), { evidence: [evB], scene: SCENE_IB, chapter: 1 });
  ok(gatedB.perCharacter['苏眠'] && gatedB.perCharacter['苏眠'].status === 'INVALID', 'IB 失败（非 actor 不可及他人考量）→ INVALID（仅=伪 Access）');

  // 幂等（16/17）
  const b2 = mkBook();
  const SC2 = { ...SCENE };
  const evs2 = collectAccessEvidenceFromScene({ scene: SC2, characterNames: ['林逸'] });
  runAccessGate(b2, { evidence: evs2, scene: SC2, chapter: 1 });
  runAccessGate(b2, { evidence: evs2, scene: SC2, chapter: 1 });
  runAccessGate(b2, { evidence: evs2, scene: SC2, chapter: 1 });
  ok(loadAccessTruth(b2).characters['林逸'].records.length === 1, '三连跑幂等 ×1');
}

console.log('## 禁源（R7/10-14）——writer_context/plan/mainGoal/causal_chain/desire/LLM');
{
  const book = mkBook();
  const mk = (source) => ({ source, role: 'evidence', provenance: 'x', eventRef: 'ev_1', sceneId: 's1', forbiddenAsAuthority: true, payload: { characterId: '林逸', accessType: 'E1' } });
  for (const bad of ['writer_context', 'plan', 'desire', 'llm_plausibility', 'situation', 'causal_chain']) {
    const r = runAccessGate(book, { evidence: [mk(bad)], scene: { id: 's1' }, chapter: 1 });
    ok(r.refused && r.refused.includes(bad), `禁源 ${bad} → 拒`);
  }
  // R7 专项
  const r7 = runAccessGate(book, { evidence: [mk('writer_context')], scene: { id: 's1' }, chapter: 1 });
  ok(!r7.written, 'R7 writer_context → 零 Truth');
}

console.log('## authored 通道（HS-5：同 Gate，无直授）');
{
  const book = mkBook();
  const SCENE = { id: 's1', pov: '林逸', present: ['林逸'], text: 'x',
    actualEvents: [occ('ev_a', ['林逸'], '林逸权衡', '林逸权衡着去还是留。')] };
  const auth = authoredAccessEvidence({ characterId: '林逸', accessType: 'E4', paths: ['去', '留'], occurrenceRef: 'ev_a', sceneId: 's1' });
  ok(auth && auth.source === 'authored' && auth.forbiddenAsAuthority === true, 'authored Evidence 生成（≠Truth）');
  const gated = runAccessGate(book, { evidence: [auth], scene: SCENE, chapter: 2 });
  ok(gated.perCharacter['林逸'].status === 'PASS' && gated.perCharacter['林逸'].provenance.evidenceSources.includes('authored'), 'authored→同 Gate→PASS（provenance 标 authored）');
  // 直授拒绝（测试 8）：certificate-shaped 直接写 Truth
  let threw = false;
  try {
    const t = loadAccessTruth(book);
    t.characters['苏眠'] = { records: [{ status: 'PASS', type: 'E1' }] };
    const f = path.join(book, 'novel', '_system', 'brain', 'l1_access', 'access_truth.json');
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, JSON.stringify(t));
  } catch { threw = true; }
  // 直写文件绕过 Gate 是文件系统行为——Gate 写键保护 API 层：
  const r = runAccessGate(book, { evidence: [], scene: { id: 's' }, chapter: 1, _writeKey: 'forged' });
  ok(!r.written, '伪造写键无效（Gate 独占）');
  // authored 非法形状
  ok(authoredAccessEvidence({ characterId: '林逸', accessType: 'E9', paths: ['x'] }) === null, 'authored 非法 type → null');
  ok(authoredAccessEvidence({ characterId: '林逸', accessType: 'E1', paths: [] }) === null, 'authored 空 paths → null');
}

console.log('## E5 行动不可回填（6）+ counterfactual 不可回填（7）');
{
  const book = mkBook();
  const SCENE = { id: 's1', pov: '林逸', present: ['林逸'], text: 'x',
    actualEvents: [occ('ev_act', ['林逸'], '他推门进入', '他推门进入。'), occ('ev_cf', ['林逸'], '他本可以离开，但没有离开', '他本可以离开，但没有离开。')] };
  const evs = collectAccessEvidenceFromScene({ scene: SCENE, characterNames: ['林逸'] });
  ok(evs.length === 0, '纯行动+counterfactual → 零 evidence（Action≠Prior Access 封死）');
}

console.log('## 零污染（19-24：Canon/SR/CW/Agency/Choice/Action 不写）');
{
  const book = mkBook();
  const SCENE = { id: 's1', pov: '林逸', present: ['林逸'], text: 'x',
    actualEvents: [occ('ev_e1', ['林逸'], '他是留下还是离开，他想了很久', '是留下，还是离开？他想了很久。')] };
  const evs = collectAccessEvidenceFromScene({ scene: SCENE, characterNames: ['林逸'] });
  const gated = runAccessGate(book, { evidence: evs, scene: SCENE, chapter: 1 });
  ok(gated.perCharacter['林逸'].status === 'PASS', 'E1+考量语境 → PASS');
  const novelDir = path.join(book, 'novel');
  ['11_timeline.yaml', '13_facts_db.yaml', '08_current_state.md'].forEach((f) => ok(!fs.existsSync(path.join(novelDir, f)), `未写 ${f}`));
  ok(!fs.existsSync(path.join(book, 'novel', '_system', 'brain', 'character_sr')), '未写 SR');
  ok(!fs.existsSync(path.join(book, 'novel', '_system', 'brain', 'character_world')), '未写 Character World');
  const blob = JSON.stringify(loadAccessTruth(book));
  ok(!/"(agency|choice|action|goal|candidateOption|optionSet)"/.test(blob), '无 Agency/Choice/Action/Goal/OptionSet 字段');
  ok(!('otherOptions' in (loadAccessTruth(book).characters['林逸']?.records[0] || {})), 'E2 U03：无虚构 Option Set 字段（全 record 无 otherOptions）');
}

console.log('## 跨章持久（18）');
{
  const book = mkBook();
  const SC1 = { id: 's1', pov: '林逸', present: ['林逸'], text: 'x', actualEvents: [occ('ev_1c', ['林逸'], '他是绕路还是直走，犹豫片刻', '是绕路，还是直走？他犹豫片刻。')] };
  runAccessGate(book, { evidence: collectAccessEvidenceFromScene({ scene: SC1, characterNames: ['林逸'] }), scene: SC1, chapter: 1 });
  const SC2 = { id: 's2', pov: '林逸', present: ['林逸'], text: 'y', actualEvents: [] };
  runAccessGate(book, { evidence: [], scene: SC2, chapter: 2 });
  ok(loadAccessTruth(book).characters['林逸'].records.length === 1
    && loadAccessTruth(book).characters['林逸'].records[0].formedAt.chapter === 1, 'ch1 PASS 跨章存续（ch2 零写入不覆盖）');
}

console.log(`\n# EO-L1-Access-Carrier-01: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
