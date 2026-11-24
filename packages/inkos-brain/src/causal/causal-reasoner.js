/**
 * Causal Reasoning — Story Truth → Causal Transition 转换层（Phase 4 · Step 4-D1 空壳）。
 *
 * 职责：只证明「这个人为什么只能/选择这样行动」，不负责创造“像小说的结构”。
 * 输入：StoryTruth 投影（角色卡/facts/状态板·认知缺口/foreshadow/authored plan）。
 * 输出：causal_chain（desire/pressure/options/choice/consequence/new_information/next_pressure + no_causal_basis）。
 *
 * 铁律（Step 4-A 决策2 / 契约 v0.2，见 memory inkos-phase4-causal-reasoning-contract）：
 *  1. no_causal_basis invariant —— 缺输入 → 输出具体原因，绝不模板填空。
 *  2. causal_chain 是 Beat 的唯一因果来源；禁止 beat.choice = randomTemplate()。
 *  3. meta / authored 约束（「本章必须发生 X」）只进 world_pressure.required_event，
 *     禁止成为 choice.reason 的来源（constraint ≠ 角色动机）。
 *  4. authored 明确因果优先：作者写过的 choice/高潮 不被 Causal Reasoning 覆盖。
 *  5. fear/relationship 是 optional derived attribute：有显式数据用显式，否则 unknown 降级，不硬造。
 *
 * D1 只做数据流验证：mock provider（确定性、无 LLM）+ no_causal_basis。
 * S8.2 Boundary：无 authored choice/climax 时 choice=null（禁止默认「正面推进」）。
 * S8.2-R3：无 authored options 时 options=[]（禁止默认「正面推进/放弃」进选项空间）。
 * LLM provider 在后续步骤接入；本模块不写任何持久化。
 */
import fs from 'node:fs';
import path from 'node:path';
import { exists, readText } from '../../../inkos-core/src/lib/paths.js';
import { loadBrainContext } from '../loader.js';
import { loadAuthoredChapterPlan } from '../planner/planner.js';
import {
  TEMPLATE_FALLBACKS,
  isTemplateFallback,
  resolveChapterEvent,
  resolveAuthoredRequiredEvent,
} from '../authored/authored-input-sanitize.js';

export { TEMPLATE_FALLBACKS, isTemplateFallback };

/** 从角色卡 md 提取字段（含手写 内核 段的 core_desire / core_fear）。 */
function extractCharacterFields(raw = '') {
  const fields = {};
  for (const line of raw.split('\n')) {
    let m = line.match(/^-\s+\*\*(.+?)\*\*\s*[：:]\s*(.+)$/);
    if (m) {
      fields[m[1].trim()] = m[2].trim();
      continue;
    }
    m = line.match(/^-\s+(core_\w+)\s*[：:]\s*(.+)$/);
    if (m) fields[m[1].trim()] = m[2].trim();
  }
  return fields;
}

/**
 * 关系证据（契约 v0.2：relationship 允许来源含 character card evidence）。
 * 优先显式字段（与主角关系 / 关系），其次身份行里的关系短语（如 老周卡「林守常的老朋友」）。
 * 05_relationship_graph 是表指针行（| 关系 | 05_relationship_graph.yaml |），不是数据，跳过。
 */
function deriveRelationship(fields) {
  const explicit = fields['与主角关系'] || fields['关系'];
  if (explicit && !/05_relationship_graph/.test(explicit)) return explicit;
  const m = String(fields['身份'] || '').match(/(\S+的(?:亲|老)?(?:朋友|妹妹|哥哥|弟弟|姐姐|妻子|丈夫|恋人|搭档|队友|徒弟|师父|兄弟))/);
  return m ? m[1] : null;
}

/** 加载 03_character_bible 全部角色（D1 需要非 POV 选择者，如 ch5 的 林砚）。 */
function loadAllCharacters(bookDir, modules, relationships) {
  const dir = modules.character_bible;
  const out = [];
  if (!dir || !exists(dir)) return out;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.md') || f.startsWith('_')) continue;
    const name = f.replace(/\.md$/, '').trim();
    const raw = readText(path.join(dir, f));
    const fields = extractCharacterFields(raw);
    const rel = relationships.find((e) => e && (e.from === name || e.to === name || e.a === name || e.b === name));
    out.push({
      name,
      desire: fields['core_desire'] || fields['目标'] || null,
      fear: fields['core_fear'] || null,
      values: fields['价值观'] || null,
      secret: fields['秘密'] || null,
      relationship: rel ? (rel.relation || rel.type || rel.label || 'connected') : deriveRelationship(fields),
      raw,
    });
  }
  return out;
}

/** 从状态板「认知缺口」段提取 gap_xxx（二手书店 型；赛博修仙 无此结构 → 空）。 */
function extractStateBoardGaps(stateBoard = '') {
  const gaps = [];
  for (const line of stateBoard.split('\n')) {
    const m = line.match(/-\s*\*\*(gap_\d+)\s*（(\w+)）\*\*\s*[：:]\s*(.+)$/);
    if (m) gaps.push({ id: m[1], level: m[2], title: m[3], source: 'state_board_gap' });
  }
  return gaps;
}

/**
 * facts 里程碑（历史路径）—— 与 S3.3 authored `required_event` 分离。
 * 仅供 consequence 兜底；不得写入 choice.reason。
 */
function collectMilestoneRequiredEvents(facts, chapter) {
  const MILESTONE_RE = /必须发生|不可逆代价|里程碑/;
  return (facts || []).filter((f) => f && MILESTONE_RE.test(String(f.fact || f.text || '')))
    .filter((f) => f.chapter === chapter || f.chapter === 0)
    .map((f) => ({ id: f.id, fact: f.fact || f.text || '' }));
}

/** 组装 world_pressure：真实数据优先、模板占位符视为缺失。 */
function assembleWorldPressure(chapterTask, authoredPlan, facts, chapter) {
  const wp = {};
  const pick = (a, b) => (a && !isTemplateFallback(a) ? a : b && !isTemplateFallback(b) ? b : null);

  // S3.3 C4：显式 authored required_event 槽；禁止 goal → required_event；禁进 choice.reason
  const { required_event, source: requiredEventSource } = resolveAuthoredRequiredEvent(authoredPlan);
  wp.required_event = required_event;
  wp.requiredEventSource = requiredEventSource;
  // facts 里程碑与 authored 槽分离，避免把 A 类约束混进旧 consequence 路径的语义
  wp.milestone_required_events = collectMilestoneRequiredEvents(facts, chapter);

  // S3.2 C2：有 chapter yaml → event 只来自 yaml；无 yaml → 09 fallback（09 不得覆盖 authored event）
  const { event, source: eventSource } = resolveChapterEvent(chapterTask, authoredPlan);
  wp.event = event;
  wp.eventSource = eventSource;

  wp.obstacle = pick(authoredPlan?.conflict || authoredPlan?.obstacle1, chapterTask['第一阻碍'] || chapterTask['阻碍']);
  wp.obstacleSource = (authoredPlan?.conflict && !isTemplateFallback(authoredPlan.conflict)) || (authoredPlan?.obstacle1 && !isTemplateFallback(authoredPlan.obstacle1))
    ? 'authored_plan.conflict'
    : 'chapter_task.阻碍';
  wp.cost = pick(authoredPlan?.cost || authoredPlan?.['代价'], chapterTask['代价'] || chapterTask['必须失去']);
  wp.costSource = wp.cost === authoredPlan?.cost ? 'authored_plan.cost' : 'chapter_task.代价';
  wp.hook = pick(authoredPlan?.hook || authoredPlan?.ending, chapterTask['结尾']);
  wp.hookSource = wp.hook === (authoredPlan?.hook || authoredPlan?.ending) ? 'authored_plan.hook|ending' : 'chapter_task.结尾';
  // authored 明确因果优先（作者写过的不被覆盖）
  wp.authoredChoice = authoredPlan?.choice || null;
  wp.authoredClimax = authoredPlan?.climax && !isTemplateFallback(authoredPlan.climax) ? authoredPlan.climax : null;
  // S8.2-R3：仅透传 authored options；禁止默认行动方向
  wp.authoredOptions = Array.isArray(authoredPlan?.options) ? authoredPlan.options : null;
  return wp;
}

/**
 * StoryTruth 投影（契约 v0.2 输入 schema）。
 * 只读：角色卡 / 状态板 / facts / foreshadow / authored plan / relationships。不写任何持久化。
 */
export function projectStoryTruth(bookDir, options = {}) {
  const ctx = loadBrainContext(bookDir, { chapter: options.chapter });
  const { chapter, chapterTask, stateBoard, facts, foreshadow, relationships, characters: povChars, pov } = ctx;

  const authoredPlan = loadAuthoredChapterPlan(bookDir, chapter);
  const characters = loadAllCharacters(bookDir, ctx.modules, relationships || []);
  // loadBrainContext 只加载 pov+present；若未覆盖，用目录加载的全量角色兜底补齐 desire 源
  const charByName = new Map(characters.map((c) => [c.name, c]));
  for (const [name, c] of Object.entries(povChars)) {
    if (!charByName.has(name)) charByName.set(name, { name, raw: c.raw, desire: c['目标'] || null });
  }
  const allCharacters = [...charByName.values()];

  const stateBoardGaps = extractStateBoardGaps(stateBoard);
  const foreshadowGaps = (foreshadow || [])
    .filter((h) => h && h.status === 'open')
    .map((h) => ({ id: h.id || 'H', level: 'medium', title: h.title || h.trace || '', source: 'foreshadow_hook' }));

  const volume = ctx.volume || {};
  const volumeSeeds = Array.isArray(volume.sceneSeeds) ? volume.sceneSeeds : [];
  const volumeGoals = Array.isArray(volume.goals) ? volume.goals : [];

  const stateBoardEmpty = !stateBoard.trim() || stateBoard.includes('{') || /第 0 章/.test(stateBoard);

  const storyTruth = {
    chapter,
    pov,
    authoredPlan,
    characters: allCharacters,
    world_pressure: assembleWorldPressure(chapterTask, authoredPlan, facts, chapter),
    existing_facts: (facts || []).slice(-8).map((f) => ({ id: f.id, chapter: f.chapter, fact: f.fact || f.text || '' })),
    open_questions: [...stateBoardGaps, ...foreshadowGaps],
    meta: {
      bookDir,
      stateBoardEmpty,
      relationshipGraphPresent: (relationships || []).length > 0,
      authoredPlanPresent: !!authoredPlan,
      authoritativeChapterPlan: Boolean(authoredPlan),
      volumeSeeds: volumeSeeds.length,
      volumeGoals: volumeGoals.length,
    },
  };
  return storyTruth;
}

/**
 * Mock provider —— 确定性、无 LLM。
 * 只把字段里真实存在的因果内容投影进 causal_chain；需要 LLM 推理的步骤显式标记 mock_llm_pending。
 * 缺失的推导逐条进 no_causal_basis；绝不模板填空。
 */
export function mockReason(storyTruth) {
  const { pov, characters, world_pressure: wp, open_questions: gaps } = storyTruth;
  const reasons = [];
  const degradations = [];
  const povChar = characters.find((c) => c.name === pov) || characters[0] || null;

  // --- desire ---
  let desire = null;
  if (povChar?.desire) {
    desire = { who: povChar.name, wants: povChar.desire, source: 'character_bible', trace: 'character_bible.core_desire|目标' };
  } else if (wp.event) {
    desire = { who: pov || '主角', wants: wp.event, source: 'world_pressure.event', trace: 'chapter_task|authored_plan.goal|volume' };
  } else {
    reasons.push('missing_desire');
  }

  // --- pressure ---
  let pressure = null;
  if (wp.obstacle) {
    pressure = { obstacle: wp.obstacle, source: wp.obstacleSource || 'authored_plan.conflict|chapter_task' };
  } else {
    reasons.push('missing_pressure');
    degradations.push('pressure_was_template_fallback');
  }

  // --- options（S8.2-R3：仅 authored；禁止默认「正面推进/放弃」进入 options）---
  const options = [];
  const rawAuthoredOpts = wp.authoredOptions;
  if (Array.isArray(rawAuthoredOpts)) {
    for (const o of rawAuthoredOpts) {
      if (typeof o === 'string' && o.trim()) {
        options.push({ action: o.trim(), benefit: null, cost: null, derivation: 'authored' });
      } else if (o && typeof o === 'object') {
        const action = String(o.action || o.text || '').trim();
        if (action) {
          options.push({
            action,
            benefit: o.benefit ?? null,
            cost: o.cost ?? null,
            derivation: 'authored',
          });
        }
      }
    }
  }
  const hasAuthoredChoiceBasis = !!(wp.authoredChoice || (wp.authoredClimax && desire && pressure));
  let optionsAnalysis;
  if (options.length) {
    optionsAnalysis = {
      completeness: 'authored',
      reason: 'options 来自 authored plan（不枚举默认行动方向）',
    };
  } else if (!hasAuthoredChoiceBasis) {
    optionsAnalysis = {
      completeness: 'unavailable',
      reason: 'missing_basis',
      missing_basis: true,
    };
  } else {
    optionsAnalysis = {
      completeness: 'unavailable',
      reason: '无 authored options（不枚举默认行动方向）',
    };
  }

  // --- choice（仅 authored 明确因果；S8.2：禁止 mock 默认「正面推进」替人物选边）---
  let choice = null;
  if (wp.authoredChoice) {
    choice = { actor: pov, pov_relation: 'pov', action: wp.authoredChoice, reason: 'authored_plan.choice（作者明确因果，保留）', source: 'authored_plan.choice' };
  } else if (wp.authoredClimax && desire && pressure) {
    choice = { actor: pov, pov_relation: 'pov', action: wp.authoredClimax, reason: 'authored_plan.climax（作者明确因果，保留）', source: 'authored_plan.climax' };
  } else {
    // 缺失 > 假完整：有 desire/pressure 也不裁决方向；Writer 见缺口，不得假装已选
    reasons.push('missing_choice_basis');
  }
  if (choice && povChar && povChar.name !== pov) {
    choice.pov_relation = 'non_pov'; // actor ≠ POV：以「世界压力」而非「POV 内心」呈现
  }

  // --- consequence ---
  // S3.3：authored required_event 不进 consequence / choice.reason；仅 facts 里程碑可作 consequence 兜底
  let consequence = null;
  if (wp.cost) {
    consequence = { immediate: wp.cost, long_term: null, source: wp.costSource || 'authored_plan.cost|chapter_task.代价' };
  } else if (wp.milestone_required_events?.length) {
    consequence = {
      immediate: wp.milestone_required_events[0].fact,
      long_term: null,
      source: 'existing_facts.milestone_required_events',
    };
  } else {
    reasons.push('missing_consequence');
  }

  // --- new_information ---
  let newInformation = null;
  const gap = gaps.find((g) => g.level === 'high') || gaps[0] || null;
  if (gap) {
    newInformation = { revealed: gap.title, who_learns: povChar?.name || pov || '主角', changes: 'mock_llm_pending（需 LLM 判断是否改变选择空间）', source: gap.source };
  } else if (wp.hook) {
    newInformation = { revealed: wp.hook, who_learns: povChar?.name || pov || '主角', changes: 'mock_llm_pending（需 LLM 判断是否改变选择空间）', source: wp.hookSource || 'authored_plan.hook|chapter_task.结尾' };
  } else {
    reasons.push('missing_new_information');
    degradations.push('no_open_question_or_hook');
  }

  // --- next_pressure ---
  let nextPressure = null;
  if (wp.hook) {
    nextPressure = { pressure: wp.hook, source: wp.hookSource || 'authored_plan.hook|chapter_task.结尾' };
  } else if (gap) {
    nextPressure = { pressure: `未解悬念维持：${gap.title}`, source: gap.source };
  } else {
    reasons.push('missing_next_pressure');
  }

  // --- optional attrs：fear / relationship（决策 1(b)：optional + 推断 + 否则 unknown）---
  if (!povChar?.fear) degradations.push('fear_unknown');
  if (!characters.some((c) => c.relationship)) degradations.push('relationship_missing');
  if (storyTruth.meta?.stateBoardEmpty) degradations.push('state_board_empty');

  // grade：缺因果槽 → degraded；链完整但有 grounding 缺口（fear/关系/状态板未知）→ partial；全在 → full。
  const grade = reasons.length > 0 ? 'degraded' : degradations.length > 0 ? 'partial' : 'full';

  return {
    desire,
    pressure,
    options,
    options_analysis: optionsAnalysis,
    choice,
    consequence,
    new_information: newInformation,
    next_pressure: nextPressure,
    no_causal_basis: reasons,
    trace: {
      desire_source: desire?.trace || desire?.source || null,
      pressure_source: pressure?.source || null,
      options_basis: options.length ? 'authored' : 'none',
      choice_basis: choice?.source || null,
      consequence_basis: consequence?.source || null,
      information_basis: newInformation?.source || null,
      degradation: degradations,
    },
    confidence: { grade, generated: reasons.length === 0, partial: grade === 'partial', degraded: grade === 'degraded' },
    provider: 'mock',
  };
}

/** 运行 Causal Reasoning：投影 → 推导（provider 可替换为未来 LLM provider）。 */
export function deriveCausalChain(storyTruth, { provider = mockReason } = {}) {
  return provider(storyTruth);
}

/** 便捷入口：bookDir → { storyTruth, causalChain }。 */
export function runCausalReasoning(bookDir, options = {}) {
  const storyTruth = projectStoryTruth(bookDir, options);
  const causalChain = deriveCausalChain(storyTruth, options);
  return { storyTruth, causalChain };
}

/**
 * D3.2：章级因果链唯一入口（Runtime / Studio 共用）。
 * - 已有 `intent.causalChain` → 绝不重新推理（每章最多一次）
 * - provider / 投影失败 → 不抛异常；不挂伪因果；下游以缺块或链内 `no_causal_basis` 呈现
 * @returns {{ causalChain: object|null, reasoned: boolean }}
 */
export function ensureChapterCausalChain(bookDir, intent, options = {}) {
  if (!intent || typeof intent !== 'object') {
    return { causalChain: null, reasoned: false };
  }
  if (intent.causalChain && typeof intent.causalChain === 'object') {
    return { causalChain: intent.causalChain, reasoned: false };
  }
  const chapter = options.chapter ?? intent.chapter;
  try {
    const { causalChain } = runCausalReasoning(bookDir, { ...options, chapter });
    if (causalChain && typeof causalChain === 'object') {
      intent.causalChain = causalChain;
      return { causalChain, reasoned: true };
    }
  } catch (err) {
    console.warn(
      `[causal] ensureChapterCausalChain ch${chapter ?? '?'} failed:`,
      err?.message || err,
    );
  }
  return { causalChain: null, reasoned: false };
}
