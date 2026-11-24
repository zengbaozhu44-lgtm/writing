import { useEffect, useState } from 'react';
import { api, Book, PromptAnalytics, FinalContextSnapshot } from '../../api/client';
import { PromptMetricsDashboard } from '../PromptMetricsDashboard';
import { BudgetPieChart } from '../BudgetPieChart';

interface Props {
  book: Book;
  chapter: number;
  live?: boolean;
}

function flag(v: boolean | undefined) {
  if (v === true) return 'present';
  if (v === false) return 'absent';
  return '—';
}

function LayerRow({
  name,
  layer,
}: {
  name: string;
  layer?: FinalContextSnapshot['layers'][keyof FinalContextSnapshot['layers']];
}) {
  if (!layer) {
    return (
      <div className="rank-row">
        <strong>{name}</strong> — not recorded
      </div>
    );
  }
  return (
    <div className="rank-row" style={{ display: 'block', marginBottom: 6 }}>
      <strong>{name}</strong>{' '}
      {layer.present ? 'present' : 'absent'}
      {layer.hash ? ` · hash ${layer.hash}` : ''}
      {layer.present ? (
        <span>
          {' '}
          · Clock {flag(layer.clock)} · IB {flag(layer.ib)}
          {layer.chars != null ? ` · ${layer.chars} chars` : ''}
          {name === 'L3' && layer.sealedHash ? ` · sealedHash ${layer.sealedHash}` : ''}
          {name === 'L4' && layer.beatUserPromptHash
            ? ` · beatUserPromptHash ${layer.beatUserPromptHash}`
            : ''}
          {name === 'L4' && layer.beatOrder != null ? ` · beat ${layer.beatOrder}` : ''}
        </span>
      ) : null}
    </div>
  );
}

export function PromptDrawer({ book, chapter, live }: Props) {
  const [analytics, setAnalytics] = useState<PromptAnalytics | null>(null);
  const [scenes, setScenes] = useState<{ index: number; dynamic?: { profile?: string; modules?: { label: string; tokens?: number }[] } }[]>([]);
  const [budgets, setBudgets] = useState<Awaited<ReturnType<typeof api.getSceneBudget>>>([]);
  const [finalCtx, setFinalCtx] = useState<FinalContextSnapshot[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<{
    snapshot: FinalContextSnapshot | null;
    texts?: Record<string, string>;
    integrity?: { ok: boolean; reasons?: string[] };
  } | null>(null);

  useEffect(() => {
    api.getPromptAnalytics(book.id, chapter).then(setAnalytics).catch(() => {});
    api.getDashboard(book.id, chapter).then((d) => setScenes(d.scenes)).catch(() => {});
    api.getSceneBudget(book.id, chapter).then((b) => setBudgets(Array.isArray(b) ? b : [])).catch(() => {});
    api.getFinalContext(book.id, chapter)
      .then((r) => setFinalCtx(r.snapshots || []))
      .catch(() => setFinalCtx([]));
    setSelected(null);
    setDetail(null);
  }, [book.id, chapter]);

  useEffect(() => {
    if (selected == null) {
      setDetail(null);
      return;
    }
    api.getFinalContext(book.id, chapter, selected, true)
      .then((r) => {
        const snap = r.snapshot || null;
        setDetail({
          snapshot: snap,
          texts: snap?.texts,
          integrity: Array.isArray(r.integrity) ? undefined : r.integrity,
        });
      })
      .catch(() => setDetail(null));
  }, [book.id, chapter, selected]);

  const sceneMetrics = analytics?.scenes?.[0] as {
    ranking?: { facts?: { score: number; text: string }[] };
    budget_usage?: { pct?: Record<string, number> };
    ranking_drop?: number;
  } | undefined;
  const latestBudget = Array.isArray(budgets) ? budgets[budgets.length - 1] : null;

  return (
    <div className="drawer-content prompt-drawer">
      <PromptMetricsDashboard analytics={analytics} live={live} />
      <div className="metrics-grid drawer-metrics-grid">
        <div className="panel">
          <div className="panel-title">Context Ranking</div>
          <p>Ranking Drop: {sceneMetrics?.ranking_drop ?? '—'}</p>
          {(sceneMetrics?.ranking?.facts || []).map((f, i) => (
            <div key={i} className="rank-row"><span>{f.score.toFixed(2)}</span> {f.text}</div>
          ))}
        </div>
        <div className="panel">
          {latestBudget ? (
            <BudgetPieChart
              pie={latestBudget.pie}
              sceneType={latestBudget.sceneType}
              totalTokens={latestBudget.totalTokens}
              title={`Scene ${latestBudget.scene?.index ?? '?'} Budget`}
            />
          ) : (
            <BudgetPieChart pie={[]} title="Dynamic Budget" />
          )}
        </div>
        <div className="panel">
          <div className="panel-title">Scene Profiles</div>
          {scenes.map((s) => (
            <div key={s.index}>Scene {s.index}: {s.dynamic?.profile || '—'}</div>
          ))}
        </div>
      </div>

      <div className="panel" style={{ marginTop: 12 }}>
        <div className="panel-title">Final Context Viewer (F2 · READ-ONLY)</div>
        <p style={{ opacity: 0.75, fontSize: 12 }}>
          L4 = actual Beat userPrompt sent to Writer. View only — no edit / reorder / budget change.
        </p>
        {finalCtx.length === 0 ? (
          <p>No final-context snapshots for this chapter yet. Run Studio Writer to record L1–L4.</p>
        ) : (
          <div>
            {finalCtx.map((s) => (
              <button
                key={s.sceneIndex}
                type="button"
                className="rank-row"
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  background: selected === s.sceneIndex ? 'rgba(255,255,255,0.08)' : 'transparent',
                  border: 'none',
                  color: 'inherit',
                  padding: '6px 0',
                }}
                onClick={() => setSelected(s.sceneIndex)}
              >
                Scene {s.sceneIndex} ({s.sceneId})
                {' · '}
                L3 Clock {flag(s.layers?.L3?.clock)} / IB {flag(s.layers?.L3?.ib)}
                {' · '}
                L4 Clock {flag(s.layers?.L4?.clock)} / IB {flag(s.layers?.L4?.ib)}
                {s.layers?.L4?.hash ? ` · L4 ${s.layers.L4.hash}` : ''}
              </button>
            ))}
          </div>
        )}

        {detail?.snapshot ? (
          <div style={{ marginTop: 10 }}>
            <div className="panel-title">Scene {detail.snapshot.sceneIndex} layers</div>
            <LayerRow name="L1" layer={detail.snapshot.layers?.L1} />
            <LayerRow name="L2" layer={detail.snapshot.layers?.L2} />
            <LayerRow name="L3" layer={detail.snapshot.layers?.L3} />
            <LayerRow name="L4" layer={detail.snapshot.layers?.L4} />
            <div className="rank-row">
              Clock source: {detail.snapshot.clockSource || '—'} · IB source: {detail.snapshot.ibSource || '—'}
            </div>
            <div className="rank-row">
              Hash integrity:{' '}
              {detail.integrity?.ok === true
                ? 'PASS'
                : detail.integrity?.ok === false
                  ? `FAIL (${(detail.integrity.reasons || []).join('; ')})`
                  : '—'}
            </div>

            {Array.isArray(detail.snapshot.provenance?.blocks) && detail.snapshot.provenance.blocks.length > 0 ? (
              <div style={{ marginTop: 12 }}>
                <div className="panel-title">Context Provenance (F3 · diagnostic)</div>
                <p style={{ opacity: 0.75, fontSize: 12 }}>
                  Explains why blocks entered the prompt — not Story truth / Canon / SR.
                </p>
                {detail.snapshot.provenance.blocks.map((b) => (
                  <div
                    key={b.key}
                    className="rank-row"
                    style={{ display: 'block', marginBottom: 8, fontSize: 12 }}
                  >
                    <strong>{b.key}</strong>
                    <div>
                      source: {b.source} · type: {b.type} · priority: {b.priority}
                    </div>
                    <div>
                      kept: {String(b.kept)} · reason: {b.reason}
                    </div>
                    <div>
                      L1:{b.layers?.L1 || '—'} L2:{b.layers?.L2 || '—'}{' '}
                      L3:{b.layers?.L3 || '—'} L4:{b.layers?.L4 || '—'}
                    </div>
                    {b.channels?.length ? (
                      <div>channels: {b.channels.join(', ')}{b.note ? ` · ${b.note}` : ''}</div>
                    ) : b.note ? (
                      <div>{b.note}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {detail.texts?.L4 ? (
              <details open style={{ marginTop: 8 }}>
                <summary>L4 Beat userPrompt (actual Writer input)</summary>
                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    maxHeight: 320,
                    overflow: 'auto',
                    fontSize: 11,
                    opacity: 0.9,
                  }}
                >
                  {detail.texts.L4}
                </pre>
              </details>
            ) : null}
            {detail.texts?.L3 ? (
              <details style={{ marginTop: 8 }}>
                <summary>L3 Sealed Prompt</summary>
                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    maxHeight: 240,
                    overflow: 'auto',
                    fontSize: 11,
                    opacity: 0.85,
                  }}
                >
                  {detail.texts.L3}
                </pre>
              </details>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
