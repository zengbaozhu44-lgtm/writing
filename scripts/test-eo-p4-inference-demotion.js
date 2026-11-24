#!/usr/bin/env node
/**
 * EO-P4 VERIFY — Inference ≠ fact / obtains
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  stampInferenceCandidate,
  stampOpsHint,
  assertInferenceDemoted,
  AUTHORITY_ACT_STATUS,
  CLAIM_LEVEL_AUTHORITY,
} from '../packages/inkos-core/src/lib/inference-demotion.js';
import { buildSceneSituation } from '../packages/inkos-director/src/situation-engine.js';
import { extractBeatStateDelta } from '../packages/inkos-director/src/beat-memory.js';
import { buildChapterAnchor } from '../packages/inkos-runtime/src/memory/memory-unit.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.error(`  FAIL: ${msg}`);
};
const ok = (msg) => console.log(`  ok: ${msg}`);

console.log('\n== EO-P4 Inference Demotion VERIFY ==');

if (AUTHORITY_ACT_STATUS !== 'NOT_AN_AUTHORITY_ACT' || CLAIM_LEVEL_AUTHORITY !== 'NOT_THIS_PATH') {
  fail('inference path must not be an Authority Act');
} else ok('inference path: NOT_AN_AUTHORITY_ACT / not obtains');

const cand = { d1InferenceDemotion: stampInferenceCandidate() };
const hint = { d1InferenceDemotion: stampOpsHint() };
if (!assertInferenceDemoted(cand).pass || !assertInferenceDemoted(hint).pass) {
  fail('stamp helpers failed assert');
} else ok('stamp helpers: inference≠fact / ops hint≠Reality');

const situation = buildSceneSituation({
  intent: { pov: '林砚' },
  plan: { consequence: '盟友已经死亡', goal: '推进' },
  scene: {},
});
const sCheck = assertInferenceDemoted(situation);
if (!sCheck.pass) fail(`situation: ${sCheck.detail}`);
else ok('inferWorldAfter path demoted on buildSceneSituation');

const beat = extractBeatStateDelta(
  { beatPlan: { choice: '计划选择', consequence: '计划代价', beforeState: '前', afterState: '后' } },
  '他拔刀刺向李明。',
  '',
);
const bCheck = assertInferenceDemoted(beat);
if (!bCheck.pass) fail(`beat: ${bCheck.detail}`);
else ok('extractBeatStateDelta demoted');

const anchor = buildChapterAnchor(3, {
  intent: { pov: '林砚', obstacles: ['盟友可能背叛'], bargain: 'x', mustLose: 'y' },
  chapterText: '结尾有一个问题？',
});
const aCheck = assertInferenceDemoted(anchor);
if (!aCheck.pass) fail(`anchor: ${aCheck.detail}`);
else ok('deriveRelationshipState / closing_emotion demoted on anchor');

const doc = fs.readFileSync(
  path.join(ROOT, 'golden/reality/d1-implementation-contract/INFERENCE-DEMOTION.md'),
  'utf8',
);
for (const p of ['Inference ↛ fact', 'Inference ↛ obtains', 'NO new “correct fact” system', 'inferWorldAfter']) {
  if (!doc.includes(p)) fail(`INFERENCE-DEMOTION.md missing: ${p}`);
}
ok('INFERENCE-DEMOTION.md binding present');

const residue = fs.readFileSync(
  path.join(ROOT, 'golden/reality/d1-implementation-contract/TRANSITIONAL-RESIDUE.md'),
  'utf8',
);
if (!residue.includes('TR-01') || !residue.includes('Operator') || !/11.*13|13.*11/.test(residue)) {
  fail('TR-01 Operator delta→11/13 residue not documented');
} else ok('TR-01 transitional residue documented OPEN');

if (/executeAuthorityAct|grantObtains|realityStatus\s*[:=]/i.test(
  fs.readFileSync(path.join(ROOT, 'packages/inkos-core/src/lib/inference-demotion.js'), 'utf8'),
)) {
  fail('inference-demotion invents Act/obtains');
} else ok('no Act/obtains invention in demotion helper');

// Must not have "fixed" Operator delta under P4
const eo = fs.readFileSync(
  path.join(ROOT, 'golden/reality/d1-implementation-contract/EO-P4.md'),
  'utf8',
);
if (!eo.includes('NO Operator delta→11/13')) fail('EO-P4 must ban Operator delta handling');
else ok('EO-P4 leaves TR-01 out of scope');

if (failures) {
  console.error(`\nEO-P4 VERIFY FAILED: ${failures}`);
  process.exit(1);
}
console.log('\nEO-P4 VERIFY PASSED — Inference demoted; STOP (do not auto-start P5)\n');
