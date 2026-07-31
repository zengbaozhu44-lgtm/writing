/**
 * Scene Director — Scene 五要素 Reader Addiction 规划
 * 不只规划剧情，须回答：读者为什么会继续看
 */
import { buildSceneExecutionPlan, buildBeatExecutionPromptBlock, buildSceneEngineBundle } from './scene-execution.js';
import { migrateScenePlan } from './beat-state.js';
import { formatRewardBrief } from './reward-engine.js';
import {
  formatCharacterDesireBrief,
} from './character-desire-engine.js';
import {
  formatEmotionCurveBrief,
} from './emotion-curve-engine.js';
import {
  formatConflictBrief,
} from './conflict-engine.js';
import {
  formatClimaxSceneBlock,
} from './climax-engine.js';
import {
  formatReaderEmotionBrief,
} from './reader-emotion-engine.js';
import {
  formatPromiseLifecycleBrief,
} from './promise-lifecycle.js';
import {
  formatQuestionLifecycleBlock,
} from './question-lifecycle.js';
import {
  formatWriterSceneArcBlock,
} from './writer-scene-arc.js';
import {
  formatCharacterTransformationBrief,
} from './character-transformation.js';
import {
  formatReaderSatisfactionBrief,
} from './reader-satisfaction.js';
import {
  formatSceneRhythmBlock,
} from './chapter-rhythm.js';
import {
  formatSceneEndingBrief,
} from './scene-ending-library.js';
import {
  formatSituationBrief,
} from './situation-engine.js';
import {
  formatQuestionBrief,
} from './question-engine.js';
import {
  buildWriterExecutionChecklist,
  formatWriterExecutionChecklist,
} from './writer-first.js';

export function buildScenePlan(scene = {}, intent = {}, chapterDir = null) {
  const chapterGap = chapterDir?.chapterInformationGap || null;
  const authorIntent = scene.authorIntent
    || scene.sceneSeed
    || scene.lore
    || intent.sceneSeeds?.[(scene.index ?? 1) - 1]?.seed
    || null;
  const raw = {
    goal: scene.goal || authorIntent || intent.mainGoal || '推进章目标',
    obstacle: scene.obstacle || scene.conflict || intent.obstacles?.[0] || '外部阻力或内心犹豫',
    escalation: scene.escalation || scene.beat || '冲突升级 — 代价逼近或选择收窄',
    choice: scene.choice || 'POV 必须在有限选项中做出选择，每个选项都有代价',
    consequence: scene.consequence || scene.cost || '选择产生可见代价，局面因此改变',
    cost: scene.cost || scene.consequence || '选择产生可见代价，局面因此改变',
    reward: scene.reward || scene.payoff || null,
    newInformation: scene.newInformation || scene.reveal
      || (intent.scenes?.find((s) => s.index === scene.index)?.newInformation)
      || '本 Scene 须释放至少一条新信息（事实/关系/规则）',
    cliffhanger: scene.cliffhanger || scene.hook
      || (scene.index === (intent.scenes?.length || intent.sceneCount)
        ? '章尾强 Hook — 未完成动作或致命追问'
        : 'Scene 尾留悬念 — 禁止平收总结'),
    // Narrative 规划种子（ExecutionPlan 深化；不含 Promise Registry）
    targetEmotion: scene.targetEmotion || null,
    informationGap: scene.informationGap || chapterGap || null,
    promisePointer: scene.promisePointer
      || chapterDir?.chapterPromisePlan?.promisePointer
      || chapterDir?.promisePointer
      || null,
    // 卷纲散文意图 → Scene lore / authorIntent
    lore: authorIntent || scene.lore || null,
    authorIntent: authorIntent || null,
    sceneSeed: scene.sceneSeed || authorIntent || null,
  };
  return migrateScenePlan(raw);
}

function attachSceneEngines(plan, scene, intent, chapterDir) {
  const sceneIndex = scene.index ?? 1;
  const sceneCount = intent.scenes?.length || intent.sceneCount || 4;
  const chapter = chapterDir?.chapter ?? intent._chapter ?? null;
  const storyDna = intent._storyDna || intent.storyDna || {};
  const prevScene = (intent.scenes || []).find((s) => s.index === sceneIndex - 1);
  const hookLadder = chapterDir?.hookLadder || intent.hookLadder || null;

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
  });

  return {
    ...plan,
    ...engines,
    openingWorldState: engines.situation.openingWorldState,
    closingWorldState: engines.situation.closingWorldState,
  };
}

/** 五要素对应的读者追读动力 */
export function buildSceneReaderWhy(plan = {}, scene = {}, chapterDir = null) {
  const sceneIndex = scene.index ?? 1;
  const hookTarget = chapterDir?.hookCurve?.find((p) => p.sceneIndex === sceneIndex);
  const mysteryTarget = chapterDir?.mysteryCurve?.find((p) => p.sceneIndex === sceneIndex);
  const payoffTarget = chapterDir?.payoffCurve?.find((p) => p.sceneIndex === sceneIndex);

  return {
    goal: `读者感到：主角有事要做（${plan.goal?.slice(0, 40) || '目标明确'}），局面即将变化`,
    obstacle: '读者感到：阻力真实，stakes 升高，目标受挫',
    choice: '读者感到：必须选边，每个选项都有代价',
    consequence: '读者感到：代价已落地，局面比选择前更紧',
    escalation: '读者感到：必须做出选择，退路消失',
    newInformation: '读者感到：认知被更新，局面被改写，有新东西可追问',
    cliffhanger: `读者感到：必须翻页 — ${plan.cliffhanger?.slice(0, 50) || '悬念未解'}`,
    hookTarget: hookTarget?.target ?? null,
    mysteryTarget: mysteryTarget?.target ?? null,
    payoffTarget: payoffTarget?.target ?? null,
  };
}

export function buildSceneDirectorBrief(scene = {}, intent = {}, adaptiveBlock = '', chapterDir = null) {
  const basePlan = buildScenePlan(scene, intent, chapterDir);
  const plan = attachSceneEngines(basePlan, scene, intent, chapterDir);
  const readerWhy = buildSceneReaderWhy(plan, scene, chapterDir);
  const pov = intent.pov || '主角';
  const hookLadder = chapterDir?.hookLadder || intent.hookLadder || null;
  const storyDna = intent._storyDna || intent.storyDna || chapterDir?.storyDna || {};
  const prevScene = (intent.scenes || []).find((s) => s.index === (scene.index ?? 1) - 1);
  const prevLastBeat = prevScene?.executionPlan?.beats?.slice(-1)[0]?.libraryBeat || null;

  const executionPlan = buildSceneExecutionPlan({
    scene: { ...scene, scenePlan: plan },
    intent,
    hookLadder,
    prevSceneLastLibraryBeat: prevLastBeat,
    chapter: chapterDir?.chapter ?? intent._chapter ?? null,
    storyDna,
    chapterDir,
  });

  const narrative = executionPlan.narrativeBeatPlan || {};
  const infoGap = executionPlan.informationGap || narrative.informationGap || null;
  const emotionWave = executionPlan.emotionWave || chapterDir?.chapterEmotionWave || null;

  const lines = [
    '<!-- inkos-scene-director v3-narrative-plan -->',
    '## Scene Director · Reader Addiction 执行单',
    '',
    '**最高目标：故事推进 — 不是写完事件，而是改变世界状态 + 驱动问题链**',
    '',
    formatSituationBrief(plan.situation),
    formatCharacterDesireBrief(plan.characterDesire, plan.characterPush),
    formatConflictBrief(plan.conflict),
    formatEmotionCurveBrief(plan.emotionCurve),
    formatQuestionBrief(plan.questions),
    '',
    '### Narrative Beat Plan（Director 规划）',
    `- **goal**：${narrative.goal || plan.goal}`,
    `- **conflict**：${narrative.conflict || plan.obstacle}`,
    `- **choice**：${narrative.choice || plan.choice}`,
    `- **cost**：${narrative.cost || plan.cost || plan.consequence}`,
    `- **reward**：${narrative.reward || plan.reward || executionPlan.reward?.payoff || '—'}`,
    `- **escalation**：${narrative.escalation || plan.escalation}`,
    `- **targetEmotion**：${narrative.targetEmotion || executionPlan.beats?.[0]?.targetEmotion || '—'}`,
    `- **promisePointer**：${executionPlan.promisePointer || narrative.promisePointer || '—'}（仅指针，不接 Registry）`,
    infoGap
      ? `- **informationGap**：reader「${(infoGap.readerKnows || [])[0] || '—'}」· hero「${(infoGap.heroKnows || [])[0] || '—'}」· enemy「${(infoGap.enemyKnows || [])[0] || '—'}」`
      : '- **informationGap**：—',
    emotionWave?.sequence?.length
      ? `- **Emotion Wave**：${emotionWave.sequence.join(' → ')}（Director 规划；Runtime 只校验偏离）`
      : '',
    '- **铁律**：禁止所有角色知道同样信息；禁止连续平/一直高潮',
    '',
    '### 读者为什么会继续看（本 Scene）',
    `- **Goal 后**：${readerWhy.goal}`,
    `- **Obstacle 后**：${readerWhy.obstacle}`,
    `- **Choice 后**：${readerWhy.choice}`,
    `- **Consequence 后**：${readerWhy.consequence}`,
    `- **New Information 后**：${readerWhy.newInformation}`,
    `- **Cliffhanger 后**：${readerWhy.cliffhanger}`,
    '',
    `- **POV**：${pov}`,
    scene.index != null ? `- **Scene**：${scene.index}` : null,
    readerWhy.hookTarget != null ? `- **曲线目标**：Hook ${readerWhy.hookTarget} · Mystery ${readerWhy.mysteryTarget} · Payoff ${readerWhy.payoffTarget}` : null,
    '',
    '### 六要素状态规划（Goal → Obstacle → Choice → Consequence → New Information → Cliffhanger）',
    '每个要素须对应状态变化，禁止只有剧情说明、禁止原地踏步：',
    `- **Goal**：${plan.goal}`,
    `  · 读者动力：${readerWhy.goal}`,
    `- **Obstacle**：${plan.obstacle}`,
    `  · 读者动力：${readerWhy.obstacle}`,
    `- **Choice**：${plan.choice}`,
    `  · 读者动力：${readerWhy.choice}`,
    `- **Consequence / Cost**：${plan.consequence}`,
    `  · 读者动力：${readerWhy.consequence}`,
    `- **New Information**：${plan.newInformation}`,
    `  · 读者动力：${readerWhy.newInformation}`,
    `- **Cliffhanger**：${plan.cliffhanger}`,
    `  · 读者动力：${readerWhy.cliffhanger}`,
    '',
    '### Beat 执行序列（含 targetEmotion）',
    ...executionPlan.beats.map((b) =>
      `- **${b.label}** [${b.libraryBeat}]${b.targetEmotion ? ` · ${b.targetEmotion}` : ''}：${String(b.content || '').slice(0, 90)}`),
    '',
    '### Scene Outcome',
    `- **Success**：${executionPlan.sceneOutcome.success}`,
    `- **Failure**：${executionPlan.sceneOutcome.failure}`,
    `- **Consequence**：${executionPlan.sceneOutcome.consequence}`,
    '',
    `- **Hook Ladder**：${executionPlan.hookLadderEntry?.type || executionPlan.hookLadderEntry?.name} · ${executionPlan.hookLadderEntry?.readerQuestion?.slice(0, 50) || ''}`,
    `- **Reward · Payoff**：${executionPlan.reward?.valid ? `${executionPlan.reward.payoff?.slice(0, 50)} ← ${executionPlan.reward.promise?.slice(0, 40)}` : '⚠ 须绑定 Promise'}`,
    `- **Hook · Action**：${executionPlan.hookOutput?.actionDeadline?.slice(0, 50) || executionPlan.hookLadderEntry?.actionDeadline?.slice(0, 50) || ''}`,
    `- **Library Beats**：${executionPlan.libraryTypesUsed.join('、')}（≥3 种，禁止连续重复）`,
    '- **约束**：Writer 逐 Beat 执行；每 Beat 改变局势；不得跳步、不得自由发挥',
  ].filter(Boolean);

  const beatBlock = buildBeatExecutionPromptBlock(executionPlan);
  const climaxBlock = formatClimaxSceneBlock(
    executionPlan.climaxRole,
    chapterDir?.chapterClimax || intent._chapterDirector?.chapterClimax,
  );
  const rewardBlock = formatRewardBrief(executionPlan.reward);
  const situationBlock = formatSituationBrief(executionPlan.situation);
  const questionBlock = formatQuestionBrief(executionPlan.questions);
  const questionLifecycleBlock = formatQuestionLifecycleBlock(
    executionPlan.questions?.lifecycle,
    executionPlan.questionRegistry,
  );
  const promiseLifecycleBlock = formatPromiseLifecycleBrief(executionPlan.promiseLifecycle);
  const readerEmotionBlock = formatReaderEmotionBrief(executionPlan.readerEmotion);
  const writerArcBlock = formatWriterSceneArcBlock(executionPlan.writerSceneArc);
  const transformationBrief = formatCharacterTransformationBrief(executionPlan.characterTransformation);
  const satisfactionBrief = formatReaderSatisfactionBrief(executionPlan.readerSatisfaction);
  const rhythmBlock = formatSceneRhythmBlock(executionPlan.sceneRhythm);
  const endingBrief = formatSceneEndingBrief(executionPlan.sceneEnding);
  const writerChecklist = formatWriterExecutionChecklist(
    buildWriterExecutionChecklist({
      executionPlan,
      intent,
      chapter: chapterDir?.chapter ?? intent._chapter ?? null,
      sceneIndex: scene.index,
    }),
  );
  const brief = [
    lines.join('\n'),
    situationBlock,
    questionBlock,
    questionLifecycleBlock,
    rewardBlock,
    promiseLifecycleBlock,
    readerEmotionBlock,
    writerArcBlock,
    transformationBrief,
    satisfactionBrief,
    rhythmBlock,
    endingBrief,
    climaxBlock,
    beatBlock,
    writerChecklist,
    adaptiveBlock,
  ].filter(Boolean).join('\n\n');

  return {
    role: 'scene-director',
    brief,
    scenePlan: plan,
    situation: plan.situation,
    questions: plan.questions,
    readerWhy,
    executionPlan,
    narrativeBeatPlan: executionPlan.narrativeBeatPlan,
    informationGap: executionPlan.informationGap,
    emotionWave: executionPlan.emotionWave,
    promisePointer: executionPlan.promisePointer,
    sceneOutcome: executionPlan.sceneOutcome,
    sceneId: scene.id,
    sceneIndex: scene.index,
  };
}

export function runSceneDirector({ scene = {}, intent = {}, adaptiveBlock = '', chapterDir = null } = {}) {
  return buildSceneDirectorBrief(scene, intent, adaptiveBlock, chapterDir);
}

/** @deprecated 使用 runSceneDirector */
export function runDirectorPlan(payload = {}) {
  const { scene, intent } = payload;
  return buildSceneDirectorBrief(scene, intent);
}

/** @deprecated 使用 buildSceneDirectorBrief */
export function buildDirectorPlanBrief(scene = {}, intent = {}) {
  return buildSceneDirectorBrief(scene, intent);
}
