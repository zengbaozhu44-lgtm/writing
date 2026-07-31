import { useEffect, useState } from 'react';
import { api, Book, ChapterDiagnosis } from '../../api/client';
import { HealthCard } from '../diagnostics/HealthCard';
import { BeatTimeline } from '../diagnostics/BeatTimeline';
import { MetricGrid } from '../diagnostics/MetricGrid';
import { SuggestionList } from '../diagnostics/SuggestionList';
import { ChapterActions } from '../diagnostics/ChapterActions';

interface Props {
  book: Book;
  chapter: number;
  onAction?: (action: string) => void;
  /** 低分时通知父级：强制展开且不可关闭 */
  onForceOpenChange?: (force: boolean) => void;
  onChapterMutated?: () => void;
}

function isLowScore(score: number | null | undefined) {
  if (score == null || !Number.isFinite(Number(score))) return false;
  const n = Number(score);
  // 兼容 0–10 与 0–100
  return n <= 10 ? n < 7 : n < 70;
}

export function DiagnosticsDrawer({
  book,
  chapter,
  onAction,
  onForceOpenChange,
  onChapterMutated,
}: Props) {
  const [diagnosis, setDiagnosis] = useState<ChapterDiagnosis | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const reload = () => {
    setLoading(true);
    setErr('');
    api.getChapterDiagnosis(book.id, chapter)
      .then(setDiagnosis)
      .catch((e) => setErr((e as Error).message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, [book.id, chapter]);

  useEffect(() => {
    const force = isLowScore(diagnosis?.overallScore)
      || diagnosis?.auditStatus === 'pending_audit';
    onForceOpenChange?.(force);
  }, [diagnosis?.overallScore, diagnosis?.auditStatus, onForceOpenChange]);

  const toneDev = diagnosis?.toneDeviation;

  return (
    <div className="drawer-content diagnostics-drawer">
      <div className="drawer-toolbar">
        <span className="text-dim">Ch{chapter} 诊断</span>
        {diagnosis?.auditStatus && (
          <span className={`audit-chip audit-${diagnosis.auditStatus}`}>
            {diagnosis.auditStatus === 'pending_audit' ? '待审计'
              : diagnosis.auditStatus === 'accepted' ? '已接受'
                : diagnosis.auditStatus}
          </span>
        )}
        <button type="button" className="btn btn-sm" disabled={loading} onClick={reload}>
          {loading ? '刷新中…' : '刷新'}
        </button>
      </div>
      {err && <p className="ai-msg">{err}</p>}
      {isLowScore(diagnosis?.overallScore) && (
        <p className="wizard-warn">综合分偏低，请先审计后再关闭诊断面板</p>
      )}
      <HealthCard diagnosis={diagnosis} />
      {toneDev && (toneDev.deviation || toneDev.reason) && (
        <div className={`tone-deviation ${toneDev.deviation ? 'bad' : 'soft'}`}>
          <div className="panel-title">基调偏离</div>
          <p>{toneDev.reason || (toneDev.deviation ? '检测到偏离设定基调' : '无明显偏离')}</p>
          {diagnosis?.chapterTone?.tone && (
            <p className="text-dim">设定基调：{diagnosis.chapterTone.tone}</p>
          )}
        </div>
      )}
      {diagnosis?.styleFit?.enabled && (
        <div className={`style-fit ${Number(diagnosis.styleFit.score) < 55 ? 'bad' : 'ok'}`}>
          <div className="panel-title">
            风格符合度
            {diagnosis.styleFit.label ? ` · ${diagnosis.styleFit.label}` : ''}
            {diagnosis.styleFit.score != null ? ` · ${diagnosis.styleFit.score}` : ''}
          </div>
          {(diagnosis.styleFit.hits || []).length > 0 && (
            <p className="style-fit-hits">命中：{(diagnosis.styleFit.hits || []).join('、')}</p>
          )}
          {(diagnosis.styleFit.bannedHits || []).length > 0 && (
            <p className="style-fit-banned">
              禁词标红：{(diagnosis.styleFit.bannedHits || []).map((b) => (
                <span key={b} className="banned-chip">{b}</span>
              ))}
            </p>
          )}
          {(diagnosis.styleFit.reasons || []).map((r) => (
            <p key={r} className="text-dim">{r}</p>
          ))}
        </div>
      )}
      {diagnosis?.storyMap?.enabled && (
        <div className={`story-map-diag ${(diagnosis.storyMap.errors || []).length ? 'bad' : 'ok'}`}>
          <div className="panel-title">
            故事地图
            {diagnosis.storyMap.arcPhase ? ` · ${diagnosis.storyMap.arcPhase}` : ''}
            {diagnosis.storyMap.chapterFunction ? ` · ${diagnosis.storyMap.chapterFunction}` : ''}
            {diagnosis.storyMap.distanceToMilestone != null && diagnosis.storyMap.distanceToMilestone < 999
              ? ` · Δ里程碑 ${diagnosis.storyMap.distanceToMilestone}`
              : ''}
          </div>
          {(diagnosis.storyMap.hits || []).map((h) => (
            <p key={h} className="text-dim">✓ {h}</p>
          ))}
          {(diagnosis.storyMap.warnings || []).map((w) => (
            <p key={w} className="wizard-warn">{w}</p>
          ))}
          {(diagnosis.storyMap.errors || []).map((e) => (
            <p key={e} className="style-fit-banned">{e}</p>
          ))}
        </div>
      )}
      <MetricGrid diagnosis={diagnosis} />
      <BeatTimeline beats={diagnosis?.beats || []} />
      <SuggestionList
        suggestions={diagnosis?.suggestions || []}
        onAction={(action) => onAction?.(action)}
      />
      <ChapterActions
        bookId={book.id}
        chapterIdx={chapter}
        auditStatus={diagnosis?.auditStatus}
        onDone={(kind) => {
          reload();
          onChapterMutated?.();
          if (kind === 'accept') onAction?.('accepted');
          if (kind === 'delete') onAction?.('deleted');
          if (kind === 'regenerate') onAction?.('regenerate');
          if (kind === 'optimize') onAction?.('optimized');
        }}
      />
      {diagnosis?.trace?.traceId && (
        <p className="text-dim diag-trace-id">trace: {diagnosis.trace.traceId}</p>
      )}
    </div>
  );
}
