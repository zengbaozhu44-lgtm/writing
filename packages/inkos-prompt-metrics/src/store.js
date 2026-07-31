import fs from 'node:fs';
import path from 'node:path';
import { estimateCost } from '../../inkos-prompt/src/token-meter.js';

export function getPromptMetricsDir(bookDir, chapter) {
  return path.join(
    bookDir,
    'novel',
    '_system',
    'studio',
    'prompt-metrics',
    `ch_${String(chapter).padStart(4, '0')}`,
  );
}

function computeBudgetUsage(entry, budget) {
  const total = budget?.totalTokens ?? budget?.total_tokens;
  const input = entry.input_tokens ?? 0;
  if (!total || !input) return null;
  return Math.min(100, Math.round((input / total) * 100));
}

export function normalizeSceneMetrics(entry = {}) {
  const input = entry.input_tokens ?? 0;
  const output = entry.output_tokens ?? 0;
  const cached = entry.cached_tokens ?? 0;
  const model = entry.model || 'deepseek-chat';
  const cost = entry.cost ?? entry.estimated_cost ?? estimateCost(input, output, model);
  const usd = entry.usd_cost ?? cost;
  const budget = entry.budget ?? null;
  const budgetUsage = entry.budget_usage ?? entry.budgetUsage ?? computeBudgetUsage(entry, budget);

  return {
    sceneId: entry.sceneId,
    index: entry.index,
    chapter: entry.chapter,
    input_tokens: input,
    output_tokens: output,
    cached_tokens: cached,
    cache_hit: Boolean(entry.cache_hit ?? cached > 0),
    compile_time_ms: entry.compile_time_ms ?? entry.compile_time ?? null,
    compile_time: entry.compile_time ?? entry.compile_time_ms ?? null,
    llm_latency_ms: entry.llm_latency_ms ?? entry.llm_latency ?? null,
    llm_latency: entry.llm_latency ?? entry.llm_latency_ms ?? null,
    retry: entry.retry ?? entry.retry_count ?? 0,
    temperature: entry.temperature ?? null,
    cost,
    usd_cost: usd,
    quality: entry.quality ?? entry.commercial_score ?? null,
    commercial_score: entry.commercial_score ?? entry.quality ?? null,
    model,
    token_source: entry.token_source ?? 'studio',
    director_rewrites: entry.director_rewrites ?? 0,
    optimizer_rewrites: entry.optimizer_rewrites ?? 0,
    budget,
    budget_usage: budgetUsage,
    budgetUsage,
    recordedAt: entry.recordedAt || new Date().toISOString(),
  };
}

export function persistSceneMetrics(bookDir, chapter, scene, metrics) {
  const normalized = normalizeSceneMetrics({
    ...metrics,
    sceneId: metrics.sceneId || scene?.id,
    index: metrics.index ?? scene?.index,
    chapter,
  });

  const dir = path.join(
    getPromptMetricsDir(bookDir, chapter),
    `scene_${String(scene?.index ?? 0).padStart(2, '0')}`,
  );
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'prompt_metrics.json');
  fs.writeFileSync(file, JSON.stringify(normalized, null, 2), 'utf8');

  updateChapterRollup(bookDir, chapter, normalized);
  return { file, metrics: normalized };
}

function updateChapterRollup(bookDir, chapter, entry) {
  const rollupPath = path.join(getPromptMetricsDir(bookDir, chapter), 'rollup.json');
  let rollup = { chapter, scenes: [], updatedAt: null };
  try {
    if (fs.existsSync(rollupPath)) rollup = JSON.parse(fs.readFileSync(rollupPath, 'utf8'));
  } catch { /* fresh */ }

  const idx = rollup.scenes.findIndex((s) => s.index === entry.index);
  if (idx >= 0) rollup.scenes[idx] = entry;
  else rollup.scenes.push(entry);

  rollup.scenes.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  rollup.updatedAt = new Date().toISOString();
  rollup.aggregate = aggregateSceneMetrics(rollup.scenes);
  fs.writeFileSync(rollupPath, JSON.stringify(rollup, null, 2), 'utf8');
}

export function loadChapterMetrics(bookDir, chapter) {
  const rollupPath = path.join(getPromptMetricsDir(bookDir, chapter), 'rollup.json');
  if (!fs.existsSync(rollupPath)) return { chapter, scenes: [], aggregate: null };
  try {
    return JSON.parse(fs.readFileSync(rollupPath, 'utf8'));
  } catch {
    return { chapter, scenes: [], aggregate: null };
  }
}

export function aggregateSceneMetrics(scenes = []) {
  if (!scenes.length) return null;

  const sum = (fn) => scenes.reduce((s, e) => s + (fn(e) || 0), 0);
  const avg = (fn) => Math.round(sum(fn) / scenes.length);
  const cacheHits = scenes.filter((s) => s.cache_hit).length;

  return {
    sceneCount: scenes.length,
    totalInputTokens: sum((s) => s.input_tokens),
    totalOutputTokens: sum((s) => s.output_tokens),
    totalCachedTokens: sum((s) => s.cached_tokens),
    avgInputTokens: avg((s) => s.input_tokens),
    avgOutputTokens: avg((s) => s.output_tokens),
    cacheHitRate: Math.round((cacheHits / scenes.length) * 100),
    avgCompileMs: avg((s) => s.compile_time_ms),
    avgLlmLatencyMs: avg((s) => s.llm_latency_ms),
    totalRetries: sum((s) => s.retry),
    totalCost: Math.round(sum((s) => s.usd_cost) * 1_000_000) / 1_000_000,
    avgCommercialScore: avg((s) => s.commercial_score),
    avgQuality: avg((s) => s.quality ?? s.commercial_score),
    avgTemperature: avg((s) => s.temperature),
    avgBudgetUsage: avg((s) => s.budget_usage ?? s.budgetUsage),
    history: scenes.map((s) => ({
      index: s.index,
      input_tokens: s.input_tokens,
      output_tokens: s.output_tokens,
      cached_tokens: s.cached_tokens,
      cache_hit: s.cache_hit,
      commercial_score: s.commercial_score,
      quality: s.quality ?? s.commercial_score,
      usd_cost: s.usd_cost,
      llm_latency_ms: s.llm_latency_ms,
      temperature: s.temperature,
      budget_usage: s.budget_usage ?? s.budgetUsage,
      retry: s.retry,
    })),
  };
}
