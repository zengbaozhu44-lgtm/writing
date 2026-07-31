import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api, WritingDimensions } from '../api/client';
import { PageHeader, SaveButton } from '../components/FormFields';
import { ModuleBackBar, ModuleEmptyPanel } from '../components/ModuleBackBar';
import { WritingStyleBuilder } from '../components/WritingStyleBuilder';
import { VersionHistoryPanel } from '../components/VersionHistoryPanel';
import { StyleDnaPanel } from '../components/StyleDnaPanel';
import { ModuleAiCopilot } from '../components/ModuleAiCopilot';
import type { BookContext } from '../layouts/BookLayout';

export function WritingPage() {
  const { book } = useOutletContext<BookContext>();
  const [markdown, setMarkdown] = useState('');
  const [preset, setPreset] = useState('暗夜君王');
  const [dimensions, setDimensions] = useState<WritingDimensions>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    api.getModule(book.id, 'writing').then(async (m) => {
      if (m.content?.trim()) {
        setMarkdown(m.content);
        const match = m.content.match(/文风预设[：:]\s*(.+)/);
        const p = match?.[1]?.trim() || '暗夜君王';
        setPreset(p);
        const res = await api.getWritingDimensions(p).catch(() => null);
        if (res) setDimensions(res.dimensions);
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [book.id, reloadKey]);

  const save = async () => {
    setSaving(true);
    await api.putModule(book.id, 'writing', markdown);
    setSaving(false);
  };

  const reload = () => setReloadKey((k) => k + 1);

  return (
    <div className="page creator-page">
      <div className="creator-main">
        <ModuleBackBar />
        <PageHeader title="写作规则" subtitle="Writing Style Builder · Creator Loop" actions={<SaveButton onClick={save} saving={saving} />} />
        {loaded && !markdown.trim() && (
          <ModuleEmptyPanel title="写作规则为空" hint="使用下方文风构建器生成，或从创作向导导入" />
        )}
        <WritingStyleBuilder
          preset={preset}
          dimensions={dimensions}
          markdown={markdown}
          title={book.title}
          onPresetChange={setPreset}
          onDimensionsChange={setDimensions}
          onMarkdownChange={setMarkdown}
        />
      </div>
      <aside className="creator-side">
        <VersionHistoryPanel bookId={book.id} moduleKey="writing" onRestore={reload} />
        <StyleDnaPanel bookId={book.id} preset={preset} />
        <ModuleAiCopilot
          bookId={book.id}
          module="writing"
          current={markdown}
          preset={preset}
          onUpdate={setMarkdown}
        />
      </aside>
    </div>
  );
}
