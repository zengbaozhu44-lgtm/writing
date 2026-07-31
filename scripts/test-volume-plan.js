#!/usr/bin/env node
/**
 * 冒烟：卷纲 upstream fingerprint + staleness + save
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const toUrl = (p) => pathToFileURL(p).href;

const {
  fingerprintFromWizardContent,
  buildVolumeUpstreamContext,
  computeUpstreamFingerprint,
  getVolumePlan,
  saveVolumePlan,
  bindVolumeFingerprint,
  saveConflictCalibration,
} = await import(toUrl(path.join(root, 'packages/inkos-studio-server/src/volume-plan.js')));

const { initBookV4 } = await import(toUrl(path.join(root, 'packages/inkos-core/src/workflows/init.js')));
const { writeModule } = await import(toUrl(path.join(root, 'packages/inkos-studio-server/src/module-service.js')));
const { writeStoryDna } = await import(toUrl(path.join(root, 'packages/inkos-studio-server/src/system-store.js')));

let n = 0;
function ok(label) {
  n += 1;
  console.log(`✓ ${label}`);
}

{
  const a = fingerprintFromWizardContent({
    worldMarkdown: '世界A',
    characters: [{ fields: { name: '林异', goal: '活下去' } }],
    factions: [{ name: '秩序局', markdown: '# 秩序局' }],
    conflictBrief: '主线冲突：私服 vs 秩序',
  });
  const b = fingerprintFromWizardContent({
    worldMarkdown: '世界B',
    characters: [{ fields: { name: '林异', goal: '活下去' } }],
    factions: [{ name: '秩序局', markdown: '# 秩序局' }],
    conflictBrief: '主线冲突：私服 vs 秩序',
  });
  assert.notEqual(a.combined, b.combined);
  assert.notEqual(a.world, b.world);
  assert.equal(a.characters, b.characters);
  ok('wizard fingerprint changes with world');
}

{
  const brief = buildVolumeUpstreamContext({
    worldMarkdown: '废墟末世',
    characters: [{ fields: { name: '林异', role: '主角', goal: '搭建私服' } }],
    factions: [{ name: '秩序局', markdown: '# 秩序局\n- **简介**：监管' }],
    conflictBrief: 'WARN 主角目标与世界规则冲突',
    openingHook: '清道夫之夜',
    coreMystery: '赫利俄斯是什么',
    volumeChapterCount: 30,
  });
  assert.match(brief, /林异/);
  assert.match(brief, /秩序局/);
  assert.match(brief, /废墟末世/);
  assert.match(brief, /清道夫之夜/);
  ok('upstream brief includes world/chars/factions');
}

{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-vol-'));
  const bookId = 'test_vol_plan';
  const targetDir = path.join(tmp, bookId);
  initBookV4({ bookId, title: '测试卷纲', genre: '都市异能', targetDir });
  writeStoryDna(targetDir, { title: '测试卷纲', main_conflict: '冲突A', core_hook: '钩子' });
  writeModule(targetDir, 'world', { content: '# 世界\n旧世界' });
  writeModule(targetDir, 'characters', { content: '# 林异\n主角' }, '林异.md');
  writeModule(targetDir, 'factions', { content: '# 秩序局\n监管' }, '秩序局.md');

  saveVolumePlan(targetDir, {
    markdown: '# 第一卷\n旧规划',
    refreshFingerprint: true,
    editedBy: 'ai',
  });
  let plan = getVolumePlan(targetDir, 1);
  assert.equal(plan.isStale, false);
  assert.match(plan.markdown, /旧规划/);
  ok('fresh volume not stale');

  // 模拟建书：落盘后用 computeUpstreamFingerprint 绑定，不应因 wizard hash 形状而 stale
  bindVolumeFingerprint(targetDir, 1, {
    fingerprint: computeUpstreamFingerprint(targetDir),
    editedBy: 'wizard',
  });
  plan = getVolumePlan(targetDir, 1);
  assert.equal(plan.isStale, false);
  ok('disk fingerprint bind is not immediately stale');

  writeModule(targetDir, 'world', { content: '# 世界\n新世界设定变更' });
  plan = getVolumePlan(targetDir, 1);
  assert.equal(plan.isStale, true);
  assert.ok(plan.changedParts.includes('world'));
  ok('world edit marks volume stale');

  // 手动编辑：保留 fingerprint → 仍 stale
  plan = saveVolumePlan(targetDir, {
    markdown: '# 第一卷\n用户手改规划',
    refreshFingerprint: false,
    editedBy: 'user',
  });
  assert.equal(plan.isStale, true);
  assert.match(plan.markdown, /用户手改/);
  ok('manual edit preserves fingerprint (still stale)');

  // 重新生成对齐指纹
  plan = saveVolumePlan(targetDir, {
    markdown: '# 第一卷\n基于新世界的规划',
    refreshFingerprint: true,
    editedBy: 'ai',
  });
  assert.equal(plan.isStale, false);
  ok('regenerate refreshes fingerprint');

  const fp = computeUpstreamFingerprint(targetDir);
  assert.equal(typeof fp.combined, 'string');
  assert.equal(fp.combined.length, 16);
  ok('computeUpstreamFingerprint shape');

  // cleanup
  fs.rmSync(tmp, { recursive: true, force: true });
}

{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-vol-'));
  const bookId = 'test_vol_dna';
  const targetDir = path.join(tmp, bookId);
  initBookV4({ bookId, title: 'DNA冲突', genre: '都市异能', targetDir });
  writeStoryDna(targetDir, { title: 'DNA冲突', main_conflict: '冲突A', core_hook: '钩子A', theme: '主题A' });
  writeModule(targetDir, 'world', { content: '# 世界' });
  writeModule(targetDir, 'characters', { content: '# 主角' }, '主角.md');
  writeModule(targetDir, 'factions', { content: '# 势力' }, '势力.md');
  saveConflictCalibration(targetDir, {
    core_conflict: '校准冲突',
    stakes: '赌注',
    escalation_phases: [{ chapter: 1, tone: '压抑', event: 'e', ending: 'hook' }],
  });
  saveVolumePlan(targetDir, { markdown: '# 卷', refreshFingerprint: true, editedBy: 'ai' });
  assert.equal(getVolumePlan(targetDir, 1).isStale, false);

  // 只改 DNA theme → 也应 stale（DNA 已纳入 conflict 指纹）
  writeStoryDna(targetDir, { title: 'DNA冲突', main_conflict: '冲突A', core_hook: '钩子A', theme: '主题B' });
  const plan = getVolumePlan(targetDir, 1);
  assert.equal(plan.isStale, true);
  assert.ok(plan.changedParts.includes('conflict'));
  ok('DNA-only edit marks conflict stale even with calibration file');

  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(`\nAll ${n} checks passed.`);
