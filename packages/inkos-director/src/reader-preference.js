/**
 * Reader Preference Learning — 从「修错」升级为「学习偏好、放大爽点」
 * 统计最近 N 章读者对剧情元素的响应，驱动下一章 Director 放大读者喜欢的内容
 */

export const PREFERENCE_WINDOW_CHAPTERS = 5;
export const PREFERENCE_MIN_SCORE = 68;
export const PREFERENCE_LEAD_MARGIN = 6;

/** 读者偏好元素 — 爆款须知道读者喜欢什么，而不只是哪里不好 */
export const READER_PREFERENCE_ELEMENTS = [
  {
    id: 'conspiracy',
    name: '阴谋',
    nameEn: 'Conspiracy',
    libraryBeats: ['Discovery', 'Twist'],
    sceneTypes: ['exposition', 'dialogue'],
    textSignals: /阴谋|幕后|操控|布局|密谋|组织|势力|黑手|日志|档案|系统/u,
    curiosityWeight: 0.55,
    continueWeight: 0.45,
    boost: { mysteryBoost: 12, addMystery: true, addInformationGap: true },
    recommendation: '读者偏好阴谋布局 — 下一章提高 Mystery Curve，加深信息差与幕后线索',
  },
  {
    id: 'relationship',
    name: '角色关系',
    nameEn: 'Relationship',
    libraryBeats: ['Relationship'],
    sceneTypes: ['dialogue', 'opening'],
    textSignals: /信任|怀疑|盟友|对峙|试探|关系|站队|背叛|合作|翻脸|眼神|沉默/u,
    curiosityWeight: 0.35,
    continueWeight: 0.65,
    boost: { relationshipBeatBoost: 1, libraryPrefer: ['Relationship'] },
    recommendation: '读者偏好角色互动 — 下一章自动提高 Relationship Beat 权重',
  },
  {
    id: 'action',
    name: '动作',
    nameEn: 'Action',
    libraryBeats: ['Danger', 'Countdown'],
    sceneTypes: ['action', 'climax'],
    textSignals: /冲|跑|追|打|躲|搏斗|冲刺|逃|撞|踢|枪|刀|倒计时|来不及/u,
    curiosityWeight: 0.4,
    continueWeight: 0.6,
    boost: { conflictBoost: 14, advancePacing: true, increaseConflict: true },
    recommendation: '读者偏好动作节奏 — 下一章提高冲突密度与节奏推进',
  },
  {
    id: 'emotion',
    name: '情感',
    nameEn: 'Emotion',
    libraryBeats: ['Relationship', 'Decision'],
    sceneTypes: ['dialogue', 'ending'],
    textSignals: /心跳|颤抖|眼泪|哽咽|愤怒|恐惧|绝望|希望|拥抱|告别|愧疚/u,
    curiosityWeight: 0.5,
    continueWeight: 0.5,
    boost: { payoffBoost: 10, emotionEmphasis: true },
    recommendation: '读者偏好情感张力 — 下一章加强情感兑现与关系代价',
  },
  {
    id: 'twist',
    name: '反转',
    nameEn: 'Twist',
    libraryBeats: ['Twist'],
    sceneTypes: ['climax', 'ending'],
    textSignals: /却|竟然|原来|不是.*而是|没想到|反转|翻盘|假|真|身份/u,
    curiosityWeight: 0.7,
    continueWeight: 0.3,
    boost: { mysteryBoost: 15, payoffBoost: 8, libraryPrefer: ['Twist'] },
    recommendation: '读者偏好反转 — 下一章提高 Mystery Curve 与 Twist Beat 权重',
  },
  {
    id: 'growth',
    name: '成长',
    nameEn: 'Growth',
    libraryBeats: ['Decision', 'Relationship'],
    sceneTypes: ['climax', 'standard'],
    textSignals: /选择|成长|蜕变|承担|代价|不能再|必须|学会|承认|面对/u,
    curiosityWeight: 0.45,
    continueWeight: 0.55,
    boost: { growthEmphasis: true, payoffBoost: 6 },
    recommendation: '读者偏好角色成长 — 下一章推动 POV 做出不可逆选择与代价落地',
  },
  {
    id: 'reasoning',
    name: '推理',
    nameEn: 'Reasoning',
    libraryBeats: ['Discovery', 'Decision'],
    sceneTypes: ['exposition', 'dialogue'],
    textSignals: /推理|线索|拼凑|意味着|因此|如果.*那么|逻辑|证据|排除|推断/u,
    curiosityWeight: 0.65,
    continueWeight: 0.35,
    boost: { mysteryBoost: 10, addInformationGap: true, libraryPrefer: ['Discovery', 'Decision'] },
    recommendation: '读者偏好推理解谜 — 下一章提高 Mystery Curve 与信息拼图密度',
  },
];

export function getPreferenceElementById(id = '') {
  return READER_PREFERENCE_ELEMENTS.find((e) => e.id === id) || null;
}

/**
 * 检测 Scene 中各偏好元素的权重（0–1）
 */
export function detectSceneElementWeights({
  text = '',
  executionPlan = null,
  beatMemory = {},
  emotionCurve = null,
} = {}) {
  const corpus = String(text || '');
  const weights = {};

  for (const el of READER_PREFERENCE_ELEMENTS) {
    let w = 0;

    if (el.textSignals?.test(corpus)) w += 0.35;

    const libs = executionPlan?.libraryTypesUsed || [];
    if (el.libraryBeats?.some((b) => libs.includes(b))) w += 0.3;

    if (el.sceneTypes?.includes(executionPlan?.sceneType)) w += 0.15;

    if (el.id === 'relationship' && executionPlan?.reward?.payoff) w += 0.2;
    if (el.id === 'conspiracy' && executionPlan?.reward?.promise) w += 0.15;
    if (el.id === 'action' && executionPlan?.reward?.type === 'Victory') w += 0.15;
    if (el.id === 'emotion' && emotionCurve?.scenePeak) {
      const peak = Math.max(
        emotionCurve.scenePeak.fear ?? 0,
        emotionCurve.scenePeak.hope ?? 0,
        emotionCurve.scenePeak.anger ?? 0,
      );
      if (peak >= 45) w += 0.2;
    }
    if (el.id === 'growth' && beatMemory.stateChanges?.some?.((s) => /选择|代价|目标/.test(s))) {
      w += 0.15;
    }
    if (el.id === 'twist' && executionPlan?.beats?.some((b) => b.libraryBeat === 'Twist')) {
      w += 0.2;
    }
    if (el.id === 'reasoning' && /[？?]/.test(corpus) && el.textSignals?.test(corpus)) {
      w += 0.1;
    }

    weights[el.id] = Math.max(0, Math.min(1, w));
  }

  return weights;
}

/**
 * 元素参与度 = 元素权重 × 读者指标
 */
export function computeElementEngagement(elementWeights = {}, metrics = {}) {
  const {
    continueProbability = 50,
    curiosity = 50,
  } = metrics;

  const engagement = {};
  for (const el of READER_PREFERENCE_ELEMENTS) {
    const weight = elementWeights[el.id] ?? 0;
    if (weight < 0.12) continue;
    const score = Math.round(
      weight * (continueProbability * el.continueWeight + curiosity * el.curiosityWeight),
    );
    engagement[el.id] = {
      id: el.id,
      name: el.name,
      weight,
      score,
      continueProbability,
      curiosity,
    };
  }
  return engagement;
}

/**
 * 汇总一章 Scene 级元素参与度
 */
export function aggregateChapterElementScores(sceneEngagements = []) {
  const totals = {};
  const counts = {};

  for (const scene of sceneEngagements) {
    for (const [id, data] of Object.entries(scene.engagement || {})) {
      totals[id] = (totals[id] || 0) + data.score;
      counts[id] = (counts[id] || 0) + 1;
    }
  }

  const elementScores = {};
  for (const id of Object.keys(totals)) {
    elementScores[id] = Math.round(totals[id] / counts[id]);
  }
  return elementScores;
}

/**
 * 分析最近 N 章偏好 — 找出读者最喜欢什么
 */
export function analyzeReaderPreferences(preferenceHistory = [], {
  window = PREFERENCE_WINDOW_CHAPTERS,
} = {}) {
  const recent = (preferenceHistory || []).slice(-window);
  if (!recent.length) {
    return {
      elementScores: {},
      rankings: [],
      readerPreference: null,
      adjustments: {},
      directives: [],
    };
  }

  const totals = {};
  const counts = {};
  let totalCp = 0;
  let totalCuriosity = 0;
  let cpCount = 0;
  let curCount = 0;

  for (const ch of recent) {
    for (const [id, score] of Object.entries(ch.elementScores || {})) {
      totals[id] = (totals[id] || 0) + score;
      counts[id] = (counts[id] || 0) + 1;
    }
    if (ch.avgContinueProbability != null) {
      totalCp += ch.avgContinueProbability;
      cpCount += 1;
    }
    if (ch.avgCuriosity != null) {
      totalCuriosity += ch.avgCuriosity;
      curCount += 1;
    }
  }

  const elementScores = {};
  for (const id of Object.keys(totals)) {
    elementScores[id] = Math.round(totals[id] / counts[id]);
  }

  const rankings = Object.entries(elementScores)
    .map(([id, score]) => ({
      id,
      name: getPreferenceElementById(id)?.name || id,
      score,
    }))
    .sort((a, b) => b.score - a.score);

  const top = rankings[0];
  const second = rankings[1];
  const avgCp = cpCount ? Math.round(totalCp / cpCount) : null;
  const avgCuriosity = curCount ? Math.round(totalCuriosity / curCount) : null;

  if (
    !top
    || top.score < PREFERENCE_MIN_SCORE
    || (second && top.score - second.score < PREFERENCE_LEAD_MARGIN)
  ) {
    return {
      elementScores,
      rankings,
      avgContinueProbability: avgCp,
      avgCuriosity,
      readerPreference: null,
      adjustments: {},
      directives: [],
      windowChapters: recent.length,
    };
  }

  const el = getPreferenceElementById(top.id);
  const readerPreference = buildReaderPreference(top, {
    avgContinueProbability: avgCp,
    avgCuriosity,
    windowChapters: recent.length,
    elementScores,
  });

  const { adjustments, directives } = applyPreferenceToAdjustments(el, top, {
    avgContinueProbability: avgCp,
    avgCuriosity,
  });

  return {
    elementScores,
    rankings,
    avgContinueProbability: avgCp,
    avgCuriosity,
    readerPreference,
    adjustments,
    directives,
    windowChapters: recent.length,
  };
}

export function buildReaderPreference(top = {}, {
  avgContinueProbability = null,
  avgCuriosity = null,
  windowChapters = 5,
  elementScores = {},
} = {}) {
  const el = getPreferenceElementById(top.id);
  if (!el) return null;

  let recommendation = el.recommendation;
  if (top.id === 'relationship' && avgContinueProbability >= 85) {
    recommendation = `读者偏好角色互动（最近 ${windowChapters} 章 Continue Probability ${avgContinueProbability}%）— 下一章自动提高 Relationship Beat`;
  }
  if (top.id === 'twist' && avgCuriosity >= 70) {
    recommendation = `读者偏好反转（最近 ${windowChapters} 章 Reader Curiosity 最高 ${top.score}）— 下一章提高 Mystery Curve`;
  }
  if (top.id === 'conspiracy') {
    recommendation = `读者偏好阴谋布局（得分 ${top.score}）— 下一章加深 Mystery Curve 与信息差`;
  }

  return {
    favoriteElement: el.id,
    favoriteElementName: el.name,
    score: top.score,
    recommendation,
    windowChapters,
    avgContinueProbability,
    avgCuriosity,
    elementScores,
  };
}

export function applyPreferenceToAdjustments(elementDef, top = {}, metrics = {}) {
  if (!elementDef) return { adjustments: {}, directives: [] };

  const adjustments = {
    ...elementDef.boost,
    preferenceElement: elementDef.id,
    preferenceScore: top.score,
  };
  const directives = [elementDef.recommendation];

  if (elementDef.id === 'relationship' && metrics.avgContinueProbability >= 80) {
    adjustments.relationshipBeatBoost = Math.max(adjustments.relationshipBeatBoost || 0, 1);
    directives.push(`角色互动驱动追读（CP ${metrics.avgContinueProbability}%）— Relationship Beat 优先`);
  }
  if (elementDef.id === 'twist' || elementDef.id === 'reasoning' || elementDef.id === 'conspiracy') {
    adjustments.mysteryBoost = Math.max(adjustments.mysteryBoost || 0, 10);
    directives.push('提高 Mystery Curve — 读者对悬念/反转/推理响应最强');
  }

  return { adjustments, directives };
}

export function formatReaderPreferenceBlock(readerPreference = null, rankings = []) {
  if (!readerPreference?.favoriteElement) return '';

  const lines = [
    '### Reader Preference Learning · 放大读者偏好',
    '不只修错，须学习读者喜欢什么并放大：',
    '```json',
    JSON.stringify({
      readerPreference: {
        favoriteElement: readerPreference.favoriteElementName || readerPreference.favoriteElement,
        score: readerPreference.score,
        recommendation: readerPreference.recommendation,
      },
    }, null, 2),
    '```',
  ];

  if (rankings?.length > 1) {
    const top3 = rankings.slice(0, 3).map((r) => `${r.name}:${r.score}`).join(' · ');
    lines.push(`- **近 ${readerPreference.windowChapters || 5} 章元素排名**：${top3}`);
  }

  return lines.join('\n');
}

/**
 * 偏好调整合并到现有 Feedback adjustments
 */
export function mergePreferenceAdjustments(base = {}, preference = {}) {
  const merged = { ...base };
  const pref = preference.adjustments || {};

  merged.hookDensityBoost = Math.max(merged.hookDensityBoost || 0, pref.hookDensityBoost || 0);
  merged.mysteryBoost = Math.max(merged.mysteryBoost || 0, pref.mysteryBoost || 0);
  merged.conflictBoost = Math.max(merged.conflictBoost || 0, pref.conflictBoost || 0);
  merged.payoffBoost = Math.max(merged.payoffBoost || 0, pref.payoffBoost || 0);
  merged.relationshipBeatBoost = Math.max(merged.relationshipBeatBoost || 0, pref.relationshipBeatBoost || 0);
  merged.firstScreenExplosion = merged.firstScreenExplosion || pref.firstScreenExplosion;
  merged.advancePacing = merged.advancePacing || pref.advancePacing;
  merged.increaseConflict = merged.increaseConflict || pref.increaseConflict;
  merged.addMystery = merged.addMystery || pref.addMystery;
  merged.addInformationGap = merged.addInformationGap || pref.addInformationGap;
  merged.emotionEmphasis = merged.emotionEmphasis || pref.emotionEmphasis;
  merged.growthEmphasis = merged.growthEmphasis || pref.growthEmphasis;
  merged.libraryPrefer = pref.libraryPrefer || merged.libraryPrefer || null;
  merged.preferenceElement = pref.preferenceElement || merged.preferenceElement;
  merged.preferenceScore = Math.max(merged.preferenceScore || 0, pref.preferenceScore || 0);

  return merged;
}
