# Phase 4 — First Legal Character Causality Entry Design Gate

```text
MODE: DESIGN GATE · READ-ONLY · NO IMPLEMENTATION

CODE CHANGES: NONE
SCHEMA CHANGES: NONE
PROMPT CHANGES: NONE
GOLDEN CHANGES: NONE
RUNTIME CHANGES: NONE
NAMED EO: NONE
IMPLEMENTATION: NOT AUTHORIZED

UPSTREAM (frozen — do not reopen):
  Vertical slice first blocking gap = FOUND
    (Character SR → formatCharacterSRForPrompt → Writer = STORY CONTROL ≠ Causality)
  Phase 4 OPEN · #35 Choice NOT PROVEN · OPEN-4 Action Intent = OPEN
  H3.3 #47 SEALED · Character Goal Authority = NONE · Goal Engine = NOT AUTHORIZED
  H2 #43 BINDING · DG-042 SEALED · 4.4.1d-R SEALED
  #41 QUALIFIED / UNFIXED · #25b Candidate Option ↛ L1
  observeL1 = test-only · Phase 5 / L2 / Consequence / Survival / Director = OUT
```

**Source archaeology:** `docs/design/phase-4/phase-4-main-path-vertical-slice-first-blocking-gap.md`  
**Contract anchors:** `01_character-causality-semantic-contract-v0.2.md`, `03_l1-production-boundary-v0.2.md`, `#08` bypass audits, H3.3 `#47`

---

## A. Gate Question

> **Character SR 更新之后，什么——如果有的话——才构成第一个合法的 Character Causality evaluation entry？**

Restated for this Gate:

> After Character SR leaves STORY CONTROL / prompt lore, what — if anything — is the first semantic position at which Character Causality legally takes over production continuation?

---

## B. Existing Proven Semantics

Only what is already proven by code + sealed/frozen contracts:

| Proven ring | What it is | What it is not |
|-------------|------------|----------------|
| Writer → Prose | STORY REALIZATION | Character Causality / Choice |
| Prose → Actual (`ensureActualEvents`) | STORY TRUTH / Occurrence | Choice Authority |
| Actual → Fact IB → Character SR | Subjective state update (awareness / belief / stance / interpretation under Fact IB) | Causality evaluation |
| Soft Attribution (`applyAttributionAfterActual`) | Retrospective TypedEvidence → PASS / UNKNOWN / INVALID; `choice`/`consequence` always undefined | Choice; Causality entry; hard gate |
| `formatCharacterSRForPrompt` → Writer | SR as prompt lore (STORY CONTROL) | Character Causality |
| observeL1 | Question A prose judgment (test-only) | Production Choice / OPEN-4 |
| GGC (H3.3) | Restricted orientation evidence semantics | Goal Authority / Choice / Action |
| #08 Path E | SR → Writer → Action → Actual is **BYPASS** | Legal Causality path |

### 3.1 SR is not Character Causality evaluation

Character SR (when populated) can hold character-bounded:

- knowledge / awareness (what was accessible via Fact IB)
- perception-shaped awareness of Actual
- interpretation / belief / stance / relevance / uncertainty (as SR slots allow)

```text
Character SR ≠ Character Causality evaluation
```

**Why:** SR is a **state** (subjective model of reality for a character). Causality evaluation is a **judgment** about whether an action (or next realization) is attributable as character-causal rather than author-machinery. Contract W4 forbids treating SR fields as automatic Option / Access / Agency / Choice. Holding stance or belief does not evaluate attributability.

### 3.3 Semantic distinctions (binding for this Gate)

```text
SR ≠ Goal ≠ Candidate Option ≠ Agency ≠ Choice ≠ Action
Occurrence ≠ Attribution
Attribution ≠ Choice
Choice ≠ Consequence
GGC ≠ Character Goal Authority ≠ Choice ≠ Action
L1 VALID ≠ Production Choice
Writer prose ≠ Causality authority
```

### Writer semantic duty boundary (3.4)

| Role | Allowed? |
|------|----------|
| Produce **prose evidence** (including decision narration) | YES — STORY REALIZATION |
| Produce Character Causality **by narration alone** | NO |
| Supply Character Causality / Choice / Goal / Agency **authority** | NO |
| Participate as **evidence surface** for later evaluation (Question A / Attribution cues) | YES — evidence only |
| Be **authority** inside Causality evaluation | NO |

```text
Writer → evidence surface
Writer ↛ Causality authority
Writer ↛ Choice mint
```

Upstream Character Causality / Action Intent authority (OPEN-4) is required before Writer realization can be treated as *authoritative* Character Choice (Contract W1). That authority is **not sealed**.

### Attribution vs Causality direction (4–5)

```text
(A) Prospective (sought by vertical slice):
      Character SR → ??? → Character Causality evaluation → … → Action

(B) Retrospective (exists in code):
      Action / Occurrence → soft Attribution → Causality-shaped evidence
```

```text
Attribution as first Causality entry after SR:
  NOT YET PROVEN
```

**Why not REQUIRED / why not the entry yet:**

1. Production order is Actual → SR → Attribution; Attribution does not sit *between* SR and next Writer as a prospective gate.
2. Gate always leaves `choice: undefined`; PASS ≠ Choice (frozen).
3. Soft: never blocks Actual / SR / Writer continuation.
4. Registry is not consumed by any Character Causality evaluator on the main spine.
5. Elevating Attribution → Choice would violate Occurrence ≠ Choice and Attribution ≠ Choice.

```text
Candidate Option required for this Gate:
  NOT YET PROVEN
  (Phase 4.1 ABSENT ≠ proven necessity; #25b CO ↛ L1)

GGC position:
  Possible later *input* to some evaluations; NOT an entry;
  GGC → Action / Goal → Choice = NOT assumed / FORBIDDEN as proven fact

L1 as first Causality entry:
  NOT PROVEN
  (Question A only; prose-only; not after SR; L1 VALID ↛ Question B)
```

### Question 9 (without new Engines)

> If we add no Candidate Option / Access / Agency / Goal / Choice Engine, can Character Causality still define a minimal, legal, non-Writer-authoritative evaluation entry?

```text
NOT YET PROVEN
```

Existing sealed pieces prove many **illegal** continuations. They do **not** yet seal a positive minimal judgment that can sit after SR without either inventing a new production authority (OPEN-4) or illegally promoting Attribution / L1 / SR / GGC / Writer.

---

## C. Candidate First-Entry Models

At most three research candidates. **None sealed. None implemented.**

### Model 1 — Prospective Causality Gate (before next Writer realization)

| | |
|--|--|
| **Input** | Character SR (+ optionally prior soft Attribution records as evidence only) |
| **Output** | A non-Writer judgment that next character-affecting realization may / may not proceed under Character Causality (exact proposition **unsealed**) |
| **Semantic duty** | Separate STORY CONTROL from character-causal continuation |
| **Why possibly legal** | Directly addresses the vertical-slice gap; non-Plan / non-Writer authoritative by construction if OPEN-4-shaped |
| **Conflict risk** | Without a sealed proposition, easy to smuggle Candidate Option / Agency / Choice Engine; OPEN-4 still OPEN; must not become Goal/GGC→Action |

### Model 2 — Retrospective Attribution as Causality core (elevate existing Gate)

| | |
|--|--|
| **Input** | Occurrence + TypedEvidence (prose cues, SR slots as evidence only) |
| **Output** | PASS / UNKNOWN / INVALID attributability of a realized Action |
| **Semantic duty** | Answer “was this Action attributable to the character?” (aligns with Contract objective language) |
| **Why possibly legal** | Matches Attributability ≠ Free Will; already has a soft Gate; forbids Plan/Desire/Pressure as evidence |
| **Conflict risk** | Direction is Action→evidence, not SR→entry→Action; PASS ≠ Choice; soft ≠ production entry; cannot alone authorize next Writer hop |

### Model 3 — L1 Judgment as first entry

| | |
|--|--|
| **Input** | Prose (+ optional pov) only |
| **Output** | VALID / UNKNOWN / INVALID (Question A) |
| **Semantic duty** | Evidence sufficiency for Choice Formation *in prose* |
| **Why possibly legal** | Golden-frozen; non-Plan; non-SR-as-input |
| **Conflict risk** | Not located after SR; not production authority; L1 VALID ↛ Choice; mounting as production Causality entry is forbidden by this Gate and `03_l1-production-boundary` |

---

## D. Rejections

| Claim | Rejection |
|-------|-----------|
| **SR → Writer as Causality** | SR consumed as prompt lore = STORY CONTROL / REALIZATION (#08 Path E). Contract W4: SR ↛ automatic Choice. |
| **Writer → Action as Causality** | Writer supplies evidence / realization only; cannot mint Causality or Choice authority (W1). Action Happened ≠ Character Chose (R8). |
| **Attribution → Choice** | Soft Gate leaves `choice: undefined`; PASS ≠ Choice; Occurrence ≠ Choice. Not proven as first entry after SR. |
| **Candidate Option → L1** | #25b REJECTED; CO necessity for this Gate = NOT YET PROVEN; ABSENT ≠ required object. |
| **GGC → Action** | H3.3: GGC ↛ Goal Authority ↛ Choice ↛ Action. Orientation evidence ≠ Causality entry. |
| **observeL1 → production authority** | Question A only; test-only; L1 VALID ↛ production Choice; Observer must not read SR/Plan. |

---

## E. First Legal Entry Verdict

```text
NOT PROVEN
```

```text
Missing proof:

1. Direction unsettled:
   Prospective (SR → evaluate → then Action)
   vs Retrospective (Action → Attribution → Causality evidence)
   are different semantic rings. The vertical-slice gap asks for the former;
   existing code only partially implements soft form of the latter.
   Until direction is sealed, “first entry after SR” cannot be named.

2. Evaluation proposition unsettled:
   What exact question does the first entry answer?
   (subject presence? owned orientation? actionable basis?
    action tendency? Choice Formation preconditions?
    prior-action attributability?)
   Contract lists related concerns at different layers;
   none is sealed as THE first post-SR judgment.

3. OPEN-4 unsettled:
   Production Choice / Action Intent authority remains OPEN.
   No sealed non-Writer / non-Plan / non-L1-alone / non-Actual-alone
   filler exists. Therefore no production entry can yet claim legality
   as Causality authority.

4. Negative space is proven; positive entry is not:
   We proved what cannot be the entry (SR, Writer, Plan, GGC→Action,
   Attribution→Choice, L1-as-mint, CO→L1).
   Proving absence of illegal stand-ins ≠ proving identity of the legal entry.

5. “Minimal entry without Engines” remains open:
   A pure semantic judgment (not an Engine) might exist in principle,
   but its I/O and authority have not been sealed without collapsing into
   Candidate Option / Agency / Choice / Goal machinery or illegal promotions.
```

### Minimal topology (only proven / explicitly unproven)

```text
Actual
  ↓
Information Boundary (Fact IB)
  ↓
Character SR
  ↓
UNKNOWN / NOT PROVEN     ← first legal Character Causality evaluation entry
  ↓
Character Causality evaluation   ← NOT PROVEN as production object
  ↓
UNKNOWN / NOT PROVEN     ← ordering among Choice / Action Attribution / other
  ↓
Action                   ← today: Writer realization without the above
```

Do **not** fill `UNKNOWN` with future module names.

---

## F. ONE NEXT DESIGN QUESTION

```text
ONE DESIGN QUESTION:

Is the first legal Character Causality evaluation, by Phase 4 contract,
(1) a prospective judgment that must occur after Character SR and before
    the next character-affecting Writer realization,
or
(2) a retrospective attributability judgment over an already-realized
    Action / Occurrence (with soft Attribution as evidence path only,
    not Choice mint),
or is that bifurcation itself still NOT PROVEN / requiring a third sealed
definition that is neither (1) nor (2)?

Answer must remain compatible with:
  Attribution ≠ Choice · L1 VALID ≠ Production Choice · SR ≠ Choice ·
  GGC ≠ Action · Writer ↛ Causality authority · OPEN-4 still OPEN ·
  no Engine invention in this question.
```

---

```text
DESIGN GATE COMPLETE

CODE:
NO CHANGES

SCHEMA:
NO CHANGES

PROMPT:
NO CHANGES

GOLDEN:
NO CHANGES

RUNTIME:
NO CHANGES

NAMED EO:
NONE

IMPLEMENTATION:
NOT AUTHORIZED

FIRST LEGAL CHARACTER CAUSALITY ENTRY:
NOT PROVEN

NEXT:
ONE DESIGN QUESTION ONLY

STOP:
YES
```
