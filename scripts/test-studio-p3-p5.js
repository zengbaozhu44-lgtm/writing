#!/usr/bin/env node
/**
 * 冒烟：P3–P5 诊断 API / 前端契约 / ErrorBoundary / 快捷键 / 批量 / 片段
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

// ── 后端：diagnosis 聚合 ──
{
  const { buildChapterDiagnosis, listChapterHealth } = await import(
    pathToFileURL(path.join(root, 'packages/inkos-studio-server/src/diagnosis-service.js')).href
  );
  const { saveChapterText } = await import(
    pathToFileURL(path.join(root, 'packages/inkos-studio-server/src/chapter-service.js')).href
  );

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-diag-'));
  const bookDir = path.join(tmp, 'book');
  fs.mkdirSync(path.join(bookDir, 'novel', '_system'), { recursive: true });
  fs.writeFileSync(path.join(bookDir, 'novel', '_system', 'book.yaml'), 'schemaVersion: 4\ntitle: diag\n');
  fs.writeFileSync(path.join(bookDir, 'book.json'), JSON.stringify({ schemaVersion: 4, title: 'diag' }));

  saveChapterText(bookDir, 1, '他推开门。倒计时开始。他推开门。倒计时开始。他推开门。', { title: '开端' });

  const diagnosis = buildChapterDiagnosis(bookDir, 1);
  assert.equal(diagnosis.version, 'chapter-diagnosis-1');
  assert.equal(diagnosis.chapter, 1);
  assert.ok(typeof diagnosis.overallScore === 'number');
  assert.ok(['green', 'yellow', 'red'].includes(diagnosis.level));
  assert.ok(Array.isArray(diagnosis.beats));
  assert.ok(Array.isArray(diagnosis.suggestions));
  assert.ok(typeof diagnosis.metrics.repetitionRate === 'number');
  assert.ok(diagnosis.chars > 0);

  const health = listChapterHealth(bookDir, [{ number: 1, title: '开端', hasText: true }]);
  assert.ok(health.length >= 1);
  assert.equal(health[0].chapter, 1);
  assert.ok(['green', 'yellow', 'red'].includes(health[0].level));
  ok('diagnosis + health aggregation');
}

// ── 路由注册 ──
{
  const routes = fs.readFileSync(path.join(root, 'packages/inkos-studio-server/src/routes.js'), 'utf8');
  assert.match(routes, /diagnosis/);
  assert.match(routes, /\/chapters\/health/);
  assert.match(routes, /buildChapterDiagnosis/);
  assert.match(routes, /listChapterHealth/);

  const gw = fs.readFileSync(path.join(root, 'packages/inkos-studio-server/src/api-gateway.js'), 'utf8');
  assert.match(gw, /getChapterDiagnosis/);
  assert.match(gw, /listChapterHealth/);
  ok('routes + gateway diagnosis endpoints');
}

// ── 前端源码契约 ──
{
  const client = fs.readFileSync(path.join(root, 'packages/inkos-studio/src/api/client.ts'), 'utf8');
  assert.match(client, /getChapterDiagnosis/);
  assert.match(client, /listChapterHealth/);
  assert.match(client, /ChapterDiagnosis/);

  const main = fs.readFileSync(path.join(root, 'packages/inkos-studio/src/main.tsx'), 'utf8');
  assert.match(main, /InkOSErrorBoundary/);

  const ide = fs.readFileSync(path.join(root, 'packages/inkos-studio/src/pages/IdePage.tsx'), 'utf8');
  assert.match(ide, /DiagnosticsDrawer/);
  assert.match(ide, /SnippetsDrawer/);
  assert.match(ide, /SceneSegmentEditor/);
  assert.match(ide, /BatchGenerationPanel/);
  assert.match(ide, /useLocalBackup/);
  assert.match(ide, /useKeyboardShortcuts/);
  assert.match(ide, /drawer=diagnostics/);
  assert.match(ide, /导出 MD/);

  const home = fs.readFileSync(path.join(root, 'packages/inkos-studio/src/pages/BookHomePage.tsx'), 'utf8');
  assert.match(home, /章节健康度/);
  assert.match(home, /listChapterHealth/);
  assert.match(home, /health-badge/);
  assert.match(home, /\?drawer=diagnostics/);

  const shortcuts = fs.readFileSync(path.join(root, 'packages/inkos-studio/src/hooks/useKeyboardShortcuts.ts'), 'utf8');
  assert.match(shortcuts, /onGenerate/);
  assert.match(shortcuts, /onDiagnostics/);
  assert.match(shortcuts, /shiftKey/);

  const batch = fs.readFileSync(path.join(root, 'packages/inkos-studio/src/hooks/useBatchGeneration.ts'), 'utf8');
  assert.match(batch, /runtimeRunLiving/);
  assert.match(batch, /for \(let i/);

  for (const rel of [
    'components/InkOSErrorBoundary.tsx',
    'components/drawers/DiagnosticsDrawer.tsx',
    'components/diagnostics/HealthCard.tsx',
    'components/diagnostics/BeatTimeline.tsx',
    'components/diagnostics/MetricGrid.tsx',
    'components/diagnostics/SuggestionList.tsx',
    'components/drawers/SnippetsDrawer.tsx',
    'components/SceneSegmentEditor.tsx',
    'components/BatchGenerationPanel.tsx',
    'hooks/useLocalBackup.ts',
  ]) {
    const p = path.join(root, 'packages/inkos-studio/src', rel);
    assert.ok(fs.existsSync(p), `missing ${rel}`);
  }
  ok('frontend P3–P5 source contracts');
}

console.log(`\n${n} checks passed.`);
