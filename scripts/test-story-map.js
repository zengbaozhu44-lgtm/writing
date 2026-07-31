#!/usr/bin/env node
/**
 * 冒烟：Story Map 长篇架构层
 * 脚手架 → Planner 注入 → POV 校验 → 作者笔记
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const toUrl = (p) => pathToFileURL(p).href;
let n = 0;
function ok(label) {
  n += 1;
  console.log(`✓ ${label}`);
}

const {
  scaffoldStoryMap,
  saveStoryMap,
  resolveChapterMapContext,
  validatePovGrid,
  formatStoryMapAuthorNotes,
  diagnoseStoryMapChapter,
  planChapterWithMap,
} = await import(toUrl(path.join(root, 'packages/inkos-studio-server/src/story-map/store.js')));

const { planChapter, applyStoryMapToIntent } = await import(
  toUrl(path.join(root, 'packages/inkos-brain/src/planner/planner.js'))
).catch(async () => {
  const m = await import(toUrl(path.join(root, 'packages/inkos-brain/src/planner/planner.js')));
  const sm = await import(toUrl(path.join(root, 'packages/inkos-brain/src/planner/story-map.js')));
  return { ...m, applyStoryMapToIntent: sm.applyStoryMapToIntent };
});

const { applyStoryMapToIntent: applyMap } = await import(
  toUrl(path.join(root, 'packages/inkos-brain/src/planner/story-map.js'))
);

{
  const draft = scaffoldStoryMap({
    title: '疯神纪元',
    totalChapters: 50,
    primaryPov: '林异',
    secondaryPov: '林小雅',
    openingHook: '清道夫发现尸体异常',
    coreMystery: '编辑器真相',
    chapterTones: [
      { chapterIndex: 1, tone: '压抑惊悚', coreEvent: '碎片出现', endingDirection: '追捕将至', wordTarget: 2500 },
    ],
  });
  assert.equal(draft.story_arc.volumes.length, 4);
  assert.equal(draft.story_arc.volumes[0].arc_phase, 'setup');
  assert.ok(draft.pov_grid.length >= 4);
  assert.equal(draft.pov_grid[0].pov, '林异');
  assert.equal(draft.pov_grid[1].pov, '林小雅');
  assert.ok(draft.milestones.length >= 2);
  assert.ok(draft.plot_threads.some((t) => t.type === 'main'));
  ok('scaffold: 4 volumes + POV + threads + milestones');
}

{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-smap-'));
  fs.mkdirSync(path.join(dir, 'novel', '_system'), { recursive: true });
  const draft = scaffoldStoryMap({
    title: '测试',
    totalChapters: 40,
    primaryPov: '林异',
    secondaryPov: '方晴',
    openingHook: '异常',
    coreMystery: '编辑器',
  });
  // 人为制造 POV 疲劳
  // ch5 = milestone（避免与 interlude 冲突）
  draft.pov_grid = [
    { chapter: 1, pov: '林异', pov_type: 'primary', why_this_pov: 'a' },
    { chapter: 2, pov: '林异', pov_type: 'primary', why_this_pov: 'b' },
    { chapter: 3, pov: '林异', pov_type: 'primary', why_this_pov: 'c' },
    { chapter: 6, pov: '陈默', pov_type: 'interlude', why_this_pov: 'd' },
    { chapter: 7, pov: '陈默', pov_type: 'interlude', why_this_pov: 'e' },
  ];
  saveStoryMap(dir, draft);

  const check = validatePovGrid(draft.pov_grid, { totalChapters: 40 });
  assert.ok(check.warnings.some((w) => /视角疲劳/.test(w)));
  assert.ok(check.errors.some((e) => /Interlude/.test(e)));
  ok('POV hard rules: fatigue warn + interlude error');

  const ctx3 = resolveChapterMapContext(dir, 3);
  assert.ok(ctx3);
  assert.equal(ctx3.chapterFunction, 'setup_for_milestone'); // m1 at ch5, distance 2
  assert.ok(ctx3.distanceToMilestone <= 2);

  const ctx5 = resolveChapterMapContext(dir, 5);
  assert.equal(ctx5.chapterFunction, 'milestone');

  const notes = formatStoryMapAuthorNotes(ctx3);
  assert.match(notes, /本章在整体中的位置/);
  assert.match(notes, /视角调度/);
  assert.match(notes, /情节线|里程碑/);
  ok('chapter function + author notes');

  const intent = applyMap(
    { chapter: 3, pov: '主角', mainGoal: '推进当前现实目标', chapterIntent: '第3章：推进' },
    dir,
    3,
  );
  assert.equal(intent.pov, '林异');
  assert.ok(intent.storyMap);
  assert.match(intent.mainGoal, /里程碑|铺垫|推进/);
  assert.ok(intent.storyMap.authorNotes);

  const planned = planChapterWithMap(dir, 5, { chapter: 5 });
  assert.equal(planned.ready, true);
  assert.equal(planned.intent.storyMap.chapterFunction, 'milestone');

  const diag = diagnoseStoryMapChapter(dir, 3, { actualPov: '别人' });
  assert.equal(diag.enabled, true);
  assert.ok((diag.warnings || []).some((w) => /POV 偏离/.test(w)));

  // planChapter integration
  const full = planChapter(
    {
      bookDir: dir,
      chapter: 1,
      chapterTask: {},
      state: {},
      volume: { goals: ['测试'] },
      facts: [],
      pov: '主角',
      present: [],
    },
    1,
  );
  assert.ok(full.storyMap || full.pov === '林异');
  ok('Planner applies story map to intent');

  fs.rmSync(dir, { recursive: true, force: true });
}

{
  const planner = fs.readFileSync(
    path.join(root, 'packages/inkos-brain/src/planner/planner.js'),
    'utf8',
  );
  assert.match(planner, /applyStoryMapToIntent/);
  const routes = fs.readFileSync(
    path.join(root, 'packages/inkos-studio-server/src/routes.js'),
    'utf8',
  );
  assert.match(routes, /\/story-map/);
  assert.match(routes, /story-map\/scaffold/);
  ok('planner + routes wired');
}

console.log(`\nAll ${n} checks passed.`);
