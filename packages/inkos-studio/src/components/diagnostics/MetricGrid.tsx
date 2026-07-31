import { ChapterDiagnosis } from '../../api/client';

export function MetricGrid({ diagnosis }: { diagnosis: ChapterDiagnosis | null }) {
  const m = diagnosis?.metrics;
  const cells = [
    { label: '追读分', value: m?.hookScore ?? '—' },
    { label: '重复率', value: m ? `${(m.repetitionRate * 100).toFixed(1)}%` : '—' },
    { label: '字数', value: m?.chars ?? '—' },
    { label: '温度', value: m?.temperature ?? '—' },
    { label: 'Beat 数', value: m?.beatCount ?? '—' },
    { label: 'AB', value: diagnosis?.abReport?.winner || (diagnosis?.abReport ? '已跑' : '—') },
  ];
  return (
    <div className="diag-metric-grid">
      <div className="panel-title">指标</div>
      <div className="diag-metrics">
        {cells.map((c) => (
          <div key={c.label} className="diag-metric-cell">
            <span className="lbl">{c.label}</span>
            <span className="val">{String(c.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
