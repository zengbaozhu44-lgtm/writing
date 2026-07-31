import { useEffect, useState } from 'react';
import { api, WorldSection, StoryDna } from '../api/client';

interface Props {
  markdown: string;
  onChange: (md: string) => void;
  bookId?: string;
  pitch?: string;
  preset?: string;
  title?: string;
  storyDna?: StoryDna | null;
  wizard?: boolean;
}

export function WorldBuilder({ markdown, onChange, bookId, pitch, preset, title, storyDna, wizard }: Props) {
  const [sections, setSections] = useState<WorldSection[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [suggestModal, setSuggestModal] = useState<{ key: string; label: string } | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const loadSections = async () => {
    if (bookId) {
      const res = await api.listCanonVersions(bookId, 'world');
      if (res.worldSections) setSections(res.worldSections);
    } else {
      setSections([
        { key: 'era', label: '时代背景' },
        { key: 'powerSystem', label: '力量体系' },
        { key: 'rules', label: '世界规则' },
        { key: 'history', label: '世界历史' },
        { key: 'map', label: '地图地理' },
        { key: 'social', label: '社会结构' },
      ]);
    }
  };

  useEffect(() => { loadSections().catch(() => {}); }, [bookId]);

  const runIncremental = async (sectionKey: string | undefined, sugg: string, action = 'optimize') => {
    setBusy(sectionKey || 'all');
    setMsg('AI 增量处理中…');
    try {
      let resultMd = markdown;
      if (bookId && !wizard) {
        const res = await api.creatorIncremental(bookId, {
          module: 'world', current: markdown, suggestion: sugg, section: sectionKey, pitch, preset, title, storyDna: storyDna || undefined, action,
        });
        resultMd = res.result.markdown || markdown;
      } else {
        const res = await api.aiIncremental({
          module: 'world', current: markdown, suggestion: sugg, section: sectionKey, pitch, preset, title, storyDna: storyDna || undefined, action,
        });
        resultMd = res.result.markdown || markdown;
      }
      onChange(resultMd);
      setMsg(sectionKey ? `${sectionKey} 已更新` : '世界设定已更新');
      setSuggestModal(null);
      setSuggestion('');
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const sectionContent = (key: string) => {
    const headers: Record<string, string> = {
      era: '## 1. 世界背景', powerSystem: '## 2. 超凡体系', rules: '## 3. 能力体系',
      factions: '## 4. 势力体系', social: '## 5. 社会结构', history: '## 8. 历史', map: '## 9. 地理',
    };
    const h = headers[key];
    if (!h) return '';
    const re = new RegExp(`${h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?(?=\\n## |$)`);
    const m = markdown.match(re);
    return m ? m[0].replace(h, '').trim() : '';
  };

  const defaultSections = sections.length ? sections : [
    { key: 'era', label: '时代背景' },
    { key: 'powerSystem', label: '力量体系' },
    { key: 'rules', label: '世界规则' },
    { key: 'history', label: '世界历史' },
    { key: 'map', label: '地图地理' },
    { key: 'social', label: '社会结构' },
  ];

  return (
    <div className="world-builder">
      {!markdown.trim() && (
        <button type="button" className="btn btn-primary" disabled={!!busy}
          onClick={() => runIncremental(
            undefined,
            storyDna?.core_hook
              ? `基于 Story DNA 生成完整世界设定，核心卖点：${storyDna.core_hook}`
              : (pitch || '生成完整世界设定'),
            'generate',
          )}>
          {busy ? '生成中…' : 'AI 生成世界'}
        </button>
      )}
      <div className="wb-modules">
        {defaultSections.map((s) => (
          <div key={s.key} className="wb-module-card panel">
            <div className="wb-module-head">
              <h4>{s.label}</h4>
              <div className="wb-module-actions">
                <button type="button" className="btn btn-sm" disabled={!!busy}
                  onClick={() => { setEditKey(s.key); setEditText(sectionContent(s.key)); }}>
                  编辑
                </button>
                <button type="button" className="btn btn-sm" disabled={!!busy}
                  onClick={() => runIncremental(s.key, `重新生成${s.label}`, 'generate')}>
                  重新生成
                </button>
                <button type="button" className="btn btn-sm btn-ai" disabled={!!busy}
                  onClick={() => setSuggestModal(s)}>
                  添加建议
                </button>
                <button type="button" className="btn btn-sm btn-ai" disabled={!!busy}
                  onClick={() => runIncremental(s.key, `优化${s.label}`, 'optimize')}>
                  AI优化
                </button>
              </div>
            </div>
            <p className="wb-module-body">{sectionContent(s.key) || '（尚未生成）'}</p>
          </div>
        ))}
      </div>

      {suggestModal && (
        <div className="wb-modal-overlay" onClick={() => setSuggestModal(null)}>
          <div className="wb-modal panel" onClick={(e) => e.stopPropagation()}>
            <h3>添加建议 · {suggestModal.label}</h3>
            <textarea value={suggestion} onChange={(e) => setSuggestion(e.target.value)} rows={5}
              placeholder="例如：增加海上城市；加入都市怪谈；减少玄幻元素…" />
            <div className="wizard-actions">
              <button type="button" className="btn" onClick={() => setSuggestModal(null)}>取消</button>
              <button type="button" className="btn btn-primary" disabled={!suggestion.trim() || !!busy}
                onClick={() => runIncremental(suggestModal.key, suggestion)}>
                AI 增量修改
              </button>
            </div>
          </div>
        </div>
      )}

      {editKey && (
        <div className="wb-modal-overlay" onClick={() => setEditKey(null)}>
          <div className="wb-modal panel" onClick={(e) => e.stopPropagation()}>
            <h3>编辑模块</h3>
            <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={8} />
            <div className="wizard-actions">
              <button type="button" className="btn" onClick={() => setEditKey(null)}>取消</button>
              <button type="button" className="btn btn-primary" onClick={() => {
                runIncremental(editKey, `将${editKey}修改为：\n${editText}`);
                setEditKey(null);
              }}>保存并同步</button>
            </div>
          </div>
        </div>
      )}

      {msg && <p className="ai-msg">{msg}</p>}
    </div>
  );
}
