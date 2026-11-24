# Legacy Read Preference — EO-P7

**Status**: `BINDING`  
**EO**: `EO-P7`  
**Date**: 2026-09-03

**Not** data destruction. Legacy remains on disk and may be read.

```text
Legacy → read → historical / operational / evidence / eligibility
Legacy ↛ obtains / ¬obtains / Authority Act
confirmed / verified / immutable / accepted ↛ Authority Act
```

Sole obtains source remains EO-P6 `applyAuthorityAct`.

---

## Read-side dispositions

| Audit | Path | P7 action |
|-------|------|-----------|
| R-01 / R-08 | `loadBrainContext` 11/13/08/09 | Stamp `registered_legacy`; keep reading |
| R-03 / I-06 | Route `confirmed` | Keep field; eligibility ≠ obtains |
| R-04 / R-05 / I-07 | S6.3 `filterCanonicalTimelineEvents` | Writer eligibility ≠ obtains |
| R-06 | `checkKnowledge` / consistency vs facts | Epistemic qualification ≠ obtains |
| I-05 | `immutable` | Retention / ranking meta ≠ truth |
| I-02 | `accepted` | Unchanged workflow (EO-P1); not re-wrapped as Act |

---

## Labels retained (no rename)

`confirmed`, `verified`/`canonical` (S6.3 A-class), `immutable`, `accepted` — operational or eligibility meaning only.

---

## Explicit non-goals

```text
NO Authority Act edits
NO Subject / Operator Proxy edits
NO second Reality Status
NO auto-certify Legacy via Act
NO Canon/Memory architecture rewrite
NO TR-01 / W-04 / W-19
NO auto-start final VERIFY
```
