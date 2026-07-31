import { CreationAssistantData } from '../api/client';

const SOURCE_LABEL: Record<string, string> = {
  'story-memory': 'Story Memory',
  'writer-optimizer': 'Writer Optimizer',
  'director-review': 'Director Review',
  adaptive: 'Adaptive',
  'prompt-metrics': 'Metrics',
  system: 'System',
};

interface Props {
  data: CreationAssistantData | null;
  live?: boolean;
}

export function AiCreationAssistant({ data, live }: Props) {
  if (!data) {
    return <p className="text-dim">暂无创作建议 — 运行 Pipeline 后将自动汇总</p>;
  }

  const suggestions = data.suggestions || [];

  return (
    <div className="ai-creation-assistant">
      <div className="ai-creation-header">
        <span className="panel-title">今日建议</span>
        {live && <span className="live-badge">LIVE</span>}
      </div>
      <p className="ai-creation-summary">{data.summary}</p>

      {data.sources && (
        <div className="ai-creation-sources">
          {Object.entries(data.sources).map(([k, v]) => (
            <span key={k} className={`ai-source-chip ${v ? 'on' : ''}`}>{k}</span>
          ))}
        </div>
      )}

      <div className="ai-creation-list">
        {suggestions.length === 0 && (
          <p className="text-dim">当前无紧急项 — 保持创作节奏即可</p>
        )}
        {suggestions.map((s) => (
          <div key={s.id} className={`ai-suggestion-row priority-${s.priority}`}>
            <span className={`hint-priority ${s.priority}`}>{SOURCE_LABEL[s.source] || s.source}</span>
            <span className="ai-suggestion-text">{s.text}</span>
          </div>
        ))}
      </div>

      {data.adaptive && (
        <div className="panel ai-adaptive-trends">
          <div className="panel-title">Adaptive 趋势</div>
          <div className="ai-trend-grid">
            {Object.entries(data.adaptive).map(([dim, t]) => (
              <span key={dim} className={`ai-trend-chip ${t?.needsBoost ? 'boost' : ''}`}>
                {dim} {t?.average ?? '—'}{t?.needsBoost ? ' ↑' : ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
