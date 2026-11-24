/**
 * Phase 4.4.1b — Typed Evidence + Attribution Gate
 * Run: npm run test:attribution-gate
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  adjudicateAttribution,
  runAttributionGate,
  evidenceFromProseExcerpt,
  evidenceFromOccurrence,
  evidenceFromOccurrenceActor,
  evidenceFromStateSlice,
  evidenceFromSRSlots,
  evidenceFromCharacterHint,
  evidenceFromL1,
  evidenceFromPriorPass,
  evidenceFromSituation,
  evidenceFromTimeline,
  FORBIDDEN_EVIDENCE_SOURCES,
  listAttributedActions,
  listAttributionRecords,
  loadAttributionChapter,
} from '../packages/inkos-brain/src/attribution/index.js';
import { appendAttributionFromGate, ATTRIBUTION_GATE_WRITER } from '../packages/inkos-brain/src/attribution/attribution-registry.js';

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-gate-'));
const bookDir = path.join(tmpRoot, 'book');
fs.mkdirSync(path.join(bookDir, 'novel', '_system', 'brain'), { recursive: true });

let passed = 0;
function ok(name) {
  passed += 1;
  console.log(`  PASS ${name}`);
}

console.log('test:attribution-gate');

// G1 — Situation rejected
{
  const r = evidenceFromSituation();
  assert.equal(r.ok, false);
  assert.ok(FORBIDDEN_EVIDENCE_SOURCES.includes('situation'));
  ok('G1 situation not evidence');
}

// G2 — State alone → UNKNOWN (not PASS)
{
  const ev = [
    evidenceFromStateSlice({
      characterId: 'Alice',
      properties: { location: 'corridor' },
      time: 1,
    }),
  ];
  const j = adjudicateAttribution({
    characterId: 'Alice',
    actionDescription: 'leave room',
    evidence: ev,
  });
  assert.equal(j.status, 'UNKNOWN');
  assert.equal(j.choice, undefined);
  assert.equal(j.consequence, undefined);
  ok('G2 state alone UNKNOWN');
}

// G3 — Occurrence + actor alone → UNKNOWN
{
  const ev = [
    evidenceFromOccurrence({ eventId: 'e1', action: '走出了房间', kind: 'physical' }),
    evidenceFromOccurrenceActor({ characterId: 'Alice', eventId: 'e1' }),
  ];
  const j = adjudicateAttribution({
    characterId: 'Alice',
    actionDescription: 'leave room',
    evidence: ev,
  });
  assert.equal(j.status, 'UNKNOWN');
  ok('G3 occurrence+actor UNKNOWN');
}

// G4 — L1 VALID alone → UNKNOWN
{
  const ev = [evidenceFromL1({ judgment: 'VALID' })];
  const j = adjudicateAttribution({
    characterId: 'Alice',
    actionDescription: 'leave room',
    evidence: ev,
  });
  assert.equal(j.status, 'UNKNOWN');
  ok('G4 L1 alone UNKNOWN');
}

// G5 — characterHints alone → UNKNOWN
{
  const ev = [
    evidenceFromCharacterHint({
      hint: { character: 'Alice', action: 'leave', stateChanges: ['loc:out'], eventId: 'e1' },
    }),
  ];
  const j = adjudicateAttribution({
    characterId: 'Alice',
    actionDescription: 'leave',
    evidence: ev,
  });
  assert.equal(j.status, 'UNKNOWN');
  assert.equal(ev[0].payload.kind, 'occurrence_derived_hint');
  ok('G5 hints alone UNKNOWN + provenance kind');
}

// G6 — subjectAbsent → INVALID
{
  const ev = [
    evidenceFromProseExcerpt({
      excerpt: '她在昏迷中被抬出房间。',
      characterId: 'Alice',
      subjectAbsent: true,
      subjectPresentCue: false,
      agencyCue: false,
    }),
  ];
  const j = adjudicateAttribution({
    characterId: 'Alice',
    actionDescription: 'leave room',
    evidence: ev,
  });
  assert.equal(j.status, 'INVALID');
  ok('G6 subjectAbsent INVALID');
}

// G7 — prose subject+agency → PASS
{
  const ev = [
    evidenceFromProseExcerpt({
      excerpt: '她犹豫片刻，还是推开门走了出去。',
      characterId: 'Alice',
      subjectPresentCue: true,
      agencyCue: true,
    }),
    evidenceFromStateSlice({
      characterId: 'Alice',
      properties: { 'Alice.location': 'corridor' },
    }),
  ];
  const j = adjudicateAttribution({
    characterId: 'Alice',
    actionDescription: 'leave room',
    evidence: ev,
  });
  assert.equal(j.status, 'PASS');
  ok('G7 prose+agency PASS (state as evidence ok)');
}

// G8 — coercion tradeoff cue → PASS
{
  const ev = [
    evidenceFromProseExcerpt({
      excerpt: '枪口抵着她。她知道时间不多，还是把卡片塞进袖口。',
      subjectPresentCue: true,
      coercionTradeoffCue: true,
    }),
  ];
  const j = adjudicateAttribution({
    characterId: 'Alice',
    actionDescription: 'hide card',
    evidence: ev,
  });
  assert.equal(j.status, 'PASS');
  ok('G8 coercion tradeoff PASS');
}

// G9 — forbidden causal_chain evidence rejected
{
  const j = adjudicateAttribution({
    characterId: 'Alice',
    actionDescription: 'leave',
    evidence: [{
      source: 'causal_chain',
      role: 'evidence',
      provenance: 'bad',
      forbiddenAsAuthority: true,
      payload: {},
    }],
  });
  assert.equal(j.status, 'UNKNOWN');
  assert.ok(j.reasons.some((r) => String(r).includes('FORBIDDEN') || String(r).includes('forbidden')));
  ok('G9 causal_chain forbidden');
}

// G10 — historical PASS alone ↛ current PASS
{
  const ev = [
    evidenceFromPriorPass({ priorRecordId: 'old', priorStatus: 'PASS', characterId: 'Alice' }),
  ];
  const j = adjudicateAttribution({
    characterId: 'Alice',
    actionDescription: 'leave again',
    evidence: ev,
  });
  assert.equal(j.status, 'UNKNOWN');
  assert.equal(ev[0].payload.transfersToCurrent, false);
  ok('G10 historical PASS no transfer');
}

// G11 — densification: many weak evidences still UNKNOWN
{
  const ev = [
    evidenceFromStateSlice({ properties: { a: 1 } }),
    evidenceFromStateSlice({ properties: { a: 2 } }),
    evidenceFromStateSlice({ properties: { a: 3 } }),
    evidenceFromTimeline({ line: 'Alice：走出了房间' }),
    evidenceFromSRSlots({ characterId: 'Alice', awareness: [{ info: 'outside' }] }),
    evidenceFromL1({ judgment: 'VALID' }),
  ];
  const j = adjudicateAttribution({
    characterId: 'Alice',
    actionDescription: 'leave',
    evidence: ev,
  });
  assert.equal(j.status, 'UNKNOWN');
  ok('G11 UNKNOWN×N ↛ PASS');
}

// G12 — runAttributionGate writes Registry; no choice/consequence
{
  const ev = [
    evidenceFromProseExcerpt({
      excerpt: '她咬牙冲了出去。',
      subjectPresentCue: true,
      agencyCue: true,
    }),
  ];
  const out = runAttributionGate(bookDir, 1, {
    characterId: 'Alice',
    actionDescription: 'rush out',
    evidence: ev,
    storyClock: 1,
    sceneId: 's1',
    recordId: 'attr_gate_1',
  });
  assert.equal(out.judgment.status, 'PASS');
  assert.equal(out.write.written, true);
  assert.equal(out.choice, undefined);
  assert.equal(out.consequence, undefined);
  assert.equal(listAttributedActions(bookDir, 1).length, 1);
  ok('G12 Gate → Registry PASS');
}

// G13 — forge writer string without key still fails at registry
{
  const r = appendAttributionFromGate(bookDir, 2, {
    characterId: 'Bob',
    actionDescription: 'fake',
    status: 'PASS',
  }, { writer: ATTRIBUTION_GATE_WRITER });
  assert.equal(r.written, false);
  assert.equal(r.reason, 'write_forbidden_missing_gate_key');
  assert.equal(loadAttributionChapter(bookDir, 2).records.length, 0);
  ok('G13 forged writer string cannot mint');
}

// G14 — Gate UNKNOWN still writes record (status UNKNOWN), not PASS projection
{
  const out = runAttributionGate(bookDir, 3, {
    characterId: 'Alice',
    actionDescription: 'maybe leave',
    evidence: [evidenceFromStateSlice({ properties: { loc: 'out' } })],
    recordId: 'attr_unk_1',
  });
  assert.equal(out.judgment.status, 'UNKNOWN');
  assert.equal(out.write.written, true);
  assert.equal(listAttributedActions(bookDir, 3).length, 0);
  assert.equal(listAttributionRecords(bookDir, 3, { status: 'UNKNOWN' }).length, 1);
  ok('G14 UNKNOWN recorded but not Causal History');
}

console.log(`\nOK ${passed} tests`);
fs.rmSync(tmpRoot, { recursive: true, force: true });
