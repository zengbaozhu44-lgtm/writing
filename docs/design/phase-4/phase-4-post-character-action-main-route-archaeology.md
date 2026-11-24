# Phase 4 — Post Character Action Main-Route Archaeology

```text
MODE: READ-ONLY ARCHAEOLOGY · TOTAL-ROUTE PRIORITY
Character Action Bridge: IMPLEMENTED
Choice: NOT PROVEN (do not reopen)
CODE / DESIGN / NAMED EO: NONE
```

**Start:** `scene.characterActionTruth` on Studio/Runtime main path  
(after `ensureActualEvents` → `attachCharacterActionTruth`)

---

## Who reads `characterActionTruth`?

| Site | Role |
|------|------|
| `attachCharacterActionTruth` | **writer** |
| `studio-llm-writer.js` / `orchestrator.js` | attach + copy onto `intent.scenes[]` |
| Prompt / Consequence / State / SR | **NO consumer** |

```text
characterActionTruth
  → [no production reader for Consequence / World update]
```

---

## Verdict block

```text
CURRENT ROUTE

CHARACTER ACTION → ?

FIRST BLOCKING GAP
  Character Action Truth
    → Consequence
  (no producer, no consumer, no legal Character Action → World Consequence entry)

EXISTING LEGAL PATH
  NONE from characterActionTruth forward.
  Parallel (independent of Character Action):
    prose → ensureActualEvents → occurrence
      → applyCharacterSRAfterActual
      → evolveFromChapter / Actual→timeline (State Evolution from occurrence)
  That path does NOT consume Character Action Truth.

PLAN/BEAT CONSEQUENCE
  YES — STORY CONTROL only
  (scene-execution / beat-state / causal_chain.consequence /
   Writer V2 “EXPECTED” consequence hints)
  ≠ World Consequence from Character Action

OCCURRENCE
  YES — Actual occurrence only
  (StoryEvent via ensureActualEvents; text-grounded)
  ≠ Character Action; ≠ World Consequence authority

WORLD CONSEQUENCE
  NO legal producer from Character Action
  (no module reads characterActionTruth to emit world consequence)

STATE EVOLUTION
  YES — exists (evolveFromChapter / Actual→timeline)
  but input is Actual occurrence, NOT Character Action → Consequence
  Missing: Character Action → Consequence as Causality input to that path
  (do not redesign State here)

CONTRACT CONFLICT
  NONE for reporting this gap.
  Treating Plan/Beat consequence or occurrence.stateChanges
  as Character Action Consequence WOULD conflict
  (STORY CONTROL / occurrence ≠ Causality Consequence).

CODE CHANGED
NO

DESIGN CHANGED
NO

NAMED EO
NONE

STOP
YES
```
