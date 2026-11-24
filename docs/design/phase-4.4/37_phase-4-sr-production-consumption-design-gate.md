# 37 — SR Production Consumption Design Gate

```text
MODE: DESIGN GATE · READ-ONLY ARCHAEOLOGY · NO CODE
EO: EO-4.4-SR-PRODUCTION-CONSUMPTION-DESIGN-GATE

CODE CHANGED: NO
SCHEMA / GOLDEN / SPEC / FIXTURES: UNCHANGED
CHOICE / CANDIDATE OPTION / L2 / L1 MOUNT: NOT ENTERED
ATTRIBUTION CONSUMER / PHASE 5: NOT OPENED
ROADMAP: UNTOUCHED

UPSTREAM (FROZEN):
  #35 Character Choice Necessity = NOT PROVEN
  #36 Attribution = SOFT WRITE + REGISTRY-ONLY (READ ABSENT)
  AA20 Writer Non-Certification = SEALED
  Phase 5 = FROZEN
  Occurrence ≠ Attribution ≠ Choice ≠ Consequence
  SR ≠ World Reality ≠ Actual ≠ Attribution ≠ Choice ≠ Consequence
```

**Single question:**

> Does Character SR(t+1) already have a **real, legal, production** consumer that actually enters subsequent Scene / Chapter story generation?

Not: design / implement an SR consumer · Choice · Director redesign · schema.

**Discipline (same as #35 / #36):** no consumer ≠ must build consumer. Prompt presence ≠ proven story effect.

---

## 1. SR Write Path

```text
Scene prose
  → ensureActualEvents (HARD)
  → applyCharacterSRAfterActual(bookDir, chapter, scene, { authoredCharacterSR? })
        → loadCharacterSRState(bookDir, chapter)     // same-chapter prior
        → updateCharacterSRFromActual({
             characterNames: pov ∪ present ∪ characters,
             scenes: [scene],
             authoredSR: intent.characterSR | authoredCharacterSR | characterFacing,
             prior
           })
        → scene.characterSRState = state
        → saveCharacterSRState(bookDir, chapter, state)
```

| Call site | File | Blocking? |
|-----------|------|-----------|
| Runtime scene write | `packages/inkos-runtime/src/pipeline/orchestrator.js` | Soft-fail except `SR_FORBIDDEN_SOURCE` |
| Studio writer | `packages/inkos-studio-server/src/studio-llm-writer.js` | Same |
| Chapter pipeline | — | **Does not** call `applyCharacterSRAfterActual` (SR is scene-time) |

**Core engine:** `packages/inkos-brain/src/character/character-sr-updater.js`

**Allowed write sources (as coded):**

| Source | Role |
|--------|------|
| Actual Events (+ IB access via `characterCanAccessActualEvent`) | Awareness / relevance (grounded excerpt/action) |
| Authored bags (`characterSR` / `authoredCharacterSR` / `characterFacing` / belief·stance·interpretation·awareness arrays) | Explicit subjective slots |
| Same-chapter `prior` sidecar | Retention across scenes in chapter |

**Explicitly refused as SR fact bags** (`FORBIDDEN_SR_FACT_SOURCES`):  
`causal_chain`, `situation.belief`, `desire.belief`, `living_brain`, `character_brains`, `heroKnows`, `informationGap`, beat/plan closing state, scene.goal, expected, writer_intention, context_ranking, reasoner.

**SR never writes:** Canon / timeline / facts / Actual (`meta.writes* = false`).

---

## 2. SR Storage / Persistence

| Item | Value |
|------|--------|
| Path | `novel/_system/brain/character_sr/ch_NNNN.json` |
| Shape | `{ version, engine, characters: { [name]: slots… }, meta, chapter, updatedAt }` |
| Per-character slots | `awareness`, `interpretation`, `belief`, `stance`, `relevance` (+ mutations) |
| Scene attach | `scene.characterSRState` (also copied onto `intent.scenes[]` target in orchestrator / studio-orchestrator) |
| Canon / Memory commit | **Not** part of MemoryUnit / StateDiff |

### Write-only? Overwrite? Bypass?

| Question | Finding |
|----------|---------|
| Write without persist? | Only if `!bookDir \|\| !chapter` — production callers pass both → **persists** |
| Overwritten later? | **YES** — each scene `saveCharacterSRState` rewrites the chapter file (merged with same-chapter prior) |
| Duplicate / legacy path? | **Projection path** `assembleMinimalSR` (knowledge matrix + authored + runtime merge) is a **read/assembly** path, not a second Authority writer. Living / heroKnows are **not** SR writers. |
| Cross-chapter prior load? | **NOT FOUND** — `loadCharacterSRState(bookDir, chapter)` loads **current chapter only**; no `chapter-1` carry |

---

## 3. SR Read API / Callers

| SR Consumer | File | Caller | Production / Test | Actual use |
|-------------|------|--------|-------------------|------------|
| `loadCharacterSRState` | `character-sr-updater.js` | `applyCharacterSRAfterActual` | Production (self-read) | Same-chapter prior merge before rewrite |
| `loadCharacterSRState` | `compiler.js` | `compileScenePrompt` | **Production** | Feed `ctx.characterSRRuntime` |
| `scene.characterSRState` | `compiler.js` | `compileScenePrompt` | **Production** | Overrides loaded sidecar if present |
| `assembleMinimalSR` + `formatCharacterSRForPrompt` | `minimal-sr.js` ← `compiler.js` | `compileScenePrompt` / `buildDynamicPrompt` | **Production** | Emit `character_sr` prompt module |
| `assembleMinimalSR` | `brain/loader.js` | Brain ctx load | Production (ctx hydrate) | Projection **without** loading `character_sr` sidecar |
| `applyAttributionAfterActual` | `attribution-wiring.js` | Runtime / Studio (after SR) | Production soft | SR slots → TypedEvidence only (`sufficientAlone` false) — **≠** story-gen consumer; see #36 |
| Studio provenance | `context-provenance.js` | Final-context viewer | **Inspection** | Tracks whether `character_sr` survived layers |
| Tests / golden | `test-character-sr.js`, phase1 / story-architecture runners | — | **Test** | Assertions / dump |

**Exports used in production generation path:**  
`loadCharacterSRState` + `assembleMinimalSR` + `formatCharacterSRForPrompt` via `compileScenePrompt` → `buildDynamicPrompt` → `buildSceneWritePrompt` (Runtime + Studio).

---

## 4. Production Consumer Map

| Layer | Reads Character SR runtime sidecar / `characterSRState`? |
|-------|----------------------------------------------------------|
| **Chapter Director** | **NO** |
| **Scene Director** | **NO** |
| **Planner / adaptive-planner** | **NO** |
| **Story Survival / Open Loop** | **NO** as SR consumer (`open_loop:*` is Actual/state-evolution string tagging, not SR) |
| **Writer Context (`compileScenePrompt`)** | **YES** — loads sidecar / scene state → formats into lore seed module `character_sr` |
| **Writer (indirect)** | **YES, soft** — receives prompt text that *may* include SR block (after further studio/runtime sealing & budget) |
| **Memory / Character State / evolveFromChapter** | **NO** — does not convert SR → future State authority |
| **Attribution Gate** | Soft evidence cite only — not next-Scene generation |

```text
Director / Planner / OpenLoop:  NO Character SR read
Writer Context:                 YES read → prompt fuel
Memory/State evolution:         NO SR→State authority bridge
```

---

## 5. Next Scene Consumption Trace

### A–G answers

| # | Question | Answer |
|---|----------|--------|
| A | Chapter Director reads SR? | **NO** |
| B | Scene Director reads SR? | **NO** |
| C | Planner reads SR? | **NO** |
| D | Story Survival / Open Loop reads SR? | **NO** |
| E | Writer Context reads SR? | **YES** (`compileScenePrompt`) |
| F | Writer gets SR via legal Context? | **YES, as projected prompt fuel** (AA20: context ≠ certificate) |
| G | Memory / Character State converts SR for future? | **NO** |

### Same-chapter vs cross-chapter

```text
WITHIN CHAPTER N:
  Scene k writes SR → ch_NNNN.json + scene.characterSRState
  Scene k+1 compileScenePrompt
       → loadCharacterSRState(N) and/or prior scene attach
       → character_sr module may enter dynamic lore
       → Writer prompt may contain updated Awareness/…

CROSS CHAPTER N → N+1:
  loadCharacterSRState(N+1) starts empty until N+1 first write
  No code found that copies ch_N SR into chapter N+1 generation
  ⇒ End-of-chapter SR(t+1) ↛ automatic next-chapter generation input
```

### Budget / sealing caveats

- `character_sr` priority **88**, category `character`, truncated to ≤800 tokens; **can be dropped or trimmed** by `applyAdaptiveBudget`.
- Studio provenance explicitly records `budget_trim` / layer survival for `character_sr`.
- Outer PromptCompiler sealing may further reshape lore; SR is **not** a P0/P1 absolute-protected Director block.

```text
SR saved  ≠  SR consumed
SR in a prompt module  ≠  proven hard story driver
(EO §3 explicit)
```

---

## 6. SR Story Effect

| Question | Finding |
|----------|---------|
| What does SR change in code? | Prompt **text content** (Awareness/Belief/… + IB rules); Attribution optional evidence; scene/sidecar fields |
| If SR changes, must next generation change? | **NOT PROVEN** — no hard branch; LLM soft influence only |
| If SR missing / empty, different production path? | **NO dedicated alternate path** — assemble still builds omit-slots + IB rules for named characters; runtime merge simply absent |
| True story input vs log? | **Writer-facing fuel + IB discipline text** — not Director authority; not State authority |
| Fake / nominal consumer? | **Risk YES** — read-into-prompt without proven causal effect on prose; trimmable |

```text
SR(t) → compileScenePrompt → (maybe) Writer LLM → future prose
         ↑
         soft / non-deterministic / budget-vulnerable
         no Director/Planner fork on SR status
```

Under EO §8 Case D:

```text
SR write → read → production context → no proven story-effect branch
⇒ NOMINAL CONSUMER / NO PROVEN STORY EFFECT
```

---

## 7. SR Pollution / Illegal Sources

| Path | Status | Notes |
|------|--------|-------|
| Living → SR | **NOT FOUND** | Living does not call SR updater; `living_brain` / `character_brains` on forbidden list |
| heroKnows → SR | **NOT FOUND** | Director `heroKnows` is InformationGap narrative fuel ≠ Character SR; forbidden as SR fact bag |
| Plan → SR | **FOUND (authored channel)** | `intent.characterSR` / `authoredCharacterSR` merged into authored bags. Not Plan *labels* as awareness, but **Plan-authored subjective fields can mint belief/stance/interpretation/awareness** if present on intent |
| causal_chain → SR | **NOT FOUND** | Forbidden; not wired |
| Writer prose → SR | **FOUND (by design, scoped)** | Prose → Actual → awareness/relevance for IB-accessible characters. Does **not** auto-mint belief/stance from prose |
| Writer Context → SR | **NOT FOUND** | Context is a reader of SR, not a writer |
| Authorial intention → SR | **FOUND** | Authored / `characterFacing` / intent SR bags |

```text
Writer prose → Actual → Awareness
  = designed grounded path
  ≠ automatic “Writer intention becomes character psychology Authority”

Plan / narrative intention → Character SR belief/stance
  = possible IF intent carries authoredCharacterSR fields
  = pollution risk channel (report only; no fix this EO)
```

AA20 remains: Writer Context fuel ≠ Attribution / Causal History / Choice certificate. SR-in-prompt does not upgrade to those.

---

## 8. Character Isolation

| Check | Finding |
|-------|---------|
| Per-`characterId` / name keys | **YES** — `characters[name]` blocks |
| Access gated by actors/affected/present | **YES** — `characterCanAccessActualEvent` |
| Cross-character awareness bleed | Present **witnesses** may gain awareness of same-scene events (intentional IB), not B’s belief slots |
| Shared mutable global SR | **NO** beyond chapter JSON object partitioned by name |
| Chapter accidental reuse | Same-chapter prior merge **keeps** other names; **cross-chapter reuse of prior file: NOT FOUND** |
| Fallback / default character | Names from pov/present/characters; empty → emptyCharacterSR per name. Knowledge matrix projection is **column-per-name** |

**Issues to report (no fix):**

1. Authored bags keyed only by exact name — typo / alias → silent miss or wrong block.  
2. Witness present list over-inclusion → extra Awareness (IB policy risk, not cross-belief mint).  
3. No cross-chapter SR continuity (isolation by chapter file, not a leak).

---

## 9. Actual / State / SR Boundary

| Edge | Status |
|------|--------|
| Actual → SR | **LEGAL** (primary Phase 3.2 path) |
| SR → Actual | **NOT FOUND** |
| SR → Canon | **NOT FOUND** |
| SR → Attribution | **FOUND as weak TypedEvidence only** — not Attribution Authority (#36) |
| SR → Choice | **NOT FOUND** |
| SR → Consequence | **NOT FOUND** (Phase 5 frozen) |
| SR → World Reality / State Authority | **NOT FOUND** — `isRealityAuthority: false` |

```text
SR ≠ World Reality
SR ≠ Actual
SR ≠ Attribution
SR ≠ Choice
SR ≠ Consequence
```

Belief/stance in SR must not be treated as Canon; no code path found that promotes them into Canon.

---

## 10. Write-without-Read Classification

| Case | Applies? |
|------|----------|
| A — write → real production consumer → future generation (proven) | **NO** (effect not proven) |
| B — write → store → no production read | **NO** (Writer Context does read) |
| C — write → read → debug/test only | **NO** (compile path is production) |
| D — write → read → production context → **no proven next-gen effect** | **YES** |

```text
WRITE-WITHOUT-READ?     NO (there is a Writer Context read)
HARD STORY DRIVER?      NOT PROVEN
CLASSIFICATION:

  Character SR =
    PRODUCTION WRITE (Actual → sidecar)
    + NOMINAL WRITER-CONTEXT CONSUMER (same-chapter, soft, trimmable)
    + NO Director / Planner / OpenLoop / State consumer
    + NO proven cross-chapter generation handoff
```

---

## 11. Irreplaceable Gap

> If SR is not hard-read by the next Scene’s decision engines, is there a **proven** irreplaceable semantic gap in current production quality?

```text
IRREPLACEABLE GAP (must force SR hard-consumer now)
  = NOT PROVEN
```

Rationale:

- No sealed production failure dossier in this EO showing “missing SR read caused inexpressible Story Truth.”  
- Theoretical desire (“SR should shape future behavior”) ≠ PROVEN gap (#35/#36 discipline).  
- Soft Writer fuel already exists; absence of Director SR-read is an architecture fact, not automatic backlog.

---

## 12. Final Verdict

```text
SR PRODUCTION CONSUMPTION VERDICT:

  NOMINAL CONSUMER ONLY

  · Production write: PRESENT (Runtime + Studio after Actual)
  · Production read:  PRESENT (compileScenePrompt → character_sr module)
  · Hard consumer (Director / Planner / OpenLoop / State): ABSENT
  · Proven story-effect causal chain: NOT PROVEN
  · Cross-chapter SR → next chapter: NOT FOUND
  · Illegal SR → Choice / Canon / Actual: NOT FOUND
  · Force new SR Consumer module: NOT PROVEN
```

```text
PASS → STOP
```

**PASS** = archaeology complete; single question answered.  
**STOP** = do not implement SR→Director/Writer redesign / Choice / Attribution consumer from this Gate.

---

## 13. Next-Step Recommendation

Per Human route after #35/#36:

```text
[1] Attribution Consumer     DONE (#36) → ABSENT read
[2] SR Production Consumer   DONE (#37) → NOMINAL ONLY
        │
        ▼
[3] State Evolution Consumer Audit
        EO-4.4-STATE-EVOLUTION-CONSUMER-DESIGN-GATE
        (READ-ONLY · NO CODE · NO auto-fix)
        │
        ▼
[4] Story-Truth Mainline Reconciliation
```

**Do not open from this Gate:**

```text
❌ SR Consumer implementation EO
❌ Director must-read-SR redesign
❌ Writer Context redesign / “hard SR”
❌ Cross-chapter SR carry implementation
❌ Choice / Candidate Option / L2 / L1 mount
❌ Attribution Causal History EO
❌ Phase 5 unfreeze
❌ Fix Plan-authored SR pollution (report only)
```

If Human later wants necessity of “must next Scene hard-consume SR?”, that is a **separate** Design Gate with the same proof burden as #35 — not assumed by nominal prompt fuel.

---

## 14. Freeze snapshot (post-#37)

```text
Phase 4.4
├─ AA20 Writer Non-Certification        SEALED
├─ L1 Observer                          TEST-ONLY
├─ Character Choice Necessity           NOT PROVEN
├─ Attribution                          SOFT WRITE + REGISTRY-ONLY
├─ Character SR write                   PRESENT (Actual → sidecar)
├─ Character SR production read         NOMINAL (Writer Context fuel)
├─ Character SR hard story driver       NOT PROVEN
├─ Candidate Option / L2 / Choice Engine NOT AUTHORIZED
└─ Phase 5                              FROZEN
```

---

## Final

```text
PASS → STOP

Character SR is written after Actual and re-read into Writer Context
as soft, budget-vulnerable prompt fuel within a chapter.

It is not a Director/Planner/State authority, has no proven
hard story-effect branch, and does not automatically enter the
next chapter.

That is a closed archaeology result — not an automatic build order.
```
