# Dual BLOCK A — Interpretation Block (EO-P1)

**Status**: `BINDING`  
**EO**: `EO-P1`  
**Date**: 2026-09-03  
**Upstream**: `APPROVED.md` §5 / §8 · `TRANSITIONAL-AUDIT.md` §3 · Plan P1

This document **forbids wrong interpretations**. It does **not** invent Authority data models, Reality Status enums, or Claim schemas.

---

## Binding invariants

```text
Persistence ≠ Reality Status
Validation ≠ obtains
Acceptance ≠ obtains
Commit ≠ obtains
Inference ≠ fact / obtains
Narrative = evidence only (≠ Authority / obtains)
Subject = Author (Operator post alone ≠ Authority)
Legacy disk ≠ re-authenticated Reality
```

**CLAIM-LEVEL-AUTHORITY via Dual BLOCK A paths = NOT IMPLEMENTED** still holds.  
EO-P6 adds a **separate** minimal Act module (`AUTHORITY-ACT.md`) as the sole obtains source — not via commit/accept/validate/post/inference.


EO-P1 explicit ban: **NO new realityStatus** / obtains schema / Authority API.

---

## Absolute ban (Dual BLOCK A)

Do **not** interpret:

| Forbidden equation | Correct transitional reading |
|--------------------|------------------------------|
| plan = obtains | Plan / intent = direction or registration residue |
| validation = obtains | Qualification only |
| accept / accepted = obtains | Workflow unlock + artifact retention |
| commit = obtains | Operational / registration persistence |
| confirmed = obtains | Route projection **eligibility** |
| verified = obtains | S6.3 / morphology **eligibility** |
| immutable = obtains | Retention policy |
| authored = Authority Act | Source classification |
| post alone = Authority | Executor may be Operator; Subject = Author |
| narrative presence = obtains | Evidence / provenance only |
| delete / rollback = ¬obtains | Storage ops; Revocation ≠ ¬obtains (C-6) |
| disk presence = obtains | registered_legacy / provisional at most |

---

## Audit I-* dispositions (EO-P1)

| ID | Path | Disposition |
|----|------|-------------|
| I-01 | commit success ⇒ world true | **CUT** interpretation |
| I-02 | accept / accepted ⇒ all Claims obtain | **CUT** |
| I-03 | validation.pass ⇒ obtains | **CUT** |
| I-04 | consistency.pass ⇒ obtains | **CUT** |
| I-05 | immutable ⇒ established truth | **CUT** → retention |
| I-06 | Route confirmed ⇒ obtains | **CUT** → eligibility |
| I-07 | S6.3 verified ⇒ obtains | **CUT** → eligibility |
| I-08 | authored ⇒ Authority Act | **CUT** → provenance |
| I-09 | UI「入库」⇒ Reality confirmation | **CUT** → workflow |
| I-10 | Narrative presence ⇒ obtains | **CUT** |
| I-11 | Narrative as evidence | **KEEP** (COMPATIBLE) |
| I-12 | Operator post ⇒ Authority Subject | **CUT** (EO-P3: Executor=Operator, Subject=Author; Act NOT IMPLEMENTED) |
| I-13 | delete/rollback ⇒ ¬obtains | **CUT** |

| Related | Path | Disposition |
|---------|------|-------------|
| R-01 as obtains | loadBrainContext disk as truth | **CUT** obtains reading; provisional read OK |
| R-03…R-06 | confirmed / verified / ranking / knowledge | **MIGRATE** meaning (no rename) |
| W-09 as obtains | 08 board as world Reality | **CUT** obtains reading; ops board KEEP |
| Inference as fact | inferWorldAfter / scene outcome as obtains | **CUT** interpretation (P4 may demote prompts) |

---

## Explicit non-goals (EO-P1)

```text
NO realityStatus field / obtains column / Authority API
NO rename confirmed | verified | immutable | accepted | authored
NO Legacy migration that re-labels rows as obtains
NO W-04 foreshadow→12 write stop
NO Authority Act design (P5) or implementation (P6)
```

---

## VERIFY pointer

Machine checklist: `INTERPRETATION-BLOCK.json`  
Runner: `node scripts/test-eo-p1-interpretation-block.js`

---

*Interpretation only. Correct Authority comes later under named EO after P5.*
