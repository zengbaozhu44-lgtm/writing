/**
 * 本地备份章节正文（localStorage）+ 导出 Markdown
 */
import { useCallback, useEffect } from 'react';

const PREFIX = 'inkos.backup.';

function key(bookId: string, chapter: number) {
  return `${PREFIX}${bookId}:${chapter}`;
}

export function useLocalBackup(bookId: string, chapter: number, text: string, enabled = true) {
  useEffect(() => {
    if (!enabled || !bookId || !text?.trim()) return;
    try {
      localStorage.setItem(key(bookId, chapter), JSON.stringify({
        text,
        chapter,
        bookId,
        at: new Date().toISOString(),
      }));
    } catch { /* quota */ }
  }, [bookId, chapter, text, enabled]);

  const loadBackup = useCallback(() => {
    try {
      const raw = localStorage.getItem(key(bookId, chapter));
      if (!raw) return null;
      return JSON.parse(raw) as { text: string; at: string };
    } catch {
      return null;
    }
  }, [bookId, chapter]);

  const exportMarkdown = useCallback((title = '', body = text) => {
    const md = `# 第 ${chapter} 章${title ? ` · ${title}` : ''}\n\n${body || ''}\n`;
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ch_${String(chapter).padStart(4, '0')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [chapter, text]);

  return { loadBackup, exportMarkdown };
}
