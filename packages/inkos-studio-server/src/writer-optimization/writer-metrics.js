/**
 * Writer Metrics — 重复率、信息密度、冲突、节奏、Hook、主动性、世界观曝光
 */
import { scoreWorldExposure } from './reveal-manager.js';
import { scoreHookQuality } from './hook-generator.js';

const DEFAULT_THRESHOLDS = {
  repetitionRate: 0.28,
  minConflictScore: 45,
  minHookScore: 40,
  minAgencyScore: 35,
  maxWorldExposure: 0.85,
  minInfoDensity: 0.15,
  maxInfoDensity: 0.55,
};

function ngrams(text, n = 4) {
  const s = String(text || '').replace(/\s/g, '');
  const set = new Set();
  for (let i = 0; i <= s.length - n; i++) set.add(s.slice(i, i + n));
  return set;
}

export function computeRepetitionRate(text, priorText = '') {
  const cur = ngrams(text);
  const prev = ngrams(priorText);
  if (!cur.size || !prev.size) return 0;
  let overlap = 0;
  for (const g of cur) if (prev.has(g)) overlap += 1;
  return overlap / cur.size;
}

export function computeConflictScore(text, scene) {
  const corpus = `${text} ${scene?.conflict || ''} ${scene?.goal || ''}`;
  const markers = [
    /但是|然而|却|尽管|虽然|不得不|必须|威胁|冲突|对抗|阻止|失败|代价/,
    /争|抢|逼|拒|躲|逃|怒|怕|犹豫/,
  ];
  let hits = 0;
  for (const m of markers) if (m.test(corpus)) hits += 1;
  return Math.min(100, hits * 25);
}

export function computeAgencyScore(text) {
  const action = /走|跑|推|拉|说|问|看|转|握|敲|按|选|拒|躲|冲/.test(text);
  const decision = /决定|选择|不再|必须|只能|要不要/.test(text);
  const passive = /被|不得不|只能|无法|动弹不得/.test(text);
  let score = 40;
  if (action) score += 25;
  if (decision) score += 20;
  if (passive) score -= 15;
  return Math.max(0, Math.min(100, score));
}

export function computeRhythmScore(text) {
  const paras = String(text || '').split(/\n{2,}/).filter(Boolean);
  const len = paras.map((p) => p.replace(/\s/g, '').length);
  if (len.length < 2) return 50;
  const avg = len.reduce((a, b) => a + b, 0) / len.length;
  const variance = len.reduce((a, b) => a + (b - avg) ** 2, 0) / len.length;
  const varied = variance > 400;
  const okLen = avg >= 80 && avg <= 400;
  return (varied ? 60 : 40) + (okLen ? 30 : 0);
}

export function computeInfoDensity(text) {
  const t = String(text || '').replace(/\s/g, '');
  if (!t.length) return 0;
  const dialog = (text.match(/[「""].*?[」""]/g) || []).join('').replace(/\s/g, '').length;
  const action = (text.match(/[走跑看听拿转推拉扯]/g) || []).length * 2;
  const lore = (text.match(/设定|世界观|系统|规则|背景|意味着|因此|所以/g) || []).length * 8;
  const narrative = dialog + action;
  const total = narrative + lore + 1;
  return lore / total;
}

export function evaluateWriterMetrics({
  text,
  scene,
  chapter,
  intent,
  priorText = '',
  thresholds = DEFAULT_THRESHOLDS,
}) {
  const repetitionRate = computeRepetitionRate(text, priorText);
  const conflictScore = computeConflictScore(text, scene);
  const hook = scoreHookQuality(text, scene);
  const agencyScore = computeAgencyScore(text);
  const rhythmScore = computeRhythmScore(text);
  const infoDensity = computeInfoDensity(text);
  const world = scoreWorldExposure(text, chapter);

  const failures = [];
  const pov = intent?.pov;
  if (pov && String(text).replace(/\s/g, '').length > 200 && !String(text).includes(pov)) {
    failures.push(`正文未出现 POV 角色「${pov}」`);
  }
  if (repetitionRate > thresholds.repetitionRate) {
    failures.push(`重复率过高 ${(repetitionRate * 100).toFixed(0)}%（>${thresholds.repetitionRate * 100}%）`);
  }
  if (conflictScore < thresholds.minConflictScore) {
    failures.push(`冲突强度不足 ${conflictScore}`);
  }
  if (!hook.pass) failures.push(`Hook 质量不足 ${hook.score}`);
  if (agencyScore < thresholds.minAgencyScore) {
    failures.push(`人物主动性不足 ${agencyScore}`);
  }
  if (world.exposureRate > thresholds.maxWorldExposure) {
    failures.push(`世界观曝光过高 ${(world.exposureRate * 100).toFixed(0)}%`);
  }
  if (infoDensity > thresholds.maxInfoDensity) {
    failures.push(`信息密度过高（解释性内容过多）`);
  }

  const pass = failures.length === 0;
  return {
    pass,
    failures,
    metrics: {
      repetitionRate,
      conflictScore,
      hookScore: hook.score,
      agencyScore,
      rhythmScore,
      infoDensity,
      worldExposureRate: world.exposureRate,
      worldHits: world.worldHits,
    },
    thresholds,
  };
}

export function buildRewriteInstructions(evalResult, boundaries) {
  const lines = [
    '## 重写指令（上一稿未达标，请重写本 Scene）',
    ...evalResult.failures.map((f) => `- ${f}`),
    `- 仍须遵守 Goal：${boundaries?.goal || ''}`,
    `- 在 Hook 处停止：${boundaries?.hook || ''}`,
    '- 禁止重复介绍、禁止总结解释、必须承接续写锚点',
  ];
  return lines.join('\n');
}
