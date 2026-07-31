import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { exists, readJson, readText } from './paths.js';

export function readYaml(filePath) {
  if (!exists(filePath)) return null;
  return YAML.parse(readText(filePath));
}

export function writeYaml(filePath, data) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, YAML.stringify(data, { lineWidth: 0 }), 'utf8');
}

export function appendFacts(factsPath, newFacts, chapter) {
  const db = readYaml(factsPath) || { facts: [] };
  const existing = new Set(db.facts.map((f) => f.fact));
  for (const fact of newFacts) {
    const text = typeof fact === 'string' ? fact : fact.fact;
    if (!text || existing.has(text)) continue;
    const id = fact.id || `F${String(db.facts.length + 1).padStart(3, '0')}`;
    db.facts.push({ id, fact: text, chapter, immutable: true });
    existing.add(text);
  }
  writeYaml(factsPath, db);
  return db;
}

export function appendTimeline(timelinePath, entry) {
  const tl = readYaml(timelinePath) || { meta: {}, days: [] };
  tl.days = tl.days || [];
  tl.days.push(entry);
  if (entry.day != null) tl.meta.current_day = entry.day;
  writeYaml(timelinePath, tl);
  return tl;
}

export function patchHooks(hooksPath, { add = [], update = [] }) {
  const db = readYaml(hooksPath) || { hooks: [] };
  const byId = new Map(db.hooks.map((h) => [h.id, h]));
  for (const h of update) {
    if (byId.has(h.id)) Object.assign(byId.get(h.id), h);
  }
  for (const h of add) {
    if (!byId.has(h.id)) {
      db.hooks.push(h);
      byId.set(h.id, h);
    }
  }
  writeYaml(hooksPath, db);
  return db;
}

export function patchRelationship(graphPath, edges) {
  const g = readYaml(graphPath) || { edges: [] };
  const key = (e) => `${e.from}→${e.to}`;
  const map = new Map(g.edges.map((e) => [key(e), e]));
  for (const e of edges) {
    const k = key(e);
    if (map.has(k)) Object.assign(map.get(k), e, { last_change: e.last_change ?? `ch_${e.chapter}` });
    else g.edges.push({ ...e, last_change: e.last_change ?? `ch_${e.chapter}` });
  }
  writeYaml(graphPath, g);
  return g;
}

export function patchKnowledge(matrixPath, rows) {
  const m = readYaml(matrixPath) || { characters: [], matrix: [] };
  const byInfo = new Map(m.matrix.map((r) => [r.info, r]));
  for (const row of rows) {
    if (byInfo.has(row.info)) Object.assign(byInfo.get(row.info), row);
    else m.matrix.push(row);
  }
  writeYaml(matrixPath, m);
  return m;
}

export function patchResources(resPath, delta) {
  const r = readYaml(resPath) || { meta: {}, resources: {}, by_character: {} };
  if (delta.meta) Object.assign(r.meta, delta.meta);
  if (delta.resources) Object.assign(r.resources, delta.resources);
  if (delta.by_character) {
    r.by_character = r.by_character || {};
    for (const [who, vals] of Object.entries(delta.by_character)) {
      r.by_character[who] = { ...(r.by_character[who] || {}), ...vals };
    }
  }
  writeYaml(resPath, r);
  return r;
}

export function patchNpcSim(npcPath, entries) {
  const n = readYaml(npcPath) || { meta: {}, npcs: [] };
  n.npcs.push(...entries);
  if (entries[0]?.day) n.meta.last_simulated_day = entries[0].day;
  writeYaml(npcPath, n);
  return n;
}

export function appendStateMachine(smPath, entry) {
  const sm = readYaml(smPath) || { current: {}, history: [] };
  sm.history.push(entry);
  sm.current = {
    situation: entry.new_situation ?? entry.situation,
    goal: null,
    conflict: null,
    decision: null,
    action: null,
    consequence: null,
    new_situation: null,
  };
  writeYaml(smPath, sm);
  return sm;
}
