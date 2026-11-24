/**
 * EO-4.4.1d-R-S2 — Remove Character Choice certificate projection from renderCausalChain
 * Run: npm run test:attribution-s2
 *
 * S2: no Chosen / 已选 / 由 X 做出 / 选择主体 certificates.
 * Retain: desire, pressure, options, Authorial Planned Direction, authored outcome.
 * S3/S4 NOT in scope.
 */
import assert from 'node:assert/strict';
import { renderCausalChain } from '../packages/inkos-prompt/src/compiler.js';

let passed = 0;
function ok(name) {
  passed += 1;
  console.log(`  PASS ${name}`);
}

const CERT_RES = [
  /Chosen/i,
  /已选/,
  /由「[^」]+」做出/,
  /选择主体/,
  /已决定/,
  /既定选择/,
  /将选择/,
  /已作出选择/,
  /角色的决定/,
  /^- 后果（consequence）:/m,
];

function assertNoCertificates(block, label) {
  for (const re of CERT_RES) {
    assert.ok(!re.test(block), `${label}: forbidden certificate ${re} in:\n${block}`);
  }
}

console.log('test:attribution-s2');

const withDirection = {
  desire: { who: 'Alice', wants: '离开' },
  pressure: { obstacle: '门锁住' },
  options: [{ action: '推门', derivation: 'authored' }, { action: '留下', derivation: 'authored' }],
  choice: {
    actor: 'Bob',
    action: '推门离开',
    reason: 'authored_plan.choice（作者明确因果，保留）',
    source: 'authored_plan.choice',
    pov_relation: 'non_pov',
  },
  consequence: { immediate: '门开了', long_term: null },
};

const gap = {
  desire: { who: 'Alice', wants: '离开' },
  pressure: { obstacle: '门锁住' },
  choice: null,
  consequence: { immediate: '未落地', long_term: null },
  no_causal_basis: ['missing_choice_basis'],
};

{
  const block = renderCausalChain(withDirection, { pov: 'Alice' }, {});
  assertNoCertificates(block, 'S2-A');
  // Narrative fuel
  assert.ok(block.includes('欲望（desire）'));
  assert.ok(block.includes('压力（pressure）'));
  assert.ok(block.includes('Options（作者给定选项空间）'));
  assert.ok(block.includes('推门'));
  assert.ok(block.includes('留下'));
  assert.ok(block.includes('Authorial Planned Direction: 推门离开'));
  assert.ok(block.includes('Bob'));
  assert.ok(block.includes('Authored / Declared outcome'));
  assert.ok(block.includes('门开了'));
  assert.ok(block.includes('Authored direction reason'));
  // Must not impersonate Attribution Track
  assert.ok(block.includes('≠ Character Choice'));
  assert.ok(block.includes('≠ Attribution'));
  ok('S2-A certificates removed; Authorial Planned Direction fuel retained');
}

{
  const block = renderCausalChain(gap, { pov: 'Alice' }, {});
  assertNoCertificates(block, 'S2-B');
  assert.ok(block.includes('Authorial Planned Direction: missing_choice_basis'));
  assert.ok(!/推门离开/.test(block));
  ok('S2-B gap path: no fake Chosen certificate');
}

{
  const a = renderCausalChain(withDirection, { pov: 'Alice' }, { pov: 'Alice' });
  const b = renderCausalChain(withDirection, { pov: 'Alice' }, { pov: 'Alice' });
  assert.equal(a, b);
  ok('S2-C L1/P1 shared renderer deterministic');
}

console.log(`\nOK ${passed} tests`);
