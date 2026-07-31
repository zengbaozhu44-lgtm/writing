/**
 * ChapterToneCard — 单章基调卡片（可折叠 + debounce 独立保存）
 */
import { useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import { ChapterTone, tonePresetsForGenre } from './chapterTones';

interface Props {
  tone: ChapterTone;
  genre?: string;
  bookId?: string;
  onChange: (next: ChapterTone) => void;
  defaultOpen?: boolean;
}

function sameTone(a: ChapterTone, b: ChapterTone) {
  return (
    a.chapterIndex === b.chapterIndex
    && a.tone === b.tone
    && a.coreEvent === b.coreEvent
    && a.endingDirection === b.endingDirection
    && Number(a.wordTarget) === Number(b.wordTarget)
  );
}

export function ChapterToneCard({ tone, genre = '', bookId, onChange, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen || tone.chapterIndex === 1);
  const [local, setLocal] = useState<ChapterTone>(tone);
  const [saveHint, setSaveHint] = useState('');
  const dirtyRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const presets = tonePresetsForGenre(genre);

  // 仅外部切换章节 / 父级主动重置时同步；编辑中不覆盖 local
  useEffect(() => {
    if (dirtyRef.current) return;
    if (!sameTone(local, tone)) setLocal(tone);
  }, [tone.chapterIndex, tone.tone, tone.coreEvent, tone.endingDirection, tone.wordTarget]);

  // 独立 debounce 保存（不依赖向导全局提交）
  useEffect(() => {
    if (!dirtyRef.current && sameTone(local, tone)) return undefined;
    const timer = setTimeout(() => {
      onChangeRef.current(local);
      dirtyRef.current = false;
      if (bookId) {
        api.getWizardChapterTones(bookId)
          .then((tones) => {
            const next = (tones.length ? tones : [local]).map((t) =>
              Number(t.chapterIndex) === local.chapterIndex ? local : t,
            );
            if (!next.some((t) => Number(t.chapterIndex) === local.chapterIndex)) {
              next.push(local);
            }
            return api.saveWizardChapterTones(
              bookId,
              next.sort((a, b) => a.chapterIndex - b.chapterIndex),
            );
          })
          .then(() => setSaveHint('已保存'))
          .catch((e) => setSaveHint((e as Error).message || '保存失败'));
      } else {
        setSaveHint('已同步到向导');
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [local, bookId]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (partial: Partial<ChapterTone>) => {
    dirtyRef.current = true;
    setLocal((prev) => ({ ...prev, ...partial }));
    setSaveHint('编辑中…');
  };

  return (
    <div className={`chapter-tone-card ${open ? 'open' : ''}`}>
      <button type="button" className="chapter-tone-head" onClick={() => setOpen((v) => !v)}>
        <span className="chapter-tone-title">第 {tone.chapterIndex} 章基调</span>
        <span className="text-dim">{local.tone || '未设基调'} · {local.wordTarget}字</span>
        <span className="chapter-tone-chevron">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="chapter-tone-body form-grid">
          <label className="form-field">
            <span className="form-label">基调 *</span>
            <select
              value={presets.includes(local.tone) ? local.tone : '__custom__'}
              onChange={(e) => {
                if (e.target.value === '__custom__') return;
                patch({ tone: e.target.value });
              }}
            >
              {presets.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
              <option value="__custom__">自定义…</option>
            </select>
            <input
              value={local.tone}
              placeholder="手动输入基调"
              onChange={(e) => patch({ tone: e.target.value })}
            />
          </label>
          <label className="form-field">
            <span className="form-label">核心事件 *</span>
            <textarea
              rows={3}
              value={local.coreEvent}
              placeholder="本章必须发生的核心事件"
              onChange={(e) => patch({ coreEvent: e.target.value })}
            />
          </label>
          <label className="form-field">
            <span className="form-label">结尾方向 *</span>
            <textarea
              rows={2}
              value={local.endingDirection}
              placeholder="章末读者情绪/钩子方向（不写死 Beat）"
              onChange={(e) => patch({ endingDirection: e.target.value })}
            />
          </label>
          <label className="form-field">
            <span className="form-label">目标字数</span>
            <input
              type="number"
              min={800}
              max={8000}
              step={100}
              value={local.wordTarget}
              onChange={(e) => patch({ wordTarget: Math.max(800, Number(e.target.value) || 2500) })}
            />
          </label>
          <p className="text-dim">
            自动保存（1s debounce）· Beat Plan 由 Director 动态规划
            {saveHint ? ` · ${saveHint}` : ''}
          </p>
        </div>
      )}
    </div>
  );
}
