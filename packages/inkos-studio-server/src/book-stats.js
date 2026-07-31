/**
 * Book Stats — 只读聚合，供书库卡片展示
 */
import fs from 'node:fs';
import path from 'node:path';
import { exists, readJson } from '../../inkos-core/src/lib/paths.js';
import { getBookMeta } from './book-service.js';
import { listChapters, getChapterText } from './chapter-service.js';
import { loadStoryHealth } from '../../inkos-brain/src/health/story-health.js';
import { listBooks } from './book-service.js';

export function getBookStats(bookDir) {
  const meta = getBookMeta(bookDir);
  const { chapters } = listChapters(bookDir);
  let wordCount = 0;
  for (const ch of chapters) {
    const t = getChapterText(bookDir, ch.number);
    wordCount += (t.text || '').replace(/\s/g, '').length;
  }

  let health = 0;
  try {
    const h = loadStoryHealth(bookDir);
    health = h?.current?.overallScore ?? 0;
  } catch { /* skip */ }

  const statusLabel = meta.currentChapter > 0 ? '正在创作' : (meta.status === 'draft' ? '规划中' : meta.status || '草稿');

  let plotSummary = '';
  const chapterTask = path.join(bookDir, 'novel', '09_current_chapter.md');
  if (exists(chapterTask)) {
    const md = fs.readFileSync(chapterTask, 'utf8');
    plotSummary = md.match(/\*\*目标\*\*[：:]\s*(.*)/)?.[1]?.trim() || '';
  }

  return {
    bookId: meta.id,
    title: meta.title,
    genre: meta.genre,
    status: statusLabel,
    chapterCount: chapters.length || meta.currentChapter,
    currentChapter: meta.currentChapter,
    wordCount,
    wordCountLabel: wordCount >= 10000 ? `${Math.round(wordCount / 10000)}万` : `${wordCount}`,
    health,
    plotSummary,
    volume: 1,
  };
}

export function listBooksWithStats() {
  return listBooks().map((b) => {
    try {
      return { ...b, stats: getBookStats(b.bookDir) };
    } catch {
      return { ...b, stats: null };
    }
  });
}
