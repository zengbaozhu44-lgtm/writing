/**
 * EO-4.4.1d-R-S3 — Occurrence read-back non-certification
 * Run: npm run test:attribution-s3
 *
 * Writer may read prior-text Occurrence; must not pre-certify Attribution / Choice / Agency.
 * S4/S5 NOT in scope. Does not modify Actual extraction or Attribution Gate.
 */
import assert from 'node:assert/strict';
import {
  collectPreviousActualEvents,
  formatActualEventsBlock,
} from '../packages/inkos-brain/src/events/actual-events-prompt.js';

let passed = 0;
function ok(name) {
  passed += 1;
  console.log(`  PASS ${name}`);
}

const CERT_RES = [
  /已发生事实/,
  /已发生之事/,
  /角色做了/,
  /角色采取了/,
  /角色选择了/,
  /角色决定了/,
  /由「[^」]+」完成/,
  /故意造成/,
  /有意做出/,
  /intentionally performed/i,
  /chose to/i,
  /^-?\s*后果：/m,
];

function assertNoCertificates(block, label) {
  for (const re of CERT_RES) {
    assert.ok(!re.test(block), `${label}: forbidden ${re}\n${block}`);
  }
  assert.ok(block.includes('≠ Character Choice') || block.includes('≠ Attribution'));
  assert.ok(!/Attribution\s*=\s*PASS/i.test(block));
  assert.ok(!/已通过 Attribution/u.test(block));
}

console.log('test:attribution-s3');

{
  const prev = {
    id: 's1',
    index: 1,
    text: 'Alice推开门，走进走廊。',
    characters: ['Alice'],
    actualEvents: [{
      id: 'e1',
      actors: ['Alice'],
      action: '推开门走进走廊',
      kind: 'action',
      consequence: '门开了',
      stateChanges: ['loc:corridor'],
    }],
  };
  const bundle = collectPreviousActualEvents([prev]);
  assert.ok(bundle.events.length >= 1);
  assert.equal(bundle.writesCanon, false);
  assert.equal(bundle.writesSR, false);
  assert.equal(bundle.writesReality, false);

  const block = formatActualEventsBlock(bundle);
  assert.ok(block.includes('### Previous Scene Occurrence Events'));
  assert.ok(block.includes('occurrence_readback'));
  assert.ok(block.includes('≠ Character Choice'));
  assert.ok(block.includes('≠ Attribution'));
  assert.ok(block.includes('≠ Agency'));
  assert.ok(block.includes('TypedEvidence → Gate → Registry') || block.includes('Gate → Registry'));
  // Fuel retained
  assert.ok(block.includes('participants: Alice'));
  assert.ok(block.includes('reported happening: 推开门走进走廊'));
  assert.ok(block.includes('text-noted aftermath:'));
  assert.ok(block.includes('门开了'));
  assert.ok(block.includes('state_mentions:'));
  assert.ok(block.includes('loc:corridor'));
  assertNoCertificates(block, 'S3-A');
  // Must not upgrade to choice/agency certificates
  assert.ok(!/Alice chose/i.test(block));
  assert.ok(!/Alice intentionally/i.test(block));
  assert.ok(!/Alice · 推开门/.test(block)); // old actors · action shape
  ok('S3-A Occurrence header + fuel; no Attribution/Choice certificate');
}

{
  const block = formatActualEventsBlock({
    events: [{
      fromScene: 2,
      actors: ['Bob'],
      action: '交出了钥匙',
      kind: 'action',
      stateChanges: [],
    }],
  });
  assert.ok(block.includes('participants: Bob'));
  assert.ok(block.includes('reported happening: 交出了钥匙'));
  assert.ok(!/Bob chose|Bob intentionally|选择了|决定了/u.test(block));
  assertNoCertificates(block, 'S3-B');
  ok('S3-B actor+action not auto-upgraded to Choice/Agency');
}

{
  assert.equal(formatActualEventsBlock(null), '');
  assert.equal(formatActualEventsBlock({ events: [] }), '');
  ok('S3-C empty bundle soft');
}

console.log(`\nOK ${passed} tests`);
