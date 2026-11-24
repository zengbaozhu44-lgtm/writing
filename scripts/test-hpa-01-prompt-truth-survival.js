#!/usr/bin/env node
/**
 * HPA-01 — Plan–Actual Prompt Truth Survival
 *
 * Truth survives compression. Plan may coexist. No Actual>Plan, no fabrication.
 */
import assert from 'node:assert/strict';
import {
  ensureActualEvents,
} from '../packages/inkos-brain/src/events/event-extractor.js';
import {
  collectPreviousActualEvents,
  formatActualEventsBlock,
  compactActualTruthForBudget,
  promptPreservesActualTruth,
} from '../packages/inkos-brain/src/events/actual-events-prompt.js';
import { ensurePlanValidity } from '../packages/inkos-prompt/src/plan-validity.js';
import {
  compileSlimBeatUserPrompt,
  clipBeatPromptToBudget,
} from '../packages/inkos-studio-server/src/writer-optimization/beat-slimmer.js';

let failures = 0;
const fail = (m) => { failures += 1; console.error(`  FAIL: ${m}`); };
const ok = (m) => console.log(`  ok: ${m}`);

const BUDGETS = {
  large: 12000,
  medium: 2800,
  1400: 1400,
  700: 700,
  500: 500,
};

function makeSceneN(text) {
  const scene = {
    id: 's1',
    index: 1,
    pov: '苏晚',
    characters: ['苏晚'],
    text,
  };
  ensureActualEvents(scene, { knownNames: ['苏晚'], stripPlan: true });
  return scene;
}

function makeBeat(goal) {
  return {
    order: 1,
    label: '承接',
    structuralBeat: 'goal',
    libraryBeat: 'Discovery',
    content: goal,
    wordBudget: 180,
    beforeState: '上一场已结束',
    afterState: '本场必须推进',
  };
}

function compileN1({ sceneN, goal, mainGoal, padF1 = true }) {
  const scene2 = {
    id: 's2',
    index: 2,
    pov: '苏晚',
    goal,
    conflict: '时间紧迫',
    characters: ['苏晚'],
  };
  const intent = {
    pov: '苏晚',
    mainGoal,
    scenes: [sceneN, scene2],
  };
  ensurePlanValidity(scene2, intent);
  // Pad lore so clip path is exercised under tight budgets
  const fatLore = padF1
    ? `${'设定摘录填充。'.repeat(40)}\n### 本 Beat 设定摘录\n${'多余世界设定。'.repeat(30)}`
    : '';
  return compileSlimBeatUserPrompt({
    beat: makeBeat(goal),
    scene: scene2,
    intent,
    executionPlan: { scenePlan: { goal }, beats: [makeBeat(goal)] },
    basePrompt: fatLore,
    accumulatedText: '',
    continuityState: null,
    beatMemory: null,
    profile: null,
  });
}

function hasPlan(prompt, cue) {
  return String(cue || '').split('|').some((c) => c && prompt.includes(c));
}

function hasBeat(prompt) {
  return /## 当前 Beat|指令：|只写本 Beat/u.test(prompt);
}

function matrixRow(prompt, { actualCue, wctCue, planCue }) {
  return {
    actual: promptPreservesActualTruth(prompt)
      && (!actualCue || prompt.includes(actualCue) || /推开房门|离开/u.test(prompt)),
    wct: wctCue
      ? (/^- WCT:/mu.test(prompt) || /已发生的世界变化/u.test(prompt) || prompt.includes(wctCue))
      : null,
    plan: planCue ? hasPlan(prompt, planCue) : null,
    beat: hasBeat(prompt),
  };
}

console.log('\n== HPA-01 Prompt Truth Survival ==');

const sceneLeave = makeSceneN(
  '苏晚推开房门，头也不回地走了出去。门锁在身后咔哒一声扣上。走廊里只剩下她的脚步声——她已经离开了房间，不在房间里。',
);
assert.ok((sceneLeave.actualEvents || []).length, 'fixture must extract Actual');
ok(`Scene N Actual extracted: ${sceneLeave.actualEvents[0].action.slice(0, 40)}`);

const planConflict = '苏晚仍在房间内翻找抽屉，确认文件还在。';
const planConsistent = '苏晚在走廊里继续追查线索，确认门外是否有人跟踪。';

// --- Helper unit ---
{
  const full = formatActualEventsBlock(collectPreviousActualEvents([sceneLeave]));
  const compact = compactActualTruthForBudget(full);
  assert.ok(compact.includes('Proven Actual (compact'), 'compact header');
  assert.ok(/- Actual:/.test(compact), 'compact Actual line');
  assert.equal(compactActualTruthForBudget(''), '', 'empty → no fabricate');
  assert.equal(compactActualTruthForBudget('Scene explicit goal：仍在房间'), '', 'Plan text ≠ Actual');
  ok('compactActualTruthForBudget extracts / refuses fabrication');
}

// --- Test A: Actual only ---
console.log('\n-- Test A: Actual only --');
{
  // Goal without strong inside conflict; still has some Plan text
  const full = compileN1({
    sceneN: sceneLeave,
    goal: '继续推进调查',
    mainGoal: '推进调查',
  });
  // Build parts manually with Actual for pure clip tests
  const actualBlock = formatActualEventsBlock(collectPreviousActualEvents([sceneLeave]));
  const parts = [
    '### Semantic Protected Context\n## Story Clock\n- Canonical：未确立\n## 信息边界\nWorld ≠ Knowledge',
    actualBlock,
    '## 当前 Beat 1/1：承接\n- 指令：继续推进调查',
    '只写本 Beat。接着上文，不要重新开场。',
  ];
  for (const [name, budget] of Object.entries(BUDGETS)) {
    const clipped = clipBeatPromptToBudget(parts, budget);
    if (!promptPreservesActualTruth(clipped)) fail(`A/${name}: Actual disappeared at budget=${budget}`);
    else ok(`A/${name} Actual survives (${budget}, len=${clipped.length})`);
  }
}

// --- Test B: Actual + conflicting Plan ---
console.log('\n-- Test B: Actual + conflicting Plan --');
{
  const fullPrompt = compileN1({
    sceneN: sceneLeave,
    goal: planConflict,
    mainGoal: '苏晚仍在房间内完成搜查',
  });
  assert.ok(fullPrompt.includes('Previous Scene Occurrence Events') || promptPreservesActualTruth(fullPrompt),
    'full compile includes Actual');
  assert.ok(fullPrompt.includes('仍在房间') || fullPrompt.includes('抽屉'), 'full compile includes Plan');

  const actualBlock = formatActualEventsBlock(collectPreviousActualEvents([sceneLeave]));
  const parts = [
    '### Semantic Protected Context（F1）\n## Story Clock\n- Canonical：未确立\n## 信息边界\nWorld / Narration ≠ Character Knowledge。'.repeat(3),
    actualBlock,
    `Scene explicit goal〔CURRENT INTENT〕：${planConflict}`,
    `## 当前 Beat 1/4：承接\n- Before〔EXPECTED〕：上\n- After〔EXPECTED TARGET〕：下\n- 字数：约 180\n- 指令：${planConflict}`,
    '章目标（导航）：苏晚仍在房间内完成搜查',
    '### 本 Beat 设定摘录\n' + '世界设定填充字。'.repeat(40),
    '只写本 Beat。接着上文，不要重新开场。禁止「不是A是B」套话。写完立即停止。',
  ];

  console.log('| Budget | Actual | Plan | Beat |');
  console.log('| ------ | ------ | ---- | ---- |');
  for (const [name, budget] of Object.entries(BUDGETS)) {
    // Prefer clipping the compiled parts when large; for tight budgets use constructed parts
    const source = budget >= 2800 ? fullPrompt.split(/\n\n/) : parts;
    const clipped = clipBeatPromptToBudget(source, budget);
    const row = matrixRow(clipped, {
      actualCue: '推开房门',
      planCue: '仍在房间|抽屉|翻找',
    });
    const a = row.actual ? 'PASS' : 'FAIL';
    const p = row.plan ? 'PASS' : 'FAIL';
    const b = row.beat ? 'PASS' : 'FAIL';
    console.log(`| ${name} (${budget}) | ${a} | ${p} | ${b} |`);
    if (!row.actual) fail(`B/${name}: Actual lost`);
    else ok(`B/${name}: Actual preserved with Plan allowed`);
    // At extreme 500, Plan may shrink but HPA-01 allows Plan to remain; prefer remain
    if (budget <= 500 && !row.plan) {
      // soft warn — not fail if truth survived (Plan optional under extreme after truth reserve)
      console.log(`  note: B/${name} Plan truncated under extreme budget (allowed if Actual survives)`);
    }
  }
}

// --- Test C: WCT ---
console.log('\n-- Test C: WCT survives --');
{
  const sceneW = {
    ...sceneLeave,
    worldConsequenceTruth: {
      status: 'asserted',
      characterId: '苏晚',
      actionContent: '推开房门离开',
      worldChangeContent: '房间内已无人；门锁扣上',
      occurrenceRef: sceneLeave.actualEvents?.[0]?.id || 'evt_s1',
      provenance: { source: 'test' },
    },
  };
  const bundle = collectPreviousActualEvents([sceneW]);
  assert.ok(bundle.worldConsequences?.length, 'WCT collected');
  const block = formatActualEventsBlock(bundle);
  assert.ok(block.includes('Proven World Consequences'), 'full WCT section');
  const compact = compactActualTruthForBudget(block);
  assert.ok(/- WCT:/.test(compact), 'compact WCT line');

  const parts = [
    '### Semantic Protected Context\n## Story Clock\n- x\n## 信息边界\ny',
    block,
    'Scene explicit goal〔CURRENT INTENT〕：继续观察走廊',
    '## 当前 Beat 1/1：承接\n- 指令：继续观察走廊',
    '只写本 Beat。接着上文，不要重新开场。',
  ];
  for (const [name, budget] of Object.entries(BUDGETS)) {
    const clipped = clipBeatPromptToBudget(parts, budget);
    const hasW = /^- WCT:/mu.test(clipped) || /已发生的世界变化/u.test(clipped) || clipped.includes('房间内已无人');
    const hasA = promptPreservesActualTruth(clipped);
    if (!hasA) fail(`C/${name}: Actual lost`);
    if (!hasW) fail(`C/${name}: WCT lost`);
    else ok(`C/${name}: Actual+WCT survive (${budget})`);
  }
}

// --- Test D: Actual + WCT + Plan + Beat ---
console.log('\n-- Test D: Actual+WCT+Plan+Beat --');
{
  const sceneW = {
    ...sceneLeave,
    worldConsequenceTruth: {
      status: 'asserted',
      characterId: '苏晚',
      actionContent: '推开房门离开',
      worldChangeContent: '房间内已无人；门锁扣上',
      occurrenceRef: 'evt_test',
    },
  };
  const block = formatActualEventsBlock(collectPreviousActualEvents([sceneW]));
  const parts = [
    '### Semantic Protected Context（F1 · 绝对保护）\n## Story Clock\n- Canonical：未确立\n## 信息边界\nWorld ≠ Knowledge',
    block,
    `Scene explicit goal〔CURRENT INTENT〕：${planConflict}`,
    `## 当前 Beat 1/2：承接\n- Before〔EXPECTED〕：a\n- After〔EXPECTED TARGET〕：b\n- 指令：${planConflict}`,
    '只写本 Beat。接着上文，不要重新开场。',
  ];
  for (const budget of [1400, 700, 500]) {
    const clipped = clipBeatPromptToBudget(parts, budget);
    if (!promptPreservesActualTruth(clipped)) fail(`D/${budget}: Actual lost`);
    if (!(/^- WCT:/mu.test(clipped) || clipped.includes('房间内已无人'))) fail(`D/${budget}: WCT lost`);
    if (!hasBeat(clipped)) fail(`D/${budget}: Beat malformed/missing`);
    // Prompt must not be empty garbage
    if (clipped.length < 40) fail(`D/${budget}: prompt too short / malformed`);
    else ok(`D/${budget}: truth+control coexist, len=${clipped.length}`);
  }
}

// --- Test E: no Actual → no fabricate ---
console.log('\n-- Test E: no Actual --');
{
  const empty = clipBeatPromptToBudget([
    '### Semantic Protected Context\n## Story Clock\nx',
    'Scene explicit goal〔CURRENT INTENT〕：苏晚仍在房间内翻找抽屉',
    '## 当前 Beat 1/1：承接\n- 指令：翻找抽屉',
    '只写本 Beat。',
  ], 500);
  if (promptPreservesActualTruth(empty)) fail('E: fabricated Actual without source');
  if (/Proven Actual \(compact\)/u.test(empty)) fail('E: fabricated compact Actual');
  else ok('E: no Actual → no fabrication');
}

// --- Test F: no WCT → no fake WCT ---
console.log('\n-- Test F: no WCT --');
{
  const block = formatActualEventsBlock(collectPreviousActualEvents([sceneLeave]));
  assert.ok(!block.includes('Proven World Consequences'));
  const compact = compactActualTruthForBudget(block);
  if (/- WCT:/u.test(compact)) fail('F: fabricated WCT in compact');
  const clipped = clipBeatPromptToBudget([
    '### Semantic Protected Context\n## Story Clock\nx\n## 信息边界\ny',
    block,
    '## 当前 Beat 1/1：x\n- 指令：y',
    '只写本 Beat。',
  ], 500);
  if (/- WCT:/u.test(clipped) || /Proven WCT \(compact\)/u.test(clipped)) fail('F: fabricated WCT after clip');
  else ok('F: no WCT → no fabricated WCT');
}

// --- Test G: chapter seam style parts still survive clip ---
console.log('\n-- Test G: chapter-seam Actual + clip --');
{
  // Simulate prior-chapter Actual readback block entering Beat1 of next chapter Scene1
  const prior = makeSceneN(
    '苏晚推开房门，头也不回地走了出去。她已经离开了房间。',
  );
  const block = formatActualEventsBlock(collectPreviousActualEvents([prior]));
  const parts = [
    '### Semantic Protected Context\n## Story Clock\n- Canonical：未确立\n## 信息边界\nIB',
    block,
    'Scene explicit goal〔CURRENT INTENT〕：新章开场继续追查',
    '## 当前 Beat 1/3：开场\n- 指令：新章开场继续追查',
    '只写本 Beat。接着上文，不要重新开场。',
  ];
  for (const budget of [1400, 700, 500]) {
    const clipped = clipBeatPromptToBudget(parts, budget);
    if (!promptPreservesActualTruth(clipped)) fail(`G/${budget}: chapter-seam Actual lost in clip`);
    else ok(`G/${budget}: chapter-seam Actual survives clip`);
  }
}

// --- Negative: Plan must not become Actual ---
console.log('\n-- Negative: Plan ↛ Actual / WCT --');
{
  const c = compactActualTruthForBudget(`Scene explicit goal：${planConflict}\n章目标：仍在房间`);
  assert.equal(c, '');
  ok('Plan-only text does not compact into Actual');
}

// --- Full matrix on compile+clip path ---
console.log('\n-- Budget matrix (compile parts + clip) --');
{
  const sceneW = {
    ...sceneLeave,
    worldConsequenceTruth: {
      status: 'asserted',
      characterId: '苏晚',
      actionContent: '推开房门离开',
      worldChangeContent: '房间内已无人；门锁扣上',
      occurrenceRef: 'evt_m',
    },
  };
  // Force verbose path: assemble parts like compileSlimBeatUserPrompt
  const actualBlock = formatActualEventsBlock(collectPreviousActualEvents([sceneW]));
  const parts = [
    '### Semantic Protected Context（F1 · 绝对保护 · 非 SR）\n> Story Clock + Information Boundary\n## Story Clock（Phase 1.R）\n- **Canonical**：未确立\n## 信息边界\n- Scene 目标中的事实 = 写作任务，不是 Awareness。\n- World / Narration ≠ Character Knowledge。',
    actualBlock,
    `Scene explicit goal〔CURRENT INTENT〕（场景层；非 Character Dominance）：${planConflict}`,
    `章目标（导航）：苏晚仍在房间内完成搜查`,
    `## 当前 Beat 1/4：承接\n- Before〔EXPECTED〕：上一场已结束\n- After〔EXPECTED TARGET〕：本场必须推进\n- 字数：约 180（≤234）\n- 指令：${planConflict}`,
    '本拍必须有可共情的情绪：疼要写进身体。',
    '叙述人称固定：全章第三人称（用「苏晚」「他」）。',
    '### 本 Beat 设定摘录\n' + '填充设定文字以避免过早结束。'.repeat(25),
    '只写本 Beat。接着上文，不要重新开场。禁止「不是A是B」套话。写完立即停止。',
  ];
  console.log('| Budget | Actual | WCT | Plan | Beat |');
  console.log('| ------ | ------ | --- | ---- | ---- |');
  for (const [name, budget] of Object.entries(BUDGETS)) {
    const clipped = clipBeatPromptToBudget(parts, budget);
    const actual = promptPreservesActualTruth(clipped) && (/推开房门|离开/u.test(clipped));
    const wct = /^- WCT:/mu.test(clipped) || clipped.includes('房间内已无人');
    const plan = /仍在房间|抽屉|翻找/u.test(clipped);
    const beat = hasBeat(clipped);
    const cell = (v) => (v ? 'PASS' : 'FAIL');
    console.log(`| ${name} | ${cell(actual)} | ${cell(wct)} | ${cell(plan)} | ${cell(beat)} |`);
    if (!actual) fail(`matrix/${name}: Actual FAIL`);
    if (!wct) fail(`matrix/${name}: WCT FAIL`);
    // Plan/Beat should survive at ≥700; at 500 Plan optional if truncated after truth
    if (budget >= 700 && !plan) fail(`matrix/${name}: Plan FAIL`);
    if (budget >= 700 && !beat) fail(`matrix/${name}: Beat FAIL`);
  }
}

if (failures) {
  console.error(`\nHPA-01 FAILED: ${failures} failure(s)`);
  process.exit(1);
}
console.log('\nHPA-01 PASS');
