# 07 — Concrete Adversarial Trace Audit (Contract v0.2)

**Mode:** ADVANCED ADVERSARIAL DESIGN AUDIT · READ-ONLY  
**Target:** Phase 4 Contract v0.2 (`01`–`05` `*v0.2*`, `06_implementation-readiness-v0.2.md`) + prior `06_reverse-attack-audit.md`  
**Hard constraints:** CODE / GOLDEN / DESIGN CONTRACT / IMPLEMENTATION — all unchanged  

**Standard of proof:**  
“FORBIDDEN by policy” alone is **insufficient**.  
A path is **BLOCKED** only if a concrete producer/consumer/authority gap makes the promotion **legally unreachable** under v0.2.  
Marks: `BLOCKED` · `OPEN` · `BYPASS`.

---

## 0. Method

For each promotion edge, identify:

| Slot | Meaning |
|------|---------|
| Producer | Who/what emits the upstream artifact |
| Consumer | Who/what would need to accept it as Choice/Access/Agency authority |
| Authority | Who is licensed to mint the downstream claim |
| Transformation | What semantic rewrite occurs |
| Promotion point | Exact edge where laundering would succeed |
| Missing gate | What would be required for a legal bridge |
| Exact bypass | Licensed path if any |

---

## 01 — Trace Findings A–F

| Trace | Path | Can bypass occur? | Exact promotion point | Severity | Status |
|-------|------|-------------------|----------------------|----------|--------|
| **A** | Plan→Writer→Prose→L1→production Choice | **No** (production Choice) | `L1 VALID → production Choice` | — | **BLOCKED** |
| **B** | World→Option→Access→Choice | **No** (no legal Option producer; World↛Option) | `World → Candidate Option` | — | **BLOCKED** |
| **C** | SR→Option→Access→Choice | **No** (SR↛Option gen; no legal Option producer) | `SR → Candidate Option` | — | **BLOCKED** |
| **D** | Writer→Agency prose→L1 VALID→Choice | Production Choice: **No**; L1 evidence surface: **Yes (inherent)** | `Writer deliberation → Agency cues in prose` then failed mint at `VALID→Choice` | **HIGH** residual | Production **BLOCKED**; evidence **CONTEXT** |
| **E** | Writer→Action→Actual→Choice | **No** | `Actual → Choice Authority` | — | **BLOCKED** |
| **F** | Historical→Current Choice | **No** (auto) | `Access/Agency(t0) → (t1)` | — | **BLOCKED** |

---

### Trace A — Plan → Writer → Prose → L1 → production Choice

```text
Plan: "character decides to escape"
  → Writer inputs
  → Writer
  → prose: "she decides to escape"
  → Actual (escape occurred)
  → L1 (may VALID if Access∧Agency∧SubjectPresent in prose)
  → production Choice = escape  ???
```

| Slot | Instantiation |
|------|----------------|
| Producer | Plan (instruction); Writer (narration); L1 (judgment only) |
| Consumer attempted | Production Choice mint |
| Authority required | **OPEN-4 only** (v0.2 §1) — Plan/Writer/L1 **explicitly not** authority |
| Transformation attempted | Instruction → narrated decision → evidence judgment → **Choice object** |
| Promotion point | `L1 VALID → production Character Choice` |
| Missing gate | Sealed production bridge equating A↔B — **none sealed** |
| Exact bypass | **None licensed** |

**Concrete boundary (not mere policy label):**

1. Question A ≠ Question B (v0.2 §1).  
2. `L1 VALID ↛ production Character Choice` (R13) — L1 has **no authority slot** to mint Choice.  
3. Writer narration ≠ Character Causality Authority — Plan/Desire/Pressure/causalChain **cannot** fill OPEN-4.  
4. Therefore no legal consumer may accept this chain as production Choice.

**Can the system convert this into `Character Choice = escape`?**  
- As **Decision Narration / Actual occurrence**: yes (legal, non-authority).  
- As **L1 VALID**: possible (Question A only).  
- As **production Character Choice**: **unreachable** under v0.2 — no licensed mint authority on this path.

**Tests:** `L1 VALID ↛ production Choice` — **holds**. `Writer narration ≠ Causality Authority` — **holds**.

**Status: BLOCKED** (production). Residual: runtime still *writes* Plan-driven decision prose (contamination appearance) — does not mint production Choice under contract.

---

### Trace B — World → Option → Access → Choice

```text
World: door.open = true
  → perception: sees open door
  → LLM: "escape is possible"
  → Candidate Option: escape
  → Access: true
  → Choice
```

| Slot | Instantiation |
|------|----------------|
| Producer attempted | World / perception / LLM plausibility |
| Consumer | Candidate Option → Option Access → Choice |
| Authority | Candidate Option: **NONE sealed** (OPEN-1); unsafe producers **explicitly disqualified** (World/SR/Plan/LLM) |
| Transformation | World Possibility → Character Option → Access → Choice |
| Promotion point | `World Possibility → Candidate Option` (first break) |
| Missing gate | Safe Option producer (OPEN-1 unresolved — **correctly**) |
| Exact bypass | **None licensed** |

**Why not “OPEN means BYPASS”:**  
OPEN-1 means **no sealed producer**, not “any producer allowed.”  
v0.2 forbids World/SR/Plan/LLM as Option producers. With **zero legal producers**, the chain cannot advance to a legal Candidate Option artifact.

Second break: even if an illegal Option were invented, `World/Fact ↛ Option Access`; Access alone ↛ Choice; L1 VALID ↛ production Choice.

**OPEN-1:** remains **OPEN** (unresolved ontology). No unsafe producer selected. No convenience solution.

**Status: BLOCKED**

---

### Trace C — SR → Option → Access → Choice

```text
SR: fear=high, awareness=door_open, belief=danger
  → Reasoner/LLM: "character may escape"
  → Candidate Option → Access → Choice
```

| Non-promotion tested | Holds? |
|----------------------|--------|
| SR.awareness ↛ Candidate Option | **Yes** |
| SR.belief ↛ Candidate Option | **Yes** |
| SR desire/relevance ↛ Candidate Option | **Yes** |
| SR ↛ Character Choice Authority | **Yes** |
| SR ↛ L1 Observer input | **Yes** |

| Slot | Instantiation |
|------|----------------|
| Promotion point | `SR → Candidate Option` / `Reasoner+SR → Option` |
| Authority | None — SR is fact subjectivity only; Reasoner ≠ Option/Choice authority |
| Exact bypass | **None licensed** |

Attack “SR as Option Generator”: **fails** under v0.2 — generation edge has no legal authority; Option producer still OPEN-1 with SR disqualified.

**Status: BLOCKED** · OPEN-1 stays unresolved.

---

### Trace D — Writer → Generated Agency → L1 → Choice

```text
Inputs: fear + open door + pressure
Writer: "She realized this was her only chance and decided to leave."
  → internal deliberation prose
  → Agency evidence (in prose)
  → L1 VALID (possible)
  → production Choice ???
```

| Distinction | Result |
|-------------|--------|
| Decision Narration | **LEGAL** — Writer may write deliberation language |
| Decision / Agency / Choice **Authority** | **FORBIDDEN** for Writer |
| L1 reading Agency cues in that prose | **LEGAL** under Golden (prose-only Observer) |
| L1 VALID → production Choice | **BLOCKED** (R13) |

| Slot | Instantiation |
|------|----------------|
| Producer of Agency **cues** | Writer (narration) |
| Producer of Agency **Authority** | Not Writer — OPEN-3/OPEN-4; narrated cues ≠ authority mint |
| Promotion point for production | `L1 VALID → production Choice` — **no authority** |
| Inherent residual | Writer can manufacture Question A evidence surface |

**Concrete boundary:**  
Writer can create **Agency-shaped prose** (evidence manufacturing). That is **not** the same as minting Agency Authority or production Choice. Golden L1 must adjudicate whatever prose exists; v0.2 answers laundering by **refusing to promote VALID to Question B**.

OPEN-4 remains **OPEN** — no previously sealed authority exists for authoritative Choice realization.

| Can bypass manufacture **production** Agency/Choice Authority? | **No** |
| Can Writer manufacture L1-visible Agency evidence? | **Yes** — HIGH residual, not a licensed production Choice path |

**Status:** Production path **BLOCKED**. Evidence-surface residual **HIGH** (not CRITICAL bypass of production mint).

---

### Trace E — Writer → Action → Actual → Choice

```text
Writer: character escapes
  → Actual: escape happened
  → State update / SR update
  → Choice?
```

| Edge | Contract reachability |
|------|----------------------|
| Actual → Fact / State / SR awareness | **LEGAL** (no Choice mint) |
| Actual → Choice Authority | **No legal consumer** — R14; Actual’s authority scope excludes Choice/Option/Access/Agency mint |

Promotion point `Actual → Choice` has **no licensed authority role** for Actual.

**Status: BLOCKED** · `Actual ↛ Choice Authority` **holds** as authority-scope limit, not slogan alone.

---

### Trace F — Historical → Current Choice

```text
Scene 1: "I can leave." / "I considered leaving."
Scene 5: character leaves.
```

| Attack | Result |
|--------|--------|
| Access(t0) → Access(t1) auto | **No** — R15 |
| Agency(t0) → Agency(t1) auto | **No** — R17 |
| Consider(X,t0) → Agency(Action X,t1) | **No** without t1-local evidence |
| Historical Choice → Current Choice | **No** |

History = **CONTEXT ONLY**. Current formation requires t-local Golden evidence.

**Status: BLOCKED**

---

## 02 — L1 I/O Attack

**Legal:**

```text
Prose → {E1..E5 labels, Agency cue labels, SubjectAbsent markers} → Judgment
```

**Illegal:**

```text
Prose → free-form option strings → Access → Choice
```

| Prose | Legal L1 | Illegal |
|-------|----------|---------|
| He looks at the door. | **UNKNOWN** (E5-class / insufficient) | Option=leave |
| She knows the key is on the table. | Fact cue; **≠** Option Access for escape; **UNKNOWN** for Choice | Option=take key and escape |
| He is afraid. | Fear ≠ Choice; **UNKNOWN** | Option=run |
| The door is open. | World Possibility only; **UNKNOWN** | Character has leave Choice |

**Can an LLM impl still manufacture Candidate Options?**  
- Under v0.2 **I/O contract**: free-form Option strings are **outside legal Observer output** — generation path has **no legal output slot**.  
- That is a concrete schema/authority boundary for Observer I/O, not only a slogan.  
- Residual **HIGH**: a non-compliant LLM wrapper could ignore schema — that is **implementation violation**, not a licensed contract path.

**Hidden extraction attack:** labeling invented options as “semantic extraction” remains **illegal** — extraction may only emit closed taxonomy labels, not Option inventories.

**Status: BLOCKED** (licensed path) · HIGH residual (non-compliant impl)

---

## 03 — Authority Graph

```text
World Possibility
  → artifact: situation / pressure / opportunity fuel
  → consumer: Planner, Writer (as situation)
  → authority: NOT Choice / NOT Option Access / NOT Candidate Option producer

Fact
  → artifact: occurrence / property
  → consumer: Actual consumers, SR awareness (via IB)
  → authority: factuality only; NOT Option Access / Choice

Character SR
  → artifact: awareness, belief, interpretation, stance, relevance
  → consumer: Writer context (non-authority); NOT L1 input
  → authority: fact subjectivity; NOT Option Generator; NOT Choice

Narrative Evidence
  → artifact: prose cues classifiable under Golden taxonomy
  → consumer: L1 Observer only (from prose)
  → authority: evidence for Question A; NOT production Choice

Candidate Option
  → artifact: OPEN (none sealed)
  → consumer: none legal
  → authority: NONE — World/SR/Plan/LLM disqualified; OPEN-1 unresolved

Option Access
  → artifact: L1 Access dimension (E1/E2/E4); production store OPEN-2
  → consumer: L1 Judgment conjunct
  → authority: prose evidence only for L1; NOT auto from Fact/SR/World

Agency
  → artifact: L1 Agency dimension (narrated internal state at t)
  → consumer: L1 Judgment conjunct
  → authority: prose at t; NOT Plan/Desire/Pressure/SR/Writer-as-authority/history

L1 Judgment
  → artifact: VALID | UNKNOWN | INVALID
  → consumer: audit / diagnostics; Golden runner
  → authority: Question A only; NOT production Choice mint (R13)

Production Choice
  → artifact: Choice / Action Intent record (if ever)
  → consumer: Writer authoritative realization
  → authority: OPEN-4 ONLY — not Plan/Writer/Actual/L1/Desire/Pressure

Action Intent
  → artifact: authorized intent for realization
  → consumer: Writer
  → authority: OPEN-4; currently OPEN (no interim Plan fill-in)

Writer
  → artifact: Prose (Decision Narration allowed)
  → consumer: Actual extractor; L1 (prose surface)
  → authority: Realization ONLY; NOT Causality / Choice / Agency Authority

Actual
  → artifact: text-grounded events
  → consumer: State Evolution; SR awareness (legit); NOT Choice
  → authority: occurrence / consequence; NOT Choice / Option / Access / Agency mint
```

---

## 04 — Forbidden Edge Verification

| Edge | Status | Concrete reason (not “FORBIDDEN” alone) |
|------|--------|----------------------------------------|
| Plan→Writer→Prose→L1→Production Choice | **BLOCKED** | No authority may mint production Choice here; only OPEN-4; L1 has no mint slot (R13); Plan excluded from OPEN-4 |
| World→Option→Access→Choice | **BLOCKED** | Zero legal Option producers; World disqualified; chain cannot form legal Option |
| SR→Option→Access→Choice | **BLOCKED** | SR disqualified as Option generator; not L1 input; zero legal Option producers |
| Writer→Actual→Choice | **BLOCKED** | Actual authority scope excludes Choice mint (R14) |
| Actual→Choice Authority | **BLOCKED** | Same — Actual not in Choice authority set |
| Writer→Agency Authority | **BLOCKED** | Writer not Agency/Choice authority; prose cues ≠ authority mint |
| Desire→Agency | **BLOCKED** | Desire not Agency authority; auto-promotion has no legal transformer |
| Pressure→Agency | **BLOCKED** | Same |
| Historical Evidence→Current Choice | **BLOCKED** | R15/R17: history is CONTEXT ONLY; no transfer authority |

**OPEN (not BYPASS):** OPEN-1 Option ontology; OPEN-2/3 stores; OPEN-4 Action Intent identity — unresolved **without** licensing World/SR/Plan/Writer/Actual/L1 as stand-ins.

**BYPASS found:** **None** under v0.2 licensed semantics.

---

## 05 — Remaining CRITICAL / HIGH / MEDIUM / SAFE

### CRITICAL
**None** as licensed contract-semantic bypass of the four primary loops / Actual→Choice / L1 Option generation / historical auto-transfer.

### HIGH
1. **Trace D evidence manufacturing** — Writer can create L1-validatable Agency/decision prose from Plan/fear/pressure; appearance of causality without production mint. Contract blocks mint; operators may still *feel* Choice was proven.  
2. **Non-compliant L1 LLM wrapper** — ignoring closed I/O would reintroduce Option generation (impl violation).  
3. **Runtime Plan→Writer contamination** still exists in code (unchanged) — narrative pseudo-causality without production Choice object.

### MEDIUM
1. OPEN-1/OPEN-4 unresolved — blocks implementation, not a licensed laundering path.  
2. Future reckless “temporary bridge” equating L1 VALID with production Choice would re-open Loop ① — must remain unsealed.

### SAFE (under attack)
- Grammar ≠ Presence  
- Coercion triplet P07 / U08 / I06  
- Narrow Choice-like (Situation/Pressure/Possibility survive)  
- Fact/capability/relevance ↛ Option Access  
- Irrationality ↛ L1 INVALID  

---

## 06 — Contract Change Recommendations

Only if needed to close a **demonstrated licensed bypass**.

**No CRITICAL licensed bypass demonstrated.**  

Optional clarifications (not required to claim loop BLOCKED; **do not apply this round** — DESIGN CONTRACT CHANGED: NO):

1. One sentence: “Absence of a production Choice object does not license treating L1 VALID or Actual as Choice; it reinforces R13/R14.”  
2. Explicit operator note on Trace D: “L1 VALID on Writer-authored deliberation prose is Question A only.”  

Do **not**: solve OPEN-1/OPEN-4; add Engines; modify Golden; broaden Choice-like.

---

## 07 — Choice-like + Coercion + Fact/Agency spot checks

**Choice-like narrow def:** claims of chose/decided/will/should/selected/attributable without evidence/authority = contamination.  
Legal: possible / opportunity / pressure / plan escalate — **not** destroyed.

**Coercion:** P07 VALID · U08 UNKNOWN · I06 INVALID preserved. 必须/只能/不得不 ↛ auto Absence/Agency.

**Fact Access:** knows open door / can run / sees gun / relevance — all ↛ Option Access under non-promotion (concrete: Option Access authority for L1 is E1/E2/E4 prose only; SR fields lack Option Access mint role).

**Agency temporal:** Consider/Desire/Pressure/Plan → Action ↛ auto Agency; need t-local narrated internal state.

---

## Final Verdict

```text
PHASE 4 CONCRETE ADVERSARIAL TRACE AUDIT

STATUS:
PASS

CODE CHANGED:
NO

GOLDEN SPEC CHANGED:
NO

DESIGN CONTRACT CHANGED:
NO

PHASE 4 IMPLEMENTATION:
BLOCKED
```

### Seal criteria checklist (Human Seal still NOT ISSUED)

| # | Criterion | Met under v0.2? |
|---|-----------|-----------------|
| 1 | Four primary laundering loops actually blocked | **Yes** (authority-unreachable, not slogan-only) |
| 2 | Actual ↛ Choice Authority concretely blocked | **Yes** |
| 3 | Writer cannot manufacture **production** Agency/Choice authority | **Yes** (evidence surface residual HIGH) |
| 4 | L1 cannot legally generate free-form Candidate Options | **Yes** (closed I/O) |
| 5 | OPEN-1 has no unsafe licensed implementation path | **Yes** (unsafe producers disqualified; ontology OPEN) |
| 6 | Historical evidence cannot automatically transfer | **Yes** |
| 7 | No CRITICAL bypass remains | **Yes** |

**Human Seal:** NOT ISSUED (separate Human decision).  
**PHASE 4 DESIGN GATE APPROVED:** NOT claimed.  

Contract v0.2 is **eligible for Human Seal review**. Phase 4 **implementation remains BLOCKED** until Human Seal and resolution of what OPEN-1/OPEN-4 allow *without* reopening walls.
