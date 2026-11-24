/**
 * Writer First — 系统最高原则
 * 所有能力最终驱动 Writer，不驱动分析器
 * 禁止新增 Analyzer；新增能力须优先进入 Writer Prompt
 */
import { QUESTION_STATES } from './question-lifecycle.js';

import { WRITER_RUNTIME_POLICY } from './writer-runtime.js';

/** Professional Writer Quality — 五模块（均驱动 Writer，不新增 Analyzer） */
export const WRITER_QUALITY_MODULES = [
  {
    id: 'writer_intelligence',
    name: 'Writer Intelligence / Author Mode',
    file: 'writer-runtime.js',
    goal: '告诉 Writer 职业作者怎么操控读者认知，不是只写事件',
  },
  {
    id: 'human_behavior',
    name: 'Human Behavior',
    file: 'character-behavior.js',
    goal: 'Choice 由欲望/恐惧/过去经历驱动，像真人而非剧情按钮',
  },
  {
    id: 'scene_entertainment',
    name: 'Scene Entertainment',
    file: 'scene-entertainment.js',
    goal: '每 Scene 落地视觉/情绪/对白/反转好看瞬间',
  },
  {
    id: 'human_writing',
    name: 'Human Writing Policy',
    file: 'human-writing-policy.js',
    goal: '禁止 AI 逻辑：情绪总结、解释人物、写全因果',
  },
  {
    id: 'chapter_author_goal',
    name: 'Chapter Author Goal',
    file: 'chapter-author-goal.js',
    goal: '完成读者看完一章留下的感觉与必记一点',
  },
  {
    id: 'writer_craft',
    name: 'Writer Craft Runtime',
    file: 'writer-craft-runtime.js',
    goal: 'P0：Show/画面/节奏/密度/语言变化/职业对白/段落目的 — 阅读体验 > 规则完成',
  },
];

/** 系统铁律 — 不新增 Analyzer */
export const WRITER_FIRST_POLICY = {
  core: 'Writer 是系统唯一正文产出者；分析模块仅学习，不阻塞，不替代写作指令',
  qualityPhase: 'Professional Writer Quality + Runtime V2 — 边写边验边改，不增加规划/评分模块',
  rules: [
    '禁止新增 Engine / Analyzer / Review / Score / Report 分析层',
    'Writer Quality 五模块只进 Writer Prompt / Beat Execution',
    'Writer Runtime V2：Story State · Cause→Effect · Micro Scene · Live Monitor',
    'Author Mode > Writer Intent > Reader Experience > 剧情结构',
    '不通过立即 rewriteCurrentBeat，禁止整 Scene 写完才发现问题',
    '人物因欲望/恐惧/经历行动，不因剧情需要行动',
    '场景必须好看；写法事件→反应→留白',
    '章级完成读者感觉，不只完成剧情节点',
    'Reader Feedback → 仅学习偏好；Adaptive → 只改下一章',
  ],
  loop: [
    'Story DNA',
    'Story Director',
    'Chapter Director（+ Chapter Author Goal）',
    'Scene Engine',
    'Writer Runtime V2（生成→验证→重写）',
    'Beat Execution',
    '正文',
    'Reader Feedback Learning',
    'Adaptive Planner → 下一章',
  ],
  modules: WRITER_QUALITY_MODULES,
};

/**
 * Writer 执行清单 — 所有 Director 输出汇总为正文必做项
 */
export function buildWriterExecutionChecklist({
  executionPlan = {},
  intent = {},
  chapter = null,
  sceneIndex = null,
} = {}) {
  const plan = executionPlan.scenePlan || {};
  const situation = executionPlan.situation || plan.situation || {};
  const questions = executionPlan.questions || plan.questions || {};
  const reward = executionPlan.reward || plan.reward || {};
  const hook = executionPlan.hookOutput || executionPlan.hookLadderEntry?.hookOutput || {};
  const pref = intent.readerPreference || intent._chapterDirector?.readerPreference || null;
  const libraryPrefer = intent._readerPreference?.libraryPrefer
    || intent._adaptiveDirectorOverrides?.libraryPrefer
    || intent._chapterDirector?.libraryPrefer
    || null;

  const items = [];

  const writerRuntime = executionPlan.writerRuntime || {};
  if (writerRuntime.authorMode?.readerManipulation) {
    items.push({
      id: 'author_mode',
      must: `Author Mode：${writerRuntime.authorMode.readerManipulation.slice(0, 70)}`,
      beat: '全 Scene',
      priority: 'p0',
    });
  }
  if (writerRuntime.professionalScene?.writerMust) {
    items.push({
      id: 'professional_scene',
      must: `职业 Scene：${writerRuntime.professionalScene.writerMust.slice(0, 80)}`,
      beat: '全 Scene',
      priority: 'p0',
    });
  }

  for (const beat of (writerRuntime.beats || executionPlan.beats || []).slice(0, 6)) {
    if (!beat.writerIntent) continue;
    items.push({
      id: `intent_${beat.structuralBeat}`,
      must: `${beat.label} Intent：${beat.writerIntent}（${beat.writerRuntime?.readerExperience?.zh || ''}）`,
      beat: beat.structuralBeat,
      priority: 'p0',
    });
  }

  const desire = executionPlan.characterDesire || {};
  const push = executionPlan.characterPush || {};
  if (desire.externalGoal) {
    items.push({
      id: 'character_goal',
      must: `推动 ${desire.name || 'POV'}：${push.scenePush || desire.externalGoal}`,
      beat: '全 Scene',
      priority: 'p1',
    });
  }

  const ws = situation.worldState || { before: situation.openingWorldState, after: situation.closingWorldState };
  const cs = situation.characterState || {};
  const rs = situation.relationshipState || {};
  if (ws.before) {
    items.push({
      id: 'situation_world',
      must: `世界变化：「${ws.before.slice(0, 35)}」→「${ws.after?.slice(0, 35) || '终局'}」`,
      beat: '全 Scene',
      priority: 'p1',
    });
  }
  if (cs.before && cs.after && !cs.missing && !situation.characterTransformationMissing) {
    items.push({
      id: 'situation_character',
      must: `人物变化（authored）：「${cs.before.slice(0, 35)}」→「${cs.after.slice(0, 35)}」`,
      beat: '全 Scene',
      priority: 'p1',
    });
  }
  if (rs.before) {
    items.push({
      id: 'situation_relationship',
      must: `关系变化：「${rs.before.slice(0, 35)}」→「${rs.after?.slice(0, 35) || '—'}」`,
      beat: '全 Scene',
      priority: 'p1',
    });
  }
  if ((situation.dimensionsChanged ?? situation.changedDimensions?.length ?? 0) < 2) {
    items.push({
      id: 'situation_dims',
      must: '三维状态至少改变 2 项（世界/人物/关系）',
      beat: '全 Scene',
      priority: 'p1',
    });
  }

  const emotion = executionPlan.emotionCurve || {};
  if (emotion.emotionStart) {
    items.push({
      id: 'emotion',
      must: `情绪弧：${emotion.emotionStart}→${emotion.emotionMiddle}→${emotion.emotionPeak}→${emotion.emotionEnd}（禁止整章单一情绪）`,
      beat: '全 Scene',
      priority: 'p1',
    });
  }

  const conflict = executionPlan.conflict || {};
  if (conflict.cost) {
    items.push({
      id: 'conflict_cost',
      must: conflict.costAuthored
        ? `Authored conflict cost：${conflict.cost.slice(0, 50)}（可展示；仍 ≠ 自动 Choice consequence）`
        : `Conflict potential, not Choice consequence：${conflict.cost.slice(0, 50)}`,
      beat: 'obstacle',
      priority: 'p1',
    });
  }
  if (conflict.opponent) {
    items.push({
      id: 'conflict_opponent',
      must: `Conflict pressure：${conflict.opponent}${conflict.risk ? ` · potential risk：${String(conflict.risk).slice(0, 36)}` : ''}`,
      beat: 'obstacle',
      priority: 'p1',
    });
  }

  const climaxRole = executionPlan.climaxRole || {};
  if (climaxRole.isClimax && executionPlan.chapterClimax) {
    const cp = executionPlan.chapterClimax;
    items.push({
      id: 'climax',
      must: `章高潮：最大选择 ${cp.maxChoice?.slice(0, 35)} · 位移 ${cp.storyShift?.slice(0, 35)}`,
      beat: '全 Scene',
      priority: 'p1',
    });
  }

  const answeredRq = questions.answeredReaderQuestion?.readerQuestion || questions.answeredQuestion;
  if (answeredRq) {
    items.push({
      id: 'question_answer',
      must: `回答 Reader Question：${answeredRq}`,
      beat: 'newInformation',
      priority: 'p2',
    });
  }
  const newRqs = (questions.newReaderQuestions || []).map((q) => q.readerQuestion)
    .filter(Boolean);
  const newQs = newRqs.length ? newRqs : (questions.newQuestions || []);
  if (newQs.length) {
    items.push({
      id: 'question_ask',
      must: `提出 2 个新 Reader Question：${newQs.join(' · ')}`,
      beat: 'hook',
      priority: 'p2',
    });
  }

  if (reward.valid && reward.promise) {
    const typeLabel = reward.promiseType ? `[${reward.promiseType}/${reward.promiseImportance}] ` : '';
    items.push({
      id: 'payoff',
      must: `兑现 Promise ${typeLabel}「${reward.promise?.slice(0, 40)}」→「${reward.payoff?.slice(0, 40)}」`,
      beat: reward.deliveryBeat || 'newInformation',
      priority: 'p2',
    });
  } else if (reward.requiresPromise) {
    items.push({
      id: 'payoff',
      must: '禁止无 Promise 的奖励 — 须从 Story Memory 承接再写 Payoff',
      beat: 'newInformation',
      priority: 'p2',
    });
  }

  if (hook.actionDeadline) {
    items.push({
      id: 'action_hook',
      must: `Action Hook：${hook.actionDeadline?.slice(0, 50)} · 新行动 ${hook.newAction?.slice(0, 30) || ''}`,
      beat: 'hook',
      priority: 'p1',
    });
  }

  const readerEmotion = executionPlan.readerEmotion || {};
  if (readerEmotion.readerEmotionStart) {
    items.push({
      id: 'reader_emotion',
      must: `读者情绪 ${readerEmotion.readerEmotionStart}→${readerEmotion.readerEmotionEnd}${readerEmotion.dramaticIrony ? ' · 信息差' : ''}`,
      beat: '全 Scene',
      priority: 'p1',
    });
  }

  const writerArc = executionPlan.writerSceneArc || {};
  if (writerArc.sequence?.length) {
    items.push({
      id: 'scene_arc',
      must: 'Scene Arc：Goal→Conflict→Choice→Consequence→Reward→New Threat',
      beat: '逐 Beat',
      priority: 'p1',
    });
    items.push({
      id: 'beat_dims',
      must: '每 Beat 改变 ≥2 项状态（人物/关系/世界/信息/资源/危险）',
      beat: '逐 Beat',
      priority: 'p1',
    });
  }

  const qLifecycle = questions.lifecycle || {};
  if (qLifecycle.answered) {
    items.push({
      id: 'question_lifecycle',
      must: `追问 ${QUESTION_STATES[qLifecycle.answered.state]?.label || qLifecycle.answered.state}：${qLifecycle.answered.readerQuestion?.slice(0, 35)}`,
      beat: 'newInformation',
      priority: 'p2',
    });
  }

  const promiseLc = executionPlan.promiseLifecycle || {};
  if (promiseLc.newPromise?.text) {
    items.push({
      id: 'promise_new',
      must: `新 Promise：${promiseLc.newPromise.text.slice(0, 45)}`,
      beat: 'hook',
      priority: 'p2',
    });
  }

  const tx = executionPlan.characterTransformation || {};
  if (tx.after?.belief) {
    items.push({
      id: 'character_tx',
      must: `人物转变：${tx.before?.belief?.slice(0, 25)} → ${tx.after.belief?.slice(0, 30)}`,
      beat: 'choice',
      priority: 'p1',
    });
  }

  const behavior = executionPlan.characterBehavior || {};
  if (behavior.behaviorLogic?.irrationalAction) {
    items.push({
      id: 'character_behavior',
      must: `真人行为：${behavior.behaviorLogic.desire} → ${behavior.behaviorLogic.irrationalAction.slice(0, 40)}（非剧情按钮）`,
      beat: 'choice',
      priority: 'p1',
    });
  }

  const entertainment = executionPlan.sceneEntertainment || {};
  if (entertainment.entertainment?.visualMoment) {
    items.push({
      id: 'entertainment',
      must: `场景好看：视觉「${entertainment.entertainment.visualMoment.slice(0, 28)}」· 反转「${entertainment.entertainment.surpriseMoment?.slice(0, 28) || ''}」`,
      beat: '全 Scene',
      priority: 'p2',
    });
  }

  const humanWriting = executionPlan.humanWritingPolicy || {};
  if (humanWriting.flowMust) {
    items.push({
      id: 'human_writing',
      must: `真人写法：${humanWriting.flowMust} — 禁「他感到恐惧」「她很聪明」`,
      beat: '全 Scene',
      priority: 'p1',
    });
  }

  const chapterGoal = executionPlan.chapterAuthorGoal
    || intent._chapterDirector?.chapterAuthorGoal
    || null;
  if (chapterGoal?.mainFeeling) {
    items.push({
      id: 'chapter_author_goal',
      must: `章感觉：${chapterGoal.readerEmotionStart}→${chapterGoal.readerEmotionEnd} · 记住「${chapterGoal.mustRemember?.slice(0, 28)}」`,
      beat: '全章',
      priority: 'p0',
    });
  }

  if (conflict.irreversibleChange) {
    items.push({
      id: 'irreversible',
      must: `Conflict potential, not Choice consequence：${conflict.irreversibleChange.slice(0, 48)}`,
      beat: 'obstacle',
      priority: 'p1',
    });
  }

  const satisfaction = executionPlan.readerSatisfaction || {};
  if (satisfaction.payoff) {
    items.push({
      id: 'satisfaction',
      must: `读者满足：${satisfaction.payoff.slice(0, 45)}`,
      beat: 'newInformation',
      priority: 'p2',
    });
  }

  const ending = executionPlan.sceneEnding || {};
  if (ending.label) {
    items.push({
      id: 'scene_ending',
      must: `结尾模式 ${ending.label}`,
      beat: 'hook',
      priority: 'p2',
    });
  }

  const rhythm = executionPlan.sceneRhythm || {};
  if (rhythm.label) {
    items.push({
      id: 'scene_rhythm',
      must: `节奏 ${rhythm.label}：${rhythm.writerHint?.slice(0, 40)}`,
      beat: '全 Scene',
      priority: 'p3',
    });
  }

  items.push({
    id: 'beat_state',
    must: '每个 Beat：Before → Action → After，After ≠ Before',
    beat: '逐 Beat',
    priority: 'p1',
  });

  if (pref?.recommendation) {
    items.push({
      id: 'preference',
      must: pref.recommendation,
      beat: '参考',
      priority: 'p3',
    });
  }
  if (libraryPrefer?.length) {
    items.push({
      id: 'library_prefer',
      must: `Beat Library 优先：${libraryPrefer.join('、')}`,
      beat: '参考',
      priority: 'p3',
    });
  }

  if (intent._adaptiveDirectorOverrides?.firstScreenExplosion && sceneIndex === 1) {
    items.push({
      id: 'adaptive_opening',
      must: '前 300 字须第一屏爆点（Adaptive → Writer）',
      beat: 'goal',
      priority: 'p1',
    });
  }

  return {
    items,
    sceneIndex: sceneIndex ?? executionPlan.sceneIndex,
    chapter,
    policy: '所有项必须落地到正文，不是分析报告',
  };
}

export function formatWriterExecutionChecklist(checklist = {}) {
  if (!checklist.items?.length) return '';

  const lines = [
    '<!-- writer-first-execution-checklist -->',
    '## Writer 执行清单 · 唯一完成标准',
    '',
    '**Writer First**：你不是分析器，你是唯一写正文的人。以下全部须落地，不是建议。',
    '',
  ];

  for (const item of checklist.items) {
    const tag = item.priority ? `[${item.priority.toUpperCase()}]` : '';
    lines.push(`- **${item.beat}** ${tag} ${item.must}`);
  }

  lines.push(
    '',
    '**Scene 完成标准（Writer Runtime 优先）**：',
    `- ${WRITER_RUNTIME_POLICY.core}`,
    ...WRITER_RUNTIME_POLICY.questions.map((q) => `- ${q}`),
    '- 每个 Beat 先完成 Writer Intent，再落地剧情结构',
    '- Scene Arc + Transformation + 不可逆 + 三维 Situation',
    '- Emotion Directive：动作表现情绪，禁止贴标签',
    '- 每 Beat ≥2 维状态变化；禁止调查→发现→继续调查',
    '- 永远：动作 > 对白 > 事件 > 解释',
  );

  return lines.join('\n');
}

/**
 * Adaptive → 下一章 Director 结构化覆盖（不是 Hint 文本）
 */
export function buildAdaptiveDirectorOverrides({
  adjustments = {},
  readerPreference = null,
  directives = [],
  hints = [],
} = {}) {
  const overrides = {
    version: 'adaptive-director-overrides-1',
    hookDensityBoost: adjustments.hookDensityBoost || 0,
    mysteryBoost: adjustments.mysteryBoost || 0,
    conflictBoost: adjustments.conflictBoost || 0,
    payoffBoost: adjustments.payoffBoost || 0,
    hookLadderChapterBoost: adjustments.hookLadderBoost || 0,
    relationshipBeatBoost: adjustments.relationshipBeatBoost || 0,
    libraryPrefer: adjustments.libraryPrefer || null,
    firstScreenExplosion: Boolean(adjustments.firstScreenExplosion),
    advancePacing: Boolean(adjustments.advancePacing),
    increaseConflict: Boolean(adjustments.increaseConflict),
    preferenceElement: adjustments.preferenceElement || readerPreference?.favoriteElement || null,
    readerPreference: readerPreference || null,
    writerDirectives: directives.slice(0, 8),
    appliedAt: new Date().toISOString(),
  };

  if (readerPreference && !overrides.libraryPrefer) {
    const el = readerPreference.favoriteElement;
    const map = {
      relationship: ['Relationship'],
      twist: ['Twist'],
      conspiracy: ['Discovery', 'Twist'],
      action: ['Danger', 'Countdown'],
      reasoning: ['Discovery', 'Decision'],
    };
    overrides.libraryPrefer = map[el] || null;
  }

  for (const h of hints.slice(-3)) {
    if (h.adjustments?.libraryPrefer && !overrides.libraryPrefer) {
      overrides.libraryPrefer = h.adjustments.libraryPrefer;
    }
    if (h.readerPreference && !overrides.readerPreference) {
      overrides.readerPreference = h.readerPreference;
    }
  }

  return overrides;
}

export function applyAdaptiveDirectorOverrides(base = {}, overrides = {}) {
  if (!overrides || !Object.keys(overrides).length) return base;

  return {
    ...base,
    hookLadderChapterBoost: Math.max(
      base.hookLadderChapterBoost || 0,
      overrides.hookLadderChapterBoost || 0,
    ),
    libraryPrefer: overrides.libraryPrefer || base.libraryPrefer || null,
    firstScreenExplosion: overrides.firstScreenExplosion || base.firstScreenExplosion,
    advancePacing: overrides.advancePacing || base.advancePacing,
    increaseConflict: overrides.increaseConflict || base.increaseConflict,
    readerPreference: overrides.readerPreference || base.readerPreference,
    writerDirectives: [
      ...(base.writerDirectives || []),
      ...(overrides.writerDirectives || []),
    ],
    _adaptiveApplied: true,
  };
}

export function formatAdaptiveDirectorBrief(overrides = null) {
  if (!overrides) return '';

  const lines = [
    '### Adaptive → 本章 Director 覆盖（结构化，非 Hint 报告）',
  ];

  if (overrides.writerDirectives?.length) {
    lines.push('', '**Writer 必做**：');
    for (const d of overrides.writerDirectives.slice(0, 6)) {
      lines.push(`- ${d}`);
    }
  }
  if (overrides.libraryPrefer?.length) {
    lines.push(`- **Beat Library 优先**：${overrides.libraryPrefer.join('、')}`);
  }
  if (overrides.readerPreference?.recommendation) {
    lines.push(`- **放大读者偏好**：${overrides.readerPreference.recommendation}`);
  }
  if (overrides.firstScreenExplosion) {
    lines.push('- **开篇强制**：第一 Scene 前 300 字须爆点');
  }

  if (lines.length <= 1) return '';
  return lines.join('\n');
}

export function formatWriterFirstPolicyBlock() {
  return [
    '### Writer First · 系统最高原则',
    `- ${WRITER_FIRST_POLICY.core}`,
    WRITER_FIRST_POLICY.qualityPhase ? `- ${WRITER_FIRST_POLICY.qualityPhase}` : '',
    '',
    '**Professional Writer Quality 五模块**：',
    ...WRITER_QUALITY_MODULES.map((m) => `- ${m.name}：${m.goal}`),
    '',
    '**Professional Writer Runtime**：',
    `- ${WRITER_RUNTIME_POLICY.core}`,
    '',
    '**商业小说闭环**（分析只学习，Writer 才写正文）：',
    ...WRITER_FIRST_POLICY.loop.map((step, i) => `${i + 1}. ${step}`),
    '',
    '**铁律**：',
    ...WRITER_FIRST_POLICY.rules.map((r) => `- ${r}`),
  ].filter(Boolean).join('\n');
}

export function mergeAdaptiveIntoIntent(intent = {}, overrides = {}) {
  if (!overrides || !Object.keys(overrides).length) return intent;

  const readerPrefAdjustments = overrides.libraryPrefer
    ? { libraryPrefer: overrides.libraryPrefer, preferenceElement: overrides.preferenceElement }
    : {};

  return {
    ...intent,
    _adaptiveDirectorOverrides: overrides,
    _readerPreference: {
      ...(intent._readerPreference || {}),
      ...readerPrefAdjustments,
      ...(overrides.libraryPrefer ? { libraryPrefer: overrides.libraryPrefer } : {}),
    },
    readerPreference: overrides.readerPreference || intent.readerPreference,
  };
}
