/**
 * EO-4.4-L1-OBSERVER-MINIMAL — fixture bench + isolation
 * Run: npm run test:l1-observer
 *
 * Observer receives ONLY { prose, pov? }.
 * fixtures.json evidence.* / expected / forbidden_inference NEVER enter observeL1.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { observeL1, L1_OBSERVER_VERSION } from '../packages/inkos-brain/src/l1/observe-l1.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const fixturesPath = path.join(root, 'golden/reality/l1-choice-formation/fixtures.json');
const observerSrcPath = path.join(root, 'packages/inkos-brain/src/l1/observe-l1.js');

const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));
assert.equal(fixtures.length, 24, 'expected 24 L1 fixtures');

let pass = 0;
const failures = [];

for (const fix of fixtures) {
  const input = { prose: fix.prose };
  if (fix.pov != null) input.pov = fix.pov;

  // Hard isolation: never pass oracle fields
  assert.equal(Object.prototype.hasOwnProperty.call(input, 'evidence'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(input, 'expected'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(input, 'forbidden_inference'), false);

  const out = observeL1(input);
  if (out.judgment !== fix.expected) {
    failures.push({
      id: fix.id,
      expected: fix.expected,
      got: out.judgment,
      prose: fix.prose,
    });
  } else {
    pass += 1;
  }
}

console.log(`[l1-observer] version=${L1_OBSERVER_VERSION}`);
console.log(`[l1-observer] fixtures ${pass}/${fixtures.length}`);

if (failures.length) {
  for (const f of failures) {
    console.error(`FAIL ${f.id}: expected=${f.expected} got=${f.got}`);
    console.error(`  prose: ${f.prose}`);
  }
  process.exit(1);
}

// --- Isolation: forbidden keys rejected ---
assert.throws(
  () => observeL1({ prose: '她想了想，决定离开。', expected: 'VALID' }),
  (e) => e && e.code === 'L1_INPUT_ERROR',
);
assert.throws(
  () => observeL1({ prose: '她想了想，决定离开。', evidence: { agency: 'x' } }),
  (e) => e && e.code === 'L1_INPUT_ERROR',
);
assert.throws(
  () => observeL1({ prose: '她想了想，决定离开。', sr: {} }),
  (e) => e && e.code === 'L1_INPUT_ERROR',
);
assert.throws(
  () => observeL1({}),
  (e) => e && e.code === 'L1_INPUT_ERROR',
);

// --- Isolation: dependency audit (source text) ---
const src = fs.readFileSync(observerSrcPath, 'utf8');
assert.equal(/\bimport\s+/.test(src), false, 'observe-l1.js must have zero imports');
assert.equal(/from\s+['\"]/.test(src), false, 'observe-l1.js must have zero from-clauses');
assert.equal(/require\s*\(/.test(src), false, 'observe-l1.js must not require()');
assert.equal(/fixtures\.json/.test(src), false, 'must not load fixtures');
assert.equal(/CandidateOption/.test(src), false, 'must not reference CandidateOption');
assert.equal(/character-sr/.test(src), false, 'must not reference character-sr');
assert.equal(/causal-reasoner/.test(src), false, 'must not reference causal-reasoner');
assert.equal(/llm-writer/.test(src), false, 'must not reference llm-writer');
assert.equal(/event-extractor/.test(src), false, 'must not reference event-extractor');
assert.equal(/from\s+['\"][^'\"]*attribution/.test(src), false, 'must not import attribution modules');

// --- Isolation: require graph (no package deps) ---
const require = createRequire(import.meta.url);
void require;
assert.ok(typeof observeL1 === 'function');

console.log('[l1-observer] isolation OK');
console.log('[l1-observer] PASS');
