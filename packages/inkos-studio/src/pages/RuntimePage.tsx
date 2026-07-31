import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api/client';
import { PageHeader } from '../components/FormFields';
import { PipelineView } from '../components/PipelineView';
import { RuntimeBar } from '../components/RuntimeBar';
import type { BookContext } from '../layouts/BookLayout';

export function RuntimePage() {
  const { book, chapter, refresh } = useOutletContext<BookContext>();
  const [stages, setStages] = useState<{ id: string; label: string; status: string }[]>([]);
  const [phase, setPhase] = useState('');

  useEffect(() => {
    api.getDashboard(book.id, chapter).then((d) => {
      setStages(d.brainStages);
      setPhase(d.runtime.phase);
    }).catch(() => {});
  }, [book.id, chapter]);

  return (
    <div className="page">
      <PageHeader title="Runtime" subtitle={`Phase: ${phase}`} />
      <RuntimeBar bookId={book.id} chapter={chapter} onAction={refresh} />
      <div className="panel">
        <div className="panel-title">Pipeline 实时状态</div>
        <PipelineView stages={stages} />
      </div>
    </div>
  );
}
