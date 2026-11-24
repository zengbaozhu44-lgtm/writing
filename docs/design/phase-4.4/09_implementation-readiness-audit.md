# 09 — Phase 4.4 Implementation Readiness Audit

```text
PHASE 4.4 IMPLEMENTATION READINESS AUDIT

MODE: READ-ONLY CODE ARCHAEOLOGY
CODE CHANGED: NO
GOLDEN CHANGED: NO
v0.2 CHANGED: NO
PHASE 5: FROZEN
DESIGN GATE: APPROVED (08) — ≠ Implementation Approval

STATUS:
READY FOR IMPLEMENTATION PLANNING
≠ READY TO CLAIM RUNTIME ATTRIBUTION SAFETY
≠ IMPLEMENTATION STARTED
```

**Authoritative design:** `06_final-design-gate.md` · Approval: `08_design-gate-approved.md`  
**Upstream attack residuals:** `07_unique-authority-attack.md`

---

## 0. Executive verdict

| Question | Answer |
|----------|--------|
| Does runtime have Attribution Registry / Gate / Evidence Contract? | **NO** — design-only |
| Does Prose→Actual→State require Attribution? | **NO** — must keep it that way |
| Is there a live second Registry Authority? | **NO** |
| Are there high-density **reconstruction / densification** surfaces? | **YES** — Actual Events prompt, SR awareness, causal_chain |
| Is `characterHints` isolable today? | **YES** — produced + persisted, **zero consumers** |
| May Implementation start after this audit alone? | **NO** — need Implementation Plan that hardens walls without gating State |

```text
Semantic Contract: SEALED / APPROVED
Runtime Enforceability: NOT PROVEN
Next: Implementation Plan (still may be design-only) then minimal impl
```

---

## A. Attribution Registry落点 — what exists today

### A.1 Live Occurrence pipeline (must not break)

```text
scene.text
  → ensureActualEvents / extractStoryEventsFromScene
       packages/inkos-brain/src/events/event-extractor.js
  → scene.actualEvents (StoryEvent[])
       packages/inkos-brain/src/events/story-event.schema.js
  → Branch State:  evolveFromChapter / buildStateDiff / MemoryUnit.commit
       state-evolution-engine.js · memory-unit.js · chapter-pipeline.js
  → Branch SR:     applyCharacterSRAfterActual / updateCharacterSRFromActual
       character-sr-updater.js · orchestrator.js · studio-llm-writer.js
  → Branch Writer: collectPreviousActualEvents / formatActualEventsBlock
       actual-events-prompt.js · packages/inkos-prompt/src/compiler.js
```

**No Attribution step anywhere in this chain.**

### A.2 Locus inventory vs FG-2

| Locus | Location | Classification | Compete with Registry? |
|-------|----------|----------------|------------------------|
| StoryEvent / Actual | `actualEvents` | **Occurrence History** | Fuel only — must not mint |
| `evolution.characterHints` | StateDiff / `states/ch_*.json` | **Occurrence-derived hint (Attribution-shaped)** | Orphaned; future landmine |
| Timeline / `11_timeline.yaml` | Canon overlay | **Occurrence History** | Writer TopK fuel |
| Character SR awareness | `character_sr/ch_NNNN.json` | **Property / subjective History** | HIGH reconstruction if read as “做过” |
| Observed Continuity | `scene-observed-continuity.js` | **Occurrence (scene-local)** | Medium |
| `causal_chain` + Chosen | `causal-reasoner.js` → `renderCausalChain` | **Choice / Plan History** | HIGH Writer densifier |
| Beat Memory | `beat-memory.js` | Heuristic blend | Medium (Studio) |
| Living `evolutionLog` | living brains | **Property History** | Low–Medium |
| **Attribution Registry** | — | **ABSENT** | Must be **new** sole Authority |
| **Character Causal History (projection)** | — | **ABSENT** | Must project from Registry PASS only |

### A.3 Registry placement recommendation (planning only — not impl)

```text
NEW locus (sole Authority): Attribution Registry
  (sidecar under novel/_system/brain/… — exact path OPEN)

MUST NOT place Authority inside:
  Actual.actors/action · StateDiff.evolution · SR.awareness · causal_chain · timeline strings
```

Those remain Occurrence / Property / Choice / Context.

| Risk | Level |
|------|-------|
| Missing Registry in code | Expected |
| Promoting Existing locus to Authority | **HIGH footgun** |
| Reconstruction via Writer fuel | **HIGH** |

---

## B. Attribution Gate input wiring

### B.1 How materials reach Writer / LLM today

| Channel | Builder | Typed Evidence Contract? |
|---------|---------|--------------------------|
| Previous Actual Events | `actual-events-prompt.js` `formatActualEventsBlock` | **NO** — Occurrence prose; reads as deed |
| Observed Continuity | compiler modules | Partial role tags |
| currentState / state_diff | `compiler.js` markdown | **NO** |
| Timeline TopK | `formatRankedTimeline` | Canon filter only |
| Character SR | `minimal-sr.js` / `formatCharacterSRForPrompt` | Slot projection; **not** Attribution typed |
| Causal chain | `renderCausalChain` — **appended after budget** | **NO** — Plan/Desire/Chosen |
| characterHints | — | **Not in prompts** |
| Beat Memory (Studio) | beat-memory / beat-slimmer | Heuristic |

### B.2 Bypass flags (vs FG-1)

1. **`causalBlock` unbudgeted append** (`compiler.js` ~614–619) — Desire/Chosen densify prose without Evidence typing.  
2. **Actual Events “must continue”** — Occurrence Authority ≠ Attribution; easy to misread as “C performed X”.  
3. **SR Awareness event info** — AA19 residual (agent-shaped excerpts).  
4. **No runtime Evidence provenance enum** — design-only.  
5. **Untyped future reader of `evolution.characterHints`** — persisted landmine.

| Risk | Level |
|------|-------|
| Evidence Contract unenforced | **HIGH** |
| Causal/Actual densifiers | **HIGH** |
| Full raw ctx dump | LOW–MEDIUM |

**Impl requirement:** typed Evidence adapters **into Gate only**; do not “fix” Writer by deleting Occurrence Actual (would break Phase 1–3 continuity). Wall **mint**, not Occurrence.

---

## C. `characterHints` call chain

### Producer (only)

| Symbol | File | Shape |
|--------|------|-------|
| `mapActualEventsToEvolution` | `state-evolution-engine.js` | `{character, action, stateChanges, eventId}` |
| `evolveFromChapter` | same | `evolution.characterHints` |
| `buildStateDiff` / `writeAggregatedState` | `memory-unit.js` | Persists `evolution` wholesale |

### Consumers

| Consumer | Status |
|----------|--------|
| Prompt compiler | **NONE** |
| SR updater | **NONE** |
| Causal reasoner | **NONE** |
| Attribution / Causal History | **ABSENT** |

**Isolation today: YES — physically isolable.**  
FG-3 “Evolution/debug YES” matches code.

| Risk | Level |
|------|-------|
| Live causal consumption | **LOW** |
| Persisted Attribution-shaped triple | **MEDIUM** |
| Accidental Gate Evidence without provenance | **HIGH** if naively wired |

**Impl requirement:** keep orphaned or tag `provenance: occurrence-derived`; never write Causal History from hints; Gate-as-Evidence only with FG-1 typing.

---

## D. Character Causal History lookalikes

| Structure | Class |
|-----------|--------|
| `actualEvents` / StoryEvent | **Occurrence History** |
| timeline events | **Occurrence History** |
| `characterHints` | **Attributed Action History (SHAPE ONLY)** — not Authority |
| SR awareness / relevance | **Property / subjective History** |
| `causal_chain` Chosen | **Choice History** (plan) |
| Beat Memory choice/action | **UNKNOWN / heuristic** |
| Observed Continuity | **Occurrence History** |
| Living evolutionLog | **Property History** |
| Attribution Registry / Causal History projection | **ABSENT** |

**Do not delete.** Classify and wall: none may become second Authority. Causal History = **projection of Registry PASS only** when implemented.

---

## E. Phase 1–3 regression risk

### E.1 Attribution required before State?

**NO.** Zero runtime Attribution Gate/Registry. Proven path:

```text
Prose → ensureActualEvents → (SR soft) → Validation → buildStateDiff → MemoryUnit.commit
```

Guards: empty prose, ACTUAL_EVENT_REQUIRED — **not** Attribution.

### E.2 Dangerous if wrongly gated on Attribution

| File | Why |
|------|-----|
| `state-evolution-engine.js` | Actual→timeline/hints |
| `memory-unit.js` (`buildStateDiff`, `commit`) | Canon/states write |
| `state-updater.js` | Canon apply |
| `chapter-pipeline.js` | Commit order |
| `orchestrator.js` | Actual before SR |
| `event-extractor.js` | Phase 1 |
| `character-sr-updater.js` | Phase 3.2 |
| `compiler.js` | Writer modules |
| `studio-llm-writer.js` | Parallel Actual→SR |

**Forbidden impl pattern:**

```text
Actual Action → must Attribution → else State blocked
```

**Required impl pattern:**

```text
Occurrence pipeline unchanged
  + NEW Registry/Gate beside it
  + consumer walls on mint surfaces
```

| Risk | Level |
|------|-------|
| Accidental State←Attribution gate | **HIGH footgun** |
| Current breakage from missing Attribution | **LOW** |

---

## Scorecard

| Area | Verdict |
|------|---------|
| A Loci | Registry **ABSENT**; do not promote lookalikes |
| B Evidence wiring | **BLOCKED** enforceability; typed Gate inputs needed |
| C characterHints | **Isolable NOW**; shape dangerous |
| D Lookalikes | Many histories; **zero** sealed Causal History |
| E Regression | Prose→Actual→State **Attribution-free** — preserve |

---

## Recommended Implementation Plan order (not started)

```text
1. Keep Phase 1–3 pipes untouched (E)
2. Add Attribution Registry as NEW unique locus (FG-2)
3. Add Attribution Gate + typed Evidence adapters (FG-1)
4. Wall consumers: hints / Actual prompt / SR / causal_chain must not mint PASS
5. Project Character Causal History from Registry PASS only
6. Tests: densification, second Authority, State-without-Attribution regression
7. Only later: Phase 5 consumes Attributed Action
```

---

## Final readiness statement

```text
PHASE 4.4 IMPLEMENTATION READINESS AUDIT

STATUS:
COMPLETE — READY FOR IMPLEMENTATION PLANNING

DESIGN GATE:
APPROVED

IMPLEMENTATION:
NOT STARTED · NOT APPROVED BY THIS AUDIT

CODE CHANGED:
NO

PHASE 5:
FROZEN

HUMAN SEAL (implementation / Phase 4 full):
NOT ISSUED
```

**One line:**

> Code has no Attribution Authority yet; Occurrence→State is healthy and Attribution-free; the main impl risks are promoting lookalikes (Actual/SR/causal_chain/hints) to second truth, or gating State on Attribution — both forbidden by the sealed contract.
