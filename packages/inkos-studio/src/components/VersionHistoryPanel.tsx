import { useEffect, useState } from 'react';
import { api, CanonVersion } from '../api/client';

interface Props {
  bookId: string;
  moduleKey: string;
  file?: string;
  onRestore: () => void;
}

export function VersionHistoryPanel({ bookId, moduleKey, file, onRestore }: Props) {
  const [versions, setVersions] = useState<CanonVersion[]>([]);
  const [compare, setCompare] = useState<{ line: number; type: string; from?: string; to?: string; text?: string }[] | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = () => {
    api.listCanonVersions(bookId, moduleKey, file).then((r) => setVersions(r.versions)).catch(() => {});
  };

  useEffect(() => { load(); }, [bookId, moduleKey, file]);

  const doCompare = async () => {
    if (!from || !to) return;
    const res = await api.compareCanonVersions(bookId, moduleKey, from, to, file);
    setCompare(res.diff);
  };

  const restore = async (vid: string) => {
    await api.restoreCanonVersion(bookId, moduleKey, vid, file);
    onRestore();
    load();
  };

  if (!versions.length) return null;

  return (
    <div className="panel version-panel">
      <div className="panel-title">版本历史 · Creator Loop</div>
      <div className="version-list">
        {versions.map((v) => (
          <div key={v.id} className="version-row">
            <span><strong>{v.id}</strong> {v.label}</span>
            <span className="text-dim">{v.at ? new Date(v.at).toLocaleString('zh-CN') : ''}</span>
            <button type="button" className="btn btn-sm" onClick={() => restore(v.id)}>恢复</button>
          </div>
        ))}
      </div>
      {versions.length >= 2 && (
        <div className="version-compare">
          <select value={from} onChange={(e) => setFrom(e.target.value)}>
            <option value="">对比 From</option>
            {versions.map((v) => <option key={v.id} value={v.id}>{v.id}</option>)}
          </select>
          <select value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">对比 To</option>
            {versions.map((v) => <option key={v.id} value={v.id}>{v.id}</option>)}
          </select>
          <button type="button" className="btn btn-sm" onClick={doCompare}>查看 Diff</button>
        </div>
      )}
      {compare && (
        <pre className="version-diff">
          {compare.filter((d) => d.type !== 'same').map((d) => (
            <div key={d.line} className={`diff-${d.type}`}>
              L{d.line} [{d.type}] {d.from || d.text} → {d.to || ''}
            </div>
          ))}
        </pre>
      )}
    </div>
  );
}
