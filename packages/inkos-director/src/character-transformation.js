/**
 * Character Transformation — 选择改变人物，不只是事件
 * 每个重要 Choice 须改变 ≥1 维度：Belief / Fear / Relationship / Identity / Goal / Value
 * 驱动 Writer P1，贯穿 Character Arc
 */

export const TRANSFORMATION_DIMENSIONS = [
  { id: 'belief', label: 'Belief（信念）' },
  { id: 'fear', label: 'Fear（恐惧）' },
  { id: 'relationship', label: 'Relationship（关系）' },
  { id: 'identity', label: 'Identity（身份）' },
  { id: 'goal', label: 'Goal（目标）' },
  { id: 'value', label: 'Value（价值观）' },
];

function norm(v = '') {
  return String(v || '').trim();
}

function inferChangedDimensions(plan = {}, desire = {}, situation = {}) {
  const dims = [];
  const choice = norm(plan.choice);
  const consequence = norm(plan.consequence);
  const info = norm(plan.newInformation);

  if (/相信|规则|系统|信任/u.test(desire.belief || '') && /欺骗|反抗|背叛|隐瞒|上报/u.test(choice + consequence)) {
    dims.push('belief');
  }
  if (/恐惧|害怕|失去/u.test(desire.fear || '') && /触发|直面|克服|再次/u.test(consequence + info)) {
    dims.push('fear');
  }
  if (situation.relationshipState?.before !== situation.relationshipState?.after
    || /信任|决裂|同盟|背叛|知情/u.test(`${info}${consequence}`)) {
    dims.push('relationship');
  }
  if (/身份|暴露|伪装|系统目标|被标记/u.test(`${info}${consequence}`)) {
    dims.push('identity');
  }
  if (/目标|方向|停止|改变计划/u.test(choice + consequence)) {
    dims.push('goal');
  }
  if (/值得|底线|牺牲|不再/u.test(choice + consequence)) {
    dims.push('value');
  }
  if (!dims.length) dims.push('belief', 'goal');
  return [...new Set(dims)].slice(0, 3);
}

/**
 * Scene 级角色转变 — Writer Choice Beat 须落地
 */
export function buildSceneCharacterTransformation({
  desire = {},
  plan = {},
  scene = {},
  situation = {},
  prevTransformation = null,
} = {}) {
  if (scene.characterTransformation?.before && scene.characterTransformation?.after) {
    return { ...scene.characterTransformation, valid: true };
  }

  const name = desire.name || 'POV';
  const beforeBelief = prevTransformation?.after?.belief
    || desire.belief
    || `${name}相信规则可以保护自己`;
  const choice = norm(plan.choice || scene.choice);
  const consequence = norm(plan.consequence || scene.consequence);

  let afterBelief = beforeBelief;
  if (/欺骗系统|反抗|上报|隐瞒/u.test(choice)) {
    afterBelief = `${name}开始主动反抗系统，不再只相信规则`;
  } else if (consequence) {
    afterBelief = `${name}对世界的信念被迫更新 — ${consequence.slice(0, 40)}`;
  }

  const before = {
    belief: beforeBelief,
    fear: desire.fear || '再次失去重要的人',
    relationship: situation.relationshipState?.before || '关系尚未被本 Scene 改写',
    identity: `${name}：守规矩的普通人`,
    goal: desire.externalGoal || plan.goal,
    value: desire.internalDesire || '证明自己值得被信任',
  };

  const after = {
    belief: afterBelief,
    fear: /再次|失去|暴露/u.test(consequence) ? desire.fear : before.fear,
    relationship: situation.relationshipState?.after || before.relationship,
    identity: /系统目标|被标记|知情者/u.test(consequence + plan.newInformation)
      ? `${name}不再是局外人 — 身份已改变`
      : before.identity,
    goal: plan.goal || desire.externalGoal,
    value: /牺牲|救|瞒/u.test(choice) ? `${name}把重要的人置于规则之上` : before.value,
  };

  const changedDimensions = inferChangedDimensions(plan, desire, situation);
  const writerMust = choice
    ? `Choice Beat 须写出人物变化：${before.belief?.slice(0, 25)} → ${after.belief?.slice(0, 25)}（不是只写事件）`
    : `本 Scene 须可见 ${name} 的内在变化，不只推进外部事件`;

  return {
    version: 'character-transformation-1',
    character: name,
    before,
    after,
    changedDimensions,
    choice,
    arcStage: desire.changeArc?.slice(0, 40) || '成长弧推进',
    writerMust,
    valid: changedDimensions.length >= 1 && before.belief !== after.belief,
    rule: 'Writer 写人物变化，不是只写事件变化',
  };
}

export function formatCharacterTransformationBlock(tx = {}) {
  if (!tx?.before) return '';

  const dims = (tx.changedDimensions || [])
    .map((id) => TRANSFORMATION_DIMENSIONS.find((d) => d.id === id)?.label || id)
    .join(' · ');

  return [
    '### Character Transformation · 人物成长（P1）',
    '**铁律**：Choice 须改变人物，不是只改变事件。',
    '',
    `- **Before · Belief**：${tx.before.belief?.slice(0, 55)}`,
    `- **Choice**：${tx.choice || '—'}`,
    `- **After · Belief**：${tx.after.belief?.slice(0, 55)}`,
    dims ? `- **改变维度**：${dims}` : '',
    tx.before.relationship !== tx.after.relationship
      ? `- **关系**：${tx.before.relationship?.slice(0, 30)} → ${tx.after.relationship?.slice(0, 30)}`
      : '',
    `- **成长弧**：${tx.arcStage}`,
    '',
    `- **Writer 必做**：${tx.writerMust}`,
    '- 禁止：事件发生了，人物内心毫无变化',
  ].filter(Boolean).join('\n');
}

export function formatCharacterTransformationBrief(tx = {}) {
  if (!tx?.after?.belief) return '';
  return `Character TX：${tx.before?.belief?.slice(0, 20)} → ${tx.after.belief?.slice(0, 25)}`;
}
