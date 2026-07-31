import fs from 'node:fs';
import path from 'node:path';
import { computeWriterOptimizerScore, OPTIMIZER_DIMENSIONS } from './quality-score.js';
import { runModuleOptimizers, MODULE_OPTIMIZERS } from './module-optimizers.js';
import { buildLineDiff, summarizeDiff } from './diff.js';
import { analyzeBeatCompliance } from './analyzers/beat-compliance.js';

export function getWriterOptimizerDir(bookDir, chapter) {
  return path.join(
    bookDir,
    'novel',
    '_system',
    'studio',
    'writer-optimizer',
    `ch_${String(chapter).padStart(4, '0')}`,
  );
}

function sceneDir(bookDir, chapter, scene) {
  return path.join(
    getWriterOptimizerDir(bookDir, chapter),
    `scene_${String(scene?.index ?? 0).padStart(2, '0')}`,
  );
}

export function persistDraftArtifacts(bookDir, chapter, scene, { draft, polished, report }) {
  try {
    const dir = sceneDir(bookDir, chapter, scene);
    fs.mkdirSync(dir, { recursive: true });
    const draftPath = path.join(dir, 'draft.md');
    const polishedPath = path.join(dir, 'polished_draft.md');
    fs.writeFileSync(draftPath, draft || '', 'utf8');
    fs.writeFileSync(polishedPath, polished || draft || '', 'utf8');
    const reportPath = path.join(dir, 'optimizer_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    return { draftPath, polishedPath, reportPath };
  } catch {
    return null;
  }
}

export function buildOptimizerReport({
  text,
  scene = {},
  chapter = null,
  intent = {},
  ctx = {},
  styleDna = {},
  draftText = null,
  polishedText = null,
  polishMeta = null,
  modules = null,
  beatParts = null,
  executionPlan = null,
  beatCompliance = null,
  readerSimulation = null,
  emotionCurve = null,
  executionIntelligence = null,
} = {}) {
  const draft = draftText ?? text;
  const polished = polishedText ?? text;

  const resolvedBeatCompliance = beatCompliance
    || (beatParts?.length || executionPlan
      ? analyzeBeatCompliance({ text: draft, executionPlan, beatParts })
      : null);
  const qualityDraft = computeWriterOptimizerScore({
    text: draft,
    scene,
    chapter,
    intent,
    ctx,
    styleDna,
  });
  const qualityPolished = polished !== draft
    ? computeWriterOptimizerScore({
      text: polished,
      scene,
      chapter,
      intent,
      ctx,
      styleDna,
    })
    : qualityDraft;

  const diff = buildLineDiff(draft, polished);
  const summary = summarizeDiff(draft, polished);

  return {
    version: 'writer-optimizer-5',
    role: 'writer-optimizer',
    mode: 'four-module-optimizers',
    executionIntelligence: executionIntelligence || null,
    beatCompliance: resolvedBeatCompliance,
    readerSimulation: readerSimulation || null,
    emotionCurve: emotionCurve || null,
    chapter,
    scene: {
      id: scene.id,
      index: scene.index,
      goal: scene.goal,
    },
    dimensions: OPTIMIZER_DIMENSIONS,
    moduleOptimizers: MODULE_OPTIMIZERS,
    modules: modules || null,
    scores: qualityPolished.scores,
    scoresBefore: qualityDraft.scores,
    total: qualityPolished.total,
    totalBefore: qualityDraft.total,
    weakest: qualityPolished.weakest,
    polish: polishMeta,
    diff: summary,
    diffLines: diff.lines.filter((l) => l.type !== 'same').slice(0, 40),
    draftPath: 'draft.md',
    polishedPath: 'polished_draft.md',
    blocking: false,
    policy: 'LLM Draft → 四模块 Optimizer（Dialogue/Conflict/Description/Ending）→ Novel',
    generatedAt: new Date().toISOString(),
    quality: qualityPolished,
  };
}

export function persistOptimizerReport(bookDir, chapter, scene, report) {
  try {
    const dir = sceneDir(bookDir, chapter, scene);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'optimizer_report.json');
    fs.writeFileSync(file, JSON.stringify(report, null, 2), 'utf8');
    return file;
  } catch {
    return null;
  }
}

/**
 * Writer Optimizer — LLM 之后、Novel 之前
 * 四模块优化：Dialogue / Conflict / Description / Ending
 */
export async function runWriterOptimizer({
  text,
  scene = {},
  chapter = null,
  intent = {},
  ctx = {},
  styleDna = {},
  bookDir = null,
  polishFn = null,
  skipPolish = false,
  beatParts = null,
  executionPlan = null,
  beatCompliance = null,
  readerSimulation = null,
  emotionCurve = null,
  executionIntelligence = null,
} = {}) {
  const draftText = String(text || '').trim();
  const qualityBefore = computeWriterOptimizerScore({
    text: draftText,
    scene,
    chapter,
    intent,
    ctx,
    styleDna,
  });

  let moduleResult = {
    draft: draftText,
    polished: draftText,
    text: draftText,
    changed: false,
    modules: {},
  };

  if (!skipPolish) {
    const wrappedPolishFn = typeof polishFn === 'function'
      ? async (module, fragment, instructions, meta) => polishFn(module, fragment, instructions, meta)
      : null;

    moduleResult = await runModuleOptimizers({
      text: draftText,
      scene,
      intent,
      polishFn: wrappedPolishFn,
    });
  }

  const report = buildOptimizerReport({
    text: moduleResult.polished,
    scene,
    chapter,
    intent,
    ctx,
    styleDna,
    draftText,
    polishedText: moduleResult.polished,
    modules: moduleResult.modules,
    beatParts,
    executionPlan,
    beatCompliance,
    readerSimulation,
    emotionCurve,
    executionIntelligence,
    polishMeta: {
      changed: moduleResult.changed,
      mode: moduleResult.changed ? 'four-module' : 'none',
      modules: moduleResult.modules,
      edits: Object.entries(moduleResult.modules || {})
        .filter(([, m]) => m.changed)
        .map(([k]) => k),
    },
  });

  let paths = null;
  if (bookDir && chapter != null) {
    paths = persistDraftArtifacts(bookDir, chapter, scene, {
      draft: draftText,
      polished: moduleResult.polished,
      report,
    });
  }

  return {
    text: moduleResult.polished,
    draftText,
    polishedText: moduleResult.polished,
    ...report,
    reportPath: paths?.reportPath ?? null,
    draftPath: paths?.draftPath ?? null,
    polishedPath: paths?.polishedPath ?? null,
    pass: true,
    blocking: false,
    polish: {
      changed: moduleResult.changed,
      modules: moduleResult.modules,
    },
    modules: moduleResult.modules,
  };
}
