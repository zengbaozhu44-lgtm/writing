#!/usr/bin/env node
/**
 * EO-P4-Chapter-Seam-Actual-Readback-01 — 主链测试
 *
 * 章缝：chapter N+1 Scene 1 无同章前场 → 消费上一章持久化
 * ch_(N)_scenes.json 的 actualEvents + worldConsequenceTruth（consume-only）。
 *
 * fail-closed：无文件 / 无文本 / chapter<=1 → 空，行为与旧版一致。
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadPriorChapterScenesForActual, compileScenePrompt } from '../packages/inkos-prompt/src/compiler.js';
import { collectPreviousActualEvents, formatActualEventsBlock } from '../packages/inkos-brain/src/events/actual-events-prompt.js';

let pass = 0;
let fail = 0;
function ok(cond, label) {
  if (cond) { pass += 1; console.log(`  ok - ${label}`); }
  else { fail += 1; console.error(`  FAIL - ${label}`); }
}

const W = '警报响彻整层楼，展厅的射灯全部熄灭';

function makePriorScenesFile(bookDir) {
  const dir = path.join(bookDir, 'novel', '_system', 'brain');
  fs.mkdirSync(dir, { recursive: true });
  const scenes = [
    {
      id: 's1', index: 1, text: '苏晚清点物资，把地图铺在桌上。',
      actualEvents: [{
        id: 'evt_c1_s1_presence', sceneId: 's1', kind: 'presence',
        actors: ['苏晚'], action: '苏晚清点物资',
        consequence: '', stateChanges: [], affectedEntities: ['苏晚'],
        evidence: { excerpt: '苏晚清点物资', offset: 0 }, source: 'scene.text',
      }],
    },
    {
      id: 's2', index: 2, text: '林夜推开厚重的铁门，冷风灌入走廊。片刻后，警报响彻整层楼，展厅的射灯全部熄灭，备用门自动上锁。',
      actualEvents: [{
        id: 'evt_c1_s2_action_0', sceneId: 's2', kind: 'action',
        actors: ['林夜'], action: '林夜推开厚重的铁门',
        consequence: W, stateChanges: ['action:林夜:推开'], affectedEntities: ['林夜'],
        evidence: { excerpt: '林夜推开厚重的铁门', offset: 0 }, source: 'scene.text',
      }],
      worldConsequenceTruth: {
        version: 'world-consequence-truth-1', status: 'asserted',
        characterId: '林夜', characterActionRef: 'intent:林夜:推开厚重的铁门',
        actionContent: '推开厚重的铁门', worldChangeContent: W,
        occurrenceRef: 'evt_c1_s2_action_0', reason: 'consequence_grounded',
        provenance: 'character_action_world_consequence', isChoice: false,
      },
    },
    { id: 's3', index: 3, text: '' }, // 无文本 → 应被过滤
  ];
  fs.writeFileSync(path.join(dir, 'ch_0001_scenes.json'), JSON.stringify({ chapter: 1, scenes }));
}

console.log('# EO-P4-Chapter-Seam-Actual-Readback-01');

const bookDir = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-seam-'));
makePriorScenesFile(bookDir);

console.log('## 1. loadPriorChapterScenesForActual');
{
  const seam = loadPriorChapterScenesForActual(bookDir, 2);
  ok(seam.length === 2, 'chapter 2 → 取上一章最后 2 个有文本 scene');
  ok(seam[0].id === 's1' && seam[1].id === 's2', '顺序保持，空文本 scene 被过滤');
  ok(loadPriorChapterScenesForActual(bookDir, 1).length === 0, 'chapter 1 → 空（无上一章）');
  ok(loadPriorChapterScenesForActual(null, 2).length === 0, '无 bookDir → 空');
  const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-seam-e-'));
  ok(loadPriorChapterScenesForActual(emptyDir, 2).length === 0, '无持久化文件 → 空（fail-closed）');
  const corruptDir = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-seam-x-'));
  fs.mkdirSync(path.join(corruptDir, 'novel', '_system', 'brain'), { recursive: true });
  fs.writeFileSync(path.join(corruptDir, 'novel', '_system', 'brain', 'ch_0001_scenes.json'), '{broken');
  ok(loadPriorChapterScenesForActual(corruptDir, 2).length === 0, '损坏 JSON → 空（fail-closed，不 crash）');
}

console.log('## 2. 章缝组合：seam scenes → Actual/WCT 读回');
{
  const seam = loadPriorChapterScenesForActual(bookDir, 2);
  const bundle = collectPreviousActualEvents(seam);
  ok(bundle.events.length >= 1, '上一章 occurrences 进入读回');
  ok(bundle.worldConsequences.length === 1, '上一章 WCT 进入读回');
  ok(bundle.worldConsequences[0].worldChangeContent === W, 'W 内容一致');
  const block = formatActualEventsBlock(bundle);
  ok(block.includes('### Proven World Consequences'), 'Proven 段出现在章缝读回');
  ok(block.includes('警报响彻整层楼'), 'W 文本进入 Writer 上下文');
}

console.log('## 3. compileScenePrompt 章缝集成（chapter 2 · Scene 1）');
{
  const ctx = { bookDir, chapter: 2, pov: '林夜', present: [], facts: [], intent: { pov: '林夜', scenes: [] } };
  const scene = { id: 'c2s1', index: 1, goal: '承接上一章后果', text: '' };
  const compiled = compileScenePrompt(ctx, scene);
  const prompt = String(compiled?.text || '');
  ok(prompt.includes('Previous Scene Occurrence Events'), '章缝 Scene 1 得到 Occurrence 读回');
  ok(prompt.includes('Proven World Consequences'), '章缝 Scene 1 得到 Proven WCT 读回');
  ok(prompt.includes('警报响彻整层楼'), '上一章世界变化 W 进入第 2 章首场 prompt');
}

console.log('## 4. 行为不变性：chapter 1 · Scene 1（无任何前史）');
{
  const ctx = { bookDir, chapter: 1, pov: '林夜', present: [], facts: [], intent: { pov: '林夜', scenes: [] } };
  const scene = { id: 'c1s1', index: 1, goal: '开场', text: '' };
  const compiled = compileScenePrompt(ctx, scene);
  const prompt = String(compiled?.text || '');
  ok(!prompt.includes('Previous Scene Occurrence Events'), '第 1 章首场不出现 Occurrence 读回');
  ok(!prompt.includes('Proven World Consequences'), '第 1 章首场不出现 WCT 读回');
}

console.log('## 5. 同章优先：chapter 2 · Scene 2 用同章前场，不重复章缝');
{
  const sameChapterPrev = {
    id: 'c2s1', index: 1, text: '陈默坐下，翻开地图。',
    actualEvents: [{
      id: 'evt_c2_s1_presence', sceneId: 'c2s1', kind: 'presence',
      actors: ['陈默'], action: '陈默坐下',
      consequence: '', stateChanges: [], affectedEntities: ['陈默'],
      evidence: { excerpt: '陈默坐下', offset: 0 }, source: 'scene.text',
    }],
  };
  const ctx = { bookDir, chapter: 2, pov: '林夜', present: [], facts: [], intent: { pov: '林夜', scenes: [sameChapterPrev] } };
  const scene = { id: 'c2s2', index: 2, goal: '继续', text: '' };
  const compiled = compileScenePrompt(ctx, scene);
  const prompt = String(compiled?.text || '');
  ok(prompt.includes('陈默坐下'), '同章前场 occurrence 优先');
  ok(!prompt.includes('警报响彻整层楼'), '章缝 WCT 不再重复注入（同章已有前场）');
}

console.log('## 6. Plan 不能经章缝注入');
{
  const planDir = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-seam-p-'));
  const dir = path.join(planDir, 'novel', '_system', 'brain');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'ch_0001_scenes.json'), JSON.stringify({
    chapter: 1,
    scenes: [{
      id: 's1', index: 1, text: '测试文本。',
      consequence: '主角将赢得战争', goal: '计划目标',
      actualEvents: [],
    }],
  }));
  const seam = loadPriorChapterScenesForActual(planDir, 2);
  const bundle = collectPreviousActualEvents(seam);
  ok(bundle.worldConsequences.length === 0, 'Plan consequence 不进 worldConsequences');
  const block = formatActualEventsBlock(bundle);
  ok(!block.includes('主角将赢得战争') || !block.includes('Proven'), 'Plan 字段不进 Proven 段');
}

console.log('## 7. Studio Beat 路径章缝对齐（compileSlimBeatUserPrompt）');
{
  const { compileSlimBeatUserPrompt } = await import(
    '../packages/inkos-studio-server/src/writer-optimization/beat-slimmer.js'
  );
  const scene = {
    id: 'c2s1', index: 1, goal: '承接上一章后果', pov: '林夜',
    _bookDir: bookDir, _chapter: 2,
  };
  const intent = {
    pov: '林夜', mainGoal: '承接', scenes: [],
    _bookDir: bookDir, _chapter: 2,
  };
  const prompt = compileSlimBeatUserPrompt({
    beat: { order: 1, label: '开场', libraryBeat: 'Discovery', content: '承接', wordBudget: 180 },
    scene,
    intent,
    executionPlan: { chapter: 2, sceneIndex: 1, scenePlan: { goal: '承接上一章后果' }, beats: [{ order: 1 }] },
  });
  ok(prompt.includes('Previous Scene Occurrence Events') || /Proven Actual \(compact\)|- Actual:/u.test(prompt),
    'Studio Beat 章缝 Scene 1 得到 Occurrence/compact Actual');
  ok(prompt.includes('Proven World Consequences') || /^- WCT:/mu.test(prompt) || prompt.includes('警报响彻整层楼'),
    'Studio Beat 章缝 Scene 1 得到 WCT / W');
  ok(prompt.includes('警报响彻整层楼') || prompt.includes('推开厚重的铁门'),
    '上一章世界事实进入 Studio Beat Writer input');

  // chapter 1 Scene 1: no fabricate
  const p1 = compileSlimBeatUserPrompt({
    beat: { order: 1, label: '开场', libraryBeat: 'Discovery', content: '开场', wordBudget: 180 },
    scene: { id: 'c1s1', index: 1, goal: '开场', _bookDir: bookDir, _chapter: 1 },
    intent: { pov: '林夜', scenes: [], _bookDir: bookDir, _chapter: 1 },
    executionPlan: { chapter: 1, sceneIndex: 1, scenePlan: { goal: '开场' }, beats: [{ order: 1 }] },
  });
  ok(!p1.includes('警报响彻整层楼'), 'Studio Beat 第1章首场不注入章缝 W');
}

console.log(`\n# EO-P4-Chapter-Seam-Actual-Readback-01: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
