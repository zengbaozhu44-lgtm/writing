/**
 * 推断 Scene Type — Dynamic Budget 权重依据（非固定 Tier）
 */
import {
  SCENE_TYPE_TOKEN_TARGETS,
  BUDGET_MIN_TOKENS,
  BUDGET_MAX_TOKENS,
  TARGET_BUDGET_TOKENS,
} from './constants.js';

export function resolveTargetBudget(sceneType = 'standard') {
  const raw = SCENE_TYPE_TOKEN_TARGETS[sceneType] ?? TARGET_BUDGET_TOKENS;
  return Math.max(BUDGET_MIN_TOKENS, Math.min(BUDGET_MAX_TOKENS, raw));
}

export function inferSceneType(scene = {}, intent = {}) {
  const goal = `${scene.goal || ''} ${scene.title || ''} ${scene.conflict || ''} ${scene.beat || ''}`;
  const index = scene.index ?? 1;
  const total = intent.scenes?.length || scene.totalScenes || 4;

  if (index === 1 || scene.beat === 'situation') return 'opening';
  if (index === total || scene.beat === 'hook') return 'ending';
  if (/对话|对白|谈判|质问|交谈|辩/.test(goal) || scene.beat === 'complication') return 'dialogue';
  if (/冲突|对抗|高潮|抉择|爆发|危机|追逐|战斗/.test(goal) || scene.beat === 'turn') return 'climax';
  if (/动作|逃跑|追逐|搏斗|冲刺/.test(goal)) return 'action';
  if (/说明|背景|回忆|世界观|设定|交代|调查|线索|真相/.test(goal)) return 'exposition';
  return 'standard';
}

export function adjustWeights(base, scene = {}, intent = {}, totalTokens = TARGET_BUDGET_TOKENS) {
  const w = { ...base };
  const goal = `${scene.goal || ''} ${scene.conflict || ''} ${intent.mainGoal || ''}`;

  if ((scene.entities?.length || 0) > 3) {
    w.character += 0.04;
    w.world -= 0.02;
    w.facts -= 0.02;
  }

  if (/钩子|悬念|结尾|Hook/.test(goal) && scene.index === (intent.scenes?.length || scene.totalScenes)) {
    w.conflict += 0.04;
    w.goal += 0.02;
    w.history -= 0.06;
  }

  if (intent.pov && goal.includes(intent.pov)) {
    w.character += 0.03;
    w.goal -= 0.03;
  }

  if (/回忆|前情|往事|历史/.test(goal)) {
    w.history += 0.05;
    w.world += 0.02;
    w.facts -= 0.04;
    w.knowledge -= 0.03;
  }

  if (/关系|信任|敌意|联盟/.test(goal)) {
    w.relationship += 0.05;
    w.character -= 0.03;
    w.knowledge -= 0.02;
  }

  const sum = Object.values(w).reduce((a, b) => a + b, 0);
  for (const k of Object.keys(w)) w[k] = w[k] / sum;

  if (totalTokens < TARGET_BUDGET_TOKENS) {
    const ratio = (TARGET_BUDGET_TOKENS - totalTokens) / TARGET_BUDGET_TOKENS;
    const cut = Math.min(w.world * 0.45, ratio * 0.1);
    w.world = Math.max(0.04, w.world - cut);
    w.character += cut * 0.55;
    w.facts += cut * 0.45;
  } else if (totalTokens > TARGET_BUDGET_TOKENS) {
    const ratio = (totalTokens - TARGET_BUDGET_TOKENS) / TARGET_BUDGET_TOKENS;
    const bonus = Math.min(0.08, ratio * 0.1);
    w.character += bonus;
    w.world = Math.max(0.04, w.world - bonus);
  }

  const sum2 = Object.values(w).reduce((a, b) => a + b, 0);
  for (const k of Object.keys(w)) w[k] = w[k] / sum2;
  return w;
}
