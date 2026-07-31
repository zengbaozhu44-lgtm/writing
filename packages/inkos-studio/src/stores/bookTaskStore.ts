/**
 * Zustand 任务中心 — 跨组件 Living 任务互斥与进度同步
 */
import { create } from 'zustand';

export type BookTaskStatus =
  | 'idle'
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'interrupted'
  | 'cancelled'
  | 'aborted';

export interface BookTaskState {
  bookId: string | null;
  taskId: string | null;
  chapter: number | null;
  status: BookTaskStatus;
  message: string;
  startedAt: number | null;
  abortController: AbortController | null;
  /** 开始任务；若已有进行中任务则返回 false */
  tryStart: (opts: {
    bookId: string;
    chapter: number;
    taskId?: string | null;
    message?: string;
  }) => { ok: true; controller: AbortController } | { ok: false; reason: string };
  bindTaskId: (taskId: string) => void;
  setStatus: (status: BookTaskStatus, message?: string) => void;
  finish: (status: BookTaskStatus, message?: string) => void;
  cancel: (message?: string) => void;
  isBusy: () => boolean;
  reset: () => void;
}

const initial = {
  bookId: null as string | null,
  taskId: null as string | null,
  chapter: null as number | null,
  status: 'idle' as BookTaskStatus,
  message: '',
  startedAt: null as number | null,
  abortController: null as AbortController | null,
};

export const useBookTaskStore = create<BookTaskState>((set, get) => ({
  ...initial,

  isBusy: () => {
    const s = get().status;
    return s === 'pending' || s === 'running';
  },

  tryStart: ({ bookId, chapter, taskId = null, message = '生成中…' }) => {
    if (get().isBusy()) {
      return {
        ok: false as const,
        reason: '已有生成任务在运行',
      };
    }
    const controller = new AbortController();
    set({
      bookId,
      chapter,
      taskId,
      status: 'pending',
      message,
      startedAt: Date.now(),
      abortController: controller,
    });
    return { ok: true as const, controller };
  },

  bindTaskId: (taskId) => set({ taskId, status: 'running' }),

  setStatus: (status, message) => set((s) => ({
    status,
    message: message ?? s.message,
  })),

  finish: (status, message) => set({
    status,
    message: message || '',
    abortController: null,
  }),

  cancel: (message = '已取消生成') => {
    const ctrl = get().abortController;
    try { ctrl?.abort(); } catch { /* ignore */ }
    set({
      status: 'cancelled',
      message,
      abortController: null,
    });
  },

  reset: () => set({ ...initial }),
}));
