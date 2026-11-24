#!/usr/bin/env node
/**
 * F2 production validation — same book/chapter as F1, record final-context artifacts.
 * Persists L1–L4 via Final Context Viewer helpers (Studio-compatible path).
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
  verifyFinalContextIntegrity,
  assertFinalContextReadOnlyContract,
} from '../../packages/inkos-studio-server/src/writer-optimization/final-context-viewer.js';
import { resolveStoryClock } from '../../packages/inkos-core/src/lib/story-clock.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BOOK = path.join(ROOT, 'books/我的小说/books/凌晨四点世界刷新');
const OUT = path.join(ROOT, 'golden/story-architecture/validation-f2');
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
  const rows = [];

  for (const scene of shells) {
    console.log(`\n=== Scene ${scene.index}: ${scene.title} ===`);
    ctx.intent = intent;
    const dynamic = buildDynamicPrompt(ctx, scene);
    const l1Text = typeof dynamic === 'string' ? dynamic : dynamic?.text || '';
    const L2 = buildSceneWritePrompt(ctx, intent, scene, dynamic);
    scene.dynamic = dynamic;

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

    const clock = resolveStoryClock({ ctx, intent, scene });
    const sealedHash = hashPromptText(L3);
    persistFinalContextCompile(BOOK, CHAPTER, scene, {
      l1Text,
      l2Text: L2,
      l3Text: L3,
      sealedHash,
      clockSource: clock.source,
    });
    const callId = `f2-s${scene.index}-b1`;
    persistFinalContextWriterCall(BOOK, CHAPTER, scene, {
      userPrompt: L4,
      beatOrder: 1,
      callId,
    });

    // Actual generation still uses L2 brain path (same as F1); L4 is the Studio Beat input under observation
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
    const integrity = verifyFinalContextIntegrity(snap);
    const ro = assertFinalContextReadOnlyContract(BOOK, CHAPTER, scene.index);
    const row = {
      index: scene.index,
      title: scene.title,
      L3_clock: snap?.layers?.L3?.clock === true,
      L3_ib: snap?.layers?.L3?.ib === true,
      L4_clock: snap?.layers?.L4?.clock === true,
      L4_ib: snap?.layers?.L4?.ib === true,
      L3_hash: snap?.layers?.L3?.hash,
      L4_hash: snap?.layers?.L4?.hash,
      L4_beatUserPromptHash: snap?.layers?.L4?.beatUserPromptHash,
      hashMatch: snap?.layers?.L4?.hash === hashPromptText(L4)
        && snap?.layers?.L4?.beatUserPromptHash === snap?.layers?.L4?.hash,
      integrityOk: integrity.ok,
      readOnlyOk: ro.ok,
      writerCallId: snap?.writerCallId,
    };
    rows.push(row);
    fs.writeFileSync(path.join(OUT, `scene_${scene.index}_text.md`), text, 'utf8');
    fs.writeFileSync(path.join(OUT, `scene_${scene.index}_viewer.json`), JSON.stringify(snap, null, 2), 'utf8');
    console.log(
      `  L3 c/ib=${row.L3_clock}/${row.L3_ib} L4=${row.L4_clock}/${row.L4_ib}`
      + ` hashMatch=${row.hashMatch} integrity=${row.integrityOk}`,
    );
  }

  const pass = rows.every((r) => (
    r.L3_clock && r.L3_ib && r.L4_clock && r.L4_ib && r.hashMatch && r.integrityOk && r.readOnlyOk
  ));
  const verdict = { pass, verdict: pass ? 'F2 = PASS' : 'F2 = REAL FAILURE', scenes: rows };
  fs.writeFileSync(path.join(OUT, 'verdict.json'), JSON.stringify(verdict, null, 2), 'utf8');
  console.log('\n', verdict.verdict, '→', OUT);
  if (!pass) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
