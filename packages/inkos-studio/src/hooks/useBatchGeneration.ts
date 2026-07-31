/**
 * 串行批量生成多章：前一章完成后再触发下一章
 */
import { useCallback, useRef, useState } from 'react';
import { api, LivingTaskError } from '../api/client';
import { useBookTaskStore } from '../stores/bookTaskStore';

export function useBatchGeneration(bookId: string) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; message: string } | null>(null);
  const abortRef = useRef(false);

  const stop = useCallback(() => {
    abortRef.current = true;
    useBookTaskStore.getState().cancel('批量生成已停止');
  }, []);

  const start = useCallback(async (fromChapter: number, count: number) => {
    if (count < 1) return;
    if (useBookTaskStore.getState().isBusy()) {
      setProgress({ current: 0, total: count, message: '已有生成任务在运行' });
      return;
    }
    abortRef.current = false;
    setRunning(true);
    const chapters = Array.from({ length: count }, (_, i) => fromChapter + i);
    for (let i = 0; i < chapters.length; i += 1) {
      if (abortRef.current) break;
      const ch = chapters[i];
      setProgress({ current: i + 1, total: count, message: `生成第 ${ch} 章…` });
      const acq = useBookTaskStore.getState().tryStart({
        bookId,
        chapter: ch,
        message: `批量 · Ch${ch} (${i + 1}/${count})`,
      });
      if (!acq.ok) {
        setProgress({ current: i + 1, total: count, message: acq.reason });
        break;
      }
      try {
        const res = await api.runtimeRunLiving(bookId, ch, {
          signal: acq.controller.signal,
          onTaskId: (id) => useBookTaskStore.getState().bindTaskId(id),
        });
        if (res.result?.pass !== true) {
          throw new Error(String(res.result?.error || '章节未完成'));
        }
        useBookTaskStore.getState().finish('completed', `Ch${ch} 完成`);
      } catch (e) {
        const err = e as LivingTaskError;
        const msg = err?.code === 'ABORTED' ? '已取消' : (err?.message || String(e));
        useBookTaskStore.getState().finish('failed', msg);
        setProgress({ current: i + 1, total: count, message: `Ch${ch} 失败：${msg}` });
        break;
      }
    }
    setRunning(false);
    if (!abortRef.current) {
      setProgress((p) => p ? { ...p, message: '批量队列结束' } : null);
    }
  }, [bookId]);

  return { start, stop, running, progress };
}
