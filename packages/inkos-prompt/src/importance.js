/**
 * Entity Importance — 预算不足时裁低重要性实体
 */
export function scoreEntityImportance(name, ctx, scene) {
  if (!name) return 0;
  if (name === ctx.pov) return 100;
  if ((scene.entities || []).includes(name)) return 95;
  if ((ctx.present || []).includes(name)) return 80;

  const corpus = `${scene.goal} ${scene.conflict} ${scene.title}`;
  if (corpus.includes(name)) return 70;

  const rel = (ctx.relationships || []).some((e) => e.from === name || e.to === name);
  if (rel) return 55;

  if (ctx.characters?.[name]) return 40;
  return 12;
}

export function rankEntities(entities, ctx, scene) {
  return [...entities]
    .map((name) => ({ name, importance: scoreEntityImportance(name, ctx, scene) }))
    .sort((a, b) => b.importance - a.importance);
}

export function trimEntitiesByImportance(entities, ctx, scene, maxCount) {
  const ranked = rankEntities(entities, ctx, scene);
  return ranked.slice(0, maxCount).map((e) => e.name);
}

export function importanceMap(entities, ctx, scene) {
  const map = {};
  for (const name of entities) {
    map[name] = scoreEntityImportance(name, ctx, scene);
  }
  return map;
}
