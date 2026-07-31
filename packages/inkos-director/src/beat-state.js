/**
 * Beat State — Before State → Action → After State
 * 每个 Beat 必须改变至少一个状态维度，否则无效
 */
export const STATE_CHANGE_DIMENSIONS = [
  { id: 'relationship', label: '人物关系', pattern: /信任|怀疑|背叛|翻脸|关系|立场|盟友|敌人|合作|决裂/u },
  { id: 'information', label: '信息状态', pattern: /约束|选项|代价|反馈|读出|确认|推进|意味着|规则|身份|权限/u },
  { id: 'danger', label: '危险等级', pattern: /危险|威胁|逼近|失控|倒计时|来不及|警告|杀|死/u },
  { id: 'resource', label: '资源状态', pattern: /失去|耗尽|拿到|还剩|信用|时间|筹码|代价|受损|清零/u },
  { id: 'goalDirection', label: '目标方向', pattern: /目标|必须|只能|转向|放弃|决定|选择|要不|退路/u },
  { id: 'worldCognition', label: '世界认知', pattern: /不可能|规则|系统|世界|刷新|异常|违背|认知|原来如此/u },
];

/** 新六 Beat 结构 */
export const STATE_BEAT_SEQUENCE = [
  'goal',
  'obstacle',
  'choice',
  'consequence',
  'newInformation',
  'hook',
];

const BEAT_STATE_TEMPLATES = {
  goal: {
    actionKey: 'goal',
    choiceHint: '隐含抉择：做还是不做、现在还是稍后',
    consequenceHint: '目标锁定，行动方向确定',
    afterState: 'POV 已锁定可执行目标，局面即将被打破',
    requiredDimension: 'goalDirection',
  },
  obstacle: {
    actionKey: 'obstacle',
    choiceHint: '面对阻力：硬闯/绕路/放弃',
    consequenceHint: '原路径受阻，stakes 升高',
    afterState: '阻力落地，目标受挫，退路收窄',
    requiredDimension: 'danger',
  },
  choice: {
    actionKey: 'choice',
    choiceHint: '必须在有限选项中做出选择',
    consequenceHint: '选择本身即代价前奏',
    afterState: 'POV 已做出不可逆选择，后果即将落地',
    requiredDimension: 'relationship',
  },
  consequence: {
    actionKey: 'consequence',
    choiceHint: null,
    consequenceHint: '选择代价可见落地',
    afterState: '代价已落地，局面比选择前更紧或更糟',
    requiredDimension: 'resource',
  },
  newInformation: {
    actionKey: 'newInformation',
    choiceHint: null,
    consequenceHint: '已有界面吐出新约束/后果',
    afterState: '同一界面的反馈更新了局势，POV 须据此行动',
    requiredDimension: 'information',
  },
  hook: {
    actionKey: 'cliffhanger',
    choiceHint: null,
    consequenceHint: '新危机/新疑问出现',
    afterState: '局面未收束，读者必须翻页',
    requiredDimension: 'worldCognition',
  },
};

function pickPlanValue(plan, key, fallback) {
  return plan?.[key] || fallback;
}

/**
 * 为单个结构 Beat 生成 scene-beat-plan
 */
export function buildSceneBeatPlan(structuralBeat, scenePlan = {}, {
  priorAfterState = '',
  beatMemory = {},
} = {}) {
  const template = BEAT_STATE_TEMPLATES[structuralBeat];
  if (!template) return null;

  const beforeState = priorAfterState
    || beatMemory.lastAfterState
    || 'Scene 开局 — POV 即将进入行动';

  const action = pickPlanValue(scenePlan, template.actionKey, '推进局势');
  const choice = template.choiceHint
    ? pickPlanValue(scenePlan, 'choice', template.choiceHint)
    : (structuralBeat === 'choice' ? pickPlanValue(scenePlan, 'choice', template.choiceHint) : null);
  const consequence = pickPlanValue(scenePlan, template.actionKey === 'consequence' ? 'consequence' : template.actionKey, template.consequenceHint);

  return {
    structuralBeat,
    beforeState,
    action: typeof action === 'string' ? action : String(action),
    choice: choice || (structuralBeat === 'choice' ? pickPlanValue(scenePlan, 'choice', '必须二选一') : ''),
    consequence: structuralBeat === 'consequence'
      ? pickPlanValue(scenePlan, 'consequence', template.consequenceHint)
      : template.consequenceHint,
    afterState: template.afterState,
    stateChange: true,
    requiredDimension: template.requiredDimension,
  };
}

/**
 * 为 Scene 全部 Beat 生成串联的 beat state plans
 */
export function buildSceneBeatPlans(scenePlan = {}, beatSequence = STATE_BEAT_SEQUENCE) {
  const plans = [];
  let priorAfter = '';

  for (const structural of beatSequence) {
    const beatPlan = buildSceneBeatPlan(structural, scenePlan, { priorAfterState: priorAfter });
    if (beatPlan) {
      plans.push(beatPlan);
      priorAfter = beatPlan.afterState;
    }
  }
  return plans;
}

/**
 * 检测正文是否引起状态变化
 */
export function detectStateChanges(text = '') {
  const t = String(text || '');
  const changed = [];
  for (const dim of STATE_CHANGE_DIMENSIONS) {
    if (dim.pattern.test(t)) changed.push(dim.id);
  }
  return changed;
}

/**
 * 验证 Beat 是否有效（至少改变一个状态维度）
 */
export function validateBeatStateChange(text = '', beatPlan = {}, priorText = '') {
  const t = String(text || '');
  const changed = detectStateChanges(text);
  const required = beatPlan.requiredDimension;
  const hasRequired = required ? changed.includes(required) : false;
  const hasAny = changed.length > 0;

  const repetitive = /继续调查|发现更多异常|继续寻找|再次确认|又一次/u.test(t)
    && /调查|异常|寻找/.test(`${priorText.slice(-200)}${t}`);

  return {
    stateChange: hasAny && !repetitive,
    changedDimensions: changed,
    hasRequiredDimension: hasRequired,
    repetitive,
    valid: hasAny && !repetitive,
  };
}

export function formatBeatStatePlanBlock(beatPlan = {}) {
  if (!beatPlan?.beforeState) return '';

  const dim = STATE_CHANGE_DIMENSIONS.find((d) => d.id === beatPlan.requiredDimension);
  return [
    '### Scene Beat Plan · 状态变化（必须落地）',
    `- **Before State**：${beatPlan.beforeState}`,
    `- **Action**：${beatPlan.action}`,
    beatPlan.choice ? `- **Choice**：${beatPlan.choice}` : '',
    `- **Consequence**：${beatPlan.consequence}`,
    `- **After State**：${beatPlan.afterState}`,
    dim ? `- **必须改变**：${dim.label}（否则本 Beat 无效）` : '',
    '- **禁止原地踏步**：不得「继续调查→发现异常→继续调查」式重复',
  ].filter(Boolean).join('\n');
}

export function formatBeatStateSequenceBlock(beatPlans = []) {
  if (!beatPlans?.length) return '';
  const lines = [
    '<!-- scene-beat-state-plans -->',
    '## Beat 状态链 · Before → Action → After',
    '',
    '每个 Beat 必须改变至少一个：人物关系 / 信息状态 / 危险等级 / 资源状态 / 目标方向 / 世界认知',
    '',
  ];
  for (const p of beatPlans) {
    lines.push(
      `**${p.structuralBeat}**：${p.beforeState} → [${p.action}] → ${p.afterState}`,
    );
  }
  return lines.join('\n');
}

/** 兼容旧 escalation Beat */
export function normalizeStructuralBeat(beat = '') {
  if (beat === 'escalation') return 'choice';
  return beat;
}

export function migrateScenePlan(plan = {}) {
  if (plan.choice && plan.consequence) return plan;
  return {
    ...plan,
    choice: plan.choice || plan.escalation || 'POV 必须在有限选项中做出选择，选择有代价',
    consequence: plan.consequence || '选择产生可见代价，局面因此改变',
  };
}
