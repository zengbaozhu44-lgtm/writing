#!/usr/bin/env node
/**
 * EO-R2-Consequence-Split-01 — Human Seal 2026-10-08 回归
 *
 * Seal：Experience consequence=OPTIONAL；WC Assertion consequence=REQUIRED+独立 grounding；
 *       kind 不决定必填性；消费者不得以字段非空性当 World Consequence（Risk 7）。
 *
 * 正 1–9：各 kind Experience + 空 consequence → PASS
 * 负 10–14：未发生 action / grounding 不成立 / excerpt 不成立 / actorEvidence 不成立 / source 禁令 → FAIL
 * 负 15–16：WC 断言 + 空 consequence → 不成立（WCT 层）；WC 断言 + 未接地 consequence → FAIL（gate+WCT 双层）
 * 边 17–21：不入 State Evolution / 单次经历不成 Belief / 无 Goal/Desire / 无 Choice / 消费者不认非空即 W
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateStoryEvent } from '../packages/inkos-brain/src/events/event-validator.js';
import { createStoryEvent, FORBIDDEN_EVENT_SOURCES } from '../packages/inkos-brain/src/events/story-event.schema.js';
import { extractStoryEventsLLMAssisted } from '../packages/inkos-brain/src/events/event-extractor-llm.js';
import { occurrenceYieldsGroundedWorldChange } from '../packages/inkos-brain/src/causality/world-consequence-truth.js';
import { resolveTimelineEvents } from '../packages/inkos-brain/src/memory/state-updater.js';
import { appendT2Experiences, loadCharacterWorld } from '../packages/inkos-brain/src/character/character-world.js';
import { assembleMinimalSR, formatCharacterSRForPrompt } from '../packages/inkos-core/src/lib/minimal-sr.js';

let pass = 0;
let fail = 0;
function ok(cond, label) {
  if (cond) { pass += 1; console.log(`  ok - ${label}`); }
  else { fail += 1; console.error(`  FAIL - ${label}`); }
}

const TEXT = '林逸摸到录音带，拇指抵住磁带壳的边角。他盯着清空回收站那个图标看了很久。最后林逸伸手，按下了那个键。';

function ev(kind, action, excerpt, extra = {}) {
  return createStoryEvent({
    id: `evt_r2_${kind}`, sceneId: 'r2s1', kind,
    actors: ['林逸'], action,
    consequence: '',
    stateChanges: extra.stateChanges || [`experience:${kind}`],
    affectedEntities: ['林逸'],
    evidence: { excerpt },
    source: 'annotated',
  });
}

console.log('# EO-R2-Consequence-Split-01（Human Seal 2026-10-08）');

console.log('## 正向 1–9 — Experience + 空 consequence → PASS（无 kind 表）');
{
  const cases = [
    ['informational', '林逸盯着清空回收站那个图标', '他盯着清空回收站那个图标'],
    ['social', '林逸摸到录音带', '林逸摸到录音带，拇指抵住磁带壳的边角'],
    ['environmental', '林逸摸到录音带', '林逸摸到录音带，拇指抵住磁带壳的边角'],
    ['daily', '林逸摸到录音带', '林逸摸到录音带，拇指抵住磁带壳的边角'],
    ['speech', '林逸伸手，按下了那个键', '林逸伸手，按下了那个键'],
    ['action', '林逸伸手，按下了那个键', '林逸伸手，按下了那个键'],
    ['discovery', '林逸摸到录音带', '林逸摸到录音带，拇指抵住磁带壳的边角'],
    ['movement', '林逸伸手', '最后林逸伸手，按下了那个键'],
    ['presence', '林逸摸到录音带，拇指抵住磁带壳的边角', '林逸摸到录音带，拇指抵住磁带壳的边角'],
  ];
  for (const [kind, action, excerpt] of cases) {
    const v = validateStoryEvent(ev(kind, action, excerpt), { text: TEXT });
    ok(v.ok, `${kind} Experience + 空 consequence → PASS${v.ok ? '' : `（${JSON.stringify(v.errors)}）`}`);
  }
}

console.log('## 负向 10–14 — Actual grounding 防线全部未降');
{
  const v10 = validateStoryEvent(ev('action', '林逸杀死了老周', '林逸摸到录音带，拇指抵住磁带壳的边角'), { text: TEXT });
  ok(!v10.ok && v10.errors.includes('action_not_grounded'), '10 未发生 action 仍 FAIL');
  const v11 = validateStoryEvent(ev('action', '林逸打开了窗户', '林逸伸手，按下了那个键'), { text: TEXT });
  ok(!v11.ok && v11.errors.includes('action_not_grounded'), '11 相似但未出现 action（grounding 不成立）仍 FAIL');
  const v12 = validateStoryEvent(ev('action', '林逸摸到录音带', '这句摘录完全不在正文里出现'), { text: TEXT });
  ok(!v12.ok && v12.errors.includes('evidence_not_in_text'), '12 excerpt 不成立仍 FAIL');
  // 13/14 走 producer 层（gateCandidate）与 source 禁令
  const bad13 = await extractStoryEventsLLMAssisted(
    { id: 'r2s1', index: 1, pov: '林逸', text: TEXT, characters: ['林逸'] },
    {
      knownNames: ['林逸'],
      proposer: async () => [{
        kind: 'informational', actors: ['林逸'], action: '林逸摸到录音带', consequence: '',
        stateChanges: ['experience:触摸'], affectedEntities: ['林逸'],
        excerpt: '林逸摸到录音带，拇指抵住磁带壳的边角', actorEvidence: '这段actor证据根本不在正文',
      }],
    },
  );
  ok(bad13.meta.fallbackUsed && bad13.meta.fallbackReason === 'all_candidates_rejected',
    '13 actorEvidence 不成立仍 FAIL（gateCandidate actorEvidence_not_literal）');
  const v14 = validateStoryEvent({ ...ev('action', '林逸摸到录音带', '林逸摸到录音带，拇指抵住磁带壳的边角'), source: FORBIDDEN_EVENT_SOURCES[0] }, { text: TEXT });
  ok(!v14.ok && v14.errors.some((e) => e.startsWith('forbidden_source')), '14 source 禁令仍 FAIL');
}

console.log('## 负向 15–16 — WC Assertion 的必填 + 独立 grounding（gate/WCT 层，未改）');
{
  const wct15 = occurrenceYieldsGroundedWorldChange(
    { actionContent: '林逸按下了删除键' },
    { consequence: '', evidence: { offset: 0 }, stateChanges: ['experience:删除抉择'] },
    TEXT,
  );
  ok(wct15.ok === false, `15 WC 断言 + 空 consequence → W 不成立（reason=${wct15.reason}）`);
  const bad16 = await extractStoryEventsLLMAssisted(
    { id: 'r2s1', index: 1, pov: '林逸', text: TEXT, characters: ['林逸'] },
    {
      knownNames: ['林逸'],
      proposer: async () => [{
        kind: 'action', actors: ['林逸'], action: '林逸摸到录音带', consequence: '天空瞬间变成了绿色',
        stateChanges: ['experience:触摸'], affectedEntities: ['林逸'],
        excerpt: '林逸摸到录音带，拇指抵住磁带壳的边角', actorEvidence: '林逸摸到录音带',
      }],
    },
  );
  ok(bad16.meta.fallbackUsed && bad16.meta.fallbackReason === 'all_candidates_rejected',
    '16a WC 断言 + 未接地 consequence → gate FAIL（consequence_echo_or_ungrounded）');
  const wct16 = occurrenceYieldsGroundedWorldChange(
    { actionContent: '林逸摸到录音带' },
    { consequence: '天空瞬间变成了绿色', evidence: { offset: 0 }, stateChanges: [] },
    TEXT,
  );
  ok(wct16.ok === false, `16b WC 断言 + 未接地 consequence → W 不成立（reason=${wct16.reason}）`);
}

console.log('## 边界 17–21 — Truth Boundary 不变');
{
  const sceneWithExp = { id: 'r2s1', index: 1, pov: '林逸', characters: ['林逸'], text: TEXT, actualEvents: [ev('informational', '林逸摸到录音带', '林逸摸到录音带，拇指抵住磁带壳的边角')] };
  ok(resolveTimelineEvents({ scenes: [sceneWithExp], intent: {}, causalChain: null }).length === 0,
    '17 Experience 不自动进入 State Evolution（timeline 恒空，EO-P2）');

  const book = fs.mkdtempSync(path.join(os.tmpdir(), 'r2eo-'));
  fs.mkdirSync(path.join(book, 'novel', '_system'), { recursive: true });
  // G1-A/S-A fixture supply：T2 Subject 须 resolve 到 03 录取 Character
  fs.mkdirSync(path.join(book, 'novel', '03_character_bible'), { recursive: true });
  fs.writeFileSync(path.join(book, 'novel', '03_character_bible', '林逸.md'), '# 林逸\nG1-A fixture 身份录取。\n');
  appendT2Experiences(book, { scene: sceneWithExp, chapter: 1, candidateNames: ['林逸'] });
  const world = loadCharacterWorld(book);
  const formations = Object.values(world.characters || {}).flatMap((c) => c.formations || []);
  ok(formations.length === 0, '18 单次 Experience 不成 Belief（T3 通道 A 需 ≥2 独立实际 / 通道 B authored seal）');
  const t2count = Object.values(world.characters || {}).flatMap((c) => c.experiences || []).length;
  ok(t2count >= 1, `18b 但 Experience 已入 T2（实得 ${t2count} 条——记录不等于成型）`);

  const srRender = formatCharacterSRForPrompt(assembleMinimalSR({ ctx: {}, names: ['林逸'] }));
  ok(!/\*\*Goal\*\*|\*\*Desire\*\*/.test(srRender), '19 SR 无 Goal/Desire 槽（Experience 不生成目标欲望）');
  ok(!/\*\*Choice\*\*/.test(srRender) && !('choice' in ev('action', '林逸摸到录音带', '林逸摸到录音带')), '20 Experience 不形成 Choice（无 Choice 字段/槽）');

  const wct21 = occurrenceYieldsGroundedWorldChange(
    { actionContent: '林逸摸到录音带' },
    { consequence: '场面叙述成为后续可引用事实', evidence: { offset: 0 }, stateChanges: [] },
    TEXT,
  );
  ok(wct21.ok === false, '21 消费者不认非空即 W：公式化 consequence 亦无法通过 WCT 复验（Risk 7 Seal 行为级验证）');
  fs.rmSync(book, { recursive: true, force: true });
}

console.log(`\n# 结果: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
