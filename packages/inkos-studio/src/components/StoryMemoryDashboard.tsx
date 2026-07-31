import { StoryMemoryDashboardData } from '../api/client';

interface ForeshadowItem { id: string; text: string }
interface GoalItem { id: string; text: string }
interface ArcItem { id: string; character: string; stage?: string }

interface Props {
  dashboard: StoryMemoryDashboardData | null;
  hints?: { type: string; text: string; priority?: string }[];
}

export function StoryMemoryDashboard({ dashboard, hints = [] }: Props) {
  if (!dashboard) {
    return <p className="text-dim">暂无 Story Memory 数据 — 运行 Pipeline 后自动生成</p>;
  }

  const stat = (label: string, value: string | number | null | undefined) => (
    <div className="story-memory-stat" key={label}>
      <span className="text-dim">{label}</span>
      <strong>{value ?? '—'}</strong>
    </div>
  );

  return (
    <div className="story-memory-dashboard">
      <div className="story-memory-stats-grid">
        {stat('未回收伏笔', dashboard.openForeshadowCount)}
        {stat('已兑现伏笔', dashboard.resolvedForeshadowCount)}
        {stat('伏笔回收率', dashboard.recoveryRate != null ? `${dashboard.recoveryRate}%` : '—')}
        {stat('Callback 回收率', dashboard.callbackRecoveryRate != null ? `${dashboard.callbackRecoveryRate}%` : '—')}
        {stat('主线推进率', dashboard.mainThreadProgress != null ? `${dashboard.mainThreadProgress}%` : '—')}
        {stat('角色弧完成度', dashboard.characterArcCompletion != null ? `${dashboard.characterArcCompletion}%` : '—')}
      </div>

      {hints.length > 0 && (
        <div className="story-memory-hints panel">
          <div className="panel-title">Story Memory Hint</div>
          {hints.slice(0, 6).map((h, i) => (
            <div key={`${h.type}-${i}`} className="memory-hint-row">
              <span className={`hint-priority ${h.priority || 'medium'}`}>{h.type}</span>
              {h.text}
            </div>
          ))}
        </div>
      )}

      {(dashboard.openForeshadow || []).length > 0 && (
        <div className="panel">
          <div className="panel-title">未回收伏笔</div>
          {(dashboard.openForeshadow ?? []).slice(0, 6).map((f: ForeshadowItem) => (
            <div key={f.id} className="memory-row">🪝 {f.text}</div>
          ))}
        </div>
      )}

      {(dashboard.resolvedForeshadow || []).length > 0 && (
        <div className="panel">
          <div className="panel-title">已兑现伏笔</div>
          {(dashboard.resolvedForeshadow ?? []).slice(0, 4).map((f: ForeshadowItem) => (
            <div key={f.id} className="memory-row resolved">✓ {f.text}</div>
          ))}
        </div>
      )}

      {(dashboard.longGoals || []).length > 0 && (
        <div className="panel">
          <div className="panel-title">长期目标</div>
          {(dashboard.longGoals ?? []).slice(0, 4).map((g: GoalItem) => (
            <div key={g.id} className="memory-row">🎯 {g.text}</div>
          ))}
        </div>
      )}

      {(dashboard.characterArcs || []).length > 0 && (
        <div className="panel">
          <div className="panel-title">角色成长</div>
          {(dashboard.characterArcs ?? []).slice(0, 4).map((a: ArcItem) => (
            <div key={a.id} className="memory-row">{a.character} · {a.stage || '—'}</div>
          ))}
        </div>
      )}
    </div>
  );
}
