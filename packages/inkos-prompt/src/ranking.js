/**
 * Context Ranking Engine — Facts / Knowledge / Relationship Top-K
 */
import { countTokens } from './token-meter.js';

function tokenOverlap(a, b) {
  if (!a || !b) return 0;
  const wordsA = new Set(String(a).split(/[\s，。、；：！？,.;:!?]+/).filter((w) => w.length > 1));
  const wordsB = new Set(String(b).split(/[\s，。、；：！？,.;:!?]+/).filter((w) => w.length > 1));
  if (!wordsA.size || !wordsB.size) return 0;
  let hit = 0;
  for (const w of wordsA) if (wordsB.has(w)) hit += 1;
  return hit / Math.max(wordsA.size, wordsB.size);
}

function sceneCorpus(scene, ctx) {
  return `${scene.goal} ${scene.conflict} ${scene.title} ${scene.beat} ${ctx.stateBoard || ''}`;
}

export function scoreFact(fact, scene, ctx) {
  const text = typeof fact === 'string' ? fact : fact.fact;
  const corpus = sceneCorpus(scene, ctx);
  let score = tokenOverlap(text, corpus);
  if (fact.chapter && fact.chapter >= (ctx.chapter || 1) - 2) score += 0.15;
  return Math.min(0.99, score + 0.1);
}

export function scoreKnowledge(row, scene, entities) {
  const corpus = sceneCorpus(scene, { stateBoard: '' });
  let score = tokenOverlap(row.info, corpus);
  for (const name of entities) {
    const level = row[name];
    if (level === 'unknown' || level === 'partial') score += 0.12;
    if (level === 'known') score += 0.05;
  }
  return Math.min(0.99, score + 0.08);
}

export function scoreRelationship(edge, scene, entities) {
  const corpus = sceneCorpus(scene, { stateBoard: '' });
  let score = 0.2;
  if (entities.includes(edge.from) || entities.includes(edge.to)) score += 0.35;
  if (corpus.includes(edge.from) || corpus.includes(edge.to)) score += 0.25;
  score += Math.min(0.2, Math.abs(edge.hostility || 0) * 0.05);
  return Math.min(0.99, score);
}

export function rankItems(items, scorer, { topK = 6, minScore = 0.2 } = {}) {
  const ranked = items
    .map((item, i) => ({ item, score: scorer(item), index: i }))
    .sort((a, b) => b.score - a.score);
  const selected = ranked.filter((r) => r.score >= minScore).slice(0, topK);
  const dropped = ranked.length - selected.length;
  return { selected, dropped, all: ranked };
}

export function selectWithinTokenBudget(rankedItems, formatter, budgetTokens) {
  const out = [];
  let used = 0;
  let dropped = 0;
  for (const { item, score } of rankedItems) {
    const text = formatter(item);
    const tokens = countTokens(text);
    if (used + tokens > budgetTokens) {
      dropped += 1;
      continue;
    }
    out.push({ item, score, text, tokens });
    used += tokens;
  }
  return { items: out, usedTokens: used, dropped };
}

export function formatRankedFacts(ranked) {
  return ranked.map((r) => `- [${r.score.toFixed(2)}] ${typeof r.item === 'string' ? r.item : r.item.fact}`).join('\n');
}

export function formatRankedKnowledge(ranked) {
  return ranked.map((r) => `- [${r.score.toFixed(2)}] ${r.item.info}`).join('\n');
}

export function formatRankedRelationships(ranked) {
  return ranked.map((r) => {
    const e = r.item;
    return `- [${r.score.toFixed(2)}] ${e.from}→${e.to} trust=${e.trust} hostility=${e.hostility}`;
  }).join('\n');
}
