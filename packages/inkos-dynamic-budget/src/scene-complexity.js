/**
 * Scene Complexity — Type + 复杂度联合决定 Budget
 */
import { BUDGET_MIN_TOKENS, BUDGET_MAX_TOKENS } from './constants.js';

const DIALOGUE_RE = /[「""『][^」""』\n]{2,}?[」""』]/g;

export function analyzeSceneComplexity(scene = {}, intent = {}, ctx = {}) {
  const goal = `${scene.goal || ''} ${scene.conflict || ''} ${scene.title || ''} ${intent.mainGoal || ''}`;
  const entities = scene.entities || ctx.present || [];
  const characterCount = entities.length;

  const obstacles = intent.obstacles || [];
  const conflictCount = (scene.conflict ? 1 : 0) + obstacles.length
    + (goal.match(/冲突|对抗|危机|阻碍/g) || []).length;

  const worldChange = /世界|规则|设定|制度|系统|势力|地图|纪元|灾变|事件/.test(goal)
    || scene.beat === 'situation';

  const textSample = `${goal} ${(scene.entities || []).join(' ')}`;
  const dialogueBlocks = (textSample.match(DIALOGUE_RE) || []).length;
  const dialogueDensity = /对话|对白|谈判|质问/.test(goal)
    ? Math.min(1, 0.45 + dialogueBlocks * 0.15)
    : Math.min(0.8, dialogueBlocks * 0.2);

  const battleScale = /战斗|搏斗|追逐|围攻|枪|刀|爆炸|厮杀|战争|对决/.test(goal)
    ? (/大规模|军团|全城|战场/.test(goal) ? 1 : 0.65)
    : /动作|逃跑|冲刺/.test(goal) ? 0.45 : 0.1;

  const infoRelease = /线索|真相|揭露|发现|档案|日志|秘密|情报|调查/.test(goal)
    ? 0.75
    : /说明|背景|回忆|交代/.test(goal) ? 0.55 : 0.25;

  const raw = (
    Math.min(characterCount / 5, 1) * 0.22
    + Math.min(conflictCount / 3, 1) * 0.2
    + (worldChange ? 0.14 : 0)
    + dialogueDensity * 0.16
    + battleScale * 0.14
    + infoRelease * 0.14
  );

  const score = Math.round(Math.min(1, Math.max(0, raw)) * 100) / 100;
  const level = score < 0.35 ? 'low' : score < 0.65 ? 'medium' : 'high';

  return {
    characterCount,
    conflictCount,
    worldChange,
    dialogueDensity: Math.round(dialogueDensity * 100) / 100,
    battleScale: Math.round(battleScale * 100) / 100,
    infoRelease: Math.round(infoRelease * 100) / 100,
    score,
    level,
  };
}

export function applyComplexityToTargetBudget(baseTarget, complexity = {}) {
  const score = complexity.score ?? 0.5;
  const delta = Math.round((score - 0.5) * 600);
  return Math.max(BUDGET_MIN_TOKENS, Math.min(BUDGET_MAX_TOKENS, baseTarget + delta));
}

export function applyComplexityToWeights(weights, complexity = {}) {
  const w = { ...weights };
  const {
    characterCount = 0,
    conflictCount = 0,
    worldChange = false,
    dialogueDensity = 0,
    battleScale = 0,
    infoRelease = 0,
  } = complexity;

  if (characterCount >= 4) {
    w.character += 0.05;
    w.relationship += 0.03;
    w.world -= 0.04;
  } else if (characterCount <= 1) {
    w.character -= 0.03;
    w.goal += 0.02;
    w.conflict += 0.01;
  }

  if (conflictCount >= 2) {
    w.conflict += 0.05;
    w.goal += 0.02;
    w.world -= 0.03;
  }

  if (worldChange) {
    w.world += 0.06;
    w.knowledge += 0.03;
    w.facts += 0.02;
    w.history -= 0.05;
  }

  if (dialogueDensity >= 0.4) {
    w.character += 0.04;
    w.relationship += 0.04;
    w.world -= 0.04;
    w.facts -= 0.02;
  }

  if (battleScale >= 0.5) {
    w.conflict += 0.04;
    w.facts += 0.03;
    w.character += 0.02;
    w.knowledge -= 0.03;
  }

  if (infoRelease >= 0.5) {
    w.knowledge += 0.05;
    w.facts += 0.04;
    w.history += 0.02;
    w.world -= 0.04;
  }

  const sum = Object.values(w).reduce((a, b) => a + b, 0);
  for (const k of Object.keys(w)) w[k] = w[k] / sum;
  return w;
}
