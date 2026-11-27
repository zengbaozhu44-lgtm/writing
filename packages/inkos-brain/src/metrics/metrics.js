/**
 * Narrative Metrics — 叙事指标 Dashboard
 */
import { exists, readJson, writeJson } from '../../../inkos-core/src/lib/paths.js';
// 3a: 句级口径共享工具（与 eval-narrative / causal-gate 同源）
import { classifySentences, computeDragSpan } from './sentence-utils.js';

export function computeMetrics(chapterText, intent, scenes, conflictResult) {
  const text = chapterText || '';
  const chars = text.replace(/\s/g, '');
  const len = chars.length;

  const lines = text.split('\n').filter((l) => l.trim());
  const dialogueLines = lines.filter((l) => /[「」“”"']/.test(l) || /^[^。！？]{1,12}[：:]/.test(l));
  const { humanDialogueCount, longDialogueBlocks } = extractDialogueBlocks(text);
  const actionLines = lines.filter((l) => /走|跑|推|拉|抓|砸|踢|转身|站|蹲|握/.test(l));
  const mindLines = lines.filter((l) => /想起|意识到|觉得|知道|心想/.test(l));

  const climaxCount = (intent.scenes || []).filter((s) => s.beat === 'turn' || s.beat === 'hook').length;
  const sceneCount = scenes?.length || intent.scenes?.length || 0;

  const peaks = detectRhythmPeaks(text);

  return {
    chapter: intent.chapter,
    sceneCount,
    climaxCount,
    conflictDensity: conflictResult?.types?.length ?? 0,
    conflictTypes: conflictResult?.types ?? [],
    dialogueRatio: lines.length ? round(dialogueLines.length / lines.length) : 0,
    humanDialogueCount,
    longDialogueBlocks,
    actionRatio: lines.length ? round(actionLines.length / lines.length) : 0,
    mindRatio: lines.length ? round(mindLines.length / lines.length) : 0,
    wordCount: len,
    worldProgress: intent.mustGain ? 1 : 0,
    characterGrowth: intent.mustLose ? 1 : 0,
    foreshadowRate: intent.newForeshadow ? 1 : 0,
    rhythmPeaks: peaks,
    infoDensity: round(len / Math.max(sceneCount, 1) / 100),
    timestamp: new Date().toISOString(),
  };
}

/**
 * 对话「成型」指标：抽取引号块，区分人话与系统 UI 文本。
 * flat dialogueRatio 不可靠（依赖行结构，system 文本稀释占比，ch15 字符占比 30.6% 却显得「无对话」）。
 * 改用成型检查：人话块数 + 长对话块数。
 * 判定规则：含会话信号（人称/称呼/语气词/问叹）→ 人话；
 * 否则短 + 命中系统 UI 词 → 系统文本；其余保守计人话（宁放过不误杀）。
 */
export function extractDialogueBlocks(text) {
  const spans = [];
  for (const re of [/「([^」]*)」/g, /“([^”]*)”/g, /"([^"]*)"/g]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      const s = String(m[1] || '').replace(/\s/g, '');
      if (s) spans.push(s);
    }
  }
  const HUMAN_RE = /[你我他她]|哥|姐|爷|吧|呢|么|啊|喂|别|快|问|答|[？!！]/;
  const SYSTEM_UI_RE = /权限|绑定|加载|系统|界面|指令|检测|验证|继承|执行|完成|离线|锁定|信号|警告|确认|数据|剩余|激活|调用|解析|已/;
  const humanDialogueCount = spans.filter((s) =>
    HUMAN_RE.test(s) || !(s.length < 24 && SYSTEM_UI_RE.test(s))).length;
  const longDialogueBlocks = spans.filter((s) => s.length >= 20).length;
  return { humanDialogueCount, longDialogueBlocks };
}

function detectRhythmPeaks(text) {
  const paras = text.split(/\n\n+/).filter(Boolean);
  return paras
    .map((p, i) => ({
      index: i + 1,
      intensity: (/！|？|突然|却|但是/.test(p) ? 2 : 1) + (p.length < 80 ? 1 : 0),
      chars: p.replace(/\s/g, '').length,
    }))
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, 5);
}

/**
 * 3a: Scene 级叙事效率指标（生成侧）——只补 causalGate 不测的「浓度与节奏」维度。
 * 消费者清单（四选一，写不出消费者的不加）：
 *   - infoDensity（chars/子句）                    → 3b feedback 注入 + 第 5 步 rerank
 *   - dragSpan（连续无新信息句子的最大段长）        → 3b feedback（段落级拖拽，补 neither 句级不足）
 *   - singlePurposeDescriptionRatio / functionalDescriptionRatio
 *                                                 → 3b feedback 注入 + 第 5 步 rerank
 *   - dialogueGameDensity（对白块立场变化密度）     → 第 5 步 rerank
 *   - hookStrength（Scene 尾句未闭合信息）          → 复用 reader-simulator hookScore（LLM 判定），
 *                                                     此处只提供词汇级兜底信号；不重造 LLM 评分
 *   - irreversibleChangeCount / optionsDelta / infoDelta
 *                                                 → 3b feedback；直接从 scene.causalGate 读，不重算
 *
 * @param {string} sceneText Scene 正文
 * @param {object} scene 带 causalGate 的 scene 对象（可选）
 */
export function computeSceneEfficiencyMetrics(sceneText, scene = {}) {
  const text = String(sceneText || '');
  const chars = text.replace(/\s/g, '').length;
  if (!chars) return null;

  const calib = classifySentences(text);
  const drag = computeDragSpan(text);
  const clauses = text.split(/[，。；！？]/).filter(Boolean).length;

  // 对白博弈密度：对白块中含立场信号（威胁/拒绝/承诺/条件/让步/反问）的占比
  const dialogueSpans = [];
  for (const re of [/「([^」]*)」/g, /“([^”]*)”/g]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      const s = String(m[1] || '').trim();
      if (s) dialogueSpans.push(s);
    }
  }
  const GAME_RE = /(不许|不行|别想|休想|除非|否则|就别|那就|我要|你必须|你得|给我|你敢|试问|凭什么|凭什么|你先|可以|不行|成交|拒绝|答应|放过|饶|威胁|警告|给你两条路|二选一|要么)/;
  const gameCount = dialogueSpans.filter((s) => GAME_RE.test(s)).length;

  // hookStrength 词汇级兜底：尾句（最后 2 句）含未闭合信号（问号/悬念词/新信息指代）
  const tailSentences = calib.sentences.slice(-2).join('');
  const HOOK_RE = /[？?]|谁|什么人|下落|去向|在哪|去哪|是谁|是什么|下一?步|接下来|还没|尚未|不见|失踪|消失|开枪|倒计时|还剩/;
  const hookLexical = HOOK_RE.test(tailSentences) ? 1 : 0;

  const gate = scene?.causalGate || null;
  return {
    // ── 浓度与节奏（本函数计算）──
    infoDensity: clauses ? round2(chars / clauses) : 0, // chars/子句
    dragSpan: drag.dragSpan, // 连续无新信息句子数
    dragStartIndex: drag.dragStartIndex,
    singlePurposeDescriptionRatio: calib.singlePurposeDescriptionRatio,
    functionalDescriptionRatio: calib.functionalDescriptionRatio,
    dialogueGameDensity: dialogueSpans.length
      ? round2(gameCount / dialogueSpans.length)
      : 0,
    hookLexical, // 词汇级兜底；LLM 级用 reader-simulator hookScore（优先）
    sentenceCount: calib.total,
    // ── 门控字段透传（不重算）──
    irreversibleChangeCount: gate?.irreversibleChanges?.length ?? null,
    optionsDelta: gate?.optionsDelta ?? null,
    infoDelta: gate?.infoDelta ?? null,
    changeStrength: gate?.changeStrength ?? null,
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function round(n) {
  return Math.round(n * 100) / 100;
}

export function appendToDashboard(dashboardPath, metrics) {
  let dash = exists(dashboardPath) ? readJson(dashboardPath) : { chapters: [], aggregates: {} };
  dash.chapters = dash.chapters.filter((c) => c.chapter !== metrics.chapter);
  dash.chapters.push(metrics);
  dash.chapters.sort((a, b) => a.chapter - b.chapter);

  const n = dash.chapters.length;
  dash.aggregates = {
    avgWordCount: Math.round(dash.chapters.reduce((s, c) => s + c.wordCount, 0) / n),
    avgDialogueRatio: round(dash.chapters.reduce((s, c) => s + c.dialogueRatio, 0) / n),
    avgConflictDensity: round(dash.chapters.reduce((s, c) => s + c.conflictDensity, 0) / n),
    totalChapters: n,
    updatedAt: new Date().toISOString(),
  };

  writeJson(dashboardPath, dash);
  return dash;
}

/**
 * Metrics → Planner 反馈环
 */
export function analyzeMetricsFeedback(metrics, dashboard, scenes = []) {
  const suggestions = [];
  const recent = (dashboard?.chapters ?? []).slice(-5);

  // 冲突密度 replan 只针对自动派生计划的章节。
  // authored plan（导演/渲染器已确认）的 conflict 是单一丰富种子：运行时 authored 路径
  // 将其硬编码为 types=[1]（orchestrator），密度恒为 1，永远 <2。该章是否兑现冲突已由
  // scene 硬失败 / critic / validation 把关，无需在此重复索要 ≥2 个关键词桶。
  // 区分信号：自动派生桶都是短标签（关系/资源/relationship ≤12 字符）；
  // authored 种子是 ≥20 字的完整冲突描述（含「表面冲突/真正的冲突」等）。
  const singleRichConflictSeed =
    Array.isArray(metrics.conflictTypes) &&
    metrics.conflictTypes.length === 1 &&
    typeof metrics.conflictTypes[0] === 'string' &&
    metrics.conflictTypes[0].replace(/\s/g, '').length >= 20;

  // D2 degraded（no_causal_basis 有据降级）按 conflict.js 设计是「通过」：
  // replan 会把 no_causal_basis 注入 obstacle，若此处仍按密度 replan，
  // 两道门互相喂养形成死循环（实测连写时四轮耗尽）。
  const degradedNoBasis =
    Array.isArray(metrics.conflictTypes) &&
    metrics.conflictTypes.length === 1 &&
    metrics.conflictTypes[0] === 'no_causal_basis';

  // 门禁分层（L2 默认 soft）：冲突密度/篇幅/场景/趋势都是质量信号，默认只记录不 replan。
  // replan 会把 suggestObstacle 注入 obstacle，与 conflict D2 degraded 语义互相喂养，
  // 实测会造成四轮耗尽的空转。INKOS_STRICT_METRICS=1 恢复硬 replan。
  const strictReplan = process.env.INKOS_STRICT_METRICS === '1';

  if (metrics.conflictDensity < 2 && !singleRichConflictSeed && !degradedNoBasis) {
    suggestions.push({
      type: 'conflict',
      target: 'next_scene',
      message: `冲突密度 ${metrics.conflictDensity} 偏低`,
      suggestObstacle: 'no_causal_basis',
      replan: strictReplan,
    });
  }

  if (metrics.dialogueRatio < 0.2) {
    suggestions.push({
      type: 'pace',
      message: '对话占比过低，节奏偏叙述',
      replan: false,
      plannerHint: { type: 'actionSceneWeight', delta: 0.05 },
    });
  }

  if (metrics.wordCount < 2200) {
    suggestions.push({
      type: 'length',
      message: '篇幅偏短，高潮不足',
      suggestGoal: '扩展转折场景',
      replan: strictReplan,
    });
  }

  const lowIntensityScenes = scenes
    .map((s, i) => ({ index: i + 1, len: s.text?.replace(/\s/g, '').length ?? 0 }))
    .filter((s) => s.len > 0 && s.len < 400);
  for (const s of lowIntensityScenes) {
    suggestions.push({
      type: 'scene',
      target: `scene_${s.index}`,
      message: `Scene${s.index} 冲突/篇幅不足（${s.len}字）`,
      replan: strictReplan,
    });
  }

  if (recent.length >= 3) {
    const avgConflict = recent.reduce((s, c) => s + c.conflictDensity, 0) / recent.length;
    if (avgConflict < 1.5) {
      suggestions.push({
        type: 'trend',
        message: '连续章节冲突密度偏低',
        plannerHint: { type: 'conflictPriority', delta: 0.1 },
        replan: strictReplan,
      });
    }
  }

  const needsReplan = suggestions.some((s) => s.replan);
  return { suggestions, needsReplan, low: metrics.conflictDensity < 2 || metrics.wordCount < 2000 };
}
