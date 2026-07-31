import fs from 'node:fs';
import path from 'node:path';
import { exists, readText } from '../lib/paths.js';
import { getBookPaths } from '../lib/book.js';
import { isBrainEnabled, loadBrainContext } from '../../../inkos-brain/src/loader.js';
import { planChapter } from '../../../inkos-brain/src/planner/planner.js';
import { buildDynamicPrompt } from '../../../inkos-brain/src/prompt/dynamic-prompt.js';

const TIER_LABELS = {
  0: '本章任务',
  1: '此刻状态',
  2: '人物与关系',
  3: '写作规则',
  4: '世界边界',
  5: '局势与时空',
};

export function buildWriteContext(bookDir, options = {}) {
  if (isBrainEnabled(bookDir)) return buildBrainWriteContext(bookDir, options);
  return buildLegacyWriteContext(bookDir, options);
}

function buildBrainWriteContext(bookDir, options = {}) {
  const ctx = loadBrainContext(bookDir, options);
  const intent = planChapter(ctx);
  const sceneIndex = options.sceneIndex ?? 1;
  const scene = intent.scenes[sceneIndex - 1] || intent.scenes[0];
  const dynamic = buildDynamicPrompt(ctx, scene);

  const intentBlock = formatIntent(intent);
  const sceneBlock = formatScene(scene);

  const bundle = [
    { tier: 0, path: 'brain/intent', label: 'Chapter Intent', chars: intentBlock.length, content: intentBlock },
    { tier: 0, path: `brain/scene/${scene.id}`, label: `Scene ${scene.index}`, chars: sceneBlock.length, content: sceneBlock },
    { tier: 1, path: 'brain/dynamic', label: 'Dynamic Context', chars: dynamic.totalChars, content: dynamic.text },
  ];

  const totalChars = bundle.reduce((s, f) => s + f.chars, 0);

  return {
    workflow: 'brainBeforeWrite',
    mode: 'dynamic',
    schemaVersion: 4,
    brainEnabled: true,
    bookDir,
    chapter: ctx.chapter,
    sceneId: scene.id,
    sceneIndex: scene.index,
    totalChars,
    fileCount: bundle.length,
    dynamicEntities: dynamic.entities,
    dynamicFactions: dynamic.factions,
    withinBudget: dynamic.withinBudget,
    attentionOrder: bundle.map((f) => ({ tier: f.tier, path: f.path, chars: f.chars })),
    files: bundle,
    intent,
    scene,
    prompt: renderBrainPrompt(intent, scene, dynamic),
  };
}

function formatIntent(intent) {
  return [
    '# Chapter Intent (Planner)',
    `- 主目标: ${intent.mainGoal}`,
    `- 阻碍: ${intent.obstacles.join(' / ')}`,
    `- 转折: ${intent.turningPoint}`,
    `- 结尾: ${intent.ending}`,
    `- Scenes: ${intent.scenes.length}`,
  ].join('\n');
}

function formatScene(scene) {
  return [
    `# Scene ${scene.index}: ${scene.title}`,
    `- 目标: ${scene.goal}`,
    `- 冲突: ${scene.conflict}`,
    `- 节拍: ${scene.beat}`,
  ].join('\n');
}

function renderBrainPrompt(intent, scene, dynamic) {
  return [
    '# Novel OS Brain — Dynamic Scene Context',
    '',
    `> Scene ${scene.index}/${intent.scenes.length} | ${dynamic.totalChars} chars | entities: ${dynamic.entities.join(', ')}`,
    '',
    formatIntent(intent),
    '',
    formatScene(scene),
    '',
    dynamic.text,
  ].join('\n');
}

function buildLegacyWriteContext(bookDir, options = {}) {
  const bp = getBookPaths(bookDir);
  if (bp.version !== 4) throw new Error(`仅支持 V4 书籍，当前版本: ${bp.version}`);

  const { pov, present = [] } = options;
  const m = bp.modules;
  const files = [];

  const add = (tier, relPath, label) => {
    const abs = path.isAbsolute(relPath) ? relPath : path.join(bookDir, relPath);
    if (!exists(abs)) return;
    files.push({ tier, path: relPath, label, content: readText(abs) });
  };

  add(0, 'novel/09_current_chapter.md', '09 Current Chapter');
  add(1, 'novel/08_current_state.md', '08 Current State');
  add(1, 'novel/13_facts_db.yaml', '13 Facts DB');
  add(1, 'novel/06_knowledge_matrix.yaml', '06 Knowledge Matrix');
  add(1, 'novel/14_resource_db.yaml', '14 Resource DB');

  if (pov) {
    const povFile = path.join(m.character_bible, `${pov}.md`);
    if (exists(povFile)) add(2, `novel/03_character_bible/${pov}.md`, `POV: ${pov}`);
  } else {
    for (const f of fs.readdirSync(m.character_bible).filter((x) => x.endsWith('.md') && !x.startsWith('_'))) {
      add(2, `novel/03_character_bible/${f}`, f);
    }
  }
  for (const name of present) {
    const f = `novel/03_character_bible/${name}.md`;
    if (exists(path.join(bookDir, f))) add(2, f, `出场: ${name}`);
  }
  add(2, 'novel/05_relationship_graph.yaml', '05 Relationship Graph');
  add(3, 'novel/02_writing_bible.md', '02 Writing Bible');
  add(4, 'novel/01_world_bible.md', '01 World Bible');
  if (exists(m.faction_bible)) {
    for (const f of fs.readdirSync(m.faction_bible).filter((x) => x.endsWith('.md') && !x.startsWith('_'))) {
      add(4, `novel/04_faction_bible/${f}`, f);
    }
  }
  add(5, 'novel/07_state_board.md', '07 State Board');
  add(5, 'novel/11_timeline.yaml', '11 Timeline');
  add(5, 'novel/12_foreshadow_db.yaml', '12 Foreshadow DB');

  files.sort((a, b) => a.tier - b.tier);

  const bundle = files.map((f) => ({
    tier: f.tier,
    tierLabel: TIER_LABELS[f.tier],
    path: f.path,
    label: f.label,
    chars: f.content.length,
    content: f.content,
  }));

  const totalChars = bundle.reduce((s, f) => s + f.chars, 0);

  return {
    workflow: 'beforeWrite',
    mode: 'tier',
    schemaVersion: 4,
    brainEnabled: false,
    bookDir,
    totalChars,
    fileCount: bundle.length,
    attentionOrder: bundle.map((f) => ({ tier: f.tier, path: f.path, chars: f.chars })),
    files: bundle,
    prompt: renderLegacyPrompt(bundle),
  };
}

function renderLegacyPrompt(bundle) {
  const parts = [
    '# InkOS V4 — Before Write Context',
    '',
    '> 按注意力 Tier 0→5 排序。优先遵守 Tier 0-1。',
    '',
  ];
  let lastTier = -1;
  for (const f of bundle) {
    if (f.tier !== lastTier) {
      parts.push(`## Tier ${f.tier}: ${TIER_LABELS[f.tier]}`, '');
      lastTier = f.tier;
    }
    parts.push(`### ${f.label}`, `<!-- ${f.path} (${f.chars} chars) -->`, '', f.content, '', '---', '');
  }
  return parts.join('\n');
}

export function formatContextMarkdown(ctx) {
  return ctx.prompt;
}
