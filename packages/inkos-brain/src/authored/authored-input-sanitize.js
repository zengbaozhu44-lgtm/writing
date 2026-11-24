/**
 * Authored Input Sanitization — S2/S3 读时隔离（不改 09 磁盘）
 *
 * C3：B 类模板脚手架不得升级为 obstacle / turningPoint / ending / mustLose 等因果语义。
 * C4：A 类 authored constraint → WorldPressure.required_event；不得进 choice.reason。
 * C5：精确匹配 TEMPLATE_FALLBACKS，不做宽泛 substring kill。
 * C7：仅在消费路径隔离；不修改历史 09 内容。
 *
 * S3.3：required_event 仅来自 yaml 显式槽；禁止 goal → required_event。
 * S3.4：writeNextChapterTask 写入 generated provenance；缺省历史卡 = unknown。
 */
import { sanitizeObstacleSuggestion } from '../decision/content-policy.js';

/** 与 planner PLAN_TEMPLATE_STRINGS / causal TEMPLATE_FALLBACKS 同族 —— 单一真源 */
export const TEMPLATE_FALLBACKS = new Set([
  '资源不足或时间压力',
  '信息不完整',
  '关键抉择导致不可逆变化',
  '发现型钩子',
  '时间或身体代价',
  '推进当前现实目标',
  '必须失去：时间或身体代价',
  '代价兑现',
  '外部阻力',
  '关键抉择与代价落地',
  '章末钩子，局势改写',
]);

/** 模板占位符（含空串 + no_causal_basis）= 脚手架，不是 authored 因果。 */
export function isTemplateFallback(text = '') {
  const t = String(text || '').trim();
  if (!t) return true;
  if (t === 'no_causal_basis') return true;
  if (TEMPLATE_FALLBACKS.has(t)) return true;
  return false;
}

/**
 * Planner 读时隔离：B 类脚手架 → fallback，真实长句保留（Case D）。
 * @param {string} value
 * @param {string} [fallback='no_causal_basis']
 */
export function sanitizeAuthoredPlannerField(value, fallback = 'no_causal_basis') {
  const s = String(value ?? '').trim();
  if (!s || isTemplateFallback(s)) return fallback;
  return s;
}

/**
 * 09 阻碍字段：毒建议消毒 + 模板脚手架隔离（与 Causal pick() 同口径）。
 */
export function sanitizeAuthoredObstacleField(value, fallback = 'no_causal_basis') {
  const detoxicated = sanitizeObstacleSuggestion(String(value ?? '').trim(), '');
  return sanitizeAuthoredPlannerField(detoxicated, fallback);
}

/**
 * S3.2 C2：章级 event 权威源。
 * - 存在 chapter_NNNN.yaml（authoredPlan）→ event 只读 yaml.goal，09 不得覆盖/补充
 * - 无 yaml → 09 current task fallback
 * @returns {{ event: string|null, source: 'authored_plan.goal'|'chapter_task.目标'|null }}
 */
export function resolveChapterEvent(chapterTask = {}, authoredPlan = null) {
  if (authoredPlan) {
    const goal = String(authoredPlan.goal || '').trim();
    if (!goal || isTemplateFallback(goal)) {
      return { event: null, source: null };
    }
    return { event: goal, source: 'authored_plan.goal' };
  }
  const from09 = String(chapterTask['目标'] || chapterTask['本章现实目标'] || '').trim();
  if (!from09 || isTemplateFallback(from09)) {
    return { event: null, source: null };
  }
  return { event: from09, source: 'chapter_task.目标' };
}

/**
 * S3.3 C4：显式 authored `required_event` 槽位。
 * - 只读 chapter yaml 的 required_event / requiredEvent
 * - 禁止从 goal / 09 / B 类模板推导或升级
 * - 精确模板命中 → 丢弃；含模板词的真实长句 → 保留（Case B-4）
 * @returns {{ required_event: string|string[]|null, source: 'authored_plan.required_event'|null }}
 */
export function resolveAuthoredRequiredEvent(authoredPlan = null) {
  if (!authoredPlan || typeof authoredPlan !== 'object') {
    return { required_event: null, source: null };
  }
  const raw = authoredPlan.required_event ?? authoredPlan.requiredEvent;
  if (raw == null || raw === '') {
    return { required_event: null, source: null };
  }
  const items = Array.isArray(raw) ? raw : [raw];
  const kept = items
    .map((x) => String(x ?? '').trim())
    .filter((s) => s && !isTemplateFallback(s));
  if (!kept.length) {
    return { required_event: null, source: null };
  }
  return {
    required_event: kept.length === 1 ? kept[0] : kept,
    source: 'authored_plan.required_event',
  };
}

/** S3.4：09 任务卡 provenance 注释（不重构 schema；缺省 = unknown） */
const PROVENANCE_RE = /<!--\s*inkos-task-provenance\s+kind=(\w+)\s+source=([^\s>]+)\s*-->/;

/**
 * @returns {{ kind: 'generated'|'authored'|'unknown', source: string|null }}
 */
export function parseChapterTaskProvenance(md = '') {
  const m = String(md || '').match(PROVENANCE_RE);
  if (!m) return { kind: 'unknown', source: null };
  const kind = m[1];
  if (kind !== 'generated' && kind !== 'authored') {
    return { kind: 'unknown', source: m[2] || null };
  }
  return { kind, source: m[2] || null };
}

/** 写入/替换 09 顶部 provenance 注释；不改字段语义。 */
export function stampChapterTaskProvenance(md = '', { kind, source } = {}) {
  if (kind !== 'generated' && kind !== 'authored') {
    throw new Error(`stampChapterTaskProvenance: kind 必须是 generated|authored，得 ${kind}`);
  }
  const src = String(source || kind).trim() || kind;
  const stamp = `<!-- inkos-task-provenance kind=${kind} source=${src} -->`;
  const body = String(md || '').replace(PROVENANCE_RE, '').replace(/^\uFEFF/, '');
  if (/^#\s*09\s+Current Chapter\s*\n/i.test(body)) {
    return body.replace(/^(#\s*09\s+Current Chapter\s*\n)/i, `$1\n${stamp}\n`);
  }
  return `${stamp}\n${body}`;
}
