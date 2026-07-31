import { useState } from 'react';
import { api } from '../api/client';

interface Props {
  bookId: string;
  module: string;
  current: string;
  file?: string;
  pitch?: string;
  preset?: string;
  onUpdate: (md: string) => void;
}

export function ModuleAiCopilot({ bookId, module, current, file, pitch, preset, onUpdate }: Props) {
  const [input, setInput] = useState('');
  const [log, setLog] = useState<string[]>(['输入建议，AI 将基于当前内容增量修改']);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!input.trim() || busy) return;
    const msg = input.trim();
    setInput('');
    setBusy(true);
    setLog((l) => [...l, `你: ${msg}`]);
    try {
      const res = await api.creatorIncremental(bookId, {
        module, current, suggestion: msg, file, pitch, preset,
      });
      const md = res.result.markdown;
      if (md) {
        onUpdate(md);
        setLog((l) => [...l, `AI: 已增量更新（${res.result.version?.id || 'ok'}）`]);
      }
    } catch (e) {
      setLog((l) => [...l, `错误: ${(e as Error).message}`]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="module-ai-copilot panel">
      <div className="panel-title">AI 助手</div>
      <div className="copilot-log mini">
        {log.map((line, i) => <div key={i} className={line.startsWith('你:') ? 'copilot-user' : ''}>{line}</div>)}
      </div>
      <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={3} placeholder="世界太普通？增加文明遗迹…" disabled={busy} />
      <button type="button" className="btn btn-primary" onClick={send} disabled={busy || !input.trim()}>应用建议</button>
    </aside>
  );
}
