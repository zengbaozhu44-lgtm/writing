#!/usr/bin/env node
/**
 * F8.3 — Actual-aware Plan Validity + Execution Privilege Demotion
 *
 * High precision > high recall.
 * unresolved alone ≠ INVALID.
 * Strategic Goal preserved; opening premise may demote.
 * ≠ Canon / Reality / SR / Consequence Engine / Planner.replan
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  evaluatePlanValidity,
  ensurePlanValidity,
  isExecutionPrivilegeDemoted,
  formatPlanValidityDemotionBlock,
  buildObservedContinuity,
} from '../packages/inkos-prompt/src/index.js';
import { compileSlimBeatUserPrompt } from '../packages/inkos-studio-server/src/writer-optimization/beat-slimmer.js';

let failures = 0;
const fail = (m) => { failures += 1; console.error(`  FAIL: ${m}`); };
const ok = (m) => console.log(`  ok: ${m}`);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BOOK = path.join(ROOT, 'books/我的小说/books/凌晨四点世界刷新/novel/_system/brain/ch_0002_scenes.json');

console.log('\n== F8.3 Plan Validity Minimal Implementation ==');

const ch2 = JSON.parse(fs.readFileSync(BOOK, 'utf8'));
const [s1, s2, s3, s4] = ch2.scenes;

// --- A: Ch2 S2→S3 REAL FAILURE fixture → INVALID ---
{
  const oc = buildObservedContinuity(s2, s2.text);
  const r = evaluatePlanValidity({
    actualText: s2.text,
    actualOc: oc,
    nPlus1Plan: { goal: s3.goal },
  });
  if (r.status !== 'INVALID') fail(`A: expected INVALID got ${r.status}`);
  else if (!r.premiseDenied) fail('A: premiseDenied false');
  else if (r.executionPrivilege !== 'demoted') fail('A: executionPrivilege not demoted');
  else if (!r.strategicGoalPreserved) fail('A: strategicGoalPreserved false');
  else if (r.writesCanon || r.writesReality || r.writesSR) fail('A: wrote Canon/Reality/SR');
  else if (!r.conflicts.some((c) => c.type === 'location_premise')) fail('A: missing location_premise');
  else if (!r.conflicts.some((c) => c.type === 'choice_assumed_settled')) fail('A: missing choice_assumed_settled');
  else ok('A: Ch2 S2→S3 → INVALID + demoted + Goal preserved');
}

// --- B: FP-1 S1→S2 VALID (rooftop cliff ≠ invalidate prove-contradiction goal) ---
{
  const oc = buildObservedContinuity(s1, s1.text);
  const r = evaluatePlanValidity({
    actualText: s1.text,
    actualOc: oc,
    nPlus1Plan: { goal: s2.goal },
  });
  if (r.status !== 'VALID') fail(`B FP-1: expected VALID got ${r.status}`);
  else ok('B: FP-1 S1→S2 → VALID');
}

// --- C: FP-2 unresolved + bridge plan → VALID ---
{
  const oc = buildObservedContinuity(s2, s2.text);
  const r = evaluatePlanValidity({
    actualText: s2.text,
    actualOc: oc,
    nPlus1Plan: {
      goal: '先承接选择（跟我走或留下），结算后再进入医院病床见证刷新。',
    },
  });
  if (r.status !== 'VALID') fail(`C FP-2: expected VALID got ${r.status}`);
  else if (!r.bridgeLanguageInPlan) fail('C FP-2: bridgeLanguageInPlan false');
  else ok('C: FP-2 unresolved + bridge → VALID');
}

// --- D: FP-3 chase pressure + later hook goal → VALID ---
{
  const r = evaluatePlanValidity({
    actualText: String(s3.text || '').slice(-400),
    actualOc: buildObservedContinuity(s3, s3.text),
    nPlus1Plan: { goal: s4.goal },
  });
  if (r.status !== 'VALID') fail(`D FP-3: expected VALID got ${r.status}`);
  else ok('D: FP-3 chase vs system-hook goal → VALID');
}

// --- E: FP-4 emotion-only change → VALID ---
{
  const r = evaluatePlanValidity({
    actualText: '苏晚心里发慌，手心全是汗，但她仍盯着监控录像里的绷带。',
    actualOc: { unresolved: [], confirmed: [] },
    nPlus1Plan: { goal: '克服阻碍：证明记忆与世界记录的矛盾。' },
  });
  if (r.status !== 'VALID') fail(`E FP-4: expected VALID got ${r.status}`);
  else ok('E: FP-4 emotion-only → VALID');
}

// --- F: unresolved alone ≠ INVALID ---
{
  const r = evaluatePlanValidity({
    actualText: '你现在有两个选择。跟我走。或者留在这里。你有三十秒。',
    actualOc: { unresolved: [{ id: 'open_choice_s2', label: '未结算' }], confirmed: [] },
    nPlus1Plan: { goal: '克服阻碍：继续查证伤疤与世界记录的矛盾。' },
  });
  if (r.status !== 'VALID') fail(`F: unresolved alone should VALID got ${r.status}`);
  else ok('F: unresolved alone ≠ INVALID');
}

// --- G: object-state high-confidence INVALID ---
{
  const r = evaluatePlanValidity({
    actualText: '他把钥匙交了出去，钥匙已经不在口袋里。',
    actualOc: null,
    nPlus1Plan: { goal: '他掏出钥匙打开暗门。' },
  });
  if (r.status !== 'INVALID') fail(`G: object_state expected INVALID got ${r.status}`);
  else ok('G: object_state conflict → INVALID');
}

// --- H: ensurePlanValidity session attach + demotion block ---
{
  const intent = {
    scenes: [
      { ...s2, text: s2.text },
      { id: s3.id, index: 3, goal: s3.goal },
    ],
  };
  const next = { id: s3.id, index: 3, goal: s3.goal };
  const pv = ensurePlanValidity(next, intent);
  if (!isExecutionPrivilegeDemoted(pv)) fail('H: ensurePlanValidity not demoted');
  const block = formatPlanValidityDemotionBlock(pv);
  if (!/Plan Validity|Execution Privilege|demoted|桥接/u.test(block)) fail('H: demotion block missing');
  else if (!next.planValidity || next.planValidity.writesCanon) fail('H: bad planValidity attach');
  else ok('H: ensurePlanValidity + demotion block');
}

// --- I: L4 prompt demotion (Ch2 S2→S3 replay) ---
{
  const intent = {
    pov: '林夜',
    mainGoal: '确认刷新',
    scenes: [
      { id: s2.id, index: 2, text: s2.text, goal: s2.goal },
      { id: s3.id, index: 3, goal: s3.goal },
    ],
  };
  const scene = { id: s3.id, index: 3, goal: s3.goal };
  ensurePlanValidity(scene, intent);
  const ep = {
    scenePlan: { goal: s3.goal },
    beats: [
      {
        order: 1,
        id: 'goal',
        structuralBeat: 'goal',
        libraryBeat: 'Discovery',
        content: s3.goal,
        wordBudget: 80,
      },
    ],
  };
  const userPrompt = compileSlimBeatUserPrompt({
    beat: ep.beats[0],
    prevBeat: null,
    scene,
    intent,
    executionPlan: ep,
    accumulatedText: '',
    continuityState: {},
    beatMemory: {},
    profile: {},
    total: 6,
  });
  const demotedLabel = /STRATEGIC|执行资格已降级|demoted/u.test(userPrompt);
  const hasPv = /Plan Validity|Execution Privilege/u.test(userPrompt);
  const stillHardCurrent = /Scene explicit goal〔CURRENT INTENT〕/u.test(userPrompt)
    && !/STRATEGIC|执行资格已降级/u.test(userPrompt);
  const forbidsHospitalAsGiven = /禁止|不得把|不能|桥接|承接/u.test(userPrompt);
  if (!demotedLabel) fail('I: L4 missing demoted strategic goal label');
  else if (!hasPv) fail('I: L4 missing Plan Validity block');
  else if (stillHardCurrent) fail('I: L4 still injects CURRENT INTENT without demotion');
  else if (!forbidsHospitalAsGiven) fail('I: L4 missing bridge/forbid opening-as-given constraint');
  else if (!String(s3.goal).slice(0, 12) || !userPrompt.includes('医院') && !userPrompt.includes('病床')) {
    // Goal text should still appear (strategic preserved)
    if (!/病床|医院|刷新/u.test(userPrompt)) fail('I: strategic hospital goal text missing from L4');
    else ok('I: L4 demotion + strategic goal retained');
  } else ok('I: L4 demotion replay Ch2 S2→S3 (no CURRENT INTENT direct hospital open)');
}

// --- J: Goal not deleted ---
{
  const intent = { scenes: [{ ...s2, text: s2.text }, { index: 3, goal: s3.goal }] };
  const scene = { index: 3, goal: s3.goal };
  ensurePlanValidity(scene, intent);
  if (scene.goal !== s3.goal) fail('J: goal mutated/deleted');
  else if (!scene.planValidity?.strategicGoalPreserved) fail('J: strategicGoalPreserved missing');
  else ok('J: Goal retained under INVALID');
}

console.log(failures ? `\nF8.3 FAIL (${failures})` : '\nF8.3 PASS');
process.exit(failures ? 1 : 0);
