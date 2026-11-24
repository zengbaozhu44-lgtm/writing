/**
 * Phase 4.4.1a/b — Attribution Registry + Gate tests
 * Run: npm run test:attribution-registry && npm run test:attribution-gate
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  ATTRIBUTION_GATE_WRITER,
  ATTRIBUTION_REGISTRY_VERSION,
  FORBIDDEN_ATTRIBUTION_FIELDS,
  __forbiddenPublicCreateAttribution,
  appendAttributionFromGate,
  attributionChapterPath,
  listAttributedActions,
  listAttributionRecords,
  loadAttributionChapter,
  upsertAttributionFromGate,
  validateAttributionRecord,
} from '../packages/inkos-brain/src/attribution/index.js';
import { ATTRIBUTION_GATE_WRITE_KEY } from '../packages/inkos-brain/src/attribution/write-key.js';

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-attr-'));
const bookDir = path.join(tmpRoot, 'book');
fs.mkdirSync(path.join(bookDir, 'novel', '_system', 'brain'), { recursive: true });

function gateOpts() {
  return { writer: ATTRIBUTION_GATE_WRITER, writeKey: ATTRIBUTION_GATE_WRITE_KEY };
}

function baseRecord(over = {}) {
  return {
    characterId: 'Alice',
    actionDescription: 'leave the room',
    status: 'PASS',
    evidenceRefs: [{ source: 'prose', role: 'evidence', provenance: 'test' }],
    storyClock: 1,
    sceneId: 's1',
    occurrenceRef: 'evt_1',
    ...over,
  };
}

let passed = 0;
function ok(name) {
  passed += 1;
  console.log(`  PASS ${name}`);
}

console.log('test:attribution-registry');

{
  const st = loadAttributionChapter(bookDir, 1);
  assert.equal(st.version, ATTRIBUTION_REGISTRY_VERSION);
  assert.deepEqual(st.records, []);
  ok('T1 empty load');
}

{
  const r = appendAttributionFromGate(bookDir, 1, baseRecord(), { writer: 'anyone' });
  assert.equal(r.written, false);
  assert.equal(r.reason, 'write_forbidden_not_attribution_gate');
  ok('T2 non-gate writer rejected');
}

{
  const r = appendAttributionFromGate(bookDir, 1, baseRecord(), {
    writer: ATTRIBUTION_GATE_WRITER,
  });
  assert.equal(r.written, false);
  assert.equal(r.reason, 'write_forbidden_missing_gate_key');
  ok('T2b forgeable writer string without key rejected');
}

{
  const r = appendAttributionFromGate(bookDir, 1, baseRecord(), {});
  assert.equal(r.written, false);
  ok('T3 missing writer rejected');
}

{
  assert.equal(__forbiddenPublicCreateAttribution().ok, false);
  ok('T4 forbidden public create');
}

{
  const r = appendAttributionFromGate(bookDir, 1, baseRecord({ id: 'attr_test_1' }), gateOpts());
  assert.equal(r.written, true);
  assert.ok(fs.existsSync(attributionChapterPath(bookDir, 1)));
  ok('T5 gate write PASS + sidecar');
}

{
  appendAttributionFromGate(bookDir, 1, baseRecord({
    id: 'attr_test_unk',
    status: 'UNKNOWN',
    actionDescription: 'stand still',
  }), gateOpts());
  assert.equal(listAttributedActions(bookDir, 1).length, 1);
  assert.equal(listAttributionRecords(bookDir, 1).length, 2);
  ok('T6 listAttributedActions PASS-only');
}

{
  for (const field of ['confidence', 'attributionConfidence', 'densificationScore']) {
    const v = validateAttributionRecord(baseRecord({ [field]: 0.9 }));
    assert.equal(v.ok, false);
  }
  const bad = appendAttributionFromGate(bookDir, 2, baseRecord({
    id: 'attr_conf',
    confidence: 0.5,
  }), gateOpts());
  assert.equal(bad.written, false);
  ok('T7 forbidden confidence fields');
}

{
  for (const f of FORBIDDEN_ATTRIBUTION_FIELDS) assert.ok(f);
  ok('T8 forbidden field set');
}

{
  const r = upsertAttributionFromGate(bookDir, 1, baseRecord({
    id: 'attr_test_1',
    status: 'INVALID',
    actionDescription: 'leave the room (rejudged)',
  }), gateOpts());
  assert.equal(r.written, true);
  assert.equal(listAttributedActions(bookDir, 1).length, 0);
  ok('T9 upsert from gate');
}

{
  const r = appendAttributionFromGate(bookDir, 3, {
    ...baseRecord({ id: 'attr_bad_prov' }),
    provenance: 'writer',
  }, gateOpts());
  assert.equal(r.written, true);
  assert.equal(r.record.provenance, 'attribution_gate');
  ok('T10 provenance normalized');
}

{
  const st = loadAttributionChapter(bookDir, 1);
  assert.equal(st.meta.writesCanon, false);
  assert.equal(st.meta.writesSR, false);
  ok('T11 meta non-canon');
}

console.log(`\nOK ${passed} tests`);
fs.rmSync(tmpRoot, { recursive: true, force: true });
