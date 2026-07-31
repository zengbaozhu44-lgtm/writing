/**
 * 右下角浮动进度 — Director 关闭后仍可见，可取消
 */
import { useBookTaskStore } from '../stores/bookTaskStore';

interface Props {
  onNavigateIde?: () => void;
}

export function FloatingProgress({ onNavigateIde }: Props) {
  const status = useBookTaskStore((s) => s.status);
  const message = useBookTaskStore((s) => s.message);
  const chapter = useBookTaskStore((s) => s.chapter);
  const busy = status === 'pending' || status === 'running';

  if (!busy && status !== 'failed' && status !== 'cancelled') return null;

  return (
    <div className={`floating-progress ${busy ? 'busy' : status}`}>
      <div className="floating-progress-body">
        <strong>{busy ? '章节生成中' : status === 'failed' ? '生成失败' : '已取消'}</strong>
        <span className="floating-progress-msg">
          {chapter ? `Ch${chapter} · ` : ''}{message || (busy ? '请稍候…' : '')}
        </span>
      </div>
      <div className="floating-progress-actions">
        {onNavigateIde && (
          <button type="button" className="btn btn-sm" onClick={onNavigateIde}>查看</button>
        )}
        {busy && (
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => useBookTaskStore.getState().cancel('用户取消')}
          >
            取消
          </button>
        )}
        {!busy && (
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => useBookTaskStore.getState().reset()}
          >
            关闭
          </button>
        )}
      </div>
    </div>
  );
}
