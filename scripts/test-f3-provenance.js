#!/usr/bin/env node
/**
 * F3 — Context Provenance Trace regression
 * Diagnostic only — does not mutate Canon / SR / Prompt semantics.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { buildSceneWritePrompt } from '../packages/inkos-brain/src/scene/scene.js';
import { compile as compilePrompt } from '../packages/inkos-runtime/src/compiler/prompt-compiler.js';
import { compileSlimBeatUserPrompt } from '../packages/inkos-studio-server/src/writer-optimization/beat-slimmer.js';
import {
  buildContextProvenanceTrace,
  findProvenanceBlock,
  PROVENANCE_TYPES,
} from '../packages/inkos-studio-server/src/writer-optimization/context-provenance.js';
import {
  persistFinalContextCompile,
  persistFinalContextWriterCall,
  loadFinalContextSnapshot,
  hashPromptText,
} from '../packages/inkos-studio-server/src/writer-optimization/final-context-viewer.js';

let failures = 0;
const fail = (m) => { failures += 1; console.error(`  FAIL: ${m}`); };
const ok = (m) => console.log(`  ok: ${m}`);

function fileHash(p) {
  if (!fs.existsSync(p)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0, 16);
}

console.log('\n== F3 Context Provenance Trace ==');

const intent = {
  pov: '苏晚',
  mainGoal: '确认刷新',
  time: '10月27日',
  currentDate: '10月27日',
  scenes: [
    { index: 1, id: 's1', goal: '进入', conflict: 'c', text: '日期——六月十七日。旧稿。' },
    { index: 2, id: 's2', goal: '推进', conflict: '阻碍', beat: 'turn', wordTarget: 400 },
  ],
};
const scene = intent.scenes[1];
const ctx = {
  pov: '苏晚',
  present: ['苏晚'],
  intent,
  state: { 时间: '10月27日' },
  knowledge: { matrix: [{ info: '林夜车祸', 苏晚: 'partial' }] },
};

const L1 = [
  '### Scene 目标',
  '目标: 推进',
  '### 前序 Scene',
  '> **角色：Historical Continuity（历史承接）** — 不是当前 Scene 日历。',
  '- **Scene 1**: 日期——六月十七日。',
  '### Character Subjective State',
  '- Awareness: [partial] 林夜车祸',
].join('\n');

const L2 = buildSceneWritePrompt(ctx, intent, scene, L1);
const compiled = compilePrompt({
  scene,
  chapter: 2,
  intent,
  loreText: L2,
  priorExcerpt: '屏幕上是六月十七日。苏晚没有说话。',
  executionPlan: { beats: [{ order: 1, label: '试探', content: '推进', wordBudget: 200 }] },
});
const L3 = compiled.text;
const L4 = compileSlimBeatUserPrompt({
  beat: { order: 1, label: '试探', content: '推进', libraryBeat: '试探', wordBudget: 200 },
  executionPlan: {
    beats: [{ order: 1, label: '试探', libraryBeat: '试探', wordBudget: 200 }],
    sceneIndex: 2,
    scenePlan: { goal: scene.goal },
    pov: '苏晚',
  },
  intent,
  scene,
  basePrompt: L3,
});

const l1Modules = [
  { key: 'scene_goal' },
  { key: 'prev_summary' },
  { key: 'character_sr' },
  { key: 'knowledge' },
];

const trace = buildContextProvenanceTrace({
  l1Text: L1,
  l2Text: L2,
  l3Text: L3,
  l4Text: L4,
  intent,
  scene,
  ctx,
  l1Modules,
});

// Test A — Story Clock
{
  const b = findProvenanceBlock(trace, 'story_clock');
  if (!b) fail('A: missing story_clock');
  else if (!/intent\.(time|currentDate)/.test(b.source)) fail(`A: source not identifiable (${b.source})`);
  else if (!PROVENANCE_TYPES.includes(b.type) || b.type === 'unavailable') fail(`A: bad type ${b.type}`);
  else if (b.priority !== 'P1') fail(`A: priority ${b.priority}`);
  else if (b.layers?.L2 !== 'present' || b.layers?.L3 !== 'present' || b.layers?.L4 !== 'present') {
    fail(`A: layer survival ${JSON.stringify(b.layers)}`);
  } else if (!b.kept) fail('A: kept should be true');
  else ok('A: story_clock provenance + L2/L3/L4 present');
}

// Test B — Information Boundary
{
  const b = findProvenanceBlock(trace, 'information_boundary');
  if (!b) fail('B: missing information_boundary');
  else if (b.type !== 'guard') fail(`B: type ${b.type}`);
  else if (b.priority !== 'P1') fail(`B: priority ${b.priority}`);
  else if (b.layers?.L2 !== 'present' || b.layers?.L3 !== 'present' || b.layers?.L4 !== 'present') {
    fail(`B: layers ${JSON.stringify(b.layers)}`);
  } else ok('B: information_boundary provenance');
}

// Test C — Historical Context
{
  const prior = findProvenanceBlock(trace, 'prior_excerpt');
  const prev = findProvenanceBlock(trace, 'prev_summary');
  const hist = prior?.type === 'historical' || prev?.type === 'historical';
  if (!hist) fail('C: historical type missing');
  else if ([prior, prev].some((b) => b && /^(canon|current|reality)$/.test(b.type))) {
    fail('C: historical mislabeled as canon/current/reality');
  } else if (prior && prior.source && !/scene|prior/i.test(prior.source)) {
    fail(`C: prior source vague (${prior.source})`);
  } else ok('C: historical context typed historical (not canon/reality)');
}

// Test D — Trim (knowledge present L1, absent L3/L4)
{
  const trimTrace = buildContextProvenanceTrace({
    l1Text: '### 信息差 TopK\n- [rel=10] 某知识行\n',
    l2Text: '### Scene Lore Seed\n无知识块\n',
    l3Text: '## P1 · Narrative Task\n无知识投影\n## P2 · Global Lore\n无\n',
    l4Text: '## 当前 Beat\n只写动作\n',
    intent,
    scene,
    ctx,
    l1Modules: [{ key: 'knowledge' }],
  });
  const k = findProvenanceBlock(trimTrace, 'knowledge');
  if (!k) fail('D: knowledge block missing');
  else if (k.kept !== false) fail(`D: kept should be false (got ${k.kept})`);
  else if (k.reason !== 'budget_trim') fail(`D: reason should be budget_trim (got ${k.reason})`);
  else if (k.layers?.L1 !== 'present') fail('D: L1 should be present');
  else ok('D: trim → kept=false reason=budget_trim (≠ fact absent)');
}

// Test E — Layer Transition Clock
{
  const b = findProvenanceBlock(trace, 'story_clock');
  if (b?.layers?.L2 === 'present' && b?.layers?.L3 === 'present' && b?.layers?.L4 === 'present') {
    ok('E: story_clock L2→L3→L4 present');
  } else fail(`E: transition ${JSON.stringify(b?.layers)}`);
}

// Test F — No Mutation of Canon
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-f3-'));
  const novel = path.join(tmp, 'novel');
  fs.mkdirSync(path.join(novel, '_system', 'studio', 'writer-optimization'), { recursive: true });
  const fixtures = {
    '01_world_bible.md': 'world',
    '06_knowledge_matrix.yaml': 'matrix: []\n',
    '08_current_state.yaml': '时间: Day 1\n',
    '11_timeline.yaml': 'days: []\n',
  };
  for (const [f, body] of Object.entries(fixtures)) {
    fs.writeFileSync(path.join(novel, f), body);
  }
  const before = Object.fromEntries(
    Object.keys(fixtures).map((f) => [f, fileHash(path.join(novel, f))]),
  );

  persistFinalContextCompile(tmp, 2, scene, {
    l1Text: L1,
    l2Text: L2,
    l3Text: L3,
    sealedHash: hashPromptText(L3),
    intent,
    ctx,
    l1Modules,
  });
  persistFinalContextWriterCall(tmp, 2, scene, {
    userPrompt: L4,
    beatOrder: 1,
    callId: 'f3-test',
    intent,
    ctx,
  });

  const after = Object.fromEntries(
    Object.keys(fixtures).map((f) => [f, fileHash(path.join(novel, f))]),
  );
  const mutated = Object.keys(fixtures).filter((f) => before[f] !== after[f]);
  if (mutated.length) fail(`F: Canon mutated: ${mutated.join(',')}`);
  else ok('F: Canon/06/08/11 hashes unchanged');

  const snap = loadFinalContextSnapshot(tmp, 2, 2);
  if (!snap?.provenance?.blocks?.length) fail('F: provenance not on snapshot');
  else ok('F: provenance attached to final-context snapshot');
  if (snap.provenance.writesCanon || snap.provenance.writesSR) fail('F: provenance claims write');
  else ok('F: provenance readOnly flags');

  fs.rmSync(tmp, { recursive: true, force: true });
}

// Test G — F2 not broken (integrity still works after provenance)
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-f3g-'));
  fs.mkdirSync(path.join(tmp, 'novel', '_system', 'studio', 'writer-optimization'), { recursive: true });
  persistFinalContextCompile(tmp, 2, scene, {
    l1Text: L1,
    l2Text: L2,
    l3Text: L3,
    sealedHash: hashPromptText(L3),
    intent,
    ctx,
  });
  persistFinalContextWriterCall(tmp, 2, scene, {
    userPrompt: L4,
    beatOrder: 1,
    callId: 'g',
    intent,
    ctx,
  });
  const snap = loadFinalContextSnapshot(tmp, 2, 2);
  if (snap.layers?.L4?.hash !== hashPromptText(L4)) fail('G: F2 L4 hash broken');
  else ok('G: F2 hash integrity intact with provenance');
  fs.rmSync(tmp, { recursive: true, force: true });
}

// SR untouched
{
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const sr = fs.readFileSync(path.join(root, 'packages/inkos-core/src/lib/minimal-sr.js'), 'utf8');
  if (/persistenceEngine|characterStateEngine/.test(sr)) fail('SR expanded');
  else ok('SR schema untouched');
}

if (failures) {
  console.error(`\nF3 FAILED: ${failures}`);
  process.exit(1);
}
console.log('\nF3 PASSED — Context Provenance Trace (diagnostic only)\n');
