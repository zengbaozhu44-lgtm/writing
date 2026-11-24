import fs from 'node:fs';
import path from 'node:path';
import { exists, readJson, writeJson } from '../../inkos-core/src/lib/paths.js';
import { hashContent } from './hash.js';

function brainSystemDir(bookDir) {
  return path.join(bookDir, 'novel', '_system', 'brain');
}

export function promptCacheDir(bookDir, chapter) {
  return path.join(brainSystemDir(bookDir), 'prompt-cache', `ch_${String(chapter).padStart(4, '0')}`);
}

export function ensureCacheDir(bookDir, chapter) {
  const dir = path.join(promptCacheDir(bookDir, chapter), 'cache');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * 缓存长期不变模块 — hash 未变则返回 cache ref，不重复嵌入全文
 */
export function getCachedModule(bookDir, chapter, key, content) {
  const cacheDir = ensureCacheDir(bookDir, chapter);
  const hashFile = path.join(cacheDir, `${key}.hash`);
  const contentFile = path.join(cacheDir, `${key}.content`);
  const hash = hashContent(content);

  if (exists(hashFile)) {
    const prev = fs.readFileSync(hashFile, 'utf8').trim();
    if (prev === hash && exists(contentFile)) {
      return { hit: true, hash, ref: `[cache:${key}:${hash}]`, content: fs.readFileSync(contentFile, 'utf8') };
    }
  }

  fs.writeFileSync(hashFile, `${hash}\n`);
  if (content?.trim()) fs.writeFileSync(contentFile, content);
  return { hit: false, hash, ref: null, content: content || '' };
}

export function loadSceneSummaries(bookDir, chapter) {
  const file = path.join(promptCacheDir(bookDir, chapter), 'scene_summary.json');
  if (!exists(file)) return { scenes: [] };
  return readJson(file);
}

export function saveSceneSummary(bookDir, chapter, entry) {
  const dir = promptCacheDir(bookDir, chapter);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'scene_summary.json');
  const prev = exists(file) ? readJson(file) : { scenes: [] };
  const idx = prev.scenes.findIndex((s) => s.sceneId === entry.sceneId);
  if (idx >= 0) prev.scenes[idx] = entry;
  else prev.scenes.push(entry);
  writeJson(file, prev);
  return file;
}

export function loadContextSnapshot(bookDir, chapter) {
  const file = path.join(promptCacheDir(bookDir, chapter), 'context_snapshot.json');
  if (!exists(file)) return null;
  return readJson(file);
}

export function saveContextSnapshot(bookDir, chapter, snapshot) {
  const dir = promptCacheDir(bookDir, chapter);
  fs.mkdirSync(dir, { recursive: true });
  writeJson(path.join(dir, 'context_snapshot.json'), snapshot);
}
