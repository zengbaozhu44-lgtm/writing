/**
 * Entity-based Context Loading — Prompt Compiler 用
 *
 * 职责（≠ runtime/memory/entity-selector）：
 * - 从已加载的 ctx（characters/knowledge/relationships）按 Scene 选实体
 * - 过滤 knowledge / relationships 供 Writer Context
 *
 * Runtime 侧 entity-selector 负责从磁盘加载 03_character_bible；
 * 本模块不做磁盘 I/O，不新增第三套 selector。
 */
export function selectEntities(ctx, scene) {
  const entities = new Set([
    ctx.pov,
    ...ctx.present,
    ...(scene.entities || []),
  ].filter(Boolean));

  const factionHits = detectFactions(ctx, scene, entities);
  return { entities: [...entities], factions: factionHits };
}

function detectFactions(ctx, scene, entities) {
  const corpus = `${scene.goal} ${scene.conflict} ${ctx.stateBoard} ${[...entities].join(' ')}`;
  return Object.keys(ctx.factions || {}).filter((name) => corpus.includes(name));
}

export function filterRelationships(ctx, entities) {
  const set = new Set(entities);
  return (ctx.relationships || []).filter((e) => set.has(e.from) || set.has(e.to));
}

/**
 * Rows that mention any active entity (structural filter).
 * Does NOT apply Information Boundary — use filterKnowledgeForPrompt for Writer.
 */
export function filterKnowledge(ctx, entities) {
  const set = new Set(entities);
  return (ctx.knowledge?.matrix || []).filter((row) =>
    [...set].some((name) => row[name] != null),
  );
}

function normalizeAwareLevel(level) {
  const s = String(level || '').trim().toLowerCase();
  if (s === 'known') return 'know';
  if (s === 'know' || s === 'partial') return s;
  return null;
}

/**
 * F4: Writer-facing knowledge filter.
 * - Only rows involving active entities
 * - POV unknown / missing → row.info must NOT enter Prompt (Information Asymmetry)
 * - know | partial → allowed
 * Does not invent false / guess unknown.
 */
export function filterKnowledgeForPrompt(ctx, entities, { pov } = {}) {
  const set = new Set((entities || []).filter(Boolean));
  const povName = pov || ctx.pov || '';
  const rows = filterKnowledge(ctx, [...set]);
  if (!povName) return rows;
  return rows.filter((row) => Boolean(normalizeAwareLevel(row[povName])));
}

/**
 * Scene-relevant character card for Writer — whitelist only (F4.1 fail-closed).
 * Never reads character.raw (no scrub fallback).
 * @returns {{ text: string, fallbackUsed: boolean, mode: 'whitelist'|'minimal_identity' }}
 */
export function formatCharacterCardForPrompt(character, name) {
  if (!character) {
    return {
      text: '',
      fallbackUsed: false,
      mode: 'minimal_identity',
    };
  }
  const lines = [`### 人物：${name}`];
  const fields = [
    ['identity', '身份'],
    ['publicGoal', '公开目标'],
    ['personality', '性格'],
    ['voice', '对白风格'],
    ['catchphrase', '口头禅'],
    ['values', '价值观'],
    ['bottomLine', '底线'],
  ];
  let filled = 0;
  for (const [key, label] of fields) {
    const val = String(character[key] || '').trim();
    if (!val) continue;
    lines.push(`- **${label}**：${val}`);
    filled += 1;
  }
  let fallbackUsed = false;
  let mode = 'whitelist';
  if (filled === 0) {
    // F4.1: Whitelist > Scrub — never restore raw; minimal safe identity only
    fallbackUsed = true;
    mode = 'minimal_identity';
    lines.push('- **身份**：未标注（仅 Scene 在场名；无结构化公开字段）');
  }
  lines.push('- （省略：秘密 / 真实目标 / 成长方向 / raw bible — 非 Writer 公开卡）');
  return { text: lines.join('\n'), fallbackUsed, mode };
}

/**
 * @deprecated F4.1 — raw scrub is not used on Writer path (Whitelist > Scrub).
 * Kept only for diagnostic/legacy callers; do not re-wire into formatCharacterCardForPrompt.
 */
export function scrubOmniscientFromRaw(raw = '') {
  return String(raw || '')
    .split('\n')
    .filter((line) => !/\*\*(秘密|真实目标|成长方向)\*\*/u.test(line))
    .filter((line) => !/secret_future_fact/i.test(line))
    .join('\n')
    .trim();
}

export function filterCharacters(ctx, entities) {
  const out = {};
  const names = [];
  for (const name of entities) {
    if (ctx.characters?.[name]) {
      out[name] = ctx.characters[name];
      names.push(name);
    }
  }
  console.log('[entity] loaded characters:', names.length, names.join(',') || '(none)');
  if (ctx.bookDir) {
    console.log('[entity] bookDir=', ctx.bookDir);
  }
  return out;
}

export function filterFactions(ctx, factionNames) {
  const out = {};
  for (const name of factionNames) {
    if (ctx.factions?.[name]) out[name] = ctx.factions[name];
  }
  return out;
}
