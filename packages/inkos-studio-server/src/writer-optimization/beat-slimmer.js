/**
 * Beat Prompt Slimmer — 「少即是多」止血层
 *
 * 单次 Beat 硬上限 ~2000 tokens（约 1500 中文字符约束区）
 * System：样本≤400 字 + ≤5 条硬规则
 * User：Map≤10 行 + 当前 Beat≤8 行 + 末 1–2 句续写 + lore≤300 字
 */
import fs from 'node:fs';
import path from 'node:path';
import { renderBeatForWriter } from '@inkos/runtime';
import { readYaml } from '../../../inkos-core/src/lib/yaml-store.js';
import {
  formatBeatContinuitySummary,
  slimSceneGoalLine,
  formatEventPhaseDirective,
  remapLibraryInstruction,
  resolvePriorityDrive,
  formatPriorityDriveBlock,
  takeLastNChars,
  KNOWN_CHARACTERS,
} from './beat-continuity.js';
import {
  buildProtectedSemanticContext,
} from '../../../inkos-core/src/lib/prompt-survival.js';
import {
  ensureObservedContinuity,
  collectPreviousObservedContinuity,
  formatObservedContinuityBlock,
} from '../../../inkos-prompt/src/scene-observed-continuity.js';
import {
  ensurePlanValidity,
  isExecutionPrivilegeDemoted,
  formatPlanValidityDemotionBlock,
} from '../../../inkos-prompt/src/plan-validity.js';
import { loadPriorChapterScenesForActual } from '../../../inkos-prompt/src/compiler.js';
import {
  collectPreviousActualEvents,
  formatActualEventsBlock,
  compactActualTruthForBudget,
  promptPreservesActualTruth,
} from '../../../inkos-brain/src/events/actual-events-prompt.js';
import {
  sanitizeLibraryBeat,
  libraryBeatInstruction,
} from '../../../inkos-director/src/beat-library.js';
import { resolveStoryClock } from '../../../inkos-core/src/lib/story-clock.js';

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
  '本拍可对齐 Scene explicit goal（场景层约束，非人物 Dominance）；禁止平行开逃/清/炸多条无关任务。',
  '禁止复读上文末句与「他意识到/他觉得」贴标签；写完立即停止。',
];

/* ── 七元素叙事 prompt：环境驱动 + 叙事推进（替代 T1 静态快照 / T2 动作序列清单）──
 * 小说首先是叙事推进，人是环境的产物。取消「角色状态快照 / 【动作序列】/【本拍目标】」
 * 三组清单式注入，改为：前文缩句 → 续写原文 → 环境触发器 → 角色此刻 → 叙事推进 → 情绪 → 禁止。
 * 让模型从环境刺激中自然驱动角色，从叙事流中自然推进情节。
 */

/** 【前文叙事】前文缩句：去修饰语（的/得/地）+ 每句 ≤20 字 + 总 ≤60 字；取最近 3 句（前文推进的「上一步」）。 */
export function compressNarrative(text = '', maxTotal = 60) {
  const raw = String(text || '').trim();
  if (!raw) return '';
  const sentences = raw.split(/(?<=[。！？；\n])/u).map((s) => s.trim()).filter(Boolean);
  const recent = sentences.slice(-3).join('');
  // 用户规格的正则 [的得地][^，。；]+ 会整段吞掉长修饰语，这里收窄为「削短不删句」，
  // 保留动作与对象状态，避免把「老周的那句话」削成「老周」。
  const stripped = recent.replace(/[的得地][^，。；！？]{1,8}/gu, '');
  const out = [];
  for (const s of stripped.split(/(?<=[。！？；])/u).map((x) => x.trim()).filter(Boolean)) {
    out.push(s.slice(0, 20));
    if (out.join('').length >= maxTotal) break;
  }
  const result = out.join('').slice(0, maxTotal);
  // 保险：缩句过度（<10 字）时退回原文本末 maxTotal 字，保证叙事上下文不丢
  return result.length >= 10 ? result : raw.replace(/\s+/gu, '').slice(-maxTotal);
}

/** 跨 Scene 终态摘要：取上一场景末尾完整句（含不完整末句），≤60 字。
 * 与 compressNarrative 不同：终态必须保真——对白/人名不做去修饰语变形（那会把「周岚的岚字最后一笔」削成「周岚拖」）。 */
export function summarizeSceneTail(text = '', maxChars = 60) {
  const raw = String(text || '').trim().replace(/\s+/gu, '');
  if (!raw) return '';
  const sentences = raw.split(/(?<=[。！？…」])/u).map((s) => s.trim()).filter(Boolean);
  let out = '';
  for (let i = sentences.length - 1; i >= 0 && out.length < maxChars; i--) {
    out = sentences[i] + out;
  }
  return out.length > maxChars ? out.slice(-maxChars) : out;
}

/** 【环境触发器】从 scene_environments 四感文本中按 envKeywords 提取当前拍相关片段，≤30 字、去重、max 2。 */
export function extractEnvTrigger(environment = {}, envKeywords = []) {
  const merged = [environment.visual, environment.tactile, environment.olfactory, environment.auditory]
    .filter((x) => String(x || '').trim())
    .join('，');
  if (!merged) return '';
  const items = merged.split(/[、，。\n]/u).map((s) => s.trim()).filter(Boolean);
  const hits = [];
  for (const kw of (envKeywords || []).filter((x) => String(x || '').trim().length >= 1)) {
    const want = String(kw).trim();
    const found = items.find((it) => it.includes(want));
    if (found && !hits.includes(found)) hits.push(found);
    if (hits.length >= 2) break;
  }
  return hits.slice(0, 2).join('；').slice(0, 30);
}

/** 【角色此刻】核心恐惧/欲望 + 环境刺激的动态链接（不是静态快照），≤40 字。 */
export function buildCharacterNow(character = {}, envTrigger = '', narrativePush = '') {
  const fearRaw = String(character.coreFear || '').trim();
  // 长恐惧取末段作核心（「被亲近的人欺骗、被抛弃」→「被抛弃」），控制字数
  const fear = fearRaw.split(/[、，]/u).pop() || '被抛下';
  // 触发事件取首分句、去掉「…」引语与过长后缀，控制字数（整句作触发会撑爆 40 字）
  const triggerEvent = String(narrativePush || '')
    .split(/[，。；！？——]/u)[0]
    .replace(/「[^」]*」/gu, '')
    .trim()
    .slice(0, 12) || '眼前的变化';
  const sensory = String(envTrigger || '').split(/[，。；]/u)[0].trim();
  const text = `核心恐惧（${fear}）被「${triggerEvent}」触发 → ${sensory ? `${sensory}，恐惧有了实感` : '恐惧有了实感'}`;
  return text.slice(0, 40);
}

/** 【情绪】一词：优先本拍情绪目标，否则从本章情绪基线取收束相位短词，兜底「自然」。 */
function resolveEmotionWord(beat = null, sceneContext = {}) {
  const fromBeat = beat?.targetEmotionZh || beat?.targetEmotion;
  if (fromBeat) {
    return clipChars(String(fromBeat).replace(/[。，；！？]/gu, ''), 6);
  }
  const e = String(sceneContext.emotion || '').trim();
  if (!e) return '自然';
  const m = e.match(/一丝([^，。；]{1,8})上/u);
  if (m) return m[1].length <= 8 ? m[1] : clipChars(m[1], 8);
  const m2 = e.match(/落在一丝([^，。；]{1,8})/u);
  return m2 ? (m2[1].length <= 8 ? m2[1] : clipChars(m2[1], 8)) : '沉静';
}

/** 【禁止】兜底：防重开/复读/贴标签；不堆「意象禁令」（允许意象服务叙事）。 */
function buildForbidLine() {
  return '禁止回到场景开头重开、复读上文末句与已写意象、时间跳跃、用「他意识到/他觉得」贴情绪标签、写无环境细节的悬空动作；先写环境与动作，让情绪从刺激里长出来。';
}

/** 读取场景环境（novel/_system/scene_environments.yaml），取不到返回 {} */
function loadSceneEnvironment(bookDir, chapter, sceneIndex) {
  try {
    const env = readYaml(path.join(bookDir, 'novel', '_system', 'scene_environments.yaml'));
    const entry = env?.scenes?.[`ch${chapter}_scene${sceneIndex}`];
    return { setting: entry?.setting || '', ...(entry?.environment || {}) };
  } catch {
    return {};
  }
}

/** 读取 POV 角色卡「## 内核」（core_fear / core_desire），取不到返回 {} */
function loadCharacterCore(bookDir, povName) {
  if (!bookDir || !povName) return {};
  try {
    const text = fs.readFileSync(path.join(bookDir, 'novel', '03_character_bible', `${povName}.md`), 'utf8');
    const sec = text.match(/##\s*内核[\s\S]*?(?=\n#{1,2}\s|\n$|$)/u)?.[0] || '';
    const get = (key) => sec.match(new RegExp(`(?:-\\s*)?${key}\\s*[:：]\\s*([^\\n]+)`, 'u'))?.[1]?.trim() || '';
    return { name: povName, coreFear: get('core_fear'), coreDesire: get('core_desire') };
  } catch {
    return {};
  }
}

/** 读取本章 plan 的拍计划（chapter_plans/chapter_NNNN.yaml → beats），取不到返回 [] */
function loadPlanBeats(bookDir, chapter, sceneIndex) {
  try {
    const plan = readYaml(path.join(bookDir, 'novel', '_system', 'chapter_plans', `chapter_${String(chapter).padStart(4, '0')}.yaml`));
    const group = plan?.beats?.[`scene${sceneIndex}`] || plan?.beats?.[String(sceneIndex)] || [];
    return Array.isArray(group) ? group : [];
  } catch {
    return [];
  }
}

/** 读取本章情绪基线（emotional_beat），取不到返回 '' */
function loadPlanEmotion(bookDir, chapter) {
  try {
    const plan = readYaml(path.join(bookDir, 'novel', '_system', 'chapter_plans', `chapter_${String(chapter).padStart(4, '0')}.yaml`));
    return plan?.emotional_beat || '';
  } catch {
    return '';
  }
}

/**
 * 装载 sceneContext：环境 + POV 内核 + 拍计划 + 情绪基线。
 * 配置缺失时各字段回退空值，prompt 只少注入不崩。
 */
export function loadSceneContext({ bookDir, chapter, sceneIndex, povName = '' } = {}) {
  if (!bookDir || chapter == null || sceneIndex == null) {
    return { environment: {}, povCharacter: {}, beats: [], emotion: '' };
  }
  return {
    environment: loadSceneEnvironment(bookDir, chapter, sceneIndex),
    povCharacter: loadCharacterCore(bookDir, povName),
    beats: loadPlanBeats(bookDir, chapter, sceneIndex),
    emotion: loadPlanEmotion(bookDir, chapter),
  };
}

/** 跨 Scene 衔接：取上一场景已写正文的末尾窗口（orchestrator 已把已写 scene 正文回写 intent.scenes）。
 * 本 Scene 首拍用它当【续写原文】/【前文叙事】基准——从上一场景终态接续，而非回退到场景开始状态重立。
 * 索引与 beat-execution.js:58 一致（scene.index 1 起）。取不到返回 ''（第一场景/测试路径优雅降级）。 */
function loadPrevSceneTail(intent = {}, scene = {}, executionPlan = {}) {
  try {
    const scenes = Array.isArray(intent?.scenes) ? intent.scenes : [];
    if (!scenes.length) return '';
    const myIdx = Number(scene?.index ?? executionPlan?.sceneIndex ?? 1);
    const prev = scenes.find((s) => Number(s.index) === myIdx - 1) || scenes[myIdx - 2] || null;
    const text = String(prev?.text || prev?.content || '').trim();
    return text ? takeLastNChars(text, 200) : '';
  } catch {
    return '';
  }
}

/**
 * 七元素极简 prompt —— 叙事驱动的本拍上下文。
 * @param {number} beatIndex 当前拍序号（1 起）
 * @param {object} sceneContext loadSceneContext 的结果
 * @param {string} previousBeats 本场景已写正文（缩句 → 【前文叙事】）
 * @param {string} currentBeatText 续写基准文本（末 100 字 → 【续写原文】）
 * @param {object} beat 当前 beat（取情绪目标）
 * @param {string} prevSceneTail 上一场景已写正文末尾（仅 Scene 首拍注入）——
 *   跨 Scene 衔接：Scene 首拍的续写基准从前序 Scene 终态接，而不是从空/本场开始重立，
 *   杜绝「scene3 开头重写 scene2 已发生的动作」（如橘子剥了一半→又写老周背影消失）。
 */
export function buildBeatPrompt(beatIndex, sceneContext, previousBeats, currentBeatText, beat = null, prevSceneTail = '') {
  const beats = Array.isArray(sceneContext?.beats) ? sceneContext.beats : [];
  const beatMeta = beats.find((b) => Number(b.order) === beatIndex) || beats[beatIndex - 1] || null;
  const narrativePush = String(beatMeta?.narrativePush || '').trim();
  const envKeywords = Array.isArray(beatMeta?.envKeywords) ? beatMeta.envKeywords : [];

  // Scene 首拍且拿到上一场景终态 → 续写基准改用 prevSceneTail（本场景拍1 时 accumulatedText 为空）
  // 跨 Scene 的【前文叙事】必须保真（summarizeSceneTail 不削人名/对白），【续写原文】按句对齐（不截半句）。
  const usePrevTail = beatIndex === 1 && Boolean(String(prevSceneTail || '').trim());
  const frontNarrative = usePrevTail ? summarizeSceneTail(prevSceneTail) : compressNarrative(previousBeats);
  const tail = usePrevTail
    ? takeContinuationTail(prevSceneTail, { sentences: 2, maxChars: 100 })
    : takeLastNChars(currentBeatText || previousBeats, 100);
  const envTrigger = extractEnvTrigger(sceneContext?.environment || {}, envKeywords);
  const characterNow = buildCharacterNow(sceneContext?.povCharacter || {}, envTrigger, narrativePush);
  const emotionWord = resolveEmotionWord(beat, sceneContext || {});
  const forbidLine = buildForbidLine();

  return [
    frontNarrative ? `【前文叙事】${frontNarrative}` : '',
    tail ? `【续写原文】\n${tail}` : '',
    envTrigger ? `【环境触发器】${envTrigger}` : '',
    characterNow ? `【角色此刻】${characterNow}` : '',
    narrativePush ? `【叙事推进】${narrativePush}` : '',
    `【情绪】${emotionWord}`,
    forbidLine ? `【禁止】${forbidLine}` : '',
  ].filter(Boolean).join('\n');
}

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

/** 从密封 basePrompt / lore 中硬裁给本 Beat；Clock/IB 由 buildBeatUserPrompt 独立注入，此处不重复 */
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
    // F1: Clock/IB live in dedicated protected part — skip here to save budget
    if (/Story Clock|故事钟|信息边界|Information Boundary|Semantic Protected/u.test(sec.slice(0, 120))) {
      continue;
    }
    if (!keys.some((k) => sec.includes(k))) continue;
    const lines = sec.split(/\n/).map((l) => l.trim()).filter(Boolean);
    kept.push(lines.slice(0, 4).join('\n').slice(0, 160));
    if (kept.join('').length >= BEAT_LORE_MAX_CHARS) break;
  }

  let out = kept.join('\n').trim();
  if (!out) {
    const lines = raw.split(/\n/)
      .map((l) => l.trim())
      .filter((l) => l && /地点|时间|POV|当前|时空|状态|角色/.test(l) && l.length <= 60
        && !/Story Clock|信息边界|Semantic Protected/.test(l));
    out = lines.slice(0, 4).join('\n');
  }
  return clipChars(out, BEAT_LORE_MAX_CHARS);
}

/** 末 2 句优先（动作链续写）；首拍仍可用 1 句；maxChars>0 时向前收满续写窗（Beat2+ 可见已写进度） */
export function takeContinuationTail(text = '', { preferOne = false, sentences = 2, maxChars = 0 } = {}) {
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
  if (maxChars > 0) {
    // 从末句向前收满 maxChars 左右：把「已发生的场景动作」送进 prompt，
    // 避免模型看不到已写内容而每拍重开整场（ch1 scene3 六拍全重写同一场景）。
    const out = [];
    let len = 0;
    for (let i = parts.length - 1; i >= 0 && len < maxChars; i--) {
      out.unshift(parts[i]);
      len += parts[i].length;
    }
    return out.join('');
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

/** HPA-01: identify Actual/WCT presentation parts (verbose or already compact). */
function isActualTruthPart(part = '') {
  return /Previous Scene Occurrence Events|Proven World Consequences|Proven Actual \(compact\)|Proven WCT \(compact\)/u
    .test(String(part || ''));
}

/**
 * 预算裁剪：永远保住 beat 指令 + 续写末句 + 收束禁令；先砍 lore/map/章目标
 *
 * HPA-01: Established Actual/WCT must survive as minimal equivalent presentation.
 * Does NOT protect the full verbose Actual block via PROTECT_RE (avoids crowding out Plan/Beat).
 * Does NOT invent Actual/WCT, delete Plan, or rank Actual>Plan.
 */
export function clipBeatPromptToBudget(parts, budget = BEAT_PROMPT_CHAR_BUDGET) {
  const list = [...parts].filter(Boolean);
  const join = () => list.join('\n\n');
  if (join().length <= budget) return join();

  // HPA-01: capture + compact proven truth BEFORE soft/mid/last-resort can erase it
  const originalTruthParts = list.filter((p) => isActualTruthPart(p));
  const compactTruth = originalTruthParts.length
    ? compactActualTruthForBudget(originalTruthParts.join('\n\n'))
    : '';
  if (compactTruth) {
    let replaced = false;
    for (let i = 0; i < list.length; i += 1) {
      if (!isActualTruthPart(list[i])) continue;
      if (!replaced) {
        list[i] = compactTruth;
        replaced = true;
      } else {
        list[i] = '';
      }
    }
  }
  if (join().length <= budget) return join();

  // 保护组：目标链 / 情绪锚点 / … / F1 — 绝不被删除
  // HPA-01: protect only the *compact* truth markers (small), never the verbose Occurrence dump
  const PROTECT_RE = /### 目标链|本拍情绪目标|本拍必须有可共情的情绪|系统信息主观化|中段不踏步|避免复用已用措辞|叙述人称固定|角色名限定|## 当前 Beat|【修正指令|【前文叙事|【续写原文|【环境触发器|【角色此刻|【叙事推进|【情绪|【禁止|【Beat 计划缺口|Scene 衔接|Scene 开场|本拍超出本场景计划|Semantic Protected|Story Clock|故事钟|信息边界|Information Boundary|Previous Scene Observed Continuity|scene-derived · previous|Scene explicit goal|Plan Validity|Execution Privilege|narrative goal〔STRATEGIC|Proven Actual \(compact\)|Proven WCT \(compact\)/;
  const protectedIdx = new Set(
    list.map((p, i) => (PROTECT_RE.test(p) ? i : -1)).filter((i) => i >= 0),
  );

  const softIdx = list
    .map((p, i) => ({ p, i }))
    .filter(({ p, i }) => !protectedIdx.has(i) && /本 Beat 设定摘录|Story Map|章目标|作者意图/.test(p))
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
  if (out.length <= budget) {
    return ensureActualTruthSurvival(out, compactTruth, budget);
  }

  // 保护块（含 F1 Clock/IB）单独抽出，中段裁剪 / 最后手段时回补
  const protectedBlocks = list
    .filter((p) => PROTECT_RE.test(p))
    .map((p) => p.trim())
    .filter(Boolean);
  const f1Blocks = protectedBlocks.filter((p) => /Semantic Protected|信息边界|Information Boundary/u.test(p)
    || (/^## Story Clock/m.test(p) && !/Previous Scene Observed Continuity/u.test(p)
      && !/Proven Actual \(compact\)/u.test(p)));

  // 仍超限：从中段砍，保住尾部「紧接续写」与收束句；头部回补 F1
  // F7.1: 若含 Observed Continuity，跳过中段砍
  // HPA-01: 若含 Actual/WCT truth，同样跳过中段砍（会截断 compact / occurrence）
  const tailMarkers = ['### 紧接续写', '只写本 Beat'];
  let keepFrom = -1;
  for (const m of tailMarkers) {
    const idx = out.lastIndexOf(m);
    if (idx >= 0) keepFrom = keepFrom < 0 ? idx : Math.min(keepFrom, idx);
  }
  const hasOcBlock = protectedBlocks.some((p) => /Previous Scene Observed Continuity/u.test(p));
  const hasTruthBlock = Boolean(compactTruth)
    || protectedBlocks.some((p) => /Proven Actual \(compact\)|Proven WCT \(compact\)/u.test(p));
  if (keepFrom > 80 && !hasOcBlock && !hasTruthBlock) {
    const f1 = f1Blocks.join('\n\n');
    const headBudget = Math.max(200, budget - (out.length - keepFrom) - 3 - (f1 ? f1.length + 4 : 0));
    const head = out.slice(0, Math.max(80, headBudget));
    out = f1
      ? `${f1}\n\n${head}…\n\n${out.slice(keepFrom)}`
      : `${head}…\n\n${out.slice(keepFrom)}`;
  }
  // Force last-resort when mid-clip dropped protected Beat or HPA-01 truth
  const beatWasProtected = protectedBlocks.some((p) => /^## 当前 Beat/u.test(p));
  const beatMissing = beatWasProtected && !/^## 当前 Beat/mu.test(out);
  const truthMissing = Boolean(compactTruth) && !promptPreservesActualTruth(out);
  // 最后手段：F1 压缩 + HPA-01 compact Actual/WCT + F7.1 OC + Beat + Goal + 收束
  if (out.length > budget || beatMissing || truthMissing) {
    const tail = out.slice(-80);
    const secondary = protectedBlocks.filter((p) => !f1Blocks.includes(p));
    const oc = secondary.find((p) => /Previous Scene Observed Continuity/u.test(p)) || '';
    const beatP = secondary.find((p) => /^## 当前 Beat/u.test(p)) || '';
    const goalP = secondary.find((p) => /Scene explicit goal/u.test(p)) || '';
    const pvP = secondary.find((p) => /Plan Validity|Execution Privilege/u.test(p)) || '';
    const truthFromParts = secondary.find((p) => /Proven Actual \(compact\)|Proven WCT \(compact\)/u.test(p)) || '';
    const truthBlock = compactTruth || truthFromParts || '';
    const ocLines = oc ? oc.split('\n') : [];
    const unresolvedLines = ocLines.filter((l, i, arr) => {
      if (/^\*\*unresolved/u.test(l)) return true;
      if (/^-\s/u.test(l)) {
        const h = arr.slice(0, i).reverse().find((x) => /^\*\*/u.test(x));
        return h && /^\*\*(unresolved|confirmed)/u.test(h);
      }
      return false;
    }).slice(0, 6);
    const compactOc = [
      '### Previous Scene Observed Continuity',
      '> **F7.1**：unresolved remain unresolved unless this Scene explicitly resolves them. Goal≠prior settlement. Beat After=EXPECTED TARGET≠Actual.',
      ...unresolvedLines,
    ].join('\n');
    const compactBeat = beatP ? beatP.split('\n').slice(0, 5).join('\n') : '';
    const compactGoal = goalP ? String(goalP).slice(0, 220) : '';
    const compactPv = pvP
      ? [
        '### Plan Validity · Execution Privilege',
        '> INVALID · demoted · Strategic Goal 保留 · 禁止跳过 Actual 直接执行开场前提',
      ].join('\n')
      : (/STRATEGIC|执行资格已降级/u.test(compactGoal)
        ? '### Plan Validity · Execution Privilege\n> INVALID · demoted · Strategic Goal 保留 · 禁止跳过 Actual 直接执行开场前提'
        : '');
    const f1 = f1Blocks.join('\n\n');
    // Reserve truth first — F1 shrinks; Plan/Beat may remain alongside truth
    const reservedTruth = truthBlock ? String(truthBlock) : '';
    const roomForF1 = Math.max(
      60,
      budget - 1 - reservedTruth.length - compactOc.length - compactPv.length
        - compactGoal.length - compactBeat.length - tail.length - 20,
    );
    out = [f1.slice(0, roomForF1), reservedTruth, compactOc, compactPv, compactGoal, compactBeat, tail]
      .filter(Boolean)
      .join('\n\n');
    if (out.length > budget) {
      // Extreme: keep truth + goal + beat + tail; drop F1/OC/PV first
      out = [reservedTruth, compactGoal, compactBeat, tail]
        .filter(Boolean)
        .join('\n\n');
    }
    if (out.length > budget) {
      // Still over: keep truth + beat + tail; shrink goal
      const roomGoal = Math.max(
        0,
        budget - reservedTruth.length - compactBeat.length - Math.min(tail.length, 40) - 12,
      );
      const g = compactGoal ? String(compactGoal).slice(0, roomGoal) : '';
      out = [reservedTruth, g, compactBeat, tail.slice(-40)].filter(Boolean).join('\n\n');
    }
    if (out.length > budget) {
      // Prefer truth + beat over goal
      out = [reservedTruth, compactBeat, tail.slice(-40)].filter(Boolean).join('\n\n');
    }
    if (out.length > budget) {
      out = out.slice(0, budget - 1);
    }
  }
  return ensureActualTruthSurvival(out, compactTruth, budget);
}

/**
 * HPA-01 post-condition: if proven compact truth existed, reinject when lost.
 * Never fabricates truth when compactTruth is empty.
 */
function ensureActualTruthSurvival(out, compactTruth, budget) {
  if (!compactTruth) return out;
  if (promptPreservesActualTruth(out)) return out;
  const inject = String(compactTruth);
  const combined = `${inject}\n\n${out}`;
  if (combined.length <= budget) return combined;
  // Prefer keeping truth; trim the non-truth tail
  const room = Math.max(40, budget - inject.length - 2);
  return `${inject}\n\n${String(out).slice(-room)}`.slice(0, budget - 1);
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
  profile = null,
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
  // F1: dedicated protected part (also inside lore) — survives clipBeatPromptToBudget via PROTECT_RE
  const protectedSemantic = buildProtectedSemanticContext({
    loreText: String(basePrompt || ''),
    intent: intent || {},
    scene: scene || {},
  });
  const beatOrder = Number(beat.order) || 1;
  const totalN = Number(total) || 0;
  const isLastBeat = beatOrder > 1 && totalN > 0 && beatOrder === totalN;

  // ── 七元素 sceneContext：环境 + POV 内核 + 拍计划 + 情绪基线 ──
  // bookDir 来自 intent/scene（studio-llm-writer 注入），chapter 来自 intent._chapter。
  const povName = String(rendered?.anchor?.pov || intent?.pov || executionPlan?.pov || scene?.pov || 'POV').trim();
  const sceneIndexForCtx = scene?.index ?? executionPlan?.sceneIndex ?? 1;
  const sceneCtx = loadSceneContext({
    bookDir: intent?._bookDir || scene?._bookDir,
    chapter: intent?._chapter ?? executionPlan?.chapter ?? scene?._chapter,
    sceneIndex: sceneIndexForCtx,
    povName,
  });
  const beatMeta = (sceneCtx.beats || []).find((b) => Number(b.order) === beatOrder) || null;
  const narrativePush = String(beatMeta?.narrativePush || '').trim();
  // 跨 Scene 衔接：上一场景已写正文末尾（仅本 Scene 首拍用；续写基准从上一场景终态接，
  // 而非回退到场景开始状态重立——修 scene 边界回覆）
  const prevSceneTail = loadPrevSceneTail(intent, scene, executionPlan);
  // F6.2: Observed Continuity for Scene opening beat (structured; Plan cannot invent settlement)
  // Phase 1 / HPA-01 follow-on: Actual/WCT readback — same-chapter OR chapter-seam (align compiler)
  let observedContinuityLine = '';
  let actualEventsLine = '';
  if (Number(beat.order) <= 1) {
    const sceneIndex = Number(scene?.index) || Number(executionPlan?.sceneIndex) || 0;
    const sameChapterPrev = (intent?.scenes || [])
      .filter((s) => Number(s.index) < sceneIndex && String(s.text || '').trim());
    if (sceneIndex > 1 && sameChapterPrev.length) {
      for (const ps of sameChapterPrev) ensureObservedContinuity(ps);
      const clock = resolveStoryClock({ intent, scene });
      const bundle = collectPreviousObservedContinuity(sameChapterPrev, {
        planText: String(scene?.goal || executionPlan?.scenePlan?.goal || ''),
      });
      observedContinuityLine = formatObservedContinuityBlock(bundle, clock);
      actualEventsLine = formatActualEventsBlock(collectPreviousActualEvents(sameChapterPrev));
    } else if (sceneIndex <= 1 || !sameChapterPrev.length) {
      // EO-P4-Chapter-Seam-Actual-Readback-01: Studio Beat path must match Runtime compiler
      const bookDir = intent?._bookDir || scene?._bookDir || null;
      const chapter = intent?._chapter ?? executionPlan?.chapter ?? scene?._chapter;
      const seamPrev = loadPriorChapterScenesForActual(bookDir, chapter);
      if (seamPrev.length) {
        actualEventsLine = formatActualEventsBlock(collectPreviousActualEvents(seamPrev));
      }
    }
  }
  // F8.3: Plan Validity demotion (session/prompt; keep strategic goal; ≠ regenerate)
  if (scene && !scene.planValidity && Number(scene?.index) > 1) {
    ensurePlanValidity(scene, intent || {});
  }
  const planValidityBlock = Number(beat.order) <= 1
    ? formatPlanValidityDemotionBlock(scene?.planValidity)
    : '';
  const demoted = isExecutionPrivilegeDemoted(scene?.planValidity);
  // 七元素叙事块（主驱动）：【前文叙事】【续写原文】【环境触发器】【角色此刻】【叙事推进】【情绪】【禁止】
  // 【续写原文】在此含（末 100 字），不再单独发「紧接续写」尾部。
  const narrativeBlock = buildBeatPrompt(beatOrder, sceneCtx, accumulatedText, accumulatedText, beat, prevSceneTail);
  const transition = buildTransitionHint(prevBeat, beat);
  const continuityBlock = formatBeatContinuitySummary(continuityState, beatMemory, profile);
  const eventDirective = formatEventPhaseDirective(continuityState, beat, profile);
  const drive = resolvePriorityDrive({
    scene,
    intent: intent || executionPlan?.intent,
    executionPlan,
    desire: executionPlan?.characterDesire || intent?.characterDesire,
    conflict: executionPlan?.conflict,
  });
  // Scene goal 块逐拍重复会加重重开；Beat2+ 只保留目标首分句作锚。
  const driveForBeat = Number(beat.order) <= 1 || !drive?.priority
    ? drive
    : { ...drive, priority: String(drive.priority).split(/[。；]/u)[0] || drive.priority };
  // Scene goal 块：有显式 goal 即可注入（中性措辞）；fear/stakes 仅作附加字段，不作「最高优先」门槛。
  // 仍跳过纯 cyber 默认 fear/stakes 假填充（若残留）。
  const CYBER_FEAR = '死在这里、什么都改不了';
  const CYBER_STAKES = '付出血肉/权限/神魂代价';
  const fearOk = !drive?.fear || drive.fear !== CYBER_FEAR;
  const stakesOk = !drive?.stakes || drive.stakes !== CYBER_STAKES;
  const driveIsReal = Boolean(drive?.priority) && fearOk && stakesOk;
  const priorityBlock = driveIsReal ? formatPriorityDriveBlock(driveForBeat, beat, continuityState) : '';
  // F7.1: Decision gate at L4 — strip fake choice from persisted non-choice beats
  const structuralBeat = String(beat.structuralBeat || beat.id || '').trim();
  const safeLibraryBeat = sanitizeLibraryBeat(structuralBeat, beat.libraryBeat);
  let libraryInstr = remapLibraryInstruction(
    safeLibraryBeat,
    beat.libraryInstruction || '',
    continuityState,
  );
  if (
    String(beat.libraryBeat) === 'Decision' && safeLibraryBeat !== 'Decision'
  ) {
    libraryInstr = libraryBeatInstruction(safeLibraryBeat, structuralBeat);
  } else if (
    safeLibraryBeat !== 'Decision' && /Decision[：:]/u.test(String(libraryInstr))
  ) {
    libraryInstr = libraryBeatInstruction(safeLibraryBeat || 'Discovery', structuralBeat);
  }

  // S8.2：Scene 目标 = 显式 goal；priorityGoal 若存在仅为 goal 透传，禁止 desire/排序裁决
  const rawSceneGoal = String(executionPlan.scenePlan?.goal || scene?.goal || '').trim();
  const derivedPriority = String(
    executionPlan?.scenePlan?.priorityGoal || '',
  ).trim();
  // 透传优先用 goal；priorityGoal 仅当与 goal 同源清洗结果时可用（不再用 desire 压缩值）
  const sceneGoal = slimSceneGoalLine(rawSceneGoal || derivedPriority, 180);
  // 收尾锚点必须取自完整目标尾部 2 分句（首拍注入完整版；Beat2+ 只给锚点，方向由【叙事推进】承担）
  const closingSource = rawSceneGoal || sceneGoal;
  const sceneClosing = closingSource
    ? closingSource.split(/[。；]/u).map((s) => s.trim()).filter(Boolean).slice(-2).join('。') + '。'
    : '';
  const hasUnresolvedOc = /unresolved/u.test(observedContinuityLine)
    || /open_choice/u.test(observedContinuityLine);
  const sceneGoalLine = !sceneGoal
    ? ''
    : beatOrder <= 1
      ? (demoted
        ? `Scene explicit goal〔STRATEGIC · 保留〕（开场前提执行资格已降级；禁止当作已成立开场直接执行；Goal≠prior settlement）：${sceneGoal}`
        : hasUnresolvedOc
          ? `Scene explicit goal〔CURRENT INTENT〕（本场行动方向；不得把上一场 unresolved 改写成已结算事实）：${sceneGoal}`
          : `Scene explicit goal〔CURRENT INTENT〕（场景层；非 Character Dominance）：${sceneGoal}`)
      : `Scene 进度（本 Scene 前 ${beatOrder - 1}/${total} 段已写完${isLastBeat ? '，本拍收尾' : ''}，见上方「续写原文」；本拍从上一拍结尾续写，勿回到场景开头重写已发生动作）：收尾锚点 → ${sceneClosing}`;
  // Beat2+ 不再反复灌章目标/作者意图 pitch（多轨重开场燃料）
  const chapterGoal = Number(beat.order) <= 1
    ? slimSceneGoalLine(intent?.chapterIntent || intent?.mainGoal || '', 180)
    : '';
  // P3.2 C3：sceneSeed/lore 别名已收敛——只剩 authorIntent 单链回退。
  // P3.5-1：② executionPlan.scenePlan.authorIntent 载体已删（scene-execution 场景出口剔除）；
  // 消费端改读 ④ scene.scenePlan.authorIntent（sceneSeeds 兜底语义保留，值等价）。
  const authorIntent = Number(beat.order) <= 1
    ? slimSceneGoalLine(
      scene?.authorIntent
      || scene?.scenePlan?.authorIntent
      || '',
      48,
    )
    : '';
  const spatial = scene?.spatialAnchor?.location
    || executionPlan.situation?.location
    || continuityState?.location
    || '';
  // 场景过渡强制锚定：Scene 首拍默认须写出「在哪 + 何时」；但拿到上一场景终态时，
  // 「重新确立场景坐标」会诱导模型重演上一场景动作（scene3 又写橘子滚/老周离开）——
  // 改为从上一场景终态直接续写（用户诊断：场景锚定应用 ch1_s2_end 而非 ch1_s3_start）。
  const isSceneOpenWithTail = Number(beat.order) === 1 && Boolean(String(prevSceneTail || '').trim());
  const openingAnchor = Number(beat.order) === 1
    ? (isSceneOpenWithTail
      ? 'Scene 开场锚定：本场紧接上一场景末尾（时间/地点已在「Scene 衔接」给定）。首句直接续写上一场景结束后的下一瞬间——上一动作的后果或下一步，禁止重新交代人物来去、禁止重演上一场景已写的动作与对白。'
      : (spatial
        ? `Scene 开场强制锚定：首句必须写「现在在哪（${String(spatial).slice(0, 40)}）+ 当前时间/距上幕过了多久」，给出空间与时间坐标后再进入动作。`
        : 'Scene 开场强制锚定：首句必须写「角色现在所在的空间位置 + 当前时间/距上幕过了多久」，由本段首次确立场景坐标，禁止悬空直接进入动作。'))
    : '';
  // 跨 Scene 衔接锚点（仅 Scene 首拍）：上一场景终态在此接续，禁止重演上一场景已写动作
  // ——避免「scene3 开头又写'老周背影消失，手够到橘子'」这类场景边界回覆。引用按完整句，不截半句。
  const sceneJoinLine = isSceneOpenWithTail
    ? `Scene 衔接：上一场景终态——「${takeContinuationTail(prevSceneTail, { sentences: 2, maxChars: 60 })}」。本场景从这里继续：只写它之后发生的事，禁止重演上一场景已写出的动作/对白/心理。`
    : '';

  // 运行时 LibraryBeat 会把每场景膨胀到 ~6 拍，而渲染器 plan 只定义 3–4 拍。超出 plan 的拍无叙事指令，
  // 模型会即兴展开新情节线——scene2 漂移进周岚信（scene3 内容）、scene3 拍5-6 回勾「橘子滚到《辞海》」。
  // 对超出拍注入「收束回锚」：把本场景最后一个 plan 拍写完即止，下一场景内容禁止提前写。
  const planBeatList = Array.isArray(sceneCtx?.beats) ? sceneCtx.beats : [];
  const planBeatCount = planBeatList.length;
  const planExceeded = planBeatCount > 0 && beatOrder > planBeatCount;
  const sceneEndPush = planBeatList
    .map((b) => String(b.narrativePush || '').trim()).filter(Boolean).pop() || '';
  const nextScenePush = (() => {
    try {
      const next = loadPlanBeats(
        intent?._bookDir || scene?._bookDir,
        intent?._chapter ?? executionPlan?.chapter ?? scene?._chapter,
        sceneIndexForCtx + 1,
      );
      return String((Array.isArray(next) ? next : [])[0]?.narrativePush || '').trim();
    } catch {
      return '';
    }
  })();
  const beyondPlanLine = planExceeded && sceneEndPush
    ? `本拍超出本场景计划（计划 ${planBeatCount} 拍）：不要展开新情节线/新对白/新意象，只把「${sceneEndPush.slice(0, 20)}」写完并收束本场景${nextScenePush ? `；它之后的「${nextScenePush.slice(0, 20)}」属于下一场景，禁止提前写` : ''}。`
    : '';

  // 本拍指令：优先用 plan beats 的叙事推进覆盖 director 对安静场景的 goal 复述（重开燃料）。
  const beatInstr = String(
    narrativePush
      ? `${narrativePush}——本拍只推进这一步叙事`
      : (libraryInstr || rendered.content || beat.content || beat.libraryInstruction || ''),
  );
  const beatInstrLine = demoted && beatOrder <= 1
    ? `- 指令〔STRATEGIC · 非开场既成〕：${slimSceneGoalLine(beatInstr, 72)}（须先 bridge Actual；禁止开场直接写成已在该状态）`
    : `- 指令：${slimSceneGoalLine(beatInstr, 88)}`;
  const beatBlock = [
    `## 当前 Beat ${beat.order}/${total}：${beat.label || safeLibraryBeat || beat.libraryBeat || 'Beat'}`,
    `- Before〔EXPECTED〕：${String(before).slice(0, 60)}`,
    `- After〔EXPECTED TARGET〕：${String(after).slice(0, 60)}`,
    `- 字数：约 ${budget}（≤${Math.round(budget * 1.3)}）`,
    beatInstrLine,
    rendered.writerBlock ? `- 动作：${String(rendered.writerBlock).replace(/\n/g, ' ').slice(0, 100)}` : '',
  ].filter(Boolean).slice(0, 8).join('\n');

  // Beat 计划缺口（2026-08-18，Beat Plan 退化硬化 Step 2/3/4）：
  // Planner 已把模板/元指令判为 missing——本拍 prompt 显式点名缺口，逼模型填具体内容，
  // 禁止用「继续/推进/制造/释放」填空。只新增 part，不改 budget / PROTECT_RE 裁剪行为。
  const gapMissing = Array.isArray(beat.beatPlan?.missing) ? beat.beatPlan.missing : [];
  const gapBlock = gapMissing.length
    ? [
        '【Beat 计划缺口】',
        ...gapMissing.map((m) => `- ${m}`),
        '以上缺口本拍必须补成具体内容：具体动作/两难抉择/点名物件·事实·后果/未完成的悬念动作。写不出具体内容按硬失败拒稿，禁止模板复述。',
      ].join('\n')
    : '';

  // ── 方案 B：情绪锚点（每拍必写）— 来自 emotionWave.beatTargets，杜绝「系统音+动作」流水账 ──
  const emotionAnchor = beat.targetEmotionZh || beat.targetEmotion || executionPlan.targetEmotionZh || null;
  const emotionLine = emotionAnchor
    ? `本拍情绪目标：${emotionAnchor}。把情绪写进身体与动作（发抖/咬牙/耳鸣/声音发颤），禁止只报系统提示与机械动作。`
    : '本拍必须有可共情的情绪：疼要写进身体，怕/恨/不甘要用动作或对白泄漏，禁止只有机械动作+系统提示音。';

  // ── 视角一致性：固定叙述人称（第三人称 + POV 姓名），禁止第一人称旁白 ──
  const povLine = `叙述人称固定：全章第三人称（用「${povName}」「他」），叙述旁白一律不用「我/我的」。角色对白里的「我」除外。禁止同一段内人称跳变。`;
  // POV 信息过滤：非 POV 角色的情报必须经 povName 感官呈现，禁止旁白 dump / 他者内心戏
  // 角色名单来自书籍档案（profile.characters = 03_character_bible 目录），缺省回退内置白名单。
  const knownNames = profile?.characters?.length ? profile.characters : KNOWN_CHARACTERS;
  const isCyberCast = knownNames.includes('林砚');
  const nonPovNames = knownNames.filter((c) => c !== povName).join('、');
  const povFilterLine = isCyberCast
    ? `POV 信息过滤：非 POV 角色（${nonPovNames}）的动向与情报，必须通过 ${povName} 的感官呈现——他看到的屏幕数据、他听到对方声音里的颤抖、他扫过的监控画面。禁止「耳机传来：…」式旁白 dump，禁止写非 POV 角色的内心戏与独立视角。`
    : `POV 信息过滤：非 POV 角色（${nonPovNames}）的动向与情报，必须通过 ${povName} 的感官呈现——他看到的、听到的、嗅到的，禁止旁白 dump，禁止写非 POV 角色的内心戏与独立视角。`;

  // ── 角色名一致性：只能用设定角色，禁止发明新名字 ──
  const nameLine = isCyberCast
    ? `角色名限定：只使用设定角色（${knownNames.join('、')}）；妹妹/灵魂锚点对象用「林薇」，禁止发明未设定的人名。`
    : `角色名限定：只使用设定角色（${knownNames.join('、')}）；禁止发明未设定的人名。`;

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

  // ── 系统提示主观化 + 中段循环终结（正向指令，随状态逐步收紧）──
  const sysLineGuard = (Number(continuityState?.systemLineCount) || 0) >= 1
    ? '系统信息主观化：屏幕上任何数据/提示都要翻译成林砚的感知、情绪或身体反应（视线发烫、牙齿咬紧、汗毛竖起），禁止直接引用【...】原始格式。'
    : '';
  const loopGuard = (Number(continuityState?.interactLoops) || 0) >= 2
    ? '中段不踏步：上一拍已反复「操作→痛苦→反馈」，本拍必须终结这条循环——写成不可逆的转折、反噬或直接跳进下一危机，禁止再来一轮同类交互。'
    : '';
  const phraseGuard = (continuityState?.usedPhrases || []).length
    ? `避免复用已用措辞（${continuityState.usedPhrases.slice(0, 3).join('、')}）；换一种身体/感官/对白的写法。`
    : '';

  // T4 硬失败重规划：把 orchestrator 挂到 scene 的【修正指令】显式注入 beat prompt（放在最前，最高优先级）。
  // 不依赖 slimLoreForBeat——那条路径按键切片会滤掉非标签文本，修正指令到不了这里。
  const hardFailCorrection = String(scene?._hardFailCorrection || intent?._hardFailCorrection || '').trim();
  // 预防式复读硬闸：把 Validator 的硬失败判据（开场 ≥7 字原样复读即拒稿）前置成每拍生成约束，
  // 避免「先复读→再修正」的闭环浪费。ch1/ch2 幕内开场复读 4 次重规划（3 次/章）全败的根因是
  // 点名短语打地鼠追不上「换句重开」；机械阈值闸直接掐掉重开行为本身。Beat1 走 Scene 开场锚定，不重复上闸。
  const reopenGuard = Number(beat.order) > 1
    ? '【禁止复读硬闸】本拍开头句不得与本章已写正文（含本场景前几拍）出现 ≥6 字连续重叠（原样或近义改写）。必须从「续写原文」之后推进新动作/新对白/新细节，绝不拿更早的任何句子作开场。'
    : '';
  const parts = [
    hardFailCorrection ? hardFailCorrection : '',
    reopenGuard ? reopenGuard : '',
    // F1: Clock + IB before narrative/history — protected by PROTECT_RE
    protectedSemantic,
    // Phase 1 / S3: Previous Scene Occurrence Events (text-derived; ≠ Attribution / Choice)
    actualEventsLine,
    // F6.2: Previous Scene Observed Continuity (scene-derived; ≠ Plan / Canon / SR)
    observedContinuityLine,
    // F8.3: Plan Validity demotion (opening premise privilege only; Goal retained)
    planValidityBlock,
    // 七元素叙事块（主驱动）：环境触发器 / 角色此刻 / 叙事推进 替代 T1 静态快照与 T2 动作序列。
    // 【续写原文】已内含，不再单独发「紧接续写」尾部。
    narrativeBlock,
    // 场景边界两行紧随七元素块之后（预算裁剪 keepFrom 阶段只保 head 前 ~600 字，
    // 排在目标链大块之后会被裁掉——场景边界优先级高于目标链）
    openingAnchor,
    sceneJoinLine,
    chapterGoal ? `章目标（导航）：${chapterGoal}` : '',
    sceneGoalLine,
    isLastBeat ? '本拍为场景收尾拍：达成「收尾锚点」后收束本场景，可写余韵/悬念，写完即停，不要开启新动作线。' : '',
    beyondPlanLine,
    // Scene explicit goal 块（Beat2+ 已裁成首分句）；无 goal 则省略
    priorityBlock || '',
    emotionLine,
    povLine,
    povFilterLine,
    nameLine,
    sysLineGuard,
    loopGuard,
    phraseGuard,
    authorIntent ? `作者意图：${authorIntent}` : '',
    spatial ? `空间锚点：${String(spatial).slice(0, 40)}` : '',
    continuityBlock,
    eventDirective,
    mapBrief,
    lore ? `### 本 Beat 设定摘录\n${lore}` : '',
    gapBlock ? gapBlock : '',
    beatBlock,
    completed.length ? `已完成标签：${completed.join(' → ')}` : '本 Scene 首段',
    remaining.length ? `后续（勿抢写）：${remaining.join(' → ')}` : '',
    transition ? `衔接：${transition}` : '',
    revealGuard,
    actionGuard,
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
