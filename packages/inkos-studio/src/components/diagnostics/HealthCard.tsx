import { ChapterDiagnosis } from '../../api/client';

export function HealthCard({ diagnosis }: { diagnosis: ChapterDiagnosis | null }) {
  if (!diagnosis) {
    return (
      <div className="diag-health-card">
        <div className="panel-title">章节健康度</div>
        <p className="text-dim">加载中…</p>
      </div>
    );
  }
  return (
    <div className={`diag-health-card level-${diagnosis.level}`}>
      <div className="panel-title">章节健康度 · Ch{diagnosis.chapter}</div>
      <div className="diag-score-row">
        <span className={`diag-score-badge ${diagnosis.level}`}>{diagnosis.overallScore}</span>
        <div>
          <div className="diag-level-label">
            {diagnosis.level === 'green' ? '良好' : diagnosis.level === 'yellow' ? '需关注' : '风险'}
          </div>
          <div className="text-dim">{diagnosis.title || '未命名'} · {diagnosis.chars} 字</div>
        </div>
      </div>
    </div>
  );
}
