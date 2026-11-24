#!/usr/bin/env node
/**
 * F2 — Final Context Viewer regression (READ-ONLY observability)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSceneWritePrompt } from '../packages/inkos-brain/src/scene/scene.js';
import { compile as compilePrompt } from '../packages/inkos-runtime/src/compiler/prompt-compiler.js';
import { compileSlimBeatUserPrompt } from '../packages/inkos-studio-server/src/writer-optimization/beat-slimmer.js';
import {
  hashPromptText,
  persistFinalContextCompile,
  persistFinalContextWriterCall,
  loadFinalContextSnapshot,
  listFinalContextSnapshots,
  verifyFinalContextIntegrity,
  assertFinalContextReadOnlyContract,
} from '../packages/inkos-studio-server/src/writer-optimization/final-context-viewer.js';
import { hasStoryClock, hasInformationBoundary } from '../packages/inkos-core/src/lib/prompt-survival.js';

let failures = 0;
const fail = (m) => { failures += 1; console.error(`  FAIL: ${m}`); };
const ok = (m) => console.log(`  ok: ${m}`);

console.log('\n== F2 Final Context Viewer ==');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-f2-'));
const bookDir = tmp;
// writer-optimization lives under novel/_system/studio/
fs.mkdirSync(path.join(bookDir, 'novel', '_system', 'studio', 'writer-optimization'), { recursive: true });

const intent = {
  pov: '苏晚',
  mainGoal: '确认刷新',
  time: '10月27日',
  currentDate: '10月27日',
  scenes: [
    { index: 1, id: 's1', goal: 'g', conflict: 'c' },
    { index: 2, id: 's2', goal: '推进', conflict: '阻碍', beat: 'turn', wordTarget: 400 },
  ],
};
const scene = intent.scenes[1];
const ctx = {
  pov: '苏晚',
  present: ['苏晚'],
  intent,
  state: { 时间: '10月27日' },
};

const L1 = '### Scene 目标\n目标: 推进\n节拍: turn\n';
const L2 = buildSceneWritePrompt(ctx, intent, scene, L1);
const compiled = compilePrompt({
  scene,
  chapter: 2,
  intent,
  loreText: L2,
  priorExcerpt: '六月十七日旧稿',
  executionPlan: { beats: [{ order: 1, label: '试探', content: '推进', wordBudget: 200 }] },
});
const L3 = compiled.text;
const L4 = compileSlimBeatUserPrompt({
  beat: { order: 1, label: '试探', content: '推进', libraryBeat: '试探', wordBudget: 200 },
  executionPlan: {
    beats: [{ order: 1, label: '试探', libraryBeat: '试探', wordBudget: 200 }],
    sceneIndex: 2,
    scenePlan: { goal: scene.goal },
    pov: '苏晚',
  },
  intent,
  scene,
  basePrompt: L3,
});

const sealedHash = hashPromptText(L3);
persistFinalContextCompile(bookDir, 2, scene, {
  l1Text: L1,
  l2Text: L2,
  l3Text: L3,
  sealedHash,
  clockSource: 'intent_or_scene_field',
});

const callId = 's2-b1-c1';
persistFinalContextWriterCall(bookDir, 2, scene, {
  userPrompt: L4,
  beatOrder: 1,
  callId,
  systemPrompt: 'system-test',
});

// Test A — L3 viewer locates sealed prompt
{
  const snap = loadFinalContextSnapshot(bookDir, 2, 2, { includeText: true });
  if (!snap?.layers?.L3?.present || !snap.texts?.L3) fail('A: L3 sealed not locatable');
  else ok('A: L3 Viewer locates sealed prompt');
  if (snap.layers.L3.hash !== sealedHash || snap.layers.L3.sealedHash !== sealedHash) {
    fail('A: L3 sealedHash mismatch');
  } else ok('A: L3 sealedHash matches');
}

// Test B — L4 viewer locates beat userPrompt
{
  const snap = loadFinalContextSnapshot(bookDir, 2, 2, { includeText: true });
  if (!snap?.layers?.L4?.present || !snap.texts?.L4) fail('B: L4 userPrompt not locatable');
  else ok('B: L4 Viewer locates Beat userPrompt');
}

// Test C/D — Clock / IB visible in L4
{
  const snap = loadFinalContextSnapshot(bookDir, 2, 2, { includeText: true });
  if (!snap.layers.L4.clock || !hasStoryClock(snap.texts.L4)) fail('C: Clock not visible in L4');
  else ok('C: Clock visible in L4');
  if (!snap.layers.L4.ib || !hasInformationBoundary(snap.texts.L4)) fail('D: IB not visible in L4');
  else ok('D: IB visible in L4');
}

// Test E — hash integrity vs writer call
{
  const snap = loadFinalContextSnapshot(bookDir, 2, 2);
  const expected = hashPromptText(L4);
  if (snap.layers.L4.hash !== expected || snap.layers.L4.beatUserPromptHash !== expected) {
    fail('E: L4 hash != actual userPrompt hash');
  } else ok('E: L4 hash matches actual Writer userPrompt');
  if (snap.writerCallId !== callId) fail('E: writerCallId mismatch');
  else ok('E: writerCallId matches call');
  const integrity = verifyFinalContextIntegrity(snap);
  if (!integrity.ok) fail(`E: integrity ${integrity.reasons.join('; ')}`);
  else ok('E: verifyFinalContextIntegrity PASS');
}

// Test F — read-only contract
{
  const ro = assertFinalContextReadOnlyContract(bookDir, 2, 2);
  if (!ro.ok) fail(`F: ${ro.reason}`);
  else ok('F: read-only contract (writer-optimization only)');
  const snap = loadFinalContextSnapshot(bookDir, 2, 2);
  if (snap.writesCanon || snap.writesSR || snap.readOnly !== true) fail('F: meta not read-only');
  else ok('F: snapshot flags readOnly / no Canon / no SR write');
  // Must not create novel canon files
  const canonTouched = ['01_world_bible.md', '06_knowledge_matrix.yaml', '08_current_state.yaml', '11_timeline.yaml']
    .some((f) => fs.existsSync(path.join(bookDir, 'novel', f)));
  if (canonTouched) fail('F: must not write Canon modules');
  else ok('F: no Canon module files created');
}

{
  const list = listFinalContextSnapshots(bookDir, 2);
  if (list.length !== 1) fail('list snapshots');
  else ok('listFinalContextSnapshots works');
}

// No SR expansion
{
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const sr = fs.readFileSync(path.join(root, 'packages/inkos-core/src/lib/minimal-sr.js'), 'utf8');
  if (/persistenceEngine|characterStateEngine/.test(sr)) fail('SR expanded');
  else ok('SR schema untouched');
}

fs.rmSync(tmp, { recursive: true, force: true });

if (failures) {
  console.error(`\nF2 FAILED: ${failures}`);
  process.exit(1);
}
console.log('\nF2 PASSED — Final Context Viewer READ-ONLY observability\n');
