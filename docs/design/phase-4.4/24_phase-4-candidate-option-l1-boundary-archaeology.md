# 24 — Phase 4 Choice Formation: Candidate Option / L1 Boundary Archaeology

```text
MODE: READ-ONLY / NO CODE / NO EO
AUTHORIZED: Design / Archaeology only
UPSTREAM: docs/design/phase-4.4/23_phase-4.4-remainder-mainline-blocker-adjudication.md

4.4.1d-R AA20: SEALED — NOT REOPENED
Phase 5: FROZEN
S4/S5: NOT REQUIRED — NOT REOPENED
D5 / Observed Continuity: NOT TOUCHED
```

**Core question:**

> What is a legally formed Candidate Option, and where can it come from without becoming Plan / Writer / Prediction / Expected Action?

**Method:** Quote / classify existing authoritative material + production archaeology.  
**Hard rule:** Do not invent missing semantics.

---

## 1. Executive Verdict

```text
Q1 Candidate Option semantically defined?
   NO — OPEN-1 / DESIGN GAP
   (Forbidden producers sealed; legal producer NOT sealed.)

Q2 Is SR → Candidate Options a frozen contract?
   NO — ROADMAP LANGUAGE only
   v0.2 DRAFT walls mark SR → automatic Option generation as FORBIDDEN.

Q3 Where do Candidate Options legally originate?
   UNKNOWN — no sealed legal producer.
   Explicitly disqualified auto-sources: World, SR, Plan, LLM.

Q4 Is Option Access already defined?
   PARTIAL:
     · L1 Access dimension (prose E1/E2/E4) = FROZEN in Golden
     · Production Option Access store = OPEN-2 / DESIGN GAP
     · characterCanAccessActualEvent = Information/Fact Access ≠ Option Access

Q5 Legal L1 Observer input?
   prose (+ optional pov) ONLY
   FORBIDDEN: Plan, SR, causalChain, goal, Director, Writer Context, expected, …

Q6 Contradiction SR→Options vs L1 Observer restrictions?
   YES — REAL CONTRADICTION / UNRESOLVED DESIGN GAP
   (Roadmap spine vs Golden+v0.2 Observer + anti-laundering walls)

Q7 Can Plan / Writer / Director / Actual legally produce Character Candidate Options?
   NO — FORBIDDEN / NOT AUTHORIZED as Character Option authority
   (Plan options = Narrative Fuel / Plan Instruction only)

Q8 Smallest unresolved semantic boundary before Choice Formation design?
   OPEN-1: sealed legal Candidate Option producer
   (what a Character Candidate Option *is*, and who may mint it —
    without collapsing into Plan / SR auto-gen / L1 option invention)

VERDICT: STOP + REPORT
  Missing definition + sealed contradictions → no EO / no implementation.
```

**One-line truth:**

> #23 correctly found the Choice Formation spine **absent in production**.  
> This archaeology shows the spine’s first edge `SR → Candidate Options` is **not** an authorized frozen contract — it is **roadmap aspiration that v0.2 explicitly forbids as an automatic production path**.  
> Until OPEN-1 (legal Option producer) is Human-resolved, Choice Formation **cannot be designed as implementation**.

---

## 2. Authoritative Sources

| Rank | Source | Role | Seal status |
|------|--------|------|-------------|
| **A1** | `golden/reality/l1-choice-formation/SPEC.md` | L1 Observer I/O + VALID/UNKNOWN/INVALID + Access/Agency/Presence | **FROZEN** |
| **A2** | `docs/design/phase-4/01_character-causality-semantic-contract-v0.2.md` | Anti-laundering walls W1–W4; OPEN-1..4; R1–R18 | **DRAFT v0.2** · keep / not roll back (`09` status freeze) · **Human Seal NOT READY** for Phase 4 Choice |
| **A3** | `02_ontology-authority-map-v0.2.md` · `03_l1-production-boundary-v0.2.md` · `04_anti-laundering-matrix-v0.2.md` | Companion authority / I/O / edge marks | DRAFT companions to A2 |
| **A4** | `05_phase-4-design-gate-decision.md` · `07_concrete-adversarial-trace-audit.md` | OPEN-1..4 named; SR→Option chains **BLOCKED** | Design Gate / audit |
| **A5** | `_AI_PHASE4_1_CAUSALITY_ARCHAEOLOGY.md` | Production “options” = Plan/Reasoner; genuine Character Option ABSENT | Archaeology |
| **A6** | `_AI_ROADMAP_V2.md` Phase 4.1–4.2 | `SR → Candidate Options → … → L1` **roadmap** | Roadmap — **not** Option-producer seal |
| **A7** | Phase 4.4 Attribution docs (`06`/`08`/`22`/`23`) | Attribution ≠ Choice; AA20 sealed | Attribution track only |
| **Code** | `character-sr-updater.js`, `causal-reasoner.js`, attribution modules, event-extractor | Production facts | Implementation evidence |

**Authority rule used here:**

```text
Golden L1 SPEC  >  v0.2 sealed FORBIDDEN walls  >  Roadmap narrative spine
Roadmap does NOT override Golden or v0.2 anti-laundering.
```

---

## 3. Candidate Option Definition

### 3.1 Is it already semantically defined?

```text
STATUS: UNKNOWN / DESIGN GAP (OPEN-1)
```

**What *is* sealed (negative definition):**

From Semantic Contract v0.2 §3 / Ontology Map:

| Statement | Source |
|-----------|--------|
| Candidate Option **≠** World Possibility | A2 W3 |
| Candidate Option **≠** Fact / Fact Access | A2 §3 table |
| Candidate Option **≠** Narrative Evidence (L1 taxonomy) | A2 §3 |
| Must **not** be auto-filled by World / SR / Plan / LLM | A2 §3; A3 matrix |
| Legal producer: **NONE sealed** | A3 Object Map; A4 OPEN-1 |
| L1 must **not** invent free-form options | A1 iron law; A2 §4; R12 |

**What is *not* sealed (positive definition):**

```text
Exact meaning of a “legally formed Candidate Option” artifact
Legal inputs that mint it
Legal producer / authority
Production schema / store
```

Design Gate D1 (`05`):

> Candidate Option ontology = **NOT DETERMINED → STOP-1.**  
> OPEN-1 dual-object naming (Narrative Access Evidence vs Subjective Available Action) unresolved.

Recommended discussion labels in A2 (explicitly **not** frozen producers):

| Label | Role |
|-------|------|
| Narrative Access Evidence | What L1 classifies in prose (E1/E2/E4…) |
| Subjective Available Action | Future production typed availability — **not** L1; **not** Plan.options |

### 3.2 Mandatory distinctions (preserved)

```text
Candidate Option
  ≠ Expected Action
  ≠ Predicted Action
  ≠ Planned Choice / plan.choice / causalChain.choice
  ≠ Authorial Planned Direction (AA20)
  ≠ Writer Suggestion
  ≠ Narrative Option / Situation / Opportunity fuel
  ≠ World Possibility
  ≠ Fact known to character
```

---

## 4. Candidate Option Source Audit

| Candidate source | Classification | Evidence |
|------------------|---------------|----------|
| **Plan** (`plan.choice`, scene.choice, authored options) | **FORBIDDEN** as Character Option authority | A2 W1; A3 Loop ①; A4; Phase 4.1 archaeology |
| **causal_chain.options** | **FORBIDDEN** as Character Option / Choice authority | A3: `causalChain.options → Character Option / Choice` **FORBIDDEN**; AA20 = Narrative Fuel |
| **Writer** | **FORBIDDEN** as Option/Choice authority | A2 Writer Boundary; R9 |
| **Director** (Situation / Desire / Beat choice) | **NARRATIVE-ONLY** / Situation fuel; **FORBIDDEN** as Choice/Option authority | A3 contamination table; Phase 4.4 D5 separate |
| **Actual** | **FORBIDDEN** → Candidate Option | A2 W2: `Actual ↛ Candidate Option` |
| **Character SR** | **FORBIDDEN** as automatic Option generator | A2 W4; A3 Loop ③ |
| **Character State** | **UNKNOWN** as Option producer (no sealed path); not L1 input | No sealed producer |
| **Goal** / scene.goal | **FORBIDDEN** as Choice/Option authority | Plan Instruction class |
| **Situation** / Pressure / Opportunity | **LEGAL** as narrative fuel; **FORBIDDEN** → Candidate Option auto | A3 Loop ② |
| **Action affordance** (world “can physically”) | **FORBIDDEN** → Option Access / Candidate Option | A2 R1/R2; capability ↛ Option Access |
| **LLM inference** | **FORBIDDEN** as Option producer / as L1 option invention | A2 §3; R11; R12 |
| **Prose (as L1 evidence)** | **LEGAL** for L1 Access/Agency/Presence **judgment** — **FORBIDDEN** as free-form Option generator | A1; A2 §4 |
| **Attribution Gate / Registry** | **DOWNSTREAM / PARALLEL** — Attribution ≠ Candidate Option | Phase 4.4 sealed; Gate `choice: undefined` |

```text
LEGAL producer of Character Candidate Options: NONE SEALED
→ OPEN-1 remains
```

---

## 5. Plan / Writer / Director / Actual Separation

### 5.1 Plan / `causal_chain.options` → Character Candidate Options?

```text
FORBIDDEN / NOT AUTHORIZED
```

Frozen assumption (AA20 + v0.2):

```text
Plan / causal_chain → Narrative Fuel / Authorial Planned Direction
≠ Character Candidate Options
≠ Character Choice Authority
```

No approved contract upgrades Plan options into Character Options.  
Absence of upgrade ≠ “temporarily allow”; it is **explicit FORBIDDEN**.

### 5.2 Writer / Director

```text
Writer / Director → prose / situation / densifiers
  = Narrative Track
≠ Candidate Option mint
≠ L1 Observer input
```

### 5.3 Actual / `open_choice` occurrence

```text
Actual.kind = open_choice | choice_settled
  = Occurrence fact (event-extractor)
≠ Actual Character Choice
≠ Candidate Option
≠ Option Access
```

A2 W2: `Actual ↛ Candidate Option / Option Access / Agency / Choice`.

### 5.4 SR

```text
SR = fact subjectivity (awareness, belief, interpretation, stance, relevance)
SR ≠ Choice
SR ≠ Agency (auto)
SR ≠ Causal History
SR ≠ Candidate Option generator (v0.2 FORBIDDEN)
SR ≠ L1 Observer input (Golden + v0.2 FORBIDDEN)
```

---

## 6. Information Access vs Option Access

### 6.1 Definitions from contracts

| Concept | Meaning (existing) | Status |
|---------|-------------------|--------|
| **Fact / Information Access** | Character knows / perceives a fact | Phase 3.2 production |
| **Option Access** | Path available-to-self in character model at *t* (Access dimension) | L1 judgment from prose **defined**; production store **OPEN-2** |

Non-promotion (A2 §5):

```text
SR.awareness ↛ Option Access
SR.belief ↛ Option Access
knowledge ↛ Option Access
capability ↛ Option Access
world possibility ↛ Option Access
```

「角色知道门开着」↛「离开是可及选项」unless **narrative evidence** (L1 E1/E2/E4-class) establishes that option in the subjective model.

### 6.2 What `characterCanAccessActualEvent` proves

Production (`character-sr-updater.js`):

```text
Character may access an Actual Event iff
  actor/affected OR present witness of kinds
  {action, speech, open_choice, choice_settled, presence}
```

| Proves | Does **not** prove |
|--------|-------------------|
| Information Boundary for **Actual Event** → SR awareness eligibility | Option Access to doing Y |
| Character can **know** event X occurred | Character has Candidate Option Y |
| Fact Access path for IB/SR | L1 Access (E1–E5) |
| | Choice / Agency / Attribution |

```text
characterCanAccessActualEvent
  = Information / Fact Access (Actual → SR)
  ≠ Option Access
```

### 6.3 Option Access status

```text
OPTION ACCESS (L1 judgment dim from prose) = DEFINED (Golden)
OPTION ACCESS (production typed store)     = DESIGN GAP (OPEN-2)
```

Do **not** upgrade Can-know-X → Can-do-Y.

---

## 7. L1 Observer Input Contract

### 7.1 Legal pipeline (Golden + v0.2)

```text
Prose (+ optional pov)
  → Evidence classification (E1–E5 Access; Agency cues; SubjectAbsent)
  → Judgment: VALID | UNKNOWN | INVALID
```

```text
L1_VALID(R,t) := Access(R,t) ∧ Agency(R,t) ∧ SubjectPresent(R,t)
```

Iron law (Golden):

> **L1 is Evidence-Based Observation, not Choice Generation.**

### 7.2 Input classification matrix

| Potential input | Classification | Source |
|-----------------|----------------|--------|
| Prose | **LEGAL** | A1 |
| optional `pov` (name resolution) | **LEGAL** | A1 |
| Candidate Options (as Observer input object) | **FORBIDDEN** / not Observer input — L1 does not consume Option registry | A1; A2 §4 forbids inventing options |
| Access / Agency / Subject Presence | **DERIVED** inside Observer from prose taxonomy — not external stores | A1 formula |
| Character SR | **FORBIDDEN** | A1 Forbidden Inputs; A2 W4; A3 Loop ③ |
| Character State | **FORBIDDEN** (not in legal Observer input list) | A1 |
| Goal / intent / scene goal | **FORBIDDEN** | A1 |
| Plan / causalChain | **FORBIDDEN** | A1 |
| Director Situation | **FORBIDDEN** | A1 (Plan/Director class) |
| Writer Context | **FORBIDDEN** | A1 |
| Actual Event object | **FORBIDDEN** as Observer input (Observer reads prose, not Actual store) | A1 |
| `expected` / fixture `evidence` | **FORBIDDEN** | A1 |
| Attribution Registry | **FORBIDDEN** / orthogonal (Layer B) | Phase 4.4 |

### 7.3 What L1 answers

```text
LEGAL question:
  “Does prose contain sufficient evidence that Choice Formation occurred
   under Access ∧ Agency ∧ SubjectPresent?”

NOT:
  “Which action should the character take?”
  “Mint production Character Choice”
  “Generate Candidate Options”
```

```text
L1 VALID ≠ Production Choice object
(no sealed production bridge in v0.2 — OPEN-4)
```

---

## 8. Agency Boundary

| Kind | Definition | Production | Relation |
|------|------------|------------|----------|
| **L1 Agency** | Narrated internal-state traceability at *t* (Golden Agency minimum) | **ABSENT** (no Observer) | Conjunct of L1_VALID |
| **Attribution agencyCue** | Heuristic cue in excerpt for Gate (`detectAttributionCues`) | Soft Attribution path | **≠ L1 Agency**; parallel Layer B |
| Plan / Pressure / Desire / SR belief → Agency | **FORBIDDEN** auto | — | A2 §5; R5 |

```text
L1 Agency ≠ Attribution Agency cues
Cause ≠ Agency
Pressure ≠ Agency
Observation ≠ Choice
```

OPEN-3: production Agency attribution vs L1-only Agency — **unresolved**.

---

## 9. VALID / UNKNOWN / INVALID Boundary

| Judgment | Frozen meaning (Golden) | Does **not** mean |
|----------|-------------------------|-------------------|
| **VALID** | Prose sufficient under `Access ∧ Agency ∧ SubjectPresent` | Ontological Choice object; which option won; production mint |
| **UNKNOWN** | Insufficient / ambiguous evidence (e.g. E5 pure action; E2 without second path; coercion without tradeoff) | “No choice happened in the world”; permission to invent options |
| **INVALID** | **Only** SubjectAbsent (sleep, reflex, puppet, …) | External coercion while conscious; irrationality; fear |

Preserved inequalities:

```text
Subject Absence ≠ External Coercion
Observation ≠ Choice
Pressure ≠ Choice
Conflict ≠ Choice
Expected Action ≠ Choice
Plan ≠ Choice
L1 VALID ↛ production Character Choice
```

No material conflict found **within** Golden on this triad.  
Conflict is with **roadmap / production spine** that treats L1 as a mid-pipeline after SR→Options (see §10).

---

## 10. Contradiction Audit

### C1 — Roadmap `SR → Candidate Options` vs v0.2 / Golden

| Side | Claim |
|------|-------|
| `_AI_ROADMAP_V2` Phase 4.2 | `Character SR(t) → Candidate Options → Access → Agency → L1` |
| #23 Mainline | Same spine as production-blocker framing |
| v0.2 W4 / Loop ③ | `SR → automatic Option generation` **FORBIDDEN**; `SR → L1 Observer input` **FORBIDDEN** |
| Golden | Observer input = prose (+pov) only; **not** SR |
| Design Gate Proposal B/C | SR as L1 input / Option producer = **CONFLICT** |

```text
STATUS: REAL CONTRADICTION / UNRESOLVED DESIGN GAP
NOT silently reconcilable without inventing semantics.
```

Possible *kinds* of resolution (report only — **not chosen**):

1. Roadmap spine = aspirational production architecture **rejected** by v0.2 walls  
2. Input-layer distinction: SR feeds a **non-L1** Option store, while L1 still reads prose only — **OPEN-1/2 not sealed**  
3. Roadmap “Access” conflated Information Access with Option Access  

None of (1)–(3) is Human-sealed as the authorized design.

### C2 — Candidate Options vs Plan options

```text
CONTRADICTION IF equated:
  causal_chain.options  ≡  Character Candidate Options

RESOLUTION IN CONTRACTS:
  Plan options = Narrative Fuel / World·Plan Possibility
  Character Candidate Options = OPEN / NONE sealed
  Edge Plan→Character Option = FORBIDDEN
```

### C3 — Option Access vs Information Access

```text
NO contract conflict if kept separate.
PRODUCTION RISK: characterCanAccessActualEvent looks like “Access”
  but is Fact Access only — must not be renamed Option Access.
```

### C4 — L1 Agency vs Attribution Agency cues

```text
NO sealed equivalence.
Parallel tracks: L1 (Question A, prose) vs Attribution Gate (Layer B).
Collapsing them = DESIGN ERROR (not currently production-wired as L1).
```

### C5 — Actual Character Choice vs Actual Event / `open_choice`

```text
CONTRADICTION IF equated.
Contract: Action Happened ≠ Character Chose; Actual ↛ Choice Authority.
Production: open_choice is occurrence kind only.
```

---

## 11. Production Call-Path Evidence

| Symbol / path | Classification | Notes |
|---------------|----------------|-------|
| `causalChain.options` / `causal-reasoner` | **production** (Narrative) | Authored plan → Writer; **not** Character Option |
| `renderCausalChain` (post-AA20) | **production** (Narrative Fuel) | Non-certifying wording |
| Character SR updater / `characterCanAccessActualEvent` | **production** | Fact Access → SR |
| `detectAttributionCues` / Attribution Gate | **production** (soft) | Attribution track ≠ L1 / ≠ Option |
| L1 Observer | **golden-only** | SPEC + fixtures; `ENGINE_NOT_IMPLEMENTED` |
| Candidate Option producer / store | **absent** | No package symbol |
| Option Access store | **absent** (OPEN-2) | |
| Choice Formation / Choice mint / Choice registry | **absent** | |
| `open_choice` Actual kind | **production** (Occurrence) | ≠ Choice mint |
| L1 fixtures runner in packages | **unused / absent** | Golden expect RED until Observer exists |

**Production causality that exists:**

```text
Plan/Authored → causal_chain → Writer → Prose
Prose → Actual → State / SR (Fact Access)
Prose excerpt → Attribution soft (optional)
```

**Production causality that does not exist:**

```text
SR → Candidate Options → Option Access → L1 Agency → L1 Observer → Choice mint
```

---

## 12. Semantic Gaps

| ID | Gap | Blocking for Choice Formation design? |
|----|-----|--------------------------------------|
| **OPEN-1** | Legal Candidate Option definition + sealed producer | **YES — smallest primary gap** |
| **OPEN-2** | Production Option Access store | YES for production spine; L1 Access judgment can exist without it |
| **OPEN-3** | Production Agency vs L1-only Agency | YES for production attribution of Agency outside L1 |
| **OPEN-4** | Production Choice / Action Intent mint authority | YES for Actual Character Choice; not required for L1 judgment alone |
| **C1** | Roadmap SR→Options vs FORBIDDEN SR→Option / SR→L1 | **YES — must be adjudicated before design** |
| Dual-object naming | Narrative Access Evidence vs Subjective Available Action | Part of OPEN-1 |

```text
STOP CONDITIONS MET:
  · contract contradiction (C1)
  · missing Candidate Option definition (OPEN-1)
  · unclear Option Access production (OPEN-2)
  · L1 Observer boundary clear for Question A; unclear how it attaches to SR→Options spine
```

---

## 13. Final Classification Matrix

| Concept | Existing Definition | Production Evidence | Legal Source | Forbidden Source | Status |
|---------|---------------------|---------------------|--------------|------------------|--------|
| **Candidate Option** | Negative walls only; positive ontology **OPEN-1** | Absent as Character Option; Plan.options exist as narrative | **NONE sealed** | World, SR auto, Plan, LLM | **DESIGN GAP** |
| **Option Access** | L1: prose E1/E2/E4; store OPEN-2 | No Option Access store; Fact Access helper only | L1 prose evidence | Fact/SR/capability/world/Plan | **PARTIAL / OPEN-2** |
| **L1 Observer** | Golden I/O frozen | Golden-only; no runtime | Prose (+pov) | Plan, SR, Writer, Director, Actual store, expected | **CONTRACT READY / IMPL ABSENT** |
| **Agency (L1)** | Narrated internal state at *t* | Absent (no Observer) | Prose cues | Plan, Pressure, Desire, SR auto | **GOLDEN DEFINED / PROD ABSENT** |
| **Agency (Attribution)** | Cue heuristics for Gate | Soft production | Excerpt cues | — | **PARALLEL ≠ L1** |
| **VALID** | Formation evidence sufficient | No production judgment | Golden formula | “Best action”; production mint | **FROZEN (Question A)** |
| **UNKNOWN** | Insufficient / ambiguous evidence | — | Golden U group | Invented options | **FROZEN** |
| **INVALID** | SubjectAbsent only | — | Golden I group | Coercion-while-conscious | **FROZEN** |
| **Actual Character Choice** | Production Choice = OPEN-4 | Absent; surrogates = Plan/Actual kinds | OPEN-4 only if sealed | Plan, Writer, Actual, L1 alone | **DESIGN GAP (OPEN-4)** |

---

## 14. Minimal Next Design Gate

```text
READ-ONLY Design Gate (recommended title):
  “OPEN-1 Candidate Option Ontology + Producer Seal”
  (include mandatory reconciliation of Contradiction C1)

IN SCOPE:
  · What is / is not a Character Candidate Option
  · Dual-object naming (Narrative Access Evidence vs Subjective Available Action)
  · Whether any producer can be sealed without violating Golden L1
  · Explicit disposition of Roadmap SR→Options (reject / rewrite / layered architecture)
  · How Option Access relates to Information Access without promotion

OUT OF SCOPE:
  · EO / implementation
  · L1 Observer coding
  · Option Access store coding
  · Choice mint
  · 4.4.1d-R / S4/S5 / D5 / Phase 5 / Observed Continuity
  · Attribution Gate redesign
  · Literary validation

DO NOT:
  Invent a producer “for convenience”
  Equate Plan.options with Candidate Options
  Feed SR into L1 Observer
  Treat #23’s missing edge as already-authorized semantics
```

---

## 15. STOP Confirmation

### Answers Q1–Q8 (compact)

| Q | Answer |
|---|--------|
| Q1 | **No** — OPEN-1 / DESIGN GAP |
| Q2 | **Roadmap language only** — not frozen authorized Option path; v0.2 **forbids** SR→auto Option |
| Q3 | **Unknown** — no sealed legal origin |
| Q4 | **Partial** — L1 Access yes; production Option Access = DESIGN GAP; Fact Access ≠ Option Access |
| Q5 | **Prose (+ optional pov) only** |
| Q6 | **Yes** — real contradiction / unresolved gap |
| Q7 | **No** — Plan/Writer/Director/Actual **cannot** legally produce Character Candidate Options |
| Q8 | **OPEN-1** (Candidate Option ontology + legal producer) **plus** mandatory C1 disposition |

```text
NO CODE
NO EO
NO IMPLEMENTATION
NO SEMANTIC INVENTION
STOP
```
