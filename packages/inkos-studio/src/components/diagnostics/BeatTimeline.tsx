import { ChapterDiagnosisBeat } from '../../api/client';

export function BeatTimeline({ beats = [] }: { beats: ChapterDiagnosisBeat[] }) {
  if (!beats.length) {
    return (
      <div className="diag-beat-timeline">
        <div className="panel-title">Beat Timeline</div>
        <p className="text-dim">暂无 Beat 诊断（跑过 Pipeline / Trace 后可见）</p>
      </div>
    );
  }
  return (
    <div className="diag-beat-timeline">
      <div className="panel-title">Beat Timeline</div>
      <div className="diag-beat-list">
        {beats.map((b) => {
          const bad = b.pass === false || (b.issues || []).length > 0;
          return (
            <div key={`${b.sceneIndex}-${b.beatOrder}`} className={`diag-beat-item ${bad ? 'bad' : 'ok'}`}>
              <div className="diag-beat-head">
                <strong>S{b.sceneIndex ?? 1} · B{b.beatOrder ?? '?'}</strong>
                <span>{b.libraryBeat || b.hookType || '—'}</span>
                {b.tensionLevel != null && <span>T{b.tensionLevel}</span>}
                {b.chars != null && <span>{b.chars}字</span>}
              </div>
              {(b.issues || []).length > 0 && (
                <ul className="diag-beat-issues">
                  {b.issues!.map((iss) => <li key={iss}>{iss}</li>)}
                </ul>
              )}
              {b.pass === false && !(b.issues || []).length && (
                <p className="text-dim">校验未通过</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
