import { useState } from 'react';
import { api } from '../api/client';

type AiAction = 'generate' | 'complete' | 'optimize' | 'rewrite';

interface Props {
  bookId: string;
  module: string;
  pitch?: string;
  preset?: string;
  current?: string;
  file?: string;
  onResult: (markdown: string, fields?: Record<string, unknown>) => void;
  onBatchDone?: () => void;
  actions?: AiAction[];
}

const LABELS: Record<AiAction, string> = {
  generate: 'AI 生成',
  complete: 'AI 补全',
  optimize: 'AI 优化',
  rewrite: 'AI 重写',
};

const EDIT_ACTIONS = new Set<AiAction>(['complete', 'optimize', 'rewrite']);

export function AiAssistBar({
  bookId, module, pitch = '', preset, current, file, onResult, onBatchDone,
  actions = ['generate', 'optimize'],
}: Props) {
  const [busy, setBusy] = useState<AiAction | null>(null);
  const [msg, setMsg] = useState('');

  const run = async (action: AiAction) => {
    setBusy(action);
    setMsg('AI 处理中，请稍候…');
    try {
      const isEdit = EDIT_ACTIONS.has(action);
      const res = await api.aiGenerate(bookId, {
        module: isEdit ? 'optimize' : module,
        action,
        pitch,
        preset,
        current: isEdit ? current : undefined,
        file,
        save: false,
      });
      const result = res.result as {
        markdown?: string;
        fields?: Record<string, unknown>;
        characters?: { markdown?: string }[];
        factions?: { name: string; markdown?: string }[];
        message?: string;
        source?: string;
        error?: string;
      };

      if (result.markdown) {
        onResult(result.markdown, result.fields);
        setMsg(`${LABELS[action]} 完成 (${result.source || 'ok'})`);
      } else if (result.characters?.length) {
        const first = result.characters[0]?.markdown;
        if (first && (module === 'character' || module === 'characters')) {
          onResult(first);
        }
        onBatchDone?.();
        setMsg(`已生成 ${result.characters.length} 个人物 (${result.source || 'ok'})`);
      } else if (result.factions?.length) {
        onBatchDone?.();
        setMsg(`已生成 ${result.factions.length} 个势力 (${result.source || 'ok'})`);
      } else if (result.message) {
        setMsg(result.message);
      } else {
        setMsg(result.error ? `失败: ${result.error}` : '无内容返回，请检查 Server 日志');
      }
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="ai-assist-bar">
      {actions.map((a) => (
        <button key={a} type="button" className="btn btn-ai" disabled={!!busy} onClick={() => run(a)}>
          {busy === a ? '处理中…' : LABELS[a]}
        </button>
      ))}
      {msg && <span className={`ai-msg ${busy ? 'ai-msg-busy' : ''}`}>{msg}</span>}
    </div>
  );
}
