import { useEffect, useState } from 'react';
import { api, LivingNovelStatus } from '../api/client';

interface Props {
  bookId: string;
}

function MetricCard({ label, value, suffix = '' }: { label: string; value: number | string; suffix?: string }) {
  return (
    <div className="living-metric-card">
      <span className="living-metric-label">{label}</span>
      <strong className="living-metric-value">{value}{suffix}</strong>
    </div>
  );
}

export function LivingNovelDashboard({ bookId }: Props) {
  const [status, setStatus] = useState<LivingNovelStatus | null>(null);

  const load = () => {
    api.getLivingStatus(bookId).then(setStatus).catch(() => {});
  };

  useEffect(() => { load(); }, [bookId]);

  if (!status) return null;

  const m = status.metrics || status;

  return (
    <div className="panel living-novel-dashboard">
      <div className="panel-title">Living Novel · 小说生命状态</div>
      <div className="living-metrics-grid">
        <MetricCard label="故事健康度" value={m.storyHealth ?? '—'} />
        <MetricCard label="世界稳定度" value={m.worldStability ?? '—'} />
        <MetricCard label="人物关系变化" value={(m.relationChange ?? 0) > 0 ? `+${m.relationChange}` : m.relationChange ?? 0} />
        <MetricCard label="冲突强度" value={m.conflictIntensity ?? '—'} />
        <MetricCard label="悬念指数" value={m.suspenseIndex ?? '—'} />
      </div>

      {status.worldState && (
        <div className="living-world-snapshot">
          <span className="text-dim">
            世界 {String(status.worldState.year ?? '—')} ·
            AI控制 {String(status.worldState.ai_control ?? '—')}% ·
            反抗 {String(status.worldState.rebellion_level ?? '—')}
          </span>
        </div>
      )}

      {status.suggestions && status.suggestions.length > 0 && (
        <div className="living-suggestions">
          <div className="panel-title">AI 建议</div>
          <ul>
            {status.suggestions.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}

      {!status.hasStoryDna && (
        <p className="text-dim living-hint">完成 Story Director 分析后，Living Engine 将自动注入战略上下文</p>
      )}
    </div>
  );
}
