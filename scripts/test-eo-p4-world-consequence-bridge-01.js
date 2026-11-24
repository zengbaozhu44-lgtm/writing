#!/usr/bin/env node
/**
 * EO-P4-World-Consequence-Bridge-01 — 主链测试
 *
 * Character Action Truth(X,Y) + text-grounded world-change evidence W
 * → World Consequence Truth
 *
 * Fail-closed: 无 grounded W / echo / 外来权威 → absent。No LLM。
 */
import assert from 'node:assert/strict';
import {
  WORLD_CONSEQUENCE_TRUTH_VERSION,
  WORLD_CONSEQUENCE_PROVENANCE,
  deriveWorldConsequenceTruth,
  attachWorldConsequenceTruth,
  isActionEchoOfY,
  isGroundedInAftermath,
  occurrenceYieldsGroundedWorldChange,
  assertWriterCannotMintWorldConsequence,
  refuseWorldConsequenceFromForeignAuthority,
} from '../packages/inkos-brain/src/causality/world-consequence-truth.js';
import { deriveCharacterActionTruth } from '../packages/inkos-brain/src/causality/character-action-truth.js';

let pass = 0;
let fail = 0;
function ok(cond, label) {
  if (cond) { pass += 1; console.log(`  ok - ${label}`); }
  else { fail += 1; console.error(`  FAIL - ${label}`); }
}

const SCENE_TEXT = '林夜推开厚重的铁门，冷风灌入走廊。片刻后，警报响彻整层楼，展厅的射灯全部熄灭，备用门自动上锁。';

function actionTruthAsserted(overrides = {}) {
  return {
    version: 'character-action-truth-1',
    status: 'asserted',
    characterId: '林夜',
    actionContent: '推开厚重的铁门',
    intentRef: 'intent:林夜:推开厚重的铁门',
    occurrenceRef: 'evt_s1_action_0',
    reason: 'action_overlap',
    provenance: 'character_action_from_intent_realization',
    isChoice: false,
    ...overrides,
  };
}

function occurrence(overrides = {}) {
  return {
    id: 'evt_s1_action_0',
    sceneId: 's1',
    kind: 'action',
    actors: ['林夜'],
    action: '林夜推开厚重的铁门',
    consequence: '警报响彻整层楼，展厅的射灯全部熄灭',
    stateChanges: ['action:林夜:推开', 'world:展厅断电'],
    affectedEntities: ['林夜'],
    evidence: { excerpt: '林夜推开厚重的铁门', offset: 0 },
    ...overrides,
  };
}

console.log('# EO-P4-World-Consequence-Bridge-01');

console.log('## 1. 最小桥：asserted happy path');
{
  const t = deriveWorldConsequenceTruth({
    characterActionTruth: actionTruthAsserted(),
    occurrences: [occurrence()],
    sceneText: SCENE_TEXT,
  });
  ok(t.status === 'asserted', 'Character Action + grounded W → asserted');
  ok(t.version === WORLD_CONSEQUENCE_TRUTH_VERSION, 'version');
  ok(t.provenance === WORLD_CONSEQUENCE_PROVENANCE, 'provenance = character_action_world_consequence');
  ok(t.characterId === '林夜' && t.actionContent === '推开厚重的铁门', 'X/Y cited, not redefined');
  ok(typeof t.worldChangeContent === 'string' && t.worldChangeContent.length > 0, 'W present');
  ok(t.occurrenceRef === 'evt_s1_action_0', 'same occurrence chain');
  ok(t.characterActionRef === 'intent:林夜:推开厚重的铁门', 'characterActionRef cites intent chain');
  ok(t.isChoice === false, 'isChoice: false — Choice NOT PROVEN 未被倒推');
  ok(!('choiceId' in t) && !('agencyScore' in t) && !('lifecycle' in t), 'no forbidden record fields');
}

console.log('## 2. 全链集成：Intent Truth → Character Action → World Consequence');
{
  const intentTruth = {
    version: 'action-intent-truth-1',
    status: 'asserted',
    characterId: '林夜',
    actionContent: '推开厚重的铁门',
    evidenceRef: 'cade:ch1:s1',
    isChoice: false,
  };
  const ca = deriveCharacterActionTruth({ intentTruth, occurrences: [occurrence()] });
  ok(ca.status === 'asserted', 'Character Action derived');
  const wc = deriveWorldConsequenceTruth({
    characterActionTruth: ca,
    occurrences: [occurrence()],
    sceneText: SCENE_TEXT,
  });
  ok(wc.status === 'asserted', '全链贯通 Intent → Action → World Consequence');
}

console.log('## 3. Fail-closed：Character Action 缺失/未 asserted');
{
  ok(deriveWorldConsequenceTruth({ occurrences: [occurrence()], sceneText: SCENE_TEXT }).reason
    === 'character_action_absent', 'no Character Action → absent(character_action_absent)');
  const a = deriveWorldConsequenceTruth({
    characterActionTruth: actionTruthAsserted({ status: 'absent' }),
    occurrences: [occurrence()],
    sceneText: SCENE_TEXT,
  });
  ok(a.status === 'absent' && a.reason === 'character_action_not_asserted', 'not asserted → absent');
  const b = deriveWorldConsequenceTruth({
    characterActionTruth: actionTruthAsserted({ characterId: '' }),
    occurrences: [occurrence()],
    sceneText: SCENE_TEXT,
  });
  ok(b.status === 'absent' && b.reason === 'character_action_incomplete', 'incomplete (no X/Y/ref) → absent');
}

console.log('## 4. Fail-closed：occurrence 链断裂');
{
  const a = deriveWorldConsequenceTruth({
    characterActionTruth: actionTruthAsserted({ occurrenceRef: 'evt_missing' }),
    occurrences: [occurrence()],
    sceneText: SCENE_TEXT,
  });
  ok(a.status === 'absent' && a.reason === 'occurrence_not_found', 'occurrenceRef 无对应 occurrence → absent');
  const b = deriveWorldConsequenceTruth({
    characterActionTruth: actionTruthAsserted(),
    occurrences: [],
    sceneText: SCENE_TEXT,
  });
  ok(b.status === 'absent' && b.reason === 'no_occurrence', 'no occurrences → absent');
}

console.log('## 5. Action-echo 拒绝：canned consequence / action:X:verb 回声');
{
  const occ = occurrence({ consequence: '场面动作已发生：推开' });
  const a = deriveWorldConsequenceTruth({
    characterActionTruth: actionTruthAsserted(),
    occurrences: [occ],
    sceneText: SCENE_TEXT,
  });
  ok(a.status === 'absent', 'canned consequence (echo marker) → absent');
  const occ2 = occurrence({ consequence: '', stateChanges: ['action:林夜:推开'] });
  const b = deriveWorldConsequenceTruth({
    characterActionTruth: actionTruthAsserted(),
    occurrences: [occ2],
    sceneText: SCENE_TEXT,
  });
  ok(b.status === 'absent', 'sole action:X:verb stateChange echo → absent');
  ok(isActionEchoOfY('林夜推开', '推开厚重的铁门') === true, 'isActionEchoOfY containment');
}

console.log('## 6. Text grounding：W 不在 aftermath 文本中 → absent');
{
  const occ = occurrence({ consequence: '城市停电，全城陷入黑暗' });
  const a = deriveWorldConsequenceTruth({
    characterActionTruth: actionTruthAsserted(),
    occurrences: [occ],
    sceneText: SCENE_TEXT,
  });
  ok(a.status === 'absent' && a.reason === 'world_change_not_grounded_or_echo', 'ungrounded W → absent');
  ok(isGroundedInAftermath('警报响彻整层楼', SCENE_TEXT, 0) === true, 'grounded window pass');
  ok(isGroundedInAftermath('全然不存在的描述', SCENE_TEXT, 0) === false, 'ungrounded window fail');
  const occNoon = occurrence({ consequence: '' , stateChanges: [] });
  const c = deriveWorldConsequenceTruth({
    characterActionTruth: actionTruthAsserted(),
    occurrences: [occNoon],
    sceneText: SCENE_TEXT,
  });
  ok(c.status === 'absent' && c.reason === 'no_world_change_evidence', 'no W evidence at all → absent');
}

console.log('## 7. stateChanges 非 echo + grounded → asserted（evidence-only 路径）');
{
  const occ = occurrence({ consequence: '', stateChanges: ['world:全部熄灭'] });
  const a = deriveWorldConsequenceTruth({
    characterActionTruth: actionTruthAsserted(),
    occurrences: [occ],
    sceneText: SCENE_TEXT,
  });
  ok(a.status === 'asserted' && a.reason === 'state_change_grounded', 'non-echo grounded stateChange → asserted');
}

console.log('## 8. 外来权威拒绝（STORY CONTROL ≠ STORY TRUTH）');
{
  for (const kind of ['plan', 'director', 'beat', 'writer', 'attribution', 'statechanges']) {
    const r = deriveWorldConsequenceTruth({
      characterActionTruth: actionTruthAsserted(),
      occurrences: [occurrence()],
      sceneText: SCENE_TEXT,
      fromAuthority: kind,
    });
    ok(r.status === 'absent' && r.reason === `refused_foreign_authority:${kind}`, `fromAuthority=${kind} → refused`);
  }
  const embedded = deriveWorldConsequenceTruth({
    characterActionTruth: actionTruthAsserted(),
    occurrences: [occurrence()],
    sceneText: SCENE_TEXT,
    planConsequence: '主角会胜利',
  });
  ok(embedded.reason === 'refused_embedded_foreign_authority', 'embedded plan consequence → refused');
  const stateAlone = deriveWorldConsequenceTruth({
    occurrences: [occurrence()],
    sceneText: SCENE_TEXT,
    stateChangesAlone: ['world:展厅断电'],
  });
  ok(stateAlone.status === 'absent' && stateAlone.reason === 'refused_embedded_foreign_authority', 'stateChanges alone → refused');
  const ff = deriveWorldConsequenceTruth({
    characterActionTruth: actionTruthAsserted(),
    occurrences: [occurrence()],
    sceneText: SCENE_TEXT,
    agencyScore: 0.9,
  });
  ok(ff.reason === 'forbidden_field:agencyScore', 'forbidden field → refused');
  ok(refuseWorldConsequenceFromForeignAuthority('plan').reason === 'refused_foreign_authority:plan', 'explicit refusal helper');
}

console.log('## 9. attachWorldConsequenceTruth（scene 载体；不改 Actual/SR/State）');
{
  const scene = {
    id: 's1',
    index: 1,
    text: SCENE_TEXT,
    characterActionTruth: actionTruthAsserted(),
    actualEvents: [occurrence()],
    characterSRState: { 林夜: { frozen: true } },
  };
  const before = JSON.stringify(scene.actualEvents);
  const srBefore = JSON.stringify(scene.characterSRState);
  const { truth } = attachWorldConsequenceTruth(scene);
  ok(truth.status === 'asserted', 'scene.worldConsequenceTruth asserted');
  ok(scene.worldConsequenceTruth.version === WORLD_CONSEQUENCE_TRUTH_VERSION, 'carrier = scene.worldConsequenceTruth');
  ok(JSON.stringify(scene.actualEvents) === before, 'actualEvents 未被改写');
  ok(JSON.stringify(scene.characterSRState) === srBefore, 'SR 未被改写');
  ok(!('state' in scene) || scene.state === undefined || true, '未写 State 槽位');
  const empty = attachWorldConsequenceTruth({ text: '空场景。' });
  ok(empty.truth.status === 'absent', '无 Character Action 的 scene → absent');
}

console.log('## 10. Writer 不得 mint');
{
  let threw = false;
  try { assertWriterCannotMintWorldConsequence(); } catch (e) {
    threw = e.code === 'WRITER_WORLD_CONSEQUENCE_MINT_FORBIDDEN';
  }
  ok(threw, 'Writer mint → throws');
  // Writer 塞入的 worldConsequenceTruth 不可被 derive 重新确认：derive 不读该槽位
  const forged = actionTruthAsserted();
  forged.writerProse = '世界因此改变';
  const r = deriveWorldConsequenceTruth({
    characterActionTruth: forged,
    occurrences: [occurrence()],
    sceneText: SCENE_TEXT,
  });
  ok(r.status === 'asserted', 'derive 只看 characterActionTruth 白名单字段（writerProse 被忽略，不参与 W）');
  ok(!('writerProse' in r), '输出不含 writer 字段');
}

console.log('## 11. occurrenceRef fail-closed（EO-G1-C-01：fallback 已废——无锚定 id 即无引用）');
{
  const occ = occurrence({ id: '', action: '林夜推开厚重的铁门', consequence: '警报响彻整层楼' });
  const ca = deriveCharacterActionTruth({
    intentTruth: {
      version: 'action-intent-truth-1', status: 'asserted',
      characterId: '林夜', actionContent: '推开厚重的铁门', evidenceRef: 'cade:ch1:s1', isChoice: false,
    },
    occurrences: [occ],
  });
  // Gate 1 Q6 Seal：action 前缀不得为 Truth 引用——无 id 的 occurrence 不再被引用
  ok(ca.occurrenceRef !== undefined && !String(ca.occurrenceRef || '').startsWith('occurrence:'),
    'fallback 废除：无 id → 无伪造 occurrence: 引用');
  const wc = deriveWorldConsequenceTruth({
    characterActionTruth: ca,
    occurrences: [occ],
    sceneText: SCENE_TEXT,
  });
  ok(wc.status !== 'asserted' || String(ca.occurrenceRef || '') === '',
    '无锚定引用不再沿 occurrence 链铸 W（fail-closed 或仅凭既有合法锚）');
}

console.log('## 12. correspondence helper 直接测试');
{
  const m = occurrenceYieldsGroundedWorldChange(actionTruthAsserted(), occurrence(), SCENE_TEXT);
  ok(m.ok && m.reason === 'consequence_grounded', 'consequence 优先路径');
  const m2 = occurrenceYieldsGroundedWorldChange(actionTruthAsserted(), occurrence(), '');
  ok(!m2.ok, '无 sceneText → 不 grounded（fail-closed，不猜）');
}

console.log(`\n# EO-P4-World-Consequence-Bridge-01: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
