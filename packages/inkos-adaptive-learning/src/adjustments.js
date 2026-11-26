import { LEARNING_DIMENSIONS } from './constants.js';

const BOOST_RULES = {
  hook: {
    budgetDelta: { goal: 0.03, conflict: 0.04, history: -0.04 },
    endingBudgetBoost: 140,
    promptLines: [
      '**Hook 强化**：结尾必须留悬念/未完成动作，禁止平收',
      '章末需有读者追问（？/吗/能否/到底）或突发变数',
    ],
    climaxHint: true,
  },
  conflict: {
    budgetDelta: { conflict: 0.06, goal: 0.02, world: -0.03 },
    promptLines: [
      '**冲突强化**：目标→阻碍→升级→代价 四层必须可见',
      '每个 Scene 至少一次冲突升级或代价逼近',
    ],
  },
  dialogue: {
    budgetDelta: { character: 0.05, relationship: 0.04, world: -0.04 },
    promptLines: [
      '**对白强化**：增加对白块与潜台词，避免说明式旁白',
      '对白需体现人物立场差异与情绪节拍',
    ],
  },
  pacing: {
    budgetDelta: { history: -0.05, facts: 0.03, goal: 0.02 },
    promptLines: [
      '**节奏强化**：压缩说明段，增加事件推进与场景切换',
      '避免连续环境描写超过 2 句',
    ],
  },
  emotion: {
    budgetDelta: { character: 0.05, relationship: 0.03, facts: -0.03 },
    promptLines: [
      '**情绪强化**：POV 内心反应与身体感受必须可见',
      '情绪需随冲突升级而变化',
    ],
  },
  style: {
    budgetDelta: { world: 0.03, character: 0.02, facts: -0.03 },
    promptLines: [
      // 1c-1: 旧措辞「身体先行」「增加具体感官细节」与第 9 条/风格约束矛盾——
      // 感官只在承担叙事功能时增加，不再作为独立强化方向
      '**文风强化**：遵守写作圣经硬切、动作先行（具体、可感）、限知视角',
      '减少说明腔；感官细节只在承担叙事功能（揭示判断/引入障碍/改变理解）时增加',
    ],
  },
};

function mergeBudgetDelta(target, delta) {
  for (const [k, v] of Object.entries(delta || {})) {
    target[k] = (target[k] || 0) + v;
  }
}

export function buildPromptAdjustments(trends = {}) {
  const budgetWeights = {};
  let endingBudgetBoost = 0;
  const promptLines = [];
  const activeDimensions = [];
  let climaxHint = false;

  for (const dim of LEARNING_DIMENSIONS) {
    const t = trends[dim];
    if (!t?.needsBoost) continue;
    const rule = BOOST_RULES[dim];
    if (!rule) continue;
    activeDimensions.push(dim);
    mergeBudgetDelta(budgetWeights, rule.budgetDelta);
    if (rule.endingBudgetBoost) endingBudgetBoost = Math.max(endingBudgetBoost, rule.endingBudgetBoost);
    if (rule.climaxHint) climaxHint = true;
    promptLines.push(...(rule.promptLines || []));
  }

  return {
    activeDimensions,
    budgetWeights,
    endingBudgetBoost,
    climaxHint,
    promptLines,
    generatedAt: new Date().toISOString(),
  };
}

export function applyAdjustmentsToBudget(budget = {}, adjustments = {}, scene = {}) {
  if (!adjustments?.budgetWeights || !Object.keys(adjustments.budgetWeights).length) {
    return { ...budget };
  }

  const out = { ...budget };
  const total = Object.values(out).reduce((s, v) => s + (v || 0), 0) || 2500;

  for (const [key, deltaWeight] of Object.entries(adjustments.budgetWeights)) {
    if (out[key] == null) continue;
    const deltaTokens = Math.round(total * deltaWeight);
    out[key] = Math.max(40, out[key] + deltaTokens);
  }

  const sceneType = scene._sceneType || scene.beat;
  if (adjustments.endingBudgetBoost && (sceneType === 'ending' || sceneType === 'hook' || scene.index === scene.totalScenes)) {
    out.goal = (out.goal || 0) + Math.round(adjustments.endingBudgetBoost * 0.35);
    out.conflict = (out.conflict || 0) + Math.round(adjustments.endingBudgetBoost * 0.45);
    out.history = Math.max(40, (out.history || 0) - Math.round(adjustments.endingBudgetBoost * 0.2));
  }

  return out;
}

export function buildAdaptivePromptBlock(adjustments = {}) {
  if (!adjustments?.promptLines?.length) return '';

  const lines = [
    '<!-- inkos-adaptive-learning -->',
    '## Adaptive Learning · Prompt 自动调权',
    '',
    `活跃维度：${(adjustments.activeDimensions || []).join('、') || '—'}`,
    '',
    ...adjustments.promptLines.map((l) => `- ${l}`),
  ];

  if (adjustments.climaxHint) {
    lines.push('- **高潮提示**：本 Scene 需有明显转折或代价爆发');
  }

  return lines.join('\n');
}
