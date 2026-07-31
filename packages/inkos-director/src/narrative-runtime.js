/**
 * Narrative Runtime — 叙事状态引擎（非 Pipeline · 非第二套 StoryState）
 *
 * ═══════════════════════════════════════════════════════════
 * Architecture Note（模块 1 Review 修正版）
 * ═══════════════════════════════════════════════════════════
 *
 * 职责（只做这些）：
 *   · ReaderState — 好奇/压力/期待/疲劳/满足
 *   · Momentum — 读 StoryState/正文信号 → 算 Delta → 加权评分 → 丢弃中间推导
 *   · activePromises — 仅 Promise id 指针（内容真相源在 Promise Lifecycle）
 *   · Emotion Wave Index — 跟随 Director 规划游标；只校验严重偏离，不决定下一情绪
 *
 * 明确不做：
 *   · 不缓存 world / relationship / protagonist / danger / lore（StoryState 单一真相源）
 *   · 不创造 InformationGap（Director/ExecutionPlan 规划；此处只验证是否落地）
 *   · 不复制 CauseEffect / BeatState / Writer Runtime V2
 *   · 不反向控制 Director 的下一 Beat 情绪
 *
 * 挂点（需要后续任务处理）：
 *   Craft 之后 → evaluateStoryMomentum → 更新 NarrativeState → Next Beat
 *   Conflict Runtime（主/次冲突升级兑现）— 需要后续任务处理
 *   InformationGap 写入 ExecutionPlan — 需要后续任务处理（Director 模块）
 *   Promise Registry 与 activePromises 深度同步 — 需要后续任务处理
 *   接入 validateWriterRuntimeV2 — 需要后续任务处理（不得在本文件改 V2）
 *
 * @typedef {object} ReaderState
 * @property {number} curiosity
 * @property {number} pressure
 * @property {number} expectation
 * @property {number} fatigue
 * @property {number} satisfaction
 * @property {number} [hope]  可选：Hope 维，映射进 expectation/pressure 的软信号
 *
 * @typedef {object} MomentumDelta
 * @property {boolean} stateChanged         局面/状态推进（可读 StoryState before≠after，不缓存）
 * @property {boolean} relationshipChanged
 * @property {boolean} choiceMade
 * @property {boolean} costPaid
 * @property {boolean} [actionTaken]        可选加权项
 *
 * @typedef {object} MomentumState
 * @property {number} lastScore
 * @property {boolean} lastPass
 * @property {MomentumDelta|null} lastDelta
 *
 * @typedef {object} NarrativeState
 * @property {'narrative-state-1'} version
 * @property {ReaderState} readerState
 * @property {MomentumState} momentumState
 * @property {string[]} activePromises     Promise id 列表（指针，非完整伏笔对象）
 * @property {number} emotionWaveIndex     Director 规划浪上的游标
 * @property {string|null} updatedAtBeat
 * @property {string} [updatedAt]
 *
 * @typedef {object} InformationGap
 * @property {string[]} readerKnows
 * @property {string[]} heroKnows
 * @property {string[]} enemyKnows
 * —— 注意：InformationGap 属于 ExecutionPlan；本模块只读入验证，不写入 NarrativeState
 */

/** Director 规划用的情绪浪标签（Runtime 不生成下一拍，只对照校验） */
export const EMOTION_WAVE = Object.freeze([
  'Curiosity',
  'Tension',
  'Pressure',
  'Hope',
  'Shock',
  'Relief',
]);

export const PEAK_EMOTIONS = Object.freeze(new Set(['Tension', 'Pressure', 'Shock']));
export const FLAT_EMOTIONS = Object.freeze(new Set(['Curiosity', 'Relief', '平']));

/** Momentum 加权：score >= MOMENTUM_PASS_SCORE 通过 */
export const MOMENTUM_WEIGHTS = Object.freeze({
  choiceMade: 5,
  costPaid: 5,
  relationshipChanged: 3,
  stateChanged: 3,
  actionTaken: 2,
});

export const MOMENTUM_PASS_SCORE = Number(process.env.INKOS_MOMENTUM_PASS_SCORE || 5);

const ZERO_MOMENTUM_REWRITE = [
  '【拒绝原因：Zero Momentum】',
  '当前 Beat 加权动量不足：选择/代价/关系/状态推进均未有效落地。',
  '请重新生成。优先写入：明确选择、可见代价、关系位移或局面推进（至少构成有效动量分）。',
  '只输出正文，禁止解释。',
].join('\n');

function clamp01(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(100, Math.round(x)));
}

function norm(v = '') {
  return String(v || '').trim();
}

function uniqStrings(list = []) {
  const out = [];
  const seen = new Set();
  for (const item of list) {
    const s = norm(item);
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

/**
 * @param {Partial<ReaderState>} [seed]
 * @returns {ReaderState}
 */
export function createReaderState(seed = {}) {
  return {
    curiosity: clamp01(seed.curiosity ?? 55),
    pressure: clamp01(seed.pressure ?? 30),
    expectation: clamp01(seed.expectation ?? 50),
    fatigue: clamp01(seed.fatigue ?? 15),
    satisfaction: clamp01(seed.satisfaction ?? 40),
    hope: clamp01(seed.hope ?? 40),
  };
}

/**
 * @param {Partial<MomentumState>} [seed]
 * @returns {MomentumState}
 */
export function createMomentumState(seed = {}) {
  return {
    lastScore: Number.isFinite(seed.lastScore) ? Number(seed.lastScore) : 0,
    lastPass: Boolean(seed.lastPass),
    lastDelta: seed.lastDelta && typeof seed.lastDelta === 'object' ? { ...seed.lastDelta } : null,
  };
}

/**
 * 瘦身 NarrativeState — 禁止携带 StoryState 字段
 * @param {Partial<NarrativeState>} [seed]
 * @returns {NarrativeState}
 */
export function createNarrativeState(seed = {}) {
  const readerState = seed.readerState && typeof seed.readerState === 'object'
    ? createReaderState(seed.readerState)
    : createReaderState(seed); // 兼容误传扁平 curiosity 等

  return {
    version: 'narrative-state-1',
    readerState,
    momentumState: createMomentumState(seed.momentumState || {}),
    activePromises: uniqStrings(seed.activePromises || []),
    emotionWaveIndex: Number.isFinite(seed.emotionWaveIndex)
      ? Math.max(0, Math.floor(seed.emotionWaveIndex)) % EMOTION_WAVE.length
      : 0,
    updatedAtBeat: seed.updatedAtBeat ?? null,
    updatedAt: seed.updatedAt || new Date().toISOString(),
  };
}

/**
 * 从 ExecutionPlan 轻量播种（只拿指针与游标，不复制世界/人物状态）
 */
export function seedNarrativeStateFromPlan(executionPlan = {}, prior = null) {
  const base = prior?.version === 'narrative-state-1'
    ? createNarrativeState(prior)
    : createNarrativeState();

  const waveStart = norm(
    executionPlan.readerEmotion?.emotionWave?.start
    || executionPlan.beats?.[0]?.targetEmotion
    || '',
  );
  let emotionWaveIndex = base.emotionWaveIndex;
  if (waveStart && EMOTION_WAVE.includes(waveStart)) {
    emotionWaveIndex = EMOTION_WAVE.indexOf(waveStart);
  }

  const promiseIds = uniqStrings([
    ...base.activePromises,
    ...(executionPlan.promisePointer ? [executionPlan.promisePointer] : []),
    ...(executionPlan.promiseLifecycle?.promisePointer
      ? [executionPlan.promiseLifecycle.promisePointer]
      : []),
    ...(executionPlan.promiseLifecycle?.activePromise?.id
      ? [executionPlan.promiseLifecycle.activePromise.id]
      : []),
  ]);

  return createNarrativeState({
    ...base,
    activePromises: promiseIds,
    emotionWaveIndex,
  });
}

/**
 * 正文推进信号 — 只用于当拍 Delta 计算，算完即丢，不写入 NarrativeState
 * 可叠加 V2 StoryState / MicroScene 已有结果（读取，不复制存档）
 */
export function detectNarrativeSignals(text = '', beat = {}, v2 = null) {
  const t = String(text || '');
  const actionTaken = /打开|关闭|按下|闯入|读取|输入|拔出|拔腿|逃出|逃开|推开|推门|锁上|闪身|冲进|冲出|跑向|跑出|藏进|扔掉|抓住|松开|踹开|挡住/u.test(t)
    || /「[^」]{1,40}」/.test(t)
    || /低声|开口说|厉声|吼道/u.test(t)
    || /推门|跨过|进入|离开|抵达|爬上|跳下|冲出|退回|翻过|塞进|抽出|踹开/u.test(t);

  const choiceMade = /选择|决定|宁愿|宁可|放弃|拒绝|答应|破例|只能选|不得不/u.test(t);
  const relationshipChanged = /信任|怀疑|背叛|翻脸|同盟|决裂|同行|隐瞒|坦白|改口|我信你/u.test(t);
  const costPaid = /代价|失去|耗尽|受伤|牺牲|付出|崩溃|清零|血口|鲜血|碎裂|毁掉/u.test(t);

  // stateChanged：优先消费 V2 StoryState 结论；否则用正文局面信号（不缓存）
  const stateChanged = Boolean(v2?.storyState?.changed)
    || /权限|名单|规则|系统|重置|真相|原来|不可能|倒计时|警报|锁住/u.test(t)
    || Boolean(norm(beat.afterState) && norm(beat.afterState) !== norm(beat.beforeState));

  return {
    stateChanged,
    relationshipChanged,
    choiceMade,
    costPaid,
    actionTaken,
  };
}

/**
 * StoryMomentumEngine — Before 信号 → Delta（不维护世界快照）
 *
 * @param {object} [meta]
 * @param {string} [meta.text]
 * @param {object} [meta.beat]
 * @param {object} [meta.v2]  validateWriterRuntimeV2 当拍结果（只读）
 * @param {object} [meta.signals] 已检测信号
 * @returns {MomentumDelta & { score: number, zero: boolean, pass: boolean }}
 */
export function computeMomentumDelta(meta = {}) {
  const signals = meta.signals || detectNarrativeSignals(meta.text || '', meta.beat || {}, meta.v2 || null);

  /** @type {MomentumDelta} */
  const delta = {
    stateChanged: Boolean(signals.stateChanged),
    relationshipChanged: Boolean(signals.relationshipChanged),
    choiceMade: Boolean(signals.choiceMade),
    costPaid: Boolean(signals.costPaid),
    actionTaken: Boolean(signals.actionTaken),
  };

  const score = scoreMomentumDelta(delta);
  const zero = score === 0;
  const pass = score >= MOMENTUM_PASS_SCORE;

  return {
    ...delta,
    score,
    zero,
    pass,
  };
}

export function scoreMomentumDelta(delta = {}) {
  let score = 0;
  if (delta.choiceMade) score += MOMENTUM_WEIGHTS.choiceMade;
  if (delta.costPaid) score += MOMENTUM_WEIGHTS.costPaid;
  if (delta.relationshipChanged) score += MOMENTUM_WEIGHTS.relationshipChanged;
  if (delta.stateChanged) score += MOMENTUM_WEIGHTS.stateChanged;
  if (delta.actionTaken) score += MOMENTUM_WEIGHTS.actionTaken;
  return score;
}

/**
 * 更新 NarrativeState：只动 Reader / Momentum / Promise 指针 / 游标
 * 不写入 world/danger/relationship/protagonist
 */
export function updateNarrativeStateAfterBeat(before, {
  text = '',
  beat = {},
  executionPlan = null,
  v2 = null,
  momentum = null,
} = {}) {
  const prev = before?.version === 'narrative-state-1'
    ? createNarrativeState(before)
    : createNarrativeState(before || {});

  const deltaPack = momentum || computeMomentumDelta({ text, beat, v2 });
  const nextReader = updateReaderStateAfterBeat(prev.readerState, {
    delta: deltaPack,
    beat,
    executionPlan,
  });

  const beatId = beat.id
    || (beat.order != null ? `beat_${beat.order}` : null)
    || beat.structuralBeat
    || null;

  // 游标：仅当 Director 在 Beat 上声明了 targetEmotion 时对齐；Runtime 不自创下一情绪
  let emotionWaveIndex = prev.emotionWaveIndex;
  const planned = norm(beat.targetEmotion || beat.beatPlan?.targetEmotion || '');
  if (planned && EMOTION_WAVE.includes(planned)) {
    emotionWaveIndex = EMOTION_WAVE.indexOf(planned);
  }

  const activePromises = uniqStrings([
    ...prev.activePromises,
    ...(beat.promisePointer ? [beat.promisePointer] : []),
    ...(executionPlan?.promisePointer ? [executionPlan.promisePointer] : []),
  ]);

  return createNarrativeState({
    readerState: nextReader,
    momentumState: {
      lastScore: deltaPack.score,
      lastPass: deltaPack.pass,
      lastDelta: {
        stateChanged: deltaPack.stateChanged,
        relationshipChanged: deltaPack.relationshipChanged,
        choiceMade: deltaPack.choiceMade,
        costPaid: deltaPack.costPaid,
        actionTaken: Boolean(deltaPack.actionTaken),
      },
    },
    activePromises,
    emotionWaveIndex,
    updatedAtBeat: beatId,
  });
}

/**
 * StoryMomentumValidator — 加权评分，非「凑两项」
 */
export function evaluateStoryMomentum({
  text = '',
  beat = {},
  v2 = null,
  narrativeState = null,
} = {}) {
  const deltaPack = computeMomentumDelta({ text, beat, v2 });
  const failReasons = [];
  if (deltaPack.zero) {
    failReasons.push('Zero Momentum：Choice / Cost / Relationship / State 均无有效信号');
  } else if (!deltaPack.pass) {
    failReasons.push(
      `Momentum 不足：score=${deltaPack.score} < ${MOMENTUM_PASS_SCORE}（Choice5 / Cost5 / Relation3 / State3 / Action2）`,
    );
  }

  return {
    kind: 'storyMomentum',
    pass: deltaPack.pass,
    zero: deltaPack.zero,
    score: deltaPack.score,
    passScore: MOMENTUM_PASS_SCORE,
    delta: {
      stateChanged: deltaPack.stateChanged,
      relationshipChanged: deltaPack.relationshipChanged,
      choiceMade: deltaPack.choiceMade,
      costPaid: deltaPack.costPaid,
      actionTaken: Boolean(deltaPack.actionTaken),
    },
    weights: { ...MOMENTUM_WEIGHTS },
    narrativeState: narrativeState || null,
    failReasons,
    rewriteHint: deltaPack.pass ? '' : ZERO_MOMENTUM_REWRITE,
  };
}

/**
 * InformationGap 验证（只读 ExecutionPlan 规划，不存入 NarrativeState）
 */
export function assertInformationGapMeaningful(gap = {}) {
  const readerKnows = uniqStrings(gap.readerKnows);
  const heroKnows = uniqStrings(gap.heroKnows);
  const enemyKnows = uniqStrings(gap.enemyKnows);
  const r = readerKnows.join('|');
  const h = heroKnows.join('|');
  const e = enemyKnows.join('|');
  const allEmpty = !r && !h && !e;
  const allSame = Boolean(r) && r === h && h === e;
  const pass = !allEmpty && !allSame;
  return {
    pass,
    failReasons: pass
      ? []
      : [
        allEmpty ? 'informationGap 为空 — Director 须规划读者/主角/敌人知识差' : '',
        allSame ? '禁止所有角色知道同样的信息 — ExecutionPlan.informationGap 须拆开' : '',
      ].filter(Boolean),
  };
}

/**
 * 验证正文是否触及规划中的 InformationGap（Runtime 校验，非创造）
 */
export function validateInformationGapRealization(plannedGap = null, text = '') {
  if (!plannedGap) {
    return { pass: true, skipped: true, failReasons: [] };
  }
  const structure = assertInformationGapMeaningful(plannedGap);
  if (!structure.pass) {
    return { ...structure, realized: false };
  }

  const t = String(text || '');
  const needles = uniqStrings([
    ...(plannedGap.readerKnows || []),
    ...(plannedGap.heroKnows || []),
    ...(plannedGap.enemyKnows || []),
  ]);
  // 软验：至少一个规划知识点被正文触达（子串 / 关键词）
  const realized = needles.length === 0
    || needles.some((n) => n.length >= 2 && t.includes(n.slice(0, Math.min(6, n.length))));

  return {
    pass: structure.pass && realized,
    realized,
    skipped: false,
    failReasons: realized
      ? []
      : ['正文未体现 ExecutionPlan.informationGap 中的规划知识点'],
  };
}

/**
 * 校验是否严重偏离 Director 规划的情绪浪
 * Runtime 不决定下一 Beat；只报告 deviation
 *
 * @param {string} plannedEmotion Director Beat.targetEmotion
 * @param {string} [observedEmotion] 可选观察值（可空）
 * @param {string[]} [recentDelivered] 已交付情绪序列（若有）
 */
export function validateEmotionWaveAgainstPlan({
  plannedEmotion = '',
  observedEmotion = '',
  recentDelivered = [],
} = {}) {
  const planned = norm(plannedEmotion);
  const observed = norm(observedEmotion);
  const fails = [];

  if (planned && observed && planned !== observed) {
    // 允许同浪邻位；跨两个以上视为严重偏离
    const pi = EMOTION_WAVE.indexOf(planned);
    const oi = EMOTION_WAVE.indexOf(observed);
    if (pi >= 0 && oi >= 0 && Math.abs(pi - oi) > 1) {
      fails.push(`情绪浪严重偏离规划：计划 ${planned}，观察到 ${observed}`);
    }
  }

  // 结构禁则：连续平 / 一直高潮（对已交付序列；不是 Runtime 指派下一拍）
  const seq = [...(recentDelivered || []).map(norm).filter(Boolean)];
  if (observed) seq.push(observed);
  else if (planned) seq.push(planned);

  if (seq.length) {
    const streakCheck = validateEmotionWave(seq.slice(0, -1), seq[seq.length - 1]);
    if (!streakCheck.pass) fails.push(...streakCheck.failReasons);
  }

  return {
    pass: fails.length === 0,
    failReasons: [...new Set(fails)],
    planned: planned || null,
    observed: observed || null,
  };
}

/**
 * 结构禁则检测（平/高潮连发）
 * 注意：不返回「下一拍必须是 X」作为 Runtime 指令；suggested 仅供 Director 规划侧可选参考
 * （reader-emotion-engine 等 Director 层可调用；Narrative apply 路径不得用它改写计划）
 */
export function validateEmotionWave(recentEmotions = [], nextEmotion = '') {
  const recent = (recentEmotions || []).map(norm).filter(Boolean);
  const next = norm(nextEmotion);
  const fails = [];

  if (next) {
    const flatStreak = [...recent, next].reverse();
    let flat = 0;
    for (const e of flatStreak) {
      if (FLAT_EMOTIONS.has(e) || e === '平') flat += 1;
      else break;
    }
    if (flat >= 4) fails.push('情绪波浪禁止：连续平平平平');

    let peak = 0;
    for (const e of flatStreak) {
      if (PEAK_EMOTIONS.has(e)) peak += 1;
      else break;
    }
    if (peak >= 3) fails.push('情绪波浪禁止：一直高潮（Tension/Pressure/Shock 连续）');
  }

  return {
    pass: fails.length === 0,
    failReasons: fails,
    nextEmotion: next || null,
    /** @deprecated Director 规划参考；Narrative Runtime 不得用此决定下一 Beat */
    suggested: suggestNextEmotion(recent),
  };
}

/** Director 规划辅助（非 Runtime 控制流） */
export function suggestNextEmotion(recentEmotions = []) {
  const last = norm(recentEmotions[recentEmotions.length - 1]);
  const idx = EMOTION_WAVE.indexOf(last);
  if (idx < 0) return EMOTION_WAVE[0];
  if (PEAK_EMOTIONS.has(last)) {
    return last === 'Shock' ? 'Relief' : 'Hope';
  }
  if (FLAT_EMOTIONS.has(last)) return 'Tension';
  return EMOTION_WAVE[(idx + 1) % EMOTION_WAVE.length];
}

/**
 * ReaderState → Director 结构调整建议（数据，不是 Prompt 堆砌）
 */
export function directorHintsFromReaderState(readerState = null) {
  const rs = createReaderState(readerState || {});
  const reason = [];
  let reduceExposition = false;
  let increaseAction = false;
  let payoffPromiseEarly = false;

  if (rs.fatigue >= 65) {
    reduceExposition = true;
    increaseAction = true;
    reason.push('疲劳值过高 → 减少解释、增加动作');
  }
  if (rs.expectation <= 35) {
    payoffPromiseEarly = true;
    reason.push('期待值下降 → 优先兑现 Promise');
  }
  if (rs.curiosity >= 70 && rs.pressure < 40) {
    increaseAction = true;
    reason.push('好奇高、压力低 → 加压并推进动作');
  }
  if ((rs.hope ?? 40) <= 25) {
    payoffPromiseEarly = true;
    reason.push('Hope 过低 → 考虑短期兑现或释放');
  }

  return {
    reduceExposition,
    increaseAction,
    payoffPromiseEarly,
    reason,
    readerState: rs,
  };
}

export function updateReaderStateAfterBeat(prev, ctx = {}) {
  const rs = createReaderState(prev || {});
  const delta = ctx.delta || {};

  let {
    curiosity, pressure, expectation, fatigue, satisfaction, hope,
  } = rs;

  if (delta.stateChanged) {
    curiosity = clamp01(curiosity + 6);
    expectation = clamp01(expectation + 4);
  }
  if (delta.relationshipChanged || delta.choiceMade) {
    expectation = clamp01(expectation + 5);
    satisfaction = clamp01(satisfaction + 4);
    hope = clamp01(hope + 3);
  }
  if (delta.costPaid) {
    pressure = clamp01(pressure + 8);
    fatigue = clamp01(fatigue + 4);
    hope = clamp01(hope - 4);
  }
  if (delta.actionTaken) {
    fatigue = clamp01(fatigue - 2);
    satisfaction = clamp01(satisfaction + 2);
  }

  const score = Number(delta.score);
  if (Number.isFinite(score) && score < MOMENTUM_PASS_SCORE) {
    expectation = clamp01(expectation - 8);
    fatigue = clamp01(fatigue + 6);
    curiosity = clamp01(curiosity - 4);
  } else {
    fatigue = clamp01(fatigue + 2);
    satisfaction = clamp01(satisfaction + 3);
  }

  // 临时危险感：运行时从正文启发式推压力，不入库 NarrativeState.danger*
  const text = String(ctx.text || '');
  if (/警报|倒计时|追杀|爆炸|封锁/u.test(text)) {
    pressure = clamp01(pressure + 10);
  }

  const planned = norm(ctx.beat?.targetEmotion || '');
  if (planned === 'Relief' || planned === 'Hope') {
    pressure = clamp01(pressure - 12);
    hope = clamp01(hope + 8);
    fatigue = clamp01(fatigue - 4);
  }
  if (planned === 'Shock') {
    pressure = clamp01(pressure + 8);
    curiosity = clamp01(curiosity + 4);
  }

  return createReaderState({
    curiosity, pressure, expectation, fatigue, satisfaction, hope,
  });
}

/**
 * Beat 步进：读状态 → 算 Delta（丢弃中间 Story 快照）→ 更新瘦身 NarrativeState
 */
export function applyNarrativeBeat({
  narrativeState = null,
  text = '',
  beat = {},
  executionPlan = null,
  v2 = null,
  recentDeliveredEmotions = [],
} = {}) {
  const before = narrativeState?.version === 'narrative-state-1'
    ? createNarrativeState(narrativeState)
    : seedNarrativeStateFromPlan(executionPlan || {}, narrativeState);

  const momentum = evaluateStoryMomentum({ text, beat, v2, narrativeState: before });
  const after = updateNarrativeStateAfterBeat(before, {
    text,
    beat,
    executionPlan,
    v2,
    momentum: { ...momentum.delta, score: momentum.score, pass: momentum.pass, zero: momentum.zero },
  });

  const gapCheck = validateInformationGapRealization(
    beat.informationGap || executionPlan?.informationGap || null,
    text,
  );

  const waveCheck = validateEmotionWaveAgainstPlan({
    plannedEmotion: beat.targetEmotion || beat.beatPlan?.targetEmotion || '',
    recentDelivered: recentDeliveredEmotions,
  });

  const softWarnings = [
    ...(gapCheck.pass || gapCheck.skipped ? [] : gapCheck.failReasons),
    ...(waveCheck.pass ? [] : waveCheck.failReasons.map((r) => `[wave] ${r}`)),
  ];

  return {
    pass: momentum.pass,
    before,
    after,
    delta: momentum.delta,
    score: momentum.score,
    momentum,
    informationGapCheck: gapCheck,
    emotionWaveCheck: waveCheck,
    readerState: after.readerState,
    directorHints: directorHintsFromReaderState(after.readerState),
    failReasons: momentum.failReasons,
    softWarnings,
    rewriteHint: momentum.rewriteHint,
  };
}

export const NarrativeRuntime = {
  createNarrativeState,
  createReaderState,
  createMomentumState,
  seedNarrativeStateFromPlan,
  detectNarrativeSignals,
  computeMomentumDelta,
  scoreMomentumDelta,
  updateNarrativeStateAfterBeat,
  evaluateStoryMomentum,
  assertInformationGapMeaningful,
  validateInformationGapRealization,
  validateEmotionWaveAgainstPlan,
  validateEmotionWave,
  suggestNextEmotion,
  directorHintsFromReaderState,
  updateReaderStateAfterBeat,
  applyNarrativeBeat,
  EMOTION_WAVE,
  MOMENTUM_WEIGHTS,
  MOMENTUM_PASS_SCORE,
  ZERO_MOMENTUM_REWRITE,
};

export { ZERO_MOMENTUM_REWRITE };
