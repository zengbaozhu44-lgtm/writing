#!/usr/bin/env node
/**
 * RF-01 — Prose Boundary Gate
 * Strip leading Beat scaffold · FP keep · residual hardFail · authority flags
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyProseBoundaryGate,
  isInternalBeatScaffoldLine,
} from '../packages/inkos-studio-server/src/writer-optimization/prose-boundary.js';

let failures = 0;
const fail = (m) => { failures += 1; console.error(`  FAIL: ${m}`); };
const ok = (m) => console.log(`  ok: ${m}`);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CH3 = path.join(
  ROOT,
  'books/我的小说/books/凌晨四点世界刷新/novel/_system/brain/ch_0003_scenes.json',
);

console.log('\n== RF-01 Prose Boundary Gate ==');

// --- A: Ch3 S3 contamination regression ---
{
  const ch3 = JSON.parse(fs.readFileSync(CH3, 'utf8'));
  const raw = String(ch3.scenes[2].text || '');
  if (!raw.startsWith('# Beat 1/6')) fail('A: fixture Ch3 S3 no longer has contamination head (update test?)');
  else ok('A: production fixture still shows RF-01 head (pre-gate disk)');

  const gate = applyProseBoundaryGate(raw);
  if (/^#\s*Beat\s*1\s*\/\s*6/um.test(gate.text)) fail('A: scaffold still in gated text');
  else if (!/凌晨3:59|病房的灯管/u.test(gate.text)) fail('A: prose body lost after strip');
  else if (gate.writesCanon || gate.writesSR || gate.writesReality) fail('A: authority flags true');
  else if (gate.hardFail) fail('A: unexpected hardFail after clean strip');
  else ok('A: Ch3 S3 head stripped; prose kept; authority false');
}

// --- B: False positives KEEP ---
{
  const cases = [
    ['「你的目标是什么？」她问。', 'dialogue goal'],
    ['效率助手：请于四点前登记。', 'in-world system'],
    ['他看见镜面上写着：**刷新**。', 'author markdown'],
    ['# 第三章 四点整\n\n苏晚推开门。', 'chapter title'],
    ['## 急诊大厅\n\n灯管嗡嗡响。', 'prose heading'],
  ];
  let bad = false;
  for (const [input, name] of cases) {
    const g = applyProseBoundaryGate(input);
    if (g.text.trim() !== input.trim()) {
      fail(`B: mutated FP (${name})`);
      bad = true;
    }
    if (g.hardFail) {
      fail(`B: hardFail on FP (${name})`);
      bad = true;
    }
  }
  if (!bad) ok('B: false-positive suite KEEP EXACTLY');
}

// --- C: Prompt echo / L4 header forms ---
{
  const l4Header = '## 当前 Beat 1/6：Goal（主角目标）';
  const body = '凌晨3:59。病房的灯管开始闪烁。';
  const g = applyProseBoundaryGate(`${l4Header}\n${body}`, {
    userPrompt: `${l4Header}\n只写本 Beat。`,
  });
  if (g.text.includes('当前 Beat')) fail('C: L4 header not stripped');
  else if (!g.text.startsWith('凌晨')) fail('C: body not preserved');
  else ok('C: L4 / prompt-echo header stripped');

  const forms = [
    '### Beat 1 · Goal（主角目标）',
    '# Beat 2/6：Obstacle（阻碍）',
    '## 当前 Beat 3/6：Choice（抉择）',
    '### Beat 4 · Consequence（代价落地）',
    '### Beat 5 · New Information（信息新增）',
    '### Beat 6 · Hook（段末悬念）',
  ];
  let okForms = true;
  for (const h of forms) {
    if (!isInternalBeatScaffoldLine(h)) {
      fail(`C: detector miss ${h}`);
      okForms = false;
    }
    const gg = applyProseBoundaryGate(`${h}\n他往前走了一步。`);
    if (/^#/m.test(gg.text.split('\n')[0])) {
      fail(`C: strip miss ${h}`);
      okForms = false;
    }
  }
  if (okForms) ok('C: structural label header forms detected+stripped');
}

// --- D: Residual contamination → hardFail ---
{
  // Unknown residual pattern that still matches scaffold grammar after one strip
  // Two stacked headers: both should strip; if only unknown remains as scaffold-like
  const stacked = [
    '# Beat 1/6：Goal（主角目标）',
    '## 当前 Beat 1/6：Goal（主角目标）',
    '凌晨到了。',
  ].join('\n');
  const g1 = applyProseBoundaryGate(stacked);
  if (g1.hardFail) fail('D: stacked known headers should strip clean');
  else if (!g1.text.startsWith('凌晨')) fail('D: stacked strip lost body');
  else ok('D1: stacked known scaffolds strip to prose');

  // Only scaffold, no prose
  const only = '# Beat 1/6：Goal（主角目标）\n### Beat 1 · Goal（主角目标）';
  const g2 = applyProseBoundaryGate(only);
  if (!g2.hardFail) fail('D2: scaffold-only must hardFail');
  else if (g2.writesCanon !== false || g2.writesSR !== false || g2.writesReality !== false) {
    fail('D2: flags');
  } else ok('D2: scaffold-only → hardFail (no dirty accept)');
}

// --- E: Uncertain mid-text Beat mention KEEP ---
{
  const mid = '他想起有人说过 Beat 这个词，但那只是梦。\n继续往前。';
  const g = applyProseBoundaryGate(mid);
  if (g.text !== mid.trim()) fail('E: mid-text Beat mention mutated');
  else ok('E: uncertain mid-text KEEP (no full-doc scrub)');
}

// --- F: Authority contract on return object ---
{
  const g = applyProseBoundaryGate('# Beat 1/6：Goal（主角目标）\n正文。');
  if (g.writesCanon !== false || g.writesSR !== false || g.writesReality !== false) {
    fail('F: authority flags');
  } else if (g.role !== 'prose_boundary_gate') fail('F: role');
  else ok('F: writesCanon/SR/Reality=false');
}

// --- G: 11/13 authority — gate does not touch timeline/state files ---
{
  const novelRoot = path.join(
    ROOT,
    'books/我的小说/books/凌晨四点世界刷新/novel',
  );
  const watch = ['11_timeline.yaml', '13_facts_db.yaml', '06_knowledge_matrix.yaml']
    .map((f) => path.join(novelRoot, f))
    .filter((p) => fs.existsSync(p));
  if (watch.length < 2) {
    fail('G: missing 11/13 fixtures');
  } else {
    const before = Object.fromEntries(watch.map((p) => [p, fs.readFileSync(p, 'utf8')]));
    applyProseBoundaryGate('# Beat 1/6：Goal（主角目标）\n凌晨3:59。');
    let mutated = false;
    for (const p of watch) {
      if (fs.readFileSync(p, 'utf8') !== before[p]) mutated = true;
    }
    if (mutated) fail('G: 11/13 mutated by gate');
    else ok('G: 11_timeline / 13_facts_db unchanged (gate is draft-only)');
  }
}



console.log(failures ? `\nRF-01 FAIL (${failures})` : '\nRF-01 PASS');
process.exit(failures ? 1 : 0);
