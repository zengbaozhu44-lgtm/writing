import { useCallback, useEffect, useState } from 'react';
import { api, PromptAnalytics, SceneBudgetReport, RuntimeEvent } from '../api/client';

export function useStudioMetricsLive(bookId: string, chapter: number, active: boolean) {
  const [analytics, setAnalytics] = useState<PromptAnalytics | null>(null);
  const [budgets, setBudgets] = useState<SceneBudgetReport[]>([]);
  const [live, setLive] = useState(false);

  const refresh = useCallback(() => {
    api.getPromptAnalytics(bookId, chapter).then(setAnalytics).catch(() => {});
    api.getSceneBudget(bookId, chapter).then((b) => setBudgets(Array.isArray(b) ? b : [])).catch(() => {});
  }, [bookId, chapter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!active) return;
    refresh();
    const timer = setInterval(refresh, 2000);
    return () => clearInterval(timer);
  }, [active, refresh]);

  useEffect(() => {
    const unsub = api.subscribeRuntimeEvents(bookId, (ev) => {
      const name = (ev.event || ev.type) as string;
      if (name === 'promptMetricsUpdated' || name === 'budgetAllocated' || name === 'pipelineStage') {
        setLive(true);
        refresh();
        setTimeout(() => setLive(false), 4000);
      }
    });
    return () => unsub();
  }, [bookId, refresh]);

  const latestBudget = budgets[budgets.length - 1] ?? null;

  return { analytics, budgets, latestBudget, live, refresh };
}
