/**
 * EO-P7 — Legacy read preference (interpretation retirement)
 *
 * Disk 11/13/08 and labels confirmed / verified / immutable / accepted
 * remain readable operational / eligibility / retention material.
 * They do not produce obtains / Reality Authority.
 *
 * Does not delete Legacy data. Does not wrap labels as Authority Act.
 *
 * @see golden/reality/d1-implementation-contract/LEGACY-READ-PREFERENCE.md
 */

export function stampRegisteredLegacy(extra = {}) {
  return {
    eo: 'EO-P7',
    role: 'registered_legacy',
    producesObtains: false,
    isRealityAuthority: false,
    reCertifiedAsReality: false,
    note: 'Legacy readable as provisional/historical/operational; ≠ obtains.',
    ...extra,
  };
}

/** Labels kept; meaning demoted. */
export function stampEligibilityLabel(label, extra = {}) {
  return {
    eo: 'EO-P7',
    label,
    role: 'read_eligibility_or_retention',
    producesObtains: false,
    isRealityAuthority: false,
    note: `${label} kept as operational/eligibility/retention ≠ obtains / Authority Act`,
    ...extra,
  };
}

export function assertLegacyReadDoesNotObtain(stamped) {
  const d = stamped?.d1LegacyReadPreference;
  if (!d) return { pass: false, detail: 'missing d1LegacyReadPreference' };
  const pass = d.producesObtains === false
    && d.isRealityAuthority === false
    && d.reCertifiedAsReality !== true;
  return { pass, detail: pass ? `legacy read=${d.role}` : JSON.stringify(d) };
}
