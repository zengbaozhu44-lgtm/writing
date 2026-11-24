/**
 * EO-P4-Causal-Bridge-01 — Action Intent Truth
 *
 * Derived ONLY from legal CADE.
 * Action Intent ≠ Choice. Absent-by-default.
 */
import { createCADE, CADE_PROVENANCE, validateCADE } from './cade.js';

export const ACTION_INTENT_TRUTH_VERSION = 'action-intent-truth-1';

/**
 * Derive Action Intent Truth from CADE only.
 * Any non-CADE path must yield absent.
 */
export function deriveActionIntentTruth(cadeInput = null) {
  const absent = (reason = 'no_cade') => ({
    version: ACTION_INTENT_TRUTH_VERSION,
    status: 'absent',
    characterId: null,
    actionContent: null,
    evidenceRef: null,
    reason,
    isChoice: false,
  });

  if (cadeInput == null) return absent('no_cade');

  const checked = validateCADE(cadeInput);
  if (!checked.ok || !checked.cade) {
    return absent(checked.reason || 'invalid_cade');
  }
  const cade = checked.cade;
  if (cade.provenance !== CADE_PROVENANCE) {
    return absent('provenance_not_character_action_decision');
  }

  return {
    version: ACTION_INTENT_TRUTH_VERSION,
    status: 'asserted',
    characterId: cade.characterId,
    actionContent: cade.actionContent,
    evidenceRef: cade.id,
    reason: 'cade',
    isChoice: false,
    provenance: CADE_PROVENANCE,
    // EO-P4-Correspondence-V2: optional authored anchors 透传（语义辅助，非 Truth）
    ...(cade.anchors ? { anchors: cade.anchors } : {}),
  };
}

/**
 * Explicitly refuse minting Intent from foreign authorities.
 * Always returns absent + reason (for T3).
 */
export function refuseIntentFromForeignAuthority(kind, payload = {}) {
  void payload;
  const k = String(kind || 'unknown').toLowerCase();
  return {
    version: ACTION_INTENT_TRUTH_VERSION,
    status: 'absent',
    characterId: null,
    actionContent: null,
    evidenceRef: null,
    reason: `refused_foreign_authority:${k}`,
    isChoice: false,
  };
}

/**
 * Writer may read asserted Intent for realization. Never mutates.
 * @returns {{ characterId: string, actionContent: string } | null}
 */
export function readActionIntentForRealization(truth = null) {
  if (!truth || truth.status !== 'asserted') return null;
  const characterId = String(truth.characterId || '').trim();
  const actionContent = String(truth.actionContent || '').trim();
  if (!characterId || !actionContent) return null;
  return { characterId, actionContent };
}

/**
 * Format STORY TRUTH cue for Writer prompt (consume-only).
 *
 * opts.realizationGuidance（A/B 实验，默认关闭）：附加 Writer-side realization
 * steering——只提高兑现具体性，不改变 correspondence / Truth Authority 语义。
 */
export function formatActionIntentTruthForPrompt(truth = null, opts = {}) {
  const read = readActionIntentForRealization(truth);
  if (!read) return '';
  const lines = [
    '## Action Intent Truth（角色侧 · STORY TRUTH · 非 Plan）',
    `角色「${read.characterId}」已有可归属的 Action Intent，内容：${read.actionContent}`,
    'Writer 仅兑现（realize）该 Intent；不得铸造、改写或推断新的 Action Intent / CADE / Choice。',
    'Action Intent ≠ Choice。',
  ];
  // EO-P4-Correspondence-V2 生产接线：authored anchors 存在时自动启用锚定
  // realization guidance（A/B 已验证：锚词入文 8/10、零机械复读）。
  // 语义：author 提交 anchors = 选择可验证 realization —— guidance 与 v2
  // 判定配套；无 anchors 的存量 Intent 行为完全不变。
  const anchored = opts.realizationGuidanceAnchored
    || (truth?.anchors && Object.keys(truth.anchors || {}).some((k) => Array.isArray(truth.anchors[k]) && truth.anchors[k].length));
  if (opts.realizationGuidance) {
    lines.push(
      '兑现（realization guidance）：该行动应在本场正文中由角色明确完成（不是计划、不是预兆）；'
      + '措辞可自由改写，但动作内容要具体，并尽量保留决策措辞中的关键动作词与对象，使正文行动与该决策可直接对上。',
    );
  } else if (anchored) {
    lines.push(
      '兑现（realization guidance · 锚定）：本场正文中，该角色必须以决策所述的具体方式完成该行动——'
      + '决策措辞中的关键动作词与对象（动词及其宾语）必须出现在正文的动作句里；'
      + '句子组织、修饰与叙事顺序完全自由，但不得替换行动方式本身。',
    );
  }
  return lines.join('\n');
}

/**
 * Hard-forbid Writer (or any caller) from minting Intent / CADE via this API.
 */
export function assertWriterCannotMintIntent() {
  const err = new Error('Writer must not mint CADE or Action Intent Truth');
  err.code = 'WRITER_INTENT_MINT_FORBIDDEN';
  throw err;
}

/** Alias used by createCADE path tests */
export { createCADE };
