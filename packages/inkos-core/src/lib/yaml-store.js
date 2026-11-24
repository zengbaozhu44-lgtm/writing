import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { exists, readJson, readText } from './paths.js';

export function readYaml(filePath) {
  if (!exists(filePath)) return null;
  try {
    return YAML.parse(readText(filePath));
  } catch {
    // 并发写入半截 YAML → 返回 null，调用方回退空结构
    return null;
  }
}

export function writeYaml(filePath, data) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  try {
    fs.writeFileSync(tmp, YAML.stringify(data, { lineWidth: 0 }), 'utf8');
    fs.renameSync(tmp, filePath);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
    throw err;
  }
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

