import { useEffect, useState } from 'react';
import { api, ChapterPlan } from '../api/client';

interface Props {
  bookId: string;
  chapter: number;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function ChapterDirectorPanel({ bookId, chapter, onConfirm, onCancel }: Props) {
  const [plan, setPlan] = useState<ChapterPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.getChapterPlan(bookId, chapter).then((p) => { if (p?.goal) setPlan(p); }).catch(() => {});
  }, [bookId, chapter]);

  const design = async () => {
    setBusy(true);
    setMsg('');
    try {
      const res = await api.chapterDirector(bookId, chapter);
      setPlan(res.plan);
      setMsg('章节计划已保存至 chapter_plans/');
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    setMsg('注入 Living Context…');
    try {
      if (plan) await api.livingPrepare(bookId, chapter, plan);
      onConfirm();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel chapter-director-panel">
      <div className="panel-title">Chapter Director · 第 {chapter} 章</div>
      <p className="text-dim">计划将持久化并注入 Story DNA + Character Brain + World State</p>

      <div className="chapter-director-scroll">
        {!plan ? (
          <button type="button" className="btn btn-primary" disabled={busy} onClick={design}>
            {busy ? '导演设计中…' : 'AI 章节导演'}
          </button>
        ) : (
          <div className="chapter-plan">
            <p><strong>目标</strong>：{plan.goal}</p>
            <p><strong>冲突</strong>：{plan.conflict}</p>
            <p><strong>高潮</strong>：{plan.climax}</p>
            <p><strong>代价</strong>：{plan.cost}</p>
            <p><strong>钩子</strong>：{plan.hook}</p>
            {plan.scenes && (
              <div>
                <strong>场景</strong>
                <ul className="chapter-plan-scenes">
                  {(Array.isArray(plan.scenes) ? plan.scenes : []).map((s, i) => (
                    <li key={i}>{typeof s === 'string' ? s : JSON.stringify(s)}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {plan && (
        <div className="chapter-director-footer wizard-actions">
          <button type="button" className="btn btn-primary" disabled={busy} onClick={confirm}>
            {busy ? '准备中…' : '确认生成（Living 模式）'}
          </button>
          <button type="button" className="btn" onClick={design} disabled={busy}>重新设计</button>
          {onCancel && <button type="button" className="btn" onClick={onCancel}>取消</button>}
        </div>
      )}

      {msg && <p className="ai-msg">{msg}</p>}
    </div>
  );
}
