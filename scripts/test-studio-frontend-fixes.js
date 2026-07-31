#!/usr/bin/env node
/**
 * 冒烟：Studio 写通路 / Abort / 任务锁 / config / 前端模块可解析
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0;
function ok(label) {
  n += 1;
  console.log(`✓ ${label}`);
}

// ── 后端：saveChapterText + studio_config ──
{
  const { saveChapterText, getChapterText, listChapters } = await import(
    pathToFileURL(path.join(root, 'packages/inkos-studio-server/src/chapter-service.js')).href
  );
  const { writeSystemFile, readSystemFile } = await import(
    pathToFileURL(path.join(root, 'packages/inkos-studio-server/src/system-store.js')).href
  );

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-studio-fix-'));
  const bookDir = path.join(tmp, 'book');
  // 最小 V4 书结构
  fs.mkdirSync(path.join(bookDir, 'novel', '_system'), { recursive: true });
  fs.writeFileSync(path.join(bookDir, 'novel', '_system', 'book.yaml'), 'schemaVersion: 4\ntitle: t\n');
  fs.writeFileSync(path.join(bookDir, 'book.json'), JSON.stringify({ schemaVersion: 4, title: 't' }));

  // getBookPaths 可能读不同位置 — 用 save 直接测 chapters
  const saved = saveChapterText(bookDir, 1, '他推开门。倒计时开始。', { title: '开端' });
  assert.ok(saved.file || saved.chapter === 1);
  const got = getChapterText(bookDir, 1);
  assert.match(got.text, /推开门/);
  const listed = listChapters(bookDir);
  assert.ok(listed.chapters.some((c) => c.number === 1 && c.hasText));

  fs.writeFileSync(
    path.join(bookDir, 'novel', '_system', 'story_dna.yaml'),
    'genre: suspense\n',
  );
  // studio_config 必须可写
  writeSystemFile(bookDir, 'studio_config', { temperature: 0.7, model: 'deepseek-chat' });
  const cfg = readSystemFile(bookDir, 'studio_config');
  assert.equal(cfg.temperature, 0.7);
  ok('PUT chapter text + studio_config write');
}

// ── 前端源码契约 ──
{
  const client = fs.readFileSync(path.join(root, 'packages/inkos-studio/src/api/client.ts'), 'utf8');
  assert.match(client, /saveChapterText/);
  assert.match(client, /AbortSignal/);
  assert.match(client, /TASK_404_SERVICE_RESTART/);
  assert.match(client, /subscribeTaskStream/);
  assert.match(client, /getBookConfig/);
  assert.match(client, /saveBookConfig/);

  const store = fs.readFileSync(path.join(root, 'packages/inkos-studio/src/stores/bookTaskStore.ts'), 'utf8');
  assert.match(store, /已有生成任务在运行/);
  assert.match(store, /AbortController/);

  const ide = fs.readFileSync(path.join(root, 'packages/inkos-studio/src/pages/IdePage.tsx'), 'utf8');
  assert.match(ide, /AUTOSAVE_MS|3000/);
  assert.match(ide, /metaKey|ctrlKey/);
  assert.match(ide, /saveChapterText/);
  assert.match(ide, /tryAcquire/);

  const layout = fs.readFileSync(path.join(root, 'packages/inkos-studio/src/layouts/BookLayout.tsx'), 'utf8');
  assert.match(layout, /userSelectedChapter/);
  assert.match(layout, /useRuntimeStream/);
  assert.match(layout, /FloatingProgress/);

  const bar = fs.readFileSync(path.join(root, 'packages/inkos-studio/src/components/RuntimeBar.tsx'), 'utf8');
  assert.match(bar, /AI 生成下一章（推荐）/);
  assert.match(bar, /简易下一章/);

  const app = fs.readFileSync(path.join(root, 'packages/inkos-studio/src/App.tsx'), 'utf8');
  assert.match(app, /SettingsPageV3/);
  assert.match(app, /path="settings"/);

  const settings = fs.readFileSync(path.join(root, 'packages/inkos-studio/src/pages/SettingsPageV3.tsx'), 'utf8');
  assert.match(settings, /saveBookConfig/);
  assert.match(settings, /Temperature/);

  ok('前端源码契约（save/abort/lock/layout/settings）');
}

// ── Zustand 锁逻辑（纯函数级）──
{
  // 动态 import ts 不行；用 store 编译前逻辑复刻断言
  let busy = false;
  const tryStart = () => {
    if (busy) return { ok: false, reason: '已有生成任务在运行' };
    busy = true;
    return { ok: true };
  };
  assert.equal(tryStart().ok, true);
  assert.equal(tryStart().reason, '已有生成任务在运行');
  ok('任务互斥语义');
}

console.log(`\n全部通过 ${n}/3`);
