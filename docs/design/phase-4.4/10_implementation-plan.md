# 10 — Phase 4.4 Implementation Plan

```text
PHASE 4.4 IMPLEMENTATION PLAN

STATUS: PLAN COMPLETE — AWAITING EXPLICIT IMPLEMENTATION APPROVAL
CODE CHANGED: NO
GOLDEN CHANGED: NO
v0.2 CHANGED: NO
PHASE 5: FROZEN

DESIGN GATE: APPROVED (08)
READINESS AUDIT: COMPLETE (09)
THIS DOCUMENT: Planning only — NOT Implementation Approval
```

**Authoritative contract:** `06_final-design-gate.md`  
**Must not reinvent semantics.** Only answer *how* to land FG-1/2/3 beside Phase 1–3.

---

## 0. Frozen architecture (non-negotiable)

```text
OLD (unchanged):

Prose → Occurrence → Actual → State → SR
                         ↘ Writer Context


NEW (beside, never in front):

Evidence ──→ Attribution Gate ──PASS──→ Attribution Registry
                                              ↓
                                   Character Causal History
                                              ↓
                                         Phase 5 (later)
```

### Forbidden impl shapes (instant Contract violation)

```text
❌ Prose → Attribution → Actual → State
❌ Actual → Attribution → State
❌ Writer → Action → Attribution (as mint)
❌ State ↛ Evidence (over-strong — State MAY be Evidence into Gate)
❌ State → Attribution (direct mint)
❌ attributionConfidence / densification scores
```

### Core inequalities (already sealed)

```text
Occurrence ≠ Attribution ≠ Choice ≠ Consequence
Occurrence Actor ≠ Attributed Actor
Attributed Action ≠ Chosen Action
UNKNOWN × N ↛ PASS
```

---

## ① Registry 落点

| Decision | Choice |
|----------|--------|
| Form | **JSON sidecar** (match Phase 3.2 `character_sr`) |
| Root | `{bookDir}/novel/_system/brain/attribution/` |
| Files | `ch_NNNN.json` per chapter (append-only records array) |
| Optional index | `index.json` or in-file maps by `characterId` + `storyClock` — **OPEN micro-detail at code time** |
| DB | **NO** for Phase 4.4.1 |
| YAML | **NO** (JSON only, like SR) |
| Linkage | Each record may carry `occurrenceRef` / `eventId` — **link ≠ merge Authority into Actual** |

```text
novel/_system/brain/
  character_sr/ch_NNNN.json     # Phase 3.2 — NOT Attribution Authority
  attribution/ch_NNNN.json      # NEW — sole Attribution Authority (FG-2)
```

**Registry is the only store allowed to hold Attribution-equivalent system fact.**  
Actual / State / SR / timeline / hints / causal_chain **must not** gain parallel `attribution=true` fields as Authority.

---

## ② Attribution Record — minimal fields

```text
AttributionRecord {
  id: string                    # stable id (e.g. attr_chNNNN_…)
  characterId: string
  actionDescription: string     # what is attributed (text-grounded summary)
  status: "PASS" | "UNKNOWN" | "INVALID"
  evidenceRefs: EvidenceRef[]   # typed refs only (see §③)
  storyClock: number | string
  sceneId: string | null
  occurrenceRef: string | null  # eventId link — optional
  provenance: "attribution_gate"
  gateVersion: string           # e.g. attribution-gate-1
  createdAt: string             # ISO
}
```

### Explicitly FORBIDDEN on the record

```text
confidence
attributionConfidence
importance
emotion
choice
consequence
causalStrength
likelihood
densificationScore
```

AA21: no shadow scores anywhere that upgrade UNKNOWN→PASS.

### Character Causal History

```text
Character Causal History
  = ordered projection of Registry records where status === "PASS"
  = NOT a separate write Authority
```

Suggested read API (impl later): `listAttributedActions(bookDir, { characterId, chapter? })` → filters Registry.  
**No** builder that unions Actual+State+SR+hints+causal_chain into “history.”

---

## ③ Gate — how Evidence is obtained

### 3.1 Typed Evidence (only legal Gate input)

```text
TypedEvidence {
  source: "prose" | "occurrence" | "occurrence_actor" | "state"
        | "sr" | "character_hint" | "historical_attribution"
        | "historical_occurrence" | "l1_judgment"
  role: "evidence"              # never "attribution" | "certificate"
  provenance: string            # adapter id
  time: storyClock / sceneId
  eventRef: string | null
  payload: object               # source-specific, schema-narrow
  forbiddenAsAuthority: true
}
```

### 3.2 Adapters (one per allowed source)

| Source | Adapter | Payload (narrow) | Notes |
|--------|---------|------------------|-------|
| Prose | `evidenceFromProseExcerpt` | excerpt, offset, pov | Primary narrative cues |
| Occurrence / Actual | `evidenceFromOccurrence` | eventId, action string, kind | Candidate event — **not** PASS |
| Occurrence Actor | `evidenceFromOccurrenceActor` | eventId, name | Participation mention only (AA18) |
| State | `evidenceFromStateSlice` | property keys/values at t0/t1 | **Evidence candidate** (AA16) — alone ↛ PASS |
| SR | `evidenceFromSRSlots` | awareness/belief/stance items + IB | Property/subjective — ↛ “做过” auto |
| characterHints | `evidenceFromCharacterHint` | hint + `provenance: occurrence-derived` | Only via adapter — never raw hint=Attribution |
| Historical Attribution | `evidenceFromPriorPass` | prior record id + status | ↛ auto PASS at t1 |
| Historical Occurrence | `evidenceFromTimeline` | timeline line / eventId | Context/occurrence evidence |
| L1 VALID | `evidenceFromL1` | judgment enum only | Optional; ≠ Attribution Authority |
| Situation | — | **NO adapter** | Context only (AA20) |
| Plan / Desire / Pressure / causal_chain Chosen | — | **NO adapter** | Forbidden Gate Evidence (FG-1) |
| Writer intent / raw ctx dump | — | **NO adapter** | Forbidden |

### 3.3 Gate I/O

```text
IN:  TypedEvidence[]  (+ characterId, actionCandidate, storyClock)
OUT: status PASS | UNKNOWN | INVALID
THEN: write AttributionRecord to Registry (only write path for system fact)
```

### 3.4 Forbidden Gate pattern

```text
❌ Object.assign(allContext) → LLM → "谁做的？" → PASS
❌ Unbudgeted causal_chain / Situation certificate as Evidence
❌ Raw characterHints object as Attribution
```

**OPEN at code time (not semantic):** deterministic rules vs constrained classifier vs hybrid — must still consume **only** TypedEvidence[].

---

## ④ `characterHints` isolation

### Physical boundary

```text
characterHints (evolution.*)
  ├── evolution / debug / non-causal context     ✅ allowed readers
  ├── Attribution Registry mint                  ❌
  ├── Character Causal History builder           ❌
  └── Gate
        only via evidenceFromCharacterHint       ✅ as Evidence
        never as Attribution object              ❌
```

### Impl actions (when coding)

1. Keep producer in `mapActualEventsToEvolution` (do not delete).  
2. Tag persisted hints: `kind: "occurrence_derived_hint"`, `authority: false`.  
3. Export allowlist: only debug/evolution tools + Evidence adapter.  
4. Document: importing hints into Causal History / Registry writers = Contract violation.  
5. Do **not** inject hints into Writer as “Character Action fact.”

---

## ⑤ Character Causal History generation

```text
Attribution Registry (status=PASS)
       ↓
projection / filter API
       ↓
Character Causal History (read model)
```

| Input | Allowed into Causal History? |
|-------|------------------------------|
| Registry PASS | **YES** (only) |
| Actual / State / SR / hints / causal_chain | **NO** |

Optional later: Writer Context may **reference** PASS entries by id (AA20: reference ≠ invent PASS).

---

## ⑥ Phase 1–3 non-blocking list

### Must NEVER be blocked by Attribution Gate / UNKNOWN

| File | Role | Rule |
|------|------|------|
| `event-extractor.js` | Prose → Actual | No Attribution precondition |
| `state-evolution-engine.js` | Actual → timeline / hints | No Attribution precondition |
| `memory-unit.js` | buildStateDiff / commit | No Attribution precondition |
| `state-updater.js` | Canon apply | No Attribution precondition |
| `chapter-pipeline.js` | Validation → Memory | Attribution **after or parallel**, never before State commit as gate |
| `orchestrator.js` | Actual → SR order | Keep; soft-fail SR ≠ block Actual/State |
| `character-sr-updater.js` | Actual → SR | Independent of Attribution |
| `studio-llm-writer.js` | Parallel Actual→SR | Same |

### Required regression invariant

```text
Prose → Actual → State
  MUST succeed when Attribution = UNKNOWN | INVALID | absent
```

### Wiring sketch (when approved to code)

```text
After ensureActualEvents (and optionally after SR):
  MAY run Attribution Gate (soft)
  MAY write Registry
NEVER:
  if (!attributionPass) skip evolveFromChapter / commit
```

### Writer densifiers (not State blockers)

`causal_chain` → Writer remains a **HIGH residual** densifier (Readiness §B).  
Phase 4.4.1 scope: **do not** make causal_chain Gate Evidence; optional later: label Writer block as Plan/Choice context ≠ Attribution certificate.  
Full causal_chain remediation may be a follow-up — **must not** delay keeping Occurrence→State clean.

---

## ⑦ Test plan (Contract regression)

### Must FAIL (no Registry mint / no densification)

| Case | Expected |
|------|----------|
| State → Registry | FAIL (no mint) |
| SR → Registry | FAIL |
| Actual → Registry | FAIL |
| Hints → Registry | FAIL |
| Writer → Registry | FAIL |
| Causal Chain → Registry | FAIL |
| History projection without PASS | FAIL |
| UNKNOWN × N → PASS | FAIL |
| Situation / ctx dump → Gate PASS | FAIL |
| Attribution PASS → auto Choice | FAIL |

### Must PASS

| Case | Expected |
|------|----------|
| Occurrence → Actual → State with Attribution absent/UNKNOWN | **PASS** |
| Gate + TypedEvidence → PASS → Registry row | PASS |
| Causal History lists only Registry PASS | PASS |
| Occurrence Actor ≠ Attributed Actor in records | PASS |
| State alone as sole Evidence → not auto PASS | PASS (UNKNOWN/INVALID per Gate rules) |
| State + Prose + SR TypedEvidence → Gate may PASS | PASS (when evidence sufficient) |

Package suggestion: `npm run test:attribution` (new) — Node ≥20 — **not created until Implementation Approval**.

---

## Implementation phases (after explicit approval only)

| Step | Scope | Still forbidden |
|------|-------|-----------------|
| **4.4.1a** | Registry schema + read/write sidecar | Gate LLM; Phase 5; State gating |
| **4.4.1b** | Typed Evidence adapters + Gate (minimal / deterministic-first preferred) | Context-dump LLM Gate |
| **4.4.1c** | Soft wire after Actual; Causal History projection API | Blocking State |
| **4.4.1d** | Consumer walls + tests (§⑦) | Phase 5 |
| **4.4.1e** | Optional: Writer context label for causal_chain ≠ Attribution | Rewriting Plan system |

**No step may start without Human: `PHASE 4.4 IMPLEMENTATION APPROVED` (or equivalent).**

---

## Status snapshot

```text
PHASE 4
    BLOCKED (full Seal)

PHASE 4.4 CHARACTER ACTION ATTRIBUTION
    DESIGN GATE              APPROVED
    SEMANTIC CONTRACT        SEALED
    FG-1 / FG-2 / FG-3       SEALED
    AA16–AA21                SEALED
    UNIQUE AUTHORITY #04     PASS WITH KNOWN LIMITATIONS
    IMPLEMENTATION READINESS COMPLETE
    IMPLEMENTATION PLAN      COMPLETE (this doc)
    IMPLEMENTATION           NOT STARTED · NOT APPROVED

PHASE 5 / NARRATIVE ATTENTION
    FROZEN

GOLDEN / v0.2
    UNCHANGED
```

---

## One-line plan claim

> Land a JSON Attribution Registry beside `character_sr`, feed the Gate only through typed Evidence adapters (State allowed as Evidence, never as Authority), project Causal History from PASS only, and never put Attribution in front of Prose→Actual→State.
