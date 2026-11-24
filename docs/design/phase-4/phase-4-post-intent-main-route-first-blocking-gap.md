# Phase 4 — Post-Intent Main Route First Blocking Gap

```text
MODE: READ-ONLY ARCHAEOLOGY · TOTAL-ROUTE PRIORITY
EO-P4-Causal-Bridge-01: CLOSED (PASS WITH KNOWN LIMITATIONS)
#08: UNFIXED (do not close)
#35 Choice: NOT PROVEN (frozen)
Action Intent ≠ Choice

CODE CHANGED: NO
DESIGN: NO
IMPLEMENTATION: NO
NAMED EO: NONE
```

**Start point (proven):**

```text
Character SR ∥ CADE → Action Intent Truth(X,Y) → Writer consume (prompt)
```

**Question:** From Intent Truth, walking

```text
Action → Consequence → Actual → State → SR
```

where is the **first** true main-route blocker?

---

## Brief hop audit (stop at first wall)

### Intent Truth → Character Action

| Check | Result |
|-------|--------|
| Legal **Character Action** semantic (≠ occurrence)? | **ABSENT** |
| Producer from Action Intent Truth(X,Y)? | **ABSENT** |
| Intent → Action STORY TRUTH link? | **ABSENT** |
| What exists instead? | Writer prompt consume → prose → `ensureActualEvents` → **Action occurrence** |

```text
Action occurrence (StoryEvent.kind ≈ action / speech / …)
  ≠
Character Action (character-attributable action under Causality)
```

Frozen walls already forbid treating Writer prose “X did Y” as Character Action / Choice authority (#08; W1/W2; R8/R9).

Soft Attribution remains retrospective and does not mint Character Action from Intent.

**→ FIRST BLOCKING GAP is here. STOP. Downstream not expanded.**

### Downstream (not walked as blockers — past the cut)

| Hop | Status (sketch only) |
|-----|----------------------|
| Action → Consequence | Plan/Beat `consequence` = STORY CONTROL prediction; no World Consequence from Character Action |
| Consequence → Actual | `ensureActualEvents` from prose exists (occurrence); D1 Plan↛Fact preserved on that path |
| Actual → State | `evolveFromChapter` / Actual→timeline exists |
| State → SR | Actual→IB→SR exists; State→SR not required for SR update today |

---

## Verdict block

```text
CURRENT ROUTE:

Intent Truth
 ↓
████ FIRST BLOCKING GAP ████
 ↓
Character Action          ← ABSENT (as Causality STORY TRUTH)
 ↓
Consequence               ← not reached this cut
 ↓
Actual                    ← occurrence path exists; not Character Action
 ↓
State
 ↓
SR

FIRST BLOCKING GAP:
  Action Intent Truth(X,Y)
    → Character Action
  (no producer / no STORY TRUTH carrier that records
   character-attributable Action driven by Intent Truth;
   production only has Writer prose → Action occurrence)

WHY:
  Main route requires Character Causality → Character Action
  before Consequence / Actual-as-character-causal-fact.
  Intent Truth is consumable by Writer as realization cue only.
  Writer prose + ensureActualEvents yield Action occurrence,
  which is frozen as ≠ Character Action authority.
  Without Intent→Character Action, the route cannot legally
  continue as Character Causality; it falls back to the
  known #08 occurrence path (limitation; not fixed here).

EXISTING SEMANTIC:
  · Action Intent Truth (EO-P4-Causal-Bridge-01) — proven upstream
  · Writer consume-only prompt block — realization cue, not Action mint
  · StoryEvent / ensureActualEvents — Action occurrence
  · Soft Attribution — retrospective; ≠ Character Action from Intent
  · Beat/Plan consequence — STORY CONTROL; not this cut’s reuse target

MISSING SEMANTIC:
  Character Action as STORY TRUTH
  legally driven by Action Intent Truth(X,Y)
  (distinct from Action occurrence / Writer prose / Plan beat action)

REUSE POSSIBILITY:
  NO safe reuse of occurrence / Attribution / Beat action
  as Character Action without violating frozen walls.
  (Do not design the Action object in this archaeology.)

CONTRACT CONFLICT:
  NONE for reporting this gap.
  Elevating occurrence→Character Action would CONFLICT (#08 / W2 / R8).

CODE CHANGED:
NO

DESIGN:
NO

IMPLEMENTATION:
NO

STOP:
YES
```
