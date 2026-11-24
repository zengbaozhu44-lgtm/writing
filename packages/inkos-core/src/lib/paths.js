import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '../../../..');

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * 原子写 — 先写同目录临时文件再 rename，避免并发读方读到半截 JSON/文本。
 * 并发写同一 brain 状态文件（scenes.json / hash state.json 等）是
 * 「系统内部错误」间歇性抛错的根源，rename 为同一文件系统内的原子操作。
 */
function atomicWrite(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  try {
    fs.writeFileSync(tmp, content, 'utf8');
    fs.renameSync(tmp, filePath);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
    throw err;
  }
}

export function writeJson(filePath, data) {
  atomicWrite(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

export function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

export function writeText(filePath, content) {
  atomicWrite(filePath, content);
}

export function exists(p) {
  return fs.existsSync(p);
}

export function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

export function listFiles(dir, ext = null) {
  if (!exists(dir)) return [];
  return fs.readdirSync(dir).filter((f) => !ext || f.endsWith(ext));
}

export function nextId(prefix, items, key = 'id') {
  const nums = items
    .map((i) => i[key])
    .filter(Boolean)
    .map((id) => parseInt(String(id).replace(/\D/g, ''), 10))
    .filter((n) => !Number.isNaN(n));
  const n = nums.length ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(n).padStart(3, '0')}`;
}

export function loadV4Schema() {
  return readJson(path.join(ROOT, '.inkos/schema/v4/schema.json'));
}

export function v4TemplateDir() {
  return path.join(ROOT, '.inkos/templates/book-v4');
}
