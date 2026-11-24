/**
 * G1-A — Character Identity Registry & Resolution（Gate 1 Human Seal · S-A）
 *
 * 冻结契约：
 * - 03_character_bible = 唯一 Character Identity Admission Authority（authored-only）
 * - CW Seed key = Reference（必须 resolve；UNRESOLVED → 不建块/不物化——S-A/S11）
 * - String equality ≠ Identity equality；无 cross-record equivalence 机制
 * - alias 仅在 Authority 载体内显式声明（`> identity-alias: a, b` 标记行）方有 resolution 权
 * - 同一 alias 命中多 Entity → alias_collision fail-closed，禁止猜测
 * - 本模块纯读：无任何创建/删除 Identity 的写路径（runtime 永不录取）
 * - character-only（Q8：Location/Faction 不进 runtime resolution）
 */

import fs from 'node:fs';
import path from 'node:path';

const ALIAS_MARKER_RE = /^>\s*identity-alias\s*[：:]\s*(.+)$/um;
const registryCache = new Map();

function characterBibleDir(bookDir) {
  return path.join(bookDir, 'novel', '03_character_bible');
}

/**
 * @returns {{
 *   canonicals: Map<string, {canonical: string, aliases: string[]}>,
 *   aliasOwners: Map<string, string[]>,
 * }}
 */
export function loadCharacterRegistry(bookDir) {
  if (registryCache.has(bookDir)) return registryCache.get(bookDir);
  const dir = characterBibleDir(bookDir);

  const canonicals = new Map();
  const aliasOwners = new Map();

  if (dir && fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.md') || f.startsWith('_')) continue;
      const canonical = f.replace(/\.md$/, '');
      const aliases = [];
      try {
        const text = fs.readFileSync(path.join(dir, f), 'utf8');
        for (const line of text.split('\n')) {
          const m = line.match(ALIAS_MARKER_RE);
          if (m) {
            for (const a of m[1].split(/[,，、]/)) {
              const alias = a.trim();
              if (alias && alias !== canonical) aliases.push(alias);
            }
          }
        }
      } catch { /* 读失败：该文件无别名，仅 canonical */ }
      canonicals.set(canonical, { canonical, aliases });
      for (const a of aliases) {
        aliasOwners.set(a, [...(aliasOwners.get(a) || []), canonical]);
      }
    }
  }

  const reg = { canonicals, aliasOwners };
  registryCache.set(bookDir, reg);
  return reg;
}

/** 测试辅助：清缓存（生产无写路径，不需要） */
export function __clearRegistryCacheForTests() {
  registryCache.clear();
}

/**
 * Resolution Status（Q3）：
 *   RESOLVED(CharacterRef) | UNRESOLVED(reason: not_in_registry | alias_collision | empty)
 * UNRESOLVED 是 status，不是 Entity——不得物化为任何主体。
 */
export function resolveCharacter(bookDir, surface) {
  const name = String(surface ?? '').trim();
  if (!name) return { status: 'UNRESOLVED', reason: 'empty' };
  const { canonicals, aliasOwners } = loadCharacterRegistry(bookDir);

  if (canonicals.has(name)) {
    return { status: 'RESOLVED', canonical: name, ref: `character:${name}`, via: 'canonical', source: 'character_bible' };
  }
  const owners = aliasOwners.get(name);
  if (owners && owners.length === 1) {
    return { status: 'RESOLVED', canonical: owners[0], ref: `character:${owners[0]}`, via: 'alias', source: 'character_bible' };
  }
  if (owners && owners.length > 1) {
    // S7 / Q1：碰撞 fail-closed，禁止猜测
    return { status: 'UNRESOLVED', reason: 'alias_collision', candidates: owners };
  }
  return { status: 'UNRESOLVED', reason: 'not_in_registry' };
}

/** 便捷：事件 role 串集合 → canonical 集合（resolution-aware participant 匹配用） */
export function resolveCanonicalSet(bookDir, names) {
  const out = new Set();
  for (const n of names || []) {
    const r = resolveCharacter(bookDir, n);
    if (r.status === 'RESOLVED') out.add(r.canonical);
  }
  return out;
}
