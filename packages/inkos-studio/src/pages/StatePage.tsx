import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api/client';
import { PageHeader } from '../components/FormFields';
import type { BookContext } from '../layouts/BookLayout';

export function StatePage() {
  const { book, chapter } = useOutletContext<BookContext>();
  const [state, setState] = useState<Record<string, string>>({});
  const [board, setBoard] = useState('');

  useEffect(() => {
    api.getDashboard(book.id, chapter).then((d) => setState(d.state)).catch(() => {});
    api.getModule(book.id, 'state-board').then((m) => setBoard(m.content || '')).catch(() => {});
  }, [book.id, chapter]);

  return (
    <div className="page">
      <PageHeader title="当前状态" subtitle="08_current_state · Runtime 只读" />
      <div className="panel readonly-notice">状态由 Memory Update 自动维护</div>
      <div className="state-grid">
        {Object.entries(state).map(([k, v]) => (
          <div key={k} className="state-item">
            <div className="key">{k}</div>
            <div className="val">{v || '—'}</div>
          </div>
        ))}
      </div>
      {board && (
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="panel-title">局势板</div>
          <pre className="preview-box">{board}</pre>
        </div>
      )}
    </div>
  );
}
