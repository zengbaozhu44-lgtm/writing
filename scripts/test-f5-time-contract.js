#!/usr/bin/env node
/**
 * F5 — Time Semantics Contract
 * Narrative Order ≠ Story Clock ≠ Historical ≠ World Event Day
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  classifySceneIndex,
  resolveWorldEventDay,
  resolveStateTimeLabel,
  isForbiddenChapterAsWorldDay,
  TIME_SEMANTICS,
  F5_CONTRACT,
} from '../packages/inkos-core/src/lib/time-semantics.js';
import { resolveStoryClock } from '../packages/inkos-core/src/lib/story-clock.js';
import {
  wrapHistoricalPriorExcerpt,
  hasStoryClock,
} from '../packages/inkos-core/src/lib/prompt-survival.js';
import { formatPreviousSummaries } from '../packages/inkos-prompt/src/scene-summary.js';
import { buildStateDelta, resolveTimelineEvents } from '../packages/inkos-brain/src/memory/state-updater.js';
import {
  resolveStoryDayForChapterRun,
  resolveStoryDayAfterChapter,
} from '../packages/inkos-studio-server/src/brain-context-sync.js';
import { buildSceneWritePrompt } from '../packages/inkos-brain/src/scene/scene.js';
import { compile as compilePrompt } from '../packages/inkos-runtime/src/compiler/prompt-compiler.js';
import { compileSlimBeatUserPrompt } from '../packages/inkos-studio-server/src/writer-optimization/beat-slimmer.js';
import {
  buildContextProvenanceTrace,
  findProvenanceBlock,
} from '../packages/inkos-studio-server/src/writer-optimization/context-provenance.js';

let failures = 0;
const fail = (m) => { failures += 1; console.error(`  FAIL: ${m}`); };
const ok = (m) => console.log(`  ok: ${m}`);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('\n== F5 Time Semantics Contract ==');

if (!F5_CONTRACT.noChapterAsWorldDay || !F5_CONTRACT.noSceneIndexAsWorldDay) {
  fail('contract flags missing');
} else ok('contract flags present');

// Test A — Narrative order
{
  const c = classifySceneIndex(3);
  if (c.semantic !== TIME_SEMANTICS.NARRATIVE_ORDER) fail('A: wrong semantic');
  else if (c.isWorldDate !== false) fail('A: scene.index treated as world date');
  else if (!c.isNarrativeOrder) fail('A: not marked narrative');
  else ok('A: scene.index=3 is narrative order, not world date');
}

// Test B — Chapter fallback blocked
{
  const r = resolveWorldEventDay({ chapter: 7, time: undefined, currentDate: undefined });
  if (r.day === 7) fail('B: world day silently became 7 from chapter');
  else if (r.status !== 'unknown' || r.day != null) fail(`B: expected unknown (got ${JSON.stringify(r)})`);
  else ok('B: chapter=7, no world date → unknown (not day 7)');

  const invent = resolveStoryDayForChapterRun(7, 0);
  if (invent === 'Day 7' || invent === 'Day 6' || /Day\s*7/i.test(String(invent || ''))) {
    fail(`B: resolveStoryDayForChapterRun still invents from chapter (${invent})`);
  } else if (invent != null && invent !== 'unknown') fail(`B: unexpected invent ${invent}`);
  else ok('B: resolveStoryDayForChapterRun does not invent Day from chapter');

  const after = resolveStoryDayAfterChapter(7);
  if (/Day\s*7/i.test(String(after || ''))) fail('B: after-chapter invents Day 7');
  else ok('B: resolveStoryDayAfterChapter blocked');

  const delta = buildStateDelta('/tmp/f5-b', 7, {
    intent: { pov: '苏晚', mainGoal: 'x' },
    scenes: [],
    chapterText: '正文',
  });
  if (delta.timeline.day === 7) fail('B: buildStateDelta day||chapter still active');
  else if (delta.timeline.day != null) fail(`B: unexpected day ${delta.timeline.day}`);
  else ok('B: buildStateDelta.timeline.day is null (unknown)');

  if (/Day\s*7/.test(delta.current_state || '')) fail('B: 08 table invented Day 7');
  else if (!/\| 时间 \| unknown \|/.test(delta.current_state || '')) fail('B: 08 time should be unknown');
  else ok('B: 08 time = unknown when no intent.time');

  if (isForbiddenChapterAsWorldDay({ chapter: 7, worldDay: 7, daySource: 'chapter_fallback' })) {
    ok('B: forbidden alias detector works');
  } else fail('B: detector miss');
}

// Test C — Current clock vs historical
{
  const intent = {
    pov: '苏晚',
    time: '10月27日',
    currentDate: '10月27日',
    scenes: [
      { index: 1, text: '日期——六月十七日。旧稿。' },
      { index: 2, goal: '推进', conflict: 'c' },
    ],
  };
  const scene = intent.scenes[1];
  const clock = resolveStoryClock({ ctx: { state: {} }, intent, scene });
  if (!clock.canonical || !/10月27日/.test(clock.canonical)) {
    fail(`C: current clock missing October (${clock.canonical})`);
  } else ok('C: current clock = October 27');

  const histBlock = wrapHistoricalPriorExcerpt('屏幕上是六月十七日。苏晚没有说话。');
  const summaries = formatPreviousSummaries(
    [{ index: 1, summary: '六月十七日的旧记忆。', sourceTextHash: 'x' }],
    clock,
  );
  if (!/六月/.test(histBlock + summaries)) fail('C: historical June lost');
  else if (!/Historical|历史/u.test(histBlock + summaries)) fail('C: historical not labeled');
  else ok('C: historical June preserved and labeled');

  const L2 = buildSceneWritePrompt({ pov: '苏晚', intent, state: { 时间: '10月27日' } }, intent, scene, '### Scene\n');
  if (!hasStoryClock(L2)) fail('C: L2 missing clock');
  else if (!/10月27日/.test(L2)) fail('C: L2 missing current October');
  else if (!/六月/.test(histBlock) || /Canonical[^\n]*六月/.test(L2)) {
    // June may appear in historical sections of full path; Canonical must be October
    if (/Canonical[^\n]*六月/.test(L2)) fail('C: June became Canonical');
    else ok('C: clock≠historical co-exist');
  } else ok('C: current≠historical co-exist');
}

// Test D — 11 Timeline day ≠ silent chapter
{
  const known = resolveWorldEventDay({ time: 'Day 3 04:00', chapter: 7 });
  if (known.day !== 3) fail(`D: Day token should yield 3 (got ${known.day})`);
  else ok('D: explicit Day 3 in time → day=3 (chapter 7 ignored)');

  const silent = resolveWorldEventDay({ chapter: 7 });
  if (silent.day != null) fail('D: silent chapter→day');
  else ok('D: no time → day unknown (not chapter)');

  // Source scan: state-updater must not contain day || chapter
  const src = fs.readFileSync(
    path.join(ROOT, 'packages/inkos-brain/src/memory/state-updater.js'),
    'utf8',
  );
  const srcNoComments = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  if (/extractDay\([^)]*\)\s*\|\|\s*chapter/.test(srcNoComments) || /day:\s*[^\n]*\|\|\s*chapter/.test(srcNoComments)) {
    fail('D: day||chapter still in state-updater source');
  } else if (/Day \$\{chapter\}/.test(srcNoComments) || /`Day \$\{chapter\}`/.test(srcNoComments)) {
    fail('D: Day ${chapter} still in state-updater');
  } else ok('D: state-updater source free of day||chapter / Day${chapter}');

  const syncSrc = fs.readFileSync(
    path.join(ROOT, 'packages/inkos-studio-server/src/brain-context-sync.js'),
    'utf8',
  );
  if (/return `Day \$\{Math\.max/.test(syncSrc)) {
    fail('D: brain-context-sync still returns Day from chapter math');
  } else ok('D: brain-context-sync no longer invents Day from chapter');
}

// Test E — Plan isolation (EO-P2)
{
  const events = resolveTimelineEvents({
    intent: { time: '10月27日', mainGoal: '确认刷新' },
    scenes: [{ consequence: '世界重置被目击' }],
    causalChain: { consequence: { immediate: '日期回退' } },
  });
  if (events.length !== 0) fail('E: plan date/consequence leaked into timeline events');
  else ok('E: plan October 27 does not create 11.events');

  const delta = buildStateDelta('/tmp/f5-e', 2, {
    intent: { time: '10月27日', pov: '苏晚', mainGoal: '确认刷新' },
    scenes: [{ outcome: '重置确认' }],
    causalChain: { consequence: { immediate: '记忆保留' } },
    chapterText: '十月二十七日。',
  });
  if ((delta.facts || []).length !== 0) fail('E: plan produced 13 facts');
  else if ((delta.timeline.events || []).length !== 0) fail('E: plan produced 11 events');
  else ok('E: EO-P2 — no 11.events / 13.facts from plan date');
}

// Test F — Historical preservation
{
  const prior = wrapHistoricalPriorExcerpt('六月十七日那天，屏幕闪了一下。');
  if (!prior.includes('六月十七日')) fail('F: historical text deleted');
  else if (!/Historical|历史/u.test(prior)) fail('F: historical label missing');
  else ok('F: historical context preserved');
}

// Test G — F3 compatibility
{
  const intent = {
    pov: '苏晚',
    mainGoal: '确认',
    time: '10月27日',
    currentDate: '10月27日',
    scenes: [
      { index: 1, goal: '进入', text: '日期——六月十七日。' },
      { index: 2, goal: '推进', conflict: 'c', beat: 'turn' },
    ],
  };
  const scene = intent.scenes[1];
  const ctx = { pov: '苏晚', intent, state: { 时间: '10月27日' }, knowledge: { matrix: [] } };
  const L1 = [
    '### Scene 目标',
    '目标: 推进',
    '### 前序 Scene',
    '> **角色：Historical Continuity（历史承接）** — 不是当前 Scene 日历。',
    '- **Scene 1**: 日期——六月十七日。',
  ].join('\n');
  const L2 = buildSceneWritePrompt(ctx, intent, scene, L1);
  const compiled = compilePrompt({
    scene,
    chapter: 2,
    intent,
    loreText: L2,
    priorExcerpt: '屏幕上是六月十七日。',
    executionPlan: { beats: [{ order: 1, label: '试探', content: '推进', wordBudget: 200 }] },
  });
  const L3 = compiled.text;
  const L4 = compileSlimBeatUserPrompt({
    beat: { order: 1, label: '试探', content: '推进', libraryBeat: '试探', wordBudget: 200 },
    executionPlan: {
      beats: [{ order: 1, label: '试探', libraryBeat: '试探', wordBudget: 200 }],
      sceneIndex: 2,
      scenePlan: { goal: scene.goal },
      pov: '苏晚',
    },
    intent,
    scene,
    basePrompt: L3,
  });
  const trace = buildContextProvenanceTrace({
    l1Text: L1,
    l2Text: L2,
    l3Text: L3,
    l4Text: L4,
    intent,
    scene,
    ctx,
    l1Modules: [{ key: 'prev_summary' }],
  });
  const clock = findProvenanceBlock(trace, 'story_clock');
  const prior = findProvenanceBlock(trace, 'prior_excerpt');
  const prev = findProvenanceBlock(trace, 'prev_summary');
  if (!clock || clock.type === 'historical') fail(`G: story_clock mis-typed (${clock?.type})`);
  else if (prior?.type === 'historical' || prev?.type === 'historical') {
    ok('G: F3 — Story Clock ≠ Historical types');
  } else if (!prior && !prev) fail('G: missing historical provenance blocks');
  else fail(`G: historical type missing (prior=${prior?.type} prev=${prev?.type})`);
}

// Label resolveStateTimeLabel
{
  const lab = resolveStateTimeLabel({ time: '10月27日', chapter: 9 });
  if (lab !== '10月27日') fail('label: should keep real time');
  else ok('label: real time preferred over chapter');
}

console.log(failures ? `\nF5 FAIL (${failures})` : '\nF5 PASS');
process.exit(failures ? 1 : 0);
