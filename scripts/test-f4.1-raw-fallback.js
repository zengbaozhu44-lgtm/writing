#!/usr/bin/env node
/**
 * F4.1 — Character Raw Fallback Closure
 * Whitelist > Scrub: empty structured fields → minimal identity, never raw.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildSceneWritePrompt } from '../packages/inkos-brain/src/scene/scene.js';
import { compile as compilePrompt } from '../packages/inkos-runtime/src/compiler/prompt-compiler.js';
import { compileSlimBeatUserPrompt } from '../packages/inkos-studio-server/src/writer-optimization/beat-slimmer.js';
import {
  compileScenePrompt,
  formatCharacterCardForPrompt,
} from '../packages/inkos-prompt/src/index.js';
import {
  buildContextProvenanceTrace,
  findProvenanceBlock,
} from '../packages/inkos-studio-server/src/writer-optimization/context-provenance.js';

let failures = 0;
const fail = (m) => { failures += 1; console.error(`  FAIL: ${m}`); };
const ok = (m) => console.log(`  ok: ${m}`);

const HIDDEN = 'hidden_truth_xyz';
const FUTURE = '三年后苏晚将背叛伊甸并公开刷新协议';
const UNKNOWN_FACT = '世界每天凌晨四点硬重置';

function makeBookDir() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-f41-'));
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

console.log('\n== F4.1 Character Raw Fallback Closure ==');

const bookDir = makeBookDir();

// Test A — Standard Character
{
  const card = formatCharacterCardForPrompt({
    identity: '系统观察者',
    publicGoal: '确认刷新',
    personality: '冷静',
    raw: `garbage ${HIDDEN}\n${FUTURE}`,
  }, '苏晚');
  if (card.fallbackUsed || card.mode !== 'whitelist') fail('A: expected whitelist mode');
  else if (!card.text.includes('系统观察者') || !card.text.includes('确认刷新')) fail('A: standard fields missing');
  else if (card.text.includes(HIDDEN) || card.text.includes(FUTURE)) fail('A: raw leaked despite fields');
  else ok('A: standard fields → Writer card (no raw)');
}

// Test B — Empty Structured Fields → no full raw
{
  const rawDump = [
    '### 苏晚完整圣经',
    HIDDEN,
    FUTURE,
    '大段无关 lore dump 全部内容都在这里',
    '- 对白风格：口头禅很多',
  ].join('\n');
  const card = formatCharacterCardForPrompt({ raw: rawDump, secret: 'x' }, '苏晚');
  if (!card.fallbackUsed || card.mode !== 'minimal_identity') fail('B: expected minimal_identity fallback');
  else if (card.text.includes(HIDDEN) || card.text.includes(FUTURE) || card.text.includes('完整圣经')) {
    fail('B: fallback restored raw content');
  } else if (!card.text.includes('苏晚') || !/未标注|在场名/u.test(card.text)) {
    fail('B: missing minimal safe identity');
  } else ok('B: empty fields → minimal identity (not raw)');
}

// Test C — Non-standard secret marker (no common keywords)
{
  const intent = {
    pov: '苏晚',
    mainGoal: '确认',
    time: '10月27日',
    currentDate: '10月27日',
    scenes: [{ index: 2, id: 's2', goal: '推进', conflict: '阻碍', beat: 'turn', entities: ['苏晚'] }],
  };
  const scene = intent.scenes[0];
  const ctx = {
    bookDir,
    chapter: 2,
    pov: '苏晚',
    present: ['苏晚'],
    intent,
    state: { 时间: '10月27日' },
    facts: [],
    knowledge: { matrix: [] },
    relationships: [],
    characters: {
      苏晚: {
        name: '苏晚',
        // no structured whitelist fields
        raw: `人物档案正文\n${HIDDEN}\n其他无关键词正文段落`,
      },
    },
    worldBible: '地点：办公室',
    writingBible: '少形容词',
    currentStateMd: '时间: 10月27日',
    factions: {},
  };
  const lore = compileScenePrompt(ctx, scene);
  const L1 = lore.text || '';
  const { L4 } = toL4(ctx, intent, scene, L1);
  if (L1.includes(HIDDEN) || L4.includes(HIDDEN)) fail('C: hidden_truth_xyz reached L1/L4 (scrub would miss this)');
  else ok('C: non-standard marker absent — safety from whitelist not scrub');

  const charMod = (lore.modules || []).find((m) => m.key === 'char:苏晚');
  if (!charMod || !charMod.fallbackUsed) fail('C: provenance path — fallbackUsed not on module');
  else ok('C: module marks fallbackUsed');

  const trace = buildContextProvenanceTrace({
    l1Text: L1,
    l2Text: L1,
    l3Text: L1,
    l4Text: L4,
    intent,
    scene,
    ctx,
    l1Modules: lore.modules,
  });
  const b = findProvenanceBlock(trace, 'character_context');
  if (!b) fail('C: missing character_context provenance');
  else if (!/fallback_used/i.test(b.note || '') && b.reason !== 'fallback_minimal_identity') {
    fail(`C: fallback not observable in provenance (note=${b.note} reason=${b.reason})`);
  } else ok(`C: provenance observes fallback (${b.reason}; ${b.note || '—'})`);
}

// Test D — Future fact in raw only
{
  const card = formatCharacterCardForPrompt({
    raw: `旁白预告：${FUTURE}`,
  }, '苏晚');
  if (card.text.includes(FUTURE)) fail('D: future fact from raw entered card');
  else ok('D: future fact in raw → not in card');

  const intent = {
    pov: '苏晚',
    mainGoal: '确认',
    time: '10月27日',
    currentDate: '10月27日',
    scenes: [{ index: 2, id: 's2', goal: '推进', conflict: 'c', beat: 'turn', entities: ['苏晚'] }],
  };
  const scene = intent.scenes[0];
  const ctx = {
    bookDir: makeBookDir(),
    chapter: 2,
    pov: '苏晚',
    present: ['苏晚'],
    intent,
    state: { 时间: '10月27日' },
    facts: [],
    knowledge: { matrix: [] },
    relationships: [],
    characters: { 苏晚: { name: '苏晚', raw: FUTURE } },
    worldBible: '',
    writingBible: '',
    currentStateMd: '',
    factions: {},
  };
  const L1 = compileScenePrompt(ctx, scene).text || '';
  const { L4 } = toL4(ctx, intent, scene, L1);
  if (L1.includes(FUTURE) || L4.includes(FUTURE)) fail('D: future fact reached L4');
  else ok('D: future fact absent from L1/L4');
}

// Test E — Information Boundary: POV unknown even if raw has fact
{
  const intent = {
    pov: '苏晚',
    mainGoal: '确认',
    time: '10月27日',
    currentDate: '10月27日',
    scenes: [{ index: 2, id: 's2', goal: '推进', conflict: 'c', beat: 'turn', entities: ['苏晚'] }],
  };
  const scene = intent.scenes[0];
  const ctx = {
    bookDir: makeBookDir(),
    chapter: 2,
    pov: '苏晚',
    present: ['苏晚'],
    intent,
    state: { 时间: '10月27日' },
    facts: [],
    knowledge: {
      matrix: [{ info: UNKNOWN_FACT, 苏晚: 'unknown', 林夜: 'know' }],
    },
    relationships: [],
    characters: {
      苏晚: {
        name: '苏晚',
        identity: '观察者',
        raw: `档案记载：${UNKNOWN_FACT}`,
      },
    },
    worldBible: '',
    writingBible: '',
    currentStateMd: '',
    factions: {},
  };
  const L1 = compileScenePrompt(ctx, scene).text || '';
  const { L4 } = toL4(ctx, intent, scene, L1);
  if (L1.includes(UNKNOWN_FACT) || L4.includes(UNKNOWN_FACT)) {
    fail('E: unknown fact entered Writer via raw/entity');
  } else ok('E: POV unknown → fact absent despite entity raw');
}

console.log(failures ? `\nF4.1 FAIL (${failures})` : '\nF4.1 PASS');
process.exit(failures ? 1 : 0);
