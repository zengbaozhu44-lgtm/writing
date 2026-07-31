import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api, PromptAnalytics } from '../api/client';
import { PageHeader } from '../components/FormFields';
import type { BookContext } from '../layouts/BookLayout';

export function PromptPage() {
  const { book, chapter } = useOutletContext<BookContext>();
  const [analytics, setAnalytics] = useState<PromptAnalytics | null>(null);
  const [scenes, setScenes] = useState<{ index: number; dynamic?: { profile?: string; modules?: { label: string; tokens?: number }[] } }[]>([]);

  useEffect(() => {
    api.getPromptAnalytics(book.id, chapter).then(setAnalytics).catch(() => {});
    api.getDashboard(book.id, chapter).then((d) => setScenes(d.scenes)).catch(() => {});
  }, [book.id, chapter]);

  const sceneMetrics = analytics?.scenes?.[0] as {
    ranking?: { facts?: { score: number; text: string }[] };
    budget_usage?: { pct?: Record<string, number> };
    ranking_drop?: number;
    cache_hit_rate?: number;
  } | undefined;

  return (
    <div className="page">
      <PageHeader title="Prompt Analytics" subtitle="Context Diff · Ranking · Budget" />
      <div className="context-viz">
        <div className="context-chain">
          {['Scene', 'Goal', 'Facts', 'Knowledge', 'Character', 'World', 'Writing'].map((n, i) => (
            <div key={n} className="context-node-wrap">
              {i > 0 && <div className="context-arrow">↓</div>}
              <div className="context-node">{n}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="metrics-grid">
        <div className="panel">
          <div className="panel-title">Cache & Budget</div>
          <p>Cache Hit: {analytics?.aggregate?.cacheHitRate ?? '—'}%</p>
          <p>Ranking Drop: {sceneMetrics?.ranking_drop ?? '—'}</p>
          {sceneMetrics?.budget_usage?.pct && Object.entries(sceneMetrics.budget_usage.pct).map(([k, v]) => (
            <div key={k} className="budget-row">{k}: {v}%</div>
          ))}
        </div>
        <div className="panel">
          <div className="panel-title">Entity / Fact Ranking</div>
          {(sceneMetrics?.ranking?.facts || []).map((f, i) => (
            <div key={i} className="rank-row"><span>{f.score.toFixed(2)}</span> {f.text}</div>
          ))}
        </div>
        <div className="panel">
          <div className="panel-title">Scene Profiles</div>
          {scenes.map((s) => (
            <div key={s.index}>Scene {s.index}: {s.dynamic?.profile || '—'} · {(s.dynamic?.modules || []).length} modules</div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { book } = useOutletContext<BookContext>();
  return (
    <div className="page">
      <PageHeader title="Settings" subtitle={book.title} />
      <div className="panel">
        <p>书籍 ID: {book.id}</p>
        <p>Schema: V{book.schemaVersion}</p>
        <p>Brain: {book.brainEnabled ? '启用' : '关闭'}</p>
        <p className="readonly-notice">Runtime 2.0 LOCKED · 业务逻辑由 Pipeline 维护</p>
      </div>
    </div>
  );
}
