import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api/client';
import { PageHeader } from '../components/FormFields';
import type { BookContext } from '../layouts/BookLayout';

export function MemoryPage() {
  const { book } = useOutletContext<BookContext>();
  const [facts, setFacts] = useState<unknown>(null);
  const [snapshots, setSnapshots] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    api.getModule(book.id, 'facts').then((m) => setFacts(m.data)).catch(() => {});
    api.listSnapshots(book.id).then(setSnapshots).catch(() => {});
  }, [book.id]);

  const rollback = async () => {
    if (snapshots.length < 1) return;
    const id = snapshots[snapshots.length - 1].id;
    if (confirm(`回滚到 ${id}?`)) await api.runtimeRollback(book.id, id);
  };

  return (
    <div className="page">
      <PageHeader title="Memory" subtitle="Facts · Timeline · Snapshots" actions={
        <button type="button" className="btn" onClick={rollback}>Rollback</button>
      } />
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
