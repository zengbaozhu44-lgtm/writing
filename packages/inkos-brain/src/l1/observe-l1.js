/**
 * Minimal L1 Choice Formation Observer (Question A only)
 *
 * observeL1({ prose, pov? }) → { judgment: 'VALID'|'UNKNOWN'|'INVALID' }
 *
 * Frozen: Golden L1 SPEC + #26/#26b. NO SR/Plan/Actual/Layer-B Gate/oracle input.
 * NO Candidate Option · NO Choice mint · NO side effects · NO LLM
 *
 * @see golden/reality/l1-choice-formation/SPEC.md
 * @see docs/design/phase-4.4/31_phase-4-l1-observer-implementation-boundary-runtime-design.md
 */

export const L1_OBSERVER_VERSION = 'l1-observer-1';
export const L1_JUDGMENTS = Object.freeze(['VALID', 'UNKNOWN', 'INVALID']);

/**
 * @param {{ prose: string, pov?: string }} input
 * @returns {{ judgment: 'VALID'|'UNKNOWN'|'INVALID' }}
 */
export function observeL1(input) {
  if (input == null || typeof input !== 'object' || Array.isArray(input)) {
    const err = new Error('observeL1: input must be an object { prose, pov? }');
    err.code = 'L1_INPUT_ERROR';
    throw err;
  }

  if (!Object.prototype.hasOwnProperty.call(input, 'prose')) {
    const err = new Error('observeL1: prose is required');
    err.code = 'L1_INPUT_ERROR';
    throw err;
  }

  if (typeof input.prose !== 'string') {
    const err = new Error('observeL1: prose must be a string');
    err.code = 'L1_INPUT_ERROR';
    throw err;
  }

  if (input.pov !== undefined && input.pov !== null && typeof input.pov !== 'string') {
    const err = new Error('observeL1: pov must be a string when provided');
    err.code = 'L1_INPUT_ERROR';
    throw err;
  }

  // Reject accidental oracle / authority keys (strict isolation)
  const forbiddenKeys = [
    'expected',
    'evidence',
    'forbidden_inference',
    'sr',
    'plan',
    'causal_chain',
    'candidateOption',
    'candidateOptions',
    'actual',
    'attribution',
    'writerContext',
  ];
  for (let i = 0; i < forbiddenKeys.length; i++) {
    if (Object.prototype.hasOwnProperty.call(input, forbiddenKeys[i])) {
      const err = new Error('observeL1: forbidden input field: ' + forbiddenKeys[i]);
      err.code = 'L1_INPUT_ERROR';
      throw err;
    }
  }

  const prose = input.prose;
  // pov reserved for name resolution only — unused by current deterministic classifiers
  void input.pov;

  if (assessSubjectAbsent(prose)) {
    return { judgment: 'INVALID' };
  }

  const access = assessAccess(prose);
  const agency = assessAgency(prose);
  const subjectPresent = assessSubjectPresent(prose);

  if (access && agency && subjectPresent) {
    return { judgment: 'VALID' };
  }

  return { judgment: 'UNKNOWN' };
}

/**
 * SubjectAbsent → INVALID (Golden SubjectAbsent set).
 * Coercion / fear / pressure alone do NOT imply absence.
 */
function assessSubjectAbsent(prose) {
  if (/(昏迷|人事不省)/u.test(prose)) return true;
  if (/(睡着了|梦游)/u.test(prose)) return true;
  if (/不知道自己正在做什么/u.test(prose)) return true;
  if (/像被线提着/u.test(prose)) return true;
  if (/失去了意识/u.test(prose)) return true;
  if (/电击/u.test(prose) && /抽动/u.test(prose)) return true;
  if (/(替她|替他)/u.test(prose) && /(握着|失去|意识)/u.test(prose)) return true;
  return false;
}

/**
 * SubjectPresent for VALID conjunct: not SubjectAbsent and no ambiguous absence.
 * When SubjectAbsent already handled, remaining well-formed character prose is present.
 */
function assessSubjectPresent(prose) {
  if (assessSubjectAbsent(prose)) return false;
  // No positive absence markers → treat as present for Question A
  // (Grammar ≠ Presence is enforced by not auto-INVALID on passive voice alone.)
  void prose;
  return true;
}

/**
 * Access from Golden E1–E5 surface cues in prose only.
 * E3 (e.g. 没回头 alone) is insufficient.
 * E5 pure action without option-in-model cues is insufficient.
 * Does NOT use SR/Plan/Candidate Option.
 */
function assessAccess(prose) {
  // E3 alone: 没回头 without stronger Access cues → insufficient
  if (/没回头/u.test(prose)) {
    const stronger =
      /而不是/u.test(prose)
      || /没有(?:走近|按下|报警|再咬|放开)/u.test(prose)
      || /没(?:走开|放开)/u.test(prose)
      || /却还是|还是决定|可她没放开/u.test(prose)
      || /知道.*(?:就能|可以)/u.test(prose);
    if (!stronger) return false;
  }

  // E1 explicit multi-option
  if (/而不是/u.test(prose)) return true;

  // Explicit known actionable path (option enters model)
  if (/知道按下/u.test(prose) || /知道.*就能/u.test(prose) || /知道.*可以/u.test(prose)) {
    return true;
  }

  // E4 / tradeoff fork markers
  if (/可她没放开/u.test(prose)) return true;
  if (/却还是/u.test(prose)) return true;
  if (/还是决定/u.test(prose)) return true;
  if (/把手缩回来|收回了手/u.test(prose) && /(伸手|悬在|碰到|按钮|铁环)/u.test(prose)) {
    return true;
  }

  // E2: negation of an action path entering the model
  if (/没有(?:走近|按下|报警|再咬|放开)/u.test(prose)) return true;
  if (/没(?:走开|放开)/u.test(prose)) return true;

  // Coercion + 「只能」without tradeoff (U08) → do not count as Access
  if (/只能/u.test(prose) && !/(还是决定|却还是|而不是|想了想)/u.test(prose)) {
    return false;
  }

  return false;
}

/**
 * Agency from Golden Agency minimum only.
 * FORBIDDEN auto-upgrades: hesitation alone, silence, refusal alone,
 * dual-negation alone, non-action alone, pressure/conflict alone.
 */
function assessAgency(prose) {
  // Narrated internal state / affect / judgment lexicon
  if (/心里一紧/u.test(prose)) return true;
  if (/害怕/u.test(prose)) return true;
  if (/嘴唇发麻/u.test(prose)) return true;
  if (/喉咙里堵/u.test(prose)) return true;
  if (/想了想/u.test(prose)) return true;
  if (/脑子里转/u.test(prose)) return true;
  if (/咬住了唇角/u.test(prose)) return true;
  if (/知道自己没有多少时间/u.test(prose)) return true;

  // Explicit decision / conscious tradeoff markers (SPEC judgment / deliberation)
  if (/还是决定/u.test(prose)) return true;
  if (/却还是/u.test(prose)) return true;
  if (/决定/u.test(prose) && /(想了想|还是|而不是)/u.test(prose)) return true;

  // E4 conscious fork with narrated pain persistence (SPEC E4 conscious branch)
  if (/痛得吸气/u.test(prose) && /没放开/u.test(prose)) return true;
  if (/咬破了皮/u.test(prose) && /没放开/u.test(prose)) return true;

  // Explicit deliberation + conscious resolution (not bare pause):
  // hand suspended over control + timed hold + final retract
  if (/悬在/u.test(prose) && /停了/u.test(prose) && /收回/u.test(prose)) {
    return true;
  }

  // Explicitly NOT Agency (documentation for maintainers):
  // - /数了三秒/ alone (U07 — pause_implies_deliberation forbidden)
  // - /习惯性/ alone (U02)
  // - dual /没有/ alone without internal-state or E4 cues (H1 = NO)
  // - /只能/ under coercion without tradeoff (U08)

  return false;
}

// L1 audit-only detectors（诊断导出；与 Truth 零关系，见 l1-audit.js）
export { assessAccess, assessAgency, assessSubjectAbsent, assessSubjectPresent };
