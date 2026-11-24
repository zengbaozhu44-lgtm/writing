#!/usr/bin/env node
/**
 * EO-CW-Trace-01 — T2 Episodic Trace 测试（T2-01 … T2-20）
 * Actual + Access → World.experiences（引用式、幂等、零解读、零 Reality 写）。
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeYaml } from '../packages/inkos-core/src/lib/yaml-store.js';
import {
  loadCharacterWorld,
  materializeWorldFromSeeds,
  appendT2Experiences,
  projectWorldToSRScene,
  syncCharacterWorldFromSeeds,
  seedFile,
  T2_TRACE_SOURCE,
} from '../packages/inkos-brain/src/character/character-world.js';
import { applyCharacterSRAfterActual } from '../packages/inkos-brain/src/character/character-sr-updater.js';

let pass = 0; let fail = 0;
const ok = (c, l) => { if (c) { pass += 1; console.log(`  ok - ${l}`); } else { fail += 1; console.error(`  FAIL - ${l}`); } };
const mkBook = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), "t2-")); fs.mkdirSync(path.join(d, "novel", "03_character_bible"), { recursive: true }); for (const n of ["林逸", "苏眠", "管理员"]) fs.writeFileSync(path.join(d, "novel", "03_character_bible", `${n}.md`), `# ${n}\nG1-A fixture 身份录取。\n`); return d; };

const EV_X = { id: 'evt_lock_1', sceneId: 's1', kind: 'action', actors: ['林逸'], action: '管理员在夜间进入档案区', consequence: '', stateChanges: [], affectedEntities: ['林逸'], evidence: { excerpt: '管理员在夜间进入档案区' }, source: 'annotated' };
const SCENE_A = {
  id: 's1', index: 1, pov: '林逸', present: ['林逸'],
  text: '管理员在夜间进入档案区。林夜贴墙观察。',
  actualEvents: [EV_X, { ...EV_X, id: 'evt_a2', actors: ['林逸'], action: '林逸贴墙观察', affectedEntities: ['林逸'] }],
};

console.log('# EO-CW-Trace-01');

console.log('## T2-01/08-13 — Actual+可及 → T2；零 belief/interpretation/stance/goal/choice/action');
{
  const book = mkBook();
  const { appended } = appendT2Experiences(book, { scene: SCENE_A, chapter: 1, candidateNames: ['林逸', '苏眠'] });
  const w = loadCharacterWorld(book);
  const a = w.characters['林逸'];
  ok(appended === 2 && a.experiences.length === 2, '可及角色两条 occurrence → T2×2');
  const e = a.experiences[0];
  ok(e.actualRef === 'evt_lock_1' && e.chapterRef === 1 && e.sceneRef === 's1' && e.access === 'participant', '引用式字段 + access=participant');
  ok(e.provenance.source === T2_TRACE_SOURCE && e.summary === '管理员在夜间进入档案区', 'provenance=t2_actual_trace + summary=Actual action 原文');
  ok(!JSON.stringify(w).match(/"(goal|choice|agency|action)":/), '无 goal/choice/agency/action 字段');
  ok((a.belief || []).length === 0 && (a.interpretation || []).length === 0 && (a.stance || []).length === 0, 'T2 不产生 belief/interpretation/stance');
}

console.log('## T2-02/03 — 不可及/隔离');
{
  const book = mkBook();
  const sceneB = { ...SCENE_A, present: ['林逸'], pov: '林逸' }; // 苏眠不在场
  appendT2Experiences(book, { scene: sceneB, chapter: 1, candidateNames: ['林逸', '苏眠'] });
  const w = loadCharacterWorld(book);
  ok((w.characters['苏眠']?.experiences || []).length === 0, '苏眠不可及 → 无 T2');
  ok(!JSON.stringify(w.characters['苏眠'] || {}).includes('档案区'), 'B 不含 A 的经历内容');
}

console.log('## T2-04 — 跨角色不串写');
{
  const book = mkBook();
  appendT2Experiences(book, { scene: SCENE_A, chapter: 1, candidateNames: ['林逸'] });
  const w = loadCharacterWorld(book);
  ok(w.characters['林逸'].experiences.every((e) => e.characterId === '林逸'), '所有条目 characterId=本人');
}

console.log('## T2-05 — 幂等');
{
  const book = mkBook();
  appendT2Experiences(book, { scene: SCENE_A, chapter: 1, candidateNames: ['林逸'] });
  const r2 = appendT2Experiences(book, { scene: SCENE_A, chapter: 1, candidateNames: ['林逸'] });
  const r3 = appendT2Experiences(book, { scene: SCENE_A, chapter: 1, candidateNames: ['林逸'] });
  ok(r2.appended === 0 && r3.appended === 0, '重跑零追加');
  ok(loadCharacterWorld(book).characters['林逸'].experiences.length === 2, 'T2 仍 ×2（不膨胀）');
}

console.log('## T2-06/07 — 跨章存续 + 删 SR 后仍可投影');
{
  const book = mkBook();
  appendT2Experiences(book, { scene: SCENE_A, chapter: 1, candidateNames: ['林逸'] });
  // 模拟 Ch2：新场景提及档案区（激活词）
  const scene2 = { id: 's3', index: 1, pov: '林逸', text: '林逸再次路过档案区，脚步慢了下来。', actualEvents: [] };
  const proj = projectWorldToSRScene({ world: loadCharacterWorld(book), characterNames: ['林逸'], scene: scene2, chapter: 2 });
  const st = applyCharacterSRAfterActual(book, 2, scene2, { extraNames: ['林逸'], worldProjection: proj });
  ok(st.characters['林逸'].awareness.items.some((i) => i.fromT2 === true && String(i.info).includes('档案区')), 'T2 经投影作为历史背景入 SR（context_active）');
  // 删除 Ch1/Ch2 SR sidecar → World T2 仍在
  const srDir = path.join(book, 'novel', '_system', 'brain', 'character_sr');
  if (fs.existsSync(srDir)) fs.rmSync(srDir, { recursive: true });
  const wAfter = loadCharacterWorld(book);
  ok(wAfter.characters['林逸'].experiences.length === 2, 'T2-07：删 SR 后 World T2 存续');
  // background T2 不入投影（无激活词场景）
  const sceneCold = { id: 's4', text: '两人在码头等船。', actualEvents: [] };
  const projCold = projectWorldToSRScene({ world: wAfter, characterNames: ['林逸'], scene: sceneCold, chapter: 3 });
  ok(!(projCold['林逸']?.awareness || []).some((i) => i.fromT2), '无激活词 → T2 留 World（不入 SR）');
}

console.log('## T2-14 — Reality 防火墙（不写 Canon/Actual/State）');
{
  const book = mkBook();
  appendT2Experiences(book, { scene: SCENE_A, chapter: 1, candidateNames: ['林逸'] });
  const novelDir = path.join(book, 'novel');
  ['11_timeline.yaml', '13_facts_db.yaml', '08_current_state.md', '07_state_board.md'].forEach((f) => {
    ok(!fs.existsSync(path.join(novelDir, f)), `未写 ${f}`);
  });
  // Actual occurrence 原文件域（scenes sidecar）不含 T2 追加内容
  ok(JSON.stringify(loadCharacterWorld(book)).includes('t2_actual_trace'), 'T2 只在 World 侧');
}

console.log('## T2-15/16/17 — Plan/Writer/Bible 反洗白');
{
  const book = mkBook();
  const sceneBaggage = {
    ...SCENE_A, goal: '林逸决定调查', mainGoal: '揭露', causalChain: { options: [{ action: 'A' }] },
    characterDecisions: [{ characterId: '林逸', actionContent: '去后门' }],
  };
  appendT2Experiences(book, { scene: sceneBaggage, chapter: 1, candidateNames: ['林逸'] });
  const blob = JSON.stringify(loadCharacterWorld(book));
  ok(!blob.includes('决定调查') && !blob.includes('揭露') && !blob.includes('去后门'), 'Plan 字段零入 T2');
  // Writer prose 断言（"他想起X"）不产生 T2——T2 输入仅 actualEvents（结构断言）
  const sceneProse = { ...SCENE_A, text: '他想起小时候的档案区。' , actualEvents: [] };
  const r = appendT2Experiences(book, { scene: sceneProse, chapter: 1, candidateNames: ['林逸'] });
  ok(r.appended === 0, 'prose-only（无 occurrence）→ 零 T2');
  // bible/personality：候选名单传入了也只看 Actual access
  ok(!blob.includes('personality'), '无 personality 通道');
}

console.log('## T2-18 — 未来事件防火墙');
{
  const book = mkBook();
  const planFile = path.join(book, 'novel', '_system', 'chapter_plans', 'chapter_0009.yaml');
  fs.mkdirSync(path.dirname(planFile), { recursive: true });
  writeYaml(planFile, { goal: 'x', scenes: ['管理员将在第九章背叛'] });
  appendT2Experiences(book, { scene: SCENE_A, chapter: 1, candidateNames: ['林逸'] });
  ok(!JSON.stringify(loadCharacterWorld(book)).includes('第九章背叛'), '未来 plan 事件不入 T2');
}

console.log('## T2-19 — 无 SR→World 隐秘路由');
{
  const book = mkBook();
  const scene = { ...SCENE_A };
  applyCharacterSRAfterActual(book, 1, scene, { extraNames: ['林逸'] }); // 只产 SR
  const w = loadCharacterWorld(book);
  ok(Object.keys(w.characters).length === 0, '纯 SR 调用不写 World（唯一入径=T2 Actual 路由/seed）');
}

console.log('## T2-20 + seed 共存 — provenance 完整 + 重跑 seed 不清 T2');
{
  const book = mkBook();
  fs.mkdirSync(path.dirname(seedFile(book)), { recursive: true });
  writeYaml(seedFile(book), {
    version: 'character-world-seed-1',
    experiences: [{ id: 'exp_a1', characterId: '林逸', text: '过往冲突' }],
    characters: { 林逸: { belief: [{ proposition: '管理员在防着什么', basis: 'inferred_from_known', basisRef: 'exp_a1' }] } },
  });
  syncCharacterWorldFromSeeds(book);
  appendT2Experiences(book, { scene: SCENE_A, chapter: 1, candidateNames: ['林逸', '管理员'] });
  // 追加一条管理员为 actor 的可及事件（present 含管理员 → present_witness 或 participant）
  const SCENE_ADMIN = {
    id: 's2', pov: '林逸', present: ['林逸', '管理员'], text: '管理员锁上档案区侧门。',
    actualEvents: [{ id: 'evt_side_1', sceneId: 's2', kind: 'action', actors: ['管理员'], action: '管理员锁上档案区侧门', consequence: '', stateChanges: [], affectedEntities: ['管理员'], evidence: { excerpt: 'x' }, source: 'annotated' }],
  };
  appendT2Experiences(book, { scene: SCENE_ADMIN, chapter: 1, candidateNames: ['林逸', '管理员'] });
  // 重跑 sync（如 Ch2 章首）
  syncCharacterWorldFromSeeds(book);
  const w = loadCharacterWorld(book);
  ok(w.characters['林逸'].belief.length === 1, 'seed belief 保留');
  ok(w.characters['林逸'].experiences.length >= 2, 'seed 重跑不清 T2');
  ok((w.characters['管理员']?.experiences || []).length >= 1
    && w.characters['管理员'].experiences.every((e) => e.provenance.source === T2_TRACE_SOURCE
      && e.provenance.accessKind && e.chapterRef === 1), '未 seed 角色（管理员）T2 块保留 + provenance 完整');
  ok(w.characters['林逸'].experiences.every((e) => e.provenance.source === T2_TRACE_SOURCE
    && e.provenance.accessKind && e.chapterRef === 1), 'T2-20 provenance 完整');
}

console.log(`\n# EO-CW-Trace-01: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
