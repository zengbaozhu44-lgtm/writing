import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { api, BookStudioConfig } from '../api/client';
import { RuntimeBar } from '../components/RuntimeBar';
import { useBookPath } from '../hooks/useBookPath';
import type { BookContext } from '../layouts/BookLayout';

export function SettingsPageV3() {
  const { book, chapter, refresh, runtime } = useOutletContext<BookContext>();
  const { to: bookTo } = useBookPath();
  const [advanced, setAdvanced] = useState(false);
  const [snapshots, setSnapshots] = useState<{ id: string; label: string; chapter: number }[]>([]);
  const [config, setConfig] = useState<BookStudioConfig>({});
  const [draft, setDraft] = useState({ temperature: '0.55', model: '', lightModel: '', maxTokens: '' });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getBookConfig(book.id).then((c) => {
      setConfig(c || {});
      setDraft({
        temperature: c?.temperature != null ? String(c.temperature) : '0.55',
        model: c?.model || '',
        lightModel: c?.lightModel || '',
        maxTokens: c?.maxTokens != null ? String(c.maxTokens) : '',
      });
    }).catch(() => {});
  }, [book.id]);

  useEffect(() => {
    if (advanced) api.listSnapshots(book.id).then(setSnapshots).catch(() => {});
  }, [book.id, advanced]);

  const saveConfig = async () => {
    setBusy(true);
    setMsg('');
    try {
      const next = await api.saveBookConfig(book.id, {
        temperature: draft.temperature ? Number(draft.temperature) : undefined,
        model: draft.model.trim() || undefined,
        lightModel: draft.lightModel.trim() || undefined,
        maxTokens: draft.maxTokens ? Number(draft.maxTokens) : undefined,
      });
      setConfig(next);
      setMsg('配置已保存（单书覆盖；新章生成生效）');
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page settings-v3">
      <div className="page-header">
        <div>
          <h1>系统设置</h1>
          <p className="page-sub">{book.title}</p>
        </div>
        <div className="wizard-actions">
          <Link to={bookTo('home')} className="btn">← Book Home</Link>
          <Link to={bookTo('ide')} className="btn">进入 IDE</Link>
          <button type="button" className="btn" onClick={() => setAdvanced((a) => !a)}>
            {advanced ? '隐藏高级' : '显示高级'}
          </button>
        </div>
      </div>

      <div className="settings-grid">
        <div className="panel">
          <div className="panel-title">书籍信息</div>
          <p>ID: {book.id}</p>
          <p>题材: {book.genre || '—'}</p>
          <p>Schema: V{book.schemaVersion}</p>
          <p>Brain: {book.brainEnabled ? '启用' : '关闭'}</p>
        </div>

        <div className="panel">
          <div className="panel-title">单书写作参数</div>
          <label className="settings-field">
            <span>Temperature</span>
            <input
              type="number"
              step="0.05"
              min="0"
              max="1.5"
              value={draft.temperature}
              onChange={(e) => setDraft((d) => ({ ...d, temperature: e.target.value }))}
            />
          </label>
          <label className="settings-field">
            <span>Model</span>
            <input
              type="text"
              placeholder="deepseek-chat"
              value={draft.model}
              onChange={(e) => setDraft((d) => ({ ...d, model: e.target.value }))}
            />
          </label>
          <label className="settings-field">
            <span>Light Model（校验/重写）</span>
            <input
              type="text"
              placeholder="可选，默认同 Model"
              value={draft.lightModel}
              onChange={(e) => setDraft((d) => ({ ...d, lightModel: e.target.value }))}
            />
          </label>
          <label className="settings-field">
            <span>Max Tokens</span>
            <input
              type="number"
              placeholder="可选"
              value={draft.maxTokens}
              onChange={(e) => setDraft((d) => ({ ...d, maxTokens: e.target.value }))}
            />
          </label>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void saveConfig()}>
            {busy ? '保存中…' : '保存配置'}
          </button>
          {config.updatedAt && <p className="text-dim">上次更新：{config.updatedAt}</p>}
          {msg && <p className="ai-msg">{msg}</p>}
        </div>
      </div>

      {advanced && (
        <>
          <p className="readonly-notice">高级模式 — Runtime 控制（只触发 API，不修改 Pipeline 逻辑）</p>
          <RuntimeBar bookId={book.id} chapter={chapter} onAction={refresh} runtime={runtime} />
          <div className="panel" style={{ marginTop: 16 }}>
            <div className="panel-title">Memory · Snapshot</div>
            {snapshots.length === 0 && <p className="text-dim">暂无快照</p>}
            {snapshots.map((s) => (
              <div key={s.id} className="snapshot-row">
                <code>{s.id}</code> — Ch{s.chapter} {s.label}
                <button
                  type="button"
                  className="btn"
                  style={{ marginLeft: 8 }}
                  onClick={() => api.runtimeRollback(book.id, s.id).then(refresh)}
                >
                  Rollback
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
