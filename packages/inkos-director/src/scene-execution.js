/**
 * Scene Execution Plan — 六结构 Beat 状态变化 + Library Beat + Scene Type 变体
 */
import {
  STRUCTURAL_BEATS,
  assignLibraryBeats,
  libraryBeatInstruction,
  sanitizeLibraryBeat,
} from './beat-library.js';
import { getSceneHookLadderEntry, formatHookLadderInstruction, formatHookOutputBlock, buildHookOutput, buildActionHookOutput } from './hook-ladder.js';
import {
  buildSceneReward,
  formatRewardBrief,
  formatRewardBlock,
  formatTensionRewardThreatBlock,
} from './reward-engine.js';
import {
  inferSceneTypeForExecution,
  resolveWordShare,
  resolveLibraryPools,
  getBeatHint,
} from './beat-pattern.js';
import {
  buildSceneBeatPlans,
  buildSceneBeatPlan,
  formatBeatStatePlanBlock,
  formatBeatStateSequenceBlock,
  migrateScenePlan,
  validateBeatPlanDegeneration,
} from './beat-state.js';
import {
  buildSceneSituation,
  buildSituationBeatChain,
  formatSituationBlock,
} from './situation-engine.js';
import {
  buildBookQuestion,
  buildChapterQuestion,
  buildSceneQuestionPlan,
  formatQuestionBlock,
} from './question-engine.js';
import {
  buildCharacterDesireProfile,
  buildSceneCharacterPush,
} from './character-desire-engine.js';
import {
  buildSceneEmotionCurvePlan,
} from './emotion-curve-engine.js';
import { buildSceneConflict } from './conflict-engine.js';
import { buildSceneClimaxRole } from './climax-engine.js';
import { mapWaveToZh } from './reader-emotion-engine.js';
import {
  buildQuestionRegistry,
  applyQuestionLifecycle,
} from './question-lifecycle.js';
import { buildReaderEmotionCurve } from './reader-emotion-engine.js';
import { buildScenePromiseLifecycle } from './promise-lifecycle.js';
import { assertInformationGapMeaningful } from './narrative-runtime.js';
import { buildWriterSceneArc } from './writer-scene-arc.js';
import { buildSceneCharacterTransformation } from './character-transformation.js';
import { buildChoiceBehaviorLogic } from './character-behavior.js';
import { buildSceneEntertainment } from './scene-entertainment.js';
import { buildHumanWritingPolicy } from './human-writing-policy.js';
import { buildReaderSatisfaction } from './reader-satisfaction.js';
import { getSceneRhythmRole } from './chapter-rhythm.js';
import { selectSceneEnding } from './scene-ending-library.js';
import {
  buildSceneWriterRuntime,
  buildProfessionalSceneWriting,
} from './writer-runtime.js';
import { buildTensionArc, applyTensionArcToBeats } from './tension-arc.js';
import { applyHookTypeRotation } from './hook-rotation.js';

/**
 * 汇总 Scene 级引擎输出 — Director 与 Writer 共用
 */
export function buildSceneEngineBundle({
  scene = {},
  intent = {},
  plan = {},
  chapter = null,
  sceneIndex = 1,
  sceneCount = 4,
  storyDna = {},
  hookLadder = null,
  prevScene = null,
  chapterClimax = null,
  chapterRhythm = null,
} = {}) {
  const characterDesire = buildCharacterDesireProfile({ storyDna, intent, chapter });
  const prevPush = prevScene?.executionPlan?.characterPush
    || prevScene?.scenePlan?.characterPush
    || null;
  const prevClosing = prevScene?.scenePlan?.situation?.closingWorldState
    || prevScene?.executionPlan?.situation?.closingWorldState
    || null;

  let characterPush = buildSceneCharacterPush({
    desire: characterDesire,
    plan,
    scene,
    prevPush,
  });

  const situation = plan.situation?.worldState
    ? plan.situation
    : buildSceneSituation({
      scene,
      intent,
      plan,
      prevSceneClosingState: prevClosing,
      characterDesire,
      characterPush,
    });

  characterPush = buildSceneCharacterPush({
    desire: characterDesire,
    plan,
    scene,
    situation,
    prevPush,
  });

  const bookQuestion = intent._chapterDirector?.bookQuestion
    || buildBookQuestion(storyDna, intent);
  const chapterQuestion = intent._chapterDirector?.chapterQuestion
    || buildChapterQuestion({ chapter, intent, storyDna, bookQuestion });

  const questions = plan.questions || buildSceneQuestionPlan({
    scene,
    intent,
    plan: { ...plan, situation },
    chapter,
    sceneIndex,
    sceneCount,
    bookQuestion,
    chapterQuestion,
    prevSceneQuestions: prevScene?.scenePlan?.questions || null,
  });

  const questionRegistry = buildQuestionRegistry({
    intent,
    chapter,
    sceneIndex,
    storyMemory: intent._storyMemory?.memory || intent.storyMemory || {},
  });

  const questionsWithLifecycle = applyQuestionLifecycle({
    questions,
    registry: questionRegistry,
    chapter,
    sceneIndex,
  });

  const reward = plan.reward || buildSceneReward({
    scene,
    intent,
    plan: { ...plan, situation, questions: questionsWithLifecycle },
    sceneIndex,
    storyMemory: intent._storyMemory?.memory || intent.storyMemory || {},
    storyMemoryMetrics: intent._storyMemory?.metrics || intent.storyMemoryMetrics || {},
    prevScenes: (intent.scenes || []).filter((s) => (s.index ?? 0) < sceneIndex),
  });

  const prevEmotionEnd = prevScene?.executionPlan?.emotionCurve?.emotionEnd
    || prevScene?.scenePlan?.emotionCurve?.emotionEnd
    || null;

  const emotionCurve = plan.emotionCurve?.emotionStart
    ? plan.emotionCurve
    : buildSceneEmotionCurvePlan({
      scene,
      sceneIndex,
      sceneCount,
      chapter,
      prevEmotionEnd,
      hookLadder,
    });

  const climaxRole = buildSceneClimaxRole({
    sceneIndex,
    sceneCount,
    climaxPlan: chapterClimax,
  });

  const conflict = plan.conflict?.opponent
    ? plan.conflict
    : buildSceneConflict({
      scene,
      intent,
      plan: { ...plan, situation, questions },
      characterDesire,
      questions,
      chapterClimax,
      climaxRole,
      sceneIndex,
      sceneCount,
      storyDna: storyDna || intent?.storyDna || intent?._storyDna || {},
    });

  return {
    situation,
    questions: questionsWithLifecycle,
    questionRegistry,
    reward,
    characterDesire,
    characterPush,
    emotionCurve,
    conflict,
    climaxRole,
  };
}

/**
 * S8.2：priorityGoal 不再做「唯一最高优先」裁决。
 * 仅透传显式 scene/plan.goal（清洗模板壳）；禁止 desire/mainGoal 竞争排序。
 * 无显式 goal → 空串（缺失 > 假完整）。
 */
export function derivePriorityGoal({ plan = {}, scene = {} } = {}) {
  const slim = (s, n = 180) => {
    const t = String(s || '').trim();
    if (!t) return '';
    return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
  };
  const pick = (...xs) => xs.map((x) => String(x || '').trim()).find(Boolean);

  const sceneGoal = pick(plan.goal, scene.goal);
  if (!sceneGoal || /推进当前现实目标|推进章目标|no_causal_basis/u.test(sceneGoal)) {
    return '';
  }
  const cleaned = sceneGoal
    .replace(/^承接上章推进[：:]/u, '')
    .replace(/^承接上章情绪「[^」]*」/u, '')
    .replace(/^进入现场并确立危机[：:]?/u, '')
    .replace(/^克服阻碍[：:]?/u, '')
    .replace(/^场景[一二三四五六七八九十\d]+[：:]/u, '')
    .replace(/^转折[：:]/u, '')
    .replace(/^章末钩子[：:]/u, '')
    .trim();
  return cleaned.length >= 4 ? slim(cleaned, 180) : '';
}

/**
 * 推导本 Scene 的角色「恐惧」— 仅显式 desire.fear / conflict 展示字段；禁止默认句冒充
 */
export function deriveSceneFear({ desire = {}, conflict = {} } = {}) {
  const pick = (...xs) => xs.map((x) => String(x || '').trim()).find(Boolean);
  const fear = pick(desire.fear, conflict.risk, conflict.cost);
  if (!fear) return '';
  const slim = (s, n = 60) => {
    const t = String(s || '').trim();
    if (!t) return '';
    return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
  };
  return slim(fear, 60);
}

/**
 * 推导本 Scene 的选择（真实两难，非模板）。
 * 2026-08-18（Beat Plan 退化硬化，Step 2）：只认显式 choice；
 * 没有显式 choice 就返回 null —— 禁止用 goal+fear 合成「为了完成『scene goal』…」式的目标复述。
 * 宁可让 choice 缺数据（buildSceneBeatPlan 记入 missing，Prompt Compiler 暴露缺口），也不拿 scene goal 填。
 */
export function deriveSceneChoice({ scene = {}, intent = {}, desire = {} } = {}) {
  const pick = (...xs) => xs.map((x) => String(x || '').trim()).find(Boolean);
  const explicit = pick(scene.choice, scene.plan?.choice, intent.choice, intent.chapterChoice);
  if (explicit) return String(explicit).slice(0, 56);
  return null;
}

function buildPlanFromScene(scene = {}, intent = {}) {
  const sceneIndex = scene.index ?? 1;
  // 保真截断：具体场景目标/冲突是导演/人工计划的权威内容，须完整流入 Beat。
  // 仅做超长截断（>180 字）而非按首句 48 字截断，避免丢失「尸潮战术/病毒植入」等关键细节。
  const slim = (s, n = 180) => {
    if (typeof s === 'object' && s !== null) return s; // 结构化 newInformation 原样通过
    const t = String(s || '').trim();
    if (!t) return '';
    return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
  };
  const raw = scene.scenePlan || {
    // 2026-08-18：不再注入模板默认（'推进章目标'/'外部阻力'/'段末悬念' 等）。
    // 缺失即缺失，由 buildSceneBeatPlan 记入 missing 暴露缺口。
    goal: slim(scene.goal, 180) || slim(intent.mainGoal, 120) || '',
    obstacle: slim(scene.obstacle || scene.conflict || intent.obstacles?.[0], 180) || '',
    escalation: scene.escalation || '',
    choice: scene.choice || null,
    consequence: scene.consequence || scene.cost || null,
    cost: scene.cost || scene.consequence || null,
    reward: scene.reward || null,
    newInformation: slim(scene.newInformation, 40) || '',
    targetEmotion: scene.targetEmotion || null,
    informationGap: scene.informationGap || null,
    promisePointer: scene.promisePointer || null,
    revealPolicy: scene.revealPolicy || {
      allowFirstReveal: sceneIndex <= 1,
      advanceOnly: sceneIndex > 1,
    },
  };
  const plan = migrateScenePlan(raw);
  plan.revealPolicy = raw.revealPolicy || scene.revealPolicy || {
    allowFirstReveal: sceneIndex <= 1,
    advanceOnly: sceneIndex > 1,
  };
  return plan;
}

const STRUCTURAL_LABELS = {
  goal: 'Goal（主角目标）',
  obstacle: 'Obstacle（阻碍）',
  choice: 'Choice（抉择）',
  consequence: 'Consequence（代价落地）',
  newInformation: 'New Information（信息新增）',
  hook: 'Hook（段末悬念）',
  escalation: 'Choice（抉择）',
};

function inferSceneOutcome(scene = {}, intent = {}, plan = {}) {
  const goal = plan.goal || scene.goal || '';
  const obstacle = plan.obstacle || scene.obstacle || '';
  return {
    success: scene.success || scene.sceneOutcome?.success
      || `若达成：${goal}取得可见进展（哪怕只是半步）`,
    failure: scene.failure || scene.sceneOutcome?.failure
      || `若失败：${obstacle}导致代价落地（信用/时间/关系受损）`,
    consequence: scene.consequence || scene.sceneOutcome?.consequence
      || intent.consequence
      || '无论成败，章内状态必须变化：新增一条未解谜团或收紧选择空间',
  };
}

/**
 * 渲染 newInformation：支持结构化 { id, reveal: { object, fact, implication } }（Step 3 点名 schema）。
 * 结构化 → 「{object}：{fact} → 含义：{implication}」；字符串 → 原样截断。
 */
function renderNewInformation(info, n = 48) {
  if (info && typeof info === 'object') {
    const reveal = info.reveal || info;
    const object = String(reveal.object || info.object || info.id || '').trim();
    const fact = String(reveal.fact || reveal.object || '').trim();
    const implication = String(reveal.implication || '').trim();
    const parts = [object || fact, implication ? `含义：${implication}` : ''].filter(Boolean);
    const joined = parts.join('：');
    return joined ? (joined.length <= n ? joined : `${joined.slice(0, n - 1)}…`) : '—';
  }
  const t = String(info || '').trim();
  if (!t) return '—';
  return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
}

function beatContent(structural, plan, hookEntry, sceneType) {
  // 保真截断：保留具体计划内容（180 字内），不再按首句 56 字砍断关键细节
  const slim = (s, n = 180) => {
    if (typeof s === 'object' && s !== null) return renderNewInformation(s, 180);
    const t = String(s || '').trim();
    if (!t) return '—';
    return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
  };
  const map = {
    goal: slim(plan.goal),
    obstacle: slim(plan.obstacle),
    choice: slim(plan.choice),
    consequence: slim(plan.consequence),
    newInformation: renderNewInformation(plan.newInformation, 48),
    hook: slim(plan.cliffhanger),
    escalation: slim(plan.choice),
  };
  const hint = getBeatHint(sceneType, structural);
  let content = map[structural] || '—';
  if (structural === 'hook' && hookEntry) {
    const instr = formatHookLadderInstruction(hookEntry).replace(/\n/g, ' · ');
    content = `${map.hook} · ${instr}`.slice(0, 120);
  }
  // 非首 Scene 的 newInformation：禁止再塞整章高潮句（仍保留具体信息内容）
  if (structural === 'newInformation' && plan.revealPolicy?.advanceOnly) {
    content = slim(plan.newInformation || '推进已揭示信息的后果，禁止「第一次发现」', 180);
  }
  if (hint) content = `${content} · [${sceneType}] ${hint}`;
  return content;
}

function uniqGapList(list = []) {
  const out = [];
  const seen = new Set();
  for (const item of list) {
    const s = String(item || '').trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s.slice(0, 80));
  }
  return out;
}

/**
 * InformationGap 由 Director 写入 ExecutionPlan（非 NarrativeState）
 * Runtime 只读取并验证是否落地
 */
export function buildExecutionInformationGap({
  readerEmotion = null,
  conflict = {},
  questions = {},
  plan = {},
  chapterDir = null,
  scene = {},
} = {}) {
  const seeded = chapterDir?.chapterInformationGap || intentGapFromChapter(chapterDir);
  const fromPlan = plan.informationGap && typeof plan.informationGap === 'object'
    ? plan.informationGap
    : {};
  const fromCurve = readerEmotion?.informationGap || {};

  let readerKnows = uniqGapList([
    ...(seeded?.readerKnows || []),
    ...(fromPlan.readerKnows || []),
    ...(fromCurve.readerKnows || []),
    plan.newInformation,
    questions?.readerQuestion?.readerQuestion,
    questions?.answeredReaderQuestion?.readerQuestion,
    conflict?.risk,
    scene.newInformation,
  ]);
  let heroKnows = uniqGapList([
    ...(seeded?.heroKnows || []),
    ...(fromPlan.heroKnows || []),
    ...(fromCurve.heroKnows || []),
    plan.goal,
  ]);
  let enemyKnows = uniqGapList([
    ...(seeded?.enemyKnows || []),
    ...(fromPlan.enemyKnows || []),
    ...(fromCurve.enemyKnows || []),
    conflict?.opposition,
    conflict?.enemyKnows,
  ]);

  // 铁律：禁止三角色知识完全相同 — Director 负责拆开
  const structure = assertInformationGapMeaningful({ readerKnows, heroKnows, enemyKnows });
  if (!structure.pass && readerKnows.length) {
    // 自动拆差：读者领先 / 敌人片面知 / 主角未必全知
    heroKnows = heroKnows.filter((h) => !readerKnows.includes(h)).slice(0, 3);
    if (!enemyKnows.length) {
      enemyKnows = ['对手只掌握局部行动迹象，不知读者已知的关键'];
    }
    if (!heroKnows.length) {
      heroKnows = ['POV 尚未掌握读者已知的关键'];
    }
  }

  const gap = { readerKnows, heroKnows, enemyKnows };
  const check = assertInformationGapMeaningful(gap);
  return {
    version: 'execution-information-gap-1',
    ...gap,
    dramaticIrony: readerEmotion?.dramaticIrony || null,
    knowledgeGap: readerEmotion?.knowledgeGap || null,
    valid: check.pass,
    rule: '禁止所有角色知道同样的信息 — 须制造 reader/hero/enemy 信息差',
    failReasons: check.failReasons,
  };
}

function intentGapFromChapter(chapterDir = null) {
  if (!chapterDir) return null;
  const q = chapterDir.chapterQuestion?.question
    || chapterDir.chapterQuestion?.text
    || chapterDir.bookQuestion?.question
    || null;
  if (!q) return null;
  return {
    readerKnows: [String(q).slice(0, 60)],
    heroKnows: [],
    enemyKnows: [],
  };
}

/**
 * Emotion Wave：Chapter Director 规划优先，Scene readerEmotion 次之
 * Runtime 不自创下一拍，只消费 Director 规划
 */
function resolveExecutionEmotionWave({
  readerEmotion = null,
  chapterWave = null,
  chapterSceneWave = null,
  sceneIndex = 1,
  beatCount = 6,
} = {}) {
  const fromReader = readerEmotion?.emotionWave || null;
  const chapterSeq = chapterWave?.sequence || chapterWave?.wave || [];

  if (chapterSeq.length || fromReader?.sequence?.length) {
    const baseSeq = fromReader?.sequence?.length
      ? [...fromReader.sequence]
      : [];
    // 若无 scene 级 beat 浪，用章浪从 scene 目标偏移铺满
    let sequence = baseSeq;
    if (sequence.length < beatCount && chapterSeq.length) {
      const startIdx = Math.max(0, chapterSeq.indexOf(chapterSceneWave?.targetEmotion));
      sequence = Array.from({ length: beatCount }, (_, i) =>
        chapterSeq[(startIdx + i) % chapterSeq.length]);
    }
    if (!sequence.length && chapterSeq.length) {
      const startIdx = Math.max(0, (sceneIndex - 1) % chapterSeq.length);
      sequence = Array.from({ length: beatCount }, (_, i) =>
        chapterSeq[(startIdx + i) % chapterSeq.length]);
    }
    if (chapterSceneWave?.targetEmotion && sequence.length) {
      sequence[0] = chapterSceneWave.targetEmotion;
    }

    const beatTargets = sequence.map((targetEmotion, i) => {
      const readerBeat = fromReader?.beatTargets?.[i] || null;
      // 章级语义映射覆盖 sequence[0] 后，reader 原 beatTargets 的 zh 已失效（如 beat1 标「好奇」
      // 实为 Tension）→ 只当 emotion 一致时沿用 reader 标签，否则按最终 targetEmotion 重新映射
      return {
        beatOrder: i + 1,
        targetEmotion,
        zh: readerBeat && readerBeat.targetEmotion === targetEmotion
          ? (readerBeat.zh || mapWaveToZh(targetEmotion))
          : mapWaveToZh(targetEmotion),
        phase: readerBeat?.phase || null,
      };
    });

    return {
      version: fromReader?.version || chapterWave?.version || 'emotion-wave-1',
      sequence,
      beatTargets,
      start: sequence[0],
      end: sequence[sequence.length - 1],
      pattern: fromReader?.pattern || chapterWave?.pattern || '压 → 放 → 压 → 放 → 爆',
      source: chapterSeq.length ? 'chapter-director+scene' : 'scene-reader-emotion',
      sceneTargetEmotion: chapterSceneWave?.targetEmotion || null,
      valid: Boolean(sequence.length),
      failReasons: fromReader?.failReasons || [],
    };
  }

  return fromReader;
}

/**
 * Narrative Beat 规划字段（Director → Writer；不含 StoryState 缓存）
 */
export function buildNarrativeBeatPlan({
  plan = {},
  conflict = {},
  reward = {},
  informationGap = null,
  promisePointer = null,
  targetEmotion = null,
  readerEmotion = null,
  narrativeRewardText = null,
} = {}) {
  const rewardText = narrativeRewardText
    || (typeof plan.narrativeRewardText === 'string' ? plan.narrativeRewardText : null)
    || (typeof plan.reward === 'string' ? plan.reward : null)
    || reward?.payoff
    || reward?.promise
    || '';

  return {
    version: 'narrative-beat-plan-1',
    goal: plan.goal || '',
    conflict: plan.obstacle || conflict?.opposition || '',
    choice: plan.choice || '',
    cost: plan.cost || plan.consequence || '',
    reward: rewardText,
    escalation: plan.escalation || conflict?.escalation || '',
    targetEmotion: targetEmotion
      || plan.targetEmotion
      || readerEmotion?.emotionWave?.sequence?.[0]
      || null,
    informationGap,
    promisePointer: promisePointer || plan.promisePointer || null,
    rule: 'InformationGap 属 ExecutionPlan；Emotion Wave 由 Director 规划；不接 Promise Registry',
  };
}

/**
 * 构建 Scene 顺序执行计划 — Writer 必须逐 Beat 完成，每 Beat 须状态变化
 */
export function buildSceneExecutionPlan({
  scene = {},
  intent = {},
  hookLadder = null,
  prevSceneLastLibraryBeat = null,
  sceneType = null,
  chapter = null,
  storyDna = {},
  chapterDir = null,
} = {}) {
  const sceneIndex = scene.index ?? 1;
  const sceneCount = intent.scenes?.length || intent.sceneCount || 4;
  const chapterClimax = chapterDir?.chapterClimax
    || intent._chapterDirector?.chapterClimax
    || null;
  const chapterRhythm = chapterDir?.chapterRhythm
    || intent._chapterDirector?.chapterRhythm
    || null;
  const chapterAuthorGoal = chapterDir?.chapterAuthorGoal
    || intent._chapterDirector?.chapterAuthorGoal
    || null;
  const wordTarget = scene.wordTarget || 800;
  const resolvedSceneType = sceneType || scene.sceneType || inferSceneTypeForExecution(scene, intent);
  const plan = scene.scenePlan?.goal
    ? migrateScenePlan(scene.scenePlan)
    : buildPlanFromScene(scene, intent);
  if (!plan.revealPolicy) {
    plan.revealPolicy = scene.revealPolicy || {
      allowFirstReveal: sceneIndex <= 1,
      advanceOnly: sceneIndex > 1,
    };
  }
  const wordShare = resolveWordShare(resolvedSceneType);
  const customPools = resolveLibraryPools(resolvedSceneType, null);
  const libraryMap = assignLibraryBeats(sceneIndex, {
    prevLastType: prevSceneLastLibraryBeat,
    customPools: customPools || undefined,
    preferLibraryBeats: intent._readerPreference?.libraryPrefer
      || intent.readerPreference?.libraryPrefer
      || null,
  });
  const outcome = inferSceneOutcome(scene, intent, plan);

  const prevScene = (intent.scenes || []).find((s) => s.index === sceneIndex - 1);

  const engines = buildSceneEngineBundle({
    scene,
    intent,
    plan,
    chapter,
    sceneIndex,
    sceneCount,
    storyDna,
    hookLadder,
    prevScene,
    chapterClimax,
    chapterRhythm,
  });

  const {
    situation, questions, questionRegistry, reward, characterDesire, characterPush,
    emotionCurve, conflict, climaxRole,
  } = engines;
  plan.situation = situation;
  plan.questions = questions;
  plan.reward = reward;
  plan.conflict = conflict;

  if (conflict?.opposition) {
    plan.obstacle = conflict.opposition;
  }

  // S8.2：priorityGoal = 显式 scene.goal 透传，禁止 desire 竞争压缩为「唯一最高优先」
  const priorityGoal = derivePriorityGoal({ plan, scene });
  // choice：只认显式（deriveSceneChoice）；consequence：只认 authored，禁止 conflict.cost 升格
  const isTemplateChoice = !plan.choice
    || /必须做出选择|有限选项|二选一|冲突升级|代价逼近|外部阻力|no_causal_basis/u.test(plan.choice)
    || (plan.escalation && plan.choice === plan.escalation);
  if (isTemplateChoice) {
    plan.choice = deriveSceneChoice({ scene, intent, desire: characterDesire });
    if (!plan.choice) plan._choiceMissing = true;
  }
  const authoredConsequence = String(plan.consequence || scene.consequence || plan.cost || scene.cost || '').trim();
  const isTemplateConsequence = !authoredConsequence
    || /选择产生可见代价|局面因此改变|no_causal_basis/u.test(authoredConsequence);
  if (isTemplateConsequence) {
    // 缺失 > 假完整：不把 conflict.cost / inferCost 升为 Choice consequence
    plan.consequence = '';
    plan._consequenceMissing = true;
  } else {
    plan.consequence = authoredConsequence.slice(0, 180);
  }
  plan.cost = plan.consequence || '';

  const hookEntryRaw = hookLadder?.find((h) => h.sceneIndex === sceneIndex)
    || getSceneHookLadderEntry(sceneIndex, sceneCount, chapter, 0, storyDna);
  const hookOutput = buildActionHookOutput(
    hookEntryRaw.hookOutput || buildHookOutput(hookEntryRaw),
    { plan: { ...plan, situation, questions }, scene, intent, hookEntry: hookEntryRaw },
  );
  const hookEntry = { ...hookEntryRaw, hookOutput, ...hookOutput };

  const prevWaveEnd = prevScene?.executionPlan?.readerEmotion?.emotionWave?.end
    || prevScene?.executionPlan?.emotionWave?.end
    || null;

  const readerEmotion = buildReaderEmotionCurve({
    characterEmotionCurve: emotionCurve,
    plan,
    scene,
    questions,
    conflict,
    hookOutput,
    situation,
    beatCount: STRUCTURAL_BEATS.length,
    priorWaveEnd: prevWaveEnd,
    sceneIndex,
  });

  const promiseLifecycle = buildScenePromiseLifecycle({
    reward,
    hookOutput,
    plan,
    scene,
    chapter,
    sceneIndex,
    sceneCount,
    prevScenes: (intent.scenes || []).filter((s) => (s.index ?? 0) < sceneIndex),
  });

  // promisePointer：仅轻量指针（scene/plan/chapter/reward id），不接 Promise Registry
  const chapterNarrative = chapterDir?.chapterNarrativePlan
    || intent._chapterDirector?.chapterNarrativePlan
    || null;
  const chapterWave = chapterDir?.chapterEmotionWave
    || intent._chapterDirector?.chapterEmotionWave
    || chapterNarrative?.emotionWave
    || null;
  const chapterSceneWave = chapterWave?.sceneTargets?.find((s) => s.sceneIndex === sceneIndex)
    || null;

  const promisePointer = plan.promisePointer
    || scene.promisePointer
    || chapterDir?.promisePointer
    || chapterNarrative?.promisePointer
    || chapterDir?.chapterPromisePlan?.promisePointer
    || intent._chapterDirector?.chapterPromisePlan?.promisePointer
    || intent._chapterDirector?.promisePointer
    || reward?.promiseId
    || null;

  // InformationGap：Scene → Plan → Chapter Director
  const informationGap = buildExecutionInformationGap({
    readerEmotion,
    conflict,
    questions,
    plan: {
      ...plan,
      informationGap: plan.informationGap
        || scene.informationGap
        || chapterNarrative?.informationGap
        || null,
    },
    chapterDir: chapterDir || intent._chapterDirector,
    scene,
  });

  // Emotion Wave：优先 Chapter Director 规划，再 Scene readerEmotion.wave
  const emotionWave = resolveExecutionEmotionWave({
    readerEmotion,
    chapterWave,
    chapterSceneWave,
    sceneIndex,
    beatCount: STRUCTURAL_BEATS.length,
  });
  const waveTargets = emotionWave?.beatTargets || [];

  // 章级 Narrative 字段下沉：Scene 缺省时用 Chapter 规划填充 plan 语义
  const planWithChapter = {
    ...plan,
    goal: plan.goal || chapterNarrative?.goal || '',
    obstacle: plan.obstacle || chapterNarrative?.conflict || '',
    choice: plan.choice || chapterNarrative?.choice || '',
    cost: plan.cost || plan.consequence || chapterNarrative?.cost || '',
    consequence: plan.consequence || plan.cost || chapterNarrative?.cost || '',
    escalation: plan.escalation || chapterNarrative?.escalation || '',
    // plan.reward 可能是引擎对象；叙事 reward 用章级字符串
    narrativeRewardText: (typeof plan.reward === 'string' ? plan.reward : null)
      || chapterNarrative?.reward
      || null,
  };

  const narrativeBeatPlan = buildNarrativeBeatPlan({
    plan: planWithChapter,
    conflict,
    reward,
    informationGap,
    promisePointer,
    targetEmotion: waveTargets[0]?.targetEmotion
      || chapterSceneWave?.targetEmotion
      || emotionWave?.start
      || chapterNarrative?.targetEmotion
      || null,
    readerEmotion,
    narrativeRewardText: planWithChapter.narrativeRewardText,
  });

  // ExecutionPlan 顶层叙事字段（与 narrativeBeatPlan 对齐，便于下游只读）
  const narrativeFields = {
    choice: narrativeBeatPlan.choice,
    cost: narrativeBeatPlan.cost,
    escalation: narrativeBeatPlan.escalation,
    targetEmotion: narrativeBeatPlan.targetEmotion,
    informationGap,
    promisePointer,
  };

  const prevTransformation = prevScene?.executionPlan?.characterTransformation
    || prevScene?.scenePlan?.characterTransformation
    || null;

  const characterTransformation = buildSceneCharacterTransformation({
    desire: characterDesire,
    plan,
    scene,
    situation,
    prevTransformation,
  });

  const characterBehavior = buildChoiceBehaviorLogic({
    desire: characterDesire,
    plan,
    scene,
    characterTransformation,
    storyDna,
  });

  const readerSatisfaction = buildReaderSatisfaction({
    questions,
    reward,
    promiseLifecycle,
    chapter,
    sceneIndex,
    sceneCount,
  });

  const sceneRhythm = getSceneRhythmRole({
    sceneIndex,
    chapterRhythm,
    sceneCount,
  });

  const sceneEnding = selectSceneEnding({
    sceneIndex,
    sceneCount,
    chapter,
    plan,
    scene,
    intent,
    climaxRole,
  });

  const sceneEntertainment = buildSceneEntertainment({
    plan,
    scene,
    storyDna,
    intent,
    climaxRole,
    sceneEnding,
    characterBehavior,
    conflict,
    sceneIndex,
    chapter: chapter || 1,
  });

  if (sceneEnding?.cliffhangerHint && !plan.cliffhanger) {
    plan.cliffhanger = sceneEnding.cliffhangerHint;
  }

  let beatStatePlans = buildSceneBeatPlans({ ...plan, situation, questions });
  beatStatePlans = buildSituationBeatChain(situation, beatStatePlans);

  const beats = STRUCTURAL_BEATS.map((structural, order) => {
    const rawLibrary = libraryMap[structural] || libraryMap.escalation;
    // F7.1: Decision only on choice structural beat (or authored concrete choice on plan)
    const authoredChoice = structural === 'choice' && Boolean(
      String(plan?.choice || planWithChapter?.choice || '').trim(),
    );
    const libraryBeat = sanitizeLibraryBeat(structural, rawLibrary, { authoredChoice });
    const wordBudget = Math.max(70, Math.round(wordTarget * (wordShare[structural] || 0.14)));
    const beatStatePlan = beatStatePlans[order]
      || buildSceneBeatPlan(structural, plan, {
        priorAfterState: beatStatePlans[order - 1]?.afterState,
      });
    const waveBeat = waveTargets[order] || null;
    const targetEmotion = waveBeat?.targetEmotion
      || emotionWave?.sequence?.[order]
      || null;
    return {
      order: order + 1,
      id: structural,
      structuralBeat: structural,
      label: STRUCTURAL_LABELS[structural],
      libraryBeat,
      libraryInstruction: libraryBeatInstruction(libraryBeat, structural, { authoredChoice }),
      content: beatContent(structural, plan, structural === 'hook' ? hookEntry : null, resolvedSceneType),
      wordBudget,
      hookLadder: structural === 'hook' ? hookEntry : null,
      hookOutput: structural === 'hook' ? (hookEntry?.hookOutput || buildHookOutput(hookEntry)) : null,
      isRewardBeat: structural === (reward.deliveryBeat || 'newInformation'),
      reward: structural === (reward.deliveryBeat || 'newInformation') ? reward : null,
      sceneTypeHint: getBeatHint(resolvedSceneType, structural),
      mustCompleteBeforeNext: true,
      beatPlan: beatStatePlan,
      beforeState: beatStatePlan?.beforeState,
      action: beatStatePlan?.action,
      // 2026-08-18（Step 2）：choice 只属于「choice」拍且只认具体两难；
      // 禁止 scene goal/模板经 planWithChapter.choice 回落到任何拍（含 goal/obstacle 拍）。
      choice: structural === 'choice' ? (beatStatePlan?.choice || null) : null,
      consequence: beatStatePlan?.consequence,
      cost: planWithChapter.cost || planWithChapter.consequence || beatStatePlan?.consequence || null,
      escalation: planWithChapter.escalation || null,
      afterState: beatStatePlan?.afterState,
      stateChange: beatStatePlan?.stateChange ?? true,
      requiredDimension: beatStatePlan?.requiredDimension,
      // Director 规划：情绪浪目标 + 信息差指针（Runtime 校验，不由 Runtime 改写）
      targetEmotion,
      targetEmotionZh: waveBeat?.zh || null,
      informationGap,
      promisePointer: structural === 'newInformation' || structural === 'consequence'
        ? promisePointer
        : (structural === 'hook' ? promisePointer : null),
    };
  });

  for (const b of beats) {
    if (b.structuralBeat === 'hook' && sceneEnding?.writerMust) {
      b.content = `${b.content} · ${sceneEnding.writerMust}`;
    }
    if (b.structuralBeat === 'choice' && characterTransformation?.writerMust) {
      b.content = `${b.content} · ${characterTransformation.writerMust}`;
    }
    if (b.structuralBeat === 'choice' && characterBehavior?.behaviorLogic && !characterBehavior.missing) {
      const bl = characterBehavior.behaviorLogic;
      const motiveBits = [bl.desire, bl.fear].filter(Boolean).join(' / ');
      if (motiveBits) {
        b.content = `${b.content} · 显式动机字段：${motiveBits.slice(0, 40)}（禁止补隐藏理由）`;
      }
      b.behaviorLogic = bl;
      b.characterBehavior = characterBehavior;
    } else if (b.structuralBeat === 'choice' && characterBehavior?.missing) {
      b.content = `${b.content} · behavior basis missing（禁止编造私人动机）`;
      b.characterBehavior = characterBehavior;
    }
    if (b.structuralBeat === 'goal' && sceneEntertainment?.entertainment?.visualMoment) {
      b.content = `${b.content} · 视觉瞬间：${sceneEntertainment.entertainment.visualMoment.slice(0, 40)}`;
    }
    if (b.structuralBeat === 'newInformation' && sceneEntertainment?.entertainment?.surpriseMoment) {
      b.content = `${b.content} · 反转瞬间：${sceneEntertainment.entertainment.surpriseMoment.slice(0, 40)}`;
    }
    if (b.structuralBeat === 'hook' && sceneEntertainment?.entertainment?.dialogueMoment) {
      b.content = `${b.content} · 对白瞬间：${sceneEntertainment.entertainment.dialogueMoment.slice(0, 36)}`;
    }
    // S8.2-R4-B：conflict irreversible 不得进入 consequence 指令当 Choice 后果
    if (b.structuralBeat === 'obstacle' && conflict?.irreversibleChange) {
      b.content = `${b.content} · Conflict potential, not Choice consequence：${conflict.irreversibleChange.slice(0, 45)}`;
    }
  }

  // Tension Arc：按 genre 选 profile → 每 Beat tensionLevel + craftMode
  const tensionArc = buildTensionArc({
    storyDna,
    genre: storyDna?.genre || intent?.genre || '',
    beatCount: beats.length,
    chapterDir: intent?._chapterDirector || null,
    intent,
  });
  const tensedBeats = applyTensionArcToBeats(beats, tensionArc);

  // Hook Type 强制轮换：禁止相邻同型
  const { beats: rotatedBeats, hookRotation } = applyHookTypeRotation(tensedBeats, {
    sceneHookType: hookEntry?.type || hookEntry?.id || hookEntry?.hookType || null,
  });

  const writerRuntime = buildSceneWriterRuntime({
    beats: rotatedBeats,
    emotionCurve,
    sceneRhythm,
    climaxRole,
    readerEmotion,
    scenePlan: plan,
    scene,
    storyDna,
    sceneEnding,
    characterTransformation,
    hookOutput: hookEntry?.hookOutput,
    conflict,
    sceneIndex,
    wordTarget,
  });

  const enrichedBeats = writerRuntime.beats;

  const humanWritingPolicy = buildHumanWritingPolicy({
    sceneRhythm,
    climaxRole,
    authorMode: writerRuntime.authorMode,
  });

  const writerSceneArc = buildWriterSceneArc({
    executionPlan: {
      scenePlan: plan,
      situation,
      reward,
      hookOutput,
      conflict,
    },
    conflict,
    reward,
    hookOutput,
  });

  writerRuntime.professionalScene = buildProfessionalSceneWriting({
    beats: enrichedBeats,
    sceneIndex,
    sceneCount,
    wordTarget,
  });

  const libraryTypesUsed = [...new Set(enrichedBeats.map((b) => b.libraryBeat))];

  // Step 4：Beat Plan Degeneration 检测——连续两拍空洞即退化，随 executionPlan 暴露给
  // Prompt Compiler / Studio 预览，不允许空洞计划无声进入 Writer。
  const planDegeneration = validateBeatPlanDegeneration(enrichedBeats);

  // P3.4-1：revealPolicy / narrativeRewardText 是 0 消费者输出槽——只从 scenePlan 出口剔除。
  // 局部计算保留：buildNarrativeBeatPlan 读 planWithChapter.narrativeRewardText（:821）、
  // beatContent 读 plan.revealPolicy（:406）、构建期 :639-644 仍设置在局部 plan 上。
  // P3.5-1：authorIntent 双载体收敛——② executionPlan.scenePlan.authorIntent 是 ④ 的冗余传播
  // （唯一消费者 beat-slimmer:606-609 已改读 scene?.scenePlan?.authorIntent 单链）。
  // source（scene.authorIntent）+ ④（scene.scenePlan.authorIntent）保留。
  const scenePlanView = { ...planWithChapter };
  delete scenePlanView.revealPolicy;
  delete scenePlanView.narrativeRewardText;
  delete scenePlanView.authorIntent;

  return {
    version: 'scene-execution-10',
    planDegeneration,
    sceneIndex,
    sceneId: scene.id,
    sceneType: resolvedSceneType,
    wordTarget,
    beats: enrichedBeats,
    beatStatePlans,
    libraryTypesUsed,
    libraryBeatCount: libraryTypesUsed.length,
    tensionArc,
    hookRotation,
    hookLadderEntry: hookEntry,
    hookOutput: hookEntry?.hookOutput || null,
    situation,
    questions,
    questionRegistry,
    reward,
    characterDesire,
    characterPush,
    emotionCurve,
    readerEmotion,
    emotionWave,
    informationGap,
    narrativeBeatPlan,
    // 顶层叙事字段（模块 4 / 1.5）
    // P3.3：顶层 choice/narrativeReward 投影全仓 0 消费者 → 删。
    // choice 经 plan.choice（owner）/scenePlan.choice（嵌套）/narrativeBeatPlan.choice（brief）/beat 渲染保留。
    cost: narrativeFields.cost,
    escalation: narrativeFields.escalation,
    targetEmotion: narrativeFields.targetEmotion,
    promisePointer,
    chapterNarrativePlan: chapterNarrative,
    promiseLifecycle,
    writerSceneArc,
    writerRuntime,
    characterTransformation,
    characterBehavior,
    sceneEntertainment,
    humanWritingPolicy,
    readerSatisfaction,
    sceneRhythm,
    sceneEnding,
    chapterRhythm,
    chapterAuthorGoal,
    conflict,
    climaxRole,
    chapterClimax,
    // P3.4-1：顶层 tensionRewardThreat 全仓 0 消费者（reward 真实读点是 narrativeBeatPlan.reward）→ 删。
    sceneOutcome: outcome,
    // P3.2 C2：priorityGoal 收敛到嵌套 scenePlan 单层 owner（顶层投影删）；
    // sceneFear 顶层+嵌套双删（全仓 0 代码消费者，纯归档 render slot）。
    scenePlan: {
      ...scenePlanView,
      priorityGoal,
      situation,
      questions,
      questionRegistry,
      reward,
      characterDesire,
      characterPush,
      emotionCurve,
      readerEmotion,
      emotionWave,
      informationGap,
      // P3.4-1：嵌套 scenePlan.narrativeBeatPlan 镜像 0 消费者（SD brief 唯一读点=顶层）→ 删。
      choice: narrativeFields.choice,
      cost: narrativeFields.cost,
      escalation: narrativeFields.escalation,
      targetEmotion: narrativeFields.targetEmotion,
      promisePointer,
      promiseLifecycle,
      writerSceneArc,
      writerRuntime,
      characterTransformation,
      characterBehavior,
      sceneEntertainment,
      humanWritingPolicy,
      readerSatisfaction,
      sceneRhythm,
      sceneEnding,
      chapterAuthorGoal,
      conflict,
      climaxRole,
    },
    rules: [
      'Writer 必须按 Beat 顺序执行，完成当前 Beat 后才能进入下一 Beat',
      '**Scene Arc**：Goal → Conflict → Choice → Consequence → Reward → New Threat',
      '**每 Beat 须改变 ≥2 项状态**：人物 · 关系 · 世界 · 信息 · 资源 · 危险',
      '**P1 铁律**：Character Goal + Conflict（代价型）+ 三维 Situation + Reader Emotion + Action Hook',
      '**信息差铁律**：禁止所有角色知道同样信息 — 执行 ExecutionPlan.informationGap',
      narrativeFields.choice ? `**choice**：${String(narrativeFields.choice).slice(0, 50)}` : '',
      narrativeFields.cost ? `**cost**：${String(narrativeFields.cost).slice(0, 50)}` : '',
      narrativeFields.escalation ? `**escalation**：${String(narrativeFields.escalation).slice(0, 50)}` : '',
      narrativeFields.targetEmotion ? `**targetEmotion**：${narrativeFields.targetEmotion}` : '',
      emotionWave?.sequence?.length
        ? `**Emotion Wave（Director 规划）**：${emotionWave.sequence.join(' → ')} — Runtime 只校验偏离，不改写下一拍`
        : '',
      informationGap?.valid === false
        ? `⚠️ **InformationGap 无效**：${(informationGap.failReasons || []).join('；')}`
        : '',
      promisePointer ? `**promisePointer**：优先兑现 ${promisePointer}` : '',
      writerSceneArc?.bans?.length
        ? `**禁止**：${writerSceneArc.bans.slice(0, 3).join('；')}`
        : '',
      readerEmotion?.dramaticIrony
        ? `**读者情绪/信息差**：${readerEmotion.dramaticIrony.slice(0, 60)}`
        : '',
      promiseLifecycle?.payoff?.payoff
        ? `**Promise Payoff**：${promiseLifecycle.payoff.payoff.slice(0, 45)}`
        : '',
      promiseLifecycle?.newPromise?.text
        ? `**New Promise**：${promiseLifecycle.newPromise.text.slice(0, 45)}`
        : '',
      questions?.lifecycle?.activeCount != null
        ? `**Question Lifecycle**：活跃 ${questions.lifecycle.activeCount} 条（须回答/收口/过期）`
        : '',
      conflict?.cost
        ? (conflict.costAuthored
          ? `**Authored conflict cost（可展示，≠ 自动 Choice consequence）**：${conflict.cost.slice(0, 55)}`
          : `**Conflict potential, not Choice consequence**：${conflict.cost.slice(0, 55)}`)
        : '',
      conflict?.irreversibleChange
        ? `**Conflict potential, not Choice consequence**：${conflict.irreversibleChange.slice(0, 50)}`
        : '',
      characterTransformation?.writerMust
        ? `**人物转变**：${characterTransformation.writerMust.slice(0, 55)}`
        : '',
      characterBehavior && !characterBehavior.missing && characterBehavior.behaviorLogic?.desire
        ? `**显式欲望字段**：${characterBehavior.behaviorLogic.desire.slice(0, 40)}`
        : characterBehavior?.missing
          ? '**behavior**：basis missing'
          : '',
      sceneEntertainment?.entertainment?.visualMoment
        ? `**场景好看**：视觉「${sceneEntertainment.entertainment.visualMoment.slice(0, 28)}」· 反转「${sceneEntertainment.entertainment.surpriseMoment?.slice(0, 28) || ''}」`
        : '',
      humanWritingPolicy?.flowMust
        ? `**真人写法**：${humanWritingPolicy.flowMust} — 禁情绪总结/解释人物/写全因果`
        : '',
      chapterAuthorGoal?.mainFeeling
        ? `**章作者目标**：${chapterAuthorGoal.readerEmotionStart}→${chapterAuthorGoal.readerEmotionEnd} · ${chapterAuthorGoal.mustRemember?.slice(0, 30)}`
        : '',
      readerSatisfaction?.payoff
        ? `**读者满足**：${readerSatisfaction.payoff.slice(0, 45)}`
        : '',
      sceneRhythm?.writerHint ? `**节奏**：${sceneRhythm.label} — ${sceneRhythm.writerHint}` : '',
      sceneEnding?.label ? `**结尾模式**：${sceneEnding.label}` : '',
      climaxRole?.isClimax && chapterClimax?.storyShift
        ? `**章高潮位移**：${chapterClimax.storyShift.slice(0, 55)}`
        : '',
      `**角色推进**：${characterPush.scenePush || characterDesire.externalGoal}`,
      `**情绪弧**：${emotionCurve.emotionStart} → ${emotionCurve.emotionMiddle} → ${emotionCurve.emotionPeak} → ${emotionCurve.emotionEnd}`,
      '**故事推进铁律**：完成标准不是 Beat 写完，而是世界+人物+关系至少两项改变',
      `**世界**：${situation.worldState?.before || situation.openingWorldState} → ${situation.worldState?.after || situation.closingWorldState}`,
      situation.characterState?.before
        ? `**人物**：${situation.characterState.before} → ${situation.characterState.after}`
        : '',
      situation.relationshipState?.before
        ? `**关系**：${situation.relationshipState.before} → ${situation.relationshipState.after}`
        : '',
      situation.stagnant || (situation.dimensionsChanged ?? 0) < 2
        ? '⚠️ **警告**：三维状态不足，Writer 须补足人物/关系变化'
        : '',
      `**须回答 Reader Question**：${questions.answeredReaderQuestion?.readerQuestion || questions.answeredQuestion || '—'}`,
      `**须提出 Reader Question ×2**：${(questions.newReaderQuestions || []).map((q) => q.readerQuestion).join(' · ') || (questions.newQuestions || []).join(' · ') || '—'}`,
      '**商业原则1**：不写「事件发生」，写「事件改变局势」— 每 Beat After ≠ Before',
      '**商业原则2**：问题 →（有 authored consequence 才写代价）→ 获得奖励 — Reward Beat 须让读者感到「赚到了」',
      '**商业原则3**：紧张 → 释放 → 更大危机 — 禁止连续加压无释放',
      '**商业原则4**：本 Scene 须回答「为什么读者现在必须继续看？」',
      '**Scene 心理节奏**：Tension → Reward → New Threat — 禁止全程紧张无释放',
      `**读者奖励**：Promise → Payoff — ${reward.valid ? `兑现「${reward.promise?.slice(0, 30)}」→ ${reward.payoff?.slice(0, 30)}` : '⚠ 须绑定 Story Memory Promise'}`,
      '**Beat 状态铁律**：每个 Beat 必须 Before State → Action → After State，且 After ≠ Before',
      '**每 Beat ≥2 维状态变化** — 禁止只改一项或零变化',
      '禁止原地踏步：不得「调查异常→发现异常→继续调查」式重复',
      '**输出链**：第一屏抓人 → 持续升级 → 获得奖励 → 新危机 → 章尾逼翻页',
      '**优先**：动作 > 对白 > 事件 — 禁止解释剧情、重复信息、总结心理',
      '**六段节奏**：Goal → Obstacle → Choice → Consequence → New Information → Hook',
      `Scene Type \`${resolvedSceneType}\` — Beat 权重按类型动态调整`,
      '**去 AI 味**：多写动作与对白，身体动作优先于心理描写',
      `本 Scene 使用 ${libraryTypesUsed.length} 种 Library Beat：${libraryTypesUsed.join('、')}`,
      '禁止连续两个 Beat 使用同类型 Library Beat',
      '每个 Beat 完成后须继承前序 Beat Memory Context，禁止矛盾或遗忘',
    ].filter(Boolean),
  };
}

export function buildBeatExecutionPromptBlock(executionPlan) {
  if (!executionPlan?.beats?.length) return '';

  const lines = [
    '<!-- scene-beat-execution-plan -->',
    '## Scene Beat Execution · 状态变化强约束',
    '',
    '**Writer 不得自由发挥**：每 Beat 只写当前段，且必须改变故事状态。',
    '',
    ...(executionPlan.planDegeneration?.degenerate
      ? [
          '⚠️ **Beat Plan 退化**（连续两拍无具体动作/抉择/新信息）——缺口拍必须由 Writer 补上具体内容，禁止用「继续/推进/制造/释放」填空；补不上按硬失败拒稿：',
          ...executionPlan.planDegeneration.issues.slice(0, 3),
          '',
        ]
      : []),
    ...executionPlan.rules.map((r) => `- ${r}`),
    '',
    formatBeatStateSequenceBlock(executionPlan.beatStatePlans),
    '',
    formatSituationBlock(executionPlan.situation),
    formatQuestionBlock(executionPlan.questions),
    '',
    formatTensionRewardThreatBlock(executionPlan.reward),
    executionPlan.reward?.type ? formatRewardBlock(executionPlan.reward) : '',
    '',
    '### Success / Failure / Consequence（Scene 必须推动故事）',
    `- **Success**：${executionPlan.sceneOutcome.success}`,
    `- **Failure**：${executionPlan.sceneOutcome.failure}`,
    `- **Consequence（必须落地）**：${executionPlan.sceneOutcome.consequence}`,
    '',
    executionPlan.sceneType ? `- **Scene Type**：${executionPlan.sceneType}` : '',
    '',
    '### Beat 序列',
  ].filter(Boolean);

  if (executionPlan.informationGap) {
    const g = executionPlan.informationGap;
    lines.push(
      '',
      '### Information Gap（Director 规划 · Runtime 校验落地）',
      `- readerKnows：${(g.readerKnows || []).slice(0, 2).join('；') || '—'}`,
      `- heroKnows：${(g.heroKnows || []).slice(0, 2).join('；') || '—'}`,
      `- enemyKnows：${(g.enemyKnows || []).slice(0, 2).join('；') || '—'}`,
      `- 铁律：${g.rule || '禁止所有角色知道同样的信息'}`,
      '',
    );
  }

  for (const b of executionPlan.beats) {
    lines.push(
      `${b.order}. **${b.label}** · Library \`${b.libraryBeat}\``,
      b.writerIntent ? `   - **Writer Intent**：${b.writerIntent}` : '',
      b.targetEmotion ? `   - **targetEmotion**：${b.targetEmotion}${b.targetEmotionZh ? `（${b.targetEmotionZh}）` : ''}` : '',
      `   - Before：${b.beforeState || '—'}`,
      `   - Action：${b.action || b.content}`,
      b.choice ? `   - Choice：${b.choice}` : '',
      b.cost ? `   - Cost：${String(b.cost).slice(0, 50)}` : '',
      `   - After：${b.afterState || '—'}`,
      `   - 字数预算：约 ${b.wordBudget} 字`,
    );
    if (b.hookOutput) {
      lines.push(`   - Hook Output：type=${b.hookOutput.type} · Q=${b.hookOutput.readerQuestion?.slice(0, 40)}`);
    }
    if (b.isRewardBeat && b.reward) {
      lines.push(`   - Payoff：${b.reward.payoff?.slice(0, 50) || b.reward.description?.slice(0, 50)} ← Promise: ${b.reward.promise?.slice(0, 30) || '—'}`);
    }
    if (b.hookOutput?.actionDeadline) {
      lines.push(`   - Action Hook：${b.hookOutput.actionDeadline?.slice(0, 50)} · 倒计时 ${b.hookOutput.countdown || '—'}`);
    }
    if (b.sceneTypeHint) {
      lines.push(`   - 类型提示：${b.sceneTypeHint}`);
    }
  }

  return lines.filter(Boolean).join('\n');
}
