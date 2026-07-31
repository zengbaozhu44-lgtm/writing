/**
 * Chapter Director — 章级 Reader Addiction 曲线规划
 * Hook / Mystery / Payoff 三条曲线 + 上章 Reader Curve 反馈
 */
import { buildChapterCurvePlan } from './reader-curve.js';
import { buildChapterHookLadder, formatHookLadderBrief } from './hook-ladder.js';
import { loadReaderCurveReport } from './review-report.js';
import {
  getReaderFeedbackAdjustmentsForChapter,
  buildAdjustedChapterCurvePlan,
  buildReaderFeedbackDirectorBlock,
  loadReaderFeedbackState,
} from './reader-feedback.js';
import {
  buildBookQuestion,
  buildChapterQuestion,
  formatChapterQuestionBlock,
} from './question-engine.js';
import { loadDirectorOverrides } from './adaptive-planner.js';
import { formatAdaptiveDirectorBrief } from './writer-first.js';
import {
  buildChapterClimaxPlan,
  formatChapterClimaxBlock,
  formatClimaxBrief,
} from './climax-engine.js';
import {
  buildChapterPromisePlan,
  formatChapterPromisePlanBlock,
} from './promise-lifecycle.js';
import {
  buildChapterReaderSatisfaction,
  formatChapterReaderSatisfactionBlock,
} from './reader-satisfaction.js';
import {
  buildChapterRhythmPlan,
  formatChapterRhythmBlock,
} from './chapter-rhythm.js';
import {
  buildChapterAuthorGoal,
  formatChapterAuthorGoalBlock,
} from './chapter-author-goal.js';
import {
  buildEmotionWavePlan,
  EMOTION_WAVE,
} from './reader-emotion-engine.js';
import { assertInformationGapMeaningful } from './narrative-runtime.js';
import {
  buildChapterBlueprint,
  formatChapterBlueprintBrief,
  answerBlueprintFourQuestions,
} from './chapter-blueprint.js';

function formatCurveLine(name, curve, requirement) {
  if (!curve?.length) return null;
  const pts = curve.map((p) => `S${p.sceneIndex}:${p.target}${p.note ? `(${p.note})` : ''}`).join(' → ');
  return [`- **${name}**：${pts}`, requirement ? `  ${requirement}` : null].filter(Boolean).join('\n');
}

function buildCurveRequirements() {
  return [
    '**曲线铁律（本章）**：',
    '- **Hook Curve**：逐 Scene 递进，末 Scene 为章内峰值 — Hook 必须越来越强',
    '- **Mystery Curve**：疑问逐 Scene 加深 — Mystery 必须越来越深，禁止断档',
    '- **Payoff Curve**：中段起持续兑现伏笔 — Payoff 必须持续兑现，不可只埋不收',
  ].join('\n');
}

function buildPriorChapterGuidanceBlock(priorCurve = null, chapter = null) {
  if (!priorCurve) return null;
  const guidance = priorCurve.nextChapterGuidance || [];
  const metrics = priorCurve.averages || {};
  const lines = [
    `### 上章 Reader Curve 反馈（第 ${(chapter ?? 1) - 1} 章 → 本章输入）`,
    priorCurve.readerAddictionScore != null
      ? `- **Reader Addiction Score**：${priorCurve.readerAddictionScore}/100`
      : null,
    metrics.hookDensity != null ? `- Hook Density：${metrics.hookDensity}` : null,
    metrics.questionDensity != null ? `- Question Density：${metrics.questionDensity}` : null,
    metrics.payoffDensity != null ? `- Payoff Density：${metrics.payoffDensity}` : null,
    metrics.readerCuriosity != null ? `- Reader Curiosity：${metrics.readerCuriosity}` : null,
    '',
    '**nextChapterGuidance（本章须响应）**：',
    ...guidance.map((g) => `- ${g}`),
  ].filter(Boolean);
  return lines.length > 3 ? lines.join('\n') : null;
}

function buildChapterReaderWhy(intent = {}, curves = {}) {
  const mainGoal = intent.mainGoal || intent.chapterIntent || '推进章目标';
  return [
    '### 本章追读动力（读者为什么会继续看）',
    `- **章目标驱动**：${mainGoal} — 读者须感到「不看完不知道结果」`,
    `- **Hook 递进**：${curves.hookCurve?.slice(-1)[0]?.note || '章尾峰值'} — 翻页冲动`,
    `- **Mystery 加深**：${curves.mysteryCurve?.slice(-1)[0]?.note || '悬念未全解'} — 追问未止`,
    `- **Payoff 兑现**：${curves.payoffCurve?.[Math.floor((curves.payoffCurve?.length || 1) / 2)]?.note || '部分兑现'} — 伏笔有回响`,
  ].join('\n');
}

export function buildChapterDirectorBrief(intent = {}, chapter = null, {
  bookDir = null,
  storyDna = {},
} = {}) {
  const mainGoal = intent.mainGoal || intent.chapterIntent || '';
  const pov = intent.pov || '主角';
  const obstacles = (intent.obstacles || []).slice(0, 3);
  const sceneCount = intent.scenes?.length || intent.sceneCount || 4;

  const readerFeedback = bookDir && chapter != null
    ? getReaderFeedbackAdjustmentsForChapter(bookDir, chapter)
    : { adjustments: {}, directives: [], hookLadderChapterBoost: 0 };

  const directorOverrides = bookDir && chapter != null
    ? loadDirectorOverrides(bookDir, chapter)
    : null;

  const hookLadderBoost = Math.max(
    readerFeedback.hookLadderChapterBoost || 0,
    directorOverrides?.hookLadderChapterBoost || 0,
  );

  const curves = bookDir && chapter != null
    ? buildAdjustedChapterCurvePlan(intent, chapter, sceneCount, bookDir)
    : buildChapterCurvePlan(intent, chapter, sceneCount);

  const hookLadder = chapter != null
    ? buildChapterHookLadder(chapter, sceneCount, {
      levelBoost: hookLadderBoost,
      storyDna,
    })
    : buildChapterHookLadder(1, sceneCount, { storyDna });

  const bookQuestion = buildBookQuestion(storyDna, intent);
  const chapterQuestion = buildChapterQuestion({ chapter, intent, storyDna, bookQuestion });

  const chapterClimax = buildChapterClimaxPlan({
    intent,
    chapter,
    sceneCount,
    scenes: intent.scenes || [],
    storyDna,
    hookLadder,
    chapterQuestion,
  });

  const chapterPromisePlan = buildChapterPromisePlan({
    intent,
    chapter,
    sceneCount,
    storyDna,
  });

  const chapterRhythm = buildChapterRhythmPlan({
    chapter,
    sceneCount,
    intent,
  });

  const chapterReaderSatisfaction = buildChapterReaderSatisfaction({
    chapter,
    sceneCount,
    intent,
  });

  const priorAuthorGoal = intent._priorChapterAuthorGoal
    || intent.priorChapterAuthorGoal
    || null;

  const chapterAuthorGoal = buildChapterAuthorGoal({
    chapter,
    intent,
    storyDna,
    chapterQuestion,
    chapterClimax,
    chapterPromisePlan,
    priorGoal: priorAuthorGoal,
  });

  // Director 规划：章级信息差 + 情绪浪 + Narrative Plan（Runtime 不自创）
  const chapterInformationGap = buildChapterInformationGap({
    intent,
    storyDna,
    bookQuestion,
    chapterQuestion,
  });
  const wavePlan = buildEmotionWavePlan({
    beatCount: Math.max(6, sceneCount + 2),
    sceneIndex: 1,
    preferShockAt: Math.max(2, sceneCount),
  });
  const chapterEmotionWave = {
    ...wavePlan,
    sequence: wavePlan.wave,
    sceneTargets: Array.from({ length: sceneCount }, (_, i) => {
      const targetEmotion = wavePlan.wave[i % wavePlan.wave.length];
      return {
        sceneIndex: i + 1,
        targetEmotion,
        zh: wavePlan.beatTargets?.[i % (wavePlan.beatTargets?.length || 1)]?.zh || targetEmotion,
      };
    }),
  };

  const chapterNarrativePlan = buildChapterNarrativePlan({
    intent,
    chapter,
    mainGoal,
    obstacles,
    chapterInformationGap,
    chapterEmotionWave,
    chapterPromisePlan,
    chapterClimax,
  });

  // Chapter Blueprint：章体验规划（不改 Writer / Narrative / Craft / EP 职责）
  const blueprint = buildChapterBlueprint({
    chapter: chapter ?? 1,
    intent,
    storyDna,
    chapterQuestion,
    bookQuestion,
    chapterPromisePlan,
    chapterClimax,
    chapterEmotionWave,
    sceneCount,
  });
  const blueprintFourQuestions = answerBlueprintFourQuestions(blueprint);

  const priorCurve = bookDir && chapter != null && chapter > 1
    ? loadReaderCurveReport(bookDir, chapter - 1)
    : null;
  const priorGuidanceBlock = buildPriorChapterGuidanceBlock(priorCurve, chapter);

  const readerFeedbackBlock = buildReaderFeedbackDirectorBlock(
    loadReaderFeedbackState(bookDir, chapter - 1) || {
      directives: readerFeedback.directives,
      storyMemoryDirectives: readerFeedback.storyMemoryDirectives,
      adjustments: readerFeedback.adjustments,
      aggregatedMetrics: readerFeedback.aggregatedMetrics,
    },
    { chapter },
  );

  const lines = [
    '<!-- inkos-chapter-director v3-reader-feedback-loop -->',
    '## Chapter Director · Reader Addiction 曲线',
    '',
    '**最高目标：Reader Addiction — 规划读者追读动力，不只规划剧情**',
    '',
    formatChapterAuthorGoalBlock(chapterAuthorGoal),
    '',
    chapter != null ? `- **章节**：第 ${chapter} 章` : null,
    `- **POV**：${pov}`,
    mainGoal ? `- **章目标**：${mainGoal}` : null,
    sceneCount ? `- **Scene 数**：${sceneCount}` : null,
    obstacles.length ? `- **章内阻碍**：${obstacles.join('；')}` : null,
    readerFeedback.hookLadderChapterBoost
      ? `- **Reader Feedback**：Hook Ladder 基准 +${readerFeedback.hookLadderChapterBoost}（跨章递进）`
      : null,
    readerFeedback.readerPreference?.favoriteElement
      ? `- **Reader Preference**：放大 ${readerFeedback.readerPreference.favoriteElementName || readerFeedback.readerPreference.favoriteElement}（${readerFeedback.readerPreference.score}）— ${readerFeedback.readerPreference.recommendation}`
      : null,
    '',
    buildChapterReaderWhy(intent, curves),
    '',
    '### 三条读者曲线（本章 Scene 级目标）',
    formatCurveLine('Hook Curve', curves.hookCurve, '↑ 逐 Scene 递增，末 Scene 峰值'),
    formatCurveLine('Mystery Curve', curves.mysteryCurve, '↑ 疑问逐 Scene 加深'),
    formatCurveLine('Payoff Curve', curves.payoffCurve, '↗ 中段起持续兑现'),
    '',
    buildCurveRequirements(),
    '',
    formatHookLadderBrief(hookLadder),
    '',
    formatChapterQuestionBlock(bookQuestion, chapterQuestion),
    '',
    formatChapterClimaxBlock(chapterClimax),
    formatClimaxBrief(chapterClimax),
    '',
    formatChapterPromisePlanBlock(chapterPromisePlan),
    '',
    formatChapterReaderSatisfactionBlock(chapterReaderSatisfaction),
    '',
    formatChapterRhythmBlock(chapterRhythm),
    '',
    formatChapterNarrativeRulesBlock(chapterInformationGap, chapterEmotionWave, chapterNarrativePlan),
    '',
    formatChapterBlueprintBrief(blueprint),
    '',
    '- **Hook Ladder 心理递进**：Curiosity → Danger → Cost → Truth → PointOfNoReturn，每章须升级读者追问',
    '- **节拍**：起（抓钩）→ 承（加深疑问）→ 转（代价/反转）→ 合（章尾强 Hook，悬念未全解）',
    '- **约束**：曲线须递进；末 Scene Hook 强度最高；Payoff 可延迟但 Mystery 不可断档',
  ].filter(Boolean);

  if (readerFeedbackBlock) {
    lines.push('', readerFeedbackBlock);
  }

  if (priorGuidanceBlock) {
    lines.push('', priorGuidanceBlock);
  }

  if (readerFeedback.adjustments?.firstScreenExplosion || directorOverrides?.firstScreenExplosion) {
    lines.push('', '- **Adaptive → Writer**：本章第一 Scene 前 300 字须第一屏爆点');
  }

  const adaptiveBrief = formatAdaptiveDirectorBrief(directorOverrides);
  if (adaptiveBrief) lines.push('', adaptiveBrief);

  if (storyDna?.main_question || storyDna?.core_hook) {
    lines.push('', `- **书级追问锚点**：${storyDna.main_question || storyDna.core_hook}`);
  }

  lines.push('', '- **故事推进铁律**：每 Scene 改变世界状态（Situation Engine）+ 回答 1 问提出 2 问（Question Engine）');

  return {
    role: 'chapter-director',
    brief: lines.join('\n'),
    chapter,
    mainGoal,
    pov,
    bookQuestion,
    chapterQuestion,
    chapterClimax,
    chapterPromisePlan,
    chapterRhythm,
    chapterReaderSatisfaction,
    chapterAuthorGoal,
    chapterInformationGap,
    chapterEmotionWave,
    chapterNarrativePlan,
    blueprint,
    blueprintFourQuestions,
    promisePointer: chapterNarrativePlan.promisePointer,
    hookCurve: curves.hookCurve,
    mysteryCurve: curves.mysteryCurve,
    payoffCurve: curves.payoffCurve,
    hookLadder,
    curvePlan: curves,
    readerFeedback,
    readerPreference: readerFeedback.readerPreference || directorOverrides?.readerPreference || null,
    directorOverrides,
    libraryPrefer: directorOverrides?.libraryPrefer
      || readerFeedback.adjustments?.libraryPrefer
      || null,
    priorReaderCurve: priorCurve,
    nextChapterGuidanceInput: [
      ...(priorCurve?.nextChapterGuidance || []),
      ...(readerFeedback.directives || []),
    ],
    readerWhyContinue: buildChapterReaderWhy(intent, curves),
  };
}

export function runChapterDirector({ intent = {}, chapter = null, bookDir = null, storyDna = {} } = {}) {
  return buildChapterDirectorBrief(intent, chapter, { bookDir, storyDna });
}

/**
 * 章级 InformationGap（写入 Chapter Director → 下沉到 ExecutionPlan）
 */
function buildChapterInformationGap({
  intent = {},
  storyDna = {},
  bookQuestion = null,
  chapterQuestion = null,
} = {}) {
  const mystery = storyDna.coreMystery || storyDna.main_question || storyDna.core_hook || '';
  const chQ = chapterQuestion?.question || chapterQuestion?.text || '';
  const bookQ = bookQuestion?.question || bookQuestion?.text || '';

  const readerKnows = [chQ || bookQ || mystery || intent.mainGoal]
    .map((s) => String(s || '').trim())
    .filter(Boolean)
    .map((s) => s.slice(0, 60));
  const heroKnows = intent.pov
    ? [`${intent.pov} 只掌握行动任务，未必知全貌`]
    : [];
  const enemyKnows = intent.obstacles?.[0]
    ? [`对手侧：${String(intent.obstacles[0]).slice(0, 40)}`]
    : (mystery ? ['敌对势力掌握局部监控，不知读者已知的破绽'] : []);

  const gap = { readerKnows, heroKnows, enemyKnows };
  const check = assertInformationGapMeaningful(gap);
  return {
    version: 'chapter-information-gap-1',
    ...gap,
    valid: check.pass,
    failReasons: check.failReasons,
    rule: '禁止所有角色知道同样的信息 — 必须制造读者/主角/敌人信息差',
  };
}

/**
 * 章级 Narrative Plan — 下沉到各 Scene ExecutionPlan.narrativeBeatPlan
 * promisePointer 仅为轻量字符串，不接 Promise Registry
 */
export function buildChapterNarrativePlan({
  intent = {},
  chapter = null,
  mainGoal = '',
  obstacles = [],
  chapterInformationGap = null,
  chapterEmotionWave = null,
  chapterPromisePlan = null,
  chapterClimax = null,
} = {}) {
  const goal = mainGoal || intent.mainGoal || intent.chapterIntent || '';
  const conflict = obstacles[0] || intent.conflict || chapterClimax?.opposition || '章内主冲突';
  const choice = intent.choice
    || 'POV 必须在「推进目标」与「保全代价」之间做出不可逆选择';
  const cost = intent.cost
    || chapterClimax?.cost
    || obstacles[1]
    || '选择将带来可见损失（时间/关系/安全/筹码）';
  const reward = intent.reward
    || chapterPromisePlan?.expectedPayoff
    || '兑现至少一个读者期待，并种下新钩子';
  const escalation = intent.escalation
    || '冲突逐 Scene 加码：阻碍收窄退路 → 代价前置 → 章高潮位移';
  const targetEmotion = chapterEmotionWave?.start
    || chapterEmotionWave?.sequence?.[0]
    || 'Curiosity';
  const promisePointer = chapterPromisePlan?.promisePointer
    || intent.promisePointer
    || (chapter != null ? `ch${chapter}_payoff` : null);

  return {
    version: 'chapter-narrative-plan-1',
    chapter,
    goal,
    conflict,
    choice,
    cost,
    reward,
    escalation,
    targetEmotion,
    informationGap: chapterInformationGap,
    promisePointer,
    emotionWave: chapterEmotionWave
      ? {
        sequence: chapterEmotionWave.sequence || chapterEmotionWave.wave || [],
        pattern: chapterEmotionWave.pattern,
        sceneTargets: chapterEmotionWave.sceneTargets || [],
      }
      : null,
    rule: 'Director 规划 Narrative；Runtime 只校验 Momentum / 信息差落地 / 情绪偏离',
  };
}

function formatChapterNarrativeRulesBlock(informationGap = null, emotionWave = null, narrativePlan = null) {
  const lines = [
    '### Narrative · 章级叙事规划（Director）',
    '',
    narrativePlan
      ? [
        '**章级 Narrative 字段（下沉 ExecutionPlan）**：',
        `- **goal**：${narrativePlan.goal || '—'}`,
        `- **conflict**：${narrativePlan.conflict || '—'}`,
        `- **choice**：${narrativePlan.choice || '—'}`,
        `- **cost**：${narrativePlan.cost || '—'}`,
        `- **reward**：${String(narrativePlan.reward || '—').slice(0, 50)}`,
        `- **escalation**：${narrativePlan.escalation || '—'}`,
        `- **targetEmotion**：${narrativePlan.targetEmotion || '—'}`,
        `- **promisePointer**：${narrativePlan.promisePointer || '—'}（轻量指针，不接 Registry）`,
        '',
      ].join('\n')
      : '',
    '**信息差铁律**：',
    '- 禁止所有角色知道同样的信息',
    '- 例如：读者知道 / 主角不知道；或主角知道 / 敌人不知道',
    informationGap?.readerKnows?.[0]
      ? `- **readerKnows**：${informationGap.readerKnows[0]}`
      : '',
    informationGap?.heroKnows?.[0]
      ? `- **heroKnows**：${informationGap.heroKnows[0]}`
      : '',
    informationGap?.enemyKnows?.[0]
      ? `- **enemyKnows**：${informationGap.enemyKnows[0]}`
      : '',
    '',
    '**Emotion Wave（Director 规划，Runtime 只校验）**：',
    emotionWave?.sequence?.length
      ? `- 浪形：${emotionWave.sequence.join(' → ')}`
      : `- 参考：${EMOTION_WAVE.join(' → ')}`,
    emotionWave?.sceneTargets?.length
      ? `- Scene 目标：${emotionWave.sceneTargets.map((s) => `S${s.sceneIndex}:${s.targetEmotion}`).join(' · ')}`
      : '',
    `- 形态：${emotionWave?.pattern || '压 → 放 → 压 → 放 → 爆'}`,
    '- 禁止连续平平平平；禁止一直高潮',
    '- Narrative Runtime 不得反向指定下一 Beat 必须 Shock',
  ];
  return lines.filter(Boolean).join('\n');
}
