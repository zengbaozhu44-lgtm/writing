/**
 * Chapter Reader Simulator — Validation 后轻量追读诊断
 * softFail（hookScore < 动态阈值 或 dragSections 非空）→ 触发 Optimizer，不硬拦章提交
 *
 * 加固：JSON 正则降级 / 历史基准线阈值 / 可选双评审员取保守分
 */
import fs from 'node:fs';
import path from 'node:path';
import { chatCompletion } from '../../../inkos-brain/src/writer/llm-writer.js';
import { loadInkOsConfig } from '../../../inkos-core/src/lib/config.js';
import { brainSystemDir } from '../../../inkos-brain/src/loader.js';
import { exists, readJson, writeJson } from '../../../inkos-core/src/lib/paths.js';
import { runWriterOptimizer } from '@inkos/writer-optimizer';

const SYSTEM = [
  '你是网文读者模拟器。只根据正文判断追读动力。',
  '只输出 JSON，不要 markdown 代码块，不要解释。',
  '字段：summary(string), hookScore(0-10 整数), dragSections(string[] 拖戏/注水片段原文摘录，可空数组)。',
].join('\n');

const DEFAULT_HOOK_FLOOR = 6;
const BASELINE_WINDOW = 8;

/**
 * @returns {Promise<{
 *   summary: string,
 *   hookScore: number,
 *   dragSections: string[],
 *   softFail: boolean,
 *   threshold?: number,
 *   baseline?: object,
 *   reviewers?: object[],
 *   raw?: string,
 *   error?: string,
 * }>}
 */
export async function runChapterReaderSimulator(chapterText = '', {
  model = null,
  temperature = 0.3,
  maxTokens = 500,
  bookDir = null,
  chapter = null,
  dualReviewer = true,
  secondTemperature = 0.7,
} = {}) {
  const text = String(chapterText || '').trim();
  if (!text) {
    return {
      summary: '',
      hookScore: 0,
      dragSections: ['（正文为空）'],
      softFail: true,
      threshold: DEFAULT_HOOK_FLOOR,
      error: 'empty-text',
    };
  }

  const baseline = loadHookBaseline(bookDir);
  const threshold = computeDynamicHookThreshold(baseline);

  const config = loadInkOsConfig().llm;
  if (!config.apiKey) {
    const heuristic = heuristicReaderSim(text, threshold);
    return { ...heuristic, baseline, threshold, degraded: true, error: 'no-api-key' };
  }

  try {
    const excerpt = text.length > 6000
      ? `${text.slice(0, 3500)}\n…\n${text.slice(-2000)}`
      : text;

    const reviewers = [];
    const primary = await callReviewer({
      config,
      model,
      excerpt,
      temperature,
      maxTokens,
      label: 'primary',
    });
    reviewers.push(primary);

    if (dualReviewer) {
      const secondary = await callReviewer({
        config,
        model,
        excerpt,
        temperature: secondTemperature,
        maxTokens,
        label: 'secondary',
      });
      reviewers.push(secondary);
    }

    const merged = mergeConservativeReviewers(reviewers, threshold);
    const result = {
      ...merged,
      baseline,
      threshold,
      reviewers: reviewers.map((r) => ({
        label: r.label,
        temperature: r.temperature,
        hookScore: r.hookScore,
        dragCount: r.dragSections?.length || 0,
        parseMode: r.parseMode,
      })),
      model: model || config.model,
      dualReviewer: Boolean(dualReviewer),
    };

    if (bookDir && chapter != null) {
      persistHookSample(bookDir, chapter, result);
    }
    return result;
  } catch (err) {
    const heuristic = heuristicReaderSim(text, threshold);
    return {
      ...heuristic,
      baseline,
      threshold,
      softFail: heuristic.softFail,
      degraded: true,
      error: err?.message || String(err),
    };
  }
}

async function callReviewer({
  config,
  model,
  excerpt,
  temperature,
  maxTokens,
  label,
}) {
  const result = await chatCompletion({
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    model: model || config.model || 'deepseek-chat',
    messages: [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: `请评估下列章节正文的追读力，输出 JSON：\n\n${excerpt}`,
      },
    ],
    maxTokens,
    temperature,
  });
  const parsed = parseSimulatorJson(result.content);
  return {
    label,
    temperature,
    summary: String(parsed.summary || '').slice(0, 400),
    hookScore: clampScore(parsed.hookScore),
    dragSections: Array.isArray(parsed.dragSections)
      ? parsed.dragSections.map((s) => String(s).trim()).filter(Boolean).slice(0, 8)
      : [],
    parseMode: parsed._parseMode || 'json',
    raw: result.content,
  };
}

/** 取保守分：最低 hookScore + 合并 dragSections */
export function mergeConservativeReviewers(reviewers = [], threshold = DEFAULT_HOOK_FLOOR) {
  const ok = reviewers.filter((r) => r && Number.isFinite(r.hookScore));
  if (!ok.length) {
    return {
      summary: '',
      hookScore: 0,
      dragSections: [],
      softFail: true,
      conservative: true,
    };
  }
  const hookScore = Math.min(...ok.map((r) => r.hookScore));
  const dragMap = new Map();
  for (const r of ok) {
    for (const d of r.dragSections || []) {
      const key = d.slice(0, 40);
      if (!dragMap.has(key)) dragMap.set(key, d);
    }
  }
  const dragSections = [...dragMap.values()].slice(0, 8);
  const summary = ok
    .map((r) => r.summary)
    .filter(Boolean)
    .sort((a, b) => a.length - b.length)[0] || '';
  return {
    summary: String(summary).slice(0, 400),
    hookScore,
    dragSections,
    softFail: hookScore < threshold || dragSections.length > 0,
    conservative: ok.length > 1,
    raw: ok.map((r) => r.raw).filter(Boolean).join('\n---\n'),
  };
}

/**
 * softFail 时触发章级 Optimizer（尽量修 drag / 抬钩子）
 */
export async function polishChapterAfterReaderSim(chapterText, sim = {}, {
  scene = {},
  chapter = null,
  intent = {},
  bookDir = null,
} = {}) {
  const config = loadInkOsConfig().llm;
  const polishFn = config.apiKey
    ? async (module, fragment, instructions) => {
      const res = await chatCompletion({
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        model: config.model,
        messages: [
          {
            role: 'system',
            content: [
              `你是小说 ${module} 局部优化器。`,
              '禁止改变剧情事实与人物关系结论。',
              '只输出优化后的片段正文。',
            ].join('\n'),
          },
          {
            role: 'user',
            content: [
              instructions,
              sim.summary ? `读者摘要：${sim.summary}` : '',
              sim.dragSections?.length
                ? `拖戏片段提示：${sim.dragSections.slice(0, 3).join(' / ')}`
                : '',
              `hookScore=${sim.hookScore}（阈值 ${sim.threshold ?? DEFAULT_HOOK_FLOOR}），请加强章末钩子与删注水。`,
              '',
              `【待优化片段 · ${module}】\n${fragment}`,
            ].filter(Boolean).join('\n'),
          },
        ],
        maxTokens: Math.min(900, config.maxTokens || 900),
        temperature: 0.5,
      });
      return res.content;
    }
    : null;

  const optimized = await runWriterOptimizer({
    text: chapterText,
    scene: { ...scene, index: scene.index || 1 },
    chapter,
    intent,
    bookDir,
    polishFn,
  });

  return {
    text: optimized.polishedText || optimized.text || chapterText,
    optimizer: {
      total: optimized.total,
      polishChanged: Boolean(optimized.polish?.changed),
      reportPath: optimized.reportPath || null,
    },
    triggeredBy: 'reader-simulator-softFail',
  };
}

/**
 * JSON 解析容错：标准 parse → 截取对象 → 正则字段降级
 */
export function parseSimulatorJson(raw = '') {
  const text = String(raw || '').trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');

  try {
    const obj = JSON.parse(text);
    return { ...normalizeParsed(obj), _parseMode: 'json' };
  } catch { /* fallthrough */ }

  const m = text.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      const obj = JSON.parse(m[0]);
      return { ...normalizeParsed(obj), _parseMode: 'json-slice' };
    } catch { /* fallthrough */ }
  }

  // 正则降级提取
  const hookMatch = text.match(/hookScore["'\s:=]+(\d+(?:\.\d+)?)/i)
    || text.match(/钩子[分得]?[：:=\s]*(\d+(?:\.\d+)?)/u)
    || text.match(/\b([0-9]|10)\s*\/\s*10\b/);
  const summaryMatch = text.match(/summary["'\s:=]+["']([^"']{4,200})["']/i)
    || text.match(/摘要[：:]\s*(.{4,200})/);
  const dragBlock = text.match(/dragSections["'\s:=]+\[([\s\S]*?)\]/i);
  const dragSections = [];
  if (dragBlock) {
    const parts = dragBlock[1].match(/["']([^"']{2,120})["']/g) || [];
    for (const p of parts) {
      dragSections.push(p.replace(/^["']|["']$/g, '').trim());
    }
  }

  return {
    summary: summaryMatch ? String(summaryMatch[1]).trim().slice(0, 400) : text.slice(0, 200),
    hookScore: hookMatch ? Number(hookMatch[1]) : 5,
    dragSections: dragSections.slice(0, 8),
    _parseMode: 'regex-fallback',
  };
}

function normalizeParsed(obj = {}) {
  return {
    summary: obj.summary ?? '',
    hookScore: obj.hookScore ?? obj.hook_score ?? obj.score ?? 5,
    dragSections: obj.dragSections ?? obj.drag_sections ?? obj.drags ?? [],
  };
}

export function loadHookBaseline(bookDir) {
  if (!bookDir) {
    return { samples: [], mean: null, median: null, count: 0 };
  }
  const file = path.join(brainSystemDir(bookDir), 'reader_sim_baseline.json');
  if (!exists(file)) return { samples: [], mean: null, median: null, count: 0 };
  try {
    const data = readJson(file);
    const samples = (data.samples || [])
      .map((s) => Number(s.hookScore))
      .filter((n) => Number.isFinite(n));
    return summarizeBaseline(samples, data.samples || []);
  } catch {
    return { samples: [], mean: null, median: null, count: 0 };
  }
}

function summarizeBaseline(scores = [], rawSamples = []) {
  if (!scores.length) {
    return { samples: rawSamples, mean: null, median: null, count: 0 };
  }
  const sorted = [...scores].sort((a, b) => a - b);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
  return {
    samples: rawSamples,
    mean: Math.round(mean * 10) / 10,
    median: Math.round(median * 10) / 10,
    count: scores.length,
  };
}

/**
 * 动态阈值：有足够历史时用 max(5, round(median - 0.5))，否则默认 6
 */
export function computeDynamicHookThreshold(baseline = {}) {
  if (!baseline || baseline.count < 3 || baseline.median == null) {
    return DEFAULT_HOOK_FLOOR;
  }
  const dynamic = Math.round(baseline.median - 0.5);
  return Math.max(5, Math.min(DEFAULT_HOOK_FLOOR, dynamic));
}

function persistHookSample(bookDir, chapter, result) {
  const file = path.join(brainSystemDir(bookDir), 'reader_sim_baseline.json');
  let data = { version: 'reader-sim-baseline-1', samples: [] };
  if (exists(file)) {
    try { data = readJson(file); } catch { /* reset */ }
  }
  const samples = Array.isArray(data.samples) ? data.samples : [];
  samples.push({
    chapter: Number(chapter),
    hookScore: result.hookScore,
    softFail: result.softFail,
    threshold: result.threshold,
    at: new Date().toISOString(),
  });
  // 只保留最近窗口
  data.samples = samples.slice(-Math.max(BASELINE_WINDOW * 3, 24));
  data.updatedAt = new Date().toISOString();
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    writeJson(file, data);
  } catch { /* ignore persist errors */ }
}

function clampScore(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 5;
  return Math.max(0, Math.min(10, Math.round(x)));
}

function heuristicReaderSim(text = '', threshold = DEFAULT_HOOK_FLOOR) {
  const chars = text.replace(/\s/g, '').length;
  const tail = text.slice(-500);
  let hookScore = 5;
  if (/[？?]/u.test(tail)) hookScore += 1;
  if (/倒计时|消失|系统|异常|必须|来不及/u.test(tail)) hookScore += 2;
  if (chars < 800) hookScore -= 2;
  const dragSections = [];
  const longEnv = text.match(/[^「」""]{80,}?[风光线天空云雨街道]/u);
  if (longEnv) dragSections.push(longEnv[0].slice(0, 60));
  hookScore = clampScore(hookScore);
  return {
    summary: `启发式评估：约 ${chars} 字`,
    hookScore,
    dragSections,
    softFail: hookScore < threshold || dragSections.length > 0,
  };
}

export default {
  runChapterReaderSimulator,
  polishChapterAfterReaderSim,
  parseSimulatorJson,
  mergeConservativeReviewers,
  computeDynamicHookThreshold,
  loadHookBaseline,
};
