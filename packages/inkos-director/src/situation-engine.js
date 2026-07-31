/**
 * Situation Engine v2 — 三维状态变化
 * 世界 + 人物 + 关系 — 每 Scene 须至少改变其中两个维度
 */
import { STATE_CHANGE_DIMENSIONS } from './beat-state.js';

const STAGNANT_PATTERN = /继续调查|发现异常|调查异常|寻找线索|继续寻找|再次确认|又发现|更多信息/u;

export const SITUATION_DIMENSIONS = STATE_CHANGE_DIMENSIONS;

export const SITUATION_AXES = ['world', 'character', 'relationship'];

function norm(v = '') {
  return String(v || '').trim();
}

/**
 * 从 Scene Plan 推断三维状态（局势陈述，不是事件描述）
 */
export function buildSceneSituation({
  scene = {},
  intent = {},
  plan = {},
  prevSceneClosingState = null,
  characterDesire = null,
  characterPush = null,
} = {}) {
  if (scene.situation?.worldState?.before && scene.situation?.worldState?.after) {
    return normalizeSituationV2(scene.situation);
  }

  const pov = intent.pov || 'POV';
  const keyRelation = resolveKeyRelationship(intent, plan, scene);

  const worldBefore = scene.openingWorldState
    || plan.openingWorldState
    || prevSceneClosingState
    || inferWorldBefore(pov, plan, scene);

  const worldAfter = scene.closingWorldState
    || plan.closingWorldState
    || inferWorldAfter(pov, plan, scene, worldBefore);

  const charBefore = characterPush?.before
    || scene.characterStateBefore
    || `${pov}${characterDesire?.belief ? `相信${characterDesire.belief.slice(0, 25)}` : '认为局面尚可控制'}`;

  const charAfter = characterPush?.after
    || scene.characterStateAfter
    || inferCharacterAfter(pov, plan, scene, charBefore, characterDesire);

  const relBefore = scene.relationshipStateBefore
    || plan.relationshipStateBefore
    || inferRelationshipBefore(pov, keyRelation, plan);

  const relAfter = scene.relationshipStateAfter
    || plan.relationshipStateAfter
    || inferRelationshipAfter(pov, keyRelation, plan, scene, relBefore);

  const worldState = { before: worldBefore, after: worldAfter };
  const characterState = { before: charBefore, after: charAfter };
  const relationshipState = { before: relBefore, after: relAfter };

  const changedDimensions = detectChangedDimensions(worldState, characterState, relationshipState);
  const stagnant = isStagnantSituationV2(worldState, characterState, relationshipState, plan);
  const dimensionsChanged = changedDimensions.length;

  return {
    version: 'situation-v2',
    worldState,
    characterState,
    relationshipState,
    openingWorldState: worldBefore,
    closingWorldState: worldAfter,
    changedDimensions,
    dimensionsChanged,
    changedDimension: changedDimensions[0] || 'world',
    stateDelta: summarizeStateDeltaV2(worldState, characterState, relationshipState),
    stagnant,
    valid: !stagnant && dimensionsChanged >= 2,
    pov,
    keyRelationship: keyRelation,
  };
}

function resolveKeyRelationship(intent = {}, plan = {}, scene = {}) {
  return norm(scene.keyCharacter
    || plan.keyCharacter
    || intent.keyCharacter
    || intent.supportingCharacter
    || '重要关系人');
}

function inferWorldBefore(pov, plan = {}, scene = {}) {
  const goal = plan.goal || scene.goal || '';
  if (/认为|以为|相信|正常|安全|还不知道|尚未/u.test(goal)) {
    return goal.includes(pov) ? goal : `${pov}${goal.startsWith('认为') ? '' : '认为'}${goal.replace(/^.*认为/, '认为') || '局面尚可控制'}`;
  }
  if (goal) return `${pov}当前目标：${goal.slice(0, 40)} — 局势尚未被本 Scene 改写`;
  return `${pov}进入本 Scene 时，对世界/局势的认知尚未被本章事件改写`;
}

function inferWorldAfter(pov, plan = {}, scene = {}, opening = '') {
  const info = plan.newInformation || scene.newInformation || '';
  const consequence = plan.consequence || scene.consequence || '';
  const cliff = plan.cliffhanger || scene.cliffhanger || '';

  if (info && !STAGNANT_PATTERN.test(info)) {
    const stmt = info.includes(pov) ? info : `${pov}已掌握：${info.slice(0, 60)}`;
    if (consequence && !STAGNANT_PATTERN.test(consequence)) {
      return `${stmt}；局面代价：${consequence.slice(0, 50)}`;
    }
    return stmt;
  }
  if (consequence && !STAGNANT_PATTERN.test(consequence)) {
    return `${pov}的处境已改变 — ${consequence.slice(0, 60)}`;
  }
  if (cliff) return `${pov}的世界状态已变 — ${cliff.slice(0, 60)}（与开局不同）`;
  return `${opening} → 本 Scene 结束后，世界认知/危险/资源须与开局不同`;
}

function inferCharacterAfter(pov, plan = {}, scene = {}, before = '', desire = null) {
  const consequence = plan.consequence || scene.consequence || '';
  const choice = plan.choice || scene.choice || '';
  if (consequence) return `${pov}内心/立场变化 — ${consequence.slice(0, 55)}`;
  if (choice) return `${pov}做出选择后无法回头 — ${choice.slice(0, 50)}`;
  if (desire?.internalDesire) {
    return `${pov}对「${desire.internalDesire.slice(0, 20)}」的认知被迫更新`;
  }
  return `${before} → ${pov}在本 Scene 须可见成长或受挫`;
}

function inferRelationshipBefore(pov, keyRelation, plan = {}) {
  const obstacle = plan.obstacle || '';
  if (/同事|普通|陌生|不信任|疏远/u.test(obstacle + (plan.goal || ''))) {
    return `${keyRelation}只是普通同事/关系疏远`;
  }
  return `${pov}与${keyRelation}的关系尚未被本 Scene 事件改写`;
}

function inferRelationshipAfter(pov, keyRelation, plan = {}, scene = {}, before = '') {
  const info = plan.newInformation || scene.newInformation || '';
  const cliff = plan.cliffhanger || scene.cliffhanger || '';
  if (/信任|同盟|背叛|知情|秘密|决裂|依赖/u.test(`${info}${cliff}${plan.consequence || ''}`)) {
    return `${pov}与${keyRelation}的关系已改变 — ${(info || cliff || plan.consequence || '').slice(0, 45)}`;
  }
  if (info && !STAGNANT_PATTERN.test(info)) {
    return `${keyRelation}成为关键变量 — ${info.slice(0, 40)}`;
  }
  return `${before} → ${pov}与${keyRelation}的关系须与本 Scene 前不同`;
}

function axisChanged(before = '', after = '') {
  const b = norm(before).replace(/\s/g, '').slice(0, 28);
  const a = norm(after).replace(/\s/g, '').slice(0, 28);
  return b !== a && !STAGNANT_PATTERN.test(`${before}${after}`) || (b !== a && b.length > 4);
}

function detectChangedDimensions(worldState, characterState, relationshipState) {
  const changed = [];
  if (axisChanged(worldState.before, worldState.after)) changed.push('world');
  if (axisChanged(characterState.before, characterState.after)) changed.push('character');
  if (axisChanged(relationshipState.before, relationshipState.after)) changed.push('relationship');
  return changed;
}

function summarizeStateDeltaV2(worldState, characterState, relationshipState) {
  const parts = [];
  if (axisChanged(worldState.before, worldState.after)) {
    parts.push(`世界：「${worldState.before.slice(0, 25)}」→「${worldState.after.slice(0, 25)}」`);
  }
  if (axisChanged(characterState.before, characterState.after)) {
    parts.push(`人物：「${characterState.before.slice(0, 25)}」→「${characterState.after.slice(0, 25)}」`);
  }
  if (axisChanged(relationshipState.before, relationshipState.after)) {
    parts.push(`关系：「${relationshipState.before.slice(0, 25)}」→「${relationshipState.after.slice(0, 25)}」`);
  }
  if (!parts.length) return '⚠ 三维状态均未变化 — 本 Scene 无效';
  return parts.join(' · ');
}

function isStagnantSituationV2(worldState, characterState, relationshipState, plan = {}) {
  const corpus = `${worldState.before}${worldState.after}${plan.goal || ''}${plan.newInformation || ''}`;
  if (STAGNANT_PATTERN.test(corpus) && worldState.before.slice(0, 20) === worldState.after.slice(0, 20)) {
    return true;
  }
  const dims = detectChangedDimensions(worldState, characterState, relationshipState);
  return dims.length < 2;
}

function normalizeSituationV2(s = {}) {
  const worldState = s.worldState || {
    before: s.openingWorldState || '',
    after: s.closingWorldState || '',
  };
  const characterState = s.characterState || { before: '', after: '' };
  const relationshipState = s.relationshipState || { before: '', after: '' };
  const changedDimensions = s.changedDimensions
    || detectChangedDimensions(worldState, characterState, relationshipState);
  const stagnant = isStagnantSituationV2(worldState, characterState, relationshipState);

  return {
    version: 'situation-v2',
    worldState,
    characterState,
    relationshipState,
    openingWorldState: worldState.before,
    closingWorldState: worldState.after,
    changedDimensions,
    dimensionsChanged: changedDimensions.length,
    changedDimension: changedDimensions[0] || s.changedDimension || 'world',
    stateDelta: s.stateDelta || summarizeStateDeltaV2(worldState, characterState, relationshipState),
    stagnant,
    valid: !stagnant && changedDimensions.length >= 2,
    pov: s.pov,
    keyRelationship: s.keyRelationship,
  };
}

export function buildSituationBeatChain(situation = {}, beatPlans = []) {
  if (!beatPlans?.length) return beatPlans;

  const opening = situation.worldState?.before || situation.openingWorldState || '';
  const closing = situation.worldState?.after || situation.closingWorldState || '';
  if (!opening) return beatPlans;

  const n = beatPlans.length;
  return beatPlans.map((bp, i) => {
    const t = n <= 1 ? 1 : i / (n - 1);
    let afterState = bp.afterState;
    if (i === 0) {
      return { ...bp, beforeState: opening, afterState };
    }
    if (i === n - 1) {
      afterState = closing;
    } else if (t >= 0.5) {
      afterState = `局势向终局推进 — ${closing?.slice(0, 45) || bp.afterState}`;
    }
    return {
      ...bp,
      beforeState: beatPlans[i - 1]?.afterState || opening,
      afterState,
      stateChange: bp.beforeState !== afterState,
    };
  });
}

export function formatSituationBlock(situation = {}) {
  const ws = situation.worldState || { before: situation.openingWorldState, after: situation.closingWorldState };
  const cs = situation.characterState || {};
  const rs = situation.relationshipState || {};
  if (!ws.before) return '';

  return [
    '### Situation Engine v2 · 三维状态变化（P1）',
    '**完成标准**：至少改变 **两个维度**（世界 / 人物 / 关系）',
    '',
    `- **世界**：${ws.before} → ${ws.after}`,
    cs.before ? `- **人物**：${cs.before} → ${cs.after}` : '',
    rs.before ? `- **关系**：${rs.before} → ${rs.after}` : '',
    `- **变化摘要**：${situation.stateDelta || '—'}`,
    situation.changedDimensions?.length
      ? `- **已变维度**：${situation.changedDimensions.join('、')}（${situation.dimensionsChanged}/3）`
      : '',
    '',
    '**禁止无效 Scene**：',
    '- ❌ 只有世界观推进，主角/关系原地踏步',
    '- ✅ 世界+人物+关系至少两项改变',
    situation.stagnant || (situation.dimensionsChanged ?? 0) < 2
      ? '- ⚠️ **Director 警告**：当前规划维度不足，Writer 须补足人物/关系变化'
      : '',
  ].filter(Boolean).join('\n');
}

export function formatSituationBrief(situation = {}) {
  const ws = situation.worldState || { before: situation.openingWorldState, after: situation.closingWorldState };
  if (!ws.before) return '';
  const cs = situation.characterState || {};
  const rs = situation.relationshipState || {};
  return [
    '### Situation v2 · 三维状态',
    `- **世界**：${ws.before} → ${ws.after}`,
    cs.before ? `- **人物**：${cs.before} → ${cs.after}` : null,
    rs.before ? `- **关系**：${rs.before} → ${rs.after}` : null,
    `- **铁律**：至少 2 个维度须变化`,
  ].filter(Boolean).join('\n');
}

export function detectStagnantWriting(text = '', situation = {}) {
  const t = String(text || '');
  const repetitive = STAGNANT_PATTERN.test(t)
    && (t.match(STAGNANT_PATTERN) || []).length >= 2;
  const ws = situation.worldState || {
    before: situation.openingWorldState,
    after: situation.closingWorldState,
  };
  const noShift = ws.before && ws.after && ws.before === ws.after;
  const lowDims = (situation.dimensionsChanged ?? (situation.changedDimensions?.length || 0)) < 2;

  return {
    stagnant: repetitive || noShift || lowDims,
    repetitiveInvestigation: repetitive,
    worldStateUnchanged: noShift,
    dimensionsInsufficient: lowDims,
  };
}
