# Authority Act — EO-P6 Minimal Implementation

**Status**: `BINDING` (implementation)  
**EO**: `EO-P6`  
**Date**: 2026-09-03  
**Upstream**: `d1-sealed/SPEC.md` · `APPROVED.md` §1–§3 · `AUTHORITY-ACT-DESIGN-GATE.md`

This is **not** a Reality Engine. It is the unique semantic source of `obtains` / `¬obtains`.

---

## Recoverable properties (Contract §1)

| Property | Implementation |
|----------|----------------|
| Subject | Always `Author`; Operator as Subject → refuse |
| Executor | `Author` or `Operator` |
| Operator auth | `explicit && prior && traceable && assumed === false` + recoverable `trace` / `authorizationRef` |
| Semantic function | `kind: adjudication` → polarity per SoA; `kind: revocation` → clear prior Act |
| Target Set | Finite `[{ claim, soa, polarity }]` from Act content only |
| Polarity | `obtains` **or** `not_obtains` (not both; not a third value) |
| Non-identity | Not invoked by commit / accept / validate / post |
| Conflict (C-5) | Opposite effective polarity on same `soa` → `AUTHORITY_CONFLICT`; no latest-wins |
| Revocation (C-6) | `producesObtains: false`, `assertsNotObtains: false` |

```text
Claim (pointer) + SoA (target) must both be present on each target.
Missing soa is refused — Claim is not silently identified with SoA (C-2).
Carrier-wide / inferred target expansion is refused (C-4).
```

---

## Sole obtains source

```text
sourceProducesObtains('authorityAct') === true
sourceProducesObtains(commit|accept|validate|post|write|inference|narrative|legacy) === false
```

Disk / Operator delta (TR-01) remains operational registration ≠ obtains.

---

## Explicit non-goals

```text
NO persist Act into 11/13
NO TR-01 quarantine
NO delegation recording service (inline trace only)
NO Dream / Flashback / Retcon
NO auto-start P7
```

---

## STOP / REPORT (this EO)

No D1 philosophy gap required filling. Engineering representation uses Contract §1 properties only.

UNKNOWN left open (not adjudicated here): NPC `15`, foreshadow `12` ontology, TR-01 write quarantine.

---

*Minimal Act. Dual BLOCK A still binds all non-Act paths.*
