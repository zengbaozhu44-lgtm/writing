/**
 * 按 Scene 分段编辑 — 避免超长单 textarea 卡顿
 */
import { Scene } from '../api/client';

interface Props {
  text: string;
  scenes: Scene[];
  onChange: (next: string) => void;
}

function splitByScenes(text: string, scenes: Scene[]): string[] {
  if (!scenes.length) return [text];
  // 若 scenes 自带 text，优先用；否则按等分切
  const withText = scenes.every((s) => String(s.text || '').trim());
  if (withText) return scenes.map((s) => String(s.text || ''));

  const parts = text.split(/\n{2,}/);
  if (parts.length >= scenes.length) {
    const out: string[] = [];
    const chunk = Math.ceil(parts.length / scenes.length);
    for (let i = 0; i < scenes.length; i += 1) {
      out.push(parts.slice(i * chunk, (i + 1) * chunk).join('\n\n'));
    }
    return out;
  }
  // 等分字符
  const n = scenes.length;
  const size = Math.ceil(text.length / n) || 1;
  return scenes.map((_, i) => text.slice(i * size, (i + 1) * size));
}

export function SceneSegmentEditor({ text, scenes, onChange }: Props) {
  const segments = splitByScenes(text, scenes.length ? scenes : [{ index: 1, id: 's1', title: '全文', goal: '', conflict: '', status: '' }]);

  const updateSeg = (idx: number, value: string) => {
    const next = [...segments];
    next[idx] = value;
    onChange(next.join('\n\n'));
  };

  return (
    <div className="scene-segment-editor">
      {segments.map((seg, i) => (
        <div key={scenes[i]?.id || i} className="scene-segment-block">
          <div className="scene-segment-label">
            Scene {scenes[i]?.index ?? i + 1}
            {scenes[i]?.title ? ` · ${scenes[i].title}` : ''}
            <span className="text-dim"> {seg.replace(/\s/g, '').length} 字</span>
          </div>
          <textarea
            className="ws-editor scene-segment-ta"
            value={seg}
            rows={Math.min(18, Math.max(6, Math.ceil(seg.length / 80)))}
            onChange={(e) => updateSeg(i, e.target.value)}
            placeholder={`编辑 Scene ${scenes[i]?.index ?? i + 1}…`}
          />
        </div>
      ))}
    </div>
  );
}
