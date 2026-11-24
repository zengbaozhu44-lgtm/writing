#!/usr/bin/env node
/**
 * F1 — Final Prompt Survival regression
 * Clock + Information Boundary must survive L2 → L3 sealed → L4 Beat userPrompt.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSceneWritePrompt } from '../packages/inkos-brain/src/scene/scene.js';
import { compile as compilePrompt } from '../packages/inkos-runtime/src/compiler/prompt-compiler.js';
import {
  compileSlimBeatUserPrompt,
  clipBeatPromptToBudget,
} from '../packages/inkos-studio-server/src/writer-optimization/beat-slimmer.js';
import {
  hasStoryClock,
  hasInformationBoundary,
  wrapHistoricalPriorExcerpt,
  buildProtectedSemanticContext,
} from '../packages/inkos-core/src/lib/prompt-survival.js';
import { compileScenePrompt } from '../packages/inkos-prompt/src/index.js';

let failures = 0;
const fail = (m) => { failures += 1; console.error(`  FAIL: ${m}`); };
const ok = (m) => console.log(`  ok: ${m}`);

const intent = {
  pov: '苏晚',
  mainGoal: '确认刷新',
  time: '10月27日',
  currentDate: '10月27日',
  scenes: [
    { index: 1, goal: '进入', conflict: '否认', text: '日期——六月十七日。旧稿。' },
    { index: 2, goal: '推进', conflict: '阻碍', beat: 'turn', wordTarget: 400 },
  ],
};
const scene = intent.scenes[1];
const ctx = {
  pov: '苏晚',
  present: ['苏晚'],
  intent,
  state: { 时间: '10月27日' },
  facts: [],
  knowledge: { matrix: [] },
  relationships: [],
  characters: { 苏晚: { name: '苏晚' } },
  bookDir: null,
  chapter: 2,
};

console.log('\n== F1 Final Prompt Survival ==');

const loreSeed = '### Scene 目标\n目标: 推进\n节拍: turn\n';
const L2 = buildSceneWritePrompt(ctx, intent, scene, loreSeed);
if (!hasStoryClock(L2)) fail('A/B: L2 missing Story Clock');
else ok('L2: Story Clock present');
if (!hasInformationBoundary(L2)) fail('A/B: L2 missing Information Boundary');
else ok('L2: Information Boundary present');

const compiled = compilePrompt({
  scene,
  chapter: 2,
  intent,
  loreText: L2,
  priorExcerpt: '屏幕上是六月十七日。苏晚没有说话。',
  continuationBlock: '## 续写\nPrevious: 六月十七日。',
  executionPlan: { beats: [{ order: 1, label: '试探', content: '推进', wordBudget: 200 }] },
  tokenBudget: { total: 7200 },
});
const L3 = compiled.text || '';
const L3p1 = compiled.layers?.p1 || '';
const L3p3 = compiled.layers?.p3 || '';

if (!hasStoryClock(L3) || !hasStoryClock(L3p1)) fail('A: L3/P1 missing Story Clock');
else ok('L3: Story Clock in protected P1');
if (!hasInformationBoundary(L3) || !hasInformationBoundary(L3p1)) fail('B: L3/P1 missing IB');
else ok('L3: Information Boundary in protected P1');

if (!/Historical Continuity|非当前日历/u.test(L3p3)) fail('D: P3 prior missing Historical label');
else ok('D: P3 prior marked Historical');
if (!/不得覆盖|优先于|Semantic Protected/u.test(L3)) fail('D: missing precedence of Clock over Historical');
else ok('D: Clock precedence stated over Historical prior');
if (/六月/.test(L3p3) && !/10月27日/.test(L3p1)) fail('D: June in P3 without Canonical in P1');
else ok('D: Canonical present even when June in Historical P3');

const L4 = compileSlimBeatUserPrompt({
  beat: { order: 1, label: '试探', content: '推进对质', libraryBeat: '试探', wordBudget: 200 },
  executionPlan: {
    beats: [{ order: 1, label: '试探', libraryBeat: '试探', wordBudget: 200 }],
    sceneIndex: 2,
    scenePlan: { goal: scene.goal },
    pov: '苏晚',
  },
  intent,
  scene,
  basePrompt: L3,
  accumulatedText: '',
});
if (!hasStoryClock(L4)) fail('A/E: L4 missing Story Clock');
else ok('L4: Story Clock present');
if (!hasInformationBoundary(L4)) fail('B/E: L4 missing Information Boundary');
else ok('L4: Information Boundary present');
if (!/10月27日/.test(L4)) fail('A/E: L4 missing Canonical date');
else ok('L4: Canonical 10月27日 present');

const fat = [
  buildProtectedSemanticContext({ loreText: L2, intent, scene }),
  `### 本 Beat 设定摘录\n${'设定'.repeat(200)}`,
  '## 当前 Beat 1/1：试探\n- 指令：推进',
  '只写本 Beat。写完立即停止。',
];
const clipped = clipBeatPromptToBudget(fat, 900);
if (!hasStoryClock(clipped)) fail('E: clipBeatPromptToBudget dropped Clock');
else ok('E: Clock survives beat clip');
if (!hasInformationBoundary(clipped)) fail('E: clipBeatPromptToBudget dropped IB');
else ok('E: IB survives beat clip');

// Test C — mustRecompile: bare L1 + buildSceneWritePrompt
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-f1-'));
  const brain = path.join(tmp, 'novel', '_system', 'brain');
  fs.mkdirSync(brain, { recursive: true });
  const cctx = {
    ...ctx,
    bookDir: tmp,
    chapter: 2,
    present: ['苏晚'],
    currentStateMd: '时间：10月27日',
    factions: {},
  };
  const bare = compileScenePrompt(cctx, {
    ...scene,
    id: 's2',
    entities: ['苏晚'],
    conflict: '阻碍',
  });
  const recompiled = buildSceneWritePrompt(cctx, intent, scene, bare);
  if (!hasStoryClock(recompiled)) fail('C: recompile via buildSceneWritePrompt missing Clock');
  else ok('C: recompile keeps Clock');
  if (!hasInformationBoundary(recompiled)) fail('C: recompile missing IB');
  else ok('C: recompile keeps IB');
  const sealedFromRecompile = compilePrompt({
    scene,
    chapter: 2,
    intent,
    loreText: recompiled,
    priorExcerpt: wrapHistoricalPriorExcerpt('六月十七日的旧摘要。'),
    executionPlan: { beats: [{ order: 1, label: 'x', wordBudget: 100 }] },
  }).text;
  if (!hasStoryClock(sealedFromRecompile) || !hasInformationBoundary(sealedFromRecompile)) {
    fail('C: sealed after recompile lost Clock/IB');
  } else ok('C: sealed after full recompile retains Clock+IB');
  fs.rmSync(tmp, { recursive: true, force: true });
}

{
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const sr = fs.readFileSync(path.join(root, 'packages/inkos-core/src/lib/minimal-sr.js'), 'utf8');
  if (/persistenceEngine|characterStateEngine/.test(sr)) fail('must not expand SR');
  else ok('SR schema untouched');
}

if (failures) {
  console.error(`\nF1 FAILED: ${failures}`);
  process.exit(1);
}
console.log('\nF1 PASSED — Clock + IB survive L2→L3→L4; mustRecompile uses full L2 path\n');
