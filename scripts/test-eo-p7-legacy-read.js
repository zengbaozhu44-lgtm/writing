#!/usr/bin/env node
/**
 * EO-P7 VERIFY — Legacy readable; labels ≠ obtains / Authority Act
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  stampRegisteredLegacy,
  stampEligibilityLabel,
  assertLegacyReadDoesNotObtain,
} from '../packages/inkos-core/src/lib/legacy-read-preference.js';
import { sourceProducesObtains } from '../packages/inkos-core/src/lib/authority-act.js';
import { TIMELINE_CANON_READ_ROLE } from '../packages/inkos-context-ranking/src/timeline-canon.js';
import { collectFacts } from '../packages/inkos-context-ranking/src/collect.js';
import { projectRouteRealityInput } from '../packages/inkos-route/src/project-route-reality.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.error(`  FAIL: ${msg}`);
};
const ok = (msg) => console.log(`  ok: ${msg}`);

console.log('\n== EO-P7 Legacy Read Preference VERIFY ==');

const legacy = { d1LegacyReadPreference: stampRegisteredLegacy() };
if (!assertLegacyReadDoesNotObtain(legacy).pass) fail('registered_legacy stamp failed');
else ok('registered_legacy ↛ obtains');

for (const label of ['confirmed', 'verified', 'immutable', 'accepted']) {
  const s = { d1LegacyReadPreference: stampEligibilityLabel(label) };
  if (!assertLegacyReadDoesNotObtain(s).pass) fail(`${label} stamp failed`);
}
ok('confirmed/verified/immutable/accepted ↛ Authority Act');

if (sourceProducesObtains('legacy') || sourceProducesObtains('confirmed')) fail('legacy source must not obtain');
else ok('sourceProducesObtains(legacy) = false');

if (TIMELINE_CANON_READ_ROLE !== 'writer_context_eligibility_not_obtains') {
  fail('S6.3 role must be eligibility not obtains');
} else ok('S6.3 = Writer eligibility ≠ obtains');

const facts = collectFacts([{ fact: '旧事实', immutable: true, chapter: 2 }]);
if (facts[0]?.meta?.immutable !== true) fail('immutable field must still exist (no data destruction)');
else ok('immutable field retained');
if (facts[0]?.meta?.immutableRole !== 'retention_not_truth') fail('immutable not demoted');
else ok('immutable = retention ≠ truth');

const proj = projectRouteRealityInput({
  chapter: 2,
  timeline: [{ chapter: 2, day: 2, events: ['林砚失去权限'], characters_present: ['林砚'] }],
  facts: [{ fact: '旧磁盘事实', immutable: true, chapter: 2 }],
  state: { 当前章节: '2', POV: '林砚' },
  knowledge: { matrix: [] },
  relationships: [],
  worldBible: '',
  characters: {},
});
if (!proj.confirmed) fail('confirmed slice must remain (no rename)');
else ok('Route `confirmed` field retained');
const confStamp = proj.confirmed.d1LegacyReadPreference;
if (!confStamp || confStamp.producesObtains !== false) fail('Route confirmed must stamp ≠ obtains');
else ok('Route confirmed = eligibility ≠ obtains');

const loaderSrc = fs.readFileSync(path.join(ROOT, 'packages/inkos-brain/src/loader.js'), 'utf8');
if (!loaderSrc.includes('stampRegisteredLegacy')) fail('loadBrainContext must stamp registered_legacy');
else ok('R-01 loadBrainContext stamped registered_legacy');

const genSrc = fs.readFileSync(path.join(ROOT, 'packages/inkos-route/src/generate-candidates.js'), 'utf8');
if (genSrc.includes('已确认现实（confirmed only')) fail('Route prompt still asserts confirmed = Reality');
else ok('Route LLM prompt demoted (confirmed ≠ Reality)');
if (!genSrc.includes('eligibility ≠ obtains')) fail('Route prompt missing eligibility demotion');
else ok('Route prompt states eligibility ≠ obtains');

const actSrc = fs.readFileSync(path.join(ROOT, 'packages/inkos-core/src/lib/authority-act.js'), 'utf8');
if (actSrc.includes('legacy-read-preference') || actSrc.includes('EO-P7')) {
  fail('authority-act.js must not be modified for P7');
} else ok('authority-act.js untouched');

const proxySrc = fs.readFileSync(path.join(ROOT, 'packages/inkos-core/src/lib/operator-proxy.js'), 'utf8');
if (proxySrc.includes('EO-P7')) fail('Operator Proxy must not be modified for P7');
else ok('Operator Proxy untouched');

const tr01 = fs.readFileSync(path.join(ROOT, 'packages/inkos-core/src/lib/tr01-operator-delta.js'), 'utf8');
if (tr01.includes('EO-P7')) fail('TR-01 module must not be modified for P7');
else ok('TR-01 module untouched');

const decSrc = fs.readFileSync(path.join(ROOT, 'packages/inkos-brain/src/decision/decision.js'), 'utf8');
if (!decSrc.includes('EO-P7') || !/epistemic/i.test(decSrc)) fail('decision.js missing R-06 demotion');
else ok('R-06 decision knowledge = epistemic ≠ obtains');

const consSrc = fs.readFileSync(path.join(ROOT, 'packages/inkos-brain/src/consistency/consistency.js'), 'utf8');
if (!consSrc.includes('EO-P7')) fail('consistency.js missing P7 demotion');
else ok('consistency vs facts = qualification ≠ obtains');

const scoreSrc = fs.readFileSync(path.join(ROOT, 'packages/inkos-context-ranking/src/score.js'), 'utf8');
if (!scoreSrc.includes('retention ranking') && !scoreSrc.includes('not obtains')) {
  fail('score.js immutable boost not demoted in comment');
} else ok('ranking immutable boost documented as retention not obtains');

const doc = fs.readFileSync(
  path.join(ROOT, 'golden/reality/d1-implementation-contract/LEGACY-READ-PREFERENCE.md'),
  'utf8',
);
if (!doc.includes('Legacy ↛ obtains')) fail('LEGACY-READ-PREFERENCE missing Legacy ↛ obtains');
else ok('LEGACY-READ-PREFERENCE binding present');
if (!doc.includes('data destruction')) fail('must state P7 is not data destruction');
else ok('P7 is interpretation retirement, not deletion');

const eo = fs.readFileSync(
  path.join(ROOT, 'golden/reality/d1-implementation-contract/EO-P7.md'),
  'utf8',
);
if (!eo.includes('NO auto-start final VERIFY') || !eo.includes('NO authority-act.js')) {
  fail('EO-P7 missing hard bans');
} else ok('EO-P7 hard bans present');

if (failures) {
  console.error(`\nEO-P7 VERIFY FAILED: ${failures}`);
  process.exit(1);
}
console.log('\nEO-P7 VERIFY PASSED — Legacy readable; interpretation retired; STOP\n');
