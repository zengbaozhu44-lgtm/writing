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
import { selectEntities, filterCharacters, filterFactions, filterKnowledgeForPrompt, formatCharacterCardForPrompt } from './entity-selector.js';
import { formatNpcActivityForPrompt } from './npc-activity-block.js';
import { rankEntities, importanceMap, trimEntitiesByImportance } from './importance.js';
import {
  assembleMinimalSR,
  formatCharacterSRForPrompt,
} from '../../inkos-core/src/lib/minimal-sr.js';
import { resolveStoryClock } from '../../inkos-core/src/lib/story-clock.js';
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
import {
  ensureObservedContinuity,
  collectPreviousObservedContinuity,
  formatObservedContinuityBlock,
} from './scene-observed-continuity.js';
import {
  ensurePlanValidity,
  isExecutionPrivilegeDemoted,
  formatPlanValidityDemotionBlock,
} from './plan-validity.js';
import {
  collectPreviousActualEvents,
  formatActualEventsBlock,
} from '../../inkos-brain/src/events/actual-events-prompt.js';
import { loadCharacterSRState } from '../../inkos-brain/src/character/character-sr-updater.js';
import { formatActionIntentTruthForPrompt } from '../../inkos-brain/src/causality/index.js';
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

/**
 * Phase 1.R2: prefer in-session intent.scenes texts (fresh) over disk legacy.
 */
export function resolvePreviousScenes(ctx, scene) {
  const currentIndex = scene.index;
  const fromIntent = (ctx.intent?.scenes || ctx.chapterIntent?.scenes || [])
    .filter((s) => Number(s.index) < Number(currentIndex) && String(s.text || '').trim());
  if (fromIntent.length) return fromIntent;
  if (!ctx.bookDir) return [];
  return loadPreviousSceneTexts(ctx.bookDir, ctx.chapter, currentIndex);
}

/**
 * EO-P4-Chapter-Seam-Actual-Readback-01: Scene 1 of chapter N+1 has no
 * same-chapter predecessors, so the Actual/WCT readback would silently drop
 * at the chapter seam. Consume the prior chapter's persisted scenes
 * (ch_(N)_scenes.json carries actualEvents + worldConsequenceTruth).
 *
 * Consume-only: same occurrence/WCT readback semantics, writesCanon/SR/Reality
 * false, Plan cannot create. Fail-closed: no file / no text → [].
 * Bounded to the last 2 scenes to keep the seam readback compact.
 */
export function loadPriorChapterScenesForActual(bookDir, chapter) {
  const ch = Number(chapter);
  if (!bookDir || !Number.isFinite(ch) || ch <= 1) return [];
  const file = path.join(brainSystemDir(bookDir), `ch_${String(ch - 1).padStart(4, '0')}_scenes.json`);
  if (!exists(file)) return [];
  let data;
  try {
    data = readJson(file);
  } catch {
    return [];
  }
  const scenes = Array.isArray(data?.scenes) ? data.scenes : [];
  return scenes.filter((s) => s && String(s.text || '').trim()).slice(-2);
}

function summaryTextHash(text) {
  let h = 0;
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < s.length; i += 1) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return String(h);
}

function buildOrLoadSummaries(bookDir, chapter, prevScenes) {
  const stored = loadSceneSummaries(bookDir, chapter);
  const summaries = [];
  for (const ps of prevScenes) {
    const textHash = summaryTextHash(ps.text);
    let entry = stored.scenes?.find((s) => s.sceneId === ps.id || s.index === ps.index);
    // Phase 1.R2: invalidate stale cache when underlying scene text changed
    if (!entry || entry.sourceTextHash !== textHash) {
      entry = extractSceneSummary(ps, ps.text);
      if (entry) {
        entry.sourceTextHash = textHash;
        saveSceneSummary(bookDir, chapter, entry);
      }
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

/**
 * D3：causal_chain 渲染块（protected —— 不走预算裁剪，须完整进入 Writer 语境）。
 * 只把链上真实存在的字段投影；缺失依据以 no_causal_basis 字面呈现，绝不模板补位。
 *
 * Phase 4.4.1d-R S1+S2 (AA20):
 * Writer-facing = Narrative Fuel / Authorial Planned Direction only.
 * ≠ Character Choice Fact · ≠ Attribution · ≠ Character Causal History · ≠ Choice Authority.
 * causal_chain.choice field remains in data; projection must not certify “角色已作出 Choice”.
 */
export function renderCausalChain(causalChain, scene = {}, ctx = {}) {
  if (!causalChain || typeof causalChain !== 'object') return '';
  const pov = scene.pov || ctx.pov || '';
  const lines = [];

  if (causalChain.desire?.who || causalChain.desire?.wants) {
    lines.push(`- 欲望（desire）: 「${causalChain.desire.who || '?'}」想 ${causalChain.desire.wants || '?'}`);
  }
  if (causalChain.pressure?.obstacle) {
    lines.push(`- 压力（pressure）: ${causalChain.pressure.obstacle}`);
  }
  // S8.2-R3：无 authored direction 时禁止 Options A/B 证书语——只诚实标缺口
  // S8.2-R5-D / S1：outcome 一律 Authored/Declared
  // S2：不得投影 Chosen / 已选 / 由 X 做出 / 选择主体 等 Character Choice certificate
  const choiceAction = causalChain.choice?.action || null;
  if (!choiceAction) {
    const missingLabel = Array.isArray(causalChain.no_causal_basis)
      && causalChain.no_causal_basis.includes('missing_choice_basis')
      ? 'missing_choice_basis'
      : '未确认';
    lines.push(`- Authorial Planned Direction: ${missingLabel}`);
  } else {
    if (Array.isArray(causalChain.options) && causalChain.options.length) {
      lines.push('- Options（作者给定选项空间）——可文学化表达；不得另造对立主线；≠ Character Choice Fact:');
      causalChain.options.forEach((o, i) => {
        const tag = 'ABC'[i] || '?';
        const detail = [
          o.benefit ? `收益: ${o.benefit}` : '',
          o.cost ? `代价: ${o.cost}` : '',
        ].filter(Boolean).join(' · ');
        lines.push(`  ${tag}. ${o.action || '?'}${detail ? ` [${detail}]` : ''}`);
      });
    }
    const actor = causalChain.choice.actor || pov || '主角';
    lines.push(`- Authorial Planned Direction: ${choiceAction}`);
    lines.push(`- Narrative focus character: 「${actor}」（作者向导航 · ≠ Character Choice · ≠ Attribution）`);
    if (causalChain.choice.reason) {
      lines.push(`- Authored direction reason: ${causalChain.choice.reason}`);
    }
    if (causalChain.choice.pov_relation === 'non_pov' || (pov && actor !== pov)) {
      lines.push(`- ⚠ Narrative focus: 该方向以世界角色「${actor}」为叙事主体呈现（非 POV「${pov}」内心）；以世界压力/他人行为写，不得改写成 POV 内心 Character Choice Fact`);
    }
  }
  if (causalChain.consequence?.immediate || causalChain.consequence?.long_term) {
    const im = causalChain.consequence.immediate || '?';
    const lt = causalChain.consequence.long_term ? `（长期: ${causalChain.consequence.long_term}）` : '';
    lines.push(`- Authored / Declared outcome: ${im}${lt}`);
    lines.push('- （剧情约束 / 作者向 outcome；≠ Character Choice consequence · ≠ Attribution · ≠ Phase 5 Consequence）');
  }
  if (causalChain.new_information?.revealed) {
    lines.push(`- 新信息（new_information）: ${causalChain.new_information.revealed}`);
  }
  if (causalChain.next_pressure?.pressure) {
    lines.push(`- 下一压力（next_pressure）: ${causalChain.next_pressure.pressure}`);
  }
  if (Array.isArray(causalChain.no_causal_basis) && causalChain.no_causal_basis.length) {
    lines.push(`- 缺因果依据（no_causal_basis）: ${causalChain.no_causal_basis.join(' / ')}`);
  }

  if (!lines.length) return '';
  return [
    '### 因果链 · 叙事草图（作者向 · 非角色已决事实）',
    '> Narrative Fuel / Authorial Planned Direction · ≠ Character Choice · ≠ Attribution · ≠ Character Causal History',
    '> 不得另造对立主线；不得把本块读成角色已经选择或已经承担后果的证书',
    ...lines,
  ].join('\n');
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
  const causalChain = scene.causalChain || intent?.causalChain || null;
  const { profile, budget, adaptiveBlock } = getAdaptiveBudget(scene, intent, { bookDir, ctx });
  const relevanceStats = loadRelevanceStats(bookDir);

  const characters = filterCharacters(ctx, entities);
  const factions = filterFactions(ctx, factionNames);

  // F4: filter knowledge BEFORE ranking — unknown must not enter Writer TopK
  const knowledgeForPrompt = filterKnowledgeForPrompt(ctx, entities, { pov: ctx.pov });
  const ctxForRank = {
    ...ctx,
    knowledge: { ...(ctx.knowledge || {}), matrix: knowledgeForPrompt },
  };

  // Phase 1.R2: Story Clock before prior summaries — mark historical vs current
  const clock = resolveStoryClock({ ctx, intent, scene });

  // Prefer in-session intent.scenes texts over legacy disk (R3-B1)
  const prevScenes = resolvePreviousScenes(ctx, scene);
  const summaries = buildOrLoadSummaries(bookDir, chapter, prevScenes);

  // F6.2: scene-local Observed Continuity (text projection; not Plan / Canon / SR)
  for (const ps of prevScenes) ensureObservedContinuity(ps);
  const prevObserved = Number(scene.index) > 1
    ? collectPreviousObservedContinuity(prevScenes, {
      planText: String(scene.goal || ''),
      sceneGoal: String(scene.goal || ''),
    })
    : null;
  const observedContinuityBlock = formatObservedContinuityBlock(prevObserved, clock);
  ctx.previousObservedContinuity = prevObserved;

  // Phase 1: Actual Events (text-derived; ≠ Plan / Canon / SR) — read-only for N+1
  // EO-P4-Chapter-Seam-Actual-Readback-01: 同章前场为空且章号>1 时，
  // 章缝 Scene 1 消费上一章持久化 Actual/WCT（consume-only，fail-closed）
  const prevScenesForActual = (Number(scene.index) > 1 && prevScenes.length)
    ? prevScenes
    : loadPriorChapterScenesForActual(bookDir, chapter);
  const prevActual = prevScenesForActual.length
    ? collectPreviousActualEvents(prevScenesForActual)
    : null;
  const actualEventsBlock = formatActualEventsBlock(prevActual);
  ctx.previousActualEvents = prevActual;

  // F8.3: Plan Validity (session/prompt; before Goal is treated as direct command)
  if (!scene.planValidity) ensurePlanValidity(scene, intent || ctx.intent || {});
  const demoted = isExecutionPrivilegeDemoted(scene.planValidity);
  const planValidityBlock = formatPlanValidityDemotionBlock(scene.planValidity);

  const snapshot = snapshotContext(ctx);
  const prevSnapshot = loadContextSnapshot(bookDir, chapter);
  const diff = diffContext(prevSnapshot, snapshot);
  saveContextSnapshot(bookDir, chapter, snapshot);

  // S5：章级目标取自 intent.mainGoal（authoredPlan.goal / 经 Planner 的 canonical），禁止 raw 09 整卡
  const chapterGoal = String(intent?.mainGoal || '').trim();
  const chapterGoalForPrompt =
    chapterGoal && chapterGoal !== 'no_causal_basis' ? chapterGoal : '';

  const inputHash = hashPrompt({
    sceneId: scene.id,
    entities,
    factions: factionNames,
    diff: contextDiffHash(diff),
    goal: scene.goal,
    chapterGoal: chapterGoalForPrompt || null,
    beat: scene.beat,
    profile,
    validator: cacheValidation.hashes,
    // D3：causal_chain 进 hash —— 链变化时 prompt 缓存必须失效（否则旧缓存缺因果块）
    causal: causalChain ? JSON.stringify(causalChain) : null,
    // Phase 1.R2：Story Clock + 前序摘要角色变化时必须失效旧 compiled cache
    storyClock: clock?.canonical || null,
    prevSummaries: summaries.map((s) => `${s.index}:${s.sourceTextHash || s.summary}`).join('|'),
    // F6.2：Observed Continuity 变化时失效缓存
    observedContinuity: prevObserved
      ? `${(prevObserved.confirmed || []).map((c) => c.id).join(',')}|${(prevObserved.unresolved || []).map((u) => u.id).join(',')}`
      : null,
    // Phase 1：Actual Events 变化时失效缓存
    actualEvents: prevActual
      ? (prevActual.events || []).map((e) => e.id).join(',')
      : null,
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
    content: demoted
      ? [
        `目标〔STRATEGIC · 保留〕: ${scene.goal}`,
        '开场前提执行资格: demoted — 禁止当作已成立开场直接执行；须先承接/结算/桥接 Actual。',
        `节拍: ${scene.beat}`,
        planValidityBlock,
      ].filter(Boolean).join('\n')
      : `目标: ${scene.goal}\n节拍: ${scene.beat}`,
  });

  add({
    key: 'scene_conflict',
    label: 'Scene 冲突',
    category: 'conflict',
    priority: 98,
    content: `冲突: ${scene.conflict}\n阻碍: ${scene.conflict || intent?.obstacles?.[0] || '—'}`,
  });

  // S5：删除 currentChapterMd → chapter_task 整卡注入（B 类模板 / 跨章污染后门）。
  // 正式投影 canonical chapter goal = intent.mainGoal；不投影 required_event（S3.3 边界）。
  if (chapterGoalForPrompt) {
    add({
      key: 'chapter_goal',
      label: '本章目标',
      category: 'goal',
      priority: 90,
      content: truncateByTokens(chapterGoalForPrompt, budget.goal),
    });
  }
  if (summaries.length) {
    add({
      key: 'prev_summary',
      label: '前序 Scene',
      category: 'history',
      priority: 85,
      content: formatPreviousSummaries(summaries, clock),
    });
  }
  // F6.2: higher than prev_summary so unresolved/confirmed survive ordinary history trim
  if (observedContinuityBlock) {
    add({
      key: 'observed_continuity',
      label: 'Previous Scene Observed Continuity',
      category: 'history',
      priority: 89,
      content: observedContinuityBlock,
    });
  }
  // Phase 1 / 4.4.1d-R S3: Occurrence Events — continuity fuel (≠ Attribution certificate)
  if (actualEventsBlock) {
    add({
      key: 'actual_events',
      label: 'Previous Scene Occurrence Events',
      category: 'history',
      priority: 91,
      content: actualEventsBlock,
    });
  }
  const cont = buildContinuationBlock(scene.index, summaries[summaries.length - 1]?.summary, clock);
  if (cont) add({ key: 'continuation', label: '续写', category: 'goal', priority: 95, content: cont });

  if (scene.index <= 1 || diff.isFull) {
    add({ key: 'state', label: '当前状态', category: 'history', priority: 80, content: truncateByTokens(ctx.currentStateMd, budget.history) });
  } else {
    add({ key: 'state_diff', label: '状态差量', category: 'history', priority: 80, content: formatContextDiff(diff) });
  }

  const factPool = diff.isFull ? ctx.facts.slice(-20) : (diff.facts || []).map((f) => ({ fact: f }));
  const rankedCtx = rankContextForCompiler(ctxForRank, scene, intent, {
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
    if (!c) continue;
    // F4.1: whitelist only — never c.raw (fail-closed minimal identity if empty)
    const card = formatCharacterCardForPrompt(c, name);
    const cardText = typeof card === 'string' ? card : card?.text || '';
    if (!cardText.trim()) continue;
    add({
      key: `char:${name}`,
      label: `人物:${name}`,
      category: 'character',
      priority: importance,
      content: truncateByTokens(cardText, Math.floor(budget.character / Math.max(1, sortedChars.length))),
      fallbackUsed: Boolean(card?.fallbackUsed),
      cardMode: card?.mode || 'whitelist',
    });
  }

  // Phase 1: Minimal SR read-only projection on shared compile path (CLI + Studio)
  // Phase 3.2: merge Actual→IB→CharacterSR runtime state (sidecar / scene attach)
  if (!ctx.characterSRRuntime && bookDir && chapter) {
    const loaded = loadCharacterSRState(bookDir, chapter);
    if (loaded) ctx.characterSRRuntime = loaded;
  }
  if (scene?.characterSRState) {
    ctx.characterSRRuntime = scene.characterSRState;
  }
  const relevantSRNames = sortedChars.map((c) => c.name).filter(Boolean);
  const characterSR = assembleMinimalSR({
    ctx,
    scene,
    names: relevantSRNames.length ? relevantSRNames : [ctx.pov, ...(ctx.present || [])].filter(Boolean),
  });
  ctx.characterSR = characterSR;
  const srBlock = formatCharacterSRForPrompt(characterSR, Object.keys(characterSR));
  if (srBlock) {
    // SR 槽位压力下保全：预算紧张时固定 IB 前言与长 Awareness 列表会吃掉全部上限，
    // 导致 Interpretation/Belief/Stance（人物主观状态核心）整段丢失。
    // 无压力时块原样保留；有压力时主观三槽优先、分组均衡截断（presentation-only）。
    const cap = Math.min(800, Math.floor(budget.character * 0.5) || 600);
    const maxChars = Math.floor(cap * 1.5);
    const srNames = Object.keys(characterSR);
    const marks = srNames
      .map((n) => `### ${n}`)
      .map((m) => srBlock.indexOf(m))
      .filter((i) => i >= 0);
    const firstIdx = marks.length ? Math.min(...marks) : -1;
    let srContent;
    if (firstIdx < 0 || srBlock.length <= maxChars) {
      srContent = srBlock;
    } else {
      const head = srBlock.slice(0, firstIdx);
      const groups = srBlock.slice(firstIdx).split(/(?=\n- \*\*)/);
      const isCore = (g) => /\*\*(Interpretation|Belief|Stance)\*\*/.test(g.slice(0, 40));
      const ordered = [...groups].sort((a, b) => (isCore(a) ? 0 : 1) - (isCore(b) ? 0 : 1));
      let body = ordered.join('');
      if (head.length + body.length > maxChars) {
        const per = Math.max(60, Math.floor((maxChars - 40) / ordered.length));
        body = ordered.map((g) => (g.length > per ? `${g.slice(0, per)}…` : g)).join('');
      }
      const headKeep = Math.max(0, Math.min(head.length, maxChars - body.length));
      srContent = head.slice(0, headKeep) + body;
    }
    add({
      key: 'character_sr',
      label: 'Character Subjective State',
      category: 'character',
      priority: 88,
      content: truncateByTokens(srContent, cap),
    });
  }

  // EO-P4-Causal-Bridge-01: Action Intent Truth (STORY TRUTH · consume-only · ≠ Choice · ≠ SR)
  const actionIntentTruth = scene?.actionIntentTruth || ctx?.actionIntentTruth || null;
  const intentTruthBlock = formatActionIntentTruthForPrompt(actionIntentTruth)
    || scene?._actionIntentPromptBlock
    || '';
  if (intentTruthBlock) {
    add({
      key: 'action_intent_truth',
      label: 'Action Intent Truth',
      category: 'character',
      priority: 89,
      content: truncateByTokens(intentTruthBlock, 400),
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

  // WL-03: NPC off-screen life — authored-only 世界层背景；带 Access 边界；≠ POV 经验
  const npcActivityBlock = formatNpcActivityForPrompt(ctx.npcActivity, { pov: ctx.pov });
  if (npcActivityBlock) {
    add({ key: 'npc_offscreen_life', label: 'NPC 动向（世界层）', category: 'world', priority: 42, content: truncateByTokens(npcActivityBlock, 240) });
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

  const causalBlock = causalChain ? renderCausalChain(causalChain, scene, ctx) : '';
  // F6.2: if budget dropped observed_continuity module, append after clip (survival)
  const ocSurvived = selected.some((m) => m.key === 'observed_continuity');
  const ocTail = (!ocSurvived && observedContinuityBlock) ? observedContinuityBlock : '';
  const baseText = renderPrompt(selected, scene, { totalTokens, profile, cacheHitRate, compileMs });
  const text = [baseText, causalBlock, ocTail].filter(Boolean).join('\n');
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
    modules: selected.map((m) => ({
      key: m.key,
      label: m.label,
      tokens: m.tokens,
      category: m.category,
      ...(m.fallbackUsed ? { fallbackUsed: true, cardMode: m.cardMode || 'minimal_identity' } : {}),
    })),
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
