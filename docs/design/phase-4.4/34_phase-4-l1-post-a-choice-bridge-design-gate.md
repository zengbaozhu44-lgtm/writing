# 34 — L1 Post–Question-A Choice Bridge Design Gate

```text
MODE: DESIGN GATE · READ-ONLY ARCHAEOLOGY · NO CODE
EO: EO-4.4-L1-POST-A-BRIDGE-DESIGN-GATE

CODE CHANGED: NO
GOLDEN / SPEC / FIXTURES: UNCHANGED
CANDIDATE OPTION / L2 / CHOICE REGISTRY: NOT CREATED
PRODUCTION MOUNT: NO
ROADMAP: UNTOUCHED

UPSTREAM:
  #32 L1 Observer MINIMAL = SEALED PASS (test-only)
  #33 L1 Consumer Placement = PASS — CONSUMER NOT YET DEFINED
  #25 Candidate Option → L1 = REJECTED
  OPEN-4 = unresolved production Choice / Action Intent authority
  Phase 5 = FROZEN
```

**Single question:**

> After L1 Question A (`VALID | UNKNOWN | INVALID`), what semantic conditions — if any — are required before “Actual Character Choice”?

**Forbidden assumption:** Candidate Option · L2 · Choice Registry as default answers.

---

## 1. Actual Archaeology

### 1.1 Real call chains found

```text
[A] L1 Observer (implemented, test-only)
  scripts/test-l1-observer.js → observeL1({prose,pov?}) → judgment
  packages/inkos-brain export only
  Production callers: ABSENT

[B] Attribution adapter stub (not wired to observeL1)
  evidenceFromL1({judgment}) → TypedEvidence l1_judgment
    payload: sufficientAlone:false, isAttributionAuthority:false
  Callers: scripts/test-attribution-gate.js ONLY
  Production: ABSENT

[C] Narrative → Occurrence production
  Plan/Desire/Pressure/causal_chain → Writer Context → Writer → Prose
    → Actual Events → State / Character SR
    → Attribution soft (parallel, non-blocking)
  No L1 hop. No Choice mint.

[D] Plan “choice” / causal_chain
  causal-reasoner authored choice/options → renderCausalChain (Narrative Fuel)
  evaluateDecisions (legacy) → plan scoring
  ≠ Actual Character Choice object
```

### 1.2 Search summary (Choice-related)

| Symbol / idea | Production status |
|---------------|-------------------|
| `observeL1` | Test-only |
| `evidenceFromL1` | Test-only adapter |
| Character Choice object / Choice Registry | **ABSENT** |
| L2 / Dominance | **ABSENT** |
| Candidate Option type/store | **ABSENT** (ontology UNKNOWN) |
| Action selection engine | **ABSENT** as Character Choice |
| Attribution Gate → Registry | **PRESENT** (Layer B; ≠ Choice) |
| Actual action occurrence | **PRESENT** (Occurrence) |
| Intention / intentional Choice mint | **ABSENT** |
| Story-route `selected_route` | Route experiment — **≠** Character Choice |

```text
No roadmap-shaped chain SR → Options → L1 → L2 → Choice exists in code.
Do not invent one because it is missing.
```

---

## 2. Four-concept boundary

| Concept | Defined in frozen contracts? | Implemented in production? | Notes |
|---------|------------------------------|----------------------------|-------|
| **Choice Formation** (Question A) | **YES** — Golden L1 / observeL1 | **YES** (test-only classifier) | Evidence that formation is *observable* in prose |
| **Choice Selection** (which action / dominance) | **Partial roadmap only** (L2); **not sealed** as production | **NO** | Must not assume L2 |
| **Action Occurrence** | **YES** — Actual / StoryEvent | **YES** | What happened in text-world extract |
| **Character Attribution** | **YES** — Phase 4.4 Gate/Registry | **YES** (soft parallel) | Attributable action / causal history; **≠** Choice |

### Frozen inequalities (verified)

```text
L1 VALID          ≠ chosen action
Actual Action     ≠ intentional Choice          (R8 / Actual ↛ Choice)
Attribution PASS  ≠ Choice
Plan choice / causal_chain.choice ≠ Actual Choice
Observation       ≠ Choice
Observation       ≠ Canon
```

Phase 4.4 Design Gate also freezes:

```text
Occurrence ≠ Attribution ≠ Choice ≠ Consequence
```

Attribution can exist **without** a Choice object on every Action (#08 / 4.4 rename).

---

## 3. L1 VALID / UNKNOWN / INVALID capability

| Result | Can prove | Cannot prove | Code upgrade to Choice? |
|--------|-----------|--------------|-------------------------|
| **VALID** | Prose has sufficient Formation evidence (`Access ∧ Agency ∧ SubjectPresent`) | Which action · option set · production Choice mint · L2 · Attribution PASS · Occurrence authority | **NO** — no production consumer; contract `L1 VALID ↛ production Choice` (R13) |
| **UNKNOWN** | Evidence insufficient / ambiguous for Question A | “No choice in the world” · mandatory human popup · license to invent evidence | **NO** |
| **INVALID** | SubjectAbsent | Coercion · pressure · fear · “bad options” | **NO** |

```text
Upgrade L1 → Choice in packages/: ABSENT
```

---

## 4. Existing Bridge Map

```text
Prose
  ├──→ L1 Observer (Question A)     [test-only; judgment only]
  ├──→ Actual (Occurrence)          [production]
  ├──→ Attribution Gate             [production soft]
  └──→ (no sealed path to Choice object)

L1 VALID ──╳──→ production Character Choice     FORBIDDEN (R13)
L1 VALID ──?──→ evidenceFromL1 → Attribution    adapter shape only; unwired; ≠ Choice
Actual   ──╳──→ Choice Authority                FORBIDDEN (R14)
Plan     ──╳──→ Choice Authority                FORBIDDEN
SR       ──╳──→ Choice / L1 input               FORBIDDEN
Writer Context ──╳──→ Choice Authority          FORBIDDEN (AA20)

OPEN-4 Action Intent / production Choice
  = REQUIRED for Question B IF a production Choice object is ever minted
  = NOT IMPLEMENTED
  = NOT filled by L1 alone
```

### Hypotheses A–E (judgment only — no design)

| Hyp | Sketch | Archaeology verdict |
|-----|--------|---------------------|
| **A** Prose → L1 VALID → Choice | Direct mint | **CONFLICTS with R13** — not a legal bridge |
| **B** Prose → L1 VALID → additional evidence → Choice | L1 necessary but not sufficient | **PLAUSIBLE as contract shape** (aligns with OPEN-4 + Question A/B split) — **NOT IMPLEMENTED**; “additional evidence” unspecified |
| **C** Action-selection evidence → Choice; L1 independent | L1 diagnostic-only | **COMPATIBLE** with #33 CONSUMER NOT YET DEFINED + v0.2 “audit/diagnostics” |
| **D** Actual → Attribution/Agency → Choice | Occurrence/Attribution mint Choice | **CONFLICTS** if Actual/Attribution alone mint Choice; Attribution may support *attributability* without Choice object |
| **E** No independent Character Choice object | Attributability via 4.4; Formation via L1 optional | **OPEN / LIVE** — consistent with “not every Action requires Choice ID”; does not authorize treating Plan prose as Choice |

```text
No hypothesis is selected as frozen architecture this Gate.
```

---

## 5. Candidate Option — is it necessary?

```text
NOT established as necessary for a Post-A bridge.

Reasons:
  · Ontology still UNKNOWN (#25)
  · L1 Question A does not consume Candidate Options
  · R12: Candidate Option Generation ≠ L1 Observation
  · Assuming Options to “complete” Choice Formation would reopen REJECTED spine

Status: NOT REQUIRED AS DEFAULT ANSWER
        remains UNKNOWN / NOT AUTHORIZED if proposed later
```

---

## 6. L2 — is it necessary?

```text
NOT established as necessary.

Reasons:
  · L2 = Selection/Dominance (roadmap), only after L1 VALID if Selection exists
  · No sealed production Choice Selection layer
  · If Case E (no Choice object) or diagnostic-only L1, L2 is irrelevant

Status: NOT ENTERED · NOT ASSUMED
```

---

## 7. Human Intervention Rule — current status

Discussed intent (protagonist facing identity/behavior-changing choice → human popup):

| Source | Status |
|--------|--------|
| Production code | **ABSENT** as L1/Choice runtime rule |
| Frozen L1 / v0.2 / #26 | **ABSENT** |
| #33 | Explicitly: UNKNOWN ↛ human popup |

```text
UNFROZEN USER INTENT

≠ runtime contract
≠ this Gate’s freeze
≠ implementation backlog by default
```

---

## 8. AA20 Dual-Track Verification

```text
Narrative Track (intact):
  Plan → Writer Context → Writer → Prose → Actual / Occurrence
  causal_chain = Narrative Fuel (non-certifying)

Attribution Track (intact):
  Prose → TypedEvidence → Gate → PASS|UNKNOWN|INVALID → Registry
  soft; never blocks Actual/State/SR
```

Illegal promotions (still ABSENT / FORBIDDEN):

```text
L1 → Attribution → Choice     (no such production path; Attribution ≠ Choice)
L1 → Actual → Choice          ABSENT / FORBIDDEN
Writer Context → Choice       FORBIDDEN (AA20)
Plan → Choice                 FORBIDDEN
SR → Choice                   FORBIDDEN
```

L1 sits as an **independent Question-A classifier** today — not inserted into either production track.

---

## 9. Bridge Verdict

```text
BRIDGE VERDICT: BRIDGE UNKNOWN
```

Clarifications (same verdict, not alternatives chosen):

| Related fact | Label |
|--------------|-------|
| Automatic `L1 VALID → Choice` | **BRIDGE CONFLICTS WITH FROZEN CONTRACT** (must not be built) |
| OPEN-4 Question B authority | **DEFINED-BUT-NOT-IMPLEMENTED** (mint authority *if* Choice object is ever required — **not** “L1 downstream module”) |
| Independent Choice object required? | **UNKNOWN** (Case E still live) |
| Post-A semantic conditions list | **NOT SEALED** — only negative walls are sealed (what must *not* promote) |

```text
What is sealed about “after L1”:
  · L1 alone is insufficient for production Choice (R13)
  · Actual / Plan / Writer / SR alone are insufficient
  · Attribution ≠ Choice
  · Candidate Option / L2 are not licensed fillers

What is NOT sealed:
  · Whether a Character Choice object must exist at all
  · What positive conditions (OPEN-4 shape) mint it
  · Whether L1 must be a consumer input to that mint
  · Human popup rules
```

### Next Design Gate eligibility

```text
Eligible for a Named Design Gate that adjudicates:
  Question B / OPEN-4 vs Case E (no Choice object)
  and whether L1 is diagnostic-only vs optional weak evidence vs required conjunct

NOT eligible to implement:
  Choice Engine · Candidate Option · L2 · Choice Registry · production L1 mount
```

```text
Is next Choice Formation *implementation* authorized?
NO

Is next Choice Formation *ontology Design Gate* appropriate?
YES — only after Human picks among A–E / OPEN-4 / Case E
```

---

## 10. Next Gate Suggestion (report only)

```text
Recommended (if Human continues):
  READ-ONLY Design Gate —
  “OPEN-4 / Character Choice Object Necessity Adjudication”

IN SCOPE:
  · Must Character Choice exist as a production object?
  · If yes: sealed mint authority (OPEN-4) without Plan/Writer/Actual/L1-alone
  · Relation of L1 VALID to that mint (forbidden alone; required conjunct or optional?)
  · Relation of Attribution PASS to Choice (≠ automatic)

OUT OF SCOPE:
  · Candidate Option invent
  · L2 invent
  · Code / Golden edits
  · Human popup runtime
  · Production L1 wiring
```

---

## Final block

```text
DESIGN GATE RESULT:

PASS — BRIDGE UNKNOWN

(with sealed negative walls intact;
 OPEN-4 remains DEFINED-BUT-NOT-IMPLEMENTED as Question B,
 not as an L1→Choice auto-bridge)

STOP
```

```text
NO CODE
NO GOLDEN EDIT
NO SPEC EDIT
NO FIXTURE EDIT
NO CANDIDATE OPTION
NO L2
NO CHOICE REGISTRY
NO CHOICE ENGINE
NO PRODUCTION L1 MOUNT
NO SR / ATTRIBUTION / PHASE 5 / ROADMAP CHANGE
NO HUMAN-POPUP CONTRACT
NO AUTO IMPLEMENTATION

AWAIT HUMAN ADJUDICATION
STOP
```
