/**
 * 用户文风库 — Studio 全局存储
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../../inkos-core/src/lib/paths.js';
import { exists, readText, writeText } from '../../inkos-core/src/lib/paths.js';

const STYLES_DIR = path.join(ROOT, '.inkos', 'studio-styles');

function ensureDir() {
  fs.mkdirSync(STYLES_DIR, { recursive: true });
}

function stylePath(id) {
  return path.join(STYLES_DIR, `${id}.json`);
}

export function listSavedStyles() {
  ensureDir();
  return fs.readdirSync(STYLES_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      try {
        const data = JSON.parse(readText(path.join(STYLES_DIR, f)));
        return { id: f.replace('.json', ''), ...data };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

export function getSavedStyle(id) {
  const fp = stylePath(id);
  if (!exists(fp)) throw new Error(`文风不存在: ${id}`);
  return { id, ...JSON.parse(readText(fp)) };
}

export function saveStyle({ id, name, dimensions, writing, sourcePreset }) {
  ensureDir();
  const sid = id || `style_${Date.now()}`;
  const data = {
    name: name || sid,
    dimensions: dimensions || {},
    writing: writing || {},
    sourcePreset: sourcePreset || '',
    updatedAt: new Date().toISOString(),
  };
  writeText(stylePath(sid), JSON.stringify(data, null, 2));
  return { id: sid, ...data };
}

export function deleteStyle(id) {
  const fp = stylePath(id);
  if (exists(fp)) fs.unlinkSync(fp);
  return { deleted: id };
}

export function duplicateStyle(id, newName) {
  const src = getSavedStyle(id);
  return saveStyle({
    name: newName || `${src.name} 副本`,
    dimensions: src.dimensions,
    writing: src.writing,
    sourcePreset: src.sourcePreset,
  });
}
