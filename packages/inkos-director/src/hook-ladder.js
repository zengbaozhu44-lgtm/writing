/**
 * Hook Ladder v3 — 五阶段读者心理认知升级
 * Curiosity → Danger → Cost → Truth → Point Of No Return
 * 不是数字等级，是读者「接下来必须知道什么」的递进
 */

/** 五阶段认知升级 */
export const HOOK_COGNITIVE_STAGES = [
  {
    level: 1,
    type: 'Curiosity',
    id: 'Curiosity',
    legacyId: 'Hook1',
    name: '好奇',
    nameEn: 'Curiosity',
    readerPsyche: '读者被点燃好奇心 — 「为什么不对劲？」原因未知，必须追问',
    readerQuestion: '为什么不对劲？发生了什么？',
    cost: '低 — 好奇心被点燃，尚未付出实质代价',
    nextNeedToKnow: '异常的成因是什么',
    description: '异常出现，读者想知道「为什么」——感官/规则/时间的第一道裂缝',
    cognitiveUpgrade: 'POV 注意到无法解释的细节，读者产生第一个追问',
    emotionalImpact: '好奇、警觉 — 「有什么不对」',
    characterCost: '低 — 心理警觉消耗，尚无实质损失',
    example: '为什么时间突然停了？',
    questionSignals: /为什么|为何|怎么|什么|不对|异常|奇怪|停/u,
    costSignals: /好奇|想知道|疑问/u,
  },
  {
    level: 2,
    type: 'Danger',
    id: 'Danger',
    legacyId: 'Hook2',
    name: '危险',
    nameEn: 'Danger',
    readerPsyche: '读者感到威胁 — 「这对我/主角有什么危险？」安全感丧失',
    readerQuestion: '这对我有什么威胁？谁会受害？',
    cost: '中 — POV 开始感到不安全，威胁可感',
    nextNeedToKnow: '危险来自哪里、有多近、能否逃脱',
    description: '威胁个性化 — 不只「世界不对」，而是「只有我/主角处境危险」',
    cognitiveUpgrade: '威胁从抽象异常收束到 POV 个人安全',
    emotionalImpact: '不安、恐惧 — 危险逼近',
    characterCost: '中 — 安全感受到冲击',
    example: '只有主角记得昨天，其他人都说没发生过',
    questionSignals: /只有|唯独|记得|谁|危险|威胁|监视|杀/u,
    costSignals: /不安全|害怕|孤立|唯一/u,
  },
  {
    level: 3,
    type: 'Cost',
    id: 'Cost',
    legacyId: 'Hook3',
    name: '代价',
    nameEn: 'Cost',
    readerPsyche: '读者理解代价 — 「记住/行动/追查会付出什么？」',
    readerQuestion: '追查下去会付出什么代价？',
    cost: '高 — 明确代价已出现或逼近（生命/关系/资源）',
    nextNeedToKnow: '代价能否承受、有无退路',
    description: '代价具象化 — 行动有成本，沉默也有成本',
    cognitiveUpgrade: '读者理解「不行动会失去什么」的具体后果',
    emotionalImpact: '紧迫、窒息 — 代价逼近',
    characterCost: '高 — 明确且不可逆的代价正在落地',
    example: '记得的人都会死亡',
    questionSignals: /会死|失去|代价|付出|来不及|倒计时/u,
    costSignals: /死亡|失去|代价|来不及|清零|断/u,
  },
  {
    level: 4,
    type: 'Truth',
    id: 'Truth',
    legacyId: 'Hook4',
    name: '真相',
    nameEn: 'Truth',
    readerPsyche: '读者逼近真相 — 「谁在控制？规则是什么？」认知被改写',
    readerQuestion: '谁在操控这一切？真相是什么？',
    cost: '极高 — 知道真相本身即是代价',
    nextNeedToKnow: '真相背后还有更大的什么',
    description: '局部真相落地 — 世界观/规则被部分揭晓，但引出更大深渊',
    cognitiveUpgrade: '威胁从个人升级为系统/规则级，格局被重新定义',
    emotionalImpact: '震惊、颠覆 — 「原来如此」与「更可怕了」并存',
    characterCost: '极高 — 认知颠覆带来行动困境',
    example: '世界重置是人为控制',
    questionSignals: /原来|真相|控制|系统|人为|幕后|规则/u,
    costSignals: /意味着|证实|不可能|违背|刷新/u,
  },
  {
    level: 5,
    type: 'PointOfNoReturn',
    id: 'PointOfNoReturn',
    legacyId: 'Hook5',
    name: '不可回头',
    nameEn: 'Point Of No Return',
    readerPsyche: '读者面临终局抉择 — 「必须选，且选了就无法撤回」',
    readerQuestion: '如果选这条路，还能回头吗？',
    cost: '不可逆 — 无论选哪条路都有全局性代价',
    nextNeedToKnow: '选择之后会发生什么（下一章必须承接）',
    description: '终局抉择 — POV 必须做出不可逆选择，退路彻底切断',
    cognitiveUpgrade: '所有筹码押上，读者与 POV 同步站在悬崖边',
    emotionalImpact: '绝望与亢奋 — 一切都变了',
    characterCost: '不可逆 — 无论选哪条路都有全局性代价',
    example: '主角必须选择重置自己',
    questionSignals: /必须|只能|选择|回不|不可逆|赌|重置/u,
    costSignals: /无论|都|失去|永远|再也/u,
  },
];

/** @deprecated 兼容旧引用 */
export const HOOK_LADDER_LEVELS = HOOK_COGNITIVE_STAGES;

export function getHookStageByLevel(level = 1) {
  return HOOK_COGNITIVE_STAGES.find((s) => s.level === level)
    || HOOK_COGNITIVE_STAGES[Math.min(Math.max(level, 1), 5) - 1];
}

export function getHookStageByType(type = 'Curiosity') {
  return HOOK_COGNITIVE_STAGES.find((s) => s.type === type || s.id === type)
    || HOOK_COGNITIVE_STAGES[0];
}

/**
 * 构建 Hook 输出对象 — Writer/Director 标准字段（含 Action Hook）
 */
export function buildHookOutput(stage = {}, overrides = {}) {
  const base = typeof stage.level === 'number'
    ? getHookStageByLevel(stage.level)
    : getHookStageByType(stage.type || stage.id || 'Curiosity');

  const cognitive = {
    type: overrides.type || base.type,
    readerQuestion: overrides.readerQuestion || base.readerQuestion,
    cost: overrides.cost || base.cost,
    nextNeedToKnow: overrides.nextNeedToKnow || base.nextNeedToKnow,
    level: base.level,
    stage: base.type,
    name: base.name,
    readerPsyche: base.readerPsyche,
    example: base.example,
  };

  if (overrides.hookKind === 'ActionHook' || overrides.discovery || overrides.actionDeadline) {
    return buildActionHookOutput(cognitive, overrides);
  }
  return cognitive;
}

/**
 * Action Hook — 逼主角必须行动，不只发现秘密
 * 发现 → 若不行动 → 代价；须创造新目标/新行动/新倒计时
 */
export function buildActionHookOutput(cognitiveOutput = {}, {
  plan = {},
  scene = {},
  intent = {},
  hookEntry = {},
} = {}) {
  const cliff = normText(plan.cliffhanger || scene.cliffhanger || scene.hook || hookEntry.readerQuestion);
  const discovery = normText(
    plan.newInformation || scene.newInformation || hookEntry.discovery || cognitiveOutput.nextNeedToKnow,
  );

  let actionDeadline = normText(hookEntry.actionDeadline || plan.actionDeadline || scene.actionDeadline);
  if (!actionDeadline) {
    if (/否则|就会|来不及|今晚|三十秒|必须|再不|就会死/u.test(cliff)) {
      actionDeadline = cliff;
    } else if (cognitiveOutput.type === 'Cost' || cognitiveOutput.type === 'Danger') {
      actionDeadline = `如果现在不行动 — ${cognitiveOutput.cost || '代价立刻落地'}`;
    } else {
      actionDeadline = inferActionDeadline(cognitiveOutput, plan, intent);
    }
  }

  const countdown = extractCountdown(actionDeadline || cliff);
  const pov = intent.pov || 'POV';
  const newGoal = normText(plan.goal || scene.goal || hookEntry.newGoal)
    || `立刻行动，阻止「${actionDeadline.slice(0, 30)}」`;
  const newAction = normText(hookEntry.newAction || plan.newAction || scene.newAction)
    || inferRequiredAction(actionDeadline, discovery, pov);

  const plantedPromise = actionDeadline || `若不行动：${cognitiveOutput.cost || '局势恶化'}`;

  return {
    ...cognitiveOutput,
    hookKind: 'ActionHook',
    discovery: discovery || '发现不可拖延的真相/威胁',
    actionDeadline,
    newGoal,
    newAction,
    countdown,
    plantedPromise,
    mustForceAction: true,
  };
}

function normText(v = '') {
  return String(v || '').trim();
}

function inferActionDeadline(cognitive = {}, plan = {}, intent = {}) {
  const stage = cognitive.type || 'Curiosity';
  const pov = intent.pov || '主角';
  const templates = {
    Curiosity: `若不查清异常，${pov}将失去唯一先机`,
    Danger: `若现在不行动，${pov}的处境会在今晚恶化`,
    Cost: `若现在不行动，代价将在倒计时内落地`,
    Truth: `若现在不阻止，幕后规则将永久生效`,
    PointOfNoReturn: `若现在不选择，退路将在三十秒内关闭`,
  };
  return templates[stage] || templates.Cost;
}

function inferRequiredAction(deadline = '', discovery = '', pov = 'POV') {
  if (/门|关闭|三十秒/u.test(deadline)) return `${pov}必须在倒计时内穿过/阻止门关闭`;
  if (/死|今晚|妹妹|弟弟/u.test(deadline)) return `${pov}必须立刻行动救人/破局`;
  if (/枪|武器/u.test(deadline)) return `${pov}必须立刻使用刚修好的枪/武器`;
  if (discovery) return `${pov}必须针对「${discovery.slice(0, 20)}」立刻行动`;
  return `${pov}必须立刻采取不可逆行动`;
}

function extractCountdown(text = '') {
  const t = normText(text);
  if (/三十秒|30秒/u.test(t)) return '三十秒';
  if (/今晚|今夜/u.test(t)) return '今晚';
  if (/倒计时|来不及/u.test(t)) return '倒计时';
  if (/永久关闭|再也/u.test(t)) return '不可逆窗口';
  return t ? t.slice(0, 20) : '';
}

/**
 * 从正文提取 Hook 输出（Execution Intelligence 用）
 */
export function extractHookOutput(text = '', hookEntry = {}) {
  const tail = String(text || '').replace(/\s/g, '').slice(-250);
  const stage = getHookStageByLevel(hookEntry.level || 1);

  const questionMatch = tail.match(/[^。！？!?…\n]{4,30}[？?]/u);
  const readerQuestion = questionMatch?.[0]?.trim()
    || (hookEntry.readerQuestion || stage.readerQuestion);

  let cost = hookEntry.cost || stage.cost;
  if (stage.costSignals?.test(tail)) {
    const costSent = String(text).split(/[。！？!?…\n]+/).filter((s) => stage.costSignals.test(s)).slice(-1)[0];
    if (costSent?.trim()) cost = costSent.trim().slice(0, 80);
  }

  let nextNeedToKnow = hookEntry.nextNeedToKnow || stage.nextNeedToKnow;
  if (/但是|然而|却|还没|不知道|到底|究竟/u.test(tail)) {
    nextNeedToKnow = tail.slice(-60).trim() || nextNeedToKnow;
  }

  const detectedType = detectHookStageFromText(tail) || stage.type;
  const cognitive = buildHookOutput(
    getHookStageByType(detectedType),
    { readerQuestion, cost, nextNeedToKnow },
  );

  const hasAction = /必须|只能|来不及|否则|今晚|三十秒|倒计时|再不/u.test(tail);
  const hasDiscovery = /发现|原来|门后|秘密|血字/u.test(tail);

  if (hasAction || hasDiscovery || hookEntry.hookKind === 'ActionHook') {
    return buildActionHookOutput(cognitive, {
      hookEntry,
      plan: { cliffhanger: tail.slice(-80), newInformation: hasDiscovery ? tail.slice(-60) : '' },
    });
  }
  return cognitive;
}

function detectHookStageFromText(text = '') {
  for (let i = HOOK_COGNITIVE_STAGES.length - 1; i >= 0; i -= 1) {
    const s = HOOK_COGNITIVE_STAGES[i];
    if (s.questionSignals?.test(text) || s.costSignals?.test(text)) {
      return s.type;
    }
  }
  return null;
}

function enrichStageEntry(stage, sceneIndex, { previousType = null, storyDna = {} } = {}) {
  const mainQ = storyDna.main_question || storyDna.core_hook || '';
  const overrides = {};

  if (mainQ && sceneIndex === 1 && stage.type === 'Curiosity') {
    overrides.readerQuestion = mainQ.includes('？') || mainQ.includes('?')
      ? mainQ
      : `${mainQ}？`;
    overrides.nextNeedToKnow = '异常的成因与规则';
  }

  const hookOutput = buildHookOutput(stage, overrides);
  const actionHookOutput = buildActionHookOutput(hookOutput, {
    hookEntry: { ...stage, ...overrides },
    plan: overrides.plan || {},
    scene: overrides.scene || {},
    intent: overrides.intent || {},
  });

  return {
    sceneIndex,
    ...stage,
    id: stage.legacyId || `Hook${stage.level}`,
    hookOutput: actionHookOutput,
    type: stage.type,
    readerQuestion: actionHookOutput.readerQuestion,
    cost: actionHookOutput.cost,
    nextNeedToKnow: actionHookOutput.nextNeedToKnow,
    actionDeadline: actionHookOutput.actionDeadline,
    newGoal: actionHookOutput.newGoal,
    newAction: actionHookOutput.newAction,
    countdown: actionHookOutput.countdown,
    plantedPromise: actionHookOutput.plantedPromise,
    mustExceedPrevious: Boolean(previousType),
    previousType,
    previousLevel: previousType
      ? getHookStageByType(previousType).level
      : Math.max(0, stage.level - 1),
  };
}

function ensureMonotonicLadder(ladder = []) {
  for (let i = 1; i < ladder.length; i += 1) {
    if (ladder[i].level <= ladder[i - 1].level) {
      const bumped = getHookStageByLevel(ladder[i - 1].level + 1);
      const merged = enrichStageEntry(bumped, ladder[i].sceneIndex, {
        previousType: ladder[i - 1].type,
      });
      ladder[i] = { ...ladder[i], ...merged, mustExceedPrevious: true };
    }
  }
  return ladder;
}

export function buildHookLadder(sceneCount = 4, { storyDna = {} } = {}) {
  const n = Math.max(sceneCount, 1);
  const ladder = [];

  for (let i = 0; i < n; i += 1) {
    const levelIdx = Math.min(i, HOOK_COGNITIVE_STAGES.length - 1);
    const stage = HOOK_COGNITIVE_STAGES[levelIdx];
    const prev = i > 0 ? ladder[i - 1].type : null;
    ladder.push(enrichStageEntry(stage, i + 1, { previousType: prev, storyDna }));
  }

  if (n >= 2) {
    const lastIdx = n - 1;
    const prevLevel = ladder[lastIdx - 1].level;
    const peakStage = getHookStageByLevel(Math.min(5, prevLevel + 1));
    ladder[lastIdx] = enrichStageEntry(peakStage, lastIdx + 1, {
      previousType: ladder[lastIdx - 1].type,
      storyDna,
    });
  }

  return ensureMonotonicLadder(ladder);
}

/**
 * 跨章 Hook Ladder — 每章从更高认知阶段起步
 */
export function buildChapterHookLadder(chapter = 1, sceneCount = 4, {
  levelBoost = 0,
  storyDna = {},
} = {}) {
  const n = Math.max(sceneCount, 1);
  const startLevel = Math.min(
    5,
    Math.max(1, chapter + levelBoost),
  );
  const ladder = [];

  for (let i = 0; i < n; i += 1) {
    const t = n <= 1 ? 1 : i / (n - 1);
    const span = Math.min(2, 5 - startLevel);
    const level = Math.min(5, startLevel + Math.round(t * span));
    const stage = getHookStageByLevel(level);
    const prev = i > 0 ? ladder[i - 1].type : null;
    ladder.push(enrichStageEntry(stage, i + 1, {
      previousType: prev,
      storyDna,
    }));
  }

  return ensureMonotonicLadder(ladder);
}

export function getSceneHookLadderEntry(sceneIndex, sceneCount = 4, chapter = null, levelBoost = 0, storyDna = {}) {
  const ladder = chapter != null
    ? buildChapterHookLadder(chapter, sceneCount, { levelBoost, storyDna })
    : buildHookLadder(sceneCount, { storyDna });
  return ladder.find((h) => h.sceneIndex === sceneIndex) || ladder[ladder.length - 1];
}

/**
 * 评估 Hook Beat — 阶段匹配 + 心理三维
 */
export function computeHookLevel(text = '', hookEntry = {}) {
  const hookOutput = extractHookOutput(text, hookEntry);
  const tail = String(text || '').replace(/\s/g, '').slice(-200);
  const stage = getHookStageByType(hookOutput.type);

  const hasQuestion = /[？?]|吗|呢|到底|究竟|为什么|谁|什么/u.test(tail);
  const hasCost = stage.costSignals?.test(tail) || /代价|失去|必须|只能/u.test(tail);
  const hasPsyche = stage.questionSignals?.test(tail);

  const hasAction = /必须|只能|来不及|否则|今晚|三十秒|倒计时|再不|行动/u.test(tail);
  const hasDiscovery = /发现|原来|门后|秘密/u.test(tail);
  const hasCountdown = /倒计时|三十秒|今晚|来不及/u.test(tail);

  const cognitiveUpgrade = Math.min(100, (
    (hasPsyche ? 35 : 10)
    + (hookEntry.level || stage.level) * 8
    + (hasQuestion ? 12 : 0)
    + (hasDiscovery ? 10 : 0)
    + (hasAction ? 20 : 0)
  ));

  const emotionalImpact = Math.min(100, (
    (/(心跳|颤抖|冷汗|恐惧|震惊|不安)/u.test(tail) ? 45 : 18)
    + (/(突然|却|但是|然而)/u.test(tail) ? 15 : 0)
    + Math.min(20, (hookEntry.level || stage.level) * 4)
    + (hasCountdown ? 15 : 0)
  ));

  const characterCost = Math.min(100, (
    (hasCost ? 45 : 15)
    + (hookEntry.level || stage.level) * 6
    + (/死|失去|来不及|不可逆|选择/u.test(tail) ? 15 : 0)
    + (hasAction ? 18 : 0)
  ));

  const hookLevel = Math.round((cognitiveUpgrade + emotionalImpact + characterCost) / 3);
  const stageMatch = hookOutput.type === (hookEntry.type || hookEntry.stage)
    || (hookEntry.level && getHookStageByType(hookOutput.type).level >= hookEntry.level - 1);
  const actionHookScore = (hasAction ? 40 : 0) + (hasCountdown ? 30 : 0) + (hasDiscovery && hasAction ? 20 : 0);

  return {
    hookLevel,
    hookOutput,
    stageMatch,
    actionHookScore,
    forcesAction: hasAction || hookOutput.hookKind === 'ActionHook',
    cognitiveUpgrade: Math.round(cognitiveUpgrade),
    emotionalImpact: Math.round(emotionalImpact),
    characterCost: Math.round(characterCost),
  };
}

export function formatHookLadderInstruction(hookEntry = {}) {
  if (!hookEntry?.type && !hookEntry?.id) return '';

  const stage = hookEntry.type
    ? getHookStageByType(hookEntry.type)
    : getHookStageByLevel(hookEntry.level || 1);
  const output = hookEntry.hookOutput || buildHookOutput(stage, hookEntry);

  return [
    `**Hook Ladder · ${stage.name}（${stage.type}）+ Action Hook** — 逼 POV 行动，不是只发现秘密`,
    `- **读者心理**：${stage.readerPsyche}`,
    `- **认知 type**：${output.type}`,
    `- **discovery（发现）**：${output.discovery || '—'} — 禁止只写发现就结束`,
    `- **actionDeadline（若不行动）**：${output.actionDeadline || '—'}`,
    `- **newGoal**：${output.newGoal || '—'}`,
    `- **newAction**：${output.newAction || '—'}`,
    `- **countdown**：${output.countdown || '—'}`,
    `- **readerQuestion**：${output.readerQuestion}`,
    `- **plantedPromise（下 Scene 可兑现）**：${output.plantedPromise || output.actionDeadline || '—'}`,
    `- **禁止**：只写「发现秘密」而不逼行动；须 发现 → 若不行动 → 代价`,
  ].join('\n');
}

export function formatHookLadderBrief(ladder = []) {
  if (!ladder.length) return '';
  const line = ladder.map((h) => {
    const label = h.type || h.name;
    return `S${h.sceneIndex}:${label}(${h.name})`;
  }).join(' → ');

  return [
    '### Hook Ladder · 心理递进 + Action Hook',
    'Curiosity → Danger → Cost → Truth → PointOfNoReturn',
    '**Action Hook 铁律**：发现秘密 → 若不行动 → 代价；须创造新目标/新行动/新倒计时',
    `- 本章：${line}`,
    '- Hook 输出：**discovery / actionDeadline / newGoal / newAction / countdown / plantedPromise**',
    '- 禁止：只告诉读者一个秘密；禁止无行动 deadline 的 Hook',
  ].join('\n');
}

export function formatHookOutputBlock(hookOutput = {}) {
  if (!hookOutput?.type) return '';
  const payload = hookOutput.hookKind === 'ActionHook' || hookOutput.actionDeadline
    ? {
      hookKind: 'ActionHook',
      type: hookOutput.type,
      discovery: hookOutput.discovery || '',
      actionDeadline: hookOutput.actionDeadline || '',
      newGoal: hookOutput.newGoal || '',
      newAction: hookOutput.newAction || '',
      countdown: hookOutput.countdown || '',
      plantedPromise: hookOutput.plantedPromise || '',
      readerQuestion: hookOutput.readerQuestion || '',
    }
    : {
      type: hookOutput.type,
      readerQuestion: hookOutput.readerQuestion || '',
      cost: hookOutput.cost || '',
      nextNeedToKnow: hookOutput.nextNeedToKnow || '',
    };

  return [
    '### Hook Output · Action Hook（本 Beat 须落地）',
    '```json',
    JSON.stringify(payload, null, 2),
    '```',
    '- **铁律**：发现 → 若不行动 → 代价；须创造新目标/新行动/新倒计时',
    '- 禁止只写「发现秘密」而不逼 POV 立刻行动',
  ].join('\n');
}
