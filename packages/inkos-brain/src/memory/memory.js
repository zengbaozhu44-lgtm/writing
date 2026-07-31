/**
 * Brain Memory — Decision / Scene / Conflict 历史
 */
import fs from 'node:fs';
import path from 'node:path';
import { writeJson } from '../../../inkos-core/src/lib/paths.js';
import { writeYaml, readYaml } from '../../../inkos-core/src/lib/yaml-store.js';
import { brainSystemDir } from '../loader.js';

export function ensureBrainDir(bookDir) {
  const dir = brainSystemDir(bookDir);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function historyPath(bookDir, name) {
  return path.join(brainSystemDir(bookDir), name);
}

export function saveChapterPlan(bookDir, chapter, payload) {
  const dir = ensureBrainDir(bookDir);
  const file = path.join(dir, `ch_${String(chapter).padStart(4, '0')}_plan.json`);
  writeJson(file, payload);
  return file;
}

export function saveSceneArtifacts(bookDir, chapter, scenes) {
  const dir = ensureBrainDir(bookDir);
  const file = path.join(dir, `ch_${String(chapter).padStart(4, '0')}_scenes.json`);
  writeJson(file, { chapter, scenes, updatedAt: new Date().toISOString() });
  return file;
}

export function appendDecisionHistory(bookDir, chapter, decisionResult) {
  if (!decisionResult) return null;
  const p = historyPath(bookDir, 'decision_history.yaml');
  const db = readYaml(p) || { entries: [] };
  db.entries.push({
    chapter,
    at: new Date().toISOString(),
    pass: decisionResult.pass,
    decisions: (decisionResult.decisions || []).map((d) => ({
      sceneId: d.sceneId,
      pass: d.pass,
      failures: d.failures,
    })),
  });
  writeYaml(p, db);
  return p;
}

export function appendSceneHistory(bookDir, chapter, scenes) {
  const p = historyPath(bookDir, 'scene_history.yaml');
  const db = readYaml(p) || { entries: [] };
  db.entries.push({
    chapter,
    at: new Date().toISOString(),
    scenes: scenes.map((s) => ({
      id: s.id,
      title: s.title,
      wordCount: s.wordCount ?? s.text?.replace(/\s/g, '').length ?? 0,
      reviewPass: s.review?.pass ?? null,
    })),
  });
  writeYaml(p, db);
  return p;
}

export function appendConflictHistory(bookDir, chapter, conflictResult) {
  // Decision 连续失败时可能从未跑到 Conflict，conflictResult 为 null — 禁止读 null.pass
  if (!conflictResult) return null;
  const p = historyPath(bookDir, 'conflict_history.yaml');
  const db = readYaml(p) || { entries: [] };
  db.entries.push({
    chapter,
    at: new Date().toISOString(),
    pass: conflictResult.pass,
    types: conflictResult.types,
    primary: conflictResult.primary,
  });
  writeYaml(p, db);
  return p;
}

export function saveBrainRun(bookDir, chapter, run) {
  const dir = ensureBrainDir(bookDir);
  const file = path.join(dir, `ch_${String(chapter).padStart(4, '0')}_run.json`);
  writeJson(file, run);
  return file;
}
