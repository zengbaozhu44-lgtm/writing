/**
 * Studio System Store — novel/_system/*.yaml 读写
 * Story DNA / World Simulation / Style DNA / Character Brain / Living Novel V3.7
 */
import fs from 'node:fs';
import path from 'node:path';
import { getBookPaths } from '../../inkos-core/src/lib/book.js';
import { exists } from '../../inkos-core/src/lib/paths.js';
import { readYaml, writeYaml } from '../../inkos-core/src/lib/yaml-store.js';
import { syncHashAfterCanonWrite } from './hash-dependency-bridge.js';

const SYSTEM_FILES = new Set([
  'story_dna',
  'world_simulation',
  'style_dna',
  'world_state',
  'studio_config',
]);

function systemDir(bookDir) {
  const bp = getBookPaths(bookDir);
  if (bp.version !== 4) throw new Error('仅支持 V4 书籍');
  return path.join(bookDir, 'novel', '_system');
}

function ensureDir(dir) {
  if (!exists(dir)) fs.mkdirSync(dir, { recursive: true });
}

function systemPath(bookDir, name) {
  if (!SYSTEM_FILES.has(name)) throw new Error(`未知系统文件: ${name}`);
  return path.join(systemDir(bookDir), `${name}.yaml`);
}

function chapterPlansDir(bookDir) {
  const dir = path.join(systemDir(bookDir), 'chapter_plans');
  ensureDir(dir);
  return dir;
}

function editorFeedbackDir(bookDir) {
  const dir = path.join(systemDir(bookDir), 'editor_feedback');
  ensureDir(dir);
  return dir;
}

function characterBrainDir(bookDir) {
  const dir = path.join(systemDir(bookDir), 'character_brains');
  ensureDir(dir);
  return dir;
}

function padChapter(n) {
  return String(n).padStart(4, '0');
}

export function readSystemFile(bookDir, name) {
  const p = systemPath(bookDir, name);
  if (!exists(p)) return null;
  return readYaml(p);
}

export function writeSystemFile(bookDir, name, data) {
  ensureDir(systemDir(bookDir));
  writeYaml(systemPath(bookDir, name), data);
  if (name === 'story_dna' || name === 'style_dna') {
    syncHashAfterCanonWrite(bookDir, { triggerKey: name });
  }
  return data;
}

export function readWorldState(bookDir) {
  return readSystemFile(bookDir, 'world_state');
}

export function writeWorldState(bookDir, data) {
  return writeSystemFile(bookDir, 'world_state', data);
}

export function readChapterPlan(bookDir, chapter) {
  const dir = chapterPlansDir(bookDir);
  const n = padChapter(chapter);
  const candidates = [
    path.join(dir, `chapter_${n}.yaml`),
    path.join(dir, `ch_${n}.yaml`),
  ];
  for (const p of candidates) {
    if (exists(p)) return readYaml(p);
  }
  return null;
}

export function writeChapterPlan(bookDir, chapter, data) {
  const p = path.join(chapterPlansDir(bookDir), `chapter_${padChapter(chapter)}.yaml`);
  writeYaml(p, { ...data, chapter, updatedAt: new Date().toISOString() });
  return readChapterPlan(bookDir, chapter);
}

export function listChapterPlans(bookDir) {
  const dir = chapterPlansDir(bookDir);
  if (!exists(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => (f.startsWith('chapter_') || f.startsWith('ch_')) && f.endsWith('.yaml'))
    .map((f) => {
      const m = f.match(/(?:chapter_|ch_)(\d+)\.yaml/);
      return m ? Number(m[1]) : 0;
    })
    .filter(Boolean)
    .sort((a, b) => a - b);
}

export function readEditorFeedback(bookDir, chapter) {
  const dir = editorFeedbackDir(bookDir);
  const n = padChapter(chapter);
  const candidates = [
    path.join(dir, `chapter_${n}.yaml`),
    path.join(dir, `chapter_${chapter}.yaml`),
  ];
  for (const p of candidates) {
    if (exists(p)) return readYaml(p);
  }
  return null;
}

export function writeEditorFeedback(bookDir, chapter, data) {
  const p = path.join(editorFeedbackDir(bookDir), `chapter_${padChapter(chapter)}.yaml`);
  writeYaml(p, { ...data, chapter, updatedAt: new Date().toISOString() });
  return readEditorFeedback(bookDir, chapter);
}

export function readCharacterBrain(bookDir, charName) {
  const safe = String(charName).replace(/[^\w\u4e00-\u9fff_-]/g, '_');
  const p = path.join(characterBrainDir(bookDir), `${safe}.yaml`);
  if (!exists(p)) return null;
  return readYaml(p);
}

export function writeCharacterBrain(bookDir, charName, data) {
  const safe = String(charName).replace(/[^\w\u4e00-\u9fff_-]/g, '_');
  const p = path.join(characterBrainDir(bookDir), `${safe}.yaml`);
  writeYaml(p, { ...data, character: charName, updatedAt: new Date().toISOString() });
  return readCharacterBrain(bookDir, charName);
}

export function listCharacterBrains(bookDir) {
  const dir = path.join(systemDir(bookDir), 'character_brains');
  if (!exists(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => f.replace(/\.yaml$/, ''));
}

export function readStoryDna(bookDir) {
  return readSystemFile(bookDir, 'story_dna');
}

export function writeStoryDna(bookDir, dna) {
  return writeSystemFile(bookDir, 'story_dna', { ...dna, updatedAt: new Date().toISOString() });
}

/** 初始化 V3.7 目录结构 */
export function ensureLivingNovelDirs(bookDir) {
  ensureDir(systemDir(bookDir));
  chapterPlansDir(bookDir);
  editorFeedbackDir(bookDir);
  characterBrainDir(bookDir);
}
