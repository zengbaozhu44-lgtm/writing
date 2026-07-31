/**
 * Canon Version Store — Studio 专用，不修改 Runtime
 * 路径: {bookDir}/.inkos/studio-versions/{moduleKey}/{fileBase}/v{NNN}.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { exists, readText, writeText } from '../../inkos-core/src/lib/paths.js';

function versionDir(bookDir, moduleKey, fileBase = '_single') {
  const safe = String(fileBase).replace(/[^\w\u4e00-\u9fff_-]/g, '_');
  return path.join(bookDir, '.inkos', 'studio-versions', moduleKey, safe);
}

function listVersionFiles(dir) {
  if (!exists(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => /^v\d+\.md$/.test(f))
    .sort((a, b) => Number(a.slice(1, -3)) - Number(b.slice(1, -3)));
}

export function saveVersion(bookDir, moduleKey, content, { fileBase, label, suggestion } = {}) {
  const dir = versionDir(bookDir, moduleKey, fileBase);
  fs.mkdirSync(dir, { recursive: true });
  const existing = listVersionFiles(dir);
  const nextNum = existing.length ? Number(existing[existing.length - 1].slice(1, -3)) + 1 : 1;
  const id = `v${String(nextNum).padStart(3, '0')}`;
  const metaPath = path.join(dir, `${id}.meta.json`);
  writeText(path.join(dir, `${id}.md`), content || '');
  writeText(metaPath, JSON.stringify({
    id,
    version: nextNum,
    label: label || `Version ${nextNum}`,
    suggestion: suggestion || '',
    at: new Date().toISOString(),
  }, null, 2));
  return { id, version: nextNum, path: path.join(dir, `${id}.md`) };
}

export function listVersions(bookDir, moduleKey, fileBase = '_single') {
  const dir = versionDir(bookDir, moduleKey, fileBase);
  return listVersionFiles(dir).map((f) => {
    const id = f.replace('.md', '');
    const metaPath = path.join(dir, `${id}.meta.json`);
    let meta = { id, version: Number(id.slice(1)), label: id, at: '' };
    if (exists(metaPath)) {
      try { meta = { ...meta, ...JSON.parse(readText(metaPath)) }; } catch { /* skip */ }
    }
    return meta;
  });
}

export function getVersion(bookDir, moduleKey, versionId, fileBase = '_single') {
  const dir = versionDir(bookDir, moduleKey, fileBase);
  const fp = path.join(dir, `${versionId}.md`);
  if (!exists(fp)) throw new Error(`版本不存在: ${versionId}`);
  return { id: versionId, content: readText(fp) };
}

export function diffVersions(a, b) {
  const linesA = a.split('\n');
  const linesB = b.split('\n');
  const max = Math.max(linesA.length, linesB.length);
  const diff = [];
  for (let i = 0; i < max; i++) {
    const la = linesA[i];
    const lb = linesB[i];
    if (la === lb) diff.push({ line: i + 1, type: 'same', text: la || '' });
    else if (la === undefined) diff.push({ line: i + 1, type: 'add', text: lb });
    else if (lb === undefined) diff.push({ line: i + 1, type: 'remove', text: la });
    else diff.push({ line: i + 1, type: 'change', from: la, to: lb });
  }
  return diff;
}

export function compareVersions(bookDir, moduleKey, fromId, toId, fileBase = '_single') {
  const a = getVersion(bookDir, moduleKey, fromId, fileBase).content;
  const b = getVersion(bookDir, moduleKey, toId, fileBase).content;
  return { from: fromId, to: toId, diff: diffVersions(a, b) };
}
