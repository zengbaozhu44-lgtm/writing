/**
 * Chapter Diagnosis — 聚合 trace / AB / readerSim / anchor / plan
 */
import fs from 'node:fs';
import path from 'node:path';
import { exists, readJson } from '../../inkos-core/src/lib/paths.js';
import { brainSystemDir } from '../../inkos-brain/src/loader.js';
import { loadChapterAnchor, loadAbReport, tracesRoot } from '../../inkos-runtime/src/index.js';
import { getChapterText } from './chapter-service.js';
import { loadPlan, loadScenes } from './book-service.js';
import { readStudioPromptMetrics } from './studio-metrics-reader.js';
import {
  checkToneDeviation,
  getChapterStatus,
  loadWizardChapterTone,
  statusLabel as auditStatusLabel,
} from './chapter-audit.js';
import { diagnoseStyleFit } from './style-genebank/index.js';
import { diagnoseStoryMapChapter } from './story-map/store.js';

function pad(n) {
  return String(n || 0).padStart(4, '0');
}

function clampScore(n, fallback = 50) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.max(0, Math.min(100, Math.round(x)));
}

function detectRepetition(text = '') {
  const clean = String(text || '').replace(/\s+/g, '');
  if (clean.length < 40) return { rate: 0, hits: [] };
  const grams = new Map();
  for (let i = 0; i < clean.length - 7; i += 1) {
    const g = clean.slice(i, i + 8);
    grams.set(g, (grams.get(g) || 0) + 1);
  }
  const hits = [];
  let dupChars = 0;
  for (const [g, c] of grams) {
    if (c >= 3) {
      hits.push(`${g}×${c}`);
      dupChars += g.length * (c - 1);
    }
  }
  hits.sort((a, b) => Number(b.split('×')[1]) - Number(a.split('×')[1]));
  const rate = Math.min(1, dupChars / Math.max(1, clean.length));
  return { rate: Math.round(rate * 1000) / 1000, hits: hits.slice(0, 8) };
}

function loadLatestTrace(bookDir, chapter) {
  const root = tracesRoot(bookDir);
  if (!exists(root)) return null;
  const prefix = `tr_ch${pad(chapter)}_`;
  let latest = null;
  let latestMtime = 0;
  for (const name of fs.readdirSync(root)) {
    if (!name.startsWith(prefix)) continue;
    const metaPath = path.join(root, name, 'trace.json');
    if (!exists(metaPath)) continue;
    try {
      const st = fs.statSync(metaPath);
      if (st.mtimeMs >= latestMtime) {
        latestMtime = st.mtimeMs;
        latest = { dir: path.join(root, name), meta: readJson(metaPath) };
      }
    } catch { /* skip */ }
  }
  if (!latest) return null;

  const beats = [];
  for (const b of latest.meta.beats || []) {
    const full = path.join(latest.dir, b.file);
    let data = {};
    try { data = exists(full) ? readJson(full) : {}; } catch { /* */ }
    beats.push({
      sceneIndex: b.sceneIndex,
      beatOrder: b.beatOrder,
      libraryBeat: b.libraryBeat || data.libraryBeat || null,
      hookType: b.hookType || data.hookType || null,
      tensionLevel: b.tensionLevel ?? data.tensionLevel ?? null,
      craftMode: b.craftMode || data.craftMode || null,
      chars: b.chars ?? data.chars ?? null,
      pass: b.pass ?? data.validation?.pass ?? null,
      issues: collectBeatIssues(data),
      validation: data.validation || data.v2 || null,
    });
  }
  return {
    traceId: latest.meta.traceId,
    htmlPath: latest.meta.htmlPath || path.join(latest.dir, 'debug.html'),
    pass: latest.meta.pass,
    beats,
  };
}

function collectBeatIssues(data = {}) {
  const issues = [];
  const v = data.validation || data.v2 || {};
  if (v.pass === false) {
    for (const r of v.failReasons || []) issues.push(String(r));
    if (v.stateChange === false) issues.push('状态未变化');
    if (v.noRepeat === false) issues.push('疑似重复');
  }
  if (data.hookType && /weak|弱/i.test(String(data.score?.hook || ''))) {
    issues.push('钩子偏弱');
  }
  return [...new Set(issues)].slice(0, 6);
}

function loadReaderSimSample(bookDir, chapter) {
  const file = path.join(brainSystemDir(bookDir), 'reader_sim_baseline.json');
  if (!exists(file)) return null;
  try {
    const data = readJson(file);
    const samples = (data.samples || []).filter((s) => Number(s.chapter) === Number(chapter));
    return samples.at(-1) || null;
  } catch {
    return null;
  }
}

function loadBrainRunLog(bookDir, chapter) {
  const file = path.join(brainSystemDir(bookDir), `ch_${pad(chapter)}_run.json`);
  if (!exists(file)) return null;
  try { return readJson(file); } catch { return null; }
}

/**
 * @returns {import('./diagnosis-types').ChapterDiagnosis}
 */
export function buildChapterDiagnosis(bookDir, chapter) {
  const ch = Number(chapter) || 1;
  const meta = getChapterText(bookDir, ch);
  const text = meta.text || '';
  const chars = text.replace(/\s/g, '').length;
  const repetition = detectRepetition(text);
  const anchor = loadChapterAnchor(bookDir, ch);
  const plan = loadPlan(bookDir, ch);
  const scenes = loadScenes(bookDir, ch);
  const abReport = loadAbReport(bookDir, ch);
  const trace = loadLatestTrace(bookDir, ch);
  const readerSample = loadReaderSimSample(bookDir, ch);
  const runLog = loadBrainRunLog(bookDir, ch);
  const promptMetrics = (() => {
    try { return readStudioPromptMetrics(bookDir, ch); } catch { return null; }
  })();

  // beats：优先 Trace，否则从 scenes.executionPlan 推断
  let beats = trace?.beats || [];
  if (!beats.length) {
    const planBeats = scenes?.[0]?.executionPlan?.beats
      || plan?.intent?.scenes?.[0]?.executionPlan?.beats
      || [];
    beats = planBeats.map((b, i) => ({
      sceneIndex: 1,
      beatOrder: b.order ?? i + 1,
      libraryBeat: b.libraryBeat || null,
      hookType: b.hookType || null,
      tensionLevel: b.tensionLevel ?? null,
      craftMode: b.craftMode || null,
      chars: null,
      pass: null,
      issues: [],
      validation: null,
    }));
  }

  // 启发式：正文尾部钩子弱
  const tail = text.slice(-400);
  const weakHook = chars > 200 && !/[？?]|倒计时|必须|来不及|门|系统/u.test(tail);
  if (weakHook && beats.length) {
    const last = beats[beats.length - 1];
    if (!last.issues.includes('钩子弱')) last.issues = [...(last.issues || []), '钩子弱'];
  }

  const hookScore = readerSample?.hookScore
    ?? runLog?.readerSimulator?.hookScore
    ?? (weakHook ? 4 : 7);
  const avgTemp = promptMetrics?.aggregate?.avgTemperature ?? null;

  const suggestions = [];
  if (repetition.rate >= 0.08) {
    suggestions.push({
      id: 'fix-repetition',
      severity: 'high',
      text: `重复率 ${(repetition.rate * 100).toFixed(1)}%，建议删减复读或开启 V2 noRepeat`,
      action: 'open-metrics',
    });
  }
  if (hookScore < 7) {
    suggestions.push({
      id: 'boost-hook',
      severity: 'high',
      text: `追读分 ${hookScore} < 7，建议加强章末钩子或触发 Optimizer`,
      action: 'open-director',
    });
  }
  if (!anchor?.voiceDna) {
    suggestions.push({
      id: 'missing-voice',
      severity: 'medium',
      text: '缺少 Voice DNA Anchor，下章文笔可能漂移',
      action: 'open-memory',
    });
  }
  if (!anchor?.narrative_momentum?.closing_emotion) {
    suggestions.push({
      id: 'missing-momentum',
      severity: 'medium',
      text: '缺少 closing_emotion，下章 Scene1 无法继承情绪',
      action: 'open-memory',
    });
  }
  const failedBeats = beats.filter((b) => b.pass === false || (b.issues || []).length);
  if (failedBeats.length) {
    suggestions.push({
      id: 'beat-issues',
      severity: 'high',
      text: `${failedBeats.length} 个 Beat 存在状态/重复/钩子问题`,
      action: 'focus-beat',
    });
  }
  if (chars > 0 && chars < 800) {
    suggestions.push({
      id: 'too-short',
      severity: 'low',
      text: `正文仅 ${chars} 字，可能未写满`,
      action: 'generate',
    });
  }
  if (!text.trim()) {
    suggestions.push({
      id: 'empty',
      severity: 'high',
      text: '本章尚无正文',
      action: 'generate',
    });
  }

  // overallScore：追读 40% + 低重复 25% + Beat 通过 20% + 字数健康 15%
  const hookPart = (Math.min(10, Math.max(0, Number(hookScore) || 5)) / 10) * 40;
  const repPart = (1 - Math.min(1, repetition.rate * 4)) * 25;
  const beatPassRate = beats.length
    ? beats.filter((b) => b.pass !== false && !(b.issues || []).length).length / beats.length
    : (text.trim() ? 0.7 : 0);
  const beatPart = beatPassRate * 20;
  const lenPart = chars <= 0 ? 0 : chars < 800 ? 6 : chars > 6000 ? 10 : 15;
  const overallScore = clampScore(hookPart + repPart + beatPart + lenPart, 0);

  const level = overallScore >= 75 ? 'green' : overallScore >= 50 ? 'yellow' : 'red';

  return {
    version: 'chapter-diagnosis-1',
    chapter: ch,
    title: meta.title || '',
    overallScore,
    level,
    chars,
    metrics: {
      hookScore: Number(hookScore) || null,
      repetitionRate: repetition.rate,
      chars,
      temperature: avgTemp,
      beatCount: beats.length,
      softFail: Boolean(readerSample?.softFail),
    },
    readerSim: readerSample || runLog?.readerSimulator || null,
    abReport: abReport
      ? {
        invalidTest: abReport.report?.invalidTest ?? abReport.invalidTest,
        winner: abReport.report?.winner ?? abReport.winner,
        reason: abReport.report?.reason || null,
      }
      : null,
    anchor: anchor
      ? {
        pov: anchor.pov,
        location: anchor.location,
        hasVoiceDna: Boolean(anchor.voiceDna),
        closingEmotion: anchor.narrative_momentum?.closing_emotion || null,
        bannedCount: (anchor.banned_elements || []).length,
      }
      : null,
    plan: plan
      ? {
        mainGoal: plan.intent?.mainGoal || plan.goal || null,
        sceneCount: plan.intent?.scenes?.length || scenes?.length || 0,
      }
      : null,
    beats,
    trace: trace
      ? { traceId: trace.traceId, htmlPath: trace.htmlPath, pass: trace.pass }
      : null,
    suggestions,
    repetitionHits: repetition.hits,
    diagnosedAt: new Date().toISOString(),
    chapterTone: (() => {
      try {
        return loadWizardChapterTone(bookDir, ch);
      } catch {
        return null;
      }
    })(),
    toneDeviation: (() => {
      try {
        const tone = loadWizardChapterTone(bookDir, ch);
        return checkToneDeviation(text, tone);
      } catch {
        return null;
      }
    })(),
    auditStatus: (() => {
      try {
        return getChapterStatus(bookDir, ch);
      } catch {
        return null;
      }
    })(),
    styleFit: (() => {
      try {
        return diagnoseStyleFit(bookDir, text);
      } catch {
        return null;
      }
    })(),
    storyMap: (() => {
      try {
        const anchorPov = anchor?.pov || '';
        return diagnoseStoryMapChapter(bookDir, ch, {
          actualPov: anchorPov,
          chapterText: text,
        });
      } catch {
        return null;
      }
    })(),
  };
}

/** 轻量章列表健康摘要（Home 徽章） */
export function listChapterHealth(bookDir, chapters = []) {
  return chapters.map((c) => {
    const n = c.number ?? c;
    let auditStatus = null;
    try {
      auditStatus = getChapterStatus(bookDir, n);
    } catch { /* */ }
    try {
      const d = buildChapterDiagnosis(bookDir, n);
      return {
        chapter: n,
        title: c.title || d.title || '',
        overallScore: d.overallScore,
        level: d.level,
        hookScore: d.metrics.hookScore,
        hasText: Boolean(d.chars),
        auditStatus,
        auditLabel: auditStatus ? auditStatusLabel(auditStatus) : '',
      };
    } catch {
      return {
        chapter: n,
        title: c.title || '',
        overallScore: 0,
        level: 'red',
        hookScore: null,
        hasText: Boolean(c.hasText),
        auditStatus,
        auditLabel: auditStatus ? auditStatusLabel(auditStatus) : '',
      };
    }
  });
}

export default { buildChapterDiagnosis, listChapterHealth };
