import { useState } from 'react';
import { api, StoryDna } from '../api/client';

interface Props {
  onDnaReady: (dna: StoryDna) => void;
  onPitchChange?: (pitch: string) => void;
}

export function ConversationCreator({ onDnaReady, onPitchChange }: Props) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [state, setState] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);

  const send = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || busy) return;
    setInput('');
    const next = [...messages, { role: 'user', content: msg }];
    setMessages(next);
    onPitchChange?.(msg);
    setBusy(true);
    try {
      const res = await api.conversationCreate(next, state);
      setMessages([...next, { role: 'assistant', content: res.reply }]);
      setState(res.state || {});
      if (res.ready && res.dna) onDnaReady(res.dna);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel conversation-creator">
      <div className="panel-title">Conversation Creation · 对话式共创</div>
      <div className="conv-log">
        {messages.length === 0 && (
          <p className="text-dim">用户：我想写一个未来世界…<br />AI：好，我先设计三个方向…</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'conv-user' : 'conv-ai'}>
            {m.role === 'user' ? '你' : 'AI'}：{m.content}
          </div>
        ))}
      </div>
      <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={3}
        placeholder="描述你的想法，或回复 A/B/C 选择方案…" disabled={busy} />
      <button type="button" className="btn btn-primary" onClick={() => send()} disabled={busy || !input.trim()}>
        发送
      </button>
      {messages.length === 0 && (
        <button type="button" className="btn" onClick={() => send('我想写一个未来世界')}>快速开始</button>
      )}
    </div>
  );
}
