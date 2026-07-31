import { useEffect, useState } from 'react';
import { api, Book } from '../../api/client';

interface Props {
  book: Book;
  chapter: number;
}

export function PlannerDrawer({ book, chapter }: Props) {
  const [plan, setPlan] = useState<{
    intent?: { mainGoal?: string; scenes?: { index: number; title: string; goal: string; conflict: string; beat?: string; entities?: string[] }[] };
  } | null>(null);

  useEffect(() => {
    api.getDashboard(book.id, chapter).then((d) => setPlan(d.plan as typeof plan)).catch(() => {});
  }, [book.id, chapter]);

  const scenes = plan?.intent?.scenes || [];

  return (
    <div className="drawer-content planner-drawer">
      <div className="drawer-toolbar">
        <span className="text-dim">Ch{chapter} · {plan?.intent?.mainGoal || '—'}</span>
        <button type="button" className="btn" onClick={() => api.runtimeReplan(book.id, chapter)}>重新规划</button>
      </div>
      <div className="planner-flow">
        <div className="planner-goal panel">
          <div className="panel-title">Chapter Goal</div>
          <p>{plan?.intent?.mainGoal || '—'}</p>
        </div>
        {scenes.map((s) => (
          <div key={s.index} className="planner-scene-wrap">
            <div className="pipeline-arrow">↓</div>
            <div className="planner-scene panel">
              <div className="panel-title">Scene {s.index} · {s.title}</div>
              <div className="scene-meta">
                <div><strong>目标</strong> {s.goal}</div>
                <div><strong>冲突</strong> {s.conflict}</div>
                <div><strong>节拍</strong> {s.beat}</div>
                <div><strong>人物</strong> {(s.entities || []).join('、') || '—'}</div>
              </div>
            </div>
          </div>
        ))}
        {scenes.length === 0 && <p className="text-dim">尚无 Scene 规划 — 运行 Runtime 后自动生成</p>}
      </div>
    </div>
  );
}
