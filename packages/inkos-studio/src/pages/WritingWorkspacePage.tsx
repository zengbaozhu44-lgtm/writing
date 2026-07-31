import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api, Scene } from '../api/client';
import { RuntimePipelineProgress } from '../components/RuntimePipelineProgress';
import { ChapterDirectorPanel } from '../components/ChapterDirectorPanel';
import { StudioLiveMetricsPanel } from '../components/StudioLiveMetricsPanel';
import { useRuntimeStream } from '../hooks/useRuntimeStream';
import { useStudioMetricsLive } from '../hooks/useStudioMetricsLive';
import { resolveNextWritableChapter } from '../lib/nextChapter';
import type { BookContext } from '../layouts/BookLayout';

type ViewMode = 'read' | 'edit' | 'ai';

export function WritingWorkspacePage() {
  const { book, chapter, setChapter, refresh } = useOutletContext<BookContext>();
  const [chapters, setChapters] = useState<{ number: number; title: string; hasText?: boolean }[]>([]);
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [mode, setMode] = useState<ViewMode>('read');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiMsg, setAiMsg] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { stages, active, lastMessage, start, finish, stop } = useRuntimeStream(book.id);

  const [showDirector, setShowDirector] = useState(false);

  const loadChapter = (n: number) => {
    setChapter(n);
    api.getChapterText(book.id, n).then((d) => {
      setText(d.text);
      setTitle(d.title);
      setScenes(d.scenes || []);
    }).catch(() => {});
  };

  useEffect(() => {
    api.listChapters(book.id).then(setChapters).catch(() => {});
    loadChapter(chapter);
  }, [book.id]);

  useEffect(() => { loadChapter(chapter); }, [chapter]);

  const runAi = async (action: string, prompt?: string) => {
    setAiBusy(true);
    setAiMsg('');
    setMode('ai');
    try {
      const res = await api.aiGenerate(book.id, {
        module: 'optimize',
        action,
        current: text,
        pitch: prompt || aiPrompt,
        save: false,
      });
      const md = (res.result as { markdown?: string }).markdown;
      if (md) {
        setText(md);
        setAiMsg('AI 修改完成 — 可切换编辑模式保存');
      } else {
        setAiMsg('无内容返回');
      }
    } catch (e) {
      setAiMsg((e as Error).message);
    } finally {
      setAiBusy(false);
    }
  };

  const targetChapter = resolveNextWritableChapter(chapters, chapter, Boolean(text.trim()));
  const metricsLive = useStudioMetricsLive(book.id, targetChapter, generating || active);

  const generateNext = async () => {
    setGenerating(true);
    start();
    try {
      const res = await api.runtimeRunLiving(book.id, targetChapter);
      const pipeline = res.result as { pass?: boolean; awaiting?: string; error?: string; message?: string };
      if (pipeline?.pass !== true || pipeline?.awaiting || pipeline?.error) {
        const errMsg = pipeline.error || pipeline.message
          || (pipeline.awaiting === 'writer' ? '需要配置 LLM 或手动填写正文后继续' : '章节生成未完成');
        finish(false, errMsg);
        setAiMsg(errMsg);
        return;
      }
      refresh();
      const written = await api.getChapterText(book.id, targetChapter);
      if (!written?.text?.trim()) {
        const errMsg = `第 ${targetChapter} 章显示成功但未找到正文文件，请重试`;
        finish(false, errMsg);
        setAiMsg(errMsg);
        return;
      }
      loadChapter(targetChapter);
      const evo = res.livingEvolution as {
        editorFeedback?: { commercial_score?: number; literary_score?: number; serial_score?: number };
        worldState?: { ai_control?: number; rebellion_level?: number };
        characterEvolutions?: { name: string; brain?: { current_state?: Record<string, number> } }[];
      } | undefined;
      if (evo) {
        const scores = evo.editorFeedback;
        const ws = evo.worldState;
        const parts = [`第 ${targetChapter} 章完成 · Living 演化`];
        if (scores) parts.push(`编辑 ${scores.commercial_score}/${scores.literary_score}/${scores.serial_score}`);
        if (ws) parts.push(`世界 AI${ws.ai_control}% 反抗${ws.rebellion_level}`);
        if (evo.characterEvolutions?.length) parts.push(`人物更新 ${evo.characterEvolutions.length} 人`);
        finish(true, parts.join(' · '));
        setAiMsg(parts.join(' · '));
      } else {
        finish(true, `第 ${targetChapter} 章生成完成`);
        setAiMsg(`第 ${targetChapter} 章生成完成`);
      }
      api.listChapters(book.id).then(setChapters).catch(() => {});
    } catch (e) {
      const msg = (e as Error).message;
      finish(false, msg);
      setAiMsg(msg);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="writing-workspace">
      <aside className="ws-chapters">
        <div className="panel-title">章节目录</div>
        <div className="ws-volume">第一卷</div>
        {chapters.map((ch) => (
          <button
            key={ch.number}
            type="button"
            className={`ws-ch-item ${ch.number === chapter ? 'active' : ''} ${ch.hasText ? 'has-text' : ''}`}
            onClick={() => loadChapter(ch.number)}
          >
            <span className="ws-ch-num">第{ch.number}章</span>
            <span className="ws-ch-title">{ch.title || '未命名'}</span>
          </button>
        ))}
        {chapters.length === 0 && <p className="text-dim ws-empty">尚无章节</p>}
        <button type="button" className="btn btn-primary ws-gen-btn" disabled={generating || active}
          onClick={() => setShowDirector(true)}>
          {generating || active ? '生成中…' : (targetChapter === 1 && !text.trim() ? '生成第一章' : '生成下一章')}
        </button>
        {(Boolean(text.trim()) || chapters.some((c) => c.number === chapter && c.hasText)) && (
          <button
            type="button"
            className="btn ws-gen-btn"
            disabled={generating || active}
            title="删除本章并用最新引擎重新生成"
            onClick={() => {
              if (!window.confirm(`确认删除第 ${chapter} 章草稿并立刻重新生成？`)) return;
              void (async () => {
                setGenerating(true);
                start();
                try {
                  await api.deleteChapterDraft(book.id, chapter);
                  setText('');
                  const res = await api.runtimeRunLiving(book.id, chapter);
                  if (res.result?.pass !== true) {
                    throw new Error(String(res.result?.error || '重新生成未完成'));
                  }
                  loadChapter(chapter);
                  finish(true, `第 ${chapter} 章已重新生成`);
                  setAiMsg(`第 ${chapter} 章已重新生成 · 待审计`);
                  api.listChapters(book.id).then(setChapters).catch(() => {});
                } catch (e) {
                  const msg = (e as Error).message || String(e);
                  finish(false, msg);
                  setAiMsg(msg);
                } finally {
                  setGenerating(false);
                }
              })();
            }}
          >
            重新生成本章
          </button>
        )}
        {showDirector && (
          <div className="wb-modal-overlay" onClick={() => setShowDirector(false)}>
            <div className="wb-modal" onClick={(e) => e.stopPropagation()}>
              <ChapterDirectorPanel
                bookId={book.id}
                chapter={targetChapter}
                onConfirm={() => { setShowDirector(false); generateNext(); }}
                onCancel={() => setShowDirector(false)}
              />
            </div>
          </div>
        )}
      </aside>

      <main className="ws-content">
        <header className="ws-header">
          <div>
            <h1>第 {chapter} 章</h1>
            <h2>{title || '未命名'}</h2>
          </div>
          <div className="ws-mode-tabs">
            {(['read', 'edit', 'ai'] as ViewMode[]).map((m) => (
              <button key={m} type="button" className={mode === m ? 'active' : ''} onClick={() => setMode(m)}>
                {m === 'read' ? '阅读' : m === 'edit' ? '编辑' : 'AI修改'}
              </button>
            ))}
          </div>
        </header>

        {(generating || active) && (
          <>
            <RuntimePipelineProgress stages={stages} message={lastMessage} />
            <StudioLiveMetricsPanel
              analytics={metricsLive.analytics}
              latestBudget={metricsLive.latestBudget}
              live={metricsLive.live}
              compact
            />
          </>
        )}

        {mode === 'read' && (
          <div className="reader-body ws-body">{text || '（正文尚未生成 — 点击「生成下一章」开始创作）'}</div>
        )}
        {mode === 'edit' && (
          <textarea className="ws-editor" value={text} onChange={(e) => setText(e.target.value)} rows={24} />
        )}
        {mode === 'ai' && (
          <div className="ws-ai-preview">
            <div className="reader-body ws-body">{text || '（无正文）'}</div>
            <p className="text-dim ws-ai-hint">使用右侧 AI 助手修改正文，完成后可切换编辑模式</p>
          </div>
        )}

        {scenes.length > 0 && (
          <div className="ws-scenes-row">
            {scenes.map((s) => (
              <span key={s.id} className={`ws-scene-pill ${s.review?.pass ? 'pass' : ''}`}>
                Scene{s.index} {s.title}
              </span>
            ))}
          </div>
        )}
      </main>

      <aside className="ws-ai">
        <div className="panel-title">AI 助手</div>
        <div className="ws-ai-actions">
          <button type="button" className="btn btn-ai" disabled={aiBusy} onClick={() => runAi('enhance', '加强这一段压迫感')}>
            增强描写
          </button>
          <button type="button" className="btn btn-ai" disabled={aiBusy} onClick={() => runAi('style', '改成当前文风')}>
            改变文风
          </button>
          <button type="button" className="btn btn-ai" disabled={aiBusy} onClick={() => runAi('conflict', '增加冲突张力')}>
            增加冲突
          </button>
          <button type="button" className="btn btn-ai" disabled={aiBusy} onClick={() => runAi('review', '检查逻辑问题')}>
            检查逻辑
          </button>
          <button type="button" className="btn btn-ai" disabled={aiBusy} onClick={() => runAi('continue', '继续下一段')}>
            继续生成
          </button>
        </div>
        <textarea
          className="ws-ai-input"
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder="输入修改指令…"
          rows={4}
        />
        <button type="button" className="btn btn-primary" disabled={aiBusy || !aiPrompt.trim()} onClick={() => runAi('custom')}>
          应用修改
        </button>
        {aiMsg && <p className="ai-msg">{aiMsg}</p>}
        <div className="ws-review-block">
          <div className="panel-title">Review</div>
          <p className="text-dim">生成章节后自动显示 Review 结果</p>
        </div>
      </aside>
    </div>
  );
}
