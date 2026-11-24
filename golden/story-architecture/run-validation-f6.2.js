#!/usr/bin/env node
/**
 * F6.2 production validation — 凌晨四点世界刷新 Ch2 S1→S3
 * READ: production texts; WRITE: golden validation artifacts only (no Canon).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBrainContext } from '../../packages/inkos-brain/src/loader.js';
import { buildDynamicPrompt } from '../../packages/inkos-brain/src/prompt/dynamic-prompt.js';
import { buildSceneWritePrompt } from '../../packages/inkos-brain/src/scene/scene.js';
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
import {
  buildObservedContinuity,
  ensureObservedContinuity,
  collectPreviousObservedContinuity,
  formatObservedContinuityBlock,
  hasObservedContinuityMarkers,
} from '../../packages/inkos-prompt/src/scene-observed-continuity.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BOOK = path.join(ROOT, 'books/我的小说/books/凌晨四点世界刷新');
const OUT = path.join(ROOT, 'golden/story-architecture/validation-f6.2');
const CHAPTER = 2;

function loadProductionScenes() {
  const f = path.join(BOOK, 'novel/_system/brain', `ch_${String(CHAPTER).padStart(4, '0')}_scenes.json`);
  const data = JSON.parse(fs.readFileSync(f, 'utf8'));
  return (data.scenes || []).slice(0, 3).map((s) => ({
    index: s.index,
    id: s.id || `ch${CHAPTER}_s${s.index}`,
    title: s.title,
    goal: s.goal,
    conflict: s.conflict,
    entities: s.entities || ['苏晚'],
    beat: s.beat,
    wordTarget: s.wordTarget || 800,
    text: s.text || '',
    status: s.status,
  }));
}

function fileHash(rel) {
  const p = path.join(BOOK, 'novel', rel);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8');
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const scenes = loadProductionScenes();
  const beforeCanon = {
    '11_timeline.yaml': fileHash('11_timeline.yaml'),
    '13_fact_log.yaml': fileHash('13_fact_log.yaml'),
    '06_knowledge_matrix.yaml': fileHash('06_knowledge_matrix.yaml'),
  };

  for (const s of scenes) ensureObservedContinuity(s);

  const ctx = loadBrainContext(BOOK, { chapter: CHAPTER, present: ['苏晚', '林夜'] });
  const intent = {
    pov: ctx.pov || '苏晚',
    mainGoal: ctx.chapterTask?.['目标'] || scenes[0]?.goal || '',
    time: '10月27日',
    currentDate: '10月27日',
    scenes,
  };
  ctx.intent = intent;
  ctx.chapterIntent = intent;
  ctx.state = { ...(ctx.state || {}), 时间: '10月27日' };
  ctx.bookDir = BOOK;

  const rows = [];

  for (const scene of scenes) {
    const prev = scenes.filter((s) => Number(s.index) < Number(scene.index));
    const bundle = Number(scene.index) > 1
      ? collectPreviousObservedContinuity(prev, { planText: String(scene.goal || '') })
      : null;
    const ocBlock = formatObservedContinuityBlock(bundle, { canonical: '10月27日' });

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
      callId: `f62-s${scene.index}-b1`,
      intent,
      ctx,
    });

    const snap = loadFinalContextSnapshot(BOOK, CHAPTER, scene.index, { includeText: true });
    const ocProv = findProvenanceBlock(snap?.provenance, 'observed_continuity');

    const local = buildObservedContinuity(scene, scene.text);
    const checks = {
      hasLocalOc: Boolean(scene.observedContinuity),
      confirmedIds: (local?.confirmed || []).map((c) => c.id),
      unresolvedIds: (local?.unresolved || []).map((u) => u.id),
      prevConfirmed: (bundle?.confirmed || []).map((c) => c.id),
      prevUnresolved: (bundle?.unresolved || []).map((u) => u.id),
      L1hasOc: hasObservedContinuityMarkers(l1Text),
      L2hasOc: hasObservedContinuityMarkers(L2),
      L4hasOc: hasObservedContinuityMarkers(L4),
      ocProvType: ocProv?.type || null,
      ocProvReason: ocProv?.reason || null,
      ocProvKept: ocProv?.kept ?? null,
      planDidNotClearOpenChoice: Number(scene.index) === 3
        ? (bundle?.unresolved || []).some((u) => /^open_choice/.test(u.id))
        : null,
    };

    // Success criteria for this REAL FAILURE corpus
    if (scene.index === 2) {
      checks.s1HooksSurvived = ['door_warning', 'notebook_message', 'clock_anomaly']
        .every((id) => checks.prevConfirmed.includes(id));
      checks.pass = checks.s1HooksSurvived && (checks.L2hasOc || checks.L1hasOc) && checks.L4hasOc;
    } else if (scene.index === 3) {
      checks.pass = checks.planDidNotClearOpenChoice === true
        && (checks.L2hasOc || checks.L1hasOc)
        && checks.L4hasOc;
    } else {
      checks.pass = true;
    }

    const row = { scene: scene.index, title: scene.title, checks, pass: checks.pass };
    rows.push(row);

    fs.writeFileSync(path.join(OUT, `scene_${scene.index}_oc.json`), JSON.stringify({
      local,
      previousBundle: bundle,
      block: ocBlock,
    }, null, 2));
    fs.writeFileSync(path.join(OUT, `scene_${scene.index}_L2.md`), L2);
    fs.writeFileSync(path.join(OUT, `scene_${scene.index}_L4.md`), L4);
    fs.writeFileSync(path.join(OUT, `scene_${scene.index}_checks.json`), JSON.stringify(row, null, 2));
    console.log(JSON.stringify(row, null, 2));
  }

  const afterCanon = {
    '11_timeline.yaml': fileHash('11_timeline.yaml'),
    '13_fact_log.yaml': fileHash('13_fact_log.yaml'),
    '06_knowledge_matrix.yaml': fileHash('06_knowledge_matrix.yaml'),
  };
  const canonUnchanged = Object.keys(beforeCanon).every((k) => beforeCanon[k] === afterCanon[k]);

  const summary = {
    book: '凌晨四点世界刷新',
    chapter: CHAPTER,
    allPass: rows.every((r) => r.pass) && canonUnchanged,
    canonUnchanged,
    rows,
  };
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log('\n=== F6.2 production summary ===');
  console.log(JSON.stringify({
    allPass: summary.allPass,
    canonUnchanged,
    scenes: rows.map((r) => ({ s: r.scene, pass: r.pass })),
  }, null, 2));
  process.exit(summary.allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
