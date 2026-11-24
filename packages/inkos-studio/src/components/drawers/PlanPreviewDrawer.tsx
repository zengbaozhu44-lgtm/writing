/**
 * PlanPreviewDrawer — 协议渲染器「预审-确认-执行」最小可行接入
 *
 * 预审（render-preview，dry-run）→ 改 goal/scenes/plant → 确认执行（render-commit）→ onGenerate
 * 原则：渲染器是唯一写盘者；UI 只回传覆盖参数，commit 由渲染器重跑卫生校验（POV/缺口 ID/前缀/白名单覆盖）。
 */
import { useCallback, useEffect, useState } from 'react';
import { api, PlanRenderAudit, RenderedPlan } from '../../api/client';
import { Field } from '../FormFields';

interface Props {
  bookId: string;
  chapter: number;
  onGenerate?: () => void;
}

interface Overrides {
  goal?: string;
  scenes?: string[];
}

/** 相对当前渲染结果的改动；scenes 以整数组覆盖（渲染器 `--override-scenes` 行为） */
function changedOverrides(plan: RenderedPlan | null, goal: string, scenes: string[]): Overrides {
  const ov: Overrides = {};
  if (plan?.goal !== undefined && goal !== plan.goal) ov.goal = goal;
  if (scenes.join('') !== (plan?.scenes || []).join('')) ov.scenes = scenes;
  return ov;
}

export function PlanPreviewDrawer({ bookId, chapter, onGenerate }: Props) {
  const [plan, setPlan] = useState<RenderedPlan | null>(null);
  const [audit, setAudit] = useState<PlanRenderAudit | null>(null);
  const [goal, setGoal] = useState('');
  const [scenes, setScenes] = useState<string[]>([]);
  const [plant, setPlant] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');

  const render = useCallback(async (plantArg: string, ov: Overrides) => {
    setLoading(true);
    setErr('');
    try {
      const r = await api.renderChapterPlanPreview(bookId, chapter, {
        plant: plantArg || undefined,
        overrides: ov.goal || (ov.scenes && ov.scenes.length) ? ov : undefined,
      });
      setPlan(r.plan || null);
      setAudit(r.audit || null);
      setGoal(r.plan?.goal || '');
      setScenes(r.plan?.scenes || []);
      setPlant(plantArg);
    } catch (e) {
      setErr((e as Error).message || String(e));
    } finally {
      setLoading(false);
    }
  }, [bookId, chapter]);

  // 打开 / 换章 → 干净渲染（不带覆盖）
  useEffect(() => { void render('', {}); }, [render]);

  const rerender = () => {
    void render(plant, changedOverrides(plan, goal, scenes));
  };

  const commit = async () => {
    if (audit?.overwrite && !window.confirm(`第 ${chapter} 章已存在 plan，确认覆盖并执行生成？`)) return;
    setBusy('commit');
    setErr('');
    try {
      await api.renderChapterPlanCommit(bookId, chapter, {
        plant: plant || undefined,
        overrides: changedOverrides(plan, goal, scenes),
        force: true,
      });
      onGenerate?.();
    } catch (e) {
      setErr((e as Error).message || String(e));
    } finally {
      setBusy('');
    }
  };

  const setScene = (i: number, v: string) => {
    setScenes((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  };

  const gaps = audit?.gaps;
  const whitelistOk = audit?.whitelist_coverage?.ok !== false;
  const d = audit?.distance_to_milestone;

  return (
    <div className="drawer-content plan-preview-drawer">
      <div className="drawer-toolbar">
        <span className="text-dim">Ch{chapter} · 协议渲染（dry-run 不落盘）</span>
        {loading && <span className="text-dim">渲染中…</span>}
        {audit?.overwrite && <span className="wizard-warn">⚠ 将覆盖已存在 plan</span>}
      </div>

      {err && <p className="ai-msg">{err}</p>}

      {!plan && !loading && !err && (
        <p className="text-dim">（空 — 点「重新渲染」获取协议 plan）</p>
      )}

      {plan && audit && (
        <>
          <div className="plan-audit">
            <div className="panel-title">渲染审计（只读）</div>
            <div className="plan-audit-grid">
              <span className="text-dim">POV</span>
              <span>{audit.pov || '—'}{audit.pov_check?.ok === false && <em className="wizard-warn">（非法）</em>}</span>
              <span className="text-dim">章功能</span>
              <span>{audit.chapter_function || '—'}{d != null && d < 999 ? ` · Δ里程碑 ${d}` : ''}</span>
              <span className="text-dim">里程碑</span>
              <span>{audit.milestone || '—'}</span>
              <span className="text-dim">卷基调</span>
              <span>卷{audit.vol?.index ?? '—'} · 代价默认「{audit.vol?.cost_prefix || '—'}」 · {audit.vol?.emotion_baseline || ''}</span>
              <span className="text-dim">埋物证</span>
              <span>{audit.plant_heuristic || '（未检出）'}</span>
              <span className="text-dim">白名单覆盖</span>
              <span>{whitelistOk ? '✓ 齐全' : `缺失：${(audit.whitelist_coverage?.missing || []).join('、')}`}</span>
              <span className="text-dim">缺口（推进/承接/保护）</span>
              <span>{(gaps?.advance || []).join('、') || '—'} / {(gaps?.carried || []).join('、') || '—'} / {(gaps?.protect || []).join('、') || '—'}</span>
            </div>
          </div>

          <Field label="goal · 章目标" multiline value={goal} onChange={setGoal} />
          {scenes.map((s, i) => (
            <Field key={i} label={`scenes[${i + 1}] · 节拍`} multiline value={s} onChange={(v) => setScene(i, v)} />
          ))}
          <Field label="plant · 埋物证（改后点「重新渲染」联动 cost/foreshadow/mustGain）" value={plant} onChange={setPlant} />

          <div className="plan-actions">
            <button type="button" className="btn btn-primary" disabled={!!busy || loading} onClick={() => void commit()}>
              {busy === 'commit' ? '提交中…' : '确认执行'}
            </button>
            <button type="button" className="btn" disabled={!!busy || loading} onClick={rerender}>
              {loading ? '渲染中…' : '重新渲染'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
