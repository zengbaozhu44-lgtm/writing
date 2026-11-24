# Phase 4 — Minimal Consequence Entry Archaeology

```text
MODE: READ-ONLY · MINIMAL ENTRY GATE
UPSTREAM:
  EO-P4-Character-Action-Bridge-01 = PASS WITH KNOWN LIMITATIONS / CLOSED
  Post-Character-Action archaeology = FIRST GAP Character Action → Consequence
  Choice NOT PROVEN · Phase 5 NOT started as whole
CODE / SCHEMA / DESIGN OF CONSEQUENCE ONTOLOGY / IMPLEMENTATION: NONE
```

**Only question:**

> After Character Action Truth exists, does the system currently have any **legal** mechanism for the world to change **because of that Character Action**?

**Not this Gate:** what a “good” Consequence is · Consequence Engine · Phase 5 full design · Choice.

---

## 1. Does anything read Character Action Truth?

```text
NO production consumer for Consequence / World Change.
```

| Location | Behavior |
|----------|----------|
| `attachCharacterActionTruth` | writes `scene.characterActionTruth` |
| Studio Writer / Runtime Orchestrator | attach + copy to `intent.scenes[]` |
| Prompt / State / Survival / Director | **do not read** |
| `evolveFromChapter` / `buildStateDiff` / MemoryUnit | **do not read** |

```text
Character Action Truth(X,Y)
        ↓
        █ NO READER █
        ↓
World Consequence
```

---

## 2. Existing “consequence-shaped” code — classification

| Artifact | Kind | Legal as Character Action → World Consequence? |
|----------|------|--------------------------------------------------|
| Plan / scene / Beat `consequence` · cost · EXPECTED | **STORY CONTROL** prediction / Writer guidance | **NO** |
| `causal_chain.consequence` | Authorial outcome constraint | **NO** |
| Writer prose aftermath language | Realization / evidence surface | **NO** (alone) |
| `StoryEvent.consequence` / `stateChanges` | Fields on **Actual occurrence** (text-grounded extract) | Occurrence annotation — **≠** Character Action Consequence authority |
| Attribution `consequence: undefined` | Explicitly unused | **NO** |

---

## 3. World Consequence producer from Character Action?

```text
ABSENT
```

No module takes `characterActionTruth` (or Character Action) and produces a World Consequence / world-change STORY TRUTH.

---

## 4. Can Actual / State already carry “world change” — but unhooked?

| Mechanism | Exists? | Input today | Hooked to Character Action? |
|-----------|---------|-------------|------------------------------|
| `ensureActualEvents` | YES | prose | NO (occurrence only) |
| `evolveFromChapter` → timeline / `worldHints` from `stateChanges` | YES | **Actual occurrence** | **NO** |
| MemoryUnit `buildStateDiff` | YES | Evolution from Actual | **NO** |
| Actual → IB → Character SR | YES | Actual | **NO** (not Consequence) |

```text
EXISTING PARALLEL PATH (legal for occurrence→State, not Character Action→Consequence):

  prose → Actual occurrence → evolveFromChapter → State/timeline

MISSING LINK:

  Character Action Truth → (world change / Consequence) → …
```

So: State Evolution **exists**, but its causality input is **occurrence**, not Character Action. There is **no** dormant “Character Action → World Change” path waiting to be wired — only an occurrence-driven path that must not be silently relabeled as Character Action Consequence.

---

## 5. Minimal gap / minimal bridge feasibility (report only)

```text
FIRST MINIMUM GAP:
  No legal entry that consumes Character Action Truth
  and establishes World Consequence / world change
  attributable to that Character Action.
```

```text
MINIMAL BRIDGE (feasibility note only — NOT designed / NOT authorized):
  In principle, a thin Character Action → World Consequence entry
  might later exist without a full Consequence Engine —
  IF AND ONLY IF Human later seals what that entry asserts.
  This Gate does NOT define fields, ontology, or Engine.
```

```text
DO NOT:
  invent Consequence Engine
  invent schema
  promote Plan/Beat consequence
  promote occurrence.stateChanges as Character Action Consequence
  reopen Choice
  start Phase 5 wholesale
```

---

## Final block

```text
CURRENT ROUTE:

Character Action Truth(X,Y)
        ↓
        ?
        ↓
World Consequence

READS CHARACTER ACTION TRUTH FOR WORLD CHANGE:
NO

WORLD CONSEQUENCE PRODUCER (FROM CHARACTER ACTION):
ABSENT

PLAN/BEAT CONSEQUENCE:
STORY CONTROL ONLY

OCCURRENCE / StoryEvent.consequence|stateChanges:
ACTUAL OCCURRENCE ANNOTATION ONLY
≠ Character Action → World Consequence

STATE EVOLUTION:
EXISTS (Actual → timeline / hints)
DOES NOT CONSUME Character Action Truth
MISSING: Character Action → Consequence input

DORMANT Character Action → World Change PATH WAITING TO WIRE:
NO

FIRST BLOCKING GAP / FIRST MINIMUM GAP:
Character Action Truth → World Consequence
(no consumer · no legal producer)

CAN MINIMAL BRIDGE EXIST WITHOUT FULL ENGINE:
NOT PROVEN THIS ROUND (feasibility open; design NOT performed)

CONTRACT CONFLICT:
NONE for reporting the gap
(promoting Plan/occurrence as Causality Consequence WOULD conflict)

CODE CHANGED: NO
SCHEMA CHANGED: NO
DESIGN OF CONSEQUENCE: NO
NAMED EO: NONE
IMPLEMENTATION: NOT AUTHORIZED
PHASE 5: NOT STARTED
CHOICE: NOT REOPENED

STOP: YES
```
