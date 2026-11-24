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
  isOpeningRepeat,
  findRepeatedSegment,
  findOpeningPhraseRecycle,
} from './beat-continuity.js';
import { applyProseBoundaryGate } from './prose-boundary.js';

const MAX_BEAT_REWRITES = Number(process.env.INKOS_BEAT_MAX_REWRITES || 2);

/**
 * 幕内续写锚豁免窗（字）：accumulatedText 末 ≤ANCHOR_WIN 字 = 刚发给模型的【续写原文】（verbatim）。
 * 模型以它为接点、首句重述锚尾属「接续上文」而非「重开场景」——此类回声不计入开场复读。
 * 只豁免幕内锚窗；跨 Scene 基准（chapterTextSoFar，上一场景终态）完整保留——
 * scene 边界回覆（scene3 重写 scene2 终态）仍是硬闸，绝不放行。
 */
const ANCHOR_WIN = 120;

/** 幕内开场复读基准：剔除续写锚窗（重述锚尾不算复读），更早内容的重开/意象仍按 hardRun≥7 硬失败 */
function openerRepeatBase(accumulatedText = '', chapterTextSoFar = '') {
  const inner = accumulatedText.length > ANCHOR_WIN ? accumulatedText.slice(0, -ANCHOR_WIN) : '';
  return `${inner}${chapterTextSoFar ? `\n${chapterTextSoFar}` : ''}`;
}

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
  }
  // 场景过渡强制锚定（双重保险）：Scene 首拍必写空间/时间坐标，无论是否有既定锚点
  lines.push(
    scene?.spatialAnchor?.location
      ? `空间锚点：${scene.spatialAnchor.location}。首句写「现在在哪 + 当前时间/距上幕多久」。`
      : '首句必须锚定「现在在哪 + 当前时间/距上幕多久」，由本段确立场景空间坐标，禁止悬空起笔。',
  );
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
  profile = null,
  usedImages = null,
}) {
  void sceneIndex;
  void totalBeats;
  void runtimeSession;

  const opening = beat.order === 1
    ? formatSceneOpeningConstraintBlock(scene, intent, continuityState)
    : '';
  // 预防式防复读：前序 beat 已被判重并复刻的短语（悬在确认键上方等）提前注入首稿 prompt，
  // 让模型第一版就避开，而不是靠 rewrite 与它硬碰（ch16 S3b6 重写后仍保留该短语 → 预防更有效）
  const hint = [
    opening,
    usedImages?.length
      ? `已用意象防复读：${usedImages.map((p) => `「${p}」`).join(' / ')}。禁止原样出现上述短语字词；同一动作语义可保留，但措辞必须换新（换身体部位/感官/距离/物件细节，如「手停在半空」「掌心悬在按键上方」）。`
      : '',
    rewriteHint,
  ].filter(Boolean).join('\n');

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
    profile,
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
  chapterTextSoFar = '',
  profile = null,
  usedImages = null,
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
  let proseBoundaryHardFail = false;
  let proseBoundaryHardFailReason = '';
  const prevCont = continuityState || createContinuityState();
  const sceneIndex = scene?.index ?? executionPlan?.sceneIndex ?? 1;
  // 本 beat 被判复读的具体短语 → 上抛给 executeBeatSequence，注入后续 beat 首稿 prompt（预防式防复读）
  const dedupRuns = [];

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
      profile,
      usedImages,
    });
    lastUserPrompt = userPrompt;

    // 注意：此处是「sceneType 写作档」局部变量，与上方 continuity `profile`（书籍档案）是两回事，
    // 必须用不同名字，否则块级 TDZ 会让 line 220 对 `profile` 的读取抛 ReferenceError
    const sceneProfile = resolveSceneWritingProfile(executionPlan.sceneType || scene?.sceneType);
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
      temperature: sceneProfile.temp || BEAT_GENERATION_TEMPERATURE,
      model: attempts > 1 ? resolveLightModel(loadInkOsConfig()) : undefined,
      maxTokensHint: Math.min(600, Math.max(120, Math.round(budget * 1.5))),
    });

    text = String(chunk || '').trim();
    if (!text) {
      rewriteHint = '【重写】上一版空正文。必须写出有动作与后果的完整片段。';
      attemptLogs.push({ attempt: attempts, pass: false, failReasons: ['空正文'] });
      return false;
    }

    // RF-01: Prose Boundary — strip leading internal Beat scaffold; residual → hardFail path
    const proseGate = applyProseBoundaryGate(text, { userPrompt: lastUserPrompt });
    text = proseGate.text;
    if (proseGate.strippedCount > 0) {
      attemptLogs.push({
        attempt: attempts,
        proseBoundary: {
          strippedCount: proseGate.strippedCount,
          strippedLines: proseGate.strippedLines.slice(0, 3),
          role: proseGate.role,
        },
      });
    }
    if (proseGate.hardFail) {
      proseBoundaryHardFail = true;
      proseBoundaryHardFailReason = proseGate.hardFailReason;
      rewriteHint = [
        '【重写】禁止输出 Beat 标题 / 内部脚手架（如「# Beat 1/6：Goal（主角目标）」）。',
        '只写小说正文；不要 markdown 标题、不要解释、不要 JSON。',
      ].join('\n');
      attemptLogs.push({
        attempt: attempts,
        pass: false,
        failReasons: [proseGate.hardFailReason],
      });
      return false;
    }
    if (!text.trim()) {
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
      profile,
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

    // Beat 层防重复 —— 与 V2 校验解耦，无条件执行。
    // 历史缺陷：本段原嵌在 `if (validation.pass)` 内，凡因 LOOP_STALL/MicroScene 等
    // 其他原因校验失败的 beat 永远到不了防重复分支 —— 恰是这类反复重开的 beat 最爱
    // 复读开场意象（ch16「悬在确认键上方」×4 的 S3b1/S4b3 均因此漏网）。现无条件执行：
    //  validation 已失败 → 追加复读原因，指导本次 rewrite
    //  validation 通过 → 命中即翻 false 触发 rewrite（原行为）
    const repeatBase = `${accumulatedText}\n${chapterTextSoFar}`;
    const repeatHit = findRepeatedSegment(text, repeatBase);
    // 开场复读用锚窗豁免基准：重述【续写原文】锚尾是接续搭桥，不算重开场景
    const openerRepeatBaseText = openerRepeatBase(accumulatedText, chapterTextSoFar);
    const openerHit = findOpeningPhraseRecycle(text, openerRepeatBaseText);
    const openRepeat = isOpeningRepeat(text, openerRepeatBaseText);
    if (openRepeat || repeatHit || openerHit) {
      const isOpening = !repeatHit || repeatHit.at === 0;
      const hitSeg = openerHit?.segment || repeatHit?.segment || '';
      const hitSim = openerHit
        ? `${openerHit.cover}%`
        : repeatHit
          ? `${repeatHit.similarity}%`
          : '60%+';
      const dedupBase = chapterTextSoFar || accumulatedText;
      const near = dedupBase.length
        ? dedupBase.replace(/\s/g, '').slice(-200).replace(/。{1,2}$/, '')
        : '';
      validation = {
        ...(validation || {}),
        pass: false,
        failReasons: [...(validation?.failReasons || []), isOpening
          ? `OPENING_REPEAT: 开场句与本章已有文本高度重复（${openerHit ? (openerHit.hardRun ? `单段复读 ${openerHit.maxRun} 字「${(openerHit.runs[0] || '').slice(0, 10)}…」` : `复刻占比 ${openerHit.cover}%`) : hitSeg}）`
          : `REPEAT_SEGMENT: 「${hitSeg.slice(0, 12)}…」与上文相似度 ${hitSim}，mid-beat 复读`],
        rewriteHint: openerHit?.hardRun
          ? `【防重复】本 Beat 开场句原样复刻本章已写短语「${(openerHit.runs[0] || '').slice(0, 14)}…」（${openerHit.maxRun} 字）。动作语义可保留，但禁止再出现上述字词——换写具体身体/感官/物件细节，如「手停在半空」「掌心悬在按键上方」「拇指距按键一指宽」，不得复写「${(openerHit.runs[0] || '').slice(0, 12)}」。${near ? `上文（勿复用意象）：${near.slice(-80)}` : ''}`
          : `【防重复】本 Beat ${isOpening ? '开场句' : '内容'}与本章已有文本高度相似（${isOpening
            ? openerHit
              ? `复刻占比 ${openerHit.cover}%：${openerHit.runs.slice(0, 2).map((r) => `「${r}」`).join(' / ')}`
              : '开场画面'
            : `${hitSim}（「${hitSeg.slice(0, 10)}…」）`}）。重写：换具体的身体/感官/物件细节起笔，避开上文的动作与意象${isOpening ? '' : '，该句别再说同一句话/同一动作'}。${near ? `上文（勿复用意象）：${near.slice(-80)}` : ''}`,
      };
      if (openerHit?.runs) dedupRuns.push(...openerHit.runs);
      else if (repeatHit?.segment) dedupRuns.push(repeatHit.segment);
      else if (hitSeg) dedupRuns.push(hitSeg);
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
      profile,
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

  // ── A) 防复读/身体禁令硬失败：重写+降配全部耗尽后，最终文本仍复读 → 场景级拒绝
  //    （Orchestrator 捕获 SCENE_HARD_FAIL 后触发有界重规划），不再降级接受进正文。
  //    历史根因：ch16「悬在确认键上方」×17 在 needsHumanReview 转义舱里带着坏稿通过全链
  //    （scene review analysis-only + dedup 软信号 + validation 8 项都不拦）。
  //    ── 硬失败判据（只认两种强信号，避免误杀合法首章）：
  //    1) 跨 Scene 复读（chapterTextSoFar 非空）：任意检测器命中都硬失败 ——
  //       「另一幕在抄这一幕」的结构性复读（ch16 各 scene 复刻开场/中段意象）。
  //    2) 幕内开场意象复读（findOpeningPhraseRecycle / isOpeningRepeat）：Beat 重开而非续写。
  //       幕内 findRepeatedSegment 的 mid-beat 20 字相似是弱信号——合法首章场景常因
  //       场景目标本身就要求同类描写而不可约（2026-08-13 新书第一章 Scene1 被整章误杀），
  //       此类仍走 needsHumanReview 软降级供人审，不吞稿也不拒稿。
  const fmtRepeatHit = (hit) => {
    if (!hit) return '';
    if (hit === true) return '开场句与本章已有文本高度相似';
    const seg = hit.segment || hit.runs?.[0] || '';
    const s = String(seg).slice(0, 12);
    if (hit.hardRun) return `开场句原样复读 ${hit.maxRun} 字「${s}…」`;
    if (hit.cover != null) return `复刻占比 ${hit.cover}%（「${s}…」）`;
    if (hit.similarity != null) return `与上文相似度 ${hit.similarity}%（「${s}…」）`;
    return `与上文高度相似（「${s}…」）`;
  };
  const crossBase = String(chapterTextSoFar || '').trim();
  const crossHit = crossBase
    ? (findRepeatedSegment(text, crossBase)
      || findOpeningPhraseRecycle(text, crossBase)
      || isOpeningRepeat(text, crossBase))
    : null;
  // 幕内开场复读：基准剔除续写锚窗（末 ≤ANCHOR_WIN 字 = 模型刚看到的【续写原文】，重述它属接续而非重开）
  const withinOpenerBase = openerRepeatBase(accumulatedText, '');
  const withinOpener = withinOpenerBase
    ? (findOpeningPhraseRecycle(text, withinOpenerBase)
      || isOpeningRepeat(text, withinOpenerBase))
    : null;
  const finalBodyIssues = (continuityCheck?.issues || [])
    .filter((i) => /CONSISTENCY: (左臂|右臂)已损毁/u.test(String(i)));
  // Final prose-boundary pass (defense in depth after rewrites)
  const finalProseGate = applyProseBoundaryGate(text, { userPrompt: lastUserPrompt });
  text = finalProseGate.text;
  if (finalProseGate.hardFail) {
    proseBoundaryHardFail = true;
    proseBoundaryHardFailReason = finalProseGate.hardFailReason
      || proseBoundaryHardFailReason;
  }
  const hardFail = Boolean(
    crossHit || withinOpener || finalBodyIssues.length || proseBoundaryHardFail,
  );
  const hardFailReason = [
    crossHit ? `跨 Scene 复读未通过：${fmtRepeatHit(crossHit)}` : '',
    withinOpener ? `幕内开场复读未通过：${fmtRepeatHit(withinOpener)}` : '',
    proseBoundaryHardFail ? (proseBoundaryHardFailReason || 'Prose Boundary: Beat scaffold') : '',
    ...finalBodyIssues.slice(0, 2),
  ].filter(Boolean).join('；');
  if (hardFail) needsHumanReview = true;

  const nextContinuity = mergeContinuityState(
    prevCont,
    text,
    validation?.storyState?.after || workingBeat.afterState || '',
    profile?.vocab,
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
    hardFail,
    hardFailReason,
    attemptLogs,
    beatStateDelta,
    runtimeSession: session,
    continuityState: nextContinuity,
    userPrompt: lastUserPrompt,
    prompt: lastUserPrompt,
    dedupRuns,
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
  chapterTextSoFar = '',
  // 书籍档案（vocab/角色名/POV）：按书籍语境门控 cyberpunk 意象规则
  profile = null,
  // 跨 Scene 预防式防复读：上一 Scene 已判复读的具体短语，注入本 Scene 首稿 prompt
  usedImagesSeed = null,
} = {}) {
  const parts = [];
  const beatStateDeltas = [];
  let accumulatedText = '';
  let runtimeSession = createWriterRuntimeSession(executionPlan);
  let prevBeat = null;
  let needsHumanReview = false;
  // A) 任一 beat 硬失败（防复读/身体禁令）→ 整 scene 拒绝
  let hardFail = false;
  // 章级连续性：Studio 可传入上一 Scene 末状态
  let continuityState = createContinuityState(
    seedContinuity || intent?._continuityState || scene?._continuityState || null,
  );
  // 已判复读的具体短语 → 传给后续 beat 首稿 prompt，预防式避免再写（自积累，只收真命中）
  // 跨 Scene 累计：seed 由 Writer 传入本章已 flag 过的短语，返回时回传合并
  const usedImages = new Set(usedImagesSeed || []);

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
      chapterTextSoFar,
      profile,
      usedImages: [...usedImages],
    });
    for (const r of result.dedupRuns || []) {
      const clean = r.replace(/[。！？!?，,、…—～]/gu, '').trim();
      if (clean.length >= 4 && clean.length <= 14) usedImages.add(clean.slice(0, 12));
    }
    parts.push(result);
    if (result.needsHumanReview) needsHumanReview = true;
    if (result.hardFail) hardFail = true;
    if (result.beatStateDelta) beatStateDeltas.push(result.beatStateDelta);

    // 防碎片：本 beat 被判「重开场景」（动作重演/事件循环/场景跳跃）而非承接续写 →
    // 不并入累积正文，保留此前已累积的一稿，重开稿留档供人审（Beat 本意线性推进，重开即拼接源）
    if (accumulatedText.trim() && isReopenDraft(result)) {
      needsHumanReview = true;
      result._reopenedDraft = true;
    } else {
      accumulatedText = [accumulatedText, result.text].filter(Boolean).join('\n\n');
    }

    runtimeSession = result.runtimeSession;
    continuityState = result.continuityState || mergeContinuityState(continuityState, result.text, '', profile?.vocab);
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

  const hardFailReasons = parts
    .filter((p) => p.hardFail && p.hardFailReason)
    .map((p) => p.hardFailReason)
    .slice(0, 2);

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
    hardFail,
    hardFailReason: hardFailReasons.join('；'),
    // 硬失败时把「模型本应从哪续写」的锚句一并上抛：Orchestrator 的修正指令据此点名
    // 续写锚点，把 Validator 的判据变成下一轮生成约束（否则修正只报「禁止复读」而无具体续写起点）
    hardFailAnchor: hardFail ? takeContinuationTail(accumulatedText, { preferOne: true }) : '',
    writerMode: 'beat',
    usedImages: [...usedImages],
  };
}

/** 重开草稿判定：continuity 检测已把「重演动作 / 事件循环 / 场景跳跃 / 重复首次揭示」写入 issues */
function isReopenDraft(result) {
  const issues = (result?.continuityState?.issues || result?.beatStateDelta?.continuity?.issues || []);
  if (!Array.isArray(issues) || !issues.length) return false;
  const joined = issues.join('\n');
  return /ACTION_REPLAY|EVENT_LOOP|REPEAT_REVEAL|场景跳跃|禁止重新开场|禁止重启开场/u.test(joined);
}

export { BEAT_SYSTEM };
