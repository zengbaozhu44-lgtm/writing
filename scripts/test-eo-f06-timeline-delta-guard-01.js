#!/usr/bin/env node
/**
 * EO-F-06-Timeline-Delta-Guard-01 — S6.1 / EO-P2 契约在 delta 通道的执行
 *
 * P1 骨架/模板/Plan 串经 delta.timeline → 全部滤除（fixture day-1 四串实证）
 * P2 Actual 资格串经 delta.timeline → 保留入 11
 * P3 混合输入 → 只留 Actual；day/time/characters_present 透传不被破坏
 * P4 rerun 幂等语义不变（append-only 每次追加一条 day，守卫两次都生效）
 * P5 engine 路径行为不变（evolveFromChapter 仍只产 Actual 行）
 * P6 authored 07/09 通道不受本守卫影响（delta.state_board 行为原样——记录性断言）
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { applyStateDiffToCanon, isActualTimelineEvent } from '../packages/inkos-brain/src/memory/state-updater.js';
import { evolveFromChapter } from '../packages/inkos-brain/src/memory/state-evolution-engine.js';
import { readYaml } from '../packages/inkos-core/src/lib/yaml-store.js';

let pass = 0;
let fail = 0;
function ok(cond, label) {
  if (cond) { pass += 1; console.log(`  ok - ${label}`); }
  else { fail += 1; console.error(`  FAIL - ${label}`); }
}

const SKELETONS = [
  '建立 POV（主角）当下目标：进入世界',
  '克服阻碍：资源不足或时间压力',
  '关键抉择导致不可逆变化',
  '发现型钩子',
];
const ACTUALS = ['林逸：林逸伸手，按下了那个键', '老周：他说，你值夜班，不该上来'];

function mkBook() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'f06-'));
  fs.writeFileSync(path.join(dir, 'book.json'), JSON.stringify({ schemaVersion: 4 }));
  fs.mkdirSync(path.join(dir, 'novel', '_system'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'novel', '_system', 'manifest.json'), JSON.stringify({}));
  fs.writeFileSync(path.join(dir, 'novel', '11_timeline.yaml'), 'meta: {current_day: 0}\ndays: []\n');
  return dir;
}

console.log('# EO-F-06-Timeline-Delta-Guard-01');

console.log('## P1 骨架/模板串全滤');
{
  const book = mkBook();
  applyStateDiffToCanon(book, 1, { timeline: { day: 1, time: '00:00', events: [...SKELETONS], characters_present: ['主角'] } });
  const tl = readYaml(path.join(book, 'novel', '11_timeline.yaml'));
  ok(tl.days.length === 1, 'day 条目仍追加（append-only 语义不变）');
  ok((tl.days[0].events || []).length === 0, `四条骨架全部滤除（实得 ${(tl.days[0].events || []).length} 条）`);
  fs.rmSync(book, { recursive: true, force: true });
}

console.log('## P2/P3 Actual 串保留 + 混合只留 Actual');
{
  const book = mkBook();
  applyStateDiffToCanon(book, 2, { timeline: { day: 2, time: '21:00', events: [...SKELETONS, ...ACTUALS], characters_present: ['林逸', '老周'] } });
  const tl = readYaml(path.join(book, 'novel', '11_timeline.yaml'));
  const evs = tl.days[0].events || [];
  ok(evs.length === ACTUALS.length, `混合输入只留 ${ACTUALS.length} 条 Actual（实得 ${evs.length}）`);
  ok(ACTUALS.every((a) => evs.includes(a)), 'Actual 行逐字保留');
  ok(tl.days[0].day === 2 && tl.days[0].characters_present.length === 2, 'day/time/characters_present 透传不破坏');
  fs.rmSync(book, { recursive: true, force: true });
}

console.log('## P4 rerun 守卫两次生效');
{
  const book = mkBook();
  for (let i = 0; i < 2; i += 1) {
    applyStateDiffToCanon(book, 3, { timeline: { day: 3, events: [...SKELETONS, ACTUALS[0]] } });
  }
  const tl = readYaml(path.join(book, 'novel', '11_timeline.yaml'));
  ok(tl.days.length === 2, '两次调用两 day 条目（既有 append-only）');
  ok(tl.days.every((d) => (d.events || []).length === 1 && d.events[0] === ACTUALS[0]), '每次都只留 Actual');
  fs.rmSync(book, { recursive: true, force: true });
}

console.log('## P5 engine 路径不回归');
{
  const book = mkBook();
  const scene = {
    id: 'ch1_s1', index: 1, pov: '林逸', characters: ['林逸'],
    text: '林逸伸手，按下了那个键。警铃炸响。',
    actualEvents: [{
      id: 'evt_ch1_s1_action_0', sceneId: 'ch1_s1', kind: 'action',
      actors: ['林逸'], action: '林逸伸手，按下了那个键', consequence: '警铃炸响',
      stateChanges: ['action:林逸:按下'], affectedEntities: ['林逸'],
      evidence: { excerpt: '林逸伸手，按下了那个键' }, source: 'scene.text',
    }],
  };
  const r = evolveFromChapter({ bookDir: book, chapter: 1, scenes: [scene], intent: { pov: '林逸' }, chapterText: scene.text });
  const engineEvents = r.canonDelta?.timeline?.events || [];
  ok(engineEvents.some((e) => String(e).includes('林逸')), `engine 路径 Actual 行照常产出（${JSON.stringify(engineEvents)}）`);
  ok(!engineEvents.some((e) => SKELETONS.some((s) => String(e).includes(s.slice(0, 6)))), 'engine 路径无骨架混入');
  // engine diff 经生产咽喉落盘：Actual 行保留、骨架滤除（F-06 守卫对 engine diff 同样生效）
  applyStateDiffToCanon(book, 1, r.canonDelta || {});
  const tl = readYaml(path.join(book, 'novel', '11_timeline.yaml'));
  const written = (tl.days || []).flatMap((d) => d.events || []);
  ok(written.some((e) => String(e).includes('林逸')), 'engine diff → 11 落盘后 Actual 行保留');
  fs.rmSync(book, { recursive: true, force: true });
}

console.log('## P6 谓词与守卫同源（零漂移）');
{
  ok(SKELETONS.every((s) => !isActualTimelineEvent(s)), '四条 fixture 骨架串被 isActualTimelineEvent 判负');
  ok(ACTUALS.every((a) => isActualTimelineEvent(a.split('：').pop() || a) || isActualTimelineEvent(a)), 'Actual 行判正');
}

console.log(`\n# 结果: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
