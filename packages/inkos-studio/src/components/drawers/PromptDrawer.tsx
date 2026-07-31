import { useEffect, useState } from 'react';
import { api, Book, PromptAnalytics } from '../../api/client';
import { PromptMetricsDashboard } from '../PromptMetricsDashboard';
import { BudgetPieChart } from '../BudgetPieChart';

interface Props {
  book: Book;
  chapter: number;
  live?: boolean;
}

export function PromptDrawer({ book, chapter, live }: Props) {
  const [analytics, setAnalytics] = useState<PromptAnalytics | null>(null);
  const [scenes, setScenes] = useState<{ index: number; dynamic?: { profile?: string; modules?: { label: string; tokens?: number }[] } }[]>([]);
  const [budgets, setBudgets] = useState<Awaited<ReturnType<typeof api.getSceneBudget>>>([]);

  useEffect(() => {
    api.getPromptAnalytics(book.id, chapter).then(setAnalytics).catch(() => {});
    api.getDashboard(book.id, chapter).then((d) => setScenes(d.scenes)).catch(() => {});
    api.getSceneBudget(book.id, chapter).then((b) => setBudgets(Array.isArray(b) ? b : [])).catch(() => {});
  }, [book.id, chapter]);

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
    </div>
  );
}
