# 07 — Unique Authority Attack #04

```text
PHASE 4.4 UNIQUE AUTHORITY ATTACK #04

TARGET: Final Design Gate Contract Seal (06_final-design-gate.md)
MODE: Second-Authority hunt · Semantic reconstruction of system fact
CODE / GOLDEN / v0.2: NO CHANGES
DESIGN PATCH THIS ROUND: NO (attack only)
```

**Question:**

> After FG-1/2/3 seal, is there **any second place** that can mint  
> Attribution-equivalent system fact (“C performed X as subject”)  
> without writing the Attribution Registry via Gate PASS?

**Loop under test:**

```text
Evidence → Gate → PASS → Attribution Record
  → Causal History (projection)
  → Future Context
  → Writer
  → Occurrence
  → Evidence
```

Ask whether State / SR / Situation / Actual / Timeline / Hints / Writer Context / Historical Attribution can become a **hidden second Authority**.

---

## 0. Executive verdict

```text
STATUS: PASS WITH KNOWN LIMITATIONS

Licensed second Authority under Final Design Gate text: NONE FOUND

Residuals (block Human Seal / Implementation, not licensed mint):
  - Registry not implemented (enforceability OPEN)
  - Evidence Contract typing not runtime-enforced
  - Live characterHints still Attribution-shaped bytes
  - Writer Context packaging discipline not coded

PHASE 4.4 CONTRACT SEAL: ELIGIBLE FOR HUMAN REVIEW
HUMAN SEAL: NOT AUTO-ISSUED
IMPLEMENTATION: BLOCKED
PHASE 5: FROZEN
```

---

## Attack matrix — second Authority candidates

| Store / path | Can mint Attribution-equivalent system fact under FG seal? | Why |
|--------------|--------------------------------------------------------------|-----|
| **State / StateDiff** | **NO** | AA16: evidence only; alone ↛ fact; no Authority |
| **SR** | **NO** | AA19: ≠ Causal History Authority; no auto 做过/决定 |
| **Situation** | **NO** | AA20: context ≠ certificate / Evidence Authority |
| **Actual / Timeline** | **NO** | Occurrence only; FG-2 forbids as Attribution truth |
| **characterHints** | **NO** as mint | AA17 + FG-3: hint / Evidence only; not Attribution object |
| **Writer Context** | **NO** | May carry refs; must not invent Registry PASS (FG-2) |
| **Character Causal History** | **NO** as mint | Projection of Registry PASS only — not independent Authority |
| **Historical Attribution PASS** | **NO** for *current* t | Evidence of past; ↛ auto PASS at t1 (A5/AA10) |
| **L1 VALID** | **NO** | Optional Evidence; ≠ Attribution Authority |
| **Plan/Desire/Pressure** | **NO** | Forbidden Gate Evidence (FG-1) |
| **Shadow confidence scores** | **NO** | AA21 explicitly forbids |
| **Attribution Registry via Gate** | **YES — sole** | FG-2 unique locus |

---

## Loop integrity test

| Step | Legal? | Second mint risk? |
|------|--------|-------------------|
| Evidence → Gate | YES under FG-1 | No if typed provenance |
| Gate → PASS | YES | Sole mint |
| PASS → Attribution Record | YES | Authority locus |
| Record → Causal History | YES as **projection** | Risk if History writes without Record — **FORBIDDEN** by FG-2 |
| History → Future Context | YES as **reference** | Risk if Context asserts PASS absent Record — **FORBIDDEN** |
| Context → Writer | YES fuel / refs | Writer ↛ Authority |
| Writer → Occurrence | YES | Occurrence ↛ Attribution |
| Occurrence → Evidence | YES | Re-enters Gate; no auto PASS (AA21) |

**Densification along the loop:** AA21 forbids UNKNOWN×N → PASS.  
Re-entering Evidence does **not** raise status without new Gate adjudication at *t*.

| Result | **BLOCKED** second Authority in sealed loop |
| Residual | Context must not *display* “PASS” unless Registry says so — packaging rule for impl |

---

## Specific second-Authority traps

### Trap A — History as Authority

```text
Causal History “Alice left” without Registry row
```

| Under FG-2 | **FORBIDDEN** — History is projection only |
| Status | **BLOCKED** |

### Trap B — SR as Authority

```text
SR “我做过离开” written from Occurrence without Gate
```

| Under AA19 / FG-2 | **FORBIDDEN** |
| Status | **BLOCKED** |

### Trap C — Hints as Authority

```text
characterHints → Causal History / Phase 5 / silent PASS
```

| Under FG-3 | **FORBIDDEN**; Gate-as-Evidence only with provenance |
| Status | **BLOCKED** (contract) · runtime residual HIGH |

### Trap D — State as Authority

```text
location history → system “performed leave”
```

| Under AA16 | **FORBIDDEN** alone; Gate evidence OK |
| Status | **BLOCKED** |

### Trap E — Dual Registry

```text
Gate PASS + parallel Actual.attribution=true + SR.did=true
```

| Under FG-2 | **FORBIDDEN** architecture |
| Status | **BLOCKED** by seal text |

### Trap F — LLM Gate without Evidence Contract

```text
all context → LLM → PASS
```

| Under FG-1 | **FORBIDDEN** pattern |
| Status | **BLOCKED** |

### Trap G — Historical PASS laundering

```text
PASS(t0) → Context → treat as PASS(t1) without Gate
```

| Under A5 / AA10 | **FORBIDDEN** |
| Status | **BLOCKED** |

### Trap H — Choice conflation

```text
Attribution PASS → Chosen Action system fact
```

| Ontology | Attributed ≠ Chosen |
| Status | **BLOCKED** |

---

## PASS criteria (Human)

| Criterion | Met? |
|-----------|------|
| No second licensed Authority in contract | **YES** |
| Unique locus defined | **YES** (FG-2) |
| Evidence roles defined | **YES** (FG-1) |
| AA16–21 + hint consumers sealed | **YES** (FG-3) |
| Loop cannot densify without Gate | **YES** (AA21 + FG-2) |
| Implementation enforces seal | **NO** — Known Limitation |
| Human Seal issued | **NO** |

---

## Known Limitations

1. Contract Seal ≠ runtime Seal.  
2. `characterHints` live shape still dangerous until consumer walls coded.  
3. Evidence Contract needs impl typing (tags/provenance).  
4. Registry file/schema OPEN.

These are **enforceability** gaps, not approved second Authorities in the design text.

---

## Relationship to Human Seal

```text
#04 PASS WITH KNOWN LIMITATIONS
  → Phase 4.4 Final Design Gate CONTRACT is ready for Human review
  → Human may issue: PHASE 4.4 DESIGN GATE APPROVED
  → Only then Implementation of Registry + Gate + consumer walls
  → Phase 5 remains FROZEN until 4.4 implementation readiness separately decided
```

**Do not** auto-claim full Phase 4 Human Seal (Choice + Attribution + …).  
**Do not** start Phase 5.

---

## Final verdict

```text
PHASE 4.4 UNIQUE AUTHORITY ATTACK #04

STATUS:
PASS WITH KNOWN LIMITATIONS

CODE CHANGED:
NO

GOLDEN SPEC CHANGED:
NO

v0.2 CHANGED:
NO

SECOND AUTHORITY (LICENSED):
NONE

CONTRACT SEAL (FG-1/2/3):
READY FOR HUMAN REVIEW

IMPLEMENTATION:
BLOCKED

HUMAN SEAL:
NOT ISSUED

PHASE 5 / NARRATIVE ATTENTION:
FROZEN
```

**One line:**

> Under the Final Design Gate text, only Attribution Gate → Attribution Registry may mint Attribution-equivalent system facts; State/SR/Situation/Actual/Hints/History/Context are sealed as non-Authorities — enforceability remains open until implementation.
