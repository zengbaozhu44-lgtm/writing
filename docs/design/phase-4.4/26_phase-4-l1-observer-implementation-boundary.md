# 26 — L1 Observer Implementation Boundary (Question A Only)

```text
MODE: READ-ONLY / DESIGN ONLY / NO CODE / NO EO
GATE TYPE: Implementation Boundary Adjudication
STATUS: PROPOSED — NOT AUTHORIZED FOR IMPLEMENTATION

UPSTREAM:
  #25 PASS / SEALED (25b)
  Golden: golden/reality/l1-choice-formation/SPEC.md (FROZEN)
  Companion: docs/design/phase-4/03_l1-production-boundary-v0.2.md

#25 SEALED CONSTRAINTS IN FORCE:
  Candidate Option ↛ L1
  SR → Candidate Options → L1 = REJECTED
  Producer / Option Store = NOT AUTHORIZED
  Q4 NO = Golden L1 / Question A only (not full Choice system)

THIS GATE IS NOT:
  · L1 Observer implementation
  · Candidate Option design
  · Option Access store
  · Choice mint / OPEN-4
  · L2 Dominance
  · Roadmap file edit
  · Golden / fixture edits
```

**Sole purpose:**

> Fix the **implementation boundary** of the L1 Observer for Question A —  
> what it may read, how evidence is classified, when VALID / UNKNOWN / INVALID obtain —  
> **without** implementing the Observer and **without** expanding ontology.

---

## 1. Executive Verdict

```text
A1 Input wall:        READY / FROZEN (cite Golden)
A2 Evidence taxonomy: READY / FROZEN as classification labels
                       ≠ Character Choice objects
A3 VALID:             READY / FROZEN formula + conjunct boundaries
A4 UNKNOWN:           READY / FIRST-CLASS (not fallback, not LLM guess)
A5 INVALID:           READY / SubjectAbsent-only (+ coercion triplet)

Implementation:       NOT AUTHORIZED this round
EO:                   NOT AUTHORIZED
Observer code:        MUST NOT start from this report alone

Smallest residual before any EO:
  Human Seal of this Boundary document
  + explicit non-goals freeze
  (+ optional: Phase 7.7 Observer Spec elaboration — still NO CODE)

Post-L1 “???” (OPEN-4 / alternatives / Decision Context):
  OUT OF SCOPE — do not name as modules here
```

**One-line truth:**

> L1 Observer boundary for Question A is already largely frozen in Golden.  
> #26’s job is to **seal that boundary as the only legal implementation surface** —  
> especially elevating **UNKNOWN** to a first-class result —  
> not to authorize building L1, L2, or Candidate Option.

---

## 2. Scope & Non-Goals

### In scope (A1–A5)

| ID | Topic |
|----|--------|
| A1 | Legal Observer inputs |
| A2 | Evidence taxonomy as classification |
| A3 | VALID conjuncts |
| A4 | UNKNOWN as first-class |
| A5 | INVALID / SubjectAbsent / coercion |

### Explicit non-goals

```text
NO Observer runtime
NO schema / Choice Registry
NO Candidate Option / Option Store
NO Attribution merge
NO Plan / SR injection “for accuracy”
NO L2
NO Choice Adjudication design (OPEN-4)
NO literary validation
NO Golden fixture expansion (24 fixtures frozen)
NO roadmap file reconciliation
```

### Guardrail (Human)

```text
Candidate Option excluded from L1
  ≠
  “顺手把整个 L1 做出来”
```

#26 answers **boundary**, not **build**.

---

## 3. A1 — Input Wall

### 3.1 Legal inputs (frozen)

```text
Observer Input =
  prose
  + optional pov   (name resolution only)
```

Source: Golden SPEC §Oracle Architecture; Forbidden Observer Inputs; v0.2 `03` §2.

### 3.2 Forbidden inputs (implementation wall)

| Input | Status | Why |
|-------|--------|-----|
| Character SR | ❌ FORBIDDEN | #25; Golden; v0.2 W4 |
| Plan | ❌ FORBIDDEN | Golden |
| causal_chain / causalChain.choice | ❌ FORBIDDEN | Golden iron law |
| Candidate Option / Option store | ❌ FORBIDDEN | #25 Q2 |
| Actual Event store | ❌ FORBIDDEN | Observer reads prose, not Actual objects |
| Attribution Gate / Registry | ❌ FORBIDDEN | Parallel track; ≠ L1 |
| Writer Context | ❌ FORBIDDEN | Narrative fuel ≠ Observer input |
| scene goal / intent | ❌ FORBIDDEN | Golden |
| canon / metrics / reader / critic | ❌ FORBIDDEN | Golden |
| fixture `expected` | ❌ FORBIDDEN | Oracle-only |
| fixture `evidence` annotation | ❌ FORBIDDEN | Human rationale; not Observer input |
| `forbidden_inference` | ❌ FORBIDDEN as input | Runner/oracle guidance only |

### 3.3 Output wall (closed labels)

**Allowed:**

```text
judgment ∈ { VALID, UNKNOWN, INVALID }

optional structured labels ONLY from Golden taxonomy, e.g.:
  access_level ∈ { E1, E2, E3, E4, E5, insufficient, ambiguous }
  agency      ∈ { present_cue, insufficient, ambiguous, … }
  subject     ∈ { present, absent, ambiguous }
```

**Forbidden:**

```text
free-form option strings
“character should choose X”
invented Candidate Options
production Choice mint
which-action selection
```

```text
A1 STATUS: READY TO FREEZE AS IMPLEMENTATION BOUNDARY
```

---

## 4. A2 — Evidence Taxonomy

### 4.1 Role

```text
Evidence taxonomy
  = classification labels for prose cues
  ≠ Character Choice object
  ≠ Candidate Option list
  ≠ production ontology mint
```

Legal direction (Golden iron law):

```text
Prose → L1 Evidence (classify) → L1 Judgment
```

### 4.2 Access levels (E1–E5)

| Level | Form | Sufficient for Access dimension? | Notes |
|-------|------|----------------------------------|-------|
| **E1** | Explicit multi-option | ✅ | Paths named/entered in character model in prose |
| **E2** | Negation of an action | ✅ | Negated path in model; **L1-U03**: does **not** license inferring a second chosen path |
| **E3** | 「没做 X」alone | ❌ | Does not prove Y was chosen / available |
| **E4** | Fork / 取舍 narrative | ✅ | Conscious sustained/refused branch |
| **E5** | Pure action | ❌ | Action ≠ Formation evidence |

### 4.3 Agency cues (classification, not Attribution)

Agency = traceability to **narrated internal state** at *t*:

- desire, fear, habit-with-deliberation mark, curiosity, duty, judgment, disgust, impulse, character tendency  
- OR E4 fork with conscious sustained/refused branch

**Insufficient for Agency:**

- External facts alone  
- Environmental plausibility without text-stated internal state  

```text
Agency (L1)
  ≠ Attribution agencyCue
  ≠ Plan desire / characterPush
  ≠ Pressure / Conflict alone
```

### 4.4 Subject Presence / Absence (classification)

| Label | Meaning |
|-------|---------|
| present | Not SubjectAbsent |
| absent | SubjectAbsent → drives INVALID |
| ambiguous | Insufficient clarity → typically UNKNOWN path, not INVALID |

SubjectAbsent set (Golden): sleep / unconscious / dissociation / pure reflex without awareness / acting without knowing one acts / explicit loss of agency (puppet).

### 4.5 Taxonomy ≠ objects

```text
Classifying prose as E1
  ≠ minting Candidate Option {A, B}
Classifying Agency present_cue
  ≠ Attribution PASS
Classifying SubjectPresent
  ≠ “name appears in sentence”
```

```text
A2 STATUS: READY — FROZEN TAXONOMY AS OBSERVER LABELS ONLY
```

---

## 5. A3 — VALID

### 5.1 Formula (frozen)

```text
L1_VALID(R,t) := Access(R,t) ∧ Agency(R,t) ∧ SubjectPresent(R,t)
```

All three must hold **from prose evidence**. Dimensions judged **independently** (coercion triplet note).

### 5.2 Conjunct boundaries (must not collapse)

| Claim | Adjudication |
|-------|----------------|
| Access ≠ Knowledge / Fact Access | **YES** — knowing key on table ≠ Option Access for escape |
| Access ≠ Capability | **YES** |
| Access ≠ World Opportunity | **YES** |
| Agency ≠ Attribution `agencyCue` | **YES** — parallel heuristic; L1 uses narrated internal-state evidence |
| Agency ≠ Desire / Pressure / Plan | **YES** — auto-promotion FORBIDDEN |
| SubjectPresent ≠ grammatical subject | **YES** — grammar ≠ presence (both directions FORBIDDEN) |
| SubjectPresent ≠ “character physically mentioned” | **YES** — mention ≠ presence; absence is the SubjectAbsent set |
| VALID ≠ which action was chosen | **YES** |
| VALID ≠ production Choice object | **YES** |
| VALID ≠ L2 Dominance | **YES** — Observer outputs no L2 |
| VALID ≠ Attribution PASS | **YES** |

### 5.3 Positive fixture families (what VALID looks like)

From Golden groups (oracle expected VALID):

- E1 explicit multi-option + Agency + Presence  
- E2 negation with Agency + Presence (Access for negated path; U03 limits)  
- E4 fork / 取舍 + conscious branch  
- Coercion + conscious tradeoff (P07)  
- Fear + choice; pain + persistence — still VALID when conjuncts hold  

### 5.4 Insufficient alone → not VALID

```text
Access alone ↛ VALID
Agency alone ↛ VALID
Presence alone ↛ VALID
E5 pure action ↛ VALID
Fear alone ↛ VALID
```

```text
A3 STATUS: READY — FORMULA + ANTI-COLLAPSE BOUNDARIES FROZEN
```

---

## 6. A4 — UNKNOWN (first-class)

### 6.1 Strategic role

```text
UNKNOWN is a first-class Observer result.
UNKNOWN is NOT a fallback “when unsure, guess VALID”.
UNKNOWN is NOT a soft INVALID.
UNKNOWN ≠ “no choice happened in the world”.
```

Human emphasis for #26: prevent

```text
证据不足 → LLM 猜测 → VALID     FORBIDDEN
证据不足 → INVALID              FORBIDDEN (unless SubjectAbsent)
```

Correct:

```text
证据不足 / 模糊 / 维度不全 → UNKNOWN
```

### 6.2 When UNKNOWN is required (Golden-aligned)

| Pattern | Why UNKNOWN |
|---------|-------------|
| E5 pure action | No Access formation evidence |
| Habit / routine without deliberation mark | Agency insufficient |
| Reader counterfactual trap | Reader 「也可以不…」≠ Access |
| E2 without second path (L1-U03 core) | Negated path in model ≠ infer chosen Y |
| Action + retrospective reason only | Temporal / Agency insufficient for *t* |
| Ambiguous hesitation | Dimensions unclear |
| Coercion + 「只能」without tradeoff evidence (U08) | Constraint ≠ Access ≠ Agency |
| Fact knowledge without Option Access evidence | Fact ≠ Access |
| Fear / pressure alone without Access+Agency | Emotion ≠ Choice Formation |

### 6.3 Implementation boundary rules for UNKNOWN

```text
R-U1  Prefer UNKNOWN over inventing Access/Agency from plausibility.
R-U2  Prefer UNKNOWN over INVALID when SubjectAbsent is not evidenced.
R-U3  Closed labels may record insufficient/ambiguous; must not invent options.
R-U4  LLM confidence / “feels like a choice” ↛ VALID.
R-U5  Plan/SR/Writer Context must not rescue UNKNOWN into VALID.
R-U6  Until Observer exists, golden fixtures expect ENGINE_NOT_IMPLEMENTED (RED)
      — not a license to ship a guessing Observer.
```

### 6.4 Runner implication (when Observer exists)

| Group | Pass condition |
|-------|----------------|
| U (unknown_boundary) | actual === UNKNOWN (zero false positive → VALID/INVALID) |

False positive into VALID is the critical failure mode this Gate forbids.

```text
A4 STATUS: READY — UNKNOWN ELEVATED AS FIRST-CLASS BOUNDARY
```

---

## 7. A5 — INVALID

### 7.1 Sole path to INVALID

```text
INVALID ⇔ SubjectAbsent (Golden set)
```

**Not INVALID:**

```text
fear · pain · threat · irrationality · coercion while conscious
Pressure · Conflict · Constraint alone
```

### 7.2 Coercion triplet (frozen)

| Fixture | Pattern | Expected |
|---------|---------|----------|
| L1-P07 | 枪口 + **清醒取舍** | VALID |
| L1-U08 | 枪口 + 「只能」+ **无取舍证据** | UNKNOWN |
| L1-I06 | **失去意识** + 他人代行 | INVALID |

```text
Subject Absence ≠ External Coercion
Constraint ≠ Access ≠ Agency ≠ Subject Presence
```

### 7.3 SubjectAbsent inventory (implementation checklist)

| Marker | INVALID? |
|--------|----------|
| sleep / sleepwalking | YES if SubjectAbsent evidenced |
| unconscious | YES |
| dissociation | YES |
| pure reflex without awareness | YES |
| acting without knowing one acts | YES |
| puppet / another's hand / explicit loss of agency | YES |
| coerced but conscious tradeoff | NO → may be VALID (P07) |
| coerced + only 「只能」 without tradeoff | NO → UNKNOWN (U08) |

### 7.4 Anti-patterns

```text
Conflict → INVALID          FORBIDDEN
Pressure → INVALID          FORBIDDEN
「必须/只能/不得不/被迫」auto → INVALID   FORBIDDEN
Grammatical object / passive voice → INVALID   FORBIDDEN auto
Irrational choice → INVALID FORBIDDEN (R7; L1 ≠ rationality judge)
```

```text
A5 STATUS: READY — INVALID = SubjectAbsent ONLY
```

---

## 8. Judgment decision sketch (boundary only — not code)

```text
1. Read prose (+ optional pov for name resolution only)
2. Classify Access (E1–E5 / insufficient / ambiguous)
3. Classify Agency (present_cue / insufficient / ambiguous)
4. Classify Subject (present / absent / ambiguous)
5. If subject = absent (SubjectAbsent evidenced) → INVALID
6. Else if Access sufficient AND Agency sufficient AND subject present → VALID
7. Else → UNKNOWN

Never: invent options · consult Plan/SR · mint Choice · run L2
```

This sketch is a **contract algorithm**, not an implementation authorization.

---

## 9. Parallel tracks (must not merge)

```text
L1 Observer (Question A)
  Prose → Evidence labels → VALID|UNKNOWN|INVALID
  ≠ production Choice
  ≠ Attribution

Attribution (Phase 4.4)
  Prose excerpt → TypedEvidence → Gate → Registry
  agencyCue ≠ L1 Agency
  PASS ≠ L1 VALID

Narrative
  Plan / SR → Writer → Prose
  supplies prose surface; not Observer inputs
```

```text
L1 VALID ↛ Attribution PASS
Attribution PASS ↛ L1 VALID
L1 VALID ↛ Choice mint (OPEN-4)
```

---

## 10. Post-L1 “???” (explicitly out of scope)

Per Human strategy after #25:

```text
L1 VALID
   ↓
  ???
   ↓
  L2 / Actual Character Choice
```

```text
??? may be:
  Choice Adjudication
  action alternatives (conceptual)
  Decision Context
  or no persistent object
```

```text
#26 MUST NOT:
  name ??? as a system module
  fill ??? with Candidate Option
  authorize L2
```

That is a **later** archaeology / Design Gate (OPEN-4 territory).

---

## 11. Production archaeology (boundary readiness)

| Artifact | Status vs A1–A5 |
|----------|-----------------|
| Golden SPEC + 24 fixtures | Authoritative; Observer unimplemented → expect RED |
| Runtime L1 Observer in packages | **ABSENT** |
| Attribution `detectAttributionCues` | **≠** L1 Agency classifier |
| `characterCanAccessActualEvent` | Fact Access ≠ L1 Access |
| Plan / causal_chain | Narrative only; ❌ Observer input |
| Character SR in prompt | Writer fuel; ❌ Observer input |

No production path currently enforces A1–A5. That is **absence of Observer**, not a license to widen inputs.

---

## 12. Boundary freeze table

| Boundary | Freeze text |
|----------|-------------|
| Input | prose + optional pov only |
| Output | VALID \| UNKNOWN \| INVALID (+ closed labels) |
| Access | E1–E5 taxonomy; Fact≠Access; U03 |
| Agency | narrated internal state at *t*; ≠ Attribution cue |
| Presence | SubjectAbsent set only for INVALID |
| UNKNOWN | first-class; prefer over guess or false INVALID |
| VALID | conjuncts only; ≠ which-action; ≠ mint |
| Candidate Option | not input, not output, not required for Question A |
| SR / Plan / Actual / Attribution / Writer Context | not Observer inputs |
| L2 / OPEN-4 | downstream; not this Gate |

---

## 13. What would still be needed before any EO (report only)

```text
1. Human Seal of #26 Boundary (this document or successor)
2. Explicit EO non-goals matching §2
3. Optional: Phase 7.7 Observer Spec elaboration (still NO CODE)
4. Only then: separate EO for Observer that:
     · consumes prose (+pov)
     · emits closed labels + judgment
     · is scored ONLY against Golden fixtures
     · must not touch Plan/SR/Choice mint/L2
```

```text
This report alone ≠ EO authorization
```

---

## 14. Phase 4 status (consistent with #25b; no roadmap file edit)

```text
Phase 4
│
├── 4.1 Actual → Character SR          … existing
├── 4.2 Candidate Option → L1          … ❌ REJECTED (#25 SEALED)
├── 4.3 Candidate Option ontology      … UNKNOWN / NOT AUTHORIZED
├── 4.4 L1 Observer Boundary           … #26 THIS GATE (design)
├── 4.5 Post-L1 Choice Adjudication    … OPEN / NOT YET DESIGNED (???)
└── L2 Dominance                       … DOWNSTREAM / NOT AUTHORIZED
```

---

## 15. Final block

```text
==================================================
PHASE 4 — #26 L1 OBSERVER IMPLEMENTATION BOUNDARY
QUESTION A ONLY
==================================================

A1 Input:
  LEGAL = prose + optional pov
  FORBIDDEN = SR, Plan, causal_chain, CandidateOption,
              Actual store, Attribution, Writer Context,
              expected, evidence annotation, canon, metrics

A2 Evidence taxonomy:
  E1–E5 + Agency cues + SubjectPresent/Absent
  = classification labels only
  ≠ Choice / Candidate Option objects

A3 VALID:
  Access ∧ Agency ∧ SubjectPresent
  Access ≠ Knowledge
  Agency ≠ Attribution agencyCue
  SubjectPresent ≠ mere mention / grammar

A4 UNKNOWN:
  FIRST-CLASS
  证据不足 → UNKNOWN
  FORBIDDEN: LLM guess → VALID
  FORBIDDEN: 证据不足 → INVALID (unless SubjectAbsent)

A5 INVALID:
  SubjectAbsent ONLY
  Coercion / Pressure / Threat / Conflict ↛ INVALID auto
  Coercion triplet P07/U08/I06 retained

--------------------------------------------------
CONTRACT STATUS
--------------------------------------------------

Golden L1:     UNCHANGED
v0.2:          UNCHANGED
#25 Seal:      IN FORCE
AA20:          UNCHANGED
Attribution:   UNCHANGED
Phase 5:       FROZEN
Roadmap file:  NOT EDITED

Implementation: NOT AUTHORIZED
EO:             NOT AUTHORIZED
L2 / OPEN-4:    OUT OF SCOPE

--------------------------------------------------
NEXT (after Human Seal of #26, if any)
--------------------------------------------------

NOT: implement L1 immediately
NOT: design Candidate Option
NOT: fill post-L1 ??? with modules

IF Human seals #26:
  optional Phase 7.7 Observer Spec elaboration
  OR wait for explicit EO authorizing Observer-only work
  against Golden fixtures

--------------------------------------------------
STOP
--------------------------------------------------

NO CODE
NO EO
NO GOLDEN CHANGE
NO SCHEMA
NO RUNTIME
NO SEMANTIC INVENTION BEYOND GOLDEN CITATION
STOP AFTER REPORT
```
