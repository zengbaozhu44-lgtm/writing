# Phase 1 Story Validation (observation only)

**Status**: `AUTHORIZED` as quality observation · **NOT** an implementation EO  
**Prerequisite**: Phase 1 Minimal SR = **ACCEPTED / FROZEN**  
**Date**: 2026-09-04  

---

## Current freeze (binding)

```text
D1 Reality Authority     → Semantic Core CLOSED · Runtime partial · FROZEN_STOP
Minimal SR               → Phase 1 IMPLEMENTED · ACCEPTED · FROZEN
Phase 1.1                → NOT EXIST
Phase 2 Scene Causality  → DESIGN APPROVED · NOT AUTHORIZED · NOT STARTED
```

Chain that must stay clean:

```text
Existing Evidence / State
        ↓
Minimal SR View
        ↓
Character Subjective State
        ↓
Prompt
        ↓
Writer
```

Must **not** grow into:

```text
SR → Persistence → Character Brain → Planner → Choice → Canon
```

---

## Purpose

Answer one question only:

> **Does Minimal SR make the novel better?**

Not: can SR be more theoretically complete?

Do **not** add SR fields, persistence, Planner/Choice wiring, or Phase 2 code during this phase.

---

## Observe only these four

1. **Information boundary** — Writer lets character know what they should not  
2. **Character continuity** — after a major beat, next scene still feels like the same person  
3. **Contradiction retention** — love+anger / leave+stay / suspect+uncertain not force-resolved  
4. **Action reasonableness** — next action grows from Awareness / Stance / Motive / Affect  

---

## Verdict standard (no metrics system, no new Validator)

Only two outcomes:

```text
PASS
```

or

```text
REAL FAILURE
```

### PASS

The four axes are good enough that Minimal SR has done its job for this stage.  
**Do not change.** Do not invent Phase 1.1. Do not auto-start Phase 2.

### REAL FAILURE

Must answer:

> **Why did the Writer write wrong?**

Valid example:

> “Because it did not know the character already knew X last scene.”  
> → may justify a **named** Awareness fix with that case as evidence.

Invalid (not design grounds):

> “Feels like the character should be more complex.”  
> → **not** a REAL FAILURE · **not** a reason to add fields.

No scorecards. No automated quality engine. Case notes only.

---

## Method (suggested, optional)

1. One V4 book; **≥3 consecutive scenes**.  
2. Prefer Studio Writer; optional CLI check for shared lore path.  
3. Keep the `Character Subjective State` block + prose excerpts for each scene.  
4. Mark each axis PASS or REAL FAILURE with a one-line **why**.  

---

## Outcomes → next EO (human only)

| Finding | Next |
|---------|------|
| **PASS** | Keep SR frozen · **不改** |
| REAL FAILURE with specific missing evidence | Named **Phase 1.1** only if authorized with that case |
| Stable “action → world unchanged” after SR helps character | Authorize **Phase 2 Scene Causality** |
| SR unused / harmful | STOP + REPORT · do not expand SR |

---

## Hard bans

```text
NO Phase 1.1 “to be complete”
NO SR persistence / sidecar
NO Character Brain
NO SR → Planner / Choice / L1
NO Phase 2 until human authorizes after REAL FAILURE / causality need
NO D1 reopen
NO Validator / metrics product for this observation
```

---

## Operating principle

> Not what the system *can* do — only what the story *needs*, proven by real failure.

**Stop. Let the mirror run. No failure → no change.**
