/**
 * Reward Engine v2 — Promise → Payoff
 * 奖励不是增加信息，是兑现读者期待
 * 没有对应 Promise 的 Reward 不允许出现
 */

const PAYOFF_SIGNALS = /终于|活下|成功|兑现|做到了|开枪|突破|赢|拿到|答应|反击|逆转|扳回|没死|安全了|保住|完成/u;

/** Promise 优先级分类 */
export const PROMISE_TYPES = {
  main: { type: 'main', importance: 95, horizon: 20, label: '主线', readerExpectation: 90 },
  medium: { type: 'medium', importance: 70, horizon: 8, label: '中期', readerExpectation: 75 },
  small: { type: 'small', importance: 50, horizon: 2, label: '短期', readerExpectation: 85 },
};

function normText(v = '') {
  return String(v || '').trim();
}

/**
 * 从 Story Memory / 前序 Scene 收集可兑现的 Promise
 */
export function collectOpenPromises({
  storyMemory = {},
  storyMemoryMetrics = {},
  intent = {},
  prevScenes = [],
} = {}) {
  const items = [];

  for (const p of storyMemory.promise || []) {
    if (p.status !== 'fulfilled' && normText(p.text)) {
      items.push({ id: p.id, text: p.text, source: 'promise', category: 'promise' });
    }
  }
  for (const f of storyMemory.foreshadow || []) {
    if (f.status !== 'resolved' && normText(f.text)) {
      items.push({ id: f.id, text: f.text, source: 'foreshadow', category: 'foreshadow' });
    }
  }
  for (const f of storyMemoryMetrics.openForeshadow || []) {
    if (normText(f.text) && !items.some((i) => i.text === f.text)) {
      items.push({ id: f.id || `fs_${items.length}`, text: f.text, source: 'foreshadow', category: 'foreshadow' });
    }
  }
  for (const e of storyMemory.readerExpectation || []) {
    if (normText(e.text)) {
      items.push({ id: e.id, text: e.text, source: 'readerExpectation', category: 'readerExpectation' });
    }
  }

  for (const s of prevScenes || []) {
    const planted = s.executionPlan?.hookOutput?.plantedPromise
      || s.scenePlan?.hookOutput?.plantedPromise
      || s.executionPlan?.hookOutput?.actionDeadline;
    if (planted && normText(planted)) {
      items.push({
        id: `scene_${s.index}_hook`,
        text: planted,
        source: 'priorHook',
        category: 'actionHook',
        sceneIndex: s.index,
      });
    }
    const pending = s.scenePlan?.reward?.promise && s.scenePlan?.reward?.status !== 'fulfilled'
      ? s.scenePlan.reward.promise
      : null;
    if (pending) {
      items.push({ id: `scene_${s.index}_promise`, text: pending, source: 'priorScene', category: 'promise' });
    }
  }

  const dnaPromises = intent._storyDna?.promises || intent.storyDna?.promises || [];
  for (const p of dnaPromises) {
    const text = normText(p.text || p);
    if (text && !p.fulfilled && !items.some((i) => i.text === text)) {
      items.push({ id: p.id || `dna_${items.length}`, text, source: 'storyDna', category: 'promise' });
    }
  }

  return items.map((item) => enrichPromise(item, { chapter: intent._chapter ?? intent.chapter }));
}

/**
 * Promise 分类与优先级标注
 */
export function classifyPromise(text = '', {
  chapter = 1,
  source = '',
  sceneIndex = 1,
} = {}) {
  const t = normText(text);
  if (/世界重置|为什么世界|文明|宇宙|真相|系统来源|四点刷新|循环机制/u.test(t)) {
    return { ...PROMISE_TYPES.main, expectedChapter: chapter + PROMISE_TYPES.main.horizon };
  }
  if (/身份|隐藏|背叛|同盟|苏晚|信任|秘密身份/u.test(t)) {
    return { ...PROMISE_TYPES.medium, expectedChapter: chapter + PROMISE_TYPES.medium.horizon };
  }
  if (/今晚|天亮|妹妹|血字|三十秒|倒计时|活|死|枪/u.test(t) || source === 'actionHook' || source === 'priorHook') {
    return { ...PROMISE_TYPES.small, expectedChapter: chapter + PROMISE_TYPES.small.horizon };
  }
  if (source === 'foreshadow' || source === 'storyDna') {
    return { ...PROMISE_TYPES.medium, expectedChapter: chapter + 5 };
  }
  return { ...PROMISE_TYPES.small, expectedChapter: chapter + 2 };
}

export function enrichPromise(item = {}, { chapter = 1 } = {}) {
  const meta = classifyPromise(item.text, {
    chapter,
    source: item.source,
    sceneIndex: item.sceneIndex,
  });
  return {
    ...item,
    type: meta.type,
    importance: meta.importance,
    expectedChapter: item.expectedChapter ?? meta.expectedChapter,
    readerExpectation: meta.readerExpectation,
    promiseTypeLabel: PROMISE_TYPES[meta.type]?.label || meta.type,
  };
}

function selectPromiseForScene(openPromises = [], { chapter = 1, sceneIndex = 1, sceneCount = 4 } = {}) {
  if (!openPromises.length) return null;

  const enriched = openPromises.map((p) => enrichPromise(p, { chapter }));
  const isLastScene = sceneIndex >= sceneCount;

  const dueSoon = enriched.filter((p) => (p.expectedChapter ?? 999) <= chapter + 1);
  if (dueSoon.length) {
    return dueSoon.sort((a, b) => (a.importance ?? 0) - (b.importance ?? 0))[0];
  }

  if (isLastScene) {
    const small = enriched.filter((p) => p.type === 'small');
    if (small.length) return small[0];
  }

  const notMainEarly = chapter <= 3
    ? enriched.filter((p) => p.type !== 'main')
    : enriched;
  const pool = notMainEarly.length ? notMainEarly : enriched;
  return pool.sort((a, b) => {
    const urgencyA = (a.expectedChapter ?? 99) - chapter;
    const urgencyB = (b.expectedChapter ?? 99) - chapter;
    if (urgencyA !== urgencyB) return urgencyA - urgencyB;
    return (b.readerExpectation ?? 0) - (a.readerExpectation ?? 0);
  })[0];
}

function inferPayoffFromPromise(promiseText = '', plan = {}, scene = {}) {
  const p = normText(promiseText);
  if (/会死|要死|死亡|活不/u.test(p)) {
    return normText(scene.payoff || plan.payoff) || '妹妹活下来了';
  }
  if (/信用|档案|清零/u.test(p)) {
    return normText(scene.payoff || plan.payoff) || '成功保住信用档案';
  }
  if (/枪|修好了|武器/u.test(p)) {
    return normText(scene.payoff || plan.payoff) || '终于开枪了';
  }
  if (/来不及|倒计时|三十秒|今晚/u.test(p)) {
    return normText(scene.payoff || plan.payoff) || `在时限前完成行动 — ${plan.goal?.slice(0, 40) || '目标推进'}`;
  }
  const seed = plan.consequence || plan.newInformation || scene.newInformation || '';
  if (seed && !/调查|发现异常/u.test(seed)) {
    return `兑现期待：${seed.slice(0, 60)}`;
  }
  return normText(scene.payoff || plan.payoff) || `读者期待兑现 — ${p.slice(0, 50)}`;
}

/**
 * 为 Scene 规划 Promise → Payoff 奖励
 */
export function buildSceneReward({
  scene = {},
  intent = {},
  plan = {},
  sceneIndex = 1,
  storyMemory = {},
  storyMemoryMetrics = {},
  prevScenes = [],
} = {}) {
  const prevList = prevScenes.length
    ? prevScenes
    : (intent.scenes || []).filter((s) => (s.index ?? 0) < sceneIndex);

  if (scene.reward?.promise && scene.reward?.payoff) {
    return normalizeReward({
      ...scene.reward,
      valid: true,
      deliveryBeat: scene.reward.deliveryBeat || 'newInformation',
    });
  }
  if (scene.promise && scene.payoff) {
    return normalizeReward({
      promise: scene.promise,
      payoff: scene.payoff,
      promiseId: scene.promiseId || 'scene_explicit',
      promiseSource: 'scene',
      valid: true,
      deliveryBeat: 'newInformation',
    });
  }

  const openPromises = collectOpenPromises({
    storyMemory,
    storyMemoryMetrics,
    intent,
    prevScenes: prevList,
  });

  const chapter = intent._chapter ?? intent.chapter ?? 1;
  const sceneCount = intent.scenes?.length || intent.sceneCount || 4;
  let selected = selectPromiseForScene(openPromises, { chapter, sceneIndex, sceneCount });

  if (!selected && scene.promise) {
    selected = { id: 'scene_explicit', text: normText(scene.promise), source: 'scene', category: 'promise' };
  }
  if (!selected && plan.cliffhanger) {
    const cliff = normText(plan.cliffhanger);
    if (/否则|就会|来不及|今晚|三十秒|必须/u.test(cliff)) {
      selected = { id: 'scene_cliff', text: cliff, source: 'scenePlan', category: 'actionHook' };
    }
  }

  if (!selected) {
    return {
      valid: false,
      requiresPromise: true,
      promise: null,
      payoff: null,
      promiseId: null,
      promiseSource: null,
      description: '⚠ 本 Scene 无可用 Promise — Writer 须先承接 Story Memory 伏笔/前序 Hook 再写 Payoff',
      deliveryBeat: 'newInformation',
      rule: '没有对应 Promise 的 Reward 不允许出现',
    };
  }

  const payoff = inferPayoffFromPromise(selected.text, plan, scene);
  const meta = enrichPromise(selected, { chapter });

  return normalizeReward({
    valid: true,
    promiseId: selected.id,
    promise: selected.text,
    payoff,
    promiseSource: selected.source,
    promiseCategory: selected.category,
    promiseType: meta.type,
    promiseImportance: meta.importance,
    expectedChapter: meta.expectedChapter,
    readerExpectation: meta.readerExpectation,
    foreshadowId: selected.category === 'foreshadow' ? selected.id : null,
    description: payoff,
    deliveryBeat: 'newInformation',
    rule: 'Reward = 兑现 Promise，满足读者期待，不是新增信息',
  });
}

function normalizeReward(r = {}) {
  return {
    valid: r.valid !== false,
    requiresPromise: Boolean(r.requiresPromise),
    promiseId: r.promiseId || null,
    promise: r.promise || null,
    payoff: r.payoff || r.description || null,
    promiseSource: r.promiseSource || null,
    promiseCategory: r.promiseCategory || null,
    promiseType: r.promiseType || null,
    promiseImportance: r.promiseImportance ?? null,
    expectedChapter: r.expectedChapter ?? null,
    readerExpectation: r.readerExpectation ?? null,
    foreshadowId: r.foreshadowId || null,
    description: r.payoff || r.description || '',
    deliveryBeat: r.deliveryBeat || 'newInformation',
    rule: r.rule || 'Promise → Payoff',
    status: r.status || 'pending',
  };
}

export function detectRewardDelivery(text = '', reward = {}) {
  if (!reward?.valid || !reward?.promise) {
    return { delivered: false, valid: false, reason: 'no_promise_bound' };
  }

  const corpus = String(text || '');
  const mid = corpus.slice(Math.floor(corpus.length * 0.2), Math.floor(corpus.length * 0.9));
  const promiseHint = normText(reward.promise).slice(0, 12);
  const payoffHint = normText(reward.payoff).slice(0, 12);

  const payoffHit = PAYOFF_SIGNALS.test(mid)
    || (payoffHint.length > 4 && mid.includes(payoffHint.slice(0, 6)));
  const promiseEcho = promiseHint.length > 3 && corpus.includes(promiseHint.slice(0, 4));

  return {
    delivered: payoffHit,
    valid: reward.valid,
    promise: reward.promise,
    payoff: reward.payoff,
    confidence: payoffHit ? (promiseEcho ? 90 : 70) : 0,
    signals: { payoffHit, promiseEcho },
  };
}

export function formatRewardBrief(reward = {}) {
  if (!reward?.promise && !reward?.requiresPromise) return '';

  if (reward.requiresPromise || !reward.valid) {
    return [
      '### Reward Engine · Promise → Payoff',
      '⚠️ **本 Scene 尚无绑定 Promise** — 须从 Story Memory / 前序 Hook 承接后再写 Payoff',
      '- **铁律**：没有对应 Promise 的 Reward 不允许出现',
    ].join('\n');
  }

  return [
    '### Reward Engine · Promise → Payoff（兑现期待，不是加信息）',
    '**节奏**：Tension → **Payoff（兑现 Promise）** → New Threat（Action Hook）',
    `- **Promise**：${reward.promise}`,
    reward.promiseType ? `- **类型**：${reward.promiseType}（重要度 ${reward.promiseImportance} · 预期第 ${reward.expectedChapter} 章）` : '',
    `- **Payoff**：${reward.payoff}`,
    reward.promiseSource ? `- **来源**：${reward.promiseSource} · ${reward.promiseCategory || ''}` : '',
    `- **落地 Beat**：${reward.deliveryBeat || 'newInformation'} — 须让读者感到「终于等到了」`,
    '- **禁止**：无 Promise 的「奖励」；禁止只给新信息不兑现期待',
  ].filter(Boolean).join('\n');
}

export function formatRewardBlock(reward = {}) {
  if (reward.requiresPromise || (!reward.promise && !reward.valid)) {
    return [
      '### Scene Reward · Promise → Payoff',
      '⚠️ **无绑定 Promise** — 禁止编造无根奖励；须承接 Story Memory / 前序 Hook',
      '- 从 `Story Memory` 未回收伏笔 / 开放 Promise / 上 Scene Action Hook 中选择一项兑现',
    ].join('\n');
  }
  if (!reward?.promise) return '';

  return [
    '### Scene Reward · Promise → Payoff（本 Beat 须落地）',
    '```json',
    JSON.stringify({
      promise: reward.promise || '',
      payoff: reward.payoff || '',
      promiseId: reward.promiseId || '',
      promiseSource: reward.promiseSource || '',
    }, null, 2),
    '```',
    `- **落地位置**：${reward.deliveryBeat || 'newInformation'} Beat`,
    `- **须兑现**：${reward.payoff}`,
    '- Payoff 须满足读者期待，用动作/结果落地，禁止心理总结',
    '- Payoff 后 Action Hook 须升级威胁，形成 Tension → Payoff → New Threat',
  ].join('\n');
}

export function formatTensionRewardThreatBlock(reward = {}) {
  if (!reward?.promise && !reward?.requiresPromise) return '';
  const payoffLine = reward.payoff
    ? `2. **Payoff**：${reward.payoff}（兑现 — ${reward.promise?.slice(0, 40) || ''}）`
    : '2. **Payoff**：⚠ 须绑定 Promise 后再写';
  return [
    '### Scene 心理节奏 · Tension → Payoff → Action Hook',
    '1. **Tension**：Goal / Obstacle / Choice / Consequence — 拉高紧张与代价',
    payoffLine,
    '3. **Action Hook**：逼 POV 必须行动 — 新目标/新行动/新倒计时，禁止只发现秘密',
  ].join('\n');
}

/** @deprecated v1 分类保留别名，供 Preference Learning 兼容 */
export const REWARD_TYPES = [{ type: 'Payoff', name: '期待兑现', description: 'Promise → Payoff' }];

export function getRewardTypeById() {
  return REWARD_TYPES[0];
}
