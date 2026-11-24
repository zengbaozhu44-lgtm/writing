/**
 * Story Reality Golden Harness — schema-independent, no extractor.
 *
 * Phase 0.5+: builds the referee bench before the Reality Engine exists.
 * All prose fixtures are expected RED until evaluateRealityClaims is implemented.
 */

export const REALITY_ENGINE_IMPLEMENTED = false;

/** @typedef {'confirmed'|'unknown'|'ambiguous'|'conflict'|'rejected'|'candidate'} ClaimStatus */

/**
 * @param {string} prose
 * @returns {Promise<Record<string, { status: ClaimStatus, provenance?: string }>|null>}
 */
export async function evaluateRealityClaims(prose) {
  if (!REALITY_ENGINE_IMPLEMENTED) {
    return null;
  }
  throw new Error('Reality Engine stub: implement evaluateRealityClaims');
}

/**
 * @param {object} fixture
 * @param {Record<string, { status: ClaimStatus }>|null} actual
 */
export function compareExpected(actual, fixture) {
  const errors = [];
  const expected = fixture.expected || {};

  if (actual === null) {
    errors.push('ENGINE_NOT_IMPLEMENTED');
    return { pass: false, errors };
  }

  for (const [claim, spec] of Object.entries(expected)) {
    const got = actual[claim];
    if (!got) {
      errors.push(`${claim}: missing (expected status=${spec.status})`);
      continue;
    }
    if (got.status !== spec.status) {
      errors.push(`${claim}: got ${got.status}, expected ${spec.status}`);
    }
    if (spec.provenance && got.provenance !== spec.provenance) {
      errors.push(`${claim}: provenance got ${got.provenance != null ? got.provenance : '∅'}, expected ${spec.provenance}`);
    }
  }

  for (const forbidden of fixture.forbidden || []) {
    const got = actual[forbidden.claim];
    if (!got) continue;
    if (forbidden.status && got.status === forbidden.status) {
      errors.push(`FORBIDDEN: ${forbidden.claim} must not be ${forbidden.status}`);
    }
    if (forbidden.provenance && got.provenance === forbidden.provenance) {
      errors.push(`FORBIDDEN: ${forbidden.claim} must not have provenance=${forbidden.provenance}`);
    }
  }

  return { pass: errors.length === 0, errors };
}

/**
 * @param {object} fixture
 */
export async function runFixture(fixture) {
  if (fixture.kind === 'code-boundary') {
    if (fixture.assertion) {
      const { runWitness } = await import('./pollution-witnesses.js');
      const result = runWitness(fixture.assertion);
      return {
        id: fixture.id,
        pass: result.pass,
        errors: result.pass ? [] : [result.detail],
        category: fixture.category,
        expectedRed: false,
        witness: true,
        detail: result.detail,
        producer: result.producer,
        consumer: result.consumer,
      };
    }
    return {
      id: fixture.id,
      pass: false,
      errors: ['CODE_BOUNDARY_PENDING: ' + (fixture.pendingReason || fixture.description)],
      category: fixture.category,
      expectedRed: true,
    };
  }

  const actual = await evaluateRealityClaims(fixture.prose || '');
  const result = compareExpected(actual, fixture);
  return {
    id: fixture.id,
    pass: result.pass,
    errors: result.errors,
    category: fixture.category,
    expectedRed: !REALITY_ENGINE_IMPLEMENTED || !result.pass,
  };
}
