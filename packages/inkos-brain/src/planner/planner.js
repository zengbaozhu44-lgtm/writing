/**
 * Planner Engine — 只规划，不写正文
 */
import { loadAdaptiveState, applyWeightsToIntent } from './adaptive.js';
import { readYaml } from '../../../inkos-core/src/lib/yaml-store.js';
import { exists, readJson } from '../../../inkos-core/src/lib/paths.js';
import path from 'node:path';
import { applyStoryMapToIntent } from './story-map.js';
import { sanitizeObstacleSuggestion } from '../decision/content-policy.js';
import { suggestSafeObstacle } from './conflict-suggester.js';

/** 统一命名：states/ch_XXXX_anchor.yaml（4 位，禁止 ch_1_anchor / anchor_0001 等） */
export function chapterAnchorFileName(chapter) {
  const n = Number(chapter);
  if (!Number.isFinite(n) || n < 1) {
    throw new Error(`Invalid chapter for anchor filename: ${chapter}`);
  }
  return `ch_${String(n).padStart(4, '0')}_anchor.yaml`;
}

export function chapterAnchorPath(bookDir, chapter) {
  return path.join(bookDir, 'states', chapterAnchorFileName(chapter));
}

/** 向导前三章基调：novel/_system/wizard_chapter_tones.json */
export function loadWizardChapterTone(bookDir, chapterIdx) {
  if (!bookDir) return null;
  const n = Number(chapterIdx);
  if (!Number.isFinite(n) || n < 1 || n > 3) return null;
  const file = path.join(bookDir, 'novel', '_system', 'wizard_chapter_tones.json');
  if (!exists(file)) return null;
  try {
    const data = readJson(file);
    const tones = data?.tones || [];
    return tones.find((t) => Number(t.chapterIndex) === n) || null;
  } catch {
    return null;
  }
}

/**
 * 读取上一章 MemoryUnit 写入的 anchor（强制约束源）
 * @param {string} bookDir
 * @param {number} chapter 上一章章号（finishedChapter）
 * @param {{ required?: boolean }} [options] chapter>=1 且 required 时缺文件抛错
 */
export function loadPriorChapterAnchor(bookDir, chapter, options = {}) {
  const required = options.required !== false;
  if (!bookDir || !chapter || Number(chapter) < 1) return null;
  const anchorPath = chapterAnchorPath(bookDir, chapter);
  if (!exists(anchorPath)) {
    if (required) {
      throw new Error(`Anchor not found: ${anchorPath}`);
    }
    return null;
  }
  try {
    return readYaml(anchorPath);
  } catch (err) {
    if (required) {
      throw new Error(`Anchor not readable: ${anchorPath} (${err?.message || err})`);
    }
    return null;
  }
}

export function planChapter(ctx, attempt = 1, options = {}) {
  const { chapter, chapterTask, state, volume, facts, pov, present } = ctx;
  const weights = options.weights || loadAdaptiveState(ctx.bookDir).weights;
  const priorAnchor = options.priorAnchor || ctx.priorAnchor || null;
  const bookDir = ctx.bookDir || options.bookDir || null;

  // 前三章：向导基调优先（只给方向/字数，不预填 Beat Plan）
  const chapterTone = options.chapterTone
    || (Number(chapter) <= 3 ? loadWizardChapterTone(bookDir, chapter) : null);

  let mainGoal =
    chapterTask['目标'] ||
    chapterTask['本章现实目标'] ||
    state['任务'] ||
    null;

  // 卷纲散文：按章号映射 sceneSeeds / goals（不仅取第 1 条）
  const seeds = Array.isArray(volume?.sceneSeeds) ? volume.sceneSeeds : [];
  const goals = Array.isArray(volume?.goals) ? volume.goals : [];
  const volIdx = Math.min(
    Math.max(0, Number(chapter) - 1),
    Math.max(0, (seeds.length || goals.length || 1) - 1),
  );
  const volumeSeed = seeds[volIdx] || null;
  const volumeGoalLine = goals[volIdx] || goals[0] || '';
  if (!mainGoal) {
    mainGoal = volumeSeed?.seed || volumeGoalLine || '推进当前现实目标';
  }

  const obstacle1 = sanitizeObstacleSuggestion(
    chapterTask['第一阻碍'] || chapterTask['阻碍'] || options.suggestObstacle || '资源不足或时间压力',
    '资源不足或时间压力',
  );
  const obstacle2 = sanitizeObstacleSuggestion(
    chapterTask['第二阻碍'] || '信息不完整',
    '信息不完整',
  );
  const turningPoint = chapterTask['高潮'] || chapterTask['转折'] || '关键抉择导致不可逆变化';
  let ending = chapterTask['结尾'] || chapterTask['结尾方向'] || '发现型钩子';
  const bargain = chapterTask['博弈'] || chapterTask['人物博弈'] || '';

  if (chapterTone) {
    if (chapterTone.coreEvent) mainGoal = String(chapterTone.coreEvent);
    if (chapterTone.endingDirection) ending = String(chapterTone.endingDirection);
  }

  const relevantFacts = facts
    .filter((f) => f.chapter >= chapter - 5 || f.chapter === 0)
    .slice(-8)
    .map((f) => f.fact);

  let intent = {
    chapter,
    attempt,
    pov: priorAnchor?.pov || pov || '主角',
    present,
    chapterIntent: `第${chapter}章：${mainGoal}`,
    mainGoal,
    obstacles: [obstacle1, obstacle2].filter(Boolean),
    turningPoint,
    ending,
    bargain,
    mustGain: chapterTask['必须获得'] || '',
    mustLose: chapterTask['必须失去'] || chapterTask['代价'] || '时间或身体代价',
    newForeshadow: chapterTask['新增伏笔'] || '',
    volumeGoals: goals,
    sceneSeeds: seeds,
    volumeAuthorNotes: volume?.authorNotes || '',
    volumeSeed: volumeSeed || null,
    contextFacts: relevantFacts,
    location: priorAnchor?.location || state['地点'] || state['当前位置'] || '',
    time: priorAnchor?.current_date || state['时间'] || '',
    currentDate: priorAnchor?.current_date || state['时间'] || '',
    adaptiveWeights: weights,
    priorAnchor: priorAnchor || null,
    bannedElements: priorAnchor?.banned_elements || [],
    relationshipState: priorAnchor?.relationship_state || null,
    narrativeMomentum: priorAnchor?.narrative_momentum || null,
    closingEmotion: priorAnchor?.narrative_momentum?.closing_emotion || null,
    forbiddenOpenings: priorAnchor?.narrative_momentum?.forbidden_openings || [],
    voiceDna: priorAnchor?.voiceDna
      ? { ...priorAnchor.voiceDna, forced: true, inherited: true }
      : null,
    // 向导基调：约束 Director 动态 Beat，不在此生成具体 Beat Plan
    chapterTone: chapterTone || null,
    tone: chapterTone?.tone || null,
    endingDirection: chapterTone?.endingDirection || ending,
    wordTarget: chapterTone?.wordTarget || null,
  };

  // 长篇架构层：卷相位 / 章功能 / POV / 情节线 / 里程碑（不替代 Beat，约束方向）
  intent = applyStoryMapToIntent(intent, bookDir, chapter);

  // 卷纲散文作者笔记并入 Story Map 导航（供 Writer 短摘要）
  if (intent.volumeAuthorNotes && intent.storyMap) {
    const note = String(intent.volumeAuthorNotes).slice(0, 160);
    intent.storyMap = {
      ...intent.storyMap,
      authorNotes: [intent.storyMap.authorNotes, note].filter(Boolean).join('\n'),
      volumeAuthorNotes: note,
    };
  }
  // 本章卷纲种子：优先用于 sceneSeeds 映射（deriveScenes）
  if (intent.volumeSeed?.seed && (!intent.sceneSeeds || !intent.sceneSeeds.length)) {
    intent.sceneSeeds = [intent.volumeSeed];
  }

  intent.scenes = deriveScenes(intent);
  intent = applyWeightsToIntent(intent, weights);
  if (priorAnchor) {
    intent = applyAnchorConstraints(intent, priorAnchor);
  }

  console.log('[planner] using pov:', intent.pov, 'location:', priorAnchor?.location || intent.location);
  const loc = String(priorAnchor?.location || intent.location || '').trim();
  if (!intent.pov || intent.pov === '主角') {
    console.warn('[planner] pov missing or fallback「主角」— 检查 Anchor / chapterTask POV');
  }
  if (!loc || loc === '—' || loc === '-' || loc === '未标注') {
    console.warn('[planner] location empty — Anchor 可能丢失或未写入 location');
  }

  return intent;
}

/**
 * 规划下一章 — 强制读取上一章 ch_XXXX_anchor.yaml 作为约束
 * 缺文件直接抛错（禁止失忆规划）
 */
export function planNextChapter(bookDir, finishedChapter, ctx = {}, weights = null) {
  const priorAnchor = loadPriorChapterAnchor(bookDir, finishedChapter, { required: true });

  const nextChapter = Number(finishedChapter) + 1;
  const nextCtx = {
    ...ctx,
    bookDir: bookDir || ctx.bookDir,
    chapter: nextChapter,
    priorAnchor,
    chapterTask: {
      ...(ctx.chapterTask || {}),
      ...(priorAnchor?.location ? { 地点: priorAnchor.location } : {}),
      ...(priorAnchor?.current_date ? { 时间: priorAnchor.current_date } : {}),
    },
    state: {
      ...(ctx.state || {}),
      ...(priorAnchor?.location ? { 地点: priorAnchor.location, 当前位置: priorAnchor.location } : {}),
      ...(priorAnchor?.current_date ? { 时间: priorAnchor.current_date } : {}),
    },
    pov: priorAnchor?.pov || ctx.pov,
  };

  const resolvedWeights = weights || loadAdaptiveState(bookDir || ctx.bookDir).weights;
  const intent = planChapter(nextCtx, 1, { weights: resolvedWeights, priorAnchor });

  return {
    chapter: nextChapter,
    intent: {
      chapterIntent: intent.chapterIntent,
      mainGoal: intent.mainGoal,
      obstacles: intent.obstacles,
      sceneCount: intent.scenes?.length || 0,
      scenes: intent.scenes,
      pov: intent.pov,
      bargain: intent.bargain,
      turningPoint: intent.turningPoint,
      ending: intent.ending,
      mustLose: intent.mustLose,
      newForeshadow: intent.newForeshadow,
      location: intent.location,
      time: intent.time,
      currentDate: intent.currentDate,
      bannedElements: intent.bannedElements,
      relationshipState: intent.relationshipState,
      priorAnchor: intent.priorAnchor,
      anchorConstraintsApplied: Boolean(priorAnchor),
      // 向导前三章基调（N<=3）
      chapterTone: intent.chapterTone || null,
      tone: intent.tone || null,
      endingDirection: intent.endingDirection || intent.ending,
      wordTarget: intent.wordTarget || null,
      storyMap: intent.storyMap || null,
      sceneSeeds: intent.sceneSeeds || [],
      volumeAuthorNotes: intent.volumeAuthorNotes || '',
      volumeSeed: intent.volumeSeed || null,
    },
    priorAnchor,
    ready: true,
  };
}

/** 将上一章 anchor 强制压入 intent */
export function applyAnchorConstraints(intent = {}, anchor = null) {
  if (!anchor) return intent;
  const chapter = Number(intent.chapter) || 1;
  const banned = filterActiveBannedElements(anchor.banned_elements, chapter);

  // 允许覆盖 relationship_state，但必须说明 transition 原因
  let relationshipState = anchor.relationship_state || intent.relationshipState || null;
  let relationshipOverrideRejected = null;
  if (intent.relationshipOverride) {
    const reason = String(
      intent.relationshipTransitionReason
      || intent.relationshipOverride.transitionReason
      || '',
    ).trim();
    if (!reason) {
      relationshipOverrideRejected = 'relationshipOverride 被拒绝：缺少 relationshipTransitionReason';
    } else {
      relationshipState = {
        ...(typeof intent.relationshipOverride === 'object' ? intent.relationshipOverride : {}),
        machine: 'relationship-state-v2',
        overridden: true,
        transitionReason: reason,
        fromAnchor: true,
      };
    }
  }

  const voiceDna = anchor.voiceDna
    ? { ...anchor.voiceDna, forced: true, inherited: true }
    : (intent.voiceDna || null);

  const momentum = anchor.narrative_momentum || null;
  const forbiddenOpenings = momentum?.forbidden_openings || [];
  const closingEmotion = momentum?.closing_emotion || null;

  const next = {
    ...intent,
    pov: intent.pov || anchor.pov,
    location: anchor.location || intent.location,
    time: anchor.current_date || intent.time,
    currentDate: anchor.current_date || intent.currentDate,
    bannedElements: banned,
    relationshipState,
    voiceDna,
    narrativeMomentum: momentum,
    closingEmotion,
    forbiddenOpenings,
    priorAnchor: anchor,
    relationshipOverrideRejected,
    anchorConstraints: {
      mustContinuePov: anchor.pov,
      mustHonorLocation: anchor.location,
      mustHonorDate: anchor.current_date,
      banned_elements: banned,
      relationship_state: relationshipState,
      voiceDnaForced: Boolean(voiceDna),
      closing_emotion: closingEmotion,
      forbidden_openings: forbiddenOpenings,
      rule: '下一章必须承接 anchor；Scene1 继承 closing_emotion；禁止 forbidden_openings；Voice DNA 强制继承；关系覆盖须写 transition 原因',
    },
  };

  if (next.scenes?.length) {
    next.scenes = next.scenes.map((s, i) => {
      const patched = { ...s };
      if (banned.length) {
        patched.anchorBanNote = banned.slice(0, 3).map((b) => b.text || b);
      }
      // Scene 1：强制继承上一章 closing_emotion，并注入 forbidden_openings
      if ((s.index === 1 || i === 0) && closingEmotion) {
        patched.inheritedEmotion = closingEmotion;
        patched.forbiddenOpenings = forbiddenOpenings;
        patched.goal = [
          `承接上章情绪「${closingEmotion}」进入局面`,
          s.goal || `POV（${next.pov}）推进：${next.mainGoal || ''}`,
        ].filter(Boolean).join(' · ');
        patched.openingConstraint = [
          `开场必须延续情绪：${closingEmotion}`,
          ...forbiddenOpenings.slice(0, 3),
        ].join('；');
      }
      return patched;
    });
  }
  return next;
}

/** 过滤仍生效的 banned_elements（expiresAtChapter >= 当前章 或 null=永久） */
export function filterActiveBannedElements(banned = [], chapter = 1) {
  const ch = Number(chapter) || 1;
  const list = Array.isArray(banned) ? banned : [];
  return list
    .map((item) => {
      if (typeof item === 'string') return { text: item, expiresAtChapter: null };
      if (!item?.text) return null;
      return {
        text: String(item.text),
        expiresAtChapter: item.expiresAtChapter == null ? null : Number(item.expiresAtChapter),
      };
    })
    .filter(Boolean)
    .filter((b) => b.expiresAtChapter == null || b.expiresAtChapter >= ch);
}

function slimGoal(text = '', max = 42) {
  const s = String(text || '').trim();
  if (!s) return '';
  const first = s.split(/[，。；;\n]/u)[0] || s;
  return first.length <= max ? first : `${first.slice(0, max - 1)}…`;
}

function deriveScenes(intent) {
  const emotion = intent.closingEmotion || intent.narrativeMomentum?.closing_emotion;
  const forbidden = intent.forbiddenOpenings || intent.narrativeMomentum?.forbidden_openings || [];
  const seeds = Array.isArray(intent.sceneSeeds) ? intent.sceneSeeds : [];
  // 章目标只作导航短句，禁止把整段 pitch 塞进每个 Scene goal（否则每拍都在写「觉醒开场」）
  const chapterNav = slimGoal(intent.mainGoal, 36);
  const obstacleShort = slimGoal(intent.obstacles?.[0], 36);
  const turnShort = slimGoal(intent.turningPoint, 40);
  const endingShort = slimGoal(intent.ending, 40);
  const bargainShort = slimGoal(intent.bargain, 40);

  let base = [
    {
      index: 1,
      id: `ch${intent.chapter}_s1`,
      title: '进入局面',
      goal: emotion
        ? `承接「${String(emotion).slice(0, 12)}」进入现场：${chapterNav || '确立当下危机'}`
        : `进入现场并确立危机：${chapterNav || '确立当下危机'}`,
      conflict: intent.obstacles[0] || '外部阻力',
      entities: [intent.pov],
      beat: 'situation',
      inheritedEmotion: emotion || null,
      forbiddenOpenings: forbidden,
      openingConstraint: emotion
        ? [`开场必须延续情绪：${emotion}`, ...forbidden.slice(0, 3)].join('；')
        : (forbidden.slice(0, 3).join('；') || null),
      spatialAnchor: {
        location: '本章起始现场',
        povPosition: 'POV 首次落地位置',
        note: '后续 Scene 必须承接此处或给出过渡',
      },
      revealPolicy: { allowFirstReveal: true, keyRevealBeat: 'newInformation' },
    },
    {
      index: 2,
      id: `ch${intent.chapter}_s2`,
      title: '受阻与博弈',
      goal: bargainShort || `克服阻碍：${obstacleShort || '外部阻力'}`,
      conflict: intent.obstacles[1] || intent.obstacles[0] || '利益冲突',
      entities: [intent.pov, ...(intent.present || [])].filter(Boolean),
      beat: 'complication',
      spatialAnchor: {
        location: '承接 Scene1 现场或合理过渡后的邻接区',
        note: '禁止重写章开场坠落/濒死',
      },
      revealPolicy: { allowFirstReveal: false, advanceOnly: true },
    },
    {
      index: 3,
      id: `ch${intent.chapter}_s3`,
      title: '转折与代价',
      goal: turnShort || '关键抉择与代价落地',
      conflict: intent.mustLose ? `必须失去：${slimGoal(intent.mustLose, 40)}` : '代价兑现',
      entities: [intent.pov],
      beat: 'turn',
      spatialAnchor: {
        location: '同线推进至转折点',
        note: '禁止换场无过渡；禁止复读已揭示关键信息的「首次发现」',
      },
      revealPolicy: { allowFirstReveal: false, advanceOnly: true },
    },
    {
      index: 4,
      id: `ch${intent.chapter}_s4`,
      title: '章末钩子',
      goal: endingShort || '章末钩子，局势改写',
      conflict: '局势改变',
      entities: [intent.pov],
      beat: 'hook',
      spatialAnchor: {
        location: '同线收束现场',
        note: '只推进后果与新疑问，不重启开场',
      },
      revealPolicy: { allowFirstReveal: false, advanceOnly: true },
    },
  ];

  if (!intent.obstacles[1]) {
    base = base.filter((s) => s.index !== 2).map((s, i) => ({ ...s, index: i + 1, id: `ch${intent.chapter}_s${i + 1}` }));
  }

  return base.map((scene, i) => {
    const seed = seeds[i] || null;
    if (!seed) return scene;
    const authorIntent = slimGoal(seed.seed || seed.goal || '', 48);
    if (!authorIntent) return scene;
    return {
      ...scene,
      title: seed.title || scene.title,
      sceneSeed: authorIntent,
      authorIntent,
      lore: authorIntent,
      // 作者意图作导航旁注，不再拼进 goal 造成「整章 pitch × N」
      goal: scene.goal,
    };
  });
}

export function replan(ctx, reasons) {
  const attempt = (reasons[0]?.attempt ?? 1) + 1;
  const conflictReason = reasons.find((r) => r.type === 'conflict' || r.type === 'metrics');
  const decisionReason = reasons.find((r) => r.type === 'decision');
  const safeConflictObs = conflictReason?.suggestObstacle
    ? sanitizeObstacleSuggestion(conflictReason.suggestObstacle, suggestSafeObstacle('conflict'))
    : null;
  const safeDecisionObs = decisionReason?.suggestObstacle
    ? sanitizeObstacleSuggestion(decisionReason.suggestObstacle, suggestSafeObstacle(decisionReason.dimension || 'content'))
    : null;
  const patched = {
    ...ctx,
    chapterTask: {
      ...ctx.chapterTask,
      目标: ctx.chapterTask['目标'] || reasons.find((r) => r.suggestGoal)?.suggestGoal,
      第一阻碍: safeConflictObs || ctx.chapterTask['第一阻碍'],
      第二阻碍: safeDecisionObs || ctx.chapterTask['第二阻碍'],
    },
  };
  return planChapter(patched, attempt, {
    suggestObstacle: safeConflictObs || undefined,
    weights: loadAdaptiveState(ctx.bookDir).weights,
    priorAnchor: ctx.priorAnchor || null,
  });
}
