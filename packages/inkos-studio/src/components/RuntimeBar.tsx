import { useState } from 'react';
import { api, LivingTaskError } from '../api/client';
import { useBookTaskLock } from '../hooks/useBookTaskLock';

interface Props {
  bookId: string;
  /** 当前正在查看的章节（重新生成用） */
  chapter: number;
  /** 下一章生成目标；默认与 chapter 相同 */
  nextChapter?: number;
  onAction?: () => void;
  /** 与 BookLayout 共享的 runtime stream */
  runtime?: {
    start: () => void;
    finish: (ok: boolean, msg?: string) => void;
  };
}

export function RuntimeBar({ bookId, chapter, nextChapter, onAction, runtime }: Props) {
  const [msg, setMsg] = useState('');
  const lock = useBookTaskLock(bookId);
  const genChapter = nextChapter ?? chapter;

  const runSimple = async (fn: () => Promise<unknown>, label: string) => {
    if (lock.busy) {
      setMsg('已有生成任务在运行');
      return;
    }
    setMsg(label);
    try {
      await fn();
      onAction?.();
      setMsg(`${label} ✓`);
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  const runLiving = async (ch: number, label?: string) => {
    const acq = lock.tryAcquire(ch, label || `AI 生成第 ${ch} 章…`);
    if (!acq.ok) {
      setMsg(acq.reason);
      return;
    }
    runtime?.start();
    setMsg(label || `AI 生成 Ch${ch}…`);
    try {
      await api.runtimeRunLiving(bookId, ch, {
        signal: acq.controller.signal,
        onTaskId: lock.bindTaskId,
      });
      const written = await api.getChapterText(bookId, ch);
      if (!written?.text?.trim()) {
        throw new Error(`第 ${ch} 章未找到正文文件`);
      }
      const okMsg = `第 ${ch} 章生成完成`;
      lock.release(true, okMsg);
      runtime?.finish(true, okMsg);
      onAction?.();
      setMsg(`${okMsg} ✓`);
    } catch (e) {
      const err = e as LivingTaskError;
      const text = err?.code === 'ABORTED' ? '已取消生成' : (err?.message || String(e));
      lock.release(false, text);
      runtime?.finish(false, text);
      setMsg(text);
    }
  };

  const regenerateCurrent = async () => {
    if (!window.confirm(`确认删除第 ${chapter} 章草稿并立刻重新生成？\n（会清空正文与连续性缓存）`)) return;
    try {
      setMsg(`清除第 ${chapter} 章草稿…`);
      await api.deleteChapterDraft(bookId, chapter);
      await runLiving(chapter, `重新生成第 ${chapter} 章…`);
    } catch (e) {
      setMsg((e as Error).message || String(e));
    }
  };

  const disabled = lock.busy;

  return (
    <div className="runtime-bar">
      <button
        type="button"
        className="btn btn-primary"
        disabled={disabled}
        title="Living Pipeline：Director → Writer → Review（推荐）"
        onClick={() => void runLiving(genChapter)}
      >
        {lock.busy ? '生成中…' : `AI 生成第 ${genChapter} 章（推荐）`}
      </button>
      <button
        type="button"
        className="btn btn-primary"
        disabled={disabled}
        title="删除当前章草稿并用最新引擎重跑"
        onClick={() => void regenerateCurrent()}
      >
        重新生成本章
      </button>
      <button
        type="button"
        className="btn"
        disabled={disabled}
        title="简易同步下一章（非 Living 异步任务）"
        onClick={() => runSimple(() => api.runtimeNext(bookId), '简易下一章')}
      >
        简易下一章
      </button>
      <button type="button" className="btn" disabled={disabled}
        onClick={() => runSimple(() => api.runtimeResume(bookId, chapter), '继续创作')}>继续</button>
      <button type="button" className="btn" disabled={disabled}
        onClick={() => runSimple(() => api.runtimeReplan(bookId, chapter), '重新规划')}>重规划</button>
      <button type="button" className="btn" disabled={disabled}
        onClick={() => runSimple(() => api.daemonStart(bookId), 'Daemon')}>Daemon</button>
      <button type="button" className="btn" disabled={disabled}
        onClick={() => runSimple(() => api.daemonStop(bookId), '停止')}>停止</button>
      {msg && <span className="runtime-msg">{msg}</span>}
    </div>
  );
}
