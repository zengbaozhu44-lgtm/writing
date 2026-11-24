#!/usr/bin/env node
/**
 * EO-P4-Authored-CADE-Channel-01 — 主链测试
 *
 * authored characterDecisions（人物侧显式创作通道，设计门 §B 唯一合法 CADE 生产者）
 * → CADE sidecar → Action Intent Truth → Character Action Truth → World Consequence Truth
 *
 * 边界：不扫 Plan 字段；逐项 fail-closed；isChoice 恒 false。
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  mintCADEFromAuthoredDecisions,
  loadCADEChapter,
  attachActionIntentTruthFromCADE,
  resolveSceneCADE,
  attachCharacterActionTruth,
  attachWorldConsequenceTruth,
} from '../packages/inkos-brain/src/causality/index.js';
import { serializeAuthoredPlanToIntent } from '../packages/inkos-brain/src/planner/planner.js';

let pass = 0;
let fail = 0;
function ok(cond, label) {
  if (cond) { pass += 1; console.log(`  ok - ${label}`); }
  else { fail += 1; console.error(`  FAIL - ${label}`); }
}

const SCENE_TEXT = '林夜推开厚重的铁门，冷风灌入走廊。片刻后，警报响彻整层楼，展厅的射灯全部熄灭，备用门自动上锁。';
const W = '警报响彻整层楼，展厅的射灯全部熄灭';

function newBook() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-cade-'));
}

console.log('# EO-P4-Authored-CADE-Channel-01');

console.log('## 1. authored plan → intent.characterDecisions（通道序列化）');
{
  const intent = serializeAuthoredPlanToIntent({
    pov: '林夜',
    goal: '潜入档案室',
    scenes: ['林夜抵达档案室', '林夜被拦'],
    characterDecisions: [
      { characterId: '林夜', actionContent: '推开厚重的铁门', sceneIndex: 1, decisionKind: 'commits' },
    ],
  }, 3, null);
  ok(Array.isArray(intent.characterDecisions) && intent.characterDecisions.length === 1,
    'authored plan characterDecisions → intent 通道');
  ok(intent.characterDecisions[0].actionContent === '推开厚重的铁门', '决策内容保持人物侧原样');
  const intent2 = serializeAuthoredPlanToIntent({ pov: '林夜', scenes: [] }, 3, null);
  ok(intent2.characterDecisions?.length === 0, '无 authored 决策 → 空通道');
}

console.log('## 2. mint：authored 决策 → CADE sidecar');
{
  const bookDir = newBook();
  const r = mintCADEFromAuthoredDecisions(bookDir, 3, {
    characterDecisions: [
      { characterId: '林夜', actionContent: '推开厚重的铁门', sceneIndex: 1 },
      { characterId: '苏晚', actionContent: '按下备用开关', sceneIndex: 2, decisionKind: 'decides' },
    ],
  });
  ok(r.minted.length === 2 && r.rejected.length === 0, '两条 authored 决策全部 mint');
  ok(r.minted[0].isChoice === false && r.minted[0].isCandidateOption === false,
    'CADE 显式非 Choice / 非 Candidate Option');
  ok(r.minted[0].provenance === 'character_action_decision', 'provenance = character_action_decision');
  ok(r.minted[0].sceneId === 'ch3_s1', 'sceneIndex → sceneId ch3_s1');
  const bag = loadCADEChapter(bookDir, 3);
  ok(bag.items.length === 2, 'sidecar 持久化 2 条');
  ok(bag.meta?.writesSR === false && bag.meta?.writesCanon === false, 'sidecar 不写 Canon/SR');
}

console.log('## 3. 全链：CADE → Intent Truth → Character Action → World Consequence');
{
  const bookDir = newBook();
  mintCADEFromAuthoredDecisions(bookDir, 1, {
    characterDecisions: [
      { characterId: '林夜', actionContent: '推开厚重的铁门', sceneIndex: 1 },
    ],
  });
  const scene = {
    id: 'ch1_s1',
    index: 1,
    pov: '林夜',
    text: SCENE_TEXT,
  };
  // 生产同序：Actual 提取（orchestrator 在 Intent attach 后进行，此处先补）
  const { ensureActualEvents } = await import('../packages/inkos-brain/src/events/event-extractor.js');
  ensureActualEvents(scene, { stripPlan: true });
  const occ = (scene.actualEvents || []).find((e) => e.kind === 'action' && e.actors?.includes('林夜'));
  if (occ) occ.consequence = W; // Phase 1.3 前的 grounded aftermath 注记

  attachActionIntentTruthFromCADE(bookDir, 1, scene);
  ok(scene.actionIntentTruth?.status === 'asserted', 'CADE → Action Intent Truth asserted');
  ok(scene.actionIntentTruth.actionContent === '推开厚重的铁门', 'Intent 内容 = authored 决策 Y');
  ok(scene.actionIntentTruth.isChoice === false, 'Intent ≠ Choice');

  attachCharacterActionTruth(scene);
  ok(scene.characterActionTruth?.status === 'asserted', 'Intent + occurrence → Character Action asserted');

  attachWorldConsequenceTruth(scene);
  ok(scene.worldConsequenceTruth?.status === 'asserted', 'Character Action + grounded W → WCT asserted');
  ok(scene.worldConsequenceTruth.worldChangeContent === W, 'W 全链保真');
  ok(scene.worldConsequenceTruth.characterActionRef, 'WCT 回指 Character Action 链');
}

console.log('## 4. 反洗白：不扫 Plan 字段、逐项 fail-closed');
{
  const bookDir = newBook();
  const r = mintCADEFromAuthoredDecisions(bookDir, 2, {
    mainGoal: '主角占领城市',              // STORY CONTROL 字段——绝不入 CADE
    scenes: [{ goal: '林夜撬开保险柜' }],   // scene.goal ——绝不入 CADE
    characterDecisions: [
      { characterId: '林夜', actionContent: '推开厚重的铁门', sceneIndex: 1 }, // 合法
      { characterId: '', actionContent: '缺人物' },                            // 拒
      { characterId: '苏晚', actionContent: '' },                              // 拒
      { characterId: '苏晚', actionContent: '合法动作', decisionKind: 'decides' }, // 合法
      { characterId: '陈默', actionContent: '尝试', decisionKind: 'plan_task' },  // kind 拒
      { characterId: '陈默', actionContent: '带选项', options: ['a', 'b'] },      // 字段拒
      'not-an-object',                                                          // 拒
    ],
  });
  ok(r.minted.length === 2, `仅 2 条合法 authored 决策 mint（实际 ${r.minted.length}）`);
  ok(r.rejected.length === 5, `5 条逐项拒绝（实际 ${r.rejected.length}）`);
  ok(!loadCADEChapter(bookDir, 2).items.some((c) => c.actionContent?.includes('占领城市')),
    'mainGoal 未被扫入 CADE');
  ok(!loadCADEChapter(bookDir, 2).items.some((c) => c.actionContent?.includes('保险柜')),
    'scene.goal 未被扫入 CADE');
  const kinds = loadCADEChapter(bookDir, 2).items.map((c) => c.decisionKind);
  ok(kinds.every((k) => ['commits', 'decides', 'self_endorsed', 'character_decision'].includes(k)),
    'decisionKind 全部在允许集内');
}

console.log('## 5. 决策内容含 Plan 措辞时 sourceRef 语义检查');
{
  const bookDir = newBook();
  // authored 决策是独立人物侧通道——内容本身即使与 scene 目标相似，
  // 其 mint 合法性来自显式 authored 通道，而非从 goal 复制。
  // 但 sourceRef 必须是 authored.character_decision（冻结标记检查）。
  const r = mintCADEFromAuthoredDecisions(bookDir, 4, {
    characterDecisions: [{ characterId: '林夜', actionContent: '撤离大楼', sceneIndex: 1 }],
  });
  ok(r.minted.length === 1 && r.minted[0].sourceRef === 'authored.character_decision',
    'sourceRef = authored.character_decision（不携带 plan/writer 痕迹）');
}

console.log('## 6. 幂等：重复 mint 去重');
{
  const bookDir = newBook();
  const decisions = { characterDecisions: [{ characterId: '林夜', actionContent: '守住门口', sceneIndex: 1 }] };
  mintCADEFromAuthoredDecisions(bookDir, 5, decisions);
  mintCADEFromAuthoredDecisions(bookDir, 5, decisions);
  ok(loadCADEChapter(bookDir, 5).items.length === 1, '同 id CADE 去重，不重复累积');
}

console.log('## 7. 无 authored 决策 → 零副作用');
{
  const bookDir = newBook();
  const r = mintCADEFromAuthoredDecisions(bookDir, 6, { mainGoal: 'x' });
  ok(r.minted.length === 0 && r.rejected.length === 0, '空通道 → 零 mint 零拒绝');
  ok(!fs.existsSync(path.join(bookDir, 'novel', '_system', 'brain', 'cade')),
    '不创建 cade 目录（无决策时不落盘）');
}

console.log('## 8. POV 匹配：scene 无精确 sceneId 时按 pov 取最新 CADE');
{
  const bookDir = newBook();
  mintCADEFromAuthoredDecisions(bookDir, 7, {
    characterDecisions: [{ characterId: '林夜', actionContent: '熄灭火把', sceneIndex: 2 }],
  });
  const scene = { id: 'ch7_s9', index: 9, pov: '林夜', text: '场景文本。' };
  const cade = resolveSceneCADE(scene, bookDir, 7);
  ok(cade && cade.actionContent === '熄灭火把', 'pov=林夜 命中 chapter 级 CADE');
}

console.log(`\n# EO-P4-Authored-CADE-Channel-01: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
