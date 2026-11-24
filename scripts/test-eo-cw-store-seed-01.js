#!/usr/bin/env node
/**
 * EO-CW-Store-Seed-01 — 测试
 * store-seed / isolation / epistemic boundary A–G / cross-chapter persistence /
 * anti-laundering / empty-world / not-canon / not-SR
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeYaml } from '../packages/inkos-core/src/lib/yaml-store.js';
import {
  CHARACTER_WORLD_VERSION,
  loadCharacterWorld,
  saveCharacterWorld,
  loadCharacterWorldSeed,
  materializeWorldFromSeeds,
  syncCharacterWorldFromSeeds,
  seedFile,
} from '../packages/inkos-brain/src/character/character-world.js';

let pass = 0;
let fail = 0;
function ok(cond, label) {
  if (cond) { pass += 1; console.log(`  ok - ${label}`); }
  else { fail += 1; console.error(`  FAIL - ${label}`); }
}

function mkBook() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "cw-"));
  // G1-A/S-A fixture supply：03 Character Bible = 身份录取权威（测试环境供给，非语义扩张）
  fs.mkdirSync(path.join(d, "novel", "03_character_bible"), { recursive: true });
  for (const n of ["林逸", "苏眠"]) {
    fs.writeFileSync(path.join(d, "novel", "03_character_bible", `${n}.md`), `# ${n}
G1-A fixture 身份录取。
`);
  }
  return d;
}
function writeSeed(bookDir, seed) {
  fs.mkdirSync(path.dirname(seedFile(bookDir)), { recursive: true });
  writeYaml(seedFile(bookDir), { version: 'character-world-seed-1', ...seed });
}

const EXP = { id: 'exp_a1', characterId: '林逸', text: '三年前多次与管理员因地下室权限争执' };
function seedA(overrides = {}) {
  return {
    experiences: [EXP, { id: 'exp_b1', characterId: '苏眠', text: '与管理员日常相处正常' }],
    characters: {
      林逸: {
        knowledge: [{ info: '管理员换过地下室的锁', basis: 'witnessed', basisRef: 'exp_a1' }],
        belief: [{ proposition: '管理员在防着什么', basis: 'inferred_from_known', basisRef: 'exp_a1' }],
        interpretation: [{ of: '管理员深夜巡查', as: '例行公事之下的监视', basis: 'past_experience', basisRef: 'exp_a1' }],
        stance: [{ stance: 'suspects', about: '管理员的动机', basis: 'inferred_from_known', basisRef: 'exp_a1' }],
        ...overrides,
      },
      苏眠: {},
    },
  };
}

console.log('# EO-CW-Store-Seed-01');

console.log('## 1. Store + Seed（结构 / provenance / basis 双路）');
{
  const book = mkBook();
  writeSeed(book, seedA());
  const { world, rejected } = materializeWorldFromSeeds(book);
  ok(rejected.length === 0, `全部合法 seed 入 World（rejected=${rejected.length}）`);
  const a = world.characters['林逸'];
  ok(a.knowledge.length === 1 && a.belief.length === 1 && a.interpretation.length === 1 && a.stance.length === 1, '四槽齐备');
  const prov = a.knowledge[0].provenance;
  ok(prov.source === 'authored_seed' && prov.basis === 'witnessed'
    && prov.basisKind === 'authored_experience' && prov.basisRef === 'exp_a1', 'provenance：source/basis/basisRef 可追溯');
  ok(!('goal' in a) && !('desire' in a) && !('choice' in a) && !('disposition' in a), '无 Goal/Choice/disposition 字段');
  const saved = saveCharacterWorld(book, world);
  ok(saved.written && saved.path.includes('character_world'), 'store 落盘 brain/character_world');
  const loaded = loadCharacterWorld(book);
  ok(loaded.characters['林逸'].belief[0].proposition === '管理员在防着什么', 'save→load 往返一致');
  ok(loaded.meta.writesCanon === false && loaded.meta.isRealityAuthority === false && loaded.meta.projection === 'not_implemented', 'meta：非 Canon 权威 · 无 Projection');
  // basisRef → Actual occurrence（第二路）：造一个可及 occurrence
  const brainDir = path.join(book, 'novel', '_system', 'brain');
  fs.mkdirSync(brainDir, { recursive: true });
  const scene = { id: 'ch1_s1', index: 1, pov: '林逸', present: ['林逸'], text: 'x', actualEvents: [
    { id: 'evt_real_1', sceneId: 'ch1_s1', kind: 'action', actors: ['林逸'], action: '林逸看到管理员换锁', consequence: '', stateChanges: [], affectedEntities: ['林逸'], evidence: { excerpt: '林逸看到管理员换锁' }, source: 'annotated' },
  ] };
  fs.writeFileSync(path.join(brainDir, 'ch_0001_scenes.json'), JSON.stringify({ chapter: 1, scenes: [scene] }));
  const { world: w2, rejected: r2 } = materializeWorldFromSeeds(book, {
    seed: {
      experiences: [EXP],
      characters: { 林逸: { knowledge: [
        { info: '管理员午夜换了地下室门锁', basis: 'witnessed', basisRef: 'evt_real_1' },
        { info: '别人的私密事件', basis: 'witnessed', basisRef: 'evt_missing' },
      ] } },
    },
  });
  ok(w2.characters['林逸'].knowledge.length === 1
    && w2.characters['林逸'].knowledge[0].provenance.basisKind === 'actual_occurrence', 'basisRef=Actual 可及 occurrence → 接受（IB 验证通过）');
  ok(r2.some((x) => x.reason.startsWith('basisRef_unresolvable')), 'basisRef 不可解 → 拒绝');
}

console.log('## 2. 角色隔离');
{
  const book = mkBook();
  writeSeed(book, seedA());
  const { world } = materializeWorldFromSeeds(book);
  const a = world.characters['林逸'];
  const b = world.characters['苏眠'];
  ok(a.belief.length === 1 && (b.belief || []).length === 0, 'belief_A 不出现在 B');
  ok(JSON.stringify(a.knowledge).includes('换过地下室的锁') && !JSON.stringify(b).includes('换过地下室的锁'), 'knowledge 单向隔离');
  // 他角色 experience 作 basisRef → 拒
  const { rejected } = materializeWorldFromSeeds(book, {
    seed: { experiences: [{ id: 'exp_b1', characterId: '苏眠', text: 'x' }],
      characters: { 林逸: { knowledge: [{ info: 'y', basis: 'told_by', basisRef: 'exp_b1' }] } } } });
  ok(rejected.some((x) => x.reason.startsWith('basisRef_experience_of_other_character')), '跨角色 basis 引用 → 拒绝');
}

console.log('## 3. Epistemic Boundary Case A–G');
{
  const book = mkBook();
  // Case A：作者知+角色亲历 → 接受（1.已证）；Case B：无合法 basis → 拒
  let r = materializeWorldFromSeeds(book, { seed: { experiences: [EXP],
    characters: { 林逸: { knowledge: [{ info: '管理员为了掩盖事故而换锁', basis: '', basisRef: '' }] } } } });
  ok(r.rejected.some((x) => x.reason.startsWith('basis_invalid')), 'Case B：basis 缺失 → REJECT');
  ok(r.world.characters['林逸'].knowledge.length === 0, 'Case B：knowledge 未入 World');
  // Case C：显式 unknown → 同内容 knowledge 拒
  r = materializeWorldFromSeeds(book, { seed: { experiences: [EXP],
    characters: { 林逸: { unknown: ['管理员为什么换锁'],
      knowledge: [{ info: '管理员为什么换锁的真相', basis: 'witnessed', basisRef: 'exp_a1' }] } } } });
  ok(r.rejected.some((x) => x.reason === 'declared_unknown'), 'Case C：declared unknown → 不产生 knowledge');
  // Case D：belief 可入，但≠fact（结构：无 canon/fact 字段）
  r = materializeWorldFromSeeds(book, { seed: { experiences: [EXP],
    characters: { 林逸: { belief: [{ proposition: '管理员想掩盖事故', basis: 'inferred_from_known', basisRef: 'exp_a1' }] } } } });
  const bItem = r.world.characters['林逸'].belief[0];
  ok(bItem && !('isFact' in bItem) && !('canon' in bItem), 'Case D：belief 入 World，无 fact/canon 标记');
  // Case E：interpretation 可入，≠Canon
  r = materializeWorldFromSeeds(book, { seed: { experiences: [EXP],
    characters: { 林逸: { interpretation: [{ of: '换锁', as: '防着什么', basis: 'inferred_from_known', basisRef: 'exp_a1' }] } } } });
  ok(r.world.characters['林逸'].interpretation.length === 1, 'Case E：interpretation 入 World（of/as）');
  // Case F：personality 字样 → 无槽可落
  r = materializeWorldFromSeeds(book, { seed: { experiences: [EXP],
    characters: { 林逸: { personality: 'cautious' } } } });
  const fchars = r.world.characters['林逸'];
  ok(r.rejected.some((x) => x.reason.startsWith('forbidden_block_field:personality'))
    && (fchars.stance || []).length === 0 && (fchars.belief || []).length === 0, 'Case F：personality 不自动产生任何槽');
  // Case G：未来事件（无合法 basis）→ 拒
  r = materializeWorldFromSeeds(book, { seed: { experiences: [EXP],
    characters: { 林逸: { knowledge: [{ info: '明天管理员会背叛他', basis: '', basisRef: '' }] } } } });
  ok(r.rejected.some((x) => x.reason.startsWith('basis_invalid')), 'Case G：未来事件无 basis → 不入当前 knowledge');
  // stance 枚举外 → 拒
  r = materializeWorldFromSeeds(book, { seed: { experiences: [EXP],
    characters: { 林逸: { stance: [{ stance: '决定报复', about: '管理员', basis: 'past_experience', basisRef: 'exp_a1' }] } } } });
  ok(r.rejected.some((x) => x.reason.startsWith('stance_invalid')), '行动性 stance（决定报复）→ 枚举拒绝');
}

console.log('## 4. 跨章持久性（World persists · SR 不自动生成）');
{
  const book = mkBook();
  writeSeed(book, seedA());
  syncCharacterWorldFromSeeds(book); // 模拟 Ch1 期间挂载
  // 模拟 Ch2：全新加载
  const world2 = loadCharacterWorld(book);
  ok(world2.characters['林逸'].belief[0].proposition === '管理员在防着什么', 'Ch2 加载：Ch1 的 World belief 仍存在');
  const srDir = path.join(book, 'novel', '_system', 'brain', 'character_sr');
  ok(!fs.existsSync(srDir), 'World 持久化未产生任何 SR 文件（无 Projection）');
  const srShape = JSON.stringify(world2).includes('awareness');
  ok(!srShape, 'World 形状 ≠ SR 形状（无 awareness/relevance 槽）');
}

console.log('## 5. Anti-laundering（Plan→World 全拒）');
{
  const book = mkBook();
  // 无 seed 文件、但存在 plan/09/lore 等大量 authored 内容
  fs.mkdirSync(path.join(book, 'novel', '_system', 'chapter_plans'), { recursive: true });
  writeYaml(path.join(book, 'novel', '_system', 'chapter_plans', 'chapter_0001.yaml'), {
    goal: '林逸决定查明真相', mainGoal: '揭露事故', causalChain: { choice: { action: '硬闯' }, options: [{ action: 'A' }] },
    characterDecisions: [{ characterId: '林逸', actionContent: '去后门' }],
  });
  fs.mkdirSync(path.join(book, 'novel'), { recursive: true });
  fs.writeFileSync(path.join(book, 'novel', '09_current_chapter.md'), '# 09\n目标：林逸必须选择');
  fs.writeFileSync(path.join(book, 'novel', '01_world_bible.md'), '管理员性格谨慎，林逸性格多疑。');
  const sync = syncCharacterWorldFromSeeds(book);
  ok(sync.synced === false && sync.reason === 'no_seed_file', 'Plan/09/lore 存在但无 seed → 不产生 World');
  ok(!fs.existsSync(path.join(book, 'novel', '_system', 'brain', 'character_world')), '无 seed → 不落盘任何 World 文件');
  // seed 文件中夹带 plan 字段 → 被拒
  const r = materializeWorldFromSeeds(book, { seed: { experiences: [EXP], characters: {
    林逸: { belief: [{ proposition: 'x', basis: 'told_by', basisRef: 'exp_a1', goal: '赢', choice: '硬闯', agencyScore: 0.9 }] } } } });
  ok(r.rejected.some((x) => x.reason.startsWith('forbidden_field')), 'seed 项夹带 goal/choice/agency → 拒');
}

console.log('## 6. Empty World 反污染');
{
  const book = mkBook();
  const w = loadCharacterWorld(book);
  ok(w.version === CHARACTER_WORLD_VERSION && Object.keys(w.characters).length === 0, '无 seed → World(A)=empty');
  ok(!('personality' in w) && !('bible' in w) && !('sr' in w), '空 World ≠ bible/SR/personality 副本');
}

console.log('## 7. World is not Canon');
{
  const book = mkBook();
  writeSeed(book, seedA());
  syncCharacterWorldFromSeeds(book);
  const novelDir = path.join(book, 'novel');
  for (const canonFile of ['11_timeline.yaml', '13_facts_db.yaml', '08_current_state.md', '07_state_board.md']) {
    ok(!fs.existsSync(path.join(novelDir, canonFile)), `未写 Canon：${canonFile}`);
  }
}

console.log(`\n# EO-CW-Store-Seed-01: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
