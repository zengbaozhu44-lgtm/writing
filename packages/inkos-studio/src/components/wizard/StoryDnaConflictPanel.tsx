/**
 * StoryDnaConflictPanel — Story DNA + 冲突校准轻量编辑
 * 挂在首页与大纲页；也可直接改 novel/_system/conflict-calibration.yaml
 */
import { useEffect, useState } from 'react';
import { api, StoryDna } from '../../api/client';

export interface ConflictCalibration {
  core_conflict?: string;
  stakes?: string;
  escalation_phases?: { chapter?: number; tone?: string; event?: string; ending?: string }[];
  updatedAt?: string;
}

interface Props {
  bookId: string;
  onSaved?: () => void;
}

const DNA_EDIT_KEYS: { key: keyof StoryDna; label: string }[] = [
  { key: 'main_conflict', label: '主线冲突' },
  { key: 'core_hook', label: '核心卖点 / 开篇钩子' },
  { key: 'main_question', label: '长线悬念' },
  { key: 'theme', label: '主题' },
  { key: 'power_fantasy', label: '爽点' },
];

export function StoryDnaConflictPanel({ bookId, onSaved }: Props) {
  const [dna, setDna] = useState<StoryDna | null>(null);
  const [cal, setCal] = useState<ConflictCalibration>({});
  const [phasesText, setPhasesText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.getStoryDna(bookId).catch(() => null),
      api.getConflictCalibration(bookId).catch(() => null),
    ]).then(([d, c]) => {
      if (cancelled) return;
      setDna(d || {});
      const calib = c || {};
      setCal(calib);
      setPhasesText(
        (calib.escalation_phases || [])
          .map((p) => `Ch${p.chapter || '?'}｜${p.tone || ''}｜${p.event || ''}｜${p.ending || ''}`)
          .join('\n'),
      );
    });
    return () => { cancelled = true; };
  }, [bookId]);

  const save = async () => {
    setBusy(true);
    setError('');
    setMsg('');
    try {
      const phases = phasesText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((line, i) => {
          const parts = line.split('｜').map((s) => s.trim());
          const chMatch = parts[0]?.match(/(\d+)/);
          return {
            chapter: chMatch ? Number(chMatch[1]) : i + 1,
            tone: parts[1] || '',
            event: parts[2] || parts[0] || '',
            ending: parts[3] || '',
          };
        });
      await Promise.all([
        api.saveStoryDna(bookId, {
          ...(dna || {}),
          main_conflict: dna?.main_conflict || cal.core_conflict || '',
        }),
        api.saveConflictCalibration(bookId, {
          core_conflict: cal.core_conflict || dna?.main_conflict || '',
          stakes: cal.stakes || '',
          escalation_phases: phases,
        }),
      ]);
      setMsg('已保存 · 若卷纲已生成，大纲页将提示上游变更');
      onSaved?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel story-dna-conflict-panel" style={{ marginTop: 16 }}>
      <div className="panel-title">冲突校准 · Story DNA</div>
      <p className="text-dim" style={{ marginBottom: 10 }}>
        轻量编辑。也可直接改 <code>novel/_system/conflict-calibration.yaml</code>
      </p>
      <div className="form-grid">
        {DNA_EDIT_KEYS.map(({ key, label }) => (
          <label key={key} className="form-field">
            <span className="form-label">{label}</span>
            <textarea
              rows={key === 'theme' || key === 'power_fantasy' ? 2 : 3}
              value={String(dna?.[key] || '')}
              onChange={(e) => setDna((d) => ({ ...(d || {}), [key]: e.target.value }))}
            />
          </label>
        ))}
        <label className="form-field">
          <span className="form-label">核心冲突（calibration.core_conflict）</span>
          <textarea
            rows={2}
            value={cal.core_conflict || ''}
            placeholder="可与主线冲突对齐，或写更具体的卷级冲突"
            onChange={(e) => setCal((c) => ({ ...c, core_conflict: e.target.value }))}
          />
        </label>
        <label className="form-field">
          <span className="form-label">赌注 stakes</span>
          <textarea
            rows={2}
            value={cal.stakes || ''}
            placeholder="失败会失去什么 / 读者为什么紧张"
            onChange={(e) => setCal((c) => ({ ...c, stakes: e.target.value }))}
          />
        </label>
        <label className="form-field">
          <span className="form-label">升级阶段（每行：ChN｜基调｜事件｜结尾）</span>
          <textarea
            rows={4}
            value={phasesText}
            placeholder={'Ch1｜压抑｜清道夫发现异常｜钩子\nCh2｜试探｜…'}
            onChange={(e) => setPhasesText(e.target.value)}
          />
        </label>
      </div>
      {error && <p className="error-text">{error}</p>}
      {msg && <p className="text-dim">{msg}</p>}
      <div className="wizard-actions" style={{ marginTop: 8 }}>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void save()}>
          {busy ? '保存中…' : '保存冲突校准'}
        </button>
      </div>
    </div>
  );
}
