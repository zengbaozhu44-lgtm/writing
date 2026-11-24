#!/usr/bin/env node
/**
 * EO-D1-FINAL-VERIFY — audit only. Residues must be reported, not erased.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  AUTHORITY_SUBJECT,
  CLAIM_LEVEL_AUTHORITY,
  sourceProducesObtains,
  NON_ACT_SOURCES,
  applyAuthorityAct,
} from '../packages/inkos-core/src/lib/authority-act.js';
import { AUTHORITY_SUBJECT as PROXY_SUBJECT } from '../packages/inkos-core/src/lib/operator-proxy.js';
import { resolveTimelineEvents, buildStateDelta } from '../packages/inkos-brain/src/memory/state-updater.js';
import { partitionOperatorRawDelta } from '../packages/inkos-core/src/lib/tr01-operator-delta.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.error(`  FAIL: ${msg}`);
};
const ok = (msg) => console.log(`  ok: ${msg}`);

console.log('\n== EO-D1-FINAL-VERIFY ==');

const report = fs.readFileSync(
  path.join(ROOT, 'golden/reality/d1-implementation-contract/FINAL-VERIFY.md'),
  'utf8',
);

if (!report.includes('SEMANTIC CORE                 SATISFIED')) fail('verdict SEMANTIC CORE SATISFIED missing');
else ok('verdict: semantic core SATISFIED');
if (!report.includes('RUNTIME FULLY CLOSED          NO')) fail('must not claim Runtime fully closed');
else ok('verdict: Runtime NOT fully closed');
if (!report.includes('W-04') || !report.includes('RESIDUE WRITE')) fail('W-04 residue must be reported');
else ok('W-04 residue reported (not hidden)');
if (!/W-19[\s\S]*UNKNOWN/.test(report)) fail('W-19 must remain UNKNOWN in report');
else ok('W-19 not reclassified');

if (AUTHORITY_SUBJECT !== 'Author' || PROXY_SUBJECT !== 'Author') fail('Subject drifted');
else ok('Authority Subject = Author');

if (CLAIM_LEVEL_AUTHORITY !== 'MINIMAL_IMPLEMENTED') fail('Act module missing');
else ok('Authority Act present (minimal)');

if (sourceProducesObtains('authorityAct') !== true) fail('Act not obtains source');
for (const s of NON_ACT_SOURCES) {
  if (sourceProducesObtains(s)) fail(`${s} must not obtain`);
}
ok('unique obtains source = authorityAct');

const r = applyAuthorityAct({
  authoritySubject: 'Operator',
  executor: 'Operator',
  kind: 'adjudication',
  targetSet: [{ claim: 'c', soa: 's', polarity: 'obtains' }],
  authorization: {
    explicit: true, prior: true, traceable: true, assumed: false, trace: 'x',
  },
});
if (r.ok) fail('Operator-as-Subject must refuse');
else ok('Operator cannot be Subject');

if (resolveTimelineEvents({
  scenes: [{ consequence: 'x' }],
  causalChain: { consequence: { immediate: 'y' } },
}).length !== 0) fail('W-02/W-03 cut regress');
else ok('W-02/W-03 still CUT');

const delta = buildStateDelta('/tmp/d1-fv', 1, {
  intent: { mainGoal: '目标', pov: '林砚', newForeshadow: '钩子' },
  scenes: [],
  chapterText: '正文',
});
if ((delta.facts || []).length !== 0) fail('W-01 cut regress');
else ok('W-01 still CUT');
if (!delta.foreshadow) fail('W-04 write missing — report expected residue to still exist');
else ok('W-04 residue still present (honest)');

const part = partitionOperatorRawDelta({
  timeline: { events: ['e'] },
  facts: [{ fact: 'f' }],
});
if (part.operationalDelta.timeline || part.operationalDelta.facts) fail('TR-01 regress');
else ok('TR-01 still CUT');

const callers = [
  'packages/inkos-runtime/src/memory/memory-unit.js',
  'packages/inkos-studio-server/src/chapter-audit.js',
  'packages/inkos-brain/src/validation/validation.js',
  'packages/inkos-core/src/cli.js',
  'packages/inkos-core/src/workflows/post-chapter.js',
  'packages/inkos-brain/src/memory/state-updater.js',
];
for (const rel of callers) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  if (src.includes('applyAuthorityAct')) fail(`${rel} must not call Act`);
}
ok('commit/accept/validate/post not wired to Act');

if (!report.includes('Act not in pipeline')) fail('must report Act not wired to Runtime');
else ok('Act integration absence reported');

if (report.includes('W-19') && /W-19[^\n]*BLOCKED/.test(report.split('W-19')[1]?.slice(0, 80) || '')) {
  fail('must not invent W-19 = BLOCKED');
} else ok('no invented W-19 BLOCKED class');

const prior = [
  'test:eo-p1',
  'test:eo-p3',
  'test:eo-p4',
  'test:eo-p5',
  'test:eo-p6',
  'test:eo-tr01',
  'test:eo-p7',
];
console.log('\n== prior EO suite ==');
for (const script of prior) {
  const run = spawnSync('npm', ['run', script], {
    cwd: ROOT,
    encoding: 'utf8',
    env: process.env,
  });
  if (run.status !== 0) {
    fail(`${script} failed`);
    if (run.stdout) console.error(run.stdout.slice(-800));
  } else ok(`${script} PASSED`);
}

if (failures) {
  console.error(`\nEO-D1-FINAL-VERIFY FAILED: ${failures}`);
  process.exit(1);
}
console.log('\nEO-D1-FINAL-VERIFY PASSED — semantic core SATISFIED; Runtime NOT closed; STOP\n');
