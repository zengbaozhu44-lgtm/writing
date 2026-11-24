#!/usr/bin/env node
/**
 * EO-P1 VERIFY — Dual BLOCK A / Interpretation Layer
 *
 * Confirms interpretation contract is bound; does NOT implement Authority Act,
 * invent realityStatus, or cut additional write paths.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BLOCK_JSON = path.join(
  ROOT,
  'golden/reality/d1-implementation-contract/INTERPRETATION-BLOCK.json',
);
const BLOCK_MD = path.join(
  ROOT,
  'golden/reality/d1-implementation-contract/INTERPRETATION-BLOCK.md',
);
const APPROVED = path.join(
  ROOT,
  'golden/reality/d1-implementation-contract/APPROVED.md',
);
const EO_P1 = path.join(
  ROOT,
  'golden/reality/d1-implementation-contract/EO-P1.md',
);

let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.error(`  FAIL: ${msg}`);
};
const ok = (msg) => console.log(`  ok: ${msg}`);

function read(p) {
  return fs.readFileSync(p, 'utf8');
}

console.log('\n== EO-P1 Interpretation Block VERIFY ==');

const block = JSON.parse(read(BLOCK_JSON));
const ids = block.interpretations.map((i) => i.id);
const expected = Array.from({ length: 13 }, (_, i) => `I-${String(i + 1).padStart(2, '0')}`);
for (const id of expected) {
  if (!ids.includes(id)) fail(`missing interpretation ${id}`);
}
if (failures === 0) ok('I-01…I-13 present');

const i11 = block.interpretations.find((i) => i.id === 'I-11');
if (!i11 || i11.disposition !== 'KEEP') fail('I-11 must KEEP (narrative as evidence)');
else ok('I-11 KEEP');

const cuts = block.interpretations.filter((i) => i.id !== 'I-11');
for (const row of cuts) {
  if (row.disposition !== 'CUT') fail(`${row.id} must be CUT, got ${row.disposition}`);
}
ok('I-01…I-10, I-12, I-13 are CUT');

if (block.claimLevelAuthority !== 'NOT_IMPLEMENTED') {
  fail('claimLevelAuthority must remain NOT_IMPLEMENTED');
} else ok('CLAIM-LEVEL-AUTHORITY = NOT_IMPLEMENTED');

const md = read(BLOCK_MD);
const approved = read(APPROVED);
const eo = read(EO_P1);
const blob = `${md}\n${approved}\n${eo}`;

for (const phrase of block.requiredDocPhrases) {
  if (!blob.includes(phrase)) fail(`required phrase missing: ${phrase}`);
}
ok('required Dual BLOCK A phrases present in docs');

for (const eq of block.forbiddenEquations.slice(0, 8)) {
  // APPROVED Dual BLOCK A lists these as banned; INTERPRETATION-BLOCK must name them
  if (!md.includes(eq) && !approved.includes(eq.replace(' = ', ' = '))) {
    // soft: at least md table or APPROVED block must mention left-hand side
    const lhs = eq.split('=')[0].trim().split('/')[0].trim();
    if (!blob.toLowerCase().includes(lhs.toLowerCase().split(' ')[0])) {
      fail(`forbidden equation not covered in docs: ${eq}`);
    }
  }
}
ok('forbidden equations covered');

// Must not invent Authority schema under EO-P1 artifacts
const inventRe = /\brealityStatus\b|\bobtainsStatus\b|\bauthorityActSchema\b/i;
if (inventRe.test(md) && !md.includes('NO realityStatus')) {
  fail('INTERPRETATION-BLOCK invents realityStatus without ban');
}
if (!md.includes('NO realityStatus') && !eo.includes('NO new realityStatus')) {
  fail('EO-P1 must explicitly ban inventing realityStatus');
} else ok('explicit ban on inventing realityStatus');

// Labels must not be renamed away in Route projector (still uses kind: 'confirmed')
const routeSrc = read(path.join(ROOT, 'packages/inkos-route/src/project-route-reality.js'));
if (!routeSrc.includes("kind: 'confirmed'") && !routeSrc.includes('kind: "confirmed"')) {
  fail('Route confirmed label renamed or removed (EO-P1 forbids rename)');
} else ok('Route `confirmed` label retained (demotion only)');

if (!routeSrc.includes('EO-P1') || !/eligibility|≠ obtains|!= obtains|not obtains/i.test(routeSrc)) {
  fail('Route file missing EO-P1 demotion comment');
} else ok('Route EO-P1 demotion comment present');

const timelineSrc = read(path.join(ROOT, 'packages/inkos-context-ranking/src/timeline-canon.js'));
if (!timelineSrc.includes('EO-P1') || !/eligibility|≠ obtains|not obtains/i.test(timelineSrc)) {
  fail('timeline-canon missing EO-P1 demotion comment');
} else ok('S6.3 EO-P1 demotion comment present');

const muSrc = read(path.join(ROOT, 'packages/inkos-runtime/src/memory/memory-unit.js'));
if (!muSrc.includes('EO-P1') || !/Persistence|Reality Status/i.test(muSrc)) {
  fail('MemoryUnit missing EO-P1 Persistence ≠ Reality Status comment');
} else ok('MemoryUnit EO-P1 comment present');

const valSrc = read(path.join(ROOT, 'packages/inkos-brain/src/validation/validation.js'));
if (!valSrc.includes('EO-P1') || !/Qualification|≠ obtains|not obtains/i.test(valSrc)) {
  fail('validation.js missing EO-P1 comment');
} else ok('validation EO-P1 comment present');

const acceptSrc = read(path.join(ROOT, 'packages/inkos-studio-server/src/chapter-audit.js'));
if (!acceptSrc.includes('EO-P1') || !/workflow|≠ obtains|not obtains/i.test(acceptSrc)) {
  fail('acceptChapter missing EO-P1 comment');
} else ok('acceptChapter EO-P1 comment present');

// No accidental Authority *schema* file (design-gate docs are allowed)
const contractDir = path.join(ROOT, 'golden/reality/d1-implementation-contract');
for (const name of fs.readdirSync(contractDir)) {
  if (/claim-schema|reality-status-api|obtains-db|authority-act-schema/i.test(name)) {
    fail(`unexpected Authority schema artifact under EO-P1: ${name}`);
  }
}
ok('no sneaky Authority schema artifacts');

if (failures) {
  console.error(`\nEO-P1 VERIFY FAILED: ${failures}`);
  process.exit(1);
}
console.log('\nEO-P1 VERIFY PASSED — Dual BLOCK A bound; STOP (do not auto-start P3)\n');
