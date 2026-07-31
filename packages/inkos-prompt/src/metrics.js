import fs from 'node:fs';
import path from 'node:path';
import { exists, readJson, writeJson } from '../../inkos-core/src/lib/paths.js';
import { promptCacheDir } from './cache.js';
import { countTokens } from './token-meter.js';

export function loadPromptMetrics(bookDir, chapter) {
  const file = path.join(promptCacheDir(bookDir, chapter), 'prompt_metrics.json');
  if (!exists(file)) return { scenes: [], chapter };
  return readJson(file);
}

export function recordPromptMetrics(bookDir, chapter, entry) {
  const dir = promptCacheDir(bookDir, chapter);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'prompt_metrics.json');
  const prev = exists(file) ? readJson(file) : { scenes: [], chapter };
  const idx = prev.scenes.findIndex((s) => s.sceneId === entry.sceneId);
  const normalized = normalizeEntry(entry);
  if (idx >= 0) prev.scenes[idx] = { ...prev.scenes[idx], ...normalized };
  else prev.scenes.push(normalized);
  prev.updatedAt = new Date().toISOString();
  writeJson(file, prev);
  return normalized;
}

export function patchPromptMetrics(bookDir, chapter, sceneId, patch) {
  const dir = promptCacheDir(bookDir, chapter);
  const file = path.join(dir, 'prompt_metrics.json');
  const prev = exists(file) ? readJson(file) : { scenes: [], chapter };
  const idx = prev.scenes.findIndex((s) => s.sceneId === sceneId);
  const base = idx >= 0 ? prev.scenes[idx] : { sceneId };
  const merged = normalizeEntry({ ...base, ...patch });
  if (idx >= 0) prev.scenes[idx] = merged;
  else prev.scenes.push(merged);
  prev.updatedAt = new Date().toISOString();
  writeJson(file, prev);
  return merged;
}

function normalizeEntry(entry) {
  const inputTokens = entry.input_tokens ?? (entry.inputChars ? countTokens(String(entry.inputChars)) : null);
  const outputTokens = entry.output_tokens ?? null;
  return {
    sceneId: entry.sceneId,
    index: entry.index,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: inputTokens != null && outputTokens != null ? inputTokens + outputTokens : inputTokens,
    compile_time_ms: entry.compile_time_ms ?? entry.compileMs ?? null,
    cache_hit: entry.cache_hit ?? entry.cacheHit ?? false,
    cache_miss: entry.cache_miss ?? (entry.cacheHit === false ? 1 : 0),
    cache_hit_rate: entry.cache_hit_rate ?? entry.cacheHitRate ?? null,
    context_size: entry.context_size ?? entry.contextDiffSize ?? null,
    ranking_drop: entry.ranking_drop ?? 0,
    budget_usage: entry.budget_usage ?? null,
    budget_profile: entry.budget_profile ?? null,
    llm_latency_ms: entry.llm_latency_ms ?? null,
    temperature: entry.temperature ?? null,
    retry_count: entry.retry_count ?? 0,
    estimated_cost: entry.estimated_cost ?? null,
    prompt_hash: entry.prompt_hash ?? entry.promptHash ?? null,
    token_source: entry.token_source ?? 'estimated',
    model: entry.model ?? null,
    importance: entry.importance ?? null,
    ranking: entry.ranking ?? null,
  };
}

export function aggregateMetrics(metrics) {
  const scenes = metrics.scenes || [];
  if (!scenes.length) return null;

  const sum = (fn) => scenes.reduce((s, e) => s + (fn(e) || 0), 0);
  const withInput = scenes.filter((e) => e.input_tokens != null);
  const withOutput = scenes.filter((e) => e.output_tokens != null);
  const cacheHits = scenes.filter((e) => e.cache_hit).length;

  return {
    sceneCount: scenes.length,
    totalInputTokens: sum((e) => e.input_tokens),
    totalOutputTokens: sum((e) => e.output_tokens),
    avgInputTokens: withInput.length ? Math.round(sum((e) => e.input_tokens) / withInput.length) : 0,
    avgOutputTokens: withOutput.length ? Math.round(sum((e) => e.output_tokens) / withOutput.length) : 0,
    totalEstimatedCost: Math.round(sum((e) => e.estimated_cost) * 1_000_000) / 1_000_000,
    cacheHitRate: Math.round((cacheHits / scenes.length) * 100),
    avgCompileMs: Math.round(sum((e) => e.compile_time_ms) / scenes.length),
    avgLlmLatencyMs: withOutput.length
      ? Math.round(sum((e) => e.llm_latency_ms) / withOutput.length)
      : null,
    totalRankingDrop: sum((e) => e.ranking_drop),
    history: scenes.map((s) => ({
      index: s.index,
      input_tokens: s.input_tokens,
      output_tokens: s.output_tokens,
      cache_hit_rate: s.cache_hit_rate,
      estimated_cost: s.estimated_cost,
    })),
  };
}

export function recordWriterMetrics(bookDir, chapter, sceneId, writerData) {
  return patchPromptMetrics(bookDir, chapter, sceneId, writerData);
}
