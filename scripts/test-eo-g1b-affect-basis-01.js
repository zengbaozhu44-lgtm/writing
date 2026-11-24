#!/usr/bin/env node
/**
 * EO-G1-B — Relationship Affect Basis（Gate 1 Q5 + Q5′ Seal=C）
 *
 * B1 图边存在 + 无 authored affect → affect 槽 omit/unknown
 * B2 authored affect 块 → 照常投影 + provenance=authored_character_subjective
 * B3 T2 丰富角色 + 图边 + 无 authored affect → affect 仍 omit（关键反泄漏）
 * B4 切断计数可观测（counter ≠ SR Truth——不进槽、不持久化）
 * B5 关系 TopK 世界层注入不受影响（方向保真保持）
 * B6 全空 → omit（fail-closed 不变）
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeYaml } from '../packages/inkos-core/src/lib/yaml-store.js';
import {
  assembleMinimalSR,
  formatCharacterSRForPrompt,
  getAffectSeveredBySeal,
  __resetAffectSeveredForTests,
} from '../packages/inkos-core/src/lib/minimal-sr.js';
import { appendT2Experiences, loadCharacterWorld, seedFile } from '../packages/inkos-brain/src/character/character-world.js';
import { loadBrainContext } from '../packages/inkos-brain/src/loader.js';
import { compileScenePrompt } from '../packages/inkos-prompt/src/index.js';

let pass = 0;
let fail = 0;
function ok(cond, label) {
  if (cond) { pass += 1; console.log(`  ok - ${label}`); }
  else { fail += 1; console.error(`  FAIL - ${label}`); }
}

const REL = [
  { from: '镜渊', to: '林逸', relation: '观察对象', trust: 'none', note: '镜渊主动引导' },
  { from: '林逸', to: '苏眠', relation: '被迫同盟', trust: 'low' },
];

console.log('# EO-G1-B — Relationship Affect Basis');

console.log('## B1 — 图边 only → omit');
{
  __resetAffectSeveredForTests();
  const sr = assembleMinimalSR({ ctx: { relationships: REL }, names: ['林逸'] });
  const slot = sr['林逸']?.affect_relationship;
  ok(slot?.status !== 'present', `B1 affect=omit（status=${slot?.status}）`);
  ok(getAffectSeveredBySeal() >= 2, `B1b 切断计数（severed=${getAffectSeveredBySeal()}）`);
}

console.log('## B2 — authored affect → 投影 + provenance');
{
  const sr = assembleMinimalSR({ ctx: { relationships: REL, authoredCharacterSR: { 林逸: { affect_relationship: [{ text: '对苏眠：骗过我又救过我，说不清', with: '苏眠' }] } } }, names: ['林逸'] });
  const items = sr['林逸']?.affect_relationship?.items || [];
  ok(items.length === 1 && items[0].text.includes('对苏眠'), `B2 authored 投影（${items[0]?.text.slice(0, 16)}）`);
  ok(items[0]?.provenance?.source === 'authored_character_subjective', 'B2b provenance 正确');
}

console.log('## B3 — T2 丰富仍 omit（反泄漏关键）');
{
  const book = fs.mkdtempSync(path.join(os.tmpdir(), 'g1b-'));
  fs.writeFileSync(path.join(book, 'book.json'), JSON.stringify({ schemaVersion: 4 }));
  fs.mkdirSync(path.join(book, 'novel', '03_character_bible'), { recursive: true });
  fs.writeFileSync(path.join(book, 'novel', '03_character_bible', '林逸.md'), '# 林逸\nfixture。\n');
  fs.mkdirSync(path.dirname(seedFile(book)), { recursive: true });
  const scene = {
    id: 's1', index: 1, pov: '林逸', present: ['林逸'],
    text: '林逸与苏眠在档案馆对质。苏眠说出了弟弟的事。',
    actualEvents: [
      { id: 'evt_s1_e11111111', sceneId: 's1', kind: 'social', actors: ['林逸', '苏眠'], action: '林逸与苏眠在档案馆对质', consequence: '', stateChanges: [], affectedEntities: ['林逸', '苏眠'], evidence: { excerpt: '林逸与苏眠在档案馆对质' }, source: 'annotated' },
    ],
  };
  appendT2Experiences(book, { scene, chapter: 1, candidateNames: ['林逸'] });
  const w = loadCharacterWorld(book);
  ok((w.characters['林逸']?.experiences || []).length > 0, '前置：林逸 T2 > 0（含关系对方苏眠的亲历）');
  __resetAffectSeveredForTests();
  const sr = assembleMinimalSR({ ctx: { relationships: REL }, names: ['林逸'] });
  ok(sr['林逸']?.affect_relationship?.status !== 'present', 'B3 T2 丰富 + 图边 → affect 仍 omit（T2 exists ≠ affect）');
  fs.rmSync(book, { recursive: true, force: true });
}

console.log('## B4 — counter ≠ SR Truth');
{
  __resetAffectSeveredForTests();
  assembleMinimalSR({ ctx: { relationships: REL }, names: ['林逸'] });
  const n = getAffectSeveredBySeal();
  const sr = assembleMinimalSR({ ctx: { relationships: REL }, names: ['林逸'] });
  const slotBlob = JSON.stringify(sr['林逸']?.affect_relationship || {});
  ok(n >= 2 && !slotBlob.includes('severed') && !slotBlob.includes('Severed'),
    `B4 计数仅在访问器（${n}），不进槽/不序列化`);
  const rendered = formatCharacterSRForPrompt(assembleMinimalSR({ ctx: { relationships: REL }, names: ['林逸'] }));
  ok(!/severed/i.test(rendered), 'B4b SR 渲染零计数痕迹');
}

console.log('## B5 — 关系 TopK 世界层不受影响');
{
  const book = fs.mkdtempSync(path.join(os.tmpdir(), 'g1b5-'));
  fs.writeFileSync(path.join(book, 'book.json'), JSON.stringify({ schemaVersion: 4 }));
  const n = path.join(book, 'novel');
  fs.mkdirSync(path.join(n, '_system'), { recursive: true });
  fs.mkdirSync(path.join(n, '03_character_bible'), { recursive: true });
  fs.mkdirSync(path.join(n, '10_volume_outline'), { recursive: true });
  fs.writeFileSync(path.join(n, '_system', 'manifest.json'), JSON.stringify({}));
  for (const c of ['林逸', '苏眠', '镜渊']) {
    fs.writeFileSync(path.join(n, '03_character_bible', `${c}.md`), `# ${c}\nfixture。\n`);
  }
  writeYaml(path.join(n, '05_relationship_graph.yaml'), { meta: { version: 1 }, edges: REL });
  const ctx = loadBrainContext(book, { chapter: 1, pov: '林逸' });
  const out = compileScenePrompt(ctx, { id: 'c1', index: 1, beat: 'hook', goal: '林逸与镜渊对峙', conflict: 'c' });
  const prompt = String(out?.text || out);
  ok(prompt.includes('关系 TopK'), 'B5a TopK 块仍在');
  ok(prompt.includes('镜渊→林逸') && prompt.includes('镜渊 对 林逸'), 'B5b 方向保真保持（世界层展示）');
  ok(!/Affect \/ Relationship\*\*：\n  - 镜渊→林逸/.test(prompt), 'B5c SR affect 槽无图边条目');
  fs.rmSync(book, { recursive: true, force: true });
}

console.log('## B6 — 全空 → omit');
{
  const sr = assembleMinimalSR({ ctx: {}, names: ['林逸'] });
  ok(sr['林逸']?.affect_relationship?.status !== 'present', 'B6 无图无 authored → omit（fail-closed）');
}

console.log(`\n# 结果: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
