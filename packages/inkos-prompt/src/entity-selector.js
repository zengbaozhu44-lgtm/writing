/**
 * Entity-based Context Loading — 只加载 Scene 实际涉及的实体
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

export function filterKnowledge(ctx, entities) {
  const set = new Set(entities);
  return (ctx.knowledge?.matrix || []).filter((row) =>
    [...set].some((name) => row[name] != null),
  );
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
