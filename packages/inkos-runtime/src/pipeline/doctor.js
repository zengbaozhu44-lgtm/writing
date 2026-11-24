/**
 * inkos doctor — 诊断 anchor / lore / prompt / repetition / tension / cost
 */
import fs from 'node:fs';
import path from 'node:path';
import { exists, readJson } from '../../../inkos-core/src/lib/paths.js';
import { loadInkOsConfig } from '../../../inkos-core/src/lib/config.js';
import { brainSystemDir, isBrainEnabled } from '../../../inkos-brain/src/loader.js';
import { loadPriorChapterAnchor } from '../../../inkos-brain/src/planner/planner.js';
import { loadMemoryHierarchy } from '../memory/memory-hierarchy.js';
import { loadChapterAnchor } from '../memory/memory-unit.js';
import { validateHookRotation } from '../../../inkos-director/src/hook-rotation.js';
import { OPTIMIZER_HOOK_FLOOR, resolveLightModel } from './cost-controls.js';

/**
 * @returns {{ ok: boolean, score: number, checks: object[], fixes: string[] }}
 */
export function runDoctor(bookDir, { chapter = null } = {}) {
  const checks = [];
  const fixes = [];
  const cfg = loadInkOsConfig();
  const ch = chapter || detectLatestChapter(bookDir);

  // ── anchor ──
  let anchor = null;
  if (ch) {
    try {
      anchor = loadChapterAnchor(bookDir, ch) || loadPriorChapterAnchor(bookDir, ch, { required: false });
    } catch {
      anchor = null;
    }
  }
  if (!anchor) {
    checks.push({ id: 'anchor', pass: false, detail: `未找到 ch_${pad(ch)}_anchor.yaml` });
    fixes.push('跑完一章 Pipeline 让 MemoryUnit.commit 写出 anchor；或手动补 states/ch_XXXX_anchor.yaml');
  } else {
    const missing = [];
    if (!anchor.voiceDna) missing.push('voiceDna');
    if (!anchor.relationship_state) missing.push('relationship_state');
    if (!anchor.narrative_momentum?.closing_emotion) missing.push('narrative_momentum');
    const bans = anchor.banned_elements || [];
    checks.push({
      id: 'anchor',
      pass: missing.length === 0,
      detail: missing.length
        ? `缺少字段：${missing.join(', ')}`
        : `ok · pov=${anchor.pov} · bans=${bans.length} · voice=${anchor.voiceDna?.id || anchor.voiceDna?.label || '—'}`,
      chapter: ch,
    });
    if (missing.includes('voiceDna')) fixes.push('在 commit 时写入 voiceDna，并确保 Planner applyAnchorConstraints 继承');
    if (missing.includes('narrative_momentum')) fixes.push('commit 时记录 closing_emotion，供下章 Scene1 继承');
  }

  // ── lore ──
  const loreHits = findLoreFiles(bookDir);
  checks.push({
    id: 'lore',
    pass: loreHits.length > 0,
    detail: loreHits.length ? `找到 ${loreHits.length} 个设定文件` : '未找到 story_dna / canon / world 设定',
    files: loreHits.slice(0, 8),
  });
  if (!loreHits.length) fixes.push('补齐 novel/_system 下 story_dna.yaml 或 canon 设定');

  // ── prompt ──
  const promptDir = path.join(brainSystemDir(bookDir), 'prompts');
  const promptCount = exists(promptDir)
    ? fs.readdirSync(promptDir).filter((f) => f.endsWith('.md')).length
    : 0;
  checks.push({
    id: 'prompt',
    pass: true,
    detail: `prompts 目录 ${promptCount} 个文件；Voice DNA 应在 P0 不可裁剪`,
    hint: '若文笔漂移，检查 compile() meta.voiceDnaProtected',
  });

  // ── repetition ──
  const chapterText = ch ? loadChapterText(bookDir, ch) : '';
  const rep = detectRepetition(chapterText);
  checks.push({
    id: 'repetition',
    pass: rep.score < 3,
    detail: rep.hits.length
      ? `疑似重复 ${rep.hits.length} 处：${rep.hits.slice(0, 3).join(' / ')}`
      : '未检出明显 4-gram 复读',
    score: rep.score,
  });
  if (rep.score >= 3) fixes.push('开启 Writer Runtime V2 noRepeat；检查 takeLastTwoSentences 是否生效');

  // ── tension ──
  const plan = ch ? loadScenePlan(bookDir, ch) : null;
  const beats = plan?.scenes?.[0]?.executionPlan?.beats
    || plan?.intent?.scenes?.[0]?.executionPlan?.beats
    || [];
  const tensionOk = beats.length === 0 || beats.every((b) => b.tensionLevel != null);
  const hookRot = beats.length ? validateHookRotation(beats) : { valid: true, sequence: [] };
  checks.push({
    id: 'tension',
    pass: tensionOk && hookRot.valid,
    detail: beats.length
      ? `beats=${beats.length} tension=${tensionOk ? 'ok' : 'missing'} hookRotation=${hookRot.valid ? 'ok' : 'adjacent-dup'}`
      : '无 ExecutionPlan beats（可能尚未跑 Director）',
    hookSequence: hookRot.sequence,
  });
  if (!tensionOk) fixes.push('在 buildSceneExecutionPlan 接入 buildTensionArc / applyTensionArcToBeats');
  if (!hookRot.valid) fixes.push('接入 applyHookTypeRotation，禁止相邻 Beat 同 hookType');

  // ── cost ──
  const light = resolveLightModel(cfg);
  const hierarchy = loadMemoryHierarchy(bookDir);
  const lastCompress = (hierarchy.compressions || []).slice(-1)[0] || null;
  checks.push({
    id: 'cost',
    pass: Boolean(cfg.llm?.apiKey),
    detail: [
      `model=${cfg.llm?.model || '—'}`,
      `lightModel=${light}`,
      `optimizerFloor=${OPTIMIZER_HOOK_FLOOR}`,
      `lastCompress=${lastCompress?.atChapter ?? '—'}`,
      `brain=${isBrainEnabled(bookDir)}`,
    ].join(' · '),
  });
  if (!cfg.llm?.apiKey) fixes.push('配置 INKOS_LLM_API_KEY 或 inkos.json llm.apiKey');
  if (!lastCompress && ch >= 5) fixes.push('每 5 章应触发 memory-hierarchy 压缩；检查 MemoryUnit.commit 是否调用 updateMemoryHierarchy');

  const failed = checks.filter((c) => c.pass === false);
  const score = Math.round(((checks.length - failed.length) / Math.max(1, checks.length)) * 100);

  return {
    version: 'inkos-doctor-1',
    bookDir,
    chapter: ch,
    ok: failed.length === 0,
    score,
    checks,
    fixes: [...new Set(fixes)],
    diagnosedAt: new Date().toISOString(),
  };
}

function pad(n) {
  return String(n || 0).padStart(4, '0');
}

function detectLatestChapter(bookDir) {
  const dir = path.join(bookDir, 'chapters');
  if (!exists(dir)) return 1;
  let max = 0;
  for (const name of fs.readdirSync(dir)) {
    const m = name.match(/^(\d+)_/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max || 1;
}

function findLoreFiles(bookDir) {
  const candidates = [
    'novel/_system/story_dna.yaml',
    'novel/_system/story_dna.yml',
    'novel/_system/canon.yaml',
    'novel/_system/world.yaml',
    'story_dna.yaml',
  ];
  const hits = [];
  for (const rel of candidates) {
    const p = path.join(bookDir, rel);
    if (exists(p)) hits.push(rel);
  }
  const sys = path.join(bookDir, 'novel', '_system');
  if (exists(sys)) {
    for (const name of fs.readdirSync(sys)) {
      if (/dna|canon|world|lore/i.test(name) && !hits.includes(`novel/_system/${name}`)) {
        hits.push(`novel/_system/${name}`);
      }
    }
  }
  return hits;
}

function loadChapterText(bookDir, chapter) {
  const dir = path.join(bookDir, 'chapters');
  if (!exists(dir)) return '';
  const padN = pad(chapter);
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith(`${padN}_`) && name.endsWith('.md')) {
      return fs.readFileSync(path.join(dir, name), 'utf8');
    }
  }
  return '';
}

function loadScenePlan(bookDir, chapter) {
  const file = path.join(brainSystemDir(bookDir), `ch_${pad(chapter)}_plan.json`);
  if (!exists(file)) return null;
  try { return readJson(file); } catch { return null; }
}

function detectRepetition(text = '') {
  const clean = String(text || '').replace(/\s+/g, '');
  const hits = [];
  if (clean.length < 40) return { score: 0, hits };
  const grams = new Map();
  for (let i = 0; i < clean.length - 7; i += 1) {
    const g = clean.slice(i, i + 8);
    grams.set(g, (grams.get(g) || 0) + 1);
  }
  for (const [g, n] of grams) {
    if (n >= 3) hits.push(`${g}×${n}`);
  }
  hits.sort((a, b) => Number(b.split('×')[1]) - Number(a.split('×')[1]));
  return { score: hits.length, hits: hits.slice(0, 8) };
}

export default { runDoctor };
