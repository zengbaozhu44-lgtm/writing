import { useEffect, useState } from 'react';
import { api, WritingDimensions } from '../api/client';

const PRESET_LIST = ['暗夜君王', '诡秘之主', '宿命之环', '剑来', '第一序列', '我的治愈系游戏', '凡人修仙', '自定义'];

interface Props {
  preset: string;
  dimensions: WritingDimensions;
  markdown?: string;
  onPresetChange: (preset: string) => void;
  onDimensionsChange: (d: WritingDimensions) => void;
  onMarkdownChange: (md: string) => void;
  pitch?: string;
  title?: string;
}

export function WritingStyleBuilder({
  preset, dimensions, onPresetChange, onDimensionsChange, onMarkdownChange, pitch, title,
}: Props) {
  const [labels, setLabels] = useState<{ key: string; label: string }[]>([]);
  const [suggestion, setSuggestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [savedStyles, setSavedStyles] = useState<{ id: string; name: string }[]>([]);
  const [saveName, setSaveName] = useState('');

  const loadPreset = async (p: string) => {
    onPresetChange(p);
    const res = await api.getWritingDimensions(p);
    setLabels(res.labels);
    onDimensionsChange(res.dimensions);
  };

  useEffect(() => { loadPreset(preset).catch(() => {}); }, []);
  useEffect(() => { api.listSavedStyles().then(setSavedStyles).catch(() => {}); }, []);

  const optimize = async () => {
    if (!suggestion.trim()) return;
    setBusy(true);
    setMsg('AI 优化中…');
    try {
      const res = await api.optimizeWritingDimensions({
        dimensions, suggestion, preset, title,
      });
      onDimensionsChange(res.dimensions);
      if (res.markdown) onMarkdownChange(res.markdown);
      setMsg('文风已增量更新');
      setSuggestion('');
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const saveStyle = async () => {
    if (!saveName.trim()) return;
    try {
      const style = await api.saveStyle({ name: saveName, dimensions, sourcePreset: preset });
      setSavedStyles((s) => [...s, style]);
      setMsg(`已保存文风「${style.name}」`);
      setSaveName('');
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  const editDim = (key: string, value: string) => {
    onDimensionsChange({ ...dimensions, [key]: value });
  };

  return (
    <div className="style-builder">
      <div className="style-builder-grid">
        <aside className="sb-presets panel">
          <div className="panel-title">文风库</div>
          {PRESET_LIST.map((p) => (
            <button key={p} type="button"
              className={`sb-preset-item ${preset === p ? 'active' : ''}`}
              onClick={() => loadPreset(p)}>
              {preset === p ? '✓ ' : ''}{p}
            </button>
          ))}
          {savedStyles.length > 0 && (
            <>
              <div className="panel-title" style={{ marginTop: 12 }}>我的文风</div>
              {savedStyles.map((s) => (
                <button key={s.id} type="button" className="sb-preset-item"
                  onClick={async () => {
                    const full = await api.getSavedStyle(s.id);
                    onDimensionsChange(full.dimensions);
                    onPresetChange(full.sourcePreset || '自定义');
                  }}>
                  {s.name}
                </button>
              ))}
            </>
          )}
        </aside>

        <main className="sb-current panel">
          <div className="panel-title">当前文风 · {preset}</div>
          <div className="sb-dims">
            {(labels.length ? labels : Object.keys(dimensions).map((k) => ({ key: k, label: k }))).map(({ key, label }) => (
              <div key={key} className="sb-dim-row">
                <span className="sb-dim-check">✓</span>
                <span className="sb-dim-label">{label}</span>
                <input
                  className="sb-dim-input"
                  value={dimensions[key] || ''}
                  onChange={(e) => editDim(key, e.target.value)}
                  placeholder={`设置${label}…`}
                />
              </div>
            ))}
          </div>
          <div className="sb-save-row">
            <input value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="保存为我的文风…" />
            <button type="button" className="btn" onClick={saveStyle} disabled={!saveName.trim()}>保存文风</button>
          </div>
        </main>

        <aside className="sb-ai panel">
          <div className="panel-title">AI 建议</div>
          <textarea
            value={suggestion}
            onChange={(e) => setSuggestion(e.target.value)}
            rows={6}
            placeholder={'希望：\n人物更黑暗\n减少爽文\n对白更自然\n增加环境描写'}
          />
          <button type="button" className="btn btn-primary" disabled={busy || !suggestion.trim()} onClick={optimize}>
            {busy ? '优化中…' : '优化文风'}
          </button>
          <p className="text-dim sb-hint">增量修改 Writing Bible，不重写无关部分</p>
        </aside>
      </div>
      {msg && <p className="ai-msg">{msg}</p>}
    </div>
  );
}
