/**
 * Volume Plan — 第一卷规划 living document
 *
 * 卷纲正文：novel/10_volume_outline/vol_01.md
 * 元数据：novel/10_volume_outline/_vol_01_meta.json
 *   - upstreamFingerprint：生成时依赖的上游 contentHash
 *   - 手动编辑不覆盖 fingerprint（staleness 仍可检测）
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getBookPaths } from '../../inkos-core/src/lib/book.js';
import { exists, readText, writeText, readJson, writeJson } from '../../inkos-core/src/lib/paths.js';
import { readYaml, writeYaml } from '../../inkos-core/src/lib/yaml-store.js';
import { readStoryDna } from './system-store.js';
import { syncHashAfterCanonWrite } from './hash-dependency-bridge.js';

function sha16(text = '') {
  return crypto.createHash('sha256').update(String(text || ''), 'utf8').digest('hex').slice(0, 16);
}

function listDirMarkdown(dir) {
  if (!exists(dir) || !fs.statSync(dir).isDirectory()) return '';
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .sort()
    .map((f) => `${f}\n${readText(path.join(dir, f))}`)
    .join('\n---\n');
}

function conflictCalibrationPath(bookDir) {
  return path.join(bookDir, 'novel', '_system', 'conflict-calibration.yaml');
}

export function readConflictCalibration(bookDir) {
  const p = conflictCalibrationPath(bookDir);
  if (!exists(p)) return null;
  try {
    return readYaml(p);
  } catch {
    return null;
  }
}

export function saveConflictCalibration(bookDir, data = {}) {
  const dir = path.join(bookDir, 'novel', '_system');
  if (!exists(dir)) fs.mkdirSync(dir, { recursive: true });
  const payload = {
    core_conflict: String(data.core_conflict || '').trim(),
    stakes: String(data.stakes || '').trim(),
    escalation_phases: Array.isArray(data.escalation_phases)
      ? data.escalation_phases
      : [],
    updatedAt: new Date().toISOString(),
  };
  writeYaml(conflictCalibrationPath(bookDir), payload);
  return payload;
}

/** 从书籍目录计算上游四块指纹（含 conflict-calibration.yaml） */
export function computeUpstreamFingerprint(bookDir) {
  const bp = getBookPaths(bookDir);
  const world = exists(bp.modules.world_bible) ? readText(bp.modules.world_bible) : '';
  const characters = listDirMarkdown(bp.modules.character_bible);
  const factions = listDirMarkdown(bp.modules.faction_bible);
  const dna = readStoryDna(bookDir) || {};
  const calibration = readConflictCalibration(bookDir);
  const conflict = [
    calibration?.core_conflict || '',
    calibration?.stakes || '',
    JSON.stringify(calibration?.escalation_phases || []),
    // DNA 与 calibration 一并纳入，避免只改 DNA 时假健康
    dna.main_conflict || '',
    dna.core_hook || '',
    dna.main_question || '',
    dna.theme || '',
  ].join('\n');

  const parts = {
    world: sha16(world),
    characters: sha16(characters),
    factions: sha16(factions),
    conflict: sha16(conflict),
  };
  return {
    ...parts,
    combined: sha16(`${parts.world}|${parts.characters}|${parts.factions}|${parts.conflict}`),
  };
}

/** 向导内存态：从当前 content 计算指纹（建书前） */
export function fingerprintFromWizardContent({
  worldMarkdown = '',
  characters = [],
  factions = [],
  conflictBrief = '',
} = {}) {
  const chars = (characters || [])
    .map((c) => JSON.stringify(c.fields || c))
    .sort()
    .join('\n');
  const facs = (factions || [])
    .map((f) => String(f.markdown || JSON.stringify(f)))
    .sort()
    .join('\n');
  const parts = {
    world: sha16(worldMarkdown),
    characters: sha16(chars),
    factions: sha16(facs),
    conflict: sha16(conflictBrief),
  };
  return {
    ...parts,
    combined: sha16(`${parts.world}|${parts.characters}|${parts.factions}|${parts.conflict}`),
  };
}

export function buildVolumeUpstreamContext({
  worldMarkdown = '',
  characters = [],
  factions = [],
  conflictBrief = '',
  openingHook = '',
  coreMystery = '',
  chapterTones = [],
  volumeChapterCount = 30,
} = {}) {
  const charLines = (characters || []).slice(0, 12).map((c) => {
    const f = c.fields || c;
    return `- ${f.name || '未命名'}｜${f.role || f.identity || ''}｜目标：${f.goal || ''}｜秘密：${String(f.secret || '').slice(0, 40)}`;
  });
  const facLines = (factions || []).slice(0, 12).map((f) => {
    const name = f.name || f.fields?.name || '势力';
    const md = String(f.markdown || '').split('\n').slice(0, 4).join(' ');
    return `- ${name}：${md.slice(0, 120)}`;
  });
  const toneLines = (chapterTones || []).map((t) =>
    `- 第${t.chapterIndex}章 · ${t.tone}｜${t.coreEvent}｜结尾：${t.endingDirection}`,
  );

  return [
    `预估章数：${volumeChapterCount || 30}`,
    openingHook ? `开篇钩子：${openingHook}` : '',
    coreMystery ? `长线悬念：${coreMystery}` : '',
    conflictBrief ? `冲突校准：\n${conflictBrief}` : '',
    charLines.length ? `主要角色：\n${charLines.join('\n')}` : '',
    facLines.length ? `势力组织：\n${facLines.join('\n')}` : '',
    toneLines.length ? `前三章基调：\n${toneLines.join('\n')}` : '',
    worldMarkdown ? `世界构建摘要：\n${String(worldMarkdown).slice(0, 2500)}` : '',
  ].filter(Boolean).join('\n\n');
}

function metaPath(bookDir, vol = 1) {
  const bp = getBookPaths(bookDir);
  const n = String(vol).padStart(2, '0');
  return path.join(bp.modules.volume_outline, `_vol_${n}_meta.json`);
}

function outlinePath(bookDir, vol = 1) {
  const bp = getBookPaths(bookDir);
  const n = String(vol).padStart(2, '0');
  return path.join(bp.modules.volume_outline, `vol_${n}.md`);
}

export function readVolumeMeta(bookDir, vol = 1) {
  const p = metaPath(bookDir, vol);
  if (!exists(p)) return null;
  try {
    return readJson(p);
  } catch {
    return null;
  }
}

export function writeVolumeMeta(bookDir, vol, meta) {
  const bp = getBookPaths(bookDir);
  fs.mkdirSync(bp.modules.volume_outline, { recursive: true });
  writeJson(metaPath(bookDir, vol), meta);
}

/**
 * 读取卷纲 + staleness
 */
export function getVolumePlan(bookDir, vol = 1) {
  const file = outlinePath(bookDir, vol);
  const markdown = exists(file) ? readText(file) : '';
  const meta = readVolumeMeta(bookDir, vol) || {};
  const current = computeUpstreamFingerprint(bookDir);
  let stored = meta.upstreamFingerprint || null;

  // 旧书无 meta：首次读取时绑定当前指纹，便于后续检测上游变更
  if (markdown.trim() && !stored?.combined) {
    bindVolumeFingerprint(bookDir, vol, {
      fingerprint: current,
      editedBy: 'migrate',
    });
    stored = current;
  }

  const isStale = Boolean(
    markdown.trim()
    && stored?.combined
    && stored.combined !== current.combined,
  );
  const changedParts = [];
  if (isStale && stored) {
    for (const k of ['world', 'characters', 'factions', 'conflict']) {
      if (stored[k] && stored[k] !== current[k]) changedParts.push(k);
    }
  }

  return {
    volume: vol,
    file: path.basename(file),
    markdown,
    editable: true,
    isStale,
    changedParts,
    upstreamFingerprint: stored,
    currentFingerprint: current,
    lastEditedAt: meta.lastEditedAt || null,
    editedBy: meta.editedBy || null,
    generatedAt: meta.generatedAt || null,
  };
}

/**
 * 保存卷纲
 * @param {{ refreshFingerprint?: boolean, editedBy?: string }} opts
 *   refreshFingerprint=true → 重新生成后对齐最新上游
 *   refreshFingerprint=false（默认）→ 手动编辑，保留原 fingerprint
 */
export function saveVolumePlan(bookDir, {
  markdown = '',
  vol = 1,
  refreshFingerprint = false,
  editedBy = 'user',
} = {}) {
  const text = String(markdown || '');
  if (!text.trim()) throw new Error('卷纲正文不能为空');
  if (text.length > 80000) throw new Error('卷纲过长（上限 80k）');

  const bp = getBookPaths(bookDir);
  fs.mkdirSync(bp.modules.volume_outline, { recursive: true });
  writeText(outlinePath(bookDir, vol), text);
  syncHashAfterCanonWrite(bookDir, { triggerKey: 'volume_outline' });

  const prev = readVolumeMeta(bookDir, vol) || {};
  const now = new Date().toISOString();
  const fingerprint = refreshFingerprint
    ? computeUpstreamFingerprint(bookDir)
    : (prev.upstreamFingerprint || computeUpstreamFingerprint(bookDir));

  const meta = {
    volume: vol,
    upstreamFingerprint: fingerprint,
    lastEditedAt: now,
    editedBy: refreshFingerprint ? (editedBy || 'ai') : (editedBy || 'user'),
    generatedAt: refreshFingerprint ? now : (prev.generatedAt || null),
  };
  writeVolumeMeta(bookDir, vol, meta);

  return getVolumePlan(bookDir, vol);
}

/** 建书时写入指纹（生成落盘后调用） */
export function bindVolumeFingerprint(bookDir, vol = 1, {
  fingerprint = null,
  editedBy = 'wizard',
} = {}) {
  const now = new Date().toISOString();
  writeVolumeMeta(bookDir, vol, {
    volume: vol,
    upstreamFingerprint: fingerprint || computeUpstreamFingerprint(bookDir),
    lastEditedAt: now,
    editedBy,
    generatedAt: now,
  });
}

export const VOLUME_PART_LABELS = {
  world: '世界构建',
  characters: '主要角色',
  factions: '势力组织',
  conflict: '冲突校准',
};
