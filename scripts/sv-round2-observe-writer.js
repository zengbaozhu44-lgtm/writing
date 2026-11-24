#!/usr/bin/env node
/**
 * Story Validation Round 2 — observation harness (NOT a product change).
 * Uses production Writer path:
 *   loadBrainContext → assembleMinimalSR/compileScenePrompt → createLlmWriter
 * Does NOT modify packages/*. Writes only under golden/story-architecture/sv-r2-output/
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBrainContext } from '../packages/inkos-brain/src/loader.js';
import { buildDynamicPrompt } from '../packages/inkos-brain/src/prompt/dynamic-prompt.js';
import { buildSceneWritePrompt } from '../packages/inkos-brain/src/scene/scene.js';
import { createLlmWriter, isLlmConfigured } from '../packages/inkos-brain/src/writer/llm-writer.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BOOK = path.join(ROOT, 'books/我的小说/books/_sv_r2_凌晨四点');
const OUT = path.join(ROOT, 'golden/story-architecture/sv-r2-output');

function loadExistingScenes(chapter) {
  const f = path.join(BOOK, 'novel/_system/brain', `ch_${String(chapter).padStart(4, '0')}_scenes.json`);
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}

async function main() {
  if (!isLlmConfigured()) {
    console.error('LLM not configured');
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });

  const chapter = 1;
  const existing = loadExistingScenes(chapter);
  const scenesPlan = (existing.scenes || []).slice(0, 3).map((s) => ({
    index: s.index,
    id: s.id,
    title: s.title,
    goal: s.goal,
    conflict: s.conflict,
    entities: s.entities || ['苏晚', '林夜'],
    beat: s.beat || 'situation',
    wordTarget: Math.min(s.wordTarget || 700, 700),
    status: 'pending',
  }));

  const ctx = loadBrainContext(BOOK, {
    chapter,
    pov: '苏晚',
    present: ['苏晚', '林夜'],
  });
  ctx.intent = {
    pov: '苏晚',
    mainGoal: '让林夜经历第一次世界刷新并确认真实性；苏晚侧保持不确定',
    obstacles: ['无人相信', '证据消失'],
  };

  const writer = createLlmWriter();
  const written = [];
  const promptArtifacts = [];

  for (const scene of scenesPlan) {
    const dynamicPrompt = buildDynamicPrompt(ctx, scene);
    const loreText = dynamicPrompt?.text || '';
    const hasSR = loreText.includes('Character Subjective State');
    const writePrompt = buildSceneWritePrompt(ctx, ctx.intent, scene, dynamicPrompt);
    const promptText = typeof writePrompt === 'string' ? writePrompt : (writePrompt?.text || writePrompt?.prompt || JSON.stringify(writePrompt));

    promptArtifacts.push({
      scene: scene.index,
      hasCharacterSubjectiveState: hasSR,
      srSnippet: hasSR
        ? loreText.slice(loreText.indexOf('Character Subjective State'), loreText.indexOf('Character Subjective State') + 1200)
        : null,
      characterSRSummary: Object.fromEntries(
        Object.entries(ctx.characterSR || {}).map(([n, sr]) => [n, {
          awareness: sr.awareness?.status,
          stance: sr.stance?.status,
          motive: sr.motive?.status,
          affect: sr.affect_relationship?.status,
          validity: sr.validity?.value,
        }]),
      ),
      promptHasSR: String(promptText).includes('Character Subjective State')
        || String(promptText).includes('Awareness')
        || hasSR,
    });

    console.log(`\n== Writing Scene ${scene.index}: ${scene.title} (SR in lore: ${hasSR}) ==`);
    const result = await writer({
      bookDir: BOOK,
      chapter,
      scene,
      ctx,
      intent: ctx.intent,
      dynamicPrompt,
      prompt: writePrompt,
    });

    const text = typeof result === 'string' ? result : (result?.text || result?.content || '');
    scene.text = text;
    scene.status = 'written';
    written.push({
      index: scene.index,
      title: scene.title,
      goal: scene.goal,
      conflict: scene.conflict,
      entities: scene.entities,
      text,
      wordCount: [...text].length,
    });
    console.log(`  words≈${[...text].length} head=${text.slice(0, 120).replace(/\n/g, ' ')}`);
  }

  const payload = {
    at: new Date().toISOString(),
    bookDir: BOOK,
    chapter,
    path: 'loadBrainContext → compileScenePrompt(buildDynamicPrompt) → buildSceneWritePrompt → createLlmWriter',
    characterSRAtStart: ctx.characterSR,
    promptArtifacts,
    scenes: written,
  };
  fs.writeFileSync(path.join(OUT, 'round2-generation.json'), JSON.stringify(payload, null, 2));
  fs.writeFileSync(
    path.join(OUT, 'round2-prose.md'),
    written.map((s) => `# Scene ${s.index}: ${s.title}\n\n**Goal**: ${s.goal}\n\n**Conflict**: ${s.conflict}\n\n${s.text}\n`).join('\n---\n\n'),
  );
  console.log('\nWrote', path.join(OUT, 'round2-generation.json'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
