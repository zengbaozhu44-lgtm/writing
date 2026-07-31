/**
 * Chapter Blueprint Engine — 章体验规划层（非 Pipeline / 非第二套 Runtime）
 *
 * 职责：规划「为什么这一章好看」（读者体验），不写正文、不改 Writer/Narrative/Craft。
 * ExecutionPlan 仍由 scene-execution 负责；本模块只产出 Blueprint + 校验。
 *
 * version: chapter-blueprint-2（体验增强：readerIntent / Question 分层 / Rhythm DNA 篇幅 /
 * EndingPressure / Character decision / Promise heat / SellingPoint）
 */

import { buildEmotionWavePlan } from './reader-emotion-engine.js';

/** Ending 细类（催更导向） */
export const ENDING_TYPES = Object.freeze([
  'PositiveCliffhanger',
  'NegativeCliffhanger',
  'QuestionCliffhanger',
  'Countdown',
  'Promise',
  'Betrayal',
  'IdentityReveal',
  'Death',
  'Sacrifice',
  'SystemWarning',
  'FalseVictory',
  // 粗类兼容（规划时建议映射到细类）
  'Truth',
  'Threat',
  'Reveal',
  'Twist',
  'Victory',
  'Loss',
]);

/** 粗 → 细 Ending 映射 */
export const ENDING_TYPE_MAP = Object.freeze({
  Truth: 'QuestionCliffhanger', // 「规则被确认」仍须留下下一问催更
  Threat: 'SystemWarning',
  Reveal: 'IdentityReveal',
  Twist: 'Betrayal',
  Victory: 'FalseVictory',
  Loss: 'NegativeCliffhanger',
  Sacrifice: 'Sacrifice',
  Countdown: 'Countdown',
});

/** Rhythm 基因库（槽位模板，供 DNA 权重混合） */
export const RHYTHM_GENES = Object.freeze({
  mystery: [
    'Hook', 'Normal', 'TinyWeird', 'Investigation',
    'Discovery', 'FalseAnswer', 'TruthFragment', 'Cliffhanger',
  ],
  thriller: [
    'Normal', 'Threat', 'Escape', 'SmallWin',
    'BiggerThreat', 'Countdown', 'Cliffhanger',
  ],
  drama: [
    'Normal', 'Tension', 'ConfessionShift', 'Confession',
    'Cost', 'Aftermath', 'Cliffhanger',
  ],
  power_fantasy: [
    'Oppression', 'Humiliation', 'Prep', 'Counter',
    'Shock', 'Payoff', 'NewEnemy',
  ],
});

function norm(v = '') {
  return String(v || '').trim();
}

function clamp01(n, fallback = 0) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.max(0, Math.min(100, Math.round(x)));
}

function uniq(list = []) {
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
 * 规范化 EndingType → 细类 + endingPressure
 */
export function normalizeEnding(endingType = '', endingPressure = null) {
  let type = norm(endingType) || 'QuestionCliffhanger';
  if (ENDING_TYPE_MAP[type]) type = ENDING_TYPE_MAP[type];
  if (!ENDING_TYPES.includes(type)) type = 'QuestionCliffhanger';

  const defaultPressure = {
    PositiveCliffhanger: 70,
    NegativeCliffhanger: 85,
    QuestionCliffhanger: 80,
    Countdown: 90,
    Promise: 75,
    Betrayal: 88,
    IdentityReveal: 82,
    Death: 95,
    Sacrifice: 92,
    SystemWarning: 86,
    FalseVictory: 78,
  };
  const pressure = endingPressure != null
    ? clamp01(endingPressure)
    : (defaultPressure[type] ?? 75);

  return { endingType: type, endingPressure: pressure };
}

/**
 * Rhythm DNA：权重混合槽位 + 篇幅指引
 */
export function blendRhythmDna({
  weights = null,
  storyDna = {},
  sceneCount = 4,
  intent = {},
} = {}) {
  const raw = weights
    || intent.rhythmWeights
    || storyDna.rhythmWeights
    || deriveWeightsFromDna(storyDna);

  const cleaned = {};
  let sum = 0;
  for (const [k, v] of Object.entries(raw)) {
    if (!RHYTHM_GENES[k]) continue;
    const n = Math.max(0, Number(v) || 0);
    cleaned[k] = n;
    sum += n;
  }
  if (sum <= 0) {
    cleaned.mystery = 60;
    cleaned.thriller = 20;
    cleaned.drama = 20;
    sum = 100;
  }
  for (const k of Object.keys(cleaned)) {
    cleaned[k] = Math.round((cleaned[k] / sum) * 100);
  }

  // 按权重交错采样槽位
  const genes = Object.entries(cleaned)
    .filter(([, w]) => w > 0)
    .sort((a, b) => b[1] - a[1]);
  const targetLen = Math.max(6, sceneCount + 2);
  const blendedSlots = [];
  const cursors = Object.fromEntries(genes.map(([id]) => [id, 0]));
  while (blendedSlots.length < targetLen) {
    for (const [id, w] of genes) {
      const quota = Math.max(1, Math.round((w / 100) * targetLen));
      const seq = RHYTHM_GENES[id];
      let added = 0;
      while (added < quota && blendedSlots.length < targetLen) {
        blendedSlots.push(seq[cursors[id] % seq.length]);
        cursors[id] += 1;
        added += 1;
      }
      if (blendedSlots.length >= targetLen) break;
    }
    if (blendedSlots.length < targetLen) {
      const [topId] = genes[0];
      blendedSlots.push(RHYTHM_GENES[topId][cursors[topId] % RHYTHM_GENES[topId].length]);
      cursors[topId] += 1;
    }
  }

  // sceneWeight / sceneDensity：指导篇幅，不是只有槽位
  const sceneWeight = buildSceneWeights(sceneCount, cleaned);
  const sceneDensity = buildSceneDensity(sceneCount, cleaned);

  return {
    weights: cleaned,
    blendedSlots: blendedSlots.slice(0, targetLen),
    sourceTemplates: genes.map(([id]) => id),
    sceneWeight,
    sceneDensity,
  };
}

function deriveWeightsFromDna(storyDna = {}) {
  const genre = norm(storyDna.genre || storyDna.main_genre || '').toLowerCase();
  if (/爽|升级|打脸|power/.test(genre)) {
    return { power_fantasy: 50, thriller: 30, drama: 20 };
  }
  if (/惊悚|thriller|追/.test(genre)) {
    return { thriller: 55, mystery: 30, drama: 15 };
  }
  if (/情感|drama|家庭/.test(genre)) {
    return { drama: 50, mystery: 30, thriller: 20 };
  }
  return { mystery: 60, thriller: 20, drama: 20 };
}

/** 各 Scene 相对篇幅权重（总和 100） */
function buildSceneWeights(sceneCount = 4, weights = {}) {
  const n = Math.max(1, sceneCount);
  const mysteryHeavy = (weights.mystery || 0) >= 40;
  const raw = [];
  for (let i = 1; i <= n; i += 1) {
    // 默认：开篇略短、中段调查/冲突加长、章末钩子中等
    let w = 100 / n;
    if (i === 1) w *= 0.85;
    if (i === n) w *= 1.05;
    if (mysteryHeavy && i === Math.ceil(n * 0.6)) w *= 1.2;
    if ((weights.thriller || 0) >= 40 && i >= n - 1) w *= 1.15;
    raw.push({ sceneIndex: i, weight: w });
  }
  const sum = raw.reduce((a, b) => a + b.weight, 0) || 1;
  return raw.map((r) => ({
    sceneIndex: r.sceneIndex,
    weight: Math.round((r.weight / sum) * 100),
    role: r.sceneIndex === 1
      ? 'hook'
      : (r.sceneIndex === n ? 'ending' : 'develop'),
  }));
}

/**
 * 场景信息/动作密度指引（0–100）
 * high = 多事件少解释；low = 可略缓但仍须推进 Question
 */
function buildSceneDensity(sceneCount = 4, weights = {}) {
  const n = Math.max(1, sceneCount);
  const thriller = weights.thriller || 0;
  const drama = weights.drama || 0;
  return Array.from({ length: n }, (_, i) => {
    const sceneIndex = i + 1;
    let density = 55;
    if (sceneIndex === 1) density = 70;
    if (sceneIndex === n) density = 75;
    if (thriller >= 40) density += 10;
    if (drama >= 40 && sceneIndex > 1 && sceneIndex < n) density -= 8;
    return {
      sceneIndex,
      density: clamp01(density, 55),
      guidance: density >= 70
        ? '高密度：动作/发现优先，禁止长解释'
        : (density <= 45 ? '中低密度：关系/信念可加深，但仍须推进 ChapterQuestion' : '均衡推进'),
    };
  });
}

/**
 * 构建 Chapter Blueprint（体验优先，非事件大纲）
 */
export function buildChapterBlueprint({
  chapter = 1,
  intent = {},
  storyDna = {},
  chapterQuestion = null,
  bookQuestion = null,
  chapterPromisePlan = null,
  chapterClimax = null,
  chapterEmotionWave = null,
  sceneCount = 4,
  overrides = null,
} = {}) {
  const o = overrides && typeof overrides === 'object' ? overrides : {};
  const sc = intent.scenes?.length || intent.sceneCount || sceneCount || 4;

  const questions = buildLayeredChapterQuestions({
    intent,
    storyDna,
    chapterQuestion,
    bookQuestion,
    overrides: o.chapterQuestions || o.questions,
  });

  const chapterGoal = buildChapterGoalChange({ intent, storyDna, overrides: o.chapterGoal });
  const characterArc = buildWantNeedLieTruth({ intent, storyDna, overrides: o.characterArc });
  const readerExperience = buildReaderExperience({
    intent,
    storyDna,
    questions,
    overrides: o,
  });
  const readerArc = {
    beforeEmotion: readerExperience.beforeEmotion,
    afterEmotion: readerExperience.afterEmotion,
    expectedBeliefShift: readerExperience.expectedBeliefShift,
    beliefTrack: readerExperience.beliefTrack,
  };

  const rhythmDna = blendRhythmDna({
    weights: o.rhythmWeights || intent.rhythmWeights,
    storyDna,
    sceneCount: sc,
    intent,
  });

  const wave = chapterEmotionWave?.sequence?.length
    ? {
      sequence: chapterEmotionWave.sequence,
      pattern: chapterEmotionWave.pattern || '压 → 放 → 压 → 放 → 爆',
      sceneTargets: chapterEmotionWave.sceneTargets || [],
    }
    : (() => {
      const plan = buildEmotionWavePlan({
        beatCount: Math.max(6, sc + 2),
        sceneIndex: 1,
        preferShockAt: Math.max(2, sc),
      });
      return {
        sequence: plan.wave,
        pattern: plan.pattern,
        sceneTargets: Array.from({ length: sc }, (_, i) => ({
          sceneIndex: i + 1,
          targetEmotion: plan.wave[i % plan.wave.length],
        })),
      };
    })();

  const promisePlan = buildPromisePlanWithHeat({
    chapter,
    chapterPromisePlan,
    intent,
    overrides: o.promisePlan,
  });

  const informationBudget = {
    maxNewConcepts: Number(o.maxNewConcepts ?? intent.maxNewConcepts ?? storyDna.maxNewConceptsPerChapter ?? 2),
    allowedConcepts: uniq(
      o.allowedConcepts
      || intent.allowedConcepts
      || storyDna.chapter1Concepts
      || defaultAllowedConcepts(storyDna, chapter),
    ),
  };

  const endingIn = normalizeEnding(
    o.endingType || intent.endingType || inferEndingType(chapter, storyDna, intent),
    o.endingPressure ?? intent.endingPressure,
  );

  const narrativeChain = {
    goal: chapterGoal.mustChange || chapterGoal.after,
    conflict: intent.obstacles?.[0] || intent.conflict || '现实否认真相',
    choice: characterArc.decision || intent.choice || '是否相信异常为真并采取行动',
    cost: intent.cost || '被当成疯子 / 失去可信度 / 暴露异常行为',
    reward: intent.reward || '获得关键证据碎片，信念不可逆',
    escalation: intent.escalation || '异常从主观体验变成可验证的世界规则',
    bans: ['禁止连续两拍仅 Reveal 而无 Choice/Cost/Escalation'],
  };

  const sellingPoint = buildChapterSellingPoint({
    intent,
    storyDna,
    questions,
    endingIn,
    overrides: o.chapterSellingPoint || o.sellingPoint,
  });

  const blueprint = {
    version: 'chapter-blueprint-2',
    chapter: Number(chapter) || 1,
    chapterQuestions: questions,
    /** 兼容旧字段名：主问题 */
    chapterQuestion: {
      question: questions.main.question,
      provisionalAnswers: questions.main.provisionalAnswers,
      finalAnswer: questions.main.finalAnswer,
      openForNextChapter: questions.main.openForNextChapter,
      secondary: questions.secondary,
      background: questions.background,
    },
    chapterGoal,
    characterArc,
    readerArc,
    /** ★ 读者体验规划（先于事件） */
    readerIntent: readerExperience.readerIntent,
    readerTakeaway: readerExperience.readerTakeaway,
    chapterMemoryPoint: readerExperience.chapterMemoryPoint,
    emotionCurve: wave,
    rhythmDna,
    promisePlan,
    informationBudget,
    endingType: endingIn.endingType,
    endingPressure: endingIn.endingPressure,
    narrativeChain,
    chapterSellingPoint: sellingPoint,
    adaptive: {
      mode: o.adaptiveMode === 'adaptive' ? 'adaptive' : 'static',
      revisionPolicy: o.revisionPolicy || {
        ifExpectationHigh: 'accelerate_twist',
        ifFatigueHigh: 'cut_exposition',
        ifExpectationLow: 'early_promise_payoff',
      },
    },
    executionPlan: null,
    validation: { pass: false, failReasons: [] },
  };

  blueprint.validation = validateChapterBlueprint(blueprint);
  return blueprint;
}

function buildLayeredChapterQuestions({
  intent = {},
  storyDna = {},
  chapterQuestion = null,
  bookQuestion = null,
  overrides = null,
} = {}) {
  const o = overrides || {};
  const hook = norm(storyDna.core_hook || storyDna.pitch || '');
  const pitchShort = norm(storyDna.pitch || '').slice(0, 24);
  const mainQ = norm(
    o.main?.question
    || o.main
    || chapterQuestion?.question
    || chapterQuestion?.text
    || intent.chapterQuestion
    || storyDna.chapter1Question
    || (pitchShort ? `${pitchShort}——这是真的吗？` : '')
    || (hook ? '世界是否真的在固定时刻被重置？' : '')
    || bookQuestion?.question
    || '世界是否真的在异常刷新？',
  );

  const secondaryQ = norm(
    o.secondary?.question
    || o.secondary
    || intent.secondaryQuestion
    || '为什么只有他保留记忆，而世界所有记录都否认真相？',
  );

  const backgroundQ = norm(
    o.background?.question
    || o.background
    || intent.backgroundQuestion
    || bookQuestion?.question
    || storyDna.main_question
    || '谁在控制这次刷新？',
  );

  const openNext = norm(
    o.main?.openForNextChapter
    || (intent.ending || intent.newForeshadow
      ? `章末钩子指向：${String(intent.ending || intent.newForeshadow).slice(0, 48)}…接下来意味着什么？`
      : '')
    || '刷新由谁触发？规则边界在哪？',
  );

  return {
    main: {
      level: 'main',
      question: mainQ,
      provisionalAnswers: uniq(o.main?.provisionalAnswers || [
        '也许是幻觉',
        '也许是巧合',
        '证据指向真实刷新',
      ]),
      finalAnswer: norm(
        o.main?.finalAnswer
        || (intent.turningPoint
          ? `章内确认：${String(intent.turningPoint).slice(0, 60)}…`
          : '')
        || '世界确实在固定时刻刷新（至少对 POV 为真）',
      ),
      openForNextChapter: openNext,
    },
    secondary: {
      level: 'secondary',
      question: secondaryQ,
      note: '服务主问题，不可喧宾夺主',
    },
    background: {
      level: 'background',
      question: backgroundQ,
      note: '可埋伏笔，本章不必答完',
    },
  };
}

function buildChapterGoalChange({ intent = {}, storyDna = {}, overrides = null } = {}) {
  const o = overrides || {};
  const before = norm(
    o.before
    || intent.goalBefore
    || 'POV 怀疑自己精神出问题，异常只是错觉',
  );
  const rawGoal = norm(intent.mainGoal || intent.chapterIntent || '');
  const authorish = /^让主角|^建立|^克服|^完成章/.test(rawGoal);
  const after = norm(
    o.after
    || intent.goalAfter
    || (!authorish && rawGoal ? `新状态：${rawGoal.slice(0, 72)}` : '')
    || `POV 接受「${norm(storyDna.core_hook || storyDna.premise || storyDna.pitch || '世界异常').slice(0, 36)}」为可行动的真实，并确认自己是唯一记得的人`,
  );
  const lose = norm(intent.mustLose || '');
  return {
    before,
    after,
    mustChange: norm(
      o.mustChange
      || intent.mustGain
      || (lose ? '从「可被共识否定的体验」变为「不可逆的世界规则认知」（以失去现实信任为代价）' : '')
      || '认知：从「我疯了」变为「世界在刷新」',
    ),
  };
}

function buildWantNeedLieTruth({ intent = {}, storyDna = {}, overrides = null } = {}) {
  const o = overrides || {};
  const rawGoal = norm(intent.mainGoal || intent.chapterIntent || '');
  // 导演口吻目标（「让主角…」）不直接当 Want；Want 须是人物欲望
  const authorish = /^让主角|^建立|^克服|^完成章/.test(rawGoal);
  const want = norm(
    o.want
    || intent.want
    || (!authorish && rawGoal ? rawGoal.slice(0, 48) : '')
    || '证明自己没疯，拿回被否定的可信度',
  );
  const need = norm(
    o.need
    || intent.need
    || '接受世界规则不受自己控制，并据此行动',
  );
  const lie = norm(
    o.lie
    || intent.lie
    || '只要找到证据，别人就会相信我',
  );
  const truth = norm(
    o.truth
    || intent.truth
    || '别人信不信 ≠ 世界是否真实；真实不依赖共识',
  );
  const decision = norm(
    o.decision
    || intent.decision
    || (intent.turningPoint
      ? '决定把凌晨刷新当作真实规则继续验证，并追查「谁在注视异常体」'
      : '')
    || '决定把异常当作真实规则来验证，而不是当作病症来否认',
  );
  return {
    want,
    need,
    lie,
    truth,
    decision,
    before: `执着于 Want：${want.slice(0, 40)}`,
    after: `被 Truth 击中并做出决定：${decision.slice(0, 40)}`,
    changeKinds: uniq(o.changeKinds || ['cognition', 'values']),
  };
}

function buildReaderExperience({
  intent = {},
  storyDna = {},
  questions = {},
  overrides = {},
} = {}) {
  const o = overrides;
  const mainQ = questions?.main?.question || '世界是否异常？';
  const title = norm(storyDna.title || '');
  const readerIntent = norm(
    o.readerIntent
    || intent.readerIntent
    || `让读者带着疑问「${mainQ}」追读，并在章末获得不可逆的信念位移`,
  );
  const beforeEmotion = norm(o.beforeEmotion || intent.readerEmotionStart || 'Curiosity');
  const afterEmotion = norm(o.afterEmotion || intent.readerEmotionEnd || 'Shock');
  const beliefTrack = uniq(o.beliefTrack || intent.beliefTrack || [
    '主角可能疯了',
    '异常也许是真的',
    '世界真的在刷新',
  ]);
  const expectedBeliefShift = norm(
    o.expectedBeliefShift
    || `${beliefTrack[0]} → ${beliefTrack[beliefTrack.length - 1]}`,
  );
  const readerTakeaway = norm(
    o.readerTakeaway
    || intent.readerTakeaway
    || `合上本章时，读者应记住：${beliefTrack[beliefTrack.length - 1]}；并仍被下一问吊住`,
  );
  const chapterMemoryPoint = norm(
    o.chapterMemoryPoint
    || intent.chapterMemoryPoint
    || storyDna.chapter1MemoryPoint
    || (intent.turningPoint ? String(intent.turningPoint).slice(0, 80) : '')
    || (title ? `${title}——核心画面必须钉进读者记忆` : '')
    || '凌晨四点，世界刷新——这一画面必须钉进读者记忆',
  );

  return {
    readerIntent,
    readerTakeaway,
    chapterMemoryPoint,
    beforeEmotion,
    afterEmotion,
    expectedBeliefShift,
    beliefTrack,
  };
}

function buildPromisePlanWithHeat({
  chapter = 1,
  chapterPromisePlan = null,
  intent = {},
  overrides = null,
} = {}) {
  if (Array.isArray(overrides?.items)) {
    return {
      items: overrides.items.map((it, i) => ({
        id: it.id || `p_ch${chapter}_${i}`,
        text: norm(it.text),
        introduceAt: it.introduceAt || 'beat_2',
        payoffAt: it.payoffAt || 'beat_6',
        heat: clamp01(it.heat ?? 50),
      })),
    };
  }

  const items = [];
  const payoff = chapterPromisePlan?.expectedPayoff || intent.promisePayoff || intent.turningPoint;
  const planted = chapterPromisePlan?.expectedNewPromise
    || intent.newPromise
    || intent.newForeshadow
    || intent.ending;
  const sc = intent.scenes?.length || intent.sceneCount || 4;
  if (payoff) {
    items.push({
      id: chapterPromisePlan?.promisePointer || `ch${chapter}_payoff`,
      text: norm(String(payoff).slice(0, 100)),
      introduceAt: 'scene_1',
      payoffAt: `scene_${Math.max(2, sc)}`,
      heat: 85,
    });
  }
  if (planted) {
    items.push({
      id: `ch${chapter}_new`,
      text: norm(String(planted).slice(0, 100)),
      introduceAt: `scene_${sc}`,
      payoffAt: `ch${Number(chapter) + 1}`,
      heat: 90,
    });
  }
  if (!items.length) {
    items.push({
      id: `ch${chapter}_core`,
      text: '异常是否可被第三方证据验证',
      introduceAt: 'beat_2',
      payoffAt: 'beat_6',
      heat: 75,
    });
  }
  return { items };
}

function buildChapterSellingPoint({
  intent = {},
  storyDna = {},
  questions = {},
  endingIn = {},
  overrides = null,
} = {}) {
  const o = overrides || {};
  const primary = norm(
    o.primary
    || intent.sellingPointPrimary
    || storyDna.sellingPoint
    || storyDna.pitch
    || storyDna.core_hook
    || `高概念钩子：${questions?.main?.question || '世界规则崩坏'}`,
  );
  const secondary = norm(
    o.secondary
    || intent.sellingPointSecondary
    || (intent.ending
      ? `章末催更：${String(intent.ending).slice(0, 48)}…（${endingIn.endingType} · ${endingIn.endingPressure}）`
      : '')
    || `人物信念对撞 + ${endingIn.endingType || 'Cliffhanger'}（pressure ${endingIn.endingPressure ?? '—'}）`,
  );
  return {
    primary,
    secondary,
    rule: '本章卖点必须可一句话对外讲清；禁止主题分散成多条并列主线',
  };
}

function defaultAllowedConcepts(storyDna = {}, chapter = 1) {
  if (chapter === 1) {
    return uniq([
      storyDna.conceptA || '凌晨四点',
      storyDna.conceptB || '世界刷新',
    ]);
  }
  return uniq([
    storyDna.core_hook,
    storyDna.premise,
  ].filter(Boolean)).slice(0, 2);
}

function inferEndingType(chapter = 1, storyDna = {}, intent = {}) {
  const endingBlob = norm(`${intent.ending || ''} ${intent.newForeshadow || ''}`);
  if (/系统|警告|效率助手|异常体|消息消失|本地系统/.test(endingBlob)) {
    return 'SystemWarning';
  }
  if (/倒计时|四点|04:00|即将/.test(endingBlob)) return 'Countdown';
  if (/背叛|出卖/.test(endingBlob)) return 'Betrayal';
  // 第一章默认：确认异常为真后留下更大追问
  if (chapter === 1) return 'QuestionCliffhanger';
  if (chapter === 2) return 'SystemWarning';
  return 'QuestionCliffhanger';
}

/**
 * Blueprint 硬校验（体验规划层，非 Writer Validator）
 */
export function validateChapterBlueprint(bp = {}) {
  const failReasons = [];

  if (!bp?.chapterQuestions?.main?.question) {
    failReasons.push('缺少 chapterQuestions.main（本章主问题）');
  }
  if (!bp?.chapterQuestions?.secondary?.question) {
    failReasons.push('缺少 chapterQuestions.secondary');
  }
  if (!bp?.chapterGoal?.before || !bp?.chapterGoal?.after) {
    failReasons.push('chapterGoal 缺少 before/after');
  } else if (bp.chapterGoal.before === bp.chapterGoal.after) {
    failReasons.push('chapterGoal Before == After — 本章无真正改变');
  }

  const arc = bp.characterArc || {};
  for (const k of ['want', 'need', 'lie', 'truth', 'decision']) {
    if (!norm(arc[k])) failReasons.push(`characterArc 缺少 ${k}`);
  }
  if (norm(arc.want) && norm(arc.need) && arc.want === arc.need) {
    failReasons.push('characterArc Want == Need — 成长虚假');
  }
  if (!norm(arc.decision)) {
    failReasons.push('characterArc.decision 必须存在（推动后续剧情的关键决定）');
  }

  if (!norm(bp.readerIntent)) failReasons.push('缺少 readerIntent（读者体验意图）');
  if (!norm(bp.readerTakeaway)) failReasons.push('缺少 readerTakeaway');
  if (!norm(bp.chapterMemoryPoint)) failReasons.push('缺少 chapterMemoryPoint');
  if (!bp.readerArc?.beliefTrack?.length) {
    failReasons.push('readerArc.beliefTrack 不能为空');
  }

  if (!bp.rhythmDna?.blendedSlots?.length) {
    failReasons.push('rhythmDna.blendedSlots 为空');
  }
  if (!bp.rhythmDna?.sceneWeight?.length) {
    failReasons.push('rhythmDna.sceneWeight 缺失（篇幅分配）');
  }
  if (!bp.rhythmDna?.sceneDensity?.length) {
    failReasons.push('rhythmDna.sceneDensity 缺失');
  }

  if (!bp.endingType) failReasons.push('缺少 endingType');
  if (!Number.isFinite(bp.endingPressure)) {
    failReasons.push('缺少 endingPressure（0–100 催更力度）');
  }

  const budget = bp.informationBudget || {};
  if (!Number.isFinite(budget.maxNewConcepts) || budget.maxNewConcepts < 1) {
    failReasons.push('informationBudget.maxNewConcepts 无效');
  }
  if ((budget.allowedConcepts || []).length > budget.maxNewConcepts) {
    failReasons.push(
      `Information Budget 超限：allowed ${budget.allowedConcepts.length} > max ${budget.maxNewConcepts}`,
    );
  }

  if (!bp.chapterSellingPoint?.primary) {
    failReasons.push('缺少 chapterSellingPoint.primary');
  }

  const promises = bp.promisePlan?.items || [];
  if (!promises.length) failReasons.push('promisePlan.items 为空');
  for (const p of promises) {
    if (!Number.isFinite(p.heat)) failReasons.push(`Promise ${p.id} 缺少 heat`);
  }

  return {
    pass: failReasons.length === 0,
    failReasons,
  };
}

/**
 * 四问验收：Blueprint 是否说清「好看」而非「事件」
 */
export function answerBlueprintFourQuestions(bp = {}) {
  const q = bp.chapterQuestions?.main;
  const arc = bp.characterArc || {};
  const sell = bp.chapterSellingPoint || {};
  return {
    whyKeepReading: {
      question: '为什么读者会一直读？',
      answer: [
        bp.readerIntent,
        `主问题：${q?.question || '—'}`,
        `信念轨迹：${(bp.readerArc?.beliefTrack || []).join(' → ')}`,
        `卖点 Primary：${sell.primary || '—'}`,
      ].filter(Boolean).join('\n'),
    },
    whyCharacterChanged: {
      question: '为什么人物发生了改变？',
      answer: [
        `Want：${arc.want}`,
        `Need：${arc.need}`,
        `Lie：${arc.lie}`,
        `Truth：${arc.truth}`,
        `Decision（关键决定）：${arc.decision}`,
        `Goal：${bp.chapterGoal?.before} → ${bp.chapterGoal?.after}`,
      ].join('\n'),
    },
    whyWorldAdvanced: {
      question: '为什么世界发生了推进？',
      answer: [
        `必须改变：${bp.chapterGoal?.mustChange}`,
        `叙事链：${bp.narrativeChain?.goal} / ${bp.narrativeChain?.conflict} → ${bp.narrativeChain?.escalation}`,
        `信息预算：最多 ${bp.informationBudget?.maxNewConcepts} 个新设定（${(bp.informationBudget?.allowedConcepts || []).join('、')}）`,
        `主问题阶段答案：${q?.finalAnswer || '—'}`,
      ].join('\n'),
    },
    whyClickNext: {
      question: '为什么读者必须点开下一章？',
      answer: [
        `EndingType：${bp.endingType} · Pressure ${bp.endingPressure}/100`,
        `未尽之问：${q?.openForNextChapter || '—'}`,
        `Takeaway：${bp.readerTakeaway}`,
        `Memory Point：${bp.chapterMemoryPoint}`,
        `高 heat Promise：${(bp.promisePlan?.items || []).filter((p) => p.heat >= 70).map((p) => `${p.id}(${p.heat})`).join('、') || '—'}`,
        `卖点 Secondary：${sell.secondary || '—'}`,
      ].join('\n'),
    },
    validation: bp.validation,
  };
}

export function formatChapterBlueprintBrief(bp = {}) {
  if (!bp?.version) return '';
  const q = bp.chapterQuestions || {};
  return [
    '### Chapter Blueprint · 章体验设计',
    '',
    `**readerIntent**：${bp.readerIntent || '—'}`,
    `**readerTakeaway**：${bp.readerTakeaway || '—'}`,
    `**chapterMemoryPoint**：${bp.chapterMemoryPoint || '—'}`,
    '',
    '**Chapter Questions**',
    `- main：${q.main?.question || '—'}`,
    `- secondary：${q.secondary?.question || '—'}`,
    `- background：${q.background?.question || '—'}`,
    '',
    '**Character Arc（Want/Need/Lie/Truth + Decision）**',
    `- Want：${bp.characterArc?.want || '—'}`,
    `- Need：${bp.characterArc?.need || '—'}`,
    `- Lie：${bp.characterArc?.lie || '—'}`,
    `- Truth：${bp.characterArc?.truth || '—'}`,
    `- Decision：${bp.characterArc?.decision || '—'}`,
    '',
    `**SellingPoint**：Primary「${bp.chapterSellingPoint?.primary || '—'}」· Secondary「${bp.chapterSellingPoint?.secondary || '—'}」`,
    `**Ending**：${bp.endingType} · pressure ${bp.endingPressure}`,
    `**Rhythm DNA**：${JSON.stringify(bp.rhythmDna?.weights || {})}`,
    bp.rhythmDna?.sceneWeight?.length
      ? `- sceneWeight：${bp.rhythmDna.sceneWeight.map((s) => `S${s.sceneIndex}:${s.weight}`).join(' ')}`
      : '',
    bp.rhythmDna?.sceneDensity?.length
      ? `- sceneDensity：${bp.rhythmDna.sceneDensity.map((s) => `S${s.sceneIndex}:${s.density}`).join(' ')}`
      : '',
    `**Info Budget**：≤${bp.informationBudget?.maxNewConcepts} · ${(bp.informationBudget?.allowedConcepts || []).join('、')}`,
    `**Promises**：${(bp.promisePlan?.items || []).map((p) => `${p.id} heat=${p.heat}`).join('；')}`,
    `**Validation**：${bp.validation?.pass ? 'PASS' : `FAIL ${(bp.validation?.failReasons || []).join('；')}`}`,
  ].filter(Boolean).join('\n');
}

export const ChapterBlueprint = {
  build: buildChapterBlueprint,
  validate: validateChapterBlueprint,
  fourQuestions: answerBlueprintFourQuestions,
  formatBrief: formatChapterBlueprintBrief,
  blendRhythmDna,
  normalizeEnding,
  ENDING_TYPES,
  RHYTHM_GENES,
};
