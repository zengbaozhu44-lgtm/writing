/**
 * Chapter Service — 章节列表与正文阅读
 */
import fs from 'node:fs';
import path from 'node:path';
import { exists, readText, readJson, writeText } from '../../inkos-core/src/lib/paths.js';
import { loadScenes } from './book-service.js';
import { brainSystemDir } from '../../inkos-brain/src/loader.js';
import { listChapterAuditStatuses } from './chapter-audit.js';

/**
 * 下一章应写编号：填补从 1 起第一个可写空洞。
 * 可写 = 无正文 且 未审计锁定（locked / pending_audit 不可生成）。
 * 若 1..max 全被正文/锁定占满，回退到最靠前的 pending_audit / locked（提示先审计），
 * 全部有正文才新增 max+1。避免把「待审计章」误算成超范围编号。
 */
export function resolveNextWritableChapter(bookDir, { preferChapter = null } = {}) {
  const { chapters } = listChapters(bookDir);
  const withText = new Set(
    chapters.filter((c) => c.hasText).map((c) => c.number),
  );
  // 审计状态：locked / pending_audit 的章不可生成
  let statusByCh = new Map();
  try {
    statusByCh = new Map(
      listChapterAuditStatuses(bookDir, 200).chapters.map((c) => [c.chapter, c.status]),
    );
  } catch { /* 无审计文件时退化为仅正文判断 */ }

  const maxCh = Math.max(1, ...chapters.map((c) => c.number), ...statusByCh.keys());
  const canWrite = (n) => (
    !withText.has(n)
    && !['locked', 'pending_audit'].includes(statusByCh.get(n))
  );

  const prefer = Number(preferChapter);
  if (Number.isFinite(prefer) && prefer >= 1 && canWrite(prefer)) {
    return prefer;
  }
  for (let n = 1; n <= maxCh; n += 1) {
    if (canWrite(n)) return n;
  }
  // 全部被占：优先提示「待审计」（接受后即解锁），其次最靠前的锁定章
  for (let n = 1; n <= maxCh; n += 1) {
    if (!withText.has(n) && statusByCh.get(n) === 'pending_audit') return n;
  }
  for (let n = 1; n <= maxCh; n += 1) {
    if (!withText.has(n) && statusByCh.get(n) === 'locked') return n;
  }
  return maxCh + 1;
}

export function listChapters(bookDir) {
  const chaptersDir = path.join(bookDir, 'chapters');
  const indexFile = path.join(chaptersDir, 'index.json');
  const chapters = [];

  if (exists(indexFile)) {
    const idx = readJson(indexFile);
    for (const entry of idx.chapters || []) {
      chapters.push({ number: entry.number, title: entry.title, file: entry.file });
    }
  }

  if (exists(chaptersDir)) {
    for (const name of fs.readdirSync(chaptersDir).filter((f) => f.endsWith('.md'))) {
      const m = name.match(/^(\d+)_(.+)\.md$/);
      if (!m) continue;
      const number = Number(m[1]);
      if (chapters.some((c) => c.number === number)) continue;
      chapters.push({ number, title: m[2], file: name });
    }
  }

  chapters.sort((a, b) => a.number - b.number);

  for (const ch of chapters) {
    const scenes = loadScenes(bookDir, ch.number);
    ch.sceneCount = scenes.scenes?.length || 0;
    ch.hasText = Boolean(getChapterText(bookDir, ch.number).text?.trim());
  }

  return { chapters, volume: 1 };
}

export function getChapterText(bookDir, chapterNum) {
  const chaptersDir = path.join(bookDir, 'chapters');
  if (!exists(chaptersDir)) return { chapter: chapterNum, title: '', text: '', source: 'none' };

  const pad = String(chapterNum).padStart(4, '0');
  const file = fs.readdirSync(chaptersDir).find((f) => f.startsWith(`${pad}_`) && f.endsWith('.md'));
  if (file) {
    const text = readText(path.join(chaptersDir, file));
    const title = file.replace(/^\d+_/, '').replace(/\.md$/, '');
    return { chapter: chapterNum, title, text, source: file, format: 'markdown' };
  }

  const scenes = loadScenes(bookDir, chapterNum);
  if (scenes.scenes?.length) {
    const text = scenes.scenes.filter((s) => s.text?.trim()).map((s) => s.text.trim()).join('\n\n');
    if (text) {
      return {
        chapter: chapterNum,
        title: scenes.scenes[0]?.title || `第${chapterNum}章`,
        text,
        source: `ch_${pad}_scenes.json`,
        format: 'assembled',
      };
    }
  }

  return { chapter: chapterNum, title: '', text: '', source: 'empty' };
}

/**
 * 写入/更新章节正文 Markdown
 * @returns {{ chapter, title, text, source, file, created }}
 */
export function saveChapterText(bookDir, chapterNum, text, { title = null } = {}) {
  const chaptersDir = path.join(bookDir, 'chapters');
  fs.mkdirSync(chaptersDir, { recursive: true });
  const pad = String(chapterNum).padStart(4, '0');
  const body = String(text ?? '');
  const existing = fs.readdirSync(chaptersDir).find((f) => f.startsWith(`${pad}_`) && f.endsWith('.md'));

  let fileName;
  let created = false;
  if (existing) {
    fileName = existing;
    writeText(path.join(chaptersDir, fileName), body);
  } else {
    const slug = sanitizeTitle(title || `第${chapterNum}章`);
    fileName = `${pad}_${slug}.md`;
    const content = body.trim().startsWith('#')
      ? body
      : `# ${title || `第${chapterNum}章`}\n\n${body}`;
    writeText(path.join(chaptersDir, fileName), content);
    created = true;
  }

  const resolvedTitle = title
    || fileName.replace(/^\d+_/, '').replace(/\.md$/, '')
    || `第${chapterNum}章`;

  return {
    chapter: chapterNum,
    title: resolvedTitle,
    text: body,
    source: fileName,
    file: path.join('chapters', fileName),
    created,
    savedAt: new Date().toISOString(),
  };
}

function sanitizeTitle(title = '') {
  return String(title || '未命名')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 40) || '未命名';
}

export function getChapterMeta(bookDir, chapterNum) {
  const text = getChapterText(bookDir, chapterNum);
  const scenes = loadScenes(bookDir, chapterNum);
  const runFile = path.join(brainSystemDir(bookDir), `ch_${String(chapterNum).padStart(4, '0')}_run.json`);
  let run = null;
  if (exists(runFile)) {
    try { run = readJson(runFile); } catch { /* skip */ }
  }
  return { ...text, scenes: scenes.scenes || [], run };
}
