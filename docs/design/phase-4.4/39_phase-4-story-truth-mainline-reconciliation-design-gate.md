# 39 — Story-Truth Mainline Reconciliation Design Gate

```text
MODE: DESIGN GATE · READ-ONLY ARCHAEOLOGY · NO CODE
EO: EO-4.4-STORY-TRUTH-MAINLINE-RECONCILIATION-DESIGN-GATE

CODE CHANGED: NO
SCHEMA / GOLDEN / SPEC / FIXTURES: UNCHANGED
CHOICE / CANDIDATE OPTION / L2 / L1 MOUNT: NOT AUTHORIZED
PHASE 5 = FROZEN · PHASE 6 = NOT STARTED · PHASE 7 = NOT STARTED
AA20 = SEALED

UPSTREAM (PASS → STOP chain):
  #35 Character Choice Necessity     = NOT PROVEN
  #36 Attribution Consumer           = SOFT WRITE + REGISTRY-ONLY (READ ABSENT)
  #37 SR Production Consumer         = NOMINAL CONSUMER ONLY
  #38 State Evolution Consumer       = NOMINAL (+ openLoops STORAGE ONLY)
```

**This Gate is not another consumer hunt.**

It builds the **Story-Truth survival map** of what actually reaches the next round of story generation after prose is produced.

**Discipline:** file ≠ loaded ≠ consumed ≠ effective ≠ authority. Roadmap ≠ implementation. Missing link ≠ automatic module.

---

## 1. Executive Verdict

```text
39 = PASS

CURRENT STORY-TRUTH MAINLINE =
  Plan/Intent (+ prior Anchor)
    → Writer Context (Canon soft + prior-scene Actual/OC + nominal SR)
    → Writer → Prose
    → Actual (HARD)
    → parallel: SR soft-write · Attribution soft-write · (chapter-end) State Evolution
    → Persistence (Canon / Anchor / sidecars)
    → NEXT: same-chapter soft continuity STRONG; cross-chapter via Anchor HARD + Canon SOFT

PROVEN CLOSED =
  Prose → Actual (required)
  Chapter N → N+1 Anchor → Planner constraints (ops continuity)
  Same-chapter prior Actual / Observed Continuity → Writer Context (soft, high priority)

PARTIALLY CLOSED =
  Actual → Canon timeline / 08 → next Writer soft fuel
  Actual → SR → same-chapter Writer Context (nominal)

NOMINAL =
  Character SR (Writer fuel; no hard branch)
  State Evolution Canon slices (08 / timeline as prompt)
  Attribution (write locus only)

STORAGE ONLY =
  Attribution Registry (no production read)
  evolution.openLoops / worldHints
  Character SR cross-chapter (no ch_N → ch_N+1 load)

ABSENT =
  Character Choice production object / consumer
  Attribution → next generation
  Open Loop → Story Survival consumer
  Director ← Actual / State / SR / Attribution
  Unified Character State Authority

FROZEN =
  Phase 5 Consequence
  Phase 6 Story Survival (not started)
  Phase 7 Actual-driven Director (not started)
  D1 Reality / Authority contract surface

IRREPLACEABLE GAP = NOT PROVEN
```

```text
CODE CHANGED = NO
SCHEMA CHANGED = NO
GOLDEN CHANGED = NO
SPEC CHANGED = NO
FIXTURES CHANGED = NO
CHOICE = NOT AUTHORIZED
CANDIDATE OPTION = NOT AUTHORIZED
L2 = NOT ENTERED
L1 PRODUCTION MOUNT = NOT AUTHORIZED
PHASE 5 = FROZEN
PHASE 6 = NOT STARTED
PHASE 7 = NOT STARTED
STOP
```

---

## 2. Verified production skeleton (code, not diagram)

```text
[Chapter start]
  loadPriorChapterAnchor(N-1)           [orchestrator / planner]     HARD-ish ops
  planChapter / authored plan → intent
  Director layers → scene plan / execution fuel                     narrative control
       ↓
  brain loader → ctx (08, 11, facts, stateBoard, characters, …)
       ↓
[Scene k]
  buildDynamicPrompt = compileScenePrompt(ctx, scene)
    · prior scene Actual / Observed Continuity (same chapter)
    · 08 / timeline / facts (soft)
    · character_sr (nominal; same-chapter sidecar)
  buildSceneWritePrompt → Writer LLM
       ↓
  Prose
       ↓
  ensureActualEvents                    HARD (empty Actual fails)
  applyCharacterSRAfterActual           SOFT (sidecar + scene attach)
  applyAttributionAfterActual           SOFT (Registry write; no read)
       ↓
[Chapter end]
  evolveFromChapter / buildStateDiff
  enrichAttributionAfterStateDiff       SOFT
  MemoryUnit.commit
    · chapters/*.md
    · states/ch_N.json (+ evolution blob)
    · states/ch_N_anchor.yaml
    · Canon 11 / 08 (facts[] from Evolution)
```

Forbidden as evidence for this Gate: roadmap spines, architecture wish-diagrams, “should consume.”

---

## 3. Story-Truth Survival Matrix (A–P)

Legend: **REAL** / **SOFT** / **NOMINAL** / **STORAGE** / **NOT FOUND** / **NOT AUTHORIZED** / **FROZEN**

| Item | Origin | Production | Storage | Next-stage reader | Effect class |
|------|--------|------------|---------|-------------------|--------------|
| **A. Actual Event** | Prose extract | HARD after write | scene JSON / intent.scenes; feeds Evolution | Same-ch: `compileScenePrompt` actual_events; Cross-ch: via timeline Canon | **SOFT** same-ch (strong fuel); timeline **SOFT** cross-ch |
| **B. World State** | Intent-shaped `08` + Living proposals + Canon | Evolution rebuilds `08` from intent; Living separate | `08_current_state.md`, Living prepare | Loader → Writer; Living Prepare next ch | **NOMINAL / SOFT**; not unified World Authority |
| **C. Character State** | No single Evolution Authority | Living proposals / cards / Anchor hints | Living / character files / Anchor edges | Scattered soft | **NOT FOUND** as one Story-Truth Authority |
| **D. Relationship State** | Anchor `deriveRelationshipState` (intent/Living) | Commit-time | Anchor YAML | Planner `applyAnchorConstraints` | **SOFT/ops** (demoted ≠ fact) |
| **E. Awareness** | Actual→SR (+ matrix/authored) | SR updater | `character_sr/ch_N.json` | Writer Context assembleMinimalSR | **NOMINAL** same-ch; **STORAGE** cross-ch |
| **F. Interpretation** | Authored / facing | SR | sidecar | Writer Context | **NOMINAL** if present |
| **G. Belief** | Authored | SR | sidecar | Writer Context | **NOMINAL** if present |
| **H. Stance** | Authored | SR | sidecar | Writer Context | **NOMINAL** if present |
| **I. Attribution** | Soft Gate after Actual | PASS/UNKNOWN/INVALID | Attribution Registry | **No production reader** (#36) | **STORAGE ONLY** |
| **J. Open Loop** | Actual `stateChanges` tags | Evolution collect | `states/ch_N.json` evolution.openLoops | **None** (#38) | **STORAGE ONLY** |
| **K. Timeline** | Actual→Evolution→11 | Commit | `11_timeline.yaml` | Loader → Writer ranked timeline | **SOFT CONTEXT** |
| **L. Location / Time** | Intent → `08` / Anchor | Commit | `08` + Anchor | Planner + Writer | **SOFT** + Anchor **ops constraint** |
| **M. Planned Direction** | Planner / Director / causal_chain fuel | Intent / prompts | plan artifacts | Writer / Director | **SOFT** narrative fuel (**≠** Actual/Choice) AA20 |
| **N. Character Choice** | — | — | — | — | **NOT AUTHORIZED / NOT PROVEN** (#35) |
| **O. Consequence** | — | — | — | — | **FROZEN** (Phase 5); do not rename stateChanges/timeline |
| **P. Story Survival / Obligation** | Diagram only | — | openLoops unused | — | **NOT FOUND / NOT STARTED** (Phase 6) |

---

## 4. Four kinds of “alive”

| Type | Meaning | What qualifies today |
|------|---------|----------------------|
| **A REAL PRODUCTION SURVIVAL** | Constrains / decides next generation | **Prior Anchor → Planner** (POV/location/date/forbidden openings/banned); **Actual required** before continue scene |
| **B SOFT CONTEXT SURVIVAL** | Enters prompt without deterministic authority | Prior Actual/OC; timeline; `08`; character cards; Plan fuel |
| **C STORAGE SURVIVAL** | Persisted, no production reader | Attribution Registry; evolution.openLoops/worldHints; SR across chapters |
| **D DEAD / LOST** | No reliable path | Choice object; Phase 5 Consequence Authority; Open-loop obligations; Director←Actual |

---

## 5. Mainline Graph (code-level arrows)

```text
                         ┌─ Attribution Registry ──────── STORAGE ONLY (#36)
                         │
PROSE
  │
  ▼
ACTUAL ──────────────────┼─ State Evolution ─┬─ 11 Timeline ── SOFT → Writer
  │                      │                   ├─ 08 State ──── SOFT → Writer / Planner fallback
  │                      │                   ├─ evolution.openLoops ── STORAGE ONLY
  │                      │                   └─ characterHints ── SOFT → Attribution only
  │                      │
  │                      └─ Character SR ──── NOMINAL → Writer (same chapter)
  │
  └─ Persistence
          │
          ├─ 11 Timeline .............. SOFT
          ├─ 08 State ................. SOFT / ops
          ├─ Anchor ................... REAL ops → Planner (N→N+1)
          ├─ SR sidecar ............... NOMINAL (intra-ch) / STORAGE (cross-ch)
          ├─ Attribution registry ..... STORAGE ONLY
          └─ states/ch_N.json ......... STORAGE (+ LivingPrepare sibling)
                    │
                    ▼
             NEXT PRODUCTION
```

Arrow grades:

| Edge | Grade |
|------|-------|
| Prose → Actual | **REAL** (hard requirement) |
| Actual → SR write | **REAL write** / **NOMINAL read** |
| Actual → Attribution write | **REAL write** / **ABSENT read** |
| Actual → Evolution → 11/08 | **SOFT** |
| Evolution → openLoops | **STORAGE ONLY** |
| Commit → Anchor → next Planner | **REAL** (ops continuity) |
| Prior scene Actual/OC → next Scene Writer | **SOFT** (strong) |
| Any → Choice / Phase 5 Consequence | **ABSENT / FROZEN** |
| Any → Director as Actual consumer | **ABSENT** |

---

## 6. Next Scene Survival (Scene N → N+1, same chapter)

| Signal | Enters Scene N+1? | How | Changes generation conditions? |
|--------|-------------------|-----|--------------------------------|
| Actual (prior scene) | **YES** | `resolvePreviousScenes` → `actual_events` module | **SOFT yes** (prompt fuel; high priority) |
| Observed Continuity | **YES** | `observed_continuity` (+ budget survival tail) | **SOFT yes** |
| Timeline | **YES** | ranked timeline from Canon | **SOFT** |
| State (`08` / diff) | **YES** | `state` / `state_diff` modules | **SOFT / NOMINAL** |
| SR | **YES if same-chapter sidecar** | `loadCharacterSRState` / scene attach | **NOMINAL** |
| Attribution | **NO** | — | — |
| OpenLoop | **NO** | — | — |
| Anchor | **N/A mid-chapter** | Anchor is chapter-boundary | — |
| Prior summaries / continuation | **YES** | compiler history modules | **SOFT** |

**What truly changes Scene N+1 conditions today:**  
prior prose continuity (Actual + OC + summaries) as **Writer soft context**; Plan/Director scene goals as **narrative control**; **not** Attribution/OpenLoop/Choice; SR only as soft fuel.

---

## 7. Cross-Chapter Survival (Chapter N → N+1)

| Capability | Persisted? | Loaded? | Consumed? | Effective? |
|------------|------------|---------|-----------|------------|
| Canon timeline | YES | YES (loader) | Writer soft | SOFT / unproven hard |
| `08` state | YES | YES | Writer + Planner fallback | SOFT / ops |
| Anchor | YES | YES (`loadPriorChapterAnchor`) | Planner `applyAnchorConstraints` | **YES (ops)** |
| SR | YES (ch_N file) | **NO** for ch_N+1 (loads ch_N+1 only) | — | **NO cross-ch** |
| Attribution | YES | **NO** production | — | **NO** |
| State Evolution blob | YES in states JSON | LivingPrepare only (not openLoops) | — | openLoops **NO** |
| OpenLoops | YES | **NO** | — | **NO** |
| Character State (unified) | fragmented | fragmented | soft | **NO Authority** |
| Relationship (Anchor) | YES | YES | Planner | ops hint |

```text
Cross-chapter REAL ops handoff = Anchor
Cross-chapter SOFT handoff = Canon 08 / 11
Cross-chapter STORAGE without handoff = SR file of N, Attribution, openLoops
```

---

## 8. Persistence → Authority ladder (mandatory separation)

```text
PERSISTENCE  →  READ  →  CONSUMPTION  →  EFFECT  →  AUTHORITY
```

Examples:

| Fact | Ladder |
|------|--------|
| Attribution PASS on disk | Persist YES → Read NO → stop |
| SR sidecar same chapter | Persist YES → Read YES → Consume as prompt → Effect unproven → Authority NO |
| Anchor forbidden openings | Persist YES → Read YES → Consume in Planner/intent → Effect on Scene1 constraints → Ops authority (≠ Reality Authority) |
| openLoops in states JSON | Persist YES → Read NO → stop |

---

## 9. Breakpoints (diagnose only)

| Chain | Status |
|-------|--------|
| Prose → Actual | **PROVEN CLOSED** |
| Actual → same-ch Writer (via Actual/OC modules) | **PARTIALLY CLOSED** (soft) |
| Actual → SR → same-ch Writer | **NOMINAL** |
| Actual → Attribution → anyone | **STORAGE ONLY** |
| Actual → Evolution → openLoops → Survival | **ABSENT** (storage then dead) |
| Actual → Evolution → 11/08 → Writer | **NOMINAL / SOFT** |
| Chapter commit → Anchor → next Planner | **PROVEN CLOSED** (ops) |
| Actual / State / SR → Director | **ABSENT** |
| Anything → Choice | **ABSENT / NOT PROVEN** |
| Anything → Phase 5 Consequence Authority | **FROZEN** |

**Sharpest Actual→next-gen break (semantic, not “file missing”):**  
Attribution and Open Loop are **produced and stored** but **do not re-enter** generation. SR **does not cross chapters**. Director is **not** Actual-driven.

---

## 10. Irreplaceable Gap Analysis

For each suspected missing ring:

| Suspected gap | A Real failure? | B Reproducible? | C Expressible today? | D Diagram-only? | E Needs new module? |
|---------------|-----------------|-----------------|----------------------|-----------------|---------------------|
| Choice object | NOT PROVEN | — | Actual+SR+State soft | Often yes | **NOT PROVEN** (#35) |
| Attribution reader | NOT PROVEN | Registry unread | Occurrence/Attribution as disk fact still writable | Partial | **NOT PROVEN** (#36) |
| SR hard / cross-ch | NOT PROVEN | Soft same-ch exists | Soft fuel + Actual | Partial | **NOT PROVEN** (#37) |
| OpenLoop → Survival | NOT PROVEN | Tags stored unused | Actual/OC soft continuity | **Yes** Phase 6 | **NOT PROVEN** (#38) |
| Director←Actual | NOT PROVEN | Phase 7 not started | Plan+Anchor ops | **Yes** | **NOT PROVEN** |

```text
IRREPLACEABLE GAP = NOT PROVEN
```

No sealed production-failure dossier in #35–#38 proves an inexpressible Story Truth that **requires** a new module now.

---

## 11. Mainline vs side channel vs legacy

| Channel | Class |
|---------|--------|
| Plan/Intent → Writer → Prose → Actual (HARD) | **MAINLINE** |
| Prior-scene Actual / Observed Continuity → next Scene Writer | **MAINLINE soft continuity** |
| MemoryUnit.commit → Anchor → next Planner | **MAINLINE ops continuity** |
| Canon 08 / 11 → Writer | **MAINLINE soft Canon** |
| Character SR write/read (same ch) | **PARALLEL SIDE CHANNEL** (nominal) |
| Attribution Registry | **STORAGE WITHOUT CONSUMER** |
| State Evolution openLoops / worldHints | **STORAGE WITHOUT CONSUMER** |
| Living Prepare / Living proposals | **PARALLEL / OPERATIONAL** (sibling of Evolution) |
| causal_chain / Desire / Situation / heroKnows | **LEGACY / OPERATIONAL narrative fuel** (≠ Actual/Choice/Attribution Authority) |
| L1 Observer | **TEST-ONLY side channel** |

---

## 12. Choice must not sneak in

| Path | Status |
|------|--------|
| Actual → Attribution → Choice | **NOT FOUND** |
| Actual → SR → Choice | **NOT FOUND** |
| Plan → Choice | Plan “choice” labels = narrative fuel ≠ Character Choice (#35 / AA20) |
| L1 → Choice | **FORBIDDEN** (R13); L1 test-only |

```text
CHARACTER CHOICE PRODUCTION = ABSENT / NOT PROVEN
```

Reconciliation does **not** authorize Choice.

---

## 13. Consequence must not sneak in

```text
Actual Action ≠ Consequence
stateChanges / worldHints / openLoops / timeline ≠ Phase 5 Consequence Authority
Phase 5 = FROZEN
```

---

## 14. Five mandatory answers

### Q1 — Truly closed Story-Truth chains?

```text
1) Prose → Actual (hard)
2) Same-chapter Actual/OC → next Scene Writer Context (soft)
3) Chapter commit → Anchor → next chapter Planner constraints (ops)
```

### Q2 — Soft context only?

```text
Canon 08 / timeline / facts (as ranked), character cards, Plan/Director fuel,
SR projection (same chapter), relationship Anchor hints
```

### Q3 — Storage only?

```text
Attribution Registry records
evolution.openLoops / worldHints
Character SR file of chapter N for chapter N+1 (not loaded)
```

### Q4 — Truly missing production capabilities (facts, not backlog)?

```text
· No production Attribution reader
· No Open Loop / Story Survival consumer
· No Actual-driven Director
· No Character Choice object (necessity unproven)
· No Phase 5 Consequence Authority
· No unified Character State Authority
· No SR cross-chapter handoff
```

### Q5 — Any missing capability proven irreplaceable?

```text
NO — IRREPLACEABLE GAP = NOT PROVEN
```

---

## 15. Final capability table

| Capability | Produced | Persisted | Read | Consumed | Effective | Authority |
|------------|:--------:|:---------:|:----:|:--------:|:---------:|:---------:|
| Actual | YES | YES | YES (soft) | YES (prompt) | SOFT | Occurrence (not Attribution/Choice) |
| World State | PARTIAL | YES (`08`/Living) | YES | SOFT | NOMINAL | NO unified |
| Character State | NO unified | fragmented | partial | soft | NO | NO |
| SR | YES | YES | same-ch YES / cross-ch NO | NOMINAL | unproven | NO (≠ Reality) |
| Attribution | YES soft | YES | NO prod | NO | NO | Mint locus only |
| Timeline | YES | YES | YES | SOFT | SOFT | Canon append ops |
| Anchor | YES | YES | YES | YES Planner | YES ops | Ops continuity ≠ Reality |
| Open Loop | tags YES | YES | NO | NO | NO | NO |
| Choice | NO | NO | NO | NO | NO | NOT PROVEN |
| Consequence | NO | NO | NO | NO | NO | FROZEN |
| Story Survival | NO | tags only | NO | NO | NO | NOT STARTED |

---

## 16. Final Verdict

```text
39 = PASS

CURRENT STORY-TRUTH MAINLINE =
  Intent(+Anchor) → Writer Context → Writer → Prose → Actual
  → [SR nominal || Attribution storage || Evolution→Canon soft]
  → Commit(Anchor REAL ops + Canon SOFT + sidecars STORAGE)

PROVEN CLOSED =
  Prose→Actual; Anchor→next Planner; same-ch Actual/OC→Writer soft

PARTIALLY CLOSED =
  Actual→Canon→Writer soft; Actual→SR→Writer nominal (intra-ch)

NOMINAL =
  SR; State Evolution Canon fuel

STORAGE ONLY =
  Attribution Registry; openLoops/worldHints; SR cross-chapter

ABSENT =
  Choice production; Attribution read; OpenLoop Survival; Director←Actual;
  unified Character State Authority

FROZEN =
  Phase 5 Consequence; Phase 6 Survival; Phase 7 Actual Director; D1 surface

IRREPLACEABLE GAP = NOT PROVEN
```

**PASS** = reconciliation complete; map is evidence-based.  
**Not a build order.**

---

## 17. Architecture implication (subtraction, not expansion)

```text
#35–#39 form a closed negative chain:

  Choice not proven necessary
  Attribution written, unread
  SR soft-read, not hard driver
  State Evolution soft + openLoops dead
  Mainline that actually moves the story today =
      Actual + Writer soft continuity + Anchor ops
```

Phase 4.4 may **further STOP** without inventing modules “to complete the diagram.”

Any future EO requires: **real failure → qualification → Design Gate → Named EO** — not reconciliation anxiety.

---

## 18. Explicit Non-Actions

```text
❌ Code / schema / golden / SPEC / fixtures
❌ New Consumer / Survival / Director / Choice / Candidate Option / L2
❌ L1 production mount
❌ Unfreeze Phase 5
❌ Patch SR / Attribution / State Evolution / Living “to close the map”
❌ Auto-enter implementation EO
```

---

## 19. Next step (Human only)

Authorized **only if Human issues a new EO**:

- Further Phase 4.4 **STOP / SEAL**, or  
- Failure Qualification on a **named reproducible production failure**, or  
- Separate Design Gate for a **proven** irreplaceable gap.

This document does **not** open those.

---

## 20. STOP

```text
CODE CHANGED = NO
SCHEMA CHANGED = NO
GOLDEN CHANGED = NO
SPEC CHANGED = NO
FIXTURES CHANGED = NO

CHOICE = NOT AUTHORIZED
CANDIDATE OPTION = NOT AUTHORIZED
L2 = NOT ENTERED
L1 PRODUCTION MOUNT = NOT AUTHORIZED

PHASE 5 = FROZEN
PHASE 6 = NOT STARTED
PHASE 7 = NOT STARTED

39 = PASS
IRREPLACEABLE GAP = NOT PROVEN
STOP
```

```text
The story that actually continues today is carried by
Actual + soft Writer continuity + Anchor ops —
not by Choice, Attribution readers, OpenLoop Survival, or Actual-driven Director.

Reconciliation complete. Not a build order.
```
