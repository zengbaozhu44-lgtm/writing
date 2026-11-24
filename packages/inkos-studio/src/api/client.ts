const BASE = '/api';

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${url}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err;
    throw new Error('无法连接 Studio Server，请运行 npm run studio:server');
  }
  let data: Record<string, unknown>;
  try {
    data = await res.json();
  } catch {
    throw new Error(res.ok ? '服务器响应格式错误' : `请求失败 (${res.status})`);
  }
  if (!res.ok) {
    const err = new Error(String(data.error || data.message || res.statusText)) as Error & {
      code?: string;
      status?: number;
    };
    err.code = String(data.error || '');
    err.status = res.status;
    throw err;
  }
  return data as T;
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
      return;
    }
    const t = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

type LivingTaskPublic = {
  ok?: boolean;
  taskId?: string;
  status?: string;
  error?: string | null;
  result?: Record<string, unknown>;
  code?: string;
};

export class LivingTaskError extends Error {
  code: string;
  constructor(message: string, code = 'LIVING_TASK_ERROR') {
    super(message);
    this.name = 'LivingTaskError';
    this.code = code;
  }
}

/** 等待 run-living 异步任务终态（轮询 statusUrl，可 Abort） */
async function waitForLivingTask(
  taskId: string,
  opts?: { timeoutMs?: number; intervalMs?: number; signal?: AbortSignal },
): Promise<LivingTaskPublic> {
  const timeoutMs = opts?.timeoutMs ?? 45 * 60 * 1000;
  const intervalMs = opts?.intervalMs ?? 1500;
  const signal = opts?.signal;
  const started = Date.now();
  const isTerminal = (status?: string) =>
    status === 'completed' || status === 'failed'
    || status === 'interrupted' || status === 'cancelled';

  let consecutive404 = 0;

  while (Date.now() - started < timeoutMs) {
    if (signal?.aborted) {
      throw new LivingTaskError('章节生成已取消', 'ABORTED');
    }
    try {
      const pub = await fetchJson<LivingTaskPublic>(
        `/tasks/${encodeURIComponent(taskId)}`,
        signal ? { signal } : undefined,
      );
      consecutive404 = 0;
      if (isTerminal(pub.status)) return pub;
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        throw new LivingTaskError('章节生成已取消', 'ABORTED');
      }
      const status = (err as { status?: number }).status;
      const code = (err as { code?: string }).code;
      if (status === 404 || code === 'TASK_NOT_FOUND') {
        consecutive404 += 1;
        if (consecutive404 >= 3) {
          throw new LivingTaskError(
            '任务状态丢失（可能服务已重启）。请刷新后重试生成。',
            'TASK_404_SERVICE_RESTART',
          );
        }
      } else {
        throw err;
      }
    }
    await sleep(intervalMs, signal);
  }
  throw new LivingTaskError(
    `章节生成超时（已等待 ${Math.round(timeoutMs / 60000)} 分钟）`,
    'TIMEOUT',
  );
}

/** 归一化 Living 任务结果 → 调用方期望的 { result, livingEvolution } */
function normalizeLivingRunPayload(payload: Record<string, unknown> | undefined, taskId?: string) {
  if (!payload) {
    return { result: {} as Record<string, unknown>, livingEvolution: undefined as Record<string, unknown> | undefined, taskId };
  }
  const nested = payload.result;
  const pipeline = (
    nested
    && typeof nested === 'object'
    && !Array.isArray(nested)
  )
    ? nested as Record<string, unknown>
    : payload;
  const livingEvolution = (
    payload.livingEvolution
    || pipeline.livingEvolution
  ) as Record<string, unknown> | undefined;
  return {
    result: {
      ...pipeline,
      pass: pipeline.pass ?? payload.pass,
      chapter: pipeline.chapter ?? payload.chapter,
    },
    livingEvolution,
    taskId,
  };
}

export interface BookStats {
  bookId: string;
  title: string;
  genre?: string;
  status: string;
  chapterCount: number;
  currentChapter: number;
  wordCount: number;
  wordCountLabel: string;
  health: number;
  plotSummary?: string;
  volume?: number;
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
  stats?: BookStats | null;
}

export interface WizardContent {
  world?: { markdown?: string; fields?: Record<string, string> };
  writing?: { markdown?: string; fields?: Record<string, string> };
  characters?: { characters?: { fields?: Record<string, string>; markdown?: string }[] };
  factions?: { factions?: { name: string; markdown?: string }[] };
  volume?: {
    markdown?: string;
    fields?: Record<string, unknown>;
    upstreamFingerprint?: Record<string, string>;
  };
  chapterTask?: { markdown?: string; fields?: Record<string, string> };
}

export interface PipelineStage {
  id: string;
  label: string;
  message?: string;
  status: 'waiting' | 'running' | 'done' | 'failed';
  detail?: string;
}

export interface CreationInsights {
  world: { completeness: number; done: string[]; missing: string[]; suggestion: string };
  writing: { completeness: number; done: string[]; missing: string[]; suggestion: string };
  characters: {
    list: { name: string; identity: string; goal: string; secret: string; role: string; growth?: string }[];
    protagonist?: { name: string; identity: string; goal: string; secret: string; role: string; growth?: string };
    suggestion: string;
    completeness: number;
  };
  factions: {
    list: { name: string; intro: string; hostile: string; friendly: string }[];
    relations: { from: string; to: string; type: string }[];
    suggestion: string;
    completeness: number;
  };
}

export interface Dashboard {
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
  events: { event: string; label: string; time: string; at: string }[];
  adaptive?: Record<string, number>;
  console: { label: string; status: string; detail?: unknown }[];
  promptAnalytics?: PromptAnalytics | null;
}

export interface Scene {
  index: number;
  id: string;
  title: string;
  goal: string;
  conflict: string;
  status: string;
  text?: string;
  beat?: string;
  entities?: string[];
  dynamic?: {
    modules: { key: string; label: string; tokens?: number; chars?: number }[];
    totalTokens?: number;
    totalChars?: number;
    profile?: string;
    cacheHitRate?: number;
  };
  review?: { pass: boolean; issues?: { level: string; msg: string }[] };
  consistency?: { pass: boolean };
}

export interface RuntimeEvent {
  event?: string;
  type?: string;
  [key: string]: unknown;
}

export interface PromptAnalytics {
  source: string;
  chapter: number;
  scenes: Record<string, unknown>[];
  aggregate?: {
    sceneCount?: number;
    avgInputTokens: number;
    avgOutputTokens: number;
    totalCachedTokens?: number;
    cacheHitRate: number;
    avgCompileMs: number;
    totalEstimatedCost?: number;
    totalCost?: number;
    avgLlmLatencyMs: number | null;
    totalRetries?: number;
    avgCommercialScore?: number;
    avgQuality?: number;
    avgTemperature?: number;
    avgBudgetUsage?: number;
    history: { index?: number; input_tokens?: number; output_tokens?: number; cached_tokens?: number; cache_hit?: boolean; commercial_score?: number; usd_cost?: number }[];
  } | null;
}

/** F2 Final Context Viewer snapshot (READ-ONLY) */
export interface FinalContextSnapshot {
  role?: string;
  readOnly?: boolean;
  sceneId: string;
  sceneIndex: number;
  chapter: number;
  clockSource?: string | null;
  ibSource?: string | null;
  writerCallId?: string | null;
  writerCalls?: Array<{
    callId: string;
    beatOrder?: number | null;
    hash: string;
    clock?: boolean;
    ib?: boolean;
    at?: string;
  }>;
  layers: {
    L1?: { present: boolean; hash: string | null; clock?: boolean; ib?: boolean; chars?: number };
    L2?: { present: boolean; hash: string | null; clock?: boolean; ib?: boolean; chars?: number };
    L3?: {
      present: boolean;
      hash: string | null;
      sealedHash?: string | null;
      clock?: boolean;
      ib?: boolean;
      chars?: number;
    };
    L4?: {
      present: boolean;
      hash: string | null;
      beatUserPromptHash?: string | null;
      beatOrder?: number | null;
      writerCallId?: string | null;
      clock?: boolean;
      ib?: boolean;
      chars?: number;
    };
  };
  texts?: Partial<Record<'L1' | 'L2' | 'L3' | 'L4', string>>;
  provenance?: {
    role?: string;
    readOnly?: boolean;
    blocks?: Array<{
      key: string;
      type: string;
      source: string;
      priority: string;
      kept: boolean;
      reason: string;
      layers?: Partial<Record<'L1' | 'L2' | 'L3' | 'L4', string>>;
      channels?: string[];
      note?: string;
    }>;
  };
  updatedAt?: string;
}

export interface SceneBudgetReport {
  version: string;
  chapter: number;
  scene: { id?: string; index?: number; goal?: string };
  totalTokens: number;
  sceneType: string;
  pie: { key: string; label: string; tokens: number; pct: number; color: string }[];
  allocation: Record<string, { tokens: number; pct: number; label: string; color: string }>;
}

export interface HashDependencyNode {
  id: string;
  label: string;
  hash?: string;
  previous?: string | null;
  changed?: boolean;
  status: 'cached' | 'modified' | 'invalid' | 'regenerating';
  canonSource?: string;
  type?: string;
  index?: number;
  mustRecompile?: boolean;
}

export interface HashDependencyTree {
  version: string;
  chapter: number;
  combinedHash: string;
  previousCombinedHash?: string | null;
  trigger?: string | null;
  promptCache?: {
    status: string;
    brain: boolean;
    studio: boolean;
  };
  nodes: HashDependencyNode[];
  sceneNodes?: HashDependencyNode[];
  graph?: {
    affectedScenes?: number[];
    sceneCount?: number;
    triggerScene?: number;
    summary?: HashDependencyTree['summary'];
  };
  summary?: {
    cached: number;
    modified: number;
    invalid: number;
    regenerating: number;
  };
  invalidated?: boolean;
  regenerating?: boolean;
  changed?: string[];
  updatedAt?: string;
}

export interface WriterOptimizerModuleReport {
  scoreBefore?: number | null;
  scoreAfter?: number | null;
  changed?: boolean;
  skipped?: boolean;
  mode?: string;
  edits?: string[];
}

export interface WriterOptimizerReport {
  chapter: number;
  sceneIndex: number;
  draft?: string | null;
  polished?: string | null;
  total?: number | null;
  totalBefore?: number | null;
  scores?: Record<string, number> | null;
  scoresBefore?: Record<string, number> | null;
  modules?: Record<string, WriterOptimizerModuleReport> | null;
  diffLines?: { type: string; before: string; after: string; index: number }[];
  polish?: { changed?: boolean; mode?: string; edits?: string[]; modules?: Record<string, WriterOptimizerModuleReport> } | null;
  report?: Record<string, unknown> | null;
}

export interface StoryMemoryDashboardData {
  openForeshadow?: { id: string; text: string }[];
  resolvedForeshadow?: { id: string; text: string }[];
  openForeshadowCount?: number;
  resolvedForeshadowCount?: number;
  recoveryRate?: number | null;
  callbackRecoveryRate?: number | null;
  mainThreadProgress?: number | null;
  characterArcCompletion?: number | null;
  longGoals?: { id: string; text: string }[];
  characterArcs?: { id: string; character: string; stage?: string }[];
  theme?: string | null;
}

export interface CreationSuggestion {
  id: string;
  source: string;
  priority: string;
  category: string;
  text: string;
  action?: string | null;
}

export interface CreationAssistantData {
  version: string;
  chapter: number;
  summary: string;
  suggestions: CreationSuggestion[];
  sources?: Record<string, boolean>;
  adaptive?: Record<string, { average?: number | null; streak?: number; needsBoost?: boolean }> | null;
  memory?: StoryMemoryDashboardData | null;
  generatedAt?: string;
}

export interface WritingDimensions {
  rhythm?: string;
  atmosphere?: string;
  combat?: string;
  hook?: string;
  infoRelease?: string;
  proseStyle?: string;
  dialogueRatio?: string;
  [key: string]: string | undefined;
}

export interface CanonVersion {
  id: string;
  version: number;
  label: string;
  suggestion?: string;
  at: string;
}

export interface StoryDna {
  title?: string;
  genre?: string;
  reader?: string;
  core_hook?: string;
  main_question?: string;
  main_conflict?: string;
  power_fantasy?: string;
  ending_direction?: string;
  commercial_direction?: string;
  estimated_length?: string;
  selling_point?: string;
  theme?: string;
  audience?: string;
  pitch?: string;
}

export interface CharacterBrain {
  character?: string;
  goals?: { surface?: string; hidden?: string };
  fears?: string[];
  bottom_line?: string;
  current_state?: Record<string, number>;
  growth_arc?: string;
  triggers?: Record<string, Record<string, number>>;
}

export interface CreativeTask {
  id: string;
  label: string;
  priority: string;
  action: string;
  suggestion?: string;
}

export interface CreativeDashboard {
  completion: number;
  modules: { key: string; label: string; done: boolean; weight: number; pct?: number }[];
  tasks: CreativeTask[];
  storyDna?: StoryDna | null;
  hasWorldSimulation?: boolean;
  hasStyleDna?: boolean;
}

export interface ChapterPlan {
  chapter: number;
  goal?: string;
  conflict?: string;
  climax?: string;
  cost?: string;
  hook?: string;
  scenes?: string[];
  emotional_beat?: string;
}

/** 协议渲染器（_tools/generate-chapter-plan.mjs --json）输出的完整 plan */
export interface RenderedPlan {
  chapter: number;
  goal?: string;
  scenes?: string[];
  conflict?: string;
  climax?: string;
  cost?: string;
  hook?: string;
  emotional_beat?: string;
  obstacle1?: string;
  obstacle2?: string;
  ending?: string;
  bargain?: string;
  mustGain?: string;
  pov?: string;
  time?: string;
  location?: string;
  wordTarget?: string | number;
  foreshadow?: string;
  _plan_note?: Record<string, unknown>;
}

/** 渲染器 structuredAudit 的结构化预审 */
export interface PlanRenderAudit {
  pov?: string;
  pov_check?: { ok?: boolean; entrance_chapter?: number };
  chapter_function?: string;
  milestone?: string;
  distance_to_milestone?: number | null;
  vol?: { index?: number; cost_prefix?: string; emotion_baseline?: string };
  gaps?: { advance?: string[]; carried?: string[]; protect?: string[] };
  active_threads?: string[];
  plant_heuristic?: string;
  whitelist_coverage?: { ok?: boolean; missing?: string[] };
  out_path?: string;
  overwrite?: boolean;
}

export interface AiEditorReview {
  mode: string;
  chapter?: number;
  scores?: Record<string, number>;
  issues?: { level: string; text: string }[];
  summary?: string;
}

export interface PromptQuality {
  score: number;
  grade: string;
  missing: { key: string; label: string; penalty: number; suggestion?: string }[];
  autoFix?: string[];
}

export interface LivingNovelStatus {
  storyHealth: number;
  worldStability: number;
  relationChange: number;
  conflictIntensity: number;
  suspenseIndex: number;
  worldState?: Record<string, unknown>;
  hasStoryDna?: boolean;
  characterBrainCount?: number;
  suggestions?: string[];
  metrics?: {
    storyHealth: number;
    worldStability: number;
    relationChange: number;
    conflictIntensity: number;
    suspenseIndex: number;
  };
}

export interface BookStudioConfig {
  temperature?: number;
  model?: string;
  lightModel?: string;
  maxTokens?: number;
  updatedAt?: string;
}

export interface ChapterDiagnosisBeat {
  sceneIndex?: number;
  beatOrder?: number;
  libraryBeat?: string | null;
  hookType?: string | null;
  tensionLevel?: number | null;
  craftMode?: string | null;
  chars?: number | null;
  pass?: boolean | null;
  issues?: string[];
}

export interface ChapterDiagnosisSuggestion {
  id: string;
  severity: 'high' | 'medium' | 'low' | string;
  text: string;
  action?: string;
}

export interface ChapterDiagnosis {
  version: string;
  chapter: number;
  title?: string;
  overallScore: number;
  level: 'green' | 'yellow' | 'red' | string;
  chars: number;
  metrics: {
    hookScore: number | null;
    repetitionRate: number;
    chars: number;
    temperature: number | null;
    beatCount: number;
    softFail?: boolean;
  };
  readerSim?: Record<string, unknown> | null;
  abReport?: { invalidTest?: boolean; winner?: string | null; reason?: string | null } | null;
  anchor?: Record<string, unknown> | null;
  plan?: Record<string, unknown> | null;
  beats: ChapterDiagnosisBeat[];
  trace?: { traceId?: string; htmlPath?: string; pass?: boolean } | null;
  suggestions: ChapterDiagnosisSuggestion[];
  repetitionHits?: string[];
  diagnosedAt?: string;
  toneDeviation?: { deviation: boolean; reason: string; soft?: boolean } | null;
  chapterTone?: ChapterToneDto | null;
  auditStatus?: string | null;
  styleFit?: {
    enabled?: boolean;
    score: number | null;
    hits: string[];
    bannedHits: string[];
    reasons: string[];
    packId?: string;
    label?: string;
  } | null;
  storyMap?: {
    enabled?: boolean;
    chapterFunction?: string;
    arcPhase?: string;
    distanceToMilestone?: number;
    hits?: string[];
    warnings?: string[];
    errors?: string[];
    reasons?: string[];
  } | null;
}

export interface ChapterHealthBadge {
  chapter: number;
  title?: string;
  overallScore: number;
  level: 'green' | 'yellow' | 'red' | string;
  hookScore?: number | null;
  hasText?: boolean;
  auditStatus?: string;
  auditLabel?: string;
}

export interface ChapterAuditRow {
  chapter: number;
  status: string;
  label: string;
  unlocked: boolean;
  /** 是否存在待提交草稿（正文可恢复） */
  hasPending?: boolean;
}

export interface ChapterToneDto {
  chapterIndex: number;
  tone: string;
  coreEvent: string;
  endingDirection: string;
  wordTarget: number;
}

export interface StoryContext {
  storyDna?: StoryDna;
  styleDna?: Record<string, unknown>;
  worldState?: Record<string, unknown>;
  chapterPlan?: ChapterPlan;
  editorFeedback?: Record<string, unknown>;
  characterStates?: Record<string, unknown>;
  promptBlock?: string;
  adaptiveHints?: string[];
}

export interface EditorFeedback {
  chapter?: number;
  commercial_score?: number;
  literary_score?: number;
  serial_score?: number;
  problems?: string[];
  suggestions?: string[];
  review_summary?: string;
}


export interface WorldSection {
  key: string;
  label: string;
}

export interface ModuleData {
  key: string;
  format: string;
  content?: string;
  data?: unknown;
  files?: { name: string; id: string }[];
  editable?: boolean;
}

export const api = {
  getVersion: () => fetchJson<{ runtimeLabel: string; runtimeVersion: string }>('/version'),
  listBooks: () => fetchJson<{ books: Book[] }>('/books').then((r) => r.books),

  getBookStats: (bookId: string) =>
    fetchJson<{ stats: BookStats }>(`/books/${encodeURIComponent(bookId)}/stats`).then((r) => r.stats),
  getDashboard: (bookId: string, chapter?: number) =>
    fetchJson<Dashboard>(`/books/${encodeURIComponent(bookId)}/dashboard${chapter ? `?chapter=${chapter}` : ''}`),

  listModules: (bookId: string) =>
    fetchJson<{ modules: { key: string; alias: string; editable: boolean; isDirectory: boolean }[] }>(
      `/books/${encodeURIComponent(bookId)}/modules`,
    ),

  getModule: (bookId: string, key: string) =>
    fetchJson<ModuleData>(`/books/${encodeURIComponent(bookId)}/modules/${key}`),

  getModuleFile: (bookId: string, key: string, file: string) =>
    fetchJson<ModuleData>(
      `/books/${encodeURIComponent(bookId)}/modules/${encodeURIComponent(key)}/${encodeURIComponent(file)}`,
    ),

  putModule: (bookId: string, key: string, content: string) =>
    fetchJson(`/books/${encodeURIComponent(bookId)}/modules/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }),

  putModuleFile: (bookId: string, key: string, file: string, content: string) =>
    fetchJson(
      `/books/${encodeURIComponent(bookId)}/modules/${encodeURIComponent(key)}/${encodeURIComponent(file)}`,
      {
        method: 'PUT',
        body: JSON.stringify({ content }),
      },
    ),

  deleteModuleFile: (bookId: string, key: string, file: string) =>
    fetchJson(
      `/books/${encodeURIComponent(bookId)}/modules/${encodeURIComponent(key)}/${encodeURIComponent(file)}`,
      { method: 'DELETE' },
    ),

  getPromptAnalytics: (bookId: string, chapter: number) =>
    fetchJson<{ analytics: PromptAnalytics }>(
      `/books/${encodeURIComponent(bookId)}/prompt-analytics?chapter=${chapter}`,
    ).then((r) => r.analytics),

  /** F2: READ-ONLY Final Context Viewer (L1–L4) */
  getFinalContext: (bookId: string, chapter: number, scene?: number, includeText = false) =>
    fetchJson<{
      readOnly: boolean;
      chapter: number;
      snapshots?: FinalContextSnapshot[];
      snapshot?: FinalContextSnapshot | null;
      integrity?: { ok: boolean; reasons?: string[] } | Array<{ sceneIndex: number; ok: boolean; reasons?: string[] }>;
    }>(
      `/books/${encodeURIComponent(bookId)}/final-context?chapter=${chapter}${
        scene ? `&scene=${scene}` : ''
      }${includeText ? '&text=1' : ''}`,
    ),

  getSceneBudget: (bookId: string, chapter: number, scene?: number) =>
    fetchJson<{ budget?: SceneBudgetReport; budgets?: SceneBudgetReport[] }>(
      `/books/${encodeURIComponent(bookId)}/scene-budget?chapter=${chapter}${scene ? `&scene=${scene}` : ''}`,
    ).then((r) => (scene ? r.budget ?? null : r.budgets ?? [])),

  getHashDependencyTree: (bookId: string, chapter: number) =>
    fetchJson<{ tree: HashDependencyTree | null }>(
      `/books/${encodeURIComponent(bookId)}/hash-dependency-tree?chapter=${chapter}`,
    ).then((r) => r.tree),

  getStoryMemory: (bookId: string, chapter: number) =>
    fetchJson<{
      memory: {
        metrics?: Record<string, unknown>;
        dashboard?: StoryMemoryDashboardData;
        hints?: { type: string; text: string; priority?: string }[];
      } | null;
      chapter: number;
    }>(`/books/${encodeURIComponent(bookId)}/story-memory?chapter=${chapter}`),

  getCreationSuggestions: (bookId: string, chapter: number) =>
    fetchJson<{ assistant: CreationAssistantData; chapter: number }>(
      `/books/${encodeURIComponent(bookId)}/creation-suggestions?chapter=${chapter}`,
    ),

  getWriterOptimizer: (bookId: string, chapter: number, scene?: number) =>
    fetchJson<{ scenes?: WriterOptimizerReport[] } & WriterOptimizerReport>(
      `/books/${encodeURIComponent(bookId)}/writer-optimizer?chapter=${chapter}${scene ? `&scene=${scene}` : ''}`,
    ).then((r) => {
      if (scene) {
        const { scenes: _s, ...rest } = r;
        return rest as WriterOptimizerReport;
      }
      return r.scenes ?? [];
    }),

  copilot: (bookId: string, message: string) =>
    fetchJson(`/books/${encodeURIComponent(bookId)}/copilot`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  subscribeEvents: (bookId: string, onEvent: (data: unknown) => void) => {
    const es = new EventSource(`${BASE}/books/${encodeURIComponent(bookId)}/stream`);
    es.onmessage = (e) => {
      try { onEvent(JSON.parse(e.data)); } catch { /* skip */ }
    };
    return () => es.close();
  },

  /** Runtime SSE — 全局路径别名 */
  subscribeRuntimeEvents: (bookId: string, onEvent: (data: RuntimeEvent) => void) => {
    const es = new EventSource(`${BASE}/runtime/events/${encodeURIComponent(bookId)}`);
    es.onmessage = (e) => {
      try { onEvent(JSON.parse(e.data)); } catch { /* skip */ }
    };
    es.onerror = () => { /* 轮询兜底 */ };
    return () => es.close();
  },

  getRuntimeEvents: (bookId: string, since = 0) =>
    fetchJson<{ events: Record<string, unknown>[]; nextSince?: number }>(
      `/books/${encodeURIComponent(bookId)}/runtime/events?since=${since}`,
    ).then((r) => ({
      events: r.events || [],
      nextSince: r.nextSince ?? since + (r.events?.length || 0),
    })),

  getRuntimeState: (bookId: string) =>
    fetchJson<{ state: Record<string, unknown> }>(
      `/books/${encodeURIComponent(bookId)}/runtime/state`,
    ).then((r) => r.state || {}),

  getRuntimeDebug: (bookId: string) =>
    fetchJson<{ report: Record<string, unknown>; text: string }>(
      `/books/${encodeURIComponent(bookId)}/runtime/debug`,
    ),

  getCreationInsights: (bookId: string) =>
    fetchJson<{ insights: CreationInsights }>(`/books/${encodeURIComponent(bookId)}/creation-insights`)
      .then((r) => r.insights),

  runtimeRun: (bookId: string, chapter: number, opts?: { force?: boolean; resume?: boolean; living?: boolean }) =>
    fetchJson(`/books/${encodeURIComponent(bookId)}/runtime/run`, {
      method: 'POST',
      body: JSON.stringify({ chapter, ...opts }),
    }),

  runtimeRunLiving: async (
    bookId: string,
    chapter: number,
    opts?: {
      force?: boolean;
      resume?: boolean;
      plan?: ChapterPlan;
      signal?: AbortSignal;
      onTaskId?: (taskId: string) => void;
    },
  ) => {
    const { signal, onTaskId, ...bodyOpts } = opts || {};
    const res = await fetch(`${BASE}/books/${encodeURIComponent(bookId)}/runtime/run-living`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapter, ...bodyOpts }),
      signal,
    });
    const data = await res.json() as {
      ok?: boolean;
      accepted?: boolean;
      async?: boolean;
      taskId?: string;
      result?: Record<string, unknown> & { livingEvolution?: Record<string, unknown>; error?: string };
      error?: string;
      message?: string;
    };

    // 异步受理：202 + taskId → 等待终态后再返回（兼容旧同步 200）
    if (res.status === 202 || data.async || data.taskId) {
      if (!res.ok && res.status !== 202) {
        throw new Error(String(data.error || data.message || `章节生成受理失败 (${res.status})`));
      }
      const taskId = data.taskId;
      if (!taskId) {
        throw new Error('服务器未返回 taskId，无法跟踪章节生成进度');
      }
      onTaskId?.(taskId);
      const done = await waitForLivingTask(taskId, { signal });
      if (done.status !== 'completed') {
        throw new LivingTaskError(
          String(done.error || data.message || `章节生成失败（${done.status || 'unknown'}）`),
          String(done.status || 'FAILED').toUpperCase(),
        );
      }
      const normalized = normalizeLivingRunPayload(done.result, taskId);
      if (normalized.result.pass === false || normalized.result.error) {
        throw new Error(String(
          normalized.result.error
          || (normalized.result as { message?: string }).message
          || '章节生成未完成',
        ));
      }
      return normalized;
    }

    if (!res.ok) {
      throw new Error(String(data.error || data.result?.error || `章节生成失败 (${res.status})`));
    }
    const errMsg = data.error || data.result?.error;
    if (data.ok === false || data.result?.pass === false || errMsg) {
      throw new Error(String(errMsg || '章节生成未完成'));
    }
    return normalizeLivingRunPayload(data.result || data);
  },

  livingPrepare: (bookId: string, chapter: number, plan?: ChapterPlan) =>
    fetchJson(`/books/${encodeURIComponent(bookId)}/living/prepare`, {
      method: 'POST', body: JSON.stringify({ chapter, plan }),
    }),

  livingEvolve: (bookId: string, chapter: number) =>
    fetchJson<{ evolution: Record<string, unknown> }>(
      `/books/${encodeURIComponent(bookId)}/living/evolve`,
      { method: 'POST', body: JSON.stringify({ chapter }) },
    ).then((r) => r.evolution),

  getLivingStatus: (bookId: string) =>
    fetchJson<{ status: LivingNovelStatus }>(`/books/${encodeURIComponent(bookId)}/living-status`).then((r) => r.status),

  getStoryContext: (bookId: string, chapter?: number) =>
    fetchJson<{ context: StoryContext }>(
      `/books/${encodeURIComponent(bookId)}/story-context${chapter ? `?chapter=${chapter}` : ''}`,
    ).then((r) => r.context),

  getChapterPlan: (bookId: string, chapter: number) =>
    fetchJson<{ plan: ChapterPlan | null }>(`/books/${encodeURIComponent(bookId)}/chapter-plans/${chapter}`).then((r) => r.plan),

  saveChapterPlan: (bookId: string, chapter: number, plan: ChapterPlan) =>
    fetchJson(`/books/${encodeURIComponent(bookId)}/chapter-plans/${chapter}`, {
      method: 'PUT', body: JSON.stringify(plan),
    }),

  /** 协议渲染器 dry-run（不落盘）；plan/audit 来自渲染器 --json 输出 */
  renderChapterPlanPreview: (bookId: string, chapter: number, opts?: { plant?: string; overrides?: { goal?: string; scenes?: string[] } }) =>
    fetchJson<{ ok: boolean; plan?: RenderedPlan | null; audit?: PlanRenderAudit | null }>(
      `/books/${encodeURIComponent(bookId)}/chapter-plans/${chapter}/render-preview`,
      { method: 'POST', body: JSON.stringify(opts || {}) },
    ),

  /** 协议渲染器写盘（--force）；commit 由渲染器重跑卫生校验，失败 4xx 不落盘 */
  renderChapterPlanCommit: (bookId: string, chapter: number, opts?: { plant?: string; overrides?: { goal?: string; scenes?: string[] }; force?: boolean }) =>
    fetchJson<{ ok: boolean; plan?: RenderedPlan | null; audit?: PlanRenderAudit | null; outPath?: string }>(
      `/books/${encodeURIComponent(bookId)}/chapter-plans/${chapter}/render-commit`,
      { method: 'POST', body: JSON.stringify(opts || {}) },
    ),

  getWorldState: (bookId: string) =>
    fetchJson<{ worldState: Record<string, unknown> | null }>(`/books/${encodeURIComponent(bookId)}/world-state`).then((r) => r.worldState),

  saveWorldState: (bookId: string, worldState: Record<string, unknown>) =>
    fetchJson<{ worldState: Record<string, unknown> }>(`/books/${encodeURIComponent(bookId)}/world-state`, {
      method: 'PUT', body: JSON.stringify(worldState),
    }).then((r) => r.worldState),

  getEditorFeedback: (bookId: string, chapter: number) =>
    fetchJson<{ feedback: EditorFeedback | null }>(`/books/${encodeURIComponent(bookId)}/editor-feedback/${chapter}`).then((r) => r.feedback),

  evolveCharacter: (bookId: string, charName: string, chapter: number) =>
    fetchJson(`/books/${encodeURIComponent(bookId)}/characters/${encodeURIComponent(charName)}/evolve`, {
      method: 'POST', body: JSON.stringify({ chapter }),
    }),

  runtimeResume: (bookId: string, chapter: number) =>
    fetchJson(`/books/${encodeURIComponent(bookId)}/runtime/resume`, {
      method: 'POST',
      body: JSON.stringify({ chapter }),
    }),

  runtimeReplan: (bookId: string, chapter: number) =>
    fetchJson(`/books/${encodeURIComponent(bookId)}/runtime/replan`, {
      method: 'POST',
      body: JSON.stringify({ chapter }),
    }),

  runtimeNext: async (bookId: string) => {
    const res = await fetch(`${BASE}/books/${encodeURIComponent(bookId)}/runtime/next`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const data = await res.json() as {
      ok?: boolean;
      result?: Record<string, unknown> & { pass?: boolean; error?: string; message?: string; chapter?: number };
      error?: string;
    };
    if (!res.ok || data.ok === false || data.result?.pass === false || data.error || data.result?.error) {
      throw new Error(String(data.error || data.result?.error || data.result?.message || '下一章生成失败'));
    }
    return { result: data.result || {} };
  },

  runtimeRetry: (bookId: string, chapter: number) =>
    fetchJson(`/books/${encodeURIComponent(bookId)}/runtime/retry`, {
      method: 'POST',
      body: JSON.stringify({ chapter }),
    }),

  runtimeRollback: (bookId: string, snapshotId: string) =>
    fetchJson(`/books/${encodeURIComponent(bookId)}/runtime/rollback`, {
      method: 'POST',
      body: JSON.stringify({ snapshotId }),
    }),

  daemonStart: (bookId: string) =>
    fetchJson(`/books/${encodeURIComponent(bookId)}/runtime/daemon/start`, { method: 'POST', body: '{}' }),

  daemonStop: (bookId: string) =>
    fetchJson(`/books/${encodeURIComponent(bookId)}/runtime/daemon/stop`, { method: 'POST', body: '{}' }),

  listSnapshots: (bookId: string) =>
    fetchJson<{ snapshots: { id: string; label: string; chapter: number }[] }>(
      `/books/${encodeURIComponent(bookId)}/memory/snapshots`,
    ).then((r) => r.snapshots),

  listPresets: () =>
    fetchJson<{ presets: { id: string; genre: string; description: string }[] }>('/presets').then((r) => r.presets),

  createBook: (data: {
    title: string;
    pitch: string;
    preset: string;
    content?: WizardContent;
    storyDna?: StoryDna;
    chapterTones?: ChapterToneDto[];
    volumeChapterCount?: number;
    styleSample?: string;
    styleGenePack?: string;
    openingHook?: string;
    coreMystery?: string;
    primaryPov?: string;
    secondaryPov?: string;
    conflictCalibration?: {
      core_conflict?: string;
      stakes?: string;
      escalation_phases?: unknown[];
    };
  }) =>
    fetchJson<{ bookId: string; title: string }>('/books', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getStoryMap: (bookId: string, chapter?: number) =>
    fetchJson<{
      enabled: boolean;
      map: unknown;
      chapterCtx?: unknown;
      povCheck?: { ok: boolean; warnings: string[]; errors: string[] };
    }>(
      `/books/${encodeURIComponent(bookId)}/story-map${chapter ? `?chapter=${chapter}` : ''}`,
    ),

  scaffoldStoryMap: (bookId: string, body: Record<string, unknown>) =>
    fetchJson<{ ok: boolean; draft: unknown; map: unknown }>(
      `/books/${encodeURIComponent(bookId)}/story-map/scaffold`,
      { method: 'POST', body: JSON.stringify(body) },
    ),

  saveStoryMap: (bookId: string, map: unknown) =>
    fetchJson<{ ok: boolean; map: unknown }>(
      `/books/${encodeURIComponent(bookId)}/story-map`,
      { method: 'PUT', body: JSON.stringify({ map }) },
    ),

  /** Wizard 步骤 — 建书前无 bookId */
  aiGenerateGlobal: (body: {
    module: string;
    pitch?: string;
    preset?: string;
    title?: string;
    action?: string;
    role?: string;
    prompt?: string;
  }) =>
    fetchJson<{ result: Record<string, unknown> }>('/ai/generate', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  aiGenerateWorld: (body: { pitch: string; preset: string; title?: string; storyDna?: StoryDna }) =>
    fetchJson<{ result: Record<string, unknown> }>('/ai/generate/world', {
      method: 'POST', body: JSON.stringify(body),
    }),

  aiGenerateWriting: (body: { pitch: string; preset: string; title?: string; storyDna?: StoryDna }) =>
    fetchJson<{ result: Record<string, unknown> }>('/ai/generate/writing', {
      method: 'POST', body: JSON.stringify(body),
    }),

  aiGenerateCharacters: (body: { pitch: string; preset: string; title?: string; storyDna?: StoryDna }) =>
    fetchJson<{ result: Record<string, unknown> }>('/ai/generate/characters', {
      method: 'POST', body: JSON.stringify(body),
    }),

  aiGenerateFactions: (body: { pitch: string; preset: string; title?: string; storyDna?: StoryDna }) =>
    fetchJson<{ result: Record<string, unknown> }>('/ai/generate/factions', {
      method: 'POST', body: JSON.stringify(body),
    }),

  aiGenerateVolume: (body: {
    pitch: string;
    preset: string;
    title?: string;
    storyDna?: StoryDna;
    context?: { upstreamBrief?: string; brief?: string; role?: string };
  }) =>
    fetchJson<{ result: Record<string, unknown> }>('/ai/generate/volume', {
      method: 'POST', body: JSON.stringify(body),
    }),

  aiGenerateChapterTask: (body: {
    pitch: string;
    preset: string;
    title?: string;
    storyDna?: StoryDna;
    context?: { upstreamBrief?: string; brief?: string };
  }) =>
    fetchJson<{ result: Record<string, unknown> }>('/ai/generate/chapter-task', {
      method: 'POST', body: JSON.stringify(body),
    }),

  getVolumePlan: (bookId: string, vol = 1) =>
    fetchJson<{
      volume: number;
      file: string;
      markdown: string;
      editable: boolean;
      isStale: boolean;
      changedParts: string[];
      partLabels?: Record<string, string>;
      lastEditedAt?: string | null;
      editedBy?: string | null;
      generatedAt?: string | null;
    }>(`/books/${encodeURIComponent(bookId)}/volume-plan/${vol}`),

  saveVolumePlan: (bookId: string, body: {
    markdown: string;
    vol?: number;
    refreshFingerprint?: boolean;
    editedBy?: string;
  }) =>
    fetchJson<{
      volume: number;
      markdown: string;
      isStale: boolean;
      changedParts: string[];
      lastEditedAt?: string | null;
    }>(`/books/${encodeURIComponent(bookId)}/volume-plan/${body.vol || 1}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  checkWorldBoundary: (body: { worldMarkdown?: string; genre?: string; title?: string }) =>
    fetchJson<{ report: string; source?: string }>('/ai/wizard/world-boundary', {
      method: 'POST', body: JSON.stringify(body),
    }),

  trialWriteOpening: (body: {
    title?: string;
    genre?: string;
    openingHook?: string;
    coreMystery?: string;
    beatPlan?: Record<string, string>;
    chapter1Hook?: string;
    protagonist?: string;
    sentenceStyle?: string;
    worldExcerpt?: string;
  }) =>
    fetchJson<{ text: string; source?: string; previewOnly?: boolean; error?: string }>(
      '/ai/wizard/trial-opening',
      { method: 'POST', body: JSON.stringify(body) },
    ),

  aiGenerate: (bookId: string, body: Record<string, unknown>) =>
    fetchJson<{ result: { markdown?: string; fields?: Record<string, unknown>; source?: string } }>(
      `/books/${encodeURIComponent(bookId)}/ai/generate`,
      { method: 'POST', body: JSON.stringify(body) },
    ),

  listChapters: (bookId: string) =>
    fetchJson<{ chapters: { number: number; title: string; hasText?: boolean }[] }>(
      `/books/${encodeURIComponent(bookId)}/chapters`,
    ).then((r) => r.chapters),

  getChapterText: (bookId: string, chapter: number) =>
    fetchJson<{ chapter: number; title: string; text: string; scenes?: Scene[]; run?: Record<string, unknown> }>(
      `/books/${encodeURIComponent(bookId)}/chapters/${chapter}/text`,
    ),

  saveChapterText: (bookId: string, chapter: number, text: string, title?: string) =>
    fetchJson<{ ok: boolean; chapter: number; title: string; text: string; file?: string; savedAt?: string }>(
      `/books/${encodeURIComponent(bookId)}/chapters/${chapter}/text`,
      {
        method: 'PUT',
        body: JSON.stringify({ text, title }),
      },
    ),

  getChapterDiagnosis: (bookId: string, chapter: number) =>
    fetchJson<{ diagnosis: ChapterDiagnosis }>(
      `/books/${encodeURIComponent(bookId)}/chapters/${chapter}/diagnosis`,
    ).then((r) => r.diagnosis),

  acceptChapter: (bookId: string, chapter: number, title?: string) =>
    fetchJson<{ ok: boolean; nextChapterUnlocked: boolean; nextChapter: number; chapter: number }>(
      `/books/${encodeURIComponent(bookId)}/chapters/${chapter}/accept`,
      { method: 'POST', body: JSON.stringify({ title }) },
    ),

  deleteChapterDraft: (bookId: string, chapter: number) =>
    fetchJson<{ ok: boolean; chapter: number; status: string; purged?: string[] }>(
      `/books/${encodeURIComponent(bookId)}/chapters/${chapter}/draft`,
      { method: 'DELETE' },
    ),

  optimizeChapter: (
    bookId: string,
    chapter: number,
    strategy: 'enhance-ending' | 'fix-repetition' | 'inject-scenery' | 'deep-rewrite',
  ) =>
    fetchJson<{ ok: boolean; chapter: number; strategy: string; note: string; text: string }>(
      `/books/${encodeURIComponent(bookId)}/chapters/${chapter}/optimize`,
      { method: 'POST', body: JSON.stringify({ strategy }) },
    ),

  listChapterAudit: (bookId: string, max = 10) =>
    fetchJson<{
      unlockedThrough: number;
      chapters: ChapterAuditRow[];
    }>(`/books/${encodeURIComponent(bookId)}/chapters/audit?max=${max}`),

  getWizardChapterTones: (bookId: string) =>
    fetchJson<{ tones?: ChapterToneDto[] | { tones?: ChapterToneDto[] } | null }>(
      `/books/${encodeURIComponent(bookId)}/wizard/chapter-tones`,
    ).then((r) => {
      if (Array.isArray(r.tones)) return r.tones;
      if (r.tones && Array.isArray((r.tones as { tones?: ChapterToneDto[] }).tones)) {
        return (r.tones as { tones: ChapterToneDto[] }).tones;
      }
      return [];
    }),

  saveWizardChapterTones: (bookId: string, tones: ChapterToneDto[]) =>
    fetchJson<{ ok: boolean; tones?: ChapterToneDto[] }>(
      `/books/${encodeURIComponent(bookId)}/wizard/chapter-tones`,
      { method: 'PUT', body: JSON.stringify({ tones }) },
    ),

  listChapterHealth: (bookId: string) =>
    fetchJson<{ health: ChapterHealthBadge[]; audit?: { chapters?: ChapterAuditRow[] } }>(
      `/books/${encodeURIComponent(bookId)}/chapters/health`,
    ).then((r) => ({ health: r.health || [], audit: r.audit })),

  getBookConfig: (bookId: string) =>
    fetchJson<{ config: BookStudioConfig }>(
      `/books/${encodeURIComponent(bookId)}/config`,
    ).then((r) => r.config || {}),

  saveBookConfig: (bookId: string, config: Partial<BookStudioConfig>) =>
    fetchJson<{ ok: boolean; config: BookStudioConfig }>(
      `/books/${encodeURIComponent(bookId)}/config`,
      { method: 'PUT', body: JSON.stringify(config) },
    ).then((r) => r.config),

  /** Task SSE */
  subscribeTaskStream: (taskId: string, onEvent: (data: unknown) => void) => {
    const es = new EventSource(`${BASE}/tasks/${encodeURIComponent(taskId)}/stream`);
    es.onmessage = (e) => {
      try { onEvent(JSON.parse(e.data)); } catch { /* skip */ }
    };
    return () => es.close();
  },

  // ── Creator Loop V3.5 ──
  getWritingDimensions: (preset: string) =>
    fetchJson<{ dimensions: WritingDimensions; labels: { key: string; label: string }[] }>(
      `/ai/writing/dimensions?preset=${encodeURIComponent(preset)}`,
    ),

  optimizeWritingDimensions: (body: { dimensions: WritingDimensions; suggestion: string; preset?: string; title?: string }) =>
    fetchJson<{ dimensions: WritingDimensions; markdown: string; fields?: Record<string, unknown> }>(
      '/ai/writing/optimize',
      { method: 'POST', body: JSON.stringify(body) },
    ),

  aiCocreate: (body: { pitch: string; preset: string; title?: string; storyDna?: StoryDna }) =>
    fetchJson<{ result: Record<string, unknown> }>('/ai/cocreate', { method: 'POST', body: JSON.stringify(body) }),

  aiIncremental: (body: {
    module: string; current?: string; suggestion: string; section?: string;
    pitch?: string; preset?: string; title?: string; storyDna?: StoryDna; action?: string;
  }) =>
    fetchJson<{ result: { markdown?: string; source?: string } }>(
      '/ai/incremental', { method: 'POST', body: JSON.stringify(body) },
    ),

  creatorIncremental: (bookId: string, body: {
    module: string; current?: string; suggestion: string; section?: string;
    pitch?: string; preset?: string; title?: string; storyDna?: StoryDna; file?: string; action?: string;
  }) =>
    fetchJson<{ result: { markdown?: string; version?: { id: string } } }>(
      `/books/${encodeURIComponent(bookId)}/creator/incremental`,
      { method: 'POST', body: JSON.stringify(body) },
    ),

  listCanonVersions: (bookId: string, moduleKey: string, file?: string) =>
    fetchJson<{ versions: CanonVersion[]; worldSections?: WorldSection[] }>(
      `/books/${encodeURIComponent(bookId)}/modules/${encodeURIComponent(moduleKey)}/versions${file ? `?file=${encodeURIComponent(file)}` : ''}`,
    ),

  compareCanonVersions: (bookId: string, moduleKey: string, from: string, to: string, file?: string) =>
    fetchJson<{ diff: { line: number; type: string; text?: string; from?: string; to?: string }[] }>(
      `/books/${encodeURIComponent(bookId)}/modules/${encodeURIComponent(moduleKey)}/versions/compare?from=${from}&to=${to}${file ? `&file=${encodeURIComponent(file)}` : ''}`,
    ),

  restoreCanonVersion: (bookId: string, moduleKey: string, versionId: string, file?: string) =>
    fetchJson(`/books/${encodeURIComponent(bookId)}/modules/${encodeURIComponent(moduleKey)}/versions/${encodeURIComponent(versionId)}/restore`, {
      method: 'POST',
      body: JSON.stringify({ file }),
    }),

  listSavedStyles: () => fetchJson<{ styles: { id: string; name: string }[] }>('/styles').then((r) => r.styles),
  getSavedStyle: (id: string) =>
    fetchJson<{ style: { id: string; name: string; dimensions: WritingDimensions; sourcePreset?: string } }>(
      `/styles/${encodeURIComponent(id)}`,
    ).then((r) => r.style),
  saveStyle: (body: { id?: string; name: string; dimensions: WritingDimensions; writing?: Record<string, unknown>; sourcePreset?: string }) =>
    fetchJson<{ style: { id: string; name: string } }>('/styles', { method: 'POST', body: JSON.stringify(body) }).then((r) => r.style),
  deleteSavedStyle: (id: string) =>
    fetchJson(`/styles/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  duplicateSavedStyle: (id: string, name?: string) =>
    fetchJson<{ style: { id: string; name: string } }>(`/styles/${encodeURIComponent(id)}/duplicate`, {
      method: 'POST', body: JSON.stringify({ name }),
    }).then((r) => r.style),

  // ── Creator Intelligence V3.6 ──
  storyDirector: async (pitch: string) => {
    const body = JSON.stringify({ pitch });
    const paths = ['/ai/story-director', '/ai/generate/story-director'];
    let lastErr: Error | null = null;
    for (const path of paths) {
      try {
        const res = await fetchJson<{ dna?: StoryDna; source?: string; result?: { dna: StoryDna; source: string } }>(
          path, { method: 'POST', body },
        );
        const dna = res?.dna || res?.result?.dna;
        if (dna) return { dna, source: res.source || res.result?.source || 'llm' };
      } catch (e) {
        lastErr = e as Error;
        if (!lastErr.message.includes('Not found') && !lastErr.message.includes('404')) break;
      }
    }
    throw lastErr || new Error('Story Director 请求失败');
  },

  getStoryDna: (bookId: string) =>
    fetchJson<{ dna: StoryDna | null }>(`/books/${encodeURIComponent(bookId)}/story-dna`).then((r) => r.dna),

  getSystemFile: (bookId: string, name: string) =>
    fetchJson<{ data: Record<string, unknown> | null }>(
      `/books/${encodeURIComponent(bookId)}/system/${encodeURIComponent(name)}`,
    ).then((r) => r.data),

  saveStoryDna: (bookId: string, dna: StoryDna) =>
    fetchJson<{ dna: StoryDna }>(`/books/${encodeURIComponent(bookId)}/story-dna`, {
      method: 'PUT', body: JSON.stringify(dna),
    }).then((r) => r.dna),

  getConflictCalibration: (bookId: string) =>
    fetchJson<{
      calibration: {
        core_conflict?: string;
        stakes?: string;
        escalation_phases?: { chapter?: number; tone?: string; event?: string; ending?: string }[];
      } | null;
    }>(`/books/${encodeURIComponent(bookId)}/conflict-calibration`).then((r) => r.calibration),

  saveConflictCalibration: (bookId: string, calibration: {
    core_conflict?: string;
    stakes?: string;
    escalation_phases?: unknown[];
  }) =>
    fetchJson<{ calibration: Record<string, unknown> }>(
      `/books/${encodeURIComponent(bookId)}/conflict-calibration`,
      { method: 'PUT', body: JSON.stringify(calibration) },
    ).then((r) => r.calibration),

  getCreativeDashboard: (bookId: string) =>
    fetchJson<{ dashboard: CreativeDashboard }>(`/books/${encodeURIComponent(bookId)}/creative-dashboard`).then((r) => r.dashboard),

  worldSimulate: (bookId: string, years = 10) =>
    fetchJson<{ simulation: Record<string, unknown>; source: string }>(
      `/books/${encodeURIComponent(bookId)}/world-simulate`,
      { method: 'POST', body: JSON.stringify({ years }) },
    ),

  analyzeCharacterBrain: (bookId: string, charName: string) =>
    fetchJson<{ brain: CharacterBrain; source: string }>(
      `/books/${encodeURIComponent(bookId)}/characters/${encodeURIComponent(charName)}/brain`,
      { method: 'POST', body: JSON.stringify({}) },
    ),

  getCharacterBrain: (bookId: string, charName: string) =>
    fetchJson<{ brain: CharacterBrain | null }>(
      `/books/${encodeURIComponent(bookId)}/characters/${encodeURIComponent(charName)}/brain`,
    ).then((r) => r.brain),

  extractStyleDna: (body: { preset?: string; sampleText?: string }) =>
    fetchJson<{ styleDna: Record<string, unknown>; source: string }>('/ai/style-dna', {
      method: 'POST', body: JSON.stringify(body),
    }),

  saveStyleDna: (bookId: string, styleDna: Record<string, unknown>) =>
    fetchJson(`/books/${encodeURIComponent(bookId)}/system/style_dna`, {
      method: 'PUT', body: JSON.stringify(styleDna),
    }),

  chapterDirector: (bookId: string, chapter: number, pitch?: string) =>
    fetchJson<{ plan: ChapterPlan; storyDna?: StoryDna }>(
      `/books/${encodeURIComponent(bookId)}/chapter-director`,
      { method: 'POST', body: JSON.stringify({ chapter, pitch }) },
    ),

  aiEditor: (bookId: string, body: { mode: string; content?: string; chapter?: number }) =>
    fetchJson<{ review: AiEditorReview }>(
      `/books/${encodeURIComponent(bookId)}/ai-editor`,
      { method: 'POST', body: JSON.stringify(body) },
    ).then((r) => r.review),

  promptQuality: (body: Record<string, unknown>) =>
    fetchJson<PromptQuality>('/ai/prompt-quality', { method: 'POST', body: JSON.stringify(body) }),

  conversationCreate: (messages: { role: string; content: string }[], state?: Record<string, unknown>) =>
    fetchJson<{ reply: string; state: Record<string, unknown>; ready: boolean; dna?: StoryDna }>(
      '/ai/conversation', { method: 'POST', body: JSON.stringify({ messages, state }) },
    ),
};
