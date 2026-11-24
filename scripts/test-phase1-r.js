#!/usr/bin/env node
/**
 * Phase 1.R regression — Information Boundary + Story Clock
 * Does not expand Minimal SR schema.
 */
import {
  formatCharacterSRForPrompt,
  formatInformationBoundaryRules,
  assembleMinimalSR,
} from '../packages/inkos-core/src/lib/minimal-sr.js';
import {
  resolveStoryClock,
  formatStoryClockForPrompt,
  extractCalendarHints,
} from '../packages/inkos-core/src/lib/story-clock.js';
import { buildSceneWritePrompt } from '../packages/inkos-brain/src/scene/scene.js';
import { buildRuntimeContinuationBlock } from '../packages/inkos-brain/src/writer/llm-writer.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let failures = 0;
const fail = (m) => { failures += 1; console.error(`  FAIL: ${m}`); };
const ok = (m) => console.log(`  ok: ${m}`);

console.log('\n== Phase 1.R VERIFY ==');

// A1/A2 — boundary rules present when Awareness omit
{
  const sr = assembleMinimalSR({
    ctx: {
      pov: '苏晚',
      knowledge: { matrix: [] },
      relationships: [],
      characters: { 苏晚: { name: '苏晚' } },
    },
  });
  const block = formatCharacterSRForPrompt(sr);
  const rules = formatInformationBoundaryRules(sr);
  if (!rules.includes('Information Boundary')) fail('A: missing Information Boundary rules');
  else ok('A: Information Boundary helper present');
  if (!block.includes('不得写成角色先验已知') && !block.includes('亲眼看见')) {
    fail('A: omit Awareness must warn against prior-know phrasing');
  } else ok('A: omit Awareness warns against 亲眼看见/先验');
  if (!rules.includes('World / Narration')) fail('A: must distinguish World vs Character Knowledge');
  else ok('A: World ≠ Character Knowledge');
  // Must NOT ban mentioning world info entirely
  if (/一律不能出现|禁止出现该信息/.test(rules)) fail('A: must not ban world mention wholesale');
  else ok('A: does not ban world mention wholesale');
}

// buildSceneWritePrompt carries boundary + clock
{
  const ctx = {
    pov: '苏晚',
    state: { 时间: 'Day 1' },
    knowledge: { matrix: [] },
    relationships: [],
    characters: {},
  };
  const intent = {
    pov: '苏晚',
    mainGoal: '让林夜确认刷新',
    scenes: [{ index: 1, goal: 'g', conflict: 'c' }],
  };
  const scene = {
    index: 1,
    goal: '林夜经历车祸记忆与日期回退',
    conflict: '世界否认',
    beat: 'situation',
    wordTarget: 600,
  };
  const prompt = buildSceneWritePrompt(ctx, intent, scene, '### lore\n');
  if (!prompt.includes('信息边界')) fail('A: scene write prompt missing 信息边界');
  else ok('A: buildSceneWritePrompt has 信息边界');
  if (!prompt.includes('Story Clock')) fail('B: scene write prompt missing Story Clock');
  else ok('B: buildSceneWritePrompt has Story Clock');
  if (!prompt.includes('Day 1')) fail('B: Day 1 from 08 not projected');
  else ok('B: 08 Day 1 projected as clock');
}

// B — prior scene calendar locks next when intent has no calendar
{
  const intent = {
    pov: '苏晚',
    scenes: [
      {
        index: 1,
        text: '日历显示2045年10月14日。苏晚没有说话。',
      },
      { index: 2, goal: '续', conflict: 'c' },
    ],
  };
  const clock = resolveStoryClock({
    ctx: { state: { 时间: 'Day 1' } },
    intent,
    scene: intent.scenes[1],
  });
  if (!clock.canonical || !/10月14日/.test(clock.canonical)) {
    fail(`B: prior scene calendar not preferred (got ${clock.canonical})`);
  } else ok('B: prior scene 10月14日 preferred over Day 1');
  const cont = buildRuntimeContinuationBlock(intent.scenes[1], intent, { state: { 时间: 'Day 1' } });
  if (!cont.includes('10月14日') && !cont.includes('锁定')) fail('B: continuity missing calendar lock');
  else ok('B: continuity locks prior calendar');
}

// B — explicit intent lock beats polluted prior/summary calendar
{
  const intent = {
    pov: '苏晚',
    time: '10月27日',
    currentDate: '10月27日',
    scenes: [
      { index: 1, text: '屏幕上是六月十七日。' },
      { index: 2, goal: '续', conflict: 'c' },
    ],
  };
  const clock = resolveStoryClock({
    ctx: { state: { 时间: 'Day 1' } },
    intent,
    scene: intent.scenes[1],
  });
  if (clock.canonical !== '10月27日') fail(`B: intent lock must beat prior 六月 (got ${clock.canonical})`);
  else ok('B: intent 10月27日 beats polluted prior 六月');
  if (!clock.lockRule.includes('前序摘要')) fail('B: must warn against summary date pollution');
  else ok('B: summary-pollution warning present');
}

// B — extract hints
{
  const hits = extractCalendarHints('六月十七日，然后又是10月16日');
  if (!hits.some((h) => /六月十七/.test(h))) fail('B: extract 六月十七');
  else ok('B: extractCalendarHints works');
}

// No new SR schema fields
{
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const src = fs.readFileSync(path.join(root, 'packages/inkos-core/src/lib/minimal-sr.js'), 'utf8');
  if (/entity_confidence|relationship_memory|character_identity|persistenceEngine/.test(src)) {
    fail('must not add banned SR expansion fields');
  } else ok('no banned SR expansion fields');
  if (!src.includes('formatInformationBoundaryRules')) fail('boundary helper missing');
  else ok('boundary helper in minimal-sr (prompt layer, not new SR slot)');
}

if (failures) {
  console.error(`\nPhase 1.R FAILED: ${failures}`);
  process.exit(1);
}
console.log('\nPhase 1.R PASSED — consumption + clock only; SR schema frozen\n');
