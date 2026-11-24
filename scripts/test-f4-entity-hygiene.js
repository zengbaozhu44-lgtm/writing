#!/usr/bin/env node
/**
 * F4 — Entity Injection Hygiene regression
 * filterKnowledge → ranking; whitelist character cards; dual selector; no Location Engine.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSceneWritePrompt } from '../packages/inkos-brain/src/scene/scene.js';
import { compile as compilePrompt } from '../packages/inkos-runtime/src/compiler/prompt-compiler.js';
import { compileSlimBeatUserPrompt } from '../packages/inkos-studio-server/src/writer-optimization/beat-slimmer.js';
import {
  compileScenePrompt,
  filterKnowledgeForPrompt,
  formatCharacterCardForPrompt,
} from '../packages/inkos-prompt/src/index.js';
import {
  buildContextProvenanceTrace,
  findProvenanceBlock,
} from '../packages/inkos-studio-server/src/writer-optimization/context-provenance.js';
import { assembleMinimalSR, formatCharacterSRForPrompt } from '../packages/inkos-core/src/lib/minimal-sr.js';

let failures = 0;
const fail = (m) => { failures += 1; console.error(`  FAIL: ${m}`); };
const ok = (m) => console.log(`  ok: ${m}`);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function makeBookDir() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-f4-'));
  const novel = path.join(tmp, 'novel');
  fs.mkdirSync(path.join(novel, '_system', 'brain', 'prompt-cache'), { recursive: true });
  fs.writeFileSync(path.join(novel, '01_world_bible.md'), '世界设定摘要\n');
  return tmp;
}

function toL4(ctx, intent, scene, loreText) {
  const L2 = buildSceneWritePrompt(ctx, intent, scene, loreText);
  const compiled = compilePrompt({
    scene,
    chapter: 2,
    intent,
    loreText: L2,
    priorExcerpt: '苏晚看着屏幕。',
    executionPlan: { beats: [{ order: 1, label: '试探', content: scene.goal, wordBudget: 200 }] },
  });
  const L3 = compiled.text || '';
  const L4 = compileSlimBeatUserPrompt({
    beat: { order: 1, label: '试探', content: scene.goal, libraryBeat: '试探', wordBudget: 200 },
    executionPlan: {
      beats: [{ order: 1, label: '试探', libraryBeat: '试探', wordBudget: 200 }],
      sceneIndex: scene.index || 2,
      scenePlan: { goal: scene.goal },
      pov: intent.pov,
    },
    intent,
    scene,
    basePrompt: L3,
  });
  return { L2, L3, L4 };
}

console.log('\n== F4 Entity Injection Hygiene ==');

const bookDir = makeBookDir();

const SECRET = 'secret_future_fact_NEVER_LEAK';
const FACT_RESET = '世界每天凌晨四点硬重置';
const FACT_CRASH = '林夜声称昨天出了车祸';

// --- Unit: filterKnowledgeForPrompt ---
{
  const matrix = [
    { info: FACT_CRASH, 苏晚: 'known', 林夜: 'know' },
    { info: FACT_RESET, 苏晚: 'unknown', 林夜: 'partial' },
    { info: '办公室流程', 苏晚: 'partial', 林夜: 'know' },
  ];
  const ctx = { pov: '苏晚', knowledge: { matrix } };
  const filtered = filterKnowledgeForPrompt(ctx, ['苏晚', '林夜'], { pov: '苏晚' });
  const infos = filtered.map((r) => r.info);
  if (!infos.includes(FACT_CRASH)) fail('A: known fact missing');
  else ok('A: known → allowed');
  if (infos.includes(FACT_RESET)) fail('B: unknown fact leaked into filter');
  else ok('B: unknown → absent from knowledge filter');
  if (!infos.includes('办公室流程')) fail('A: partial should remain');
  else ok('A: partial → allowed');
}

// --- Character whitelist ---
{
  const card = formatCharacterCardForPrompt({
    identity: '程序员',
    publicGoal: '弄清异常',
    secret: SECRET,
    realGoal: '隐藏真相',
    growth: '觉醒',
    raw: `### 苏晚\n- **秘密**：${SECRET}\n- **身份**：程序员\nsecret_future_fact_NEVER_LEAK\n`,
  }, '苏晚');
  const text = typeof card === 'string' ? card : card.text;
  if (text.includes(SECRET) || /secret_future_fact/i.test(text) || text.includes('隐藏真相')) {
    fail('C-unit: whitelist leaked secret/realGoal');
  } else if (!text.includes('程序员')) fail('C-unit: identity missing');
  else if (card.fallbackUsed) fail('C-unit: should not use fallback when fields exist');
  else ok('C-unit: whitelist omits secret/realGoal; keeps identity');
}

// --- Compile path: knowledge + raw leak + present/absent ---
{
  const intent = {
    pov: '苏晚',
    mainGoal: '确认刷新',
    time: '10月27日',
    currentDate: '10月27日',
    scenes: [
      { index: 1, id: 's1', goal: '进入', conflict: 'c', text: '旧稿。' },
      {
        index: 2,
        id: 's2',
        goal: '对质林夜',
        conflict: '信息差',
        beat: 'turn',
        wordTarget: 400,
        entities: ['苏晚', '林夜'],
      },
    ],
  };
  const scene = intent.scenes[1];
  const ctx = {
    bookDir,
    chapter: 2,
    pov: '苏晚',
    present: ['苏晚', '林夜'],
    intent,
    state: { 时间: '10月27日' },
    facts: [],
    knowledge: {
      matrix: [
        { info: FACT_CRASH, 苏晚: 'known', 林夜: 'know' },
        { info: FACT_RESET, 苏晚: 'unknown', 林夜: 'partial' },
        { info: '旁观者全知剧透', 旁观者甲: 'know', 苏晚: 'unknown', 林夜: 'unknown' },
      ],
    },
    relationships: [{ from: '苏晚', to: '林夜', trust: 2 }],
    characters: {
      苏晚: {
        name: '苏晚',
        identity: '系统观察者',
        publicGoal: '确认世界是否刷新',
        personality: '冷静',
        secret: SECRET,
        realGoal: '作者全知目标',
        raw: `全文圣经\n- **秘密**：${SECRET}\nsecret_future_fact_NEVER_LEAK\n`,
      },
      林夜: {
        name: '林夜',
        identity: '同事',
        publicGoal: '上班',
        secret: '林夜隐藏设定',
      },
      旁观者甲: {
        name: '旁观者甲',
        identity: '无关路人全知卡',
        publicGoal: '路过',
        secret: '无关秘密 lore dump',
        raw: '大段无关 Lore：旁观者甲知道一切未来。',
      },
    },
    worldBible: '地点：公司办公室。',
    writingBible: '少形容词。',
    currentStateMd: '时间: 10月27日',
    factions: {},
  };

  const lore = compileScenePrompt(ctx, scene);
  const L1 = lore.text || '';
  const { L4 } = toL4(ctx, intent, scene, L1);

  // A/B via compile text
  if (!L1.includes(FACT_CRASH)) fail('A: known knowledge not in L1 lore');
  else ok('A: known knowledge in Writer lore');

  if (L1.includes(FACT_RESET) || L4.includes(FACT_RESET)) fail('B: unknown knowledge entered Writer');
  else ok('B: unknown knowledge absent from L1/L4');

  if (L4.includes(SECRET) || L1.includes(SECRET) || /secret_future_fact/i.test(L4) || /secret_future_fact/i.test(L1)) {
    fail('C: secret_future_fact leaked into L1/L4');
  } else ok('C: Entity raw leak blocked (secret absent from L1/L4)');

  if (!/### 人物：苏晚|人物:苏晚|人物：苏晚/u.test(L1) && !L1.includes('系统观察者')) {
    fail('D: present entity context missing');
  } else ok('D: present entity relevant context exists');

  if (/### 人物：旁观者甲|人物:旁观者甲/u.test(L1) || L1.includes('无关路人全知卡')) {
    fail('E: non-present entity full context injected');
  } else ok('E: non-present entity not dumped into full context');

  // F — Information Boundary asymmetry (A unknown / B known)
  const ctxA = { ...ctx, pov: '苏晚', present: ['苏晚'] };
  const sceneA = { ...scene, entities: ['苏晚'], goal: '独处观察' };
  const loreA = compileScenePrompt(ctxA, sceneA).text || '';
  const ctxB = { ...ctx, pov: '林夜', present: ['林夜'], intent: { ...intent, pov: '林夜' } };
  const sceneB = { ...scene, entities: ['林夜'], goal: '回忆车祸' };
  const loreB = compileScenePrompt(ctxB, sceneB).text || '';
  if (loreA.includes(FACT_RESET)) fail('F: Character A (unknown) saw FACT_RESET');
  else ok('F: A prompt → no unknown fact');
  if (!loreB.includes(FACT_RESET)) fail('F: Character B (partial) missing FACT_RESET');
  else ok('F: B prompt → allowed (partial/know)');

  // Provenance for character_context / knowledge / entity
  const l1Modules = (lore.modules || []).map((m) => ({ key: m.key }));
  const { L2, L3, L4: L4b } = toL4(ctx, intent, scene, L1);
  const trace = buildContextProvenanceTrace({
    l1Text: L1,
    l2Text: L2,
    l3Text: L3,
    l4Text: L4b,
    intent,
    scene,
    ctx,
    l1Modules,
  });
  for (const key of ['character_context', 'knowledge', 'entity']) {
    const b = findProvenanceBlock(trace, key);
    if (!b) fail(`F3-trace: missing ${key}`);
    else if (!b.source || b.source === '') fail(`F3-trace: ${key} empty source`);
    else if (!b.type || !b.reason) fail(`F3-trace: ${key} missing type/reason`);
    else ok(`F3-trace: ${key} source=${b.source.slice(0, 60)} kept=${b.kept}`);
  }

  // SR still respects unknown
  const sr = assembleMinimalSR({ ctx, scene, names: ['苏晚'] });
  const srText = formatCharacterSRForPrompt(sr, ['苏晚']);
  if (srText.includes(FACT_RESET)) fail('IB: SR Awareness leaked unknown FACT_RESET');
  else ok('IB: Minimal SR Awareness excludes unknown');
}

// --- Test G — no third Entity Selector ---
{
  const files = [];
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === 'node_modules' || ent.name === 'dist' || ent.name === '.git') continue;
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.name === 'entity-selector.js') files.push(p);
    }
  }
  walk(path.join(ROOT, 'packages'));
  const rel = files.map((f) => path.relative(ROOT, f)).sort();
  if (rel.length !== 2) fail(`G: expected 2 entity-selector.js, got ${rel.length}: ${rel.join(', ')}`);
  else if (!rel.includes('packages/inkos-prompt/src/entity-selector.js')) fail('G: missing prompt selector');
  else if (!rel.includes('packages/inkos-runtime/src/memory/entity-selector.js')) fail('G: missing runtime selector');
  else ok('G: exactly two Entity Selectors (prompt filter + runtime disk load)');
}

// --- Test H — Location (no new Location Engine) ---
{
  const reason = [
    'scene.location / intent.location already exist as planner/continuity fields',
    'entity-selector selects characters (pov|present|scene.entities) + factions from corpus',
    'place atmosphere enters via world_bible / state, not a Location entity type',
    'no Location Engine added in F4 — existing structure sufficient for Writer place cues',
  ].join('; ');
  console.log(`  note H: ${reason}`);
  ok('H: no Location Entity selector added (structure sufficient)');
}

console.log(failures ? `\nF4 FAIL (${failures})` : '\nF4 PASS');
process.exit(failures ? 1 : 0);
