/**
 * Human Behavior — Choice 表达层（S8.2 Boundary）
 * 只投影显式 behaviorLogic / 显式 desire 字段；禁止 infer* 编造私人动机。
 * 缺口是系统状态，不是 bug。
 */

function norm(v = '') {
  return String(v || '').trim();
}

function missingBehavior(name = 'POV', choice = '') {
  return {
    version: 'character-behavior-1',
    character: name,
    missing: true,
    behaviorLogic: null,
    choice,
    writerMust: 'behavior basis missing — 禁止编造私人动机；有显式 choice 则只表达选择本身',
    exampleWrong: '',
    exampleRight: '',
    ban: [
      '因为剧情需要而行动',
      '系统推断「他其实想要…」',
      '无依据的童年/伤口补全',
    ],
    valid: false,
    rule: '无显式依据不生成私人动机（缺失 > 假完整）',
  };
}

/**
 * 从显式 Desire / Plan / Scene 投影 Choice 行为逻辑（不推断）
 */
export function buildChoiceBehaviorLogic({
  desire = {},
  plan = {},
  scene = {},
  characterTransformation = null,
  storyDna = {},
} = {}) {
  if (scene.behaviorLogic?.desire && scene.behaviorLogic?.irrationalAction) {
    return normalizeBehavior(scene.behaviorLogic, desire);
  }
  if (plan.behaviorLogic?.desire && plan.behaviorLogic?.irrationalAction) {
    return normalizeBehavior(plan.behaviorLogic, desire);
  }

  const name = desire.name || storyDna.protagonist || 'POV';
  const choice = norm(plan.choice || scene.choice);

  // 仅投影已存在的显式字段；任一核心动机字段都没有 → missing
  const desireDrive = norm(desire.externalGoal || '');
  const fearDrive = norm(desire.fear || '');
  const hiddenNeed = norm(desire.internalDesire || '');
  const pastTrigger = norm(desire.wound || '');

  if (desire.missing || (!desireDrive && !fearDrive && !hiddenNeed && !pastTrigger)) {
    return missingBehavior(name, choice);
  }

  // 有显式心理字段：只投影，不包装「明知道危险仍然…」类推断叙事
  const irrationalAction = choice || '';

  return {
    version: 'character-behavior-1',
    character: name,
    missing: false,
    behaviorLogic: {
      desire: desireDrive,
      fear: fearDrive,
      hiddenNeed,
      irrationalAction,
      pastTrigger,
    },
    choice,
    writerMust: choice
      ? `有显式选择「${choice.slice(0, 40)}」——只文学化表达，禁止系统补隐藏理由`
      : '有显式欲望字段但无 choice — 勿发明选择与私人理由',
    exampleWrong: `${name}决定调查真相。`,
    exampleRight: '',
    ban: [
      '因为剧情需要而行动',
      '「他决定……」式冷静总结',
      '无私人理由的英雄跳',
      '用推断童年/伤口冒充事实',
    ],
    valid: Boolean(desireDrive || fearDrive || choice),
    rule: '只投影显式依据；不写剧情按钮，也不编动机',
  };
}

function normalizeBehavior(raw = {}, desire = {}) {
  const bl = raw.behaviorLogic || raw;
  return {
    version: 'character-behavior-1',
    character: desire.name || raw.character || 'POV',
    missing: false,
    behaviorLogic: {
      desire: norm(bl.desire),
      fear: norm(bl.fear),
      hiddenNeed: norm(bl.hiddenNeed),
      irrationalAction: norm(bl.irrationalAction),
      pastTrigger: norm(bl.pastTrigger || ''),
    },
    choice: norm(raw.choice),
    writerMust: norm(raw.writerMust)
      || '人物不能因为剧情需要行动。必须依据已给出的欲望/恐惧/经历表达。',
    exampleWrong: raw.exampleWrong || `${desire.name || '他'}决定调查真相。`,
    exampleRight: raw.exampleRight || '',
    ban: raw.ban || ['因为剧情需要而行动'],
    valid: true,
    rule: 'Choice Beat 写真人动机（显式），不写剧情按钮',
  };
}

export function formatCharacterBehaviorBlock(behavior = {}) {
  if (behavior?.missing || !behavior?.behaviorLogic) {
    return [
      '### Human Behavior · Choice 须像真人（P1）',
      '',
      '**缺口**：behavior basis missing — 禁止编造私人动机。',
      behavior?.choice ? `- 显式 choice（仅表达）：${behavior.choice}` : '',
      '- **铁律**：缺失 > 假完整',
    ].filter(Boolean).join('\n');
  }

  if (!behavior.behaviorLogic.desire && !behavior.behaviorLogic.fear) return '';

  const bl = behavior.behaviorLogic;
  return [
    '### Human Behavior · Choice 须像真人（P1）',
    '',
    '**铁律**：只使用下方已给出的显式字段；禁止系统补隐藏理由。',
    '',
    '```',
    'behaviorLogic:',
    bl.desire ? `  desire: ${bl.desire}` : '',
    bl.fear ? `  fear: ${bl.fear}` : '',
    bl.hiddenNeed ? `  hiddenNeed: ${bl.hiddenNeed}` : '',
    bl.irrationalAction ? `  action: ${bl.irrationalAction}` : '',
    bl.pastTrigger ? `  pastTrigger: ${bl.pastTrigger}` : '',
    '```',
    '',
    `- **Writer 必做**：${behavior.writerMust}`,
    '',
    ...(behavior.ban || []).map((b) => `- 禁止：${b}`),
  ].filter(Boolean).join('\n');
}

export function formatCharacterBehaviorBrief(behavior = {}) {
  if (behavior?.missing) return 'Behavior：basis missing';
  if (!behavior?.behaviorLogic) return '';
  const bl = behavior.behaviorLogic;
  const parts = [bl.desire, bl.fear, bl.irrationalAction].filter(Boolean);
  if (!parts.length) return '';
  return `Behavior：${parts.map((p) => String(p).slice(0, 24)).join(' / ')}`;
}
