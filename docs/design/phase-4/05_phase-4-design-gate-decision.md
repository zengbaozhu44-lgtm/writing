# 05 — Phase 4 Design Gate Decision

```text
PHASE 4 DESIGN GATE
STATUS: BLOCKED
CODE CHANGED: NO
GOLDEN SPEC CHANGED: NO
```

**Meaning of BLOCKED:** Design package delivered as DRAFT for Human seal + reverse-attack audit. **Implementation must not start.** Open ontology/authority decisions remain. Golden SPEC was not modified to “make design prettier.”

**Deliverables:**

| File | Role |
|------|------|
| `01_character-causality-semantic-contract-v0.1.md` | Semantic Contract DRAFT |
| `02_authority-map.md` | Authority Map |
| `03_l1-boundary-alignment.md` | Golden vs proposal conflicts |
| `04_choice-like-contamination-audit.md` | Contamination classification |
| `05_phase-4-design-gate-decision.md` | This gate report |

---

## 1. Frozen Principles (this Gate may cite; Human seals)

1. Choice = **Character Attributability**, not Free Will; opposite = **Subject Absence**, not External Coercion.
2. **L1 ≠ L2**; L1 asks evidence sufficiency, not “best” option.
3. **L1 Observer = Evidence-Based Observer** only: `Prose → L1 Evidence → L1 Judgment`.
4. L1 Observer input = **prose (+ optional pov)**; NOT Plan / intent / goal / causalChain / canon / SR / expected / evidence.
5. `Option Exists ≠ Option Accessible ≠ Option Chosen`.
6. `Fact Access ≠ Option Access`; `World Possibility ≠ Character Access`.
7. `Cause ≠ Agency`; `Pressure ≠ Agency`; `Plan ≠ Agency`.
8. `Coercion ≠ Subject Absence`; `Grammatical Subject ≠ Subject Presence`.
9. Plan / Reasoner / Beat / Writer **≠** Character Choice Authority.
10. Subtraction: do not invent Engines because a semantic layer is missing.
11. Anti-Inference Rules R1–R12 (Contract §10) — freeze candidates pending Human seal.

---

## 2. D1 Candidate Option

| Field | Content |
|-------|---------|
| PROPOSED | Four layers: Exists / Accessible / Candidate / Chosen — must not merge |
| SUPPORTED | Exists ≠ Accessible ≠ Chosen (Golden + Archaeology) |
| CONFLICT | “Candidate Option = SR semantic fact” + “L1 reads SR” vs Golden prose-only Observer |
| NEEDS DECISION | **OPEN-1** dual-object naming (Narrative Access Evidence vs Subjective Available Action) |

**Candidate Option ontology = NOT DETERMINED → STOP-1.**

---

## 3. D2 Option Exists vs Access

| Field | Content |
|-------|---------|
| PROPOSED | Freeze World Possibility ≠ Character Access; no automatic World→Access |
| SUPPORTED | Golden E5/E3; Phase 4.1 |
| CONFLICT | none with Golden |
| NEEDS DECISION | none for the principle |

**Principle READY to freeze.** Production Option Access object still OPEN-2.

---

## 4. D3 Access

| Field | Content |
|-------|---------|
| PROPOSED | L1 Access = judgment from E1–E5; Fact≠Option; L1-U03 frozen |
| SUPPORTED | Golden Access table |
| CONFLICT | Equating Phase 3.2 Fact Access with Option Access |
| NEEDS DECISION | **OPEN-2** — production Option Access store? |

Access is **L1 judgment**, not an automatic SR field. Production Option Access = UNKNOWN.

---

## 5. D4 Agency

| Field | Content |
|-------|---------|
| PROPOSED | Agency = narrated internal-state traceability (Golden); Cause≠Agency |
| SUPPORTED | Golden Agency minimum |
| CONFLICT | Access/Agency/SubjectPresence **Engines** before L1 |
| NEEDS DECISION | **OPEN-3** production Agency vs L1-only Agency |

```text
Access Engine → Agency Engine → SubjectPresence Engine → L1
= DESIGN PROPOSAL — NOT YET FROZEN
```

Golden: single Observer conjuncts `Access ∧ Agency ∧ SubjectPresent` from prose.

---

## 6. D5 Subject Presence

| Field | Content |
|-------|---------|
| PROPOSED | Golden SubjectAbsent set only; coercion triplet P07/U08/I06 |
| SUPPORTED | Golden SPEC |
| CONFLICT | Grammatical-subject rule |
| NEEDS DECISION | none for Presence definition |

**Proposal E: REJECT AS TOO STRONG.**

---

## 7. D6 Character Causality Authority

| Field | Content |
|-------|---------|
| PROPOSED | L1 Observer = judgment authority only; Plan/Writer/Reasoner ≠ Choice; no auto Causality Engine |
| SUPPORTED | Golden iron law; Archaeology contamination |
| CONFLICT | Default “Character Causality Engine” |
| NEEDS DECISION | **OPEN-4** production Action Intent / Choice authority |

Today: **no legal production Choice claim.**

---

## 8. D7 Choice-like Contamination

Live path `Plan → Writer → Action` **≠** `Character → Choice → Action`.  
Classifications in `04_*.md`. Contaminated; **not repaired** this round.

Proposal F freeze candidate: Plan/Reasoner/Beat/Director/Writer may emit Situation/Pressure/Opportunity; **must not** issue Character Choice / Agency / Causality Authority — with care not to mis-kill Narrative Situation.

---

## 9. DeepSeek/Grok Proposal Conflict Audit

### Proposal A — Candidate Option already exists in Character SR

```text
PARTIALLY SUPPORTED / CONFLICT
```

- Archaeology: **no** typed Option in SR today.  
- Even if added later, **≠** L1 input/object.  
- Storing Option in SR without separating Exists/Accessible/Chosen risks contamination.

### Proposal B — L1 Observer matches Candidate Option from SR + Narrative Evidence

```text
CONFLICT
```

Golden input = prose (+pov) only. SR as Observer input **forbidden**. Do not rewrite SPEC.

### Proposal C — Candidate Option Producer = Character SR

```text
CONFLICT / NEEDS DECISION
```

Confuses **authority** vs **evidence source**. SR may someday evidence subjective availability (OPEN-1/2); SR is **not** Choice authority and **not** L1 Producer.

### Proposal D — Access + Agency + SubjectPresence complete before Choice

```text
PARTIALLY SUPPORTED as L1 conjuncts — NOT as three Engines
```

`L1_VALID := Access ∧ Agency ∧ SubjectPresent` is Golden. Pre-L1 Engine pipeline = **architecture proposal, not frozen**.

### Proposal E — Subject Presence = grammatical subject

```text
REJECT AS TOO STRONG
```

`Grammatical Subject ≠ Subject Presence`.

### Proposal F — Plan / Reasoner / Writer must not produce Choice-like objects

```text
SUPPORTED as freeze candidate (with classification care)
```

Define Choice-like narrowly: claims of Character Choice / Agency / Causality Authority. Allow World Possibility / Pressure / Opportunity / Narrative Instruction.

---

## 10. Authority Map

See `02_authority-map.md`. Critical unknowns: Candidate Option, Option Access, production Choice, Action Intent (**DESIGN DECISION REQUIRED**).

**STOP-9 risk:** Plan / Reasoner / Beat / Writer still compete as Choice-like claimants in production until Proposal F is sealed and enforced (enforcement = later implementation; this Gate only contracts).

---

## 11. L1 Alignment

See `03_l1-boundary-alignment.md`.

```text
Golden SPEC says: Prose → Evidence → Judgment; no SR/Plan input
DeepSeek/Grok propose: SR → L1 → Candidate Option
Conflict: Observer input + role + ontology
Required Design Decision: REJECT SR-driven L1; keep dual-layer OPEN-1 if production needs availability
```

---

## 12. Boundary Matrix

### Boundary A — Access

| Case | Contract |
|------|----------|
| Character knows fact | Fact Access (SR/prose) |
| Character sees option | Option Access (L1 E1/E2/E4; production OPEN-2) |
| Character does not know option | No Option Access; R1–R3 |

### Boundary B — Agency

| Case | Contract |
|------|----------|
| Intentionally acts (narrated internal state) | May support Agency |
| Acts under pressure | Pressure ≠ Agency alone |
| Reflexively acts | May be SubjectAbsent / INVALID |
| Is acted upon | May be SubjectAbsent if puppet/unconscious; else case-by-case |

### Boundary C — Subject Absence

INVALID: sleep, unconscious, pure reflex, no awareness of acting, loss of agency, puppet.  
NOT auto-Invalid: fear, pain, threat, coercion, irrationality.

### Boundary D — Coercion

| Pattern | Expected |
|---------|----------|
| conscious + gunpoint + tradeoff | VALID (L1-P07) |
| conscious +「只能」+ no tradeoff evidence | UNKNOWN (L1-U08) |
| unconscious + another acts | INVALID (L1-I06) |

---

## 13. Anti-Inference Rules

R1–R12 listed in Contract §10 — freeze candidates pending Human seal. Especially:

- R9 Writer Intention ≠ Character Causality  
- R10 Plan Choice ≠ Character Choice  
- R11 LLM Plausibility ≠ Narrative Evidence  
- R12 Candidate Option Generation ≠ L1 Observation  

---

## 14. Implementation Readiness

| Primitive | Status |
|-----------|--------|
| World Possibility | READY (as concept; Plan may emit as situation only) |
| Character SR | READY for **fact** subjectivity; **BLOCKED** as Option/Choice authority |
| Candidate Option | **BLOCKED** (OPEN-1) |
| Option Access | **BLOCKED** (OPEN-2; Fact≠Option) |
| Agency | READY as **L1 conjunct definition**; **BLOCKED** as Engine / production attribution (OPEN-3) |
| Subject Presence | READY (Golden definition) |
| L1 Evidence | READY (contract); Observer **unimplemented** |
| L1 Judgment | READY (contract); Observer **unimplemented** |
| Choice Authority | **BLOCKED** (OPEN-4; competing contaminants) |
| Action Intent | **BLOCKED** (OPEN-4) |
| Writer Boundary | READY as **candidate architecture**; not implemented |

---

## 15. STOP Conditions

| ID | Triggered? | Note |
|----|------------|------|
| STOP-1 | **YES** | Candidate Option ontology open |
| STOP-2 | **YES** | Exists vs Accessible separated in principle; production Candidate vs Accessible still open |
| STOP-3 | **YES** | SR as Option authority not adjudicated for production |
| STOP-4 | **YES** | Golden vs SR→L1 proposal: conflict resolved by **reject** in draft; Human must seal |
| STOP-5 | **NO** | Agency does not depend on new Engine in this draft |
| STOP-6 | **NO** | Grammatical-subject rule rejected |
| STOP-7 | **YES** | Plan/Reasoner/Writer still can emit Choice-like in code; contract forbids; enforcement pending |
| STOP-8 | **NO for design** | Design forbids Option Generation as L1; runtime still has Plan options (contamination) |
| STOP-9 | **YES** | Competing Choice-like authorities in production |
| STOP-10 | **NO** | We refuse to modify Golden |
| STOP-11 | **NO for this Gate** | Schema change not required to finish Design DRAFT; may be needed later after OPEN-* |
| STOP-12 | **NO** | Not deferred into Consequence/Survival/Director |

```text
BLOCKED → STOP
```

**禁止进入 implementation.**

---

## 16. Open Design Decisions (Human)

| ID | Question |
|----|----------|
| OPEN-1 | Is “Candidate Option” Narrative Access Evidence (L1), Subjective Available Action (production), or both as distinct objects? |
| OPEN-2 | Does production store Option Access, or only adjudicate in prose via L1? |
| OPEN-3 | Is Agency production-side attribution ever separate from L1 Agency judgment? |
| OPEN-4 | Who issues Action Intent / production Choice after L1 (if ever)? Subtraction: Contract+Observer first |
| OPEN-5 | Seal Proposal F (no Choice-like from Plan/Reasoner/Writer) with precise Choice-like definition? |
| OPEN-6 | Seal R1–R12 as frozen anti-inference? |

**Recommended next Human step (per user):** reverse-attack audit on this DRAFT — hunt for smuggled `SR→Option`, `Option→Choice`, `Pressure→Agency`, `Writer→Choice` reconnects — **before** `PHASE 4 DESIGN GATE APPROVED`.

---

## 17. Final Gate Verdict

```text
PHASE 4 DESIGN GATE = BLOCKED (DRAFT COMPLETE)
CODE CHANGED = NO
GOLDEN SPEC CHANGED = NO
L1 OBSERVER = NOT IMPLEMENTED
OPTION GENERATOR = NOT ADDED
IMPLEMENTATION = FORBIDDEN
```

**What this Gate proved:**

> What evidence, objects, and Authority are **allowed** to claim “this is the Character’s own Choice” — and what must never claim it.

**What this Gate did not claim:**

> We already know what the Character will choose.  
> Candidate Option is ready.  
> Character SR is Choice.  
> Writer is Character Causality Authority.  
> L1 is an Option Generator.

**Wait for:** Human reverse-attack audit → then explicit  

> `PHASE 4 DESIGN GATE APPROVED`

before any Phase 4 code.
