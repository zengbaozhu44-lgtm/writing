/**
 * Git Memory — Snapshot / Diff / Rollback / Branch
 * MemoryUnit.commit 的底层快照实现；rollbackToChapter 保证全量还原
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { exists, readJson, writeJson } from '../../../inkos-core/src/lib/paths.js';
import { brainSystemDir } from '../loader.js';
import { getBookPaths } from '../../../inkos-core/src/lib/book.js';

const TRACKED = [
  'metrics_dashboard.json',
  'adaptive_state.json',
  'critic_history.json',
  'manifest.json',
];

const NOVEL_TRACKED = [
  '08_current_state.md',
  '09_current_chapter.md',
  '07_state_board.md',
  '11_timeline.yaml',
  '13_facts_db.yaml',
  '12_foreshadow_db.yaml',
  '14_resource_db.yaml',
];

const SYSTEM_TRACKED = [
  'world_state.yaml',
  'story_dna.yaml',
];

export function gitMemoryDir(bookDir) {
  return path.join(brainSystemDir(bookDir), 'git');
}

export function ensureGitMemory(bookDir) {
  const dir = gitMemoryDir(bookDir);
  fs.mkdirSync(path.join(dir, 'snapshots'), { recursive: true });
  if (!exists(path.join(dir, 'refs.json'))) {
    writeJson(path.join(dir, 'refs.json'), { head: null, branches: { main: null }, tags: {} });
  }
  return dir;
}

function copyFileTracked(src, dest, files, key) {
  if (!exists(src) || !fs.statSync(src).isFile()) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  files[key] = hashFile(src);
}

export function createSnapshot(bookDir, meta = {}) {
  ensureGitMemory(bookDir);
  const brain = brainSystemDir(bookDir);
  const id = `snap_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const snapDir = path.join(gitMemoryDir(bookDir), 'snapshots', id);
  fs.mkdirSync(snapDir, { recursive: true });

  const files = {};
  for (const name of TRACKED) {
    copyFileTracked(path.join(brain, name), path.join(snapDir, name), files, name);
  }

  // system root manifests live under novel/_system
  const systemRoot = path.join(bookDir, 'novel', '_system');
  for (const name of SYSTEM_TRACKED) {
    copyFileTracked(
      path.join(systemRoot, name),
      path.join(snapDir, `system_${name}`),
      files,
      `system_${name}`,
    );
  }
  // top-level novel manifest
  copyFileTracked(
    path.join(systemRoot, 'manifest.json'),
    path.join(snapDir, 'system_manifest.json'),
    files,
    'system_manifest.json',
  );

  try {
    const bp = getBookPaths(bookDir);
    if (bp.version === 4) {
      for (const name of NOVEL_TRACKED) {
        const rel = Object.entries(bp.modules).find(([, v]) => v.endsWith(name))?.[1];
        const src = rel || path.join(bookDir, 'novel', name);
        copyFileTracked(src, path.join(snapDir, `novel_${name}`), files, `novel_${name}`);
      }
    }
  } catch {
    // V4 paths optional
  }

  const chPrefix = meta.chapter != null ? `ch_${String(meta.chapter).padStart(4, '0')}` : null;
  if (chPrefix) {
    for (const f of fs.readdirSync(brain).filter((x) => x.startsWith(chPrefix))) {
      const src = path.join(brain, f);
      if (fs.statSync(src).isFile()) {
        copyFileTracked(src, path.join(snapDir, f), files, f);
      }
    }

    // chapters/*.md
    const chaptersDir = path.join(bookDir, 'chapters');
    if (exists(chaptersDir)) {
      for (const name of fs.readdirSync(chaptersDir)) {
        if (name.startsWith(`${String(meta.chapter).padStart(4, '0')}_`) && name.endsWith('.md')) {
          copyFileTracked(
            path.join(chaptersDir, name),
            path.join(snapDir, 'chapters', name),
            files,
            `chapters/${name}`,
          );
        }
      }
    }

    // states/ch_XXXX.json
    const stateFile = path.join(bookDir, 'states', `${chPrefix}.json`);
    copyFileTracked(stateFile, path.join(snapDir, 'states', `${chPrefix}.json`), files, `states/${chPrefix}.json`);
  }

  const refs = readJson(path.join(gitMemoryDir(bookDir), 'refs.json'));
  const snapshot = {
    id,
    parent: refs.head,
    branch: meta.branch || 'main',
    chapter: meta.chapter ?? null,
    label: meta.label || `chapter ${meta.chapter ?? 'init'}`,
    files,
    createdAt: new Date().toISOString(),
    meta,
  };

  writeJson(path.join(snapDir, 'manifest.json'), snapshot);
  refs.head = id;
  refs.branches[snapshot.branch] = id;
  if (meta.chapter != null) {
    refs.tags = refs.tags || {};
    refs.tags[`chapter-${meta.chapter}`] = id;
  }
  writeJson(path.join(gitMemoryDir(bookDir), 'refs.json'), refs);

  return snapshot;
}

export function diffSnapshots(bookDir, fromId, toId) {
  const from = loadSnapshotManifest(bookDir, fromId);
  const to = loadSnapshotManifest(bookDir, toId);
  if (!from || !to) throw new Error('Snapshot 不存在');

  const allKeys = new Set([...Object.keys(from.files || {}), ...Object.keys(to.files || {})]);
  const changes = [];
  for (const key of allKeys) {
    const a = from.files?.[key];
    const b = to.files?.[key];
    if (a === b) continue;
    changes.push({ file: key, from: a ?? null, to: b ?? null, status: !a ? 'added' : !b ? 'removed' : 'modified' });
  }
  return { from: fromId, to: toId, changes };
}

function restorePath(bookDir, snapName, snapDir) {
  const src = path.join(snapDir, snapName);
  if (!exists(src) || !fs.statSync(src).isFile()) return null;

  if (snapName.startsWith('chapters/') || snapName.includes(`${path.sep}chapters${path.sep}`)) {
    const base = path.basename(snapName);
    const dest = path.join(bookDir, 'chapters', base);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    return { src, dest };
  }
  if (snapName.startsWith('states/') || snapName.includes(`${path.sep}states${path.sep}`)) {
    const base = path.basename(snapName);
    const dest = path.join(bookDir, 'states', base);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    return { src, dest };
  }
  if (snapName.startsWith('novel_')) {
    return { src, dest: restoreNovelFile(bookDir, snapName) };
  }
  if (snapName.startsWith('system_')) {
    const name = snapName.replace(/^system_/, '');
    return { src, dest: path.join(bookDir, 'novel', '_system', name) };
  }
  return { src, dest: path.join(brainSystemDir(bookDir), snapName) };
}

export function rollback(bookDir, snapshotId) {
  const manifest = loadSnapshotManifest(bookDir, snapshotId);
  if (!manifest) throw new Error(`Snapshot ${snapshotId} 不存在`);

  const snapDir = path.join(gitMemoryDir(bookDir), 'snapshots', snapshotId);
  const brain = brainSystemDir(bookDir);
  fs.mkdirSync(brain, { recursive: true });

  const restored = [];
  for (const name of Object.keys(manifest.files || {})) {
    const mapped = restorePath(bookDir, name, snapDir);
    if (!mapped?.dest) continue;
    let src = path.join(snapDir, name);
    if (!exists(src)) {
      src = path.join(snapDir, ...name.split('/'));
    }
    if (!exists(src)) continue;
    fs.mkdirSync(path.dirname(mapped.dest), { recursive: true });
    fs.copyFileSync(src, mapped.dest);
    restored.push(mapped.dest);
  }

  for (const sub of ['chapters', 'states']) {
    const d = path.join(snapDir, sub);
    if (!exists(d)) continue;
    for (const f of fs.readdirSync(d)) {
      const dest = path.join(bookDir, sub, f);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(path.join(d, f), dest);
      restored.push(dest);
    }
  }

  // 清除回退点之后的章文件，防止设定污染
  const purged = purgeAfterChapter(bookDir, manifest.chapter);

  const refs = readJson(path.join(gitMemoryDir(bookDir), 'refs.json'));
  refs.head = snapshotId;
  writeJson(path.join(gitMemoryDir(bookDir), 'refs.json'), refs);

  return {
    rolledBackTo: snapshotId,
    chapter: manifest.chapter,
    label: manifest.label,
    restoredCount: restored.length,
    purged,
  };
}

/** 删除 chapter 之后的 chapters/*.md 与 states/ch_*.json */
function purgeAfterChapter(bookDir, chapter) {
  if (chapter == null) return { chapters: [], states: [] };
  const purged = { chapters: [], states: [] };
  const chDir = path.join(bookDir, 'chapters');
  if (exists(chDir)) {
    for (const name of fs.readdirSync(chDir)) {
      const m = name.match(/^(\d+)_.*\.md$/);
      if (!m) continue;
      const n = Number(m[1]);
      if (n > chapter) {
        fs.unlinkSync(path.join(chDir, name));
        purged.chapters.push(name);
      }
    }
  }
  const stDir = path.join(bookDir, 'states');
  if (exists(stDir)) {
    for (const name of fs.readdirSync(stDir)) {
      const m = name.match(/^ch_(\d+)\.json$/);
      if (!m) continue;
      const n = Number(m[1]);
      if (n > chapter) {
        fs.unlinkSync(path.join(stDir, name));
        purged.states.push(name);
      }
    }
  }
  return purged;
}

/**
 * 回退到指定章：找该章 tag/snapshot；不存在则找 ≤ chapter 的最近快照
 * 崩溃自愈路径（recoverFailedChapter / Daemon）依赖此函数还原干净态
 */
export function rollbackToChapter(bookDir, chapterId) {
  const chapter = Number(chapterId);
  ensureGitMemory(bookDir);
  const refs = readJson(path.join(gitMemoryDir(bookDir), 'refs.json'));
  const tagId = refs.tags?.[`chapter-${chapter}`];
  if (tagId) {
    return { ...rollback(bookDir, tagId), mode: 'tag', chapter };
  }

  const snaps = listSnapshots(bookDir)
    .filter((s) => s.chapter != null && s.chapter <= chapter)
    .sort((a, b) => b.chapter - a.chapter || new Date(b.createdAt) - new Date(a.createdAt));

  if (!snaps.length) {
    throw new Error(`rollbackToChapter: 找不到第 ${chapter} 章及之前的 Snapshot`);
  }

  return { ...rollback(bookDir, snaps[0].id), mode: 'nearest', chapter: snaps[0].chapter, requested: chapter };
}

export function createBranch(bookDir, branchName, fromSnapshotId = null) {
  ensureGitMemory(bookDir);
  const refs = readJson(path.join(gitMemoryDir(bookDir), 'refs.json'));
  const base = fromSnapshotId || refs.head;
  if (!base) throw new Error('无可用 snapshot 创建分支');
  refs.branches[branchName] = base;
  writeJson(path.join(gitMemoryDir(bookDir), 'refs.json'), refs);
  return { branch: branchName, at: base };
}

export function checkoutBranch(bookDir, branchName) {
  const refs = readJson(path.join(gitMemoryDir(bookDir), 'refs.json'));
  const snap = refs.branches[branchName];
  if (!snap) throw new Error(`分支 ${branchName} 不存在`);
  return rollback(bookDir, snap);
}

export function listSnapshots(bookDir) {
  const dir = path.join(gitMemoryDir(bookDir), 'snapshots');
  if (!exists(dir)) return [];
  return fs.readdirSync(dir)
    .map((id) => loadSnapshotManifest(bookDir, id))
    .filter(Boolean)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function loadSnapshotManifest(bookDir, id) {
  const f = path.join(gitMemoryDir(bookDir), 'snapshots', id, 'manifest.json');
  if (!exists(f)) return null;
  return readJson(f);
}

function hashFile(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex').slice(0, 16);
}

function restoreNovelFile(bookDir, snapName) {
  const novelName = snapName.replace(/^novel_/, '');
  try {
    const bp = getBookPaths(bookDir);
    const rel = Object.entries(bp.modules).find(([, v]) => v.endsWith(novelName))?.[1];
    return rel || path.join(bookDir, 'novel', novelName);
  } catch {
    return path.join(bookDir, 'novel', novelName);
  }
}
