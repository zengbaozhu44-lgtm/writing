# 01 — Character Causality Semantic Contract v0.1 (DRAFT)

**Status:** DRAFT — awaiting Human Design Gate  
**Code changed:** NO  
**Golden SPEC changed:** NO  
**Source of truth for L1:** `golden/reality/l1-choice-formation/SPEC.md` (FROZEN)

---

## 0. Scope Split (mandatory)

Phase 4 Design Gate **must not conflate** two different jobs:

| Layer | Job | Legal input (v0.1) | Output |
|-------|-----|-------------------|--------|
| **L1 Observer** | Evidence-based **adjudication** of Choice Formation in prose | `prose` + optional `pov` only | `VALID \| UNKNOWN \| INVALID` |
| **Character Causality Production** (future) | Whether system may **attribute** an Action to a Character for production | TBD — OPEN | Action Intent / attribution record |

**Iron law (from Golden SPEC):**

> L1 is Evidence-Based Observation, not Choice Generation.

```text
Prose → L1 Evidence → L1 Judgment
```

**Never:**

```text
Character SR → L1 Observer → Candidate Option generation
Plan → L1
Reasoner → L1
Writer intention → L1
```

---

## 1. Frozen Philosophy

### 1.1 Attributability, not Free Will

InkOS answers:

> Can this Action be attributed to the Character’s own internal state?

Opposite of Choice is **Subject Absence**, not External Coercion.

### 1.2 L1 ≠ L2

| | L1 Choice Formation | L2 Dominance |
|--|---------------------|--------------|
| Question | Is there sufficient evidence this is a Character-attributable Choice? | Among VALID choices, which dominates? |
| Output | VALID / UNKNOWN / INVALID | DETERMINED-UNIQUE / DETERMINED-DOMINANCE / MULTI / UNDER |
| Forbidden | Goal weighting, “best” choice, open option generation | Feeding L2 without L1 VALID |

### 1.3 Four Option Layers (must not merge)

```text
1. Option Exists          = World Possibility
2. Option Accessible      = Character sees path as available to self
3. Candidate Option*      = SEE §2 ONTOLOGY DECISION (OPEN)
4. Option Chosen          = Formation evidenced / later production Choice
```

\* Naming of layer 3 is an **Open Design Decision** — see §2.

---

## 2. D1 — Candidate Option Ontology

### PROPOSED (analysis)

Four distinct objects:

| Layer | Definition | Proves | Does NOT prove |
|-------|------------|--------|----------------|
| **Option Exists** | World-level path is possible | World Possibility | Character knows / sees / considers / chooses |
| **Option Accessible** | Character’s subjective model treats path as available to self | Option Access | That Character chose it |
| **Candidate Option** | TBD — see conflict | — | — |
| **Option Chosen** | Attributable Choice formation (L1 VALID) or production Choice record | Formation evidence / later attribution | World necessity |

### Golden SPEC says

- L1 does **not** assert an objective Choice object in the world.
- Observer adjudicates **semantic evidence in prose**.
- Access levels E1–E5 are **narrative evidence classes**, not SR fields.
- Observer input = prose (+ pov), **not** Character SR.

### DeepSeek/Grok propose (DESIGN INPUT)

```text
Character SR → L1 Observer → Candidate Option
Candidate Option = semantic fact already in Character SR
```

### CONFLICT

| Point | Conflict |
|-------|----------|
| L1 input | Golden forbids SR/Plan/canon as Observer input; proposal feeds SR into L1 |
| L1 role | Golden = observation; proposal risks making L1 an Option matcher/generator |
| Ontology | Golden: VALID = sufficient **evidence**, not ontological Choice object; proposal stores Option as SR fact |

### Required Design Decision (HUMAN)

**OPEN-1 — Dual-object naming (recommended direction for discussion, NOT frozen):**

| Name | Role | Authority |
|------|------|-----------|
| **Narrative Access Evidence** | What L1 observes in prose (E1/E2/E4…) | L1 Observer judgment |
| **Subjective Available Action** (optional future) | Production-side “character can consider doing X” if ever stored | Character Causality Production — **not** L1 Observer |

**Do not call either `plan.choice` or `causalChain.options`.**

Until HUMAN decides OPEN-1:

```text
Candidate Option ontology = NOT DETERMINED
→ STOP-1 remains active for implementation
```

### Status for D1

```text
PROPOSED: four-layer split
SUPPORTED: Option Exists ≠ Accessible ≠ Chosen (anti-inference)
CONFLICT: SR-as-L1-input / SR-stored Candidate Option as L1 path
NEEDS DECISION: OPEN-1
```

---

## 3. D2 — Option Exists ≠ Access

### FROZEN PRINCIPLE (aligned with Golden + Archaeology)

```text
World Possibility ≠ Character Access
World State ↛ automatic Access
Fact Access ≠ Option Access
```

Must pass through subjective processing **as evidenced** (for L1: in prose; for production: TBD).

Character SR fields (awareness / interpretation / belief / stance / relevance) may support **fact** subjectivity (Phase 3.2). They do **not** automatically create Option Access.

### Status

```text
PROPOSED: freeze Exists≠Access and Fact≠Option Access
SUPPORTED: Golden E5/E3 insufficiency; Phase 4.1 archaeology
CONFLICT: none with Golden
NEEDS DECISION: none for this principle
```

**Contract rule:** FREEZE Exists≠Access / Fact≠Option Access.

---

## 4. D3 — Access

### Golden-aligned definition (L1)

Access is a **judgment dimension** of L1:

> Sufficient narrative evidence that a path entered the Character’s model at *t*.

Evidence levels (FROZEN from Golden):

| Level | Form | Sufficient for Access? |
|-------|------|------------------------|
| E1 | Explicit multi-option | YES |
| E2 | Negation of an action | YES (negated path only) |
| E3 | 「没做 X」alone | NO |
| E4 | Fork / 取舍 narrative | YES |
| E5 | Pure action | NO |

**L1-U03 FROZEN:** One E2 proves the **negated** path was in model; does **not** license inferring a second chosen path.

### Fact Access vs Option Access

| | Fact Access | Option Access |
|--|-------------|---------------|
| Meaning | Character knows / perceives a fact | Character sees an action path as available to self |
| Phase 3.2 | Partial (awareness from Actual+IB) | **ABSENT as typed object** |
| L1 | Evidenced in prose | Evidenced via E1/E2/E4 (not E5) |

### Is Access an SR state or a judgment?

| Context | Answer (v0.1 DRAFT) |
|---------|---------------------|
| **L1 Observer** | **Judgment** from prose evidence — **not** an SR field read |
| **Production Character Causality** | OPEN-2: whether Option Access becomes an SR-derived production record later |

### Status

```text
PROPOSED: Access = L1 judgment dimension; Fact≠Option
SUPPORTED: Golden E1–E5, L1-U03
CONFLICT: treating Phase 3.2 Fact Access as Option Access
NEEDS DECISION: OPEN-2 (production Option Access store?)
```

---

## 5. D4 — Agency

### FROZEN

```text
Cause ≠ Agency
Pressure ↛ Agency
Plan ↛ Agency
Environmental plausibility ↛ Agency (without narrated internal state)
```

### Golden Agency minimum

Agency requires traceability to **narrated internal state** at *t*:

- desire, fear, habit (when text marks deliberation), curiosity, duty, judgment, disgust, impulse, character tendency
- OR conscious E4 fork (sustained/refused branch)

**Insufficient:** external facts alone; environmental inference without text.

### Architecture warning

```text
Access Engine → Agency Engine → SubjectPresence Engine → L1
```

= **DESIGN PROPOSAL — NOT YET FROZEN**

Golden L1 is a **single Observer** adjudicating three conjuncts from prose evidence:

```text
L1_VALID := Access ∧ Agency ∧ SubjectPresent
```

Not three runtime engines feeding L1.

### Status

```text
PROPOSED: keep Agency as L1 conjunct + Golden minimum
SUPPORTED: Cause≠Agency; Golden Agency section
CONFLICT: pre-engine pipeline before L1
NEEDS DECISION: OPEN-3 (production Agency attribution vs L1-only Agency)
```

---

## 6. D5 — Subject Presence

### FROZEN (Golden)

**INVALID only if SubjectAbsent:**

- sleep / unconscious / dissociation
- pure reflex without awareness
- acting without knowing one acts
- explicit loss of agency (puppet / another's hand)

**NOT INVALID:** fear, pain, threat, irrationality, **coercion while conscious**

### REJECT AS TOO STRONG

> “Character must be grammatical subject ⇒ Subject Presence”

```text
Grammatical Subject ≠ Subject Presence
Agency ≠ Subject Presence
```

Example: 「她被人推下楼」— may be patient of violence; does **not** auto-define Subject Absence for every clause about her; Subject Absence requires **explicit absence-of-agency** evidence (Golden I-class).

### Coercion triplet (FROZEN)

| Fixture | Pattern | Expected |
|---------|---------|----------|
| L1-P07 | 枪口 + 清醒取舍 | VALID |
| L1-U08 | 枪口 + 「只能」+ 无取舍证据 | UNKNOWN |
| L1-I06 | 失去意识 + 他人代行 | INVALID |

### Status

```text
PROPOSED: freeze Golden SubjectAbsent set; reject grammatical subject rule
SUPPORTED: Golden SPEC; L1-P07/U08/I06
CONFLICT: Proposal E (grammatical subject)
NEEDS DECISION: none for Presence definition
```

---

## 7. D6 — Character Causality Authority

### Audit of candidates

| Candidate | May claim “Character Choice”? | Notes |
|-----------|-------------------------------|-------|
| Plan | **NO** | Plan artifact / instruction |
| Reasoner | **NO** | Modelled / authored guidance |
| Beat / Library Decision | **NO** | FAKE_CHOICE risk |
| Desire engine | **NO** | Parallel authored influence |
| Writer | **NO** | Realization layer only |
| Character SR | **NO for L1 Choice**; Fact subjectivity only today | Phase 3.2 |
| L1 Observer | **YES for L1 Judgment only** | Adjudicates evidence; does not mint ontological Choice |
| “Character Causality Engine” | **NOT REQUIRED by subtraction** | Prefer Contract + Observer first |

### Legal Choice claims (v0.1 DRAFT)

| Claim type | Legal authority |
|------------|-----------------|
| “Prose shows Choice Formation evidence” | **L1 Observer** (when implemented) |
| “System authorizes Character-attributable Action Intent for Writer” | **OPEN-4** — production Character Causality contract (not Plan/Writer) |
| “plan.choice / causalChain.choice is Character Choice” | **FORBIDDEN** |

### Subtraction principle

Do **not** auto-create Cognitive / Emotion / Option / Choice / Agency / Causality Engines because a semantic layer is missing.

Order: existing object → Contract + Observer + deterministic validation → only then new Engine.

### Status

```text
PROPOSED: L1 Observer = judgment authority; Plan/Writer/Reasoner ≠ Choice
SUPPORTED: Golden; Phase 4.1 contamination table
CONFLICT: independent Causality Engine as default
NEEDS DECISION: OPEN-4 production Action Intent authority
```

---

## 8. D7 — Choice-like Contamination Classification

| Object | Classification |
|--------|----------------|
| plan.choice / scene.choice / deriveSceneChoice | **PLAN ARTIFACT** |
| causalChain.options / causalChain.choice | **PLAN ARTIFACT** / modelled guidance |
| beat.choice / choiceHint / Library Decision | **NARRATIVE OPPORTUNITY** / **FABRICATED CHOICE-LIKE** (FAKE_CHOICE) |
| pressure / conflict / countdown | **PRESSURE** / World Possibility influence |
| desire / characterPush | **DESIRE** (authored parallel ≠ CharacterSR) |
| scene.goal / beat.action | **NARRATIVE INSTRUCTION** / Expected Action |
| Writer instructions / LLM improvisation | **WRITER REALIZATION** |
| CharacterSR awareness/belief | **Character subjective fact** ≠ Choice |
| L1 VALID judgment | **L1 Evidence Judgment** (not ontological Choice object) |

**Contamination pattern (exists today):**

```text
Plan → Writer → Action
  ≠
Character → Choice → Action
```

Mark contamination; **do not repair in Design Gate**.

---

## 9. Writer Boundary (candidate architecture — NOT IMPLEMENTED)

**Candidate (awaiting Human approval):**

```text
Character Causality (production, TBD)
  → Choice / Action Intent (authorized)
  → Writer (Realization)
  → Prose
  → Actual
```

Writer = **Realization Layer**, not Choice / Decision / Agency / Character Causality Authority.

**Status:** DESIGN CANDIDATE — not frozen as implemented.

---

## 10. Anti-Inference Rules (FROZEN candidates for Human seal)

| # | Rule |
|---|------|
| R1 | World Possibility ≠ Character Access |
| R2 | Fact Access ≠ Option Access |
| R3 | Reader Counterfactual ≠ Character Access |
| R4 | Environmental Plausibility ≠ Agency |
| R5 | Pressure ≠ Agency |
| R6 | Coercion ≠ Subject Absence |
| R7 | Irrationality ≠ Invalid Choice |
| R8 | Action Happened ≠ Character Chose |
| R9 | Writer Intention ≠ Character Causality |
| R10 | Plan Choice ≠ Character Choice |
| R11 | LLM Plausibility ≠ Narrative Evidence |
| R12 | Candidate Option Generation ≠ L1 Observation |

---

## 11. What this contract does NOT authorize

```text
NO L1 Observer implementation yet
NO Option Generator
NO SR schema change
NO Golden SPEC change
NO Consequence / Survival / Director
NO treating Design Candidate Writer chain as live
```

---

*End of Semantic Contract v0.1 DRAFT*
