#!/usr/bin/env node
/**
 * Phase 1.R2 / Story Validation Round 4
 * Same Studio/Brain path as Round 3, with R3-B1 consumption repair:
 * - ctx.intent mounted (as Studio/Runtime now do)
 * - compileScenePrompt prefers intent.scenes texts + clock-labeled summaries
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
const OUT = path.join(ROOT, 'golden/story-architecture/validation-round4');
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
    juneAsCurrentLook: /今天[^\n]{0,20}六月|日期[—\-：:]*\s*六月|日历[^\n]{0,12}六月/.test(t),
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

  fs.writeFileSync(path.join(OUT, '00_note.md'), [
    '# Round 4 setup (Phase 1.R2)',
    '',
    '- Same production path as Round 3.',
    '- R3-B1 fix: resolvePreviousScenes + clock-labeled summaries + ctx.intent mount.',
    '- Clock locked to 10月27日. Legacy disk may still contain 六月.',
    '',
  ].join('\n'));

  const writer = createLlmWriter();
  const generated = [];
  const meta = {
    at: new Date().toISOString(),
    book: '凌晨四点世界刷新',
    chapter: CHAPTER,
    clock: '10月27日',
    phase: '1.R2',
    scenes: [],
  };

  for (const scene of shells) {
    console.log(`\n=== Scene ${scene.index}: ${scene.title} ===`);
    // Mirror Studio: remount intent each scene (orchestrator does this)
    ctx.intent = intent;
    ctx.chapterIntent = intent;

    const dynamic = buildDynamicPrompt(ctx, scene);
    const loreText = typeof dynamic === 'string' ? dynamic : dynamic?.text || '';
    const prompt = buildSceneWritePrompt(ctx, intent, scene, dynamic);
    fs.writeFileSync(path.join(OUT, `scene_${scene.index}_prompt.md`), prompt, 'utf8');
    fs.writeFileSync(
      path.join(OUT, `scene_${scene.index}_sr.md`),
      formatCharacterSRForPrompt(ctx.characterSR || {}) || '(none)',
      'utf8',
    );

    const promptProbe = {
      hasCanonical: /10月27日/.test(prompt) && /Story Clock|Canonical/.test(prompt),
      hasHistoricalLabel: /Historical Continuity|历史承接/.test(prompt),
      hasUnlabeledJunePrior: scene.index > 1
        && /Previous[^\n]*六月|前序 Scene[\s\S]{0,200}六月/.test(prompt)
        && !/Historical Continuity|历史承接|≠|禁止当作今天/.test(prompt),
    };

    const text = await writer({
      scene,
      prompt,
      chapter: CHAPTER,
      bookDir: null,
      ctx,
      intent,
    });
    scene.text = text;
    generated.push({ ...scene });
    intent.scenes = shells.map((s) => {
      const g = generated.find((x) => x.index === s.index);
      return g || s;
    });

    const bodyProbe = dateProbe(text);
    meta.scenes.push({
      index: scene.index,
      title: scene.title,
      hasBoundary: prompt.includes('信息边界'),
      hasClock: promptProbe.hasCanonical,
      hasHistoricalLabel: promptProbe.hasHistoricalLabel,
      hasUnlabeledJunePrior: promptProbe.hasUnlabeledJunePrior,
      body: bodyProbe,
      text_chars: text.length,
      text_preview: text.slice(0, 400),
    });
    fs.writeFileSync(path.join(OUT, `scene_${scene.index}_text.md`), text, 'utf8');
    console.log(
      `  clock=${promptProbe.hasCanonical} histLabel=${promptProbe.hasHistoricalLabel}`
      + ` unlabeledJune=${promptProbe.hasUnlabeledJunePrior}`
      + ` bodyJune=${bodyProbe.hasJune} bodyOct=${bodyProbe.hasOct} chars=${text.length}`,
    );
  }

  fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');
  console.log('\nRound 4 complete →', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
