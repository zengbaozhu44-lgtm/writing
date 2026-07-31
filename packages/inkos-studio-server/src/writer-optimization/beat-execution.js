/**
 * Beat Execution Engine — Writer Runtime V2：写 → 验 → 不通过立即重写 → 降配再试
 */
import {
  buildSceneExecutionPlan,
  extractBeatStateDelta,
  mergeBeatMemory,
  createWriterRuntimeSession,
  validateWriterRuntimeV2,
  applyBeatToRuntimeSession,
} from '@inkos/director';
import {
  resolveV2ValidationMode,
  resolveLightModel,
} from '../../../inkos-runtime/src/pipeline/cost-controls.js';
import { loadInkOsConfig } from '../../../inkos-core/src/lib/config.js';
import {
  resolveGoldenSample,
  resolveSceneWritingProfile,
} from './sample-driven-writer.js';
import {
  buildSlimBeatSystem,
  compileSlimBeatUserPrompt,
  takeContinuationTail,
} from './beat-slimmer.js';
import {
  createContinuityState,
  mergeContinuityState,
  validateCrossBeatConsistency,
} from './beat-continuity.js';

const MAX_BEAT_REWRITES = Number(process.env.INKOS_BEAT_MAX_REWRITES || 2);

/** Beat 生成默认温度（可被 sceneType profile 覆盖） */
export const BEAT_GENERATION_TEMPERATURE = 0.8;

/** @deprecated 保留导出；实际 system 由 buildBeatSystem() 动态生成 */
const BEAT_SYSTEM = [
  '你是职业商业网文 Beat 写手。',
  '只输出本段正文。',
].join('\n');

export function buildBeatSystem(goldenSample = '') {
  return buildSlimBeatSystem(goldenSample);
}

/** 续写窗：默认末 1 句；过短补到 2 句（兼容旧名） */
export function takeLastTwoSentences(text = '') {
  return takeContinuationTail(text, { preferOne: true });
}

export function resolveExecutionPlan(scene = {}, intent = {}, chapterDir = null) {
  if (scene.executionPlan?.beats?.length) return scene.executionPlan;
  const hookLadder = chapterDir?.hookLadder || intent.hookLadder || intent._chapterDirector?.hookLadder || null;
  const prevScene = (intent.scenes || []).find((s) => s.index === (scene.index ?? 1) - 1);
  const prevLastBeat = prevScene?.executionPlan?.beats?.slice(-1)[0]?.libraryBeat || null;
  return buildSceneExecutionPlan({
    scene,
    intent,
    hookLadder,
    prevSceneLastLibraryBeat: prevLastBeat,
    chapter: intent._chapter ?? scene._chapter ?? chapterDir?.chapter ?? null,
    storyDna: intent._storyDna || intent.storyDna || {},
    chapterDir,
  });
}

/** Scene 开场：情绪继承 + 跨 Scene 连续性（禁止整章开场复读） */
export function formatSceneOpeningConstraintBlock(scene = {}, intent = {}, continuityState = null) {
  const emotion = scene?.inheritedEmotion
    || intent?.closingEmotion
    || intent?.narrativeMomentum?.closing_emotion
    || null;
  const forbidden = scene?.forbiddenOpenings
    || intent?.forbiddenOpenings
    || intent?.narrativeMomentum?.forbidden_openings
    || [];
  const lines = [];
  if (emotion) lines.push(`开场承接情绪：${emotion}`);
  for (const f of forbidden.slice(0, 2)) lines.push(`禁：${f}`);

  const idx = Number(scene?.index || 1);
  const hasCont = continuityState?.location
    || continuityState?.leftArm
    || continuityState?.rightArm
    || (continuityState?.revealed || []).length;
  if (idx > 1 || hasCont) {
    lines.push('禁止重写整章「濒死坠落」式开头；承接已确立身体/地点/已揭示信息。');
    if (scene?.spatialAnchor?.location) {
      lines.push(`空间锚点：${scene.spatialAnchor.location}`);
    }
  }
  return lines.filter(Boolean).join('；');
}

/**
 * 精简单 Beat Prompt（Slimmer）
 * 注入跨 Beat 状态摘要（身体/位置/已揭示/威胁），不再 void beatMemory
 */
export function compileSingleBeatPrompt({
  beat,
  executionPlan,
  basePrompt,
  accumulatedText = '',
  beatMemory = null,
  sceneIndex,
  totalBeats,
  runtimeSession = null,
  rewriteHint = '',
  intent = null,
  scene = null,
  prevBeat = null,
  continuityState = null,
}) {
  void sceneIndex;
  void totalBeats;
  void runtimeSession;

  const opening = beat.order === 1
    ? formatSceneOpeningConstraintBlock(scene, intent, continuityState)
    : '';
  const hint = [opening, rewriteHint].filter(Boolean).join('\n');

  return compileSlimBeatUserPrompt({
    beat,
    executionPlan,
    intent,
    scene,
    accumulatedText,
    rewriteHint: hint,
    basePrompt,
    prevBeat,
    beatMemory,
    continuityState,
  });
}

function degradeBeatForRetry(beat = {}) {
  const budget = Math.max(80, Math.round(Number(beat.wordBudget || 200) / 2));
  const content = String(beat.content || beat.libraryInstruction || '')
    .replace(/[，。；].*$/u, '')
    .slice(0, 40);
  return {
    ...beat,
    wordBudget: budget,
    content: content ? `${content}（只写核心动作与一处信息）` : '只写核心动作与一处信息落地',
    _degraded: true,
  };
}

/**
 * 单 Beat：生成 → V2 硬闸 → 失败 rewrite ≤2 → 降配再试 1 → 仍失败则 needsHumanReview
 */
export async function writeBeatWithRuntimeV2({
  beat,
  executionPlan,
  basePrompt,
  accumulatedText = '',
  beatMemory = null,
  runtimeSession = null,
  llmFn,
  maxRewrites = MAX_BEAT_REWRITES,
  intent = null,
  scene = null,
  prevBeat = null,
  continuityState = null,
}) {
  let session = runtimeSession || createWriterRuntimeSession(executionPlan);
  let rewriteHint = '';
  let text = '';
  let validation = null;
  let continuityCheck = { pass: true, issues: [] };
  let attempts = 0;
  let lastUserPrompt = '';
  const attemptLogs = [];
  let workingBeat = beat;
  let needsHumanReview = false;
  let degraded = false;
  const prevCont = continuityState || createContinuityState();
  const sceneIndex = scene?.index ?? executionPlan?.sceneIndex ?? 1;

  const runOnce = async (forceFull = false) => {
    attempts += 1;
    const userPrompt = compileSingleBeatPrompt({
      beat: workingBeat,
      executionPlan,
      basePrompt,
      accumulatedText,
      beatMemory,
      sceneIndex: executionPlan.sceneIndex,
      totalBeats: executionPlan.beats?.length || 6,
      runtimeSession: session,
      rewriteHint,
      intent,
      scene,
      prevBeat,
      continuityState: prevCont,
    });
    lastUserPrompt = userPrompt;

    const profile = resolveSceneWritingProfile(executionPlan.sceneType || scene?.sceneType);
    const goldenSample = resolveGoldenSample({
      bookDir: intent?._bookDir || scene?._bookDir || null,
      styleDna: intent?.styleDna || intent?._styleDna || null,
      sceneType: executionPlan.sceneType || scene?.sceneType,
    });

    const budget = Number(workingBeat.wordBudget || 200);
    const chunk = await llmFn({
      system: buildBeatSystem(goldenSample),
      userPrompt,
      beat: workingBeat,
      beatMemory,
      runtimeSession: session,
      rewriteAttempt: attempts - 1,
      temperature: profile.temp || BEAT_GENERATION_TEMPERATURE,
      model: attempts > 1 ? resolveLightModel(loadInkOsConfig()) : undefined,
      maxTokensHint: Math.min(600, Math.max(120, Math.round(budget * 1.5))),
    });

    text = String(chunk || '').trim();
    if (!text) {
      rewriteHint = '【重写】上一版空正文。必须写出有动作与后果的完整片段。';
      attemptLogs.push({ attempt: attempts, pass: false, failReasons: ['空正文'] });
      return false;
    }

    const v2Mode = forceFull
      ? 'full'
      : resolveV2ValidationMode({ rewriteAttempt: attempts - 1 });
    validation = validateWriterRuntimeV2({
      text,
      beat: workingBeat,
      executionPlan,
      lastEvent: session.lastEvent,
      recentParagraphs: session.recentParagraphs,
      recentExpressions: session.recentExpressions,
      accumulatedText,
      beforeState: session.beforeState
        || workingBeat.beforeState
        || workingBeat.beatPlan?.beforeState
        || prevCont.lastAfterState,
      climaxRole: executionPlan.climaxRole,
      sceneRhythm: executionPlan.sceneRhythm,
      mode: v2Mode,
    });

    // V2 之后：跨 Beat 物理 / 地点 / reveal 一致性
    continuityCheck = validateCrossBeatConsistency(text, prevCont, {
      sceneIndex,
      beatOrder: workingBeat?.order ?? beat?.order ?? 1,
    });
    if (!continuityCheck.pass) {
      const mergedFails = [
        ...(validation?.failReasons || []),
        ...continuityCheck.issues.slice(0, 4),
      ];
      validation = {
        ...(validation || {}),
        pass: false,
        failReasons: mergedFails,
        rewriteHint: [
          continuityCheck.rewriteHint,
          validation?.rewriteHint || '',
        ].filter(Boolean).join('\n\n'),
        continuity: continuityCheck,
      };
    }

    attemptLogs.push({
      attempt: attempts,
      pass: Boolean(validation?.pass),
      failReasons: validation?.failReasons,
      continuityIssues: continuityCheck.issues || [],
      degraded: workingBeat._degraded || false,
    });

    if (validation.pass) return true;

    rewriteHint = validation.rewriteHint || continuityCheck.rewriteHint
      || '【重写】Before≠After 与状态连续须同时成立。';
    session = {
      ...session,
      rewriteCounts: {
        ...(session.rewriteCounts || {}),
        [beat.order]: (session.rewriteCounts?.[beat.order] || 0) + 1,
      },
    };
    return false;
  };

  while (attempts < maxRewrites) {
    const ok = await runOnce(attempts === maxRewrites - 1);
    if (ok) break;
  }

  if (validation && !validation.pass) {
    workingBeat = degradeBeatForRetry(beat);
    degraded = true;
    rewriteHint = [
      rewriteHint,
      '【降配重试】字数砍半；只保留核心动作与一处信息；必须承接上文身体/地点，禁止重新开场。',
    ].filter(Boolean).join('\n');
    await runOnce(true);
  }

  if (!validation) {
    validation = validateWriterRuntimeV2({
      text,
      beat: workingBeat,
      executionPlan,
      lastEvent: session.lastEvent,
      recentParagraphs: session.recentParagraphs,
      recentExpressions: session.recentExpressions,
      accumulatedText,
      beforeState: session.beforeState || prevCont.lastAfterState,
      climaxRole: executionPlan.climaxRole,
      sceneRhythm: executionPlan.sceneRhythm,
      mode: 'full',
    });
    continuityCheck = validateCrossBeatConsistency(text, prevCont, {
      sceneIndex,
      beatOrder: workingBeat?.order ?? beat?.order ?? 1,
    });
    if (!continuityCheck.pass) {
      validation = {
        ...validation,
        pass: false,
        failReasons: [...(validation.failReasons || []), ...continuityCheck.issues],
        rewriteHint: continuityCheck.rewriteHint,
        continuity: continuityCheck,
      };
    }
  }

  if (validation && !validation.pass) {
    needsHumanReview = true;
  }

  const nextContinuity = mergeContinuityState(
    prevCont,
    text,
    validation?.storyState?.after || workingBeat.afterState || '',
  );

  session = applyBeatToRuntimeSession(session, {
    text,
    validation,
    beat: workingBeat,
    executionPlan,
  });
  // 用连续性 after 覆盖 session.beforeState，供下一拍
  if (nextContinuity.lastAfterState) {
    session = { ...session, beforeState: nextContinuity.lastAfterState };
  }

  const beatStateDelta = {
    ...extractBeatStateDelta(workingBeat, text, accumulatedText),
    extractedAt: new Date().toISOString(),
    continuity: {
      leftArm: nextContinuity.leftArm,
      rightArm: nextContinuity.rightArm,
      legs: nextContinuity.legs,
      location: nextContinuity.location,
      revealed: nextContinuity.revealed,
      doneActions: nextContinuity.doneActions,
      activeInterfaces: nextContinuity.activeInterfaces,
      eventPhase: nextContinuity.eventPhase,
      issues: continuityCheck.issues || [],
    },
    runtimeV2: validation
      ? {
        pass: validation.pass,
        failReasons: validation.failReasons?.slice(0, 6) || [],
        attempts,
        degraded,
        needsHumanReview,
        storyBefore: validation.storyState?.before?.slice?.(0, 40),
        storyAfter: validation.storyState?.after?.slice?.(0, 40),
        formatPass: validation.formatPass,
        noRepeat: validation.noRepeat,
        stateChange: validation.stateChange,
        fourGram: validation.fourGram || null,
        microPassed: validation.microScene?.passed || [],
        continuityPass: continuityCheck.pass,
      }
      : null,
  };

  return {
    text,
    beat: workingBeat,
    validation,
    attempts,
    rewritten: attempts > 1,
    degraded,
    needsHumanReview,
    attemptLogs,
    beatStateDelta,
    runtimeSession: session,
    continuityState: nextContinuity,
    userPrompt: lastUserPrompt,
    prompt: lastUserPrompt,
  };
}

export async function executeBeatSequence({
  executionPlan,
  basePrompt,
  llmFn,
  onBeatStart = null,
  onBeatComplete = null,
  intent = null,
  scene = null,
  continuityState: seedContinuity = null,
} = {}) {
  const parts = [];
  const beatStateDeltas = [];
  let accumulatedText = '';
  let runtimeSession = createWriterRuntimeSession(executionPlan);
  let prevBeat = null;
  let needsHumanReview = false;
  // 章级连续性：Studio 可传入上一 Scene 末状态
  let continuityState = createContinuityState(
    seedContinuity || intent?._continuityState || scene?._continuityState || null,
  );

  for (const beat of executionPlan.beats || []) {
    onBeatStart?.(beat);
    const result = await writeBeatWithRuntimeV2({
      beat,
      executionPlan,
      basePrompt,
      accumulatedText,
      beatMemory: mergeBeatMemory(beatStateDeltas),
      runtimeSession,
      llmFn,
      intent,
      scene,
      prevBeat,
      continuityState,
    });
    parts.push(result);
    if (result.needsHumanReview) needsHumanReview = true;
    if (result.beatStateDelta) beatStateDeltas.push(result.beatStateDelta);
    accumulatedText = [accumulatedText, result.text].filter(Boolean).join('\n\n');
    runtimeSession = result.runtimeSession;
    continuityState = result.continuityState || mergeContinuityState(continuityState, result.text);
    prevBeat = result.beat || beat;
    onBeatComplete?.(beat, result);
  }

  const beatArtifacts = parts.map((p, i) => ({
    order: p.beat?.order ?? i + 1,
    beatOrder: p.beat?.order ?? i + 1,
    libraryBeat: p.beat?.libraryBeat || p.beat?.structuralBeat || null,
    hookType: p.beat?.hookType || null,
    tensionLevel: p.beat?.tensionLevel ?? null,
    craftMode: p.beat?.craftMode || null,
    hookRotation: p.beat?.hookRotationNote
      ? { note: p.beat.hookRotationNote, type: p.beat.hookType }
      : { type: p.beat?.hookType || null },
    content: p.beat?.content || p.beat?.action || '',
    beforeState: p.beat?.beforeState || p.beat?.beatPlan?.beforeState || '',
    afterState: p.beat?.afterState || p.beat?.beatPlan?.afterState || '',
    prompt: p.userPrompt || p.prompt || '',
    userPrompt: p.userPrompt || p.prompt || '',
    text: p.text || '',
    validation: p.validation || p.runtimeV2 || null,
    score: p.score || null,
    chars: p.text ? String(p.text).replace(/\s/g, '').length : 0,
    beat: p.beat || null,
    needsHumanReview: Boolean(p.needsHumanReview),
    degraded: Boolean(p.degraded),
    continuity: p.continuityState || p.beatStateDelta?.continuity || null,
  }));

  return {
    text: accumulatedText.trim(),
    parts,
    beatArtifacts,
    executionPlan,
    hookRotation: executionPlan?.hookRotation || null,
    tensionArc: executionPlan?.tensionArc || null,
    beatMemory: mergeBeatMemory(beatStateDeltas),
    beatStateDeltas,
    runtimeSession,
    continuityState,
    sceneOutcome: executionPlan.sceneOutcome || null,
    needsHumanReview,
    writerMode: 'beat',
  };
}

export { BEAT_SYSTEM };
