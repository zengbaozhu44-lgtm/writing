import { hashContent } from './hash.js';

export const MODULE_KEYS = [
  'world',
  'character',
  'facts',
  'timeline',
  'relationship',
  'knowledge',
  'resources',
  'style',
  'writing',
  'storyDna',
];

/**
 * 计算各 Canon 模块 Hash（Hash Dependency，非 Entity）
 */
export function extractModuleTexts(ctx = {}, extras = {}) {
  const pov = ctx.pov || '';
  const present = ctx.present || [];
  const names = [...new Set([pov, ...present].filter(Boolean))];

  const characterParts = names
    .map((n) => ctx.characters?.[n]?.raw || '')
    .filter(Boolean)
    .join('\n---\n');

  const timelineSig = (ctx.timeline || [])
    .map((d) => `d${d.day}:ch${d.chapter}:${(d.events || []).join(';')}`)
    .join('|');

  return {
    world: ctx.worldBible || '',
    character: characterParts || names.join(','),
    facts: (ctx.facts || []).map((f) => f.fact || f).join('|'),
    timeline: timelineSig,
    relationship: (ctx.relationships || []).map((e) => `${e.from}→${e.to}:${e.trust}:${e.hostility}`).join('|'),
    knowledge: JSON.stringify(ctx.knowledge?.matrix || []),
    resources: JSON.stringify(ctx.resources?.by_character || ctx.resources || {}),
    style: extras.styleDna ? JSON.stringify(extras.styleDna) : '',
    writing: ctx.writingBible || '',
    storyDna: extras.storyDna ? JSON.stringify(extras.storyDna) : '',
  };
}

export function computeModuleHashes(ctx = {}, extras = {}) {
  const texts = extractModuleTexts(ctx, extras);
  const hashes = {};
  for (const [key, text] of Object.entries(texts)) {
    hashes[key] = hashContent(text);
  }
  return hashes;
}
