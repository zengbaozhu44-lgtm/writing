/**
 * Module Service — Canon 读写 + Dynamic 只读
 * 薄包装 inkos-core，不实现业务逻辑
 */
import fs from 'node:fs';
import path from 'node:path';
import { getBookPaths } from '../../inkos-core/src/lib/book.js';
import { exists, readText, writeText, readJson } from '../../inkos-core/src/lib/paths.js';
import { readYaml } from '../../inkos-core/src/lib/yaml-store.js';
import { syncHashAfterCanonWrite } from './hash-dependency-bridge.js';
import {
  readVolumeMeta,
  writeVolumeMeta,
  computeUpstreamFingerprint,
} from './volume-plan.js';

const CANON_KEYS = new Set([
  'world_bible',
  'writing_bible',
  'character_bible',
  'faction_bible',
  'location_bible',
  'current_chapter',
  'volume_outline',
]);

const READONLY_KEYS = new Set([
  'relationship_graph',
  'knowledge_matrix',
  'state_board',
  'current_state',
  'timeline',
  'foreshadow_db',
  'facts_db',
  'resource_db',
  'npc_simulation',
  'state_machine',
]);

const KEY_ALIASES = {
  world: 'world_bible',
  writing: 'writing_bible',
  characters: 'character_bible',
  factions: 'faction_bible',
  organizations: 'faction_bible',
  locations: 'location_bible',
  'chapter-task': 'current_chapter',
  relationship: 'relationship_graph',
  knowledge: 'knowledge_matrix',
  state: 'current_state',
  'state-board': 'state_board',
  facts: 'facts_db',
  resource: 'resource_db',
  foreshadow: 'foreshadow_db',
  timeline: 'timeline',
  volume: 'volume_outline',
};

export function resolveModuleKey(key) {
  return KEY_ALIASES[key] || key;
}

function getModulePath(bookDir, key) {
  const resolved = resolveModuleKey(key);
  const bp = getBookPaths(bookDir);
  if (bp.version !== 4) throw new Error('仅支持 V4 书籍');
  const p = bp.modules[resolved];
  if (!p) throw new Error(`未知模块: ${key}`);
  return { resolved, path: p, bp };
}

export function listModules(bookDir) {
  const bp = getBookPaths(bookDir);
  if (bp.version !== 4) return { modules: [] };
  const modules = Object.entries(bp.modules).map(([key, p]) => ({
    key,
    alias: Object.entries(KEY_ALIASES).find(([, v]) => v === key)?.[0] || key,
    path: path.relative(bookDir, p),
    layer: CANON_KEYS.has(key) ? 'canon' : READONLY_KEYS.has(key) ? 'dynamic' : 'system',
    editable: CANON_KEYS.has(key),
    isDirectory: exists(p) && fs.statSync(p).isDirectory(),
    exists: exists(p),
  }));
  return { modules };
}

export function readModule(bookDir, key, fileName = null) {
  const { resolved, path: modulePath } = getModulePath(bookDir, key);

  if (fileName) {
    const filePath = path.join(modulePath, fileName);
    if (!exists(filePath)) throw new Error(`文件不存在: ${fileName}`);
    return {
      key: resolved,
      file: fileName,
      format: fileName.endsWith('.yaml') ? 'yaml' : 'markdown',
      content: readText(filePath),
      editable: CANON_KEYS.has(resolved),
    };
  }

  if (exists(modulePath) && fs.statSync(modulePath).isDirectory()) {
    const files = fs.readdirSync(modulePath)
      .filter((f) => !f.startsWith('_') && (f.endsWith('.md') || f.endsWith('.yaml')))
      .map((f) => {
        const fp = path.join(modulePath, f);
        return { name: f, id: f.replace(/\.(md|yaml)$/, ''), size: fs.statSync(fp).size };
      });
    return { key: resolved, format: 'directory', files, editable: CANON_KEYS.has(resolved) };
  }

  if (!exists(modulePath)) {
    return { key: resolved, format: 'markdown', content: '', editable: CANON_KEYS.has(resolved) };
  }

  const ext = path.extname(modulePath);
  if (ext === '.yaml' || ext === '.yml') {
    return {
      key: resolved,
      format: 'yaml',
      data: readYaml(modulePath),
      content: readText(modulePath),
      editable: CANON_KEYS.has(resolved),
    };
  }

  return {
    key: resolved,
    format: 'markdown',
    content: readText(modulePath),
    editable: CANON_KEYS.has(resolved),
  };
}

export function writeModule(bookDir, key, payload, fileName = null) {
  const { resolved, path: modulePath } = getModulePath(bookDir, key);

  if (!CANON_KEYS.has(resolved)) {
    throw new Error(`模块 ${resolved} 为 Runtime 管理，Studio 禁止直写`);
  }

  if (fileName) {
    if (!CANON_KEYS.has(resolved)) throw new Error('禁止写入');
    const filePath = path.join(modulePath, fileName.endsWith('.md') ? fileName : `${fileName}.md`);
    fs.mkdirSync(modulePath, { recursive: true });
    writeText(filePath, payload.content || '');
    syncHashAfterCanonWrite(bookDir, { triggerKey: resolved });
    if (resolved === 'volume_outline') {
      try {
        const volMatch = path.basename(filePath).match(/^vol_(\d+)\.md$/);
        const vol = volMatch ? Number(volMatch[1]) : 1;
        const prev = readVolumeMeta(bookDir, vol) || {};
        writeVolumeMeta(bookDir, vol, {
          volume: vol,
          upstreamFingerprint: prev.upstreamFingerprint || computeUpstreamFingerprint(bookDir),
          lastEditedAt: new Date().toISOString(),
          editedBy: 'user',
          generatedAt: prev.generatedAt || null,
        });
      } catch { /* meta optional */ }
    }
    return { key: resolved, file: path.basename(filePath), saved: true };
  }

  if (exists(modulePath) && fs.statSync(modulePath).isDirectory()) {
    throw new Error('目录模块需指定文件名');
  }

  fs.mkdirSync(path.dirname(modulePath), { recursive: true });
  writeText(modulePath, payload.content || '');
  syncHashAfterCanonWrite(bookDir, { triggerKey: resolved });
  return { key: resolved, saved: true };
}

export function deleteModuleFile(bookDir, key, fileName) {
  const { resolved, path: modulePath } = getModulePath(bookDir, key);
  if (!CANON_KEYS.has(resolved)) throw new Error('禁止删除 Runtime 模块');
  const filePath = path.join(modulePath, fileName);
  if (exists(filePath)) fs.unlinkSync(filePath);
  return { deleted: fileName };
}
