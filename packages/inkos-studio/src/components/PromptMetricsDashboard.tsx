import { PromptAnalytics } from '../api/client';

export interface ScenePromptMetric {
  index?: number;
  sceneId?: string;
  input_tokens?: number;
  output_tokens?: number;
  cached_tokens?: number;
  cache_hit?: boolean;
  compile_time_ms?: number;
  llm_latency_ms?: number;
  retry?: number;
  temperature?: number;
  cost?: number;
  usd_cost?: number;
  quality?: number;
  commercial_score?: number;
  budget_usage?: number;
  budgetUsage?: number;
}

interface Props {
  analytics: PromptAnalytics | null;
  live?: boolean;
}

function num(v: number | null | undefined, suffix = '') {
  if (v == null || Number.isNaN(v)) return '—';
  return `${v}${suffix}`;
}

export function PromptMetricsDashboard({ analytics, live }: Props) {
  const agg = analytics?.aggregate;
  const scenes = (analytics?.scenes || []) as ScenePromptMetric[];

  return (
    <div className="prompt-metrics-dashboard">
      <div className="prompt-metrics-header">
        <span className="panel-title">Prompt Metrics</span>
        {live && <span className="live-badge">LIVE</span>}
      </div>

      <div className="prompt-metrics-grid">
        <div className="metric-tile"><span>Input</span><strong>{num(agg?.avgInputTokens)}</strong></div>
        <div className="metric-tile"><span>Output</span><strong>{num(agg?.avgOutputTokens)}</strong></div>
        <div className="metric-tile"><span>Cached</span><strong>{num(agg?.totalCachedTokens)}</strong></div>
        <div className="metric-tile"><span>Cache Hit</span><strong>{num(agg?.cacheHitRate, '%')}</strong></div>
        <div className="metric-tile"><span>Compile</span><strong>{num(agg?.avgCompileMs, 'ms')}</strong></div>
        <div className="metric-tile"><span>LLM Latency</span><strong>{num(agg?.avgLlmLatencyMs, 'ms')}</strong></div>
        <div className="metric-tile"><span>Retry</span><strong>{num(agg?.totalRetries)}</strong></div>
        <div className="metric-tile"><span>USD Cost</span><strong>${agg?.totalCost?.toFixed(4) ?? '—'}</strong></div>
        <div className="metric-tile"><span>Quality</span><strong>{num(agg?.avgQuality ?? agg?.avgCommercialScore)}</strong></div>
        <div className="metric-tile"><span>Temp</span><strong>{num(agg?.avgTemperature)}</strong></div>
        <div className="metric-tile"><span>Budget Use</span><strong>{num(agg?.avgBudgetUsage, '%')}</strong></div>
      </div>

      {scenes.length > 0 && (
        <div className="prompt-metrics-table-wrap">
          <table className="prompt-metrics-table">
            <thead>
              <tr>
                <th>Scene</th>
                <th>In</th>
                <th>Out</th>
                <th>Cached</th>
                <th>Hit</th>
                <th>Compile</th>
                <th>Latency</th>
                <th>Retry</th>
                <th>Temp</th>
                <th>Cost</th>
                <th>Quality</th>
                <th>Budget</th>
              </tr>
            </thead>
            <tbody>
              {scenes.map((s) => (
                <tr key={s.index ?? s.sceneId}>
                  <td>{s.index ?? s.sceneId}</td>
                  <td>{s.input_tokens ?? '—'}</td>
                  <td>{s.output_tokens ?? '—'}</td>
                  <td>{s.cached_tokens ?? 0}</td>
                  <td>{s.cache_hit ? '✓' : '—'}</td>
                  <td>{s.compile_time_ms ?? '—'}</td>
                  <td>{s.llm_latency_ms ?? '—'}</td>
                  <td>{s.retry ?? 0}</td>
                  <td>{s.temperature ?? '—'}</td>
                  <td>{s.usd_cost != null ? `$${s.usd_cost.toFixed(4)}` : '—'}</td>
                  <td>{s.quality ?? s.commercial_score ?? '—'}</td>
                  <td>{s.budget_usage ?? s.budgetUsage != null ? `${s.budget_usage ?? s.budgetUsage}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
