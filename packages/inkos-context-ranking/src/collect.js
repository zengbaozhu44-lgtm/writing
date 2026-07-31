/**
 * 可排序 Context 源 — Prompt Compiler 仅发送 TopK
 */
import { charCount } from './utils.js';

export const RANKABLE_SOURCES = [
  'facts',
  'knowledge',
  'resources',
  'relationships',
  'timeline',
];

export const BUDGET_KEY_MAP = {
  facts: 'facts',
  knowledge: 'knowledge',
  resources: 'facts',
  relationships: 'relationship',
  timeline: 'history',
};

function item(source, id, text, meta = {}) {
  const t = String(text || '').trim();
  if (!t) return null;
  return {
    id: `${source}:${id}`,
    source,
    text: t,
    charCount: charCount(t),
    meta,
  };
}

export function collectFacts(facts = []) {
  return facts.map((f, i) => item('facts', i, f.fact || f.text || String(f), {
    immutable: Boolean(f.immutable),
    chapter: f.chapter,
  })).filter(Boolean);
}

export function collectKnowledge(knowledge = {}, pov = '') {
  const rows = knowledge.matrix || [];
  return rows.map((row, i) => {
    const info = row.info || row.topic || '';
    const povState = pov && row[pov] ? `（${pov}：${row[pov]}）` : '';
    return item('knowledge', i, `${info}${povState}`, { pov, row });
  }).filter(Boolean);
}

export function collectTimeline(timeline = [], chapter = 1) {
  const days = Array.isArray(timeline) ? timeline : [];
  return days.map((d, i) => {
    const events = (d.events || []).slice(0, 4).join('；');
    return item('timeline', i, `Day ${d.day}：${events}`, {
      day: d.day,
      chapter: d.chapter,
      recency: chapter - (d.chapter || 0),
    });
  }).filter(Boolean);
}

export function collectRelationships(relationships = [], pov = '', present = []) {
  const names = new Set([pov, ...present].filter(Boolean));
  return relationships
    .filter((e) => names.has(e.from) || names.has(e.to))
    .map((e, i) => item('relationships', i,
      `${e.from}↔${e.to}：信任${e.trust ?? '—'} 敌意${e.hostility ?? '—'}${e.note ? ` · ${e.note}` : ''}`,
      { from: e.from, to: e.to, hostility: e.hostility, trust: e.trust },
    ))
    .filter(Boolean);
}

export function collectResources(resources = {}, pov = '', present = []) {
  const items = [];
  const byChar = resources.by_character || {};
  const names = [pov, ...present].filter(Boolean);
  for (const name of names) {
    const res = byChar[name];
    if (!res) continue;
    items.push(item('resources', name, `${name} 资源：${JSON.stringify(res).slice(0, 200)}`, { character: name }));
  }
  return items.filter(Boolean);
}

/** 五类 Context 池 — Compiler 专用 */
export function collectRankableContext(ctx = {}, { factPool = null } = {}) {
  const pov = ctx.pov || '';
  const present = ctx.present || [];
  const chapter = ctx.chapter || 1;
  const facts = factPool ?? ctx.facts ?? [];

  return {
    facts: collectFacts(facts),
    knowledge: collectKnowledge(ctx.knowledge, pov),
    resources: collectResources(ctx.resources, pov, present),
    relationships: collectRelationships(ctx.relationships, pov, present),
    timeline: collectTimeline(ctx.timeline, chapter),
  };
}

/** @deprecated Studio 全量排序用 */
export function collectCharacters(characters = {}, pov = '', present = []) {
  const names = [...new Set([pov, ...present].filter(Boolean))];
  return names.map((name) => {
    const c = characters[name];
    if (!c) return null;
    const lines = [
      c.identity && `身份：${c.identity}`,
      c.publicGoal && `公开目标：${c.publicGoal}`,
      c.realGoal && `真实目标：${c.realGoal}`,
      c.fear && `恐惧：${c.fear}`,
      c.bottomLine && `底线：${c.bottomLine}`,
    ].filter(Boolean);
    return item('characters', name, `${name}：${lines.join('；')}`, { name, isPov: name === pov });
  }).filter(Boolean);
}

export function collectWorld(worldBible = '') {
  const text = String(worldBible || '').trim();
  if (!text) return [];
  const chunks = text.split(/\n(?=#{1,3}\s)/).map((c) => c.trim()).filter(Boolean);
  if (chunks.length <= 1) {
    const paras = text.split(/\n{2,}/).filter((p) => p.trim().length > 40);
    return paras.slice(0, 8).map((p, i) => item('world', i, p.slice(0, 400), { chunk: i }));
  }
  return chunks.slice(0, 10).map((c, i) => item('world', i, c.slice(0, 500), { chunk: i }));
}

export function collectAllContext(ctx = {}) {
  return [
    ...collectRankableContext(ctx).facts,
    ...collectRankableContext(ctx).knowledge,
    ...collectRankableContext(ctx).timeline,
    ...collectRankableContext(ctx).relationships,
    ...collectRankableContext(ctx).resources,
    ...collectCharacters(ctx.characters, ctx.pov, ctx.present),
    ...collectWorld(ctx.worldBible),
  ];
}
