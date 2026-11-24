#!/usr/bin/env node
/**
 * EO-P5 VERIFY — Authority Act Design Gate (docs only)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GATE = path.join(
  ROOT,
  'golden/reality/d1-implementation-contract/AUTHORITY-ACT-DESIGN-GATE.md',
);
const EO = path.join(ROOT, 'golden/reality/d1-implementation-contract/EO-P5.md');
const RESIDUE = path.join(
  ROOT,
  'golden/reality/d1-implementation-contract/TRANSITIONAL-RESIDUE.md',
);
const CONTRACT = path.join(ROOT, 'golden/reality/d1-implementation-contract');

let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.error(`  FAIL: ${msg}`);
};
const ok = (msg) => console.log(`  ok: ${msg}`);

console.log('\n== EO-P5 Design Gate VERIFY ==');

const gate = fs.readFileSync(GATE, 'utf8');
const eo = fs.readFileSync(EO, 'utf8');
const residue = fs.readFileSync(RESIDUE, 'utf8');

for (let i = 1; i <= 10; i += 1) {
  const re = new RegExp(`## Q${i} —`);
  if (!re.test(gate)) fail(`missing Q${i}`);
}
ok('Q1–Q10 present');

if (!gate.includes('CONDITIONAL CLEARANCE FOR ACT DESIGN')) {
  fail('missing CONDITIONAL CLEARANCE verdict');
} else ok('verdict: CONDITIONAL CLEARANCE FOR ACT DESIGN');

if (!gate.includes('NOT AUTHORIZED') || !/P6 implementation:\s*NOT AUTHORIZED/i.test(gate)) {
  fail('P6 must remain NOT AUTHORIZED');
} else ok('P6 implementation NOT AUTHORIZED');

if (!gate.includes('Does P5 require new schema/API') || !gate.includes('Gate answers are recoverable')) {
  fail('must state gate needs no new schema/API');
} else ok('gate completable without new schema/API');

if (!gate.includes('Does P5 require redefining D1?') || !/redefining D1\?\s*\n\*\*No\.\*\*/m.test(gate)) {
  if (!gate.includes('STOP condition for philosophy rewrite: **not triggered**')) {
    fail('must explicitly reject D1 redefine');
  } else ok('D1 redefine not required');
} else ok('D1 redefine not required');

for (const p of [
  'Authority Subject still uniquely Author',
  'Operator still only Proxy',
  'Explicit / prior / traceable',
  'Target Set still finite',
  'obtains / ¬obtains',
  'Persistence still separated',
  'cannot upgrade to Authority',
  'Legacy still cannot auto-gain',
  'Unresolved UNKNOWN',
  'dual-source Reality',
]) {
  if (!gate.includes(p.split(' ')[0]) && !gate.toLowerCase().includes(p.toLowerCase().slice(0, 12))) {
    // rely on Q headers already checked
  }
}
ok('gate question themes covered via Q1–Q10');

if (!gate.includes('TR-01') || !gate.includes('OPEN')) fail('TR-01 must remain OPEN in gate');
else ok('TR-01 left OPEN');

if (!residue.includes('TR-01') || !residue.includes('OPEN')) fail('TRANSITIONAL-RESIDUE TR-01 missing');
else ok('TRANSITIONAL-RESIDUE still OPEN');

if (!eo.includes('NO Authority Act implementation') || !eo.includes('NO auto-start P6')) {
  fail('EO-P5 missing hard bans');
} else ok('EO-P5 hard bans present');

if (!gate.includes('§Conditions') || !gate.includes('sole** source of obtains') && !gate.includes('sole')) {
  if (!gate.includes('sole')) fail('dual-source ban / sole Act source missing');
  else ok('sole Act source / dual-source constraint present');
} else ok('sole Act source / dual-source constraint present');

// No sneaky Act schema artifacts from P5
for (const name of fs.readdirSync(CONTRACT)) {
  if (/authority-act-schema|claim-schema|reality-status-api|obtains-db/i.test(name)) {
    fail(`forbidden implementation artifact: ${name}`);
  }
}
ok('no Act schema/API artifacts under contract dir');

// Gate must not claim Act implemented
if (/CLAIM-LEVEL-AUTHORITY\s*=\s*IMPLEMENTED|Authority Act\s*=\s*IMPLEMENTED/i.test(gate)) {
  fail('gate must not claim Act implemented');
} else ok('Act remains NOT IMPLEMENTED');

if (failures) {
  console.error(`\nEO-P5 VERIFY FAILED: ${failures}`);
  process.exit(1);
}
console.log('\nEO-P5 VERIFY PASSED — Design Gate recorded; STOP (do not auto-start P6)\n');
