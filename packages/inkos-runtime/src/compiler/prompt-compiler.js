/**
 * PromptCompiler — 单一编译入口 + 严格优先级栈 + Token 预算裁剪
 *
 * P0 Format & Guardrails  · 绝对保护，不可裁剪（含 Anchor Voice DNA）
 * P1 Narrative Task       · 绝对保护，不可裁剪
 * P2 Global Lore          · 超标时次优先裁剪（不含 Voice DNA）
 * P3 Adaptive Context     · 超标时优先裁剪
 *
 * Voice DNA 来自章级 Anchor，每章强制继承，永不参与裁剪。
 *
 * 编译完成后密封；外部禁止再拼接原始字符串。
 */
import { countTokens } from '../../../inkos-prompt/src/token-meter.js';
import {
  ensurePlanValidity,
  isExecutionPrivilegeDemoted,
  formatPlanValidityDemotionBlock,
} from '../../../inkos-prompt/src/plan-validity.js';
import {
  formatWriterCraftPromptBlock,
  resolveCraftMode,
  WRITER_CRAFT_POLICY,
} from '../../../inkos-director/src/writer-craft-runtime.js';
import {
  formatSceneWriterRuntimeBlock,
  formatWriterRuntimePolicyBlock,
} from '../../../inkos-director/src/writer-runtime.js';
import { formatHumanWritingPolicyBlock } from '../../../inkos-director/src/human-writing-policy.js';
import { formatChapterAuthorGoalBlock } from '../../../inkos-director/src/chapter-author-goal.js';
import { formatWriterSceneArcBlock } from '../../../inkos-director/src/writer-scene-arc.js';
import { formatConflictBlock } from '../../../inkos-director/src/conflict-engine.js';
import { formatSituationBlock } from '../../../inkos-director/src/situation-engine.js';
import { formatCharacterDesireBlock } from '../../../inkos-director/src/character-desire-engine.js';
import { formatCharacterTransformationBlock } from '../../../inkos-director/src/character-transformation.js';
import { formatCharacterBehaviorBlock } from '../../../inkos-director/src/character-behavior.js';
import { formatHookOutputBlock } from '../../../inkos-director/src/hook-ladder.js';
import { formatClimaxSceneBlock } from '../../../inkos-director/src/climax-engine.js';
import { formatEmotionCurveBlock } from '../../../inkos-director/src/emotion-curve-engine.js';
import { formatReaderEmotionBlock } from '../../../inkos-director/src/reader-emotion-engine.js';
import { formatBeatStateSequenceBlock } from '../../../inkos-director/src/beat-state.js';
import { formatSceneRhythmBlock } from '../../../inkos-director/src/chapter-rhythm.js';
import { formatVoiceDnaBlock } from '../../../inkos-director/src/voice-dna.js';
import {
  formatWriterExecutionChecklist,
  formatWriterFirstPolicyBlock,
} from '../../../inkos-director/src/writer-first.js';
import { renderCausalChain } from '../../../inkos-prompt/src/compiler.js';
import {
  buildProtectedSemanticContext,
  wrapHistoricalPriorExcerpt,
  markContinuationHistorical,
} from '../../../inkos-core/src/lib/prompt-survival.js';

export const PROMPT_STACK = Object.freeze({
  P0: {
    id: 'p0',
    label: 'P0 · Format & Guardrails',
    rule: '物理约束：格式 / 字数 / Craft·V2 / Anchor Voice DNA — 绝对保护',
  },
  P1: {
    id: 'p1',
    label: 'P1 · Narrative Task',
    rule: '故事约束：本章意图 / Scene · Beat Plan — 绝对保护',
  },
  P2: {
    id: 'p2',
    label: 'P2 · Global Lore',
    rule: '设定约束：Story DNA / Canon 摘录 / 人物快照 — 可裁剪（Voice DNA 已移出）',
  },
  P3: {
    id: 'p3',
    label: 'P3 · Adaptive Context',
    rule: '记忆与历史：上文 / Memory / Adaptive — 优先裁剪',
  },
});

/** 默认输入 Token 预算（启发式，与 countTokens 同口径） */
export const DEFAULT_TOKEN_BUDGET = Object.freeze({
  total: 7200,
  /** P0/P1 不参与裁剪；P2/P3 可裁至 floors；P2 与 P3 同级保底，防 World Bible 被砍光 */
  floors: { p0: 0, p1: 0, p2: 800, p3: 800 },
});

const SEAL = Symbol.for('inkos.prompt.sealed');

/**
 * @typedef {object} CompilationContext
 * @property {object} [scene]
 * @property {number} [chapter]
 * @property {object} [intent]
 * @property {object} [executionPlan]
 * @property {object} [storyDna]
 * @property {object} [voiceDna]
 * @property {string} [loreText]           Canon / dynamic compiler 摘录
 * @property {string} [worldBible]         novel/01_world_bible.md 原文（强制进 P2）
 * @property {string} [storyMemoryBlock]
 * @property {string} [adaptiveBlock]
 * @property {string} [priorExcerpt]       上文尾部
 * @property {string} [continuationBlock]
 * @property {string} [boundaryBlock]
 * @property {string} [revealBlock]
 * @property {string} [hookBlock]
 * @property {string} [commercialRules]
 * @property {string} [promptRulesBlock]
 * @property {string} [goldenSampleBlock]  风格样本（P0 最高优先，永不裁剪）
 * @property {string} [chapterTitleBlock]
 * @property {object} [writerChecklist]    已格式化 checklist 或对象
 * @property {number} [wordBudget]
 * @property {{ total?: number }} [tokenBudget]
 * @property {string} [craftMode]
 */

/**
 * @typedef {object} CompiledPrompt
 * @property {string} text
 * @property {{ p0: string, p1: string, p2: string, p3: string }} layers
 * @property {{ p0: number, p1: number, p2: number, p3: number, total: number }} tokens
 * @property {{ total: number, clipped: string[], withinBudget: boolean }} budget
 * @property {object} meta
 */

function nonEmpty(s) {
  return Boolean(String(s || '').trim());
}

function joinBlocks(...parts) {
  return parts.filter((p) => nonEmpty(p)).join('\n\n');
}

function truncateToTokens(text, maxTokens) {
  if (!text || maxTokens <= 0) return '';
  if (countTokens(text) <= maxTokens) return text;
  // 中文约 1.5 char/token → 保守切字符
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const slice = `${text.slice(0, mid)}\n…[P-clip]`;
    if (countTokens(slice) <= maxTokens) lo = mid;
    else hi = mid - 1;
  }
  return lo <= 0 ? '' : `${text.slice(0, lo)}\n…[P-clip]`;
}

function formatBeatPlan(executionPlan = {}) {
  const beats = executionPlan.beats || [];
  if (!beats.length) return '';
  const lines = [
    '### Beat Plan（须按序执行）',
    `SceneType：${executionPlan.sceneType || '—'} · 字数目标 ~${executionPlan.wordTarget || '—'}`,
  ];
  for (const b of beats) {
    lines.push(
      `${b.order}. **${b.label}** [${b.libraryBeat || b.structuralBeat}] · ~${b.wordBudget || '?'} 字`,
      `   ${(b.content || b.action || '').slice(0, 100)}`,
    );
  }
  return lines.join('\n');
}

function formatStoryDnaExcerpt(storyDna = {}) {
  if (!storyDna || typeof storyDna !== 'object') return '';
  const keys = ['core_hook', 'genre', 'protagonist', 'theme', 'tone', 'forbidden'];
  const lines = keys
    .filter((k) => storyDna[k])
    .map((k) => `- **${k}**：${String(storyDna[k]).slice(0, 120)}`);
  if (!lines.length) return '';
  return ['### Story DNA（摘录）', ...lines].join('\n');
}

/**
 * 角色对白风格 — 从 character bible 提取，注入 P1（不可被裁剪）。
 * 解决「角色语言无区分度」：林砚（短/冲/糙）vs 沈寒舟（冷静/精确）。
 */
function formatCharacterDialogueStyles(ctx) {
  const chars = ctx.characters || {};
  const lines = [];
  for (const [name, c] of Object.entries(chars)) {
    if (c?.voice) lines.push(`- ${name}：${c.voice}`);
    if (c?.catchphrase) lines.push(`  · 口头禅：${c.catchphrase}`);
  }
  if (!lines.length) return '';
  return ['### 角色对白风格（必须区分，禁止同质化）', ...lines,
    '- 不同角色用词、句长、节奏、口头禅须不同；读者应能从台词判断「这是谁在说话」',
  ].join('\n');
}

function formatNarrativeTask(ctx) {
  const { scene = {}, intent = {}, executionPlan = {}, chapter } = ctx;
  const ep = executionPlan;
  const hook = ep.hookOutput
    ? formatHookOutputBlock(ep.hookOutput)
    : (ep.hookLadderEntry?.hookOutput ? formatHookOutputBlock(ep.hookLadderEntry.hookOutput) : '');

  // D3.2：消费章级 causal_chain（P1 protected，不裁剪）。只读 scene/intent，禁止本层再推理。
  const causalChain = scene.causalChain || intent?.causalChain || null;
  const causalBlock = causalChain
    ? renderCausalChain(causalChain, scene, { pov: intent.pov || scene.pov || '' })
    : '';

  // F1: Story Clock + Information Boundary → P1 absolute protection (not ordinary P2 lore)
  const protectedSemantic = buildProtectedSemanticContext({
    loreText: ctx.loreText || '',
    ctx,
    intent,
    scene,
  });

  // F8.3: Plan Validity demotion inside protected P1 (opening premise only)
  if (!scene.planValidity && Number(scene.index) > 1) {
    ensurePlanValidity(scene, intent);
  }
  const demoted = isExecutionPrivilegeDemoted(scene.planValidity);
  const planValidityBlock = formatPlanValidityDemotionBlock(scene.planValidity);
  const goalLine = demoted
    ? `- **Scene 目标〔STRATEGIC · 保留〕**：${scene.goal || ep.scenePlan?.goal || '—'}\n- **开场执行资格**：demoted — 禁止直接写成已成立开场；须先承接/桥接 Actual`
    : `- **Scene 目标**：${scene.goal || ep.scenePlan?.goal || '—'}`;

  return joinBlocks(
    [
      '### Narrative Task',
      `Chapter ${chapter ?? '—'} · Scene ${scene.index ?? '—'} · POV ${intent.pov || '—'}`,
      `- **章目标**：${intent.mainGoal || '—'}`,
      goalLine,
      `- **冲突**：${scene.conflict || ep.scenePlan?.obstacle || '—'}`,
      scene.wordTarget ? `- **字数目标**：~${scene.wordTarget}` : '',
    ].filter(Boolean).join('\n'),
    planValidityBlock,
    protectedSemantic,
    formatCharacterDialogueStyles(ctx),
    formatChapterAuthorGoalBlock(ep.chapterAuthorGoal),
    formatWriterSceneArcBlock(ep.writerSceneArc),
    formatBeatPlan(ep),
    formatBeatStateSequenceBlock(ep.beatStatePlans),
    ep.conflict?.opponent ? formatConflictBlock(ep.conflict) : '',
    formatSituationBlock(ep.situation),
    formatCharacterDesireBlock(ep.characterDesire, ep.characterPush),
    formatCharacterTransformationBlock(ep.characterTransformation),
    formatCharacterBehaviorBlock(ep.characterBehavior),
    formatClimaxSceneBlock(ep.climaxRole, ep.chapterClimax),
    formatEmotionCurveBlock(ep.emotionCurve),
    formatReaderEmotionBlock(ep.readerEmotion),
    formatSceneRhythmBlock(ep.sceneRhythm),
    hook,
    causalBlock,
  );
}

/**
 * Voice DNA 强制来自 Anchor / intent，不可被 P2 裁剪路径触及
 */
export function resolveProtectedVoiceDna(ctx = {}) {
  const dna = ctx.voiceDna
    || ctx.intent?.voiceDna
    || ctx.intent?.priorAnchor?.voiceDna
    || ctx.priorAnchor?.voiceDna
    || null;
  if (!dna || typeof dna !== 'object') return null;
  return { ...dna, forced: true };
}

function formatGuardrails(ctx) {
  const ep = ctx.executionPlan || {};
  const craftMode = ctx.craftMode || resolveCraftMode({
    climaxRole: ep.climaxRole,
    sceneRhythm: ep.sceneRhythm,
    beat: ep.beats?.[0],
  });
  const wordLine = ctx.wordBudget
    ? `本 Scene 字数预算约 ${ctx.wordBudget} 字；禁止灌水，禁止写下一 Scene。`
    : '只写本 Scene；禁止灌水与跨 Scene 剧透。';

  const checklist = typeof ctx.writerChecklist === 'string'
    ? ctx.writerChecklist
    : (ctx.writerChecklist ? formatWriterExecutionChecklist(ctx.writerChecklist) : '');

  const voiceDna = resolveProtectedVoiceDna(ctx);
  const voiceBlock = voiceDna
    ? joinBlocks(
      '### Anchor Voice DNA（强制继承 · 不可裁剪）',
      '- 本章必须延续上一章 Voice DNA；禁止换腔换节奏。',
      formatVoiceDnaBlock(voiceDna),
    )
    : '';

  return joinBlocks(
    ctx.goldenSampleBlock || '',
    formatWriterFirstPolicyBlock(),
    [
      '### Format & Physical Constraints',
      '- 只输出正文，不要标题、Markdown 代码块、解释或 JSON。',
      '- 用动作 / 对白 / 画面推进；情绪写在身体与停顿里。',
      `- ${wordLine}`,
      `- Craft 原则：${WRITER_CRAFT_POLICY.priority}`,
    ].join('\n'),
    voiceBlock,
    formatWriterCraftPromptBlock({ craftMode, climaxRole: ep.climaxRole }),
    formatWriterRuntimePolicyBlock(),
    formatSceneWriterRuntimeBlock(ep.writerRuntime),
    // 样本驱动：默认不灌入冗长 human-writing 政策（legacy 可用）
    String(process.env.INKOS_PROMPT_RULES || '').toLowerCase() === 'legacy'
      ? formatHumanWritingPolicyBlock(ep.humanWritingPolicy)
      : '',
    String(process.env.INKOS_PROMPT_RULES || '').toLowerCase() === 'legacy'
      ? checklist
      : '',
    ctx.promptRulesBlock || '',
  );
}

/**
 * 编译 P2 前过滤 lore：只保留与当前 POV / Scene Goal 相关的 entity 段落
 * @param {string} loreText
 * @param {{ pov?: string, sceneGoal?: string, scene?: object, intent?: object }} ctx
 */
export function filterLoreForScene(loreText = '', ctx = {}) {
  const text = String(loreText || '').trim();
  if (!text) return '';

  const pov = String(ctx.pov || ctx.intent?.pov || ctx.scene?.pov || '').trim();
  const goal = String(
    ctx.sceneGoal || ctx.scene?.goal || ctx.intent?.mainGoal || '',
  ).trim();
  const keywords = extractLoreKeywords(`${pov} ${goal}`);

  const sections = text.split(/(?=^#{1,3}\s)/mu).filter((s) => String(s || '').trim());
  if (sections.length <= 1) {
    return filterLoreLines(text, pov, keywords);
  }

  const kept = [];
  for (const section of sections) {
    const head = section.slice(0, 120);
    const isCharSection = /人物\s*[:：]|###\s*人物/u.test(head) || /^#\s+\S+/mu.test(section.slice(0, 40));
    const mentionsPov = pov && section.includes(pov);
    const isOtherCharCard = isCharSection && pov && !mentionsPov
      && /恒定属性|身份|成长方向|重要度/u.test(section);

    if (isOtherCharCard) continue;

    // F1: Story Clock / Information Boundary survive filter even if still present in lore
    const alwaysKeep = /Scene\s*目标|Scene\s*冲突|写作规则|世界规则|本章目标|Adaptive|续写|局势|状态差量|时空|Story Clock|故事钟|信息边界|Information Boundary|Semantic Protected/u.test(head)
      || (isCharSection && mentionsPov);

    if (alwaysKeep) {
      kept.push(section);
      continue;
    }

    if (keywords.some((k) => k.length >= 2 && section.includes(k))) {
      kept.push(section.length > 1200 ? `${section.slice(0, 1200)}\n…[lore-filter]` : section);
    }
  }

  const out = kept.join('\n').trim();
  // 过滤过狠时回退：保留含 POV 的行 + 前 1500 字，避免空 P2
  if (!out) return filterLoreLines(text, pov, keywords) || text.slice(0, 1500);
  return out;
}

function extractLoreKeywords(blob = '') {
  const raw = String(blob || '');
  const tokens = raw
    .split(/[\s,，。；;：:、|/\\（）()【】\[\]「」『』]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && t.length <= 16);
  return [...new Set(tokens)].slice(0, 24);
}

function filterLoreLines(text = '', pov = '', keywords = []) {
  const lines = String(text).split('\n');
  const kept = [];
  let buffer = [];
  const flush = () => {
    if (!buffer.length) return;
    const block = buffer.join('\n');
    const hit = (pov && block.includes(pov))
      || keywords.some((k) => block.includes(k))
      || /Scene|目标|冲突|写作|世界|POV|续写|Story Clock|故事钟|信息边界|Information Boundary/u.test(block);
    if (hit) kept.push(block);
    buffer = [];
  };
  for (const line of lines) {
    if (/^#{1,3}\s/u.test(line) && buffer.length) flush();
    buffer.push(line);
  }
  flush();
  return kept.join('\n').trim() || text.slice(0, 1500);
}

function formatLore(ctx) {
  const worldBible = String(ctx.worldBible || '').trim();
  console.log('[lore] worldBible length:', worldBible?.length || 0);

  const filteredLore = filterLoreForScene(ctx.loreText, {
    pov: ctx.intent?.pov,
    sceneGoal: ctx.scene?.goal,
    scene: ctx.scene,
    intent: ctx.intent,
  });

  // 01_world_bible.md 必须进 P2（独立块，避免被 filterLore / 势力分支挤掉）
  const worldBlock = worldBible
    ? `### World Bible (01_world_bible.md)\n${worldBible.length > 3500 ? `${worldBible.slice(0, 3500)}\n…[world-bible-trimmed]` : worldBible}`
    : '';

  if (!worldBible) {
    console.warn('[lore] worldBible empty — 检查 novel/01_world_bible.md 是否存在且已读入 CompilationContext');
  }

  return joinBlocks(
    formatStoryDnaExcerpt(ctx.storyDna),
    worldBlock,
    // Voice DNA 已移入 P0 Anchor 保护层，禁止再进可裁剪的 P2
    nonEmpty(filteredLore) ? `### Canon / Dynamic Lore\n${filteredLore}` : '',
    ctx.chapterTitleBlock || '',
    ctx.commercialRules || '',
  );
}

function formatAdaptive(ctx) {
  // F1: prior / continuation = Historical; never same semantic precedence as Clock in P1
  const prior = nonEmpty(ctx.priorExcerpt) ? wrapHistoricalPriorExcerpt(ctx.priorExcerpt) : '';
  const cont = markContinuationHistorical(ctx.continuationBlock || '');
  return joinBlocks(
    nonEmpty(ctx.storyMemoryBlock) ? `### Story Memory\n${ctx.storyMemoryBlock}` : '',
    nonEmpty(ctx.adaptiveBlock) ? `### Adaptive Hints\n${ctx.adaptiveBlock}` : '',
    prior,
    cont,
    ctx.boundaryBlock || '',
    ctx.revealBlock || '',
    ctx.revisitBlock || '',
    ctx.hookBlock || '',
  );
}

/**
 * Token Budget Clipper — 先砍 P3，再砍 P2；永不裁 P0/P1
 */
export function clipPriorityStack(layers, tokenBudget = DEFAULT_TOKEN_BUDGET) {
  const budget = {
    ...DEFAULT_TOKEN_BUDGET,
    ...tokenBudget,
    floors: { ...DEFAULT_TOKEN_BUDGET.floors, ...(tokenBudget.floors || {}) },
  };

  const next = {
    p0: layers.p0 || '',
    p1: layers.p1 || '',
    p2: layers.p2 || '',
    p3: layers.p3 || '',
  };

  const tokensOf = () => ({
    p0: countTokens(next.p0),
    p1: countTokens(next.p1),
    p2: countTokens(next.p2),
    p3: countTokens(next.p3),
  });

  let tokens = tokensOf();
  let total = tokens.p0 + tokens.p1 + tokens.p2 + tokens.p3;
  const clipped = [];

  const shrink = (key) => {
    if (total <= budget.total) return false;
    const protectedSum = tokens.p0 + tokens.p1;
    const roomForSoft = Math.max(0, budget.total - protectedSum);
    const otherSoft = key === 'p3' ? tokens.p2 : tokens.p3;
    const floor = budget.floors[key] || 0;
    const allow = Math.max(floor, roomForSoft - otherSoft);
    if (tokens[key] <= allow) return false;
    const before = tokens[key];
    next[key] = truncateToTokens(next[key], allow);
    tokens = tokensOf();
    total = tokens.p0 + tokens.p1 + tokens.p2 + tokens.p3;
    if (tokens[key] < before) clipped.push(key.toUpperCase());
    return true;
  };

  // 优先 P3 → 再 P2，可多轮直至落入预算或无法再砍
  for (let i = 0; i < 4 && total > budget.total; i += 1) {
    if (!shrink('p3') && !shrink('p2')) break;
  }

  tokens = tokensOf();
  total = tokens.p0 + tokens.p1 + tokens.p2 + tokens.p3;

  return {
    layers: next,
    tokens: { ...tokens, total },
    budget: {
      total: budget.total,
      clipped,
      withinBudget: total <= budget.total,
    },
  };
}

function renderStack(layers) {
  return [
    '<!-- inkos-prompt-compiler · unified-stack -->',
    '',
    `## ${PROMPT_STACK.P0.label}`,
    `**${PROMPT_STACK.P0.rule}**`,
    '',
    layers.p0 || '（无 P0）',
    '',
    `## ${PROMPT_STACK.P1.label}`,
    `**${PROMPT_STACK.P1.rule}**`,
    '',
    layers.p1 || '（无 P1）',
    '',
    `## ${PROMPT_STACK.P2.label}`,
    `**${PROMPT_STACK.P2.rule}**`,
    '',
    layers.p2 || '',
    '',
    `## ${PROMPT_STACK.P3.label}`,
    `**${PROMPT_STACK.P3.rule}**`,
    '',
    layers.p3 || '',
  ].filter((line, i, arr) => {
    // 去掉连续空层留下的过多空行由 join 处理
    return true;
  }).join('\n');
}

/**
 * 密封编译产物：禁止 append / 禁止改 text
 * @param {CompiledPrompt} compiled
 */
export function sealCompiledPrompt(compiled) {
  const sealed = {
    ...compiled,
    [SEAL]: true,
    append() {
      throw new Error(
        'PromptCompiler: 禁止在编译后拼接原始字符串。请将内容并入 CompilationContext 后重新 compile()。',
      );
    },
    concat() {
      throw new Error(
        'PromptCompiler: 禁止 concat。请重新 compile(CompilationContext)。',
      );
    },
  };
  Object.defineProperty(sealed, 'text', {
    value: compiled.text,
    writable: false,
    configurable: false,
    enumerable: true,
  });
  return Object.freeze(sealed);
}

export function isSealedCompiledPrompt(value) {
  return Boolean(value && value[SEAL] === true);
}

export function unwrapCompiledText(compiledOrText) {
  if (typeof compiledOrText === 'string') return compiledOrText;
  if (isSealedCompiledPrompt(compiledOrText)) return compiledOrText.text;
  if (compiledOrText?.text) return compiledOrText.text;
  return String(compiledOrText || '');
}

/**
 * 统一编译入口
 * @param {CompilationContext} context
 * @returns {CompiledPrompt}
 */
export function compile(context = {}) {
  const rawLayers = {
    p0: formatGuardrails(context),
    p1: formatNarrativeTask(context),
    p2: formatLore(context),
    p3: formatAdaptive(context),
  };

  const { layers, tokens, budget } = clipPriorityStack(rawLayers, context.tokenBudget);
  const text = renderStack(layers);

  return sealCompiledPrompt({
    text,
    layers,
    tokens,
    budget,
    meta: {
      compiler: 'inkos-runtime/prompt-compiler',
      version: 'prompt-compiler-1',
      chapter: context.chapter ?? null,
      sceneIndex: context.scene?.index ?? null,
      craftMode: context.craftMode
        || resolveCraftMode({
          climaxRole: context.executionPlan?.climaxRole,
          sceneRhythm: context.executionPlan?.sceneRhythm,
          beat: context.executionPlan?.beats?.[0],
        }),
      stack: ['P0', 'P1', 'P2', 'P3'],
      protected: ['P0', 'P1'],
      voiceDnaProtected: Boolean(resolveProtectedVoiceDna(context)),
      voiceDnaSource: resolveProtectedVoiceDna(context)?.inherited
        ? 'anchor'
        : (resolveProtectedVoiceDna(context) ? 'context' : null),
    },
  });
}

/** 显式拒绝「编译后再拼」的 helper，供 Server 层调用点替换旧 join */
export function forbidPostCompileAppend() {
  throw new Error(
    'PromptCompiler: 外部模块（Studio / Living）不得在编译后强行拼接 Prompt。',
  );
}
