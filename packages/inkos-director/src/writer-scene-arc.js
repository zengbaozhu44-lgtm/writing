/**
 * Writer Scene Arc — 职业作者 Scene 结构（Module 3）
 * Goal → Conflict → Choice → Consequence → Reward → New Threat
 * 每 Beat 须改变 ≥2 项状态维度
 */

export const STATE_DIMENSIONS = [
  { id: 'character', label: '人物' },
  { id: 'relationship', label: '关系' },
  { id: 'world', label: '世界' },
  { id: 'information', label: '信息' },
  { id: 'resource', label: '资源' },
  { id: 'danger', label: '危险' },
];

export const SCENE_ARC_SEQUENCE = [
  { id: 'goal', label: 'Goal', beat: 'goal' },
  { id: 'conflict', label: 'Conflict', beat: 'obstacle' },
  { id: 'choice', label: 'Choice', beat: 'choice' },
  { id: 'consequence', label: 'Consequence', beat: 'consequence' },
  { id: 'reward', label: 'Reward', beat: 'newInformation' },
  { id: 'newThreat', label: 'New Threat', beat: 'hook' },
];

const STAGNANT_LOOP = /继续调查|发现异常|调查异常|寻找线索|又发现|更多信息|进一步确认/u;

const BEAT_DIMENSION_MAP = {
  goal: ['character', 'danger'],
  obstacle: ['danger', 'resource'],
  choice: ['character', 'relationship'],
  consequence: ['resource', 'relationship', 'danger'],
  newInformation: ['information', 'world'],
  hook: ['danger', 'information', 'world'],
};

export function buildWriterSceneArc({
  executionPlan = {},
  conflict = {},
  reward = {},
  hookOutput = {},
} = {}) {
  const plan = executionPlan.scenePlan || {};
  const situation = executionPlan.situation || {};

  // S8.2-R4-B：consequence 仅 authored；禁止 plan.consequence || conflict.cost
  const authoredConsequence = (() => {
    const cons = String(plan.consequence || '').trim();
    if (!cons || plan._consequenceMissing) return null;
    if (/选择产生可见代价|局面因此改变|no_causal_basis/u.test(cons)) return null;
    return cons;
  })();

  const arc = SCENE_ARC_SEQUENCE.map((step) => {
    const contentMap = {
      goal: plan.goal,
      conflict: conflict.opposition || plan.obstacle,
      choice: plan.choice,
      consequence: authoredConsequence,
      reward: reward.payoff || plan.newInformation,
      newThreat: hookOutput?.actionDeadline || plan.cliffhanger,
    };
    const raw = contentMap[step.id];
    const content = step.id === 'consequence'
      ? (raw || 'missing（非 Conflict cost；≠ Choice consequence）')
      : (raw || '—');
    return {
      ...step,
      content,
      dimensions: BEAT_DIMENSION_MAP[step.beat] || ['world'],
    };
  });

  return {
    version: 'writer-scene-arc-1',
    sequence: arc,
    minDimensionsPerBeat: 2,
    stagnantBanned: STAGNANT_LOOP.source,
    outputChain: [
      '第一屏抓人',
      '持续升级',
      '不断获得奖励',
      '不断制造新危机',
      '章尾逼翻页',
    ],
    bans: [
      '禁止解释剧情',
      '禁止重复信息',
      '禁止总结人物心理',
      '禁止调查→发现一点→继续调查',
    ],
    priorities: ['动作', '对白', '事件'],
    situationValid: (situation.dimensionsChanged ?? 0) >= 2,
  };
}

export function formatWriterSceneArcBlock(arc = {}) {
  if (!arc?.sequence?.length) return '';

  const lines = [
    '### Writer Scene Arc · 职业作者结构（P1）',
    '**Scene 节奏**：Goal → Conflict → Choice → Consequence → Reward → New Threat',
    '',
    ...arc.sequence.map((s) => `- **${s.label}**：${(s.content || '—').slice(0, 55)}`),
    '',
    '**每 Beat 须改变 ≥2 项状态**：人物 · 关系 · 世界 · 信息 · 资源 · 危险',
    '',
    '**输出链**：',
    ...arc.outputChain.map((s, i) => `${i + 1}. ${s}`),
    '',
    '**禁止**：',
    ...arc.bans.map((b) => `- ${b}`),
    '',
    `**优先**：${arc.priorities.join(' > ')} — 动作与对白推动，不用心理总结`,
    '- ❌ 调查 → 发现一点 → 继续调查（原地踏步）',
    '- ✅ 调查 → 局势升级 → 获得奖励 → 更大危机（代价仅在有 authored consequence 时写）',
  ];

  return lines.join('\n');
}

export function getBeatRequiredDimensions(structuralBeat = '') {
  const dims = BEAT_DIMENSION_MAP[structuralBeat] || ['world', 'information'];
  return dims.length >= 2 ? dims : [...dims, 'danger'];
}

export function detectStagnantLoop(text = '') {
  const hits = (String(text).match(STAGNANT_LOOP) || []).length;
  return { stagnant: hits >= 2, hits };
}
