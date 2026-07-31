/**
 * Beat Prompt Slimmer — 「少即是多」止血层
 *
 * 单次 Beat 硬上限 ~2000 tokens（约 1500 中文字符约束区）
 * System：样本≤400 字 + ≤5 条硬规则
 * User：Map≤10 行 + 当前 Beat≤8 行 + 末 1–2 句续写 + lore≤300 字
 */
import { renderBeatForWriter } from '@inkos/runtime';
import {
  formatBeatContinuitySummary,
  slimSceneGoalLine,
  formatEventPhaseDirective,
  remapLibraryInstruction,
  resolvePriorityDrive,
  formatPriorityDriveBlock,
} from './beat-continuity.js';

/** User 约束区默认 ≤1400 字；先裁 lore/map，永远保住续写末句与收束禁令 */
export const BEAT_PROMPT_CHAR_BUDGET = Number(process.env.INKOS_BEAT_PROMPT_CHARS || 1400);
export const BEAT_SAMPLE_MAX_CHARS = 400;
export const BEAT_LORE_MAX_CHARS = 220;
export const BEAT_MAP_MAX_LINES = 8;

/** 正向硬规则（≤5）；「禁止」词 ≤2，避免负向堆叠压垮模型） */
export const BEAT_HARD_RULES = [
  '顺序：画面→动作→对白→信息；情绪写在身体、脏话与停顿里（允许疼/骂/喘）。',
  '只输出本 Beat 正文；不要标题、markdown、解释、JSON。',
  'Before≠After：只推进「上一拍之后」的下一动作与后果，勿换皮重写已发生事件。',
  '本拍动作必须服务「最高优先」目标；禁止平行开逃/清/炸多条任务。',
  '禁止复读上文末句与「他意识到/他觉得」贴标签；写完立即停止。',
];

/**
 * Writer 模式策略
 * - 默认 beat
 * - scene 仅：显式 forceScene，或（emotional|dialogue）且 wordTarget<800 且不可打断情绪流
 * - INKOS_WRITER_MODE=scene 仍可强制全 Scene（调试用）
 */
export function resolveWriterModeForScene({
  scene = {},
  executionPlan = {},
  forceScene = false,
  envMode = process.env.INKOS_WRITER_MODE,
} = {}) {
  const env = String(envMode || 'beat').trim().toLowerCase();
  if (env === 'scene') {
    return { mode: 'scene', reason: 'env_INKOS_WRITER_MODE=scene' };
  }
  if (env === 'beat') {
    // 仍允许严格例外
  }

  if (forceScene || scene.forceSceneWrite === true || executionPlan.forceSceneWrite === true) {
    return { mode: 'scene', reason: 'explicit_forceScene' };
  }

  const sceneType = String(executionPlan.sceneType || scene.sceneType || 'standard').toLowerCase();
  const wordTarget = Number(scene.wordTarget || executionPlan.wordTarget || 1000);
  const emotionalOk = sceneType === 'emotional' || sceneType === 'dialogue';
  const shortOk = wordTarget > 0 && wordTarget < 800;
  const flowOk = scene.uninterruptedEmotionFlow === true
    || executionPlan.uninterruptedEmotionFlow === true
    || scene.scenePlan?.uninterruptedEmotionFlow === true;

  if (emotionalOk && shortOk && flowOk) {
    return {
      mode: 'scene',
      reason: `short_${sceneType}_flow wordTarget=${wordTarget}`,
    };
  }

  return { mode: 'beat', reason: 'default_beat' };
}

/** 兼容旧 resolveWriterMode() */
export function resolveWriterMode() {
  const raw = String(process.env.INKOS_WRITER_MODE || 'beat').trim().toLowerCase();
  return raw === 'scene' ? 'scene' : 'beat';
}

export function clipChars(text = '', max = 400) {
  const t = String(text || '').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function clipLines(text = '', maxLines = 10) {
  const lines = String(text || '').split(/\n/).filter((l) => l.trim());
  if (lines.length <= maxLines) return lines.join('\n');
  return `${lines.slice(0, maxLines).join('\n')}\n…`;
}

/** Story Map → Writer 短摘要（≤10 行） */
export function formatStoryMapWriterBrief(storyMap = null) {
  if (!storyMap || typeof storyMap !== 'object') return '';
  const lines = [];
  if (storyMap.volumeName || storyMap.arcPhase) {
    lines.push(`- 卷：${storyMap.volumeName || '—'}（${storyMap.arcPhase || '—'}）`);
  }
  if (storyMap.chapterFunction) {
    const delta = storyMap.distanceToMilestone < 999
      ? ` · 距里程碑「${storyMap.nextMilestone || '?'}」${storyMap.distanceToMilestone}章`
      : '';
    lines.push(`- 章功能：${storyMap.chapterFunction}${delta}`);
  }
  if (storyMap.pov || storyMap.whyThisPov) {
    lines.push(`- POV：${storyMap.pov || '—'}${storyMap.whyThisPov ? `（${String(storyMap.whyThisPov).slice(0, 28)}）` : ''}`);
  }
  const thread = storyMap.activeThreads?.[0];
  if (thread) {
    lines.push(`- 情节线：${thread.threadName} → ${thread.thisChapterEvent || '推进'}`);
  }
  // must_have 由 Planner 消化进 Beat 指令，不进 Writer
  if (storyMap.upcomingHiddenReveals?.[0]) {
    const u = storyMap.upcomingHiddenReveals[0];
    lines.push(`- 禁提前揭露：${String(u.event).slice(0, 28)}（第${u.ch}章）`);
  }
  if (storyMap.emotionalCurve) {
    lines.push(`- 情绪参照：${String(storyMap.emotionalCurve).slice(0, 40)}`);
  }
  return clipLines(['## 作者笔记（导航）', ...lines].join('\n'), BEAT_MAP_MAX_LINES + 1);
}

/** 从密封 basePrompt / lore 中硬裁给本 Beat（≤300 字） */
export function slimLoreForBeat(fullLore = '', beat = {}, intent = {}) {
  const raw = String(fullLore || '');
  if (!raw.trim()) return '';

  const keys = [
    beat.label,
    beat.content,
    beat.libraryBeat,
    beat.structuralBeat,
    intent.pov,
    intent.storyMap?.pov,
    ...(beat.characters || []),
    ...(intent.characters || []),
  ].map((k) => String(k || '').trim()).filter((k) => k.length >= 2);

  const sections = raw.split(/(?=^#{1,3}\s)/mu).filter(Boolean);
  const kept = [];
  for (const sec of sections) {
    if (!keys.some((k) => sec.includes(k))) continue;
    // 命中后只留标题 + 最多 3 行短正文，避免灌入整段设定
    const lines = sec.split(/\n/).map((l) => l.trim()).filter(Boolean);
    kept.push(lines.slice(0, 4).join('\n').slice(0, 160));
    if (kept.join('').length >= BEAT_LORE_MAX_CHARS) break;
  }

  let out = kept.join('\n').trim();
  if (!out) {
    // 退回：地点/时间/POV 短行；绝不 dump 原文前 200 字
    const lines = raw.split(/\n/)
      .map((l) => l.trim())
      .filter((l) => l && /地点|时间|POV|当前|时空|状态|角色/.test(l) && l.length <= 60);
    out = lines.slice(0, 4).join('\n');
  }
  return clipChars(out, BEAT_LORE_MAX_CHARS);
}

/** 末 2 句优先（动作链续写）；首拍仍可用 1 句 */
export function takeContinuationTail(text = '', { preferOne = false, sentences = 2 } = {}) {
  const raw = String(text || '').trim();
  if (!raw) return '';
  const parts = raw
    .split(/(?<=[。！？!?…]|[.!?])\s*|\n+/u)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!parts.length) return '';
  if (preferOne) {
    const last = parts[parts.length - 1];
    if (last.replace(/\s/g, '').length >= 8) return last;
    return parts.slice(-2).join('');
  }
  const n = Math.max(1, Math.min(3, Number(sentences) || 2));
  return parts.slice(-n).join('');
}

export function buildTransitionHint(prevBeat = null, beat = null) {
  if (!prevBeat || !beat) return '';
  const from = prevBeat.afterState || prevBeat.beatPlan?.afterState || prevBeat.label || '上一段';
  const to = beat.beforeState || beat.beatPlan?.beforeState || beat.label || '本段';
  return `从「${String(from).slice(0, 24)}」接到「${String(to).slice(0, 24)}」，只写下一动作，不要复述上段事件。`;
}

/** System：样本≤400 + ≤5 硬规则（避免「不是…是…」示范句） */
export function buildSlimBeatSystem(goldenSample = '') {
  const sample = clipChars(goldenSample, BEAT_SAMPLE_MAX_CHARS)
    .replace(/不是[^。\n]{0,20}是/g, (m) => m.replace(/不是/, '实为').replace(/，是/, '——'));
  return [
    '你是职业商业网文 Beat 写手。写得上瘾：动作链连续、后果落地、信息克制。',
    sample ? `--- 风格样本（学节奏，勿学「不是…是…」套话）---\n${sample}\n---` : '',
    ...BEAT_HARD_RULES.map((r, i) => `${i + 1}. ${r}`),
  ].filter(Boolean).join('\n');
}

/**
 * 预算裁剪：永远保住 beat 指令 + 续写末句 + 收束禁令；先砍 lore/map/章目标
 */
export function clipBeatPromptToBudget(parts, budget = BEAT_PROMPT_CHAR_BUDGET) {
  const list = [...parts].filter(Boolean);
  const join = () => list.join('\n\n');
  if (join().length <= budget) return join();

  const softIdx = list
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => /本 Beat 设定摘录|Story Map|章目标|作者意图/.test(p))
    .map(({ i }) => i)
    .reverse();

  for (const i of softIdx) {
    if (join().length <= budget) break;
    const block = list[i];
    if (block.length > 80) {
      list[i] = `${block.slice(0, 60)}…`;
    } else {
      list[i] = '';
    }
  }

  let out = list.filter(Boolean).join('\n\n');
  if (out.length <= budget) return out;

  // 仍超限：从中段砍，保住尾部「紧接续写」与收束句
  const tailMarkers = ['### 紧接续写', '只写本 Beat'];
  let keepFrom = -1;
  for (const m of tailMarkers) {
    const idx = out.lastIndexOf(m);
    if (idx >= 0) keepFrom = keepFrom < 0 ? idx : Math.min(keepFrom, idx);
  }
  if (keepFrom > 80) {
    const headBudget = Math.max(200, budget - (out.length - keepFrom) - 2);
    out = `${out.slice(0, headBudget)}…\n\n${out.slice(keepFrom)}`;
  }
  if (out.length > budget) {
    // 最后手段：保尾
    out = out.slice(-(budget - 1));
  }
  return out;
}

/**
 * 精简版单 Beat User Prompt（不再贴整包 sealed basePrompt）
 */
export function compileSlimBeatUserPrompt({
  beat,
  executionPlan = {},
  intent = null,
  scene = null,
  accumulatedText = '',
  rewriteHint = '',
  basePrompt = '',
  prevBeat = null,
  beatMemory = null,
  continuityState = null,
} = {}) {
  const rendered = renderBeatForWriter({
    beat,
    intent: intent || executionPlan.intent || {},
    scene: scene || {
      index: executionPlan.sceneIndex,
      goal: executionPlan.scenePlan?.goal,
      location: executionPlan.situation?.location,
      time: executionPlan.situation?.time,
      pov: executionPlan.pov,
    },
    anchor: beat.anchor || executionPlan.narrativeAnchor || null,
  });

  const before = rendered.beforeState || beat.beforeState || beat.beatPlan?.beforeState || '局势未变';
  const after = rendered.afterState || beat.afterState || beat.beatPlan?.afterState || '局势必须改变';
  const budget = beat.wordBudget || 200;
  const total = executionPlan.beats?.length || '?';

  const completed = (executionPlan.beats || [])
    .filter((b) => b.order < beat.order)
    .map((b) => b.label || b.libraryBeat)
    .filter(Boolean);
  const remaining = (executionPlan.beats || [])
    .filter((b) => b.order > beat.order)
    .map((b) => b.label || b.libraryBeat)
    .filter(Boolean);

  const mapBrief = formatStoryMapWriterBrief(intent?.storyMap);
  const lore = slimLoreForBeat(basePrompt, beat, intent || {});
  const preferOne = Number(beat.order) <= 1;
  const tail = takeContinuationTail(accumulatedText, { preferOne, sentences: preferOne ? 1 : 2 });
  const transition = buildTransitionHint(prevBeat, beat);
  const continuityBlock = formatBeatContinuitySummary(continuityState, beatMemory);
  const eventDirective = formatEventPhaseDirective(continuityState, beat);
  const drive = resolvePriorityDrive({
    scene,
    intent: intent || executionPlan?.intent,
    executionPlan,
    desire: executionPlan?.characterDesire || intent?.characterDesire,
    conflict: executionPlan?.conflict,
  });
  const priorityBlock = formatPriorityDriveBlock(drive, beat, continuityState);
  const libraryInstr = remapLibraryInstruction(
    beat.libraryBeat,
    beat.libraryInstruction || '',
    continuityState,
  );

  const sceneGoal = slimSceneGoalLine(
    drive.priority || executionPlan.scenePlan?.goal || scene?.goal || '',
    42,
  );
  // Beat2+ 不再反复灌章目标/作者意图 pitch（多轨重开场燃料）
  const chapterGoal = Number(beat.order) <= 1
    ? slimSceneGoalLine(intent?.chapterIntent || intent?.mainGoal || '', 48)
    : '';
  const authorIntent = Number(beat.order) <= 1
    ? slimSceneGoalLine(
      scene?.authorIntent
      || scene?.sceneSeed
      || scene?.lore
      || executionPlan.scenePlan?.authorIntent
      || executionPlan.scenePlan?.lore
      || executionPlan.scenePlan?.sceneSeed
      || '',
      48,
    )
    : '';
  const spatial = scene?.spatialAnchor?.location
    || executionPlan.situation?.location
    || continuityState?.location
    || '';

  const beatInstr = String(
    libraryInstr
    || rendered.content
    || beat.content
    || beat.libraryInstruction
    || '',
  );
  const beatBlock = [
    `## 当前 Beat ${beat.order}/${total}：${beat.label || beat.libraryBeat || 'Beat'}`,
    `- Before：${String(before).slice(0, 60)}`,
    `- After：${String(after).slice(0, 60)}`,
    `- 字数：约 ${budget}（≤${Math.round(budget * 1.3)}）`,
    `- 指令：${slimSceneGoalLine(beatInstr, 88)}`,
    rendered.writerBlock ? `- 动作：${String(rendered.writerBlock).replace(/\n/g, ' ').slice(0, 100)}` : '',
  ].filter(Boolean).slice(0, 8).join('\n');

  const revealGuard = (continuityState?.revealed || []).length
    ? '已揭示关键信息禁止再写「第一次/首次/突然出现」；只写后果与推进。'
    : '';

  const actionGuard = (continuityState?.doneActions || []).length
    ? '已发生动作禁止换皮重写；本段只写「之后发生了什么」。'
    : '';

  const closing = Number(beat.order) > 1
    ? (continuityState?.activeInterfaces?.length
      ? '只写本 Beat。基于已发现界面：选择→代价→下一步。禁止再发现新界面，禁止「不是A是B」。写完立即停止。'
      : '只写本 Beat。紧接上文末句的下一动作，不要重新开场，不要重演已发生事件，禁止「不是A是B」。写完立即停止。')
    : '只写本 Beat。接着上文，不要重新开场。禁止「不是A是B」套话。写完立即停止。';

  const parts = [
    chapterGoal ? `章目标（导航）：${chapterGoal}` : '',
    sceneGoal ? `Scene 目标（本场唯一）：${sceneGoal}` : '',
    authorIntent ? `作者意图：${authorIntent}` : '',
    spatial ? `空间锚点：${String(spatial).slice(0, 40)}` : '',
    continuityBlock,
    eventDirective,
    mapBrief,
    lore ? `### 本 Beat 设定摘录\n${lore}` : '',
    beatBlock,
    completed.length ? `已完成标签：${completed.join(' → ')}` : '本 Scene 首段',
    remaining.length ? `后续（勿抢写）：${remaining.join(' → ')}` : '',
    transition ? `衔接：${transition}` : '',
    revealGuard,
    actionGuard,
    tail ? `### 紧接续写（末句，严禁复读/重演）\n---\n${tail}\n---` : '',
    rewriteHint ? String(rewriteHint).slice(0, 280) : '',
    closing,
  ].filter(Boolean);

  return clipBeatPromptToBudget(parts, BEAT_PROMPT_CHAR_BUDGET);
}

/**
 * 统一状态变化闸（Beat / Scene 共用）
 */
export function validateStateChange({
  text = '',
  beforeState = '',
  afterState = '',
} = {}) {
  const body = String(text || '').trim();
  const before = String(beforeState || '').trim();
  const after = String(afterState || '').trim();
  const reasons = [];

  if (!body) {
    return { pass: false, failReasons: ['空正文'], rewriteHint: '【重写】必须写出有动作与后果的片段。' };
  }
  if (before && after && before === after) {
    reasons.push('Before===After：规划未要求状态变化');
  }
  // 启发式：正文过短且无对白/动作
  if (body.replace(/\s/g, '').length < 40) {
    reasons.push('正文过短，难以完成状态变化');
  }
  if (/意识到|觉得自己|深吸一口气|心中一紧/.test(body)) {
    reasons.push('出现贴标签/套话，改为身体与动作');
  }

  const pass = reasons.length === 0
    || (reasons.length === 1 && reasons[0].includes('Before===After') && body.length > 80);
  // Before===After 是规划问题，不单独因规划相等而杀正文；真正失败看启发式套话/过短
  const hardFail = reasons.some((r) => /空正文|过短|贴标签/.test(r));

  return {
    pass: !hardFail,
    failReasons: reasons,
    rewriteHint: hardFail
      ? `【重写】${reasons.join('；')}。必须让局势相对 Before「${before.slice(0, 20)}」走向 After「${after.slice(0, 20)}」。`
      : '',
    before,
    after,
  };
}
