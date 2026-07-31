/**
 * Entity Selector — 从当前书目录加载角色卡（禁止跨书 / 错误缓存路径）
 *
 * V4 Canon 路径：{bookDir}/novel/03_character_bible/*.md
 * （不是 novel/:bookId/characters/，也不是全局缓存）
 */
import fs from 'node:fs';
import path from 'node:path';
import { getBookPaths } from '../../../inkos-core/src/lib/book.js';
import { exists, readText } from '../../../inkos-core/src/lib/paths.js';

export function resolveCharacterBibleDir(bookDir) {
  const bp = getBookPaths(bookDir);
  if (bp?.version === 4 && bp.modules?.character_bible) {
    return bp.modules.character_bible;
  }
  // 兼容误写路径探测（日志会标明实际使用路径）
  const fallbacks = [
    path.join(bookDir, 'novel', '03_character_bible'),
    path.join(bookDir, 'novel', 'characters'),
    path.join(bookDir, 'characters'),
  ];
  for (const d of fallbacks) {
    if (exists(d)) return d;
  }
  return path.join(bookDir, 'novel', '03_character_bible');
}

/**
 * @returns {{ dir: string, characterFiles: string[], characters: Record<string, { name: string, path: string, raw: string }> }}
 */
export function loadBookCharacters(bookDir, { names = null } = {}) {
  const dir = resolveCharacterBibleDir(bookDir);
  const absDir = path.resolve(dir);
  const absBook = path.resolve(bookDir);

  if (!absDir.startsWith(absBook + path.sep) && absDir !== absBook) {
    console.warn('[entity] character dir outside bookDir — refusing:', absDir, 'book=', absBook);
    return { dir: absDir, characterFiles: [], characters: {} };
  }

  if (!exists(dir)) {
    console.log('[entity] loaded characters:', 0, 'dir missing:', dir);
    return { dir, characterFiles: [], characters: {} };
  }

  let characterFiles = fs.readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'));

  if (Array.isArray(names) && names.length) {
    const want = new Set(names.map((n) => `${String(n).trim()}.md`));
    characterFiles = characterFiles.filter((f) => want.has(f));
  }

  console.log('[entity] loaded characters:', characterFiles.length, 'from', dir);

  const characters = {};
  for (const file of characterFiles) {
    const name = file.replace(/\.md$/i, '');
    const full = path.join(dir, file);
    characters[name] = {
      name,
      path: full,
      raw: readText(full),
    };
  }
  return { dir, characterFiles, characters };
}

export function selectEntities(ctx, scene) {
  const entities = new Set([
    ctx.pov,
    ...(ctx.present || []),
    ...(scene?.entities || []),
  ].filter(Boolean));
  return { entities: [...entities] };
}
