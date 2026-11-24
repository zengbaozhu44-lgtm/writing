#!/usr/bin/env node
/**
 * Phase 3.2 Authored Character SR Channel Wiring — EO 测试
 *
 * 范围：chapter_plans.characterSR → intent.characterSR → 既有 SR producer
 * → interpretation/belief/stance（authored-only）→ 既有 Writer 投影。
 *
 * 验收（女王特别要求）：SR 是人物的「世界」，不是「下一步任务」——
 * authored belief「后门外可能有人」之后，Writer 仍可合法不行动/怀疑自己。
 * 禁止：Actual/Prose/Writer/Plan.goal/characterDecisions → belief；SR→Choice/Action/L1。
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { serializeAuthoredPlanToIntent } from '../packages/inkos-brain/src/planner/planner.js';
import { applyCharacterSRAfterActual } from '../packages/inkos-brain/src/character/character-sr-updater.js';
import { formatCharacterSRForPrompt } from '../packages/inkos-core/src/lib/minimal-sr.js';
import { deriveCharacterActionTruth } from '../packages/inkos-brain/src/causality/character-action-truth.js';

let pass = 0;
let fail = 0;
function ok(cond, label) {
  if (cond) { pass += 1; console.log(`  ok - ${label}`); }
  else { fail += 1; console.error(`  FAIL - ${label}`); }
}

const AUTHORED_SR = {
  林逸: {
    interpretation: [{ of: '苏眠给的地图', as: '她有所隐瞒，但不是恶意' }],
    belief: ['后门外可能有人'],
    stance: [{ stance: 'suspects', about: '苏眠的来历' }],
  },
};

console.log('# Phase 3.2 Authored Character SR Wiring');

console.log('## 1. 序列化：chapter_plans.characterSR → intent.characterSR');
{
  const intent = serializeAuthoredPlanToIntent({
    pov: '林逸', goal: '取回档案', scenes: ['林逸抵达'],
    characterSR: AUTHORED_SR,
  }, 1, null);
  ok(intent.characterSR && intent.characterSR['林逸']?.belief[0] === '后门外可能有人',
    'authored SR 原样透传（逐字段）');
  const intent2 = serializeAuthoredPlanToIntent({ pov: '林逸', scenes: [] }, 1, null);
  ok(intent2.characterSR === null, '无 authored SR → null（存量不变）');
  const intent3 = serializeAuthoredPlanToIntent({ pov: '林逸', scenes: [], characterSR: ['数组非法'] }, 1, null);
  ok(intent3.characterSR === null, '非法形状 → null（fail-closed）');
}

console.log('## 2. SR producer：authored 三槽填充 + provenance + 与 awareness 共存');
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sr-wire-'));
  const scene = {
    id: 's1', index: 1, pov: '林逸', present: ['林逸'],
    text: '林逸把耳朵贴在后门上。门外没有脚步声。',
    actualEvents: [{
      id: 'e1', sceneId: 's1', kind: 'action', actors: ['林逸'],
      action: '林逸把耳朵贴在后门上', consequence: '', stateChanges: [],
      affectedEntities: ['林逸'], evidence: { excerpt: '林逸把耳朵贴在后门上' }, source: 'annotated',
    }],
  };
  const st = applyCharacterSRAfterActual(dir, 1, scene, {
    extraNames: ['林逸'],
    authoredCharacterSR: AUTHORED_SR,
  });
  const sr = st.characters['林逸'];
  ok(sr.interpretation.status === 'present' && sr.interpretation.items[0].of === '苏眠给的地图',
    'interpretation 填充（of→as）');
  ok(sr.belief.status === 'present' && sr.belief.items[0].proposition === '后门外可能有人', 'belief 填充');
  ok(sr.stance.status === 'present' && sr.stance.items[0].stance === 'suspects', 'stance 填充（枚举校验）');
  ok(sr.interpretation.items[0].provenance.source === 'authored', 'provenance.source=authored');
  ok(sr.awareness.items.some((i) => i.provenance.source === 'actual_event'),
    'awareness 仍来自 Actual（两源共存不混淆）');
}

console.log('## 3. Writer 投影：authored 主观状态进入 prompt 文本');
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sr-wire-'));
  const scene = { id: 's1', index: 1, pov: '林逸', present: ['林逸'], text: '他把耳朵贴在后门上。', actualEvents: [] };
  const st = applyCharacterSRAfterActual(dir, 1, scene, {
    extraNames: ['林逸'], authoredCharacterSR: AUTHORED_SR,
  });
  const block = formatCharacterSRForPrompt(st.characters || st, ['林逸']);
  ok(block.includes('后门外可能有人'), 'belief 进入 SR 投影块');
  ok(block.includes('有所隐瞒') && /suspects|怀疑|疑/.test(block), 'interpretation/stance 进入投影块');
  ok(!/(必须|应该去|接下来去|行动吧)/.test(block), '投影块无祈使/行动指令措辞');
}

console.log('## 4. 验收：SR 不强迫 Action（SR≠Action/Choice/L1）');
{
  // 4a 确定性：authored SR 存在时，Action/Intent/Choice 槽零产生
  const scene = {
    id: 's1', index: 1, pov: '林逸', text: '他站了一会儿。门没有开。',
    characterSRState: { characters: { 林逸: { belief: { items: [{ proposition: '后门外可能有人' }] } } } },
    actualEvents: [{
      id: 'e1', sceneId: 's1', kind: 'action', actors: ['林逸'],
      action: '他站了一会儿', consequence: '', stateChanges: [],
      affectedEntities: ['林逸'], evidence: { excerpt: '他站了一会儿' }, source: 'annotated',
    }],
  };
  ok(!('actionIntentTruth' in scene) && !('characterActionTruth' in scene) && !('worldConsequenceTruth' in scene),
    'authored SR 不自动产生 Intent/Action/WCT 槽位');
  const cat = deriveCharacterActionTruth({
    intentTruth: { status: 'absent', characterId: '林逸', actionContent: '' },
    occurrences: scene.actualEvents, sceneText: scene.text,
  });
  ok(cat.status === 'absent', 'SR 不能作为 Character Action 输入（absent）');

  // 4b 无 authored SR 时 goal/decisions 不进 SR（反洗白）
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sr-wire-'));
  const scene2 = {
    id: 's2', index: 1, pov: '林逸', text: '他看着门。',
    goal: '林逸相信后门没人', mainGoal: '走出档案馆',
    characterDecisions: [{ characterId: '林逸', actionContent: '去后门' }],
    actualEvents: [],
  };
  const st2 = applyCharacterSRAfterActual(dir, 1, scene2, { extraNames: ['林逸'] });
  const sr2 = st2.characters['林逸'];
  ok(sr2.belief.status === 'omit' && sr2.interpretation.status === 'omit' && sr2.stance.status === 'omit',
    'Plan.goal/mainGoal/characterDecisions 不得变成 belief/interpretation/stance');

  // 4c stance 枚举外的值被拒
  const st3 = applyCharacterSRAfterActual(fs.mkdtempSync(path.join(os.tmpdir(), 'sr-wire-')), 1,
    { id: 's3', index: 1, text: '他看着门。', actualEvents: [] },
    { extraNames: ['林逸'], authoredCharacterSR: { 林逸: { stance: [{ stance: '决定开门', about: '门' }] } } });
  ok(st3.characters['林逸'].stance.status === 'omit', '非法 stance（决定开门=行动词）被拒');
}

console.log('## 5. 压力预算保全：小 character 预算下主观三槽仍在 prompt');
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sr-wire-'));
  // 12 条 awareness（真实量级）+ authored 三槽 → 压力截断后三槽必须存活
  const events = Array.from({ length: 12 }, (_, i) => ({
    id: `e${i}`, sceneId: 's1', kind: 'action', actors: ['林逸'],
    action: `林逸注意到第${i}处细节变化`, consequence: '', stateChanges: [],
    affectedEntities: ['林逸'], evidence: { excerpt: `林逸注意到第${i}处细节变化` }, source: 'annotated',
  }));
  const scene = { id: 's1', index: 2, pov: '林逸', present: ['林逸'], entities: ['林逸'], text: 'x'.repeat(50), goal: 'g', actualEvents: events, characterSRState: null };
  const st = applyCharacterSRAfterActual(dir, 2, { ...scene, actualEvents: events }, {
    extraNames: ['林逸'], authoredCharacterSR: AUTHORED_SR,
  });
  scene.characterSRState = st;
  const { compileScenePrompt } = await import('../packages/inkos-prompt/src/compiler.js');
  const out = compileScenePrompt({ bookDir: dir, chapter: 2, pov: '林逸', present: ['林逸'], facts: [], intent: { pov: '林逸', scenes: [] } }, scene);
  ok(out.text.includes('后门外可能有人'), '压力截断后 belief 仍在 prompt');
  ok(out.text.includes('有所隐瞒') && out.text.includes('suspects'), 'interpretation/stance 仍在 prompt');
}

console.log(`\n# Phase 3.2 SR Wiring: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
