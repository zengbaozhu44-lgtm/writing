# 25 — Phase 4 Candidate Option Ontology / L1 Placement Adjudication

```text
MODE: READ-ONLY / DESIGN GATE / NO CODE / NO EO
GATE TYPE: Ontology Adjudication
STATUS: PROPOSED — NOT AUTHORIZED FOR IMPLEMENTATION

UPSTREAM:
  #23 Mainline-Blocker Adjudication
  #24 Candidate Option / L1 Boundary Archaeology

AUTHORITY ORDER (this Gate):
  Golden / Frozen Contract
    > Sealed Semantic Contract / Anti-laundering Walls
    > Design Gate / Audit Findings
    > Roadmap
    > Implementation Convenience

Golden L1: UNCHANGED
v0.2: UNCHANGED
AA20: UNCHANGED
Attribution: UNCHANGED
Phase 5: FROZEN
Roadmap text: NOT MODIFIED this round (disposition reported only)
```

**Gate purpose only:**

> Decide whether `Candidate Option` is a formal Character Causality ontology object,  
> and if so, whether it sits before L1, after L1, or orthogonal to L1.

**Not this Gate:** producers, schemas, stores, Observer runtime, Choice mint, L2 runtime.

---

## 1. Executive Verdict

```text
Q1 Candidate Option as formal ontology object:  UNKNOWN
     (positive semantics unproven; not sealed; must not be promoted)

Q2 Participates in L1:                          NO
     (Golden + v0.2: Candidate Option ↛ L1 Observer)

Q3 Placement:                                   NONE for L1 path
     BEFORE L1: REJECTED (conflicts Golden/v0.2)
     AFTER L1 / ORTHOGONAL: NOT AUTHORIZED
       (may be researched later as conceptual input ≠ sealed object)

Q4 Necessary for Choice Formation (L1):         NO
Q5 Necessary for L2:                            UNKNOWN
     (roadmap L2 inputs do not require Candidate Option object;
      “admissible alternatives” may be conceptual only)

Q6 L1 can operate without Candidate Option:     YES
     (Golden pipeline is complete without it)

C1 Roadmap vs Golden:                           RESOLVED FOR L1
     Roadmap chain SR → Candidate Options → … → L1
     = HYPOTHESIS REJECTED as L1 architecture
     Disposition: REMOVE from L1 / Choice Formation spine
     (do not edit roadmap file this round — report only)

OPEN-1: NOT CLOSED as “producer design”
        REFRAMED: object necessity outside L1 remains UNKNOWN;
        producer design remains NOT AUTHORIZED
```

**One-line truth:**

> Choice Formation under Golden is `Prose → Evidence → L1 Judgment`.  
> `Candidate Option` is **not** an L1 input, **not** required for L1, and **not** a sealed formal ontology object.  
> Keeping the Roadmap `SR → Candidate Options → L1` spine would violate Golden.  
> Do **not** invent a Candidate Option Engine to repair that spine.

---

## 2. Authoritative L1 Contract (frozen — cited)

Source: `golden/reality/l1-choice-formation/SPEC.md` (FROZEN)

```text
L1 Observer Input = prose + optional pov
L1_VALID(R,t) := Access(R,t) ∧ Agency(R,t) ∧ SubjectPresent(R,t)
Output = VALID | UNKNOWN | INVALID
Role = Evidence-Based Observation of Choice Formation
≠ Option Generator · ≠ Action Selector · ≠ Choice Mint
```

Preserved meanings:

```text
UNKNOWN ≠ NO CHOICE
INVALID ≠ COERCION
VALID ≠ WHICH ACTION WAS CHOSEN
VALID ≠ production Character Choice object
```

Companion walls (`01`…`04` v0.2 DRAFT; keep / do not roll back):

```text
SR → automatic Option generation     FORBIDDEN
SR → L1 Observer input               FORBIDDEN
Candidate Options → L1 (as input)    FORBIDDEN (Observer must not consume Option lists;
                                     Observer must not invent free-form options)
Plan / causal_chain.options
  → Character Option authority       FORBIDDEN
L1 VALID → production Choice mint    FORBIDDEN
```

---

## 3. Conflict Localization (Roadmap vs Contract)

| Artifact | Claim |
|----------|-------|
| Roadmap Phase 4.2 / #23 framing | `SR → Candidate Options → Access → Agency → L1 → Choice` |
| Golden L1 | `Prose → Evidence → Access∧Agency∧SubjectPresent → VALID\|UNKNOWN\|INVALID` |
| v0.2 W4 / Loop ③ | SR↛Option gen; SR↛L1 |
| v0.2 §4 / R12 | L1 ≠ Candidate Option Generation |

```text
CONFLICT TYPE: Architecture hypothesis vs frozen Observer contract
RESOLUTION RULE (this Gate): Correct Roadmap disposition — do not modify Golden
L1 DISPOSITION: REJECT Roadmap spine as Choice Formation architecture
```

#23’s “primary break = SR → Candidate Options MISSING” correctly observed **production absence**, but incorrectly treated that edge as an **authorized** missing piece. Under this Gate:

```text
Missing unauthorized edge ≠ Implementation backlog
```

---

## 4. Q1 — Is Candidate Option a formal ontology object?

### 4.1 Negative proof (it is not these)

| Forbidden identification | Status |
|--------------------------|--------|
| LLM prediction | NO |
| Action Generation | NO |
| Plan option / `causal_chain.options` | NO |
| Authorial Planned Direction / Narrative Fuel | NO |
| Expected / Predicted Action | NO |
| World Possibility / Opportunity / Capability | NO |
| Fact Access / Information Access | NO |
| Attribution Evidence / Attribution PASS | NO |
| Choice itself / L1 VALID | NO |

(Evidence: v0.2 §3 table, anti-laundering matrix, AA20, Phase 4.4 Attribution ≠ Choice.)

### 4.2 Positive proof (independent sealed semantics)

```text
Sealed positive definition: ABSENT
Sealed legal producer: NONE (OPEN-1)
Sealed requirement that Character Causality must include this object: ABSENT
```

Design Gate D1 (`05`): ontology **NOT DETERMINED → STOP-1**.  
v0.2: “If Candidate Option cannot be safely defined: keep **OPEN** rather than invent unsafe architecture.”

### 4.3 Necessity tests (Choice Formation / L1)

| Test | Question | Result |
|------|----------|--------|
| **A** | Without Candidate Option, can Character Causality *Choice Formation* still be expressed? | **YES it can** — Golden `Prose→Evidence→L1` | → does **not** force YES for object necessity |
| **B** | Without it, can L2 run? | **UNKNOWN** — L2 roadmap inputs omit Candidate Option object; may need conceptual alternatives |
| **C** | Without it, can Actual Character Choice be determined? | **UNKNOWN** — OPEN-4 unresolved; no sealed dependency on Candidate Option |
| **D** | Without it, can multi-path choice be explained? | **YES via prose** — E1/E2/E4 Access evidence already encodes multi-option / fork in text without a persistent Option object |
| **E** | Frozen contract requires Candidate Option as formal object? | **NO** |

```text
Q1 ADJUDICATION: UNKNOWN

Meaning:
  · Not sealed as a formal ontology object
  · Independent positive semantics unproven
  · Must NOT be promoted to formal object by Roadmap inertia
  · Residual unknown only concerns possible post-L1 conceptual needs
    (not an authorization to design a producer)
```

**Not YES.** Promoting to YES would invent ontology.

---

## 5. Q2 — Does Candidate Option participate in L1?

```text
Q2: NO
```

No frozen evidence overturns:

```text
Observer reads: prose (+ optional pov)
Observer must NOT invent free-form options
Prose → generated Candidate Options → Choice   FORBIDDEN
```

Access / Agency / SubjectPresent inside L1 are **judgment dimensions derived from prose evidence**, not consumptions of a Candidate Option store.

---

## 6. Hypothesis comparison (placement)

### Hypothesis A — Before L1 (`SR → Candidate Option → Access/Agency → L1`)

| Check | Result |
|-------|--------|
| Matches Roadmap | Yes |
| Matches Golden | **No** |
| Matches v0.2 W4 | **No** |
| Sealed bridge allowing A | **None** |

```text
Hypothesis A: REJECTED
```

### Hypothesis B — After L1 (`L1 VALID → Choice Adjudication → Candidate Option → Actual Choice`)

| Question | Finding |
|----------|---------|
| What L1 proves | Evidence sufficiency for Formation (Question A) |
| What L1 does not prove | Which action; production Choice mint; Option list authority |
| Must Choice Adjudication rebuild candidate actions? | **UNKNOWN** — no sealed Choice Adjudication layer |
| Is Candidate Option necessary vs temporary reasoning? | **UNKNOWN** |
| Relation to L2 | L2 roadmap lists State / Goals / Constraints / Expected Consequence / Identity — **not** Candidate Option object |
| Causal History requirement | **UNKNOWN** / not sealed |
| Plan→Choice contamination risk | **HIGH** if Adjudication reuses Plan.options |

```text
Hypothesis B: NOT AUTHORIZED
  (semantic layer may exist later — separate Design Gate only;
   does not establish Candidate Option as formal object today)
```

### Hypothesis C — Orthogonal to L1

Possible in principle as a non-L1 Character Causality layer (Action Selection / L2 input / availability).  
No sealed contract places Candidate Option there. Risk: reintroducing SR→Option or Plan→Option under a new name.

```text
Hypothesis C: NOT AUTHORIZED (research residue only)
```

### Placement adjudication

```text
Q3: NONE (for Choice Formation / L1)
    BEFORE L1 = REJECTED
    AFTER L1 / ORTHOGONAL = UNKNOWN residue → later Gate; not YES
```

---

## 7. Q3 supplement — Who judges “可行动路径” if not Candidate Option→L1?

| Concept | Answers | Persistence today | Notes |
|---------|---------|-------------------|-------|
| **Information Access** | Can character know/perceive fact? | Production (`characterCanAccessActualEvent` → SR) | ≠ Option Access |
| **Option Access** | Is path available-to-self at *t*? | L1: judged from prose E1/E2/E4; store OPEN-2 | Not auto from Fact Access |
| **Capability** | Can character do X in general? | Not Option | 会开枪 ↛ 此刻 Candidate Option |
| **Opportunity** | World possibility / situation fuel | Narrative LEGAL | ↛ Character Option |
| **Candidate Option** | Formal object? | **Unsealed / UNKNOWN** | Not L1 input |
| **Choice Evidence** | L1 taxonomy in prose | Golden | Formation evidence |
| **Actual Choice** | Production Choice mint | OPEN-4 ABSENT | ≠ `open_choice` occurrence |

```text
For Choice Formation (Question A):
  “可行动路径” is adjudicated as L1 Access evidence in prose —
  not as a Candidate Option registry feeding the Observer.
```

Option Access **store** remains OPEN-2 — **not** authorized by this Gate.

---

## 8. Source adjudication table

| Source | Current semantics | Is Candidate Option? | Authority for Candidate Option? | Conclusion |
|--------|-------------------|----------------------|----------------------------------|------------|
| Plan | Narrative guidance | NO | NO | Narrative only |
| `causal_chain.options` | Authorial narrative options | NO | NO | Narrative only (AA20) |
| Writer | Prose generation | NO | NO | Renderer |
| Writer Context | N1/N2/N3 fuel | NO | NO | Narrative fuel |
| Actual | World occurrence | NO | NO | Reality only |
| SR | Subjective fact projection | NO automatic generation | NO automatic generation | Fuel for Writer; ≠ Option Generator; ≠ L1 input |
| Character State | State snapshot | UNKNOWN | not authorized | research only |
| Goal | Goal / plan goal | NO | NO | not option authority |
| Pressure | Obstacle / pressure | NO | NO | not option authority |
| Situation | Narrative situation | NO | NO | not option authority |
| Opportunity | World possibility | NO | NO | not option authority |
| Capability | Ability | NO | NO | not option authority |
| Prose | Textual evidence | NO free-form generation | YES as **L1 evidence source only** | evidence |
| Attribution Gate | Attribution judgment | NO | NO | parallel track |
| L1 Observer | Choice evidence judgment | NO | no option generation | frozen boundary |

**OBSERVED (code):** Plan→Writer and SR→Writer Context are production; no Candidate Option type/store/producer in packages.

---

## 9. SR’s legitimate relationship to Character Choice

### Observed production path

```text
Actual (+IB) → Character SR (fact subjectivity)
Character SR → Writer Context (Subjective State block)
Writer → Prose
Prose → L1 (when Observer exists)     [judgment only]
Prose → Attribution soft               [parallel]
Prose → Actual                         [occurrence]
```

### Forbidden (unchanged)

```text
SR → automatic Candidate Option generation
SR → L1 Observer input
SR → Choice Authority
SR → Agency / Option Access auto
```

### Legitimate bridge (adjudicated)

```text
Q7:
  SR may shape narration as subjective fuel (Writer Context),
  which may yield prose that L1 later observes.
  That is Narrative Track influence — not Choice Formation ontology.

  SR ↛ Choice
  SR ↛ L1 input
  SR ↛ Option Generator

  Optional future (NOT AUTHORIZED here):
    SR → Decision Context for post-L1 Choice Adjudication
    requires separate Gate; must not launder Plan/SR into Choice.
```

---

## 10. L1 vs later Choice Adjudication

```text
Q8:
  L1 = Choice Evidence Observer (Question A)
  L1 VALID ≠ production Choice
  L1 VALID ≠ Attribution PASS
  L1 VALID ≠ license to mint Candidate Options

  If a later “Choice Adjudication” layer exists (Question B / OPEN-4),
  it is a SEPARATE Design Gate.
  It must not be smuggled in as Candidate Option before L1.
```

---

## 11. L2 demand check

Roadmap Phase 4.3 inputs:

```text
Character State(t)
Goal weights
Constraint impact
Expected Consequence quality
Identity consistency
```

```text
Does NOT list: Candidate Option persistent object
```

```text
conceptual input “admissible action alternatives”
  ≠
persistent ontology object “Candidate Option”
```

```text
Q5: UNKNOWN
  (whether L2 needs conceptual alternatives is open;
   whether that equals Candidate Option ontology is unproven —
   default: do not create the object to satisfy Roadmap habit)
```

---

## 12. Attribution & Narrative tracks (unchanged)

```text
Attribution:
  Prose → TypedEvidence → Gate → Registry
  ∥ L1;  Attribution ↛ Candidate Option ↛ Choice
  L1 VALID ↛ Attribution PASS

Narrative:
  Plan → Writer Context → Writer → Prose
  causal_chain.options = Narrative / Authorial fuel
  Plan ↛ Candidate Option ↛ Choice
```

---

## 13. Final ontology diagram (adjudicated)

Candidate Option is **not** placed on the L1 path:

```text
Character SR
      │
      │  (subjective fuel — Narrative Track)
      ▼
   Writer  ←── Plan / causal_chain (Narrative Fuel only)
      │
      ▼
    Prose
      │
      ├──────────────────────────────┐
      ▼                              ▼
 Evidence                     TypedEvidence
      │                              │
      ▼                              ▼
 L1 Observer                  Attribution Gate
      │                              │
      ├── UNKNOWN → STOP (no Choice claim)
      ├── INVALID  (SubjectAbsent)
      └── VALID
             │
             ▼
      [Choice Adjudication / OPEN-4]   ← NOT DESIGNED / NOT AUTHORIZED
             │
             ▼
      [L2 Dominance]                   ← NOT DESIGNED / NOT AUTHORIZED
             │
             ▼
      [Actual Character Choice]        ← NOT MINTED

PARALLEL FORBIDDEN:
  Candidate Option → L1 Observer
  SR → Candidate Option → L1
```

If future work places any “option-like” structure **after** L1 VALID, it requires a **new** Design Gate and must not reuse Plan.options as Character Options.

---

## 14. Forbidden paths (must remain)

```text
SR → automatic Candidate Option generation
SR → L1 Observer
Candidate Option → L1 Observer
Plan.options → Character Option
causal_chain.options → Character Option
Writer → Candidate Option authority
Writer Context → Candidate Option authority
Actual → Candidate Option authority
World Possibility → Character Option
Capability → Character Option
Opportunity → Character Option
Information Access → Option Access
Option Access → Choice
Attribution → Choice
L1 VALID → Choice mint
open_choice occurrence → Character Choice
Expected Action → Choice
Pressure → Choice
Conflict → Choice
Plan → Choice
```

---

## 15. Frozen inequalities (retained)

```text
Observation ≠ Choice
Pressure ≠ Choice
Conflict ≠ Choice
Expected Action ≠ Choice
Plan ≠ Choice
Narrative Option ≠ Character Option
Information Access ≠ Option Access
Capability ≠ Option
Opportunity ≠ Option
Attribution ≠ Choice
Actual Occurrence ≠ Character Choice
SR ≠ Choice
SR ≠ automatic Option Generator
L1 VALID ≠ Choice Mint
Subject Absence ≠ External Coercion
UNKNOWN ≠ NO CHOICE
INVALID ≠ COERCION
VALID ≠ WHICH ACTION WAS CHOSEN
```

---

## 16. Reclassification of #24 OPENs

| Item | Prior (#24) | This Gate |
|------|-------------|-----------|
| **OPEN-1** | Define Candidate Option + producer | **REFRAMED** — object not established for L1; producer design **NOT AUTHORIZED**. Residual: whether any post-L1 formal object is needed = **UNKNOWN** (not a producer EO) |
| **OPEN-2** | Option Access store | **REQUIRES SEPARATE ADJUDICATION** — not authorized by L1 placement |
| **OPEN-3** | Production Agency | **REQUIRES L1 Observer Design/Impl Gate** (Agency as L1 conjunct from prose) |
| **OPEN-4** | Production Choice / Action Intent | **FUTURE Choice Adjudication Gate** |
| **C1** | Roadmap vs Golden contradiction | **RESOLVED FOR L1** — Roadmap spine **REJECTED**; disposition **REMOVE** from Choice Formation architecture (roadmap file not edited this round) |

```text
OPEN-1 is NOT “CLOSED by inventing NO semantics.”
OPEN-1 is INVALIDATED as “next: design a Candidate Option Producer.”
```

---

## 17. Answers Q1–Q10 (compact)

| Q | Answer |
|---|--------|
| **Q1** Formal ontology object? | **UNKNOWN** (unsealed; do not promote) |
| **Q2** Participates in L1? | **NO** |
| **Q3** Where does it live? | **NONE** on L1 path; BEFORE L1 **REJECTED**; AFTER/ORTHOGONAL **not authorized** |
| **Q4** Necessary for Choice Formation? | **NO** |
| **Q5** Necessary for L2? | **UNKNOWN** |
| **Q6** L1 without Candidate Option? | **YES** |
| **Q7** SR → Choice bridge? | SR → Writer fuel → Prose → (optional) L1 observation; **not** SR→Option→L1 |
| **Q8** L1 → later Adjudication? | Separate Question B / OPEN-4 Gate; L1 VALID ↛ mint |
| **Q9** Old roadmap chain? | **REMOVE** from L1/Choice Formation spine (hypothesis rejected) |
| **Q10** Smallest next Design Gate? | See §18 |

---

## 18. Minimal Next Design Gate

```text
NEXT (smallest):
  READ-ONLY Design Gate —
  “L1 Observer Implementation Boundary”
  (Question A only)

IN SCOPE:
  · Observer I/O wall (prose + pov)
  · Closed-label evidence taxonomy (E1–E5, Agency, SubjectAbsent)
  · VALID | UNKNOWN | INVALID semantics
  · Explicit NON-goals: no Candidate Option, no Option store,
    no Choice mint, no L2, no Plan bridge

OUT OF SCOPE:
  · Candidate Option producer / schema / store
  · OPEN-2 Option Access store authorization
  · OPEN-4 Choice Adjudication
  · L2 Dominance
  · AA20 / Attribution / Phase 5 / D5

ALTERNATE later (only after L1 contract for Question A is implementation-ready
                under Human authorization — not this Gate):
  “Post-L1 Choice Adjudication / OPEN-4”
  including: whether any option-like conceptual input is required for L2
  without promoting Plan.options or inventing unsafe producers
```

---

## 19. Final adjudication block

```text
==================================================
PHASE 4 — CANDIDATE OPTION / L1 PLACEMENT
ONTOLOGY ADJUDICATION
==================================================

Q1 Candidate Option ontology:
UNKNOWN
(not sealed; not proven; must not be promoted to formal object)

Q2 Candidate Option participates in L1:
NO

Q3 Candidate Option placement:
NONE (for L1 / Choice Formation)
BEFORE L1: REJECTED
AFTER L1 / ORTHOGONAL: NOT AUTHORIZED (residual UNKNOWN for later Gate)

Q4 Candidate Option necessary for Choice Formation:
NO

Q5 Candidate Option necessary for L2:
UNKNOWN

Q6 L1 can operate without Candidate Option:
YES

Q7 SR → Choice legitimate bridge:
SR → Writer Context (subjective fuel) → Prose → L1 observation (optional)
FORBIDDEN: SR → Option Generator → L1; SR → Choice Authority

Q8 L1 → later Choice Adjudication:
SEPARATE layer (OPEN-4); L1 VALID ≠ Choice mint ≠ Attribution PASS
NOT DESIGNED THIS GATE

Q9 Roadmap disposition:
REMOVE from Choice Formation / L1 spine
(KEEP only as historical hypothesis record; do not treat as contract)
File edit of _AI_ROADMAP_V2.md: NOT PERFORMED this round

Q10 Next Design Gate:
L1 Observer Implementation Boundary (Question A only)
— no Candidate Option / no Option store / no Choice mint

--------------------------------------------------
CONTRACT STATUS
--------------------------------------------------

Golden L1:
UNCHANGED

v0.2:
UNCHANGED

AA20:
UNCHANGED

Attribution:
UNCHANGED

Phase 5:
FROZEN

Implementation:
NOT AUTHORIZED

EO:
NOT AUTHORIZED

--------------------------------------------------
STOP
--------------------------------------------------

NO CODE
NO EO
NO GOLDEN CHANGE
NO SCHEMA
NO RUNTIME
NO SEMANTIC INVENTION
STOP AFTER REPORT
```
