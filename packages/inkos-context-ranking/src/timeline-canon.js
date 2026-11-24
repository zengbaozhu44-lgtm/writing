/**
 * S6.3 — Timeline Canon eligibility（Writer 读侧资格，不改磁盘）
 *
 * 「存在于 11_timeline.yaml」≠「有资格作为 Canon 给 Writer 看」。
 *
 * EO-P1 Dual BLOCK A: A-class / `verified` morphology = read eligibility ≠ obtains.
 * Allow into Writer context ≠ Author Authority / Reality Status.
 *
 *   A = outcome-shaped narrative (eligibility) → allow
 *   B = Planner skeleton / B-class template → reject
 *   C = goal / scene plan masquerading as event → reject
 *   D = unknown / no provenance → reject
 *
 * 宁缺勿滥：无法证明是已发生后果 → 不进 Writer Canon context。
 * 不在此删除或改写 11；历史迁移属 S6.4。不重新认证 legacy 为 Reality。
 *
 * EO-P7 (R-04/R-05/I-07): A-class / “canonical” / “verified” = Writer read eligibility
 * only. Storage presence on 11 ≠ obtains. Filter does not re-certify Legacy as Authority.
 *
 * B-class 集合与 authored-input-sanitize TEMPLATE_FALLBACKS 对齐（叶子模块，避免 ranking→brain 环）。
 *
 * @see golden/reality/d1-implementation-contract/LEGACY-READ-PREFERENCE.md
 */

const TEMPLATE_FALLBACKS = new Set([
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

function isTemplateFallback(text = '') {
  const t = String(text || '').trim();
  if (!t) return true;
  if (t === 'no_causal_basis') return true;
  return TEMPLATE_FALLBACKS.has(t);
}

const OUTCOME_RE =
  /失去|击溃|暴露|崩溃|死亡|复活|反杀|撕裂|获得|解锁|警告|弹出|切断|降临|决裂|牺牲|燃烧|封印|占领|夺取|团灭|逃生|破译|识破|觉醒|碾压|击败|摧毁|泄露|锁定|入侵|污染|反噬|阵亡|惨胜|瓦解|击退|渗透/u;

/**
 * @param {string} text
 * @returns {{ class: 'A'|'B'|'C'|'D', reason: string }}
 */
export function classifyHistoricalTimelineEvent(text = '') {
  const t = String(text || '').trim();
  if (!t) return { class: 'D', reason: 'empty' };

  if (isTemplateFallback(t)) return { class: 'B', reason: 'B-class exact template' };
  if (/^克服阻碍[：:]/u.test(t)) return { class: 'B', reason: 'skeleton:克服阻碍' };
  if (/^转折（本 Scene/u.test(t)) return { class: 'B', reason: 'skeleton:转折（本 Scene' };
  if (/^章末钩子（承接/u.test(t)) return { class: 'B', reason: 'skeleton:章末钩子（' };
  if (/^进入现场并确立危机[：:]/u.test(t)) return { class: 'B', reason: 'skeleton:进入现场' };
  if (/^承接上章情绪/u.test(t)) return { class: 'B', reason: 'skeleton:承接上章情绪' };
  if (/^推进阻碍（/u.test(t)) return { class: 'B', reason: 'skeleton:推进阻碍' };
  if (/待规划第\d+章/u.test(t)) return { class: 'B', reason: 'placeholder:待规划' };

  if (/^承接上章推进/u.test(t)) return { class: 'C', reason: 'scene plan prefix' };
  if (/^转折[：:]/u.test(t)) return { class: 'C', reason: 'turn label as event' };
  if (/^章末钩子[·•：:]/u.test(t)) return { class: 'C', reason: 'hook label as event' };
  if (/本章必须发生/u.test(t)) return { class: 'C', reason: 'future obligation goal' };
  if (/紧急铺垫/u.test(t)) return { class: 'C', reason: 'milestone scaffolding' };
  if (/^(完成|探索|占领|获取|解决|推进)/u.test(t) && t.length < 80 && !OUTCOME_RE.test(t)) {
    return { class: 'C', reason: 'goal verb without verified outcome' };
  }

  if (OUTCOME_RE.test(t) && t.length >= 12) {
    return { class: 'A', reason: 'outcome / consequence narrative' };
  }
  if (t.length >= 90 && /[。！？]/u.test(t)) {
    return { class: 'A', reason: 'long completed narrative (likely post-hoc summary)' };
  }

  if (t.length < 22 && !/[。！？]/u.test(t)) return { class: 'D', reason: 'fragment / incomplete' };
  return { class: 'D', reason: 'unverified — no provenance' };
}

/** Writer context eligibility only (EO-P7) — not obtains / Authority Act. */
export const TIMELINE_CANON_READ_ROLE = 'writer_context_eligibility_not_obtains';
export function isCanonicalTimelineEvent(text = '') {
  return classifyHistoricalTimelineEvent(text).class === 'A';
}

/** 过滤 day.events，只保留 Canon-eligible；不改写原文 */
export function filterCanonicalTimelineEvents(events = []) {
  const out = [];
  const seen = new Set();
  for (const raw of events || []) {
    const t = String(raw || '').trim();
    if (!t || seen.has(t)) continue;
    if (!isCanonicalTimelineEvent(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}
