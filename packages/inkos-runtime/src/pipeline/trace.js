/**
 * Chapter Trace — 全链路中间产物 + HTML 调试页
 */
import fs from 'node:fs';
import path from 'node:path';
import { writeJson, writeText, exists, readJson } from '../../../inkos-core/src/lib/paths.js';
import { brainSystemDir } from '../../../inkos-brain/src/loader.js';

function rand() {
  return Math.random().toString(36).slice(2, 8);
}

export function tracesRoot(bookDir) {
  return path.join(brainSystemDir(bookDir), 'traces');
}

export function createChapterTrace(bookDir, chapter, { label = '' } = {}) {
  const traceId = `tr_ch${String(chapter).padStart(4, '0')}_${Date.now()}_${rand()}`;
  const dir = path.join(tracesRoot(bookDir), traceId);
  fs.mkdirSync(path.join(dir, 'stages'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'beats'), { recursive: true });

  const meta = {
    version: 'chapter-trace-1',
    traceId,
    bookDir,
    chapter: Number(chapter) || null,
    label: label || '',
    createdAt: new Date().toISOString(),
    stages: [],
    beats: [],
  };
  writeJson(path.join(dir, 'trace.json'), meta);

  return {
    traceId,
    dir,
    chapter: meta.chapter,
    recordStage(stage, payload = {}) {
      return recordTraceStage(dir, stage, payload);
    },
    recordBeat(sceneIndex, beatOrder, payload = {}) {
      return recordTraceBeat(dir, sceneIndex, beatOrder, payload);
    },
    finalize(extra = {}) {
      return finalizeTrace(dir, extra);
    },
  };
}

export function recordTraceStage(traceDir, stage, payload = {}) {
  const name = String(stage || 'stage').replace(/[^\w.-]+/g, '_');
  const file = path.join(traceDir, 'stages', `${String(metaNextIndex(traceDir, 'stages')).padStart(2, '0')}_${name}.json`);
  const entry = {
    stage: name,
    at: new Date().toISOString(),
    ...sanitizePayload(payload),
  };
  writeJson(file, entry);
  patchTraceIndex(traceDir, (meta) => {
    meta.stages.push({
      stage: name,
      file: path.relative(traceDir, file),
      at: entry.at,
      pass: payload.pass,
      summary: payload.summary || payload.message || null,
    });
  });
  return file;
}

export function recordTraceBeat(traceDir, sceneIndex, beatOrder, payload = {}) {
  const file = path.join(
    traceDir,
    'beats',
    `s${String(sceneIndex).padStart(2, '0')}_b${String(beatOrder).padStart(2, '0')}.json`,
  );
  const entry = {
    sceneIndex,
    beatOrder,
    at: new Date().toISOString(),
    ...sanitizePayload(payload),
  };
  writeJson(file, entry);
  patchTraceIndex(traceDir, (meta) => {
    meta.beats.push({
      sceneIndex,
      beatOrder,
      file: path.relative(traceDir, file),
      pass: payload.validation?.pass ?? payload.pass,
      libraryBeat: payload.beat?.libraryBeat || payload.libraryBeat || null,
      hookType: payload.hookType || payload.beat?.hookType || null,
      hookRotation: payload.hookRotation || null,
      tensionLevel: payload.tensionLevel ?? payload.beat?.tensionLevel ?? null,
      craftMode: payload.craftMode || payload.beat?.craftMode || null,
      chars: payload.chars ?? (payload.text ? String(payload.text).replace(/\s/g, '').length : null),
    });
  });
  return file;
}

export function finalizeTrace(traceDir, extra = {}) {
  const metaPath = path.join(traceDir, 'trace.json');
  const meta = exists(metaPath) ? readJson(metaPath) : { stages: [], beats: [] };
  meta.finishedAt = new Date().toISOString();
  Object.assign(meta, sanitizePayload(extra));
  writeJson(metaPath, meta);

  const html = renderTraceHtml(traceDir, meta);
  const htmlPath = path.join(traceDir, 'debug.html');
  writeText(htmlPath, html);
  meta.htmlPath = htmlPath;
  writeJson(metaPath, meta);
  return { meta, htmlPath };
}

function metaNextIndex(traceDir, folder) {
  try {
    return fs.readdirSync(path.join(traceDir, folder)).length + 1;
  } catch {
    return 1;
  }
}

function patchTraceIndex(traceDir, mutator) {
  const metaPath = path.join(traceDir, 'trace.json');
  const meta = exists(metaPath) ? readJson(metaPath) : { stages: [], beats: [] };
  mutator(meta);
  writeJson(metaPath, meta);
}

function sanitizePayload(payload = {}) {
  // 截断超大正文，避免 trace 爆炸
  const out = { ...payload };
  if (typeof out.text === 'string' && out.text.length > 12000) {
    out.text = `${out.text.slice(0, 8000)}\n…[trace-truncated ${out.text.length}]\n${out.text.slice(-2000)}`;
  }
  if (typeof out.prompt === 'string' && out.prompt.length > 16000) {
    out.prompt = `${out.prompt.slice(0, 10000)}\n…[trace-truncated]\n${out.prompt.slice(-3000)}`;
  }
  if (typeof out.userPrompt === 'string' && out.userPrompt.length > 16000) {
    out.userPrompt = `${out.userPrompt.slice(0, 10000)}\n…[trace-truncated]\n${out.userPrompt.slice(-3000)}`;
  }
  return out;
}

function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderTraceHtml(traceDir, meta = {}) {
  const stages = (meta.stages || []).map((s) => {
    const full = path.join(traceDir, s.file);
    let body = '';
    try {
      body = JSON.stringify(readJson(full), null, 2);
    } catch {
      body = '(missing)';
    }
    return `<details><summary>${escapeHtml(s.stage)} ${s.pass === false ? '✗' : s.pass === true ? '✓' : ''}</summary><pre>${escapeHtml(body)}</pre></details>`;
  }).join('\n');

  const beats = (meta.beats || []).map((b) => {
    const full = path.join(traceDir, b.file);
    let data = {};
    try {
      data = readJson(full);
    } catch { /* empty */ }
    const input = data.userPrompt || data.prompt || data.input || '';
    const output = data.text || data.output || '';
    const validation = data.validation || data.v2 || null;
    const score = data.score || data.readerSimulator || null;
    return `
<section class="beat">
  <h3>Scene ${b.sceneIndex} · Beat ${b.beatOrder} ${escapeHtml(b.libraryBeat || '')} ${b.pass === false ? '✗' : b.pass === true ? '✓' : ''}</h3>
  <p>chars=${b.chars ?? '—'} · tension=${b.tensionLevel ?? '—'} · craft=${escapeHtml(b.craftMode || '—')} · hookType=${escapeHtml(b.hookType || '—')} ${b.hookRotation ? `· <span class="rot">hookRotation</span>` : ''} · ${escapeHtml(data.at || '')}</p>
  <details><summary>输入 Prompt</summary><pre>${escapeHtml(String(input).slice(0, 12000))}</pre></details>
  <details open><summary>输出正文</summary><pre>${escapeHtml(String(output).slice(0, 8000))}</pre></details>
  <details><summary>校验</summary><pre>${escapeHtml(JSON.stringify(validation, null, 2) || '—')}</pre></details>
  <details><summary>评分 / hookRotation</summary><pre>${escapeHtml(JSON.stringify({ score, hookRotation: b.hookRotation || data.hookRotation || null, hookType: b.hookType }, null, 2) || '—')}</pre></details>
</section>`;
  }).join('\n');

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>InkOS Trace ${escapeHtml(meta.traceId || '')}</title>
  <style>
    body{font-family:ui-sans-serif,system-ui,sans-serif;margin:24px;background:#0f1419;color:#e7ecf1;line-height:1.45}
    h1,h2,h3{color:#f5f7fa}
    .meta{opacity:.85;margin-bottom:20px}
    details{margin:8px 0;background:#1a222c;padding:8px 12px;border-radius:8px}
    pre{white-space:pre-wrap;word-break:break-word;font-size:12px;color:#c9d4e0}
    .beat{border:1px solid #2b3642;border-radius:10px;padding:12px;margin:16px 0;background:#141b22}
    .rot{color:#7dffb3;font-weight:600}
    a{color:#7cb7ff}
  </style>
</head>
<body>
  <h1>Chapter Trace</h1>
  <div class="meta">
    <div><b>traceId</b>: ${escapeHtml(meta.traceId || '')}</div>
    <div><b>chapter</b>: ${escapeHtml(String(meta.chapter ?? ''))}</div>
    <div><b>created</b>: ${escapeHtml(meta.createdAt || '')}</div>
    <div><b>finished</b>: ${escapeHtml(meta.finishedAt || '')}</div>
    <div><b>pass</b>: ${escapeHtml(String(meta.pass ?? '—'))}</div>
  </div>
  <h2>Pipeline Stages</h2>
  ${stages || '<p>（无阶段记录）</p>'}
  <h2>Beat I/O</h2>
  ${beats || '<p>（无 Beat 记录 — Writer 未写入 beat artifacts）</p>'}
</body>
</html>`;
}

export function loadTrace(bookDir, traceId) {
  const dir = path.join(tracesRoot(bookDir), traceId);
  const metaPath = path.join(dir, 'trace.json');
  if (!exists(metaPath)) return null;
  return { dir, meta: readJson(metaPath) };
}

export default {
  createChapterTrace,
  recordTraceStage,
  recordTraceBeat,
  finalizeTrace,
  renderTraceHtml,
  loadTrace,
};
