/**
 * Story Route V1 — projection, hard-filter, canon pollution witness.
 *
 *   node scripts/test-story-route-v1.js
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { getBookPaths } from '../packages/inkos-core/src/lib/book.js';
import { exists, readText } from '../packages/inkos-core/src/lib/paths.js';
import {
  projectRouteRealityInput,
  filterRouteCandidates,
  evaluateRouteCandidate,
  runStoryRouteGenerate,
  ROUTE_VERSION,
} from '../packages/inkos-route/src/index.js';
import { buildRouteInput } from '../packages/inkos-route/src/load-route-input.js';
import { isTemplateFallback } from '../packages/inkos-brain/src/authored/authored-input-sanitize.js';
import { filterCanonicalTimelineEvents } from '../packages/inkos-context-ranking/src/timeline-canon.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BOOK = path.join(ROOT, 'books/我的小说/books/旧车站维修师');

let failures = 0;
const fail = (label, msg) => {
  failures += 1;
  console.error(`  FAIL: ${label} — ${msg}`);
};
const ok = (label) => console.log(`  ok: ${label}`);

function sha256(filePath) {
  if (!exists(filePath)) return null;
  return crypto.createHash('sha256').update(readText(filePath)).digest('hex');
}

function canonSnapshot(bookDir) {
  const bp = getBookPaths(bookDir);
  const m = bp.modules;
  const files = [m.timeline, m.facts_db, m.current_state, m.current_chapter];
  const snap = {};
  for (const f of files) {
    snap[f] = sha256(f);
  }
  return snap;
}

console.log('\n== Projection: excludes plan residue ==');
{
  const { projection, route_input } = buildRouteInput(BOOK, { chapter: 1 });
  const excluded = projection.excluded || [];
  const has09 = excluded.some((e) => e.source === '09_current_chapter');
  const hasVol = excluded.some((e) => e.source === 'volume_outline');
  if (!has09) fail('excluded-09', '09 exclusion not logged');
  else ok('09 never enters route reality');

  if (!hasVol) fail('excluded-volume', 'volume_outline exclusion not logged');
  else ok('volume_outline never enters route reality');

  const facts = projection.confirmed.history.facts || [];
  const l02 = facts.filter((f) => /^第\d+章完成/u.test(f.fact));
  if (l02.length) fail('L02-facts', `L02 facts leaked: ${l02.map((f) => f.fact).join('; ')}`);
  else ok('L02 mainGoal facts excluded');

  const templateFacts = facts.filter((f) => isTemplateFallback(f.fact));
  if (templateFacts.length) fail('template-facts', 'template facts in projection');
  else ok('template facts excluded');

  for (const day of projection.confirmed.history.timeline) {
    const raw = day.events || [];
    const filtered = filterCanonicalTimelineEvents(raw);
    if (raw.length !== filtered.length) {
      fail('timeline-self', 'timeline day contains non-A events after projection');
    }
  }
  ok('timeline S6.3 A-class only');

  const state = projection.confirmed.current_reality.state || {};
  if (state['地点'] || state['时间'] || state['任务']) {
    fail('08-plan-fields', `plan fields in state: ${JSON.stringify(state)}`);
  } else ok('08 plan-derived location/time/task excluded');

  if (route_input.hard_constraints === undefined) fail('slot-hard', 'hard_constraints missing');
  else ok('hard_constraints slot present');

  if (!route_input.literary_orientation || typeof route_input.literary_orientation !== 'object') {
    fail('slot-orientation', 'literary_orientation missing');
  } else ok('literary_orientation slot present');

  const foreshadowInHistory = projection.confirmed.history?.foreshadow;
  if (foreshadowInHistory != null) {
    fail('foreshadow-not-reality', 'foreshadow must not be in confirmed history');
  } else ok('foreshadow excluded from confirmed reality');
}

console.log('\n== Projection: C06 chapter=1 temporal boundary (2055日常切片) ==');
{
  const BOOK2055 = path.join(ROOT, 'books/我的小说/books/2055日常切片');
  if (!exists(path.join(BOOK2055, 'book.json'))) {
    console.log('  skip: 2055 book not found');
  } else {
    const { projection } = buildRouteInput(BOOK2055, { chapter: 1 });
    const timeline = projection.confirmed.history.timeline || [];
    const allEvents = timeline.flatMap((d) => d.events || []);
    const text = allEvents.join('\n');

    if (timeline.some((d) => Number(d.chapter) > 1)) {
      fail('c06-future-days', 'timeline contains chapter > 1');
    } else ok('C06 timeline chapter <= 1');

    if (/女儿/u.test(text)) fail('c06-daughter-timeline', 'daughter in timeline projection');
    else ok('C06 no daughter in timeline');

    if (/建立\s*POV/u.test(text)) fail('c06-plan-pov', 'plan POV residue in timeline');
    else ok('C06 no 建立 POV plan residue');

    if (projection.confirmed.history.facts?.some((f) => Number(f.chapter) > 1)) {
      fail('c06-future-facts', 'future facts in projection');
    } else ok('C06 facts chapter <= 1');

    const st = projection.confirmed.current_reality.state || {};
    if (st['当前章节'] && String(st['当前章节']) !== '1') {
      fail('c06-stale-08', `stale 08 chapter: ${st['当前章节']}`);
    } else ok('C06 no stale 08 当前章节=5');

    if (projection.confirmed.current_reality.pov === '林晓') {
      fail('c06-wrong-pov', 'POV should not be 林晓 at ch1');
    } else ok(`C06 POV at ch1: ${projection.confirmed.current_reality.pov || '(empty)'}`);

    if (projection.confirmed.people['林晓']) {
      fail('c06-linxiao-people', '林晓 should not be in people at ch1');
    } else ok('C06 林晓 excluded from people at ch1');

    const exFore = projection.excluded?.some((e) => e.source === 'foreshadow');
    if (!exFore) fail('c06-foreshadow-excluded', 'foreshadow exclusion not logged');
    else ok('C06 foreshadow not confirmed reality');
  }
}

console.log('\n== Hard filter: rejects plot outline / fate ==');
{
  const good = {
    id: 'G1',
    kind: 'possibility',
    provenance: ROUTE_VERSION,
    title: 'test',
    direction: '她原本准备离开，但母亲的处境逐渐让「离开」从一个简单的个人选择，变成对既有关系与责任的重新定义；在这个过程中，她可能越来越难以维持原先对自己人生的理解。',
    tensions: ['责任与自我'],
    relationship_shifts: ['与母亲的关系可能被重新丈量'],
    open_space: '是否留下、如何开口，均未确定',
  };
  const badOutline = {
    ...good,
    id: 'B1',
    direction: '第一章他遇到母亲，第二章发生争执，第三章他决定留下。这是一个完整的故事线。',
  };
  const badFate = {
    ...good,
    id: 'B2',
    direction: '他最终一定会为了母亲留下来，这是注定的结局，无论如何都会发生。',
  };

  if (!evaluateRouteCandidate(good, []).valid) fail('good-route', 'valid route rejected');
  else ok('life-direction route accepted');

  if (evaluateRouteCandidate(badOutline, []).valid) fail('bad-outline', 'plot outline accepted');
  else ok('plot outline rejected');

  if (evaluateRouteCandidate(badFate, []).valid) fail('bad-fate', 'fate assertion accepted');
  else ok('fate assertion rejected');

  const filtered = filterRouteCandidates([good, badOutline, badFate], []);
  if (filtered.valid.length !== 1) fail('filter-count', `expected 1 valid, got ${filtered.valid.length}`);
  else ok('hard filter keeps 1 of 3');
}

console.log('\n== Pollution witness: canon unchanged after route generate ==');
{
  if (!exists(path.join(BOOK, 'book.json'))) {
    console.log('  skip: test book not found');
  } else {
    const before = canonSnapshot(BOOK);
    const result = await runStoryRouteGenerate(BOOK, { chapter: 1, mock: true });
    const after = canonSnapshot(BOOK);

    for (const [file, hashBefore] of Object.entries(before)) {
      const hashAfter = after[file];
      if (hashBefore !== hashAfter) {
        fail('canon-pollution', `${file} changed (${hashBefore?.slice(0, 8)} → ${hashAfter?.slice(0, 8)})`);
      }
    }
    if (!failures) ok('11/13/08/09 unchanged after route generate');

    if (!exists(result.paths.selected_route)) fail('sidecar', 'selected_route.json not written');
    else ok('sidecar written');

    if (!result.selection?.reasons?.length) fail('selection-reasons', 'no qualitative reasons');
    else ok('LLM qualitative selection shape (mock)');
  }
}

console.log(`\n${failures ? `FAILED (${failures})` : 'ALL PASS'}\n`);
process.exitCode = failures ? 1 : 0;
