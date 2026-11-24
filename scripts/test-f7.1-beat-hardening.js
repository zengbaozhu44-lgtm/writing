#!/usr/bin/env node
/**
 * F7.1 — Beat Semantic Hardening
 * A Decision gate · B choice allows Decision · C Expected wording
 * D Heuristic wording · E unresolved · F Goal ≠ prior settlement
 * G F3 provenance · H F2 L4 final semantics
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assignLibraryBeats,
  sanitizeLibraryBeat,
  isDecisionHintAllowed,
  libraryBeatInstruction,
} from '../packages/inkos-director/src/beat-library.js';
import { formatBeatStatePlanBlock } from '../packages/inkos-director/src/beat-state.js';
import { formatBeatMemoryBlock } from '../packages/inkos-director/src/beat-memory.js';
import {
  ensureObservedContinuity,
  collectPreviousObservedContinuity,
  formatObservedContinuityBlock,
  hasObservedContinuityMarkers,
} from '../packages/inkos-prompt/src/scene-observed-continuity.js';
import { compileSlimBeatUserPrompt } from '../packages/inkos-studio-server/src/writer-optimization/beat-slimmer.js';
import {
  buildContextProvenanceTrace,
  findProvenanceBlock,
} from '../packages/inkos-studio-server/src/writer-optimization/context-provenance.js';
import { hasStoryClock } from '../packages/inkos-core/src/lib/prompt-survival.js';

let failures = 0;
const fail = (m) => { failures += 1; console.error(`  FAIL: ${m}`); };
const ok = (m) => console.log(`  ok: ${m}`);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('\n== F7.1 Beat Semantic Hardening ==');

// --- Test A — goal + Decision → no Decision hint ---
{
  const allowed = isDecisionHintAllowed('goal');
  const sanitized = sanitizeLibraryBeat('goal', 'Decision');
  const instr = libraryBeatInstruction('Decision', 'goal');
  if (allowed) fail('A: Decision allowed on goal');
  else if (sanitized === 'Decision') fail('A: sanitize left Decision on goal');
  else if (/Decision[：:]/u.test(instr)) fail('A: Decision hint still emitted for goal');
  else ok('A: goal + LibraryBeat=Decision → no Decision hint');
}

// --- Test B — choice + Decision → allowed ---
{
  const allowed = isDecisionHintAllowed('choice');
  const sanitized = sanitizeLibraryBeat('choice', 'Decision');
  const instr = libraryBeatInstruction('Decision', 'choice');
  if (!allowed) fail('B: Decision blocked on choice');
  else if (sanitized !== 'Decision') fail('B: sanitize remapped choice Decision');
  else if (!/Decision[：:]/u.test(instr)) fail('B: Decision hint missing on choice');
  else ok('B: choice + LibraryBeat=Decision → Decision hint allowed');
}

// assignLibraryBeats must never leave Decision on non-choice
{
  let bad = false;
  for (let i = 1; i <= 12; i += 1) {
    const map = assignLibraryBeats(i);
    for (const [structural, lib] of Object.entries(map)) {
      if (structural === 'choice' || structural === 'escalation') continue;
      if (lib === 'Decision') {
        fail(`A/B assign: Decision on ${structural} (scene ${i})`);
        bad = true;
      }
    }
  }
  if (!bad) ok('A/B: assignLibraryBeats never places Decision off choice');
}

// --- Test C — afterState → EXPECTED, not confirmed fact ---
{
  const block = formatBeatStatePlanBlock({
    beforeState: '局面未变',
    action: '推进',
    consequence: '代价',
    afterState: 'POV 已锁定目标',
    requiredDimension: 'information',
  });
  if (!/EXPECTED/u.test(block)) fail('C: afterState block missing EXPECTED');
  else if (/confirmed fact/iu.test(block)) fail('C: confirmed fact wording present');
  else if (/已确立事实/u.test(block)) fail('C: 已确立事实 wording present');
  else ok('C: afterState labeled EXPECTED; no confirmed-fact wording');
}

// --- Test D — beat-memory newFacts → HEURISTIC ---
{
  const block = formatBeatMemoryBlock({
    lastAfterState: '局面收紧',
    newFacts: ['界面弹出倒计时'],
    characterStateChanges: [],
    emotionChanges: [],
    unresolved: [],
  });
  if (!/HEURISTIC/u.test(block)) fail('D: newFacts missing HEURISTIC label');
  else if (/已确立事实/u.test(block)) fail('D: 已确立事实 still present');
  else if (/confirmed fact/iu.test(block)) fail('D: confirmed fact present');
  else ok('D: beat-memory newFacts → HEURISTIC');
}

// --- Test E — open_choice + hospital Goal → remains unresolved ---
{
  const s2 = {
    id: 'e_s2',
    index: 2,
    text: '「跟我走，去看证明。」她说。「或者留在这里。你有三十秒。」林夜没有立刻回答。',
  };
  ensureObservedContinuity(s2);
  const hospitalGoal = '凌晨4:00，林夜在医院的病床上醒来，亲眼目睹世界刷新';
  const bundle = collectPreviousObservedContinuity([s2], { planText: hospitalGoal });
  const open = (bundle.unresolved || []).filter((u) => /^open_choice/.test(u.id));
  if (!open.length) fail('E: open_choice cleared by hospital Goal');
  else ok('E: open_choice remains unresolved under hospital Goal');

  const block = formatObservedContinuityBlock(bundle, { canonical: '10月27日' });
  if (!/F7\.1|remain unresolved|Goal≠prior settlement/u.test(block)) {
    fail('E: F7.1 unresolved-vs-Goal constraint missing from OC block');
  } else ok('E: OC block carries F7.1 unresolved constraint');
}

// --- Test F — Goal does not rewrite prior result as settlement ---
{
  const s2 = {
    id: 'f_s2',
    index: 2,
    text: '「跟我走。或者留在这里。你有三十秒。」',
    goal: '天台对峙',
  };
  ensureObservedContinuity(s2);
  const s3 = {
    id: 'f_s3',
    index: 3,
    goal: '凌晨4:00，林夜在医院的病床上醒来',
    text: '',
  };
  const L4 = compileSlimBeatUserPrompt({
    beat: {
      order: 1,
      id: 'goal',
      structuralBeat: 'goal',
      libraryBeat: 'Decision', // persisted fake choice — must be stripped
      libraryInstruction: 'Decision：POV 必须在有限选项中做出选择，选择有代价',
      label: '目标',
      beforeState: '局面未变',
      afterState: 'POV 已锁定可执行目标',
      wordBudget: 200,
    },
    executionPlan: {
      beats: [
        { order: 1, structuralBeat: 'goal', libraryBeat: 'Decision' },
        { order: 2, structuralBeat: 'obstacle', libraryBeat: 'Danger' },
        { order: 3, structuralBeat: 'choice', libraryBeat: 'Decision' },
        { order: 4, structuralBeat: 'consequence', libraryBeat: 'Danger' },
        { order: 5, structuralBeat: 'newInformation', libraryBeat: 'Twist' },
        { order: 6, structuralBeat: 'hook', libraryBeat: 'Countdown' },
      ],
      scenePlan: { goal: s3.goal },
      sceneIndex: 3,
    },
    intent: {
      pov: '林夜',
      scenes: [s2, s3],
      time: '10月27日',
      currentDate: '10月27日',
    },
    scene: s3,
    accumulatedText: '',
    basePrompt: '',
  });

  if (/Decision[：:]/u.test(L4) && /当前 Beat 1\//u.test(L4)) {
    // Decision may appear only if somehow on choice — beat1 is goal
    const beat1Section = L4.split(/## 当前 Beat/)[1] || L4;
    if (/指令：[^\n]*Decision/u.test(beat1Section) || /Decision：POV 必须/u.test(beat1Section)) {
      fail('F: goal beat still injects Decision fake-choice hint');
    } else ok('F: goal beat Decision hint stripped at L4');
  } else ok('F: goal beat Decision hint stripped at L4');

  if (!hasObservedContinuityMarkers(L4)) fail('F: L4 missing Observed Continuity');
  else if (!/open_choice|未结算选择|thirty|三十秒|跟我走/u.test(L4)) {
    fail('F: L4 missing unresolved open_choice signal');
  } else if (/上一场已经决定去医院|已经选择去医院|上一场已决定/u.test(L4)) {
    fail('F: Goal rewrote prior unresolved as settled');
  } else if (!/Goal≠prior settlement|may not rewrite prior unresolved|不得用本场 Plan\/Goal 假装/u.test(L4)) {
    fail('F: Goal anti-settlement constraint missing');
  } else ok('F: Goal directs hospital without rewriting prior settlement');
}

// --- Test G — F3 provenance ---
{
  const s2 = {
    id: 'g_s2',
    index: 2,
    text: '「跟我走。你有三十秒。」门缝「快跑」。',
  };
  ensureObservedContinuity(s2);
  const s3 = { id: 'g_s3', index: 3, goal: '医院醒来', text: '' };
  const L4 = compileSlimBeatUserPrompt({
    beat: {
      order: 1,
      structuralBeat: 'goal',
      libraryBeat: 'Discovery',
      libraryInstruction: 'Discovery：读出新约束',
      beforeState: 'a',
      afterState: 'b',
      wordBudget: 180,
    },
    executionPlan: {
      beats: [{ order: 1, structuralBeat: 'goal' }],
      scenePlan: { goal: s3.goal },
      sceneIndex: 3,
    },
    intent: { pov: '林夜', scenes: [s2, s3], time: '10月27日', currentDate: '10月27日' },
    scene: s3,
  });
  const trace = buildContextProvenanceTrace({
    finalUserPrompt: L4,
    scene: s3,
    intent: { scenes: [s2, s3] },
  });
  const block = findProvenanceBlock(trace) || findProvenanceBlock(L4) || '';
  if (!trace && !block) fail('G: provenance trace missing');
  else if (!hasObservedContinuityMarkers(L4) && !/observed_continuity|Observed Continuity/u.test(JSON.stringify(trace || {}))) {
    fail('G: provenance missing Observed Continuity path');
  } else ok('G: F3 provenance normal');
}

// --- Test H — F2 L4 final semantics ---
{
  const s2 = {
    id: 'h_s2',
    index: 2,
    text: '「跟我走，去看证明。或者留在这里。你有三十秒。」',
  };
  ensureObservedContinuity(s2);
  const s3 = { id: 'h_s3', index: 3, goal: '医院病床醒来', text: '' };
  const L4 = compileSlimBeatUserPrompt({
    beat: {
      order: 1,
      structuralBeat: 'goal',
      libraryBeat: 'Decision',
      libraryInstruction: 'Decision：必须选',
      beforeState: '局势未变',
      afterState: 'POV 已锁定可执行目标，局面即将被打破',
      wordBudget: 200,
    },
    executionPlan: {
      beats: Array.from({ length: 6 }, (_, i) => ({
        order: i + 1,
        structuralBeat: ['goal', 'obstacle', 'choice', 'consequence', 'newInformation', 'hook'][i],
        libraryBeat: i === 2 ? 'Decision' : 'Discovery',
      })),
      scenePlan: { goal: s3.goal },
      sceneIndex: 3,
    },
    intent: { pov: '林夜', scenes: [s2, s3], time: '10月27日', currentDate: '10月27日' },
    scene: s3,
  });
  if (!/EXPECTED TARGET|EXPECTED/u.test(L4)) fail('H: L4 missing EXPECTED semantics on After');
  else if (!hasObservedContinuityMarkers(L4)) fail('H: L4 missing Observed Continuity');
  else if (!/CURRENT INTENT|STRATEGIC|Scene explicit goal|Goal≠prior settlement/u.test(L4)) fail('H: L4 missing Scene Goal / Goal≠settlement');
  else ok('H: L4 final semantics visible (Expected / OC / Goal)');
}

console.log(failures ? `\nF7.1 tests FAILED (${failures})` : '\nF7.1 tests PASS');
process.exit(failures ? 1 : 0);
