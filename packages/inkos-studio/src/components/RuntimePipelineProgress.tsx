import { PipelineStage } from '../api/client';

interface Props {
  stages: PipelineStage[];
  title?: string;
  message?: string;
}

export function RuntimePipelineProgress({ stages, title = 'Novel Runtime', message }: Props) {
  return (
    <div className="gen-progress runtime-pipeline">
      <div className="gen-progress-title">{message || title}</div>
      <div className="gen-progress-steps">
        {stages.map((s) => (
          <div key={s.id} className={`gen-step ${s.status}`}>
            <span className="gen-step-icon">
              {s.status === 'done' ? '✓' : s.status === 'running' ? '…' : s.status === 'failed' ? '✗' : '○'}
            </span>
            <span className="gen-step-label">
              <strong>{s.label}</strong>
              <span className="gen-step-sub">{s.detail || s.message}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
