#!/usr/bin/env node
/**
 * Golden Causal Baseline Runner — Phase 4 · D4
 *
 *   node tests/golden-causal-baseline/baseline.js build   # 固化 baseline.json
 *   node tests/golden-causal-baseline/baseline.js verify  # 重跑对比 + 结构锁
 *
 * 与 tests/golden-baseline（legacy 生成骨架）双轨独立：
 *   npm run test:golden          → legacy
 *   npm run test:golden-causal   → causal（本文件）
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  __dirname,
  SCENARIOS,
  captureAll,
  artifactsForBaseline,
  runStructuralLocks,
  diffArtifacts,
  canonicalize,
} from './lib.js';

const BASELINE_FILE = path.join(__dirname, 'baseline.json');

function loadBaseline() {
  if (!fs.existsSync(BASELINE_FILE)) {
    throw new Error('Baseline 不存在 — 先运行: node tests/golden-causal-baseline/baseline.js build');
  }
  return JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
}

function cmdBuild() {
  console.log('[golden-causal] 捕获三档场景（rich / partial+actor≠POV / degraded）…');
  const captured = captureAll();
  const lockFails = [];
  for (let i = 0; i < SCENARIOS.length; i += 1) {
    lockFails.push(...runStructuralLocks(SCENARIOS[i], captured[i]));
  }
  if (lockFails.length) {
    console.error('✗ 结构锁失败，拒绝固化:');
    for (const f of lockFails) console.error('  -', f);
    process.exit(1);
  }

  const baseline = {
    meta: {
      schemaVersion: 1,
      track: 'golden-causal-baseline',
      dualTrackPeer: 'tests/golden-baseline (legacy-generation-baseline)',
      builtAt: new Date().toISOString(),
      scenarios: SCENARIOS.map((s) => ({
        id: s.id,
        bookRel: s.bookRel,
        chapter: s.chapter,
        expectGrade: s.expectGrade,
        locks: s.locks,
      })),
    },
    artifacts: artifactsForBaseline(captured),
  };

  fs.writeFileSync(BASELINE_FILE, `${JSON.stringify(baseline, null, 2)}\n`);
  console.log('✓ baseline.json 已固化');
  for (const a of baseline.artifacts) {
    console.log(
      `  ${a.id}: grade=${a.grade} chain=${a.causalChainHash.slice(0, 12)}…`
      + ` rt=${a.runtime.promptFingerprint.slice(0, 12)}…`
      + ` studio=${a.studio.promptFingerprint.slice(0, 12)}…`,
    );
  }
}

function cmdVerify() {
  const baseline = loadBaseline();
  const want = baseline.artifacts;

  console.log('[golden-causal] 重跑捕获…');
  const captured = captureAll();
  const got = artifactsForBaseline(captured);

  const lockFails = [];
  for (let i = 0; i < SCENARIOS.length; i += 1) {
    lockFails.push(...runStructuralLocks(SCENARIOS[i], captured[i]));
    if (captured[i].ensure?.secondReasoned === true) {
      lockFails.push(`${SCENARIOS[i].id}: ensure 二次调用不应再推理`);
    }
  }
  if (lockFails.length) {
    console.error(`✗ 结构锁失败（${lockFails.length}）:`);
    for (const f of lockFails) console.error('  -', f);
    process.exit(1);
  }

  // 输入指纹：storyTruth 变了 → 先报输入漂移（书被改），要求显式 rebuild
  const inputDiffs = [];
  for (let i = 0; i < want.length; i += 1) {
    if (got[i]?.storyTruthFingerprint !== want[i]?.storyTruthFingerprint) {
      inputDiffs.push(
        `${want[i].id}: StoryTruth 指纹漂移（书输入变了）`
        + ` ${want[i].storyTruthFingerprint.slice(0, 12)} → ${got[i]?.storyTruthFingerprint?.slice(0, 12)}`,
      );
    }
  }
  if (inputDiffs.length) {
    console.error('✗ StoryTruth 输入指纹漂移 — 确认有意后重新 build:');
    for (const d of inputDiffs) console.error('  -', d);
    process.exit(1);
  }

  const diffs = diffArtifacts(canonicalize(got), canonicalize(want));
  if (diffs.length) {
    console.error(`✗ Causal 生成行为漂移（${diffs.length} 处）:`);
    for (const d of diffs.slice(0, 80)) console.error('  -', d);
    if (diffs.length > 80) console.error(`  … 还有 ${diffs.length - 80} 处`);
    process.exit(1);
  }

  console.log('✓ Golden causal baseline 通过 — 新因果路径与基线一致');
  console.log('  （legacy 轨道请用 npm run test:golden，两者互不替代）');
}

const cmd = process.argv[2] || 'verify';
try {
  if (cmd === 'build') cmdBuild();
  else if (cmd === 'verify') cmdVerify();
  else {
    console.error('用法: node tests/golden-causal-baseline/baseline.js build|verify');
    process.exit(2);
  }
} catch (err) {
  console.error('✗', err?.stack || err?.message || err);
  process.exit(1);
}
