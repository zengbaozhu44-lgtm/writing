import { useState } from 'react';
import { api, AiEditorReview } from '../api/client';

const MODES = [
  { id: 'commercial', label: '商业编辑', desc: '吸引力·爽点·卖点' },
  { id: 'literary', label: '文学编辑', desc: '人物·语言·氛围·主题' },
  { id: 'serialization', label: '连载编辑', desc: '章末钩子·追读欲' },
];

interface Props {
  bookId: string;
  content?: string;
  chapter?: number;
}

export function AiEditorPanel({ bookId, content, chapter }: Props) {
  const [mode, setMode] = useState('commercial');
  const [review, setReview] = useState<AiEditorReview | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    setReview(null);
    try {
      let text = content?.trim() || '';
      if (!text && chapter) {
        const ch = await api.getChapterText(bookId, chapter);
        text = ch.text?.trim() || '';
      }
      if (!text) {
        setReview({
          mode,
          summary: '暂无正文可审 — 请先在写作工作台生成章节',
          issues: [{ level: 'info', text: '生成至少一章后再使用 AI 编辑室' }],
        });
        return;
      }
      const res = await api.aiEditor(bookId, { mode, content: text, chapter });
      setReview(res);
    } catch (e) {
      setReview({
        mode,
        summary: (e as Error).message,
        issues: [{ level: 'error', text: '审稿请求失败' }],
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel ai-editor-panel">
      <div className="panel-title">AI Editor · 编辑室</div>
      <div className="editor-modes">
        {MODES.map((m) => (
          <button key={m.id} type="button"
            className={`btn ${mode === m.id ? 'btn-primary' : ''}`}
            onClick={() => setMode(m.id)}>
            {m.label}
          </button>
        ))}
      </div>
      <button type="button" className="btn btn-ai" disabled={busy} onClick={run}>
        {busy ? '审稿中…' : '开始审稿'}
      </button>

      {review && (
        <div className="editor-result">
          {review.scores && (
            <div className="editor-scores">
              {Object.entries(review.scores).map(([k, v]) => (
                <div key={k} className="score-pill">{k}: <strong>{v}</strong></div>
              ))}
            </div>
          )}
          {review.summary && <p className="editor-summary">{review.summary}</p>}
          <ol className="editor-issues">
            {(review.issues || []).map((iss, i) => (
              <li key={i} className={`issue-${iss.level}`}>{iss.text}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
