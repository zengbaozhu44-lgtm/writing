import { useEffect, useState } from 'react';
import { api } from '../api/client';

interface Props {
  bookId: string;
}

export function WorldSimulationPanel({ bookId }: Props) {
  const [sim, setSim] = useState<Record<string, unknown> | null>(null);
  const [years, setYears] = useState(10);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => {
    api.getSystemFile(bookId, 'world_simulation').then((d) => { if (d) setSim(d); }).catch(() => {});
  };

  useEffect(() => { load(); }, [bookId]);

  const run = async () => {
    setBusy(true);
    setMsg('世界模拟运行中…');
    try {
      const res = await api.worldSimulate(bookId, years);
      setSim(res.simulation);
      setMsg('模拟完成，已保存 world_simulation.yaml');
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const timeline = (sim?.timeline as { year: number; ai_control?: number; social_stability?: number; events?: string[] }[]) || [];

  return (
    <div className="panel world-sim-panel">
      <div className="panel-title">World Simulation · 世界运行模拟</div>
      <div className="sim-controls">
        <label>模拟年数</label>
        <input type="number" min={3} max={50} value={years} onChange={(e) => setYears(Number(e.target.value) || 10)} />
        <button type="button" className="btn btn-primary" disabled={busy} onClick={run}>
          {busy ? '模拟中…' : `模拟 ${years} 年`}
        </button>
      </div>
      {msg && <p className="ai-msg">{msg}</p>}
      {timeline.length > 0 && (
        <div className="sim-timeline">
          {timeline.map((t) => (
            <div key={t.year} className="sim-year-card">
              <h4>{t.year}</h4>
              {t.ai_control != null && <p>AI 控制率: {t.ai_control}%</p>}
              {t.social_stability != null && <p>社会稳定: {t.social_stability}%</p>}
              <ul>{(t.events || []).map((e, i) => <li key={i}>{e}</li>)}</ul>
            </div>
          ))}
        </div>
      )}
      {sim?.summary != null && <p className="text-dim sim-summary">{String(sim.summary)}</p>}
    </div>
  );
}
