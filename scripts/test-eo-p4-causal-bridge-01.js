/**
 * EO-P4-Causal-Bridge-01 — CADE → Action Intent Truth
 * T1–T8 per Human-authorized implementation brief.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {
  createCADE,
  validateCADE,
  deriveActionIntentTruth,
  refuseIntentFromForeignAuthority,
  readActionIntentForRealization,
  formatActionIntentTruthForPrompt,
  assertWriterCannotMintIntent,
  writeCADEToChapter,
  loadCADEChapter,
  attachActionIntentTruthFromCADE,
  intentTruthAfterSRUpdateOnly,
  CADE_PROVENANCE,
} from '../packages/inkos-brain/src/causality/index.js';
import { applyCharacterSRAfterActual } from '../packages/inkos-brain/src/character/character-sr-updater.js';
import { applyAttributionAfterActual } from '../packages/inkos-brain/src/attribution/index.js';

let failures = 0;
const fail = (label, msg) => {
  failures += 1;
  console.error(`  FAIL: ${label} — ${msg}`);
};
const ok = (label) => console.log(`  ok: ${label}`);

console.log('\n== EO-P4-Causal-Bridge-01 ==');

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-cade-'));
const bookDir = path.join(tmpRoot, 'book');
fs.mkdirSync(path.join(bookDir, 'novel', '_system', 'brain'), { recursive: true });

// T1 — CADE absent → Intent absent
{
  const truth = deriveActionIntentTruth(null);
  assert.equal(truth.status, 'absent');
  assert.equal(readActionIntentForRealization(truth), null);
  assert.equal(formatActionIntentTruthForPrompt(truth), '');
  const scene = { index: 1, pov: '苏晚' };
  attachActionIntentTruthFromCADE(bookDir, 1, scene);
  assert.equal(scene.actionIntentTruth.status, 'absent');
  ok('T1 CADE absent → Intent absent');
}

// T2 — legal CADE(X,Y) → Intent Truth asserted
{
  const created = createCADE({
    characterId: '苏晚',
    actionContent: '推开地下书库的铁门',
    provenance: CADE_PROVENANCE,
    sourceRef: 'authored.character_action_decision.explicit',
    decisionKind: 'commits',
    sceneId: 'scene_1',
    chapter: 1,
  });
  assert.equal(created.ok, true, created.reason);
  const truth = deriveActionIntentTruth(created.cade);
  assert.equal(truth.status, 'asserted');
  assert.equal(truth.characterId, '苏晚');
  assert.equal(truth.actionContent, '推开地下书库的铁门');
  assert.equal(truth.evidenceRef, created.cade.id);
  assert.equal(truth.isChoice, false);
  ok('T2 legal CADE → Intent asserted');
}

// T3 — foreign authorities cannot produce Intent
{
  const kinds = ['plan', 'director', 'writer', 'desire', 'sr', 'attribution', 'l1'];
  for (const k of kinds) {
    const refused = refuseIntentFromForeignAuthority(k, { action: '离开' });
    assert.equal(refused.status, 'absent', k);
  }
  const probes = [
    { characterId: '苏晚', actionContent: '离开', provenance: CADE_PROVENANCE, sourceRef: 'plan.mainGoal' },
    { characterId: '苏晚', actionContent: '离开', provenance: CADE_PROVENANCE, sourceRef: 'director.brief' },
    { characterId: '苏晚', actionContent: '离开', provenance: CADE_PROVENANCE, sourceRef: 'writer_output.scene1' },
    { characterId: '苏晚', actionContent: '离开', provenance: CADE_PROVENANCE, sourceRef: 'desire.externalGoal' },
    { characterId: '苏晚', actionContent: '离开', provenance: CADE_PROVENANCE, sourceRef: 'character_sr.awareness' },
    { characterId: '苏晚', actionContent: '离开', provenance: CADE_PROVENANCE, sourceRef: 'attribution_pass.evt1' },
    { characterId: '苏晚', actionContent: '离开', provenance: CADE_PROVENANCE, sourceRef: 'l1_valid.observe' },
    { characterId: '苏晚', actionContent: '离开', provenance: CADE_PROVENANCE, sourceRef: 'ok', authority: 'plan' },
    { characterId: '苏晚', actionContent: '离开', provenance: CADE_PROVENANCE, sourceRef: 'ok', mainGoal: '逃出' },
  ];
  for (const p of probes) {
    const r = createCADE(p);
    assert.equal(r.ok, false, `should reject ${JSON.stringify(p.sourceRef || p.authority || p.mainGoal)}`);
    assert.equal(deriveActionIntentTruth(p).status, 'absent');
  }
  ok('T3 Plan/Director/Writer/Desire/SR/Attribution/L1 cannot mint Intent');
}

// T4 — Intent asserted → Writer can consume Y
{
  const cade = createCADE({
    characterId: '林夜',
    actionContent: '交出账本副本',
    provenance: CADE_PROVENANCE,
    sourceRef: 'authored.character_action_decision.ch2',
    decisionKind: 'decides',
  }).cade;
  const truth = deriveActionIntentTruth(cade);
  const consumed = readActionIntentForRealization(truth);
  assert.ok(consumed);
  assert.equal(consumed.actionContent, '交出账本副本');
  const block = formatActionIntentTruthForPrompt(truth);
  assert.match(block, /交出账本副本/);
  assert.match(block, /不得铸造/);
  ok('T4 Writer can consume asserted Intent Y');
}

// T5 — Writer output cannot create / mutate Intent
{
  let threw = false;
  try {
    assertWriterCannotMintIntent();
  } catch (e) {
    threw = e && e.code === 'WRITER_INTENT_MINT_FORBIDDEN';
  }
  assert.equal(threw, true);
  // Prose / writer output as sourceRef rejected
  const fromProse = createCADE({
    characterId: '苏晚',
    actionContent: '离开',
    provenance: CADE_PROVENANCE,
    sourceRef: 'writer_prose.scene_text',
    decisionKind: 'commits',
  });
  assert.equal(fromProse.ok, false);
  ok('T5 Writer cannot mint Intent');
}

// T6 — Attribution PASS does not create Intent
{
  const scene = {
    id: 's1',
    index: 1,
    pov: '苏晚',
    text: '苏晚犹豫片刻，还是决定推开铁门。',
    actualEvents: [{
      id: 'evt_1',
      actors: ['苏晚'],
      action: '推开铁门',
      kind: 'action',
      evidence: { excerpt: '苏晚犹豫片刻，还是决定推开铁门。' },
    }],
  };
  applyAttributionAfterActual(bookDir, 1, scene, {});
  assert.ok(scene.attributionRun);
  // No CADE → Intent still absent after Attribution
  attachActionIntentTruthFromCADE(bookDir, 1, scene);
  assert.equal(scene.actionIntentTruth.status, 'absent');
  ok('T6 Attribution PASS path does not create Intent');
}

// T7 — SR update does not create Intent
{
  const scene = {
    id: 's2',
    index: 2,
    pov: '苏晚',
    characters: ['苏晚'],
    text: '苏晚看见铁门。',
    actualEvents: [{
      id: 'evt_sr',
      actors: ['苏晚'],
      action: '看见铁门',
      kind: 'action',
      evidence: { excerpt: '苏晚看见铁门。' },
    }],
  };
  applyCharacterSRAfterActual(bookDir, 1, scene, {});
  assert.ok(scene.characterSRState);
  assert.equal(intentTruthAfterSRUpdateOnly().status, 'absent');
  attachActionIntentTruthFromCADE(bookDir, 1, scene);
  assert.equal(scene.actionIntentTruth.status, 'absent');
  // SR still has no intent slot required
  const chars = (scene.characterSRState && scene.characterSRState.characters) || {};
  for (const block of Object.values(chars)) {
    assert.equal(block.intent, undefined);
    assert.equal(block.actionIntent, undefined);
    assert.equal(block.choice, undefined);
  }
  ok('T7 SR update does not create Intent / no SR.intent slot');
}

// T8 — no Choice / Candidate Option / Agency / Goal required
{
  const created = createCADE({
    characterId: '苏晚',
    actionContent: '按下暗格',
    provenance: CADE_PROVENANCE,
    sourceRef: 'authored.character_action_decision.self_endorsed',
    decisionKind: 'self_endorsed',
  });
  assert.equal(created.ok, true);
  assert.equal(created.cade.isChoice, false);
  assert.equal(created.cade.isCandidateOption, false);
  assert.equal(created.cade.choiceId, undefined);
  assert.equal(created.cade.options, undefined);
  assert.equal(created.cade.agencyScore, undefined);
  assert.equal(created.cade.goalId, undefined);
  const withChoice = createCADE({
    characterId: '苏晚',
    actionContent: '按下暗格',
    provenance: CADE_PROVENANCE,
    sourceRef: 'authored.character_action_decision.ok',
    decisionKind: 'commits',
    choiceId: 'ch_1',
  });
  assert.equal(withChoice.ok, false);
  const truth = deriveActionIntentTruth(created.cade);
  assert.equal(truth.status, 'asserted');
  assert.equal(truth.isChoice, false);
  ok('T8 Intent without Choice/Option/Agency/Goal');
}

// Sidecar round-trip + scene attach
{
  const w = writeCADEToChapter(bookDir, 2, {
    characterId: '苏晚',
    actionContent: '点燃油灯',
    provenance: CADE_PROVENANCE,
    sourceRef: 'authored.character_action_decision.ch2',
    decisionKind: 'commits',
    sceneId: 'scene_3',
  });
  assert.equal(w.written, true, w.reason);
  const loaded = loadCADEChapter(bookDir, 2);
  assert.equal(loaded.items.length, 1);
  const scene = { id: 'scene_3', index: 3, pov: '苏晚' };
  attachActionIntentTruthFromCADE(bookDir, 2, scene);
  assert.equal(scene.actionIntentTruth.status, 'asserted');
  assert.equal(scene.actionIntentTruth.actionContent, '点燃油灯');
  assert.match(scene._actionIntentPromptBlock || '', /点燃油灯/);
  ok('sidecar CADE → scene Intent attach');
}

// validateCADE reject wrong provenance
{
  const bad = validateCADE({
    characterId: '苏晚',
    actionContent: '走',
    provenance: 'plan_task',
    sourceRef: 'authored.character_action_decision.ok',
  });
  assert.equal(bad.ok, false);
  ok('provenance must be character_action_decision');
}

console.log(failures ? `\nEO-P4-Causal-Bridge-01 FAIL (${failures})` : '\nEO-P4-Causal-Bridge-01 PASS');
process.exit(failures ? 1 : 0);
