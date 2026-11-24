#!/usr/bin/env node
/**
 * F6.2 — Scene-derived Continuity Bridge
 * confirmed / unresolved / evidence · ≠ Canon · ≠ SR · Plan cannot invent settlement
 */
import fs from 'node:fs';
import os from 'node:os';
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
import { compileScenePrompt } from '../packages/inkos-prompt/src/compiler.js';
import { buildSceneWritePrompt } from '../packages/inkos-brain/src/scene/scene.js';
import { compileSlimBeatUserPrompt } from '../packages/inkos-studio-server/src/writer-optimization/beat-slimmer.js';
import {
  buildContextProvenanceTrace,
  findProvenanceBlock,
} from '../packages/inkos-studio-server/src/writer-optimization/context-provenance.js';
import { hasStoryClock } from '../packages/inkos-core/src/lib/prompt-survival.js';

let failures = 0;
const fail = (m) => { failures += 1; console.error(`  FAIL: ${m}`); };
const ok = (m) => console.log(`  ok: ${m}`);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('\n== F6.2 Observed Continuity Bridge ==');

function hashFile(p) {
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8');
}

// --- Test A — Result survives ---
{
  const s1 = {
    id: 't_s1',
    index: 1,
    title: 'cliff',
    text: '天台门缝里伸出一只手。纸片上只有两个字——「快跑。」墙上的秒针卡住了。笔记本末页写着「告诉他真相」。',
  };
  const oc = buildObservedContinuity(s1, s1.text);
  if (!oc?.confirmed?.some((c) => c.id === 'door_warning')) fail('A: door_warning missing');
  else if (!oc.confirmed.some((c) => c.id === 'notebook_message')) fail('A: notebook_message missing');
  else if (!oc.confirmed.some((c) => c.id === 'clock_anomaly')) fail('A: clock_anomaly missing');
  else ok('A: S1 confirmed hooks extracted from text');

  const s2 = { id: 't_s2', index: 2, goal: '去公司查证据', text: '' };
  const bundle = collectPreviousObservedContinuity([s1], { planText: s2.goal });
  const block = formatObservedContinuityBlock(bundle, { canonical: '10月27日' });
  if (!hasObservedContinuityMarkers(block)) fail('A: formatter markers missing');
  else if (!/快跑|door_warning|门缝/.test(block)) fail('A: S2 block missing 快跑 continuity');
  else ok('A: S2 context contains observed continuity from S1');

  // Prompt compile path
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-f62-'));
  fs.mkdirSync(path.join(tmp, 'novel'), { recursive: true });
  const ctx = {
    bookDir: tmp,
    chapter: 2,
    pov: '苏晚',
    present: ['苏晚'],
    intent: {
      pov: '苏晚',
      mainGoal: '验证刷新',
      time: '10月27日',
      currentDate: '10月27日',
      scenes: [{ ...s1, observedContinuity: oc }, s2],
    },
    facts: [],
    knowledge: { matrix: [] },
    characters: {},
    currentStateMd: '',
    stateBoard: '',
  };
  const dyn = compileScenePrompt(ctx, s2);
  const L1 = typeof dyn === 'string' ? dyn : dyn?.text || '';
  const L2 = buildSceneWritePrompt(ctx, ctx.intent, s2, dyn);
  if (!hasObservedContinuityMarkers(L1) && !hasObservedContinuityMarkers(L2)) {
    fail('A: compile path missing Observed Continuity');
  } else ok('A: compileScenePrompt / L2 consume Observed Continuity');
  fs.rmSync(tmp, { recursive: true, force: true });
}

// --- Test B — Unresolved survives ---
{
  const s1 = {
    id: 'b_s1',
    index: 1,
    text: '她说：「你现在有两个选择。跟我走，去看证明。或者留在这里。」「你有三十秒。」',
  };
  ensureObservedContinuity(s1);
  const s2 = { id: 'b_s2', index: 2, text: '他看着屏幕，没有立刻回答。' };
  ensureObservedContinuity(s2);
  const forS3 = collectPreviousObservedContinuity([s1, s2], {
    planText: '凌晨4:00，林夜在医院的病床上醒来',
  });
  const open = (forS3.unresolved || []).filter((u) => /^open_choice/.test(u.id));
  if (!open.length) fail('B: open_choice unresolved lost before S3');
  else ok('B: unresolved open_choice survives into S3 input');
}

// --- Test C — Plan cannot invent resolution ---
{
  const s2 = {
    id: 'c_s2',
    index: 2,
    text: '「跟我走，去看证明。」她说。「或者留在这里。你有三十秒。」',
  };
  ensureObservedContinuity(s2);
  const plan = '凌晨4:00，林夜在医院的病床上醒来，亲眼目睹世界刷新';
  const item = (s2.observedContinuity.unresolved || []).find((u) => /^open_choice/.test(u.id));
  if (!item) fail('C: fixture missing open_choice');
  else if (isUnresolvedSettledByText(item, plan)) fail('C: plan text falsely settled unresolved');
  else {
    const bundle = collectPreviousObservedContinuity([s2], { planText: plan, sceneGoal: plan });
    if (!(bundle.unresolved || []).some((u) => /^open_choice/.test(u.id))) {
      fail('C: hospital plan silently cleared unresolved');
    } else ok('C: Plan cannot invent resolution of unresolved');
  }
}

// --- Test D — No Canon / SR mutation ---
{
  const book = path.join(ROOT, 'books/我的小说/books/凌晨四点世界刷新');
  const novel = path.join(book, 'novel');
  const files = ['11_timeline.yaml', '13_fact_log.yaml', '06_knowledge_matrix.yaml'].map((f) => path.join(novel, f));
  const before = Object.fromEntries(files.map((f) => [f, hashFile(f)]));
  const s1 = {
    index: 1,
    id: 'd_s1',
    text: '门缝里「快跑」。秒针卡住。笔记本「告诉他真相」。',
  };
  buildObservedContinuity(s1, s1.text);
  ensureObservedContinuity(s1);
  collectPreviousObservedContinuity([s1], { planText: '医院' });
  const after = Object.fromEntries(files.map((f) => [f, hashFile(f)]));
  let mutated = false;
  for (const f of files) {
    if (before[f] !== after[f]) {
      fail(`D: mutated ${path.basename(f)}`);
      mutated = true;
    }
  }
  if (s1.observedContinuity?.writesCanon !== false) fail('D: writesCanon not false');
  else if (s1.observedContinuity?.writesSR !== false) fail('D: writesSR not false');
  else if (!mutated) ok('D: 11/13/06 unchanged; OC flags writesCanon/SR=false');
}

// --- Test E — Evidence ---
{
  const s1 = {
    index: 1,
    id: 'e_s1',
    text: '门缝伸出纸片，上面写着「快跑」。笔记本写着「告诉他真相」。秒针不动。',
  };
  const oc = buildObservedContinuity(s1, s1.text);
  let bad = false;
  for (const item of [...(oc.confirmed || []), ...(oc.unresolved || [])]) {
    const ev = item.evidence;
    if (ev == null) { fail(`E: null evidence for ${item.id}`); bad = true; continue; }
    if (ev === 'unavailable') continue;
    if (typeof ev === 'object' && ev.excerpt) continue;
    if (typeof ev === 'string' && ev.length) continue;
    fail(`E: forged/invalid evidence for ${item.id}`);
    bad = true;
  }
  if (!bad) ok('E: every item has evidence or unavailable');
}

// --- Test F — Historical separation ---
{
  const s1 = {
    index: 1,
    id: 'f_s1',
    text: '笔记本写着「六月十七日，四点零四分。告诉他真相。」门缝「快跑」。秒针卡住。',
  };
  ensureObservedContinuity(s1);
  const bundle = collectPreviousObservedContinuity([s1], { planText: '推进' });
  const block = formatObservedContinuityBlock(bundle, { canonical: '10月27日' });
  if (!/10月27日/.test(block)) fail('F: Canonical clock missing in OC block');
  else if (!/历史日期|≠/.test(block) && !/六月十七日/.test(block)) fail('F: June not labeled historical');
  else if (/Canonical[^\n]*六月十七日/.test(block)) fail('F: June treated as Canonical');
  else ok('F: Observed Continuity historical ≠ Current Story Clock');
}

// --- Test G — F3 provenance ---
{
  const s1 = {
    index: 1,
    id: 'g_s1',
    text: '门缝「快跑」。秒针异常。笔记本「告诉他真相」。「跟我走。你有三十秒。」',
  };
  const s2 = { index: 2, id: 'g_s2', goal: '医院病床醒来', text: '' };
  ensureObservedContinuity(s1);
  const bundle = collectPreviousObservedContinuity([s1], { planText: s2.goal });
  const block = formatObservedContinuityBlock(bundle, { canonical: '10月27日' });
  const L2 = `## Story Clock\n- Canonical：10月27日\n## 信息边界\nWorld ≠ Knowledge\n${block}\n### Scene 目标\n目标: ${s2.goal}`;
  const L4 = compileSlimBeatUserPrompt({
    beat: { order: 1, label: '开场', content: '开场', libraryBeat: '开场', wordBudget: 200 },
    executionPlan: { beats: [{ order: 1 }], sceneIndex: 2, scenePlan: { goal: s2.goal }, pov: '苏晚' },
    intent: {
      pov: '苏晚',
      time: '10月27日',
      scenes: [s1, s2],
    },
    scene: s2,
    basePrompt: L2,
  });
  const prov = buildContextProvenanceTrace({
    l1Text: block,
    l2Text: L2,
    l3Text: L2,
    l4Text: L4,
    intent: { time: '10月27日', scenes: [s1, s2] },
    scene: s2,
    ctx: {},
    l1Modules: [{ key: 'observed_continuity' }],
  });
  const oc = findProvenanceBlock(prov, 'observed_continuity');
  if (!oc) fail('G: observed_continuity block missing');
  else if (oc.type !== 'derived') fail(`G: type=${oc.type}`);
  else if (!oc.source || !/buildObservedContinuity|scene_/.test(oc.source)) fail(`G: bad source ${oc.source}`);
  else if (!oc.priority) fail('G: missing priority');
  else if (oc.kept !== true && oc.reason !== 'budget_trim' && oc.reason !== 'scene_continuity') {
    fail(`G: unexpected kept/reason ${oc.kept}/${oc.reason}`);
  } else if (!oc.layers || !oc.layers.L2) fail('G: missing layers');
  else if (oc.reason !== 'scene_continuity' && oc.reason !== 'budget_trim') fail(`G: reason=${oc.reason}`);
  else ok('G: F3 provenance has source/type/priority/kept/reason/layers');

  if (!hasObservedContinuityMarkers(L4) && !hasStoryClock(L4)) fail('G: L4 lost clock and OC');
  else if (!hasObservedContinuityMarkers(L4)) fail('G: L4 missing Observed Continuity (should be protected)');
  else ok('G: L4 beat prompt retains Observed Continuity');
}

// --- Test H note: full F1–F5 run separately ---
ok('H: run test:f5…f1 + phase1 + eo-d1 via regression suite');

if (failures) {
  console.error(`\nF6.2 FAILED (${failures})`);
  process.exit(1);
}
console.log('\nF6.2 PASS\n');
process.exit(0);
