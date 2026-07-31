/** @deprecated 使用 resolveTargetBudget(sceneType) */
export const TOTAL_BUDGET_TOKENS = 2500;

export const BUDGET_MIN_TOKENS = 1800;
export const BUDGET_MAX_TOKENS = 3200;
export const TARGET_BUDGET_TOKENS = 2500;

/**
 * Scene Type → Target Budget（1800~3200 自动钳制）
 */
export const SCENE_TYPE_TOKEN_TARGETS = {
  opening: 3200,
  dialogue: 2100,
  action: 2600,
  climax: 3000,
  ending: 2800,
  closing: 2800,
  exposition: 2400,
  standard: 2500,
};

/** Compiler 模块 — 禁止固定 Tier */
export const BUDGET_MODULES = [
  'goal',
  'conflict',
  'character',
  'world',
  'facts',
  'history',
  'relationship',
  'knowledge',
];

/** Context Ranking 使用的模块（Goal/Conflict 由 Director 规划块承担） */
export const CONTEXT_MODULES = [
  'character',
  'world',
  'facts',
  'history',
  'relationship',
  'knowledge',
];

/**
 * Scene Type → 八模块动态权重（总和 = 1）
 */
export const SCENE_TYPE_WEIGHTS = {
  opening: {
    goal: 0.12,
    conflict: 0.10,
    character: 0.18,
    world: 0.22,
    facts: 0.12,
    history: 0.14,
    relationship: 0.06,
    knowledge: 0.06,
  },
  dialogue: {
    goal: 0.08,
    conflict: 0.12,
    character: 0.28,
    world: 0.06,
    facts: 0.08,
    history: 0.10,
    relationship: 0.22,
    knowledge: 0.06,
  },
  climax: {
    goal: 0.14,
    conflict: 0.24,
    character: 0.16,
    world: 0.08,
    facts: 0.14,
    history: 0.08,
    relationship: 0.08,
    knowledge: 0.08,
  },
  action: {
    goal: 0.12,
    conflict: 0.22,
    character: 0.14,
    world: 0.08,
    facts: 0.16,
    history: 0.10,
    relationship: 0.08,
    knowledge: 0.10,
  },
  exposition: {
    goal: 0.08,
    conflict: 0.06,
    character: 0.12,
    world: 0.26,
    facts: 0.14,
    history: 0.18,
    relationship: 0.08,
    knowledge: 0.18,
  },
  closing: {
    goal: 0.14,
    conflict: 0.20,
    character: 0.16,
    world: 0.08,
    facts: 0.12,
    history: 0.12,
    relationship: 0.10,
    knowledge: 0.08,
  },
  ending: {
    goal: 0.14,
    conflict: 0.20,
    character: 0.16,
    world: 0.08,
    facts: 0.12,
    history: 0.12,
    relationship: 0.10,
    knowledge: 0.08,
  },
  standard: {
    goal: 0.12,
    conflict: 0.14,
    character: 0.18,
    world: 0.12,
    facts: 0.14,
    history: 0.12,
    relationship: 0.10,
    knowledge: 0.08,
  },
};

export const MODULE_LABELS = {
  goal: 'Goal',
  conflict: 'Conflict',
  character: 'Character',
  world: 'World',
  facts: 'Facts',
  history: 'History',
  relationship: 'Relationship',
  knowledge: 'Knowledge',
};

export const MODULE_COLORS = {
  goal: '#5b8def',
  conflict: '#f45b69',
  character: '#3dd68c',
  world: '#a78bfa',
  facts: '#f5a623',
  history: '#56cfe1',
  relationship: '#ff6b9d',
  knowledge: '#ffd166',
};
