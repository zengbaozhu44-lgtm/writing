#!/usr/bin/env node
/**
 * EO-TR-01 VERIFY — Operator/raw delta ↛ 11/13
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { partitionOperatorRawDelta } from '../packages/inkos-core/src/lib/tr01-operator-delta.js';
import { stampOperatorCliPost } from '../packages/inkos-core/src/lib/operator-proxy.js';
import { sourceProducesObtains } from '../packages/inkos-core/src/lib/authority-act.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.error(`  FAIL: ${msg}`);
};
const ok = (msg) => console.log(`  ok: ${msg}`);

console.log('\n== EO-TR-01 Operator raw delta VERIFY ==');

const raw = {
  timeline: { day: 3, events: ['盟友已死'], characters_present: ['林砚'] },
  facts: [{ fact: '第3章完成：占领数据塔', immutable: true }],
  current_state: '| 地点 | 塔 |',
  foreshadow: { add: [{ title: '钩子' }] },
  npc: [{ name: '甲' }],
};
const { operationalDelta, skippedRealityLike } = partitionOperatorRawDelta(raw);

if (operationalDelta.timeline) fail('timeline must be stripped');
else ok('raw delta.timeline stripped (↛ 11)');

if (operationalDelta.facts) fail('facts must be stripped');
else ok('raw delta.facts stripped (↛ 13)');

if (!operationalDelta.current_state) fail('08 operational field must remain');
else ok('current_state kept (operational)');

if (!operationalDelta.foreshadow) fail('W-04 foreshadow must remain untouched by TR-01 partition');
else ok('foreshadow not in TR-01 (W-04 left)');

if (!operationalDelta.npc) fail('W-19 npc must remain untouched');
else ok('npc not in TR-01 (UNKNOWN left)');

const carriers = skippedRealityLike.map((s) => s.carrier).sort().join(',');
if (carriers !== '11_timeline,13_facts_db') fail(`unexpected skip set: ${carriers}`);
else ok('skipped carriers = 11 + 13 only');

if (raw.timeline && raw.facts.length) ok('original delta not mutated');
else fail('must not mutate caller delta');

const empty = partitionOperatorRawDelta({ current_state: 'x' });
if (empty.skippedRealityLike.length !== 0) fail('no skip when no 11/13 payload');
else ok('no skip when delta has no timeline/facts');

const cliSrc = fs.readFileSync(path.join(ROOT, 'packages/inkos-core/src/cli.js'), 'utf8');
if (!cliSrc.includes('partitionOperatorRawDelta')) fail('CLI post must partition TR-01');
else ok('CLI post partitions Operator raw delta');

const brainSrc = fs.readFileSync(path.join(ROOT, 'packages/inkos-core/src/workflows/brain-chapter.js'), 'utf8');
if (!brainSrc.includes('partitionOperatorRawDelta')) fail('brain-chapter raw delta must partition TR-01');
else ok('brain-chapter equivalent raw delta partitioned');

const commitSrc = fs.readFileSync(path.join(ROOT, 'packages/inkos-brain/src/memory/state-updater.js'), 'utf8');
if (commitSrc.includes('partitionOperatorRawDelta')) {
  fail('MemoryUnit/commit path must not be expanded into TR-01 partition');
} else ok('commit → applyPostChapter not expanded (Dual BLOCK not widened here)');

const actSrc = fs.readFileSync(path.join(ROOT, 'packages/inkos-core/src/lib/authority-act.js'), 'utf8');
if (actSrc.includes('partitionOperatorRawDelta') || /from ['"].*tr01-operator-delta/.test(actSrc)) {
  fail('Authority Act must not import TR-01 partition');
} else ok('Authority Act unchanged (no TR-01 wiring)');

if (sourceProducesObtains('post') || sourceProducesObtains('applyPostChapter')) {
  fail('post must still not produce obtains');
} else ok('post / applyPostChapter ↛ obtains');

const stamped = stampOperatorCliPost({ d1Tr01: { skippedRealityLike, producesObtains: false } });
if (stamped.d1OperatorProxy.authoritySubject !== 'Author' || stamped.d1OperatorProxy.executor !== 'Operator') {
  fail('P3 identities drifted');
} else ok('Subject=Author Executor=Operator unchanged');
if (stamped.d1OperatorProxy.producesObtains !== false) fail('post stamp must not obtain');
else ok('Operator post still ≠ obtains');

const residue = fs.readFileSync(
  path.join(ROOT, 'golden/reality/d1-implementation-contract/TRANSITIONAL-RESIDUE.md'),
  'utf8',
);
if (!residue.includes('EO-TR-01') || !/write.*CUT|CUT.*11/i.test(residue) && !residue.includes('write CUT')) {
  if (!residue.includes('Operator raw delta ↛ 11/13')) fail('TRANSITIONAL-RESIDUE must record TR-01 write cut');
  else ok('TRANSITIONAL-RESIDUE records write cut');
} else ok('TRANSITIONAL-RESIDUE records write cut');

const eo = fs.readFileSync(
  path.join(ROOT, 'golden/reality/d1-implementation-contract/EO-TR-01.md'),
  'utf8',
);
if (!eo.includes('NO auto-start P7') || !eo.includes('NO Authority Act changes')) {
  fail('EO-TR-01 missing hard bans');
} else ok('EO-TR-01 hard bans present');

if (failures) {
  console.error(`\nEO-TR-01 VERIFY FAILED: ${failures}`);
  process.exit(1);
}
console.log('\nEO-TR-01 VERIFY PASSED — Operator raw delta ↛ 11/13; STOP (do not start P7)\n');
