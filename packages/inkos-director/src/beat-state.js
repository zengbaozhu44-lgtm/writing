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
 * Beat Plan 退化硬化（2026-08-18）：
 * Planner 不允许用模板占位/元指令冒充具体 Beat 数据。
 * choice 只属于「choice」拍且必须是具体两难；newInformation 必须点名物件/事实/后果；
 * 「释放至少一条新信息」「制造一个 Hook」「推进冲突」这类空指令一律判缺失（missing）。
 * 宁可让 beat 缺数据（missing 列表 + hasConcreteDelta=false），也不拿 scene goal 填空。
 */

/** 模板占位短语——被原样当 Beat 数据 = 空指令 */
const META_PHRASES = [
  '本 Scene 须释放至少一条新信息（事实/关系/规则）',
  '释放至少一条新信息',
  '须释放至少一条新信息',
  '落地一条可感知新信息（同一物件上的反馈，禁止另开界面）',
  '推进已有界面的后果/约束，禁止「再发现一个新界面」',
  '推进已揭示信息的后果，禁止「第一次发现」',
  '章尾强 Hook — 未完成动作或致命追问',
  'Scene 尾留悬念 — 禁止平收总结',
  '选择产生可见代价，局面因此改变',
  'POV 必须在有限选项中做出选择，每个选项都有代价',
  'POV 必须在有限选项中做出选择，选择有代价',
  '冲突升级 — 代价逼近或选择收窄',
  '冲突升级 — 代价逼近',
  '外部阻力或内心犹豫',
  '推进章目标',
  '必须二选一',
  '制造一个 Hook',
  '制造 Hook',
  '未完成动作或致命追问',
  '推进局势',
  'no_causal_basis',
];

/** 引导性指令前缀——剥掉后若剩余仍是指令措辞则判空指令 */
const META_PREFIXES = [
  '本 Scene 须释放至少一条新信息（事实/关系/规则）',
  '本 Scene 须',
  '推进冲突',
  '制造一个 Hook',
  '制造一个',
  '制造 Hook',
  '制造',
  '释放至少一条新信息',
  '释放一条新信息',
  '释放',
  '落地一条可感知新信息',
  '推进已有界面的后果/约束',
  '推进已揭示信息的后果',
  '推进',
];

/** choice 字段的模板占位（planner 旧默认值，非具体抉择） */
export const TEMPLATE_CHOICE_RE = /必须做出选择|有限选项|必须二选一|二选一|冲突升级|代价逼近|外部阻力|退缩保全|做还是不做|现在还是稍后|不可逆选择|有代价的选择|每个选项都有代价|no_causal_basis/u;

/**
 * 判断文本是不是「元指令/模板占位」（空指令冒充具体内容）。
 * 具体内容（含物件/动作/后果的正文）返回 false；只剩指令措辞返回 true。
 */
export function isMetaBeatData(text) {
  const t = String(text || '').trim();
  if (!t) return true;
  if (typeof text === 'object') return false; // 结构化 newInformation
  let rest = t;
  for (const prefix of META_PREFIXES) {
    if (rest.startsWith(prefix)) {
      rest = rest.slice(prefix.length).replace(/^[：:，,、]\s*/, '');
      break;
    }
  }
  if (!rest.trim()) return true;
  if (META_PHRASES.some((p) => rest === p)) return true;
  if (/至少一条|至少一个|一条新信息|一个具体|某项|某一|制造.{0,8}Hook|须.{0,12}释放|释放.{0,6}信息|留悬念|禁止平收|未完成动作|致命追问|悬念未解|禁止再/u.test(rest)) return true;
  if (rest.length < 10 && /推进|制造|释放|必须|禁止|悬念/u.test(rest)) return true;
  return false;
}

export function isTemplateChoice(text) {
  return TEMPLATE_CHOICE_RE.test(String(text || ''));
}

/** 从 scenePlan 取一拍的具体数据：模板/元指令/空 → missing 并返回 ''；结构化对象原样返回 */
function pickConcrete(plan, key, structural, missing) {
  const raw = pickPlanValue(plan, key, '');
  if (!raw) {
    missing.push(key);
    return '';
  }
  if (typeof raw === 'object') return raw; // 结构化 newInformation { id, reveal }
  const s = String(raw).trim();
  if (isMetaBeatData(s)) {
    missing.push(key);
    return '';
  }
  return s;
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

  const missing = [];
  let action = '';
  let choice = null;
  let newInformation = null;

  if (structuralBeat === 'choice') {
    // choice 拍：动作就是做出抉择——只认具体两难，禁止拿 scene goal/模板填空。
    const raw = pickPlanValue(scenePlan, 'choice', '');
    if (raw && !isTemplateChoice(raw) && !isMetaBeatData(raw)) {
      choice = typeof raw === 'string' ? raw : String(raw);
    } else {
      missing.push('choice（具体两难抉择，禁止用 scene goal/模板填）');
    }
  } else {
    action = pickConcrete(scenePlan, template.actionKey, structuralBeat, missing);
  }

  if (structuralBeat === 'newInformation') {
    newInformation = action || null; // pickConcrete 已处理 string/object
  }

  const hasConcreteDelta = Boolean(action || choice || newInformation);

  return {
    structuralBeat,
    beforeState,
    action,
    choice,
    newInformation,
    consequence: structuralBeat === 'consequence'
      ? (pickConcrete(scenePlan, 'consequence', structuralBeat, missing) || template.consequenceHint || '')
      : template.consequenceHint || '',
    afterState: template.afterState,
    stateChange: hasConcreteDelta,
    requiredDimension: template.requiredDimension,
    missing: [...new Set(missing)],
    hasConcreteDelta,
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
  const missing = Array.isArray(beatPlan.missing) ? beatPlan.missing : [];
  return [
    '### Scene Beat Plan · 状态变化（必须落地）',
    '> Before / After = **EXPECTED TARGET**（模板/规划目标）；≠ Observed Scene Result；≠ Canon。',
    `- **Before State〔EXPECTED〕**：${beatPlan.beforeState}`,
    `- **Action**：${beatPlan.action || (missing.length ? '⚠ 无具体动作' : '推进局势')}`,
    beatPlan.choice ? `- **Choice**：${beatPlan.choice}` : (missing.includes('choice') ? '- **Choice**：⚠ 计划缺口——禁止拿 scene goal/模板充当，须写具体两难' : ''),
    `- **Consequence〔EXPECTED〕**：${beatPlan.consequence}`,
    `- **After State〔EXPECTED TARGET〕**：${beatPlan.afterState}`,
    dim ? `- **必须改变**：${dim.label}（否则本 Beat 无效）` : '',
    missing.length ? `- **⚠ 计划缺口**：${missing.join('、')}` : '',
    '- **禁止原地踏步**：不得「继续调查→发现异常→继续调查」式重复',
  ].filter(Boolean).join('\n');
}

export function formatBeatStateSequenceBlock(beatPlans = []) {
  if (!beatPlans?.length) return '';
  const lines = [
    '<!-- scene-beat-state-plans -->',
    '## Beat 状态链 · Before → Action → After',
    '',
    '> 链上 Before/After = **EXPECTED TARGET**（规划模板）；正式连续性以 Observed Continuity / scene.text 为准。',
    '',
    '每个 Beat 必须改变至少一个：人物关系 / 信息状态 / 危险等级 / 资源状态 / 目标方向 / 世界认知',
    '',
  ];
  for (const p of beatPlans) {
    const missing = Array.isArray(p.missing) ? p.missing : [];
    lines.push(
      `**${p.structuralBeat}**：〔EXPECTED〕${p.beforeState} → [${p.action || (missing.length ? `⚠ ${missing[0]}` : '推进局势')}] → 〔EXPECTED〕${p.afterState}`,
    );
  }
  const degenerate = validateBeatPlanDegeneration(beatPlans);
  if (degenerate.degenerate) {
    lines.push(
      '',
      `⚠️ **Beat Plan 退化**：${degenerate.issues.join('；')}`,
      '不允许以空洞计划进入 Writer——缺口拍必须由 Writer 填上具体动作/抉择/新信息，否则按硬失败拒稿。',
    );
  }
  return lines.join('\n');
}

/** 兼容旧 escalation Beat */
export function normalizeStructuralBeat(beat = '') {
  if (beat === 'escalation') return 'choice';
  return beat;
}

/** 判断一拍在规划层面是否「有具体内容」（能驱动状态变化） */
export function isBeatPlanConcrete(beat = {}) {
  const bp = beat.beatPlan || beat;
  if (bp.hasConcreteDelta === true) return true;
  if (bp.hasConcreteDelta === false) return false;
  if (Array.isArray(bp.missing) && bp.missing.length) return false;
  // 兼容无 beatPlan 的 beat：看 content / action / choice / newInformation 是否有具体内容
  const content = String(beat.content || beat.action || '').trim();
  const choice = String(beat.choice || '').trim();
  const info = String(beat.newInformation || '').trim();
  if (content && !isMetaBeatData(content)) return true;
  if (choice && !isTemplateChoice(choice) && !isMetaBeatData(choice)) return true;
  if (info && !isMetaBeatData(info)) return true;
  return false;
}

/**
 * Beat Plan Degeneration 检测 — 语义空洞闸（2026-08-18，Step 4）。
 * 判据（连续两拍同时成立）：
 *   ① 两拍均空洞 —— 无具体 action/choice/newInformation（changedDimensions=0 的规划级映射）
 *   ② choice 不变 —— 两拍均为空或逐字相同
 *   ③ goal/状态 不变 —— 两拍 afterState 相同，或均为静态模板（规划未点名真实 delta）
 * → Beat Plan Degeneration。
 * 不要求每一拍都 stateChange=true：单拍静默（观察/思考/确认/情绪拍）合法，只抓「连续两拍」空洞。
 */
export function validateBeatPlanDegeneration(beats = []) {
  const issues = [];
  const beatIndices = [];
  for (let i = 1; i < beats.length; i++) {
    const a = beats[i - 1];
    const b = beats[i];
    if (!a || !b) continue;
    const aHollow = !isBeatPlanConcrete(a);
    const bHollow = !isBeatPlanConcrete(b);
    if (!aHollow || !bHollow) continue;
    const choiceStable = String(a.choice || '') === String(b.choice || '');
    const aAfter = String(a.afterState || '').trim();
    const bAfter = String(b.afterState || '').trim();
    const stateStable = aAfter === bAfter
      || (aAfter === (BEAT_STATE_TEMPLATES[a.structuralBeat]?.afterState || '')
          && bAfter === (BEAT_STATE_TEMPLATES[b.structuralBeat]?.afterState || ''));
    if (choiceStable && stateStable) {
      issues.push(`拍 ${a.order ?? i}/${b.order ?? i + 1}（${a.structuralBeat || '?'} → ${b.structuralBeat || '?'}）连续两拍空洞：无具体动作/抉择/新信息，choice 与状态均未变`);
      beatIndices.push(i);
    }
  }
  return {
    degenerate: issues.length > 0,
    count: issues.length,
    issues,
    beatIndices,
  };
}

/** 格式化一个 beat 的缺失缺口（Prompt Compiler 用） */
export function formatBeatMissingGap(beat = {}) {
  const bp = beat.beatPlan || beat;
  const missing = Array.isArray(bp.missing) ? bp.missing : [];
  if (!missing.length) return '';
  const map = {
    choice: '本拍计划无具体 Choice（已禁止用 scene goal/模板充当）。必须写一个真正的两难抉择：POV 在两个都带代价的选项之间做决定，选择本身改变局面。',
    newInformation: '本拍计划无具体新信息（「释放至少一条新信息」是空指令，不允许作为本拍数据）。必须点名一个具体物件/事实/后果：谁发现/说出/看到什么，知道之后局面怎么变。',
    consequence: '本拍计划无具体代价（「选择产生可见代价」是模板）。必须写一个可见后果：失去什么/付出什么/关系怎么变。',
    cliffhanger: '本拍计划无具体悬念（「章尾强 Hook」是模板）。必须落一个未完成的具体动作或致命追问，禁止平收。',
    obstacle: '本拍计划无具体阻力。必须写一个具体阻碍：什么东西挡路、代价如何升高。',
    goal: '本拍计划无具体目标。必须写 POV 本拍要推进的一个具体动作。',
  };
  const lines = missing
    .map((m) => {
      const key = String(m).split('（')[0].split(' ')[0].trim();
      return map[key] || `本拍计划缺口：${m}。必须写具体内容（禁止模板/空指令）。`;
    });
  return [`【Beat 计划缺口】${lines.join('；')}`].join('\n');
}

export function migrateScenePlan(plan = {}) {
  // 2026-08-18：不再注入模板默认值。choice/consequence 缺失就保持缺失——
  // 由 buildSceneBeatPlan 记入 missing，让缺口显式暴露，而不是拿模板占位冒充具体计划。
  return { ...plan };
}
