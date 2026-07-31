import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api/client';
import { PageHeader, SaveButton } from '../components/FormFields';
import { ModuleBackBar, ModuleEmptyPanel } from '../components/ModuleBackBar';
import { WorldBuilder } from '../components/WorldBuilder';
import { VersionHistoryPanel } from '../components/VersionHistoryPanel';
import { WorldSimulationPanel } from '../components/WorldSimulationPanel';
import { ModuleAiCopilot } from '../components/ModuleAiCopilot';
import type { BookContext } from '../layouts/BookLayout';

export function WorldPage() {
  const { book } = useOutletContext<BookContext>();
  const [markdown, setMarkdown] = useState('');
  const [pitch, setPitch] = useState('');
  const [preset, setPreset] = useState('暗夜君王');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    api.getModule(book.id, 'world').then((m) => {
      if (m.content?.trim()) setMarkdown(m.content);
      setLoaded(true);
    }).catch(() => setLoaded(true));
    api.getModule(book.id, 'chapter-task').then((m) => {
      const g = m.content?.match(/\*\*目标\*\*[：:]\s*(.*)/)?.[1];
      if (g) setPitch(g);
    }).catch(() => {});
    api.getModule(book.id, 'writing').then((m) => {
      const p = m.content?.match(/文风预设[：:]\s*(.+)/)?.[1]?.trim();
      if (p) setPreset(p);
    }).catch(() => {});
  }, [book.id, reloadKey]);

  const save = async () => {
    setSaving(true);
    await api.putModule(book.id, 'world', markdown);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const reload = () => setReloadKey((k) => k + 1);

  return (
    <div className="page creator-page">
      <div className="creator-main">
        <ModuleBackBar />
        <PageHeader title="世界" subtitle="World Builder · Creator Loop" actions={<SaveButton onClick={save} saving={saving} saved={saved} />} />
        {loaded && !markdown.trim() && (
          <ModuleEmptyPanel title="世界设定为空" hint="使用 World Builder 分模块生成与迭代" />
        )}
        <WorldBuilder
          bookId={book.id}
          markdown={markdown}
          pitch={pitch || book.title}
          preset={preset}
          onChange={setMarkdown}
        />
        <WorldSimulationPanel bookId={book.id} />
      </div>
      <aside className="creator-side">
        <VersionHistoryPanel bookId={book.id} moduleKey="world" onRestore={reload} />
        <ModuleAiCopilot
          bookId={book.id}
          module="world"
          current={markdown}
          pitch={pitch}
          preset={preset}
          onUpdate={setMarkdown}
        />
      </aside>
    </div>
  );
}
