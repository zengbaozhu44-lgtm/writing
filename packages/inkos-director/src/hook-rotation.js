/**
 * Hook Type Rotation — 禁止相邻 Beat 使用同类型钩子
 * Hook types: Curiosity | Danger | Cost | Truth | PointOfNoReturn | Pressure | Irony | Promise
 */

export const BEAT_HOOK_TYPES = Object.freeze([
  'Curiosity',
  'Danger',
  'Cost',
  'Truth',
  'Pressure',
  'Irony',
  'Promise',
  'PointOfNoReturn',
]);

const STRUCTURAL_DEFAULT_HOOK = Object.freeze({
  goal: 'Curiosity',
  escalation: 'Danger',
  newInformation: 'Truth',
  choice: 'Cost',
  consequence: 'Pressure',
  hook: 'Promise',
});

/**
 * 为 ExecutionPlan beats 分配 hookType，强制相邻不同
 * @returns {{ beats, hookRotation: object }}
 */
export function applyHookTypeRotation(beats = [], {
  sceneHookType = null,
  preferredOrder = null,
} = {}) {
  if (!Array.isArray(beats) || !beats.length) {
    return { beats: [], hookRotation: emptyRotation() };
  }

  const pool = preferredOrder?.length
    ? preferredOrder
    : rotatePoolFromScene(sceneHookType);
  const assigned = [];
  let prev = null;
  const violations = [];

  const nextBeats = beats.map((beat, i) => {
    const preferred = beat.hookType
      || (beat.structuralBeat === 'hook' && sceneHookType)
      || STRUCTURAL_DEFAULT_HOOK[beat.structuralBeat]
      || pool[i % pool.length];

    let hookType = preferred;
    if (hookType === prev) {
      hookType = pickDifferent(pool, prev, i);
      violations.push({
        beatOrder: beat.order ?? i + 1,
        from: preferred,
        to: hookType,
        reason: 'adjacent-same-type',
      });
    }

    assigned.push(hookType);
    prev = hookType;
    return {
      ...beat,
      hookType,
      hookRotationNote: hookType !== preferred
        ? `轮换：${preferred}→${hookType}（禁止相邻同型）`
        : null,
    };
  });

  const hookRotation = {
    version: 'hook-rotation-1',
    sequence: assigned,
    uniqueCount: new Set(assigned).size,
    // 输出序列已无相邻同型；rotations 记录被强制改写的次数
    adjacentOk: assigned.every((t, i) => i === 0 || t !== assigned[i - 1]),
    rotations: violations,
    forcedRotations: violations.length,
    rule: '禁止相邻 Beat 使用同类型钩子',
  };

  return { beats: nextBeats, hookRotation };
}

function rotatePoolFromScene(sceneHookType) {
  const base = [...BEAT_HOOK_TYPES];
  if (!sceneHookType) return base;
  const idx = base.indexOf(sceneHookType);
  if (idx < 0) return base;
  return [...base.slice(idx), ...base.slice(0, idx)];
}

function pickDifferent(pool, prev, salt = 0) {
  for (let i = 0; i < pool.length; i += 1) {
    const t = pool[(salt + i) % pool.length];
    if (t !== prev) return t;
  }
  return prev === 'Curiosity' ? 'Danger' : 'Curiosity';
}

function emptyRotation() {
  return {
    version: 'hook-rotation-1',
    sequence: [],
    uniqueCount: 0,
    adjacentOk: true,
    rotations: [],
    rule: '禁止相邻 Beat 使用同类型钩子',
  };
}

/** 校验已有 beats 是否违反相邻同型 */
export function validateHookRotation(beats = []) {
  const sequence = beats.map((b) => b.hookType).filter(Boolean);
  const violations = [];
  for (let i = 1; i < sequence.length; i += 1) {
    if (sequence[i] === sequence[i - 1]) {
      violations.push({ index: i, hookType: sequence[i] });
    }
  }
  return {
    valid: violations.length === 0,
    sequence,
    violations,
  };
}

export function formatHookTypeBlock(beat = {}) {
  if (!beat.hookType) return '';
  return [
    `**本 Beat 钩子类型**：${beat.hookType}`,
    beat.hookRotationNote ? `（${beat.hookRotationNote}）` : '',
    '禁止与上一 Beat 同型；须用动作/对白落地钩子，禁止旁白宣布悬念。',
  ].filter(Boolean).join(' ');
}

export default {
  BEAT_HOOK_TYPES,
  applyHookTypeRotation,
  validateHookRotation,
  formatHookTypeBlock,
};
