import { useEffect, useState } from 'react';
import { api, Book } from '../../api/client';
import { StoryMemoryDashboard } from '../StoryMemoryDashboard';

interface Props {
  book: Book;
  chapter?: number;
}

export function MemoryDrawer({ book, chapter = 1 }: Props) {
  const [facts, setFacts] = useState<unknown>(null);
  const [snapshots, setSnapshots] = useState<{ id: string; label: string }[]>([]);
  const [memoryData, setMemoryData] = useState<Awaited<ReturnType<typeof api.getStoryMemory>> | null>(null);

  useEffect(() => {
    api.getModule(book.id, 'facts').then((m) => setFacts(m.data)).catch(() => {});
    api.listSnapshots(book.id).then(setSnapshots).catch(() => {});
    api.getStoryMemory(book.id, chapter).then(setMemoryData).catch(() => {});
  }, [book.id, chapter]);

  const rollback = async () => {
    if (snapshots.length < 1) return;
    const id = snapshots[snapshots.length - 1].id;
    if (confirm(`回滚到 ${id}?`)) await api.runtimeRollback(book.id, id);
  };

  return (
    <div className="drawer-content memory-drawer">
      <div className="drawer-toolbar">
        <span className="text-dim">Story Memory Dashboard</span>
        <button type="button" className="btn" onClick={rollback}>Rollback</button>
      </div>

      <StoryMemoryDashboard
        dashboard={memoryData?.memory?.dashboard ?? null}
        hints={memoryData?.memory?.hints}
      />

      <div className="memory-tabs">
        <div className="panel">
          <div className="panel-title">Facts</div>
          <pre className="yaml-view">{JSON.stringify(facts, null, 2)}</pre>
        </div>
        <div className="panel">
          <div className="panel-title">Snapshots ({snapshots.length})</div>
          {snapshots.map((s) => (
            <div key={s.id} className="snapshot-row">{s.label} <code>{s.id}</code></div>
          ))}
        </div>
      </div>
    </div>
  );
}
