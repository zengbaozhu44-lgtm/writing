#!/usr/bin/env node
/**
 * EO-P4-Authored-CADE-Channel-01 — PRODUCTION INTEGRATION TEST
 *
 * 真实 RuntimeOrchestrator + golden fixture 书 + 确定性 writer stub：
 *   authored plan.characterDecisions（人工 YAML）
 *   → mintCADEFromAuthoredDecisions（orchestrator 场景循环前）
 *   → CADE sidecar → attachActionIntentTruthFromCADE（逐场景）
 *   → Character Action Truth（Intent + occurrence）
 *   → World Consequence Truth（fail-closed：确定性提取器只产 echo）
 *
 * 负例：authored plan 无 characterDecisions → 全链 absent，无 CADE 落盘。
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { RuntimeOrchestrator } from '../packages/inkos-runtime/src/pipeline/orchestrator.js';
import { writeYaml } from '../packages/inkos-core/src/lib/yaml-store.js';

process.env.INKOS_LLM_API_KEY = '';
process.env.LLM_API_KEY = '';

let pass = 0;
let fail = 0;
function ok(cond, label) {
  if (cond) { pass += 1; console.log(`  ok - ${label}`); }
  else { fail += 1; console.error(`  FAIL - ${label}`); }
}

const FIXTURE = path.resolve('tests/golden-baseline/fixtures/book');

function makeBook(withDecisions) {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-cade-prod-'));
  fs.cpSync(FIXTURE, workDir, { recursive: true });
  const planDir = path.join(workDir, 'novel', '_system', 'chapter_plans');
  fs.mkdirSync(planDir, { recursive: true });
  const plan = {
    chapter: 1,
    pov: '林逸',
    goal: '林逸必须在天亮前进入封存区取回核心样本',
    conflict: '封存区闸门被人为锁死，警报系统处于武装状态',
    climax: '林逸强行开闸触发全楼警报',
    cost: '暴露行踪，撤离窗口缩短到十分钟',
    hook: '警报声中档案柜里出现不该存在的名字',
    scenes: [
      '林逸抵达封存区外围，确认闸门锁死',
      '林逸强行开闸，警报响起，取回样本后撤离',
    ],
    characterDecisions: withDecisions
      ? [{ characterId: '林逸', actionContent: '推开封存区闸门', sceneIndex: 1, decisionKind: 'commits' }]
      : [],
  };
  writeYaml(path.join(planDir, 'chapter_0001.yaml'), plan);
  return workDir;
}

function deterministicWriter() {
  return async ({ scene, intent }) => {
    const pov = intent.pov || '林逸';
    if (Number(scene.index) === 1) {
      return [
        `${pov}推开封存区闸门，金属摩擦声在走廊里炸开。`,
        `门后的应急灯闪烁着，照出一排排蒙尘的档案柜。`,
        `“必须在警报响应之前找到样本。”${pov}低声说。`,
      ].join('\n\n');
    }
    return [
      `${pov}抓住样本箱，转身朝安全通道跑去。`,
      `通道尽头的红灯次第亮起，远处传来整齐的脚步声。`,
      `“不能停下。”${pov}咬紧牙关继续向前。`,
    ].join('\n\n');
  };
}

async function runProductionChapter(workDir) {
  const runtime = new RuntimeOrchestrator(workDir, {
    writer: deterministicWriter(),
    force: true,
    noAutoNext: true,
  });
  return runtime.runChapter({ chapter: 1, force: true, noAutoNext: true });
}

console.log('# EO-P4-Authored-CADE-Channel-01 · Production Integration');

console.log('## 1. 正例：authored characterDecisions → 全链 Truth');
{
  const workDir = makeBook(true);
  const result = await runProductionChapter(workDir);

  // (a) CADE sidecar
  const cadeFile = path.join(workDir, 'novel', '_system', 'brain', 'cade', 'ch_0001.json');
  ok(fs.existsSync(cadeFile), 'CADE sidecar 落盘（生产 mint 生效）');
  const cadeBag = JSON.parse(fs.readFileSync(cadeFile, 'utf8'));
  ok(cadeBag.items.length === 1, 'sidecar 恰 1 条 CADE');
  const cade = cadeBag.items[0];
  ok(cade.provenance === 'character_action_decision', 'provenance = character_action_decision');
  ok(cade.sourceRef === 'authored.character_decision', 'sourceRef = authored.character_decision（人工通道痕迹）');
  ok(cade.isChoice === false, 'isChoice: false');
  ok(cade.sceneId === 'ch1_s1' && cade.characterId === '林逸', '人物 + 场景绑定正确');

  // (b) 场景级 Truth（持久化产物）
  const scenesFile = path.join(workDir, 'novel', '_system', 'brain', 'ch_0001_scenes.json');
  const scenesBag = JSON.parse(fs.readFileSync(scenesFile, 'utf8'));
  const s1 = (scenesBag.scenes || []).find((s) => s.index === 1);
  ok(s1?.actionIntentTruth?.status === 'asserted', 'Scene1 actionIntentTruth asserted（生产读回生效）');
  ok(s1?.actionIntentTruth?.actionContent === '推开封存区闸门', 'Intent Y = authored 决策原文');
  ok(s1?.actionIntentTruth?.isChoice === false, 'Intent ≠ Choice');
  ok(s1?.characterActionTruth?.status === 'asserted', 'Scene1 characterActionTruth asserted（Intent + occurrence）');
  ok(s1?.characterActionTruth?.occurrenceRef, 'Character Action 回指 occurrence');
  ok(Array.isArray(s1?.actualEvents) && s1.actualEvents.length > 0, 'Actual occurrences 存在');

  // (c) WCT fail-closed（确定性提取器 consequence 为 canned echo）
  ok(s1?.worldConsequenceTruth?.status === 'absent', 'WCT absent（echo fail-closed，不放宽 grounding）');
  ok(Boolean(s1?.worldConsequenceTruth?.reason), `WCT 缺席原因已记录（${s1?.worldConsequenceTruth?.reason}）`);

  // (d) 章节产物通过（主生产路径未因链路受阻）
  ok(result?.pass !== false, `章节生产完成（pass=${result?.pass}）`);
}

console.log('## 2. 负例：authored plan 无 characterDecisions → 全链 absent');
{
  const workDir = makeBook(false);
  const result = await runProductionChapter(workDir);

  const cadeFile = path.join(workDir, 'novel', '_system', 'brain', 'cade', 'ch_0001.json');
  ok(!fs.existsSync(cadeFile), '无 authored 决策 → 无 CADE 落盘（fail-closed）');
  const scenesFile = path.join(workDir, 'novel', '_system', 'brain', 'ch_0001_scenes.json');
  const scenesBag = JSON.parse(fs.readFileSync(scenesFile, 'utf8'));
  const s1 = (scenesBag.scenes || []).find((s) => s.index === 1);
  ok(s1 && (!s1.actionIntentTruth || s1.actionIntentTruth.status === 'absent'),
    'Scene1 无 Intent Truth（Plan-only 不自动产生 Character Causality）');
  ok(s1 && (!s1.characterActionTruth || s1.characterActionTruth.status === 'absent'),
    'Scene1 无 Character Action Truth');
  ok(s1 && (!s1.worldConsequenceTruth || s1.worldConsequenceTruth.status === 'absent'),
    'Scene1 无 WCT');
  ok(Array.isArray(s1?.actualEvents) && s1.actualEvents.length > 0,
    'Actual 提取照常运行（occurrence 层不受影响）');
  ok(result?.pass !== false, `Plan-only 章节生产照常完成（pass=${result?.pass}）`);
}

console.log(`\n# EO-P4-Authored-CADE-Production-01: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
