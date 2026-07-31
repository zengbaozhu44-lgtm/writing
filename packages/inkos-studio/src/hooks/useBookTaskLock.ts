/**
 * 书籍级 Living 任务锁 — Zustand 封装，供 UI 统一互斥
 */
import { useCallback } from 'react';
import { useBookTaskStore } from '../stores/bookTaskStore';

export function useBookTaskLock(bookId: string) {
  const status = useBookTaskStore((s) => (s.bookId === bookId ? s.status : 'idle'));
  const message = useBookTaskStore((s) => (s.bookId === bookId ? s.message : ''));
  const taskId = useBookTaskStore((s) => (s.bookId === bookId ? s.taskId : null));
  const chapter = useBookTaskStore((s) => (s.bookId === bookId ? s.chapter : null));
  const busy = status === 'pending' || status === 'running';

  const tryAcquire = useCallback((targetChapter: number, label = '生成中…') => {
    return useBookTaskStore.getState().tryStart({
      bookId,
      chapter: targetChapter,
      message: label,
    });
  }, [bookId]);

  const bindTaskId = useCallback((id: string) => {
    useBookTaskStore.getState().bindTaskId(id);
  }, []);

  const release = useCallback((ok: boolean, msg?: string) => {
    useBookTaskStore.getState().finish(ok ? 'completed' : 'failed', msg);
  }, []);

  const cancel = useCallback((msg?: string) => {
    useBookTaskStore.getState().cancel(msg);
  }, []);

  const getSignal = useCallback(() => {
    return useBookTaskStore.getState().abortController?.signal;
  }, []);

  return {
    busy,
    status,
    message,
    taskId,
    chapter,
    tryAcquire,
    bindTaskId,
    release,
    cancel,
    getSignal,
  };
}
