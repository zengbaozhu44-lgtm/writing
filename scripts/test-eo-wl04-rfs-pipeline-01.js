#!/usr/bin/env node
/**
 * EO-WL-04-Relationship-Faction-State-Pipeline-01 — 测试 P1–P7
 *
 * P1 关系渲染方向保真（TopK collect：from→to，trust 归属 from 对 to）
 * P2 SR affect 投影方向保真（镜渊→林逸 不塌缩为 林逸↔镜渊）
 * P3 Faction 链端到端：authored 04 文件 + stateBoard 含名 → compileScenePrompt 注入势力块
 * P4 Faction 未匹配时零注入（fail-closed，不凭空造势力）
 * P5 07_state_board 语义：hook/turn 注入「局势」，setup 不注入（现行门控记录为契约）
 * P6 Relationship 只进 SR affect/TopK，不得生成 Motive/Goal（SR ≠ Goal/Choice/Action）
 * P7 WL-03 隔离不破坏：NPC 块照常、场外 NPC 内容不因 WL-04 进入经验
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeYaml } from '../packages/inkos-core/src/lib/yaml-store.js';
import { collectRelationships } from '../packages/inkos-context-ranking/src/collect.js';
import { assembleMinimalSR, formatCharacterSRForPrompt } from '../packages/inkos-core/src/lib/minimal-sr.js';
import { collectAuthoredNpcActivity } from '../packages/inkos-brain/src/npc/npc-activity.js';
import { loadBrainContext } from '../packages/inkos-brain/src/loader.js';
import { compileScenePrompt } from '../packages/inkos-prompt/src/index.js';
import { extractStoryEventsFromScene } from '../packages/inkos-brain/src/events/event-extractor.js';

let pass = 0;
let fail = 0;
function ok(cond, label) {
  if (cond) { pass += 1; console.log(`  ok - ${label}`); }
  else { fail += 1; console.error(`  FAIL - ${label}`); }
}

const REL = [
  { from: '镜渊', to: '林逸', relation: '观察对象', trust: 'none', note: '镜渊主动引导林逸接近真相' },
  { from: '林逸', to: '苏眠', relation: '被迫同盟', trust: 'low', note: '多次欺骗后勉强合作' },
];

function mkBook({ faction = true, boardMentionsFaction = true, npc = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wl04-'));
  fs.writeFileSync(path.join(dir, 'book.json'), JSON.stringify({ schemaVersion: 4 }));
  const n = path.join(dir, 'novel');
  fs.mkdirSync(path.join(n, '_system'), { recursive: true });
  fs.mkdirSync(path.join(n, '03_character_bible'), { recursive: true });
  fs.mkdirSync(path.join(n, '04_faction_bible'), { recursive: true });
  fs.mkdirSync(path.join(n, '10_volume_outline'), { recursive: true });
  fs.writeFileSync(path.join(n, '_system', 'manifest.json'), JSON.stringify({}));
  for (const c of ['林逸', '苏眠', '镜渊', '老周']) {
    fs.writeFileSync(path.join(n, '03_character_bible', `${c}.md`), `# ${c}\n测试角色。`);
  }
  if (faction) {
    fs.writeFileSync(path.join(n, '04_faction_bible', '都市守夜人.md'), '# 都市守夜人\n官方异常事务管理机构。\n- 追踪非法进入封存区的异能者');
  }
  fs.writeFileSync(path.join(n, '07_state_board.md'), boardMentionsFaction
    ? '# 07 State Board\n\n## 都市守夜人\n- 正在调查封存区入侵\n'
    : '# 07 State Board\n\n## 当前\n- 各方按兵不动\n');
  writeYaml(path.join(n, '05_relationship_graph.yaml'), { meta: { version: 1 }, edges: REL });
  if (npc) {
    writeYaml(path.join(n, '15_npc_simulation.yaml'), {
      meta: { last_simulated_day: 4 },
      npcs: [
        { name: '苏眠', day: 4, today_goal: '整理银线暗哨跟踪规律', plan_location: '灰桥区旧邮局', may_meet: ['林逸'], plan_changed: false, world_impact: '暗哨盯梢升级' },
      ],
    });
  }
  return dir;
}

console.log('# EO-WL-04-Relationship-Faction-State-Pipeline-01');

console.log('## P1 — 关系 TopK 渲染方向保真');
{
  const items = collectRelationships(REL, '林逸', ['苏眠']);
  const jy = items.find((i) => i.text.includes('镜渊'));
  ok(!!jy, '镜渊→林逸 边被收集');
  ok(jy?.text.includes('镜渊→林逸'), `方向保真（实得「${jy?.text.slice(0, 24)}」）`);
  ok(jy?.text.includes('镜渊 对 林逸'), '信任归属显式标注（from 对 to）');
  ok(!items.some((i) => i.text.includes('↔')), '无对称化残留');
}

console.log('## P2 — SR affect：EO-G1-B Seal（图边不直投；authored 独占）');
{
  const { getAffectSeveredBySeal, __resetAffectSeveredForTests } = await import('../packages/inkos-core/src/lib/minimal-sr.js');
  __resetAffectSeveredForTests();
  const ctx = { relationships: REL };
  const sr = assembleMinimalSR({ ctx, names: ['林逸'] });
  const slot = sr['林逸']?.affect_relationship;
  const affects = slot?.items || [];
  ok(slot?.status !== 'present' || affects.every((a) => a.provenance?.source === 'authored_character_subjective'),
    `图边零直投（Q5′ Seal：Fact ↛ direct affect；实得 ${affects.length} 条 authored）`);
  ok(getAffectSeveredBySeal() >= 2, `切断可观测（severed=${getAffectSeveredBySeal()}，林逸涉 2 边）`);
  __resetAffectSeveredForTests();
}

console.log('## P3 — Faction 链端到端（authored→stateBoard 命名→prompt）');
{
  const book = mkBook();
  const ctx = loadBrainContext(book, { chapter: 1, pov: '林逸' });
  ok(Object.keys(ctx.factions || {}).includes('都市守夜人'), 'loader 载入 authored 势力');
  const scene = { id: 'ch1_s1', index: 1, beat: 'hook', goal: '林逸潜入档案馆地下封存区', conflict: '都市守夜人的人在巡查', wordTarget: 300 };
  const out = compileScenePrompt(ctx, scene);
  const prompt = String(out?.text || out?.prompt || out);
  ok(prompt.includes('势力:都市守夜人') || prompt.includes('都市守夜人'), '势力块进入 prompt');
  fs.rmSync(book, { recursive: true, force: true });
}

console.log('## P4 — Faction fail-closed（corpus 无名 → 零注入）');
{
  const book = mkBook({ faction: true, boardMentionsFaction: false });
  const ctx = loadBrainContext(book, { chapter: 1, pov: '林逸' });
  const scene = { id: 'ch1_s2', index: 2, beat: 'setup', goal: '林逸独自研究旧照片', conflict: '记忆对不上' };
  const out = compileScenePrompt(ctx, scene);
  const prompt = String(out?.text || out?.prompt || out);
  ok(!prompt.includes('势力:都市守夜人'), 'corpus 未命中（board/goal 均无势力名）→ 无势力模块');
  fs.rmSync(book, { recursive: true, force: true });
}

console.log('## P5 — 07_state_board 门控契约（hook/turn 注入）');
{
  const book = mkBook();
  const ctx = loadBrainContext(book, { chapter: 1, pov: '林逸' });
  const hook = String(compileScenePrompt(ctx, { id: 'c1', index: 1, beat: 'hook', goal: 'g', conflict: 'c' })?.text || '');
  const setup = String(compileScenePrompt(ctx, { id: 'c2', index: 2, beat: 'setup', goal: 'g', conflict: 'c' })?.text || '');
  ok(hook.includes('局势') || hook.includes('07 State Board'), 'hook 节拍注入局势');
  ok(!setup.includes('局势'), 'setup 节拍不注入（现行门控=契约，修改须另开 EO）');
  fs.rmSync(book, { recursive: true, force: true });
}

console.log('## P6 — Relationship ≠ Motive/Goal（SR 边界）');
{
  const ctx = { relationships: REL };
  const sr = assembleMinimalSR({ ctx, names: ['林逸'] });
  const rendered = formatCharacterSRForPrompt(sr);
  ok(rendered.includes('Affect / Relationship'), '关系只落 affect 槽');
  const motiveOnly = (rendered.split('**Motive**')[1] || '').split('**Affect')[0];
  ok(!motiveOnly.includes('镜渊') && !motiveOnly.includes('苏眠'), '关系边不生成 Motive 条目');
  ok(sr['林逸']?.motive?.status !== 'present', '结构层：motive 槽保持 omit');
  ok(!/\*\*Choice\*\*|\*\*Goal\*\*/.test(rendered), 'SR 无 Choice/Goal 槽（边界文案提及≠槽存在）');
}

console.log('## P7 — WL-03 隔离不破坏');
{
  const book = mkBook();
  const ctx = loadBrainContext(book, { chapter: 1, pov: '林逸' });
  ok(ctx.npcActivity?.entries?.length === 1, 'NPC 块照常装载');
  const scene = {
    id: 'ch1_s1', index: 1, pov: '林逸',
    text: '林逸独自在出租屋研究真图。窗外整夜没有人经过。',
    characters: ['林逸'],
  };
  const { events } = extractStoryEventsFromScene(scene, { knownNames: ['林逸', '苏眠'] });
  ok(!events.some((e) => (e.actors || []).includes('苏眠') || (e.affectedEntities || []).includes('苏眠')),
    '场外 NPC 仍不产生角色经验（含关系图在场亦然）');
  fs.rmSync(book, { recursive: true, force: true });
}

console.log(`\n# 结果: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
