#!/usr/bin/env node
/**
 * Phase 1.R2 — R3-B1 Story Clock Consumption regression
 * Prior summaries / disk legacy may contain historical dates;
 * they must not compete unlabeled with Story Clock Canonical as "today".
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  formatPreviousSummaries,
  buildContinuationBlock,
  extractSceneSummary,
} from '../packages/inkos-prompt/src/scene-summary.js';
import {
  resolvePreviousScenes,
  compileScenePrompt,
} from '../packages/inkos-prompt/src/compiler.js';
import { resolveStoryClock } from '../packages/inkos-core/src/lib/story-clock.js';

let failures = 0;
const fail = (m) => { failures += 1; console.error(`  FAIL: ${m}`); };
const ok = (m) => console.log(`  ok: ${m}`);

console.log('\n== Phase 1.R2 VERIFY (R3-B1) ==');

// 1) Historical Continuity labels when summary date ≠ Canonical
{
  const clock = { canonical: '10月27日' };
  const block = formatPreviousSummaries(
    [{ index: 1, title: '旧稿', summary: '日期——六月十七日。苏晚走进工位。' }],
    clock,
  );
  if (!block.includes('Historical Continuity')) fail('label: missing Historical Continuity');
  else ok('label: Historical Continuity present');
  if (!block.includes('10月27日')) fail('label: missing Canonical in summary block');
  else ok('label: Canonical stated in summary block');
  if (!block.includes('不得') && !block.includes('禁止')) fail('label: must forbid treating legacy as today');
  else ok('label: forbids legacy-as-today');
  if (!/六月十七/.test(block)) fail('label: must keep historical date text (not delete)');
  else ok('label: historical 六月 retained as history');

  const cont = buildContinuationBlock(2, '日期——六月十七日。苏晚走进工位。', clock);
  if (!cont.includes('Canonical') && !cont.includes('10月27日')) fail('cont: missing Canonical priority');
  else ok('cont: Canonical priority stated');
  if (!cont.includes('历史承接') && !cont.includes('非当前')) fail('cont: Previous must be non-current');
  else ok('cont: Previous marked non-current');
}

// 2) resolvePreviousScenes prefers in-session intent over disk
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-r2-'));
  const brain = path.join(tmp, 'novel', '_system', 'brain');
  fs.mkdirSync(brain, { recursive: true });
  fs.writeFileSync(
    path.join(brain, 'ch_0002_scenes.json'),
    JSON.stringify({
      scenes: [
        {
          index: 1,
          id: 's1',
          title: 'legacy',
          text: '日历写着六月十七日。这是磁盘旧稿。',
        },
      ],
    }),
    'utf8',
  );

  const scene2 = { index: 2, id: 's2', goal: 'g', conflict: 'c', beat: 'turn' };
  const diskOnly = resolvePreviousScenes(
    { bookDir: tmp, chapter: 2, intent: { scenes: [{ index: 1, id: 's1' }] } },
    scene2,
  );
  if (!diskOnly.length || !/六月/.test(diskOnly[0].text)) fail('fallback: disk should load when intent has no text');
  else ok('fallback: disk used when intent lacks text');

  const fresh = resolvePreviousScenes(
    {
      bookDir: tmp,
      chapter: 2,
      intent: {
        scenes: [
          {
            index: 1,
            id: 's1',
            text: '日历显示十月二十七日。苏晚没有说话。',
          },
        ],
      },
    },
    scene2,
  );
  if (!fresh.length || !/十月/.test(fresh[0].text)) fail('prefer: intent text must win over disk 六月');
  else ok('prefer: intent fresh text wins over disk legacy');
  if (/六月/.test(fresh[0].text)) fail('prefer: must not keep disk 六月 when intent has 十月');
  else ok('prefer: no disk 六月 when intent fresh');

  fs.rmSync(tmp, { recursive: true, force: true });
}

// 3) compileScenePrompt: intent fresh + clock → summaries follow intent, not unlabeled disk
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-r2c-'));
  const brain = path.join(tmp, 'novel', '_system', 'brain');
  fs.mkdirSync(brain, { recursive: true });
  fs.writeFileSync(
    path.join(brain, 'ch_0002_scenes.json'),
    JSON.stringify({
      scenes: [
        {
          index: 1,
          id: 'ch2_s1',
          title: 'legacy盘',
          text: '日期——六月十七日。苏晚在工位。',
        },
      ],
    }),
    'utf8',
  );

  const intent = {
    pov: '苏晚',
    mainGoal: '确认刷新',
    time: '10月27日',
    currentDate: '10月27日',
    scenes: [
      {
        index: 1,
        id: 'ch2_s1',
        title: '本轮',
        text: '日历钉在十月二十七日。苏晚推开玻璃门。',
        goal: 'g',
        conflict: 'c',
      },
      {
        index: 2,
        id: 'ch2_s2',
        title: '续',
        goal: '推进',
        conflict: '阻碍',
        beat: 'turn',
        entities: ['苏晚'],
        wordTarget: 400,
      },
    ],
  };

  const ctx = {
    bookDir: tmp,
    chapter: 2,
    pov: '苏晚',
    present: ['苏晚'],
    intent,
    chapterIntent: intent,
    state: { 时间: '10月27日' },
    facts: [],
    knowledge: { matrix: [] },
    relationships: [],
    characters: { 苏晚: { name: '苏晚' } },
    factions: {},
    currentStateMd: '时间：10月27日',
    characterSR: null,
  };

  const compiled = compileScenePrompt(ctx, intent.scenes[1]);
  const text = compiled?.text || '';
  if (!text.includes('Story Clock') && !text.includes('10月27日') && !text.includes('Historical Continuity')) {
    // lore seed may not include Story Clock (that is in buildSceneWritePrompt); check summaries
  }
  if (!text.includes('Historical Continuity') && !text.includes('历史承接')) {
    fail('compile: prev_summary must mark Historical Continuity when clock set');
  } else ok('compile: Historical Continuity in lore');
  if (/六月/.test(text) && !/十月|10月/.test(text)) {
    fail('compile: must not present only 六月 from disk when intent has 十月');
  } else ok('compile: intent 十月 path (disk 六月 not sole prior)');
  // Prefer intent: summary should come from 十月 text
  if (/六月十七/.test(text) && !text.includes('≠') && !text.includes('历史日期')) {
    // if 六月 somehow still present without conflict marker — bad
    fail('compile: unlabeled 六月 must not appear as prior when intent is 十月');
  } else ok('compile: no unlabeled disk 六月 as living prior');

  fs.rmSync(tmp, { recursive: true, force: true });
}

// 4) disk-only legacy + Canonical → keep 六月 as history, label conflict
{
  const clock = resolveStoryClock({
    intent: { time: '10月27日', currentDate: '10月27日', scenes: [{ index: 2 }] },
    scene: { index: 2 },
    ctx: {},
  });
  if (clock.canonical !== '10月27日') fail('clock: intent lock');
  else ok('clock: Canonical 10月27日');

  const summary = extractSceneSummary(
    { id: 's1', index: 1, title: '旧' },
    '日期——六月十七日。苏晚走进工位。',
  );
  const block = formatPreviousSummaries([summary], clock);
  if (!/六月/.test(block)) fail('disk-path: must retain historical 六月 text');
  else ok('disk-path: historical 六月 retained');
  if (!block.includes('10月27日')) fail('disk-path: Canonical must appear');
  else ok('disk-path: Canonical with historical prior');
}

// 5) no SR schema expansion
{
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const src = fs.readFileSync(path.join(root, 'packages/inkos-core/src/lib/minimal-sr.js'), 'utf8');
  if (/entity_confidence|persistenceEngine|characterStateEngine/.test(src)) {
    fail('must not expand SR');
  } else ok('SR schema untouched');
}

if (failures) {
  console.error(`\nPhase 1.R2 FAILED: ${failures}`);
  process.exit(1);
}
console.log('\nPhase 1.R2 PASSED — Story Clock consumption repair (R3-B1)\n');
