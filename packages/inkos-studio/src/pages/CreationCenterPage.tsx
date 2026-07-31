import { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { api, CreationInsights } from '../api/client';
import { AiCreationAssistant } from '../components/AiCreationAssistant';
import { useBookPath } from '../hooks/useBookPath';
import type { BookContext } from '../layouts/BookLayout';

export function CreationCenterPage() {
  const { book, chapter, refresh } = useOutletContext<BookContext>();
  const { to: bookTo } = useBookPath();
  const [insights, setInsights] = useState<CreationInsights | null>(null);
  const [assistant, setAssistant] = useState<Awaited<ReturnType<typeof api.getCreationSuggestions>> | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [pitch, setPitch] = useState('');

  const load = useCallback(() => {
    api.getCreationInsights(book.id).then(setInsights).catch(() => {});
    api.getCreationSuggestions(book.id, chapter).then(setAssistant).catch(() => {});
    api.getModule(book.id, 'chapter-task').then((m) => {
      const g = m.content?.match(/\*\*目标\*\*[：:]\s*(.*)/)?.[1];
      if (g) setPitch(g);
    }).catch(() => {});
  }, [book.id, chapter]);

  useEffect(() => { load(); }, [load]);

  const aiAction = async (module: string, label: string) => {
    setBusy(module);
    setMsg('AI 生成中…');
    try {
      const res = await api.aiGenerate(book.id, {
        module,
        action: 'generate',
        pitch: pitch || book.title,
        save: true,
      });
      const result = res.result as { factions?: unknown[]; characters?: unknown[]; markdown?: string };
      const n = result.factions?.length || result.characters?.length || (result.markdown ? 1 : 0);
      setMsg(n > 0 ? `${label} 已更新（${n} 项）` : `${label} 已更新`);
      load();
      refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const w = insights?.world;
  const chars = insights?.characters;
  const facs = insights?.factions;

  return (
    <div className="page creation-center">
      <div className="page-header">
        <div>
          <h1>创作中心</h1>
          <p className="page-sub">{book.title} · AI 创作助手</p>
        </div>
      </div>
      {msg && <p className="ai-msg">{msg}</p>}

      <div className="panel creation-assistant-panel">
        <AiCreationAssistant data={assistant?.assistant ?? null} />
      </div>

      <div className="collab-grid v31">
        {/* 世界卡 */}
        <div className="collab-card-rich">
          <div className="collab-card-head">
            <h3>世界构建</h3>
            <span className="collab-pct">{w?.completeness ?? 0}%</span>
          </div>
          <div className="collab-checks">
            <div className="collab-check-group">
              <span className="collab-check-label">已有</span>
              {(w?.done || []).map((d) => <span key={d} className="check-done">✓ {d}</span>)}
              {!w?.done?.length && <span className="text-dim">暂无</span>}
            </div>
            {w?.missing?.length ? (
              <div className="collab-check-group">
                <span className="collab-check-label">缺少</span>
                {w.missing.map((m) => <span key={m} className="check-miss">{m}</span>)}
              </div>
            ) : null}
          </div>
          <p className="collab-suggestion">AI 建议：{w?.suggestion || '生成世界设定'}</p>
          <div className="collab-card-actions">
            <button type="button" className="btn btn-primary" disabled={busy === 'world'}
              onClick={() => aiAction('world', '世界')}>
              {busy === 'world' ? '生成中…' : '立即生成'}
            </button>
            <Link to={bookTo('world')} className="btn">查看详情</Link>
          </div>
        </div>

        {/* 人物卡 */}
        <div className="collab-card-rich">
          <div className="collab-card-head">
            <h3>{chars?.protagonist?.name || '人物'}</h3>
            <span className="collab-tag">{chars?.protagonist?.role || '主角'}</span>
          </div>
          {chars?.protagonist ? (
            <>
              <p>当前状态：{chars.protagonist.growth || chars.protagonist.identity || '—'}</p>
              <p>目标：{chars.protagonist.goal}</p>
              <p className="collab-suggestion">AI 建议：{chars.suggestion}</p>
            </>
          ) : (
            <p className="text-dim">尚未创建角色</p>
          )}
          <div className="collab-card-actions">
            <button type="button" className="btn btn-ai" disabled={!!busy}
              onClick={() => aiAction('characters', '人物')}>AI 增强</button>
            <button type="button" className="btn btn-ai" disabled={!!busy}
              onClick={() => aiAction('characters', '关系')}>生成关系</button>
            <Link to={bookTo('characters')} className="btn">扩写背景</Link>
          </div>
        </div>

        {/* 势力卡 */}
        <div className="collab-card-rich">
          <div className="collab-card-head">
            <h3>势力关系</h3>
            <span className="collab-pct">{facs?.completeness ?? 0}%</span>
          </div>
          <div className="faction-relations">
            {(facs?.list || []).slice(0, 4).map((f) => (
              <div key={f.name} className="faction-rel-item">
                <strong>{f.name}</strong>
                {f.hostile && <span className="rel-hostile">敌对 → {f.hostile}</span>}
                {f.friendly && <span className="rel-friendly">合作 → {f.friendly}</span>}
              </div>
            ))}
            {!facs?.list?.length && <p className="text-dim">尚未创建势力</p>}
          </div>
          <p className="collab-suggestion">AI 建议：{facs?.suggestion || '生成对立势力'}</p>
          <div className="collab-card-actions">
            <button type="button" className="btn btn-primary" disabled={busy === 'factions'}
              onClick={() => aiAction('factions', '势力')}>
              {busy === 'factions' ? '生成中…' : '立即生成'}
            </button>
            <Link to={bookTo('factions')} className="btn">查看详情</Link>
          </div>
        </div>

        {/* 规则 & 大纲 */}
        <Link to={bookTo('writing')} className="collab-card">
          <div className="collab-card-head"><h3>规则</h3><span className="collab-tag">AI 协作</span></div>
          <p className="collab-desc">叙事节奏、语言风格、爽点悬念 · 完成度 {insights?.writing?.completeness ?? 0}%</p>
        </Link>
        <Link to={bookTo('chapter')} className="collab-card">
          <div className="collab-card-head"><h3>大纲</h3><span className="collab-tag">AI 协作</span></div>
          <p className="collab-desc">卷规划与章节任务</p>
        </Link>
      </div>
    </div>
  );
}
