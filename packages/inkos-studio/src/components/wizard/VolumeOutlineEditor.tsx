/**
 * VolumeOutlineEditor — 第一卷规划可编辑区（向导 / 大纲页共用）
 */
import { VOLUME_PART_LABELS } from './volumeLabels';

export { VOLUME_PART_LABELS };

interface Props {
  markdown: string;
  onChange: (md: string) => void;
  isStale?: boolean;
  changedParts?: string[];
  partLabels?: Record<string, string>;
  onRegenerate?: () => void;
  onKeepCurrent?: () => void;
  onSave?: () => void;
  saving?: boolean;
  busy?: boolean;
  regenerateLabel?: string;
  showSave?: boolean;
  rows?: number;
}

export function VolumeOutlineEditor({
  markdown,
  onChange,
  isStale = false,
  changedParts = [],
  partLabels = VOLUME_PART_LABELS,
  onRegenerate,
  onKeepCurrent,
  onSave,
  saving = false,
  busy = false,
  regenerateLabel = '基于最新设定重新生成',
  showSave = true,
  rows = 16,
}: Props) {
  const changedLabel = changedParts
    .map((k) => partLabels[k] || k)
    .filter(Boolean)
    .join('、');

  return (
    <div className="volume-outline-editor panel">
      <div className="panel-title">第一卷规划</div>
      {isStale && (
        <div className="wizard-fail-banner" style={{ marginBottom: 12 }}>
          <div>
            <strong>上游设定已变更，规划可能过时</strong>
            {changedLabel ? (
              <p className="text-dim" style={{ margin: '4px 0 0' }}>
                变更模块：{changedLabel}
              </p>
            ) : null}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {onRegenerate && (
              <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={onRegenerate}>
                {regenerateLabel}
              </button>
            )}
            {onKeepCurrent && (
              <button type="button" className="btn btn-sm" disabled={busy} onClick={onKeepCurrent}>
                保留当前规划
              </button>
            )}
          </div>
        </div>
      )}
      <textarea
        className="volume-outline-textarea"
        value={markdown}
        rows={rows}
        placeholder="第一卷节奏、关键场景、卷末悬念…可直接编辑"
        onChange={(e) => onChange(e.target.value)}
        disabled={busy}
      />
      <div className="wizard-actions" style={{ marginTop: 12 }}>
        {showSave && onSave && (
          <button type="button" className="btn btn-primary" disabled={busy || saving || !markdown.trim()} onClick={onSave}>
            {saving ? '保存中…' : '保存卷纲'}
          </button>
        )}
        {onRegenerate && !isStale && (
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => {
              if (markdown.trim() && !window.confirm('重新生成将覆盖当前卷纲（含手动修改）。确定继续？')) return;
              onRegenerate();
            }}
          >
            {regenerateLabel}
          </button>
        )}
      </div>
    </div>
  );
}
