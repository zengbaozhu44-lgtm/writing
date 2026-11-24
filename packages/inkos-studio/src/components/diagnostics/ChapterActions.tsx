/**
 * ChapterActions — 待审计章：接受 / 重新生成 / 一键优化
 */
import { useState } from 'react';
import { api } from '../../api/client';

type OptimizeStrategy = 'enhance-ending' | 'fix-repetition' | 'inject-scenery' | 'deep-rewrite';

interface Props {
  bookId: string;
  chapterIdx: number;
  auditStatus?: string | null;
  /** delete = 仅删草稿；regenerate = 删后由父组件立刻重跑；preview-plan = 打开协议渲染预览抽屉 */
  onDone?: (kind: 'accept' | 'delete' | 'regenerate' | 'optimize' | 'preview-plan', payload?: unknown) => void;
}

const STRATEGIES: { id: OptimizeStrategy; label: string }[] = [
  { id: 'enhance-ending', label: '强化结尾' },
  { id: 'fix-repetition', label: '去重复' },
  { id: 'inject-scenery', label: '补场景' },
  { id: 'deep-rewrite', label: '深改写' },
];

export function ChapterActions({ bookId, chapterIdx, auditStatus, onDone }: Props) {
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const pending = auditStatus === 'pending_audit';
  // 旧章（已接受 / 待审计 / 无状态）均可重生成：会先删草稿再跑
  const canRegen = auditStatus !== 'locked';

  const run = async (
    kind: 'accept' | 'delete' | 'regenerate' | 'optimize',
    strategy?: OptimizeStrategy,
  ) => {
    setBusy(kind + (strategy || ''));
    setMsg('');
    try {
      if (kind === 'accept') {
        const r = await api.acceptChapter(bookId, chapterIdx);
        setMsg(r.nextChapterUnlocked ? `已接受 · 第 ${r.nextChapter} 章已解锁` : '已接受');
        onDone?.('accept', r);
      } else if (kind === 'delete' || kind === 'regenerate') {
        const tip = kind === 'regenerate'
          ? `确认删除第 ${chapterIdx} 章草稿并立刻重新生成？\n（会清空正文与连续性缓存）`
          : `确认删除第 ${chapterIdx} 章草稿？删除后可再点生成。`;
        if (!window.confirm(tip)) return;
        const r = await api.deleteChapterDraft(bookId, chapterIdx);
        if (kind === 'regenerate') {
          setMsg('草稿已清除，正在重新生成…');
          onDone?.('regenerate', r);
        } else {
          setMsg('草稿已删除，可重新生成');
          onDone?.('delete', r);
        }
      } else if (kind === 'optimize' && strategy) {
        const r = await api.optimizeChapter(bookId, chapterIdx, strategy);
        setMsg(r.note || '已优化');
        onDone?.('optimize', r);
      }
    } catch (e) {
      setMsg((e as Error).message || String(e));
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="chapter-actions">
      <div className="chapter-actions-title">章级操作</div>
      <div className="chapter-actions-row">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={!!busy || (!pending && auditStatus === 'accepted')}
          onClick={() => void run('accept')}
        >
          {busy === 'accept' ? '提交中…' : '接受本章'}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          disabled={!!busy || !canRegen}
          title="删除当前草稿并用最新引擎重新生成"
          onClick={() => void run('regenerate')}
        >
          {busy === 'regenerate' ? '准备中…' : '重新生成'}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-danger"
          disabled={!!busy}
          onClick={() => void run('delete')}
        >
          {busy === 'delete' ? '删除中…' : '仅删除草稿'}
        </button>
        <button
          type="button"
          className="btn btn-sm"
          disabled={!!busy}
          title="用协议渲染器生成本章 plan（goal/scenes/plant 可改，确认执行落盘后触发生成）"
          onClick={() => onDone?.('preview-plan')}
        >
          预览 plan
        </button>
      </div>
      <div className="chapter-actions-optimize">
        <span className="text-dim">一键优化</span>
        <div className="chapter-actions-row">
          {STRATEGIES.map((s) => (
            <button
              key={s.id}
              type="button"
              className="btn btn-sm"
              disabled={!!busy}
              onClick={() => void run('optimize', s.id)}
            >
              {busy === `optimize${s.id}` ? '…' : s.label}
            </button>
          ))}
        </div>
      </div>
      {msg && <p className="ai-msg">{msg}</p>}
    </div>
  );
}
