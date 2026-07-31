/**
 * Promise Lifecycle + Promise Manager
 *
 * 生命周期（保留）：Promise → Escalation → Payoff → New Promise
 * Manager（新增）：维护伏笔 registry，供 Director 优先兑现超时 Promise
 *
 * NarrativePromise：
 *   id · introducedBeat · expectedPayoff · paid · text?
 */

import { enrichPromise } from './reward-engine.js';

export const PROMISE_STAGES = {
  promise: { id: 'promise', label: '埋伏笔', next: 'escalation' },
  escalation: { id: 'escalation', label: '升级加压', next: 'payoff' },
  payoff: { id: 'payoff', label: '兑现', next: 'new_promise' },
  new_promise: { id: 'new_promise', label: '新期待', next: 'promise' },
};

/** 超过该 Beat/Scene 跨度未兑现 → overdue（优先安排 Payoff） */
export const DEFAULT_PROMISE_OVERDUE_BEATS = Number(process.env.INKOS_PROMISE_OVERDUE_BEATS || 6);
export const DEFAULT_PROMISE_OVERDUE_SCENES = Number(process.env.INKOS_PROMISE_OVERDUE_SCENES || 2);

function norm(v = '') {
  return String(v || '').trim();
}

/**
 * @typedef {object} NarrativePromise
 * @property {string} id
 * @property {string} introducedBeat
 * @property {string} expectedPayoff
 * @property {boolean} paid
 * @property {string} [text]
 * @property {number} [introducedChapter]
 * @property {number} [introducedScene]
 * @property {number} [introducedBeatOrder]
 * @property {string|null} [paidAtBeat]
 * @property {string} [source]
 * @property {string} [type]
 * @property {number} [importance]
 */

/**
 * @param {Partial<NarrativePromise>} raw
 * @returns {NarrativePromise}
 */
export function normalizeNarrativePromise(raw = {}) {
  const id = norm(raw.id) || `promise_${Date.now()}`;
  return {
    id,
    text: norm(raw.text) || '',
    introducedBeat: norm(raw.introducedBeat) || 'unknown',
    expectedPayoff: norm(raw.expectedPayoff)
      || (raw.expectedChapter != null ? `ch${raw.expectedChapter}` : '')
      || 'soon',
    paid: Boolean(raw.paid),
    introducedChapter: Number.isFinite(raw.introducedChapter) ? Number(raw.introducedChapter) : null,
    introducedScene: Number.isFinite(raw.introducedScene) ? Number(raw.introducedScene) : null,
    introducedBeatOrder: Number.isFinite(raw.introducedBeatOrder)
      ? Number(raw.introducedBeatOrder)
      : null,
    paidAtBeat: raw.paidAtBeat ? norm(raw.paidAtBeat) : null,
    source: norm(raw.source) || 'runtime',
    type: raw.type || null,
    importance: Number.isFinite(raw.importance) ? Number(raw.importance) : null,
    expectedChapter: raw.expectedChapter ?? null,
  };
}

/**
 * 创建 / 恢复 Promise Manager（内存 registry，不落盘）
 * @param {{ promises?: Partial<NarrativePromise>[] }} [seed]
 */
export function createPromiseManager(seed = {}) {
  const promises = Array.isArray(seed.promises)
    ? seed.promises.map((p) => normalizeNarrativePromise(p))
    : [];
  return {
    version: 'promise-manager-1',
    promises,
    updatedAt: new Date().toISOString(),
  };
}

export function listActivePromises(manager) {
  const m = ensureManager(manager);
  return m.promises.filter((p) => !p.paid && p.text);
}

export function listPaidPromises(manager) {
  const m = ensureManager(manager);
  return m.promises.filter((p) => p.paid);
}

export function getPromiseById(manager, id) {
  const m = ensureManager(manager);
  return m.promises.find((p) => p.id === id) || null;
}

/**
 * 挖坑：登记新 Promise
 */
export function introducePromise(manager, input = {}) {
  const m = ensureManager(manager);
  const enriched = input.text
    ? enrichPromise({
      id: input.id,
      text: input.text,
      source: input.source,
      sceneIndex: input.introducedScene ?? input.sceneIndex,
      expectedChapter: input.expectedChapter,
    }, { chapter: input.introducedChapter ?? input.chapter ?? 1 })
    : input;

  const promise = normalizeNarrativePromise({
    ...enriched,
    introducedBeat: input.introducedBeat
      || (input.beatOrder != null ? `beat_${input.beatOrder}` : null)
      || (input.sceneIndex != null ? `scene_${input.sceneIndex}` : 'intro'),
    expectedPayoff: input.expectedPayoff
      || (enriched.expectedChapter != null ? `ch${enriched.expectedChapter}` : null)
      || (input.sceneIndex != null ? `scene_${Number(input.sceneIndex) + 1}` : 'soon'),
    paid: false,
    introducedChapter: input.introducedChapter ?? input.chapter ?? null,
    introducedScene: input.introducedScene ?? input.sceneIndex ?? null,
    introducedBeatOrder: input.introducedBeatOrder ?? input.beatOrder ?? null,
  });

  const idx = m.promises.findIndex((p) => p.id === promise.id);
  if (idx >= 0) {
    if (!m.promises[idx].paid) {
      m.promises[idx] = { ...m.promises[idx], ...promise, paid: false };
    }
  } else {
    m.promises.push(promise);
  }
  m.updatedAt = new Date().toISOString();
  return { manager: m, promise };
}

/**
 * 填坑：标记兑现
 */
export function markPromisePaid(manager, promiseId, { paidAtBeat = null } = {}) {
  const m = ensureManager(manager);
  const id = norm(promiseId);
  const hit = m.promises.find((p) => p.id === id);
  if (!hit) {
    return { manager: m, promise: null, ok: false };
  }
  hit.paid = true;
  hit.paidAtBeat = paidAtBeat ? norm(paidAtBeat) : hit.paidAtBeat;
  m.updatedAt = new Date().toISOString();
  return { manager: m, promise: hit, ok: true };
}

/**
 * 挖坑未填：太久未兑现的 Promise（Director 优先读）
 *
 * @param {object} manager
 * @param {{ chapter?: number, sceneIndex?: number, beatOrder?: number, overdueBeats?: number, overdueScenes?: number }} [ctx]
 */
export function listOverduePromises(manager, ctx = {}) {
  const m = ensureManager(manager);
  const chapter = Number(ctx.chapter) || 1;
  const sceneIndex = Number(ctx.sceneIndex) || 1;
  const beatOrder = Number.isFinite(ctx.beatOrder) ? Number(ctx.beatOrder) : null;
  const overdueBeats = ctx.overdueBeats ?? DEFAULT_PROMISE_OVERDUE_BEATS;
  const overdueScenes = ctx.overdueScenes ?? DEFAULT_PROMISE_OVERDUE_SCENES;

  return listActivePromises(m)
    .map((p) => {
      const sceneGap = p.introducedScene != null
        ? (chapter - (p.introducedChapter || chapter)) * 10 + (sceneIndex - p.introducedScene)
        : 0;
      const beatGap = p.introducedBeatOrder != null && beatOrder != null
        ? beatOrder - p.introducedBeatOrder
        : null;
      const chapterDue = p.expectedChapter != null && chapter >= Number(p.expectedChapter);
      const overdueByScene = sceneGap >= overdueScenes;
      const overdueByBeat = beatGap != null && beatGap >= overdueBeats;
      const overdue = chapterDue || overdueByScene || overdueByBeat;
      return {
        ...p,
        sceneGap,
        beatGap,
        overdue,
        urgency: (p.importance || 50)
          + (overdue ? 40 : 0)
          + (chapterDue ? 20 : 0)
          + Math.min(30, Math.max(0, sceneGap) * 5),
      };
    })
    .filter((p) => p.overdue)
    .sort((a, b) => b.urgency - a.urgency);
}

/**
 * Director 下一 Beat / Scene 应优先兑现的 promiseId
 */
export function pickPromisePointer(manager, ctx = {}) {
  const overdue = listOverduePromises(manager, ctx);
  if (overdue.length) {
    return {
      promisePointer: overdue[0].id,
      reason: 'overdue',
      promise: overdue[0],
      overdueCount: overdue.length,
    };
  }

  const active = listActivePromises(manager)
    .map((p) => enrichPromise(p, { chapter: ctx.chapter || 1 }))
    .sort((a, b) => {
      const dueA = (a.expectedChapter ?? 99) - (ctx.chapter || 1);
      const dueB = (b.expectedChapter ?? 99) - (ctx.chapter || 1);
      if (dueA !== dueB) return dueA - dueB;
      return (b.importance ?? 0) - (a.importance ?? 0);
    });

  if (!active.length) {
    return { promisePointer: null, reason: 'none', promise: null, overdueCount: 0 };
  }

  return {
    promisePointer: active[0].id,
    reason: 'soonest',
    promise: active[0],
    overdueCount: 0,
  };
}

/**
 * 将 Scene Lifecycle 结果同步进 Manager（挖坑 / 填坑）
 */
export function syncLifecycleToManager(manager, lifecycle = {}, {
  chapter = 1,
  sceneIndex = 1,
  beatId = null,
} = {}) {
  let m = ensureManager(manager);
  const introducedBeat = beatId || `scene_${sceneIndex}`;

  if (lifecycle.payoff?.promise || lifecycle.activePromise?.id) {
    const payId = lifecycle.activePromise?.id
      || `ch${chapter}_s${sceneIndex}_pay`;
    if (lifecycle.payoff?.payoff) {
      const found = m.promises.find((p) => p.id === payId)
        || m.promises.find((p) => !p.paid && p.text && p.text === lifecycle.payoff.promise);
      if (found) {
        ({ manager: m } = markPromisePaid(m, found.id, { paidAtBeat: introducedBeat }));
      } else if (lifecycle.activePromise?.text || lifecycle.payoff?.promise) {
        ({ manager: m } = introducePromise(m, {
          id: payId,
          text: lifecycle.activePromise?.text || lifecycle.payoff.promise,
          introducedBeat,
          expectedPayoff: introducedBeat,
          chapter,
          sceneIndex,
          source: 'payoff-sync',
        }));
        ({ manager: m } = markPromisePaid(m, payId, { paidAtBeat: introducedBeat }));
      }
    }
  }

  if (lifecycle.newPromise?.text) {
    ({ manager: m } = introducePromise(m, {
      id: lifecycle.newPromise.id || `ch${chapter}_s${sceneIndex}_new`,
      text: lifecycle.newPromise.text,
      introducedBeat,
      expectedPayoff: lifecycle.newPromise.expectedChapter != null
        ? `ch${lifecycle.newPromise.expectedChapter}`
        : `scene_${sceneIndex + 1}`,
      expectedChapter: lifecycle.newPromise.expectedChapter,
      chapter,
      sceneIndex,
      source: lifecycle.newPromise.source || 'actionHook',
      type: lifecycle.newPromise.type,
      importance: lifecycle.newPromise.importance,
    }));
  } else if (lifecycle.activePromise?.text && !lifecycle.payoff?.payoff) {
    ({ manager: m } = introducePromise(m, {
      id: lifecycle.activePromise.id,
      text: lifecycle.activePromise.text,
      introducedBeat,
      expectedChapter: lifecycle.activePromise.expectedChapter,
      chapter,
      sceneIndex,
      source: lifecycle.activePromise.source,
      type: lifecycle.activePromise.type,
      importance: lifecycle.activePromise.importance,
    }));
  }

  return m;
}

/**
 * Director 可读摘要：超时优先兑现
 */
export function getDirectorPromiseBrief(manager, ctx = {}) {
  const pick = pickPromisePointer(manager, ctx);
  const overdue = listOverduePromises(manager, ctx);
  const active = listActivePromises(manager);
  return {
    promisePointer: pick.promisePointer,
    pointerReason: pick.reason,
    overdueCount: overdue.length,
    activeCount: active.length,
    overdue: overdue.slice(0, 5).map((p) => ({
      id: p.id,
      text: (p.text || '').slice(0, 40),
      expectedPayoff: p.expectedPayoff,
      sceneGap: p.sceneGap,
    })),
    rule: '避免挖坑不填：优先安排 overdue Promise 的 Payoff',
  };
}

export function formatPromiseManagerBlock(manager, ctx = {}) {
  const brief = getDirectorPromiseBrief(manager, ctx);
  if (!brief.activeCount && !brief.overdueCount) return '';
  const lines = [
    '### Promise Manager · 伏笔账本',
    `- **未兑现**：${brief.activeCount} · **超时**：${brief.overdueCount}`,
  ];
  if (brief.promisePointer) {
    lines.push(`- **本拍优先兑现（promisePointer）**：${brief.promisePointer}（${brief.pointerReason}）`);
  }
  for (const p of brief.overdue) {
    lines.push(`  · overdue「${p.text}」· 期望 ${p.expectedPayoff} · gap=${p.sceneGap}`);
  }
  lines.push(`- **铁律**：${brief.rule}`);
  return lines.join('\n');
}

function ensureManager(manager) {
  if (manager?.version === 'promise-manager-1' && Array.isArray(manager.promises)) {
    return manager;
  }
  return createPromiseManager(manager || {});
}

/**
 * Scene 级 Promise 生命周期（向后兼容；可选 promiseManager）
 */
export function buildScenePromiseLifecycle({
  reward = {},
  hookOutput = {},
  plan = {},
  scene = {},
  chapter = 1,
  sceneIndex = 1,
  sceneCount = 4,
  prevScenes = [],
  promiseManager = null,
  beatId = null,
  attachRegistry = false,
} = {}) {
  const prevHooks = (prevScenes || [])
    .map((s) => s.executionPlan?.hookOutput?.plantedPromise || s.scenePlan?.hookOutput?.plantedPromise)
    .filter(Boolean);

  const activePromise = reward?.valid && reward?.promise
    ? enrichPromise({
      id: reward.promiseId,
      text: reward.promise,
      source: reward.promiseSource,
    }, { chapter })
    : null;

  const escalation = activePromise && sceneIndex > 1
    ? {
      promise: reward.promise,
      escalation: plan.consequence || plan.obstacle || '代价逼近，期待更紧迫',
      stage: 'escalation',
    }
    : null;

  const payoff = reward?.valid
    ? {
      promise: reward.promise,
      payoff: reward.payoff,
      stage: 'payoff',
      promiseType: reward.promiseType,
      importance: reward.promiseImportance,
    }
    : null;

  const newPromiseText = norm(
    hookOutput?.plantedPromise
    || hookOutput?.actionDeadline
    || plan.cliffhanger
    || scene.cliffhanger,
  );

  const newPromise = newPromiseText
    ? enrichPromise({
      id: `ch${chapter}_s${sceneIndex}_new`,
      text: newPromiseText,
      source: 'actionHook',
      sceneIndex,
    }, { chapter })
    : null;

  const isLastScene = sceneIndex >= sceneCount;
  const chapterRule = isLastScene
    ? '章末：须完成 Payoff + 种下章尾 New Promise（逼翻页）'
    : '本 Scene：推进 Promise 链 — Escalation 或 Payoff';

  const lifecycle = {
    version: 'promise-lifecycle-1',
    chapter,
    sceneIndex,
    activePromise,
    escalation,
    payoff,
    newPromise,
    prevPromiseCount: prevHooks.length,
    stage: payoff ? 'payoff' : (escalation ? 'escalation' : (newPromise ? 'new_promise' : 'promise')),
    chain: ['promise', 'escalation', 'payoff', 'new_promise'],
    chapterRule,
    rule: '每章：兑现旧 Promise + 制造新 Promise — 持续追更',
    valid: Boolean(payoff?.payoff || newPromise?.text),
    promisePointer: null,
    overduePromises: [],
  };

  // Manager：同步账本 + 给出优先兑现指针
  let manager = promiseManager ? ensureManager(promiseManager) : createPromiseManager();
  // 从 prevScenes 的 hook 补登记（跨 Scene 账本）
  for (const s of prevScenes || []) {
    const planted = s.executionPlan?.hookOutput?.plantedPromise
      || s.scenePlan?.hookOutput?.plantedPromise;
    if (!planted) continue;
    const sid = `scene_${s.index}_hook`;
    if (!getPromiseById(manager, sid)) {
      ({ manager } = introducePromise(manager, {
        id: sid,
        text: planted,
        introducedBeat: `scene_${s.index}`,
        sceneIndex: s.index,
        chapter: s.chapter || chapter,
        source: 'priorHook',
      }));
    }
  }

  manager = syncLifecycleToManager(manager, lifecycle, {
    chapter,
    sceneIndex,
    beatId: beatId || `scene_${sceneIndex}`,
  });

  const pick = pickPromisePointer(manager, { chapter, sceneIndex });
  lifecycle.promisePointer = pick.promisePointer;
  lifecycle.overduePromises = listOverduePromises(manager, { chapter, sceneIndex }).slice(0, 5);
  lifecycle.promiseManager = {
    version: manager.version,
    activeCount: listActivePromises(manager).length,
    overdueCount: lifecycle.overduePromises.length,
    promisePointer: lifecycle.promisePointer,
    pointerReason: pick.reason,
  };
  // 完整 registry 默认不挂到 ExecutionPlan，避免膨胀；需要时用第三个参数或 PromiseManager.sync
  if (attachRegistry) {
    lifecycle._promiseRegistry = { version: manager.version, promises: manager.promises };
  }

  return lifecycle;
}

export function formatPromiseLifecycleBlock(lifecycle = {}) {
  if (!lifecycle?.activePromise && !lifecycle?.newPromise && !lifecycle?.promisePointer) return '';

  const lines = [
    '### Promise Lifecycle · 期待链（P2）',
    '**链式**：Promise → Escalation → Payoff → New Promise',
    '',
  ];

  if (lifecycle.payoff?.promise) {
    lines.push(
      `- **Payoff（兑现）**：「${lifecycle.payoff.promise.slice(0, 35)}」→「${lifecycle.payoff.payoff?.slice(0, 35) || '—'}」`,
      lifecycle.payoff.promiseType
        ? `  · 类型 ${lifecycle.payoff.promiseType} · 重要度 ${lifecycle.payoff.importance}`
        : '',
    );
  }
  if (lifecycle.escalation) {
    lines.push(`- **Escalation**：${lifecycle.escalation.escalation?.slice(0, 50)}`);
  }
  if (lifecycle.newPromise?.text) {
    lines.push(
      `- **New Promise（新期待）**：${lifecycle.newPromise.text.slice(0, 50)}`,
      `  · 预期第 ${lifecycle.newPromise.expectedChapter} 章前后兑现`,
    );
  }
  if (lifecycle.promisePointer) {
    lines.push(`- **promisePointer（优先兑现）**：${lifecycle.promisePointer}`);
  }
  if (lifecycle.overduePromises?.length) {
    lines.push(`- **超时未兑现**：${lifecycle.overduePromises.length} 条 — Director 须优先安排 Payoff`);
  }

  lines.push(
    '',
    `- **本章规则**：${lifecycle.chapterRule}`,
    '- **铁律**：每章须兑现至少 1 个旧 Promise，并种下 1 个新 Promise',
    '- **铁律**：避免挖坑不填 — 超时 Promise 优先兑现',
  );

  return lines.filter(Boolean).join('\n');
}

export function formatPromiseLifecycleBrief(lifecycle = {}) {
  if (!lifecycle?.payoff && !lifecycle?.newPromise && !lifecycle?.promisePointer) return '';
  const parts = [];
  if (lifecycle.payoff?.payoff) parts.push(`兑现 ${lifecycle.payoff.payoff.slice(0, 25)}`);
  if (lifecycle.newPromise?.text) parts.push(`新期待 ${lifecycle.newPromise.text.slice(0, 25)}`);
  if (lifecycle.promisePointer) parts.push(`优先 ${lifecycle.promisePointer}`);
  return `Promise 链：${parts.join(' · ')}`;
}

/**
 * 章级 Promise 管理 — 每章兑现旧 + 制造新（兼容；可注入 manager）
 */
export function buildChapterPromisePlan({
  intent = {},
  chapter = 1,
  sceneCount = 4,
  storyDna = {},
  promiseManager = null,
} = {}) {
  const scenes = intent.scenes || [];
  const lastScene = scenes.find((s) => (s.index ?? sceneCount) === sceneCount) || {};
  const plan = lastScene.scenePlan || lastScene;

  let manager = promiseManager ? ensureManager(promiseManager) : createPromiseManager();
  for (const s of scenes) {
    const planted = s.executionPlan?.hookOutput?.plantedPromise
      || s.scenePlan?.hookOutput?.plantedPromise;
    if (planted) {
      ({ manager } = introducePromise(manager, {
        id: `scene_${s.index ?? 0}_hook`,
        text: planted,
        sceneIndex: s.index ?? 0,
        chapter,
        introducedBeat: `scene_${s.index ?? 0}`,
        source: 'chapter-plan',
      }));
    }
  }

  const overdue = listOverduePromises(manager, { chapter, sceneIndex: sceneCount });
  const pick = pickPromisePointer(manager, { chapter, sceneIndex: sceneCount });

  return {
    chapter,
    sceneCount,
    mustPayoffCount: 1,
    mustNewPromiseCount: 1,
    climaxSceneIndex: sceneCount,
    expectedPayoff: plan.reward?.payoff || plan.consequence || '章内至少兑现 1 个读者期待',
    expectedNewPromise: plan.cliffhanger || plan.hook || '章尾 Action Hook 种下新 Promise',
    chain: 'Promise → Escalation → Payoff → New Promise',
    rule: '每章：兑现旧 Promise + 制造新 Promise — 形成持续追更',
    promisePointer: pick.promisePointer,
    overdueCount: overdue.length,
    overduePromises: overdue.slice(0, 5).map((p) => ({
      id: p.id,
      text: (p.text || '').slice(0, 40),
      expectedPayoff: p.expectedPayoff,
    })),
    avoidUnpaidPits: true,
  };
}

export function formatChapterPromisePlanBlock(plan = {}) {
  if (!plan?.chapter) return '';
  return [
    '### Chapter Promise Plan · 章级期待管理',
    `- **须兑现**：≥${plan.mustPayoffCount} 个旧 Promise（Payoff Beat 落地）`,
    `- **须种下**：≥${plan.mustNewPromiseCount} 个新 Promise（末 Scene Action Hook）`,
    `- **高潮 Scene**：S${plan.climaxSceneIndex}`,
    plan.promisePointer ? `- **优先兑现 promisePointer**：${plan.promisePointer}` : '',
    plan.overdueCount ? `- **超时未填坑**：${plan.overdueCount} — 禁止继续挖坑不填` : '',
    `- **链式**：${plan.chain}`,
    `- **铁律**：${plan.rule}`,
  ].filter(Boolean).join('\n');
}

/** 聚合导出 — Promise Manager 表面 */
export const PromiseManager = {
  create: createPromiseManager,
  introduce: introducePromise,
  markPaid: markPromisePaid,
  listActive: listActivePromises,
  listPaid: listPaidPromises,
  listOverdue: listOverduePromises,
  pickPointer: pickPromisePointer,
  syncLifecycle: syncLifecycleToManager,
  directorBrief: getDirectorPromiseBrief,
  normalize: normalizeNarrativePromise,
};
