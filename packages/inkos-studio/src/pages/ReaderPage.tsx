import { useEffect, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { api, Scene } from '../api/client';
import type { BookContext } from '../layouts/BookLayout';

export function ReaderPage() {
  const { book, chapter, setChapter } = useOutletContext<BookContext>();
  const [params] = useSearchParams();
  const ch = Number(params.get('ch')) || chapter;
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [run, setRun] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    setChapter(ch);
    api.getChapterText(book.id, ch).then((d) => {
      setText(d.text);
      setTitle(d.title);
      setScenes(d.scenes || []);
      setRun(d.run || null);
    }).catch(() => {});
  }, [book.id, ch, setChapter]);

  const critic = run?.critic as { overall?: number; comment?: string } | undefined;

  return (
    <div className="reader-layout">
      <aside className="reader-side">
        <div className="panel-title">Scenes</div>
        {scenes.map((s) => (
          <div key={s.id} className="scene-mini">
            <strong>S{s.index}</strong> {s.title}
            <span className={s.review?.pass ? 'pass' : ''}>{s.review?.pass ? '✓' : '…'}</span>
          </div>
        ))}
        <Link to="chapters" className="btn" style={{ marginTop: 12 }}>章节管理</Link>
      </aside>

      <article className="reader-main">
        <header className="reader-header">
          <h1>第 {ch} 章</h1>
          <h2>{title || '未命名'}</h2>
        </header>
        <div className="reader-divider">————————————</div>
        <div className="reader-body">
          {text || '（正文尚未生成 — 返回 Book Home 开始创作）'}
        </div>
        <div className="reader-divider">————————————</div>
      </article>

      <aside className="reader-review">
        <div className="panel-title">Review</div>
        {critic && (
          <>
            <p>评分: {critic.overall}</p>
            <p className="review-comment">{critic.comment}</p>
          </>
        )}
        {!critic && <p className="text-dim">暂无 Review 数据</p>}
      </aside>
    </div>
  );
}

export function ChaptersPage() {
  const { book } = useOutletContext<BookContext>();
  const [chapters, setChapters] = useState<{ number: number; title: string; hasText?: boolean }[]>([]);

  useEffect(() => {
    api.listChapters(book.id).then(setChapters).catch(() => {});
  }, [book.id]);

  return (
    <div className="page">
      <h1>章节管理</h1>
      <p className="page-sub">第一卷</p>
      <div className="chapter-grid">
        {chapters.map((ch) => (
          <Link key={ch.number} to={`reader?ch=${ch.number}`} className={`chapter-card ${ch.hasText ? 'has-text' : ''}`}>
            <div className="ch-num">{String(ch.number).padStart(2, '0')}</div>
            <div className="ch-title">{ch.title}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function WorkspacePage() {
  const { book, chapter } = useOutletContext<BookContext>();
  const [text, setText] = useState('');
  const [scenes, setScenes] = useState<Scene[]>([]);

  useEffect(() => {
    api.getChapterText(book.id, chapter).then((d) => {
      setText(d.text);
      setScenes(d.scenes || []);
    }).catch(() => {});
  }, [book.id, chapter]);

  return (
    <div className="workspace-layout">
      <aside className="ws-scenes panel">
        <div className="panel-title">Scene</div>
        {scenes.map((s) => (
          <div key={s.id} className="scene-mini">
            <strong>{s.index}</strong> {s.title}
            <div className="text-dim">{s.goal?.slice(0, 40)}</div>
          </div>
        ))}
        <Link to="planner" className="btn">Planner →</Link>
      </aside>
      <main className="ws-reader">
        <div className="panel-title">正文 · Ch{chapter}</div>
        <div className="reader-body">{text || '等待 Runtime 生成…'}</div>
      </main>
      <aside className="ws-review panel">
        <div className="panel-title">Review</div>
        {scenes.map((s) => (
          <div key={s.id} className="review-mini">
            S{s.index}: {s.review?.pass ? '✓' : '—'}
          </div>
        ))}
        <Link to="scene" className="btn">Scene 详情 →</Link>
      </aside>
    </div>
  );
}
