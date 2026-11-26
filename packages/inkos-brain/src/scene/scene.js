/**
 * Scene Planner & Scene Writer prompts
 */
import { resolveStoryClock, formatStoryClockForPrompt } from '../../../inkos-core/src/lib/story-clock.js';
import { resolveGoldenSampleCLI, resolveNarrativePrinciples } from '../../../inkos-writer/src/golden-sample.js';
import { clipGoalToSentenceBoundary } from '../memory/state-updater.js';

export function buildScenePlan(intent) {
  return intent.scenes.map((scene) => ({
    ...scene,
    status: 'pending',
    wordTarget: scene.beat === 'hook' ? 600 : 800,
    reviewRequired: true,
  }));
}

export function buildSceneWritePrompt(ctx, intent, scene, dynamicPrompt) {
  // Lore seed only — 最终 Prompt 必须经 Runtime PromptCompiler.compile()，禁止外部再拼接
  const lore = typeof dynamicPrompt === 'string'
    ? dynamicPrompt
    : (dynamicPrompt?.text || '');
  const clock = resolveStoryClock({ ctx, intent, scene });
  const clockBlock = formatStoryClockForPrompt(clock);

  // 1a-1: golden sample / narrative principles 接线（1b-5 分隔符重排：规则在前、范例在后）
  const bookDir = ctx?.bookDir || null;
  const { sample: goldenSample, source: goldenSource } = resolveGoldenSampleCLI({
    bookDir,
    styleDna: ctx?.voiceDna || null,
  });
  const { principles, source: principlesSource } = resolveNarrativePrinciples({ bookDir });
  const principlesBlock = [
    '【否决性规则 · 叙事效率原则】（不是风格建议 · 来源: ' + principlesSource + '）',
    principles,
  ].join('\n');
  const goldenBlock = [
    '【风格参照 · 效率范例】（下限参照，不是模仿上限；允许在节奏/悬念/语言效率上超过它 · 来源: ' + goldenSource + '）',
    '---',
    goldenSample.slice(0, 600),
    '---',
  ].join('\n');

  // 1b-2: scene goal 戏剧指令模板——旧模板「承接上章情绪……承接……进入现场：」
  // 是 plan 语言机械拼接，不构成可执行戏剧指令。改为强制结局条件：
  // 本 Scene 结束时主角必须【动词槽位】……；若未发生，本 Scene 失败。
  const sceneGoalLine = buildSceneGoalDirective(intent, scene);

  // 1b-2: 冲突占位符过滤——no_causal_basis 等下划线占位符不得进入 prompt
  const conflictText = sanitizeConflict(scene.conflict);

  // 1b-2: 上一章结尾状态（概括，不贴原文；空则用情绪/处境句式，不留空）
  const prevEnding = buildPrevEndingSummary(intent, ctx);

  const lines = [
    '# Scene Lore Seed',
    '',
    `Scene ${scene.index}/${intent.scenes.length} · POV ${intent.pov}`,
    sceneGoalLine,
    conflictText ? `- 冲突: ${conflictText}` : '',
    `- 节拍: ${scene.beat}`,
    principlesBlock,
    goldenBlock,
    scene.wordTarget ? `- 字数: ~${scene.wordTarget}` : '',
    intent.actionLine ? `- 本章行动线（各 Scene 推进同一条线）: ${intent.actionLine}` : '',
    intent.mustLose ? `- 代价: ${intent.mustLose}` : '',
    prevEnding ? `- 上一章结尾状态: ${prevEnding}` : '',
    '',
    '## 信息边界（Phase 1.R · 必守）',
    '- Scene 目标 / 冲突 / 章目标中的事实 = 写作任务与世界信息，**不是** POV 角色的先验 Awareness。',
    '- 若 Character Subjective State 中该角色 Awareness = omit：禁止写成其「已经知道 / 亲眼看见 / 确知」这些任务事实；允许本场新获知并写出获得过程。',
    '- World / Narration ≠ Character Knowledge。',
    '',
    clockBlock,
    '',
    lore,
  ];
  return lines.filter(Boolean).join('\n');
}

/**
 * 1b-2: 动词槽位——优先级 plan.goalVerb → 冲突类型推导 → 兜底。
 */
const CONFLICT_VERB_MAP = [
  [/追查|调查|线索|上一章末尾|真相/, '查清'],
  [/逃|跑|脱身|追捕/, '逃脱'],
  [/谈判|交易|交涉|博弈/, '谈成'],
  [/反击|对抗|反击阻碍|敌/, '完成反击'],
  [/隐瞒|掩饰|秘密/, '守住秘密'],
];

function resolveGoalVerb(intent = {}, scene = {}) {
  const planVerb = String(intent.goalVerb || scene.goalVerb || '').trim();
  if (planVerb && !planVerb.includes('_')) return planVerb;
  const corpus = `${scene.goal || ''} ${scene.conflict || ''} ${intent.mainGoal || ''}`;
  for (const [re, verb] of CONFLICT_VERB_MAP) {
    if (re.test(corpus)) return verb;
  }
  return '做出一个关闭选项的决定';
}

/**
 * 1b-2: 场景目标行——戏剧指令模板（结局条件式），替换 plan 语言拼接。
 * 目标槽为空时（scene.goal 与 mainGoal 都是占位符/残句）用上一章结尾状态补位，
 * 不留「【查清】；」空指令。
 */
export function buildSceneGoalDirective(intent = {}, scene = {}, ctx = {}) {
  const verb = resolveGoalVerb(intent, scene);
  let goalText = sanitizeGoalText(scene.goal, intent.mainGoal);
  if (!goalText) {
    // 空槽兜底：上一章结尾概括（章缝 Scene 1 常见——goal 本身就是承接指令）
    goalText = buildPrevEndingSummary(intent, ctx);
  }
  const target = goalText
    ? `本 Scene 结束时，主角必须【${verb}】${goalText}；若未发生，本 Scene 失败。`
    : `本 Scene 结束时，主角必须做出一个关闭选项的决定；若未发生，本 Scene 失败。`;
  return `- 目标: ${target}`;
}

/** 目标槽净化：去掉 plan 语言前缀与占位符，截到 40 字 */
function sanitizeGoalText(goal = '', mainGoal = '') {
  let t = String(goal || '').trim();
  if (!t || isPlaceholder(t)) t = String(mainGoal || '').trim();
  if (!t || isPlaceholder(t)) return '';
  // 去 plan 语言前缀（承接上章情绪…进入局面 · …进入现场：等机械拼接）
  t = t.replace(/^承接[^：:]*[：:]/, '');
  t = t.replace(/^克服阻碍[：:]/, '');
  t = t.replace(/\s+/g, '');
  // 再次净化（去前缀后可能露出占位符）
  if (isPlaceholder(t)) return '';
  // 残句截断（同 clipGoalToSentenceBoundary 口径：句界、残句开头丢弃），
  // 否则「追查上一章末尾局面：一片」这类尾残句仍会漏进目标槽。
  // 冒号前是 plan 引导语（追查上一章末尾局面）——目标槽只要可执行对象（冒号后），
  // 引导语残留 + 兜底词「上一章结尾局面」会产生「查清上一章结尾局面」空转指令。
  const clipped = clipGoalToSentenceBoundary(t);
  if (!clipped) return '';
  const afterColon = clipped.includes('：')
    ? clipped.split('：').slice(1).join('：').trim()
    : clipped;
  const actionable = afterColon
    .replace(/^上一章结尾局面$/, '')
    .replace(/^承接[：:]?/, '')
    .trim();
  return actionable.slice(0, 40);
}

/** 下划线占位符 / 模板串判定（no_causal_basis 等） */
function isPlaceholder(t = '') {
  const s = String(t || '').trim();
  if (!s) return true;
  if (/^no_causal_basis$/i.test(s)) return true;
  if (/^[\w_]+$/.test(s) && s.includes('_')) return true; // 下划线标识符（非中文句子）
  return false;
}

/**
 * 1b-2: 冲突字段净化——占位符不进 prompt，替换为生成指引并留日志。
 */
export function sanitizeConflict(conflict = '') {
  const t = String(conflict || '').trim();
  if (!t || isPlaceholder(t)) return '';
  return t;
}

/**
 * 1b-2: 上一章结尾状态——概括式（≤40 字，不贴原文）。
 * 优先 state-updater 概括（mainGoal 净化后是追查概括）；为空则用情绪/处境句式；
 * 再为空用 anchor recent_actuals 最后一条的句界净化（仍然概括，非原文粘贴）。
 * 禁止 tailExcerpt 原文、禁止「承接上章……：」拼接。
 */
/** 对白/引文片段不得作目标或状态槽——台词截断串不是局面概括 */
function hasDialogueFragment(t = '') {
  const s = String(t || '');
  return s.includes('「') || s.includes('」') || s.includes('“') || s.includes('”');
}

/** actuals 概括提取：去「导致对白成为场面已发生事实」类注解尾巴 */
function cleanActualSummary(t = '') {
  return String(t || '')
    .replace(/[，,]导致[^，。；]*$/, '')
    .replace(/^[^：:]*说出[：:]?/, '')
    .trim();
}

export function buildPrevEndingSummary(intent = {}, ctx = {}) {
  const anchor = ctx?.priorAnchor || intent?.priorAnchor || {};
  const mood = String(
    intent.emotionCarry || intent.emotion || anchor.narrative_momentum?.mood || '',
  ).trim().slice(0, 12);
  const summarized = clipGoalToSentenceBoundary(String(intent.mainGoal || ''));
  // 净化后的 mainGoal 本身是「追查上一章末尾局面：{概括}」——抽冒号后部分
  const tail = summarized.includes('：')
    ? summarized.split(/[：:]/).slice(1).join('：').trim()
    : '';
  if (tail && !tail.startsWith('承接') && tail !== '上一章结尾局面') {
    return tail.slice(0, 40);
  }
  // 注：anchor recent_actuals 逐条都是正文原句（台词截断/动作残片）——
  // 按规约（不贴原文）不作状态槽来源；mood/situation 缺失时走情绪/处境句式兜底。
  const situation = String(anchor.narrative_momentum?.situation || '').trim().slice(0, 20);
  // 情绪兜底：mood/situation 都缺时，从 intent.emotionCarry 等已有情绪信号取；
  // 全空则显式标注「悬置」——不留空、不贴原文
  return `上章以「${mood || '未标注情绪'}」收束，主角处于「${situation || '悬置局面'}」`;
}

export function reviewScene(scene, text, options = {}) {
  const issues = [];
  const len = text.replace(/\s/g, '').length;

  if (!options.importMode && len < scene.wordTarget * 0.4) {
    issues.push({ level: 'warning', msg: `Scene 过短（${len} 字）` });
  }
  if (/然后|接着|突然|之后/.test(text)) issues.push({ level: 'warning', msg: '含顺承词，违反硬切规则' });
  if (/他想起|他意识到|他觉得|他知道/.test(text)) issues.push({ level: 'warning', msg: '含禁词内心标记' });
  if (!text.trim()) issues.push({ level: 'critical', msg: 'Scene 正文为空' });

  const pass = !issues.some((i) => i.level === 'critical');
  return { sceneId: scene.id, pass, wordCount: len, issues };
}

export function assembleChapter(scenes) {
  // 防碎片：同一 scene.index 出现多次时只保留最后一个草稿（重开草稿堆叠时取最新一稿）
  const byIndex = new Map();
  for (const s of scenes) {
    if (!s || !s.text?.trim()) continue;
    const key = s.index != null ? s.index : (s.id || 'x');
    byIndex.set(key, s.text.trim());
  }
  return [...byIndex.values()].join('\n\n');
}
