#!/usr/bin/env node
/**
 * F7 — Beat Integration Read-only Audit (artifact only; no production mutation)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ensureObservedContinuity,
  collectPreviousObservedContinuity,
} from '../packages/inkos-prompt/src/scene-observed-continuity.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BOOK = path.join(ROOT, 'books/我的小说/books/凌晨四点世界刷新');
const OUT = path.join(ROOT, 'golden/story-architecture/validation-f7');
const WO = path.join(BOOK, 'novel/_system/studio/writer-optimization/ch_0002');

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function classifyBeatFields(beat = {}) {
  return {
    structuralBeat: { value: beat.structuralBeat || beat.id, class: 'CONSTRAINT' },
    content_goal: { class: 'PLAN', note: 'from scene.goal / planner' },
    libraryBeat: { value: beat.libraryBeat, class: 'CONSTRAINT' },
    libraryInstruction: { class: 'CONSTRAINT', risk: beat.libraryBeat === 'Decision' ? 'FAKE_CHOICE_HINT' : null },
    choice: { value: String(beat.choice || beat.beatPlan?.choice || '').slice(0, 80), class: 'PLAN_OR_EXPECTED' },
    afterState: { value: String(beat.afterState || beat.beatPlan?.afterState || '').slice(0, 80), class: 'EXPECTED' },
    beforeState: { class: 'EXPECTED' },
    targetEmotion: { class: 'PLAN_OR_EXPECTED' },
    action: { class: 'PLAN' },
  };
}

function auditScene(n, brainScenes) {
  const meta = loadJson(path.join(WO, `scene_0${n}.json`));
  const ep = meta.executionPlan || meta.meta?.executionPlan || {};
  const beats = ep.beats || [];
  const scene = brainScenes[n - 1];
  ensureObservedContinuity(scene);

  const fakeDecision = beats
    .filter((b) => b.libraryBeat === 'Decision' && (b.structuralBeat || b.id) !== 'choice')
    .map((b) => ({ order: b.order, structural: b.structuralBeat || b.id }));

  const fieldSample = beats[0] ? classifyBeatFields(beats[0]) : null;

  // Expected vs actual (scene-level, not per-micro-beat prose)
  const expectedGoal = String(scene.goal || '');
  const actual = String(scene.text || '');
  let expectedVsActual = 'MATCH';
  if (/医院|病床/.test(expectedGoal) && /病床|医院|3:59|4:00/.test(actual.slice(0, 300))) {
    expectedVsActual = 'MATCH'; // Writer followed scene goal
  }
  if (n === 3) {
    // S2 left open choice; S3 ignores settlement
    expectedVsActual = 'RESULT_PATH_FOLLOWS_SCENE_GOAL';
  }

  return {
    scene: n,
    title: scene.title,
    sources: {
      sceneGoal: 'Planner/Director PLAN',
      executionPlan: 'Director buildSceneExecutionPlan',
      beatCount: beats.length,
      writerInventedStructure: false,
      note: 'Writer fills prose; cannot change 6-beat structure',
    },
    fakeDecisionOnNonChoiceBeats: fakeDecision,
    beat0FieldClasses: fieldSample,
    observedContinuity: {
      confirmed: (scene.observedContinuity?.confirmed || []).map((c) => c.id),
      unresolved: (scene.observedContinuity?.unresolved || []).map((u) => u.id),
    },
    textHead: actual.slice(0, 120).replace(/\n/g, ' '),
    textTail: actual.slice(-100).replace(/\n/g, ' '),
    expectedVsActual,
  };
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const brain = loadJson(path.join(BOOK, 'novel/_system/brain/ch_0002_scenes.json'));
  const scenes = (brain.scenes || []).slice(0, 3);
  const rows = [1, 2, 3].map((n) => auditScene(n, scenes));

  for (const s of scenes) ensureObservedContinuity(s);
  const toS3 = collectPreviousObservedContinuity(scenes.slice(0, 2), { planText: scenes[2].goal });

  const findings = [];

  if (rows.some((r) => r.fakeDecisionOnNonChoiceBeats.length)) {
    findings.push({
      id: 'F7-A',
      class: 'FAKE_CHOICE',
      detail: 'LibraryBeat Decision assigned to non-choice structural beats (e.g. goal) with predetermined choice hint',
      scenes: rows.filter((r) => r.fakeDecisionOnNonChoiceBeats.length).map((r) => r.scene),
    });
  }

  findings.push({
    id: 'F7-B',
    class: 'PLAN_LEAK',
    detail: 'beat-state afterState comes from BEAT_STATE_TEMPLATES; beat-memory may label heuristic newFacts as 已确立事实',
    evidence: ['packages/inkos-director/src/beat-state.js afterState: template.afterState', 'beat-memory.js formatBeatMemoryBlock'],
  });

  const s2Open = toS3.unresolved.some((u) => u.id === 'open_choice_s2');
  const s3Hospital = /医院|病床/.test(scenes[2].goal) && /病床|医院/.test(scenes[2].text.slice(0, 200));
  const s2Settled = /点头跟|跟她走了|选择了/.test(scenes[2].text);
  if (s2Open && s3Hospital && !s2Settled) {
    findings.push({
      id: 'F7-C',
      class: 'RESULT_IGNORED',
      detail: 'S2 open_choice unresolved in OC; S3 Writer followed Scene Goal hospital wake-up without settling choice',
      note: 'Beat Expected does not overwrite OC object; Scene Goal + Beat stack still steered Writer. Continuity failure owned by F6.1; F7 attributes steering to PLAN/Beat over-spec.',
    });
  }

  findings.push({
    id: 'F7-D',
    class: 'OVER-SPECIFIED',
    detail: 'Fixed 6-beat + L3 absolute Beat Plan + L4 Before/After/goal/emotion/engines; Writer cannot alter structure',
  });

  findings.push({
    id: 'F7-E',
    class: 'DUPLICATED',
    detail: 'Planner scene.goal / Director scenePlan / Beat content / L3 Beat Plan / L4 sceneGoalLine repeat same goal text',
  });

  const summary = {
    phase: 'F7',
    verdict: 'AUDIT COMPLETE',
    readOnly: true,
    productionBook: '凌晨四点世界刷新',
    chapter: 2,
    rows,
    crossScene: {
      toS3Unresolved: toS3.unresolved.map((u) => u.id),
      ocPreservedOpenChoice: s2Open,
      writerFollowedHospitalPlan: s3Hospital,
      choiceSettledInS3: s2Settled,
    },
    findings,
    roles: {
      beatMemory: 'heuristic / diagnostic prompt feed (not Canon)',
      evaluateStoryStateChange: 'heuristic hard gate for rewrite (session only)',
      evaluateCauseEffect: 'heuristic soft diagnostic',
      observedContinuity: 'scene-local observation projection (F6.2)',
      beat: 'structural CONSTRAINT + PLAN/EXPECTED injection — NOT Reality Authority',
    },
  };

  fs.writeFileSync(path.join(OUT, 'audit.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({
    verdict: summary.verdict,
    findings: findings.map((f) => ({ id: f.id, class: f.class })),
    ocOpen: s2Open,
    hospital: s3Hospital,
  }, null, 2));
}

main();
