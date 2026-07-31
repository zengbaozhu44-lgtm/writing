/**
 * Step7ChapterTones — 前三章基调（替代 Beat Plan）
 */
import { ChapterToneCard } from './ChapterToneCard';
import { ChapterTone, defaultChapterTones, tonesAreComplete } from './chapterTones';

interface Props {
  tones: ChapterTone[];
  genre?: string;
  volumeChapterCount?: number;
  onChangeTones: (tones: ChapterTone[]) => void;
  onChangeVolumeCount?: (n: number) => void;
}

export function Step7ChapterTones({
  tones,
  genre = '',
  volumeChapterCount = 30,
  onChangeTones,
  onChangeVolumeCount,
}: Props) {
  const list = tones?.length ? tones : defaultChapterTones();

  const updateOne = (next: ChapterTone) => {
    const mapped = list.map((t) => (t.chapterIndex === next.chapterIndex ? next : t));
    onChangeTones(mapped);
  };

  return (
    <div className="step7-chapter-tones">
      <h2 className="wizard-q">前三章基调</h2>
      <p className="text-dim">
        只定基调 / 核心事件 / 结尾方向。不预填 Beat Plan——Beat 由 Director 在生成时动态规划。
      </p>

      <label className="form-field" style={{ maxWidth: 240 }}>
        <span className="form-label">第一卷预估章数（可选）</span>
        <input
          type="number"
          min={3}
          max={200}
          value={volumeChapterCount}
          onChange={(e) => onChangeVolumeCount?.(Math.max(3, Number(e.target.value) || 30))}
        />
      </label>

      <div className="chapter-tone-list">
        {list.map((t) => (
          <ChapterToneCard
            key={t.chapterIndex}
            tone={t}
            genre={genre}
            onChange={updateOne}
            defaultOpen={t.chapterIndex === 1}
          />
        ))}
      </div>

      {!tonesAreComplete(list) && (
        <p className="wizard-warn">请为三章都填写基调、核心事件与结尾方向</p>
      )}
    </div>
  );
}
