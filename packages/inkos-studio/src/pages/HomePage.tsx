import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Book, BookStats } from '../api/client';

type BookWithStats = Book & { stats?: BookStats | null };

function healthClass(h: number) {
  if (h >= 80) return 'good';
  if (h >= 50) return 'mid';
  return 'low';
}

export function HomePage() {
  const [books, setBooks] = useState<BookWithStats[]>([]);
  const [version, setVersion] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.getVersion().then((v) => setVersion(v.runtimeLabel)).catch(() => {});
    api.listBooks().then(setBooks);
  }, []);

  return (
    <div className="home v3">
      <div className="home-header">
        <h1>我的小说</h1>
        <p className="subtitle">AI 原生长篇小说创作操作系统</p>
        <span className="badge">{version || 'Runtime 2.0'} · V3.0</span>
      </div>
      <button type="button" className="btn-create-book" onClick={() => navigate('/new')}>
        + 创建新小说
      </button>
      <div className="book-grid">
        {books.map((b) => {
          const s = b.stats;
          return (
            <div key={b.id} className="book-card v3">
              <h3>{b.title}</h3>
              <div className="book-card-stats">
                <div className="bcs-row">
                  <span className="bcs-label">状态</span>
                  <span className="bcs-val">{s?.status || (b.currentChapter ? '正在创作' : '规划中')}</span>
                </div>
                <div className="bcs-row">
                  <span className="bcs-label">章节</span>
                  <span className="bcs-val">{s?.chapterCount ?? b.currentChapter ?? 0}</span>
                </div>
                <div className="bcs-row">
                  <span className="bcs-label">字数</span>
                  <span className="bcs-val">{s?.wordCountLabel || s?.wordCount || 0}</span>
                </div>
                <div className="bcs-row">
                  <span className="bcs-label">健康度</span>
                  <span className={`bcs-val health-${healthClass(s?.health || 0)}`}>{s?.health ?? '—'}</span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary book-card-cta"
                onClick={() => navigate(`/book/${encodeURIComponent(b.id)}/home`)}
              >
                打开
              </button>
            </div>
          );
        })}
      </div>
      {books.length === 0 && (
        <p className="home-empty">还没有小说 — 点击上方按钮，5 分钟创建第一本</p>
      )}
    </div>
  );
}
