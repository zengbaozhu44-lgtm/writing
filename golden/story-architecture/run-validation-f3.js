#!/usr/bin/env node
/**
 * F3 production validation — provenance on Ch2 × 3 Scenes
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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BOOK = path.join(ROOT, 'books/我的小说/books/凌晨四点世界刷新');
const OUT = path.join(ROOT, 'golden/story-architecture/validation-f3');
const CHAPTER = 2;
const KEYS = ['story_clock', 'information_boundary', 'prior_excerpt', 'prev_summary', 'character_sr'];

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

function summarizeBlock(b) {
  if (!b) return null;
  return {
    key: b.key,
    source: b.source,
    type: b.type,
    priority: b.priority,
    kept: b.kept,
    reason: b.reason,
    L2: b.layers?.L2,
    L3: b.layers?.L3,
    L4: b.layers?.L4,
    note: b.note || null,
    channels: b.channels || null,
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
  ctx.relationships = [{ from: '苏晚', to: '林夜', trust: 2, hostility: 0, cooperation: 'colleague' }];

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
      callId: `f3-s${scene.index}-b1`,
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
    const blocks = {};
    for (const key of KEYS) {
      blocks[key] = summarizeBlock(findProvenanceBlock(snap?.provenance, key));
    }

    const clockOk = blocks.story_clock?.kept
      && blocks.story_clock?.L3 === 'present'
      && blocks.story_clock?.L4 === 'present'
      && blocks.story_clock?.type === 'plan'
      && /intent/.test(blocks.story_clock?.source || '');
    const ibOk = blocks.information_boundary?.kept
      && blocks.information_boundary?.type === 'guard'
      && blocks.information_boundary?.L4 === 'present';
    const hist = blocks.prior_excerpt || blocks.prev_summary;
    const histOk = !hist || hist.type === 'historical';
    // Scene1 may have no prior; Scene2+ should explain June demotion if prior exists
    const juneExplained = scene.index === 1
      || !hist
      || (hist.type === 'historical' && /historical_continuity|budget_trim|unavailable/.test(hist.reason || ''));

    const row = {
      index: scene.index,
      title: scene.title,
      clockOk,
      ibOk,
      histOk,
      juneExplained,
      blocks,
      bodyHasJune: /六月/.test(text),
    };
    rows.push(row);
    fs.writeFileSync(path.join(OUT, `scene_${scene.index}_provenance.json`), JSON.stringify(snap?.provenance || {}, null, 2));
    fs.writeFileSync(path.join(OUT, `scene_${scene.index}_text.md`), text, 'utf8');
    console.log(
      `  clock=${clockOk} ib=${ibOk} hist=${histOk} juneExplained=${juneExplained}`
      + ` clock.src=${blocks.story_clock?.source} prior.type=${hist?.type || 'n/a'}`,
    );
  }

  const pass = rows.every((r) => r.clockOk && r.ibOk && r.histOk && r.juneExplained && !r.bodyHasJune);
  const verdict = {
    pass,
    verdict: pass ? 'F3 = PASS' : 'F3 = REAL FAILURE',
    scenes: rows,
  };
  fs.writeFileSync(path.join(OUT, 'verdict.json'), JSON.stringify(verdict, null, 2));
  console.log('\n', verdict.verdict, '→', OUT);
  if (!pass) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
