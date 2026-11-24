#!/usr/bin/env node
/**
 * L1 Audit-only Observation — 测试
 *
 * 边界：diagnostic ≠ Truth；candidate ≠ valid ≠ choice；
 * Plan/Action/Attribution 永远不能经 audit 变成 Choice/Agency candidate。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runL1CharacterAudit, saveL1Audit } from '../packages/inkos-brain/src/l1/l1-audit.js';

let pass = 0;
let fail = 0;
function ok(cond, label) {
  if (cond) { pass += 1; console.log(`  ok - ${label}`); }
  else { fail += 1; console.error(`  FAIL - ${label}`); }
}

function scene(text, extra = {}) {
  return {
    id: 's1', index: 1, pov: '林逸', present: ['林逸', '苏眠'],
    text,
    actualEvents: [
      { id: 'e1', sceneId: 's1', kind: 'action', actors: ['林逸'], action: '林逸撞碎玻璃取出卷宗', consequence: '警铃炸响', stateChanges: [], affectedEntities: ['林逸'], evidence: { excerpt: '林逸撞碎玻璃取出卷宗' }, source: 'annotated' },
      { id: 'e2', sceneId: 's1', kind: 'action', actors: ['苏眠'], action: '苏眠交出半张地图', consequence: '', stateChanges: [], affectedEntities: ['苏眠'], evidence: { excerpt: '苏眠交出半张地图' }, source: 'annotated' },
    ],
    ...extra,
  };
}

const TRUTH_CERT_WORDS = ['CONFIRMED', 'VERIFIED', 'ACTUAL', 'IMMUTABLE', 'l1_valid'];

console.log('# L1 Audit-only Observation');

console.log('## 1. Positive diagnostic（明确选择语言 → candidate；Choice Truth 仍 ABSENT）');
{
  const s = scene('林逸想了想，还是决定砸开柜子，而不是绕路。警铃炸响。');
  const r = runL1CharacterAudit({ scene: s, characterNames: ['林逸', '苏眠'] });
  const lin = r.perCharacter.find((c) => c.character === '林逸');
  ok(lin.agency_candidate === 'OBSERVED', 'agency_candidate OBSERVED（还是决定+而不是）');
  ok(lin.access_fact_ib === 'OBSERVED', 'access_fact_ib OBSERVED（event actor）');
  ok(lin.presence_event === 'OBSERVED', 'presence_event OBSERVED');
  ok(lin.subject_candidate === 'OBSERVED', 'subject_candidate OBSERVED');
  ok(lin.l1_candidate === 'OBSERVED', 'l1_candidate OBSERVED（diagnostic）');
  ok(r.meta.mints_choice === false && r.meta.is_truth === false, 'record 声明非 Truth 不铸 Choice');
  ok(!('choice' in lin) && !('l1_valid' in lin), '输出无 choice/l1_valid 字段');
  const sum = r.perCharacter.map((c) => c.l1_candidate).join('');
  ok(!TRUTH_CERT_WORDS.some((w) => sum.includes(w)) && !JSON.stringify(r).includes('"CONFIRMED"'), '无 Truth-certificate 词汇');
}

console.log('## 2. 反洗白：Plan 字段存在不产生 candidate');
{
  const plain = scene('林逸检查了柜门的锁孔，走开了。', {
    goal: '林逸决定砸开柜子', mainGoal: '林逸必须做出选择', causalChain: { choice: '林逸选择硬闯' },
  });
  const r1 = runL1CharacterAudit({ scene: plain, characterNames: ['林逸'] });
  const r2 = runL1CharacterAudit({ scene: scene('林逸检查了柜门的锁孔，走开了。'), characterNames: ['林逸'] });
  const a1 = r1.perCharacter[0].agency_candidate;
  const a2 = r2.perCharacter[0].agency_candidate;
  ok(a1 === a2 && a1 === 'UNKNOWN', `Plan 字段零影响（${a1}===${a2}）`);
  ok(r1.perCharacter[0].l1_candidate === 'UNKNOWN', 'Plan 不产生 l1_candidate');
}

console.log('## 3. 反洗白：Action/CharacterActionTruth 存在不产生 Choice candidate');
{
  const s = scene('林逸撞碎玻璃取出卷宗。警铃炸响。', {
    characterActionTruth: { status: 'asserted', characterId: '林逸', actionContent: '撞碎玻璃', occurrenceRef: 'e1', isChoice: false },
    worldConsequenceTruth: { status: 'asserted', worldChangeContent: '警铃炸响', isChoice: false },
  });
  const r = runL1CharacterAudit({ scene: s, characterNames: ['林逸'] });
  const lin = r.perCharacter[0];
  ok(lin.agency_candidate === 'UNKNOWN', 'Action 不得变成 Agency candidate');
  ok(lin.l1_candidate === 'UNKNOWN', 'Action 不得变成 l1 candidate（UNKNOWN 合法）');
}

console.log('## 4. UNKNOWN 合法（缺 agency 证据）');
{
  const s = scene('林逸站在柜前，看着锁孔。他退后两步。');
  const r = runL1CharacterAudit({ scene: s, characterNames: ['林逸'] });
  const lin = r.perCharacter[0];
  ok(lin.agency_candidate === 'UNKNOWN', 'agency_candidate UNKNOWN（启发式无标记 ≠ 无 Agency）');
  ok(lin.l1_candidate === 'UNKNOWN', 'l1_candidate UNKNOWN（不强行 VALID/INVALID）');
}

console.log('## 5. Subject Absence → NOT_OBSERVED（冻结 Golden 规则）');
{
  const s = scene('林逸失去了意识。醒来时已在档案区。', {});
  const r = runL1CharacterAudit({ scene: s, characterNames: ['林逸'] });
  ok(r.perCharacter[0].subject_candidate === 'NOT_OBSERVED', 'subject absent → NOT_OBSERVED');
  ok(r.perCharacter[0].l1_candidate === 'NOT_OBSERVED', 'l1_candidate NOT_OBSERVED（Subject Absence → INVALID 规则的诊断映射）');
}

console.log('## 6. 零 Truth 变更 + 旁路落盘');
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'l1-audit-'));
  const s = scene('林逸想了想，还是决定砸开柜子。');
  const before = JSON.stringify({ ae: s.actualEvents, t: s.text });
  const r = runL1CharacterAudit({ scene: s, characterNames: ['林逸'] });
  ok(JSON.stringify({ ae: s.actualEvents, t: s.text }) === before, 'audit 不改 scene/actualEvents/text');
  ok(!('characterSRState' in s) && !('worldConsequenceTruth' in s), 'audit 不写 SR/WCT 槽位');
  const w = saveL1Audit(dir, 1, r);
  ok(w.written === true && w.path.includes('l1_audit'), 'sidecar 落 l1_audit 目录');
  const bag = JSON.parse(fs.readFileSync(w.path, 'utf8'));
  ok(bag.meta.diagnostic_only === true && !JSON.stringify(bag).match(/CONFIRMED|VERIFIED|IMMUTABLE/), 'sidecar 声明 diagnostic_only 且无证书词');
}

console.log('## 7. 全 vocabulary 合规（全输出扫描）');
{
  const s = scene('苏眠想了想，还是决定交出地图。而不是烧掉它。林逸失去了意识。', {});
  const r = runL1CharacterAudit({ scene: s, characterNames: ['林逸', '苏眠'] });
  const blob = JSON.stringify(r);
  ok(!TRUTH_CERT_WORDS.some((w) => blob.includes(w)), '整 record 无 Truth-certificate 词汇');
  ok(r.perCharacter.every((c) => L1_SIGNALS_OK(c)), '全部信号 ∈ OBSERVED/NOT_OBSERVED/UNKNOWN');
}
function L1_SIGNALS_OK(c) {
  const S = ['OBSERVED', 'NOT_OBSERVED', 'UNKNOWN'];
  return ['access_fact_ib', 'presence_event', 'agency_candidate', 'subject_candidate', 'l1_candidate']
    .every((k) => S.includes(c[k]));
}

console.log(`\n# L1 Audit: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
