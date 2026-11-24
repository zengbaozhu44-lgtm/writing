# 38 — State Evolution Consumer Design Gate

```text
MODE: DESIGN GATE · READ-ONLY ARCHAEOLOGY · NO CODE
EO: EO-4.4-STATE-EVOLUTION-CONSUMER-DESIGN-GATE

CODE CHANGED: NO
SCHEMA / GOLDEN / SPEC / FIXTURES: UNCHANGED
CHOICE / CANDIDATE OPTION / L2 / L1 MOUNT: NOT AUTHORIZED
PHASE 5 / 6 / 7: FROZEN / NOT STARTED
ATTRIBUTION / SR CONSUMER REDESIGN: NOT OPENED
ROADMAP: UNTOUCHED

UPSTREAM:
  #35 Choice Necessity = NOT PROVEN
  #36 Attribution = SOFT WRITE + REGISTRY-ONLY
  #37 SR = NOMINAL CONSUMER ONLY
  AA20 = SEALED
  Occurrence ≠ Attribution ≠ Choice ≠ Consequence
```

**Single question:**

> Does State produced by Actual → State Evolution get **truly read** on the production mainline — changing decisions or next-stage story generation?

Not: fix / enhance / wire Director / invent Story Survival / unfreeze Phase 5.

---

## 1. Executive Verdict

```text
38 = PASS

State Evolution Classification =
  NOMINAL CONSUMER
  (+ evolution.openLoops/worldHints = STORAGE WITHOUT PRODUCTION HANDOFF)

Irreplaceable Gap = NOT PROVEN

Code Changed = NO
Schema Changed = NO
Golden Changed = NO
Phase 5 = FROZEN
Choice = NOT AUTHORIZED
Candidate Option = NOT AUTHORIZED
L2 = NOT ENTERED
L1 Production Mount = NOT AUTHORIZED

STOP
```

**One-line:** State Evolution **writes** Canon timeline / operational `08` / evolution sidecar tags; Writer may **soft-read** `08` + timeline as prompt fuel; **Director does not read** State Evolution; **`openLoops` has no production reader**; Story Survival consumer **ABSENT**. Prompt fuel ≠ proven hard Story-Truth driver (#37 discipline).

---

## 2. State Evolution Write Path

### 2.1 Call chain (production)

```text
Chapter pipeline (after Validation)
  → buildStateDiff(bookDir, chapter, { intent, chapterText, scenes, metrics, … })
       ≡ evolveFromChapter(…)                     [packages/inkos-brain/src/memory/state-evolution-engine.js]
            → collectActualEventsFromScenes(scenes)
                 ensureActualEvents(scene, { stripPlan: true })
            → mapActualEventsToEvolution(events)
                 timelineEvents[]   (Actual action lines; Plan skeletons rejected)
                 characterHints[]   (actor + action + stateChanges tags)
                 openLoops[]        (strings starting with open_loop:)
                 worldHints[]       (other stateChanges tags)
            → buildStateDelta(…)                  [state-updater.js — operational shell]
                 timeline.day/time/characters_present from intent
                 timeline.events: [] from resolveTimelineEvents (plan path emptied)
                 then OVERLAID with mapped.timelineEvents
                 facts: []
                 current_state: buildCurrentStateTable(chapter, intent, wordCount)
            → StateDiff { canonDelta, evolution, provenance, … }

  → enrichAttributionAfterStateDiff(…, stateDiff)   [SOFT; characterHints → Evidence only]
  → MemoryUnit.commit(bookDir, chapter, stateDiff)  [HARD gate: non-empty chapter text]
       → write chapters/*.md
       → writeAggregatedState → states/ch_NNNN.json  (includes evolution blob)
       → writeChapterAnchorFile → states/ch_NNNN_anchor.yaml
       → applyStateDiffToCanon → applyPostChapter
            → 11_timeline.yaml append (Actual-derived events)
            → 08_current_state.md replace (intent-shaped table)
            → facts still []
       → Git Memory snapshot
```

| Step | HARD / SOFT | Fail mode |
|------|-------------|-----------|
| `evolveFromChapter` | Semantic constructor | Empty Actual → empty timeline overlay (preferred over fake history) |
| Attribution enrich | SOFT | try/catch; never blocks commit |
| `MemoryUnit.commit` empty text | HARD | throws before Canon write |
| `applyStateDiffToCanon` | try/catch in commit | Canon softError; chapter/states may already be written |

### 2.2 Fields read vs written

| Read | Write |
|------|--------|
| `scene.text` → Actual Events (`actors`, `action`, `stateChanges`, `id`) | `evolution.*` |
| `intent` (pov, location, time, present, foreshadow, …) | `canonDelta.current_state`, timeline day/time/present |
| metrics / chapterText word count | `08` 本章字数 |
| — | `canonDelta.timeline.events` ← Actual only |
| — | `states/ch_NNNN.json` aggregate |
| — | Canon modules via commit |

### 2.3 Bypasses / sibling paths (report only)

| Path | Relation to State Evolution |
|------|------------------------------|
| Living `livingPrepare` / `commitLivingPrepare` | Sibling on `states/*.json`; **not** `evolveFromChapter`; next-chapter Prepare may apply proposals |
| CLI / `applyPostChapter` with operator delta | Physical Canon write carrier; MemoryUnit is authorized Runtime path; Operator CLI is separate D1 concern |
| `patchCurrentStateTime` | Surgical `08` time sync — not full Evolution |
| Chapter Anchor build | Co-committed with StateDiff; **does not read** `evolution.openLoops` |

---

## 3. State Authority Classification

| State-ish product | Origin | Classification |
|-------------------|--------|----------------|
| Timeline events (11) | Actual → Evolution overlay → Canon append | **Actual-derived operational Canon append** (≠ Choice/Attribution; empty preferred over Plan) |
| `08_current_state.md` table | Mostly **intent** (POV/地点/时间/任务) + word count | **Operational / narrative convenience** (+ soft prompt fuel). **Not** rich Character Reality Authority |
| `evolution.characterHints` | Actual actors/actions | **Derived tags** — Attribution Evidence only; `writesCharacterBrain: false` |
| `evolution.openLoops` | Actual `stateChanges` prefix `open_loop:` | **Derived tags / narrative labels** — **not** Story Survival Authority |
| `evolution.worldHints` | Other `stateChanges` | **Derived tags** — no production reader found |
| Facts (13) from Evolution | Always `[]` this step | **Non-writing** |
| Inventory / possession | — | **NOT FOUND** as Evolution product |
| Relationship State | Anchor `deriveRelationshipState` from **intent / Living / override** | **Ops planner hint** (explicitly demoted ≠ relationship fact) — **not** Evolution open-loop |
| Location / date on Anchor | Intent at commit | **Ops continuity** for next Planner |
| `states/ch_NNNN.json` blob | Aggregate | **Cache / Memory snapshot** including unused evolution fields |

```text
Presence in JSON ≠ Story Truth Authority
```

---

## 4. Persistence Map

| Location | Writer | Reader (production) | Lifecycle |
|----------|--------|---------------------|-----------|
| `states/ch_NNNN.json` | `MemoryUnit.commit` / `writeAggregatedState` | `readChapterState` → mainly **LivingPrepare** load; **evolution fields unused** by Director/Planner/Writer | Per chapter; overwrite on re-commit |
| `states/ch_NNNN_anchor.yaml` | `writeChapterAnchorFile` | `loadPriorChapterAnchor` → **Planner** `applyAnchorConstraints` | Cross-chapter handoff |
| `novel/08_current_state.md` | `applyPostChapter` | Brain `loader` → `currentStateMd` / `state` table; Planner fallbacks | Cross-chapter file replace |
| `novel/11_timeline.yaml` | `appendTimeline` | Brain loader → Writer Context ranked timeline | Append / accumulate |
| `novel/13_facts_db.yaml` | Evolution writes **none** | Loader → Writer (other sources may still populate) | — |
| Git Memory snapshot | commit | rollback / audit | Versioned |

**Multiple State sources:** Canon modules + `states/*.json` + Anchor + Living proposals + Observed Continuity / Actual Events in scene JSON — **not unified Character State Authority**.

---

## 5. Production Consumer Map

| Consumer | READS State Evolution / derived Canon? | Detail |
|----------|----------------------------------------|--------|
| **Story / Chapter / Scene Director** | **NO** | No imports of evolution / openLoops / readChapterState evolution |
| **Planner** | **Partial sibling** | Reads **prior Anchor** + parsed **08** fields as fallback — **not** `evolution.openLoops` |
| **Adaptive Planner** | **NO** Evolution | Weights / hints unrelated to openLoops |
| **Relevance / Attention / Compression** | **NO** as Evolution consumer | Context-ranking uses facts/knowledge pools, not openLoops |
| **Story Survival / Open Loop** | **NO** | `openLoops` array has **zero** production callers outside Evolution write + unit test |
| **Writer Context / compileScenePrompt** | **YES soft** | `currentStateMd` (`state` / `state_diff`), timeline, facts modules — **not** evolution blob |
| **Character SR updater** | **NO** | Forbidden Beat stateChanges as SR fact; does not load Evolution |
| **Attribution** | **YES soft** | `characterHints` → TypedEvidence only; never Registry mint alone (#36) |
| **MemoryUnit** | **Self write** | Persists; LivingPrepare read of sibling field |
| **Next-scene generation** | **Indirect soft** | Via prompt Canon modules + Actual/OC; not via openLoops |
| **Consistency / validation** | **NO** Evolution-specific | Chapter validation does not gate on openLoops |

```text
DIRECTOR CONSUMER ABSENT
STORY SURVIVAL CONSUMER ABSENT  (for evolution.openLoops)
WRITER: SOFT / NOMINAL Canon fuel (08 + timeline)
PLANNER: Anchor HARD continuity (sibling of commit; ≠ Evolution Story Survival)
```

---

## 6. Cross-Chapter Handoff

```text
Chapter N Actual
  → evolveFromChapter
  → MemoryUnit.commit
       ├─ 11_timeline / 08_current_state     → Chapter N+1 brain load → Writer soft
       ├─ states/ch_N.json (evolution.*)    → NO production reader of openLoops
       └─ states/ch_N_anchor.yaml           → Chapter N+1 Planner applyAnchorConstraints
```

| Question | Answer |
|----------|--------|
| A. State cross-chapter? | **Canon 08/11 yes**; **evolution sidecar tags stored but unused**; **Anchor yes** |
| B. Who loads? | Loader (08/11); Planner (Anchor); LivingPrepare loader (`livingPrepare` only) |
| C. Who truly consumes? | Writer soft (08/11); Planner hard-ish (Anchor); **nobody for openLoops** |
| D. Affect next chapter scene/behavior/conflict/env/continuity? | **Soft prompt + Anchor constraints** — not Evolution open-loop obligations |
| E. File exists but unread? | **`evolution.openLoops` / `worldHints` → STORAGE WITHOUT PRODUCTION HANDOFF** |

---

## 7. State → Story Survival Audit

```text
Actual stateChanges "open_loop:choice=OPEN|PAID"
  → mapActualEventsToEvolution → evolution.openLoops[]
  → states/ch_NNNN.json
  → ∅ production constraint
```

| Kind | Status |
|------|--------|
| Actual-derived open-loop **tag** | **FOUND** (extractor + Evolution collect) |
| State-derived open-loop **consumer** | **NOT FOUND** |
| Plan-authored open-loop | N/A for Evolution map (Plan stripped from Actual) |
| Narrative label only | **YES** for stored `openLoops` |

```text
NOT STORY SURVIVAL CONSUMER
Phase 6 Story Survival = NOT STARTED (architecture diagram ≠ code)
```

---

## 8. State → Director Audit

```text
DIRECTOR CONSUMER ABSENT
```

Phase 7 Actual-driven Director = NOT STARTED.

> Does missing Director consumer already create a real, reproducible, irreplaceable Story-Truth failure?

```text
NOT PROVEN
```

No failure dossier in this EO; do **not** invent Director Consumer.

---

## 9. State → Writer Audit

```text
08 / timeline (and other Canon)
  → brain loader
  → compileScenePrompt modules (state / state_diff / timeline / facts)
  → dynamic lore → Writer prompt
  → LLM prose
```

| Case | Fits? |
|------|-------|
| A Deterministic writing constraint | **NO** for Evolution openLoops; Anchor forbidden openings are Planner→intent→scene, not Evolution |
| B Soft important context | **Partial** — 08/timeline enter context |
| C Stringify / dump, effect unproven | **YES under #37 bar** → **NOMINAL** |
| D Test-only | **NO** for 08/timeline path |

```text
State → Writer = NOMINAL / SOFT CONTEXT
(not REAL Story Consumer under EO §9)
```

Also: prior-scene **Actual Events** / Observed Continuity modules are stronger same-chapter continuity fuel than Evolution `openLoops` — and they are **not** State Evolution consumers; they bypass the Evolution sidecar entirely.

---

## 10. State → SR Audit

```text
State Evolution → Character SR: NOT FOUND
SR → State Evolution: NOT FOUND
```

SR updates from Actual directly (#37). Evolution does not feed SR.

---

## 11. State → Attribution Audit

```text
evolution.characterHints
  → enrichAttributionAfterStateDiff
  → evidenceFromCharacterHint
  → Gate (soft)
  → Registry
```

| Role | Status |
|------|--------|
| Production story-gen consumer | **NO** (#36 READ ABSENT) |
| Soft Attribution evidence | **YES** |
| characterHints → Attribution Authority alone | **FORBIDDEN / prevented** |

---

## 12. Pollution / Illegal Source Audit

| Path | Status | Notes |
|------|--------|-------|
| Plan → State (timeline events) | **BLOCKED by design** | `resolveTimelineEvents` returns `[]`; overlay Actual-only; `isActualTimelineEvent` rejects skeletons |
| Plan → `08` current_state | **FOUND** | Table built from **intent** (POV/地点/时间/任务) — **operational**, risk of looking like World Truth |
| causal_chain → State Evolution timeline | **NOT FOUND** (emptied) |
| Desire / Pressure / Situation → Evolution | **NOT FOUND** |
| SR → State | **NOT FOUND** |
| Writer prose → State | **FOUND (scoped)** | Prose → Actual → timeline/hints — designed Actual path |
| Writer Context → State | **NOT FOUND** |
| Expected Action → Evolution | **NOT FOUND** |
| Choice → State | **NOT FOUND** |
| Attribution → State | **NOT FOUND** |
| Living → Anchor relationship hints | **FOUND** | `deriveRelationshipState` may ingest Living proposals — **ops hint**, demoted |
| Intent bargain/obstacles → Anchor relationships | **FOUND** | Plan-shaped ops hints |

Report only — **no fix this EO**.

---

## 13. Boundary Matrix

| From | To | Exists? | Legal? | Role |
|------|-----|---------|--------|------|
| Actual | State (Evolution) | **YES** | **YES** (designed) | Timeline + tags |
| State | Actual | **NOT FOUND** | — | — |
| Actual | SR | YES | YES | Subjective update (#37) |
| SR | State | **NOT FOUND** | — | — |
| Actual | Attribution | YES | Soft | Evidence (#36) |
| Attribution | State | **NOT FOUND** | — | — |
| State | Attribution | **YES soft** | Evidence-only | characterHints |
| Plan | State (`08`/Anchor) | **YES partial** | Ops / pollution risk if over-read as Reality | Intent-shaped table / hints |
| Plan | SR | YES risk | Pollution risk | Authored bags (#37) |
| Writer | State | Via Actual | Scoped | Grounded Occurrence |
| State | Writer | Soft Canon | Soft / nominal | Prompt fuel |
| State | Director | **NOT FOUND** | — | — |
| State | Story Survival | **NOT FOUND** | — | openLoops dead |

---

## 14. Real Story Effect Analysis

| Effect type | Evidence |
|-------------|----------|
| **Hard:** State X → Director cannot choose Y | **NOT FOUND** |
| **Hard:** State X → Planner must include Evolution openLoop Z | **NOT FOUND** |
| **Hard:** State X → deterministic Writer rule from openLoops | **NOT FOUND** |
| **Soft:** 08/timeline change → different prompt text | **FOUND** (possible) |
| Proven next-generation story causal change from Evolution | **NOT PROVEN** |
| Cross-chapter Anchor constraints | **FOUND** — but from **Anchor builder** (intent/text/Living), **not** Evolution `openLoops` |

```text
Do not credit State Evolution with Anchor’s Planner effects.
Anchor ≠ proof that Evolution Story Survival works.
```

---

## 15. Irreplaceable Gap Analysis

> Does missing State Evolution consumer create a real, reproducible Story-Truth gap that Actual / SR / Writer / Runtime cannot already express?

```text
IRREPLACEABLE GAP = NOT PROVEN
```

Same-chapter continuity already has Actual Events + Observed Continuity in Writer Context. Cross-chapter continuity has Anchor + Canon soft modules. Missing openLoop→Survival/Director is an architecture gap vs diagrams — **not** proven production failure in this Gate.

---

## 16. Final Classification

```text
PRIMARY:
  NOMINAL CONSUMER
  — Canon products of Evolution (08 / Actual timeline) enter Writer Context
    as soft, budget-vulnerable prompt fuel without proven hard story effect.

SUB-LABELS (facts, not alternate primaries):
  evolution.openLoops / worldHints
    → STORAGE WITHOUT PRODUCTION HANDOFF

  characterHints
    → Attribution soft evidence only (≠ story generation)

  Chapter Anchor (MemoryUnit sibling)
    → REAL Planner continuity consumer
    → NOT State Evolution Story Survival

  Director / Phase 6 Survival
    → CONSUMER ABSENT
```

Not pure WRITE-ONLY (Canon is read). Not REAL PRODUCTION CONSUMER for Evolution-as-Story-Truth. Not TEST-ONLY.

---

## 17. Architecture Implication

```text
CLAIMED (diagrams / roadmap flavor):
  Actual → State Evolution → Open Loop / Survival / Director → next story

OBSERVED:
  Actual → State Evolution → { Canon soft Writer fuel
                              + unused openLoops sidecar
                              + Attribution hint tags }
  MemoryUnit.commit → Anchor → Planner   (parallel continuity, intent-shaped)

Phase 4.4 subtraction continues:
  Do not wire Director/Survival/Choice to “complete” State Evolution
  without Irreplaceable Gap = PROVEN.
```

Aligns with #35–#37: claimed capability ≠ closed production loop.

---

## 18. Explicit Non-Actions

```text
❌ Modify code / schema / golden / SPEC / fixtures
❌ Add State / Director / Story Survival consumer
❌ Choice / Candidate Option / L2 / L1 production mount
❌ Unfreeze Phase 5
❌ “Fix” Plan→08 / Living→Anchor pollution
❌ Refactor State Evolution
❌ Auto-enter next EO
```

---

## 19. Next Authorized Step

Per Human route:

```text
[1] Attribution Consumer   #36 DONE
[2] SR Consumer            #37 DONE
[3] State Evolution Consumer #38 DONE → STOP
        │
        ▼
[4] Story-Truth Mainline Reconciliation Design Gate
    (Human-authorized only)
    Synthesize #35–#38: what is proven closed vs nominal vs absent
    Decide Phase 4.4 further STOP vs Failure Qualification
```

Do **not** auto-start Reconciliation or any implementation EO.

---

## 20. STOP

```text
38 = PASS
State Evolution Classification = NOMINAL CONSUMER
  (+ openLoops = STORAGE WITHOUT PRODUCTION HANDOFF)
Irreplaceable Gap = NOT PROVEN
Code Changed = NO
Schema Changed = NO
Golden Changed = NO
Phase 5 = FROZEN
Choice = NOT AUTHORIZED
Candidate Option = NOT AUTHORIZED
L2 = NOT ENTERED
L1 Production Mount = NOT AUTHORIZED
STOP
```

```text
State Evolution writes; Writer may soft-read Canon slices;
openLoops are stored and unused; Director does not consume;
Story Survival is not started.

Archaeology complete — not a build order.
```
