/**
 * Phase 2 — State Evolution Engine tests
 *
 * A: Plan-only scenes → timeline.events still []
 * B: actualEvents present → timeline filled + provenance
 * C: buildStateDiff goes through Evolution
 * D: EO-P2 resolveTimelineEvents still []
 */
import {
  evolveFromChapter,
  mapActualEventsToEvolution,
  STATE_EVOLUTION_ENGINE,
} from '../packages/inkos-brain/src/memory/state-evolution-engine.js';
import {
  resolveTimelineEvents,
  buildStateDelta,
} from '../packages/inkos-brain/src/memory/state-updater.js';
import { ensureActualEvents } from '../packages/inkos-brain/src/events/index.js';
import { buildStateDiff } from '../packages/inkos-runtime/src/memory/memory-unit.js';

let failures = 0;
const fail = (label, msg) => {
  failures += 1;
  console.error(`  FAIL: ${label} — ${msg}`);
};
const ok = (label) => console.log(`  ok: ${label}`);

const prose = `
苏晚停在走廊尽头。“你现在有两个选择。”她说，“跟我走，去看证明。”
林夜抓住栏杆，指节发白。她推开侧门，冷风灌进来。
`.trim();

console.log('\n== Phase 2 State Evolution ==');

// A: Plan pollution must not fill timeline via Evolution
{
  const scenes = [
    {
      id: 's1',
      index: 1,
      text: '他走进房间，坐下。',
      goal: '克服阻碍：资源不足或时间压力',
      scenePlan: {
        situation: { closingWorldState: '医院走廊 · Plan 伪现实' },
      },
    },
  ];
  const diff = evolveFromChapter({
    bookDir: '/tmp/inkos-se-test',
    chapter: 2,
    scenes,
    intent: { pov: '林夜', mainGoal: 'Plan 目标不得进 timeline' },
  });
  const events = diff.canonDelta?.timeline?.events || [];
  // presence/action may extract weak events from "走进/坐下" — must not contain Plan strings
  const blob = events.join('\n');
  if (/医院走廊|Plan 伪|克服阻碍|资源不足/.test(blob)) {
    fail('A plan leak', `events leaked Plan: ${blob}`);
  } else ok('A: Plan strings absent from timeline.events');
  if (diff.provenance?.engine !== STATE_EVOLUTION_ENGINE) {
    fail('A provenance', 'missing engine provenance');
  } else ok('A: provenance.engine set');
}

// B: Actual Events → timeline
{
  const scene = {
    id: 's_ch2_s3',
    index: 3,
    text: prose,
    characters: ['苏晚', '林夜'],
  };
  ensureActualEvents(scene, { stripPlan: true });
  if (!scene.actualEvents?.length) fail('B extract', 'expected actualEvents');
  else ok(`B: extracted ${scene.actualEvents.length} actualEvents`);

  const diff = evolveFromChapter({
    bookDir: '/tmp/inkos-se-test',
    chapter: 2,
    scenes: [scene],
    intent: { pov: '林夜', chapterTitle: '选择' },
  });
  const events = diff.canonDelta?.timeline?.events || [];
  if (!events.length) fail('B timeline', 'expected non-empty timeline.events from Actual');
  else ok(`B: timeline.events=${events.length} sample=${events[0]?.slice(0, 40)}`);

  if (!diff.provenance?.writesCanonTimeline) {
    fail('B prov flag', 'writesCanonTimeline should be true');
  } else ok('B: writesCanonTimeline=true');

  if (diff.provenance?.writesFacts !== false) fail('B facts flag', 'writesFacts must stay false');
  else ok('B: writesFacts=false');

  const open = diff.evolution?.openLoops || [];
  if (!open.some((x) => String(x).includes('open_loop:choice'))) {
    fail('B open loop', `expected open_loop hint, got ${JSON.stringify(open)}`);
  } else ok('B: open_loop hints present');

  if (/closingWorldState|Plan/.test(events.join('\n'))) {
    fail('B plan in events', 'Plan must not appear');
  } else ok('B: no Plan in Actual timeline');
}

// C: buildStateDiff wire
{
  const scene = { id: 's2', index: 1, text: prose, characters: ['苏晚', '林夜'] };
  const diff = buildStateDiff('/tmp/inkos-se-test', 3, {
    scenes: [scene],
    intent: { pov: '林夜' },
    chapterText: prose,
  });
  if (!diff.evolution || !diff.provenance) fail('C wire', 'buildStateDiff missing evolution/provenance');
  else ok('C: buildStateDiff → Evolution');
  if (!(diff.canonDelta?.timeline?.events?.length > 0)) {
    fail('C events', 'expected Actual-derived events via buildStateDiff');
  } else ok('C: events via buildStateDiff');
}

// D: EO-P2 shell unchanged
{
  const events = resolveTimelineEvents({
    intent: { mainGoal: '克服阻碍：资源不足或时间压力' },
    scenes: [{ goal: '章末钩子（承接转折后果）：发现型钩子', consequence: 'Plan 后果' }],
    causalChain: { consequence: 'modelled 后果' },
  });
  if (events.length !== 0) fail('D resolve', `expected [], got ${JSON.stringify(events)}`);
  else ok('D: resolveTimelineEvents still []');

  const delta = buildStateDelta('/tmp/inkos-se-test', 9, {
    intent: { pov: 'X', mainGoal: 'Plan' },
    scenes: [{ goal: '克服阻碍：资源不足或时间压力' }],
    causalChain: { consequence: '假历史' },
  });
  if ((delta.timeline?.events || []).length !== 0) {
    fail('D buildStateDelta', 'plan path must stay empty');
  } else ok('D: buildStateDelta plan path events=[]');
  if ((delta.facts || []).length !== 0) fail('D facts', 'facts must stay []');
  else ok('D: facts=[]');
}

// E: map rejects skeleton-like action if any
{
  const mapped = mapActualEventsToEvolution([
    {
      id: 'bad',
      actors: ['X'],
      action: '克服阻碍：资源不足或时间压力',
      stateChanges: [],
    },
    {
      id: 'good',
      actors: ['林夜'],
      action: '抓住栏杆',
      stateChanges: ['action:林夜:抓住'],
    },
  ]);
  if (mapped.timelineEvents.some((e) => /克服阻碍|资源不足/.test(e))) {
    fail('E reject', 'skeleton action must not map');
  } else ok('E: skeleton action rejected by isActualTimelineEvent');
  if (!mapped.timelineEvents.some((e) => /抓住栏杆/.test(e))) {
    fail('E accept', 'real action should map');
  } else ok('E: real action mapped');
}

console.log(failures ? `\nRESULT: FAIL (${failures})` : '\nRESULT: PASS');
process.exit(failures ? 1 : 0);
