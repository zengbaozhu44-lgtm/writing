import { useState } from 'react';
import { api } from '../api/client';

export function CopilotPanel({ bookId, onDone, embedded }: { bookId: string; onDone?: () => void; embedded?: boolean }) {
  const [input, setInput] = useState('');
  const [log, setLog] = useState<string[]>(['✨ Copilot 在线 — 试试「帮我生成调查局设定」']);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!input.trim() || busy) return;
    const msg = input.trim();
    setInput('');
    setBusy(true);
    setLog((l) => [...l, `你: ${msg}`]);
    try {
      const res = await api.copilot(bookId, msg) as {
        reply?: string; message?: string; created?: number;
        delegate?: string; action?: string;
      };
      const reply = res.reply
        || (res.created ? `已创建 ${res.created} 项` : null)
        || res.message
        || (res.delegate ? `执行: ${res.delegate}` : null)
        || `完成: ${res.action}`;
      setLog((l) => [...l, `Copilot: ${reply}`]);
      onDone?.();
    } catch (e) {
      setLog((l) => [...l, `错误: ${(e as Error).message}`]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className={embedded ? 'copilot-embedded' : 'copilot-panel-side'}>
      <div className="copilot-header">✨ Novel Copilot</div>
      <div className="copilot-log">
        {log.map((line, i) => <div key={i} className={line.startsWith('你:') ? 'copilot-user' : ''}>{line}</div>)}
      </div>
      <div className="copilot-input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="一句话控制创作…"
          rows={3}
          disabled={busy}
        />
        <button type="button" className="btn btn-primary" onClick={send} disabled={busy}>发送</button>
      </div>
    </aside>
  );
}
