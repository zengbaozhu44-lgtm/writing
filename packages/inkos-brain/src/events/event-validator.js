/**
 * Phase 1 — StoryEvent validator（R2 Human Seal 2026-10-08 修订）
 *
 * PASS requires:
 * - Required schema fields present
 * - evidence.excerpt non-empty and found in scene.text
 * - source not in FORBIDDEN_EVENT_SOURCES
 * - action non-empty and grounded in scene.text
 *
 * consequence 语义（R2 Seal · Experience / World Consequence Assertion 分离）：
 * - Experience：consequence = OPTIONAL（空即合法经历，无世界后果声明）
 * - kind 不决定 consequence 必填性（禁机械表）
 * - 非空 consequence = World Consequence Assertion 标记：其独立 grounding 由
 *   gateCandidate（producer 层，non-echo + aftermath）与 WCT
 *   occurrenceYieldsGroundedWorldChange（Truth 层）执行——本 validator 不复验、
 *   也不得以字段存在性/非空性当 World Consequence（Risk 7 Seal）。
 *
 * Does NOT write Canon / SR / Reality.
 */
import {
  FORBIDDEN_EVENT_SOURCES,
  STORY_EVENT_VERSION,
  createStoryEvent,
} from './story-event.schema.js';

/**
 * @param {object} event
 * @param {{ text?: string, scene?: object }} [ctx]
 * @returns {{ ok: boolean, status: 'PASS'|'REJECT', errors: string[], event: object }}
 */
export function validateStoryEvent(event, ctx = {}) {
  const text = String(ctx.text ?? ctx.scene?.text ?? '');
  const errors = [];
  const normalized = createStoryEvent(event || {});

  if (!normalized.sceneId || normalized.sceneId === 'scene_unknown') {
    errors.push('missing_sceneId');
  }
  if (!normalized.action) errors.push('missing_action');
  // R2 Seal：Experience 的 consequence OPTIONAL——不再无条件必填（原 missing_consequence
  // 与 Seal 冲突；World Consequence Assertion 的必填+独立 grounding 在 gate/WCT 层）
  if (!normalized.actors.length) errors.push('missing_actors');
  if (!normalized.stateChanges.length) errors.push('missing_stateChanges');
  if (!normalized.affectedEntities.length) errors.push('missing_affectedEntities');

  const excerpt = normalized.evidence?.excerpt || '';
  if (!excerpt) {
    errors.push('missing_evidence');
  } else if (!text) {
    errors.push('missing_scene_text');
  } else if (!textIncludesEvidence(text, excerpt)) {
    errors.push('evidence_not_in_text');
  }

  const src = String(normalized.source || '').toLowerCase();
  if (FORBIDDEN_EVENT_SOURCES.some((f) => src === f || src.startsWith(`${f}.`))) {
    errors.push(`forbidden_source:${normalized.source}`);
  }

  // Guard: action must not be a bare Plan skeleton phrase without overlapping text
  if (normalized.action && text && !actionGroundedInText(normalized.action, text, excerpt)) {
    errors.push('action_not_grounded');
  }

  // Authority flags must stay false in Phase 1
  if (event?.writesCanon === true) errors.push('writesCanon_forbidden_phase1');
  if (event?.writesSR === true) errors.push('writesSR_forbidden_phase1');
  if (event?.writesReality === true) errors.push('writesReality_forbidden_phase1');

  const ok = errors.length === 0;
  return {
    ok,
    status: ok ? 'PASS' : 'REJECT',
    errors,
    event: {
      ...normalized,
      version: STORY_EVENT_VERSION,
      writesCanon: false,
      writesSR: false,
      writesReality: false,
    },
  };
}

/**
 * Validate a set; scene fails if zero PASS events when text is non-empty
 * and requireAtLeastOne is true (Phase 1.3 gate will use this).
 */
export function validateStoryEventSet(events, ctx = {}) {
  const list = Array.isArray(events) ? events : [];
  const results = list.map((e) => validateStoryEvent(e, ctx));
  const passed = results.filter((r) => r.ok).map((r) => r.event);
  const rejected = results.filter((r) => !r.ok);

  const requireAtLeastOne = ctx.requireAtLeastOne !== false;
  const text = String(ctx.text ?? ctx.scene?.text ?? '').trim();
  const setErrors = [];
  if (requireAtLeastOne && text && passed.length === 0) {
    setErrors.push('no_valid_actual_event');
  }

  return {
    ok: setErrors.length === 0 && rejected.length === 0 && (passed.length > 0 || !requireAtLeastOne || !text),
    status: setErrors.length || rejected.length ? 'REJECT' : 'PASS',
    errors: setErrors,
    passed,
    rejected,
    count: passed.length,
  };
}

function textIncludesEvidence(text, excerpt) {
  const t = collapseWs(text);
  const e = collapseWs(excerpt);
  if (!e) return false;
  if (t.includes(e)) return true;
  // Allow short excerpt with light punctuation drift
  if (e.length >= 8 && t.includes(e.slice(0, Math.min(40, e.length)))) return true;
  return false;
}

function actionGroundedInText(action, text, excerpt) {
  const a = collapseWs(action);
  const t = collapseWs(text);
  const e = collapseWs(excerpt);
  // Action copied from / contained in evidence excerpt（EO-EXTRACT-HARDEN-01 R1：
  // LLM 常把「他」改写为角色名前缀破坏包含——有界尝试剥 2–4 字前缀，剥后仍须落在 excerpt 内）
  if (e) {
    if (e.includes(a.slice(0, Math.min(16, a.length))) || a.includes(e.slice(0, Math.min(16, e.length)))) {
      return true;
    }
    for (const n of [2, 3, 4]) {
      const rest = a.slice(n);
      if (rest.length >= 3 && e.includes(rest.slice(0, Math.min(16, rest.length)))) {
        return true;
      }
    }
  }
  // At least one content token (≥2 chars) from action appears in text
  const tokens = a.split(/[\s，。！？、：:·\-—\/（）()]+/u).filter((x) => x.length >= 2);
  if (tokens.length) {
    const hit = tokens.filter((tok) => t.includes(tok));
    if (hit.length >= Math.min(2, tokens.length) || (hit.length >= 1 && tokens.length === 1)) {
      return true;
    }
  }
  // EO-EXTRACT-HARDEN-01 R1：中文无标点动作串（单 token）假阴性修复——
  // 剥除 ≤4 字 actor/代词前缀后，完整谓语核心逐字出现在正文中才视为 grounded。
  // 严格确定性、零相似度容忍：转述改写（他→角色名、前缀增删）可过，
  // 相似但未出现的动作（动词不同/宾语残缺）仍被拒绝。
  const cores = [a, a.replace(/^(他|她|它)/u, ''), a.slice(2), a.slice(3), a.slice(4)]
    .map((c) => c.trim())
    .filter((c) => c.length >= 3 && t.includes(c));
  if (cores.length) return true;
  return false;
}

function collapseWs(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}
