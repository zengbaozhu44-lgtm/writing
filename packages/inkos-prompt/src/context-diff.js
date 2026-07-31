/**
 * Context Diff — Scene2+ 只发送变化，不重复整个世界
 */
import { hashContent } from './hash.js';

export function snapshotContext(ctx) {
  return {
    state: { ...ctx.state },
    resources: JSON.parse(JSON.stringify(ctx.resources?.by_character?.[ctx.pov] || {})),
    relationships: (ctx.relationships || []).map((e) => ({ from: e.from, to: e.to, trust: e.trust, hostility: e.hostility })),
    factIds: (ctx.facts || []).slice(-10).map((f) => f.fact),
    knowledge: (ctx.knowledge?.matrix || []).map((r) => ({ info: r.info, ...pickEntityLevels(r, ctx.pov) })),
  };
}

function pickEntityLevels(row, pov) {
  const o = {};
  if (pov && row[pov] != null) o[pov] = row[pov];
  return o;
}

export function diffContext(prev, next) {
  if (!prev) return { isFull: true, state: next.state, resources: next.resources, relationships: next.relationships, facts: next.factIds, knowledge: next.knowledge };

  const diff = { isFull: false, state: {}, resources: {}, relationships: [], facts: [], knowledge: [] };

  for (const [k, v] of Object.entries(next.state || {})) {
    if (prev.state?.[k] !== v) diff.state[k] = v;
  }

  const prevRes = prev.resources || {};
  const nextRes = next.resources || {};
  for (const [k, v] of Object.entries(nextRes)) {
    if (prevRes[k] !== v) diff.resources[k] = typeof v === 'number' && typeof prevRes[k] === 'number' ? v - prevRes[k] : v;
  }

  const prevRel = new Map((prev.relationships || []).map((e) => [`${e.from}→${e.to}`, e]));
  for (const e of next.relationships || []) {
    const key = `${e.from}→${e.to}`;
    const p = prevRel.get(key);
    if (!p || p.trust !== e.trust || p.hostility !== e.hostility) {
      diff.relationships.push(e);
    }
  }

  const prevFacts = new Set(prev.factIds || []);
  for (const f of next.factIds || []) {
    if (!prevFacts.has(f)) diff.facts.push(f);
  }

  return diff;
}

export function formatContextDiff(diff) {
  const lines = ['### 上下文变化（Diff）'];
  if (diff.isFull) {
    lines.push('（首 Scene — 完整状态）');
    for (const [k, v] of Object.entries(diff.state || {})) {
      if (v && v !== '—') lines.push(`- 状态·${k}: ${v}`);
    }
    return lines.join('\n');
  }
  if (Object.keys(diff.state || {}).length) {
    lines.push('**状态变化:**');
    for (const [k, v] of Object.entries(diff.state)) lines.push(`- ${k}: ${v}`);
  }
  if (Object.keys(diff.resources || {}).length) {
    lines.push('**资源变化:**');
    for (const [k, v] of Object.entries(diff.resources)) {
      const sign = typeof v === 'number' && v > 0 ? '+' : '';
      lines.push(`- ${k}: ${sign}${v}`);
    }
  }
  if (diff.relationships?.length) {
    lines.push('**关系变化:**');
    for (const e of diff.relationships) {
      lines.push(`- ${e.from}→${e.to} trust=${e.trust} hostility=${e.hostility}`);
    }
  }
  if (diff.facts?.length) {
    lines.push('**新增事实:**');
    for (const f of diff.facts) lines.push(`- ${f}`);
  }
  return lines.join('\n');
}

export function contextDiffHash(diff) {
  return hashContent(JSON.stringify(diff));
}
