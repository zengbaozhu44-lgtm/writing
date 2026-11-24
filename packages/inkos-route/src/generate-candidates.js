/**
 * LLM Route Candidate Generator — 3–5 life-direction possibilities.
 */
import { chatCompletion, isLlmConfigured } from '../../inkos-brain/src/writer/llm-writer.js';
import { loadInkOsConfig } from '../../inkos-core/src/lib/config.js';
import { CANDIDATE_COUNT, ROUTE_VERSION, isValidCandidateShape } from './contract.js';

function formatRouteInputForPrompt(routeInput) {
  const { world, people, relations, history, current_reality, author_initial_trajectory, literary_orientation } = routeInput;
  const peopleLines = Object.values(people || {}).map((p) =>
    `- ${p.name}：身份=${p.identity || '—'}；公开目标=${p.publicGoal || '—'}；恐惧=${p.fear || '—'}`,
  );
  const relationLines = (relations || []).slice(0, 12).map((r) =>
    `- ${r.from}↔${r.to}：信任${r.trust ?? '—'} 敌意${r.hostility ?? '—'}${r.note ? ` · ${r.note}` : ''}`,
  );
  const timelineLines = (history?.timeline || []).flatMap((d) =>
    (d.events || []).map((e) => `- Day ${d.day}: ${e}`),
  );
  const factLines = (history?.facts || []).map((f) => `- ${f.fact}`);
  const orientationActive = Object.entries(literary_orientation || {})
    .filter(([k, v]) => k !== 'notes' && v === true)
    .map(([k]) => k);

  return [
    '## 投影资格切片（confirmed = Route eligibility ≠ obtains / Reality Authority）',
    `POV: ${current_reality?.pov || '—'}`,
    `章节: ${current_reality?.chapter ?? '—'}`,
    current_reality?.state ? `状态表: ${JSON.stringify(current_reality.state)}` : '',
    '',
    '### 世界',
    (world?.bible || '').slice(0, 3000),
    '',
    '### 人物',
    peopleLines.join('\n') || '—',
    '',
    '### 关系',
    relationLines.join('\n') || '—',
    '',
    '### 已发生历史（timeline A-class + filtered facts）',
    timelineLines.join('\n') || '—',
    factLines.join('\n') || '—',
    '',
    '## 作者初始走向（创意方向，非事实）',
    author_initial_trajectory || '（未提供 — 从资格切片推断自然方向）',
    '',
    '## 文学观察方向（选择时参考，不是生成目标）',
    orientationActive.length ? orientationActive.join(', ') : '（未指定）',
    literary_orientation?.notes ? `备注: ${literary_orientation.notes}` : '',
  ].filter(Boolean).join('\n');
}

const SYSTEM_PROMPT = `你是 Story Route Generator（人生方向层），不是编剧，不是规划师。

任务：基于**已经确认的现实**，提出 3–5 条**自然可能的人生方向**（possibility）。

每条路线必须：
- 描述人生方向、关系张力、内心压力、开放空间
- 用「可能」「逐渐」「或许」等开放性语言
- kind 固定为 "possibility"

严禁：
- 写章节大纲（第N章…、首先…然后…）
- 写命运断言（最终一定会…、结局是…）
- 替人物做决定（他决定留下）
- 发明未来事实（秘密将被揭露、安排背叛）
- 为见自己/见众生/见天地而制造事件
- 任何评分（literary_score、classicness）
- must_include_events、predicted_outcome

只输出 JSON：
{
  "candidates": [
    {
      "id": "R1",
      "kind": "possibility",
      "provenance": "story-route-v1",
      "title": "短标签",
      "direction": "80-200字人生方向散文",
      "tensions": ["内在或关系张力，不是事件"],
      "relationship_shifts": ["X与Y的关系可能被重新定义，不是他们吵架"],
      "open_space": "什么仍未决定，留给Writer和人物自己选择"
    }
  ]
}`;

function parseJsonFromLlm(content = '') {
  const raw = String(content).trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const text = fenced ? fenced[1].trim() : raw;
  return JSON.parse(text);
}

function normalizeCandidate(raw, index) {
  return {
    id: String(raw.id || `R${index + 1}`),
    kind: 'possibility',
    provenance: ROUTE_VERSION,
    title: String(raw.title || `路线 ${index + 1}`).trim(),
    direction: String(raw.direction || '').trim(),
    tensions: Array.isArray(raw.tensions) ? raw.tensions.map(String) : [],
    relationship_shifts: Array.isArray(raw.relationship_shifts) ? raw.relationship_shifts.map(String) : [],
    open_space: String(raw.open_space || '').trim(),
  };
}

/** Deterministic mock for tests without LLM. */
export function mockRouteCandidates(routeInput) {
  const pov = routeInput.current_reality?.pov || '主角';
  const trajectory = routeInput.author_initial_trajectory || '继续当前处境';
  const base = [
    {
      id: 'R1',
      kind: 'possibility',
      provenance: ROUTE_VERSION,
      title: '维持原轨',
      direction: `${pov}若继续沿当前轨迹前行，那些已经存在的关系与压力不会消失；${trajectory}所暗示的方向，可能逐渐显影为对自我理解的松动，而非一次性的决断。`,
      tensions: ['惯性习惯与隐约不安并存'],
      relationship_shifts: ['与身边人的距离可能被重新丈量'],
      open_space: '是否改变节奏、是否开口，均未确定',
    },
    {
      id: 'R2',
      kind: 'possibility',
      provenance: ROUTE_VERSION,
      title: '向内折返',
      direction: `${pov}或许会把注意力从外部目标暂时收回，转向那些一直被搁置的感受；这不是撤退，而是让「接下来怎么走」不再能用旧答案敷衍。`,
      tensions: ['责任感应与自我需求之间的拉扯'],
      relationship_shifts: ['亲密关系中的期待可能被重新协商'],
      open_space: '内心变化是否外显、如何外显，均未确定',
    },
    {
      id: 'R3',
      kind: 'possibility',
      provenance: ROUTE_VERSION,
      title: '向外试探',
      direction: `在已确认的现实边界内，${pov}可能尝试接触新的信息或他人，不是为了制造戏剧性，而是因为旧处境已装不下全部疑问。`,
      tensions: ['好奇与风险并存'],
      relationship_shifts: ['弱关系链接可能获得重量'],
      open_space: '试探的深度与后果，均未确定',
    },
  ];
  return base;
}

/**
 * @param {object} routeInput
 * @param {{ mock?: boolean, llm?: object }} [options]
 */
export async function generateRouteCandidates(routeInput, options = {}) {
  const useMock = options.mock === true || options.mock === '1' || process.env.INKOS_ROUTE_MOCK === '1';

  if (useMock || !isLlmConfigured()) {
    if (!useMock && !isLlmConfigured()) {
      console.warn('[route] LLM 未配置，使用 mock 候选（设置 INKOS_ROUTE_MOCK=1 或配置 API Key）');
    }
    const candidates = mockRouteCandidates(routeInput);
    return { candidates, source: 'mock', model: null };
  }

  const config = { ...loadInkOsConfig().llm, ...options.llm };
  const userPrompt = formatRouteInputForPrompt(routeInput);

  const result = await chatCompletion({
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    model: config.model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    maxTokens: config.maxTokens ?? 4096,
    temperature: config.temperature ?? 0.7,
  });

  let parsed;
  try {
    parsed = parseJsonFromLlm(result.content);
  } catch (err) {
    throw new Error(`Route Generator JSON 解析失败: ${err.message}\n---\n${result.content?.slice(0, 500)}`);
  }

  const rawList = Array.isArray(parsed.candidates) ? parsed.candidates : [];
  const candidates = rawList
    .map((c, i) => normalizeCandidate(c, i))
    .filter((c) => isValidCandidateShape(c));

  if (candidates.length < CANDIDATE_COUNT.min) {
    throw new Error(`Route Generator 返回候选不足 ${CANDIDATE_COUNT.min} 条（got ${candidates.length}）`);
  }

  return {
    candidates: candidates.slice(0, CANDIDATE_COUNT.max),
    source: 'llm',
    model: config.model,
    usage: result.usage,
  };
}
