import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api, Scene } from '../api/client';
import { PageHeader } from '../components/FormFields';
import type { BookContext } from '../layouts/BookLayout';

export function ScenePage() {
  const { book, chapter } = useOutletContext<BookContext>();
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selected, setSelected] = useState<Scene | null>(null);

  useEffect(() => {
    api.getDashboard(book.id, chapter).then((d) => {
      setScenes(d.scenes);
      if (!selected && d.scenes.length) setSelected(d.scenes[0]);
    }).catch(() => {});
  }, [book.id, chapter]);

  const s = selected;

  return (
    <div className="page">
      <PageHeader title="Scene" subtitle={s ? `Scene ${s.index} · ${s.title}` : ''} actions={
        <button type="button" className="btn btn-primary" onClick={() => api.runtimeRun(book.id, chapter)}>生成</button>
      } />
      <div className="scene-tabs">
        {scenes.map((sc) => (
          <button key={sc.id} type="button" className={`btn ${selected?.id === sc.id ? 'btn-primary' : ''}`}
            onClick={() => setSelected(sc)}>S{sc.index}</button>
        ))}
      </div>
      {s && (
        <div className="scene-detail">
          <div className="panel">
            <div className="panel-title">Prompt Modules · {s.dynamic?.totalTokens ?? '—'} tokens</div>
            <div className="prompt-modules">
              {(s.dynamic?.modules || []).map((m) => (
                <div key={m.key} className="prompt-mod"><span>{m.label}</span><span>{m.tokens ?? m.chars}</span></div>
              ))}
            </div>
          </div>
          <div className="panel">
            <div className="panel-title">正文</div>
            <div className="scene-text">{s.text || '（待 Runtime Writer 生成）'}</div>
          </div>
          <div className="review-row">
            <div className="panel"><div className="panel-title">Review</div>{s.review?.pass ? '✓ Pass' : '—'}</div>
            <div className="panel"><div className="panel-title">Consistency</div>{s.consistency?.pass ? '✓ Pass' : '—'}</div>
          </div>
        </div>
      )}
    </div>
  );
}
