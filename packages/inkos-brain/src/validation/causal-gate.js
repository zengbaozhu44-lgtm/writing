/**
 * Causal Gate — Scene 级语义因果门控（2a：只判定，不重写）
 *
 * 单次整 Scene 写出后、章级 validate 前调用。廉价 LLM（低 temperature）输出
 * 严格 JSON：startState/endState/irreversibleChanges/optionsDelta/infoDelta/
 * changeStrength/failureReasons/evidence。
 *
 * 与 validation.js（八项词面门禁）和 detectIntraSceneRepetition（复读护栏）
 * 互不替代：本模块是语义层判定（局面是否真的变了），三者独立。
 *
 * 2a 阶段：只记录 scene.causalGate，不触发重写、不影响 pass。
 * 2b 阶段（未实施）：changeStrength=none → 重写（带 failureReasons 缺失项）。
 */
import { loadInkOsConfig } from '../../../inkos-core/src/lib/config.js';
import { chatCompletion } from '../writer/llm-writer.js';
// 3a 口径对齐：句级统计与 eval-narrative 同源（共享工具，禁止两套口径）
import { classifySentences } from '../metrics/sentence-utils.js';

/**
 * 门控 schema（最终版）：
 * {
 *   "startState": "主角目标/知识/处境（一句话）",
 *   "endState": "同上（一句话）",
 *   "irreversibleChanges": [{"type":"info|choice|physical|relationship","description":"..."}],
 *   "optionsDelta": "扩大|缩小|不变",
 *   "infoDelta": "获得|失去|不变",
 *   "changeStrength": "none|weak|strong",
 *   "failureReasons": [...枚举...],
 *   "evidence": ["原文短句，≤3 条"]
 * }
 */
const GATE_SYSTEM = [
  '你是叙事因果判定器。只输出一个 JSON 对象，不要任何其他文字、不要 markdown 代码块。',
  '输入是一段 Scene 正文 + 该 Scene 的目标/冲突 + 上一章结尾状态。判定主角的「局面」是否发生不可逆变化。',
  '',
  '输出 JSON schema（字段必须齐全，值必须严格遵守枚举）：',
  '{',
  '  "startState": "主角开场时目标/知识/处境，一句话",',
  '  "endState": "主角结束时目标/知识/处境，一句话",',
  '  "irreversibleChanges": [{"type":"info|choice|physical|relationship","description":"具体变化"}],',
  '  "optionsDelta": "扩大|缩小|不变",',
  '  "infoDelta": "获得|失去|不变",',
  '  "changeStrength": "none|weak|strong",',
  '  "failureReasons": ["no_irreversible_change|goal_slot_too_weak|state_input_missing|single_purpose_description|static_environment_loop|no_choice_made"],',
  '  "evidence": ["支撑判定的原文短句，最多 3 条"]',
  '}',
  '',
  'changeStrength 判定规则：',
  '- none：irreversibleChanges 为空，或全部是环境变化/情绪变化，而非主角目标/知识/处境变化。',
  '- weak：有变化但主角全程被动——信息是偶然落到他头上的（被动观察/被通知/碰巧看见），他没做任何选择、没有任何主动行动；或变化只发生在配角/背景。',
  '- strong：至少一个变化直接改变主角的目标、知识或处境，且满足其一：主角主动做出关闭选项的选择；主角主动行动获得关键新信息；主角处境被物理/关系改变。',
  '（关键区分：strong 的信息变化必须来自主角主动行动的后果；被动看见/听见不算 strong，算 weak。）',
  '',
  'failureReasons 判定规则（可多个；无失败则空数组）：',
  '- no_irreversible_change：changeStrength=none 时必含。',
  '- no_choice_made：主角全程未做任何选择/决定（只有观察、感受、被动反应）时必含（weak 且主角被动时也应包含）。',
  '- single_purpose_description：正文以纯环境/感官描摹为主、描写不承担叙事功能时含。',
  '- static_environment_loop：环境反复描摹（同一场景元素多次描写，无新信息）时含。',
  '- goal_slot_too_weak：【输入标记】goal 槽为兜底动词（输入会标注）时必含。',
  '- state_input_missing：【输入标记】上一章结尾状态未结构化（输入会标注）时必含。',
].join('\n');

const FAILURE_ENUM = new Set([
  'no_irreversible_change',
  'goal_slot_too_weak',
  'state_input_missing',
  'single_purpose_description',
  'static_environment_loop',
  'no_choice_made',
]);

const MAX_TEXT_CHARS = 2400;

/**
 * @param {{
 *   sceneText: string,
 *   sceneContext?: { goal?: string, conflict?: string, goalSlotFallback?: boolean },
 *   prevState?: { summary?: string, stateSummarySource?: string },
 *   llm?: { baseUrl?: string, apiKey?: string, model?: string, maxTokens?: number, temperature?: number },
 * }} args
 * @returns {Promise<object>} 判定结果（schema 同上，LLM 失败时 degraded 标记）
 */
export async function evaluateSceneCausality({ sceneText, sceneContext = {}, prevState = {}, llm = {} }) {
  const text = String(sceneText || '').trim();
  if (!text) {
    return degraded('empty_scene_text');
  }
  const config = { ...loadInkOsConfig().llm, ...llm };
  if (!config.apiKey) {
    return degraded('no_api_key');
  }

  const { goal = '', conflict = '', goalSlotFallback = false } = sceneContext;
  const { summary = '', stateSummarySource = '' } = prevState;

  const goalSlotNote = goalSlotFallback || /兜底/.test(goal)
    ? '【输入标记】goal 槽为兜底动词（未提供具体对象）'
    : '';
  const stateNote = stateSummarySource === 'fallback' || (!summary && stateSummarySource !== 'mainGoal_summary' && stateSummarySource !== 'anchor_mood')
    ? '【输入标记】上一章结尾状态未结构化'
    : '';

  const user = [
    '## Scene 正文',
    text.slice(0, MAX_TEXT_CHARS),
    '',
    '## Scene 目标',
    goal || '（未提供）',
    '## Scene 冲突',
    conflict || '（未提供）',
    '## 上一章结尾状态',
    summary || '（未提供）',
    goalSlotNote,
    stateNote,
  ].filter(Boolean).join('\n');

  let res;
  try {
    res = await chatCompletion({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      model: config.model,
      messages: [
        { role: 'system', content: GATE_SYSTEM },
        { role: 'user', content: user },
      ],
      maxTokens: config.maxTokens || 1600,
      temperature: 0.1,
    });
  } catch (err) {
    return degraded(`llm_error: ${err?.message || err}`);
  }

  const parsed = parseGateJson(res.content);
  if (!parsed) {
    return degraded(`parse_fail: ${String(res.content).slice(0, 120)}`);
  }
  // 3a 口径对齐：附加与 eval-narrative 完全同口径的句级统计
  // （splitSentences/classifySentences 共享工具，两处 import 同一套）。
  // LLM 的 failureReasons.single_purpose_description 是大段静态判定，
  // 这里的 singlePurposeSentenceCount 是句级精确口径——3b feedback 消费。
  const calib = classifySentences(text);
  return {
    ...normalizeGateResult(parsed),
    singlePurposeSentenceCount: calib.singlePurposeDesc,
    functionalSentenceCount: calib.functionalDesc,
    totalSentences: calib.total,
    singlePurposeDescriptionRatio: calib.singlePurposeDescriptionRatio,
  };
}

function parseGateJson(content) {
  const raw = String(content || '').trim()
    .replace(/^```(?:json)?\n?/, '')
    .replace(/\n?```$/, '');
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

function normalizeGateResult(parsed) {
  const changes = Array.isArray(parsed.irreversibleChanges)
    ? parsed.irreversibleChanges
      .filter((c) => c && (c.description || c.type))
      .slice(0, 6)
      .map((c) => ({
        type: ['info', 'choice', 'physical', 'relationship'].includes(c.type) ? c.type : 'info',
        description: String(c.description || '').slice(0, 80),
      }))
    : [];

  const strength = ['none', 'weak', 'strong'].includes(parsed.changeStrength)
    ? parsed.changeStrength
    : 'none';

  const failureReasons = (Array.isArray(parsed.failureReasons) ? parsed.failureReasons : [])
    .map((r) => String(r || '').trim())
    .filter((r) => FAILURE_ENUM.has(r));

  // 一致性修正：none 必含 no_irreversible_change
  if (strength === 'none' && !failureReasons.includes('no_irreversible_change')) {
    failureReasons.push('no_irreversible_change');
  }

  return {
    startState: String(parsed.startState || '').slice(0, 120),
    endState: String(parsed.endState || '').slice(0, 120),
    irreversibleChanges: changes,
    optionsDelta: ['扩大', '缩小', '不变'].includes(parsed.optionsDelta) ? parsed.optionsDelta : '不变',
    infoDelta: ['获得', '失去', '不变'].includes(parsed.infoDelta) ? parsed.infoDelta : '不变',
    changeStrength: strength,
    failureReasons,
    evidence: (Array.isArray(parsed.evidence) ? parsed.evidence : []).slice(0, 3).map((e) => String(e || '').slice(0, 60)),
    ok: true,
  };
}

function degraded(reason) {
  return {
    startState: '',
    endState: '',
    irreversibleChanges: [],
    optionsDelta: '不变',
    infoDelta: '不变',
    changeStrength: 'none',
    failureReasons: [],
    evidence: [],
    ok: false,
    degraded: true,
    degradeReason: reason,
  };
}

// ─── 2b: 分流决策 + 重写 addendum ──────────────────────────────────────

/** 上游输入缺陷（重写解决不了，只标记） */
const UPSTREAM_DEFECTS = new Set(['goal_slot_too_weak', 'state_input_missing']);
/** 静态描写缺陷（strong 仍出现也值得重写） */
const STATIC_DEFECTS = new Set(['single_purpose_description', 'static_environment_loop']);

/**
 * 2b 分流决策——按 failureReasons 细分，不做 strong/weak/none 三档一刀切：
 * - none          → rewrite（计失败次数）
 * - weak          → rewrite（不计失败次数，拉偏弱样本，不判死）
 * - strong+空     → pass
 * - strong+仅上游 → pass + upstreamDefects 标记（重写解决不了输入缺失）
 * - strong+静态   → rewrite（不计失败——正文有推进但夹大段静态描摹）
 *
 * @returns {{action:'pass'|'rewrite', countFailure:boolean, upstreamDefects:string[]}}
 */
export function decideGateAction(gate) {
  if (!gate || gate.degraded) return { action: 'pass', countFailure: false, upstreamDefects: [] };
  const reasons = gate.failureReasons || [];
  const upstream = reasons.filter((r) => UPSTREAM_DEFECTS.has(r));
  const statics = reasons.filter((r) => STATIC_DEFECTS.has(r));

  if (gate.changeStrength === 'none') {
    // none：上游缺陷也一并标记（供 feedback 消费），但主体是重写
    return { action: 'rewrite', countFailure: true, upstreamDefects: upstream };
  }
  if (gate.changeStrength === 'weak') {
    return { action: 'rewrite', countFailure: false, upstreamDefects: upstream };
  }
  // strong
  if (statics.length) {
    return { action: 'rewrite', countFailure: false, upstreamDefects: upstream };
  }
  // strong + 非静态缺陷 → 通过；上游缺陷标记
  return { action: 'pass', countFailure: false, upstreamDefects: upstream };
}

/** failureReasons → 具体指令（禁止只写「无不可逆变化」） */
const REASON_INSTRUCTIONS = {
  no_irreversible_change: '上一版没有任何改变主角目标/知识/处境的变化；本 Scene 必须让主角做出一个关闭选项的选择，或主动行动获得关键新信息。',
  no_choice_made: '上一版主角只是被动获知；本 Scene 主角必须主动做出选择或出手。',
  goal_slot_too_weak: '上一版目标槽为兜底动词；本 Scene 必须明确主角要追查/谈判/反击的具体对象。',
  state_input_missing: '上一章结尾状态未结构化；本 Scene 以主角当前目标为准，不要等待环境提示。',
  single_purpose_description: '删除不影响后续逻辑的描写；连续环境/感官描写不超过 3 句。',
  static_environment_loop: '删除不影响后续逻辑的描写；连续环境/感官描写不超过 3 句。',
};

/**
 * 2b: 重写 addendum——具体缺失项 + evidence 短句。
 * evidence 比抽象指令有效，必须带上。
 */
export function formatCausalRewriteAddendum(gate) {
  const reasons = (gate?.failureReasons || []).filter(Boolean);
  if (!reasons.length) return '';
  const lines = [
    '<!-- causal-gate-rewrite v1 -->',
    '## 上一版门控否决（必须针对性修正，禁止原样复写上一版）',
  ];
  const seen = new Set();
  for (const r of reasons) {
    const instr = REASON_INSTRUCTIONS[r];
    if (instr && !seen.has(instr)) {
      seen.add(instr);
      lines.push(`- ${instr}`);
    }
  }
  const evidence = (gate?.evidence || []).filter(Boolean).slice(0, 3);
  if (evidence.length) {
    lines.push('', '以下句子被判定为无功能描写/被动获知，重写时删除或改写为承担叙事功能的句子：');
    for (const e of evidence) lines.push(`- 「${e}」`);
  }
  return lines.join('\n');
}
