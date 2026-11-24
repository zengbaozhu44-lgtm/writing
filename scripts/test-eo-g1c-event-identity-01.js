#!/usr/bin/env node
/**
 * EO-G1-C-01 — Event Identity（Gate 1 Q6 Seal · 修正版）
 *
 * T1 同场景同文本重跑 → id 相同
 * T2 候选顺序扰动 → id 不变（锚组分完整：excerpt 逐字命中 offset）
 * T3 同摘录双现 → 两 offset 两 id / 单独 derive fail-closed
 * T4 LLM/deterministic 同锚（同 sceneId+raw excerpt+offset）→ 同 id
 * T5 异摘录（同底层动作）→ 异 id，不合并（equivalence NOT DEFINED）
 * T6 LLM 不可唯一定位（NOT_FOUND/AMBIGUOUS）→ fail-closed
 * T7 无锚无 id → schema 不铸 hash id
 * T8 无 id 事件 → 消费侧零伪造引用（无 occurrence: 前缀 / 无空 record）
 * T9 同 Actual 重放 → T2 幂等零双记
 * T10 重复提取不伪装 ≥2 独立实际（T3 通道 A 拒绝同 ref 冒充）
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { mintEventIdentity, deriveEventIdentityFromText } from '../packages/inkos-brain/src/events/event-identity.js';
import { createStoryEvent } from '../packages/inkos-brain/src/events/story-event.schema.js';
import { extractStoryEventsFromScene } from '../packages/inkos-brain/src/events/event-extractor.js';
import { extractStoryEventsLLMAssisted } from '../packages/inkos-brain/src/events/event-extractor-llm.js';
import { appendT2Experiences, loadCharacterWorld, materializeT3Formation, seedFile } from '../packages/inkos-brain/src/character/character-world.js';

let pass = 0;
let fail = 0;
function ok(cond, label) {
  if (cond) { pass += 1; console.log(`  ok - ${label}`); }
  else { fail += 1; console.error(`  FAIL - ${label}`); }
}

const TEXT = '林逸推开档案室的门，灰尘落下来。他说：「就是这里。」林逸推开档案室的门，这次门轴响了。';
const SCENE = { id: 's_g1c', index: 1, pov: '林逸', characters: ['林逸'], text: TEXT };

console.log('# EO-G1-C-01 — Event Identity');

console.log('## T1/T2 — rerun 与锚组分稳定');
{
  const r1 = extractStoryEventsFromScene({ ...SCENE }, { knownNames: ['林逸'] });
  const r2 = extractStoryEventsFromScene({ ...SCENE }, { knownNames: ['林逸'] });
  const ids1 = r1.events.map((e) => e.id).sort().join(',');
  const ids2 = r2.events.map((e) => e.id).sort().join(',');
  ok(ids1 === ids2 && ids1.length > 0, `T1 rerun id 全等（${ids1.slice(0, 50)}…）`);
  ok(r1.events.every((e) => /^evt_.+_e[0-9a-f]{8}$/.test(e.id)), 'id 格式=锚定派生（非位置/序号）');
  ok(r1.events.every((e) => {
    const ex = String(e.evidence?.excerpt || '');
    const off = e.evidence?.offset;
    return Number.isInteger(off) && TEXT.slice(off, off + ex.length) === ex;
  }), 'T2 每事件 excerpt 在 raw text 的 offset 处逐字命中');
}

console.log('## T3 — 同摘录双现消歧');
{
  const d1 = deriveEventIdentityFromText({ sceneId: 's_g1c', text: TEXT, excerpt: '林逸推开档案室的门' });
  ok(d1.ok === false && d1.reason === 'anchor_ambiguous', `T3a 双现摘录 fail-closed（${d1.reason}）`);
  const a = mintEventIdentity({ sceneId: 's_g1c', excerpt: '林逸推开档案室的门', offset: 0 });
  const b = mintEventIdentity({ sceneId: 's_g1c', excerpt: '林逸推开档案室的门', offset: TEXT.indexOf('林逸推开档案室的门', 10) });
  ok(a.ok && b.ok && a.id !== b.id, 'T3b 同摘录异 offset → 两 id（span/offset 消歧）');
}

console.log('## T4/T5 — 跨 producer 同锚/异摘录');
{
  const det = extractStoryEventsFromScene({ ...SCENE }, { knownNames: ['林逸'] });
  const detSpeech = det.events.find((e) => e.kind === 'speech');
  ok(!!detSpeech, '前置：deterministic 产 speech 事件');
  const llm = await extractStoryEventsLLMAssisted({ ...SCENE }, {
    knownNames: ['林逸'],
    proposer: async () => [{
      kind: 'speech', actors: ['林逸'], action: '林逸说，就是这里', consequence: '',
      stateChanges: ['experience:对话'], affectedEntities: ['林逸'],
      excerpt: String(detSpeech.evidence.excerpt), actorEvidence: '他说',
    }],
  });
  const llmSame = llm.events.find((e) => e.evidence?.excerpt === detSpeech.evidence.excerpt);
  ok(!!llmSame && llmSame.id === detSpeech.id, `T4 同锚跨 producer → 同 id（${detSpeech.id}）`);
  const llm2 = await extractStoryEventsLLMAssisted({ ...SCENE }, {
    knownNames: ['林逸'],
    proposer: async () => [{
      kind: 'action', actors: ['林逸'], action: '林逸缓缓推开档案室的门', consequence: '',
      stateChanges: ['experience:推门'], affectedEntities: ['林逸'],
      excerpt: '林逸缓缓推开档案室的门，灰尘落下来', actorEvidence: '林逸推开档案室的门',
    }],
  });
  const llm2ev = llm2.events.find((e) => e.evidence?.excerpt === '林逸缓缓推开档案室的门，灰尘落下来');
  ok(!llm2ev || llm2ev.id !== detSpeech.id, 'T5 异摘录 → 异 id（不合并；equivalence NOT DEFINED）');
}

console.log('## T6 — LLM 不可唯一定位 → fail-closed');
{
  const nf = await extractStoryEventsLLMAssisted({ ...SCENE }, {
    knownNames: ['林逸'],
    proposer: async () => [{
      kind: 'action', actors: ['林逸'], action: '林逸破门而入', consequence: '',
      stateChanges: ['experience:破门'], affectedEntities: ['林逸'],
      excerpt: '这段摘录根本不在正文里出现', actorEvidence: '林逸推开档案室的门',
    }],
  });
  ok(nf.meta.fallbackUsed && nf.meta.fallbackReason === 'all_candidates_rejected',
    `T6a NOT_FOUND → 拒（${nf.meta.fallbackReason}）`);
  ok((nf.rejected?.[0]?.errors || []).includes('evidence_anchor_not_found'), 'T6b 拒因=evidence_anchor_not_found');
  const amb = await extractStoryEventsLLMAssisted({ ...SCENE }, {
    knownNames: ['林逸'],
    proposer: async () => [{
      kind: 'action', actors: ['林逸'], action: '林逸推开档案室的门', consequence: '',
      stateChanges: ['experience:推门'], affectedEntities: ['林逸'],
      excerpt: '林逸推开档案室的门', actorEvidence: '林逸推开档案室的门',
    }],
  });
  ok((amb.rejected?.[0]?.errors || []).includes('evidence_anchor_ambiguous'),
    'T6c AMBIGUOUS → 拒（不选 first occurrence / 不用 ordinal）');
}

console.log('## T7 — schema 不铸 hash id');
{
  const e = createStoryEvent({
    sceneId: 's_x', kind: 'action', actors: ['林逸'], action: '随便什么动作', consequence: '',
    stateChanges: [], affectedEntities: [], evidence: { excerpt: 'x' }, source: 'annotated',
  });
  ok(e.id === '', 'T7 无 id 输入 → id 空（hash fallback 已废）');
}

console.log('## T8 — 消费侧零伪造引用');
{
  const noId = createStoryEvent({
    sceneId: 's_x', kind: 'action', actors: ['林逸'], action: '林逸推开门', consequence: '',
    stateChanges: [], affectedEntities: ['林逸'], evidence: { excerpt: '林逸推开门' }, source: 'annotated',
  });
  ok(noId.id === '', 'T8a 无锚事件 id 空');
  const { applyAttributionAfterActual } = await import('../packages/inkos-brain/src/attribution/attribution-wiring.js');
  const attr = applyAttributionAfterActual('/tmp/g1c-nonexistent-book', 1, { id: 's_x', text: TEXT, actualEvents: [noId] });
  const blob = JSON.stringify(attr);
  ok(!blob.includes('occurrence:'), 'T8b 无 occurrence: 前缀引用');
  ok((attr.attempted || 0) === 0, `T8c 无 id 事件不进归因（attempted=${attr.attempted}）`);
}

function mkBook(tag) {
  const book = fs.mkdtempSync(path.join(os.tmpdir(), tag));
  fs.writeFileSync(path.join(book, 'book.json'), JSON.stringify({ schemaVersion: 4 }));
  fs.mkdirSync(path.join(book, 'novel', '03_character_bible'), { recursive: true });
  fs.writeFileSync(path.join(book, 'novel', '03_character_bible', '林逸.md'), '# 林逸\nfixture。\n');
  fs.mkdirSync(path.dirname(seedFile(book)), { recursive: true });
  return book;
}

console.log('## T9 — T2 幂等（重提取零双记）');
{
  const book = mkBook('g1c-');
  const e1 = extractStoryEventsFromScene({ ...SCENE }, { knownNames: ['林逸'] });
  const e2 = extractStoryEventsFromScene({ ...SCENE }, { knownNames: ['林逸'] });
  appendT2Experiences(book, { scene: { ...SCENE, actualEvents: e1.events }, chapter: 1, candidateNames: ['林逸'] });
  appendT2Experiences(book, { scene: { ...SCENE, actualEvents: e2.events }, chapter: 1, candidateNames: ['林逸'] });
  const refs = loadCharacterWorld(book).characters['林逸'].experiences.map((x) => x.actualRef);
  ok(new Set(refs).size === refs.length && refs.length > 0, `T9 重放零双记（${refs.length} 条全唯一）`);
  ok(refs.every((r) => /^evt_.+_e[0-9a-f]{8}$/.test(r)), 'T9b actualRef 全为锚定 id');
  fs.rmSync(book, { recursive: true, force: true });
}

console.log('## T10 — T3 通道 A 不被重复提取污染');
{
  const book = mkBook('g1ct3-');
  const e = extractStoryEventsFromScene({ ...SCENE }, { knownNames: ['林逸'] });
  const target = e.events[0];
  appendT2Experiences(book, { scene: { ...SCENE, actualEvents: [target] }, chapter: 1, candidateNames: ['林逸'] });
  appendT2Experiences(book, { scene: { ...SCENE, actualEvents: [target] }, chapter: 1, candidateNames: ['林逸'] });
  const m = materializeT3Formation(book, {
    characterId: '林逸', kind: 'belief', content: '档案区藏着东西',
    basisRefs: [target.id, target.id],
  });
  ok(!m.ok, `T10a 同 ref 冒充独立实际 → 通道 A 拒（${m.reason}）`);
  ok((loadCharacterWorld(book).characters['林逸'].experiences || []).length === 1, 'T10b rerun 重放不膨胀 T2 输入');
  fs.rmSync(book, { recursive: true, force: true });
}

console.log(`\n# 结果: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
