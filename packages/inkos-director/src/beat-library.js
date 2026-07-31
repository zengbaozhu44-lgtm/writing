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
};

const STRUCTURAL_POOLS = {
  goal: ['Decision', 'Relationship', 'Discovery'],
  obstacle: ['Danger', 'Countdown', 'Decision'],
  choice: ['Decision', 'Relationship', 'Twist'],
  consequence: ['Danger', 'Countdown', 'Twist'],
  newInformation: ['Twist', 'Reward', 'Discovery'],
  hook: ['Twist', 'Countdown', 'Danger'],
  /** @deprecated */
  escalation: ['Decision', 'Relationship', 'Twist'],
};

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
    assigned.goal = 'Decision';
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

  return assigned;
}

export function libraryBeatInstruction(type) {
  const def = LIBRARY_BEAT_DEFS[type] || LIBRARY_BEAT_DEFS.Discovery;
  return `${def.label}：${def.hint}（可用动词感：${def.verbs}）`;
}
