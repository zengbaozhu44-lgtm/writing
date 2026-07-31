import fs from 'node:fs';
import path from 'node:path';
import { ROOT, readJson, readText, exists } from '../../inkos-core/src/lib/paths.js';
import { detectBookVersion, getBookPaths } from '../../inkos-core/src/lib/book.js';
import { isBrainEnabled } from '../../inkos-brain/src/loader.js';
import { brainSystemDir } from '../../inkos-brain/src/loader.js';

const BOOK_ROOTS = [
  path.join(ROOT, 'books', '我的小说', 'books'),
  path.join(ROOT, 'books', '我的小说'),
  path.join(ROOT, 'books'),
];

export function resolveBookDir(bookId) {
  if (path.isAbsolute(bookId) && exists(path.join(bookId, 'book.json'))) {
    return bookId;
  }
  for (const root of BOOK_ROOTS) {
    const candidate = path.join(root, bookId);
    if (exists(path.join(candidate, 'book.json'))) return candidate;
  }
  const direct = path.join(ROOT, bookId);
  if (exists(path.join(direct, 'book.json'))) return direct;
  throw new Error(`书籍不存在: ${bookId}`);
}

export function listBooks() {
  const found = new Map();
  for (const root of BOOK_ROOTS) {
    if (!exists(root)) continue;
    walkForBooks(root, found);
  }
  return [...found.values()].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

function walkForBooks(dir, found, depth = 0) {
  if (depth > 4) return;
  const bookJson = path.join(dir, 'book.json');
  if (exists(bookJson)) {
    const book = readJson(bookJson);
    const id = book.id || path.basename(dir);
    found.set(dir, {
      id,
      title: book.title || id,
      genre: book.genre,
      schemaVersion: detectBookVersion(dir),
      brainEnabled: isBrainEnabled(dir),
      runtimeCapable: detectBookVersion(dir) === 4 && isBrainEnabled(dir),
      status: book.status,
      targetChapters: book.targetChapters,
      bookDir: dir,
      relDir: path.relative(ROOT, dir),
      updatedAt: book.updatedAt || book.createdAt,
    });
    return;
  }
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith('.') || name === 'node_modules') continue;
    const sub = path.join(dir, name);
    try {
      if (fs.statSync(sub).isDirectory()) walkForBooks(sub, found, depth + 1);
    } catch { /* skip */ }
  }
}

export function getBookMeta(bookDir) {
  const book = readJson(path.join(bookDir, 'book.json'));
  const version = detectBookVersion(bookDir);
  const brain = isBrainEnabled(bookDir);
  let currentChapter = 0;
  const manifestPath = version === 4
    ? path.join(bookDir, 'novel', '_system', 'manifest.json')
    : path.join(bookDir, 'runtime', 'manifest.json');
  if (exists(manifestPath)) {
    const m = readJson(manifestPath);
    currentChapter = m.lastAppliedChapter ?? 0;
  }
  if (brain) {
    const stateCandidates = [
      path.join(bookDir, 'novel', '_system', 'runtime', 'runtime_state.json'),
      path.join(bookDir, 'novel', '_system', 'runtime_state.json'),
    ];
    for (const stateFile of stateCandidates) {
      if (!exists(stateFile)) continue;
      try {
        const rs = readJson(stateFile);
        if (rs.lastCompletedChapter) currentChapter = Math.max(currentChapter, rs.lastCompletedChapter);
        if (rs.nextChapter) currentChapter = Math.max(currentChapter, rs.nextChapter - 1);
      } catch { /* skip */ }
      break;
    }
  }
  return {
    ...book,
    id: book.id || path.basename(bookDir),
    bookDir,
    relDir: path.relative(ROOT, bookDir),
    schemaVersion: version,
    brainEnabled: brain,
    runtimeCapable: version === 4 && brain,
    currentChapter,
  };
}

export function parseStateTable(md) {
  const rows = {};
  for (const line of md.split('\n')) {
    const m = line.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/);
    if (!m || m[1].includes('---') || m[1] === '字段') continue;
    rows[m[1].trim()] = m[2].trim();
  }
  return rows;
}

export function parseStateBoard(md) {
  const factions = [];
  const sections = md.split(/^## /m).slice(1);
  for (const block of sections) {
    const [titleLine, ...rest] = block.split('\n');
    const name = titleLine.trim();
    const body = rest.join('\n');
    const lines = {};
    for (const line of body.split('\n')) {
      const m = line.match(/^-\s*\*\*([^*]+)\*\*[:：]\s*(.*)/);
      if (m) lines[m[1].trim()] = m[2].trim();
    }
    factions.push({ name, ...lines });
  }
  return factions;
}

export function loadScenes(bookDir, chapter) {
  const file = path.join(brainSystemDir(bookDir), `ch_${String(chapter).padStart(4, '0')}_scenes.json`);
  if (!exists(file)) return { chapter, scenes: [] };
  return readJson(file);
}

export function loadPlan(bookDir, chapter) {
  const file = path.join(brainSystemDir(bookDir), `ch_${String(chapter).padStart(4, '0')}_plan.json`);
  if (!exists(file)) return null;
  return readJson(file);
}

export function loadNovelModule(bookDir, key) {
  const bp = getBookPaths(bookDir);
  if (bp.version !== 4) return null;
  const p = bp.modules[key];
  if (!p || !exists(p)) return null;
  if (fs.statSync(p).isDirectory()) return null;
  return readText(p);
}
