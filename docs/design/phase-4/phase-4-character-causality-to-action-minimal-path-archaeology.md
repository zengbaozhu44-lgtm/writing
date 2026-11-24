# Phase 4 — Character Causality → Action Minimal Path Archaeology

```text
MODE: READ-ONLY ARCHAEOLOGY + MINIMAL IMPLEMENTATION DESIGN (design-only)
CODE / SCHEMA / PROMPT / GOLDEN / RUNTIME: UNCHANGED
NAMED EO: NONE
IMPLEMENTATION: NOT AUTHORIZED

UPSTREAM (frozen):
  Vertical slice FIRST BLOCKING GAP = SR → Writer (STORY CONTROL)
  OPEN-4 proposition PROVEN:
    Character X holds a character-attributable Action Intent whose content is Y
  Attribution = retrospective separate track · NOT elevated
  Choice / Candidate Option / Agency / Goal / L1 production / Consequence =
    remain OPEN · not required to complete for this archaeology
  #41 UNFIXED · H3.3 SEALED · no full Phase 4 redesign
```

**Goal:** Find the **minimal** bridge so production can continue  
`Character SR → Character Causality basis → Action realization`  
without returning to `SR → Prompt → Writer → Plan-directed Action`.

**Not the goal:** Complete Causality ontology · Choice Engine · Candidate Option · Agency · Goal · L1 mount · Consequence.

---

## A. 当前真实生产链

```text
StudioRuntimeOrchestrator._runScenesAndChapter
  → ensurePlanValidity (F8.3)
  → buildSceneWritePrompt / compile (incl. formatCharacterSRForPrompt)
  → createStudioLlmWriter → executeBeatSequence (RF-01)
  → scene.text = prose
  → ensureActualEvents(scene, { stripPlan: true })
  → applyCharacterSRAfterActual(...)          // Character SR
  → applyAttributionAfterActual(...)          // soft retrospective only
  → buildExecutionIntelligence / readerFeedback
  → [next scene] formatCharacterSRForPrompt → Writer again
```

**After `applyCharacterSRAfterActual` — exact next hops:**

| Order | Call | Role |
|-------|------|------|
| 1 | `applyAttributionAfterActual` | Soft retrospective Attribution; `choice: undefined` |
| 2 | `buildExecutionIntelligence` / reader loop | Writer metrics · STORY CONTROL adjacent |
| 3 | Next scene: `assembleMinimalSR` + `formatCharacterSRForPrompt` | SR → prompt lore |
| 4 | Writer / Beat plan (`deriveSceneChoice`, `beat.action`, goal, causal_chain) | Plan-/Director-directed Action realization |

**No production call** evaluates or asserts:

```text
Character X holds Action Intent(Y)
```

before the next Writer realization.

---

## B. 已经打通的链段

```text
Writer → Prose                         PASSED
Prose → Actual                         PASSED
Actual → Fact IB → Character SR        PASSED
Character SR → (legal Causality→Action)  NOT PASSED
```

Soft Attribution runs but stays on the **retrospective** track; it does not open a prospective Action path.

---

## C. FIRST TRUE BLOCKER

```text
FIRST TRUE BLOCKER:

Character SR
  → ████ no producer / no STORY TRUTH carrier / no consumer ████
  → Character Causality basis = Action Intent(Y)
  → Action realization (non-Plan Writer)

Location:
  Between applyCharacterSRAfterActual (and soft Attribution)
  and the next scene’s Writer / Beat realization.

Concrete absence:
  Nothing in production establishes or exposes
  “Character X holds character-attributable Action Intent(Y)”
  as STORY TRUTH for the Writer (or any non-Plan path) to realize.

Illegal-only continuation that exists today:
  Character SR → formatCharacterSRForPrompt → Writer
  (+ Plan / Director / Beat choice·action·goal)
  = Plan-/SR-as-prompt-directed Action realization
```

**STOP here.** No Consequence / Survival / Director pre-design.

---

## D. 是否存在可复用的现有 semantic basis

```text
REUSABLE AS OPEN-4 Action Intent(Y) BRIDGE: NO
```

Audited candidates (reuse-first; all **insufficient** or **wrong track**):

| Existing semantic | Where | Producer | Consumer | Why not minimal bridge |
|-------------------|-------|----------|----------|------------------------|
| Character SR (awareness/belief/stance/motive) | `character-sr-updater.js`, `minimal-sr.js` | Actual→IB→SR | `formatCharacterSRForPrompt` | SR ≠ Intent(Y); W4 forbids SR→Choice/Intent authority |
| Soft Attribution PASS + `actionDescription` | `attribution-wiring.js` / gate / registry | After Actual | **None on Writer spine** (`listAttributionRecords` unused by Writer) | Retrospective; PASS ≠ Choice; ≠ prospective Intent(Y) for *next* Action |
| `StoryEvent.intent` | `story-event.schema.js` / extractor | Sometimes hardcoded (e.g. open_choice template) | Continuity / event shape | Actual-layer field; Actual ↛ Intent/Choice authority (W2) |
| `open_choice` / `choice_settled` kinds | `event-extractor.js`, observed continuity | Prose heuristics | Continuity / Actual | Occurrence labels ≠ OPEN-4 Intent |
| `deriveSceneChoice` / `scene.choice` / Beat `choice`·`action` | `scene-execution.js`, beat plan | Plan / explicit authored | Beat Writer prompts | **STORY CONTROL** — Plan Choice ≠ Character Choice (R10) |
| `priorityGoal` / `scene.goal` / `mainGoal` / `actionLine` | Director / Planner / scene prompt | Plan | Writer | Goal/plan line ≠ Action Intent(Y) |
| GGC | H3.3 design only | N/A in runtime | N/A | GGC ≠ Intent ≠ Action; not a production carrier |
| observeL1 | `observe-l1.js` | test-only | tests | Not on spine; L1 VALID ↛ Intent mint |

```text
Character Causality basis
  ≠ Choice necessarily
  ≠ Candidate Option
  ≠ Goal / GGC
  ≠ Attribution
  ≠ Writer instruction
```

None of the above can be promoted without violating frozen walls.  
Absence of a complete Choice/Option/Agency ontology does **not** by itself block the report — the blocker is the **missing Intent(Y) STORY TRUTH carrier + consumer**, not missing full ontology.

---

## E. 如果存在：最小接法

```text
N/A — no reusable basis found.
```

---

## F. 如果不存在：最小新增 capability

**Not** an Engine. **Not** full Choice / Option / Agency / Goal design.

```text
MINIMAL NEW SEMANTIC CAPABILITY (capability name only):

  Establish and expose, as STORY TRUTH before Writer realization:

    Action Intent(Y) for Character X
    (OPEN-4 prospective proposition)

  such that Action realization can consume that basis
  instead of Plan / Director / SR-as-prompt alone.
```

**What this is:**

- A **carrier + authority-shaped assertability** of the already-PROVEN OPEN-4 proposition  
- Enough for the **main route** to continue past SR toward character-side Action realization  

**What this is not (remain OPEN):**

- Full Action Intent ontology  
- Choice object / Choice Engine  
- Candidate Option / Access / Agency stores  
- Goal Engine / GGC→Action  
- L1 production mount  
- Attribution elevation  
- Consequence / Survival / Director  

**Still UNKNOWN (acceptable):**

- Exact evidence recipe that may mint Intent(Y) without Plan/Writer/SR-alone/L1-alone  
- Whether Intent ≡ Choice  
- Whether Candidate Option is ever required  

---

## G. 对 OPEN-4 Action Intent 的关系

```text
OPEN-4 proposition:     PROVEN (semantic)
Production path for it: ABSENT (this archaeology)

Relation:
  The FIRST TRUE BLOCKER is not “OPEN-4 proposition unknown.”
  It is: no production establish/expose/consume path for that proposition
  between Character SR and Action realization.
```

---

## H. 是否需要 Design Gate

```text
YES — one minimal Design Gate
```

Required because: capability is named, but **authority/evidence basis** that may establish Intent(Y) as STORY TRUTH without illegal sole authorities remains OPEN (inherits prior OPEN-4 next question). Implementing a carrier without that Gate would risk Plan/Writer laundering into “Intent.”

---

## I. 唯一最小 Gate 问题

```text
ONE DESIGN QUESTION:

What is the minimal sealed authority/evidence basis that may establish
STORY TRUTH “Character X holds Action Intent(Y)” for production consumption
before Writer realization — without Plan, Director, Writer, Desire-alone,
GGC-alone, SR-alone, Actual-alone, Attribution PASS, or L1 VALID as sole
authority — and without requiring Choice Engine, Candidate Option, Agency
Engine, or Goal Engine to exist first?
```

---

## J. 完整 Phase 4 架构

```text
NOT PROVIDED (forbidden this round).
```

---

```text
ARCHAEOLOGY: COMPLETE FOR MINIMAL PATH CUT

FIRST TRUE BLOCKER: FOUND
  = no STORY TRUTH carrier/consumer for Action Intent(Y)
    between Character SR and Action realization

REUSABLE EXISTING BASIS: NO

MINIMAL NEW CAPABILITY:
  establish + expose Action Intent(Y) as STORY TRUTH pre-Writer
  (capability only · not Engine design)

OPEN-4 PROPOSITION: PROVEN / PATH ABSENT

DESIGN GATE: REQUIRED (one question · §I)

NAMED EO: NONE
CODE: NO CHANGES
SCHEMA: NO CHANGES
PROMPT: NO CHANGES
GOLDEN: NO CHANGES
RUNTIME: NO CHANGES
IMPLEMENTATION: NOT AUTHORIZED

STOP: YES
```
