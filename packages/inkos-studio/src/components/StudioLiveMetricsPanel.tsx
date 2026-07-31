import { PromptAnalytics, SceneBudgetReport } from '../api/client';
import { BudgetPieChart } from './BudgetPieChart';
import { PromptMetricsDashboard } from './PromptMetricsDashboard';

interface Props {
  analytics: PromptAnalytics | null;
  latestBudget: SceneBudgetReport | null;
  live?: boolean;
  compact?: boolean;
}

export function StudioLiveMetricsPanel({ analytics, latestBudget, live, compact }: Props) {
  if (compact) {
    const agg = analytics?.aggregate;
    return (
      <div className="studio-live-metrics compact">
        <div className="studio-live-metrics-row">
          <PromptMetricsDashboard analytics={analytics} live={live} />
          {latestBudget ? (
            <BudgetPieChart
              pie={latestBudget.pie}
              sceneType={latestBudget.sceneType}
              totalTokens={latestBudget.totalTokens}
              title={`Budget · Scene ${latestBudget.scene?.index ?? '?'}`}
            />
          ) : (
            <BudgetPieChart pie={[]} title="Dynamic Budget" />
          )}
        </div>
        {agg && (
          <p className="text-dim studio-live-summary">
            累计 {(agg as { sceneCount?: number }).sceneCount ?? analytics?.scenes?.length ?? 0} Scene ·
            In {agg.avgInputTokens ?? '—'} · Out {agg.avgOutputTokens ?? '—'} ·
            ${agg.totalCost?.toFixed(4) ?? '—'} · Commercial {agg.avgCommercialScore ?? '—'}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="studio-live-metrics">
      <PromptMetricsDashboard analytics={analytics} live={live} />
      {latestBudget && (
        <BudgetPieChart
          pie={latestBudget.pie}
          sceneType={latestBudget.sceneType}
          totalTokens={latestBudget.totalTokens}
          title={`Scene ${latestBudget.scene?.index ?? '?'} Budget`}
        />
      )}
    </div>
  );
}
