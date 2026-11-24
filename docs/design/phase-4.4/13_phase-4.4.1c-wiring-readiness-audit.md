# 13 — Phase 4.4.1c Soft Wiring Readiness Audit

```text
PHASE 4.4.1c IMPLEMENTATION READINESS / WIRING AUDIT

MODE: READ-ONLY
CODE CHANGED: NO
GOLDEN / v0.2: UNCHANGED
4.4.1c IMPLEMENTATION: NOT APPROVED
PHASE 5: FROZEN

UPSTREAM:
  4.4.1a Registry PASS / APPROVED
  4.4.1b Typed Evidence + Gate PASS / APPROVED
```

**Purpose:** Before any soft-wiring code, prove *how* Occurrence pipeline sources become TypedEvidence, *who* calls Gate, *when*, failure modes, and that Attribution never blocks Phase 1–3 — and that nothing bypasses Gate to mint Attribution-equivalent system facts.

---

## 0. Design warning retained (from Human on 4.4.1b)

```text
4.4.1b Gate = conservative operational subset
≠ complete Attribution ontology
```

```text
Attribution ≠ Choice
External Coercion ≠ Subject Absence
UNKNOWN × N ↛ PASS
```

Do not elevate `prose + subjectPresentCue + agencyCue` to “all attributable actions.” Wiring must preserve conservative UNKNOWN bias.

---

## 1. Target architecture (must remain)

```text
                 ┌→ State → SR / Memory
Prose → Actual ──┤
                 │
                 └→ (soft, non-blocking) Evidence adapters
                              ↓
                       Attribution Gate
                              ↓
                    PASS | UNKNOWN | INVALID
                              ↓
                       Attribution Registry
                              ↓
                 Character Causal History (PASS projection)
```

### Forbidden wiring shapes

```text
❌ Actual → Attribution (direct mint)
❌ State → Attribution (direct mint)
❌ SR → “she did/decided X” system fact
❌ characterHints → Attribution
❌ Attribution UNKNOWN/INVALID → block State / delete Actual
❌ Prose → Actual → must PASS → State
```

---

## 2. Current production call sites (no Gate today)

| Site | File | Order today |
|------|------|-------------|
| Runtime scene write | `packages/inkos-runtime/src/pipeline/orchestrator.js` ~510–528 | text → ObservedContinuity → `ensureActualEvents` → `applyCharacterSRAfterActual` (soft-fail except SR_FORBIDDEN) |
| Studio writer | `packages/inkos-studio-server/src/studio-llm-writer.js` ~571–585 | same Actual → SR pattern |
| Chapter commit | `packages/inkos-runtime/src/pipeline/chapter-pipeline.js` ~184–242 | `buildStateDiff` → `MemoryUnit.commit` (**after** chapter validation path; **no** Attribution) |
| Writer context | `packages/inkos-prompt/src/compiler.js` | Actual Events block, SR, timeline, **causal_chain** (unbudgeted) |

**Attribution modules exist but are not called from these sites.**

---

## 3. Source → TypedEvidence wiring map (proposed for 4.4.1c)

| Source | Adapter (4.4.1b) | Wiring allowed? | Must set on payload | Forbidden auto-inference |
|--------|------------------|-----------------|---------------------|--------------------------|
| **Prose** (`scene.text`) | `evidenceFromProseExcerpt` | **YES** | excerpt + **explicit** cue flags (subjectPresent / agency / coercion / subjectAbsent) | LLM “guess she intended” from full prompt |
| **Actual / Occurrence** | `evidenceFromOccurrence` | **YES** | eventId, action, kind; `sufficientAlone: false` | `Actual.action` → Attribution |
| **Occurrence Actor** | `evidenceFromOccurrenceActor` | **YES** | name; `isAttributedActor: false` | actors → Attributed Actor |
| **State / StateDiff** | `evidenceFromStateSlice` | **YES** | properties snapshot; `isAuthority: false` | `location t0→t1` → “voluntarily left” |
| **SR** | `evidenceFromSRSlots` | **YES** | awareness/belief/stance items; not causal authority | “经历” → “做过/决定” |
| **characterHints** | `evidenceFromCharacterHint` | **YES only via adapter** | `kind: occurrence_derived_hint`, `authority: false` | hint.character+action → performed |
| **Historical Attribution** | `evidenceFromPriorPass` | **YES** | prior id/status; `transfersToCurrent: false` | PASS(t0) → PASS(t1) |
| **Timeline** | `evidenceFromTimeline` | **YES** | line; insufficient alone | timeline → Attribution |
| **L1** | `evidenceFromL1` | **YES optional** | judgment; insufficient alone | L1 VALID → Attribution |
| **Situation** | — | **NO** | — | any |
| **Plan / Desire / Pressure / causal_chain** | — | **NO** | — | Chosen → Attribution |
| **Writer raw context / ctx dump** | — | **NO** | — | context → Gate |

### Cue-flag provenance (critical for Prose adapter)

4.4.1c must **not** invent a silent LLM that fills `agencyCue` from full Writer context.

Allowed options for 4.4.1c (pick in impl approval, not now):

| Option | Risk |
|--------|------|
| **A. Conservative defaults:** prose evidence with cues=false unless rule-based detectors fire → mostly UNKNOWN | Safest; matches 4.4.1b bias |
| **B. Narrow deterministic detectors** on excerpt only (keyword/pattern for 犹豫/还是/决定/被迫权衡 etc.) | Acceptable if scoped to excerpt |
| **C. Constrained classifier on excerpt only** | Later; needs separate approval |
| **D. Full-context LLM** | **FORBIDDEN** |

Recommendation for first 4.4.1c impl: **A or B only**.

---

## 4. Who calls Gate / when / failure

### 4.1 Recommended caller (soft)

| Caller | When | Blocking? |
|--------|------|-----------|
| New helper e.g. `applyAttributionAfterActual(bookDir, chapter, scene)` | **After** `ensureActualEvents` succeeds; **after or beside** SR update | **NEVER** throw into Actual/State/Memory path |
| Chapter-end optional batch | After all scenes have Actual; **before or after** `buildStateDiff` but **independent** of commit success | Soft only |

**Must not** call Gate from inside `evolveFromChapter` / `MemoryUnit.commit` as a precondition.

### 4.2 Per-scene vs per-action candidates

| Mode | Proposal |
|------|----------|
| 4.4.1c.v1 | For each `actualEvents[]` entry × relevant `actors[]`, build TypedEvidence bundle → `runAttributionGate` once per (character, actionDescription, eventId) |
| Dedup | Use stable `recordId` from eventId+characterId; upsert optional |

### 4.3 Failure / status propagation

| Outcome | Registry | Causal History | Actual | State | SR | Writer | Memory commit |
|---------|----------|----------------|--------|-------|-----|--------|---------------|
| Gate **PASS** | write PASS | appears in `listAttributedActions` | unchanged | unchanged | unchanged | unchanged | unchanged |
| Gate **UNKNOWN** | write UNKNOWN (allowed) | **not** in PASS projection | unchanged | unchanged | unchanged | unchanged | unchanged |
| Gate **INVALID** | write INVALID | not PASS | **not deleted** | unchanged | unchanged | unchanged | unchanged |
| Gate / adapter **throws** | no write (or catch) | — | **must continue** | **must continue** | soft like SR | continue | continue |
| Missing bookDir | skip soft | — | continue | continue | continue | continue | continue |

```text
Attribution soft-fail === CharacterSR soft-fail pattern
  (only hard-fail on explicit Contract violation codes if any;
   never ACTUAL_EVENT_REQUIRED-style for Attribution)
```

### 4.4 Write path

```text
runAttributionGate
  → adjudicateAttribution(TypedEvidence[])
  → append/upsertAttributionFromGate({ writer, writeKey: Symbol })
  → sidecar attribution/ch_NNNN.json
```

No other module may mint.

---

## 5. Bypass audit — can anything mint without Gate?

| Path | Can mint Attribution-equivalent system fact after 4.4.1c soft wire? | Mitigation |
|------|---------------------------------------------------------------------|------------|
| Actual.actors/action | No if only Occurrence Evidence | Never set Registry from Actual fields |
| StateDiff / location history | No if only State Evidence | AA16; Gate UNKNOWN |
| SR awareness strings | No as Authority | AA19; cues not auto “做过” |
| characterHints triple | **HIGH residual if mis-wired** | Only `evidenceFromCharacterHint`; never direct Registry |
| causal_chain / Chosen | No Evidence adapter | Must not add adapter in 4.4.1c |
| Writer Context | No Gate input | Do not pass `ctx`/prompt body into Gate |
| Timeline / Memory hierarchy | Occurrence/property only | No Registry write |
| `listAttributedActions` | Read projection | No second writer |
| Forged `writer: attribution_gate` | Blocked without Symbol | Keep write-key unexported from public index |
| Confidence densification | Forbidden fields + Gate rules | No scores |

**Residual densification (not Registry mint):** causal_chain → Writer → prose → Actual loop still exists (Readiness #09). Soft wiring Gate does **not** close Writer densification; that is 4.4.1d/e / later. Soft wire must not claim it does.

---

## 6. Phase 1–3 regression red lines (must prove in 4.4.1c tests)

| File | Must remain Attribution-independent |
|------|-------------------------------------|
| `event-extractor.js` | No Gate precondition |
| `state-evolution-engine.js` | No Gate precondition |
| `memory-unit.js` commit | No Gate precondition |
| `state-updater.js` | No Gate precondition |
| `chapter-pipeline.js` | `buildStateDiff` / commit succeed if Attribution UNKNOWN/absent |
| `orchestrator.js` | Actual required; Attribution optional soft |
| `character-sr-updater.js` | Independent of Attribution |
| `studio-llm-writer.js` | Same |

**Regression tests required when 4.4.1c is implemented:**

```text
PASS: Prose → Actual → State with Gate absent / UNKNOWN / INVALID
FAIL: State blocked when Attribution UNKNOWN
FAIL: Actual deleted when Attribution INVALID
FAIL: characterHints → Registry without Gate
FAIL: causal_chain → Registry
FAIL: State-only → PASS
```

---

## 7. Soft-wiring sequence (for future impl approval — not now)

```text
1. applyAttributionAfterActual(bookDir, chapter, scene)
   - after ensureActualEvents
   - try/catch soft
   - build evidence from prose excerpt + events + optional state snapshot + SR sidecar + hints from evolution if already available
   - NOTE: at scene time, chapter StateDiff may not exist yet → State evidence may be empty or scene-local only; OK → more UNKNOWN

2. Optional chapter-end enrichment
   - after buildStateDiff (non-blocking): re-run Gate with State slice evidence for same candidates (upsert)
   - still must not gate commit

3. Never wire Gate inside MemoryUnit.commit critical path as await-required
```

**Scene-time State gap:** Honest limitation — early Gate runs may lack State Evidence; chapter-end soft re-judge optional. Do not invent State from Writer.

---

## 8. characterHints special protocol

```text
Producer: mapActualEventsToEvolution (unchanged)
Consumers today: none

4.4.1c allowed:
  evolution.characterHints → evidenceFromCharacterHint → Gate

4.4.1c forbidden:
  hints → listAttributedActions bypass
  hints → “character performed action” helper that writes Registry
  hints injected as Writer “Character Action fact”
```

If chapter-end enrichment runs after `buildStateDiff`, hints are available — still Evidence only.

---

## 9. Causal chain / Writer Context

| Item | 4.4.1c stance |
|------|----------------|
| Feed Gate | **FORBIDDEN** |
| Soft wire | **Do not** add adapters |
| Densification residual | Documented; defer 4.4.1d/e |
| Label as Plan/Choice context | Optional later (1e) |

---

## 10. Readiness verdict

| Question | Answer |
|----------|--------|
| Is 4.4.1c implementation safe to start **without** this audit? | No — audit first (this doc) |
| Does this audit find a licensed bypass of Gate mint? | **No** if wiring follows §3–§8 |
| Highest wiring footguns | characterHints mis-promotion; State Δ→voluntary leave; Gate blocking State; full-context LLM cues |
| Cue-flag filling | Must be conservative (A/B); full-context LLM **FORBIDDEN** |
| Can 4.4.1c impl be approved now? | **NOT BY THIS DOCUMENT** — Human must explicitly approve |

```text
STATUS:
4.4.1c WIRING READINESS AUDIT COMPLETE

4.4.1c IMPLEMENTATION:
NOT APPROVED

RECOMMENDATION:
Human may approve 4.4.1c ONLY with constraints:
  - soft / non-blocking
  - adapters as mapped
  - no causal_chain/Situation/Writer dump Evidence
  - conservative cue policy (A or B)
  - regression tests in §6
```

---

## 11. Status snapshot

```text
PHASE 4.4
  4.4.1a  PASS / APPROVED
  4.4.1b  PASS / APPROVED
  4.4.1c  READINESS AUDIT COMPLETE — IMPLEMENTATION NOT APPROVED

PHASE 5 / NARRATIVE ATTENTION: FROZEN
GOLDEN / v0.2: UNCHANGED
```
