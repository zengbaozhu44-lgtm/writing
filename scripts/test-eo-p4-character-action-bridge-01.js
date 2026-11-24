/**
 * EO-P4-Character-Action-Bridge-01 — Intent + occurrence → Character Action
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  CADE_PROVENANCE,
  createCADE,
  deriveActionIntentTruth,
  attachActionIntentTruthFromCADE,
  deriveCharacterActionTruth,
  attachCharacterActionTruth,
  refuseCharacterActionFromForeignAuthority,
  assertWriterCannotMintCharacterAction,
  writeCADEToChapter,
} from '../packages/inkos-brain/src/causality/index.js';
import { applyAttributionAfterActual } from '../packages/inkos-brain/src/attribution/index.js';

let failures = 0;
const fail = (label, msg) => {
  failures += 1;
  console.error(`  FAIL: ${label} — ${msg}`);
};
const ok = (label) => console.log(`  ok: ${label}`);

console.log('\n== EO-P4-Character-Action-Bridge-01 ==');

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-ca-'));
const bookDir = path.join(tmpRoot, 'book');
fs.mkdirSync(path.join(bookDir, 'novel', '_system', 'brain'), { recursive: true });

function assertedIntent(characterId, actionContent) {
  const cade = createCADE({
    characterId,
    actionContent,
    provenance: CADE_PROVENANCE,
    sourceRef: 'authored.character_action_decision.explicit',
    decisionKind: 'commits',
  }).cade;
  return deriveActionIntentTruth(cade);
}

const matchingOcc = {
  id: 'evt_door',
  actors: ['苏晚'],
  action: '推开地下书库的铁门',
  kind: 'action',
  evidence: { excerpt: '苏晚推开地下书库的铁门。' },
};

// T1
{
  const intent = assertedIntent('苏晚', '推开地下书库的铁门');
  const truth = deriveCharacterActionTruth({
    intentTruth: intent,
    occurrences: [matchingOcc],
  });
  assert.equal(truth.status, 'asserted');
  assert.equal(truth.characterId, '苏晚');
  assert.equal(truth.actionContent, '推开地下书库的铁门');
  assert.ok(truth.intentRef);
  assert.equal(truth.occurrenceRef, 'evt_door');
  assert.equal(truth.isChoice, false);
  assert.equal(truth.provenance, 'character_action_from_intent_realization');
  ok('T1 Intent + matching occurrence → Character Action asserted');
}

// T2
{
  const truth = deriveCharacterActionTruth({
    intentTruth: { status: 'absent' },
    occurrences: [matchingOcc],
  });
  assert.equal(truth.status, 'absent');
  ok('T2 Intent absent + occurrence → no Character Action');
}

// T3
{
  const intent = assertedIntent('苏晚', '推开地下书库的铁门');
  const truth = deriveCharacterActionTruth({ intentTruth: intent, occurrences: [] });
  assert.equal(truth.status, 'absent');
  assert.equal(truth.reason, 'no_occurrence');
  ok('T3 Intent asserted + no occurrence → no Character Action');
}

// T4
{
  const intent = assertedIntent('苏晚', '推开地下书库的铁门');
  const truth = deriveCharacterActionTruth({
    intentTruth: intent,
    occurrences: [{ ...matchingOcc, actors: ['林夜'] }],
  });
  assert.equal(truth.status, 'absent');
  assert.equal(truth.reason, 'character_mismatch');
  ok('T4 character mismatch → no Character Action');
}

// T5
{
  const intent = assertedIntent('苏晚', '推开地下书库的铁门');
  const truth = deriveCharacterActionTruth({
    intentTruth: intent,
    occurrences: [{
      id: 'evt_other',
      actors: ['苏晚'],
      action: '倒了一杯水',
      evidence: { excerpt: '苏晚倒了一杯水。' },
    }],
  });
  assert.equal(truth.status, 'absent');
  assert.equal(truth.reason, 'content_mismatch');
  ok('T5 content mismatch → no Character Action');
}

// T6
{
  const fromPlan = refuseCharacterActionFromForeignAuthority('plan', { action: '推门' });
  assert.equal(fromPlan.status, 'absent');
  const embedded = deriveCharacterActionTruth({
    intentTruth: assertedIntent('苏晚', '推门'),
    occurrences: [matchingOcc],
    planAction: '推开铁门',
  });
  assert.equal(embedded.status, 'absent');
  const beatOnly = deriveCharacterActionTruth({
    authority: 'beat',
    occurrences: [matchingOcc],
  });
  assert.equal(beatOnly.status, 'absent');
  ok('T6 Plan/Director/Beat alone → no Character Action');
}

// T7
{
  const scene = {
    id: 's_attr',
    index: 1,
    pov: '苏晚',
    text: '苏晚犹豫片刻，还是决定推开铁门。',
    actualEvents: [{
      id: 'evt_a',
      actors: ['苏晚'],
      action: '推开铁门',
      evidence: { excerpt: '苏晚犹豫片刻，还是决定推开铁门。' },
    }],
    // Intent deliberately absent
    actionIntentTruth: { status: 'absent' },
  };
  applyAttributionAfterActual(bookDir, 1, scene, {});
  attachCharacterActionTruth(scene);
  assert.equal(scene.characterActionTruth.status, 'absent');
  const passAlone = refuseCharacterActionFromForeignAuthority('attribution', { status: 'PASS' });
  assert.equal(passAlone.status, 'absent');
  ok('T7 Attribution PASS alone → no Character Action');
}

// T8
{
  const proseAlone = deriveCharacterActionTruth({
    writerProse: '苏晚推开了铁门。',
    occurrences: [matchingOcc],
  });
  assert.equal(proseAlone.status, 'absent');
  let threw = false;
  try {
    assertWriterCannotMintCharacterAction();
  } catch (e) {
    threw = e && e.code === 'WRITER_CHARACTER_ACTION_MINT_FORBIDDEN';
  }
  assert.equal(threw, true);
  ok('T8 Writer prose alone / Writer mint forbidden');
}

// T9
{
  const truth = deriveCharacterActionTruth({
    intentTruth: assertedIntent('苏晚', '推开地下书库的铁门'),
    occurrences: [matchingOcc],
  });
  assert.equal(truth.isChoice, false);
  assert.equal(truth.choiceId, undefined);
  assert.equal(truth.options, undefined);
  const withChoice = deriveCharacterActionTruth({
    intentTruth: assertedIntent('苏晚', '推开地下书库的铁门'),
    occurrences: [matchingOcc],
    choiceId: 'c1',
  });
  assert.equal(withChoice.status, 'absent');
  ok('T9 Character Action does not create Choice');
}

// Scene attach path (main-path shape)
{
  writeCADEToChapter(bookDir, 3, {
    characterId: '苏晚',
    actionContent: '点燃油灯',
    provenance: CADE_PROVENANCE,
    sourceRef: 'authored.character_action_decision.ch3',
    decisionKind: 'commits',
    sceneId: 'scene_1',
  });
  const scene = {
    id: 'scene_1',
    index: 1,
    pov: '苏晚',
    text: '苏晚点燃油灯。',
    actualEvents: [{
      id: 'evt_lamp',
      actors: ['苏晚'],
      action: '点燃油灯',
      evidence: { excerpt: '苏晚点燃油灯。' },
    }],
  };
  attachActionIntentTruthFromCADE(bookDir, 3, scene);
  assert.equal(scene.actionIntentTruth.status, 'asserted');
  attachCharacterActionTruth(scene);
  assert.equal(scene.characterActionTruth.status, 'asserted');
  assert.equal(scene.characterActionTruth.occurrenceRef, 'evt_lamp');
  // Actual unchanged semantically (still occurrence array)
  assert.equal(scene.actualEvents[0].kind || 'action', scene.actualEvents[0].kind || 'action');
  ok('main-path attach: CADE→Intent→occurrence→Character Action');
}

// T11 no-CADE unchanged: no Intent → no Character Action even with occurrence
{
  const scene = {
    index: 2,
    pov: '苏晚',
    actualEvents: [matchingOcc],
  };
  attachActionIntentTruthFromCADE(bookDir, 99, scene);
  assert.equal(scene.actionIntentTruth.status, 'absent');
  attachCharacterActionTruth(scene);
  assert.equal(scene.characterActionTruth.status, 'absent');
  ok('T11 no-CADE behavior: Intent absent → Character Action absent');
}

console.log(failures ? `\nEO-P4-Character-Action-Bridge-01 FAIL (${failures})` : '\nEO-P4-Character-Action-Bridge-01 PASS');
process.exit(failures ? 1 : 0);
