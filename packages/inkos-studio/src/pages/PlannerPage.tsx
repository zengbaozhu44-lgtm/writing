import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api/client';
import { PageHeader } from '../components/FormFields';
import { StoryMemoryDashboard } from '../components/StoryMemoryDashboard';
import type { BookContext } from '../layouts/BookLayout';

export function PlannerPage() {
  const { book, chapter } = useOutletContext<BookContext>();
  const [plan, setPlan] = useState<{ intent?: { mainGoal?: string; scenes?: { index: number; title: string; goal: string; conflict: string; beat?: string; entities?: string[] }[] } } | null>(null);
  const [storyMemory, setStoryMemory] = useState<Awaited<ReturnType<typeof api.getStoryMemory>> | null>(null);

  useEffect(() => {
    api.getDashboard(book.id, chapter).then((d) => setPlan(d.plan as typeof plan)).catch(() => {});
    api.getStoryMemory(book.id, chapter).then(setStoryMemory).catch(() => {});
  }, [book.id, chapter]);

  const scenes = plan?.intent?.scenes || [];

  return (
    <div className="page">
      <PageHeader title="Planner" subtitle={`Ch${chapter} · ${plan?.intent?.mainGoal || ''}`} actions={
        <button type="button" className="btn" onClick={() => api.runtimeReplan(book.id, chapter)}>重新规划</button>
      } />

      {storyMemory?.memory?.hints && storyMemory.memory.hints.length > 0 && (
        <div className="panel planner-memory-hints">
          <div className="panel-title">Story Memory Hint</div>
          {storyMemory.memory.hints.slice(0, 6).map((h, i) => (
            <div key={`${h.type}-${i}`} className="memory-hint-row">
              <span className={`hint-priority ${h.priority || 'medium'}`}>{h.type}</span>
              {h.text}
            </div>
          ))}
        </div>
      )}

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
      </div>

      {storyMemory?.memory?.dashboard && (
        <div className="panel">
          <div className="panel-title">Story Memory Dashboard</div>
          <StoryMemoryDashboard
            dashboard={storyMemory.memory.dashboard}
            hints={storyMemory.memory.hints}
          />
        </div>
      )}
    </div>
  );
}
