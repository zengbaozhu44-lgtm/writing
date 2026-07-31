/**
 * Consistency Engine — 六维一致性校验
 */
export function checkConsistency(ctx, intent, chapterText = '', scene = null) {
  const text = scene?.text ?? chapterText;
  const scopeIntent = scene
    ? { ...intent, mainGoal: scene.goal, present: scene.entities || intent.present, scenes: [scene] }
    : intent;

  const checks = {
    character: checkCharacter(ctx, scopeIntent, text),
    timeline: checkTimeline(ctx, scopeIntent),
    world: checkWorld(ctx, text),
    knowledge: checkKnowledgeConsistency(ctx, text),
    relationship: checkRelationshipConsistency(ctx, scopeIntent),
    resource: checkResourceConsistency(ctx, scopeIntent),
    ability: checkAbilityConsistency(ctx, text),
  };

  const failures = Object.entries(checks).filter(([, v]) => !v.pass);
  return {
    pass: failures.length === 0,
    scope: scene ? `scene:${scene.id}` : 'chapter',
    checks,
    failures: failures.map(([k, v]) => ({ dimension: k, ...v })),
  };
}

function checkCharacter(ctx, intent, text) {
  const names = Object.keys(ctx.characters).filter(Boolean);
  if (!names.length) return { pass: true };
  const pov = intent.pov;
  if (pov && text && !text.includes(pov) && text.length > 200) {
    return { pass: false, reason: `正文未出现 POV 角色「${pov}」` };
  }
  return { pass: true };
}

function checkTimeline(ctx, intent) {
  const stateTime = ctx.state['时间'] || '';
  const last = ctx.timeline[ctx.timeline.length - 1];
  if (last && stateTime && last.day && stateTime.includes('Day')) {
    const m = stateTime.match(/Day\s*(\d+)/i);
    if (m && last.day > Number(m[1]) + 1) {
      return { pass: false, reason: `时间线 Day ${last.day} 与当前状态 ${stateTime} 可能冲突` };
    }
  }
  return { pass: true };
}

function checkWorld(ctx, text) {
  if (!text) return { pass: true };
  if (ctx.worldBible.includes('禁止') && /设定是|世界观|铁律是/.test(text)) {
    return { pass: false, reason: '正文出现直接解释设定' };
  }
  return { pass: true };
}

function checkKnowledgeConsistency(ctx, text) {
  if (!text) return { pass: true };
  const pov = ctx.pov;
  for (const row of ctx.knowledge.matrix || []) {
    if (row[pov] === 'unknown' && row.info && text.includes(row.info)) {
      return { pass: false, reason: `POV ${pov} 不应在正文中知晓「${row.info}」` };
    }
  }
  return { pass: true };
}

function checkRelationshipConsistency(ctx, intent) {
  for (const edge of ctx.relationships) {
    if (edge.hostility >= 5 && intent.present.includes(edge.to) && intent.bargain?.includes('信任')) {
      return { pass: false, reason: `${edge.from}↔${edge.to} 敌意过高却计划信任博弈` };
    }
  }
  return { pass: true };
}

function checkResourceConsistency(ctx, intent) {
  const res = ctx.resources.by_character?.[ctx.pov];
  if (!res) return { pass: true };
  if (res.cash === 0 && intent.mustGain?.includes('购买')) {
    return { pass: false, reason: '无资金却计划购买' };
  }
  return { pass: true };
}

function checkAbilityConsistency(ctx, text) {
  if (!text) return { pass: true };
  if (/全能|无敌|瞬间治愈/.test(text) && ctx.writingBible.includes('代价')) {
    return { pass: false, reason: '能力使用缺少代价描写' };
  }
  return { pass: true };
}
