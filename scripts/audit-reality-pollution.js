#!/usr/bin/env node
/**
 * Read-only Reality / Canon pollution archaeology.
 *
 * Prints write/read maps, Plan→Reality leaks, runs witnesses + guards.
 * NO Reality Engine. NO Canon changes. Semantic rulings DEFERRED.
 *
 * Run: npm run audit:reality-pollution
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWitnessManifest, loadGuardManifest } from '../golden/reality/lib/load-negative.js';
import { runWitness, listWitnessIds } from '../golden/reality/lib/pollution-witnesses.js';
import { runGuard, listGuardIds } from '../golden/reality/lib/forbidden-guards.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN = path.join(__dirname, '..', 'golden', 'reality');

function loadJson(name) {
  const p = path.join(GOLDEN, name);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function section(title) {
  console.log(`\n${'='.repeat(60)}\n${title}\n${'='.repeat(60)}`);
}

function main() {
  const scope = loadJson('SCOPE.json');
  section('Scope');
  console.log(`Reality Engine: ${scope.realityEngine ? 'ON' : 'OFF'}`);
  console.log(`Semantic rulings: ${scope.semanticRulings}`);

  section('Canon Physical Gate');
  const audit = loadJson('AUDIT_WRITE_READ_MAP.json');
  console.log(audit.canonPhysicalGate.path);
  for (const w of audit.canonPhysicalGate.writes) {
    console.log(`  WRITE ${w.target} ← ${w.fn}`);
  }

  section('Plan → Reality Leaks (documented)');
  const leaks = loadJson('PLAN_REALITY_LEAKS.json');
  for (const L of leaks.leaks) {
    console.log(`  [${L.id}] ${L.severity} ${L.producer || ''} → ${L.masqueradesAs}`);
    console.log(`       ${L.path}`);
  }

  section('Fallback Chains');
  for (const f of audit.fallbackChains || []) {
    console.log(`  [${f.id}] ${f.path}`);
    console.log(`       risk: ${f.risk}`);
  }

  section('generated 09');
  const g = audit.generated09;
  console.log(`  writer: ${g.writer}`);
  console.log(`  provenance: ${g.provenance}`);
  console.log(`  triggers: ${g.trigger.join(', ')}`);
  console.log(`  consumers: ${g.consumers.join(', ')}`);
  console.log(`  notAuthorDirection: ${g.notAuthorDirection}`);

  section('Pollution Witnesses');
  const witnesses = loadWitnessManifest();
  let wPass = 0;
  let wFail = 0;
  for (const item of witnesses) {
    const r = runWitness(item.assertion);
    if (r.pass) {
      wPass += 1;
      console.log(`  ✓ ${item.id} ${item.description}`);
      console.log(`    ${r.producer || item.pollutionType} → ${r.consumer || '?'}`);
    } else {
      wFail += 1;
      console.log(`  ✗ ${item.id} ${item.description}`);
      console.log(`    ${r.detail}`);
    }
  }

  section('Forbidden Guards');
  const guards = loadGuardManifest();
  let gPass = 0;
  let gFail = 0;
  for (const item of guards) {
    const r = runGuard(item.assertion);
    if (r.pass) {
      gPass += 1;
      console.log(`  ✓ ${item.id} ${item.description}`);
    } else {
      gFail += 1;
      console.log(`  ✗ ${item.id} ${r.detail}`);
    }
  }

  section('Summary');
  console.log(`  Witnesses: ${wPass}/${witnesses.length} (leak documented)`);
  console.log(`  Guards:    ${gPass}/${guards.length}`);
  console.log(`  Registered witness fns: ${listWitnessIds().length}`);
  console.log(`  Registered guard fns:   ${listGuardIds().length}`);
  console.log('\n  Prose fixtures: npm run test:reality-golden');
  console.log('  Semantic engine:  NOT IMPLEMENTED (by design)');

  if (wFail > 0 || gFail > 0) {
    console.error('\n✗ Audit completed with witness/guard failures — review above.');
    process.exit(1);
  }
  console.log('\n✓ Read-only pollution audit complete.');
}

main();
