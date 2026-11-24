/**
 * Writer Prompt 编译 — Studio 仅组装 CompilationContext，禁止编译后拼接
 * 单一入口：@inkos/runtime PromptCompiler.compile()
 */
import fs from 'node:fs';
import path from 'node:path';
import { writeJson } from '../../../inkos-core/src/lib/paths.js';
import { buildPromptRulesBlock } from './prompt-rules.js';
import { buildCommercialWriterRulesBlock } from './commercial-writer-rules.js';
import { buildChapterTitleBlock, resolveChapterSuspenseTitle } from './chapter-title.js';
import { buildContinuationBlock } from './continuation-engine.js';
import { deriveSceneBoundaries, buildBoundaryBlock } from './scene-boundary.js';
import { buildRevealBlock, buildRevisitBlock } from './reveal-manager.js';
import { generateSceneHook, buildHookBlock } from './hook-generator.js';
import { loadAdaptiveAdjustments, buildAdaptivePromptBlock } from '@inkos/adaptive-learning';
import {
  buildWriterExecutionChecklist,
  loadDirectorOverrides,
  loadAdaptiveHints,
  buildAdaptivePlannerBlock,
  resolveVoiceDna,
} from '@inkos/director';
import {
  compile as compilePrompt,
  unwrapCompiledText,
  resolveProtectedVoiceDna,
} from '../../../inkos-runtime/src/compiler/prompt-compiler.js';
import { formatHierarchyContext } from '../../../inkos-runtime/src/memory/memory-hierarchy.js';
import { resolveExecutionPlan } from './beat-execution.js';
import { readStoryDna } from '../system-store.js';
import {
  formatGoldenSampleBlock,
  resolveGoldenSample,
} from './sample-driven-writer.js';
import { wrapHistoricalPriorExcerpt, markContinuationHistorical } from '../../../inkos-core/src/lib/prompt-survival.js';

export function getWriterOptimizationDir(bookDir) {
  return path.join(bookDir, 'novel', '_system', 'studio', 'writer-optimization');
}

export function collectPriorScenesText(intent, sceneIndex, scenes = null) {
  const list = Array.isArray(scenes) && scenes.length ? scenes : (intent?.scenes || []);
  return list
    .filter((s) => s.index < sceneIndex && s.text?.trim())
    .map((s) => s.text)
    .join('\n\n');
}

/**
 * 组装 CompilationContext → 统一 compile()
 * @returns {{ prompt: string, compiled: import('@inkos/runtime').CompiledPrompt, meta: object }}
 */
export function compileStudioWriterPrompt({
  basePrompt = '',
  scene,
  chapter,
  intent,
  ctx,
  storyMemoryBlock = '',
  storyDna = null,
  chapterDir = null,
  tokenBudget = null,
  scenes = null,
  storyMemory = null,
}) {
  // 优先用传入的工作 scenes 数组（orchestrator 循环中已回写正文），再回退 intent.scenes
  const workScenes = Array.isArray(scenes) && scenes.length ? scenes : (intent?.scenes || []);
  const sceneIndex = scene?.index ?? 1;
  const priorText = collectPriorScenesText(intent, sceneIndex, workScenes);
  const prevScene = workScenes.find((s) => s.index === sceneIndex - 1);
  const prevTail = prevScene?.text?.slice(-120) || '';
  const dna = storyDna || (ctx?.bookDir ? readStoryDna(ctx.bookDir) : {}) || {};

  const executionPlan = resolveExecutionPlan(scene, intent, chapterDir);
  const boundaries = deriveSceneBoundaries(scene, intent, { prevHook: prevTail, chapter });
  const continuation = buildContinuationBlock({
    scene: { ...scene, executionPlan },
    intent,
    scenes: workScenes,
    chapter,
  });
  const reveal = buildRevealBlock({ chapter, scene, priorScenesText: priorText });
  const revisit = buildRevisitBlock({ chapter, scene, priorScenesText: priorText, storyMemory });
  const hookSpec = generateSceneHook(scene, boundaries, intent);
  const bookDir = ctx?.bookDir;
  const directorOverrides = bookDir && chapter != null
    ? (intent?._adaptiveDirectorOverrides || loadDirectorOverrides(bookDir, chapter))
    : null;
  const adaptiveHints = bookDir && chapter != null ? loadAdaptiveHints(bookDir, chapter) : [];
  const legacyAdjustments = bookDir ? loadAdaptiveAdjustments(bookDir) : null;
  const adaptiveBlock = directorOverrides || adaptiveHints.length
    ? buildAdaptivePlannerBlock(adaptiveHints, {
      sceneIndex,
      directorOverrides,
    })
    : (legacyAdjustments ? buildAdaptivePromptBlock(legacyAdjustments) : '');
  const commercialRules = String(process.env.INKOS_PROMPT_RULES || '').toLowerCase() === 'legacy'
    ? buildCommercialWriterRulesBlock({ chapter, scene, intent, storyDna: dna })
    : ''; // 样本驱动默认不灌商业禁令长文
  const writerChecklist = buildWriterExecutionChecklist({
    executionPlan,
    intent: {
      ...intent,
      _adaptiveDirectorOverrides: directorOverrides || intent?._adaptiveDirectorOverrides,
    },
    chapter,
    sceneIndex,
  });
  const promptRulesBlock = buildPromptRulesBlock();
  const goldenSample = resolveGoldenSample({
    bookDir,
    styleDna: ctx?.styleDna || intent?.styleDna || {},
    writingBible: ctx?.writingBible || '',
  });
  const goldenSampleBlock = formatGoldenSampleBlock(goldenSample);
  const chapterTitleBlock = sceneIndex === 1
    ? buildChapterTitleBlock(intent, chapter, dna)
    : '';
  const boundaryBlock = buildBoundaryBlock(boundaries);
  const hookBlock = buildHookBlock(hookSpec);
  // Anchor Voice DNA 优先强制继承；仅无 Anchor 时才解析新 DNA
  const anchoredVoice = resolveProtectedVoiceDna({
    voiceDna: intent?.voiceDna,
    intent,
    priorAnchor: intent?.priorAnchor,
  });
  const voiceDna = anchoredVoice || resolveVoiceDna({
    storyDna: dna,
    styleDna: {
      ...(ctx?.styleDna || intent?.styleDna || {}),
      goldenSample,
      sampleLines: (ctx?.styleDna?.sampleLines || intent?.styleDna?.sampleLines || goldenSample.split('\n').filter(Boolean).slice(0, 8)),
    },
    intent,
    sceneRhythm: executionPlan.sceneRhythm,
    climaxRole: executionPlan.climaxRole,
    readerEmotion: executionPlan.readerEmotion,
  });
  if (voiceDna && intent && !intent.voiceDna) {
    intent.voiceDna = { ...voiceDna, forced: Boolean(anchoredVoice), goldenSample };
  }

  const suspenseTitle = resolveChapterSuspenseTitle(intent, chapter, dna);
  if (sceneIndex === 1 && intent && !intent.chapterTitle) {
    intent.chapterTitle = suspenseTitle;
  }

  // lore：旧 Brain basePrompt / dynamic compile 结果并入 P2，禁止事后 join
  const loreText = String(basePrompt || '').trim();
  const worldBible = String(ctx?.worldBible || '').trim();
  const hierarchyBlock = bookDir
    ? formatHierarchyContext(bookDir, chapter)
    : '';
  const mergedMemory = [storyMemoryBlock, hierarchyBlock].filter(Boolean).join('\n\n');

  const compiled = compilePrompt({
    scene,
    chapter,
    intent,
    executionPlan,
    storyDna: dna,
    voiceDna,
    loreText,
    worldBible,
    storyMemoryBlock: mergedMemory,
    adaptiveBlock,
    priorExcerpt: priorText ? wrapHistoricalPriorExcerpt(priorText.slice(-800)) : wrapHistoricalPriorExcerpt(prevTail),
    continuationBlock: markContinuationHistorical(continuation.block),
    boundaryBlock,
    revealBlock: reveal,
    revisitBlock: revisit,
    hookBlock,
    commercialRules,
    promptRulesBlock,
    goldenSampleBlock,
    chapterTitleBlock,
    writerChecklist,
    wordBudget: scene?.wordTarget || executionPlan.wordTarget,
    tokenBudget: tokenBudget || undefined,
  });

  return {
    prompt: unwrapCompiledText(compiled),
    compiled,
    meta: {
      boundaries,
      continuation,
      hookSpec,
      chapter,
      sceneIndex,
      chapterTitle: suspenseTitle,
      executionPlan,
      sceneOutcome: executionPlan.sceneOutcome,
      beatExecution: true,
      writerMode: process.env.INKOS_WRITER_MODE || 'beat',
      goldenSampleChars: goldenSample.length,
      promptCompiler: compiled.meta,
      tokens: compiled.tokens,
      budget: compiled.budget,
      sealed: true,
    },
  };
}

export function persistWriterOptimizationMeta(bookDir, chapter, scene, meta) {
  try {
    const dir = path.join(getWriterOptimizationDir(bookDir), `ch_${String(chapter).padStart(4, '0')}`);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `scene_${String(scene?.index ?? 0).padStart(2, '0')}.json`);
    writeJson(file, { ...meta, updatedAt: new Date().toISOString() });
    return file;
  } catch {
    return null;
  }
}

export function persistBeatExecutionLog(bookDir, chapter, scene, result) {
  try {
    const dir = path.join(getWriterOptimizationDir(bookDir), `ch_${String(chapter).padStart(4, '0')}`);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `scene_${String(scene?.index ?? 0).padStart(2, '0')}_beats.json`);
    writeJson(file, {
      sceneIndex: scene?.index,
      sceneType: result.executionPlan?.sceneType ?? null,
      parts: result.parts?.map((p) => ({
        order: p.beat.order,
        structuralBeat: p.beat.structuralBeat,
        libraryBeat: p.beat.libraryBeat,
        chars: p.text.replace(/\s/g, '').length,
        beatStateDelta: p.beatStateDelta ?? null,
        beatPlan: p.beat?.beatPlan ?? null,
        stateChange: p.beatStateDelta?.stateChange ?? null,
        afterState: p.beatStateDelta?.afterState ?? null,
        textPreview: p.text?.slice(0, 120) || '',
        runtimeV2: p.validation
          ? {
            pass: p.validation.pass,
            attempts: p.attempts,
            rewritten: p.rewritten,
            failReasons: p.validation.failReasons?.slice(0, 6) || [],
            storyBefore: p.validation.storyState?.before?.slice(0, 40),
            storyAfter: p.validation.storyState?.after?.slice(0, 40),
            microPassed: p.validation.microScene?.passed || [],
          }
          : p.beatStateDelta?.runtimeV2 || null,
      })),
      beatMemory: result.beatMemory ?? null,
      beatStateDeltas: result.beatStateDeltas ?? [],
      runtimeSession: result.runtimeSession
        ? {
          lastEvent: result.runtimeSession.lastEvent,
          beforeState: result.runtimeSession.beforeState,
          rewriteCounts: result.runtimeSession.rewriteCounts,
        }
        : null,
      runtimeV2: Boolean(result.runtimeV2),
      sceneOutcome: result.sceneOutcome,
      updatedAt: new Date().toISOString(),
    });
    return file;
  } catch {
    return null;
  }
}
