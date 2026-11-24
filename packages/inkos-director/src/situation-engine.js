/**
 * Situation Engine v2 — 三维状态变化
 * 世界 + 人物 + 关系 — 每 Scene 须至少改变其中两个维度
 *
 * EO-P4: inferWorldAfter / inferred relationship axes = Writer instruction or
 * inference_candidate only — ≠ world fact / obtains / Reality Authority.
 *
 * @see golden/reality/d1-implementation-contract/INFERENCE-DEMOTION.md
 */
import { STATE_CHANGE_DIMENSIONS } from './beat-state.js';
import { stampInferenceCandidate } from '../../inkos-core/src/lib/inference-demotion.js';

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
  void characterDesire; // R5-A：desire 不得冒充 Situation 人物 After
  if (scene.situation?.worldState?.before && scene.situation?.worldState?.after) {
    const normalized = normalizeSituationV2(scene.situation);
    return {
      ...normalized,
      d1InferenceDemotion: stampInferenceCandidate({
        paths: ['authored_or_prebuilt_situation'],
        worldAfterRole: 'carrier_demoted_not_obtains',
      }),
    };
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

  // S8.2-R5-A：人物 before/after 仅 authored；Choice ≠ Character Transformation
  const charState = resolveAuthoredCharacterState({ scene, plan, characterPush });
  const charBefore = charState.before;
  const charAfter = charState.after;

  const relBefore = scene.relationshipStateBefore
    || plan.relationshipStateBefore
    || inferRelationshipBefore(pov, keyRelation, plan);

  const relAfter = scene.relationshipStateAfter
    || plan.relationshipStateAfter
    || inferRelationshipAfter(pov, keyRelation, plan, scene, relBefore);

  const worldState = { before: worldBefore, after: worldAfter };
  const characterState = {
    before: charBefore,
    after: charAfter,
    missing: charState.missing,
  };
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
    characterTransformationMissing: Boolean(charState.missing),
    // EO-P4: demote inference ≠ fact (does not remove Writer instruction carrier)
    d1InferenceDemotion: stampInferenceCandidate({
      paths: ['inferWorldAfter', 'inferRelationship*', 'plan.consequence→worldState.after'],
      worldAfterRole: 'inference_candidate_or_writer_instruction',
    }),
  };
}

function resolveAuthoredCharacterState({ scene = {}, plan = {}, characterPush = null } = {}) {
  const tx = scene.characterTransformation;
  if (tx && !tx.missing && tx.before && tx.after) {
    const before = typeof tx.before === 'string'
      ? norm(tx.before)
      : norm(tx.before.belief || tx.before.identity || Object.values(tx.before).find(Boolean) || '');
    const after = typeof tx.after === 'string'
      ? norm(tx.after)
      : norm(tx.after.belief || tx.after.identity || Object.values(tx.after).find(Boolean) || '');
    if (before && after) return { before, after, missing: false };
  }
  const before = norm(scene.characterStateBefore || plan.characterStateBefore || scene.situation?.characterState?.before);
  const after = norm(scene.characterStateAfter || plan.characterStateAfter || scene.situation?.characterState?.after);
  if (before && after) return { before, after, missing: false };
  // 仅透传已标记为 authored 的 push；禁止用 push 的推断成长
  if (characterPush?.authoredChange && norm(characterPush.before) && norm(characterPush.after)) {
    return { before: norm(characterPush.before), after: norm(characterPush.after), missing: false };
  }
  return { before: '', after: '', missing: true };
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
    return goal.includes(pov) ? goal : `${pov}${goal.startsWith('认为') ? '' : '认为'}${goal.replace(/^.*认为/, '认为') || '进入现场'}`;
  }
  if (goal) return `${pov}当前目标：${goal.slice(0, 40)} — 局势尚未被本 Scene 改写`;
  return `${pov}进入本 Scene 时，对世界/局势的认知尚未被本章事件改写`;
}

function inferWorldAfter(pov, plan = {}, scene = {}, opening = '') {
  // EO-P4: output is inference_candidate / Writer instruction — not obtains / world fact.
  const info = plan.newInformation || scene.newInformation || '';
  const consequence = plan.consequence || scene.consequence || '';
  const cliff = plan.cliffhanger || scene.cliffhanger || '';

  if (info && !STAGNANT_PATTERN.test(info)) {
    const stmt = info.includes(pov) ? info : `${pov}已掌握：${info.slice(0, 60)}`;
    if (consequence && !STAGNANT_PATTERN.test(consequence)) {
      return `${stmt}；局面声明结果：${consequence.slice(0, 50)}`;
    }
    return stmt;
  }
  if (consequence && !STAGNANT_PATTERN.test(consequence)) {
    return `${pov}的处境已改变 — ${consequence.slice(0, 60)}`;
  }
  if (cliff) return `${pov}的世界状态已变 — ${cliff.slice(0, 60)}（与开局不同）`;
  return `${opening} → 本 Scene 结束后，世界认知/危险/资源须与开局不同`;
}

/** @deprecated S8.2-R5-A：不再从 choice/consequence 推断人物 After；保留空实现防外部引用 */
function inferCharacterAfter() {
  return '';
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
  // missing 人物轴：不计入「已变」，也不用空串假变化
  if (!characterState?.missing && axisChanged(characterState.before, characterState.after)) {
    changed.push('character');
  }
  if (axisChanged(relationshipState.before, relationshipState.after)) changed.push('relationship');
  return changed;
}

function summarizeStateDeltaV2(worldState, characterState, relationshipState) {
  const parts = [];
  if (axisChanged(worldState.before, worldState.after)) {
    parts.push(`世界：「${worldState.before.slice(0, 25)}」→「${worldState.after.slice(0, 25)}」`);
  }
  if (!characterState?.missing && axisChanged(characterState.before, characterState.after)) {
    parts.push(`人物：「${characterState.before.slice(0, 25)}」→「${characterState.after.slice(0, 25)}」`);
  } else if (characterState?.missing) {
    parts.push('人物：character transformation missing（Choice ≠ Character Transformation）');
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
  const rawCs = s.characterState || { before: '', after: '' };
  const charMissing = Boolean(rawCs.missing)
    || (!norm(rawCs.before) && !norm(rawCs.after));
  const characterState = {
    before: charMissing ? '' : norm(rawCs.before),
    after: charMissing ? '' : norm(rawCs.after),
    missing: charMissing,
  };
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
    characterTransformationMissing: charMissing,
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

  const characterLine = cs.missing || situation.characterTransformationMissing || (!cs.before && !cs.after)
    ? '- **人物**：character transformation: missing（Choice ≠ Character Transformation；勿预写人物 After）'
    : (cs.before ? `- **人物**：${cs.before} → ${cs.after}` : '');

  return [
    '### Situation Engine v2 · 三维状态变化（P1）',
    '**完成标准**：世界/关系可推进；人物变化仅在有 authored transformation 时陈述',
    '',
    `- **世界**：${ws.before} → ${ws.after}`,
    characterLine,
    rs.before ? `- **关系**：${rs.before} → ${rs.after}` : '',
    `- **变化摘要**：${situation.stateDelta || '—'}`,
    situation.changedDimensions?.length
      ? `- **已变维度**：${situation.changedDimensions.join('、')}（${situation.dimensionsChanged}/3）`
      : '',
    '',
    '**禁止**：无证据时编造人物成长 / 信念变化 / 不可逆人物结论',
    situation.stagnant || (situation.dimensionsChanged ?? 0) < 1
      ? '- ⚠️ **Director 警告**：世界或关系推进不足（人物轴缺失合法，勿用假成长补维度）'
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
    cs.missing || (!cs.before && !cs.after)
      ? '- **人物**：transformation missing'
      : (cs.before ? `- **人物**：${cs.before} → ${cs.after}` : null),
    rs.before ? `- **关系**：${rs.before} → ${rs.after}` : null,
    '- **边界**：Choice ≠ Character Transformation',
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
