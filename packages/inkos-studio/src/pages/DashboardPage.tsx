import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api, Dashboard } from '../api/client';
import { PageHeader } from '../components/FormFields';
import { RuntimeBar } from '../components/RuntimeBar';
import type { BookContext } from '../layouts/BookLayout';

export function DashboardPage() {
  const { book, chapter, refresh } = useOutletContext<BookContext>();
  const [data, setData] = useState<Dashboard | null>(null);

  useEffect(() => {
    api.getDashboard(book.id, chapter).then(setData).catch(() => {});
  }, [book.id, chapter]);

  const agg = data?.promptAnalytics?.aggregate;
  const run = data?.run as { critic?: { overall: number; comment?: string }; reader?: { personas?: { readingDrive: number }[] } } | null;

  return (
    <div className="page">
      <PageHeader title="Dashboard" subtitle={data?.book.title} />
      <RuntimeBar bookId={book.id} chapter={chapter} onAction={refresh} />

      <div className="dash-grid">
        <div className="stat-card">
          <div className="stat-label">当前章节</div>
          <div className="stat-value">Ch {chapter}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Runtime</div>
          <div className="stat-value">{data?.runtime.phase || '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Health</div>
          <div className="stat-value">{data?.health.overall ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Scenes</div>
          <div className="stat-value">{data?.scenes.length ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Input Tokens</div>
          <div className="stat-value">{agg?.avgInputTokens ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Cache Hit</div>
          <div className="stat-value">{agg?.cacheHitRate != null ? `${agg.cacheHitRate}%` : '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Cost</div>
          <div className="stat-value">${agg?.totalEstimatedCost?.toFixed(4) ?? '0'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Reader</div>
          <div className="stat-value">{run?.reader?.personas?.[0]?.readingDrive ?? '—'}</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">最新事件</div>
        <div className="event-list">
          {(data?.events || []).slice(-8).reverse().map((e, i) => (
            <div key={i} className="event-row">
              <span className="event-time">{e.time || e.at}</span>
              <span>{e.label || e.event}</span>
            </div>
          ))}
        </div>
      </div>

      {run?.critic && (
        <div className="panel">
          <div className="panel-title">Critic 建议</div>
          <p>{run.critic.comment || `评分 ${run.critic.overall}`}</p>
        </div>
      )}
    </div>
  );
}
