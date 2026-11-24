# Phase 4 — Minimal Character Action → World Consequence Design Gate

```text
MODE: DESIGN GATE · READ-ONLY · NO IMPLEMENTATION
UPSTREAM:
  EO-P4-Character-Action-Bridge-01 = PASS WITH KNOWN LIMITATIONS
  Character Action Truth(X,Y) = IMPLEMENTED
  Minimal Consequence Entry Archaeology = NO reader / NO World Consequence producer
  Choice NOT PROVEN · Phase 5 NOT expanded

CODE CHANGED: NO
SCHEMA CHANGED: NO
IMPLEMENTATION: NOT AUTHORIZED
NAMED EO: NONE
```

**Only question:**

> What is the smallest legally grounded semantic bridge for  
> `Character Action Truth(X,Y) → World Consequence`  
> without promoting Plan/Beat/Writer/prose/occurrence/stateChanges/Attribution/SR/Desire/Goal/Choice/L1?

**Not this Gate:** full Consequence ontology · “what makes a good Consequence” · Consequence Engine · Phase 5 wholesale · Choice.

---

## Binding distinctions

| | |
|--|--|
| Character Action ≠ World Consequence | Action attributable ≠ world changed |
| World Consequence ≠ Actual occurrence | Occurrence may evidence change; is not Consequence authority |
| World Consequence ≠ stateChanges alone | Annotation ≠ Causality Consequence mint |
| Plan/Beat consequence | STORY CONTROL only |
| Writer | May realize aftermath; cannot authorize World Consequence |
| No LLM mint | Fail-closed correspondence only |
| Choice | NOT PROVEN — not required for this bridge |

---

## Answers A–J

### A. Is Character Action Truth alone sufficient?

```text
NO
```

Character Action establishes that X performed Y under Intent-realization Causality.  
It does **not** by itself establish **what changed in the world** because of Y.  
Asserting World Consequence from Character Action alone would invent W (LLM/Plan risk).

### B. Minimum additional legally available evidence?

```text
Text-grounded world-change realization evidence
tied to the same Character Action’s occurrence chain
(from Actual StoryEvent fields already extracted — as EVIDENCE only)
```

Not Plan/Beat consequence. Not Writer intention. Not Attribution PASS. Not SR/Desire/Goal/Choice/L1.

### C. Can existing Actual world-change evidence serve as realization evidence?

```text
YES — as realization evidence only, never as sole authority.
```

Candidates already on the occurrence that Character Action cites (`occurrenceRef`):

- non-empty `StoryEvent.consequence` when text-grounded
- `stateChanges` entries that are **not** mere action-echo labels
  (e.g. reject sole `action:X:verb` restatements of Y)
- evidence excerpt aftermath grounded in `scene.text`

`evolveFromChapter` already maps occurrence `stateChanges` → `worldHints` for State — that proves Actual can *surface* change-shaped strings; it does **not** make them Character Action → World Consequence without this bridge.

### D. Minimum correspondence condition?

```text
Character Action Truth asserted (X, Y, occurrenceRef)
  +
world-change evidence W on/through that occurrence
  such that W is text-grounded AND not a mere restatement of Y
  AND fail-closed content alignment to that occurrence’s aftermath fields/excerpt
```

No LLM inference to invent W. No Plan fill of W.

### E. If correspondence impossible / evidence absent?

```text
World Consequence = absent (fail-closed).
Missing capability = World Consequence STORY TRUTH join
(Character Action + matching world-change realization evidence).
```

Do not invent W. Do not fall back to Plan/Beat consequence.

### F. Without full Consequence Engine?

```text
YES — thin bridge feasible (same pattern as Character Action Bridge).
NOT a Consequence Engine · NOT Phase 5 full design.
```

### G. Minimum Story Truth record?

```text
World Consequence Truth (minimal):
  status: asserted | absent
  characterActionRef
  characterId
  actionContent          # Y (cited; not redefined)
  worldChangeContent     # W (grounded)
  occurrenceRef
  provenance: character_action_world_consequence
  isChoice: false
```

No choiceId / optionId / agencyScore / goalId / lifecycle / evidenceGraph / authorityFramework.

### H. Where to live?

```text
Beside Actual and SR — e.g. scene.worldConsequenceTruth
(parallel to characterActionTruth / actionIntentTruth)
```

Do **not** mutate Actual event semantics. Do **not** write into SR slots. Do **not** redefine `ensureActualEvents` or State Evolution authority this Gate.

### I. Who may produce?

```text
Only a dedicated Character Action → World Consequence correspondence producer
when Character Action Truth is already asserted
and matching Actual world-change evidence exists.
```

Must **not** produce: Writer, Plan, Director, Beat, Desire, Goal, GGC, SR-alone, occurrence-alone, stateChanges-alone, Attribution PASS, L1, LLM.

### J. Fail closed when?

| Condition | Result |
|-----------|--------|
| Character Action absent / not asserted | absent |
| No occurrenceRef / occurrence missing | absent |
| No grounded world-change evidence W | absent |
| W is only action-echo of Y | absent |
| Content / character correspondence fails | absent |
| Sole input is Plan/Beat/Writer/Attribution/SR/… | refuse / absent |

---

## Required output block

```text
CURRENT ROUTE:

Character Action Truth(X,Y)
        ↓
World Consequence Truth (MISSING JOIN)
        ↓
(later: Actual/State consumers — OUT OF SCOPE this Gate)

FIRST MINIMAL SEMANTIC GAP:
  No STORY TRUTH join that asserts World Consequence from
  Character Action Truth + corresponding Actual world-change
  realization evidence.
  Character Action alone is insufficient.
  Plan/Beat/occurrence/stateChanges alone are forbidden stand-ins.

MINIMUM LEGAL INPUTS:
  1. characterActionTruth.status === asserted
     (X, Y, occurrenceRef, …)
  2. text-grounded world-change evidence W on that occurrence chain
     (consequence field and/or non-echo stateChanges and/or
      excerpt aftermath — evidence only)
  Absent either → World Consequence absent

MINIMUM LEGAL OUTPUT:
  World Consequence Truth
  { status, characterActionRef, characterId, actionContent,
    worldChangeContent, occurrenceRef, provenance, isChoice:false }

AUTHORITY / PROVENANCE:
  Authority: Character Action Truth (Causality) + correspondence producer
  Evidence: Actual world-change fields/excerpt (realization only)
  Provenance: character_action_world_consequence
  Forbidden sole authorities: Plan, Director, Beat, Writer,
    prose alone, occurrence alone, stateChanges alone,
    Attribution PASS, SR, Desire, Goal, Choice, L1, LLM

CORRESPONDENCE REQUIREMENT:
  Same occurrence chain as Character Action;
  W text-grounded;
  W ≠ mere restatement of action Y;
  fail-closed string/field alignment; no LLM mint

FAIL-CLOSED CONDITIONS:
  (see J)

CARRIER / STORE:
  scene.worldConsequenceTruth (or chapter sidecar beside CADE/Intent/Action)
  — not inside Actual payload as authority rewrite
  — not inside SR

WRITER ROLE:
  Realization only — may narrate aftermath that grounds W;
  never mints World Consequence / Character Action / Choice

ACTUAL ROLE:
  Supplies occurrence + text-grounded aftermath/stateChange/consequence
  fields as REALIZATION EVIDENCE candidates.
  Occurrence remains occurrence.
  ensureActualEvents semantics unchanged this Gate.

STATE ROLE:
  evolveFromChapter may later CONSUME World Consequence Truth
  (future EO) — NOT authorized here.
  Today State still runs from Actual occurrence only.
  This Gate does not modify State Evolution.

ATTRIBUTION ROLE:
  Not required. PASS must not mint World Consequence.
  Optional future corroboration only.

CONTRACT CONFLICT:
  NONE for this Intent-style correspondence bridge.
  Conflicts if Plan/Beat/occurrence/stateChanges alone mint Consequence.

CAN MINIMAL BRIDGE BE IMPLEMENTED?
  YES — without full Consequence Engine / without Choice /
  without Phase 5 wholesale — pending Human Named EO.
  Implementation NOT AUTHORIZED this round.

CODE CHANGED: NO
SCHEMA CHANGED: NO
IMPLEMENTATION: NOT AUTHORIZED
NAMED EO: NONE
STOP: YES
```

---

## Minimal bridge topology (design only)

```text
Character Action Truth(X,Y) [asserted]
        +
corresponding Actual world-change evidence W
        ↓
World Consequence Truth
        (isChoice: false)
```

```text
≠ Consequence Engine
≠ Plan consequence promotion
≠ occurrence → Consequence laundering
≠ Choice
≠ Phase 5 full design
```

```text
DESIGN GATE COMPLETE
MINIMAL BRIDGE: FEASIBLE
BLOCKED BY CHOICE / FULL PHASE 5: NO
STOP: YES
```
