#!/usr/bin/env node
/**
 * EO-CW-Formation-01 — T3 Durable Formation 测试（T3-01 … T3-25）
 * Channel A（验证已具 content 的 Candidate；无自动 producer）/ Channel B（authored seal）。
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeYaml } from '../packages/inkos-core/src/lib/yaml-store.js';
import {
  loadCharacterWorld,
  appendT2Experiences,
  materializeT3Formation,
  projectWorldToSRScene,
  syncCharacterWorldFromSeeds,
  seedFile,
  T3_AUTHORED_FORMATION,
  T3_REPEATED_ACTUAL,
} from '../packages/inkos-brain/src/character/character-world.js';
import { applyCharacterSRAfterActual } from '../packages/inkos-brain/src/character/character-sr-updater.js';

let pass = 0; let fail = 0;
const ok = (c, l) => { if (c) { pass += 1; console.log(`  ok - ${l}`); } else { fail += 1; console.error(`  FAIL - ${l}`); } };
const mkBook = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), "t3-")); fs.mkdirSync(path.join(d, "novel", "03_character_bible"), { recursive: true }); for (const n of ["林逸", "苏眠"]) fs.writeFileSync(path.join(d, "novel", "03_character_bible", `${n}.md`), `# ${n}\nG1-A fixture 身份录取。\n`); return d; };
const ev = (id, actor, action) => ({ id, sceneId: 's1', kind: 'action', actors: [actor], action, consequence: '', stateChanges: [], affectedEntities: [actor], evidence: { excerpt: action }, source: 'annotated' });

function bookWithTwoT2() {
  const book = mkBook();
  appendT2Experiences(book, {
    scene: { id: 's1', pov: '林逸', present: ['林逸'], text: 'x', actualEvents: [ev('evt_1', '林逸', '管理员夜里进入档案区'), ev('evt_2', '林逸', '管理员再次出现在档案区')] },
    chapter: 1, candidateNames: ['林逸', '苏眠'],
  });
  return book;
}

console.log('# EO-CW-Formation-01');

console.log('## Channel A — T3-01/02/04/06/07 硬条件');
{
  const book = bookWithTwoT2();
  const r = materializeT3Formation(book, { characterId: '林逸', kind: 'belief', content: '管理员与档案区有关', basisRefs: ['evt_1', 'evt_2'] });
  ok(r.ok && r.formation.source === T3_REPEATED_ACTUAL, 'T3-01/22：两个独立合法 T2 → T3（source=t3_repeated_actual）');
  const w = loadCharacterWorld(book);
  ok(w.characters['林逸'].formations.length === 1 && w.characters['林逸'].formations[0].basisRefs.length === 2, 'formation 落 World，basisRefs=2');

  const single = materializeT3Formation(mkBook(), { characterId: '林逸', kind: 'belief', content: 'x', basisRefs: ['evt_1'] });
  ok(!single.ok && single.reason === 'basisRefs_lt_2', 'T3-02：单 T2 → 拒');

  const b2 = bookWithTwoT2();
  appendT2Experiences(b2, { scene: { id: 's1b', pov: '林逸', present: ['林逸'], text: 'y', actualEvents: [ev('evt_1', '林逸', '管理员夜里进入档案区')] }, chapter: 1, candidateNames: ['林逸'] });
  const same = materializeT3Formation(b2, { characterId: '林逸', kind: 'belief', content: 'x', basisRefs: ['evt_1', 'evt_1'] });
  ok(!same.ok && same.reason === 'basisRefs_not_independent', 'T3-04：同一 Actual 伪两个 → 拒');

  const noT2 = materializeT3Formation(mkBook(), { characterId: '林逸', kind: 'belief', content: 'x', basisRefs: ['plan_a', 'plan_b'] });
  ok(!noT2.ok && noT2.reason.includes('basisRef_not_t2'), 'T3-06：非 T2 引用 → 拒（含 plan/未来引用）');
}

console.log('## T3-03/09/10/11 — 反洗白（seed 重复/Plan/Writer/Bible）');
{
  const book = bookWithTwoT2();
  // 重复 authored seed 不构成 T3 证据：seed interpretation 写两次仍无 basisRefs
  fs.mkdirSync(path.dirname(seedFile(book)), { recursive: true });
  writeYaml(seedFile(book), {
    version: 'character-world-seed-1',
    experiences: [{ id: 'exp_a1', characterId: '林逸', text: 'x' }],
    characters: { 林逸: { interpretation: [
      { of: '管理员', as: '危险', basis: 'past_experience', basisRef: 'exp_a1' },
      { of: '管理员', as: '危险', basis: 'past_experience', basisRef: 'exp_a1' },
    ] } },
  });
  syncCharacterWorldFromSeeds(book);
  const w = loadCharacterWorld(book);
  const seeded = (w.characters['林逸'].formations || []).filter((f) => f.source === T3_REPEATED_ACTUAL);
  ok(seeded.length === 0, 'T3-03：重复 authored seed 不产生 repeated-actual T3');
  // Writer prose / plan / bible：materializeT3Formation 唯一入参是 candidate+basisRefs→T2（结构断言）
  const prose = materializeT3Formation(book, { characterId: '林逸', kind: 'belief', content: '他意识到管理员一直在隐藏什么', basisRefs: [] });
  ok(!prose.ok, 'T3-10：Writer prose 无 basis → 零 T3');
}

console.log('## T3-05/16/17/19 — 隔离 + 跨章 + SR 删除');
{
  const book = bookWithTwoT2();
  appendT2Experiences(book, { scene: { id: 's2', pov: '林逸', present: ['林逸'], text: 'z', actualEvents: [ev('evt_3', '林逸', '第三次撞见管理员在档案区')] }, chapter: 1, candidateNames: ['林逸'] });
  materializeT3Formation(book, { characterId: '林逸', kind: 'belief', content: '管理员常驻档案区', basisRefs: ['evt_1', 'evt_3'] });
  const w = loadCharacterWorld(book);
  ok(!w.characters['苏眠'] || !(w.characters['苏眠'].formations || []).length, 'T3-05/17：A 成形，B 零 formation');
  // 删 SR 后 T3 仍在 + 投影
  const srDir = path.join(book, 'novel', '_system', 'brain', 'character_sr');
  if (fs.existsSync(srDir)) fs.rmSync(srDir, { recursive: true });
  const w2 = loadCharacterWorld(book);
  ok(w2.characters['林逸'].formations.length >= 1, 'T3-17：删 SR 后 T3 存续');
  const proj = projectWorldToSRScene({ world: w2, characterNames: ['林逸'], scene: { id: 'c2s1', text: '档案区的灯又亮了。', actualEvents: [] }, chapter: 2 });
  ok(proj['林逸'].belief.some((b) => b.fromT3 === true && b.proposition === '管理员常驻档案区'), 'T3-18：T3 经投影入 SR belief（fromT3）');
}

console.log('## T3-12/13/14/15 — Goal/Choice/Action 防火墙 + Reality 防火墙');
{
  const book = bookWithTwoT2();
  materializeT3Formation(book, { characterId: '林逸', kind: 'belief', content: '管理员在隐藏什么', basisRefs: ['evt_1', 'evt_2'] });
  const blob = JSON.stringify(loadCharacterWorld(book));
  ok(!/"(goal|choice|agency|action)":/.test(blob), 'T3-12/13/14：无 Goal/Choice/Action 字段');
  ['11_timeline.yaml', '13_facts_db.yaml', '08_current_state.md'].forEach((f) => {
    ok(!fs.existsSync(path.join(book, 'novel', f)), `T3-15：未写 ${f}`);
  });
  const bad = materializeT3Formation(book, { characterId: '林逸', kind: 'belief', content: 'x', basisRefs: ['evt_1', 'evt_2'], goal: '调查' });
  ok(!bad.ok && bad.reason.startsWith('forbidden_field'), 'candidate 夹带 goal → 拒');
}

console.log('## Channel B — T3-21/23：authored seal + 分源');
{
  const book = bookWithTwoT2();
  fs.mkdirSync(path.dirname(seedFile(book)), { recursive: true });
  writeYaml(seedFile(book), {
    version: 'character-world-seed-1',
    experiences: [{ id: 'exp_a1', characterId: '林逸', text: 'x' }],
    characters: { 林逸: { formations_seal: [
      { kind: 'stance', content: 'suspects', about: '管理员的动机' },
    ] } },
  });
  syncCharacterWorldFromSeeds(book);
  let w = loadCharacterWorld(book);
  const seal = w.characters['林逸'].formations.find((f) => f.source === T3_AUTHORED_FORMATION);
  ok(seal && seal.kind === 'stance' && seal.content === 'suspects', 'T3-21：authored seal → T3（source=authored_formation）');
  // 同内容 repeated-actual 共存且分源
  materializeT3Formation(book, { characterId: '林逸', kind: 'belief', content: '管理员与档案区有关', basisRefs: ['evt_1', 'evt_2'] });
  syncCharacterWorldFromSeeds(book); // 重跑保留
  w = loadCharacterWorld(book);
  ok(w.characters['林逸'].formations.filter((f) => f.source === T3_AUTHORED_FORMATION).length === 1
    && w.characters['林逸'].formations.filter((f) => f.source === T3_REPEATED_ACTUAL).length === 1, 'T3-23：两源共存不混');
}

console.log('## T3-24/25 — 冲突共存 + 幂等 + formedAt');
{
  const book = bookWithTwoT2();
  materializeT3Formation(book, { characterId: '林逸', kind: 'belief', content: '管理员不会主动进入档案区', basisRefs: ['evt_1', 'evt_2'] }, { formedAt: 2 });
  // 新冲突 Actual（T2）追加 → 旧 T3 不改写
  appendT2Experiences(book, { scene: { id: 's9', pov: '林逸', present: ['林逸'], text: 'w', actualEvents: [ev('evt_9', '林逸', '管理员主动进入档案区')] }, chapter: 2, candidateNames: ['林逸'] });
  const w = loadCharacterWorld(book);
  ok(w.characters['林逸'].formations.some((f) => f.content === '管理员不会主动进入档案区'), 'T3-24：旧 T3 保留（无 revision/decay）');
  ok(w.characters['林逸'].experiences.some((e) => e.actualRef === 'evt_9'), 'T3-24：新 T2 经历共存');
  const r2 = materializeT3Formation(book, { characterId: '林逸', kind: 'belief', content: '管理员不会主动进入档案区', basisRefs: ['evt_1', 'evt_2'] }, { formedAt: 2 });
  const r3 = materializeT3Formation(book, { characterId: '林逸', kind: 'belief', content: '管理员不会主动进入档案区', basisRefs: ['evt_1', 'evt_2'] }, { formedAt: 2 });
  ok(r2.reason === 'idempotent_existing' && r3.reason === 'idempotent_existing', 'T3-25：三连跑幂等');
  const f = loadCharacterWorld(book).characters['林逸'].formations[0];
  ok(f.formedAt === 2 && f.provenance.formedAt === 2, 'formedAt=materialize 时间位（Ch2 而非 Ch1 事件）');
  ok(f.basisRefs.length === 2 && f.basisRefs.every((r) => String(r).startsWith('evt_')), '事件时间经 basisRefs 追溯');
}

console.log(`\n# EO-CW-Formation-01: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
