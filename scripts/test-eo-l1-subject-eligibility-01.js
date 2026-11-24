#!/usr/bin/env node
/**
 * EO-L1-Subject-Eligibility-01 — 测试
 *
 * Frozen: Model A（eligibility ≡ Subject Presence）· Actual-grounded only · 粗三态。
 * F：actor/affected→ELIGIBLE；无证据→UNKNOWN；合法 Actual 缺席 fixture→INVALID。
 * G：plan roster / scene.pov / prose / SR / Goal / Desire / Option 不得改变 eligibility。
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  evaluateSubjectEligibility,
  evaluateSceneSubjectEligibility,
  saveL1Eligibility,
  L1_ELIGIBILITY_VERSION,
} from '../packages/inkos-brain/src/l1/l1-eligibility.js';

let pass = 0;
let fail = 0;
function ok(cond, label) {
  if (cond) { pass += 1; console.log(`  ok - ${label}`); }
  else { fail += 1; console.error(`  FAIL - ${label}`); }
}

const occ = (id, actors, action, extra = {}) => ({
  id, sceneId: 's1', kind: 'action', actors, action,
  consequence: extra.consequence || '', stateChanges: extra.stateChanges || [],
  affectedEntities: extra.affected || actors,
  evidence: { excerpt: extra.excerpt || action }, source: 'annotated',
});

console.log('# EO-L1-Subject-Eligibility-01');

console.log('## F1 — Actual actor / affectedEntity → ELIGIBLE');
{
  const r1 = evaluateSubjectEligibility({
    characterId: '林逸',
    occurrences: [occ('e1', ['林逸'], '林逸把地图塞进内袋'), occ('e2', ['苏眠'], '苏眠交出地图')],
  });
  ok(r1.state === 'ELIGIBLE' && r1.reason === 'subject_presence_actual_grounded', 'actors 命中 → ELIGIBLE');
  ok(r1.evidenceOccurrenceIds.includes('e1') && !r1.evidenceOccurrenceIds.includes('e2'), '证据仅指向本人事件');
  const r2 = evaluateSubjectEligibility({
    characterId: '苏眠',
    occurrences: [occ('e1', ['林逸'], '林逸砸柜', { affected: ['林逸', '苏眠'] })],
  });
  ok(r2.state === 'ELIGIBLE', 'affectedEntities 命中 → ELIGIBLE');
}

console.log('## F2 — 无 Presence/Absence 证据 → UNKNOWN（不猜）');
{
  const r = evaluateSubjectEligibility({
    characterId: '镜渊',
    occurrences: [occ('e1', ['林逸'], '林逸砸柜')],
  });
  ok(r.state === 'UNKNOWN' && r.reason === 'no_actual_evidence', '无证据 → UNKNOWN');
  const empty = evaluateSubjectEligibility({ characterId: '林逸', occurrences: [] });
  ok(empty.state === 'UNKNOWN', '空 occurrences → UNKNOWN');
  const noId = evaluateSubjectEligibility({ occurrences: [occ('e1', ['林逸'], 'x')] });
  ok(noId.state === 'UNKNOWN' && noId.reason === 'characterId_missing', '缺 characterId → UNKNOWN');
}

console.log('## F3 — 合法 Actual-grounded 缺席 fixture → INVALID');
{
  const r = evaluateSubjectEligibility({
    characterId: '林逸',
    occurrences: [
      occ('e1', ['林逸'], '林逸失去意识倒在地上', { consequence: '担架抬离现场' }),
    ],
  });
  ok(r.state === 'INVALID' && r.reason === 'subject_absence_actual_grounded', 'Actual 内缺席态 → INVALID');
  // 缺席属他人叙述（本人不在 actors/affected）→ 不 INVALID
  const other = evaluateSubjectEligibility({
    characterId: '林逸',
    occurrences: [occ('e1', ['苏眠'], '苏眠看到林逸失去意识')],
  });
  ok(other.state === 'UNKNOWN', '缺席叙述不涉本人 Actual 参与时不误判（UNKNOWN）');
  // 裸 prose（未入 Actual）不含缺席判定——evidence 字段即使有词也不消费
  const proseOnly = evaluateSubjectEligibility({
    characterId: '林逸',
    occurrences: [occ('e1', ['林逸'], '林逸走在走廊里', { excerpt: '林逸走在走廊里，旁白提到苏眠昏迷' })],
  });
  ok(proseOnly.state === 'ELIGIBLE', '缺席词仅出现于 excerpt（非结构化字段）不被消费');
}

console.log('## G — 反洗白：非 Actual 来源不得改变 eligibility');
{
  const occs = [occ('e1', ['林逸'], '林逸砸柜')];
  const base = evaluateSubjectEligibility({ characterId: '林逸', occurrences: occs });
  // scene.pov / present / plan roster / goal / desire / options 全部不进谓词入参
  const withSceneBaggage = evaluateSceneSubjectEligibility({
    scene: {
      id: 's1', pov: '镜渊', present: ['镜渊', '陈默'],
      goal: '镜渊决定接管', mainGoal: '镜渊获胜',
      causalChain: { options: [{ action: 'A' }, { action: 'B' }] },
      actualEvents: occs,
    },
    characterNames: ['林逸', '镜渊'],
  });
  ok(withSceneBaggage.characters['林逸'].state === 'ELIGIBLE', '林逸：Actual 在场照常 ELIGIBLE（baggage 无影响）');
  ok(withSceneBaggage.characters['镜渊'].state === 'UNKNOWN', '镜渊：pov/present/goal/options 均不构成在场 → UNKNOWN');
  ok(base.state === withSceneBaggage.characters['林逸'].state, '谓词输出与 scene baggage 完全解耦');
  // SR / Desire / Goal / Option 直接注入 occurrences 之外的通道不存在（结构上不可能）——
  // 验证谓词签名只接受 occurrences
  const tryInject = evaluateSubjectEligibility({ characterId: '镜渊', occurrences: occs, sr: { x: 1 }, goal: '接管', desire: '赢', options: ['A'] });
  ok(tryInject.state === 'UNKNOWN', 'sr/goal/desire/options 注入被忽略 → 仍 UNKNOWN');
}

console.log('## 冻结边界');
{
  const r = evaluateSubjectEligibility({ characterId: '林逸', occurrences: [occ('e1', ['林逸'], 'x')] });
  ok(r.version === L1_ELIGIBILITY_VERSION, 'version');
  ok(r.provenance.actual_grounded_only === true && r.provenance.is_agency_truth === false
    && r.provenance.l1_internal === true, 'provenance：Actual-only · 非 Agency Truth · L1-internal');
  ok(!('agency' in r) && !('choice' in r) && !('access' in r), '无 agency/choice/access 字段');
}

console.log('## sidecar 旁路');
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'l1-elig-'));
  const rec = evaluateSceneSubjectEligibility({
    scene: { id: 's1', actualEvents: [occ('e1', ['林逸'], '林逸砸柜')] },
    characterNames: ['林逸'],
  });
  const w = saveL1Eligibility(dir, 1, rec);
  ok(w.written === true && w.path.includes('l1_eligibility'), 'sidecar 落 l1_eligibility 目录');
  const bag = JSON.parse(fs.readFileSync(w.path, 'utf8'));
  ok(bag.characters === undefined && bag.scenes[0].characters['林逸'].state === 'ELIGIBLE', '按场景分角色存储');
}

console.log(`\n# EO-L1-Subject-Eligibility-01: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
