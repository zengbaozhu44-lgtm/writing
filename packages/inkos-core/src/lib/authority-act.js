/**
 * EO-P6 — Minimal Authority Act
 *
 * Sole semantic producer of obtains / ¬obtains.
 * Does not wrap commit / accept / validate / post / inference / narrative / legacy.
 * Does not persist into 11/13. Does not close TR-01. Does not expand Target Set.
 *
 * Recoverable properties (Contract §1): Subject, Executor, semantic function,
 * Target Set, polarity, non-identity vs workflow, Conflict (C-5), Revocation (C-6).
 *
 * Operator executor requires explicit + prior + traceable authorization on the Act
 * input (inline trace). A separate authorization service is NOT invented here.
 * assumed === true → refuse (Proxy ≠ prior auth).
 *
 * @see golden/reality/d1-implementation-contract/AUTHORITY-ACT.md
 */

export const AUTHORITY_SUBJECT = 'Author';
export const CLAIM_LEVEL_AUTHORITY = 'MINIMAL_IMPLEMENTED';
export const AUTHORITY_ACT_MODULE = 'EO-P6';

const POLARITY = new Set(['obtains', 'not_obtains']);

export function createActRegistry() {
  return {
    acts: [],
    /** @type {Map<string, { actId: string, polarity: string, effective: boolean }>} */
    effectiveBySoa: new Map(),
  };
}

function refuse(code, detail = {}) {
  return {
    ok: false,
    refused: true,
    code,
    producesObtains: false,
    effects: [],
    conflict: null,
    authoritySubject: AUTHORITY_SUBJECT,
    ...detail,
  };
}

function recoverTargets(targetSet) {
  const recovered = [];
  for (const raw of targetSet) {
    const claim = String(raw?.claim || '').trim();
    const soa = String(raw?.soa || '').trim();
    if (!claim || !soa) {
      return { error: 'TARGET_REQUIRES_CLAIM_AND_SOA' };
    }
    recovered.push({
      claim,
      soa,
      polarity: raw?.polarity,
    });
  }
  return { recovered };
}

function operatorAuthorizationOk(authorization) {
  const a = authorization && typeof authorization === 'object' ? authorization : {};
  if (a.assumed === true) return { ok: false, code: 'DELEGATION_MUST_NOT_BE_ASSUMED' };
  if (a.assumed !== false) return { ok: false, code: 'DELEGATION_ASSUMED_FLAG_REQUIRED_FALSE' };
  if (a.explicit !== true || a.prior !== true || a.traceable !== true) {
    return { ok: false, code: 'OPERATOR_REQUIRES_EXPLICIT_PRIOR_TRACEABLE' };
  }
  const trace = String(a.trace || a.authorizationRef || '').trim();
  if (!trace) return { ok: false, code: 'TRACEABLE_REQUIRES_RECOVERABLE_REF' };
  return { ok: true, trace };
}

/**
 * Apply one Authority Act. Does not mutate Canon 11/13.
 *
 * @param {object} input
 * @param {object} [registry]
 */
export function applyAuthorityAct(input = {}, registry = createActRegistry()) {
  if (input.authoritySubject !== AUTHORITY_SUBJECT) {
    return refuse('SUBJECT_MUST_BE_AUTHOR', { givenSubject: input.authoritySubject ?? null });
  }
  if (input.authoritySubject === 'Operator') {
    return refuse('OPERATOR_CANNOT_BE_SUBJECT');
  }

  const executor = input.executor;
  if (executor !== 'Author' && executor !== 'Operator') {
    return refuse('EXECUTOR_MUST_BE_AUTHOR_OR_OPERATOR', { givenExecutor: executor ?? null });
  }

  let authorizationTrace = null;
  if (executor === 'Operator') {
    const auth = operatorAuthorizationOk(input.authorization);
    if (!auth.ok) return refuse(auth.code);
    authorizationTrace = auth.trace;
  }

  if (input.expandFromCarrier || input.chapterTargets || input.artifactWide === true) {
    return refuse('CARRIER_SCOPE_FORBIDDEN');
  }
  if (Array.isArray(input.inferredTargets) && input.inferredTargets.length) {
    return refuse('INFERENCE_EXPANSION_FORBIDDEN');
  }

  const kind = input.kind;
  if (kind !== 'adjudication' && kind !== 'revocation') {
    return refuse('KIND_MUST_BE_ADJUDICATION_OR_REVOCATION');
  }

  const targetSet = Array.isArray(input.targetSet) ? input.targetSet : [];
  if (targetSet.length === 0) return refuse('EMPTY_TARGET_SET');

  const recovered = recoverTargets(targetSet);
  if (recovered.error) return refuse(recovered.error);

  const actId = String(input.actId || `act_${registry.acts.length + 1}`);
  const baseRecord = {
    actId,
    eo: 'EO-P6',
    authoritySubject: AUTHORITY_SUBJECT,
    executor,
    kind,
    targetSet: recovered.recovered.map((t) => ({ claim: t.claim, soa: t.soa, polarity: t.polarity })),
    authorizationTrace,
    authorDelegationAssumed: false,
  };

  if (kind === 'revocation') {
    const cleared = [];
    for (const t of recovered.recovered) {
      const prev = registry.effectiveBySoa.get(t.soa);
      if (prev?.effective) {
        prev.effective = false;
        cleared.push({ soa: t.soa, clearedActId: prev.actId });
      }
    }
    const record = {
      ...baseRecord,
      semanticFunction: 'revocation',
      producesObtains: false,
      assertsNotObtains: false,
      note: 'Revocation ≠ ¬obtains (C-6).',
      cleared,
    };
    registry.acts.push(record);
    return {
      ok: true,
      refused: false,
      producesObtains: false,
      assertsNotObtains: false,
      conflict: null,
      effects: [],
      revocation: { cleared },
      act: record,
      registry,
    };
  }

  // adjudication
  for (const t of recovered.recovered) {
    if (!POLARITY.has(t.polarity)) {
      return refuse('POLARITY_MUST_BE_OBTAINS_OR_NOT_OBTAINS', { soa: t.soa });
    }
  }
  const soaSeen = new Set();
  for (const t of recovered.recovered) {
    if (soaSeen.has(t.soa)) return refuse('DUPLICATE_SOA_IN_TARGET_SET', { soa: t.soa });
    soaSeen.add(t.soa);
  }

  for (const t of recovered.recovered) {
    const prev = registry.effectiveBySoa.get(t.soa);
    if (prev?.effective && prev.polarity !== t.polarity) {
      return {
        ok: false,
        refused: false,
        code: 'AUTHORITY_CONFLICT',
        producesObtains: false,
        conflict: {
          soa: t.soa,
          existingActId: prev.actId,
          existingPolarity: prev.polarity,
          incomingPolarity: t.polarity,
          note: 'C-5: no automatic latest-wins; unresolved ≠ obtains=UNKNOWN.',
        },
        effects: [],
        act: null,
        registry,
      };
    }
  }

  const effects = recovered.recovered.map((t) => ({
    soa: t.soa,
    claim: t.claim,
    polarity: t.polarity,
    obtains: t.polarity === 'obtains',
    notObtains: t.polarity === 'not_obtains',
  }));

  const record = {
    ...baseRecord,
    semanticFunction: 'adjudication',
    producesObtains: effects.some((e) => e.obtains),
    effects,
  };
  registry.acts.push(record);
  for (const t of recovered.recovered) {
    registry.effectiveBySoa.set(t.soa, { actId, polarity: t.polarity, effective: true });
  }

  return {
    ok: true,
    refused: false,
    producesObtains: record.producesObtains,
    conflict: null,
    effects,
    act: record,
    registry,
  };
}

/** Non-Act production paths must never equal applyAuthorityAct. */
export const NON_ACT_SOURCES = [
  'commit',
  'accept',
  'validate',
  'post',
  'write',
  'inference',
  'narrative',
  'legacy',
  'applyPostChapter',
];

export function sourceProducesObtains(source) {
  return source === 'authorityAct';
}
