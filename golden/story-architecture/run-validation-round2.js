#!/usr/bin/env node
/**
 * Story Validation Round 2 — observation only.
 * Uses production Writer path (loadBrainContext → compileScenePrompt → createLlmWriter).
 * Does NOT modify production packages. Writes artifacts under golden/story-architecture/ only.
 * Does NOT inject SR test data.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBrainContext } from '../../packages/inkos-brain/src/loader.js';
import { buildDynamicPrompt } from '../../packages/inkos-brain/src/prompt/dynamic-prompt.js';
import { buildSceneWritePrompt } from '../../packages/inkos-brain/src/scene/scene.js';
import { createLlmWriter, isLlmConfigured } from '../../packages/inkos-brain/src/writer/llm-writer.js';
import { formatCharacterSRForPrompt } from '../../packages/inkos-core/src/lib/minimal-sr.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BOOK = path.join(ROOT, 'books/我的小说/books/凌晨四点世界刷新');
const OUT = path.join(ROOT, 'golden/story-architecture/validation-round2');
const CHAPTER = 2;

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}

function loadSceneShells(bookDir, chapter) {
  const f = path.join(
    bookDir,
    'novel/_system/brain',
    `ch_${String(chapter).padStart(4, '0')}_scenes.json`,
  );
  const data = JSON.parse(fs.readFileSync(f, 'utf8'));
  return (data.scenes || []).slice(0, 3).map((s) => ({
    index: s.index,
    id: s.id || `ch${chapter}_s${s.index}`,
    title: s.title,
    goal: s.goal,
    conflict: s.conflict,
    entities: s.entities || [],
    beat: s.beat,
    wordTarget: Math.min(s.wordTarget || 700, 700),
    status: 'pending',
  }));
}

async function main() {
  if (!isLlmConfigured()) {
    console.error('LLM not configured');
    process.exit(1);
  }
  ensureDir(OUT);

  const shells = loadSceneShells(BOOK, CHAPTER);
  if (shells.length < 3) {
    console.error('Need ≥3 scene shells, got', shells.length);
    process.exit(1);
  }

  const present = [...new Set(shells.flatMap((s) => s.entities || []))].filter(Boolean);
  const ctx = loadBrainContext(BOOK, {
    chapter: CHAPTER,
    present: present.length ? present : undefined,
  });

  const intent = {
    pov: ctx.pov,
    mainGoal: ctx.chapterTask?.['目标'] || ctx.chapterTask?.goal || shells[0]?.goal || '',
    scenes: shells,
    mustLose: ctx.chapterTask?.['代价'] || '',
  };
  ctx.intent = intent;

  const meta = {
    at: new Date().toISOString(),
    book: '凌晨四点世界刷新',
    chapter: CHAPTER,
    path: 'loadBrainContext → buildDynamicPrompt(compileScenePrompt) → buildSceneWritePrompt → createLlmWriter',
    pov: ctx.pov,
    present: ctx.present,
    characterSR_summary: {},
    scenes: [],
  };

  for (const [name, sr] of Object.entries(ctx.characterSR || {})) {
    meta.characterSR_summary[name] = {
      awareness: sr.awareness?.status,
      stance: sr.stance?.status,
      motive: sr.motive?.status,
      affect: sr.affect_relationship?.status,
      awareness_n: sr.awareness?.items?.length || 0,
      affect_n: sr.affect_relationship?.items?.length || 0,
      seeds_n: sr.long_term_motive_seeds?.length || 0,
    };
  }

  fs.writeFileSync(
    path.join(OUT, '00_sr_at_load.md'),
    formatCharacterSRForPrompt(ctx.characterSR || {}) || '(empty SR projection)\n',
    'utf8',
  );

  const writer = createLlmWriter();
  const generated = [];

  for (const scene of shells) {
    console.log(`\n=== Writing Scene ${scene.index}: ${scene.title} ===`);
    const dynamic = buildDynamicPrompt(ctx, scene);
    const loreText = typeof dynamic === 'string' ? dynamic : dynamic?.text || '';
    const hasSRBlock = loreText.includes('Character Subjective State');
    const prompt = buildSceneWritePrompt(ctx, intent, scene, dynamic);

    fs.writeFileSync(
      path.join(OUT, `scene_${scene.index}_prompt.md`),
      prompt,
      'utf8',
    );

    // Metrics dir isolated — do not write into live book brain metrics as primary artifact
    const text = await writer({
      scene,
      prompt,
      chapter: CHAPTER,
      bookDir: null,
      ctx,
      intent: { ...intent, scenes: [...generated, scene] },
    });

    scene.text = text;
    generated.push(scene);
    intent.scenes = shells.map((s) => {
      const g = generated.find((x) => x.index === s.index);
      return g ? { ...s, text: g.text } : s;
    });

    meta.scenes.push({
      index: scene.index,
      title: scene.title,
      goal: scene.goal,
      conflict: scene.conflict,
      entities: scene.entities,
      sr_in_compileScenePrompt: hasSRBlock,
      sr_in_writer_prompt: prompt.includes('Character Subjective State'),
      prompt_chars: prompt.length,
      text_chars: text.length,
      text_preview: text.slice(0, 400),
    });

    fs.writeFileSync(path.join(OUT, `scene_${scene.index}_text.md`), text, 'utf8');
    console.log(`  SR in prompt: ${hasSRBlock} · text chars: ${text.length}`);
  }

  fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');
  console.log('\nRound 2 generation complete →', OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
