/**
 * EO-P3 — Operator Proxy semantics (W-10 / I-12)
 *
 * Binding (D1-C-1 / APPROVED §3):
 *   Authority Subject = Author
 *   Executor          = Operator (when Operator runs a tool)
 *
 * EO-P6: Authority Act exists as a *separate* module. This path (inkos post)
 * still does NOT execute an Act and does NOT produce obtains.
 *
 * @see golden/reality/d1-implementation-contract/OPERATOR-PROXY.md
 */

export const AUTHORITY_SUBJECT = 'Author';

/** Post path: Act not executed here (EO-P6 Act lives in authority-act.js). */
export const AUTHORITY_ACT_ON_POST = 'NOT_EXECUTED_ON_THIS_PATH';
export const CLAIM_LEVEL_AUTHORITY_ON_POST = 'NOT_THIS_PATH';
export const DELEGATION_RECORDING_ON_POST = 'NOT_IMPLEMENTED_ON_THIS_PATH';

/** @deprecated EO-P3 name; post path still does not run Act */
export const AUTHORITY_ACT_STATUS = AUTHORITY_ACT_ON_POST;
export const CLAIM_LEVEL_AUTHORITY = CLAIM_LEVEL_AUTHORITY_ON_POST;
export const DELEGATION_RECORDING_STATUS = DELEGATION_RECORDING_ON_POST;

export function stampOperatorCliPost(result = {}) {
  return {
    ...result,
    d1OperatorProxy: {
      eo: 'EO-P3',
      authoritySubject: AUTHORITY_SUBJECT,
      executor: 'Operator',
      operatorIsAuthoritySubject: false,
      authorityActExecuted: false,
      authorDelegationAssumed: false,
      authorDelegationRecording: DELEGATION_RECORDING_ON_POST,
      authorityAct: AUTHORITY_ACT_ON_POST,
      claimLevelAuthority: CLAIM_LEVEL_AUTHORITY_ON_POST,
      effectClass: 'operational_persistence_only',
      producesObtains: false,
      note: 'Execution ≠ Authority. Proxy ≠ prior Author authorization. post ↛ obtains (EO-P6). EO-TR-01: raw delta ↛ 11/13.',
    },
  };
}

export function assertOperatorProxyStamp(stamped) {
  const s = stamped?.d1OperatorProxy;
  if (!s) return { pass: false, detail: 'missing d1OperatorProxy stamp' };
  const pass = s.authoritySubject === 'Author'
    && s.executor === 'Operator'
    && s.operatorIsAuthoritySubject === false
    && s.authorityActExecuted === false
    && s.authorDelegationAssumed === false
    && s.producesObtains === false;
  return {
    pass,
    detail: pass ? 'Operator≠Subject; Execution≠obtains; no default delegation' : JSON.stringify(s),
  };
}
