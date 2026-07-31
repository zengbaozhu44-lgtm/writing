/**
 * Adaptive Brain — 长期反馈调权
 */
import path from 'node:path';
import { exists, readJson, writeJson } from '../../../inkos-core/src/lib/paths.js';
import { brainSystemDir } from '../loader.js';

const DEFAULT_WEIGHTS = {
  actionSceneWeight: 1.0,
  conflictPriority: 1.0,
  dialogueTarget: 0.45,
  hookEmphasis: 1.0,
  styleStrictness: 1.0,
  sceneCountBias: 0,
};

export function loadAdaptiveState(bookDir) {
  const file = path.join(brainSystemDir(bookDir), 'adaptive_state.json');
  if (!exists(file)) return { weights: { ...DEFAULT_WEIGHTS }, history: [] };
  return readJson(file);
}

export function saveAdaptiveState(bookDir, state) {
  const file = path.join(brainSystemDir(bookDir), 'adaptive_state.json');
  writeJson(file, state);
  return file;
}

export function applyAdaptiveFeedback(bookDir, feedback) {
  const state = loadAdaptiveState(bookDir);
  const w = { ...DEFAULT_WEIGHTS, ...state.weights };

  const { metrics, reader, critic, dashboard } = feedback;
  const recent = (dashboard?.chapters ?? []).slice(-10);

  if (recent.length >= 3) {
    const avgPace = recent.reduce((s, c) => s + (c.dialogueRatio ?? 0), 0) / recent.length;
    if (avgPace < 0.25) w.actionSceneWeight = clamp(w.actionSceneWeight + 0.1, 0.8, 1.5);
    if (avgPace > 0.65) w.dialogueTarget = clamp(w.dialogueTarget - 0.05, 0.3, 0.6);

    const avgConflict = recent.reduce((s, c) => s + (c.conflictDensity ?? 0), 0) / recent.length;
    if (avgConflict < 1.5) w.conflictPriority = clamp(w.conflictPriority + 0.1, 0.8, 1.6);
  }

  if (reader?.readingDrive < 60) w.hookEmphasis = clamp(w.hookEmphasis + 0.08, 0.9, 1.5);
  if (critic?.overall < 62) {
    for (const hint of critic.plannerHints || []) {
      if (hint.type === 'actionSceneWeight') w.actionSceneWeight = clamp(w.actionSceneWeight + hint.delta, 0.8, 1.6);
      if (hint.type === 'conflictPriority') w.conflictPriority = clamp(w.conflictPriority + hint.delta, 0.8, 1.6);
      if (hint.type === 'styleStrictness') w.styleStrictness = clamp(w.styleStrictness + hint.delta, 0.9, 1.4);
    }
  }

  if (metrics?.mindRatio > 0.08) w.styleStrictness = clamp(w.styleStrictness + 0.05, 0.9, 1.4);

  state.weights = w;
  state.history = (state.history || []).slice(-49);
  state.history.push({
    at: new Date().toISOString(),
    weights: { ...w },
    triggers: {
      readingDrive: reader?.readingDrive,
      criticOverall: critic?.overall,
      conflictDensity: metrics?.conflictDensity,
    },
  });
  saveAdaptiveState(bookDir, state);
  return state;
}

export function applyWeightsToIntent(intent, weights) {
  const w = { ...DEFAULT_WEIGHTS, ...weights };
  const scenes = [...intent.scenes];

  if (w.actionSceneWeight > 1.1) {
    for (const s of scenes) {
      if (s.beat === 'complication' || s.beat === 'situation') {
        s.wordTarget = Math.round((s.wordTarget || 800) * w.actionSceneWeight);
        s.conflict = s.conflict || '行动受阻';
      }
    }
  }

  if (w.conflictPriority > 1.1 && intent.obstacles.length < 2) {
    intent.obstacles.push('利益冲突加剧');
  }

  if (w.hookEmphasis > 1.1) {
    const hook = scenes.find((s) => s.beat === 'hook');
    if (hook) hook.wordTarget = Math.round((hook.wordTarget || 600) * w.hookEmphasis);
  }

  if (w.sceneCountBias > 0 && scenes.length < 5) {
    scenes.splice(scenes.length - 1, 0, {
      index: scenes.length,
      id: `ch${intent.chapter}_s_extra`,
      title: '加压场景',
      goal: '提高冲突密度',
      conflict: intent.obstacles[0] || '外部压力',
      entities: [intent.pov],
      beat: 'complication',
    });
    scenes.forEach((s, i) => { s.index = i + 1; });
  }

  return { ...intent, scenes };
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Math.round(n * 1000) / 1000));
}
