import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { api, LivingTaskError, Scene, WriterOptimizerReport } from '../api/client';
import { IdeDrawer } from '../components/IdeDrawer';
import { RuntimeBar } from '../components/RuntimeBar';
import { RuntimePipelineProgress } from '../components/RuntimePipelineProgress';
import { StudioLiveMetricsPanel } from '../components/StudioLiveMetricsPanel';
import { PlannerDrawer } from '../components/drawers/PlannerDrawer';
import { DirectorDrawer } from '../components/drawers/DirectorDrawer';
import { PromptDrawer } from '../components/drawers/PromptDrawer';
import { MetricsDrawer } from '../components/drawers/MetricsDrawer';
import { MemoryDrawer } from '../components/drawers/MemoryDrawer';
import { HashDrawer } from '../components/drawers/HashDrawer';
import { AssistantDrawer } from '../components/drawers/AssistantDrawer';
import { DiagnosticsDrawer } from '../components/drawers/DiagnosticsDrawer';
import { SnippetsDrawer } from '../components/drawers/SnippetsDrawer';
import { CharactersDrawer } from '../components/drawers/CharactersDrawer';
import { FactionsDrawer } from '../components/drawers/FactionsDrawer';
import { WorldDrawer } from '../components/drawers/WorldDrawer';
import { LocationsDrawer } from '../components/drawers/LocationsDrawer';
import { WriterOptimizerView } from '../components/WriterOptimizerView';
import { SceneSegmentEditor } from '../components/SceneSegmentEditor';
import { BatchGenerationPanel } from '../components/BatchGenerationPanel';
import { useStudioMetricsLive } from '../hooks/useStudioMetricsLive';
import { useBookTaskLock } from '../hooks/useBookTaskLock';
import { useBookPath } from '../hooks/useBookPath';
import { useLocalBackup } from '../hooks/useLocalBackup';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { resolveNextWritableChapter } from '../lib/nextChapter';
import type { BookContext } from '../layouts/BookLayout';

type DrawerId = 'planner' | 'director' | 'prompt' | 'metrics' | 'memory' | 'hash' | 'assistant' | 'diagnostics' | 'snippets' | 'characters' | 'factions' | 'world' | 'locations';
type ViewMode = 'read' | 'edit' | 'ai';

const DRAWER_TABS: { id: DrawerId; label: string }[] = [
  { id: 'planner', label: 'Planner' },
  { id: 'director', label: 'Director' },
  { id: 'characters', label: '人物' },
  { id: 'factions', label: '势力' },
  { id: 'world', label: '世界' },
  { id: 'locations', label: '地点' },
  { id: 'diagnostics', label: '诊断' },
  { id: 'prompt', label: 'Prompt' },
  { id: 'metrics', label: 'Metrics' },
  { id: 'memory', label: 'Memory' },
  { id: 'hash', label: 'Hash' },
  { id: 'snippets', label: '片段' },
  { id: 'assistant', label: 'AI' },
];

const DRAWER_TITLES: Record<DrawerId, string> = {
  planner: 'Planner',
  director: 'Director',
  characters: '人物卡',
  factions: '势力 / 组织',
  world: '世界设定',
  locations: '地点',
  diagnostics: '章节诊断',
  prompt: 'Prompt',
  metrics: 'Metrics',
  memory: 'Memory',
  hash: 'Hash Dependency',
  snippets: '写作片段',
  assistant: 'AI 创作助手',
};

const AUTOSAVE_MS = 3000;

export function IdePage() {
  const { book, chapter, setChapter, refresh, runtime } = useOutletContext<BookContext>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { to: bookTo } = useBookPath();
  const lock = useBookTaskLock(book.id);
  const { stages, active, lastMessage, start, finish } = runtime;

  const [chapters, setChapters] = useState<{ number: number; title: string; hasText?: boolean }[]>([]);
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [mode, setMode] = useState<ViewMode>('read');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiMsg, setAiMsg] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<DrawerId | null>(null);
  const [forceDiagOpen, setForceDiagOpen] = useState(false);
  const [optimizerData, setOptimizerData] = useState<WriterOptimizerReport | null>(null);
  const [selectedScene, setSelectedScene] = useState<number>(1);
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showBatch, setShowBatch] = useState(false);

  const { exportMarkdown } = useLocalBackup(book.id, chapter, text, true);

  const textRef = useRef(text);
  const titleRef = useRef(title);
  const chapterRef = useRef(chapter);
  const dirtyRef = useRef(dirty);
  textRef.current = text;
  titleRef.current = title;
  chapterRef.current = chapter;
  dirtyRef.current = dirty;

  const saveChapter = useCallback(async (opts?: { silent?: boolean }) => {
    if (!dirtyRef.current && opts?.silent) return;
    const body = textRef.current;
    const ch = chapterRef.current;
    setSaveStatus('saving');
    try {
      await api.saveChapterText(book.id, ch, body, titleRef.current || undefined);
      setDirty(false);
      dirtyRef.current = false;
      setSaveStatus('saved');
      if (!opts?.silent) setAiMsg(`第 ${ch} 章已保存`);
      api.listChapters(book.id).then(setChapters).catch(() => {});
    } catch (e) {
      setSaveStatus('error');
      setAiMsg((e as Error).message);
    }
  }, [book.id]);

  // 3s debounce 自动保存
  useEffect(() => {
    if (!dirty) return undefined;
    const t = setTimeout(() => { void saveChapter({ silent: true }); }, AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [dirty, text, title, saveChapter]);

  // Ctrl/Cmd+S
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void saveChapter();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saveChapter]);

  const loadChapter = (n: number) => {
    if (dirtyRef.current) {
      void saveChapter({ silent: true });
    }
    setChapter(n);
    setDirty(false);
    setSaveStatus('idle');
    api.getChapterText(book.id, n).then((d) => {
      setText(d.text);
      setTitle(d.title);
      setScenes(d.scenes || []);
    }).catch(() => {});
  };

  useEffect(() => {
    api.listChapters(book.id).then(setChapters).catch(() => {});
    loadChapter(chapter);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅换书时整页重载
  }, [book.id]);

  useEffect(() => {
    api.getChapterText(book.id, chapter).then((d) => {
      setText(d.text);
      setTitle(d.title);
      setScenes(d.scenes || []);
      setDirty(false);
    }).catch(() => {});
  }, [book.id, chapter]);

  useEffect(() => {
    const idx = selectedScene || scenes[0]?.index || 1;
    api.getWriterOptimizer(book.id, chapter, idx).then((d) => {
      if (d && typeof d === 'object' && !Array.isArray(d) && ('draft' in d || 'polished' in d)) {
        setOptimizerData(d as WriterOptimizerReport);
      }
    }).catch(() => setOptimizerData(null));
  }, [book.id, chapter, scenes, selectedScene, lock.busy, active]);

  const onTextChange = (value: string) => {
    setText(value);
    setDirty(true);
  };

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
        setDirty(true);
        // AI 改写后立即落盘
        await api.saveChapterText(book.id, chapter, md, title || undefined);
        setDirty(false);
        setSaveStatus('saved');
        setAiMsg('AI 修改完成并已保存');
        api.listChapters(book.id).then(setChapters).catch(() => {});
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
  const metricsLive = useStudioMetricsLive(book.id, targetChapter, lock.busy || active);

  const generateChapter = async (ch: number, opts?: { afterDelete?: boolean }) => {
    const acq = lock.tryAcquire(ch, `正在生成第 ${ch} 章…`);
    if (!acq.ok) {
      setAiMsg(acq.reason);
      return;
    }
    start();
    try {
      const res = await api.runtimeRunLiving(book.id, ch, {
        signal: acq.controller.signal,
        onTaskId: lock.bindTaskId,
      });
      const pipeline = res.result as { pass?: boolean; awaiting?: string; error?: string; message?: string };
      if (pipeline?.pass !== true || pipeline?.awaiting || pipeline?.error) {
        const errMsg = pipeline.error || pipeline.message
          || (pipeline.awaiting === 'writer' ? '需要配置 LLM 或手动填写正文后继续' : '章节生成未完成');
        lock.release(false, errMsg);
        finish(false, errMsg);
        setAiMsg(errMsg);
        return;
      }
      refresh();
      const written = await api.getChapterText(book.id, ch);
      if (!written?.text?.trim()) {
        const errMsg = `第 ${ch} 章显示成功但未找到正文文件，请重试`;
        lock.release(false, errMsg);
        finish(false, errMsg);
        setAiMsg(errMsg);
        return;
      }
      loadChapter(ch);
      const okMsg = opts?.afterDelete
        ? `第 ${ch} 章已重新生成 · 待审计`
        : `第 ${ch} 章生成完成 · 待审计`;
      lock.release(true, okMsg);
      finish(true, okMsg);
      setAiMsg(okMsg);
      setActiveDrawer('diagnostics');
      api.listChapters(book.id).then(setChapters).catch(() => {});
    } catch (e) {
      const err = e as LivingTaskError;
      const msg = err?.code === 'ABORTED'
        ? '已取消生成'
        : err?.code === 'TASK_404_SERVICE_RESTART'
          ? err.message
          : (err?.message || String(e));
      lock.release(false, msg);
      finish(false, msg);
      setAiMsg(msg);
    }
  };

  const generateNext = async () => generateChapter(targetChapter);

  const regenerateCurrent = async () => {
    if (!window.confirm(`确认删除第 ${chapter} 章草稿并立刻重新生成？\n（会清空正文与连续性缓存）`)) return;
    try {
      await api.deleteChapterDraft(book.id, chapter);
      setText('');
      setTitle('');
      setAiMsg(`第 ${chapter} 章草稿已清除，开始重新生成…`);
      api.listChapters(book.id).then(setChapters).catch(() => {});
      await generateChapter(chapter, { afterDelete: true });
    } catch (e) {
      setAiMsg((e as Error).message || String(e));
    }
  };

  const toggleDrawer = (id: DrawerId) => {
    if (forceDiagOpen && activeDrawer === 'diagnostics' && id !== 'diagnostics') return;
    setActiveDrawer((prev) => (prev === id ? (forceDiagOpen && id === 'diagnostics' ? prev : null) : id));
  };

  // Home「健康徽章」跳转：?drawer=diagnostics
  useEffect(() => {
    const d = searchParams.get('drawer');
    if (d === 'diagnostics' || d === 'diag') {
      setActiveDrawer('diagnostics');
      searchParams.delete('drawer');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const shortcutHandlers = useMemo(() => ({
    onGenerate: () => {
      if (!lock.busy) void generateNext();
    },
    onDiagnostics: () => setActiveDrawer('diagnostics'),
    onSave: () => { void saveChapter(); },
  }), [lock.busy, saveChapter]);

  useKeyboardShortcuts(shortcutHandlers, true);

  const onRuntimeAction = () => {
    refresh();
    loadChapter(chapter);
    api.listChapters(book.id).then(setChapters).catch(() => {});
  };

  const insertSnippet = (snippet: string) => {
    setMode('edit');
    onTextChange(`${textRef.current.trim()}\n\n${snippet}`.trim());
    setAiMsg('已插入片段');
  };

  const onDiagAction = (action: string) => {
    if (action === 'open-director' || action === 'generate') setActiveDrawer('director');
    else if (action === 'open-metrics') setActiveDrawer('metrics');
    else if (action === 'open-memory') setActiveDrawer('memory');
    else if (action === 'focus-beat') setActiveDrawer('diagnostics');
    else if (action === 'regenerate') {
      setText('');
      setTitle('');
      void generateChapter(chapter, { afterDelete: true });
    } else if (action === 'deleted') {
      setText('');
      setTitle('');
      setAiMsg(`第 ${chapter} 章草稿已删除，可重新生成`);
    }
  };

  const busy = lock.busy || active;

  return (
    <div className="novel-ide">
      <header className="ide-topbar">
        <div className="ide-topbar-left">
          <button type="button" className="btn-ghost" onClick={() => navigate(bookTo('home'))}>←</button>
          <span className="ide-book-title">{book.title}</span>
          <span className="ide-chapter-badge">Ch{chapter}</span>
          {saveStatus === 'saving' && <span className="ide-save-badge">保存中…</span>}
          {saveStatus === 'saved' && !dirty && <span className="ide-save-badge saved">已保存</span>}
          {dirty && <span className="ide-save-badge dirty">未保存</span>}
          {(Boolean(text.trim()) || chapters.some((c) => c.number === chapter && c.hasText)) && (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={busy}
              title="删除本章并用最新引擎重新生成"
              onClick={() => void regenerateCurrent()}
            >
              {busy ? '生成中…' : '重新生成本章'}
            </button>
          )}
        </div>
        <nav className="ide-drawer-tabs">
          {DRAWER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`ide-tab ${activeDrawer === tab.id ? 'active' : ''}`}
              onClick={() => toggleDrawer(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="ide-topbar-right">
          <button type="button" className="btn btn-sm" disabled={!dirty && saveStatus !== 'error'} onClick={() => void saveChapter()}>
            保存
          </button>
          <button type="button" className="btn btn-sm" onClick={() => exportMarkdown(title, text)}>
            导出 MD
          </button>
          <button type="button" className="btn btn-sm" onClick={() => setShowBatch((v) => !v)}>
            批量
          </button>
          <Link to={bookTo('settings')} className="btn btn-ghost">设置</Link>
          <Link to={bookTo('home')} className="btn btn-ghost ide-home-link">Book Home</Link>
        </div>
      </header>

      {activeDrawer && (
        <IdeDrawer
          title={DRAWER_TITLES[activeDrawer]}
          open
          forceOpen={activeDrawer === 'diagnostics' && forceDiagOpen}
          onClose={() => {
            if (activeDrawer === 'diagnostics' && forceDiagOpen) return;
            setActiveDrawer(null);
          }}
          width={activeDrawer === 'hash' || activeDrawer === 'prompt' || activeDrawer === 'diagnostics' || activeDrawer === 'characters' || activeDrawer === 'factions' || activeDrawer === 'world' || activeDrawer === 'locations' ? 'xl' : 'lg'}
        >
          {activeDrawer === 'planner' && <PlannerDrawer book={book} chapter={chapter} />}
          {activeDrawer === 'director' && (
            <DirectorDrawer
              bookId={book.id}
              chapter={targetChapter}
              onGenerate={() => { setActiveDrawer(null); void generateNext(); }}
            />
          )}
          {activeDrawer === 'characters' && <CharactersDrawer book={book} />}
          {activeDrawer === 'factions' && <FactionsDrawer book={book} />}
          {activeDrawer === 'world' && <WorldDrawer book={book} />}
          {activeDrawer === 'locations' && <LocationsDrawer book={book} />}
          {activeDrawer === 'diagnostics' && (
            <DiagnosticsDrawer
              book={book}
              chapter={chapter}
              onAction={onDiagAction}
              onForceOpenChange={setForceDiagOpen}
              onChapterMutated={() => {
                refresh();
                loadChapter(chapter);
                api.listChapters(book.id).then(setChapters).catch(() => {});
              }}
            />
          )}
          {activeDrawer === 'prompt' && (
            <PromptDrawer book={book} chapter={chapter} live={metricsLive.live} />
          )}
          {activeDrawer === 'metrics' && <MetricsDrawer book={book} chapter={chapter} />}
          {activeDrawer === 'memory' && <MemoryDrawer book={book} chapter={chapter} />}
          {activeDrawer === 'hash' && <HashDrawer book={book} chapter={chapter} />}
          {activeDrawer === 'snippets' && <SnippetsDrawer onInsert={insertSnippet} />}
          {activeDrawer === 'assistant' && <AssistantDrawer book={book} chapter={chapter} />}
        </IdeDrawer>
      )}

      <div className="ide-body">
        <aside className="ide-left">
          <div className="panel-title">章节</div>
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
          <button
            type="button"
            className="btn btn-primary ws-gen-btn"
            disabled={busy}
            onClick={() => setActiveDrawer('director')}
          >
            {busy ? '生成中…' : (targetChapter === 1 && !text.trim() ? '生成第一章' : '生成下一章')}
          </button>
          {(Boolean(text.trim()) || chapters.some((c) => c.number === chapter && c.hasText)) && (
            <button
              type="button"
              className="btn ws-gen-btn"
              disabled={busy}
              title="删除本章草稿并用最新引擎重跑"
              onClick={() => void regenerateCurrent()}
            >
              重新生成本章
            </button>
          )}
        </aside>

        <main className="ide-center">
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

          {busy && (
            <StudioLiveMetricsPanel
              analytics={metricsLive.analytics}
              latestBudget={metricsLive.latestBudget}
              live={metricsLive.live}
              compact
            />
          )}

          {mode === 'read' && (
            <div className="reader-body ws-body">{text || '（正文尚未生成 — 使用底部 Runtime 或 Director 开始创作）'}</div>
          )}
          {mode === 'edit' && (
            scenes.length > 1 ? (
              <SceneSegmentEditor text={text} scenes={scenes} onChange={onTextChange} />
            ) : (
              <textarea
                className="ws-editor"
                value={text}
                onChange={(e) => onTextChange(e.target.value)}
                rows={24}
                placeholder="编辑正文…（Ctrl/Cmd+S 保存，3 秒自动保存）"
              />
            )
          )}
          {mode === 'ai' && (
            <div className="ws-ai-preview">
              <div className="reader-body ws-body">{text || '（无正文）'}</div>
              <p className="text-dim ws-ai-hint">使用右侧 AI 助手修改正文（改写后自动保存）</p>
            </div>
          )}

          {showBatch && (
            <BatchGenerationPanel bookId={book.id} fromChapter={targetChapter} />
          )}

          {scenes.length > 0 && (
            <div className="ws-scenes-row">
              {scenes.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`ws-scene-pill ${s.review?.pass ? 'pass' : ''} ${selectedScene === s.index ? 'active' : ''}`}
                  onClick={() => setSelectedScene(s.index ?? 1)}
                >
                  Scene{s.index} {s.title}
                </button>
              ))}
            </div>
          )}

          <div className="panel writer-opt-panel">
            <WriterOptimizerView data={optimizerData} sceneIndex={selectedScene} />
          </div>
        </main>

        <aside className="ide-right">
          <div className="panel-title">AI</div>
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
        </aside>
      </div>

      <footer className="ide-bottom">
        {busy && (
          <RuntimePipelineProgress stages={stages} message={lastMessage || lock.message} />
        )}
        <RuntimeBar
          bookId={book.id}
          chapter={chapter}
          nextChapter={targetChapter}
          onAction={onRuntimeAction}
          runtime={runtime}
        />
      </footer>
    </div>
  );
}
