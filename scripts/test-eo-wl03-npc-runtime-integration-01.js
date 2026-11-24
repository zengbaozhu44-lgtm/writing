#!/usr/bin/env node
/**
 * EO-WL-03-NPC-Runtime-Integration-01 — 测试 P1–P8
 *
 * P1 模板条目（（填写：…）不是 Truth，不进生产上下文
 * P2 roster 门控：不在 character_bible 的名字不得注入
 * P3 空/缺失载体 → null（fail-closed）
 * P4 POV 自身条目不进块；块含显式 Access 边界
 * P5 loadBrainContext → ctx.npcActivity（loader 接线）
 * P6 compileScenePrompt → npc_offscreen_life 块（compiler 接线，含边界行）
 * P7 Access 隔离：NPC 场外动向 ≠ 角色经验（提取只读 scene.text，结构性隔离）
 * P8 无 authored 载体的书 → 无 NPC 块（零回归）
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeYaml } from '../packages/inkos-core/src/lib/yaml-store.js';
import { collectAuthoredNpcActivity } from '../packages/inkos-brain/src/npc/npc-activity.js';
import { formatNpcActivityForPrompt } from '../packages/inkos-prompt/src/npc-activity-block.js';
import { loadBrainContext } from '../packages/inkos-brain/src/loader.js';
import { compileScenePrompt } from '../packages/inkos-prompt/src/index.js';
import { extractStoryEventsFromScene } from '../packages/inkos-brain/src/events/event-extractor.js';

let pass = 0;
let fail = 0;
function ok(cond, label) {
  if (cond) { pass += 1; console.log(`  ok - ${label}`); }
  else { fail += 1; console.error(`  FAIL - ${label}`); }
}

const NPC_YAML = {
  meta: { last_simulated_day: 3 },
  npcs: [
    {
      name: '苏眠', day: 3,
      today_goal: '把银线暗哨分布图送到林逸手上，避开镜渊的跟踪',
      plan_location: '灰桥区旧邮局',
      may_meet: ['林逸'],
      plan_changed: false,
      world_impact: '镜渊察觉有人泄露暗哨位置，加派两人盯梢',
    },
    {
      name: '镜渊', day: 3,
      today_goal: '核对地下封存区门禁日志，找出上周非法进入者',
      plan_location: '档案馆地下二层',
      may_meet: ['管理员'],
      plan_changed: true,
      world_impact: '',
    },
    {
      name: '管理员', day: 3,
      today_goal: '（填写：管理员 今日现实目标）',
      plan_location: '', may_meet: [], plan_changed: false, world_impact: '',
    },
    {
      name: '幽灵角色', day: 3,
      today_goal: '不存在于角色档的注入尝试',
      plan_location: '', may_meet: [], plan_changed: false, world_impact: '',
    },
  ],
};

function mkBook(withNpc = true) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wl03-'));
  fs.writeFileSync(path.join(dir, 'book.json'), JSON.stringify({ schemaVersion: 4 }));
  const n = path.join(dir, 'novel');
  fs.mkdirSync(path.join(n, '_system'), { recursive: true });
  fs.mkdirSync(path.join(n, '03_character_bible'), { recursive: true });
  fs.mkdirSync(path.join(n, '10_volume_outline'), { recursive: true });
  fs.writeFileSync(path.join(n, '_system', 'manifest.json'), JSON.stringify({}));
  fs.writeFileSync(path.join(n, '03_character_bible', '苏眠.md'), '# 苏眠\n外线联络人。');
  fs.writeFileSync(path.join(n, '03_character_bible', '镜渊.md'), '# 镜渊\n档案馆背后的人。');
  if (withNpc) writeYaml(path.join(n, '15_npc_simulation.yaml'), NPC_YAML);
  return dir;
}

console.log('# EO-WL-03-NPC-Runtime-Integration-01');

console.log('## P1/P2 — collect：模板过滤 + roster 门控');
{
  const book = mkBook();
  const yamlPath = path.join(book, 'novel', '15_npc_simulation.yaml');
  const act = collectAuthoredNpcActivity(yamlPath, { roster: ['苏眠.md', '镜渊.md'] });
  ok(act && act.entries.length === 2, `authored 条目 = 2（实得 ${act?.entries.length}）`);
  ok(act.entries.every((e) => ['苏眠', '镜渊'].includes(e.name)), '模板(管理员)与幽灵角色被过滤');
  ok(act.entries.find((e) => e.name === '镜渊')?.plan_changed === true, 'plan_changed 保留');
  ok(act.day === 3, 'day 取自 meta.last_simulated_day');
  fs.rmSync(book, { recursive: true, force: true });
}

console.log('## P3 — fail-closed：缺失 / 全模板 → null');
{
  const book = mkBook(false);
  ok(collectAuthoredNpcActivity(path.join(book, 'novel', '15_npc_simulation.yaml'), { roster: [] }) === null, '文件缺失 → null');
  writeYaml(path.join(book, 'novel', '15_npc_simulation.yaml'), {
    meta: {},
    npcs: [{ name: '苏眠', day: 1, today_goal: '（填写：苏眠 今日现实目标）' }],
  });
  ok(collectAuthoredNpcActivity(path.join(book, 'novel', '15_npc_simulation.yaml'), { roster: ['苏眠.md'] }) === null, '全模板 → null');
  fs.rmSync(book, { recursive: true, force: true });
}

console.log('## P4 — format：POV 排除 + Access 边界');
{
  const act = collectAuthoredNpcActivity('/nonexistent/15_npc_simulation.yaml', {
    roster: NPC_YAML.npcs.slice(0, 2).map((e) => `${e.name}.md`),
  }) ?? {
    day: 3,
    entries: NPC_YAML.npcs.slice(0, 2).map(({ name, day, today_goal, plan_location, may_meet, plan_changed, world_impact }) => ({
      name, day, today_goal, plan_location, may_meet, plan_changed, world_impact,
    })),
  };
  const blockPovLin = formatNpcActivityForPrompt(act, { pov: '林逸' });
  ok(blockPovLin.includes('苏眠') && blockPovLin.includes('镜渊'), '非 POV 条目在块内');
  ok(blockPovLin.includes('禁止据此自动生成本场情节'), '边界行：非情节生成器');
  ok(blockPovLin.includes('未同框 = POV 不可知晓'), '边界行：Access 门控');
  const blockPovSu = formatNpcActivityForPrompt(act, { pov: '苏眠' });
  ok(!blockPovSu.split('\n').some((l) => l.startsWith('- 苏眠：')), 'POV(苏眠) 自身条目被排除');
  ok(formatNpcActivityForPrompt(null, {}) === '', '无数据 → 空块');
}

console.log('## P5 — loader 接线：loadBrainContext → ctx.npcActivity');
{
  const book = mkBook();
  const ctx = loadBrainContext(book, { chapter: 1, pov: '林逸' });
  ok(ctx.npcActivity && ctx.npcActivity.entries.length === 2, `ctx.npcActivity.entries = 2（实得 ${ctx.npcActivity?.entries?.length}）`);
  ok(!ctx.npcActivity.entries.some((e) => e.name === '幽灵角色'), 'loader 侧 roster 门控生效（.md 名单匹配）');
  fs.rmSync(book, { recursive: true, force: true });
}

console.log('## P6 — compiler 接线：npc_offscreen_life 块');
{
  const book = mkBook();
  const ctx = loadBrainContext(book, { chapter: 1, pov: '林逸' });
  const scene = { id: 'ch1_s1', index: 1, beat: 'hook', goal: 'g', conflict: 'c', wordTarget: 300 };
  const out = compileScenePrompt(ctx, scene);
  const prompt = String(out?.text || out?.prompt || out);
  ok(prompt.includes('NPC 动向（世界层'), 'prompt 含 NPC 动向块');
  ok(prompt.includes('禁止据此自动生成本场情节'), 'prompt 含非情节生成器边界');
  ok(!prompt.includes('幽灵角色') && !prompt.includes('（填写'), '模板/幽灵不进 prompt');
  fs.rmSync(book, { recursive: true, force: true });
}

console.log('## P7 — Access 隔离：场外动向 ≠ 角色经验');
{
  const book = mkBook();
  const ctx = loadBrainContext(book, { chapter: 1, pov: '林逸' });
  ok(!!ctx.npcActivity, '前置：ctx.npcActivity 存在');
  // 场外苏眠在灰桥区旧邮局；本场正文只有林逸独处，无苏眠
  const scene = {
    id: 'ch1_s1', index: 1, pov: '林逸',
    text: '林逸独自在出租屋研究真图背面，用放大镜看墨迹发现两层字迹。窗外整夜没有人经过。',
    characters: ['林逸'],
  };
  const { events } = extractStoryEventsFromScene(scene, { knownNames: ['林逸', '苏眠'] });
  ok(events.length > 0, '正文本身可提取（非空场景）');
  ok(!events.some((e) => (e.actors || []).includes('苏眠') || (e.affectedEntities || []).includes('苏眠')),
    '场外 NPC（仅在 prompt 世界层）不产生任何角色经验事件');
  fs.rmSync(book, { recursive: true, force: true });
}

console.log('## P8 — 零回归：无 authored 载体 → 无 NPC 块');
{
  const book = mkBook(false);
  const ctx = loadBrainContext(book, { chapter: 1, pov: '林逸' });
  ok(ctx.npcActivity === null, 'ctx.npcActivity = null');
  const scene = { id: 'ch1_s1', index: 1, beat: 'hook', goal: 'g', conflict: 'c' };
  const out = compileScenePrompt(ctx, scene);
  const prompt = String(out?.text || out?.prompt || out);
  ok(!prompt.includes('NPC 动向（世界层'), '无载体书 prompt 无 NPC 块');
  fs.rmSync(book, { recursive: true, force: true });
}

console.log(`\n# 结果: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
