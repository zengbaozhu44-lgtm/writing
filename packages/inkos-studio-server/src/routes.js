import { RuntimeDaemon, applyDaemonExecutionGuard, formatDebugReport } from '../../inkos-runtime/src/index.js';
import { StudioRuntimeOrchestrator } from './studio-orchestrator.js';
import { isLlmConfigured } from '../../inkos-brain/src/writer/llm-writer.js';
import { createStudioLlmWriter } from './studio-llm-writer.js';
import { createSceneLifecycleHook } from './scene-lifecycle-bridge.js';
import { listBooks, resolveBookDir, getBookMeta, loadScenes, loadPlan } from './book-service.js';
import { listBooksWithStats, getBookStats } from './book-stats.js';
import { loadBrainRun } from '../../inkos-brain/src/runtime/brain-runtime.js';
import {
  assembleDashboard,
  readHealth,
  readState,
  readWorld,
  readMemorySnapshots,
  readMemoryDiff,
  readPromptAnalytics,
} from './runtime-reader.js';
import { readStudioPromptMetrics, readSceneBudget, readChapterBudgets } from './studio-metrics-reader.js';
import { readHashDependencyTree } from './hash-dependency-bridge.js';
import { readStoryMemory } from './story-memory-bridge.js';
import { readCreationSuggestions } from './creation-assistant-bridge.js';
import { readWriterOptimizerScene, readChapterWriterOptimizer } from './writer-optimizer-reader.js';
import {
  controlRun,
  controlRunLiving,
  controlResume,
  controlRetry,
  controlReplan,
  controlNext,
  controlRollback,
  controlPause,
  controlDaemonStart,
  controlDaemonStop,
} from './runtime-control.js';
import {
  acceptLivingChapterRun,
  getLivingTask,
  streamLivingTask,
} from './living-task.js';
import {
  normalizeDashboard,
  normalizeScenes,
  normalizePlanner,
  normalizeHealth,
  normalizeEvents,
  normalizeMemory,
  normalizeVersion,
} from './compatibility.js';
import { isForbidden, matchRoute, Permission } from './api-gateway.js';
import { formatRuntimeEvent, subscribeSSE, wireEventBroadcast, getEventBufferSlice } from './event-stream.js';
import { getBookExecutionGuard } from './execution-guard-store.js';
import { formatStreamPayload } from './runtime-ui-map.js';
import { listModules, readModule, writeModule, deleteModuleFile } from './module-service.js';
import { createBookFromWizard } from './book-wizard.js';
import { generateModule, checkWorldBoundary, trialWriteOpening } from './ai-service.js';
import {
  getVolumePlan,
  saveVolumePlan,
  VOLUME_PART_LABELS,
  readConflictCalibration,
  saveConflictCalibration,
} from './volume-plan.js';
import { listPresets } from './presets.js';
import { listChapters, getChapterText, getChapterMeta, saveChapterText } from './chapter-service.js';
import { buildChapterDiagnosis, listChapterHealth } from './diagnosis-service.js';
import {
  acceptChapter,
  deleteChapterDraft,
  optimizeChapter,
  listChapterAuditStatuses,
  saveWizardChapterTones,
  loadWizardChapterTones,
  getChapterStatus,
} from './chapter-audit.js';
import {
  loadStoryMap,
  saveStoryMap,
  scaffoldStoryMap,
  hasStoryMap,
  resolveChapterMapContext,
  validatePovGrid,
  diagnoseStoryMapChapter,
} from './story-map/store.js';
import { parseCopilotIntent, executeCopilotAction } from './copilot-service.js';
import { getCreationInsights } from './canon-analyzer.js';
import {
  incrementalUpdate,
  incrementalUpdateAndSave,
  optimizeWritingDimensions,
  presetToDimensions,
  dimensionsToWritingMd,
  cocreateFromPitch,
  WORLD_SECTIONS,
} from './creator-loop.js';
import {
  listVersions,
  getVersion,
  compareVersions,
  saveVersion,
} from './version-store.js';
import {
  listSavedStyles,
  getSavedStyle,
  saveStyle,
  deleteStyle,
  duplicateStyle,
} from './style-store.js';
import { DIMENSION_LABELS } from './presets.js';
import {
  analyzeStoryDirector,
  simulateWorld,
  analyzeCharacterBrain,
  runAiEditor,
  extractStyleDna,
  designChapterDirector,
  scorePromptQuality,
  conversationCreate,
  getCreativeDashboard,
  saveStoryDirector,
  saveWorldSimulation,
  saveStyleDna,
  saveCharacterBrainState,
  loadCharacterBrainState,
} from './creator-intelligence.js';
import { readSystemFile, writeSystemFile, readStoryDna, readWorldState, writeWorldState, readChapterPlan, writeChapterPlan, readEditorFeedback, ensureLivingNovelDirs } from './system-store.js';
import {
  buildNovelIntelligenceContext,
} from './story-context-provider.js';
import {
  persistChapterPlan,
  prepareChapterRun,
  runPostChapterEvolution,
  evolveCharacterBrains,
  evolveWorldState,
  runEditorFeedbackLoop,
  getLivingNovelStatus,
  getStoryContext,
  syncWorldStateFromSimulation,
  initWorldStateIfNeeded,
} from './living-novel-engine.js';

const daemons = new Map();
const eventBuffers = new Map();

function getDaemon(bookDir, bookId) {
  if (!daemons.has(bookDir)) {
    const guard = getBookExecutionGuard(bookDir);
    const writer = isLlmConfigured() ? createStudioLlmWriter(bookDir, bookId, guard) : null;
    const sceneLifecycleHook = createSceneLifecycleHook(bookDir, bookId);
    const daemon = new RuntimeDaemon(bookDir, { writer, autoWrite: Boolean(writer), sceneLifecycleHook });
    daemon.runtime = new StudioRuntimeOrchestrator(bookDir, {
      bus: daemon.bus,
      writer,
      autoWrite: Boolean(writer),
      sceneLifecycleHook,
    });
    applyDaemonExecutionGuard(daemon, guard);
    const buf = [];
    daemons.set(bookDir, daemon);
    eventBuffers.set(bookDir, buf);
    wireEventBroadcast(bookDir, bookId, daemon, buf);
  }
  return daemons.get(bookDir);
}

function forbidden(res, route) {
  res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({
    error: 'FORBIDDEN',
    message: `${route.method} ${route.path} — Runtime Pipeline only. Studio cannot write business data.`,
    boundary: 'docs/runtime-boundary.md',
  }));
}

export async function handleApi(req, res, url, body) {
  const send = (code, data) => {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
  };

  try {
    const route = matchRoute(req.method, url.pathname);
    if (route && isForbidden(route)) return forbidden(res, route);

    if (url.pathname === '/api/version' && req.method === 'GET') {
      return send(200, normalizeVersion());
    }

    if (url.pathname === '/api/books' && req.method === 'GET') {
      return send(200, { ...normalizeVersion(), books: listBooksWithStats() });
    }

    if (url.pathname === '/api/ai/generate' && req.method === 'POST') {
      const result = await generateModule({ ...body, pitch: body.pitch || body.prompt });
      return send(200, { ...normalizeVersion(), result });
    }

    if (url.pathname === '/api/ai/wizard/world-boundary' && req.method === 'POST') {
      const result = await checkWorldBoundary(body);
      return send(200, { ...normalizeVersion(), ...result });
    }

    if (url.pathname === '/api/ai/wizard/trial-opening' && req.method === 'POST') {
      const result = await trialWriteOpening(body);
      return send(200, { ...normalizeVersion(), ...result });
    }

    const aiModuleMatch = url.pathname.match(/^\/api\/ai\/generate\/(world|writing|character|characters|faction|factions|volume|chapter-task|positioning|story-director)$/);
    if (aiModuleMatch && req.method === 'POST') {
      const mod = aiModuleMatch[1];
      if (mod === 'story-director') {
        const result = await analyzeStoryDirector(body.pitch || body.prompt || '');
        return send(200, { ...normalizeVersion(), ...result });
      }
      const moduleMap = {
        world: 'world', writing: 'writing', character: 'characters',
        characters: 'characters', faction: 'factions', factions: 'factions',
        volume: 'volume', 'chapter-task': 'chapter-task', positioning: 'positioning',
      };
      const result = await generateModule({
        module: moduleMap[mod],
        action: body.action || 'generate',
        pitch: body.pitch || body.prompt,
        preset: body.preset,
        title: body.title,
        role: body.role,
        storyDna: body.storyDna,
        context: body.context || (body.role ? { role: body.role } : undefined),
        current: body.current,
      });
      return send(200, { ...normalizeVersion(), result });
    }

    // Task SSE / status — 异步章生成进度（不阻塞 HTTP）
    const taskStreamMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)\/stream$/);
    if (taskStreamMatch && req.method === 'GET') {
      streamLivingTask(decodeURIComponent(taskStreamMatch[1]), res);
      return;
    }
    const taskMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)$/);
    if (taskMatch && req.method === 'GET') {
      const out = getLivingTask(decodeURIComponent(taskMatch[1]));
      return send(out.statusCode, out.body);
    }

    // Runtime SSE — 全局路径别名
    const runtimeEventsMatch = url.pathname.match(/^\/api\/runtime\/events\/([^/]+)$/);
    if (runtimeEventsMatch && req.method === 'GET') {
      const bookId = decodeURIComponent(runtimeEventsMatch[1]);
      const bookDir = resolveBookDir(bookId);
      getDaemon(bookDir, bookId);
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      subscribeSSE(bookId, res);
      res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Runtime stream connected', runtimeVersion: normalizeVersion().runtimeVersion })}\n\n`);
      return;
    }

    if (url.pathname === '/api/presets' && req.method === 'GET') {
      return send(200, { ...normalizeVersion(), presets: listPresets(), dimensionLabels: DIMENSION_LABELS });
    }

    if (url.pathname === '/api/styles' && req.method === 'GET') {
      return send(200, { ...normalizeVersion(), styles: listSavedStyles() });
    }
    if (url.pathname === '/api/styles' && req.method === 'POST') {
      const saved = saveStyle(body);
      return send(201, { ...normalizeVersion(), style: saved });
    }
    const styleDupMatch = url.pathname.match(/^\/api\/styles\/([^/]+)\/duplicate$/);
    if (styleDupMatch && req.method === 'POST') {
      const dup = duplicateStyle(decodeURIComponent(styleDupMatch[1]), body.name);
      return send(201, { ...normalizeVersion(), style: dup });
    }
    const styleMatch = url.pathname.match(/^\/api\/styles\/([^/]+)$/);
    if (styleMatch && req.method === 'GET') {
      return send(200, { ...normalizeVersion(), style: getSavedStyle(decodeURIComponent(styleMatch[1])) });
    }
    if (styleMatch && req.method === 'DELETE') {
      return send(200, { ...normalizeVersion(), ...deleteStyle(decodeURIComponent(styleMatch[1])) });
    }

    if (url.pathname === '/api/ai/cocreate' && req.method === 'POST') {
      const result = await cocreateFromPitch(body);
      return send(200, { ...normalizeVersion(), result });
    }

    if (url.pathname === '/api/ai/incremental' && req.method === 'POST') {
      const result = await incrementalUpdate(body);
      return send(200, { ...normalizeVersion(), result });
    }

    if (url.pathname === '/api/ai/writing/dimensions' && req.method === 'GET') {
      const preset = url.searchParams.get('preset') || '暗夜君王';
      return send(200, { ...normalizeVersion(), dimensions: presetToDimensions(preset), labels: DIMENSION_LABELS });
    }

    if (url.pathname === '/api/ai/writing/optimize' && req.method === 'POST') {
      const dims = await optimizeWritingDimensions(body.dimensions, body.suggestion, body.preset);
      const pack = dimensionsToWritingMd(dims, body.title, body.preset);
      return send(200, { ...normalizeVersion(), dimensions: dims, ...pack });
    }

    // ── Creator Intelligence V3.6 ──
    if (url.pathname === '/api/ai/story-director' && req.method === 'POST') {
      try {
        const result = await analyzeStoryDirector(body.pitch || body.prompt || '');
        if (!result?.dna) {
          return send(500, { ...normalizeVersion(), error: 'Story Director 未返回有效 DNA' });
        }
        return send(200, { ...normalizeVersion(), ...result });
      } catch (err) {
        return send(500, { ...normalizeVersion(), error: err.message || String(err) });
      }
    }
    if (url.pathname === '/api/ai/world-simulate' && req.method === 'POST') {
      const result = await simulateWorld(body);
      return send(200, { ...normalizeVersion(), ...result });
    }
    if (url.pathname === '/api/ai/character-brain' && req.method === 'POST') {
      const result = await analyzeCharacterBrain(body);
      return send(200, { ...normalizeVersion(), ...result });
    }
    if (url.pathname === '/api/ai/editor' && req.method === 'POST') {
      const result = await runAiEditor(body);
      return send(200, { ...normalizeVersion(), ...result });
    }
    if (url.pathname === '/api/ai/style-dna' && req.method === 'POST') {
      const result = await extractStyleDna(body);
      return send(200, { ...normalizeVersion(), ...result });
    }
    if (url.pathname === '/api/ai/chapter-director' && req.method === 'POST') {
      const result = await designChapterDirector(body);
      return send(200, { ...normalizeVersion(), ...result });
    }
    if (url.pathname === '/api/ai/prompt-quality' && req.method === 'POST') {
      const result = scorePromptQuality(body);
      return send(200, { ...normalizeVersion(), ...result });
    }
    if (url.pathname === '/api/ai/conversation' && req.method === 'POST') {
      const result = await conversationCreate(body);
      return send(200, { ...normalizeVersion(), ...result });
    }

    if (url.pathname === '/api/books' && req.method === 'POST') {
      const result = await createBookFromWizard(body);
      return send(201, { ...normalizeVersion(), ...result });
    }

    const bookMatch = url.pathname.match(/^\/api\/books\/([^/]+)/);
    if (!bookMatch) return send(404, { error: 'Not found' });

    const bookId = decodeURIComponent(bookMatch[1]);
    const bookDir = resolveBookDir(bookId);
    const rest = url.pathname.slice(bookMatch[0].length);
    const daemon = getDaemon(bookDir, bookId);
    const eventBuffer = eventBuffers.get(bookDir);

    // SSE — Runtime Event Bus only
    if (rest === '/stream' && req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      subscribeSSE(bookId, res);
      res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Runtime stream connected', runtimeVersion: normalizeVersion().runtimeVersion })}\n\n`);
      return;
    }

    if (rest === '/creator/incremental' && req.method === 'POST') {
      const storyDna = body.storyDna || readStoryDna(bookDir);
      const result = await incrementalUpdateAndSave(bookDir, body.module || body.key, {
        current: body.current,
        suggestion: body.suggestion,
        section: body.section,
        pitch: body.pitch,
        preset: body.preset,
        title: body.title,
        storyDna,
        fileName: body.file,
        action: body.action,
      });
      return send(200, { ...normalizeVersion(), result });
    }

    const versionCompareMatch = rest.match(/^\/modules\/([^/]+)\/versions\/compare$/);
    if (versionCompareMatch && req.method === 'GET') {
      const modKey = decodeURIComponent(versionCompareMatch[1]);
      const file = url.searchParams.get('file') || '_single';
      const cmp = compareVersions(bookDir, modKey, url.searchParams.get('from'), url.searchParams.get('to'), file);
      return send(200, { ...normalizeVersion(), ...cmp });
    }

    const versionRestoreMatch = rest.match(/^\/modules\/([^/]+)\/versions\/([^/]+)\/restore$/);
    if (versionRestoreMatch && req.method === 'POST') {
      const modKey = decodeURIComponent(versionRestoreMatch[1]);
      const vid = decodeURIComponent(versionRestoreMatch[2]);
      const file = body.file || url.searchParams.get('file') || null;
      const { content } = getVersion(bookDir, modKey, vid, file || '_single');
      if (file) writeModule(bookDir, modKey, { content }, file);
      else writeModule(bookDir, modKey, { content });
      return send(200, { ...normalizeVersion(), restored: vid });
    }

    const versionsMatch = rest.match(/^\/modules\/([^/]+)\/versions$/);
    if (versionsMatch && req.method === 'GET') {
      const modKey = decodeURIComponent(versionsMatch[1]);
      const file = url.searchParams.get('file') || '_single';
      return send(200, { ...normalizeVersion(), versions: listVersions(bookDir, modKey, file), worldSections: modKey === 'world' ? WORLD_SECTIONS : undefined });
    }

    const versionGetMatch = rest.match(/^\/modules\/([^/]+)\/versions\/([^/]+)$/);
    if (versionGetMatch && req.method === 'GET') {
      const modKey = decodeURIComponent(versionGetMatch[1]);
      const vid = decodeURIComponent(versionGetMatch[2]);
      const file = url.searchParams.get('file') || '_single';
      return send(200, { ...normalizeVersion(), ...getVersion(bookDir, modKey, vid, file) });
    }

    if (rest === '/creation-insights' && req.method === 'GET') {
      const insights = await getCreationInsights(bookDir);
      return send(200, { ...normalizeVersion(), insights });
    }

    if (rest === '/creative-dashboard' && req.method === 'GET') {
      const dashboard = await getCreativeDashboard(bookDir);
      return send(200, { ...normalizeVersion(), dashboard });
    }

    if (rest === '/story-dna' && req.method === 'GET') {
      return send(200, { ...normalizeVersion(), dna: readStoryDna(bookDir) });
    }
    if (rest === '/story-dna' && req.method === 'PUT') {
      const dna = saveStoryDirector(bookDir, body);
      return send(200, { ...normalizeVersion(), dna });
    }

    if (rest === '/conflict-calibration' && req.method === 'GET') {
      return send(200, {
        ...normalizeVersion(),
        calibration: readConflictCalibration(bookDir),
      });
    }
    if (rest === '/conflict-calibration' && req.method === 'PUT') {
      const calibration = saveConflictCalibration(bookDir, body || {});
      return send(200, { ...normalizeVersion(), calibration });
    }

    const systemMatch = rest.match(/^\/system\/([^/]+)$/);
    if (systemMatch && req.method === 'GET') {
      const name = decodeURIComponent(systemMatch[1]);
      return send(200, { ...normalizeVersion(), data: readSystemFile(bookDir, name) });
    }
    if (systemMatch && req.method === 'PUT') {
      const name = decodeURIComponent(systemMatch[1]);
      const data = writeSystemFile(bookDir, name, body);
      return send(200, { ...normalizeVersion(), data });
    }

    const brainMatch = rest.match(/^\/characters\/([^/]+)\/brain$/);
    if (brainMatch && req.method === 'GET') {
      const charName = decodeURIComponent(brainMatch[1]);
      return send(200, { ...normalizeVersion(), brain: loadCharacterBrainState(bookDir, charName) });
    }
    if (brainMatch && req.method === 'PUT') {
      const charName = decodeURIComponent(brainMatch[1]);
      const brain = saveCharacterBrainState(bookDir, charName, body);
      return send(200, { ...normalizeVersion(), brain });
    }
    if (brainMatch && req.method === 'POST') {
      const charName = decodeURIComponent(brainMatch[1]);
      let charMd = body.characterMarkdown || '';
      if (!charMd) {
        try { charMd = readModule(bookDir, 'characters', `${charName}.md`).content || ''; } catch { /* */ }
      }
      const storyDna = readStoryDna(bookDir);
      const { brain, source } = await analyzeCharacterBrain({ characterMarkdown: charMd, characterName: charName, storyDna });
      const saved = saveCharacterBrainState(bookDir, charName, brain);
      return send(200, { ...normalizeVersion(), brain: saved, source });
    }

    if (rest === '/chapter-director' && req.method === 'POST') {
      const chapter = Number(body.chapter) || getBookMeta(bookDir).currentChapter || 1;
      const result = await designChapterDirector({ bookDir, chapter, pitch: body.pitch });
      if (body.persist !== false) {
        const persisted = persistChapterPlan(bookDir, chapter, result.plan);
        return send(200, { ...normalizeVersion(), ...result, persisted });
      }
      return send(200, { ...normalizeVersion(), ...result });
    }

    if (rest === '/story-context' && req.method === 'GET') {
      const chapter = Number(url.searchParams.get('chapter')) || getBookMeta(bookDir).currentChapter || 1;
      const context = getStoryContext(bookDir, chapter);
      return send(200, { ...normalizeVersion(), context });
    }

    if (rest === '/living-status' && req.method === 'GET') {
      ensureLivingNovelDirs(bookDir);
      const status = getLivingNovelStatus(bookDir);
      return send(200, { ...normalizeVersion(), status });
    }

    const chapterPlanMatch = rest.match(/^\/chapter-plans\/(\d+)$/);
    if (chapterPlanMatch && req.method === 'GET') {
      const ch = Number(chapterPlanMatch[1]);
      return send(200, { ...normalizeVersion(), plan: readChapterPlan(bookDir, ch) });
    }
    if (chapterPlanMatch && req.method === 'PUT') {
      const ch = Number(chapterPlanMatch[1]);
      const persisted = persistChapterPlan(bookDir, ch, body);
      return send(200, { ...normalizeVersion(), ...persisted });
    }

    if (rest === '/world-state' && req.method === 'GET') {
      return send(200, { ...normalizeVersion(), worldState: readWorldState(bookDir) });
    }
    if (rest === '/world-state' && req.method === 'PUT') {
      const ws = writeWorldState(bookDir, body);
      return send(200, { ...normalizeVersion(), worldState: ws });
    }

    const editorFbMatch = rest.match(/^\/editor-feedback\/(\d+)$/);
    if (editorFbMatch && req.method === 'GET') {
      const ch = Number(editorFbMatch[1]);
      return send(200, { ...normalizeVersion(), feedback: readEditorFeedback(bookDir, ch) });
    }

    const evolveMatch = rest.match(/^\/characters\/([^/]+)\/evolve$/);
    if (evolveMatch && req.method === 'POST') {
      const charName = decodeURIComponent(evolveMatch[1]);
      const chapter = Number(body.chapter) || getBookMeta(bookDir).currentChapter || 1;
      const text = body.chapterText || getChapterText(bookDir, chapter).text || '';
      const results = await evolveCharacterBrains(bookDir, chapter, text);
      const one = results.find((r) => r.name === charName || r.name?.replace(/_/g, '') === charName.replace(/_/g, ''));
      return send(200, { ...normalizeVersion(), brain: one?.brain || loadCharacterBrainState(bookDir, charName), evolutions: results });
    }

    if (rest === '/living/evolve' && req.method === 'POST') {
      const chapter = Number(body.chapter) || getBookMeta(bookDir).currentChapter || 1;
      const evolution = await runPostChapterEvolution(bookDir, chapter);
      return send(200, { ...normalizeVersion(), evolution });
    }

    if (rest === '/living/prepare' && req.method === 'POST') {
      const chapter = Number(body.chapter) || getBookMeta(bookDir).currentChapter || 1;
      const prepared = await prepareChapterRun(bookDir, chapter, body.plan || null);
      return send(200, { ...normalizeVersion(), ...prepared });
    }

    if (rest === '/world-simulate' && req.method === 'POST') {
      let worldMd = body.worldMarkdown || '';
      if (!worldMd) {
        try { worldMd = readModule(bookDir, 'world').content || ''; } catch { /* */ }
      }
      const storyDna = readStoryDna(bookDir);
      const { simulation, source } = await simulateWorld({ worldMarkdown: worldMd, years: body.years || 10, storyDna });
      const saved = saveWorldSimulation(bookDir, simulation);
      syncWorldStateFromSimulation(bookDir);
      return send(200, { ...normalizeVersion(), simulation: saved, source });
    }

    if (rest === '/ai-editor' && req.method === 'POST') {
      let content = body.content || '';
      if (!content && body.chapter) {
        try { content = getChapterText(bookDir, body.chapter).text || ''; } catch { /* */ }
      }
      const result = await runAiEditor({ ...body, content });
      return send(200, { ...normalizeVersion(), ...result });
    }

    if (rest === '' && req.method === 'GET') {
      return send(200, { ...normalizeVersion(), book: getBookMeta(bookDir) });
    }

    if (rest === '/stats' && req.method === 'GET') {
      return send(200, { ...normalizeVersion(), stats: getBookStats(bookDir) });
    }

    if (rest === '/dashboard' && req.method === 'GET') {
      const chapter = Number(url.searchParams.get('chapter')) || getBookMeta(bookDir).currentChapter || 1;
      const raw = assembleDashboard(bookDir, chapter, daemon, eventBuffer);
      raw.events = raw.events.map(formatRuntimeEvent);
      return send(200, normalizeDashboard(raw));
    }

    if (rest === '/health' && req.method === 'GET') {
      return send(200, normalizeHealth(readHealth(bookDir).full));
    }

    if (rest === '/state' && req.method === 'GET') {
      const s = readState(bookDir);
      return send(200, { ...normalizeVersion(), ...s });
    }

    if (rest === '/world' && req.method === 'GET') {
      const w = readWorld(bookDir);
      return send(200, { ...normalizeVersion(), ...w });
    }

    const chapterTextMatch = rest.match(/^\/chapters\/(\d+)\/text$/);
    if (chapterTextMatch && req.method === 'GET') {
      const n = Number(chapterTextMatch[1]);
      return send(200, { ...normalizeVersion(), ...getChapterMeta(bookDir, n) });
    }

    if (chapterTextMatch && req.method === 'PUT') {
      const n = Number(chapterTextMatch[1]);
      const text = typeof body.text === 'string' ? body.text : String(body.content ?? '');
      const saved = saveChapterText(bookDir, n, text, { title: body.title || null });
      return send(200, { ...normalizeVersion(), ok: true, ...saved });
    }

    const chapterDiagMatch = rest.match(/^\/chapters\/(\d+)\/diagnosis$/);
    if (chapterDiagMatch && req.method === 'GET') {
      const n = Number(chapterDiagMatch[1]);
      const diagnosis = buildChapterDiagnosis(bookDir, n);
      return send(200, { ...normalizeVersion(), diagnosis });
    }

    const chapterAcceptMatch = rest.match(/^\/chapters\/(\d+)\/accept$/);
    if (chapterAcceptMatch && req.method === 'POST') {
      const n = Number(chapterAcceptMatch[1]);
      const out = acceptChapter(bookDir, n, { title: body.title });
      return send(200, { ...normalizeVersion(), ...out });
    }

    const chapterDraftMatch = rest.match(/^\/chapters\/(\d+)\/draft$/);
    if (chapterDraftMatch && req.method === 'DELETE') {
      const n = Number(chapterDraftMatch[1]);
      try {
        const guard = getBookExecutionGuard(bookDir);
        guard.releaseChapterRun?.(n);
      } catch { /* */ }
      const out = deleteChapterDraft(bookDir, n);
      return send(200, { ...normalizeVersion(), ...out });
    }

    const chapterOptimizeMatch = rest.match(/^\/chapters\/(\d+)\/optimize$/);
    if (chapterOptimizeMatch && req.method === 'POST') {
      const n = Number(chapterOptimizeMatch[1]);
      const out = optimizeChapter(bookDir, n, body.strategy || 'fix-repetition');
      return send(200, { ...normalizeVersion(), ...out });
    }

    if (rest === '/chapters/audit' && req.method === 'GET') {
      const max = Number(body?.max || url.searchParams?.get?.('max') || 10);
      return send(200, { ...normalizeVersion(), ...listChapterAuditStatuses(bookDir, max) });
    }

    if (rest === '/wizard/chapter-tones' && req.method === 'GET') {
      const data = loadWizardChapterTones(bookDir);
      return send(200, {
        ...normalizeVersion(),
        tones: Array.isArray(data?.tones) ? data.tones : [],
        meta: data,
      });
    }
    if (rest === '/wizard/chapter-tones' && req.method === 'PUT') {
      const saved = saveWizardChapterTones(bookDir, body.tones || body.chapterTones || []);
      return send(200, {
        ...normalizeVersion(),
        ok: true,
        tones: saved.tones || [],
        meta: saved,
      });
    }

    if (rest === '/story-map' && req.method === 'GET') {
      const map = loadStoryMap(bookDir);
      const ch = Number(url.searchParams?.get?.('chapter') || body?.chapter || 0);
      const chapterCtx = ch ? resolveChapterMapContext(bookDir, ch) : null;
      const povCheck = map
        ? validatePovGrid(map.povGrid || [], {
          totalChapters: map.mainArc?.story_arc?.total_chapters || map.mainArc?.total_chapters,
        })
        : null;
      return send(200, {
        ...normalizeVersion(),
        enabled: hasStoryMap(bookDir),
        map,
        chapterCtx,
        povCheck,
      });
    }
    if (rest === '/story-map' && req.method === 'PUT') {
      const saved = saveStoryMap(bookDir, body.map || body);
      return send(200, { ...normalizeVersion(), ok: true, map: saved });
    }
    if (rest === '/story-map/scaffold' && req.method === 'POST') {
      const draft = scaffoldStoryMap({
        title: body.title || getBookMeta(bookDir).title,
        totalChapters: body.totalChapters || body.volumeChapterCount || 30,
        primaryPov: body.primaryPov || '主角',
        secondaryPov: body.secondaryPov || '',
        openingHook: body.openingHook || '',
        coreMystery: body.coreMystery || '',
        chapterTones: body.chapterTones || [],
        volumes: body.volumes || null,
      });
      const saved = body.persist === false ? null : saveStoryMap(bookDir, draft);
      return send(200, {
        ...normalizeVersion(),
        ok: true,
        draft,
        map: saved,
        povCheck: validatePovGrid(draft.pov_grid, { totalChapters: draft.story_arc.total_chapters }),
      });
    }
    if (rest.match(/^\/story-map\/chapter\/(\d+)$/) && req.method === 'GET') {
      const n = Number(rest.match(/^\/story-map\/chapter\/(\d+)$/)[1]);
      return send(200, {
        ...normalizeVersion(),
        ...diagnoseStoryMapChapter(bookDir, n, {
          actualPov: body.pov || '',
          chapterText: body.text || '',
        }),
      });
    }

    if (rest === '/chapters/health' && req.method === 'GET') {
      const { chapters } = listChapters(bookDir);
      const health = listChapterHealth(bookDir, chapters);
      const audit = listChapterAuditStatuses(bookDir, Math.max(10, chapters.length || 3));
      return send(200, { ...normalizeVersion(), health, audit });
    }

    // 单书配置（温度 / 模型覆盖）
    if (rest === '/config' && req.method === 'GET') {
      const cfg = readSystemFile(bookDir, 'studio_config') || {};
      return send(200, { ...normalizeVersion(), config: cfg });
    }
    if (rest === '/config' && req.method === 'PUT') {
      const prev = readSystemFile(bookDir, 'studio_config') || {};
      const next = {
        ...prev,
        ...(body.temperature != null ? { temperature: Number(body.temperature) } : {}),
        ...(body.model ? { model: String(body.model) } : {}),
        ...(body.lightModel ? { lightModel: String(body.lightModel) } : {}),
        ...(body.maxTokens != null ? { maxTokens: Number(body.maxTokens) } : {}),
        updatedAt: new Date().toISOString(),
      };
      writeSystemFile(bookDir, 'studio_config', next);
      return send(200, { ...normalizeVersion(), ok: true, config: next });
    }

    if (rest === '/chapters' && req.method === 'GET') {
      return send(200, { ...normalizeVersion(), ...listChapters(bookDir) });
    }

    if (rest === '/ai/generate' && req.method === 'POST') {
      const result = await generateModule({ ...body, pitch: body.pitch || body.prompt });
      if (body.save && body.module) {
        if (body.module === 'factions' && result.factions) {
          for (const f of result.factions) {
            writeModule(bookDir, 'factions', { content: f.markdown }, `${f.name}.md`);
          }
        } else if (body.module === 'characters' && result.characters) {
          for (const c of result.characters) {
            const name = c.fields?.name || '角色';
            writeModule(bookDir, 'characters', { content: c.markdown }, `${name}.md`);
          }
        } else if (result.markdown) {
          if (body.file) writeModule(bookDir, body.module, { content: result.markdown }, body.file);
          else writeModule(bookDir, body.module, { content: result.markdown });
        }
      }
      return send(200, { ...normalizeVersion(), result });
    }

    const chapterMatch = rest.match(/^\/chapters\/(\d+)\/scenes$/);
    if (chapterMatch && req.method === 'GET') {
      const chapter = Number(chapterMatch[1]);
      return send(200, normalizeScenes(chapter, loadScenes(bookDir, chapter)));
    }

    if (chapterMatch && req.method === 'PUT') {
      const route = matchRoute('PUT', url.pathname);
      return forbidden(res, route || { method: 'PUT', path: url.pathname });
    }

    const planMatch = rest.match(/^\/chapters\/(\d+)\/plan$/);
    if (planMatch && req.method === 'GET') {
      const chapter = Number(planMatch[1]);
      return send(200, normalizePlanner(chapter, loadPlan(bookDir, chapter)));
    }

    const runMatch = rest.match(/^\/chapters\/(\d+)\/run$/);
    if (runMatch && req.method === 'GET') {
      const chapter = Number(runMatch[1]);
      return send(200, { ...normalizeVersion(), chapter, run: loadBrainRun(bookDir, chapter) || {} });
    }

    if (rest === '/runtime/status' && req.method === 'GET') {
      const status = daemon.getStatus();
      return send(200, { ...normalizeVersion(), ...status });
    }

    if (rest === '/runtime/state' && req.method === 'GET') {
      const guard = getBookExecutionGuard(bookDir);
      return send(200, { ...normalizeVersion(), state: guard.readState() });
    }

    if (rest === '/runtime/debug' && req.method === 'GET') {
      const guard = getBookExecutionGuard(bookDir);
      const report = guard.getDebugReport();
      return send(200, {
        ...normalizeVersion(),
        report,
        text: formatDebugReport(report),
      });
    }

    if (rest === '/runtime/events' && req.method === 'GET') {
      const since = Number(url.searchParams.get('since') || 0);
      const slice = getEventBufferSlice(bookDir, since).map(formatRuntimeEvent);
      return send(200, { ...normalizeVersion(), events: slice, nextSince: since + slice.length });
    }

    // ── Runtime Control ──
    if (rest === '/runtime/run' && req.method === 'POST') {
      const living = body.living === true;
      try {
        const result = living
          ? await controlRunLiving(bookDir, { ...body, bookId }, daemon)
          : await controlRun(bookDir, { ...body, bookId }, daemon);
        return send(200, { ...normalizeVersion(), result });
      } catch (err) {
        if (err.name === 'RuntimePipelineError') {
          return send(200, { ...normalizeVersion(), ok: false, error: err.message, result: err.result });
        }
        throw err;
      }
    }
    if (rest === '/runtime/run-living' && req.method === 'POST') {
      const out = acceptLivingChapterRun({
        bookDir,
        bookId,
        body,
        daemon,
      });
      return send(out.statusCode, out.body);
    }
    if (rest === '/runtime/resume' && req.method === 'POST') {
      const result = await controlResume(bookDir, body.chapter, { ...body, bookId }, daemon);
      return send(200, { ...normalizeVersion(), result });
    }
    if (rest === '/runtime/retry' && req.method === 'POST') {
      const result = await controlRetry(bookDir, body.chapter, daemon);
      return send(200, { ...normalizeVersion(), result });
    }
    if (rest === '/runtime/replan' && req.method === 'POST') {
      const result = await controlReplan(bookDir, body.chapter, daemon);
      return send(200, { ...normalizeVersion(), result });
    }
    if (rest === '/runtime/next' && req.method === 'POST') {
      try {
        const result = await controlNext(bookDir, daemon);
        if (result?.pass !== true || result?.error || result?.awaiting) {
          return send(200, {
            ...normalizeVersion(),
            ok: false,
            error: result?.error || result?.message || '章节生成未完成',
            result,
          });
        }
        return send(200, { ...normalizeVersion(), ok: true, result });
      } catch (err) {
        if (err.name === 'RuntimePipelineError') {
          return send(200, { ...normalizeVersion(), ok: false, error: err.message, result: err.result });
        }
        throw err;
      }
    }
    if (rest === '/runtime/rollback' && req.method === 'POST') {
      const result = controlRollback(bookDir, body.snapshotId);
      return send(200, { ...normalizeVersion(), result });
    }
    if (rest === '/runtime/pause' && req.method === 'POST') {
      const result = controlPause(daemon);
      return send(200, { ...normalizeVersion(), ...result });
    }
    if (rest === '/runtime/daemon/start' && req.method === 'POST') {
      const result = controlDaemonStart(daemon);
      return send(200, { ...normalizeVersion(), ...result });
    }
    if (rest === '/runtime/daemon/stop' && req.method === 'POST') {
      const result = controlDaemonStop(daemon);
      return send(200, { ...normalizeVersion(), ...result });
    }

    // Legacy forbidden paths — explicit 403
    if (rest === '/memory/snapshot' && req.method === 'POST') {
      return forbidden(res, { method: 'POST', path: '/api/books/:id/memory/snapshot' });
    }
    if (rest === '/memory/rollback' && req.method === 'POST') {
      return forbidden(res, { method: 'POST', path: '/api/books/:id/memory/rollback' });
    }
    if (rest === '/memory/branch' && req.method === 'POST') {
      return forbidden(res, { method: 'POST', path: '/api/books/:id/memory/branch' });
    }

    if (rest === '/memory/snapshots' && req.method === 'GET') {
      return send(200, normalizeMemory(readMemorySnapshots(bookDir)));
    }

    if (rest === '/memory/diff' && req.method === 'GET') {
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      const diff = readMemoryDiff(bookDir, from, to);
      return send(200, { ...normalizeVersion(), diff });
    }

    if (rest === '/modules' && req.method === 'GET') {
      return send(200, { ...normalizeVersion(), ...listModules(bookDir) });
    }

    // 第一卷规划 living document（含 staleness）
    const volumePlanMatch = rest.match(/^\/volume-plan(?:\/(\d+))?$/);
    if (volumePlanMatch) {
      const vol = Number(volumePlanMatch[1] || url.searchParams.get('vol') || 1);
      if (req.method === 'GET') {
        const plan = getVolumePlan(bookDir, vol);
        return send(200, {
          ...normalizeVersion(),
          ...plan,
          partLabels: VOLUME_PART_LABELS,
        });
      }
      if (req.method === 'PUT') {
        const plan = saveVolumePlan(bookDir, {
          markdown: body.markdown ?? body.content ?? '',
          vol,
          refreshFingerprint: Boolean(body.refreshFingerprint),
          editedBy: body.editedBy || 'user',
        });
        return send(200, { ...normalizeVersion(), ...plan, partLabels: VOLUME_PART_LABELS });
      }
    }

    const moduleFileMatch = rest.match(/^\/modules\/([^/]+)\/([^/]+)$/);
    if (moduleFileMatch) {
      const modKey = decodeURIComponent(moduleFileMatch[1]);
      const fileName = decodeURIComponent(moduleFileMatch[2]);
      if (req.method === 'GET') {
        return send(200, { ...normalizeVersion(), ...readModule(bookDir, modKey, fileName) });
      }
      if (req.method === 'PUT') {
        const result = writeModule(bookDir, modKey, body, fileName);
        return send(200, { ...normalizeVersion(), ...result });
      }
      if (req.method === 'DELETE') {
        const result = deleteModuleFile(bookDir, modKey, fileName);
        return send(200, { ...normalizeVersion(), ...result });
      }
    }

    const moduleMatch = rest.match(/^\/modules\/([^/]+)$/);
    if (moduleMatch) {
      const modKey = moduleMatch[1];
      if (req.method === 'GET') {
        return send(200, { ...normalizeVersion(), ...readModule(bookDir, modKey) });
      }
      if (req.method === 'PUT') {
        const result = writeModule(bookDir, modKey, body);
        return send(200, { ...normalizeVersion(), ...result });
      }
    }

    if (rest === '/prompt-analytics' && req.method === 'GET') {
      const chapter = Number(url.searchParams.get('chapter')) || getBookMeta(bookDir).currentChapter || 1;
      const legacy = readPromptAnalytics(bookDir, chapter);
      const studio = readStudioPromptMetrics(bookDir, chapter);
      return send(200, {
        ...normalizeVersion(),
        analytics: {
          ...legacy,
          studio,
          aggregate: studio.aggregate || legacy.aggregate,
          scenes: studio.scenes?.length ? studio.scenes : legacy.scenes,
        },
      });
    }

    if (rest === '/scene-budget' && req.method === 'GET') {
      const chapter = Number(url.searchParams.get('chapter')) || getBookMeta(bookDir).currentChapter || 1;
      const sceneIndex = Number(url.searchParams.get('scene'));
      if (sceneIndex) {
        return send(200, { ...normalizeVersion(), budget: readSceneBudget(bookDir, chapter, sceneIndex) });
      }
      return send(200, { ...normalizeVersion(), budgets: readChapterBudgets(bookDir, chapter), chapter });
    }

    if (rest === '/hash-dependency-tree' && req.method === 'GET') {
      const chapter = Number(url.searchParams.get('chapter')) || getBookMeta(bookDir).currentChapter || 1;
      const tree = readHashDependencyTree(bookDir, chapter);
      return send(200, { ...normalizeVersion(), tree, chapter });
    }

    if (rest === '/story-memory' && req.method === 'GET') {
      const chapter = Number(url.searchParams.get('chapter')) || getBookMeta(bookDir).currentChapter || 1;
      const memory = readStoryMemory(bookDir, chapter);
      return send(200, { ...normalizeVersion(), memory, chapter });
    }

    if (rest === '/creation-suggestions' && req.method === 'GET') {
      const chapter = Number(url.searchParams.get('chapter')) || getBookMeta(bookDir).currentChapter || 1;
      const assistant = readCreationSuggestions(bookDir, chapter);
      return send(200, { ...normalizeVersion(), assistant, chapter });
    }

    if (rest === '/writer-optimizer' && req.method === 'GET') {
      const chapter = Number(url.searchParams.get('chapter')) || getBookMeta(bookDir).currentChapter || 1;
      const sceneIndex = Number(url.searchParams.get('scene'));
      if (sceneIndex) {
        return send(200, { ...normalizeVersion(), ...readWriterOptimizerScene(bookDir, chapter, sceneIndex) });
      }
      return send(200, { ...normalizeVersion(), scenes: readChapterWriterOptimizer(bookDir, chapter), chapter });
    }

    if (rest === '/copilot' && req.method === 'POST') {
      const intent = parseCopilotIntent(body.message, bookDir);
      const result = await executeCopilotAction(bookDir, intent, {});
      if (result.delegate === 'replan') {
        result.runtime = await controlReplan(bookDir, result.chapter, daemon);
      } else if (result.delegate === 'resume') {
        result.runtime = await controlResume(bookDir, result.chapter, body, daemon);
      } else if (result.delegate === 'next') {
        result.runtime = await controlNext(bookDir, daemon);
      } else if (result.delegate === 'run') {
        result.runtime = await controlRun(bookDir, { chapter: result.chapter }, daemon);
      } else if (result.delegate === 'daemon_start') {
        result.runtime = controlDaemonStart(daemon);
      } else if (result.delegate === 'daemon_stop') {
        result.runtime = controlDaemonStop(daemon);
      }
      return send(200, { ...normalizeVersion(), ...result, intent });
    }

    return send(404, { error: 'Not found', path: rest });
  } catch (err) {
    send(500, { error: err.message || String(err) });
  }
}
