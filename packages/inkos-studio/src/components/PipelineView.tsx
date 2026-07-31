const STAGES = [
  'Planner', 'Decision', 'Conflict', 'Prompt', 'Writer',
  'Review', 'Consistency', 'Memory', 'Metrics',
];

interface Props {
  stages?: { id: string; label: string; status: string }[];
}

export function PipelineView({ stages }: Props) {
  const map = new Map(stages?.map((s) => [s.id.toLowerCase(), s.status]) || []);
  const statusFor = (name: string) => {
    const key = name.toLowerCase();
    if (map.has(key)) return map.get(key);
    if (key === 'prompt' && map.has('consistency')) return 'done';
    if (key === 'writer' && map.has('reader')) return map.get('reader') || 'waiting';
    return 'waiting';
  };

  return (
    <div className="pipeline-viz">
      {STAGES.map((name, i) => {
        const st = statusFor(name);
        return (
          <div key={name} className="pipeline-step-wrap">
            <div className={`pipeline-step ${st}`}>
              <span className="step-dot" />
              <span>{name}</span>
              <span className="step-status">{st}</span>
            </div>
            {i < STAGES.length - 1 && <div className="pipeline-arrow">↓</div>}
          </div>
        );
      })}
    </div>
  );
}
