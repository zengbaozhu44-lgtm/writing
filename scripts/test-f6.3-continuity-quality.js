#!/usr/bin/env node
/**
 * F6.3 — Observed Continuity Precision / Recall quality audit (test hardening)
 * Does NOT expand binder features; locks precision/isolation + lifecycle contracts.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildObservedContinuity,
  ensureObservedContinuity,
  collectPreviousObservedContinuity,
  formatObservedContinuityBlock,
  hasObservedContinuityMarkers,
  isUnresolvedSettledByText,
} from '../packages/inkos-prompt/src/scene-observed-continuity.js';
import {
  buildContextProvenanceTrace,
  findProvenanceBlock,
} from '../packages/inkos-studio-server/src/writer-optimization/context-provenance.js';
import { compileSlimBeatUserPrompt } from '../packages/inkos-studio-server/src/writer-optimization/beat-slimmer.js';
import { survivalFlags } from '../packages/inkos-studio-server/src/writer-optimization/final-context-viewer.js';

let failures = 0;
const fail = (m) => { failures += 1; console.error(`  FAIL: ${m}`); };
const ok = (m) => console.log(`  ok: ${m}`);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BOOK = path.join(ROOT, 'books/我的小说/books/凌晨四点世界刷新');

console.log('\n== F6.3 Continuity Quality ==');

function loadCh2() {
  const f = path.join(BOOK, 'novel/_system/brain/ch_0002_scenes.json');
  const data = JSON.parse(fs.readFileSync(f, 'utf8'));
  return (data.scenes || []).slice(0, 3).map((s) => ({
    index: s.index,
    id: s.id,
    title: s.title,
    goal: s.goal,
    text: s.text || '',
  }));
}

function evidenceInText(item, text) {
  if (!item) return false;
  if (item.evidence === 'unavailable') return true;
  const ex = item.evidence?.excerpt;
  if (!ex) return false;
  const norm = (t) => String(t || '').replace(/\s+/g, '');
  const nText = norm(text);
  const nEx = norm(ex);
  // excerpt is a window around match — require a substantial contiguous stem
  const stem = nEx.slice(0, Math.min(24, nEx.length));
  return stem.length >= 4 && nText.includes(stem);
}

// --- A Recall (production critical hooks from F6.1) ---
{
  const scenes = loadCh2();
  const s1 = scenes[0];
  const oc1 = buildObservedContinuity(s1, s1.text);
  const ids = (oc1?.confirmed || []).map((c) => c.id);
  const need = ['door_warning', 'notebook_message', 'clock_anomaly'];
  const missing = need.filter((id) => !ids.includes(id));
  if (missing.length) fail(`A: S1 missing critical confirmed ${missing.join(',')}`);
  else ok('A: S1 critical confirmed MATCH (快跑/告诉他真相/秒针)');

  const toS2 = collectPreviousObservedContinuity([s1], { planText: scenes[1].goal });
  if (!need.every((id) => toS2.confirmed.some((c) => c.id === id))) {
    fail('A: S2 previous bundle lost S1 critical confirmed');
  } else ok('A: S1→S2 critical confirmed survive collect');

  const toS3 = collectPreviousObservedContinuity(scenes.slice(0, 2), { planText: scenes[2].goal });
  if (!toS3.unresolved.some((u) => /^open_choice_s2$/.test(u.id))) {
    fail('A: S2 open_choice missing in →S3 (RECALL)');
  } else ok('A: S2 unresolved open_choice present for S3');
}

// --- B Precision (emotion / action ≠ fact) ---
{
  const emotion = buildObservedContinuity({ index: 1, id: 'e' }, '她脸色发白，手指发抖。');
  const blob = JSON.stringify(emotion);
  if (/恐惧|害怕|极度|恐慌/.test(blob) || (emotion?.confirmed || []).length) {
    fail('B: emotion prose leaked into confirmed');
  } else ok('B: Emotion ≠ Fact (empty / no fear attribution)');

  const act = buildObservedContinuity({ index: 1, id: 'a' }, '她把手机放进包里。');
  if (/决定离开|离开这里|动机/.test(JSON.stringify(act)) || (act?.confirmed || []).length) {
    fail('B: action→motive leak');
  } else ok('B: Action ≠ Motivation');
}

// --- C Plan Isolation ---
{
  const scene = { index: 1, id: 'p', text: '她摇头：「我不去。」她留在原地，没有上车。' };
  ensureObservedContinuity(scene);
  const plan = '下一场去医院。凌晨4:00病床醒来。';
  const bundle = collectPreviousObservedContinuity([scene], { planText: plan, sceneGoal: plan });
  const conf = JSON.stringify(bundle.confirmed || []);
  if (/病床|醒来|下一场去医院/.test(conf)) fail('C: Plan text entered confirmed');
  else ok('C: Plan Isolation — hospital plan not confirmed');
  // text refusal may appear as quote — must still be from text, not plan inventing arrival
  if ((bundle.confirmed || []).some((c) => /病床上醒来/.test(c.label))) {
    fail('C: Plan hospital arrival forged as confirmed');
  }
}

// --- D Expected Isolation ---
{
  const scene = {
    index: 1,
    id: 'd',
    text: '她看了一眼窗外。',
    goal: '应该发生车祸',
    expectedStateChange: '车祸发生',
    directorBrief: '本场须写出车祸',
  };
  const oc = buildObservedContinuity(scene, scene.text);
  if ((oc?.confirmed || []).length || (oc?.unresolved || []).length) {
    fail('D: Expected/goal metadata produced continuity without text support');
  } else ok('D: Expected Isolation');
}

// --- E Summary Isolation ---
{
  const scene = {
    index: 2,
    id: 'sum',
    text: '她倒了杯水，坐着。',
    summary: '角色已经知道世界在刷新。伤疤消失了。门缝出现快跑。',
  };
  const oc = buildObservedContinuity(scene, scene.text);
  if ((oc?.confirmed || []).some((c) => /door_warning|快跑|伤疤|刷新/.test(c.id + c.label))) {
    fail('E: Summary contaminated Observed Continuity');
  } else if (!oc?.empty && ((oc?.confirmed || []).length || (oc?.unresolved || []).length)) {
    fail('E: unexpected items from water-pouring prose');
  } else ok('E: Summary Isolation');
}

// --- F Evidence ---
{
  const scenes = loadCh2();
  let bad = false;
  for (const s of scenes) {
    const oc = buildObservedContinuity(s, s.text);
    for (const item of [...(oc?.confirmed || []), ...(oc?.unresolved || [])]) {
      if (!evidenceInText(item, s.text) && item.evidence !== 'unavailable') {
        fail(`F: evidence not grounded in S${s.index} text for ${item.id}`);
        bad = true;
      }
    }
  }
  if (!bad) ok('F: Evidence grounded in scene.text (or unavailable)');
}

// --- G Unresolved lifecycle ---
{
  const L1 = { index: 1, id: 'L1', text: '「跟我走，去看证明。」或者留在这里。你有三十秒。' };
  const L2 = { index: 2, id: 'L2', text: '他没有回答，只是盯着屏幕。雨还在下。' };
  const L3 = { index: 3, id: 'L3', text: '他点头跟她走了。两人离开公司大门。' };
  ensureObservedContinuity(L1);
  ensureObservedContinuity(L2);
  ensureObservedContinuity(L3);
  const a = collectPreviousObservedContinuity([L1], {});
  const b = collectPreviousObservedContinuity([L1, L2], { planText: '去医院' });
  const c = collectPreviousObservedContinuity([L1, L2, L3], {});
  const open = (bundle) => (bundle.unresolved || []).some((u) => /^open_choice/.test(u.id));
  if (!open(a)) fail('G: S1→S2 missing unresolved');
  else if (!open(b)) fail('G: plan cleared unresolved early');
  else if (open(c)) fail('G: unresolved still propagates after settlement text');
  else if (!isUnresolvedSettledByText(a.unresolved.find((u) => /^open_choice/.test(u.id)), L3.text)) {
    fail('G: settlement detector missed L3 text');
  } else ok('G: Unresolved lifecycle open→open→settled stop');
}

// --- H Psychology boundary ---
{
  const scene = { index: 1, id: 'h', text: '他点了点头，转身走了。门在身后关上。' };
  const oc = buildObservedContinuity(scene, scene.text);
  const blob = JSON.stringify(oc);
  if (/相信|信念|动机|决定背叛|内心/.test(blob)) fail('H: psychology attribution leak');
  else ok('H: Psychology boundary (no motive/belief invent)');
}

// --- meal Q is not narrative unresolved ---
{
  const oc = buildObservedContinuity({ index: 1, id: 'q' }, '“你吃饭了吗？”她问。');
  if ((oc?.unresolved || []).length) fail('H2: trivial question became unresolved');
  else ok('H2: trivial Q ≠ unresolved');
}

// --- I No Canon mutation ---
{
  const files = ['11_timeline.yaml', '13_fact_log.yaml', '06_knowledge_matrix.yaml', '08_current_state.md']
    .map((n) => path.join(BOOK, 'novel', n));
  const before = Object.fromEntries(files.map((f) => [f, fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null]));
  const scenes = loadCh2();
  for (const s of scenes) ensureObservedContinuity(s);
  collectPreviousObservedContinuity(scenes.slice(0, 2), { planText: scenes[2].goal });
  formatObservedContinuityBlock(
    collectPreviousObservedContinuity([scenes[0]], {}),
    { canonical: '10月27日' },
  );
  let mutated = false;
  for (const f of files) {
    const after = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
    if (before[f] !== after) {
      fail(`I: mutated ${path.basename(f)}`);
      mutated = true;
    }
  }
  if (!mutated) ok('I: 06/08/11/13 unchanged');
}

// --- Contrast mini-scenes ---
{
  // 1 pure action
  const c1 = buildObservedContinuity({ index: 1, id: 'c1' }, '她把手机放进包里，拉上拉链，站起身。');
  if (!c1?.empty && ((c1.confirmed || []).length || (c1.unresolved || []).length)) {
    fail('Contrast1: pure action produced continuity items');
  } else ok('Contrast1: pure action → empty');

  // 2 plan vs result
  const c2 = { index: 1, id: 'c2', text: '她决定不去医院。她把外套挂回衣架。' };
  ensureObservedContinuity(c2);
  const b2 = collectPreviousObservedContinuity([c2], { planText: '下一场去医院' });
  if ((b2.confirmed || []).some((c) => /去医院/.test(c.label) && !/不去/.test(c.label))) {
    fail('Contrast2: plan hospital overrode refusal');
  } else ok('Contrast2: plan≠result isolation');

  // 3 unresolved carries
  const c3a = { index: 1, id: 'c3a', text: '「跟我走。」或者留在这里。你有三十秒。' };
  const c3b = { index: 2, id: 'c3b', text: '雨越下越大。他仍站在门口。' };
  ensureObservedContinuity(c3a);
  ensureObservedContinuity(c3b);
  const b3 = collectPreviousObservedContinuity([c3a, c3b], { planText: '医院' });
  if (!b3.unresolved.some((u) => /^open_choice/.test(u.id))) fail('Contrast3: unresolved dropped');
  else ok('Contrast3: unresolved persists when next scene does not settle');
}

// --- F2/F3 linkage ---
{
  const s1 = { index: 1, id: 'f', text: '门缝「快跑」。秒针卡住。笔记本「告诉他真相」。「跟我走。你有三十秒。」' };
  const s2 = { index: 2, id: 'f2', goal: '医院病床', text: '' };
  ensureObservedContinuity(s1);
  const bundle = collectPreviousObservedContinuity([s1], { planText: s2.goal });
  const block = formatObservedContinuityBlock(bundle, { canonical: '10月27日' });
  const flags = survivalFlags(block);
  if (!flags.observedContinuity) fail('F2: survivalFlags.observedContinuity false');
  else ok('F2: Observed Continuity visible to viewer flags');

  const L2 = `## Story Clock\nCanonical 10月27日\n${block}`;
  const L4 = compileSlimBeatUserPrompt({
    beat: { order: 1, label: '开场', content: '开场', libraryBeat: '开场', wordBudget: 180 },
    executionPlan: { beats: [{ order: 1 }], sceneIndex: 2, scenePlan: { goal: s2.goal }, pov: '苏晚' },
    intent: { pov: '苏晚', time: '10月27日', scenes: [s1, s2] },
    scene: s2,
    basePrompt: L2,
  });
  const prov = buildContextProvenanceTrace({
    l1Text: block,
    l2Text: L2,
    l3Text: L2,
    l4Text: L4,
    intent: { time: '10月27日' },
    scene: s2,
    ctx: {},
    l1Modules: [{ key: 'observed_continuity' }],
  });
  const oc = findProvenanceBlock(prov, 'observed_continuity');
  if (!oc || oc.type !== 'derived') fail('F3: observed_continuity not derived');
  else if (/canon/i.test(oc.type)) fail('F3: OC masquerading as canon');
  else if (!hasObservedContinuityMarkers(L4)) fail('F3/L4: OC missing after beat compile');
  else ok('F3: derived OC provenance; not Canon');
}

console.log('  note: J regression = run test:f6.2 + f5…f1 separately');

if (failures) {
  console.error(`\nF6.3 FAILED (${failures})`);
  process.exit(1);
}
console.log('\nF6.3 PASS\n');
process.exit(0);
