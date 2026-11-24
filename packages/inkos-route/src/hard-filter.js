/**
 * Hard Constraint Filter — rule-based, not LLM scoring.
 * Rejects plot outlines, fate assertions, preset choices, constraint violations.
 */
import { CANDIDATE_COUNT, isValidCandidateShape } from './contract.js';

const CHAPTER_SCHEDULE_RE = [
  /第\s*[一二三四五六七八九十\d]+\s*章/u,
  /\bch(?:apter)?\s*\d+/i,
  /→|->|——>/u,
  /首先.+然后.+最后/u,
  /场景\s*\d/u,
];

const FATE_ASSERTION_RE = [
  /最终(会|将|一定|必然)/u,
  /一定会/u,
  /必然会/u,
  /注定/u,
  /结局是/u,
  /最终将/u,
  /will\s+(definitely|certainly)/i,
  /must\s+happen/i,
];

const PRESET_CHOICE_RE = [
  /他(决定|选择|必须)(了|要)/u,
  /她(决定|选择|必须)(了|要)/u,
  /他们(决定|选择)(了|要)/u,
  /已经决定/u,
];

const PLOT_EVENT_RE = [
  /秘密(将|会)被揭露/u,
  /安排.{0,6}(背叛|死亡|牺牲)/u,
  /为了.{0,8}(见自己|见众生|见天地).{0,6}(制造|安排|引发)/u,
  /必须出现/u,
  /七宗罪/u,
];

/** @param {string} text */
function joinCandidateText(candidate) {
  return [
    candidate.title,
    candidate.direction,
    candidate.open_space,
    ...(candidate.tensions || []),
    ...(candidate.relationship_shifts || []),
  ].filter(Boolean).join('\n');
}

/** @param {string} text @param {RegExp[]} patterns */
function matchesAny(text, patterns) {
  return patterns.some((re) => re.test(text));
}

/**
 * @param {object} candidate
 * @param {string[]} hardConstraints
 */
export function evaluateRouteCandidate(candidate, hardConstraints = []) {
  const violations = [];

  if (!isValidCandidateShape(candidate)) {
    violations.push({ code: 'invalid_shape', message: 'candidate missing required fields or wrong kind/provenance' });
    return { valid: false, violations };
  }

  const text = joinCandidateText(candidate);

  if (matchesAny(text, CHAPTER_SCHEDULE_RE)) {
    violations.push({ code: 'plot_outline', message: 'reads as chapter/event schedule, not life-direction' });
  }
  if (matchesAny(text, FATE_ASSERTION_RE)) {
    violations.push({ code: 'fate_assertion', message: 'asserts predetermined outcome' });
  }
  if (matchesAny(text, PRESET_CHOICE_RE)) {
    violations.push({ code: 'preset_choice', message: 'prescribes character choice as decided fact' });
  }
  if (matchesAny(text, PLOT_EVENT_RE)) {
    violations.push({ code: 'manufactured_event', message: 'invents events to satisfy literary direction' });
  }
  if (candidate.must_include_events?.length) {
    violations.push({ code: 'must_include_events', message: 'forbidden must_include_events field present' });
  }
  if (candidate.predicted_outcome) {
    violations.push({ code: 'predicted_outcome', message: 'forbidden predicted_outcome field present' });
  }
  if (candidate.literary_score != null || candidate.classicness != null) {
    violations.push({ code: 'literary_scoring', message: 'forbidden scoring fields present' });
  }

  const dirLen = String(candidate.direction || '').replace(/\s/g, '').length;
  if (dirLen < 40) {
    violations.push({ code: 'direction_too_short', message: 'direction prose too short for life-direction granularity' });
  }

  for (const constraint of hardConstraints) {
    const c = String(constraint).trim();
    if (!c) continue;
    // Simple keyword negation: "不得/不能/禁止 X" → reject if direction contains X as assertion
    const neg = c.match(/^(?:不得|不能|禁止|不可)\s*(.+)$/u);
    if (neg) {
      const forbidden = neg[1].trim();
      if (forbidden && text.includes(forbidden)) {
        violations.push({ code: 'hard_constraint', message: `violates: ${c}` });
      }
    }
  }

  return { valid: violations.length === 0, violations };
}

/**
 * @param {object[]} candidates
 * @param {string[]} hardConstraints
 */
export function filterRouteCandidates(candidates = [], hardConstraints = []) {
  const results = [];
  const valid = [];
  const invalid = [];

  for (const candidate of candidates) {
    const evalResult = evaluateRouteCandidate(candidate, hardConstraints);
    const entry = {
      id: candidate.id,
      valid: evalResult.valid,
      violations: evalResult.violations,
      candidate,
    };
    results.push(entry);
    if (evalResult.valid) valid.push(candidate);
    else invalid.push(entry);
  }

  return {
    results,
    valid,
    invalid,
    count: {
      in: candidates.length,
      valid: valid.length,
      invalid: invalid.length,
      expected_min: CANDIDATE_COUNT.min,
    },
  };
}
