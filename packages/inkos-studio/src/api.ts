const BASE = '/api';

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || res.statusText);
  return data;
}

export interface VersionInfo {
  apiVersion: string;
  runtimeVersion: string;
  runtimeLabel: string;
  locked: boolean;
}

export interface Book {
  id: string;
  title: string;
  genre?: string;
  schemaVersion: number;
  brainEnabled: boolean;
  runtimeCapable?: boolean;
  currentChapter?: number;
  status?: string;
}

export interface Scene {
  index: number;
  id: string;
  title: string;
  goal: string;
  conflict: string;
  status: string;
  text?: string;
  wordCount?: number;
  dynamic?: {
    modules: { key: string; label: string; chars?: number; tokens?: number }[];
    totalChars?: number;
    totalTokens?: number;
    profile?: string;
    cacheHitRate?: number;
  };
}

export interface PromptAnalytics {
  source: string;
  chapter: number;
  scenes: {
    sceneId: string;
    index?: number;
    input_tokens?: number;
    output_tokens?: number;
    compile_time_ms?: number;
    cache_hit?: boolean;
    cache_hit_rate?: number;
    ranking_drop?: number;
    estimated_cost?: number;
    llm_latency_ms?: number;
    temperature?: number;
    retry_count?: number;
    budget_profile?: string;
  }[];
  aggregate?: {
    sceneCount: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    avgInputTokens: number;
    avgOutputTokens: number;
    cacheHitRate: number;
    avgCompileMs: number;
    avgLlmLatencyMs: number | null;
    totalEstimatedCost: number;
    history: { index?: number; input_tokens?: number; output_tokens?: number }[];
  } | null;
}

export interface Dashboard {
  apiVersion: string;
  runtimeVersion: string;
  book: Book;
  chapter: number;
  runtime: { phase: string; running?: boolean; status?: string; queueSize?: number };
  health: { overall: number; source: string; raw?: Record<string, unknown> };
  scenes: Scene[];
  plan: Record<string, unknown> | null;
  run: Record<string, unknown> | null;
  brainStages: { id: string; label: string; status: string }[];
  state: Record<string, string>;
  world: { name: string; [key: string]: string }[];
  events: { event: string; uiEvent?: string; label: string; time: string; at: string }[];
  adaptive?: Record<string, number>;
  console: { label: string; status: string; detail?: unknown }[];
  promptAnalytics?: PromptAnalytics | null;
}

export const api = {
  getVersion: () => fetchJson<VersionInfo>('/version'),

  listBooks: () =>
    fetchJson<{ books: Book[] } & VersionInfo>('/books').then((r) => r.books),

  getDashboard: (bookId: string, chapter?: number) =>
    fetchJson<Dashboard>(
      `/books/${encodeURIComponent(bookId)}/dashboard${chapter ? `?chapter=${chapter}` : ''}`,
    ),

  subscribeEvents: (bookId: string, onEvent: (data: unknown) => void) => {
    const es = new EventSource(`${BASE}/books/${encodeURIComponent(bookId)}/stream`);
    es.onmessage = (e) => {
      try { onEvent(JSON.parse(e.data)); } catch { /* skip */ }
    };
    return () => es.close();
  },

  // Runtime Control — 唯一允许的控制操作
  runtimeRun: (bookId: string, chapter: number, opts?: { force?: boolean; resume?: boolean }) =>
    fetchJson(`/books/${encodeURIComponent(bookId)}/runtime/run`, {
      method: 'POST',
      body: JSON.stringify({ chapter, ...opts }),
    }),

  runtimeResume: (bookId: string, chapter: number) =>
    fetchJson(`/books/${encodeURIComponent(bookId)}/runtime/resume`, {
      method: 'POST',
      body: JSON.stringify({ chapter }),
    }),

  runtimeRetry: (bookId: string, chapter: number) =>
    fetchJson(`/books/${encodeURIComponent(bookId)}/runtime/retry`, {
      method: 'POST',
      body: JSON.stringify({ chapter }),
    }),

  runtimeReplan: (bookId: string, chapter: number) =>
    fetchJson(`/books/${encodeURIComponent(bookId)}/runtime/replan`, {
      method: 'POST',
      body: JSON.stringify({ chapter }),
    }),

  runtimeNext: (bookId: string) =>
    fetchJson(`/books/${encodeURIComponent(bookId)}/runtime/next`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  runtimeRollback: (bookId: string, snapshotId: string) =>
    fetchJson(`/books/${encodeURIComponent(bookId)}/runtime/rollback`, {
      method: 'POST',
      body: JSON.stringify({ snapshotId }),
    }),

  daemonStart: (bookId: string) =>
    fetchJson(`/books/${encodeURIComponent(bookId)}/runtime/daemon/start`, {
      method: 'POST',
      body: '{}',
    }),

  daemonStop: (bookId: string) =>
    fetchJson(`/books/${encodeURIComponent(bookId)}/runtime/daemon/stop`, {
      method: 'POST',
      body: '{}',
    }),

  listSnapshots: (bookId: string) =>
    fetchJson<{ snapshots: { id: string; label: string; chapter: number }[] }>(
      `/books/${encodeURIComponent(bookId)}/memory/snapshots`,
    ).then((r) => r.snapshots),

  memoryDiff: (bookId: string, from: string, to: string) =>
    fetchJson<{ diff: { changes: { file: string; status: string }[] } }>(
      `/books/${encodeURIComponent(bookId)}/memory/diff?from=${from}&to=${to}`,
    ).then((r) => r.diff),
};
