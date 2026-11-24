#!/usr/bin/env node
/**
 * F1 production validation — Round F1
 * Shared Brain/Studio compile path + ≥3 continuous scenes.
 * Asserts Clock/IB survive L2 → L3 sealed → L4 Beat before/while writing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBrainContext } from '../../packages/inkos-brain/src/loader.js';
import { buildDynamicPrompt } from '../../packages/inkos-brain/src/prompt/dynamic-prompt.js';
import { buildSceneWritePrompt } from '../../packages/inkos-brain/src/scene/scene.js';
import { createLlmWriter, isLlmConfigured } from '../../packages/inkos-brain/src/writer/llm-writer.js';
import { compileStudioWriterPrompt } from '../../packages/inkos-studio-server/src/writer-optimization/compile-writer-prompt.js';
import { compileSlimBeatUserPrompt } from '../../packages/inkos-studio-server/src/writer-optimization/beat-slimmer.js';
import {
  hasStoryClock,
  hasInformationBoundary,
} from '../../packages/inkos-core/src/lib/prompt-survival.js';
import { formatCharacterSRForPrompt } from '../../packages/inkos-core/src/lib/minimal-sr.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BOOK = path.join(ROOT, 'books/我的小说/books/凌晨四点世界刷新');
const OUT = path.join(ROOT, 'golden/story-architecture/validation-f1');
const CHAPTER = 2;

function loadSceneShells(bookDir, chapter) {
  const f = path.join(bookDir, 'novel/_system/brain', `ch_${String(chapter).padStart(4, '0')}_scenes.json`);
  const data = JSON.parse(fs.readFileSync(f, 'utf8'));
  return (data.scenes || []).slice(0, 3).map((s) => ({
    index: s.index,
    id: s.id || `ch${chapter}_s${s.index}`,
    title: s.title,
    goal: s.goal,
    conflict: s.conflict,
    entities: s.entities || ['苏晚'],
    beat: s.beat,
    wordTarget: Math.min(s.wordTarget || 650, 650),
    status: 'pending',
  }));
}

function dateProbe(text) {
  const t = String(text || '');
  return {
    hasJune: /六月|6\s*月/.test(t),
    hasOct: /十月|10\s*月|10月27/.test(t),
    juneAsCurrent: /今天[^\n]{0,20}六月|日期[—\-：:]*\s*六月|日历[^\n]{0,12}六月/.test(t),
  };
}

async function main() {
  if (!isLlmConfigured()) {
    console.error('LLM not configured');
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });

  const shells = loadSceneShells(BOOK, CHAPTER);
  const ctx = loadBrainContext(BOOK, { chapter: CHAPTER, present: ['苏晚', '林夜'] });
  ctx.knowledge = {
    matrix: [
      { info: '林夜声称昨天出了车祸', 苏晚: 'partial', 林夜: 'know' },
      { info: '办公室效率系统日常流程', 苏晚: 'know', 林夜: 'partial' },
      { info: '世界每天凌晨四点硬重置', 苏晚: 'unknown', 林夜: 'partial' },
      { info: '苏晚是伊甸观察节点', 苏晚: 'unknown', 林夜: 'unknown' },
    ],
  };
  ctx.relationships = [
    { from: '苏晚', to: '林夜', trust: 2, hostility: 0, cooperation: 'colleague' },
  ];

  const intent = {
    pov: ctx.pov || '苏晚',
    mainGoal: ctx.chapterTask?.['目标'] || shells[0]?.goal || '',
    time: '10月27日',
    currentDate: '10月27日',
    scenes: shells,
    mustLose: ctx.chapterTask?.['代价'] || '',
  };
  ctx.intent = intent;
  ctx.chapterIntent = intent;
  ctx.state = { ...(ctx.state || {}), 时间: '10月27日' };
  ctx.bookDir = BOOK;
  ctx.worldBible = fs.existsSync(path.join(BOOK, 'novel/01_world_bible.md'))
    ? fs.readFileSync(path.join(BOOK, 'novel/01_world_bible.md'), 'utf8')
    : '';

  const writer = createLlmWriter();
  const generated = [];
  const meta = {
    at: new Date().toISOString(),
    phase: 'F1',
    clock: '10月27日',
    book: '凌晨四点世界刷新',
    chapter: CHAPTER,
    scenes: [],
  };

  for (const scene of shells) {
    console.log(`\n=== Scene ${scene.index}: ${scene.title} ===`);
    ctx.intent = intent;
    ctx.chapterIntent = intent;

    const dynamic = buildDynamicPrompt(ctx, scene);
    const L2 = buildSceneWritePrompt(ctx, intent, scene, dynamic);
    fs.writeFileSync(path.join(OUT, `scene_${scene.index}_L2.md`), L2, 'utf8');

    const { prompt: L3, compiled, meta: optMeta } = compileStudioWriterPrompt({
      basePrompt: L2,
      scene,
      chapter: CHAPTER,
      intent,
      ctx: { ...ctx, bookDir: BOOK },
      storyMemoryBlock: '',
      storyDna: {},
    });
    fs.writeFileSync(path.join(OUT, `scene_${scene.index}_L3.md`), L3, 'utf8');

    const L4 = compileSlimBeatUserPrompt({
      beat: {
        order: 1,
        label: '开场',
        content: String(scene.goal || '').slice(0, 40),
        libraryBeat: '开场',
        wordBudget: 220,
      },
      executionPlan: optMeta?.executionPlan || {
        beats: [{ order: 1, label: '开场', wordBudget: 220 }],
        sceneIndex: scene.index,
        scenePlan: { goal: scene.goal },
        pov: intent.pov,
      },
      intent,
      scene,
      basePrompt: L3,
      accumulatedText: '',
    });
    fs.writeFileSync(path.join(OUT, `scene_${scene.index}_L4.md`), L4, 'utf8');

    const survival = {
      L2_clock: hasStoryClock(L2),
      L2_ib: hasInformationBoundary(L2),
      L3_clock: hasStoryClock(L3),
      L3_ib: hasInformationBoundary(L3),
      L3_p1_clock: hasStoryClock(compiled?.layers?.p1 || ''),
      L3_historical_prior: /Historical Continuity|非当前日历/u.test(compiled?.layers?.p3 || L3),
      L4_clock: hasStoryClock(L4),
      L4_ib: hasInformationBoundary(L4),
      L4_canonical: /10月27日/.test(L4),
    };

    const text = await writer({
      scene,
      prompt: L2,
      chapter: CHAPTER,
      bookDir: null,
      ctx,
      intent,
    });
    scene.text = text;
    generated.push({ ...scene });
    intent.scenes = shells.map((s) => generated.find((x) => x.index === s.index) || s);

    const body = dateProbe(text);
    meta.scenes.push({
      index: scene.index,
      title: scene.title,
      survival,
      body,
      text_chars: text.length,
      text_preview: text.slice(0, 350),
    });
    fs.writeFileSync(path.join(OUT, `scene_${scene.index}_text.md`), text, 'utf8');
    fs.writeFileSync(
      path.join(OUT, `scene_${scene.index}_sr.md`),
      formatCharacterSRForPrompt(ctx.characterSR || {}) || '(none)',
      'utf8',
    );

    console.log(
      `  L2 c/ib=${survival.L2_clock}/${survival.L2_ib}`
      + ` L3=${survival.L3_clock}/${survival.L3_ib}`
      + ` L4=${survival.L4_clock}/${survival.L4_ib}`
      + ` bodyJune=${body.hasJune} bodyOct=${body.hasOct}`,
    );
  }

  fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');

  const allSurvive = meta.scenes.every((s) => (
    s.survival.L2_clock && s.survival.L2_ib
    && s.survival.L3_clock && s.survival.L3_ib
    && s.survival.L4_clock && s.survival.L4_ib
    && s.survival.L4_canonical
  ));
  const noJuneCurrent = meta.scenes.every((s) => !s.body.juneAsCurrent && !s.body.hasJune);
  const report = {
    allSurvive,
    noJuneCurrent,
    verdict: allSurvive && noJuneCurrent ? 'F1 = PASS' : 'F1 = REAL FAILURE',
  };
  fs.writeFileSync(path.join(OUT, 'verdict.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log('\n', report.verdict, '→', OUT);
  if (!allSurvive || !noJuneCurrent) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
