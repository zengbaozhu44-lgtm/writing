# 01 — Character Causality Semantic Contract v0.2

**Status:** DRAFT v0.2 — post Reverse-Attack revision · **not Human-sealed**  
**Supersedes:** `01_character-causality-semantic-contract-v0.1.md`  
**Adversarial input:** `06_reverse-attack-audit.md`  
**Code / Golden SPEC:** unchanged  
**Source of truth for L1 observation:** `golden/reality/l1-choice-formation/SPEC.md` (FROZEN)

---

## 0. Objective (preserved)

InkOS does **not** prove Free Will.

InkOS determines whether an Action can be **attributed** to the Character as Choice, rather than fabricated by system/author machinery.

```text
Attributability ≠ Free Will
Opposite of Choice = Subject Absence
  ≠ External Coercion
```

---

## 1. Two Questions (sealed split)

| | Question A — L1 Judgment | Question B — Production Authority |
|--|--------------------------|-----------------------------------|
| Asks | Does prose contain sufficient evidence under Golden L1? | May the system instantiate / record a Character Choice / Action Intent? |
| Output | `VALID \| UNKNOWN \| INVALID` | Production Choice / Action Intent record (if ever defined) |
| Authority | L1 Observer (when implemented) | **OPEN-4** — not Plan / Desire / Pressure / Writer / Actual / L1 alone |

```text
L1 VALID ≠ Production Choice object
```

Unless a **separately sealed** production bridge explicitly defines equivalence — **no such bridge is sealed in v0.2**.

---

## 2. Anti-Laundering Walls (NEW in v0.2 — sealed as DRAFT rules)

### W1 — Loop ① Plan → Writer → Prose → L1 → Choice

```text
FORBIDDEN:
Plan → Writer → Prose → L1 VALID → production Character Choice
```

**Freeze:**

```text
L1 VALID ↛ production Character Choice
```

L1 VALID is evidence-based judgment under the Golden Observer contract.  
It does **not** mint, create, authorize, or retroactively establish a production Choice object.

**Writer realization gate (authority, not vocabulary):**

```text
Writer may narrate decisions (Decision Narration).
Writer may realize a Character Choice as *authoritative* only if
a legitimate upstream Character Causality / Action Intent authority exists.
```

**Cannot** supply that authority alone:

```text
Plan · Desire · Pressure · Writer preference · causalChain · Beat Decision
```

Do **not** ban decision language in prose.

### W2 — Loop ④ Writer → Prose → Actual → Choice

```text
FORBIDDEN:
Actual → Choice Authority
```

**Freeze:**

```text
Actual ↛ Choice Authority
Actual ↛ Candidate Option
Actual ↛ Option Access
Actual ↛ Agency
Actual ↛ Choice
```

Actual **may** establish/update: factual occurrence, action occurrence, consequence, state evolution, Character SR awareness where legitimately applicable.

```text
Writer → Prose → Actual
  must never become
Actual → Choice
```

Also preserve:

```text
Action Happened ≠ Character Chose   (R8)
```

### W3 — Loop ② World → Option → Access → Choice

```text
FORBIDDEN automatic chain:
World Possibility → Candidate Option → Option Access → Choice
```

Sealed non-promotions:

```text
World Possibility ↛ Character Option
World Possibility ↛ Option Access
Option existence ↛ Option Access
Option Access ↛ Choice
```

Choice (L1 formation evidence) requires:

```text
Access ∧ Agency ∧ SubjectPresent
```

(at relevant *t*, Golden). Production Choice remains OPEN-4 and **cannot** be minted by this chain.

### W4 — Loop ③ SR → Option → Access → Choice

```text
FORBIDDEN:
Character SR → automatic Option generation
Character SR → L1 Observer input
SR fields → automatic Option Access / Agency / Choice
```

SR may hold fact subjectivity (awareness, belief, interpretation, stance, relevance).  
SR is **not** Option Generator, Choice Authority, or L1 input.

---

## 3. OPEN-1 Closure Strategy (bypass closed; ontology not forced)

**v0.2 does NOT select** as production Option authority:

```text
World → Option
SR → Option
Authored Plan → Option
LLM → Option
```

### Semantic separation (sealed)

```text
World Possibility
  ≠ Fact
  ≠ Narrative Evidence
  ≠ Candidate Option
  ≠ Option Access
  ≠ Agency
  ≠ Choice
```

| Layer | Meaning | Establishes | Does not establish |
|-------|---------|-------------|-------------------|
| World Possibility | Path possible in world | Objective possibility | Access, Agency, Choice |
| Fact / Fact Access | Character knows/perceives a fact | Epistemic fact | Option Access, Choice |
| Narrative Evidence | Prose cues for L1 taxonomy | Evidence classes E1–E5, Agency cues, SubjectAbsent | Ontological Choice object |
| Candidate Option | **OPEN** — no safe producer frozen | — | Must not be filled by World/SR/Plan/LLM auto-gen |
| Option Access | Path available to self in character model at *t* | Access dimension | Choice alone |
| Agency | Narrated internal-state traceability at *t* | Agency dimension | Choice alone |
| Subject Presence | Not SubjectAbsent | Presence dimension | Choice alone |
| Choice (L1) | Judgment VALID under Golden | Formation evidence judgment | Production Choice mint |
| Choice (production) | **OPEN-4** | — | Not Plan/Writer/Actual/L1 alone |

**If Candidate Option cannot be safely defined:** keep **OPEN** rather than invent unsafe architecture.  
**Implementation STOP** remains until a safe producer is Human-sealed — but **laundering bypasses are FORBIDDEN** regardless.

Recommended discussion labels (still not frozen producers):

| Label | Role |
|-------|------|
| Narrative Access Evidence | What L1 classifies in prose (E1/E2/E4…) |
| Subjective Available Action | Future production typed availability — **not** L1; **not** Plan.options |

---

## 4. L1 Observer I/O Wall (NEW)

Legal direction only:

```text
Prose (+ optional pov)
  → Evidence classification (Golden taxonomy)
  → Judgment VALID | UNKNOWN | INVALID
```

**Forbidden:**

```text
Prose → generated Candidate Options → Choice
```

Observer may classify/extract **against closed Golden evidence taxonomy**.  
Observer must **not** invent free-form options (leave / stay / fight / take key / run / …) because plausible.

| Prose | Illegal output |
|-------|----------------|
| 他看着门。 | Option = leave |
| 她知道钥匙在桌上。 | Option = take key and escape |
| 他很害怕。 | Option = run |
| 门是开的。 | Character has leave as Choice |

**E levels intact:**

| Level | Sufficient for Access? |
|-------|------------------------|
| E1 Explicit multi-option | YES |
| E2 Negation of an action | YES (negated path only) |
| E3 「没做 X」alone | NO |
| E4 Fork / 取舍 | YES |
| E5 Pure action | NO |

**L1-U03:** One E2 ≠ infer second chosen path.

L1 Observer ≠ Option Generator.  
No Access/Agency/SubjectPresence Engines required before L1 (subtraction).

---

## 5. Non-Promotion Rules (NEW / strengthened)

### Fact → Option Access

```text
SR.awareness ↛ Option Access
SR.belief ↛ Option Access
knowledge ↛ Option Access
capability ↛ Option Access
world possibility ↛ Option Access
relevance ↛ Option Access
desire ↛ Option Access
```

「角色知道门开着」↛「离开是可及选项」unless narrative evidence establishes that option in the character’s subjective model (L1: E1/E2/E4-class evidence).

### Agency temporal + source

```text
Consider(X at t0) ↛ Agency for Action X at t1
  unless Action at t1 has its own sufficient local attribution evidence

Desire ↛ Agency
Pressure ↛ Agency
Plan ↛ Agency
SR belief ↛ Agency
```

Agency = narrated internal state at relevant moment *t* (Golden).

### Historical non-transfer

```text
Historical Evidence ≠ Current Choice Evidence
```

Scene 1 「I could leave」↛ Scene 5 Choice Formation for leaving.  
History may be **context only**, never silent current Choice authority.

### Relevance

```text
Relevance ↛ Desire
Relevance ↛ Option Access
Relevance ↛ Agency
Relevance ↛ Choice
```

Distinct states: knows / understands / cares / considers / can do — **do not collapse**.

### Lexical non-automatic (必须 / 只能 / 不得不 / 被迫)

These words ↛ automatic Subject Absence and ↛ automatic Agency.  
Interpretation depends on semantic evidence.

**Coercion triplet preserved:**

| Fixture | Pattern | Expected |
|---------|---------|----------|
| L1-P07 | conscious tradeoff under coercion | VALID |
| L1-U08 | 「只能」without sufficient tradeoff evidence | UNKNOWN |
| L1-I06 | unconscious / another acts | INVALID |

---

## 6. Subject Presence (unchanged from Golden)

INVALID only if SubjectAbsent: sleep / unconscious / dissociation / pure reflex without awareness / acting without knowing one acts / explicit loss of agency (puppet).

NOT INVALID: fear, pain, threat, irrationality, coercion while conscious.

```text
Grammar ≠ Subject Presence
```

Both auto directions (is / is-not grammatical subject) **rejected**.

---

## 7. Narrow Choice-like Contamination (sealed definition)

**Reject:** “Anything containing an action is Choice-like.”

**Freeze:**

```text
Choice-like Contamination
=
an object, field, prompt instruction, derived value, or runtime artifact
that asserts Character Causality Authority
without legitimate L1-grade evidence (for Question A judgments)
or sealed production authority (for Question B).
```

**Contamination claim patterns (examples):**

```text
character chose / decided / selected X
character will choose X
character should choose X
action is attributable to character (without evidence/authority)
```

「character must choose X」— interpret semantically; may be external constraint (**not** auto-contamination) or Causality Authority claim (contamination).

**Not contamination by default:**

```text
World Possibility · Pressure · Situation · Opportunity · Conflict
Plan Instruction · Action description
```

unless they assert Character Causality Authority.

---

## 8. Writer Boundary

```text
Decision Narration ≠ Decision Authority
```

Writer = Realization Layer.  
Writer ≠ Choice / Decision / Agency / Character Causality Authority.

**Upstream for authoritative Choice realization:** OPEN-4 (Character Causality / Action Intent).  
If OPEN-4 unsafe to resolve → leave OPEN; do not invent implementation.

Candidate architecture (not implemented):

```text
[OPEN-4 Action Intent]
  → Writer (realization)
  → Prose
  → Actual
```

---

## 9. Anti-Inference Rules (v0.2 sealed DRAFT set)

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
| R13 | L1 VALID ↛ production Character Choice |
| R14 | Actual ↛ Choice Authority |
| R15 | Historical Evidence ≠ Current Choice Evidence |
| R16 | Relevance ↛ Desire / Option Access / Agency / Choice |
| R17 | Consider(t0) ↛ Agency(t1) without local evidence |
| R18 | Lexical 必须/只能/不得不/被迫 ↛ auto Absence / Agency |

---

## 10. No New Engine

Prefer: authority restriction + input restriction + semantic separation + non-promotion.  
Do **not** add Causality / Cognitive / Emotion / Option Generator / Drama Manager / Choice Engine in v0.2.

---

## 11. Explicitly NOT authorized by v0.2

```text
NO Phase 4 implementation
NO L1 Observer implementation yet
NO Option Generator
NO SR / Golden / schema / code changes
NO Human Seal
NO Consequence / Survival / Director
```

---

*End Semantic Contract v0.2 DRAFT*
