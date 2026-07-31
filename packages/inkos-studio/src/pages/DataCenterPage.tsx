import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api, Dashboard, PromptAnalytics, SceneBudgetReport, HashDependencyTree as HashTreeData, RuntimeEvent } from '../api/client';
import { BudgetPieChart } from '../components/BudgetPieChart';
import { PromptMetricsDashboard } from '../components/PromptMetricsDashboard';
import { HashDependencyTree } from '../components/HashDependencyTree';
import type { BookContext } from '../layouts/BookLayout';

export function DataCenterPage() {
  const { book, chapter } = useOutletContext<BookContext>();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [analytics, setAnalytics] = useState<PromptAnalytics | null>(null);
  const [budgets, setBudgets] = useState<SceneBudgetReport[]>([]);
  const [hashTree, setHashTree] = useState<HashTreeData | null>(null);
  const [stats, setStats] = useState<{
    wordCount?: number; wordCountLabel?: string; health?: number; chapterCount?: number;
  } | null>(null);
  const [live, setLive] = useState(false);

  const refresh = useCallback(() => {
    api.getDashboard(book.id, chapter).then(setDashboard).catch(() => {});
    api.getPromptAnalytics(book.id, chapter).then(setAnalytics).catch(() => {});
    api.getSceneBudget(book.id, chapter).then((b) => setBudgets(Array.isArray(b) ? b : [])).catch(() => {});
    api.getHashDependencyTree(book.id, chapter).then(setHashTree).catch(() => {});
    api.getBookStats(book.id).then(setStats).catch(() => {});
  }, [book.id, chapter]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    const unsub = api.subscribeRuntimeEvents(book.id, (ev) => {
      const name = (ev.event || ev.type) as string;
      if (
        name === 'promptMetricsUpdated'
        || name === 'budgetAllocated'
        || name === 'pipelineCompleted'
        || name === 'hashDependencyChecked'
        || name === 'hashDependencyTreeUpdated'
      ) {
        setLive(true);
        if (name === 'hashDependencyTreeUpdated' && ev.payload && typeof ev.payload === 'object') {
          const payload = ev.payload as { tree?: HashTreeData };
          if (payload.tree) setHashTree(payload.tree);
        }
        refresh();
        setTimeout(() => setLive(false), 5000);
      }
    });
    return () => unsub();
  }, [book.id, refresh]);

  const health = dashboard?.health;
  const raw = health?.raw as Record<string, number> | undefined;
  const agg = analytics?.aggregate;
  const latestBudget = budgets[budgets.length - 1];

  const bar = (label: string, value: number, max = 100) => (
    <div className="metric-bar-row" key={label}>
      <span>{label}</span>
      <div className="metric-bar"><div style={{ width: `${Math.min(100, (value / max) * 100)}%` }} /></div>
      <span>{Math.round(value)}</span>
    </div>
  );

  return (
    <div className="page data-center">
      <div className="page-header">
        <div>
          <h1>数据中心</h1>
          <p className="page-sub">{book.title} · Ch{chapter}</p>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="panel">
          <div className="panel-title">Story Health</div>
          <div className="stat-hero">{stats?.health ?? health?.overall ?? '—'}</div>
          {bar('剧情推进', Number(raw?.plotProgress) || health?.overall || 0)}
          {bar('人物一致性', Number(raw?.characterConsistency) || 0)}
          {bar('冲突密度', (Number(raw?.conflictDensityAvg) || 0) * 10, 100)}
          {bar('悬念', Number(raw?.suspenseScore) || 0)}
          {bar('爽点', Number(raw?.hookScore) || 0)}
        </div>

        <div className="panel">
          <PromptMetricsDashboard analytics={analytics} live={live} />
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
          {budgets.length > 1 && (
            <p className="text-dim budget-scene-hint">共 {budgets.length} 个 Scene 已分配 Budget</p>
          )}
        </div>
      </div>

      <div className="panel hash-dep-panel">
        <HashDependencyTree tree={hashTree} live={live} />
      </div>
    </div>
  );
}
