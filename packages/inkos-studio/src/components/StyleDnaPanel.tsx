import { useEffect, useState } from 'react';
import { api } from '../api/client';

interface Props {
  bookId: string;
  preset: string;
}

export function StyleDnaPanel({ bookId, preset }: Props) {
  const [dna, setDna] = useState<Record<string, unknown> | null>(null);
  const [sample, setSample] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.getSystemFile(bookId, 'style_dna').then(setDna).catch(() => {});
  }, [bookId]);

  const extract = async (useSample = false) => {
    setBusy(true);
    setMsg('');
    try {
      const res = await api.extractStyleDna({ preset, sampleText: useSample ? sample : undefined });
      setDna(res.styleDna);
      await api.saveStyleDna(bookId, res.styleDna);
      setMsg('Style DNA 已保存至 style_dna.yaml');
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel style-dna-panel">
      <div className="panel-title">Style DNA Engine</div>
      <button type="button" className="btn btn-sm btn-ai" disabled={busy} onClick={() => extract(false)}>
        从预设「{preset}」蒸馏
      </button>
      <textarea value={sample} onChange={(e) => setSample(e.target.value)} rows={3}
        placeholder="或粘贴你喜欢的小说片段，AI 分析私人文风…" />
      <button type="button" className="btn btn-sm" disabled={busy || !sample.trim()} onClick={() => extract(true)}>
        分析片段
      </button>
      {msg && <p className="ai-msg">{msg}</p>}
      {dna && (
        <pre className="style-dna-preview">{JSON.stringify(dna, null, 2)}</pre>
      )}
    </div>
  );
}
