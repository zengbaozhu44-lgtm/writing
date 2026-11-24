/**
 * EO-TR-01 — Operator / raw delta ↛ 11 / 13
 *
 * Does not change Authority Act, Subject/Executor, or Dual BLOCK philosophy.
 * Operational persistence (08/07/09/…) may continue; timeline/facts from
 * Operator raw delta must not become Reality-like Canon input.
 *
 * @see golden/reality/d1-implementation-contract/EO-TR-01.md
 */

/**
 * Strip Reality-like 11/13 carriers from an Operator / raw chapter delta.
 * Does not mutate the original object.
 *
 * @param {object} [delta]
 * @returns {{ operationalDelta: object, skippedRealityLike: object[] }}
 */
export function partitionOperatorRawDelta(delta = {}) {
  const operationalDelta = { ...delta };
  const skippedRealityLike = [];

  if (operationalDelta.timeline != null && operationalDelta.timeline !== false) {
    skippedRealityLike.push({
      carrier: '11_timeline',
      reason: 'TR-01: Operator/raw delta ↛ 11 (operational persistence ≠ Reality Authority)',
    });
    delete operationalDelta.timeline;
  }

  if (Array.isArray(operationalDelta.facts) && operationalDelta.facts.length > 0) {
    skippedRealityLike.push({
      carrier: '13_facts_db',
      reason: 'TR-01: Operator/raw delta ↛ 13 (operational persistence ≠ Reality Authority)',
    });
    delete operationalDelta.facts;
  }

  return { operationalDelta, skippedRealityLike };
}
