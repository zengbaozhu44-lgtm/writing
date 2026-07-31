/**
 * Narrative Metrics — 叙事指标 Dashboard
 */
import { exists, readJson, writeJson } from '../../../inkos-core/src/lib/paths.js';

export function computeMetrics(chapterText, intent, scenes, conflictResult) {
  const text = chapterText || '';
  const chars = text.replace(/\s/g, '');
  const len = chars.length;

  const lines = text.split('\n').filter((l) => l.trim());
  const dialogueLines = lines.filter((l) => /[「」""]/.test(l) || /^[^。！？]{1,12}[：:]/.test(l));
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

  if (metrics.conflictDensity < 2) {
    suggestions.push({
      type: 'conflict',
      target: 'next_scene',
      message: `冲突密度 ${metrics.conflictDensity} 不足，Scene2 需加压`,
      suggestObstacle: '外部阻力或信息差',
      replan: true,
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
      replan: true,
      suggestGoal: '扩展转折场景',
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
      replan: true,
    });
  }

  if (recent.length >= 3) {
    const avgConflict = recent.reduce((s, c) => s + c.conflictDensity, 0) / recent.length;
    if (avgConflict < 1.5) {
      suggestions.push({
        type: 'trend',
        message: '连续章节冲突密度偏低',
        replan: true,
        plannerHint: { type: 'conflictPriority', delta: 0.1 },
      });
    }
  }

  const needsReplan = suggestions.some((s) => s.replan);
  return { suggestions, needsReplan, low: metrics.conflictDensity < 2 || metrics.wordCount < 2000 };
}
