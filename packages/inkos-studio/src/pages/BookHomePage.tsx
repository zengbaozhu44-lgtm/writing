import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { api, ChapterAuditRow, ChapterHealthBadge, Dashboard, LivingTaskError, StoryDna } from '../api/client';
import { StoryDnaConflictPanel } from '../components/wizard/StoryDnaConflictPanel';
import { RuntimeBar } from '../components/RuntimeBar';
import { RuntimePipelineProgress } from '../components/RuntimePipelineProgress';
import { CreativeDashboardPanel } from '../components/CreativeDashboardPanel';
import { LivingNovelDashboard } from '../components/LivingNovelDashboard';
import { AiEditorPanel } from '../components/AiEditorPanel';
import { useBookPath } from '../hooks/useBookPath';
import { useBookTaskLock } from '../hooks/useBookTaskLock';
import { resolveNextWritableChapter } from '../lib/nextChapter';
import type { BookContext } from '../layouts/BookLayout';

export function BookHomePage() {
  const { book, chapter, setChapter, refresh, runtime } = useOutletContext<BookContext>();
  const { to: bookTo } = useBookPath();
  const lock = useBookTaskLock(book.id);
  const { stages, active, lastMessage, start, finish } = runtime;

  const [data, setData] = useState<Dashboard | null>(null);
  const [chapters, setChapters] = useState<{ number: number; title: string; hasText?: boolean }[]>([]);
  const [health, setHealth] = useState<ChapterHealthBadge[]>([]);
  const [plot, setPlot] = useState('');
  const [storyDna, setStoryDna] = useState<StoryDna | null>(null);
  const [livingKey, setLivingKey] = useState(0);
  const [runtimeMsg, setRuntimeMsg] = useState('');
  const [auditRows, setAuditRows] = useState<ChapterAuditRow[]>([]);

  useEffect(() => {
    api.getDashboard(book.id, chapter).then(setData).catch(() => {});
    api.listChapters(book.id).then(setChapters).catch(() => {});
    api.listChapterHealth(book.id).then((r) => {
      setHealth(r.health || []);
      setAuditRows(r.audit?.chapters || []);
    }).catch(() => { setHealth([]); setAuditRows([]); });
    api.getModule(book.id, 'chapter-task').then((m) => {
      const goal = m.content?.match(/\*\*目标\*\*[：:]\s*(.*)/)?.[1];
      if (goal) setPlot(goal);
    }).catch(() => {});
    api.getStoryDna(book.id).then(setStoryDna).catch(() => {});
    api.listChapterAudit(book.id, 10).then((r) => setAuditRows(r.chapters || [])).catch(() => {});
  }, [book.id, chapter, livingKey]);

  const onRuntimeAction = () => {
    refresh();
    setLivingKey((k) => k + 1);
    api.listChapters(book.id).then(setChapters).catch(() => {});
  };

  const targetChapter = resolveNextWritableChapter(chapters, chapter, Boolean(
    chapters.find((c) => c.number === chapter)?.hasText,
  ));

  const runNextChapter = async () => {
    const acq = lock.tryAcquire(targetChapter, `正在生成第 ${targetChapter} 章…`);
    if (!acq.ok) {
      setRuntimeMsg(acq.reason);
      return;
    }
    start();
    setRuntimeMsg(`正在生成第 ${targetChapter} 章…`);
    try {
      const res = await api.runtimeRunLiving(book.id, targetChapter, {
        signal: acq.controller.signal,
        onTaskId: lock.bindTaskId,
      });
      if (res.result?.pass !== true) {
        throw new Error(String(res.result?.error || res.result?.message || '章节生成未完成'));
      }
      const written = await api.getChapterText(book.id, targetChapter);
      if (!written?.text?.trim()) {
        throw new Error(`第 ${targetChapter} 章未写入 chapters/ 正文文件`);
      }
      setChapter(targetChapter);
      onRuntimeAction();
      const okMsg = `第 ${targetChapter} 章生成完成 · 待审计（请先接受或删除）`;
      lock.release(true, okMsg);
      finish(true, okMsg);
      setRuntimeMsg(okMsg);
    } catch (e) {
      const err = e as LivingTaskError;
      const text = err?.code === 'ABORTED'
        ? '已取消生成'
        : err?.code === 'TASK_404_SERVICE_RESTART'
          ? err.message
          : (err?.message || String(e));
      lock.release(false, text);
      finish(false, text);
      setRuntimeMsg(text);
    }
  };

  const regenerateChapter = async (ch: number) => {
    if (!window.confirm(`确认删除第 ${ch} 章草稿并立刻重新生成？\n（会清空正文与连续性缓存）`)) return;
    const acq = lock.tryAcquire(ch, `正在重新生成第 ${ch} 章…`);
    if (!acq.ok) {
      setRuntimeMsg(acq.reason);
      return;
    }
    start();
    setRuntimeMsg(`清除第 ${ch} 章草稿…`);
    try {
      await api.deleteChapterDraft(book.id, ch);
      setRuntimeMsg(`正在重新生成第 ${ch} 章…`);
      const res = await api.runtimeRunLiving(book.id, ch, {
        signal: acq.controller.signal,
        onTaskId: lock.bindTaskId,
      });
      if (res.result?.pass !== true) {
        throw new Error(String(res.result?.error || res.result?.message || '章节重新生成未完成'));
      }
      const written = await api.getChapterText(book.id, ch);
      if (!written?.text?.trim()) {
        throw new Error(`第 ${ch} 章未写入正文文件`);
      }
      setChapter(ch);
      onRuntimeAction();
      const okMsg = `第 ${ch} 章已重新生成 · 待审计`;
      lock.release(true, okMsg);
      finish(true, okMsg);
      setRuntimeMsg(okMsg);
    } catch (e) {
      const err = e as LivingTaskError;
      const text = err?.code === 'ABORTED'
        ? '已取消生成'
        : (err?.message || String(e));
      lock.release(false, text);
      finish(false, text);
      setRuntimeMsg(text);
    }
  };

  const openChapter = (n: number) => {
    setChapter(n);
  };

  const openDiagnosis = (n: number) => {
    setChapter(n);
  };

  const recent = [...chapters].sort((a, b) => b.number - a.number).slice(0, 6);
  const busy = lock.busy || active;
  const healthRows: ChapterHealthBadge[] = health.length
    ? health
    : chapters.map((c) => ({
      chapter: c.number,
      title: c.title,
      overallScore: c.hasText ? 50 : 0,
      level: c.hasText ? 'yellow' : 'red',
      hasText: c.hasText,
    }));

  const auditByChapter = new Map(auditRows.map((a) => [a.chapter, a]));
  const displayRows = (() => {
    const maxN = Math.max(
      3,
      ...healthRows.map((h) => h.chapter),
      ...chapters.map((c) => c.number),
      ...auditRows.map((a) => a.chapter),
    );
    const byHealth = new Map(healthRows.map((h) => [h.chapter, h]));
    const rows = [];
    for (let i = 1; i <= maxN; i += 1) {
      const h = byHealth.get(i);
      const a = auditByChapter.get(i);
      rows.push({
        chapter: i,
        title: h?.title || chapters.find((c) => c.number === i)?.title || '',
        overallScore: h?.overallScore ?? 0,
        level: h?.level || (a?.status === 'locked' ? 'red' : 'yellow'),
        hasText: h?.hasText,
        auditStatus: h?.auditStatus || a?.status || '',
        auditLabel: h?.auditLabel || a?.label || '',
      });
    }
    return rows;
  })();

  const auditEmoji = (status: string) => {
    switch (status) {
      case 'pending_audit': return '🟡 待审计';
      case 'accepted': return '🟢 已接受';
      case 'deleted': return '🔴 已删除';
      case 'locked': return '🔒 待解锁';
      case 'ready_to_generate': return '⚪ 可生成';
      case 'generating': return '⏳ 生成中';
      default: return status || '';
    }
  };

  return (
    <div className="page book-home">
      <div className="book-hero">
        <h1>{book.title}</h1>
        <p className="book-meta">第 1 卷 · 第 {chapter} 章 · Runtime: {data?.runtime.phase || 'Idle'} · Living Engine V3.7</p>
        <p className="book-health">Story Health: <strong>{data?.health.overall ?? '—'}</strong></p>
        {storyDna?.core_hook && <p className="text-dim">Story DNA: {String(storyDna.core_hook)}</p>}
      </div>

      <LivingNovelDashboard bookId={book.id} key={livingKey} />
      <CreativeDashboardPanel bookId={book.id} storyDna={storyDna} onRefresh={onRuntimeAction} />
      <StoryDnaConflictPanel
        bookId={book.id}
        onSaved={() => {
          api.getStoryDna(book.id).then(setStoryDna).catch(() => {});
          setLivingKey((k) => k + 1);
        }}
      />

      {busy && (
        <div className="panel home-pipeline-panel">
          <RuntimePipelineProgress stages={stages} message={lastMessage || lock.message} />
        </div>
      )}

      <RuntimeBar
        bookId={book.id}
        chapter={chapter}
        nextChapter={targetChapter}
        onAction={onRuntimeAction}
        runtime={runtime}
      />

      <div className="home-actions">
        <Link to={bookTo('ide')} className="btn btn-primary btn-lg">进入 IDE</Link>
        <Link to={bookTo('outline')} className="btn btn-lg">大纲 · 卷纲</Link>
        <button type="button" className="btn btn-lg" disabled={busy} onClick={() => void runNextChapter()}>
          {busy ? '生成中…' : '开始下一章（Living）'}
        </button>
        <button
          type="button"
          className="btn btn-primary btn-lg"
          disabled={busy}
          title="删除当前章并用最新引擎重跑"
          onClick={() => void regenerateChapter(chapter)}
        >
          {busy ? '生成中…' : `重新生成第 ${chapter} 章`}
        </button>
        <Link to={bookTo('ide')} className="btn btn-lg">查看正文</Link>
        <Link to={bookTo('settings')} className="btn btn-lg">设置</Link>
      </div>
      {runtimeMsg && <p className="ai-msg">{runtimeMsg}</p>}

      {plot && (
        <div className="panel plot-panel">
          <div className="panel-title">当前剧情</div>
          <p>{plot}</p>
        </div>
      )}

      <div className="home-grid-2">
        <div className="panel">
          <div className="panel-title">最近章节</div>
          <div className="chapter-pills">
            {recent.map((ch) => (
              <Link key={ch.number} to={bookTo('ide')} className="chapter-pill"
                onClick={() => openChapter(ch.number)}>
                {ch.number}
              </Link>
            ))}
            {recent.length === 0 && <span className="text-dim">尚无章节 — 点击「开始生成下一章」</span>}
          </div>
        </div>
        <AiEditorPanel bookId={book.id} chapter={chapter} />
      </div>

      <div className="panel chapter-health-panel">
        <div className="panel-title">章节状态 / 健康度</div>
        <div className="chapter-health-list">
          {displayRows.map((h) => (
            <Link
              key={h.chapter}
              to={`${bookTo('ide')}?drawer=diagnostics`}
              className="chapter-health-row"
              onClick={() => openDiagnosis(h.chapter)}
            >
              <span className={`health-badge ${h.level}`} title={`评分 ${h.overallScore}`}>
                {h.level === 'green' ? '绿' : h.level === 'yellow' ? '黄' : '红'}
              </span>
              <span className="ch-num">第 {h.chapter} 章</span>
              <span className="ch-title">{h.title || '未命名'}</span>
              <span className={`audit-status audit-${h.auditStatus || 'unknown'}`}>
                {auditEmoji(h.auditStatus || '') || h.auditLabel || '—'}
              </span>
              <span className="ch-score">{h.overallScore}</span>
              {h.hasText !== false && (
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={busy}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setChapter(h.chapter);
                    void regenerateChapter(h.chapter);
                  }}
                >
                  重生成
                </button>
              )}
            </Link>
          ))}
          {displayRows.length === 0 && <p className="text-dim">暂无章节</p>}
        </div>
      </div>
    </div>
  );
}
