/**
 * Cache Validator — Hash 变化时自动失效 Prompt Cache
 */
import fs from 'node:fs';
import path from 'node:path';
import { exists, readJson } from '../../inkos-core/src/lib/paths.js';
import { hashContent } from './hash.js';
import { promptCacheDir, ensureCacheDir } from './cache.js';

const MODULE_KEYS = ['world', 'writing', 'facts', 'relationship', 'resource', 'knowledge'];

export function computeModuleHashes(ctx, entities = []) {
  const hashes = {};

  hashes.writing = hashContent(ctx.writingBible || '');
  hashes.world = hashContent(ctx.worldBible || '');

  const factSig = (ctx.facts || []).map((f) => f.fact).join('|');
  hashes.facts = hashContent(factSig);

  const relSig = (ctx.relationships || []).map((e) => `${e.from}→${e.to}:${e.trust}:${e.hostility}`).join('|');
  hashes.relationship = hashContent(relSig);

  const resSig = JSON.stringify(ctx.resources?.by_character || {});
  hashes.resource = hashContent(resSig);

  const knowSig = JSON.stringify(ctx.knowledge?.matrix || []);
  hashes.knowledge = hashContent(knowSig);

  hashes.character = {};
  for (const name of entities) {
    const c = ctx.characters?.[name];
    if (c?.raw) hashes.character[name] = hashContent(c.raw);
  }

  for (const name of Object.keys(ctx.factions || {})) {
    hashes[`faction:${name}`] = hashContent(ctx.factions[name].raw || '');
  }

  return hashes;
}

function loadValidatorState(bookDir, chapter) {
  const file = path.join(promptCacheDir(bookDir, chapter), 'cache_validator.json');
  if (!exists(file)) return null;
  return readJson(file);
}

function saveValidatorState(bookDir, chapter, hashes) {
  const dir = promptCacheDir(bookDir, chapter);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'cache_validator.json'), JSON.stringify({ hashes, updatedAt: new Date().toISOString() }, null, 2));
}

export function invalidatePromptCache(bookDir, chapter, { promptsOnly = false } = {}) {
  const base = promptCacheDir(bookDir, chapter);
  const promptsDir = path.join(base, 'prompts');
  if (exists(promptsDir)) fs.rmSync(promptsDir, { recursive: true, force: true });
  if (!promptsOnly && exists(path.join(base, 'cache'))) {
    fs.rmSync(path.join(base, 'cache'), { recursive: true, force: true });
  }
}

export function validateCache(bookDir, chapter, ctx, entities) {
  const current = computeModuleHashes(ctx, entities);
  const prev = loadValidatorState(bookDir, chapter);
  const changed = [];

  if (prev?.hashes) {
    for (const key of MODULE_KEYS) {
      if (prev.hashes[key] && prev.hashes[key] !== current[key]) changed.push(key);
    }
    const prevChars = prev.hashes.character || {};
    for (const [name, hash] of Object.entries(current.character || {})) {
      if (prevChars[name] && prevChars[name] !== hash) changed.push(`character:${name}`);
    }
    for (const key of Object.keys(current)) {
      if (key.startsWith('faction:') && prev.hashes[key] && prev.hashes[key] !== current[key]) {
        changed.push(key);
      }
    }
  }

  if (changed.length) {
    invalidatePromptCache(bookDir, chapter);
  }

  ensureCacheDir(bookDir, chapter);
  saveValidatorState(bookDir, chapter, current);

  return { valid: changed.length === 0, changed, hashes: current };
}
