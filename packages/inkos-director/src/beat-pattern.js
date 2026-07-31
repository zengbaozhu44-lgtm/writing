/**
 * Beat Pattern Variation — 六结构 Beat 状态变化版
 * Goal → Obstacle → Choice → Consequence → New Information → Hook
 */
import { STRUCTURAL_BEATS } from './beat-library.js';

const DEFAULT_WORD_SHARE = {
  goal: 0.12,
  obstacle: 0.17,
  choice: 0.15,
  consequence: 0.16,
  newInformation: 0.22,
  hook: 0.18,
};

function normalizeWordShare(share = {}) {
  if (share.choice != null && share.consequence != null) {
    return { ...DEFAULT_WORD_SHARE, ...share };
  }
  const esc = share.escalation ?? 0.25;
  const { escalation, ...rest } = share;
  return {
    ...DEFAULT_WORD_SHARE,
    ...rest,
    choice: share.choice ?? esc * 0.48,
    consequence: share.consequence ?? esc * 0.52,
  };
}

function normalizePools(pools = {}) {
  if (pools.choice) return pools;
  const esc = pools.escalation || ['Decision', 'Twist'];
  return {
    ...pools,
    choice: esc,
    consequence: ['Danger', 'Countdown', ...(pools.obstacle || ['Twist'])].slice(0, 3),
  };
}

function normalizeHints(hints = {}) {
  if (hints.choice) return hints;
  return {
    ...hints,
    choice: hints.choice || hints.escalation || 'POV 被迫做出选择，选项均有代价',
    consequence: hints.consequence || '选择代价落地，局面因此改变',
  };
}

/** Scene Type → 六 Beat 字数占比 + Library 池 + 执行提示 */
export const SCENE_BEAT_PROFILES = {
  opening: {
    wordShare: { goal: 0.18, obstacle: 0.16, choice: 0.12, consequence: 0.14, newInformation: 0.22, hook: 0.18 },
    libraryPools: {
      goal: ['Discovery', 'Relationship'],
      obstacle: ['Danger', 'Discovery'],
      choice: ['Decision', 'Relationship'],
      consequence: ['Danger', 'Twist'],
      newInformation: ['Discovery', 'Reward'],
      hook: ['Twist', 'Discovery'],
    },
    beatHints: {
      goal: '快速建立 POV 目标，Before→Action 须有感官锚点',
      obstacle: '阻力具体可感，危险等级须上升',
      choice: '被迫二选一，关系或目标方向将改变',
      consequence: '选择代价可见落地，资源或退路受损',
      newInformation: '释放新线索，世界认知须更新',
      hook: 'After State 未收束，读者想翻页',
    },
  },
  dialogue: {
    wordShare: { goal: 0.10, obstacle: 0.18, choice: 0.18, consequence: 0.16, newInformation: 0.23, hook: 0.15 },
    libraryPools: {
      goal: ['Relationship', 'Decision'],
      obstacle: ['Relationship', 'Decision'],
      choice: ['Decision', 'Twist'],
      consequence: ['Relationship', 'Danger'],
      newInformation: ['Discovery', 'Twist'],
      hook: ['Relationship', 'Countdown'],
    },
    beatHints: {
      goal: '目标通过对白或试探行为体现',
      obstacle: '立场对立，信息不对称',
      choice: '对白逼出选择 — 信还是不信、说还是不说',
      consequence: '选择通过对白后果显现，关系改变',
      newInformation: '对白揭示新事实，禁止重复质问',
      hook: '未说完的话或意味深长的沉默',
    },
  },
  action: {
    wordShare: { goal: 0.08, obstacle: 0.16, choice: 0.14, consequence: 0.22, newInformation: 0.15, hook: 0.25 },
    libraryPools: {
      goal: ['Decision', 'Countdown'],
      obstacle: ['Danger', 'Countdown'],
      choice: ['Decision', 'Danger'],
      consequence: ['Danger', 'Countdown'],
      newInformation: ['Discovery', 'Twist'],
      hook: ['Countdown', 'Danger'],
    },
    beatHints: {
      goal: '身体动作表达目标',
      obstacle: '物理阻力，危险等级上升',
      choice: '身体做出选择 — 冲/退/赌',
      consequence: '动作代价落地 — 受伤/暴露/失去筹码',
      newInformation: '行动中瞥见线索，不打断节奏',
      hook: '未完成动作或倒计时一瞬',
    },
  },
  climax: {
    wordShare: { goal: 0.10, obstacle: 0.16, choice: 0.18, consequence: 0.20, newInformation: 0.16, hook: 0.20 },
    libraryPools: {
      goal: ['Decision', 'Danger'],
      obstacle: ['Danger', 'Countdown'],
      choice: ['Decision', 'Twist'],
      consequence: ['Danger', 'Twist'],
      newInformation: ['Twist', 'Reward'],
      hook: ['Twist', 'Countdown'],
    },
    beatHints: {
      goal: '不可逆目标锁定',
      obstacle: '退路切断，危险峰值',
      choice: '所有筹码押上的抉择',
      consequence: '代价全面落地',
      newInformation: '翻盘或确认代价',
      hook: '局部胜利引出更大深渊',
    },
  },
  ending: {
    wordShare: { goal: 0.08, obstacle: 0.12, choice: 0.14, consequence: 0.16, newInformation: 0.22, hook: 0.28 },
    libraryPools: {
      goal: ['Decision', 'Discovery'],
      obstacle: ['Countdown', 'Danger'],
      choice: ['Decision', 'Twist'],
      consequence: ['Countdown', 'Danger'],
      newInformation: ['Discovery', 'Twist'],
      hook: ['Countdown', 'Twist', 'Danger'],
    },
    beatHints: {
      goal: '章末目标与悬念对齐',
      obstacle: '最后窗口收窄',
      choice: '终局抉择',
      consequence: '章内代价落地',
      newInformation: '章级关键信息，不全解',
      hook: '章尾强 Hook，禁止平收',
    },
  },
  exposition: {
    wordShare: { goal: 0.16, obstacle: 0.12, choice: 0.12, consequence: 0.12, newInformation: 0.32, hook: 0.16 },
    libraryPools: {
      goal: ['Discovery', 'Decision'],
      obstacle: ['Danger', 'Relationship'],
      choice: ['Decision', 'Discovery'],
      consequence: ['Twist', 'Relationship'],
      newInformation: ['Discovery', 'Reward', 'Twist'],
      hook: ['Twist', 'Discovery'],
    },
    beatHints: {
      goal: '目标与「搞清某事」绑定',
      obstacle: '信息不可信或不全',
      choice: '信哪条线索、查哪条路',
      consequence: '调查选择产生方向代价',
      newInformation: '至少两条新事实，禁止科普总结',
      hook: '新信息引出更大疑问',
    },
  },
  standard: {
    wordShare: DEFAULT_WORD_SHARE,
    libraryPools: null,
    beatHints: {},
  },
};

export function inferSceneTypeForExecution(scene = {}, intent = {}) {
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

export function resolveSceneBeatProfile(sceneType = 'standard') {
  return SCENE_BEAT_PROFILES[sceneType] || SCENE_BEAT_PROFILES.standard;
}

export function resolveWordShare(sceneType = 'standard') {
  const profile = resolveSceneBeatProfile(sceneType);
  return normalizeWordShare(profile.wordShare);
}

export function resolveLibraryPools(sceneType = 'standard', defaultPools = {}) {
  const profile = resolveSceneBeatProfile(sceneType);
  if (!profile.libraryPools) return defaultPools;
  const merged = { ...defaultPools };
  const pools = normalizePools(profile.libraryPools);
  for (const structural of STRUCTURAL_BEATS) {
    if (pools[structural]) {
      merged[structural] = pools[structural];
    }
  }
  return merged;
}

export function getBeatHint(sceneType, structuralBeat) {
  const profile = resolveSceneBeatProfile(sceneType);
  const hints = normalizeHints(profile.beatHints || {});
  const beat = structuralBeat === 'escalation' ? 'choice' : structuralBeat;
  return hints[beat] || null;
}
