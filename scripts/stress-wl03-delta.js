#!/usr/bin/env node
/**
 * WL-03 Literary Delta 采集器（OBSERVATION ONLY — 只读）
 * 用法：node scripts/stress-wl03-delta.js [workDir] [baselineProseMd]
 * 输出：tmp-stress/wl03-delta.json
 *  - T2 组成（kind 分布，对照 WL-02 基线：action 应保持低位，NPC 块不得制造新 action 涌入）
 *  - NPC prompt 接缝率（scenes[].prompt 含 NPC 动向块的比例）
 *  - 文学指标：NPC 提及密度 / 对白密度 / 世界细节密度（vs WL-02 prose 基线）
 */
import fs from 'node:fs';
import path from 'node:path';

const workDir = process.argv[2] || fs.readFileSync('tmp-stress/workdir.txt', 'utf8').trim();
const baselineMd = process.argv[3] || 'tmp-stress/batch-full.md';
const OUT = 'tmp-stress/wl03-delta.json';

const NPCS = ['苏眠', '镜渊', '老周'];
const WORLD_MARKERS = /灯|风|走廊|街|巷|声|味|雨|光|窗|门|钟|轮|影/u;

function proseMetrics(md) {
  const text = String(md || '');
  const chars = text.replace(/\s/g, '').length;
  if (!chars) return { chars: 0 };
  const dialogueLines = (text.match(/^[「“]/gm) || []).length;
  const npcMentions = {};
  for (const n of NPCS) npcMentions[n] = (text.split(n).length - 1);
  const npcTotal = Object.values(npcMentions).reduce((a, b) => a + b, 0);
  const sentences = text.split(/[。！？\n]+/).filter((s) => s.trim().length >= 6);
  const worldSentences = sentences.filter((s) => WORLD_MARKERS.test(s)).length;
  return {
    chars,
    dialoguePer1k: +(dialogueLines * 1000 / chars).toFixed(1),
    npcMentionsPer1k: +(npcTotal * 1000 / chars).toFixed(1),
    npcMentions,
    worldSentencesPer1k: +(worldSentences * 1000 / chars).toFixed(1),
  };
}

function chapterProse(workDir) {
  const dir = path.join(workDir, 'chapters');
  if (!fs.existsSync(dir)) return '';
  const files = fs.readdirSync(dir).filter((f) => /^\d{4}_第\d+章\.md$/.test(f)).sort();
  return files.map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
}

function t2Composition(workDir) {
  const p = path.join(workDir, 'novel', '_system', 'brain', 'character_world', 'world.json');
  if (!fs.existsSync(p)) return { total: 0, by: {}, pct: {} };
  const w = JSON.parse(fs.readFileSync(p, 'utf8'));
  const items = [];
  for (const c of Object.values(w.characters || {})) {
    for (const e of (c.experiences || [])) items.push(e);
  }
  const by = {};
  for (const e of items) by[e.kind || '?'] = (by[e.kind || '?'] || 0) + 1;
  const pct = {};
  for (const [k, v] of Object.entries(by)) pct[k] = `${Math.round(100 * v / items.length)}%`;
  return { total: items.length, by, pct };
}

function promptSeam(workDir) {
  const brainDir = path.join(workDir, 'novel', '_system', 'brain');
  let scenes = 0; let withNpc = 0; const chList = [];
  if (!fs.existsSync(brainDir)) return { scenes, withNpc };
  for (const f of fs.readdirSync(brainDir).filter((x) => /^ch_\d+_scenes\.json$/.test(x)).sort()) {
    const bag = JSON.parse(fs.readFileSync(path.join(brainDir, f), 'utf8'));
    for (const s of (bag.scenes || [])) {
      scenes += 1;
      if (String(s.prompt || '').includes('NPC 动向（世界层')) { withNpc += 1; chList.push(f.replace('.json', '')); }
    }
  }
  return { scenes, withNpc, seamPct: scenes ? `${Math.round(100 * withNpc / scenes)}%` : 'n/a' };
}

const delta = {
  workDir,
  t2: t2Composition(workDir),
  promptSeam: promptSeam(workDir),
  prose: proseMetrics(chapterProse(workDir)),
  baseline: proseMetrics(fs.readFileSync(baselineMd, 'utf8')),
};
fs.writeFileSync(OUT, JSON.stringify(delta, null, 2));
console.log(JSON.stringify({
  t2: delta.t2,
  promptSeam: delta.promptSeam,
  prose: delta.prose,
  baseline: delta.baseline,
}, null, 2));
console.log('\n→', OUT);
