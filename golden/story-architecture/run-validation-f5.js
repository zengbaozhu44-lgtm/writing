#!/usr/bin/env node
/**
 * F5 production validation — Time Semantics on 凌晨四点世界刷新 Ch2 × 3
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
  hashPromptText,
  persistFinalContextCompile,
  persistFinalContextWriterCall,
  loadFinalContextSnapshot,
} from '../../packages/inkos-studio-server/src/writer-optimization/final-context-viewer.js';
import { findProvenanceBlock } from '../../packages/inkos-studio-server/src/writer-optimization/context-provenance.js';
import { resolveStoryClock } from '../../packages/inkos-core/src/lib/story-clock.js';
import { hasStoryClock, hasInformationBoundary } from '../../packages/inkos-core/src/lib/prompt-survival.js';
import { resolveWorldEventDay, classifySceneIndex } from '../../packages/inkos-core/src/lib/time-semantics.js';
import { buildStateDelta } from '../../packages/inkos-brain/src/memory/state-updater.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BOOK = path.join(ROOT, 'books/我的小说/books/凌晨四点世界刷新');
const OUT = path.join(ROOT, 'golden/story-architecture/validation-f5');
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
    ],
  };

  const intent = {
    pov: ctx.pov || '苏晚',
    mainGoal: ctx.chapterTask?.['目标'] || shells[0]?.goal || '',
    time: '10月27日',
    currentDate: '10月27日',
    scenes: shells.map((s, i) => (i === 0
      ? { ...s, text: '日期——六月十七日。旧承接记忆。' }
      : s)),
  };
  ctx.intent = intent;
  ctx.chapterIntent = intent;
  ctx.state = { ...(ctx.state || {}), 时间: '10月27日' };
  ctx.bookDir = BOOK;
  ctx.worldBible = fs.existsSync(path.join(BOOK, 'novel/01_world_bible.md'))
    ? fs.readFileSync(path.join(BOOK, 'novel/01_world_bible.md'), 'utf8')
    : '';

  // Contract probes (no Canon write)
  const worldDay = resolveWorldEventDay({ chapter: CHAPTER, time: intent.time });
  const delta = buildStateDelta(BOOK, CHAPTER, { intent, scenes: shells, chapterText: 'x' });
  const chapterAsDayBlocked = delta.timeline.day !== CHAPTER && worldDay.day == null;

  const writer = createLlmWriter();
  const rows = [];
  const generated = [];

  for (const scene of shells) {
    console.log(`\n=== Scene ${scene.index}: ${scene.title || scene.goal} ===`);
    const idxClass = classifySceneIndex(scene.index);
    const dynamic = buildDynamicPrompt(ctx, scene);
    const l1Text = typeof dynamic === 'string' ? dynamic : dynamic?.text || '';
    const L2 = buildSceneWritePrompt(ctx, intent, scene, dynamic);
    const clock = resolveStoryClock({ ctx, intent, scene });

    const { prompt: L3, meta: optMeta } = compileStudioWriterPrompt({
      basePrompt: L2,
      scene,
      chapter: CHAPTER,
      intent,
      ctx: { ...ctx, bookDir: BOOK },
      storyMemoryBlock: '',
      storyDna: {},
    });

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
    });

    persistFinalContextCompile(BOOK, CHAPTER, scene, {
      l1Text,
      l2Text: L2,
      l3Text: L3,
      sealedHash: hashPromptText(L3),
      clockSource: clock.source,
      intent,
      ctx,
      l1Modules: typeof dynamic === 'object' ? dynamic?.modules : null,
    });
    persistFinalContextWriterCall(BOOK, CHAPTER, scene, {
      userPrompt: L4,
      beatOrder: 1,
      callId: `f5-s${scene.index}-b1`,
      intent,
      ctx,
    });

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

    const snap = loadFinalContextSnapshot(BOOK, CHAPTER, scene.index, { includeText: true });
    const clockProv = findProvenanceBlock(snap?.provenance, 'story_clock');
    const histProv = findProvenanceBlock(snap?.provenance, 'prior_excerpt')
      || findProvenanceBlock(snap?.provenance, 'prev_summary');

    const checks = {
      clock: hasStoryClock(L2) && hasStoryClock(L3) && hasStoryClock(L4),
      clockCanonicalOct: /10月27日/.test(L2) && /10月27日/.test(String(clock.canonical || '')),
      juneNotCanonical: !/Canonical[^\n]*六月/.test(L2 + L3),
      histJuneOk: scene.index === 1 || /六月|Historical/u.test(L2 + L3 + (histProv ? 'Historical' : '')),
      chapterNotDate: !new RegExp(`Day\\s*${CHAPTER}\\b`).test(L4) || /10月27日/.test(L4),
      sceneIndexNarrative: idxClass.isNarrativeOrder && !idxClass.isWorldDate,
      chapterAsDayBlocked,
      clockProvOk: clockProv && clockProv.type !== 'historical',
      histProvOk: !histProv || histProv.type === 'historical' || histProv.type === 'unavailable',
      textLen: (text || '').length,
      textPreview: String(text || '').slice(0, 160).replace(/\n/g, ' '),
    };

    const pass = checks.clock && checks.clockCanonicalOct && checks.juneNotCanonical
      && checks.sceneIndexNarrative && checks.chapterAsDayBlocked
      && checks.clockProvOk && checks.textLen > 80;

    const row = {
      scene: scene.index,
      title: scene.title,
      checks,
      clock: { canonical: clock.canonical, source: clock.source },
      provenance: {
        story_clock: clockProv && { type: clockProv.type, source: clockProv.source, kept: clockProv.kept },
        historical: histProv && { type: histProv.type, key: histProv.key },
      },
      pass,
    };
    rows.push(row);

    fs.writeFileSync(path.join(OUT, `scene_${scene.index}_L2.md`), L2);
    fs.writeFileSync(path.join(OUT, `scene_${scene.index}_L4.md`), L4);
    fs.writeFileSync(path.join(OUT, `scene_${scene.index}_text.md`), text || '');
    fs.writeFileSync(path.join(OUT, `scene_${scene.index}_checks.json`), JSON.stringify(row, null, 2));

    console.log(JSON.stringify({ scene: scene.index, pass, checks, clock: row.clock }, null, 2));
  }

  const summary = {
    book: '凌晨四点世界刷新',
    chapter: CHAPTER,
    worldDayProbe: worldDay,
    deltaDay: delta.timeline.day,
    chapterAsDayBlocked,
    allPass: rows.every((r) => r.pass),
    rows,
  };
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log('\n=== F5 production summary ===');
  console.log(JSON.stringify({
    allPass: summary.allPass,
    chapterAsDayBlocked,
    deltaDay: delta.timeline.day,
    scenes: rows.map((r) => ({ s: r.scene, pass: r.pass, clock: r.clock.canonical })),
  }, null, 2));
  process.exit(summary.allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
