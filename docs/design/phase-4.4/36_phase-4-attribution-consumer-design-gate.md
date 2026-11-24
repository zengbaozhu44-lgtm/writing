# 36 — Attribution Consumer Design Gate

```text
MODE: DESIGN GATE · READ-ONLY ARCHAEOLOGY · NO CODE
EO: EO-4.4-ATTRIBUTION-CONSUMER-DESIGN-GATE

CODE CHANGED: NO
SCHEMA / GOLDEN / SPEC / FIXTURES: UNCHANGED
CHOICE / CANDIDATE OPTION / L2: NOT ENTERED
L1 PRODUCTION MOUNT: NOT AUTHORIZED
ROADMAP: UNTOUCHED

UPSTREAM (FROZEN FOR THIS GATE):
  #35 Character Choice Necessity = NOT PROVEN → STOP
  4.4.1a Registry · 4.4.1b Gate · 4.4.1c Soft Wiring = BUILT
  AA20 Writer Non-Certification = SEALED
  Phase 5 Consequence = FROZEN
  Occurrence ≠ Attribution ≠ Choice ≠ Consequence
```

**Single question:**

> After Prose → TypedEvidence → Gate → Registry, does Attribution have a **legal, real, production consumer**?

Not: how to implement a consumer · Choice · L1 mount · Schema redesign.

**Principle (post-#35):** Claimed capability ≠ closed production loop. Prove who reads PASS — or classify the write-side as registry-only / soft.

---

## 1. Attribution production write path (current)

### 1.1 Intended sealed shape (FG / #06)

```text
Prose → Occurrence (Actual)
  ├──→ State / SR / …     (may inform; must not self-upgrade to Attribution)
  └──→ TypedEvidence → Attribution Gate
                              ↓
                     PASS | UNKNOWN | INVALID
                              ↓
                       Attribution Registry
                              ↓
                 Character Causal History (PASS projection)
                              ↓
                      Phase 5 consumer (FROZEN)
```

### 1.2 What code actually does today

```text
Scene prose
  → ensureActualEvents                    [HARD — required]
  → applyCharacterSRAfterActual           [SOFT-fail except SR_FORBIDDEN]
  → applyAttributionAfterActual           [SOFT — never blocks]
        → detectAttributionCues(excerpt)
        → TypedEvidence[] (prose / occurrence / actor / optional SR / hints)
        → runAttributionGate
        → Registry upsert (PASS|UNKNOWN|INVALID)
        → scene.attributionRun = { attempted, written, statuses }  [ephemeral meta]

Chapter end:
  buildStateDiff → evolveFromChapter
  → enrichAttributionAfterStateDiff       [SOFT — NOT commit precondition]
        → re-run applyAttributionAfterActual with characterHints / stateProperties
  → MemoryUnit.commit                     [independent of Attribution status]
```

| Call site | File | Role |
|-----------|------|------|
| Runtime scene write | `packages/inkos-runtime/src/pipeline/orchestrator.js` | After Actual + SR; try/catch soft |
| Studio writer | `packages/inkos-studio-server/src/studio-llm-writer.js` | Same order; soft |
| Chapter pipeline | `packages/inkos-runtime/src/pipeline/chapter-pipeline.js` | Enrichment only; soft |

**Gate non-outputs (enforced in `adjudicateAttribution` / `runAttributionGate`):**

```text
choice: undefined
consequence: undefined
```

Forbidden record fields include `choice`, `consequence`, `confidence`, `causalStrength`, etc. (`FORBIDDEN_ATTRIBUTION_FIELDS`).

---

## 2. Who consumes PASS / UNKNOWN / INVALID?

### 2.1 Write-side statuses

| Status | Registry write? | Production effect on Actual / SR / State / Memory / Writer? |
|--------|-----------------|---------------------------------------------------------------|
| **PASS** | YES (Gate-owned) | **None observed** — no downstream branch on PASS |
| **UNKNOWN** | YES | **None** — does not block; no read consumer |
| **INVALID** | YES | **None** — Occurrence may remain (by design); no read consumer |

### 2.2 Read API usage archaeology

| Symbol | Production callers (runtime / studio / prompt / memory / studio UI) | Test / self |
|--------|---------------------------------------------------------------------|-------------|
| `loadAttributionChapter` | **NONE** | registry + tests |
| `listAttributionRecords` | **NONE** | tests |
| `getPass…` / PASS filter helpers | **NONE outside registry module** | registry internal / tests |
| `evidenceFromPriorPass` | **NOT wired** into `applyAttributionAfterActual` | gate unit tests only |
| `evidenceFromL1` | **NOT wired** to `observeL1` | gate tests only |
| `scene.attributionRun` | Written on scene; **no later production reader found** | wiring tests |

**Studio frontend:** zero Attribution imports.  
**Prompt compiler:** explicitly labels fuel as `≠ Attribution`; **does not load Registry**.  
**Character SR updater:** zero Attribution imports; updates from Actual (+ authored SR bags) only.  
**State evolution / MemoryUnit:** zero Attribution imports; `buildStateDiff` / `evolveFromChapter` / `commit` do not gate on Registry.

```text
VERDICT ON CONSUMPTION:
  PASS / UNKNOWN / INVALID are written.
  Nothing in the production story-generation path reads them
  to change SR, State, Memory, Writer Context, or next Scene.
```

---

## 3. Registry: store vs fact consumer

| Role claimed in design | Code reality |
|------------------------|--------------|
| Sole **mint locus** for Attribution-equivalent system facts (FG-2) | **YES** — Gate write key + `attribution_gate` writer enforced |
| **Character Causal History** = projection/consumer of Registry PASS only (#06 §3.2–3.3) | **NO separate Causal History store**; **no production projection** that reads PASS into a history consumer |
| Phase 5 consumer of Attributed Action | **FROZEN** — not present |
| Writer may **reference** Registry status if present (#06) | **NOT implemented** — Writer Context does not load Registry |

```text
Registry today =
  production soft writer
  + authoritative sidecar store
  + NO production read consumer

≠ dead module (write path runs in orchestrator / studio / chapter enrich)
≠ closed Story-Truth loop (nothing feeds next generation from PASS)
```

---

## 4. Does Attribution participate in Character State / SR evolution?

| Path | Uses Attribution status? |
|------|--------------------------|
| `applyCharacterSRAfterActual` | **NO** — Actual → IB → SR; Attribution runs **after** SR in call sites |
| `evolveFromChapter` / StateDiff / Memory commit | **NO** |
| Order in production | Actual → **SR first** → Attribution soft (parallel recording) |
| Enrichment after StateDiff | Attribution may **cite** `characterHints` / state slice as **Evidence only**; does not authorize State; does not require PASS to commit |

```text
Attribution does NOT gate State Evolution.
Attribution does NOT gate Character SR updates.
SR / State may update with Attribution UNKNOWN or INVALID still on the record.
```

This matches 4.4.1c soft-wiring contract (#13 / #14): Attribution must not block Phase 1–3. It also means:

```text
“Attribution participates in Story Truth evolution”
  as a production authority for next-turn generation
  = NOT PROVEN / NOT OBSERVED
```

---

## 5. Bypasses around Attribution

### 5.1 By-design soft parallel (not a wiring bug)

```text
Prose → Actual ──┬──→ SR update          [independent]
                 ├──→ State / Memory     [independent]
                 └──→ Attribution soft   [sidecar only]
```

SR and State **proceed without** reading Gate status. That is intentional soft wiring — **not** an accidental omission of a try/catch.

### 5.2 What would be a contract violation (searched; not found as Attribution→upgrade)

| Illegal pattern | Found in production? |
|-----------------|----------------------|
| Actual → mint Attribution without Gate | **NO** — wiring always goes through Gate |
| State / characterHints → Registry direct | **NO** — hints only via `evidenceFromCharacterHint` |
| Attribution PASS → Choice / Intent / Causality object | **NO** |
| Attribution PASS → Phase 5 Consequence | **NO** (frozen + unwired) |
| Plan / Desire / Pressure / causal_chain → Gate Evidence | **Forbidden** in wiring comments; adapters not used for those |
| Writer dump → Gate | **NO** |

### 5.3 Separate risk (out of scope to “fix”; note only)

FG safety standard (#06):

> without Attribution Authority / PASS, no legal propagation path may produce an **Attribution-equivalent system fact**.

This Gate confirms: **Registry is the sole mint locus**, and **no production reader upgrades PASS into Choice**.  
Whether SR / Writer / hints ever *behave like* shadow Attribution in language is an **AA19 / AA20 / SR-consumer** question — deferred to the next SR Production Consumption Gate, not solved by inventing an Attribution reader here.

---

## 6. Illegal Attribution → Choice / Intent / Causality upgrades?

| Upgrade | Status |
|---------|--------|
| Gate output `choice` | Always `undefined` |
| Registry forbidden fields include `choice` / `consequence` | Enforced on write |
| L1 → Attribution → Choice | Adapter unwired; #34/#35 STOP |
| PASS → Character Intent object | **No such object / no path** |
| PASS → Causality engine input | **No production consumer** |

```text
Illegal upgrade path: NOT FOUND
(Attribution is not being smuggled into Choice.)
```

---

## 7. What is Attribution today? (classification)

Answer to the EO’s forced taxonomy:

| Label | Fits? | Notes |
|-------|-------|-------|
| **production authority** (mint locus) | **YES — write-side only** | FG-2 sole Authority for Attribution-equivalent *records* |
| **soft evidence / soft wiring** | **YES** | Non-blocking; parallel to Actual→SR→State |
| **registry-only (for downstream story gen)** | **YES** | No production READ consumer |
| **dead capability** | **NO (strict)** | Write path is live in Runtime + Studio + chapter enrich |
| **closed production authority for next Scene** | **NO** | PASS does not change generation |

**Recommended one-line classification:**

```text
ATTRIBUTION CURRENT ROLE =
  SOFT WRITE + REGISTRY-ONLY STORE
  (Authority locus for records; NO production read consumer)
```

Not “delete Attribution.” Not “must build Causal History now.”  
Same discipline as #35: absence of a consumer is a finding — not automatic backlog.

---

## 8. Irreplaceable semantic / production gap?

### 8.1 Gap relative to sealed *design* diagram

```text
DESIGN:
  Registry PASS → Character Causal History → Phase 5

REALITY:
  Registry PASS → (disk sidecar) → ∅
```

That is a **design-vs-runtime gap** on the *consumption* side. Phase 5 remains FROZEN, so the missing Phase 5 hop is **expected**, not a Phase 4.4 implementation failure by itself.

### 8.2 Gap relative to *current* Story-Truth needs

Question for this Gate (parallel to #35):

> If nothing reads Attribution PASS, does InkOS lose an irreplaceable production capability *required today*?

| If we need… | Without a PASS reader today… |
|-------------|------------------------------|
| Occurrence happened | Still have Actual |
| Subjective update | Still have SR from Actual |
| World/character properties | Still have State Evolution |
| Attributability as system fact on disk | Still have Registry records (writable) |
| Next Scene conditioned on “she *attributably* did X” | **No such conditioner exists** — and **necessity of that conditioner = NOT PROVEN here** |
| Choice / Intent from PASS | Forbidden / NOT PROVEN (#35) |

```text
IRREPLACEABLE CONSUMER GAP FORCING A NEW MODULE NOW
  = NOT PROVEN

MISSING READ CONSUMER RELATIVE TO FG DIAGRAM
  = OBSERVED (Causal History / Phase 5 / Writer reference)
  but Phase 5 FROZEN ⇒ do not treat as auto EO to invent consumer
```

**Subtraction-compatible outcome:** Attribution can remain a **sealed soft sidecar Authority** until a real failure shows that next-turn generation *must* branch on PASS vs UNKNOWN.

---

## 9. Relation to Choice / L1 / Candidate Option (negative freeze)

| Item | This Gate |
|------|-----------|
| Character Choice object | Unchanged: **NOT PROVEN** (#35) |
| Candidate Option / L2 | **NOT AUTHORIZED / NOT ENTERED** |
| L1 production mount | **NOT AUTHORIZED** |
| Attribution → Choice | **Still forbidden** |
| “Missing Attribution consumer ⇒ build Choice” | **REJECTED inference** |

---

## 10. Attribution Consumer Verdict

```text
ATTRIBUTION CONSUMER VERDICT:

  WRITE PATH:     PRESENT (soft production wiring)
  READ CONSUMER:  ABSENT (production story-generation path)
  ROLE:           SOFT WRITE + REGISTRY-ONLY STORE
  ILLEGAL UPGRADE TO CHOICE/INTENT: NOT FOUND
  STATE/SR BYPASS OF ATTRIBUTION GATE: BY DESIGN (soft parallel)
  FORCE NEW CONSUMER MODULE: NOT PROVEN
```

```text
PASS → STOP
```

**PASS** = archaeology complete; question answered.  
**STOP** = do not implement Attribution consumer / Causal History / Choice / L1 mount from this Gate alone.

---

## 11. Next step recommendation

Per Human post-#35 route (prove claimed capabilities close the loop):

```text
[1] Attribution Consumer Audit     ← THIS DOC — DONE → STOP
        │
        ▼
[2] SR Production Consumer Audit   ← AUTHORIZED NEXT (Design Gate only)
        EO-4.4-SR-PRODUCTION-CONSUMPTION-DESIGN-GATE
        Question: does Character SR(t+1) actually enter next Scene generation?
        (Living / heroKnows / Plan→SR / Writer→SR pollution; write-without-read)
        │
        ▼
[3] State Evolution Consumer Audit
        │
        ▼
[4] Story-Truth Mainline Reconciliation
```

**Do not open from this Gate:**

```text
❌ Attribution Causal History implementation EO
❌ Attribution → Writer Context certificate
❌ Choice / Candidate Option / L2
❌ L1 production mount
❌ Phase 5 unfreeze
❌ “fix” soft parallel by making Attribution block State/SR
```

If Human later wants a *necessity* Gate for “must next Scene read PASS?”, that is a **separate** Design Gate — same proof burden as #35, not assumed by missing reader.

---

## 12. Freeze snapshot (post-#36)

```text
Phase 4.4
├─ AA20 Writer Non-Certification       SEALED
├─ L1 Semantic Boundary                SEALED
├─ L1 Minimal Observer                 IMPLEMENTED / TEST-ONLY
├─ L1 Consumer                         UNKNOWN
├─ Post-L1 Choice Bridge               UNKNOWN
├─ Character Choice Necessity          NOT PROVEN
├─ Candidate Option                    NOT AUTHORIZED
├─ L2                                  NOT ENTERED
├─ Choice Engine / Registry            NOT AUTHORIZED
├─ Attribution Gate/Registry/Wiring    BUILT (soft write)
└─ Attribution Production Read Consumer ABSENT / NOT FORCED
```

---

## Final

```text
PASS → STOP

Attribution is a live soft writer into an authoritative Registry
with no production read consumer on the Story-Truth generation path.

That is a closed archaeology result — not an automatic build order.
```
