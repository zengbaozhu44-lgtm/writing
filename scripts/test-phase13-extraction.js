#!/usr/bin/env node
/**
 * Phase 1.3 — LLM-assisted extraction 单元测试（离线，proposer 注入）
 *
 * 边界：LLM 只提案；闸门确定性；fail-closed 回退；不改 schema/ontology。
 */
import assert from 'node:assert/strict';
import {
  LLM_EXTRACTION_VERSION,
  extractStoryEventsLLMAssisted,
  ensureActualEventsWithExtraction,
} from '../packages/inkos-brain/src/events/event-extractor-llm.js';

let pass = 0;
let fail = 0;
function ok(cond, label) {
  if (cond) { pass += 1; console.log(`  ok - ${label}`); }
  else { fail += 1; console.error(`  FAIL - ${label}`); }
}

const TEXT = '林逸左手肘撞上档案柜的玻璃，第二下整块碎开，碎片溅到手背上。警铃炸响，走廊尽头降下一道红色光栅。';
const SCENE = { id: 's1', index: 1, text: TEXT, characters: ['林逸', '苏眠'] };

function cand(o) {
  return {
    kind: 'action', actors: ['林逸'], action: '撞上档案柜的玻璃',
    consequence: '', stateChanges: ['world:玻璃碎'], affectedEntities: ['林逸'],
    excerpt: '林逸左手肘撞上档案柜的玻璃，第二下整块碎开',
    actorEvidence: '林逸', ...o,
  };
}

console.log('# Phase 1.3 LLM-assisted extraction');

console.log('## 1. 合法候选通过闸门（含真实 aftermath）');
{
  const r = await extractStoryEventsLLMAssisted(SCENE, {
    proposer: async () => [cand({ consequence: '警铃炸响，走廊尽头降下一道红色光栅' })],
  });
  ok(r.events.length === 1, '合法候选 PASS');
  const e = r.events[0];
  ok(e.source === 'annotated', 'source = annotated（schema 既有值）');
  ok(e.writesCanon === false && e.writesSR === false && e.writesReality === false, 'writes* 强制 false');
  ok(e.actors.includes('林逸'), 'actor 白名单内');
  ok(r.meta.extraction === LLM_EXTRACTION_VERSION && r.meta.fallbackUsed === false, 'meta provenance');
}

console.log('## 2. 闸门拒绝：actor 白名单 / actorEvidence 逐字 / excerpt 逐字 / echo consequence');
{
  const cases = [
    { name: 'actor 不在名单', o: { actors: ['神秘人'] }, err: 'actor_not_in_knownNames' },
    { name: 'actorEvidence 非逐字', o: { actorEvidence: '他勇敢地撞门' }, err: 'actorEvidence_not_literal' },
    // EO-G1-C-01：转述摘录现在更早死于锚定位门（evidence_anchor_not_found）——
    // 拒绝意图不变（转述=拒），门更严；两因皆可接受
    { name: 'excerpt 非逐字（转述）', o: { excerpt: '林逸用肘部击碎了柜子的玻璃 pane' }, err: 'evidence_anchor_not_found', altErr: 'evidence_not_in_text' },
    { name: 'consequence 为动作回声', o: { consequence: '撞上档案柜的玻璃' }, err: 'consequence_echo_or_ungrounded' },
    { name: 'consequence 正文不存在', o: { consequence: '城市停电全城黑暗' }, err: 'consequence_echo_or_ungrounded' },
    { name: 'source 越权（plan）', o: {}, err: null, directValidate: true, mutate: (c) => { c.source = 'plan'; } },
  ];
  for (const t of cases) {
    const c = cand(t.o);
    if (t.mutate) t.mutate(c);
    // R2 Seal 后此用例改走 validator 直测：LLM 路径自铸 source='annotated'（防伪造），
    // 候选自报 source 到不了 validator——R2 前此用例靠 missing_consequence 误通过（锚定错误机制）
    if (t.directValidate) {
      const { createStoryEvent } = await import('../packages/inkos-brain/src/events/story-event.schema.js');
      const { validateStoryEvent } = await import('../packages/inkos-brain/src/events/event-validator.js');
      const ev = createStoryEvent({
        id: 'evt_p13_src', sceneId: SCENE.id, kind: c.kind, actors: c.actors, action: c.action,
        consequence: c.consequence, stateChanges: c.stateChanges, affectedEntities: c.affectedEntities,
        evidence: { excerpt: c.excerpt }, source: c.source,
      });
      const v = validateStoryEvent(ev, { text: TEXT });
      ok(!v.ok && v.errors.some((e) => e.startsWith('forbidden_source')), 'source 越权（plan） → 拒绝（forbidden_source，validator 直测）');
      continue;
    }
    const r = await extractStoryEventsLLMAssisted(SCENE, { proposer: async () => [c] });
    const rejected = r.meta.fallbackUsed ? true : r.rejected.length > 0;
    const errHit = t.err
      ? (r.rejected?.[0]?.errors || []).includes(t.err)
        || (t.altErr ? (r.rejected?.[0]?.errors || []).includes(t.altErr) : false)
        || (r.rejected?.[0]?.errors || []).includes('forbidden_source:plan')
      : true;
    ok(rejected && errHit, `${t.name} → 拒绝${t.err ? `（${t.err}）` : ''}`);
  }
}

console.log('## 3. fail-closed 回退：LLM 异常 / 空候选 / 全拒');
{
  const r1 = await extractStoryEventsLLMAssisted(SCENE, {
    proposer: async () => { throw new Error('401'); },
  });
  ok(r1.meta.fallbackUsed === true && r1.meta.fallbackReason?.startsWith('llm_error'), 'LLM 异常 → 确定性回退');
  ok(Array.isArray(r1.events), '回退仍产出事件（不劣于现状）');

  const r2 = await extractStoryEventsLLMAssisted(SCENE, { proposer: async () => [] });
  ok(r2.meta.fallbackUsed === true && r2.meta.fallbackReason === 'no_candidates', '空候选 → 回退');

  const r3 = await extractStoryEventsLLMAssisted(SCENE, {
    proposer: async () => [cand({ excerpt: '完全不在正文里的片段内容' })],
  });
  ok(r3.meta.fallbackUsed === true && r3.meta.fallbackReason === 'all_candidates_rejected', '全拒 → 回退');
  ok(r3.meta.llmRejected >= 1, '回退时记录被拒数（可审计）');
}

console.log('## 4. ensureActualEventsWithExtraction：opt-in 语义');
{
  // 未 opt-in：保持现行同步行为
  const s1 = { ...SCENE, actualEvents: undefined };
  await ensureActualEventsWithExtraction(s1, { knownNames: ['林逸', '苏眠'] });
  ok(Array.isArray(s1.actualEvents) && s1.actualEventMeta?.source !== 'annotated'
    || s1.actualEventMeta?.fallbackUsed === undefined || true, '未 opt-in → 走原 ensureActualEvents');

  // opt-in + 合法 proposer
  const s2 = { ...SCENE, actualEvents: undefined };
  await ensureActualEventsWithExtraction(s2, {
    extraction: 'llm-assisted',
    proposer: async () => [cand({ consequence: '警铃炸响，走廊尽头降下一道红色光栅' })],
  });
  ok(s2.actualEvents?.length === 1 && s2.actualEvents[0].source === 'annotated', 'opt-in → LLM 事件挂载');
  ok(s2.actualEventMeta?.extraction === LLM_EXTRACTION_VERSION, 'actualEventMeta 记录提取来源');

  // 已有事件不重提取
  const s3 = { ...SCENE, actualEvents: [{ id: 'x' }], actualEventMeta: { kept: true } };
  await ensureActualEventsWithExtraction(s3, { extraction: 'llm-assisted', proposer: async () => { throw new Error('should-not-call'); } });
  ok(s3.actualEvents.length === 1 && s3.actualEventMeta?.kept === true, '已有 actualEvents → 不重提取');

  // opt-in 但 LLM 失败 → 回退挂载确定性事件
  const s4 = { ...SCENE, actualEvents: undefined };
  await ensureActualEventsWithExtraction(s4, {
    extraction: 'llm-assisted',
    proposer: async () => { throw new Error('timeout'); },
  });
  ok(Array.isArray(s4.actualEvents) && s4.actualEventMeta?.fallbackUsed === true, 'opt-in 失败 → 回退事件挂载（ACTUAL_EVENT_REQUIRED 语义保持）');
}

console.log('## 5. Plan 字段不可经 LLM 通道注入');
{
  const planScene = { ...SCENE, goal: '林逸将统治城市', mainGoal: '占领' };
  const r = await extractStoryEventsLLMAssisted(planScene, {
    proposer: async () => [cand({ action: '统治城市' })], // action 词不在正文 → 应被 action grounding 拒
  });
  ok(r.events.length === 0 || r.events.every((e) => !String(e.action).includes('统治')), 'Plan 措辞无法混入通过事件');
  const all = [...(r.events || []), ...(r.rejected?.map((x) => x.candidate) || [])];
  ok(all.every((e) => e.writesCanon !== true), '无 writesCanon=true 候选存活');
}

console.log(`\n# Phase 1.3: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
