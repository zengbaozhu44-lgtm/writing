#!/usr/bin/env node
/**
 * Story Reality Test Bench — read-only archaeology + negative tests + prose fixtures.
 *
 * Sections:
 *   1. Prose fixtures     → RED (ENGINE_NOT_IMPLEMENTED) until Reality Engine exists
 *   2. Pollution witnesses → PASS (documents Plan→Reality leaks in current code)
 *   3. Forbidden guards    → PASS (S6.1 / structural guards that must hold)
 *
 * Semantic rulings: DEFERRED (R2/R3/R4/Author Protocol)
 * NO Reality Engine. NO Canon path changes.
 *
 * Run: npm run test:reality-golden
 */
import { loadAllFixtures } from '../golden/reality/lib/load-fixtures.js';
import { loadWitnessManifest, loadGuardManifest } from '../golden/reality/lib/load-negative.js';
import { runFixture, REALITY_ENGINE_IMPLEMENTED } from '../golden/reality/lib/harness.js';
import { runWitness } from '../golden/reality/lib/pollution-witnesses.js';
import { runGuard } from '../golden/reality/lib/forbidden-guards.js';

async function runProseFixtures() {
  const fixtures = loadAllFixtures().filter((f) => f.kind !== 'code-boundary');
  let passed = 0;
  let red = 0;

  console.log('\n== [1] Prose Fixtures (expect RED) ==');
  for (const fixture of fixtures) {
    const result = await runFixture(fixture);
    if (result.pass) {
      passed += 1;
      console.log(`  UNEXPECTED PASS [${fixture.id}]`);
    } else {
      red += 1;
      console.log(`  RED  [${fixture.id}]: ${result.errors.join('; ')}`);
    }
  }
  return { passed, red, total: fixtures.length };
}

function runPollutionWitnesses() {
  const manifest = loadWitnessManifest();
  let passed = 0;
  let failed = 0;

  console.log('\n== [2] Pollution Witnesses (expect PASS = leak documented) ==');
  for (const item of manifest) {
    const result = runWitness(item.assertion);
    if (result.pass) {
      passed += 1;
      console.log(`  WITNESS [${item.id}]: ${item.description}`);
      console.log(`           producer=${result.producer || item.pollutionType} → ${result.consumer || '?'}`);
    } else {
      failed += 1;
      console.log(`  FAIL [${item.id}]: ${result.detail}`);
    }
  }
  return { passed, failed, total: manifest.length };
}

function runForbiddenGuards() {
  const manifest = loadGuardManifest();
  let passed = 0;
  let failed = 0;

  console.log('\n== [3] Forbidden Guards (expect PASS) ==');
  for (const item of manifest) {
    const result = runGuard(item.assertion);
    if (result.pass) {
      passed += 1;
      console.log(`  GUARD [${item.id}]: ${item.description}`);
    } else {
      failed += 1;
      console.log(`  FAIL [${item.id}]: ${result.detail}`);
    }
  }
  return { passed, failed, total: manifest.length };
}

async function runCodeBoundaryFixtures() {
  const fixtures = loadAllFixtures().filter((f) => f.kind === 'code-boundary');
  let witnessPass = 0;
  let pending = 0;

  console.log('\n== [4] Code-Boundary Fixtures (linked witnesses or PENDING) ==');
  for (const fixture of fixtures) {
    const result = await runFixture(fixture);
    if (fixture.assertion && result.pass) {
      witnessPass += 1;
      console.log(`  LINKED [${fixture.id}]: ${result.detail || fixture.description}`);
    } else if (fixture.assertion && !result.pass) {
      pending += 1;
      console.log(`  FAIL [${fixture.id}]: ${result.errors.join('; ')}`);
    } else {
      pending += 1;
      console.log(`  PENDING [${fixture.id}]: ${result.errors[0]}`);
    }
  }
  return { witnessPass, pending, total: fixtures.length };
}

async function main() {
  console.log('== Story Reality Test Bench (read-only) ==');
  console.log(`Reality Engine: ${REALITY_ENGINE_IMPLEMENTED ? 'ON' : 'OFF (expected)'}`);
  console.log('Semantic rulings: DEFERRED — R2/R3/R4/Author Protocol');

  const prose = await runProseFixtures();
  const witnesses = runPollutionWitnesses();
  const guards = runForbiddenGuards();
  const codeBoundary = await runCodeBoundaryFixtures();

  console.log('\n== Summary ==');
  console.log(`  Prose RED:              ${prose.red}/${prose.total} (unexpected PASS: ${prose.passed})`);
  console.log(`  Pollution witnesses:    ${witnesses.passed}/${witnesses.total} (FAIL: ${witnesses.failed})`);
  console.log(`  Forbidden guards:       ${guards.passed}/${guards.total} (FAIL: ${guards.failed})`);
  console.log(`  Code-boundary linked:   ${codeBoundary.witnessPass} witness / ${codeBoundary.pending} pending`);

  let exitCode = 0;
  if (!REALITY_ENGINE_IMPLEMENTED && prose.passed > 0) {
    console.error('\n✗ Prose fixture passed without engine — harness regression.');
    exitCode = 1;
  }
  if (witnesses.failed > 0) {
    console.error('\n✗ Pollution witness failed — leak may be fixed or assertion broken.');
    exitCode = 1;
  }
  if (guards.failed > 0) {
    console.error('\n✗ Forbidden guard failed — structural regression.');
    exitCode = 1;
  }
  if (exitCode === 0) {
    console.log('\n✓ Test bench OK — prose RED, witnesses document pollution, guards hold.');
  }
  process.exit(exitCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
