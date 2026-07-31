import { useEffect, useState } from 'react';
import { api, Book } from '../../api/client';
import { WorldBuilder } from '../WorldBuilder';

interface Props {
  book: Book;
}

/** 世界设定 — 单文件 Canon，可编辑保存 */
export function WorldDrawer({ book }: Props) {
  const [md, setMd] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    api.getModule(book.id, 'world')
      .then((m) => setMd(m.content || ''))
      .catch((e) => setMsg((e as Error).message));
  };

  useEffect(() => { load(); }, [book.id]);

  const save = async () => {
    setBusy(true);
    setMsg('');
    try {
      await api.putModule(book.id, 'world', md);
      setMsg('世界设定已保存');
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="drawer-content world-drawer">
      <div className="drawer-toolbar">
        <span className="text-dim">World Bible</span>
        <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={() => void save()}>
          {busy ? '保存中…' : '保存'}
        </button>
      </div>
      {msg && <p className="ai-msg">{msg}</p>}
      <WorldBuilder
        bookId={book.id}
        markdown={md}
        onChange={setMd}
      />
    </div>
  );
}
