/**
 * Prompt Compiler v2 — Scene Lore Seed（Canon / 实体 / Diff）
 * 最终 Writer Prompt 由 @inkos/runtime PromptCompiler.compile() 统一密封产出。
 * 本模块不得作为发给 LLM 的最终串；仅向 CompilationContext.loreText 供料。
 */
import fs from 'node:fs';
import path from 'node:path';
import { exists, readJson } from '../../inkos-core/src/lib/paths.js';
import {
  getCachedModule,
  loadSceneSummaries,
  saveSceneSummary,
  saveContextDiff,
  loadContextSnapshot,
  saveContextSnapshot,
  promptCacheDir,
} from './cache.js';
import { validateCache } from './cache-validator.js';
import {
  snapshotContext,
  diffContext,
  formatContextDiff,
  contextDiffHash,
} from './context-diff.js';
import { selectEntities, filterCharacters, filterFactions } from './entity-selector.js';
import { rankEntities, importanceMap, trimEntitiesByImportance } from './importance.js';
import {
  rankContextForCompiler,
  formatRankedFacts,
  formatRankedKnowledge,
  formatRankedResources,
  formatRankedRelationships,
  formatRankedTimeline,
} from '@inkos/context-ranking';
import { getAdaptiveBudget, budgetUsage, SCENE_INPUT_MAX_TOKENS } from './adaptive-budget.js';
import { loadRelevanceStats, recordContextUsage } from './relevance-learning.js';
import {
  extractSceneSummary,
  formatPreviousSummaries,
  buildContinuationBlock,
} from './scene-summary.js';
import { hashPrompt } from './hash.js';
import { countTokens } from './token-meter.js';
import { recordPromptMetrics } from './metrics.js';

function brainSystemDir(bookDir) {
  return path.join(bookDir, 'novel', '_system', 'brain');
}

function loadPreviousSceneTexts(bookDir, chapter, currentIndex) {
  const file = path.join(brainSystemDir(bookDir), `ch_${String(chapter).padStart(4, '0')}_scenes.json`);
  if (!exists(file)) return [];
  const data = readJson(file);
  return (data.scenes || []).filter((s) => s.index < currentIndex && s.text?.trim());
}

function buildOrLoadSummaries(bookDir, chapter, prevScenes) {
  const stored = loadSceneSummaries(bookDir, chapter);
  const summaries = [];
  for (const ps of prevScenes) {
    let entry = stored.scenes?.find((s) => s.sceneId === ps.id || s.index === ps.index);
    if (!entry) {
      entry = extractSceneSummary(ps, ps.text);
      if (entry) saveSceneSummary(bookDir, chapter, entry);
    }
    if (entry) summaries.push(entry);
  }
  return summaries;
}

function truncateByTokens(text, maxTokens) {
  if (!text) return '';
  const maxChars = Math.floor(maxTokens * 1.5);
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n…[truncated]`;
}

function applyAdaptiveBudget(modules, budget) {
  const selected = [];
  const usage = {};
  let totalTokens = 0;
  let rankingDrop = 0;

  const sorted = [...modules].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  for (const mod of sorted) {
    const cat = mod.category || 'other';
    const limit = budget[cat] ?? 200;
    const used = usage[cat] || 0;
    const room = limit - used;
    if (room <= 0) {
      rankingDrop += 1;
      continue;
    }

    const modTokens = mod.tokens ?? countTokens(mod.content);
    const allowed = Math.min(modTokens, room, SCENE_INPUT_MAX_TOKENS - totalTokens);
    if (allowed <= 0) {
      rankingDrop += 1;
      continue;
    }

    let content = mod.content;
    if (modTokens > allowed) {
      content = truncateByTokens(content, allowed);
      rankingDrop += 1;
    }

    const tokens = countTokens(content);
    selected.push({ ...mod, content, tokens });
    usage[cat] = used + tokens;
    totalTokens += tokens;

    if (totalTokens >= SCENE_INPUT_MAX_TOKENS) break;
  }

  return { selected, totalTokens, rankingDrop, budgetUsage: budgetUsage(selected, budget) };
}

function loadCompiledPromptCache(bookDir, chapter, hash) {
  const file = path.join(promptCacheDir(bookDir, chapter), 'prompts', `${hash}.txt`);
  if (exists(file)) return fs.readFileSync(file, 'utf8');
  return null;
}

function saveCompiledPromptCache(bookDir, chapter, hash, text) {
  const dir = path.join(promptCacheDir(bookDir, chapter), 'prompts');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${hash}.txt`), text);
}

function renderPrompt(modules, scene, meta) {
  const parts = [
    `<!-- prompt-compiler v2 | scene=${scene.id} | tokens=${meta.totalTokens} | profile=${meta.profile} | cache=${meta.cacheHitRate}% | compile=${meta.compileMs}ms -->`,
    '',
  ];
  for (const m of modules) {
    parts.push(`### ${m.label}`, m.content, '');
  }
  return parts.join('\n');
}

export function compileScenePrompt(ctx, scene) {
  const t0 = performance.now();
  const { bookDir, chapter } = ctx;
  let cacheHits = 0;
  let cacheChecks = 0;

  const { entities: rawEntities, factions: factionNames } = selectEntities(ctx, scene);
  const rankedEntities = rankEntities(rawEntities, ctx, scene);
  const entities = trimEntitiesByImportance(rawEntities, ctx, scene, Math.max(3, rankedEntities.length));
  const impMap = importanceMap(entities, ctx, scene);

  const cacheValidation = validateCache(bookDir, chapter, ctx, entities);
  const intent = ctx.intent || ctx.chapterIntent || { pov: ctx.pov, mainGoal: ctx.mainGoal };
  const { profile, budget, adaptiveBlock } = getAdaptiveBudget(scene, intent, { bookDir, ctx });
  const relevanceStats = loadRelevanceStats(bookDir);

  const characters = filterCharacters(ctx, entities);
  const factions = filterFactions(ctx, factionNames);

  const prevScenes = loadPreviousSceneTexts(bookDir, chapter, scene.index);
  const summaries = buildOrLoadSummaries(bookDir, chapter, prevScenes);

  const snapshot = snapshotContext(ctx);
  const prevSnapshot = loadContextSnapshot(bookDir, chapter);
  const diff = diffContext(prevSnapshot, snapshot);
  saveContextSnapshot(bookDir, chapter, snapshot);
  saveContextDiff(bookDir, chapter, diff);

  const inputHash = hashPrompt({
    sceneId: scene.id,
    entities,
    factions: factionNames,
    diff: contextDiffHash(diff),
    goal: scene.goal,
    beat: scene.beat,
    profile,
    validator: cacheValidation.hashes,
  });

  const cachedText = loadCompiledPromptCache(bookDir, chapter, inputHash);
  if (cachedText) {
    const compileMs = Math.round(performance.now() - t0);
    const inputTokens = countTokens(cachedText);
    const entry = {
      sceneId: scene.id,
      index: scene.index,
      input_tokens: inputTokens,
      cache_hit: true,
      cache_hit_rate: 100,
      compile_time_ms: compileMs,
      context_size: JSON.stringify(diff).length,
      prompt_hash: inputHash,
      budget_profile: profile,
      token_source: 'estimated',
    };
    recordPromptMetrics(bookDir, chapter, entry);
    return {
      entities,
      factions: factionNames,
      modules: [{ key: 'cached', label: 'cached', tokens: inputTokens }],
      totalTokens: inputTokens,
      totalChars: cachedText.length,
      withinBudget: inputTokens <= SCENE_INPUT_MAX_TOKENS,
      text: cachedText,
      cacheHit: true,
      cacheHitRate: 100,
      promptHash: inputHash,
      compileMs,
      profile,
      importance: impMap,
    };
  }

  const modules = [];
  const add = (mod) => modules.push(mod);

  add({
    key: 'scene_goal',
    label: 'Scene 目标',
    category: 'goal',
    priority: 100,
    content: `目标: ${scene.goal}\n节拍: ${scene.beat}`,
  });

  add({
    key: 'scene_conflict',
    label: 'Scene 冲突',
    category: 'conflict',
    priority: 98,
    content: `冲突: ${scene.conflict}\n阻碍: ${scene.conflict || intent?.obstacles?.[0] || '—'}`,
  });

  if (ctx.currentChapterMd?.trim()) {
    add({ key: 'chapter_task', label: '本章任务', category: 'goal', priority: 90, content: truncateByTokens(ctx.currentChapterMd, budget.goal) });
  }
  if (summaries.length) {
    add({ key: 'prev_summary', label: '前序 Scene', category: 'history', priority: 85, content: formatPreviousSummaries(summaries) });
  }
  const cont = buildContinuationBlock(scene.index, summaries[summaries.length - 1]?.summary);
  if (cont) add({ key: 'continuation', label: '续写', category: 'goal', priority: 95, content: cont });

  if (scene.index <= 1 || diff.isFull) {
    add({ key: 'state', label: '当前状态', category: 'history', priority: 80, content: truncateByTokens(ctx.currentStateMd, budget.history) });
  } else {
    add({ key: 'state_diff', label: '状态差量', category: 'history', priority: 80, content: formatContextDiff(diff) });
  }

  const factPool = diff.isFull ? ctx.facts.slice(-20) : (diff.facts || []).map((f) => ({ fact: f }));
  const rankedCtx = rankContextForCompiler(ctx, scene, intent, {
    budget,
    factPool,
    chapter,
  });

  if (rankedCtx.bySource.facts.selected.length) {
    add({
      key: 'facts',
      label: diff.isFull ? '相关事实 TopK' : '新增事实 TopK',
      category: 'facts',
      priority: 75,
      content: formatRankedFacts(rankedCtx.bySource.facts),
    });
  }

  if (rankedCtx.bySource.knowledge.selected.length) {
    add({
      key: 'knowledge',
      label: '信息差 TopK',
      category: 'knowledge',
      priority: 70,
      content: formatRankedKnowledge(rankedCtx.bySource.knowledge),
    });
  }

  if (rankedCtx.bySource.resources.selected.length) {
    add({
      key: 'resources',
      label: diff.isFull ? '资源 TopK' : '资源变化 TopK',
      category: 'facts',
      priority: 65,
      content: formatRankedResources(rankedCtx.bySource.resources),
    });
  }

  if (rankedCtx.bySource.relationships.selected.length) {
    add({
      key: 'relationship',
      label: '关系 TopK',
      category: 'relationship',
      priority: 60,
      content: formatRankedRelationships(rankedCtx.bySource.relationships),
    });
  }

  if (rankedCtx.bySource.timeline.selected.length) {
    add({
      key: 'timeline',
      label: '时间线 TopK',
      category: 'history',
      priority: 72,
      content: formatRankedTimeline(rankedCtx.bySource.timeline),
    });
  }

  const sortedChars = rankEntities(entities, ctx, scene);
  for (const { name, importance } of sortedChars) {
    const c = characters[name];
    if (!c?.raw) continue;
    add({
      key: `char:${name}`,
      label: `人物:${name}`,
      category: 'character',
      priority: importance,
      content: truncateByTokens(c.raw, Math.floor(budget.character / Math.max(1, sortedChars.length))),
    });
  }

  cacheChecks += 1;
  const writingCache = getCachedModule(bookDir, chapter, 'writing', truncateByTokens(ctx.writingBible, 2000));
  if (writingCache.hit) cacheHits += 1;
  if (writingCache.content) {
    add({ key: 'writing_bible', label: '写作规则', category: 'world', priority: 50, content: truncateByTokens(writingCache.content, Math.floor(budget.world * 0.35)) });
  }

  if (factionNames.length) {
    for (const fname of factionNames) {
      cacheChecks += 1;
      const f = factions[fname];
      if (!f?.raw) continue;
      const fCache = getCachedModule(bookDir, chapter, `faction:${fname}`, truncateByTokens(f.raw, 600));
      if (fCache.hit) cacheHits += 1;
      add({ key: `faction:${fname}`, label: `势力:${fname}`, category: 'world', priority: 40, content: truncateByTokens(fCache.content, budget.world) });
    }
  }

  // World Bible 始终注入（旧逻辑：有势力时跳过 world → 导致失忆）
  cacheChecks += 1;
  const worldRaw = String(ctx.worldBible || '');
  console.log('[lore] worldBible length:', worldRaw.length, 'bookDir=', bookDir);
  const worldCache = getCachedModule(bookDir, chapter, 'world', truncateByTokens(worldRaw, 2500));
  if (worldCache.hit) cacheHits += 1;
  if (worldCache.content) {
    add({
      key: 'world_bible',
      label: '世界规则',
      category: 'world',
      priority: 55,
      content: truncateByTokens(worldCache.content, Math.max(budget.world || 800, 800)),
    });
  } else {
    console.warn('[lore] worldBible empty or missing — expected novel/01_world_bible.md');
  }

  if (scene.beat === 'hook' || scene.beat === 'turn') {
    add({ key: 'state_board', label: '局势', category: 'conflict', priority: 78, content: truncateByTokens(ctx.stateBoard, Math.floor(budget.conflict * 0.4)) });
  }

  if (adaptiveBlock) {
    add({
      key: 'adaptive_learning',
      label: 'Adaptive Learning',
      category: 'goal',
      priority: 96,
      content: adaptiveBlock,
    });
  }

  const rankingDrop = rankedCtx.totalTrimmed;
  const { selected, totalTokens, rankingDrop: budgetDrop, budgetUsage: bu } = applyAdaptiveBudget(modules, budget);
  const totalRankingDrop = rankingDrop + budgetDrop;
  const cacheHitRate = cacheChecks ? Math.round((cacheHits / cacheChecks) * 100) : 0;
  const compileMs = Math.round(performance.now() - t0);

  const text = renderPrompt(selected, scene, { totalTokens, profile, cacheHitRate, compileMs });
  saveCompiledPromptCache(bookDir, chapter, inputHash, text);

  recordContextUsage(bookDir, {
    factIds: rankedCtx.bySource.facts.selected.map((e) => e.text),
    moduleKeys: selected.map((m) => m.key),
  });

  const metricsEntry = {
    sceneId: scene.id,
    index: scene.index,
    input_tokens: totalTokens,
    compile_time_ms: compileMs,
    cache_hit: cacheHits > 0,
    cache_miss: cacheChecks - cacheHits,
    cache_hit_rate: cacheHitRate,
    context_size: JSON.stringify(diff).length,
    ranking_drop: totalRankingDrop,
    budget_usage: bu,
    budget_profile: profile,
    prompt_hash: inputHash,
    token_source: 'estimated',
    importance: impMap,
    ranking: {
      facts: rankedCtx.bySource.facts.selected.map((e) => ({ score: e.scores?.relevance, text: e.text })),
      knowledge: rankedCtx.bySource.knowledge.selected.map((e) => ({ score: e.scores?.relevance, text: e.text })),
      resources: rankedCtx.bySource.resources.selected.map((e) => ({ score: e.scores?.relevance, text: e.text })),
      relationships: rankedCtx.bySource.relationships.selected.map((e) => ({ score: e.scores?.relevance, text: e.text })),
      timeline: rankedCtx.bySource.timeline.selected.map((e) => ({ score: e.scores?.relevance, text: e.text })),
      totalTrimmed: rankedCtx.totalTrimmed,
    },
  };
  recordPromptMetrics(bookDir, chapter, metricsEntry);

  return {
    entities,
    factions: factionNames,
    modules: selected.map((m) => ({ key: m.key, label: m.label, tokens: m.tokens, category: m.category })),
    totalTokens,
    totalChars: text.length,
    withinBudget: totalTokens <= SCENE_INPUT_MAX_TOKENS,
    text,
    cacheHit: cacheHits > 0,
    cacheHitRate,
    promptHash: inputHash,
    compileMs,
    profile,
    rankingDrop: totalRankingDrop,
    budgetUsage: bu,
    importance: impMap,
  };
}

export function compileChapterEntityContext(ctx, intent) {
  const allEntities = new Set([
    ctx.pov,
    ...ctx.present,
    ...intent.scenes.flatMap((s) => s.entities || []),
  ]);
  const corpus = [...allEntities].join(' ');
  const factionHits = Object.keys(ctx.factions || {}).filter(
    (n) => corpus.includes(n) || ctx.stateBoard?.includes(n),
  );
  return { entities: [...allEntities], factions: factionHits };
}
