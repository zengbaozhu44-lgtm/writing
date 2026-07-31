import { useState } from 'react';
import { api, StoryDna } from '../api/client';

const DNA_FIELDS: { key: keyof StoryDna; label: string }[] = [
  { key: 'genre', label: '题材' },
  { key: 'core_hook', label: '核心卖点' },
  { key: 'reader', label: '目标读者' },
  { key: 'commercial_direction', label: '商业方向' },
  { key: 'estimated_length', label: '预计长度' },
  { key: 'main_conflict', label: '主线冲突' },
  { key: 'main_question', label: '核心悬念' },
  { key: 'power_fantasy', label: '爽点/力量幻想' },
  { key: 'ending_direction', label: '结局方向' },
  { key: 'theme', label: '主题' },
  { key: 'audience', label: '读者画像' },
];

function localFallbackDna(pitch: string): StoryDna {
  return {
    title: pitch.slice(0, 16) || '未命名',
    genre: pitch.includes('AI') || pitch.includes('科幻') ? '近未来科幻悬疑' : '都市奇幻',
    reader: '男性向悬疑',
    core_hook: pitch.slice(0, 40) || pitch,
    main_question: '真相究竟是什么？',
    main_conflict: '个人意志与系统秩序的对抗',
    power_fantasy: '在规则缝隙中掌控主动权',
    ending_direction: '代价与觉醒并存',
    commercial_direction: pitch.includes('升级') ? '升级流' : '悬疑揭秘流',
    estimated_length: '300万字长篇',
    selling_point: pitch,
    theme: '权力、记忆与身份',
    audience: '喜欢慢热悬疑与心理博弈的读者',
    pitch,
  };
}

function normalizeDna(dna: StoryDna, pitch: string): StoryDna {
  const out: StoryDna = { pitch };
  for (const { key } of DNA_FIELDS) {
    const v = dna[key];
    out[key] = v == null ? '' : String(v);
  }
  if (dna.title) out.title = String(dna.title);
  return out;
}

interface Props {
  pitch: string;
  onPitchChange: (v: string) => void;
  dna: StoryDna | null;
  onDnaChange: (d: StoryDna) => void;
  onAccept: () => void;
  compact?: boolean;
}

export function StoryDirectorPanel({ pitch, onPitchChange, dna, onDnaChange, onAccept, compact }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');

  const analyze = async () => {
    const text = pitch.trim();
    if (!text) return;
    setBusy(true);
    setError('');
    setHint('');
    try {
      const res = await api.storyDirector(text);
      if (!res?.dna) throw new Error('服务器未返回 Story DNA');
      onDnaChange(normalizeDna(res.dna, text));
      if (res.source === 'fallback') setHint('AI 不可用，已使用本地导演方案（可继续编辑）');
      else if (res.source === 'local') setHint('已使用本地导演方案（请确认 Studio Server 已重启）');
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes('Not found') || msg.includes('404')) {
        setError('接口未找到 — 请重启 Studio Server：npm run studio:server');
      } else if (msg.includes('无法连接')) {
        setError('无法连接 Studio Server，请先运行：npm run studio:server');
      } else {
        onDnaChange(localFallbackDna(text));
        setHint(`AI 调用失败（${msg}），已使用本地导演方案`);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="story-director panel">
      <div className="panel-title">Story Director · AI 故事导演</div>
      <h2 className="wizard-q">你想写什么故事？</h2>
      <textarea
        value={pitch}
        onChange={(e) => onPitchChange(e.target.value)}
        rows={compact ? 3 : 4}
        placeholder="2052年，AI统治，每天消失一个人，主角是调查员，文风像暗夜君王…"
      />
      <button type="button" className="btn btn-primary" disabled={!pitch.trim() || busy} onClick={analyze}>
        {busy ? '导演分析中…' : 'AI 导演分析'}
      </button>
      {error && <p className="error-text">{error}</p>}
      {hint && !error && <p className="ai-msg">{hint}</p>}

      {dna && (
        <div className="director-result">
          <div className="panel-title">AI 导演方案 {dna.title ? `· ${dna.title}` : ''}</div>
          <div className="dna-grid">
            {DNA_FIELDS.map(({ key, label }) => (
              <div key={key} className="dna-row">
                <span className="dna-label">{label}</span>
                <input
                  className="dna-input"
                  value={dna[key] ?? ''}
                  onChange={(e) => onDnaChange({ ...dna, [key]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <div className="wizard-actions">
            <button type="button" className="btn btn-primary" onClick={onAccept}>接受方案</button>
            <button type="button" className="btn" onClick={analyze} disabled={busy}>重新设计</button>
          </div>
        </div>
      )}
    </div>
  );
}
