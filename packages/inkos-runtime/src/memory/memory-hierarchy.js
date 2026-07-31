/**
 * Memory Hierarchy — L1 forever / L2 5章 / L3 20章关键Scene / L4 实体日志
 * 每 5 章自动压缩旧章节
 */
import fs from 'node:fs';
import path from 'node:path';
import { writeJson, readJson, exists } from '../../../inkos-core/src/lib/paths.js';
import { brainSystemDir } from '../../../inkos-brain/src/loader.js';

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

export const MEMORY_LAYERS = Object.freeze({
  L1: { id: 'L1', label: 'forever', retainChapters: Infinity },
  L2: { id: 'L2', label: 'rolling-5', retainChapters: 5 },
  L3: { id: 'L3', label: 'key-scenes-20', retainChapters: 20 },
  L4: { id: 'L4', label: 'entity-log', retainChapters: Infinity },
});

export function hierarchyPath(bookDir) {
  return path.join(brainSystemDir(bookDir), 'memory_hierarchy.json');
}

export function loadMemoryHierarchy(bookDir) {
  const file = hierarchyPath(bookDir);
  if (!exists(file)) {
    return {
      version: 'memory-hierarchy-1',
      L1: { anchors: [], voiceDna: null, coreFacts: [] },
      L2: { chapters: [] },
      L3: { keyScenes: [] },
      L4: { entities: {} },
      compressions: [],
      updatedAt: null,
    };
  }
  return readJson(file);
}

export function saveMemoryHierarchy(bookDir, data) {
  ensureDir(brainSystemDir(bookDir));
  const file = hierarchyPath(bookDir);
  writeJson(file, { ...data, updatedAt: new Date().toISOString() });
  return file;
}

/**
 * 章 commit 后更新分层记忆；每 5 章触发压缩
 */
export function updateMemoryHierarchy(bookDir, chapter, {
  anchor = null,
  chapterText = '',
  scenes = [],
  metrics = null,
  narrativeMomentum = null,
} = {}) {
  const ch = Number(chapter) || 1;
  const data = loadMemoryHierarchy(bookDir);

  // L1 forever：最新 voiceDna + 核心禁令摘要
  if (anchor?.voiceDna) data.L1.voiceDna = anchor.voiceDna;
  if (anchor) {
    data.L1.anchors = [
      ...(data.L1.anchors || []).filter((a) => a.chapter !== ch),
      {
        chapter: ch,
        pov: anchor.pov,
        location: anchor.location,
        current_date: anchor.current_date,
        closing_emotion: narrativeMomentum?.closing_emotion || anchor.narrative_momentum?.closing_emotion,
      },
    ].slice(-40);
    const bans = (anchor.banned_elements || [])
      .map((b) => (typeof b === 'string' ? b : b.text))
      .filter(Boolean)
      .slice(0, 6);
    if (bans.length) {
      data.L1.coreFacts = [...new Set([...(data.L1.coreFacts || []), ...bans])].slice(-30);
    }
  }

  // L2：近 5 章摘要
  const summary = summarizeChapter(chapterText, scenes, metrics);
  data.L2.chapters = [
    ...(data.L2.chapters || []).filter((c) => c.chapter !== ch),
    { chapter: ch, summary, chars: summary.chars, at: new Date().toISOString() },
  ]
    .sort((a, b) => a.chapter - b.chapter)
    .slice(-MEMORY_LAYERS.L2.retainChapters);

  // L3：关键 Scene（高张力 / 有 hook / 字数峰值）
  const keyScenes = extractKeyScenes(ch, scenes, chapterText);
  data.L3.keyScenes = [
    ...(data.L3.keyScenes || []).filter((s) => s.chapter !== ch),
    ...keyScenes,
  ]
    .sort((a, b) => a.chapter - b.chapter || a.sceneIndex - b.sceneIndex)
    .slice(-MEMORY_LAYERS.L3.retainChapters);

  // L4：实体日志
  const entities = extractEntities(anchor, scenes);
  for (const [name, entry] of Object.entries(entities)) {
    data.L4.entities[name] = {
      ...(data.L4.entities[name] || {}),
      ...entry,
      lastChapter: ch,
      seen: [...new Set([...(data.L4.entities[name]?.seen || []), ch])].slice(-40),
    };
  }

  let compression = null;
  if (ch % 5 === 0) {
    compression = compressOldChapters(bookDir, data, ch);
    data.compressions = [...(data.compressions || []), compression].slice(-20);
  }

  const file = saveMemoryHierarchy(bookDir, data);
  return { file, data, compression };
}

function summarizeChapter(text = '', scenes = [], metrics = null) {
  const chars = String(text || '').replace(/\s/g, '').length;
  const head = String(text || '').replace(/\s+/g, ' ').slice(0, 120);
  const tail = String(text || '').replace(/\s+/g, ' ').slice(-80);
  return {
    chars,
    sceneCount: scenes.length,
    head,
    tail,
    hookScore: metrics?.hookScore ?? metrics?.readingDrive ?? null,
  };
}

function extractKeyScenes(chapter, scenes = [], chapterText = '') {
  if (!scenes.length && chapterText) {
    return [{
      chapter,
      sceneIndex: 1,
      reason: 'chapter-aggregate',
      goal: '',
      excerpt: String(chapterText).replace(/\s+/g, ' ').slice(0, 160),
    }];
  }
  return scenes
    .map((s) => {
      const text = String(s.text || '');
      const chars = text.replace(/\s/g, '').length;
      const hasHook = /[？?]|倒计时|必须|来不及|系统/u.test(text.slice(-200));
      const score = chars + (hasHook ? 400 : 0) + (s.executionPlan?.hookOutput ? 200 : 0);
      return {
        chapter,
        sceneIndex: s.index || 1,
        reason: hasHook ? 'hook-tail' : (chars > 600 ? 'long-scene' : 'scene'),
        goal: s.goal || '',
        excerpt: text.replace(/\s+/g, ' ').slice(0, 160),
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(({ score, ...rest }) => rest);
}

function extractEntities(anchor = null, scenes = []) {
  const out = {};
  const pov = anchor?.pov;
  if (pov) out[pov] = { role: 'pov', status: 'active' };
  for (const edge of anchor?.relationship_state?.edges || []) {
    if (edge.to) {
      out[edge.to] = {
        role: 'relation',
        status: edge.status || 'unknown',
        tension: edge.tension || null,
      };
    }
  }
  for (const s of scenes) {
    for (const name of s.entities || []) {
      if (!name) continue;
      out[name] = out[name] || { role: 'present', status: 'seen' };
    }
  }
  return out;
}

/**
 * 压缩：把超出 L2 窗口的章摘要折叠进 L1.coreFacts（短句），并清理过旧 L3
 */
export function compressOldChapters(bookDir, data, currentChapter) {
  const ch = Number(currentChapter) || 1;
  const keepFrom = ch - MEMORY_LAYERS.L2.retainChapters + 1;
  const beforeL2 = (data.L2?.chapters || []).length;
  const archived = (data.L2?.chapters || []).filter((c) => c.chapter < keepFrom);

  for (const c of archived) {
    const line = `Ch${c.chapter}:${(c.summary?.tail || c.summary?.head || '').slice(0, 40)}`;
    if (line.length > 6) {
      data.L1.coreFacts = [...new Set([...(data.L1.coreFacts || []), line])].slice(-40);
    }
  }

  data.L2.chapters = (data.L2?.chapters || []).filter((c) => c.chapter >= keepFrom);
  const l3KeepFrom = ch - MEMORY_LAYERS.L3.retainChapters + 1;
  const beforeL3 = (data.L3?.keyScenes || []).length;
  data.L3.keyScenes = (data.L3?.keyScenes || []).filter((s) => s.chapter >= l3KeepFrom);

  // 可选：把超旧 chapter state 标记为 compressed（不删正文）
  const statesDir = path.join(bookDir, 'states');
  const marked = [];
  if (exists(statesDir)) {
    for (const name of fs.readdirSync(statesDir)) {
      const m = name.match(/^ch_(\d+)\.json$/);
      if (!m) continue;
      const n = Number(m[1]);
      if (n < keepFrom && n > 0) {
        try {
          const file = path.join(statesDir, name);
          const blob = readJson(file);
          if (!blob.compressed) {
            blob.compressed = true;
            blob.compressedAt = new Date().toISOString();
            blob.compressedByChapter = ch;
            writeJson(file, blob);
            marked.push(name);
          }
        } catch { /* ignore */ }
      }
    }
  }

  return {
    atChapter: ch,
    archivedL2: archived.map((c) => c.chapter),
    beforeL2,
    afterL2: data.L2.chapters.length,
    beforeL3,
    afterL3: data.L3.keyScenes.length,
    markedStates: marked,
    at: new Date().toISOString(),
  };
}

/** 供 Planner / Prompt 读取的压缩上下文 */
export function formatHierarchyContext(bookDir, chapter = null) {
  const data = loadMemoryHierarchy(bookDir);
  const lines = ['### Memory Hierarchy'];
  if (data.L1?.voiceDna?.label) {
    lines.push(`- L1 Voice：${data.L1.voiceDna.label}`);
  }
  if (data.L1?.coreFacts?.length) {
    lines.push(`- L1 核心：${data.L1.coreFacts.slice(-5).join('；')}`);
  }
  const l2 = (data.L2?.chapters || []).slice(-3);
  for (const c of l2) {
    lines.push(`- L2 Ch${c.chapter}：${(c.summary?.tail || '').slice(0, 60)}`);
  }
  const l3 = (data.L3?.keyScenes || []).filter((s) => !chapter || s.chapter < chapter).slice(-3);
  for (const s of l3) {
    lines.push(`- L3 关键 S${s.sceneIndex}@Ch${s.chapter}：${(s.excerpt || s.goal || '').slice(0, 50)}`);
  }
  return lines.join('\n');
}

export default {
  MEMORY_LAYERS,
  loadMemoryHierarchy,
  saveMemoryHierarchy,
  updateMemoryHierarchy,
  compressOldChapters,
  formatHierarchyContext,
  hierarchyPath,
};
