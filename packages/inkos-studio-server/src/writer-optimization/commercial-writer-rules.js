/**
 * Commercial Writer Rules v4 — 商业爆款小说生成系统
 * 全部资源投入 Writer Prompt，不新增评分器
 */
import { buildScenePlan } from '@inkos/director';

const ANOMALY_MARKERS = '异常事件/冲突/危机/规则违背/不可能之事/突发威胁/死亡/选择';

/** 四条商业铁律 — 所有 Writer Prompt 必须包含 */
export const COMMERCIAL_PRINCIPLES = [
  {
    id: 1,
    title: '事件改变局势',
    dont: '不要写「事件发生」——只叙述发生了什么，局势却不变',
    must: '要写「事件改变局势」——每个事件必须改变关系/信息/危险/资源/目标/世界认知至少一项',
    wrong: '她发现日志有问题。（局势未变）',
    right: '日志有问题。她不能再假装没看见——上报，或者成为共犯。（局势已变）',
  },
  {
    id: 2,
    title: '问题→代价→奖励',
    dont: '不要只制造问题——连续堆悬念却不给读者回报',
    must: '必须：制造问题 → 付出代价 → 获得奖励（信息/能力/关系/胜利/爽点至少一种）',
    wrong: '又一个谜团，又一个威胁，又一个异常。（只有压力）',
    right: '她赌命撬开了日志（代价），终于拿到阴谋证据（奖励），但门外响起了脚步声（新问题）。',
  },
  {
    id: 3,
    title: '紧张→释放→更大危机',
    dont: '不要连续增加压力——全程紧绷，读者会疲劳弃书',
    must: '必须：紧张 → 释放 → 更大危机（Tension → Reward → New Threat）',
    wrong: '危险升级，危险再升级，危险继续升级。（无释放）',
    right: '她赢了一局（释放），刚松半口气，系统亮红灯——比刚才更糟（更大危机）。',
  },
  {
    id: 4,
    title: '读者为什么必须继续看',
    dont: '不要写「剧情推进了」却回答不了读者为何翻页',
    must: '每章/每 Scene 须能回答：**为什么读者现在必须继续看？**（未完成动作/致命追问/新威胁/新奖励）',
    wrong: '本章交代了很多背景。（读者可停）',
    right: '她刚选完边，倒计时开始——读者不知道下一分钟谁会死。（必须继续）',
  },
];

/** 升级后系统闭环 — Writer 须理解自己在链路中的位置 */
export const COMMERCIAL_PIPELINE = [
  'Director — 规划故事与读者追读曲线',
  'Scene Director — 规划状态变化（Goal→Obstacle→Choice→Consequence→Info→Hook）',
  'Beat Execution — 执行戏剧变化（每 Beat Before→After 不同）',
  'Reward Engine — 提供阅读奖励（防疲劳）',
  'Reader Simulation — 分析读者反应（CP / Curiosity / Drop Risk）',
  'Reader Preference Learning — 学习偏好，放大读者喜欢的元素',
  'Adaptive Planner — 优化下一章 Director 输入',
  'Writer — 生成更强正文（你在此环节）',
];

/** 完成标准 — 商业爆款生成系统 */
export const COMMERCIAL_COMPLETION_GOALS = [
  '不再出现「剧情推进但读者无感」',
  '每个 Scene 都有明确状态变化',
  '每章都有奖励和 Hook 升级',
  'Hook 不只是悬念，而是读者心理驱动（Curiosity→Danger→Cost→Truth→不可回头）',
  '系统知道读者喜欢什么，并主动强化（Preference Learning）',
];

/** 完成标准（Writer 执行清单） */
export const COMPLETION_STANDARD = [
  '第一屏抓人 — 前 300 字内异常或冲突落地',
  '节奏持续推进 — 每 400～600 字一个爆点，禁止平铺',
  '信息持续增加 — 每 Scene 至少新增一类内容，禁止复述',
  '章末追更欲望 — Hook 须让读者想立刻翻页',
  ...COMMERCIAL_COMPLETION_GOALS.map((g) => `✅ ${g}`),
];

export const COMMERCIAL_WRITER_CORE = [
  '**最高原则**：不写「正确」，写「上瘾」——读者必须想翻页、想追更',
  '禁止重复表达同一信息（角色、设定、情绪、结论均不得复述）',
  '环境描写压缩到最低：仅保留推动剧情的感官信息，连续环境句不超过 2 句',
  '禁止总结解释、禁止作者旁白、禁止跨 Scene、禁止章内收束全章',
  '先发生事情，再解释原因 — 禁止先铺垫背景再进入事件',
];

/** 1. 第一页必须抓住读者 */
export const FIRST_PAGE_RULE = [
  '**第一页铁律**：前 **300 字**内必须出现异常事件或冲突',
  `- 爆点形式：${ANOMALY_MARKERS}（必须先落地，再解释）`,
  '**禁止开篇**：背景介绍、世界观综述、人物履历、环境铺陈、设定说明',
  '**正确顺序**：动作/异常先行 → 角色反应 → 必要时才补一句原因',
  '第一章 **唯一主 POV**，禁止切视角、禁止旁白全知、禁止「与此同时/另一边」',
];

/** 2. 商业节奏六段式 — 每 Beat 状态变化 */
export const SCENE_STRUCTURE_RULE = [
  '**Scene 商业节奏（必须严格按序，每 Beat 改变状态）**：',
  '',
  'Goal（目标）',
  '  ↓ Before→Action→After：锁定可执行目标',
  'Obstacle（阻碍）',
  '  ↓ 阻力落地，危险等级上升',
  'Choice（抉择）',
  '  ↓ POV 被迫选择，关系/目标方向改变',
  'Consequence（代价）',
  '  ↓ 选择代价落地，资源/退路受损',
  'New Information（新信息）',
  '  ↓ 认知更新，世界认知改变',
  'Hook（悬念）',
  '  ↓ 新局面未收束，读者想翻页',
  '',
  '**Beat 铁律**：',
  '- 每个 Beat：Before State → Action → After State，After ≠ Before',
  '- 必须改变：人物关系/信息/危险/资源/目标/世界认知 至少一项',
  '- 禁止「调查异常→发现异常→继续调查」式原地踏步',
];

/** 3. 节奏爆点 — 每 400～600 字 */
export const RHYTHM_BEAT_RULE = [
  '**节奏爆点**：每 **400～600 字**必须出现一次爆点',
  '爆点类型（任选或组合）：冲突 / 真相 / 反转 / 选择 / 危机 / 死亡 / 新规则',
  '禁止连续 600 字以上无事件、无对话、无冲突推进的静态叙述',
  '爆点须用**动作或对白**落地，禁止用心理分析代替事件',
];

/** 4. 减少 AI 味 */
export const ANTI_AI_FLAVOR_RULE = [
  '**去 AI 味 · 身体先行**：',
  '- **多写动作**：门、手、脚步、物体、身体反应',
  '- **多写对白**：用对话交锋推进，不要旁白解释',
  '- **少写心理分析**：禁止「她觉得/他意识到/内心涌起」式内心戏',
  '- **少解释情绪**：用动作展示，不用形容词总结',
  '- **身体动作优先于心理描写**',
  '',
  '**错误示范**：她觉得哪里不对。',
  '**正确示范**：门自己开了。她的手停住了。',
  '',
  '连续心理描写不超过 3 句；超过则必须用动作或对白打断',
];

/** 5. 每 Scene 必须新增内容 */
export const SCENE_NEW_CONTENT_RULE = [
  '**本 Scene 必须至少新增以下之一**（禁止复述已知信息）：',
  '- 一个谜团（可追问、未解答）',
  '- 一个世界规则（可感知、可验证）',
  '- 一个人物秘密（关系/身份/动机裂缝）',
  '- 一个组织信息（势力/制度/幕后线索）',
  '- 一个伏笔（后文可兑现的细节或承诺）',
  '新增内容须通过**事件或对白**呈现，禁止说明腔、禁止设定百科',
];

/** 按结构 Beat 的 Writer 执行指令 */
const BEAT_WRITER_DIRECTIVES = {
  goal: [
    '用**动作或对白**建立 POV 当下目标，禁止背景综述',
    '本 Beat 结束时：读者知道主角要做什么，且感到有事即将发生',
  ],
  obstacle: [
    '阻力必须**具体可感**，用事件落地，危险等级须上升',
    'After State：目标受挫，比 Goal 更紧',
  ],
  choice: [
    'POV **被迫选择** — 信/不信、进/退、说/不说，选项均有代价',
    'After State：选择已做出，关系或目标方向改变',
  ],
  consequence: [
    '**代价落地** — 选择后果可见（失去/暴露/受损），禁止重复 Choice',
    'After State：局面因代价而改变，比选择前更糟或更紧',
  ],
  escalation: [
    'POV **被迫选择**，禁止重复 Obstacle',
    'After State：选择已做出，后果即将落地',
  ],
  newInformation: [
    '释放**至少一条新信息**（事实/规则/关系/谜团），禁止复述已知',
    '本 Beat 结束时：读者认知被更新，局面被改写',
    '**若为本 Scene Reward Beat**：须落地读者奖励（信息/能力/关系/胜利/爽点），让读者感到「赚到了」',
  ],
  hook: [
    'Scene 尾**强悬念** — 未完成动作/致命追问/新威胁，禁止平收总结',
    '本 Beat 结束时：读者必须想翻页或看下一场',
  ],
};

export function buildBeatWriterDirective(beat = {}) {
  const structural = beat.structuralBeat || beat.id;
  const lines = BEAT_WRITER_DIRECTIVES[structural] || [];
  if (!lines.length) return '';
  return [
    `### Beat 写作指令 · ${beat.label || structural}`,
    ...lines.map((l) => `- ${l}`),
    beat.libraryBeat ? `- Library \`${beat.libraryBeat}\`：用不同类型的事件落地，禁止与上一 Beat 同类型` : '',
  ].filter(Boolean).join('\n');
}

function buildOpeningRule(chapter, sceneIndex) {
  if (chapter === 1 && sceneIndex === 1) {
    return FIRST_PAGE_RULE.join('\n');
  }
  if (sceneIndex === 1) {
    return [
      '**章开篇**：',
      `- 前 **300 字**内须出现事件、冲突或${ANOMALY_MARKERS}`,
      '- 禁止冗长回顾与背景铺陈，从动作/对话/异常直接切入',
    ].join('\n');
  }
  return null;
}

function buildPovRule(chapter, intent = {}) {
  const pov = intent.pov || '主角';
  if (chapter === 1) {
    return [
      '**POV 铁律（第一章）**：',
      `- 全章仅使用主 POV「${pov}」限知视角`,
      '- 禁止频繁切视角；其他角色只能通过 POV 所见所闻呈现',
      `- 正文须出现 POV 角色名「${pov}」至少 2 次`,
    ].join('\n');
  }
  return intent.pov
    ? `**POV**：限知视角「${pov}」，正文须出现该角色名至少 2 次`
    : '';
}

function buildScenePlanBlock(scene = {}, intent = {}) {
  const plan = scene.scenePlan || buildScenePlan(scene, intent);
  const rewardLine = plan.reward?.promise
    ? `- **Payoff**：${plan.reward.payoff} ← Promise: ${plan.reward.promise}`
    : plan.reward?.requiresPromise
      ? '- **Payoff**：⚠ 须绑定 Story Memory Promise'
      : null;
  const situationLines = plan.situation
    ? [
      '**局势变化（Situation Engine）**：',
      `- 开局：${plan.situation.openingWorldState}`,
      `- 终局：${plan.situation.closingWorldState}`,
    ]
    : [];
  const questionLines = plan.questions
    ? [
      '**问题链（Question Engine）**：',
      `- Book：${plan.questions.bookQuestion}`,
      `- Chapter：${plan.questions.chapterQuestion}`,
      `- Scene：${plan.questions.sceneQuestion}`,
      `- 须回答：${plan.questions.answeredQuestion}`,
      `- 须提出：${(plan.questions.newQuestions || []).join(' / ')}`,
    ]
    : [];
  return [
    '## Scene 导演单（故事推进，不是事件堆砌）',
    '**完成标准**：Scene 首尾须是两个不同的世界状态',
    '**节奏**：Tension → Reward → New Threat',
    ...situationLines,
    ...questionLines,
    `- **Goal**：${plan.goal}`,
    `- **Obstacle**：${plan.obstacle}`,
    `- **Choice**：${plan.choice}`,
    `- **Consequence**：${plan.consequence}`,
    `- **New Information**：${plan.newInformation}`,
    rewardLine,
    `- **Hook / Cliffhanger**：${plan.cliffhanger}`,
  ].filter(Boolean).join('\n');
}

export function buildCommercialWriterRulesBlock({
  chapter = 1,
  scene = {},
  intent = {},
  storyDna = {},
} = {}) {
  const sceneIndex = scene?.index ?? 1;
  const parts = [
    '<!-- commercial-writer-rules v4-blockbuster -->',
    '## Commercial Writer · 商业爆款写上瘾法则',
    '',
    buildCommercialPrinciplesBlock(),
    '',
    buildCommercialPipelineBlock(),
    '',
    buildCommercialCompletionBlock(),
    '',
    '### 执行清单',
    ...COMPLETION_STANDARD.slice(0, 4).map((r) => `- ${r}`),
    '',
    '### 核心原则',
    ...COMMERCIAL_WRITER_CORE.map((r) => `- ${r}`),
    '',
    '### 商业节奏',
    ...SCENE_STRUCTURE_RULE.map((r) => (r.startsWith('**') || r.startsWith('  ') || r === '' || /^[A-Z]/.test(r) ? r : `- ${r}`)),
    '',
    '### 节奏爆点',
    ...RHYTHM_BEAT_RULE.map((r) => `- ${r}`),
    '',
    '### 去 AI 味',
    ...ANTI_AI_FLAVOR_RULE.map((r) => (r.startsWith('**') || r.startsWith('-') || r === '' || r.includes('：') && !r.startsWith('- ') ? r : `- ${r}`)),
    '',
    '### 信息增量',
    ...SCENE_NEW_CONTENT_RULE.map((r) => `- ${r}`),
    '',
    buildScenePlanBlock(scene, intent),
  ];

  const opening = buildOpeningRule(chapter, sceneIndex);
  if (opening) parts.push('', opening);

  const pov = buildPovRule(chapter, intent);
  if (pov) parts.push('', pov);

  if (storyDna?.core_hook || storyDna?.main_question) {
    parts.push('', `- **书级追问锚点**：${storyDna.main_question || storyDna.core_hook}`);
  }

  const readerPref = intent?.readerPreference || intent?._chapterDirector?.readerPreference;
  if (readerPref?.recommendation) {
    parts.push('', `- **Reader Preference**：${readerPref.recommendation}`);
  }

  return parts.join('\n');
}

export function buildCommercialPrinciplesBlock({ compact = false } = {}) {
  if (compact) {
    return COMMERCIAL_PRINCIPLES.map((p) => (
      `原则${p.id}：${p.must}`
    )).join('\n');
  }

  const lines = [
    '### 商业铁律（四条 · 必须遵守）',
    '',
    '**最终目标**：从「AI 小说生产系统」升级为「商业爆款小说生成系统」。',
    '',
  ];

  for (const p of COMMERCIAL_PRINCIPLES) {
    lines.push(
      `**原则 ${p.id} · ${p.title}**`,
      `- ❌ ${p.dont}`,
      `- ✅ ${p.must}`,
      p.wrong ? `  - 错误：${p.wrong}` : '',
      p.right ? `  - 正确：${p.right}` : '',
      '',
    );
  }

  return lines.filter(Boolean).join('\n');
}

export function buildCommercialPipelineBlock() {
  return [
    '### 系统闭环（你写的每一段都服务于此）',
    ...COMMERCIAL_PIPELINE.map((step, i) => `${i + 1}. ${step}`),
    '',
    '**Writer 职责**：把 Director 规划的状态变化写成让读者上瘾的正文，不是把剧情「说明白」。',
  ].join('\n');
}

export function buildCommercialCompletionBlock() {
  return [
    '### 完成标准 · 商业爆款',
    ...COMMERCIAL_COMPLETION_GOALS.map((g) => `- ✅ ${g}`),
  ].join('\n');
}

/** Beat System 用精简版商业原则 */
export const BEAT_COMMERCIAL_PRINCIPLES = [
  '原则1：不写「事件发生」，写「事件改变局势」— After State 必须与 Before 不同',
  '原则2：不只制造问题，须 问题→付出代价→获得奖励',
  '原则3：不连续加压，须 紧张→释放→更大危机',
  '原则4：每 Scene 须回答「为什么读者现在必须继续看？」',
];

/** Beat System 用精简版去 AI 味规则 */
export const BEAT_ANTI_AI_RULES = [
  '多写动作，多写对白；少写心理分析，少解释情绪',
  '身体动作优先于心理描写',
  '禁止：「她感觉事情不对」「他意识到危险」→ 改成：「门自己开了。她的手停在半空。」',
  '禁止：「她很聪明」→ 改成：「会议结束前，她已经找出了三个漏洞。」',
  '禁止 AI 逻辑完整闭环（事情→原因→结果）；须：事件 → 反应 → 留白',
  '禁止：似乎、仿佛、隐约、心中一震、眉头微皱、空气仿佛凝固',
  '每个 Beat 先完成 Writer Intent，再落地剧情；禁止与上一 Beat 做同类型的事',
];
