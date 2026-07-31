/**
 * Reader Curve — Hook / Mystery / Payoff 曲线分析与章级报告
 * Chapter Review 输出 Reader Addiction 指标 + nextChapterGuidance
 */
import { charCount, splitCheckpoints } from './utils.js';

const HOOK_MARKERS = /[？?]|吗[？?]?$|呢[？?]?$|能否|会不会|到底|究竟|要不要|难道|突然|猛地|愣住|停住|沉默|抉择|未|还|仍/u;
const QUESTION_MARKERS = /[？?]|谁|什么|为什么|为何|怎么|如何|能否|会不会|到底|究竟|难道|是不是|会不会|要不要/u;
const PAYOFF_MARKERS = /原来|终于|意味着|证实|揭晓|兑现|呼应|回收|答案|真相|明白了|难怪|怪不得|正如|早就/u;
const TWIST_MARKERS = /却|然而|没想到|竟然|居然|反而|竟是|不是.*而是|身份|反转|翻盘|反杀/u;

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

/** 章级规划曲线 — 按 Scene 数生成目标强度 */
export function buildChapterCurvePlan(intent = {}, chapter = null, sceneCount = 4) {
  const n = Math.max(sceneCount || intent.scenes?.length || 4, 1);
  const hookCurve = [];
  const mysteryCurve = [];
  const payoffCurve = [];

  for (let i = 0; i < n; i += 1) {
    const t = n <= 1 ? 1 : i / (n - 1);
    const isLast = i === n - 1;
    hookCurve.push({
      sceneIndex: i + 1,
      target: clamp(isLast ? 95 : 45 + t * 40),
      note: isLast ? '章尾 Hook 峰值' : i === 0 ? '开篇抓人' : '递进悬念',
    });
    mysteryCurve.push({
      sceneIndex: i + 1,
      target: clamp(35 + t * 50 + (i % 2 === 1 ? 8 : 0)),
      note: isLast ? '悬念未全解' : '埋设/加深疑问',
    });
    payoffCurve.push({
      sceneIndex: i + 1,
      target: clamp(isLast ? 25 : 30 + t * 35),
      note: isLast ? '留待下章回收' : i >= Math.floor(n / 2) ? '部分兑现' : '伏笔铺设',
    });
  }

  return {
    chapter,
    sceneCount: n,
    hookCurve,
    mysteryCurve,
    payoffCurve,
    readerAddictionGoal: intent.readerAddiction || '让读者无法放下 — 每 Scene 制造追问与期待',
  };
}

function segmentIntensity(text, markers, per500Weight = 28) {
  const len = Math.max(charCount(text), 1);
  const hits = (text.match(new RegExp(markers.source, 'gu')) || []).length;
  const windows = splitCheckpoints(text, 400);
  const windowHits = windows.filter((w) => markers.test(w.text)).length;
  const density = (hits / len) * 500 * per500Weight + (windowHits / Math.max(windows.length, 1)) * 22;
  return clamp(38 + density);
}

/** Scene 实测曲线采样点 */
export function analyzeSceneReaderCurves(text = '') {
  const body = String(text || '').trim();
  const windows = splitCheckpoints(body, 350);
  const hookPoints = [];
  const mysteryPoints = [];
  const payoffPoints = [];

  for (const w of windows) {
    const offset = w.index;
    hookPoints.push({ offset, value: segmentIntensity(w.text, HOOK_MARKERS, 26) });
    mysteryPoints.push({ offset, value: segmentIntensity(w.text, QUESTION_MARKERS, 24) });
    payoffPoints.push({ offset, value: segmentIntensity(w.text, PAYOFF_MARKERS, 30) });
  }

  const tail = body.replace(/\s/g, '').slice(-150);
  const tailHook = HOOK_MARKERS.test(tail) ? 18 : -8;
  const tailMystery = QUESTION_MARKERS.test(tail) ? 15 : -5;

  const avg = (pts) => (pts.length
    ? Math.round(pts.reduce((s, p) => s + p.value, 0) / pts.length)
    : 55);

  return {
    hookCurve: hookPoints,
    mysteryCurve: mysteryPoints,
    payoffCurve: payoffPoints,
    summary: {
      hookAvg: clamp(avg(hookPoints) + tailHook),
      mysteryAvg: clamp(avg(mysteryPoints) + tailMystery),
      payoffAvg: avg(payoffPoints),
      twistHits: (body.match(new RegExp(TWIST_MARKERS.source, 'gu')) || []).length,
    },
  };
}

/** 分析曲线是否递进（Hook 越来越强 / Mystery 越来越深） */
function analyzeCurveProgression(series = []) {
  const actuals = series
    .map((s) => ({ sceneIndex: s.sceneIndex, value: s.actual }))
    .filter((s) => s.value != null);
  if (actuals.length < 2) {
    return { increasing: null, start: actuals[0]?.value ?? null, end: actuals[actuals.length - 1]?.value ?? null };
  }
  let dips = 0;
  for (let i = 1; i < actuals.length; i += 1) {
    if (actuals[i].value < actuals[i - 1].value - 8) dips += 1;
  }
  return {
    increasing: dips === 0,
    dips,
    start: actuals[0].value,
    end: actuals[actuals.length - 1].value,
    delta: actuals[actuals.length - 1].value - actuals[0].value,
  };
}

/** Reader Addiction Score — 四维加权综合 */
export function computeReaderAddictionScore(averages = {}) {
  const weights = {
    hookDensity: 0.28,
    questionDensity: 0.24,
    payoffDensity: 0.22,
    readerCuriosity: 0.26,
  };
  let score = 0;
  let weight = 0;
  for (const [key, wgt] of Object.entries(weights)) {
    if (averages[key] != null) {
      score += averages[key] * wgt;
      weight += wgt;
    }
  }
  return weight ? clamp(score / weight) : null;
}

/** 生成「读者为什么会继续看」摘要 */
export function buildReaderWhyContinueSummary(averages = {}, curveTrends = {}) {
  const parts = [];
  if (averages.hookDensity != null) {
    parts.push(`Hook 密度 ${averages.hookDensity} — ${curveTrends.hook?.increasing ? '递进良好' : '须加强章尾峰值'}`);
  }
  if (averages.questionDensity != null) {
    parts.push(`追问深度 ${averages.questionDensity} — ${curveTrends.mystery?.increasing !== false ? '悬念持续' : '疑问断档'}`);
  }
  if (averages.payoffDensity != null) {
    parts.push(`伏笔兑现 ${averages.payoffDensity} — ${averages.payoffDensity >= 55 ? '有回响' : '回收不足'}`);
  }
  if (averages.readerCuriosity != null) {
    parts.push(`追读动力 ${averages.readerCuriosity} — ${averages.readerCuriosity >= 72 ? '读者想翻页' : '驱动力偏弱'}`);
  }
  return parts.join('；') || '维持 Hook 递进与悬念-回收节奏';
}

function buildNextChapterGuidance({
  hookSeries,
  mysterySeries,
  payoffSeries,
  averages,
  curveTrends,
  avgCuriosity,
  avgTwist,
}) {
  const guidance = [];

  const hookTrend = curveTrends.hook;
  if (hookTrend?.increasing === false) {
    guidance.push('Hook Curve 未递进 — 下一章逐 Scene 强化悬念，末 Scene 须为章内峰值');
  }
  const lastHook = hookSeries[hookSeries.length - 1];
  if (lastHook?.actual != null && lastHook.actual < 70) {
    guidance.push('章尾 Hook 不足 — 下一章开篇须用未完成动作/致命追问承接');
  }
  if (hookTrend?.end != null && hookTrend.end < hookTrend.start) {
    guidance.push('Hook 强度回落 — 下一章开篇 Hook 须高于上章末 Scene');
  }

  const mysteryTrend = curveTrends.mystery;
  if (mysteryTrend?.increasing === false) {
    guidance.push('Mystery Curve 断档 — 下一章须加深核心追问，禁止过早全解');
  }
  if (averages.questionDensity != null && averages.questionDensity < 65) {
    guidance.push('疑问密度偏低 — 下一章每 Scene 至少留一个未答问题');
  }

  const payoffGap = payoffSeries.filter((p) => p.actual != null && p.actual < 55);
  if (payoffGap.length >= Math.ceil(payoffSeries.length / 2)) {
    guidance.push('Payoff 兑现不足 — 下一章须回收本章伏笔，给读者「原来如此」');
  }
  if (mysteryTrend?.end >= 70 && (payoffSeries[payoffSeries.length - 1]?.actual ?? 0) < 60) {
    guidance.push('悬念已拉高但回收不足 — 下一章须部分揭晓或误导反转');
  }

  if (avgCuriosity != null && avgCuriosity < 72) {
    guidance.push(`阅读驱动力 ${avgCuriosity}/100 偏低 — 下一章增加代价逼近与不可逆选择`);
  }
  if (avgTwist != null && avgTwist < 68) {
    guidance.push('反转力度不足 — 下一章安排预期违背或信息翻盘');
  }

  if (!guidance.length) {
    guidance.push('读者曲线健康 — 下一章维持 Hook 递进、Mystery 加深、Payoff 持续兑现');
  }

  return guidance;
}

/** 章级 Reader Curve Report — 指导下一章 Director */
export function buildReaderCurveReport(sceneReports = [], { chapter = null, curvePlan = null } = {}) {
  const scenes = sceneReports.map((r) => ({
    sceneIndex: r.scene?.index ?? r.sceneIndex,
    scores: r.scores || {},
    readerCurves: r.readerCurves || null,
    verdict: r.verdict,
  }));

  const hookSeries = scenes.map((s) => ({
    sceneIndex: s.sceneIndex,
    actual: s.scores?.hookDensity ?? s.readerCurves?.summary?.hookAvg ?? null,
    target: curvePlan?.hookCurve?.find((p) => p.sceneIndex === s.sceneIndex)?.target ?? null,
  }));

  const mysterySeries = scenes.map((s) => ({
    sceneIndex: s.sceneIndex,
    actual: s.scores?.questionDensity ?? s.readerCurves?.summary?.mysteryAvg ?? null,
    target: curvePlan?.mysteryCurve?.find((p) => p.sceneIndex === s.sceneIndex)?.target ?? null,
  }));

  const payoffSeries = scenes.map((s) => ({
    sceneIndex: s.sceneIndex,
    actual: s.scores?.payoffDensity ?? s.readerCurves?.summary?.payoffAvg ?? null,
    target: curvePlan?.payoffCurve?.find((p) => p.sceneIndex === s.sceneIndex)?.target ?? null,
  }));

  const curiosityVals = scenes.map((s) => s.scores?.readerCuriosity).filter((v) => v != null);
  const twistVals = scenes.map((s) => s.scores?.twistStrength).filter((v) => v != null);
  const avgCuriosity = curiosityVals.length
    ? Math.round(curiosityVals.reduce((a, b) => a + b, 0) / curiosityVals.length)
    : null;
  const avgTwist = twistVals.length
    ? Math.round(twistVals.reduce((a, b) => a + b, 0) / twistVals.length)
    : null;

  const hookDensity = hookSeries.filter((h) => h.actual != null).length
    ? Math.round(hookSeries.reduce((s, h) => s + (h.actual || 0), 0) / hookSeries.filter((h) => h.actual != null).length)
    : null;
  const questionDensity = mysterySeries.filter((m) => m.actual != null).length
    ? Math.round(mysterySeries.reduce((s, m) => s + (m.actual || 0), 0) / mysterySeries.filter((m) => m.actual != null).length)
    : null;
  const payoffDensity = payoffSeries.filter((p) => p.actual != null).length
    ? Math.round(payoffSeries.reduce((s, p) => s + (p.actual || 0), 0) / payoffSeries.filter((p) => p.actual != null).length)
    : null;

  const averages = {
    readerCuriosity: avgCuriosity,
    twistStrength: avgTwist,
    hookDensity,
    questionDensity,
    payoffDensity,
  };

  const curveTrends = {
    hook: analyzeCurveProgression(hookSeries),
    mystery: analyzeCurveProgression(mysterySeries),
    payoff: analyzeCurveProgression(payoffSeries),
  };

  const readerAddictionScore = computeReaderAddictionScore(averages);
  const nextChapterGuidance = buildNextChapterGuidance({
    hookSeries,
    mysterySeries,
    payoffSeries,
    averages,
    curveTrends,
    avgCuriosity,
    avgTwist,
  });
  const readerWhyContinue = buildReaderWhyContinueSummary(averages, curveTrends);

  return {
    version: 'reader-curve-2',
    chapter,
    readerAddictionScore,
    hookDensity,
    questionDensity,
    payoffDensity,
    readerCuriosity: avgCuriosity,
    hookCurve: hookSeries,
    mysteryCurve: mysterySeries,
    payoffCurve: payoffSeries,
    curveTrends,
    averages,
    readerWhyContinue,
    nextChapterGuidance,
    generatedAt: new Date().toISOString(),
  };
}
