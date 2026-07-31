import { useEffect, useState } from 'react';
import { api, Book, PromptAnalytics } from '../../api/client';

interface Props {
  book: Book;
  chapter: number;
}

export function MetricsDrawer({ book, chapter }: Props) {
  const [analytics, setAnalytics] = useState<PromptAnalytics | null>(null);
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [run, setRun] = useState<Record<string, unknown> | null>(null);
  const [stats, setStats] = useState<{ health?: number } | null>(null);

  useEffect(() => {
    api.getPromptAnalytics(book.id, chapter).then(setAnalytics).catch(() => {});
    api.getDashboard(book.id, chapter).then((d) => {
      setHealth(d.health.raw || null);
      setRun(d.run);
    }).catch(() => {});
    api.getBookStats(book.id).then(setStats).catch(() => {});
  }, [book.id, chapter]);

  const agg = analytics?.aggregate;
  const critic = (run as { critic?: { overall: number } })?.critic;

  const bar = (label: string, value: number, max = 100) => (
    <div className="metric-bar-row" key={label}>
      <span>{label}</span>
      <div className="metric-bar"><div style={{ width: `${Math.min(100, (value / max) * 100)}%` }} /></div>
      <span>{Math.round(value)}</span>
    </div>
  );

  return (
    <div className="drawer-content metrics-drawer">
      <div className="metrics-grid">
        <div className="panel">
          <div className="panel-title">Token & Cost</div>
          {bar('Input Tokens', agg?.avgInputTokens || 0, 2500)}
          {bar('Output Tokens', agg?.avgOutputTokens || 0, 2000)}
          {bar('Cache Hit %', agg?.cacheHitRate || 0)}
          {bar('Compile ms', agg?.avgCompileMs || 0, 50)}
          <div className="metric-cost">Cost: ${agg?.totalCost?.toFixed(4) ?? agg?.totalEstimatedCost?.toFixed(4) ?? '0'}</div>
        </div>
        <div className="panel">
          <div className="panel-title">Story Health</div>
          <div className="stat-hero">{stats?.health ?? '—'}</div>
          {bar('Overall', Number(health?.overallScore) || 0)}
          {bar('Conflict', Number(health?.conflictDensityAvg) * 10 || 0)}
          {bar('Critic', critic?.overall || Number(health?.criticScoreAvg) || 0)}
        </div>
        <div className="panel">
          <div className="panel-title">Token 趋势</div>
          {(agg?.history || []).map((h) => (
            <div key={h.index} className="trend-row">
              Scene {h.index}: {h.input_tokens} → {h.output_tokens ?? '?'} tok
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
