import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api, PromptAnalytics } from '../api/client';
import { PageHeader } from '../components/FormFields';
import type { BookContext } from '../layouts/BookLayout';

export function MetricsPage() {
  const { book, chapter } = useOutletContext<BookContext>();
  const [analytics, setAnalytics] = useState<PromptAnalytics | null>(null);
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [run, setRun] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    api.getPromptAnalytics(book.id, chapter).then(setAnalytics).catch(() => {});
    api.getDashboard(book.id, chapter).then((d) => {
      setHealth(d.health.raw || null);
      setRun(d.run);
    }).catch(() => {});
  }, [book.id, chapter]);

  const agg = analytics?.aggregate;
  const critic = (run as { critic?: { overall: number } })?.critic;

  const bar = (label: string, value: number, max = 100) => (
    <div className="metric-bar-row" key={label}>
      <span>{label}</span>
      <div className="metric-bar"><div style={{ width: `${Math.min(100, (value / max) * 100)}%` }} /></div>
      <span>{value}</span>
    </div>
  );

  return (
    <div className="page">
      <PageHeader title="Metrics" subtitle={`Ch${chapter} 分析仪表盘`} />
      <div className="metrics-grid">
        <div className="panel">
          <div className="panel-title">Token & Cost</div>
          {bar('Input Tokens', agg?.avgInputTokens || 0, 2500)}
          {bar('Output Tokens', agg?.avgOutputTokens || 0, 2000)}
          {bar('Cache Hit %', agg?.cacheHitRate || 0)}
          {bar('Compile ms', agg?.avgCompileMs || 0, 50)}
          <div className="metric-cost">Cost: ${agg?.totalEstimatedCost?.toFixed(4) ?? '0'}</div>
        </div>
        <div className="panel">
          <div className="panel-title">Story Health</div>
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
