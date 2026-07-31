/**
 * Scene Ending Library — 结尾模式轮换
 * 避免几十章后全是 Hook Ending 套路
 */

export const SCENE_ENDING_TYPES = {
  question: {
    id: 'question',
    label: 'Question Ending',
    pattern: '致命追问落地，读者必须知道答案',
    example: '如果四点真的会重置，谁还在看着我们？',
  },
  decision: {
    id: 'decision',
    label: 'Decision Ending',
    pattern: 'POV 必须立刻做出选择，选项都有代价',
    example: '上报，或者成为共犯 — 她只有三秒。',
  },
  failure: {
    id: 'failure',
    label: 'Failure Ending',
    pattern: '目标受挫，代价已落地，局面更紧',
    example: '门开了，但信用档案已经亮黄灯。',
  },
  victory: {
    id: 'victory',
    label: 'Victory Ending',
    pattern: '小胜落地，随即露出更大隐患',
    example: '妹妹活下来了 — 系统日志里出现了她的名字。',
  },
  sacrifice: {
    id: 'sacrifice',
    label: 'Sacrifice Ending',
    pattern: '用失去换进展，读者感到心疼',
    example: '他删掉了最后一条退路，换她一线生机。',
  },
  countdown: {
    id: 'countdown',
    label: 'Countdown Ending',
    pattern: '倒计时开始，行动窗口收窄',
    example: '距离四点还有三十秒，而他还没拔掉那根线。',
  },
  reversal: {
    id: 'reversal',
    label: 'Reversal Ending',
    pattern: '认知反转，刚建立的判断被推翻',
    example: '苏晚关门的瞬间，他才发现她屏幕上是他的档案。',
  },
};

const ROTATION_ORDER = [
  'question', 'decision', 'countdown', 'reversal',
  'victory', 'sacrifice', 'failure', 'question',
];

function lastEndingType(intent = {}, sceneIndex = 1) {
  const prev = (intent.scenes || []).filter((s) => (s.index ?? 0) < sceneIndex);
  for (let i = prev.length - 1; i >= 0; i -= 1) {
    const t = prev[i].executionPlan?.sceneEnding?.type
      || prev[i].scenePlan?.sceneEnding?.type;
    if (t) return t;
  }
  return null;
}

/**
 * 为 Scene 选择结尾模式 — 自动轮换，高潮 Scene 优先 countdown/reversal
 */
export function selectSceneEnding({
  sceneIndex = 1,
  sceneCount = 4,
  chapter = 1,
  plan = {},
  scene = {},
  intent = {},
  climaxRole = null,
} = {}) {
  if (scene.sceneEnding?.type) {
    return normalizeEnding(scene.sceneEnding);
  }

  const prev = lastEndingType(intent, sceneIndex);
  let typeId = ROTATION_ORDER[(sceneIndex - 1 + chapter) % ROTATION_ORDER.length];

  if (climaxRole?.isClimax) typeId = 'countdown';
  else if (climaxRole?.isPreClimax) typeId = 'decision';
  else if (prev === typeId) {
    const idx = ROTATION_ORDER.indexOf(typeId);
    typeId = ROTATION_ORDER[(idx + 1) % ROTATION_ORDER.length];
  }

  // 仅作偏置，不强制覆盖轮换（否则全书牺牲/胜利结局锁死）
  if (!climaxRole?.isClimax && !climaxRole?.isPreClimax) {
    if (/活下|成功保住/u.test(plan.consequence || '') && typeId !== prev) typeId = 'victory';
    else if (/牺牲自己|舍弃退路/u.test(plan.consequence || '')) typeId = 'sacrifice';
  }

  const def = SCENE_ENDING_TYPES[typeId] || SCENE_ENDING_TYPES.question;
  const cliff = plan.cliffhanger || scene.cliffhanger || '';

  return {
    type: typeId,
    label: def.label,
    pattern: def.pattern,
    example: def.example,
    cliffhangerHint: cliff || def.example,
    writerMust: `Hook Beat 用 **${def.label}** — ${def.pattern}`,
    avoid: '禁止又是「门后有人」式重复悬念',
  };
}

function normalizeEnding(e = {}) {
  const def = SCENE_ENDING_TYPES[e.type] || SCENE_ENDING_TYPES.question;
  return {
    type: e.type || def.id,
    label: e.label || def.label,
    pattern: e.pattern || def.pattern,
    cliffhangerHint: e.cliffhangerHint || e.example || def.example,
    writerMust: e.writerMust || `Hook Beat：${def.pattern}`,
  };
}

export function formatSceneEndingBlock(ending = {}) {
  if (!ending?.type) return '';

  return [
    '### Scene Ending · 结尾模式（P2）',
    `- **类型**：${ending.label}`,
    `- **模式**：${ending.pattern}`,
    `- **参考**：${ending.cliffhangerHint?.slice(0, 55) || ending.example}`,
    `- **Writer**：${ending.writerMust}`,
    `- **避免**：${ending.avoid || '重复 Hook 模板'}`,
  ].join('\n');
}

export function formatSceneEndingBrief(ending = {}) {
  if (!ending?.label) return '';
  return `Ending：${ending.label}`;
}
