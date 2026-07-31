export interface BudgetPieSlice {
  key: string;
  label: string;
  tokens: number;
  pct: number;
  color: string;
}

interface Props {
  pie: BudgetPieSlice[];
  sceneType?: string;
  totalTokens?: number;
  title?: string;
}

export function BudgetPieChart({ pie, sceneType, totalTokens = 2500, title = 'Dynamic Budget' }: Props) {
  if (!pie?.length) {
    return <div className="budget-pie-empty text-dim">暂无 Budget 数据</div>;
  }

  let gradient = 'conic-gradient(';
  let cursor = 0;
  const stops: string[] = [];
  for (const slice of pie) {
    const start = cursor;
    cursor += slice.pct;
    stops.push(`${slice.color} ${start}% ${cursor}%`);
  }
  gradient += `${stops.join(', ')})`;

  return (
    <div className="budget-pie-panel">
      <div className="budget-pie-header">
        <span className="budget-pie-title">{title}</span>
        {sceneType && <span className="budget-pie-type">{sceneType}</span>}
        <span className="budget-pie-total">{totalTokens} tok</span>
      </div>
      <div className="budget-pie-layout">
        <div className="budget-pie-chart" style={{ background: gradient }} aria-hidden />
        <ul className="budget-pie-legend">
          {pie.map((s) => (
            <li key={s.key}>
              <span className="budget-pie-dot" style={{ background: s.color }} />
              <span className="budget-pie-label">{s.label}</span>
              <span className="budget-pie-val">{s.tokens} ({s.pct}%)</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
