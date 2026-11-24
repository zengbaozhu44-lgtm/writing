# Phase 4 — Minimal Character Action Bridge Design Gate

```text
MODE: DESIGN GATE · READ-ONLY · NO IMPLEMENTATION
UPSTREAM:
  EO-P4-Causal-Bridge-01 CLOSED (Intent Truth + Writer consume)
  Post-Intent archaeology: FIRST GAP = Intent → Character Action
  #08 UNFIXED · #35 Choice NOT PROVEN · Action Intent ≠ Choice

CODE CHANGED: NO
SCHEMA CHANGED: NO
PROMPT CHANGED: NO
RUNTIME CHANGED: NO
NAMED EO: NONE
IMPLEMENTATION: NOT AUTHORIZED
```

**Single question:**

> When Action Intent Truth(X,Y) exists and production later yields a corresponding Action occurrence, can a **minimal** semantic join them into Character Action STORY TRUTH — without Choice / Candidate Option / Agency / Goal?

**Focal fork (this Gate):**

```text
A. Character Action = Intent realized as Story Truth
     (Intent Truth + corresponding realization/occurrence)

B. Character Action = Occurrence after legal Attribution
     (Attribution PASS → Character Action)
```

---

## Semantic distinctions (binding)

| Term | Meaning | Not |
|------|---------|-----|
| **Action Intent Truth(X,Y)** | Prospective STORY TRUTH: X holds Intent whose content is Y (from CADE) | Choice |
| **Action occurrence** | Text-grounded StoryEvent from prose (`ensureActualEvents`) | Character Action authority |
| **Attribution** | Retrospective PASS/UNKNOWN/INVALID on TypedEvidence; `choice: undefined` | Choice; Character Action mint |
| **Character Action** | Character-attributable Action as Causality STORY TRUTH (this gap) | Occurrence alone; Writer authority; Plan beat action |

```text
Action occurrence ≠ Character Action
Action Intent Truth ≠ Choice
Attribution ≠ Choice
Attribution PASS ≠ Character Action
Writer prose “X did Y” ≠ Character Action authority
```

---

## Existing production chain (Intent present)

```text
Action Intent Truth(X,Y) asserted
  → Writer consume (prompt cue only)
  → prose (realization surface)
  → ensureActualEvents
  → Action occurrence (StoryEvent)
  → [NO Character Action record]
  → soft Attribution (parallel; does not read Intent; does not mint Character Action)
```

**Reusable today:** Intent Truth · Writer consume-only · Actual occurrence · soft Attribution (retrospective only).

**Not reusable as Character Action:** Plan/Beat action · Director · Desire · GGC · SR · L1 · Attribution PASS alone · raw prose.

---

## Fork verdict

### B — Attribution-primary — REJECTED for this minimal bridge

| Reason | |
|--------|--|
| User freeze I | Attribution PASS ≠ Character Action |
| No Intent input | Attribution Gate does not consume Action Intent Truth |
| Over-strong | PASS requires prose agency cues; many Intent-realizations lack deliberation markers → false UNKNOWN |
| Wrong track | Retrospective attributability ≠ prospective Intent realization |
| #08 risk | Elevating PASS→Character Action without Intent reopens occurrence-laundering patterns |

Attribution may **corroborate** later; it must **not** be required sole authority for the minimal bridge.

### A — Intent-realization correspondence — ACCEPTED as minimal bridge shape

Contract already sketches (v0.2 §8, not implemented as Character Action):

```text
[OPEN-4 Action Intent] → Writer (realization) → Prose → Actual
```

EO-P4 already authorized Writer to **realize** Y when Intent is asserted.  
What is missing is only the **STORY TRUTH join** that records: this occurrence is the realization of Intent(X,Y), hence Character Action — without minting Choice.

```text
Does NOT require Choice / Candidate Option / Agency / Goal.
BLOCKED BY EXISTING PHASE-4 CONTRACT: NO
```

---

## Output (required format)

```text
CURRENT ROUTE:

Intent Truth
↓
Character Action
↓
Consequence
↓
Actual
↓
State
↓
SR

EXISTING:
  · Action Intent Truth(X,Y) (CADE → Truth; Writer consume-only)
  · Writer realization prose (evidence surface; ≠ Truth authority)
  · Action occurrence via ensureActualEvents (StoryEvent)
  · Soft Attribution Gate/Registry (retrospective; choice:undefined)
  · No Character Action STORY TRUTH carrier/producer today

FIRST MINIMAL GAP:
  No STORY TRUTH join that asserts Character Action from
  (Action Intent Truth(X,Y) asserted
   + corresponding Action occurrence for X realizing Y).
  Occurrence alone and Attribution PASS alone are forbidden stand-ins.

CAN REUSE:
  · Action Intent Truth as necessary prospective authority input
  · Matching Action occurrence as necessary realization evidence input
  · Fail-closed correspondence check (characterId + Y-content alignment
    against occurrence.action / evidence excerpt — design-level;
    no LLM mint; no Plan fill)
  · Optional later: Attribution PASS as corroboration only (not required)

CANNOT REUSE / MUST NOT PROMOTE:
  · Action occurrence alone → Character Action
  · Writer prose alone → Character Action
  · Plan / Director / Beat action → Character Action
  · Attribution PASS alone → Character Action
  · SR / Desire / GGC / L1 → Character Action
  · Character Action → Choice (#35 remains NOT PROVEN)

MINIMAL BRIDGE:

  Action Intent Truth(X,Y) [asserted]
          +
  corresponding Action occurrence (X, content aligns with Y)
          ↓
  Character Action STORY TRUTH
          (Intent-realization record; isChoice: false)

  Ontology stance (this Gate):
  Character Action = Intent realized as Story Truth
  (Option A), not Attribution-minted occurrence (Option B).

INPUT:
  1. actionIntentTruth.status === asserted
     characterId = X, actionContent = Y
  2. one or more scene.actualEvents candidates where
     actor includes X and action/excerpt corresponds to Y
  (Absent either input → Character Action absent / not asserted)

OUTPUT:
  Character Action Truth (minimal):
    characterId, actionContent (Y),
    intentRef, occurrenceRef,
    status: asserted | absent,
    isChoice: false
  Does not output Choice / options / agency / goal.

AUTHORITY / PROVENANCE:
  May establish:
    only a dedicated Intent→Occurrence correspondence producer
    when Intent Truth is already asserted (CADE provenance chain intact)
  Must not establish:
    Writer, Plan, Director, Beat, Desire, GGC, SR-alone,
    Actual-alone, Attribution PASS-alone, L1 VALID
  Provenance label (design):
    character_action_from_intent_realization
    (cites intentRef + occurrenceRef)

CARRIER / STORE:
  Beside SR and beside Actual — scene/chapter sidecar or scene field
  (e.g. scene.characterActionTruth), parallel to actionIntentTruth.
  Not SR.intent / SR.choice / Actual field mutation that redefines occurrence.
  No evidence graph / lifecycle / scores.

WRITER ROLE:
  Realization layer only: may narrate Y when Intent asserted;
  supplies prose that may ground occurrence;
  never mints Character Action / Intent / CADE / Choice.

ACTUAL ROLE:
  Supplies Action occurrence candidates (text-grounded StoryEvents).
  Occurrence remains occurrence.
  Character Action cites occurrenceRef; does not replace or redefine Actual.
  Vertical Truth Route unchanged: prose → ensureActualEvents stays as-is.

ATTRIBUTION ROLE:
  Separate retrospective track.
  Does not participate as required input to the minimal bridge.
  Attribution PASS must not auto-create Character Action.
  Future optional corroboration only — out of this Gate’s implementation scope.

CONSEQUENCE:
  When Character Action is asserted, the main route may proceed to ask
  “what Consequence follows from this Character Action?”
  This Gate does NOT design Consequence / World Consequence / Survival.
  When Character Action is absent, Consequence-from-Character-Action
  remains unavailable (Plan Beat consequence stays STORY CONTROL only).

CONTRACT CONFLICT:
  NONE for this minimal Intent-realization bridge.
  Conflicts would arise if:
    occurrence alone / Attribution PASS alone / Writer alone
    were treated as Character Action — those are REJECTED here.
  #08 remains UNFIXED for paths without Intent Truth
    (known limitation; not closed by this Gate).

REQUIRED NEW ONTOLOGY:
  Character Action STORY TRUTH (minimal Intent-realization record only)
  — one inevitable named semantic for the gap.
  NOT: Choice · Candidate Option · Agency · Goal · Consequence Engine ·
       Action Engine · Authority Framework.

CODE CHANGED: NO
SCHEMA CHANGED: NO
PROMPT CHANGED: NO
RUNTIME CHANGED: NO
NAMED EO: NONE

STOP: YES
```

---

## Explicit non-claims

```text
≠ Choice Engine
≠ closing #08 for Intent-absent paths
≠ Consequence design
≠ requiring Attribution PASS
≠ equating Character Action with Choice
≠ new Design Gate recursion beyond this wall
```

```text
DESIGN GATE COMPLETE
MINIMAL BRIDGE: FEASIBLE (Intent-realization correspondence)
BLOCKED BY CHOICE/OPTION/AGENCY/GOAL: NO
IMPLEMENTATION: NOT AUTHORIZED (await Human Named EO if any)
STOP: YES
```
