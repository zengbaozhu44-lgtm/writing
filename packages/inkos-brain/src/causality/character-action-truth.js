/**
 * EO-P4-Character-Action-Bridge-01 — Character Action Truth
 *
 * Character Action = Intent Truth(X,Y) asserted
 *                  + corresponding Action occurrence
 *
 * ≠ Choice · ≠ Attribution PASS · ≠ occurrence alone · ≠ Writer/Plan authority
 */
import { ACTION_INTENT_TRUTH_VERSION } from './action-intent-truth.js';

export const CHARACTER_ACTION_TRUTH_VERSION = 'character-action-truth-1';
export const CHARACTER_ACTION_PROVENANCE = 'character_action_from_intent_realization';

export const FORBIDDEN_CHARACTER_ACTION_FIELDS = Object.freeze([
  'choice',
  'choiceId',
  'choice_id',
  'options',
  'candidateOption',
  'candidateOptions',
  'optionId',
  'agency',
  'agencyScore',
  'goalId',
  'goal_id',
  'consequenceId',
  'lifecycle',
  'evidenceGraph',
  'authorityFramework',
]);

function norm(s) {
  return String(s || '').trim();
}

/** Collapse whitespace / light punctuation for fail-closed correspondence (no LLM). */
export function normalizeActionContent(s = '') {
  return String(s || '')
    .replace(/\s+/g, '')
    .replace(/[「」『』""''„"\.。，、！？!?：；;:（）()【】\[\]…—\-·]/g, '');
}

/**
 * Fail-closed correspondence: character + action content alignment.
 * @returns {{ ok: boolean, reason: string }}
 */
export function occurrenceCorrespondsToIntent(intentTruth, occurrence = {}) {
  const characterId = norm(intentTruth?.characterId);
  const y = norm(intentTruth?.actionContent);
  if (!characterId || !y) {
    return { ok: false, reason: 'intent_incomplete' };
  }

  const actors = Array.isArray(occurrence.actors) ? occurrence.actors.map(norm) : [];
  if (!actors.includes(characterId)) {
    return { ok: false, reason: 'character_mismatch' };
  }

  const yN = normalizeActionContent(y);
  const aN = normalizeActionContent(occurrence.action || '');
  const eN = normalizeActionContent(occurrence.evidence?.excerpt || occurrence.evidence?.text || '');

  if (!yN || yN.length < 2) {
    return { ok: false, reason: 'action_content_too_weak' };
  }

  if (aN && (aN.includes(yN) || yN.includes(aN))) {
    return { ok: true, reason: 'action_overlap' };
  }
  if (eN && eN.includes(yN)) {
    return { ok: true, reason: 'excerpt_contains_intent' };
  }
  // Partial contiguous window (≥2 chars; for longer Y require ~half)
  if (aN || eN) {
    const hay = aN || eN;
    const win = Math.max(2, Math.min(yN.length, Math.floor(yN.length / 2) || 2));
    for (let i = 0; i <= yN.length - win; i += 1) {
      if (hay.includes(yN.slice(i, i + win))) {
        return { ok: true, reason: 'partial_overlap' };
      }
    }
  }

  return { ok: false, reason: 'content_mismatch' };
}

/**
 * EO-P4-Intent-Realization-Correspondence-V2-01 — realization evaluation.
 *
 * 语义：Occurrence realizes Intent（非文本相似度）。
 * anchors = Author 提供的语义辅助约束（object/action/terminal 三组）；
 * anchor 本身不证明任何事，只约束确定性证据测试。
 *
 * Chain ≠ Completion：无终局 grounded 证据 → absent（preparation/attempt/partial
 * 只落 reason 诊断，不成为 Truth 状态）。
 */
export const TERMINAL_NEGATION_MARKERS = Object.freeze([
  '纹丝不动', '咬死', '卡死', '没能', '未能', '没有成功', '失败了', '没点着',
]);

const MAX_CHAIN = 8;

function anchorsReady(a) {
  if (!a || typeof a !== 'object') return false;
  for (const k of ['object', 'action', 'terminal']) {
    const list = a[k];
    if (!Array.isArray(list) || !list.length) return false;
    for (const x of list) {
      if (typeof x !== 'string' || normalizeActionContent(x).length < 1) return false;
    }
  }
  return true;
}

function spanOf(ev) {
  return normalizeActionContent(`${ev.action || ''}\n${ev.evidence?.excerpt || ''}`);
}

function terminalSpanOf(ev) {
  return [ev.consequence, ...(Array.isArray(ev.stateChanges) ? ev.stateChanges : [])]
    .map(normalizeActionContent).join('\n');
}

function refOf(ev) {
  return norm(ev.id) // EO-G1-C-01：refOf fallback 已废——无 id 即无引用（fail-closed）;
}

function chainOrder(occurrences, sceneText) {
  const text = String(sceneText || '');
  return occurrences
    .map((ev, idx) => {
      const ex = String(ev?.evidence?.excerpt || '');
      const pos = text && ex ? text.indexOf(ex) : -1;
      // 未命中（理论上 grounded 不会）：大基数+idx 保持数组序，排于命中者之后
      return { ev, idx, pos: pos >= 0 ? pos : 1e12 + idx };
    })
    .sort((a, b) => (a.pos - b.pos) || (a.idx - b.idx))
    .slice(0, MAX_CHAIN);
}

/**
 * Deterministic realization evaluation (v2). Fail-closed.
 * @returns {{ ok: true, reason: string, occurrenceRefs: string[], terminalOccurrenceRef: string,
 *             terminalOccurrence: object } |
 *           { ok: false, reason: string }}
 */
export function evaluateRealization(intentTruth, occurrences = [], sceneText = '') {
  const X = norm(intentTruth?.characterId);
  const Y = norm(intentTruth?.actionContent);
  const anchors = intentTruth?.anchors;
  if (!X || !Y) return { ok: false, reason: 'intent_incomplete' };
  if (!anchorsReady(anchors)) return { ok: false, reason: 'anchors_incomplete' };
  const list = Array.isArray(occurrences) ? occurrences.filter(Boolean) : [];
  if (!list.length) return { ok: false, reason: 'no_occurrence' };

  const obj = anchors.object.map(normalizeActionContent).filter(Boolean);
  const act = anchors.action.map(normalizeActionContent).filter(Boolean);
  const term = anchors.terminal.map(normalizeActionContent).filter(Boolean);

  const chain = chainOrder(list, sceneText);
  const isX = (ev) => (Array.isArray(ev.actors) ? ev.actors.map(norm) : []).includes(X);

  // object 锚：组内为同义备选（任一 ∈ 链上 occurrence 的 action∪excerpt 即可，
  // 免疫 R1 同义漂移 / R2 插入 / R3 分解；锚的立论即抗同义，AND 语义与设计意图相悖）
  const allSpans = chain.map((c) => spanOf(c.ev)).join('\n');
  if (!obj.some((o) => allSpans.includes(o))) return { ok: false, reason: 'no_anchor_coverage' };

  // action 锚须落在某个 X-actor occurrence 的 action 字段（R8 纪律：
  // 环境描写不得借 excerpt 通道充当行动证据）
  const xNodes = chain.filter((c) => isX(c.ev));
  if (!xNodes.length) return { ok: false, reason: 'no_x_occurrence' };
  const actField = (ev) => normalizeActionContent(ev.action || '');
  const xActionNode = xNodes.find((c) => act.some((a) => actField(c.ev).includes(a)));
  if (!xActionNode) return { ok: false, reason: 'no_action_anchor_in_x_occurrence' };

  // 终局证据：terminal 锚组内同义备选（任一 ∈ 终局 occurrence 的 Actual grounded
  // 字段 action∪excerpt∪consequence∪stateChanges —— 授权 §九 "existing text evidence"）
  let terminal = null;
  for (const c of chain) {
    if (term.some((t) => terminalSpanOf(c.ev).includes(t) || spanOf(c.ev).includes(t))) terminal = c;
  }
  if (!terminal) return { ok: false, reason: 'terminal_evidence_missing' };

  // 否定防线（仅终局 span；局部失败后成功合法）
  const negSpan = `${terminalSpanOf(terminal.ev)}\n${spanOf(terminal.ev)}`;
  if (TERMINAL_NEGATION_MARKERS.some((m) => negSpan.includes(normalizeActionContent(m)))) {
    return { ok: false, reason: 'terminal_negated' };
  }

  // 第三方接管：terminal 由非 X 独占，且其 action 直接操作意图对象锚
  // （Y 对同一对象的独立执行 ≠ X 的 mediated realization —— 共享锚只证对象连续性）
  const tActN = normalizeActionContent(terminal.ev.action || '');
  const thirdPartyTakeover = !isX(terminal.ev)
    && obj.some((o) => tActN.includes(o));
  if (thirdPartyTakeover) {
    return { ok: false, reason: 'external_unlinked_realization' };
  }
  const otherActors = (terminal.ev.actors || []).map(norm).filter((a) => a && a !== X);
  if (!isX(terminal.ev) && otherActors.length && act.some((a) => tActN.includes(a))) {
    return { ok: false, reason: 'external_unlinked_realization' };
  }

  if (isX(terminal.ev)) {
    return {
      ok: true,
      reason: 'anchor_chain_direct',
      occurrenceRefs: chain.map((c) => refOf(c.ev)),
      terminalOccurrenceRef: refOf(terminal.ev),
      terminalOccurrence: terminal.ev,
    };
  }

  // Mediated：共享锚只证明对象连续性（必要非充分）——还须 X 行动在终局之前、
  // 无第三方接管、终局未被否定；任何不确定 → fail-closed。
  const sharedPool = [...obj, ...term];
  const xSpan = spanOf(xActionNode.ev);
  const tAll = `${spanOf(terminal.ev)}\n${terminalSpanOf(terminal.ev)}`;
  const linked = sharedPool.some((s) => xSpan.includes(s) && tAll.includes(s));
  if (!linked || !(xActionNode.pos < terminal.pos)) {
    return { ok: false, reason: 'external_unlinked_realization' };
  }
  const takeover = chain.some((c) => c.pos > xActionNode.pos
    && c.pos < terminal.pos
    && !isX(c.ev)
    && (c.ev.actors || []).map(norm).some((a) => a && a !== X)
    && act.some((a) => spanOf(c.ev).includes(a)));
  if (takeover) return { ok: false, reason: 'external_unlinked_realization' };

  return {
    ok: true,
    reason: 'anchor_chain_mediated',
    occurrenceRefs: chain.map((c) => refOf(c.ev)),
    terminalOccurrenceRef: refOf(terminal.ev),
    terminalOccurrence: terminal.ev,
  };
}

function absent(reason = 'no_inputs') {
  return {
    version: CHARACTER_ACTION_TRUTH_VERSION,
    status: 'absent',
    characterId: null,
    actionContent: null,
    intentRef: null,
    occurrenceRef: null,
    reason,
    provenance: null,
    isChoice: false,
  };
}

/**
 * Derive Character Action Truth. Fail-closed. No LLM.
 */
export function deriveCharacterActionTruth(opts = {}) {
  const intentTruth = opts.intentTruth || opts.actionIntentTruth || null;
  const occurrences = Array.isArray(opts.occurrences)
    ? opts.occurrences
    : (Array.isArray(opts.actualEvents) ? opts.actualEvents : []);

  // Refuse foreign-authority mint probes
  if (opts.fromAuthority || opts.authority) {
    const a = String(opts.fromAuthority || opts.authority || '').toLowerCase();
    const banned = ['plan', 'director', 'beat', 'writer', 'attribution', 'prose', 'desire', 'ggc', 'l1'];
    if (banned.some((b) => a === b || a.startsWith(`${b}.`) || a.startsWith(`${b}_`))) {
      return absent(`refused_foreign_authority:${a}`);
    }
  }
  if (opts.planAction != null || opts.directorAction != null || opts.beatAction != null
    || opts.writerProse != null || opts.attributionPass != null) {
    return absent('refused_embedded_foreign_authority');
  }
  for (const f of FORBIDDEN_CHARACTER_ACTION_FIELDS) {
    if (opts[f] != null) return absent(`forbidden_field:${f}`);
  }

  if (!intentTruth || intentTruth.status !== 'asserted') {
    return absent(intentTruth ? 'intent_not_asserted' : 'intent_absent');
  }
  if (!norm(intentTruth.characterId) || !norm(intentTruth.actionContent)) {
    return absent('intent_incomplete');
  }
  if (!occurrences.length) {
    return absent('no_occurrence');
  }

  // EO-P4-Correspondence-V2: authored anchors 存在 → realization 链评价；
  // anchors 不完整 → 视为无 anchors 走 v1（back-compat，不因 v2 上线改变存量行为）
  if (anchorsReady(intentTruth.anchors)) {
    const evaluated = evaluateRealization(
      intentTruth,
      occurrences,
      String(opts.sceneText ?? ''),
    );
    if (!evaluated.ok) {
      return absent(evaluated.reason);
    }
    const intentRef = intentTruth.evidenceRef
      || `intent:${intentTruth.characterId}:${normalizeActionContent(intentTruth.actionContent).slice(0, 40)}`;
    return {
      version: CHARACTER_ACTION_TRUTH_VERSION,
      status: 'asserted',
      characterId: norm(intentTruth.characterId),
      actionContent: norm(intentTruth.actionContent),
      intentRef,
      occurrenceRefs: evaluated.occurrenceRefs,
      terminalOccurrenceRef: evaluated.terminalOccurrenceRef,
      occurrenceRef: evaluated.terminalOccurrenceRef, // 兼容别名 = 终局（WCT 零改动）
      reason: evaluated.reason,
      provenance: CHARACTER_ACTION_PROVENANCE,
      isChoice: false,
      intentTruthVersion: intentTruth.version || ACTION_INTENT_TRUTH_VERSION,
    };
  }

  let lastReason = 'content_mismatch';
  for (const ev of occurrences) {
    if (!ev || typeof ev !== 'object') continue;
    const match = occurrenceCorrespondsToIntent(intentTruth, ev);
    if (!match.ok) {
      lastReason = match.reason;
      continue;
    }
    const intentRef = intentTruth.evidenceRef
      || `intent:${intentTruth.characterId}:${normalizeActionContent(intentTruth.actionContent).slice(0, 40)}`;
    const occurrenceRef = norm(ev.id) // EO-G1-C-01：refOf fallback 已废——无 id 即无引用（fail-closed）;
    return {
      version: CHARACTER_ACTION_TRUTH_VERSION,
      status: 'asserted',
      characterId: norm(intentTruth.characterId),
      actionContent: norm(intentTruth.actionContent),
      intentRef,
      occurrenceRef,
      reason: match.reason,
      provenance: CHARACTER_ACTION_PROVENANCE,
      isChoice: false,
      intentTruthVersion: intentTruth.version || ACTION_INTENT_TRUTH_VERSION,
    };
  }

  return absent(lastReason);
}

/**
 * Attach Character Action Truth on scene after Actual extraction.
 * Does not mutate actualEvents. Does not use Attribution.
 */
export function attachCharacterActionTruth(scene = {}, opts = {}) {
  if (!scene || typeof scene !== 'object') {
    return { truth: absent('no_scene') };
  }
  const intentTruth = opts.intentTruth !== undefined
    ? opts.intentTruth
    : (scene.actionIntentTruth || null);
  const occurrences = opts.occurrences !== undefined
    ? opts.occurrences
    : (scene.actualEvents || []);

  const truth = deriveCharacterActionTruth({
    intentTruth,
    occurrences,
    sceneText: opts.sceneText !== undefined ? opts.sceneText : (scene.text || ''),
    ...opts.probe,
  });
  scene.characterActionTruth = truth;
  return { truth };
}

/** Writer must not mint Character Action. */
export function assertWriterCannotMintCharacterAction() {
  const err = new Error('Writer must not mint Character Action Truth');
  err.code = 'WRITER_CHARACTER_ACTION_MINT_FORBIDDEN';
  throw err;
}

/**
 * Explicit refusals for tests (Plan / Attribution / prose alone).
 */
export function refuseCharacterActionFromForeignAuthority(kind, payload = {}) {
  void payload;
  return absent(`refused_foreign_authority:${String(kind || 'unknown').toLowerCase()}`);
}
