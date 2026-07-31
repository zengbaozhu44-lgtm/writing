import { useState } from 'react';
import { api } from '../api/client';

export function Copilot({ bookId, onDone }: { bookId: string; onDone?: () => void }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!input.trim()) return;
    setBusy(true);
    setLog((l) => [...l, `你: ${input}`]);
    try {
      const res = await api.copilot(bookId, input) as { message?: string; intent?: { action: string }; runtime?: unknown };
      setLog((l) => [...l, `Copilot: ${res.message || res.intent?.action || '完成'}`]);
      setInput('');
      onDone?.();
    } catch (e) {
      setLog((l) => [...l, `错误: ${(e as Error).message}`]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`copilot ${open ? 'open' : ''}`}>
      <button type="button" className="copilot-toggle" onClick={() => setOpen(!open)}>
        ✨ Copilot
      </button>
      {open && (
        <div className="copilot-panel">
          <div className="copilot-log">
            {log.length === 0 && <div className="copilot-hint">例: "下一章冲突太弱" / "开始创作"</div>}
            {log.map((line, i) => <div key={i}>{line}</div>)}
          </div>
          <div className="copilot-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="自然语言控制 Runtime..."
              disabled={busy}
            />
            <button type="button" className="btn btn-primary" onClick={send} disabled={busy}>发送</button>
          </div>
        </div>
      )}
    </div>
  );
}
