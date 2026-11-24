#!/usr/bin/env node
/**
 * F4 production validation — Entity Hygiene on 凌晨四点世界刷新 Ch2 × 3 Scenes
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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BOOK = path.join(ROOT, 'books/我的小说/books/凌晨四点世界刷新');
const OUT = path.join(ROOT, 'golden/story-architecture/validation-f4');
const CHAPTER = 2;
const KEYS = [
  'story_clock',
  'information_boundary',
  'character_context',
  'knowledge',
  'entity',
  'character_sr',
];
const SECRET_MARKERS = [/secret_future_fact/i, /作者全知/, /真实目标：觉醒伊甸/];
const UNKNOWN_FACT = '世界每天凌晨四点硬重置';

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
  };
}

function countCharCards(text) {
  const m = String(text || '').match(/### 人物[：:]/gu);
  return m ? m.length : 0;
}

async function main() {
  if (!isLlmConfigured()) {
    console.error('LLM not configured — cannot run real production validation');
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });

  const shells = loadSceneShells(BOOK, CHAPTER);
  const ctx = loadBrainContext(BOOK, { chapter: CHAPTER, present: ['苏晚', '林夜'] });
  // Inject asymmetry matrix for hygiene check (does not write Canon files)
  ctx.knowledge = {
    matrix: [
      { info: '林夜声称昨天出了车祸', 苏晚: 'partial', 林夜: 'know' },
      { info: '办公室效率系统日常流程', 苏晚: 'know', 林夜: 'partial' },
      { info: UNKNOWN_FACT, 苏晚: 'unknown', 林夜: 'partial' },
      { info: '苏晚是伊甸观察节点', 苏晚: 'unknown', 林夜: 'unknown' },
    ],
  };
  ctx.relationships = [{ from: '苏晚', to: '林夜', trust: 2, hostility: 0, cooperation: 'colleague' }];

  // Inject omniscient raw on a non-present character to prove non-leak
  if (ctx.characters) {
    for (const [name, c] of Object.entries(ctx.characters)) {
      if (!c) continue;
      c.secret = c.secret || `bible_secret_${name}`;
      c.realGoal = c.realGoal || `bible_realGoal_${name}`;
      c.raw = `${c.raw || ''}\nsecret_future_fact_${name}\n- **秘密**：作者全知勿泄\n`;
    }
    ctx.characters['旁观者甲'] = {
      name: '旁观者甲',
      identity: '无关路人',
      secret: '无关全知秘密',
      raw: '大段无关 Lore secret_future_fact_bystander',
    };
  }

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
  const rows = [];
  const generated = [];

  for (const scene of shells) {
    console.log(`\n=== Scene ${scene.index}: ${scene.title || scene.goal} ===`);
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
      callId: `f4-s${scene.index}-b1`,
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

    const presentNames = new Set([
      intent.pov,
      ...(scene.entities || []),
      ...(ctx.present || []),
    ].filter(Boolean));

    const checks = {
      clock: hasStoryClock(L2) && hasStoryClock(L3) && hasStoryClock(L4),
      ib: hasInformationBoundary(L2) && hasInformationBoundary(L3) && hasInformationBoundary(L4),
      characterContext: /### 人物|Character Subjective State|人物：/u.test(l1Text + L2),
      unknownAbsent: !l1Text.includes(UNKNOWN_FACT) && !L4.includes(UNKNOWN_FACT),
      rawSecretAbsent: !SECRET_MARKERS.some((re) => re.test(l1Text) || re.test(L4)),
      bystanderAbsent: !/### 人物：旁观者甲|无关路人/u.test(l1Text),
      charCards: countCharCards(l1Text),
      textLen: (text || '').length,
      textPreview: String(text || '').slice(0, 180).replace(/\n/g, ' '),
    };

    const row = {
      scene: scene.index,
      title: scene.title,
      entities: scene.entities,
      presentNames: [...presentNames],
      checks,
      provenance: blocks,
      pass: checks.clock && checks.ib && checks.characterContext && checks.unknownAbsent
        && checks.rawSecretAbsent && checks.bystanderAbsent && checks.textLen > 80,
    };
    rows.push(row);

    fs.writeFileSync(path.join(OUT, `scene_${scene.index}_L1.md`), l1Text);
    fs.writeFileSync(path.join(OUT, `scene_${scene.index}_L4.md`), L4);
    fs.writeFileSync(path.join(OUT, `scene_${scene.index}_text.md`), text || '');
    fs.writeFileSync(path.join(OUT, `scene_${scene.index}_provenance.json`), JSON.stringify(blocks, null, 2));
    fs.writeFileSync(path.join(OUT, `scene_${scene.index}_checks.json`), JSON.stringify(row, null, 2));

    console.log(JSON.stringify({
      scene: scene.index,
      pass: row.pass,
      checks,
      entity: blocks.entity,
      knowledge: blocks.knowledge,
      character_context: blocks.character_context,
    }, null, 2));
  }

  const summary = {
    book: '凌晨四点世界刷新',
    chapter: CHAPTER,
    scenes: rows.length,
    allPass: rows.every((r) => r.pass),
    rows,
  };
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log('\n=== F4 production summary ===');
  console.log(JSON.stringify({ allPass: summary.allPass, scenes: rows.map((r) => ({ s: r.scene, pass: r.pass })) }, null, 2));
  process.exit(summary.allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
