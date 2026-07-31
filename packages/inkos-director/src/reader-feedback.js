/**
 * Reader Feedback Loop — Reader Simulation → Adaptive Planner → Next Director
 * 不只生成报告，真正参与下一章/下一 Scene 规划
 */
import fs from 'node:fs';
import path from 'node:path';
import { getAdaptivePlannerDir } from './review-report.js';
import { recordAdaptiveHint, loadDirectorOverrides } from './adaptive-planner.js';
import { applyAdaptiveDirectorOverrides } from './writer-first.js';
import { buildChapterCurvePlan } from './reader-curve.js';
import {
  detectSceneElementWeights,
  computeElementEngagement,
  aggregateChapterElementScores,
  analyzeReaderPreferences,
  formatReaderPreferenceBlock,
  mergePreferenceAdjustments,
} from './reader-preference.js';

export const FEEDBACK_THRESHOLDS = {
  continueProbabilityLow: 70,
  questionCountLow: 2,
  dropRiskHigh: 45,
};

function feedbackStatePath(bookDir, chapter) {
  return path.join(getAdaptivePlannerDir(bookDir, chapter), 'reader_feedback.json');
}

function bookFeedbackStatePath(bookDir) {
  return path.join(bookDir, 'novel', '_system', 'studio', 'reader-feedback-loop', 'state.json');
}

export function loadReaderFeedbackState(bookDir, chapter) {
  if (!bookDir || chapter == null) return null;
  try {
    const file = feedbackStatePath(bookDir, chapter);
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch { /* ignore */ }
  return null;
}

export function loadBookReaderFeedbackState(bookDir) {
  if (!bookDir) return { hookLadderChapterBoost: 0, chapterHistory: [], preferenceHistory: [] };
  try {
    const file = bookFeedbackStatePath(bookDir);
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch { /* ignore */ }
  return { hookLadderChapterBoost: 0, chapterHistory: [], preferenceHistory: [] };
}

export function persistReaderFeedbackState(bookDir, chapter, state) {
  if (!bookDir || chapter == null) return null;
  try {
    const dir = getAdaptivePlannerDir(bookDir, chapter);
    fs.mkdirSync(dir, { recursive: true });
    const file = feedbackStatePath(bookDir, chapter);
    fs.writeFileSync(file, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
    return file;
  } catch {
    return null;
  }
}

export function persistBookReaderFeedbackState(bookDir, state) {
  if (!bookDir) return null;
  try {
    const dir = path.dirname(bookFeedbackStatePath(bookDir));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(bookFeedbackStatePath(bookDir), JSON.stringify({
      ...state,
      updatedAt: new Date().toISOString(),
    }, null, 2), 'utf8');
    return bookFeedbackStatePath(bookDir);
  } catch {
    return null;
  }
}

/**
 * 根据 Reader Simulation 指标生成自适应指令（真正参与创作）
 */
export function analyzeReaderSimulation(readerSimulation = {}, {
  beatMemory = {},
  executionPlan = null,
} = {}) {
  const {
    continueProbability = 100,
    questionCount = 0,
    dropRisk = 0,
    curiosity = 50,
  } = readerSimulation;

  const adjustments = {
    hookDensityBoost: 0,
    mysteryBoost: 0,
    conflictBoost: 0,
    payoffBoost: 0,
    hookLadderBoost: 0,
    firstScreenExplosion: false,
    advancePacing: false,
    increaseConflict: false,
    addMystery: false,
    addInformationGap: false,
    increaseHookDensity: false,
  };
  const directives = [];
  const triggers = {};

  if (continueProbability < FEEDBACK_THRESHOLDS.continueProbabilityLow) {
    triggers.lowContinueProbability = true;
    adjustments.hookDensityBoost = 15;
    adjustments.increaseHookDensity = true;
    directives.push(
      `Continue Probability ${continueProbability}% < 70 — 下一章自动提高 Hook 密度，逐 Scene 递进，章尾须峰值`,
    );
  }

  const unresolvedCount = beatMemory.unresolvedIssues?.length ?? 0;
  const effectiveQuestions = questionCount + unresolvedCount;
  if (effectiveQuestions < FEEDBACK_THRESHOLDS.questionCountLow) {
    triggers.lowQuestionCount = true;
    adjustments.mysteryBoost = 12;
    adjustments.addMystery = true;
    adjustments.addInformationGap = true;
    directives.push(
      `Question Count 偏低（${questionCount}）— 下一章须新增谜团、信息差与悬念，禁止平叙收束`,
    );
  }

  if (dropRisk >= FEEDBACK_THRESHOLDS.dropRiskHigh) {
    triggers.highDropRisk = true;
    adjustments.conflictBoost = 15;
    adjustments.hookLadderBoost = 1;
    adjustments.firstScreenExplosion = true;
    adjustments.advancePacing = true;
    adjustments.increaseConflict = true;
    directives.push(
      `Drop Risk ${dropRisk}% 偏高 — 下一章开篇须第一屏爆点，节奏提前，冲突升级，Hook Ladder 须递进`,
    );
  }

  if (curiosity < 60 && continueProbability >= FEEDBACK_THRESHOLDS.continueProbabilityLow) {
    adjustments.mysteryBoost = Math.max(adjustments.mysteryBoost, 8);
    directives.push(`Curiosity ${curiosity}% 不足 — 加深核心追问，增加未解谜团`);
  }

  const hookStage = executionPlan?.hookLadderEntry?.type
    || executionPlan?.hookLadderEntry?.id
    || null;
  const hookLevel = executionPlan?.hookLadderEntry?.level ?? null;
  if (
    (hookLevel != null && hookLevel < 2 || hookStage === 'Curiosity')
    && dropRisk >= 35
  ) {
    adjustments.hookLadderBoost = Math.max(adjustments.hookLadderBoost, 1);
    directives.push('Hook Ladder 仍停留在 Curiosity — 下一 Scene/章须升级至 Danger 或更高认知阶段');
  }

  return {
    adjustments,
    directives,
    triggers,
    metrics: { continueProbability, questionCount, dropRisk, curiosity },
  };
}

/**
 * 合并 Story Memory 优先级到 Adaptive 指令
 */
export function mergeStoryMemoryDirectives(storyMemoryHints = [], storyMemoryMetrics = {}) {
  const directives = [];
  const priorities = [];

  const highHints = (storyMemoryHints || []).filter((h) => h.priority === 'high').slice(0, 4);
  for (const h of highHints) {
    priorities.push(h.text);
    directives.push(`[Story Memory · ${h.type}] ${h.text}`);
  }

  if (storyMemoryMetrics.openForeshadowCount > 0) {
    const stale = (storyMemoryMetrics.openForeshadow || [])
      .filter((f) => (f.gap ?? 0) >= 2)
      .slice(0, 3);
    for (const f of stale) {
      directives.push(`[未回收伏笔] 下一章须优先推进或兑现：${f.text || f}`);
    }
  }

  if (storyMemoryMetrics.longGoals?.length) {
    for (const g of storyMemoryMetrics.longGoals.slice(0, 2)) {
      if ((g.progress ?? 100) < 40) {
        directives.push(`[未完成目标] 下一章须推进：${g.text}`);
      }
    }
  }

  if (storyMemoryMetrics.characterArcs?.length) {
    const stagnant = storyMemoryMetrics.characterArcs
      .filter((a) => !a.stage || /developing|停滞|初期/i.test(a.stage))
      .slice(0, 2);
    for (const a of stagnant) {
      directives.push(`[角色成长] 下一章须推动 ${a.character || 'POV'} 做出不可逆选择或付出代价`);
    }
  }

  if (storyMemoryMetrics.openMysteries > 0 || storyMemoryMetrics.theme) {
    directives.push(
      `[长期悬念] 下一章规划须接续书级追问，禁止像重新开始 — 开放谜团 ${storyMemoryMetrics.openMysteries ?? 0} 条`,
    );
  }

  return { directives, priorities };
}

/**
 * 将反馈调整应用到 Chapter 曲线计划
 */
export function applyFeedbackToCurvePlan(curvePlan = {}, adjustments = {}) {
  if (!curvePlan?.hookCurve?.length) return curvePlan;

  const hookBoost = adjustments.hookDensityBoost || 0;
  const mysteryBoost = adjustments.mysteryBoost || 0;
  const conflictBoost = adjustments.conflictBoost || 0;

  const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));

  return {
    ...curvePlan,
    hookCurve: curvePlan.hookCurve.map((p, i) => ({
      ...p,
      target: clamp(p.target + hookBoost + (i === curvePlan.hookCurve.length - 1 ? 5 : 0)),
      note: adjustments.increaseHookDensity ? `${p.note || ''} · Reader Feedback 强化`.trim() : p.note,
    })),
    mysteryCurve: curvePlan.mysteryCurve?.map((p) => ({
      ...p,
      target: clamp(p.target + mysteryBoost),
    })) || curvePlan.mysteryCurve,
    payoffCurve: curvePlan.payoffCurve?.map((p) => ({
      ...p,
      target: clamp(p.target + (adjustments.payoffBoost || 0)),
    })) || curvePlan.payoffCurve,
    readerFeedbackApplied: {
      hookDensityBoost: hookBoost,
      mysteryBoost,
      conflictBoost,
      payoffBoost: adjustments.payoffBoost || 0,
      relationshipBeatBoost: adjustments.relationshipBeatBoost || 0,
      preferenceElement: adjustments.preferenceElement || null,
      firstScreenExplosion: adjustments.firstScreenExplosion,
      advancePacing: adjustments.advancePacing,
    },
  };
}

export function buildReaderFeedbackDirectorBlock(feedbackState = {}, { chapter = null } = {}) {
  if (!feedbackState?.directives?.length && !feedbackState?.storyMemoryDirectives?.length) {
    return '';
  }

  const lines = [
    '<!-- inkos-reader-feedback-loop -->',
    '## Reader Feedback Loop · Adaptive Planner（Reader Simulation 驱动）',
    '',
    '以下由 Execution Intelligence → Reader Simulation 自动生成，**下一章 Director 须响应**：',
  ];

  if (feedbackState.aggregatedMetrics) {
    const m = feedbackState.aggregatedMetrics;
    lines.push(
      '',
      `- Continue Probability 均值：${m.avgContinueProbability ?? '—'}%`,
      `- Drop Risk 峰值：${m.maxDropRisk ?? '—'}%`,
      `- Question Count 均值：${m.avgQuestionCount ?? '—'}`,
    );
  }

  if (feedbackState.storyMemoryDirectives?.length) {
    lines.push('', '### Story Memory 优先处理');
    for (const d of feedbackState.storyMemoryDirectives.slice(0, 6)) {
      lines.push(`- ${d}`);
    }
  }

  if (feedbackState.directives?.length) {
    lines.push('', '### Reader Simulation 自适应指令');
    for (const d of feedbackState.directives.slice(0, 8)) {
      lines.push(`- ${d}`);
    }
  }

  if (feedbackState.adjustments?.firstScreenExplosion) {
    lines.push('', '- **强制**：下一章第一 Scene 前 300 字须爆点（冲突/异常/危机）');
  }
  if (feedbackState.adjustments?.hookLadderBoost > 0) {
    lines.push(`- **Hook Ladder**：本章认知阶段基准 +${feedbackState.adjustments.hookLadderBoost}，须递进 Curiosity→Danger→Cost→Truth→PointOfNoReturn`);
  }

  if (feedbackState.readerPreference?.favoriteElement) {
    lines.push('', formatReaderPreferenceBlock(
      feedbackState.readerPreference,
      feedbackState.preferenceRankings,
    ));
  }

  if (chapter != null) lines.push('', `（Chapter ${chapter} · Reader Feedback Loop 闭环输入）`);
  return lines.join('\n');
}

/**
 * Scene 级：Execution Intelligence 后处理，写入 Adaptive Planner
 */
export function processSceneReaderFeedback({
  bookDir,
  chapter,
  scene = {},
  intent = {},
  readerSimulation = {},
  beatMemory = {},
  executionPlan = null,
  storyMemoryHints = [],
  storyMemoryMetrics = {},
  draftText = '',
  emotionCurve = null,
} = {}) {
  const analysis = analyzeReaderSimulation(readerSimulation, { beatMemory, executionPlan });
  const storyMerge = mergeStoryMemoryDirectives(storyMemoryHints, storyMemoryMetrics);
  const allDirectives = [...analysis.directives, ...storyMerge.directives];

  const elementWeights = detectSceneElementWeights({
    text: draftText,
    executionPlan,
    beatMemory,
    emotionCurve,
  });
  const engagement = computeElementEngagement(elementWeights, analysis.metrics);

  const sceneIndex = scene.index ?? 1;
  const totalScenes = intent.scenes?.length || intent.sceneCount || 4;
  const isLastScene = sceneIndex >= totalScenes;

  const bookState = loadBookReaderFeedbackState(bookDir);
  if (analysis.adjustments.hookLadderBoost > 0) {
    bookState.hookLadderChapterBoost = Math.min(
      4,
      (bookState.hookLadderChapterBoost || 0) + analysis.adjustments.hookLadderBoost,
    );
  }

  const sceneEntry = {
    sceneIndex,
    chapter,
    metrics: analysis.metrics,
    adjustments: analysis.adjustments,
    directives: allDirectives,
    triggers: analysis.triggers,
    elementWeights,
    engagement,
    at: new Date().toISOString(),
  };

  let chapterState = loadReaderFeedbackState(bookDir, chapter) || {
    chapter,
    scenes: [],
    aggregatedMetrics: null,
    adjustments: {},
    directives: [],
    storyMemoryDirectives: [],
  };

  const idx = chapterState.scenes.findIndex((s) => s.sceneIndex === sceneIndex);
  if (idx >= 0) chapterState.scenes[idx] = sceneEntry;
  else chapterState.scenes.push(sceneEntry);

  chapterState.scenes.sort((a, b) => a.sceneIndex - b.sceneIndex);
  chapterState.aggregatedMetrics = aggregateSceneMetrics(chapterState.scenes);
  chapterState.elementScores = aggregateChapterElementScores(chapterState.scenes);
  chapterState.adjustments = mergeAdjustments(chapterState.scenes.map((s) => s.adjustments));
  chapterState.directives = [...new Set(chapterState.scenes.flatMap((s) => s.directives))];
  chapterState.storyMemoryDirectives = storyMerge.directives;

  const feedbackPath = persistReaderFeedbackState(bookDir, chapter, chapterState);
  persistBookReaderFeedbackState(bookDir, {
    ...bookState,
    lastChapter: chapter,
    lastSceneIndex: sceneIndex,
    hookLadderChapterBoost: bookState.hookLadderChapterBoost,
    pendingChapterPreferences: {
      chapter,
      elementScores: chapterState.elementScores,
      avgContinueProbability: chapterState.aggregatedMetrics?.avgContinueProbability,
      avgCuriosity: averageCuriosity(chapterState.scenes),
      sceneEngagements: chapterState.scenes.map((s) => ({
        sceneIndex: s.sceneIndex,
        engagement: s.engagement,
      })),
    },
  });

  if (bookDir && chapter != null) {
    if (!isLastScene) {
      recordAdaptiveHint(bookDir, chapter, {
        source: 'reader-feedback-loop',
        targetSceneIndex: sceneIndex + 1,
        items: allDirectives.slice(0, 5),
        adjustments: analysis.adjustments,
        metrics: analysis.metrics,
        message: `Scene ${sceneIndex} Reader Simulation → Scene ${sceneIndex + 1} 自适应调整`,
      });
    }

    recordAdaptiveHint(bookDir, chapter + 1, {
      source: 'reader-feedback-loop',
      targetSceneIndex: 1,
      items: isLastScene
        ? chapterState.directives.slice(0, 6)
        : allDirectives.slice(0, 4),
      adjustments: chapterState.adjustments,
      aggregatedMetrics: chapterState.aggregatedMetrics,
      storyMemoryDirectives: storyMerge.directives,
      message: isLastScene
        ? `第 ${chapter} 章 Reader Feedback 闭环 → 第 ${chapter + 1} 章 Director 输入`
        : `Scene ${sceneIndex} 追读反馈已记录，章末汇总后输入下一章 Director`,
    });
  }

  return {
    analysis,
    storyMerge,
    chapterState,
    feedbackPath,
    hookLadderChapterBoost: bookState.hookLadderChapterBoost,
    elementWeights,
    engagement,
    directorBlock: buildReaderFeedbackDirectorBlock(chapterState, { chapter: chapter + 1 }),
  };
}

function averageCuriosity(scenes = []) {
  const vals = scenes.map((s) => s.metrics?.curiosity).filter((v) => v != null);
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
}

function aggregateSceneMetrics(scenes = []) {
  if (!scenes.length) return null;
  const probs = scenes.map((s) => s.metrics?.continueProbability).filter((v) => v != null);
  const drops = scenes.map((s) => s.metrics?.dropRisk).filter((v) => v != null);
  const questions = scenes.map((s) => s.metrics?.questionCount).filter((v) => v != null);
  const curiosities = scenes.map((s) => s.metrics?.curiosity).filter((v) => v != null);
  return {
    avgContinueProbability: probs.length
      ? Math.round(probs.reduce((a, b) => a + b, 0) / probs.length)
      : null,
    maxDropRisk: drops.length ? Math.max(...drops) : null,
    avgQuestionCount: questions.length
      ? Math.round(questions.reduce((a, b) => a + b, 0) / questions.length)
      : null,
    avgCuriosity: curiosities.length
      ? Math.round(curiosities.reduce((a, b) => a + b, 0) / curiosities.length)
      : null,
    sceneCount: scenes.length,
  };
}

function mergeAdjustments(list = []) {
  const merged = {
    hookDensityBoost: 0,
    mysteryBoost: 0,
    conflictBoost: 0,
    payoffBoost: 0,
    relationshipBeatBoost: 0,
    hookLadderBoost: 0,
    firstScreenExplosion: false,
    advancePacing: false,
    increaseConflict: false,
    addMystery: false,
    addInformationGap: false,
    increaseHookDensity: false,
  };
  for (const adj of list) {
    if (!adj) continue;
    merged.hookDensityBoost = Math.max(merged.hookDensityBoost, adj.hookDensityBoost || 0);
    merged.mysteryBoost = Math.max(merged.mysteryBoost, adj.mysteryBoost || 0);
    merged.conflictBoost = Math.max(merged.conflictBoost, adj.conflictBoost || 0);
    merged.payoffBoost = Math.max(merged.payoffBoost || 0, adj.payoffBoost || 0);
    merged.relationshipBeatBoost = Math.max(merged.relationshipBeatBoost || 0, adj.relationshipBeatBoost || 0);
    merged.hookLadderBoost = Math.max(merged.hookLadderBoost, adj.hookLadderBoost || 0);
    merged.firstScreenExplosion = merged.firstScreenExplosion || adj.firstScreenExplosion;
    merged.advancePacing = merged.advancePacing || adj.advancePacing;
    merged.increaseConflict = merged.increaseConflict || adj.increaseConflict;
    merged.addMystery = merged.addMystery || adj.addMystery;
    merged.addInformationGap = merged.addInformationGap || adj.addInformationGap;
    merged.increaseHookDensity = merged.increaseHookDensity || adj.increaseHookDensity;
  }
  return merged;
}

/**
 * 章末汇总 — Chapter Review 后强化下一章 Director 输入
 */
export function finalizeChapterReaderFeedback({
  bookDir,
  chapter,
  readerCurveReport = null,
} = {}) {
  const chapterState = loadReaderFeedbackState(bookDir, chapter);
  if (!chapterState) return null;

  const bookState = loadBookReaderFeedbackState(bookDir);
  const directives = [...(chapterState.directives || [])];

  if (readerCurveReport?.nextChapterGuidance?.length) {
    directives.push(...readerCurveReport.nextChapterGuidance);
  }

  const finalState = {
    ...chapterState,
    directives: [...new Set(directives)],
    readerCurveReport: readerCurveReport
      ? {
        readerAddictionScore: readerCurveReport.readerAddictionScore,
        nextChapterGuidance: readerCurveReport.nextChapterGuidance,
      }
      : null,
    finalizedAt: new Date().toISOString(),
  };

  persistReaderFeedbackState(bookDir, chapter, finalState);

  recordAdaptiveHint(bookDir, chapter + 1, {
    source: 'reader-feedback-loop-final',
    targetSceneIndex: 1,
    items: finalState.directives.slice(0, 8),
    adjustments: finalState.adjustments,
    aggregatedMetrics: finalState.aggregatedMetrics,
    storyMemoryDirectives: finalState.storyMemoryDirectives,
    readerCurveReport,
    message: `第 ${chapter} 章 Reader Feedback Loop 闭环完成 → 第 ${chapter + 1} 章 Director`,
  });

  persistBookReaderFeedbackState(bookDir, {
    ...bookState,
    chapterHistory: [
      ...(bookState.chapterHistory || []),
      {
        chapter,
        avgContinueProbability: finalState.aggregatedMetrics?.avgContinueProbability,
        hookLadderBoost: bookState.hookLadderChapterBoost,
      },
    ].slice(-20),
    preferenceHistory: [
      ...(bookState.preferenceHistory || []),
      {
        chapter,
        elementScores: finalState.elementScores || bookState.pendingChapterPreferences?.elementScores || {},
        avgContinueProbability: finalState.aggregatedMetrics?.avgContinueProbability,
        avgCuriosity: finalState.aggregatedMetrics?.avgCuriosity
          ?? bookState.pendingChapterPreferences?.avgCuriosity,
      },
    ].slice(-10),
    pendingChapterPreferences: null,
  });

  const preferenceAnalysis = analyzeReaderPreferences([
    ...(bookState.preferenceHistory || []),
    {
      chapter,
      elementScores: finalState.elementScores || {},
      avgContinueProbability: finalState.aggregatedMetrics?.avgContinueProbability,
      avgCuriosity: finalState.aggregatedMetrics?.avgCuriosity,
    },
  ]);

  if (preferenceAnalysis.readerPreference) {
    finalState.readerPreference = preferenceAnalysis.readerPreference;
    finalState.preferenceRankings = preferenceAnalysis.rankings;
    finalState.adjustments = mergePreferenceAdjustments(
      finalState.adjustments,
      preferenceAnalysis,
    );
    finalState.directives = [
      ...new Set([
        ...(finalState.directives || []),
        ...(preferenceAnalysis.directives || []),
      ]),
    ];
    persistReaderFeedbackState(bookDir, chapter, finalState);

    recordAdaptiveHint(bookDir, chapter + 1, {
      source: 'reader-preference-learning',
      targetSceneIndex: 1,
      items: preferenceAnalysis.directives.slice(0, 4),
      adjustments: preferenceAnalysis.adjustments,
      readerPreference: preferenceAnalysis.readerPreference,
      message: `Reader Preference：放大 ${preferenceAnalysis.readerPreference.favoriteElementName}（${preferenceAnalysis.readerPreference.score}）`,
    });
  }

  return {
    finalState,
    directorBlock: buildReaderFeedbackDirectorBlock(finalState, { chapter: chapter + 1 }),
    feedbackPath: feedbackStatePath(bookDir, chapter),
    readerPreference: preferenceAnalysis.readerPreference,
    preferenceRankings: preferenceAnalysis.rankings,
  };
}

export function getReaderFeedbackAdjustmentsForChapter(bookDir, chapter) {
  const priorChapter = chapter > 1 ? chapter - 1 : null;
  const priorState = priorChapter ? loadReaderFeedbackState(bookDir, priorChapter) : null;
  const bookState = loadBookReaderFeedbackState(bookDir);

  const preferenceAnalysis = analyzeReaderPreferences(bookState.preferenceHistory || []);

  let adjustments = priorState?.adjustments || {};
  let directives = priorState?.directives || [];
  let hookLadderChapterBoost = bookState.hookLadderChapterBoost || 0;

  if (preferenceAnalysis.readerPreference) {
    adjustments = mergePreferenceAdjustments(adjustments, preferenceAnalysis);
    directives = [...new Set([...directives, ...(preferenceAnalysis.directives || [])])];
  }

  const directorOverrides = bookDir && chapter != null
    ? loadDirectorOverrides(bookDir, chapter)
    : null;

  if (directorOverrides) {
    adjustments = mergePreferenceAdjustments(adjustments, { adjustments: directorOverrides });
    directives = [...new Set([
      ...directives,
      ...(directorOverrides.writerDirectives || []),
    ])];
    hookLadderChapterBoost = Math.max(
      hookLadderChapterBoost,
      directorOverrides.hookLadderChapterBoost || 0,
    );
  }

  const merged = applyAdaptiveDirectorOverrides(
    {
      adjustments,
      hookLadderChapterBoost,
      readerPreference: preferenceAnalysis.readerPreference || directorOverrides?.readerPreference || null,
      writerDirectives: directives,
    },
    directorOverrides,
  );

  return {
    adjustments: merged.adjustments || adjustments,
    directives: merged.writerDirectives || directives,
    storyMemoryDirectives: priorState?.storyMemoryDirectives || [],
    aggregatedMetrics: priorState?.aggregatedMetrics || null,
    hookLadderChapterBoost: merged.hookLadderChapterBoost || hookLadderChapterBoost,
    readerPreference: merged.readerPreference || preferenceAnalysis.readerPreference,
    preferenceRankings: preferenceAnalysis.rankings,
    elementScores: preferenceAnalysis.elementScores,
    priorChapter,
    directorOverrides,
  };
}

export function buildAdjustedChapterCurvePlan(intent, chapter, sceneCount, bookDir) {
  const base = buildChapterCurvePlan(intent, chapter, sceneCount);
  const feedback = getReaderFeedbackAdjustmentsForChapter(bookDir, chapter);
  return applyFeedbackToCurvePlan(base, feedback.adjustments);
}
