#!/usr/bin/env node
/**
 * Golden Baseline Runner — Phase 1.5 生成行为保护
 *
 *   node tests/golden-baseline/baseline.js build           # 跑 fixture → 固化 baseline.json
 *   node tests/golden-baseline/baseline.js verify          # 重跑 → 对比 baseline.json，漂移非零退出
 *   node tests/golden-baseline/baseline.js refresh-fixture # 从 _runtime-test 书重新冻结 fixture（输入变更时）
 *
 * 产物：baseline.json（committed golden）：
 *   meta.fixtureFingerprint  — 输入指纹（fixture 变更时 verify 先报错）
 *   meta.builtAt             — 仅展示，不参与比较
 *   artifacts.executionPlan  — 场景执行计划（goal/conflict/beat/wordTarget/executionPlan）
 *   artifacts.promptFingerprint — 每 scene 最终编译 prompt 的 sha256
 *   artifacts.gateOutputs    — consistency/metrics/critic/reader/validation/readerSimulator
 *   artifacts.memoryMutation — 新增/修改文件 → canonical hash
 *   artifacts.pipeline       — pass/stages
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  __dirname, FIXTURE_DIR, fixtureFingerprint, createWorkDir,
  captureChapter, diffBaselines,
} from './lib.js';
import { runReplanThreeState } from './replan-three-state.js';

const BASELINE_FILE = path.join(__dirname, 'baseline.json');

function loadBaseline() {
  if (!fs.existsSync(BASELINE_FILE)) {
    throw new Error(`Baseline 不存在 — 先运行: node tests/golden-baseline/baseline.js build`);
  }
  return JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
}

async function runCapture() {
  const { workDir, cleanup } = createWorkDir();
  try {
    return await captureChapter({ workDir });
  } finally {
    cleanup();
  }
}

async function cmdBuild() {
  console.log('[golden] replan 三态测试…');
  await runReplanThreeState();
  console.log('[golden] 复制 fixture → 临时目录 → 跑 ch1（确定性 stub writer，无 LLM）');
  const artifacts = await runCapture();
  const baseline = {
    meta: {
      fixtureFingerprint: fixtureFingerprint(),
      builtAt: new Date().toISOString(), // 仅展示
      schemaVersion: 1,
    },
    artifacts,
  };
  fs.writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, 2));
  console.log('✓ baseline.json 已固化');
  console.log('  executionPlan scenes :', artifacts.executionPlan.count);
  console.log('  promptFingerprint    :', Object.keys(artifacts.promptFingerprint).length, 'scenes');
  console.log('  validation checks    :', JSON.stringify(artifacts.gateOutputs.validation?.checks ?? null));
  console.log('  memoryMutation       :', Object.keys(artifacts.memoryMutation.added).length, 'added,',
    Object.keys(artifacts.memoryMutation.modified).length, 'modified');
}

async function cmdVerify({ debug = false } = {}) {
  await runReplanThreeState();
  const baseline = loadBaseline();
  const want = baseline.artifacts;

  const wantFp = baseline.meta?.fixtureFingerprint;
  const gotFp = fixtureFingerprint();
  if (wantFp && wantFp !== gotFp) {
    console.error('✗ fixture 输入指纹漂移 — fixture 被改动，请重新 build（或 refresh-fixture）');
    process.exit(1);
  }

  const artifacts = await runCapture();
  const diffs = diffBaselines(artifacts, want);

  if (diffs.length) {
    console.error(`✗ 生成行为漂移（${diffs.length} 处）:`);
    for (const d of diffs.slice(0, 60)) console.error('  -', d);
    if (diffs.length > 60) console.error(`  … 还有 ${diffs.length - 60} 处`);
    process.exit(1);
  }

  console.log('✓ Golden baseline 通过 — 生成行为与基线一致');
  if (debug) {
    console.log('  (debug) memoryMutation:', JSON.stringify(artifacts.memoryMutation, null, 2).slice(0, 2000));
  }
}

function cmdRefreshFixture() {
  const src = path.join(__dirname, '../../books/我的小说/books/_runtime-test');
  const exclude = [
    'ch_0001_run.json', 'ch_0001_scenes.json', 'ch_0002_plan.json',
    'metrics_dashboard.json', 'critic_history.json', 'conflict_history.yaml',
    'decision_history.yaml', 'scene_history.yaml', 'story_health.json',
    'prompt-cache', 'git', 'prompts', 'snapshots',
    '0001_进入世界.md', 'index.json', 'chapter_sample.md',
  ];
  fs.rmSync(FIXTURE_DIR, { recursive: true, force: true });
  fs.cpSync(src, FIXTURE_DIR, { recursive: true });
  for (const name of exclude) {
    fs.rmSync(path.join(FIXTURE_DIR, 'novel/_system/brain', name), { recursive: true, force: true });
    fs.rmSync(path.join(FIXTURE_DIR, 'novel/_system', name), { recursive: true, force: true });
    fs.rmSync(path.join(FIXTURE_DIR, 'chapters', name), { recursive: true, force: true });
    fs.rmSync(path.join(FIXTURE_DIR, name), { recursive: true, force: true });
  }
  console.log('✓ fixture 已从 _runtime-test 重新冻结，请重新 build');
}

const cmd = process.argv[2] || 'verify';
try {
  if (cmd === 'build') await cmdBuild();
  else if (cmd === 'verify') await cmdVerify({ debug: process.argv.includes('--debug') });
  else if (cmd === 'refresh-fixture') cmdRefreshFixture();
  else {
    console.error(`未知命令: ${cmd}（build / verify / refresh-fixture）`);
    process.exit(1);
  }
} catch (err) {
  console.error(err?.stack || err);
  process.exit(1);
}
