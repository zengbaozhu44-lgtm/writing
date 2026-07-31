import { Dashboard } from '../api/client';

const STAGE_LABELS: Record<string, string> = {
  planner: '正在规划剧情',
  decision: '决策冲突',
  conflict: '冲突设计',
  scene: '正在生成 Scene',
  prompt: '编译 Prompt',
  writer: 'DeepSeek 生成',
  review: '正在检查一致性',
  memory: '更新记忆',
};

interface Props {
  stages: Dashboard['brainStages'];
  runtime: Dashboard['runtime'];
}

export function GenerationProgress({ stages, runtime }: Props) {
  const active = stages.find((s) => s.status === 'running');
  const label = active ? (STAGE_LABELS[active.id] || active.label) : (runtime.running ? 'Runtime 运行中' : '');

  return (
    <div className="gen-progress">
      <div className="gen-progress-title">{label || '生成进度'}</div>
      <div className="gen-progress-steps">
        {stages.map((s) => (
          <div key={s.id} className={`gen-step ${s.status}`}>
            <span className="gen-step-icon">
              {s.status === 'done' ? '✓' : s.status === 'running' ? '…' : '○'}
            </span>
            <span>{STAGE_LABELS[s.id] || s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
