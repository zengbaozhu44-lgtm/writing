import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api/client';
import { Field, PageHeader, SaveButton } from '../components/FormFields';
import { AiAssistBar } from '../components/AiAssistBar';
import { ModuleBackBar, ModuleEmptyPanel } from '../components/ModuleBackBar';
import { parseChapterTaskMd, serializeChapterTaskMd, ChapterTaskForm } from '../lib/parsers';
import { VolumeOutlineEditor } from '../components/wizard/VolumeOutlineEditor';
import { StoryDnaConflictPanel } from '../components/wizard/StoryDnaConflictPanel';
import type { BookContext } from '../layouts/BookLayout';

function formatVolumeContent(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    try {
      const data = JSON.parse(trimmed) as Record<string, unknown>;
      const lines: string[] = [];
      if (data['卷标题'] || data.title) lines.push(`# ${data['卷标题'] || data.title}`);
      if (Array.isArray(data['卷目标'])) {
        lines.push('', '## 卷目标', ...data['卷目标'].map((g: string, i: number) => `${i + 1}. ${g}`));
      }
      if (Array.isArray(data['验收项'])) {
        lines.push('', '## 验收项', ...data['验收项'].map((g: string) => `- ${g}`));
      }
      return lines.join('\n') || trimmed;
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

export function ChapterTaskPage() {
  const { book, chapter } = useOutletContext<BookContext>();
  const [form, setForm] = useState<ChapterTaskForm>(parseChapterTaskMd(''));
  const [volumeText, setVolumeText] = useState('');
  const [volumeDirty, setVolumeDirty] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [changedParts, setChangedParts] = useState<string[]>([]);
  const [partLabels, setPartLabels] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [volumeSaving, setVolumeSaving] = useState(false);
  const [volumeBusy, setVolumeBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  const loadVolumePlan = async () => {
    try {
      const plan = await api.getVolumePlan(book.id, 1);
      setVolumeText(formatVolumeContent(plan.markdown || ''));
      setIsStale(Boolean(plan.isStale));
      setChangedParts(plan.changedParts || []);
      setPartLabels(plan.partLabels || {});
      setVolumeDirty(false);
    } catch {
      // 兼容旧书：无 volume-plan API 元数据时回退模块读
      try {
        const volMod = await api.getModule(book.id, 'volume');
        if (volMod?.files?.length) {
          const vol = await api.getModuleFile(book.id, 'volume', volMod.files[0].name);
          setVolumeText(formatVolumeContent(vol.content || ''));
        }
      } catch { /* empty */ }
    }
  };

  useEffect(() => {
    Promise.all([
      api.getModule(book.id, 'chapter-task'),
      loadVolumePlan(),
    ]).then(async ([taskMod]) => {
      if (taskMod.content?.trim()) setForm(parseChapterTaskMd(taskMod.content));
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [book.id]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await api.putModule(book.id, 'chapter-task', serializeChapterTaskMd(form));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const saveVolume = async () => {
    if (!volumeText.trim()) return;
    setVolumeSaving(true);
    setError('');
    try {
      const plan = await api.saveVolumePlan(book.id, {
        markdown: volumeText,
        vol: 1,
        refreshFingerprint: false,
        editedBy: 'user',
      });
      setIsStale(Boolean(plan.isStale));
      setChangedParts(plan.changedParts || []);
      setVolumeDirty(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setVolumeSaving(false);
    }
  };

  const regenerateVolume = async () => {
    setVolumeBusy(true);
    setError('');
    try {
      const [worldMod, charMod, facMod, dna] = await Promise.all([
        api.getModule(book.id, 'world').catch(() => null),
        api.getModule(book.id, 'characters').catch(() => null),
        api.getModule(book.id, 'factions').catch(() => null),
        api.getStoryDna(book.id).catch(() => null),
      ]);
      let charactersBrief = '';
      if (charMod?.files?.length) {
        const files = await Promise.all(
          charMod.files.slice(0, 8).map((f) => api.getModuleFile(book.id, 'characters', f.name).catch(() => null)),
        );
        charactersBrief = files
          .filter(Boolean)
          .map((f) => String(f?.content || '').slice(0, 400))
          .join('\n---\n');
      }
      let factionsBrief = '';
      if (facMod?.files?.length) {
        const files = await Promise.all(
          facMod.files.slice(0, 8).map((f) => api.getModuleFile(book.id, 'factions', f.name).catch(() => null)),
        );
        factionsBrief = files
          .filter(Boolean)
          .map((f) => String(f?.content || '').slice(0, 300))
          .join('\n---\n');
      }
      const conflictBrief = [
        dna?.main_conflict ? `主线冲突：${dna.main_conflict}` : '',
        dna?.core_hook ? `核心卖点：${dna.core_hook}` : '',
        dna?.main_question ? `长线悬念：${dna.main_question}` : '',
        dna?.theme ? `主题：${dna.theme}` : '',
      ].filter(Boolean).join('\n');
      const upstreamBrief = [
        `书名：${book.title}`,
        conflictBrief ? `冲突校准：\n${conflictBrief}` : '',
        worldMod?.content ? `世界构建：\n${String(worldMod.content).slice(0, 2500)}` : '',
        charactersBrief ? `主要角色：\n${charactersBrief}` : '',
        factionsBrief ? `势力组织：\n${factionsBrief}` : '',
      ].filter(Boolean).join('\n\n');

      const preset = String(
        (book as { preset?: string; genre?: string }).preset
        || (book as { genre?: string }).genre
        || dna?.genre
        || '暗夜君王',
      );
      const res = await api.aiGenerateVolume({
        pitch: form.goal || dna?.pitch || book.title || '',
        preset,
        title: book.title,
        storyDna: dna || undefined,
        context: { upstreamBrief },
      });
      const md = String((res.result as { markdown?: string })?.markdown || '').trim();
      if (!md) throw new Error('生成结果为空');
      const plan = await api.saveVolumePlan(book.id, {
        markdown: md,
        vol: 1,
        refreshFingerprint: true,
        editedBy: 'ai',
      });
      setVolumeText(plan.markdown || md);
      setIsStale(Boolean(plan.isStale));
      setChangedParts(plan.changedParts || []);
      setVolumeDirty(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setVolumeBusy(false);
    }
  };

  const keepCurrentVolume = async () => {
    // 保留正文，刷新 fingerprint 对齐当前上游（确认忽略过期）
    setVolumeBusy(true);
    try {
      const plan = await api.saveVolumePlan(book.id, {
        markdown: volumeText,
        vol: 1,
        refreshFingerprint: true,
        editedBy: 'user-keep',
      });
      setIsStale(Boolean(plan.isStale));
      setChangedParts([]);
      setVolumeDirty(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setVolumeBusy(false);
    }
  };

  const replan = async () => {
    await save();
    if (volumeDirty) await saveVolume();
    await api.runtimeReplan(book.id, chapter);
  };

  const set = (k: keyof ChapterTaskForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="page">
      <ModuleBackBar />
      <PageHeader title="大纲" subtitle="卷规划 · 章节任务" actions={
        <>
          <SaveButton onClick={async () => { await save(); if (volumeDirty) await saveVolume(); }} saving={saving || volumeSaving} />
          <button type="button" className="btn btn-primary" onClick={replan}>生成 Planner</button>
        </>
      } />
      {error && <p className="error-text">{error}</p>}
      {(loaded || volumeText) && (
        <VolumeOutlineEditor
          markdown={volumeText}
          onChange={(md) => { setVolumeText(md); setVolumeDirty(true); }}
          isStale={isStale}
          changedParts={changedParts}
          partLabels={partLabels}
          onRegenerate={() => void regenerateVolume()}
          onKeepCurrent={() => void keepCurrentVolume()}
          onSave={() => void saveVolume()}
          saving={volumeSaving}
          busy={volumeBusy}
          showSave
        />
      )}
      <StoryDnaConflictPanel
        bookId={book.id}
        onSaved={() => { void loadVolumePlan(); }}
      />
      {loaded && !volumeText && !form.goal && (
        <ModuleEmptyPanel title="大纲为空" hint="完成建书 Wizard 或在此使用 AI 生成章节任务" />
      )}
      <div className="panel" style={{ marginTop: 16 }}>
        <div className="panel-title">当前章节任务</div>
        <AiAssistBar bookId={book.id} module="chapter-task" pitch={form.goal}
          current={serializeChapterTaskMd(form)}
          onResult={(md) => setForm(parseChapterTaskMd(md))}
          actions={['generate', 'optimize', 'rewrite']} />
        <div className="form-grid">
          <Field label="POV" value={form.pov} onChange={(v) => set('pov', v)} />
          <Field label="章节目标" value={form.goal} onChange={(v) => set('goal', v)} multiline />
          <Field label="第一阻碍" value={form.obstacle1} onChange={(v) => set('obstacle1', v)} />
          <Field label="第二阻碍" value={form.obstacle2} onChange={(v) => set('obstacle2', v)} />
          <Field label="博弈" value={form.bargain} onChange={(v) => set('bargain', v)} multiline />
          <Field label="高潮" value={form.climax} onChange={(v) => set('climax', v)} />
          <Field label="代价" value={form.cost} onChange={(v) => set('cost', v)} />
          <Field label="新增伏笔" value={form.foreshadow} onChange={(v) => set('foreshadow', v)} />
          <Field label="结尾" value={form.ending} onChange={(v) => set('ending', v)} />
        </div>
      </div>
    </div>
  );
}
