#!/usr/bin/env node
/**
 * Phase 1.R / Story Validation Round 3
 * Production path + Information Boundary + Story Clock.
 * Live books have empty 06/05 — Case B uses ephemeral ctx overlay (not written to novel/).
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
const OUT = path.join(ROOT, 'golden/story-architecture/validation-round3');
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

  // Case B overlay — ephemeral only (production 06/05 empty). Documents honesty in report.
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
  // Lock calendar from established chapter lore (not invent 六月)
  const intent = {
    pov: ctx.pov || '苏晚',
    mainGoal: ctx.chapterTask?.['目标'] || shells[0]?.goal || '',
    time: '10月27日',
    currentDate: '10月27日',
    scenes: shells,
    mustLose: ctx.chapterTask?.['代价'] || '',
  };
  ctx.intent = intent;
  ctx.state = { ...(ctx.state || {}), 时间: '10月27日' };

  fs.writeFileSync(path.join(OUT, '00_note.md'), [
    '# Round 3 setup',
    '',
    '- Production novel/06 and 05 are empty.',
    '- Case B uses ephemeral knowledge/relationship overlay in memory only (not written to novel/).',
    '- Story clock locked to 10月27日 for Plan/State regression.',
    '',
  ].join('\n'));

  const writer = createLlmWriter();
  const generated = [];
  const meta = {
    at: new Date().toISOString(),
    book: '凌晨四点世界刷新',
    chapter: CHAPTER,
    clock: '10月27日',
    overlay: true,
    scenes: [],
  };

  for (const scene of shells) {
    console.log(`\n=== Scene ${scene.index}: ${scene.title} ===`);
    const dynamic = buildDynamicPrompt(ctx, scene);
    const loreText = typeof dynamic === 'string' ? dynamic : dynamic?.text || '';
    const prompt = buildSceneWritePrompt(ctx, intent, scene, dynamic);
    fs.writeFileSync(path.join(OUT, `scene_${scene.index}_prompt.md`), prompt, 'utf8');
    fs.writeFileSync(
      path.join(OUT, `scene_${scene.index}_sr.md`),
      formatCharacterSRForPrompt(ctx.characterSR || {}) || '(none)',
      'utf8',
    );

    const text = await writer({
      scene,
      prompt,
      chapter: CHAPTER,
      bookDir: null,
      ctx,
      intent: { ...intent, scenes: [...generated.map((g) => ({ ...g })), scene] },
    });
    scene.text = text;
    generated.push({ ...scene });
    intent.scenes = shells.map((s) => {
      const g = generated.find((x) => x.index === s.index);
      return g || s;
    });

    meta.scenes.push({
      index: scene.index,
      title: scene.title,
      hasBoundary: prompt.includes('信息边界'),
      hasClock: prompt.includes('Story Clock') && prompt.includes('10月27日'),
      hasSR: loreText.includes('Character Subjective State'),
      hasInfoBoundaryInSR: loreText.includes('Information Boundary'),
      awarenessPresent: /Awareness[\s\S]*know|partial/.test(loreText),
      text_chars: text.length,
      text_preview: text.slice(0, 350),
    });
    fs.writeFileSync(path.join(OUT, `scene_${scene.index}_text.md`), text, 'utf8');
    console.log(`  boundary=${meta.scenes.at(-1).hasBoundary} clock=${meta.scenes.at(-1).hasClock} chars=${text.length}`);
  }

  fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');
  console.log('\nRound 3 complete →', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
