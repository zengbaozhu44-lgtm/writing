/**
 * LLM Route Qualitative Selector — not scoring, not default-first.
 */
import { chatCompletion, isLlmConfigured } from '../../inkos-brain/src/writer/llm-writer.js';
import { loadInkOsConfig } from '../../inkos-core/src/lib/config.js';
import {
  ROUTE_VERSION,
  stripForbiddenSelectorFields,
  FORBIDDEN_SELECTOR_KEYS,
} from './contract.js';
import { evaluateRouteCandidate } from './hard-filter.js';

const SELECTOR_SYSTEM = `你是 Story Route Qualitative Selector。

在所有**合法**候选路线中，选出一条最自然地承载作者初始走向的人生展开。

选择标准（按优先级）：
1. 是否像「这些人、这些事真的存在时，自然走出来的方向」——而不是编剧安排
2. 是否承载作者初始走向（若有）
3. 是否能为给定的文学观察方向留下自然展开空间（见自己/见众生/见天地等是观察方向，不是事件清单）
4. 若难以区分，选 open_space 最大、最少预设事件的那条

严禁：
- 任何数值评分（literary_score、classicness、ranking）
- must_include_events、predicted_outcome
- 为文学方向发明事件

只输出 JSON：
{
  "selected_route_id": "R2",
  "reasons": ["...", "..."],
  "rejected": [{ "id": "R1", "reason": "..." }]
}`;

function parseJsonFromLlm(content = '') {
  const raw = String(content).trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const text = fenced ? fenced[1].trim() : raw;
  return JSON.parse(text);
}

/**
 * Tie-break: fewest prescriptive clauses → most open_space length.
 * @param {object[]} validCandidates
 */
function tieBreakSelect(validCandidates) {
  return [...validCandidates].sort((a, b) => {
    const aOpen = String(a.open_space || '').length;
    const bOpen = String(b.open_space || '').length;
    if (bOpen !== aOpen) return bOpen - aOpen;
    const aPrescriptive = (String(a.direction).match(/决定|一定|将会|第.{0,2}章/g) || []).length;
    const bPrescriptive = (String(b.direction).match(/决定|一定|将会|第.{0,2}章/g) || []).length;
    return aPrescriptive - bPrescriptive;
  })[0];
}

/** @param {object[]} validCandidates @param {object} routeInput @param {object[]} rejectedFromFilter */
export function mockSelectRoute(validCandidates, routeInput, rejectedFromFilter = []) {
  const selected = tieBreakSelect(validCandidates);
  return {
    method: 'mock_qualitative_v1',
    selected_route_id: selected.id,
    selected_route: selected,
    reasons: [
      `在 ${validCandidates.length} 条合法候选中，${selected.id} 的 open_space 最宽，预设事件最少`,
      routeInput.author_initial_trajectory
        ? '与作者初始走向相容（mock 规则选择）'
        : '无作者走向时，优先保留人物自主选择空间',
    ],
    rejected: [
      ...rejectedFromFilter.map((r) => ({ id: r.id, reason: r.violations?.[0]?.message || 'hard_filter' })),
      ...validCandidates
        .filter((c) => c.id !== selected.id)
        .map((c) => ({ id: c.id, reason: 'tie-break: narrower open_space (mock)' })),
    ],
  };
}

/**
 * @param {object[]} validCandidates
 * @param {object} routeInput
 * @param {{ invalid?: object[], mock?: boolean, llm?: object }} [options]
 */
export async function selectRouteQualitatively(validCandidates, routeInput, options = {}) {
  if (!validCandidates.length) {
    throw new Error('无合法候选路线可供 qualitative selection');
  }

  const useMock = options.mock === true || options.mock === '1' || process.env.INKOS_ROUTE_MOCK === '1';
  const rejectedFromFilter = (options.invalid || []).map((r) => ({
    id: r.id,
    reason: r.violations?.map((v) => v.message).join('; ') || 'filtered',
  }));

  if (useMock || !isLlmConfigured()) {
    if (!useMock && !isLlmConfigured()) {
      console.warn('[route] LLM 未配置，使用 mock qualitative selector');
    }
    return mockSelectRoute(validCandidates, routeInput, options.invalid || []);
  }

  const config = { ...loadInkOsConfig().llm, ...options.llm };
  const orientation = routeInput.literary_orientation || {};
  const activeOrientation = Object.entries(orientation)
    .filter(([k, v]) => k !== 'notes' && v === true)
    .map(([k]) => k);

  const userPrompt = [
    '## 作者初始走向',
    routeInput.author_initial_trajectory || '（未提供）',
    '',
    '## 文学观察方向（不是事件目标）',
    activeOrientation.length ? activeOrientation.join(', ') : '（未指定）',
    orientation.notes ? `备注: ${orientation.notes}` : '',
    '',
    '## 合法候选',
    JSON.stringify(validCandidates, null, 2),
  ].join('\n');

  const result = await chatCompletion({
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    model: config.model,
    messages: [
      { role: 'system', content: SELECTOR_SYSTEM },
      { role: 'user', content: userPrompt },
    ],
    maxTokens: 2048,
    temperature: 0.4,
  });

  let parsed;
  try {
    parsed = stripForbiddenSelectorFields(parseJsonFromLlm(result.content));
  } catch (err) {
    throw new Error(`Route Selector JSON 解析失败: ${err.message}`);
  }

  for (const key of FORBIDDEN_SELECTOR_KEYS) {
    if (parsed[key] != null) {
      throw new Error(`Route Selector 输出含禁止字段: ${key}`);
    }
  }

  const selectedId = parsed.selected_route_id;
  const selected = validCandidates.find((c) => c.id === selectedId);
  if (!selected) {
    throw new Error(`Selector 选中未知路线: ${selectedId}`);
  }

  // Re-validate selected (belt and suspenders)
  const check = evaluateRouteCandidate(selected, routeInput.hard_constraints || []);
  if (!check.valid) {
    throw new Error(`Selector 选中了非法路线 ${selectedId}: ${check.violations[0]?.message}`);
  }

  return {
    method: 'llm_qualitative_v1',
    selected_route_id: selectedId,
    selected_route: selected,
    reasons: Array.isArray(parsed.reasons) ? parsed.reasons.map(String) : [],
    rejected: Array.isArray(parsed.rejected) ? parsed.rejected : rejectedFromFilter,
    model: config.model,
    usage: result.usage,
  };
}
