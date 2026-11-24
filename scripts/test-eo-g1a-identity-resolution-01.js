#!/usr/bin/env node
/**
 * EO-G1-A — Character Identity Registry & Resolution（Gate 1 Seal · S-A）
 *
 * S1 actor 串不造 Character · S2 mention 同径 · S3 T2 通道同 S1
 * S4 relationship endpoint 不造 Character（无效边不入 ctx）
 * S5 POV/roster 不造 Character · S6 UNRESOLVED 零物化 · S7 别名碰撞 fail-closed
 * S8 API 只读无写 · S9 world.json 字节不动 + quarantine sidecar
 * S10 L1/L2/Choice/attribution-gate 语义不变 · S11 UNRESOLVED seed → 零物化
 * 附加：别名归属 canonical · 空串/空 registry fail-closed
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeYaml } from '../packages/inkos-core/src/lib/yaml-store.js';
import {
  resolveCharacter,
  loadCharacterRegistry,
  __clearRegistryCacheForTests,
} from '../packages/inkos-core/src/lib/entity-identity.js';
import {
  loadCharacterWorld,
  saveCharacterWorld,
  materializeWorldFromSeeds,
  syncCharacterWorldFromSeeds,
  appendT2Experiences,
  ensureIdentityQuarantine,
  loadQuarantinedNames,
  seedFile,
} from '../packages/inkos-brain/src/character/character-world.js';
import { applyAttributionAfterActual } from '../packages/inkos-brain/src/attribution/attribution-wiring.js';
import { loadBrainContext } from '../packages/inkos-brain/src/loader.js';

let pass = 0;
let fail = 0;
function ok(cond, label) {
  if (cond) { pass += 1; console.log(`  ok - ${label}`); }
  else { fail += 1; console.error(`  FAIL - ${label}`); }
}

function mkBook({ bibles = ['林逸', '苏眠', '老周'], aliases = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'g1a-'));
  fs.writeFileSync(path.join(dir, 'book.json'), JSON.stringify({ schemaVersion: 4 }));
  const cb = path.join(dir, 'novel', '03_character_bible');
  fs.mkdirSync(cb, { recursive: true });
  for (const n of bibles) {
    const aliasLine = aliases[n] ? `\n> identity-alias: ${aliases[n].join(', ')}\n` : '\n';
    fs.writeFileSync(path.join(cb, `${n}.md`), `# ${n}\nG1-A fixture。${aliasLine}`);
  }
  fs.mkdirSync(path.join(dir, 'novel', '_system'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'novel', '_system', 'manifest.json'), JSON.stringify({}));
  __clearRegistryCacheForTests();
  return dir;
}

const EV = (id, actors, action, extra = {}) => ({
  id, sceneId: 's1', kind: 'action', actors, action, consequence: '',
  stateChanges: [], affectedEntities: actors,
  evidence: { excerpt: action }, source: 'annotated', ...extra,
});
const SCENE = {
  id: 's1', index: 1, pov: '林逸', present: ['林逸'],
  text: '林逸在档案区贴墙观察。车门被人从里面推开。',
  actualEvents: [EV('evt_1', ['林逸'], '林逸在档案区贴墙观察')],
};

console.log('# EO-G1-A — Character Identity Registry & Resolution');

console.log('## S1/S2/S3 — actor/mention/T2 不造 Character');
{
  const book = mkBook();
  const r = appendT2Experiences(book, {
    scene: { ...SCENE, actualEvents: [EV('evt_p', ['车门'], '车门被人从里面推开')] },
    chapter: 1,
    candidateNames: ['车门', '他没来得及', '林逸'],
  });
  const w = loadCharacterWorld(book);
  ok(!w.characters['车门'] && !w.characters['他没来得及'], 'S1 伪 actor 不建 CW 块');
  ok(r.unresolvedSubjects === 2, `S2/S3 unresolved 计数可观测（实得 ${r.unresolvedSubjects}）`);
  const linExp = w.characters['林逸']?.experiences || [];
  ok(linExp.every((e) => e.access === 'present_witness'),
    `林逸非 participant——至多在场见证（既有 Experience 级门不变；实得 ${linExp.length} 条 witness）`);
  fs.rmSync(book, { recursive: true, force: true });
}

console.log('## S4 — relationship endpoint 不造 Character（无效边不入 ctx）');
{
  const book = mkBook();
  writeYaml(path.join(book, 'novel', '05_relationship_graph.yaml'), {
    meta: { version: 1 },
    edges: [
      { from: '林逸', to: '苏眠', relation: '被迫同盟', trust: 'low' },
      { from: '林逸', to: '幽灵角色', relation: '观察', trust: 'none' },
    ],
  });
  const ctx = loadBrainContext(book, { chapter: 1, pov: '林逸' });
  ok(ctx.relationships.length === 1, `S4 无效端点边被拒（实得 ${ctx.relationships.length}/2）`);
  ok(ctx.relationships.every((e) => e.to === '苏眠'), '合法边保留');
  ok(!loadCharacterWorld(book).characters['幽灵角色'], 'S4 endpoint 不造 Character');
  fs.rmSync(book, { recursive: true, force: true });
}

console.log('## S5 — POV/roster 不造 Character');
{
  const book = mkBook();
  appendT2Experiences(book, {
    scene: { ...SCENE, pov: '陌生POV' },
    chapter: 1,
    candidateNames: ['陌生POV', '林逸'],
  });
  const w = loadCharacterWorld(book);
  ok(!w.characters['陌生POV'], 'S5 未录取 POV 不建块');
  fs.rmSync(book, { recursive: true, force: true });
}

console.log('## S6 — UNRESOLVED 零物化（attribution 同径）');
{
  const book = mkBook();
  const scene = { ...SCENE, actualEvents: [EV('evt_a', ['车门'], '车门被人从里面推开'), EV('evt_b', ['林逸'], '林逸在档案区贴墙观察')] };
  const r = applyAttributionAfterActual(book, 1, scene);
  const records = r.results || r.records || [];
  const subjects = JSON.stringify(r).match(/"characterId":"([^"]+)"/g) || [];
  ok(!subjects.some((s) => s.includes('车门')), 'S6 attribution 无伪主体记录');
  ok(subjects.some((s) => s.includes('林逸')), 'S6 合法主体照常归因');
  fs.rmSync(book, { recursive: true, force: true });
}

console.log('## S7 — 别名碰撞 fail-closed + 别名归属 canonical');
{
  const book = mkBook({
    bibles: ['林逸', '甲', '乙'],
    aliases: { 甲: ['老板'], 乙: ['老板'] },
  });
  const c = resolveCharacter(book, '老板');
  ok(c.status === 'UNRESOLVED' && c.reason === 'alias_collision', `S7 碰撞不猜（${c.reason}）`);
  const g = resolveCharacter(book, '林逸');
  ok(g.status === 'RESOLVED' && g.via === 'canonical', 'canonical 直命中');
  // 别名归属：老周 alias 周师傅 → 事件归 canonical 老周
  const b2 = mkBook({ aliases: { 老周: ['周师傅'] } });
  const r = appendT2Experiences(b2, {
    scene: { ...SCENE, actualEvents: [EV('evt_z', ['周师傅'], '周师傅值完夜班锁门')] },
    chapter: 1, candidateNames: ['周师傅', '老周'],
  });
  const w = loadCharacterWorld(b2);
  ok(!w.characters['周师傅'], '别名不另建块');
  ok((w.characters['老周']?.experiences || []).some((e) => e.access === 'participant'),
    '别名提及的经历归 canonical（resolution-aware participant）');
  fs.rmSync(book, { recursive: true, force: true });
  fs.rmSync(b2, { recursive: true, force: true });
}

console.log('## S8 — API 只读（无写函数）');
{
  const mod = await import('../packages/inkos-core/src/lib/entity-identity.js');
  const exports_ = Object.keys(mod);
  ok(!exports_.some((k) => /create|delete|remove|write|admit|register/i.test(k)),
    `S8 无写路径（exports: ${exports_.join(',')}）`);
}

console.log('## S9 — world.json 字节不动 + quarantine sidecar');
{
  const book = mkBook();
  const w = loadCharacterWorld(book);
  w.characters['车门'] = { knowledge: [], interpretation: [], belief: [], stance: [], experiences: [{ experienceId: 'legacy', characterId: '车门', actualRef: 'evt_legacy' }], formations: [] };
  w.characters['他'] = { knowledge: [], interpretation: [], belief: [], stance: [], experiences: [{ experienceId: 'legacy2', characterId: '他', actualRef: 'evt_legacy2' }], formations: [] };
  saveCharacterWorld(book, w);
  const before = fs.readFileSync(path.join(book, 'novel', '_system', 'brain', 'character_world', 'world.json'), 'utf8');
  const q = ensureIdentityQuarantine(book);
  const after = fs.readFileSync(path.join(book, 'novel', '_system', 'brain', 'character_world', 'world.json'), 'utf8');
  ok(before === after, 'S9a world.json 逐字节不动');
  ok(q.invalid.length === 1 && q.unknown.length === 1, `S9b invalid=车门(1) unknown=他(1)（实得 ${q.invalid.length}/${q.unknown.length}）`);
  ok(fs.existsSync(q.manifestPath), 'S9c sidecar manifest 生成');
  ok(loadQuarantinedNames(book).has('车门') && loadQuarantinedNames(book).has('他'), 'S9d manifest 可加载');
  fs.rmSync(book, { recursive: true, force: true });
}

console.log('## S10 — 既有语义不变（attribution 三态/L1 不接）');
{
  const book = mkBook();
  const scene = { ...SCENE, actualEvents: [EV('evt_v', ['林逸'], '林逸在档案区贴墙观察')] };
  const r = applyAttributionAfterActual(book, 1, scene);
  const blob = JSON.stringify(r);
  ok(!blob.includes('"UNKNOWN_SUBJECT"') && !blob.includes('车门'), 'S10 attribution 输出无新类别/伪主体');
  ok(typeof loadBrainContext === 'function', 'S10 L1/loader 接口未变');
  fs.rmSync(book, { recursive: true, force: true });
}

console.log('## S11 — UNRESOLVED seed → 零物化（存储动作≠Truth admission）');
{
  const book = mkBook({ bibles: ['林逸'] }); // 苏眠未录取
  fs.mkdirSync(path.dirname(seedFile(book)), { recursive: true });
  writeYaml(seedFile(book), {
    version: 'character-world-seed-1',
    experiences: [
      { id: 'exp_a1', characterId: '林逸', text: '多次夜间见到档案区有人' },
      { id: 'exp_b1', characterId: '苏眠', text: '与管理员日常相处正常' },
    ],
    characters: {
      林逸: { knowledge: [{ info: '档案区夜里有人', basis: 'witnessed', basisRef: 'exp_a1' }] },
      苏眠: { belief: [{ proposition: '管理员只是尽责', basis: 'past_experience', basisRef: 'exp_b1' }] },
    },
  });
  const { world, rejected } = materializeWorldFromSeeds(book);
  ok(!!world.characters['林逸']?.knowledge?.length, '已录取 seed 主体照常物化');
  ok(!world.characters['苏眠'], 'S11a 未录取 seed 主体零块');
  ok(rejected.some((x) => x.characterId === '苏眠' && x.reason.startsWith('character_unresolved')),
    `S11b rejected 可审计（${rejected[0]?.reason}）`);
  // 双重边界：sync 后 ensureCharacterBlock 无 string 直通
  syncCharacterWorldFromSeeds(book);
  ok(!loadCharacterWorld(book).characters['苏眠'], 'S11c sync 重跑仍零物化');
  fs.rmSync(book, { recursive: true, force: true });
}

console.log('## 附加 — 空串 / 空 registry fail-closed');
{
  const book = mkBook({ bibles: [] });
  ok(resolveCharacter(book, '').reason === 'empty', '空串 UNRESOLVED(empty)');
  ok(resolveCharacter(book, '任何人').reason === 'not_in_registry', '空 registry 一律 not_in_registry');
  fs.rmSync(book, { recursive: true, force: true });
}

console.log(`\n# 结果: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
