import { useState } from 'react';
import { WriterOptimizerReport } from '../api/client';

type OptimizerView = 'draft' | 'diff' | 'polished';

interface Props {
  data: WriterOptimizerReport | null;
  sceneIndex?: number;
}

const DIM_LABELS: Record<string, string> = {
  pacing: 'Pacing',
  climax: 'Climax',
  hook: 'Hook',
  commercialPleasure: 'Commercial',
  styleConsistency: 'Style',
  characterConsistency: 'Character',
  infoRelease: 'Info Release',
};

const MODULE_LABELS: Record<string, string> = {
  dialogue: 'Dialogue',
  conflict: 'Conflict',
  description: 'Description',
  ending: 'Ending',
};

export function WriterOptimizerView({ data, sceneIndex }: Props) {
  const [view, setView] = useState<OptimizerView>('polished');

  if (!data?.draft && !data?.polished) {
    return (
      <div className="writer-optimizer-view">
        <div className="panel-title">Writer Optimizer</div>
        <p className="text-dim">暂无 Optimizer 数据 — 运行 Pipeline 生成 Scene 后可见 Draft / Diff / Polished</p>
      </div>
    );
  }

  const scores = (data.scores || (data.report?.scores as Record<string, number> | undefined)) ?? null;
  const before = (data.scoresBefore || (data.report?.scoresBefore as Record<string, number> | undefined)) ?? null;
  const total = (data.total ?? data.report?.total) as number | null | undefined;
  const totalBefore = (data.totalBefore ?? data.report?.totalBefore) as number | null | undefined;
  const modules = data.modules || data.polish?.modules || (data.report?.modules as WriterOptimizerReport['modules']);

  return (
    <div className="writer-optimizer-view">
      <div className="writer-opt-header">
        <span className="panel-title">Writer Optimizer{sceneIndex != null ? ` · Scene ${sceneIndex}` : ''}</span>
        {total != null && (
          <span className="writer-opt-score">
            {totalBefore != null && totalBefore !== total ? `${totalBefore} → ` : ''}{total} 分
            {data.polish?.changed && <span className="live-badge">POLISHED</span>}
          </span>
        )}
      </div>

      {modules && (
        <div className="writer-opt-modules">
          {Object.entries(modules).map(([key, m]) => (
            <span key={key} className={`writer-opt-module ${m.changed ? 'changed' : ''}`}>
              {MODULE_LABELS[key] || key}{' '}
              {m.scoreBefore != null && m.scoreAfter != null && m.scoreBefore !== m.scoreAfter
                ? `${m.scoreBefore}→${m.scoreAfter}`
                : m.scoreAfter ?? m.scoreBefore ?? '—'}
              {m.skipped ? ' · skip' : m.changed ? ' · ✓' : ''}
            </span>
          ))}
        </div>
      )}

      {scores && (
        <div className="writer-opt-dims">
          {Object.entries(scores).map(([key, val]) => (
            <span key={key} className="writer-opt-dim">
              {DIM_LABELS[key] || key}{' '}
              {before?.[key] != null && before[key] !== val ? `${before[key]}→` : ''}
              {val}
            </span>
          ))}
        </div>
      )}

      <div className="writer-opt-tabs">
        {(['draft', 'diff', 'polished'] as OptimizerView[]).map((v) => (
          <button key={v} type="button" className={view === v ? 'active' : ''} onClick={() => setView(v)}>
            {v === 'draft' ? 'Draft' : v === 'diff' ? 'Diff' : 'Polished'}
          </button>
        ))}
      </div>

      {view === 'draft' && (
        <pre className="writer-opt-body">{data.draft || '—'}</pre>
      )}
      {view === 'polished' && (
        <pre className="writer-opt-body">{data.polished || data.draft || '—'}</pre>
      )}
      {view === 'diff' && (
        <div className="writer-opt-diff">
          {(data.diffLines || []).length === 0 && data.draft === data.polished && (
            <p className="text-dim">四模块优化未修改正文，或 Diff 为空</p>
          )}
          {(data.diffLines || []).map((line) => (
            <div key={`${line.index}-${line.type}`} className={`diff-line diff-${line.type}`}>
              {line.type === 'remove' && <span className="diff-old">{line.before}</span>}
              {line.type === 'add' && <span className="diff-new">{line.after}</span>}
              {line.type === 'change' && (
                <>
                  <span className="diff-old">{line.before}</span>
                  <span className="diff-arrow">→</span>
                  <span className="diff-new">{line.after}</span>
                </>
              )}
            </div>
          ))}
          {data.polish?.edits?.length ? (
            <p className="text-dim writer-opt-edits">优化模块：{data.polish.edits.join(' · ')}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
