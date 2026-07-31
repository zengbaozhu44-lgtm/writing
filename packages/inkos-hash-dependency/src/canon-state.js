import fs from 'node:fs';
import path from 'node:path';

export function getHashDependencyRoot(bookDir) {
  return path.join(bookDir, 'novel', '_system', 'studio', 'hash-dependency');
}

export function getCanonStatePath(bookDir) {
  return path.join(getHashDependencyRoot(bookDir), 'canon_state.json');
}

export function loadCanonHashState(bookDir) {
  const file = getCanonStatePath(bookDir);
  if (!fs.existsSync(file)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return data.hashes || null;
  } catch {
    return null;
  }
}

export function saveCanonHashState(bookDir, hashes, meta = {}) {
  const root = getHashDependencyRoot(bookDir);
  fs.mkdirSync(root, { recursive: true });
  const payload = {
    hashes,
    updatedAt: new Date().toISOString(),
    ...meta,
  };
  fs.writeFileSync(getCanonStatePath(bookDir), JSON.stringify(payload, null, 2), 'utf8');
  return payload;
}

/** Studio Canon 写入 → 模块映射 */
export const CANON_TRIGGER_MODULES = {
  world_bible: ['world'],
  writing_bible: ['writing'],
  character_bible: ['character'],
  story_dna: ['storyDna'],
  style_dna: ['style'],
  current_chapter: ['world', 'storyDna'],
};

export function modulesForCanonKey(key) {
  return CANON_TRIGGER_MODULES[key] || [];
}
