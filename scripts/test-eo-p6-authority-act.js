#!/usr/bin/env node
/**
 * EO-P6 VERIFY — sole obtains source is Authority Act
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyAuthorityAct,
  createActRegistry,
  AUTHORITY_SUBJECT,
  CLAIM_LEVEL_AUTHORITY,
  NON_ACT_SOURCES,
  sourceProducesObtains,
} from '../packages/inkos-core/src/lib/authority-act.js';
import { stampOperatorCliPost } from '../packages/inkos-core/src/lib/operator-proxy.js';
import { stampInferenceCandidate } from '../packages/inkos-core/src/lib/inference-demotion.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.error(`  FAIL: ${msg}`);
};
const ok = (msg) => console.log(`  ok: ${msg}`);

const soaTarget = (polarity = 'obtains') => [{
  claim: 'Claim: ally died in ch5',
  soa: 'SoA: ally is dead at ch5',
  polarity,
}];

console.log('\n== EO-P6 Authority Act VERIFY ==');

if (AUTHORITY_SUBJECT !== 'Author') fail('Subject must be Author');
else ok('Authority Subject = Author');

if (CLAIM_LEVEL_AUTHORITY !== 'MINIMAL_IMPLEMENTED') fail('minimal Act not marked implemented');
else ok('CLAIM-LEVEL-AUTHORITY = MINIMAL_IMPLEMENTED');

if (sourceProducesObtains('authorityAct') !== true) fail('Act must be obtains source');
else ok('authorityAct → obtains source');

for (const s of NON_ACT_SOURCES) {
  if (sourceProducesObtains(s)) fail(`${s} must not produce obtains`);
}
ok('commit/accept/validate/post/write/inference/narrative/legacy ↛ obtains');

{
  const r = applyAuthorityAct({
    authoritySubject: 'Author',
    executor: 'Author',
    kind: 'adjudication',
    targetSet: soaTarget('obtains'),
  });
  if (!r.ok || !r.producesObtains || r.effects[0]?.obtains !== true) fail(`Author adjudication failed: ${r.code}`);
  else ok('Author Act → obtains');
}

{
  const r = applyAuthorityAct({
    authoritySubject: 'Author',
    executor: 'Author',
    kind: 'adjudication',
    targetSet: soaTarget('not_obtains'),
  });
  if (!r.ok || r.effects[0]?.notObtains !== true || r.effects[0]?.obtains === true) {
    fail(`¬obtains failed: ${JSON.stringify(r)}`);
  } else ok('Author Act → ¬obtains');
}

{
  const r = applyAuthorityAct({
    authoritySubject: 'Operator',
    executor: 'Operator',
    kind: 'adjudication',
    targetSet: soaTarget(),
    authorization: { explicit: true, prior: true, traceable: true, assumed: false, trace: 'auth-1' },
  });
  if (r.ok || r.producesObtains) fail('Operator as Subject must refuse');
  else ok('Operator cannot be Authority Subject');
}

{
  const r = applyAuthorityAct({
    authoritySubject: 'Author',
    executor: 'Operator',
    kind: 'adjudication',
    targetSet: soaTarget(),
  });
  if (r.ok || r.producesObtains) fail('Operator without auth must not obtain');
  else ok('Operator without explicit/prior/traceable → refuse (no obtains)');
}

{
  const r = applyAuthorityAct({
    authoritySubject: 'Author',
    executor: 'Operator',
    kind: 'adjudication',
    targetSet: soaTarget(),
    authorization: { explicit: true, prior: true, traceable: true, assumed: true, trace: 'auth-1' },
  });
  if (r.ok || r.producesObtains || r.code !== 'DELEGATION_MUST_NOT_BE_ASSUMED') {
    fail(`assumed delegation must refuse: ${r.code}`);
  } else ok('assumed delegation → refuse');
}

{
  const r = applyAuthorityAct({
    authoritySubject: 'Author',
    executor: 'Operator',
    kind: 'adjudication',
    targetSet: soaTarget(),
    authorization: {
      explicit: true, prior: true, traceable: true, assumed: false, trace: 'author-prior-ref-9',
    },
  });
  if (!r.ok || r.act?.authoritySubject !== 'Author' || r.act?.executor !== 'Operator' || !r.producesObtains) {
    fail(`delegated Operator Act failed: ${r.code}`);
  } else ok('Operator as Executor under explicit/prior/traceable; Subject remains Author');
}

{
  const r = applyAuthorityAct({
    authoritySubject: 'Author',
    executor: 'Author',
    kind: 'adjudication',
    targetSet: [{ claim: 'only claim', polarity: 'obtains' }],
  });
  if (r.ok) fail('missing soa must refuse (Claim ≠ SoA)');
  else ok('Target requires claim AND soa (no silent identity)');
}

{
  const r = applyAuthorityAct({
    authoritySubject: 'Author',
    executor: 'Author',
    kind: 'adjudication',
    targetSet: soaTarget(),
    artifactWide: true,
  });
  if (r.ok) fail('carrier-wide Act must refuse');
  else ok('carrier expansion forbidden');
}

{
  const r = applyAuthorityAct({
    authoritySubject: 'Author',
    executor: 'Author',
    kind: 'adjudication',
    targetSet: soaTarget(),
    inferredTargets: [{ claim: 'extra', soa: 'extra-soa', polarity: 'obtains' }],
  });
  if (r.ok) fail('inferred Targets must refuse');
  else ok('inference expansion of Target Set forbidden');
}

{
  const log = createActRegistry();
  applyAuthorityAct({
    authoritySubject: 'Author', executor: 'Author', kind: 'adjudication', targetSet: soaTarget('obtains'),
  }, log);
  const r = applyAuthorityAct({
    authoritySubject: 'Author', executor: 'Author', kind: 'adjudication', targetSet: soaTarget('not_obtains'),
  }, log);
  if (r.ok || r.code !== 'AUTHORITY_CONFLICT' || r.producesObtains) fail(`conflict handling: ${r.code}`);
  else ok('C-5 Conflict: no automatic latest-wins / no obtains');
}

{
  const log = createActRegistry();
  applyAuthorityAct({
    authoritySubject: 'Author', executor: 'Author', kind: 'adjudication', targetSet: soaTarget('obtains'),
  }, log);
  const r = applyAuthorityAct({
    authoritySubject: 'Author', executor: 'Author', kind: 'revocation', targetSet: soaTarget(),
  }, log);
  if (!r.ok || r.producesObtains || r.assertsNotObtains !== false) fail('revocation must not assert ¬obtains');
  else ok('C-6 Revocation ≠ ¬obtains');
}

const post = stampOperatorCliPost({ updated: ['11_timeline'] });
if (post.d1OperatorProxy.producesObtains !== false) fail('post still must not obtain');
else ok('post ↛ obtains');

const inf = stampInferenceCandidate();
if (inf.producesObtains !== false) fail('inference still must not obtain');
else ok('inference ↛ obtains');

const actSrc = fs.readFileSync(path.join(ROOT, 'packages/inkos-core/src/lib/authority-act.js'), 'utf8');
for (const file of [
  'packages/inkos-runtime/src/memory/memory-unit.js',
  'packages/inkos-studio-server/src/chapter-audit.js',
  'packages/inkos-brain/src/validation/validation.js',
  'packages/inkos-core/src/cli.js',
  'packages/inkos-core/src/workflows/post-chapter.js',
  'packages/inkos-brain/src/memory/state-updater.js',
]) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  if (src.includes('applyAuthorityAct')) fail(`${file} must not call applyAuthorityAct`);
}
ok('commit/accept/validate/post/state-updater not wired to Act');

if (actSrc.includes('11_timeline') || actSrc.includes('13_facts')) {
  fail('Act must not write 11/13');
} else ok('Act does not persist into 11/13');

const residue = fs.readFileSync(
  path.join(ROOT, 'golden/reality/d1-implementation-contract/TRANSITIONAL-RESIDUE.md'),
  'utf8',
);
if (!residue.includes('TR-01')) fail('TR-01 must remain documented');
else ok('TR-01 residue documented');

const p6eo = fs.readFileSync(
  path.join(ROOT, 'golden/reality/d1-implementation-contract/EO-P6.md'),
  'utf8',
);
if (!p6eo.includes('NO auto-start P7')) fail('EO-P6 missing P7 ban');
else ok('EO-P6 bans P7 auto-start');

if (failures) {
  console.error(`\nEO-P6 VERIFY FAILED: ${failures}`);
  process.exit(1);
}
console.log('\nEO-P6 VERIFY PASSED — Act is sole obtains source; STOP (no TR-01 / P7)\n');
