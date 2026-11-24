/**
 * Phase 1.3 — LLM-assisted Actual Event extraction (evidence proposal only)
 *
 * 语义边界（phase-1.3-llm-extraction-benchmark-and-design.md，已定稿）：
 * - LLM 只做 EXTRACT proposal；永不直接写 actualEvents / sidecar
 * - 全部 Truth 判定在确定性闸门：现有 validateStoryEvent（excerpt 字面 grounding、
 *   action grounding、source 黑名单、writes* 强制 false）+ actor ⊆ knownNames +
 *   actorEvidence 逐字 + consequence echo/aftermath-grounding（复用 WCT 桥谓词）
 * - schema 不变；source = STORY_EVENT_SOURCES.ANNOTATED（既有合法值）
 * - fail-closed：LLM 失败 / JSON 破损 / 全拒 → 回退现行确定性提取器（不劣于现状）
 */
import { createStoryEvent, STORY_EVENT_SOURCES } from './story-event.schema.js';
import { validateStoryEvent } from './event-validator.js';
import { extractStoryEventsFromScene } from './event-extractor.js';
import { isActionEchoOfY, isGroundedInAftermath } from '../causality/world-consequence-truth.js';
import { locateRawExcerpt, mintEventIdentity } from './event-identity.js';
import { chatCompletion } from '../writer/llm-writer.js';
import { loadInkOsConfig } from '../../../inkos-core/src/lib/config.js';

export const LLM_EXTRACTION_VERSION = 'llm-assisted-1';

const SYSTEM_PROMPT = [
  '你是小说正文的人物经历提取器。只输出 JSON 数组，不要解释。',
  '',
  '【最重要规则】excerpt 与 consequence 必须是从正文「复制粘贴」的连续原文，一个字都不能改、不能增删；action 只能用 excerpt 中实际出现的字词拼接主谓短语。转述=非法。',
  '',
  '提取的不是「人物做了什么物理动作」，而是「人物经历了什么」。优先级从高到低：',
  '1. social（角色与谁发生了什么互动/对话/冲突/合作）',
  '2. relational（关系变化事件：信任/背叛/告别/重逢）',
  '3. informational（角色获得/看到/听到/确认了什么信息）',
  '4. environmental（角色处于什么环境、接触了什么世界变化）',
  '5. daily-life（吃饭/等待/休息/工作/通勤/生活状态）',
  '6. physical（物理操作——仅在无更高优先级事件时才提取）',
  '',
  '每个元素：',
  '{ "kind": "social|relational|informational|environmental|daily|action|speech|discovery|movement",',
  '  "actors": ["只能从人物名单选"],',
  '  "action": "≤40字，主谓短语，字词须出现在 excerpt 中",',
  '  "consequence": "该事件之后正文明确呈现的世界变化原文短语（≤50字，逐字摘自正文）；没有则填空字符串",',
  '  "stateChanges": ["experience:简短标签"],',
  '  "affectedEntities": ["人物或物件"],',
  '  "excerpt": "正文连续原文 10-120 字，逐字复制，包含经历证据",',
  '  "actorEvidence": "正文中逐字出现的、支持 actor 归属的短语" }',
  '',
  '禁止：推断人物性格/情绪/心理；从经历推导信念/目标/选择；角色未实际接触的事件；计划或可能性。宁缺勿滥，每场 ≤6 个事件。',
].join('\n');

/** 默认提案者：真实 LLM 调用（生产配置或显式覆盖） */
async function defaultProposer({ text, knownNames, llm }) {
  const cfg = { ...loadInkOsConfig().llm, ...(llm || {}) };
  if (!cfg.apiKey) throw new Error('LLM extraction: no api key configured');
  const r = await chatCompletion({
    baseUrl: cfg.baseUrl,
    apiKey: cfg.apiKey,
    model: cfg.model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `人物名单：${knownNames.join('、')}\n\n正文：\n${text}` },
    ],
    maxTokens: 3000,
    temperature: 0.1,
  });
  const raw = String(r.content || '').replace(/```json|```/g, '').trim();
  const arr = JSON.parse(raw);
  if (!Array.isArray(arr)) throw new Error('LLM extraction: non-array output');
  return arr.slice(0, 6);
}

/**
 * LLM-assisted extraction with deterministic gates.
 * @returns {Promise<{events: object[], rejected: object[], meta: object}>}
 */
export async function extractStoryEventsLLMAssisted(scene = {}, opts = {}) {
  const text = String(scene.text || '').trim();
  const sceneId = String(scene.id || `scene_${scene.index || '?'}`);
  const knownNames = resolveKnown(scene, opts.knownNames);
  const proposer = opts.proposer || defaultProposer;

  if (!text || !knownNames.length) {
    return fallback(scene, opts, sceneId, 'no_text_or_knownNames');
  }

  let candidates = [];
  let llmError = null;
  try {
    candidates = await proposer({ text, knownNames, scene, llm: opts.llm });
  } catch (e) {
    llmError = String(e?.message || e);
  }

  if (llmError || !candidates.length) {
    return fallback(scene, opts, sceneId, llmError ? `llm_error:${llmError.slice(0, 80)}` : 'no_candidates');
  }

  const passed = [];
  const rejected = [];
  for (let i = 0; i < candidates.length; i += 1) {
    const c = candidates[i];
    const errors = gateCandidate(c, text, knownNames, i);
    if (errors.length) {
      rejected.push({ candidate: c, errors });
      continue;
    }
    // EO-G1-C-01：锚定位（raw text 逐字）——NOT_FOUND/AMBIGUOUS 一律 fail-closed
    const excerptRaw = String(c.excerpt).trim();
    const loc = locateRawExcerpt(text, excerptRaw);
    if (loc.status !== 'FOUND') {
      rejected.push({ candidate: c, errors: [`evidence_anchor_${loc.status.toLowerCase()}`] });
      continue;
    }
    const minted = mintEventIdentity({ sceneId, excerpt: excerptRaw, offset: loc.offset });
    if (!minted.ok) {
      rejected.push({ candidate: c, errors: ['identity_mint_failed'] });
      continue;
    }
    const candidate = createStoryEvent({
      id: minted.id,
      sceneId,
      kind: c.kind || 'action',
      actors: c.actors,
      action: String(c.action).trim(),
      consequence: String(c.consequence || '').trim(),
      stateChanges: c.stateChanges,
      affectedEntities: c.affectedEntities,
      evidence: { excerpt: excerptRaw, offset: loc.offset },
      source: STORY_EVENT_SOURCES.ANNOTATED,
    });
    const v = validateStoryEvent(candidate, { text });
    if (v.ok) passed.push(v.event);
    else rejected.push({ candidate: c, errors: v.errors });
  }

  if (!passed.length) {
    const fb = fallback(scene, opts, sceneId, 'all_candidates_rejected');
    fb.meta.llmRejected = rejected.length;
    fb.rejected = rejected; // 审计轨迹：闸门拒绝明细在回退时也保留
    return fb;
  }

  return {
    events: dedupe(passed),
    rejected,
    meta: {
      sceneId,
      source: STORY_EVENT_SOURCES.ANNOTATED,
      extraction: LLM_EXTRACTION_VERSION,
      model: opts.llm?.model || loadInkOsConfig().llm?.model || null,
      candidateCount: candidates.length,
      rejectedCount: rejected.length,
      fallbackUsed: false,
      planFieldsIgnored: true,
    },
  };
}

/** 候选侧确定性闸门（validator 之前的白名单级检查） */
function gateCandidate(c, text, knownNames, i) {
  const errors = [];
  if (!c || typeof c !== 'object') return [`candidate_${i}_not_object`];
  if (!Array.isArray(c.actors) || !c.actors.length) errors.push('actor_missing');
  else if (!c.actors.every((a) => knownNames.includes(String(a).trim()))) errors.push('actor_not_in_knownNames');
  const actorEvidence = String(c.actorEvidence || '').trim();
  if (!actorEvidence || !text.includes(actorEvidence)) errors.push('actorEvidence_not_literal');
  const cons = String(c.consequence || '').trim();
  if (cons && (isActionEchoOfY(cons, c.action) || !isGroundedInAftermath(cons, text, 0))) {
    errors.push('consequence_echo_or_ungrounded');
  }
  return errors;
}

/** 回退：现行确定性提取器（不劣于现状） */
function fallback(scene, opts, sceneId, reason) {
  const base = extractStoryEventsFromScene(scene, { knownNames: opts.knownNames });
  return {
    ...base,
    meta: {
      ...base.meta,
      extraction: LLM_EXTRACTION_VERSION,
      fallbackUsed: true,
      fallbackReason: reason,
    },
  };
}

/**
 * Opt-in 异步入口：extraction!=='llm-assisted' 时保持原同步行为（返回值兼容 await）。
 * attach 语义与 ensureActualEvents 完全一致（赋 scene.actualEvents / actualEventMeta）。
 */
export async function ensureActualEventsWithExtraction(scene = {}, opts = {}) {
  if (opts.extraction !== 'llm-assisted') {
    // 保持现行同步路径（ensureActualEvents）
    const { ensureActualEvents } = await import('./event-extractor.js');
    return ensureActualEvents(scene, opts);
  }
  if (Array.isArray(scene.actualEvents) && scene.actualEvents.length && opts.reextract !== true) {
    return scene;
  }
  const base = opts.stripPlan === false ? scene : { ...scene };
  const { events, rejected, meta } = await extractStoryEventsLLMAssisted(
    { ...base, text: scene.text },
    opts,
  );
  // 不劣于现状不变量：任何零事件结果一律再走确定性提取器兜底
  // （确定性 presence 路径对 ≥12 字文本恒有产出；此处防御 LLM 路径偶发空集）
  let finalEvents = events;
  let finalMeta = { ...meta, rejectedCount: rejected.length };
  if (!finalEvents.length && String(scene.text || '').trim()) {
    const { ensureActualEvents } = await import('./event-extractor.js');
    ensureActualEvents(scene, { knownNames: opts.knownNames, stripPlan: opts.stripPlan !== false });
    finalEvents = scene.actualEvents || [];
    finalMeta = {
      ...finalMeta,
      doubleFallbackUsed: true,
      llmMeta: meta,
    };
    console.warn('[extraction-llm] LLM path yielded 0 events — deterministic double-fallback engaged, meta =',
      JSON.stringify(meta).slice(0, 160));
  }
  // 诊断仪表（≠ Truth 逻辑）：双兜底后仍零事件 → 落盘尸检数据
  if (!finalEvents.length && String(scene.text || '').trim() && opts.bookDir) {
    try {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const dir = path.join(opts.bookDir, 'novel', '_system', 'brain', 'extraction_failures');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${String(scene.id || 'scene_unknown').replace(/[^\w-]/g, '_')}.json`),
        JSON.stringify({
          at: new Date().toISOString(),
          sceneId: scene.id,
          text: scene.text,
          meta: finalMeta,
          rejected: (rejected || []).map((r) => ({
            errors: r.errors,
            candidate: r.candidate,
          })),
        }, null, 2));
    } catch { /* 诊断落盘失败不改变主流程 */ }
  }
  scene.actualEvents = finalEvents;
  scene.actualEventMeta = finalMeta;
  return scene;
}

function resolveKnown(scene, extra) {
  const fromScene = Array.isArray(scene.characters) ? scene.characters : [];
  const pov = scene.pov ? [String(scene.pov)] : [];
  return [...new Set([...(extra || []), ...fromScene, ...pov].map(String).filter(Boolean))];
}

function dedupe(events) {
  const seen = new Set();
  const out = [];
  for (const e of events) {
    const key = String(e.id || ''); // EO-G1-C-01：dedupe 键=锚定 id（dedupe≠identity）
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}
