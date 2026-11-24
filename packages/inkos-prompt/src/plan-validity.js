/**
 * F8.3 — Actual-aware Plan Validity (pure diagnostic)
 *
 * Judges whether N+1 Plan retains *direct execution privilege*
 * given Scene N Actual / Observed Continuity.
 *
 * NOT Reality / Canon / SR / Consequence Engine / Planner.replan.
 * High precision > high recall. unresolved alone ≠ INVALID.
 *
 * Freeze:
 * - writesCanon / writesReality / writesSR = false
 * - Strategic Goal is preserved; only opening execution privilege demotes
 * - Repair ≠ Regenerate
 */
import { ensureObservedContinuity } from './scene-observed-continuity.js';

const BRIDGE_RE = /先承接|先处理|先结算|结算选择|做出选择|承接该选择|承接选择|然后前往|桥接|从上一场|继续该选择|承接上一场|先完成选择|经显式|结算后再|选择后再|先跟|先留下/u;

/** Plan text that assumes arrival / wake-at-hospital already true (opening premise). */
const PLAN_HOSPITAL_BED_ESTABLISHED_RE = /在医院的?病床上醒来|病床上醒来|医院的病床|亲眼目睹世界[\s\S]{0,40}病床|醒来[\s\S]{0,30}见证|洗手间镜子上用血/u;

/** Plan text that assumes a prior choice path already completed (without bridge). */
const PLAN_ASSUMES_ARRIVAL_RE = /已经在医院|已在医院|抵达医院|跟随.{0,12}医院|醒来.{0,20}刷新|病床上醒来/u;

const ACTUAL_LOCATION_PATTERNS = [
  { kind: 'company', re: /公司|监控录像|办公室|电梯出来|公司门口|公司楼下/u },
  { kind: 'rooftop', re: /天台/u },
  { kind: 'hospital', re: /病床|病房|医院|急诊/u },
];

/** High-confidence object-state flips (Actual confirmed → Plan requires opposite). */
const OBJECT_STATE_RULES = [
  {
    id: 'key_surrendered',
    actualRe: /交出了钥匙|把钥匙给了|钥匙已经不在|钥匙交了出去/u,
    planRequiresOppositeRe: /掏出钥匙|用钥匙打开|仍持有钥匙|钥匙还在/u,
    label: '钥匙已交出 vs Plan 仍持有/使用',
  },
];

function pushConflict(conflicts, evidence, item) {
  conflicts.push(item);
  if (item.evidence) evidence.push(item.evidence);
}

function detectActualLocation(text = '') {
  const t = String(text || '');
  // Prefer later / stronger scene location: scan in priority order company > rooftop > hospital
  // for "where are they NOW" — hospital in prior memory vs company confrontation.
  // Use last 900 chars as current-scene weight, then full text fallback.
  const tail = t.slice(-900);
  for (const loc of ACTUAL_LOCATION_PATTERNS) {
    if (loc.re.test(tail)) return { kind: loc.kind, scope: 'tail' };
  }
  for (const loc of ACTUAL_LOCATION_PATTERNS) {
    if (loc.re.test(t)) return { kind: loc.kind, scope: 'full' };
  }
  return null;
}

function planHasBridge(goal = '') {
  return BRIDGE_RE.test(String(goal || ''));
}

function planEstablishesHospitalBed(goal = '') {
  return PLAN_HOSPITAL_BED_ESTABLISHED_RE.test(String(goal || ''));
}

function planAssumesArrival(goal = '') {
  return PLAN_ASSUMES_ARRIVAL_RE.test(String(goal || ''));
}

function hasUnresolvedOpenChoice(oc, text = '') {
  const fromOc = (oc?.unresolved || []).some((u) => /^open_choice/i.test(String(u.id || '')));
  if (fromOc) return true;
  // Structural fallback when OC empty but text has open choice + no settlement
  const t = String(text || '');
  if (!/两个选择|跟我走|或者留|你有三十秒|三十秒内/u.test(t)) return false;
  if (/跟着.{0,8}走了|选择了|决定跟|跟她走了|跟他走了|点头跟|答应跟/u.test(t)) return false;
  return true;
}

/**
 * @param {object} input
 * @param {object|null} [input.actualOc]
 * @param {string} [input.actualText]
 * @param {object|string} [input.nPlus1Plan] — { goal } | goal string | scene-like
 * @returns {object} diagnostic
 */
export function evaluatePlanValidity(input = {}) {
  const actualText = String(input.actualText || '').trim();
  const actualOc = input.actualOc || null;
  const planObj = input.nPlus1Plan && typeof input.nPlus1Plan === 'object'
    ? input.nPlus1Plan
    : { goal: input.nPlus1Plan };
  const goal = String(
    planObj.goal
    || planObj.scenePlan?.goal
    || planObj.executionPlan?.scenePlan?.goal
    || '',
  ).trim();

  const conflicts = [];
  const evidence = [];
  const bridge = planHasBridge(goal);
  const actualLoc = detectActualLocation(actualText);

  // --- A. Location premise (high confidence only) ---
  if (
    planEstablishesHospitalBed(goal)
    && actualLoc
    && actualLoc.kind !== 'hospital'
    && !bridge
  ) {
    pushConflict(conflicts, evidence, {
      type: 'location_premise',
      premiseDenied: true,
      actual: actualLoc.kind,
      plan: 'hospital_bed_established',
      evidence: {
        kind: 'location_mismatch',
        actualLocation: actualLoc.kind,
        planOpening: 'hospital_bed',
        note: 'Plan opens as already in hospital bed; Actual location differs; no bridge language in Plan',
      },
    });
  }

  // --- B. Unresolved choice treated as already completed ---
  // unresolved alone ≠ INVALID; only when Plan assumes settled arrival without bridge
  if (
    hasUnresolvedOpenChoice(actualOc, actualText)
    && planAssumesArrival(goal)
    && !bridge
  ) {
    pushConflict(conflicts, evidence, {
      type: 'choice_assumed_settled',
      premiseDenied: true,
      evidence: {
        kind: 'open_choice_vs_assumed_arrival',
        note: 'Unresolved open choice in Actual; Plan assumes arrival/wake state without bridge/settlement path',
      },
    });
  }

  // --- C. Object state (literal high-confidence only) ---
  for (const rule of OBJECT_STATE_RULES) {
    if (!rule.actualRe.test(actualText)) continue;
    if (!rule.planRequiresOppositeRe.test(goal)) continue;
    if (bridge) continue;
    pushConflict(conflicts, evidence, {
      type: 'object_state',
      id: rule.id,
      premiseDenied: true,
      label: rule.label,
      evidence: { kind: 'object_state_conflict', id: rule.id, label: rule.label },
    });
  }

  const status = conflicts.length > 0 ? 'INVALID' : 'VALID';
  const premiseDenied = status === 'INVALID';

  return {
    role: 'plan_validity_diagnostic',
    status,
    conflicts,
    premiseDenied,
    evidence,
    executionPrivilege: premiseDenied ? 'demoted' : 'direct',
    strategicGoalPreserved: true,
    bridgeLanguageInPlan: bridge,
    writesCanon: false,
    writesReality: false,
    writesSR: false,
    version: 'f8.3-plan-validity-1',
  };
}

/**
 * Session/prompt-facing attach. Does not write Canon / SR / Reality.
 * Prefer calling before N+1 Director plan lock.
 */
export function ensurePlanValidity(scene = {}, intent = {}) {
  if (!scene || typeof scene !== 'object') return null;
  const index = Number(scene.index) || 0;
  if (index <= 1) {
    scene.planValidity = {
      role: 'plan_validity_diagnostic',
      status: 'VALID',
      conflicts: [],
      premiseDenied: false,
      evidence: [],
      executionPrivilege: 'direct',
      strategicGoalPreserved: true,
      writesCanon: false,
      writesReality: false,
      writesSR: false,
      version: 'f8.3-plan-validity-1',
      note: 'scene_1_no_prior',
    };
    return scene.planValidity;
  }

  const prevList = (intent?.scenes || [])
    .filter((s) => Number(s.index) < index && String(s.text || '').trim());
  const prev = prevList[prevList.length - 1] || null;
  if (!prev) {
    scene.planValidity = evaluatePlanValidity({
      actualText: '',
      actualOc: null,
      nPlus1Plan: scene,
    });
    return scene.planValidity;
  }

  const oc = ensureObservedContinuity(prev);
  const result = evaluatePlanValidity({
    actualText: prev.text,
    actualOc: oc,
    nPlus1Plan: scene,
  });
  scene.planValidity = result;
  return result;
}

export function isExecutionPrivilegeDemoted(planValidityOrScene) {
  const pv = planValidityOrScene?.planValidity || planValidityOrScene;
  return pv?.status === 'INVALID'
    || pv?.executionPrivilege === 'demoted'
    || pv?.premiseDenied === true;
}

/**
 * Prompt block: demote opening execution privilege; keep strategic goal.
 */
export function formatPlanValidityDemotionBlock(planValidity) {
  if (!isExecutionPrivilegeDemoted(planValidity)) return '';
  const types = (planValidity.conflicts || []).map((c) => c.type).filter(Boolean);
  const typeLine = types.length ? types.join(', ') : 'premise_denied';
  return [
    '### Plan Validity · Execution Privilege',
    '> **角色：diagnostic · session/prompt · ≠ Canon · ≠ Reality · ≠ SR · ≠ Plan Authority**',
    '> status: **INVALID** · premiseDenied · executionPrivilege=**demoted**',
    '> Strategic / Narrative Goal **保留**（不是删除 Goal；不是判定 Plan「错了」）。',
    '> Opening premise **失去直接执行资格** — Plan 不能凌驾于 Actual。',
    '',
    `冲突类型：${typeLine}`,
    '',
    '**写作约束（强制）**：',
    '- 不得把「已在医院病床 / 已抵达下一地点 / 上一场选择已结算」写成开场既成事实。',
    '- 必须先从上一场 Actual / Observed Continuity **显式承接、结算或桥接**。',
    '- 若仍要抵达原 Narrative Goal，只能经显式 bridge 到达，**禁止瞬移跳过 Actual**。',
    '- Beat After / Expected ≠ Actual；不得把 Expected 升格为已发生事实。',
  ].join('\n');
}
