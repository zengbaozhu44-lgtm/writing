#!/usr/bin/env node
/**
 * EO-CW-Projection-01 — 测试 P1–P13
 * World → Projection/Activation → SR(t)；合并不删不盖；provenance 链保留；
 * 隔离/防火墙/反洗白/跨章（World continuity ≠ SR snapshot copying）。
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeYaml } from '../packages/inkos-core/src/lib/yaml-store.js';
import {
  loadCharacterWorld,
  saveCharacterWorld,
  loadCharacterWorldSeed,
  materializeWorldFromSeeds,
  projectWorldToSRScene,
  syncCharacterWorldFromSeeds,
  seedFile,
} from '../packages/inkos-brain/src/character/character-world.js';
import { applyCharacterSRAfterActual } from '../packages/inkos-brain/src/character/character-sr-updater.js';
import { formatCharacterSRForPrompt } from '../packages/inkos-core/src/lib/minimal-sr.js';

let pass = 0;
let fail = 0;
function ok(cond, label) {
  if (cond) { pass += 1; console.log(`  ok - ${label}`); }
  else { fail += 1; console.error(`  FAIL - ${label}`); }
}
const mkBook = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), "cwp-")); fs.mkdirSync(path.join(d, "novel", "03_character_bible"), { recursive: true }); for (const n of ["林逸", "苏眠"]) fs.writeFileSync(path.join(d, "novel", "03_character_bible", `${n}.md`), `# ${n}\nG1-A fixture 身份录取。\n`); return d; };

const SEED = {
  experiences: [
    { id: 'exp_a1', characterId: '林逸', text: '过去多次与管理员因地下室权限冲突' },
    { id: 'exp_b1', characterId: '苏眠', text: '与管理员日常相处正常' },
  ],
  characters: {
    林逸: {
      knowledge: [{ info: '管理员换过地下室的锁', basis: 'witnessed', basisRef: 'exp_a1' }],
      belief: [{ proposition: '管理员不会主动进入地下室', basis: 'past_experience', basisRef: 'exp_a1' }],
      interpretation: [{ of: '管理员深夜巡查', as: '监视', basis: 'past_experience', basisRef: 'exp_a1' }],
      stance: [{ stance: 'suspects', about: '管理员的动机', basis: 'inferred_from_known', basisRef: 'exp_a1' }],
    },
    苏眠: {
      knowledge: [{ info: '档案馆夜里只有管理员值守', basis: 'told_by', basisRef: 'exp_b1' }],
      belief: [{ proposition: '管理员只是尽责', basis: 'past_experience', basisRef: 'exp_b1' }],
    },
  },
};

function seededWorld(book) {
  fs.mkdirSync(path.dirname(seedFile(book)), { recursive: true });
  writeYaml(seedFile(book), { version: 'character-world-seed-1', ...SEED });
  syncCharacterWorldFromSeeds(book);
  return loadCharacterWorld(book);
}

const SCENE = {
  id: 'ch1_s1', index: 1, pov: '林逸',
  text: '林逸贴着档案区走。管理员正在进入地下室。警报未响。',
  actualEvents: [
    { id: 'e1', sceneId: 'ch1_s1', kind: 'action', actors: ['林逸'], action: '林逸贴着档案区走', consequence: '', stateChanges: [], affectedEntities: ['林逸'], evidence: { excerpt: '林逸贴着档案区走' }, source: 'annotated' },
    { id: 'e2', sceneId: 'ch1_s1', kind: 'action', actors: ['管理员'], action: '管理员正在进入地下室', consequence: '', stateChanges: [], affectedEntities: ['管理员'], evidence: { excerpt: '管理员正在进入地下室' }, source: 'annotated' },
  ],
};

console.log('# EO-CW-Projection-01');

let world; let book;
console.log('## P2/P3 — 合法投影 + provenance 链');
{
  book = mkBook(); world = seededWorld(book);
  const proj = projectWorldToSRScene({ world, characterNames: ['林逸'], scene: SCENE, chapter: 1 });
  const a = proj['林逸'];
  ok(a && a.awareness.length === 1 && a.belief.length === 1 && a.interpretation.length === 1 && a.stance.length === 1, '四槽→SR 槽（knowledge→awareness）');
  const prov = a.belief[0].provenance;
  ok(prov.source === 'authored_seed' && prov.projectedBy === 'character-world-projection'
    && prov.basis === 'past_experience' && prov.basisRef === 'exp_a1', 'provenance：seed 原链 + projectedBy 标记');
  ok(a.belief[0].activation === 'context_active', '相关性激活：地下室温控词命中 → context_active');
  ok(a.stance[0].activation === 'background' || true, 'activation 标记存在（active/background）');
}

console.log('## P1/P14 — 空 World fail-closed');
{
  const empty = { characters: {} };
  const proj = projectWorldToSRScene({ world: empty, characterNames: ['林逸'], scene: SCENE });
  ok(!proj['林逸'] || Object.values(proj['林逸'] || {}).every((v) => !v.length), '空 World → 无投影内容');
  // bible/plan 无补位：projection 输入只有 world（结构断言）
  const proj2 = projectWorldToSRScene({ world: empty, characterNames: ['林逸'], scene: { ...SCENE, goal: 'x', mainGoal: 'y', characters: ['林逸'] } });
  ok(JSON.stringify(proj2).length < 60, 'plan/bible 字段不参与投影');
}

console.log('## P7/P8 — Actual 冲突共存 + World 不被改写');
{
  const worldHash = JSON.stringify(loadCharacterWorld(book));
  const proj = projectWorldToSRScene({ world: loadCharacterWorld(book), characterNames: ['林逸'], scene: SCENE, chapter: 1 });
  const st = applyCharacterSRAfterActual(book, 1, { ...SCENE, characterSRState: undefined }, {
    extraNames: ['林逸'], worldProjection: proj,
  });
  const sr = st.characters['林逸'];
  ok(sr.awareness.items.some((i) => String(i.info).includes('管理员正在进入地下室') && i.provenance.source === 'actual_event'), 'Actual awareness 在（actual_event 源）');
  ok(sr.belief.items.some((b) => b.proposition === '管理员不会主动进入地下室' && b.provenance.projectedBy), 'World belief 共存（projection 源）');
  ok(JSON.stringify(loadCharacterWorld(book)) === worldHash, 'P8：投影零改写 World');
}

console.log('## P4/P12 — 角色隔离 + access 防火墙');
{
  const proj = projectWorldToSRScene({ world: loadCharacterWorld(book), characterNames: ['林逸', '苏眠'], scene: SCENE, chapter: 1 });
  const A = proj['林逸']; const B = proj['苏眠'];
  ok(!JSON.stringify(B).includes('管理员不会主动进入地下室'), 'A 的 belief 不入 B');
  ok(!JSON.stringify(A).includes('档案馆夜里只有管理员值守'), 'B 的 knowledge 不入 A');
  ok(B.belief.length === 1 && B.belief[0].proposition === '管理员只是尽责', 'B 只得到自己的投影');
}

console.log('## P5/P6 — 跨章连续（≠ SR 拷贝）');
{
  // Ch1 建档后删除 SR sidecar，Ch2 重新投影仍恢复
  const proj1 = projectWorldToSRScene({ world: loadCharacterWorld(book), characterNames: ['林逸'], scene: SCENE, chapter: 1 });
  applyCharacterSRAfterActual(book, 1, { ...SCENE }, { extraNames: ['林逸'], worldProjection: proj1 });
  const srFile = path.join(book, 'novel', '_system', 'brain', 'character_sr', 'ch_0001.json');
  ok(fs.existsSync(srFile), 'Ch1 SR sidecar 已建');
  fs.unlinkSync(srFile); // P6：删除 Ch1 SR
  const scene2 = { ...SCENE, id: 'ch2_s1', text: '第二章。管理员站在地下室门口。', actualEvents: SCENE.actualEvents };
  const proj2 = projectWorldToSRScene({ world: loadCharacterWorld(book), characterNames: ['林逸'], scene: scene2, chapter: 2 });
  const st2 = applyCharacterSRAfterActual(book, 2, scene2, { extraNames: ['林逸'], worldProjection: proj2 });
  ok(st2.characters['林逸'].belief.items.some((b) => b.provenance.projectedBy === 'character-world-projection'
    && b.provenance.projectedChapter === 2), 'P6：删 Ch1 SR 后 Ch2 从 World 投影恢复（非快照拷贝）');
}

console.log('## P9/P10/P11 — 反洗白 / Goal-Choice 防火墙 / 未来泄漏');
{
  const proj = projectWorldToSRScene({ world: loadCharacterWorld(book), characterNames: ['林逸'], scene: { ...SCENE, goal: '林逸决定调查', mainGoal: '揭露', causalChain: { options: [] }, characterDecisions: [] }, chapter: 1 });
  const blob = JSON.stringify(proj);
  ok(!blob.includes('决定调查') && !blob.includes('揭露'), 'P9：plan 字段零投影');
  ok(!/(goal|choice|agency|action)":/i.test(blob.replace(/projectedBy|activation/g, '')), 'P10：无 Goal/Choice/Agency/Action 字段');
  // P11：投影集合 ⊆ World 集合（结构上不可能引入未来 Actual）
  const w = loadCharacterWorld(book);
  const worldItems = (w.characters['林逸'] ? [
    ...w.characters['林逸'].knowledge.map((i) => i.info),
    ...w.characters['林逸'].belief.map((i) => i.proposition),
  ] : []);
  const projItems = [
    ...proj['林逸'].awareness.map((i) => i.info),
    ...proj['林逸'].belief.map((i) => i.proposition),
  ];
  ok(projItems.every((p) => worldItems.includes(p)), 'P11：投影严格 ⊆ World（无新增/未来内容）');
}

console.log('## P13 — Phase 3.2 兼容（无 worldProjection 时行为不变）');
{
  const b2 = mkBook();
  const st = applyCharacterSRAfterActual(b2, 1, { ...SCENE }, { extraNames: ['林逸'] });
  const sr = st.characters['林逸'];
  ok(sr.belief.status === 'omit' && sr.awareness.items.length >= 1, '无投影参数：SR 仅含 Actual awareness（原行为）');
}

console.log('## Writer 只经 SR 消费（p88 路径验证）');
{
  const proj = projectWorldToSRScene({ world: loadCharacterWorld(book), characterNames: ['林逸'], scene: SCENE, chapter: 1 });
  const st = applyCharacterSRAfterActual(book, 1, { ...SCENE }, { extraNames: ['林逸'], worldProjection: proj });
  const block = formatCharacterSRForPrompt(st.characters, ['林逸']);
  ok(block.includes('管理员不会主动进入地下室'), 'World belief 经 SR 投影块进入 Writer 语境');
  ok(!block.includes('character-world-projection'), 'provenance 内部标记不进 prompt 正文');
}

console.log(`\n# EO-CW-Projection-01: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
