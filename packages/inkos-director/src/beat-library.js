/**
 * Beat Library — 商业节奏原子 + 六结构 Beat（状态变化版）
 */
export const LIBRARY_BEAT_TYPES = [
  'Discovery',
  'Danger',
  'Decision',
  'Twist',
  'Relationship',
  'Countdown',
  'Reward',
  'Quiet',
];

/**
 * 安静节拍的六种内容变体（用户方法论）：让读者喘气的段落
 * 生理性 / 情感性 / 回忆性 / 环境性 / 认知性 / 对话性
 */
export const QUIET_POOLS = [
  {
    id: 'quiet-physical',
    label: '生理性安静',
    hint: '身体极限：粗重喘息、耳鸣、视野发灰。语言能力下降，只剩感官碎片。',
  },
  {
    id: 'quiet-emotional',
    label: '情感性安静',
    hint: '面对重大失去：空白、僵住、无法反应。心理防御启动，来不及悲伤。',
  },
  {
    id: 'quiet-memory',
    label: '回忆性安静',
    hint: '动作暂停时闪回过去的具体画面（画面不是解释）。让读者理解他为何怕失去。',
  },
  {
    id: 'quiet-environment',
    label: '环境性安静',
    hint: '观察环境细节：声音、光线、气味、温度。不推进情节，让读者「在场」。',
  },
  {
    id: 'quiet-cognitive',
    label: '认知性安静',
    hint: '新信息后的理解延迟：大脑在消化，还没得出结论。让读者和角色同步思考。',
  },
  {
    id: 'quiet-dialogue',
    label: '对话性安静',
    hint: '两人之间的沉默、停顿、没说出口的话。让读者在空白处填充情绪。',
  },
];

/** Goal → Obstacle → Choice → Consequence → New Information → Hook */
export const STRUCTURAL_BEATS = [
  'goal',
  'obstacle',
  'choice',
  'consequence',
  'newInformation',
  'hook',
];

/** @deprecated 兼容旧引用 */
export const LEGACY_STRUCTURAL_BEATS = [...STRUCTURAL_BEATS];

export const LIBRARY_BEAT_DEFS = {
  Discovery: {
    label: 'Discovery',
    hint: '在已有线索/界面上读出新约束或选项；若界面已出现，禁止再写「第一次发现」',
    verbs: '读出、对上、按下、确认、承受',
  },
  Danger: {
    label: 'Danger',
    hint: '威胁逼近或风险落地，POV 感到不安全',
    verbs: '逼近、锁定、警告、失控',
  },
  Decision: {
    label: 'Decision',
    hint: 'POV 必须在有限选项中做出选择，选择有代价',
    verbs: '必须选、只能、要不要、赌',
  },
  Twist: {
    label: 'Twist',
    hint: '预期被违背，信息翻盘或身份/动机反转（优先改写已有信息，勿新开界面）',
    verbs: '却、竟然、原来、反馈变成',
  },
  Relationship: {
    label: 'Relationship',
    hint: '关系张力变化（信任/敌意/依赖/背叛）',
    verbs: '对峙、试探、让步、翻脸',
  },
  Countdown: {
    label: 'Countdown',
    hint: '时间/资源/机会窗口收窄，紧迫感上升',
    verbs: '来不及、还剩、倒计时、最后',
  },
  Reward: {
    label: 'Reward',
    hint: '局部兑现已操作结果并带新代价；禁止「又解锁一个新面板」',
    verbs: '终于、拿到、换来、代价随之',
  },
  Quiet: {
    label: 'Quiet',
    hint: '高潮后的安静节拍：动作暂停，只写感官/环境/回忆/沉默。禁止推进新情节、禁止新倒计时、禁止新威胁。让读者喘口气，消化前情。',
    verbs: '停下来、看着、想起、沉默、听见',
  },
};

/** 安静节拍可用的内容变体池（六种安静类型） */
export const QUIET_POOL = QUIET_POOLS;

const STRUCTURAL_POOLS = {
  // F7.1: Decision hint only on choice beats (Fake Choice gate)
  goal: ['Relationship', 'Discovery', 'Danger'],
  obstacle: ['Danger', 'Countdown', 'Twist'],
  choice: ['Decision', 'Relationship', 'Twist'],
  consequence: ['Danger', 'Countdown', 'Twist'],
  newInformation: ['Twist', 'Reward', 'Discovery'],
  hook: ['Twist', 'Countdown', 'Danger'],
  /** @deprecated */
  escalation: ['Relationship', 'Twist', 'Danger'],
};

/**
 * F7.1 — Decision library hint only when structuralBeat === 'choice'
 * or an explicit authored choice marker is present.
 * Does not create L1 Choice / new choice fields.
 */
export function isDecisionHintAllowed(structuralBeat = '', { authoredChoice = false } = {}) {
  if (authoredChoice) return true;
  return String(structuralBeat || '') === 'choice';
}

/**
 * Remap Decision → Discovery on non-choice structural beats.
 */
export function sanitizeLibraryBeat(structuralBeat, libraryBeat, opts = {}) {
  const type = String(libraryBeat || '');
  if (type === 'Decision' && !isDecisionHintAllowed(structuralBeat, opts)) {
    return 'Discovery';
  }
  return type || 'Discovery';
}

function rotatePool(pool, offset) {
  const n = pool.length;
  return pool.map((_, i) => pool[(i + offset) % n]);
}

function resolveBeatSequence(beats = null) {
  const seq = beats || STRUCTURAL_BEATS;
  return seq.map((b) => (b === 'escalation' ? 'choice' : b));
}

export function assignLibraryBeats(sceneIndex = 1, {
  prevLastType = null,
  customPools = null,
  beatSequence = null,
  preferLibraryBeats = null,
} = {}) {
  const offset = (sceneIndex - 1) % 3;
  const assigned = {};
  let last = prevLastType;
  const pools = customPools
    ? { ...STRUCTURAL_POOLS, ...customPools }
    : STRUCTURAL_POOLS;
  const sequence = resolveBeatSequence(beatSequence);
  const prefer = Array.isArray(preferLibraryBeats) ? preferLibraryBeats : [];

  for (const structural of sequence) {
    const pool = rotatePool(pools[structural] || STRUCTURAL_POOLS[structural], offset);
    let pick = pool.find((t) => t !== last) || pool[0];
    if (prefer.length) {
      const preferred = pool.find((t) => prefer.includes(t) && t !== last)
        || pool.find((t) => prefer.includes(t));
      if (preferred) pick = preferred;
    }
    assigned[structural] = pick;
    last = pick;
  }

  const unique = new Set(Object.values(assigned));
  if (unique.size < 3) {
    assigned.newInformation = 'Twist';
    assigned.goal = 'Discovery';
    assigned.hook = 'Countdown';
    if (assigned.obstacle === assigned.choice) {
      assigned.choice = 'Decision';
    }
  }

  for (let i = 1; i < sequence.length; i += 1) {
    const prev = sequence[i - 1];
    const cur = sequence[i];
    if (assigned[prev] === assigned[cur]) {
      const alt = (pools[cur] || STRUCTURAL_POOLS[cur]).find((t) => t !== assigned[prev]) || 'Twist';
      assigned[cur] = alt;
    }
  }

  // F7.1: hard gate — never leave Decision on non-choice structural beats
  for (const structural of sequence) {
    assigned[structural] = sanitizeLibraryBeat(structural, assigned[structural]);
  }

  return assigned;
}

/**
 * @param {string} type
 * @param {string} [structuralBeat] when provided, Decision is gated (F7.1)
 * @param {{ authoredChoice?: boolean }} [opts]
 */
export function libraryBeatInstruction(type, structuralBeat = null, opts = {}) {
  const gated = structuralBeat != null
    ? sanitizeLibraryBeat(structuralBeat, type, opts)
    : type;
  const def = LIBRARY_BEAT_DEFS[gated] || LIBRARY_BEAT_DEFS.Discovery;
  return `${def.label}：${def.hint}（可用动词感：${def.verbs}）`;
}
