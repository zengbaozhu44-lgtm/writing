/**
 * Human Behavior — Choice 须像真人，不是剧情按钮
 * 不新增 Analyzer：只编译 Writer Prompt / Choice Beat 指令
 *
 * 爆款区别：不是「人物改变了」，而是「人物因为欲望/恐惧/经历而行动」
 */

function norm(v = '') {
  return String(v || '').trim();
}

/**
 * 从 Desire / Plan / Transformation 编译 Choice 行为逻辑
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
  const goal = norm(plan.goal || scene.goal || desire.externalGoal);
  const obstacle = norm(plan.obstacle || scene.obstacle);
  const consequence = norm(plan.consequence || scene.consequence);

  const desireDrive = inferDesire(desire, choice, goal);
  const fearDrive = inferFear(desire, consequence, choice);
  const hiddenNeed = inferHiddenNeed(desire, characterTransformation);
  const pastTrigger = inferPastTrigger(desire, storyDna, choice);
  const irrationalAction = inferIrrationalAction({
    name,
    choice,
    goal,
    obstacle,
    desireDrive,
    fearDrive,
    pastTrigger,
  });

  const writerMust = [
    '人物不能因为剧情需要行动。',
    '必须因为：欲望 · 恐惧 · 过去经历 → 导致行动。',
    `本 Choice：写出「${irrationalAction.slice(0, 40)}」背后的私人理由。`,
  ].join('');

  return {
    version: 'character-behavior-1',
    character: name,
    behaviorLogic: {
      desire: desireDrive,
      fear: fearDrive,
      hiddenNeed,
      irrationalAction,
      pastTrigger,
    },
    choice,
    writerMust,
    exampleWrong: `${name}决定调查真相。`,
    exampleRight: buildExampleRight(name, desireDrive, fearDrive, pastTrigger, irrationalAction),
    ban: [
      '因为剧情需要而行动',
      '「他决定……」式冷静总结',
      '无私人理由的英雄跳',
      '只写选项标签，不写为什么明知危险仍去做',
    ],
    valid: Boolean(desireDrive && fearDrive && irrationalAction),
    rule: 'Choice Beat 写真人动机，不写剧情按钮',
  };
}

function normalizeBehavior(raw = {}, desire = {}) {
  const bl = raw.behaviorLogic || raw;
  return {
    version: 'character-behavior-1',
    character: desire.name || raw.character || 'POV',
    behaviorLogic: {
      desire: norm(bl.desire),
      fear: norm(bl.fear),
      hiddenNeed: norm(bl.hiddenNeed),
      irrationalAction: norm(bl.irrationalAction),
      pastTrigger: norm(bl.pastTrigger || ''),
    },
    choice: norm(raw.choice),
    writerMust: norm(raw.writerMust)
      || '人物不能因为剧情需要行动。必须因为欲望、恐惧、过去经历导致行动。',
    exampleWrong: raw.exampleWrong || `${desire.name || '他'}决定调查真相。`,
    exampleRight: raw.exampleRight || '',
    ban: raw.ban || ['因为剧情需要而行动'],
    valid: true,
    rule: 'Choice Beat 写真人动机，不写剧情按钮',
  };
}

function inferDesire(desire = {}, choice = '', goal = '') {
  if (/保护|救|妹妹|家人|重要的人/u.test(`${choice}${goal}${desire.fear || ''}`)) {
    return desire.externalGoal?.includes('保护')
      ? desire.externalGoal.slice(0, 40)
      : '想保护妹妹';
  }
  if (desire.externalGoal) return desire.externalGoal.slice(0, 40);
  return '想弄清真相并保住重要的人';
}

function inferFear(desire = {}, consequence = '', choice = '') {
  if (desire.fear) return desire.fear.slice(0, 40);
  if (/失去|死|消失|暴露/u.test(`${consequence}${choice}`)) {
    return '害怕再次失去';
  }
  return '害怕再次失去重要的人';
}

function inferHiddenNeed(desire = {}, tx = null) {
  if (desire.internalDesire) return desire.internalDesire.slice(0, 45);
  if (tx?.after?.belief) {
    return `希望证明：${tx.after.belief.slice(0, 30)}`;
  }
  return '希望证明自己没有疯';
}

function inferPastTrigger(desire = {}, storyDna = {}, choice = '') {
  const wound = norm(desire.wound);
  if (wound) {
    if (/妹妹|救不了/u.test(wound)) {
      return '妹妹昨天消失前说的最后一句话，只有这里能找到答案';
    }
    return `过去的伤口仍在——${wound.slice(0, 36)}`;
  }
  if (/重置|循环/u.test(storyDna.core_hook || storyDna.main_question || '')) {
    return '上次错过拯救的机会后，他再也不想「再等等看」';
  }
  if (/欺骗|隐瞒|进入|系统/u.test(choice)) {
    return '过去某次犹豫害过他——这次他不打算停在门外';
  }
  return '某段说不出口的过去，逼他把脚迈进去';
}

function inferIrrationalAction({
  name,
  choice,
  goal,
  obstacle,
  desireDrive,
  fearDrive,
  pastTrigger,
} = {}) {
  if (choice) {
    if (/进入|闯进|欺骗|隐瞒|上报|牺牲/u.test(choice)) {
      return `明知道危险仍然${choice.slice(0, 28)}`;
    }
    return `明知道可能付出代价，仍然选择：${choice.slice(0, 32)}`;
  }
  if (goal && /进入|系统|后门|区域/u.test(`${goal}${obstacle}`)) {
    return `明知道危险仍然进入系统区域——为了${desireDrive.slice(0, 16)}`;
  }
  return `${name}明知道危险仍然向前——恐惧是「${fearDrive.slice(0, 12)}」，但停不住，因为${pastTrigger.slice(0, 20)}`;
}

function buildExampleRight(name, desire, fear, past, action) {
  const who = name === 'POV' ? '他' : name;
  return [
    `${who}知道进去可能死。`,
    '',
    `但${past || '有句话只剩他能兑现'}。`,
    '',
    `（欲望：${desire} · 恐惧：${fear} · 仍做：${action.slice(0, 28)}）`,
  ].join('\n');
}

export function formatCharacterBehaviorBlock(behavior = {}) {
  if (!behavior?.behaviorLogic?.desire) return '';

  const bl = behavior.behaviorLogic;
  return [
    '### Human Behavior · Choice 须像真人（P1）',
    '',
    '**铁律**：人物不能因为剧情需要行动。必须因为欲望、恐惧、过去经历导致行动。',
    '',
    '```',
    'behaviorLogic:',
    `  desire: ${bl.desire}`,
    `  fear: ${bl.fear}`,
    `  hiddenNeed: ${bl.hiddenNeed}`,
    `  irrationalAction: ${bl.irrationalAction}`,
    bl.pastTrigger ? `  pastTrigger: ${bl.pastTrigger}` : '',
    '```',
    '',
    `- **Writer 必做**：${behavior.writerMust}`,
    '',
    `❌ ${behavior.exampleWrong}`,
    '',
    '✅',
    behavior.exampleRight || '他知道进去可能死。但过去那句话，只有这里能找到答案。',
    '',
    ...(behavior.ban || []).map((b) => `- 禁止：${b}`),
  ].filter(Boolean).join('\n');
}

export function formatCharacterBehaviorBrief(behavior = {}) {
  if (!behavior?.behaviorLogic?.irrationalAction) return '';
  const bl = behavior.behaviorLogic;
  return `Behavior：${bl.desire} / ${bl.fear} → ${bl.irrationalAction.slice(0, 35)}`;
}
