#!/usr/bin/env node
/**
 * Phase 1 — Actual Event Foundation
 * Prove: delete Plan → still know who did what / world & character deltas (from text).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createStoryEvent,
  stripPlanFromScene,
  validateStoryEvent,
  validateStoryEventSet,
  extractStoryEventsFromScene,
  FORBIDDEN_EVENT_SOURCES,
  collectPreviousActualEvents,
  formatActualEventsBlock,
  summarizeActualEvents,
} from '../packages/inkos-brain/src/events/index.js';

let failures = 0;
const fail = (m) => { failures += 1; console.error(`  FAIL: ${m}`); };
const ok = (m) => console.log(`  ok: ${m}`);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('\n== Phase 1 Event Foundation ==');

// --- A: Schema + validator reject Plan-sourced fake event ---
{
  const text = '苏晚说：「跟我走，还是留在这？」林夜抓住她的手腕。';
  const fake = createStoryEvent({
    sceneId: 's_test',
    actors: ['苏晚'],
    action: '苏晚确认世界已刷新',
    consequence: '真相大白',
    stateChanges: ['world:refreshed'],
    affectedEntities: ['苏晚', '林夜'],
    evidence: { excerpt: '世界已刷新' },
    source: 'plan.closingWorldState',
  });
  const v = validateStoryEvent(fake, { text });
  if (v.ok) fail('A: plan-sourced event should REJECT');
  else if (!v.errors.some((e) => e.startsWith('forbidden_source') || e === 'evidence_not_in_text')) {
    fail(`A: unexpected errors ${v.errors.join(',')}`);
  } else ok('A: Plan-sourced / ungrounded event REJECT');
}

// --- B: Synthetic prose, no Plan — extract actors/action/stateChanges ---
{
  const scene = {
    id: 'ch2_s3',
    index: 3,
    text: [
      '苏晚停在走廊尽头。',
      '“你现在有两个选择。”她说，“跟我走，去看证明。”',
      '“你有三十秒。”',
      '林夜抓住栏杆，指节发白。',
    ].join('\n'),
    // Poison Plan fields — extractor must ignore
    scenePlan: {
      situation: { closingWorldState: '林夜已同意跟苏晚离开医院' },
    },
    goal: '让林夜成为清醒者',
    closingWorldState: '二人已到达地下机房',
  };

  const stripped = stripPlanFromScene(scene);
  if (stripped.scenePlan || stripped.goal || stripped.closingWorldState) {
    fail('B: stripPlanFromScene leaked Plan fields');
  } else ok('B1: Plan fields stripped');

  const { events, meta } = extractStoryEventsFromScene(scene, {
    knownNames: ['苏晚', '林夜'],
  });
  if (!meta.planFieldsIgnored) fail('B: meta.planFieldsIgnored false');
  if (!events.length) fail('B: no events from synthetic prose');
  else {
    const hasChoice = events.some((e) => e.kind === 'open_choice');
    const hasAction = events.some((e) => e.kind === 'action' || e.kind === 'speech');
    const sample = events[0];
    if (!hasChoice) fail('B: missing open_choice event');
    else if (!sample.actors?.length) fail('B: missing actors');
    else if (!sample.action) fail('B: missing action');
    else if (!sample.stateChanges?.length) fail('B: missing stateChanges');
    else if (!sample.consequence) fail('B: missing consequence');
    else if (!hasAction && events.length < 1) fail('B: expected speech/action too');
    else ok(`B2: extracted ${events.length} event(s) without Plan (choice=${hasChoice})`);
  }

  const set = validateStoryEventSet(events, { text: scene.text, requireAtLeastOne: true });
  if (!set.ok) fail(`B3: event set REJECT ${set.errors.join(',')} rejected=${set.rejected.length}`);
  else ok('B3: event set PASS');
}

// --- C: Real fixture text — Plan deleted, still recover ---
{
  const fixturePath = path.join(
    ROOT,
    'books/我的小说/books/凌晨四点世界刷新/novel/_system/brain/ch_0002_scenes.json',
  );
  if (!fs.existsSync(fixturePath)) {
    fail('C: fixture missing ch_0002_scenes.json');
  } else {
    const ch2 = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    const scenes = Array.isArray(ch2.scenes) ? ch2.scenes : [];
    // Prefer scene with open-choice language
    let target = scenes.find((s) => /跟我走|两个选择|三十秒/u.test(String(s.text || '')));
    if (!target) target = scenes.find((s) => String(s.text || '').trim().length > 80) || scenes[0];

    if (!target?.text) fail('C: no scene text in fixture');
    else {
      const planGone = stripPlanFromScene({
        ...target,
        scenePlan: { situation: { closingWorldState: 'SHOULD_NOT_MATTER' } },
        executionPlan: { situation: { closingWorldState: 'SHOULD_NOT_MATTER' } },
        goal: 'SHOULD_NOT_MATTER',
      });
      const { events } = extractStoryEventsFromScene(
        { ...planGone, text: target.text, id: target.id || 'ch2_s?' },
        { knownNames: ['苏晚', '林夜', '陈默'] },
      );
      if (!events.length) {
        fail('C: fixture prose yielded zero events after Plan delete');
      } else {
        const who = [...new Set(events.flatMap((e) => e.actors))];
        const changes = events.flatMap((e) => e.stateChanges);
        if (!who.length) fail('C: no actors recovered');
        else if (!changes.length) fail('C: no stateChanges recovered');
        else {
          ok(`C: Plan deleted → actors=[${who.slice(0, 4).join(',')}] events=${events.length}`);
          ok(`C: stateChanges sample: ${changes.slice(0, 3).join(' | ')}`);
        }
      }
    }
  }
}

// --- D: Forbidden source list is non-empty contract ---
{
  if (!FORBIDDEN_EVENT_SOURCES.includes('closingWorldState')) fail('D: missing closingWorldState ban');
  else ok('D: forbidden Plan sources contracted');
}

// --- E: N+1 prompt can see Actual without Plan (Phase 1 consumption) ---
{
  const prev = {
    id: 'ch2_s3',
    index: 3,
    text: [
      '苏晚停在走廊尽头。',
      '“你现在有两个选择。”她说，“跟我走，去看证明。”',
      '“你有三十秒。”',
      '林夜抓住栏杆，指节发白。',
    ].join('\n'),
    scenePlan: { situation: { closingWorldState: '林夜已离开医院' } },
    goal: 'SHOULD_NOT_APPEAR_IN_ACTUAL',
  };
  const nextPlanPoison = {
    index: 4,
    goal: '直接开地下机房',
    scenePlan: { situation: { closingWorldState: '二人已到达机房' } },
  };
  void nextPlanPoison; // N+1 Plan must not be required for Actual block

  const strippedPrev = stripPlanFromScene(prev);
  const bundle = collectPreviousActualEvents([strippedPrev], {
    knownNames: ['苏晚', '林夜'],
  });
  if (!bundle.events?.length) fail('E: no actual events for N+1 after Plan strip');
  else {
    const block = formatActualEventsBlock(bundle);
    if (!block.includes('Previous Scene Occurrence Events')) fail('E: missing Occurrence Events header');
    else if (!/苏晚|林夜/u.test(block)) fail('E: actors missing from N+1 Actual block');
    else if (/林夜已离开医院|地下机房|SHOULD_NOT/u.test(block)) {
      fail('E: Plan closingWorldState leaked into Actual block');
    } else if (bundle.writesCanon !== false || bundle.writesSR !== false || bundle.writesReality !== false) {
      fail('E: projection flags must be false');
    } else {
      const summary = summarizeActualEvents(bundle.events);
      if (!summary) fail('E: empty summarizeActualEvents');
      else ok(`E: N+1 Actual block without Plan (${bundle.events.length} events; ${summary.slice(0, 60)})`);
    }
  }
}

console.log(failures ? `\nRESULT: FAIL (${failures})` : '\nRESULT: PASS');
process.exit(failures ? 1 : 0);
