# 27 — L1 Observer Production Readiness / Golden Sufficiency Gate

```text
MODE: READ-ONLY / DESIGN GATE / NO CODE / NO EO
GATE TYPE: Golden Sufficiency / Production Readiness
STATUS: COMPLETE — VERDICT BELOW

PURPOSE:
  Determine whether Golden L1 (SPEC + 24 fixtures) already suffices
  to constrain a minimal future L1 Observer with ZERO SEMANTIC INVENTION.

NOT:
  Observer implementation · Choice Formation complete design · EO · backlog minting
```

---

## 1. Scope

```text
Question A only:
  Prose (+ optional POV) → Evidence Classification → VALID | UNKNOWN | INVALID
```

Out of scope: Candidate Option, VALID→???, Choice Adjudication, L2, Attribution, SR, Writer, AA20, Roadmap edits.

---

## 2. Frozen Inputs (verified — unchanged)

| Item | Status |
|------|--------|
| #25 / #25b | **SEALED** |
| #26 / #26b | **SEALED** |
| Golden L1 SPEC / fixtures | **UNCHANGED** (read-only) |
| v0.2 | **UNCHANGED** |
| AA20 | **UNCHANGED** |
| Candidate Option | **UNKNOWN / NOT AUTHORIZED** |
| Candidate Option → L1 | **REJECTED** |
| L1 Observer implementation | **NOT AUTHORIZED** |
| L1 VALID → ??? | **UNKNOWN / OPEN** |
| Post-L1 Choice Adjudication | **NOT DESIGNED** |
| L2 | **NOT AUTHORIZED** |
| Roadmap | **NOT TOUCHED** |
| EO | **NONE** |

```text
“Golden 尚未规定” ≠ “需要新增字段 / schema / module / runtime”
Gaps → REPORT → STOP (no auto-backlog)
```

---

## 3. Evidence Sources

| Source | Role |
|--------|------|
| `golden/reality/l1-choice-formation/SPEC.md` | Highest L1 authority (FROZEN) |
| `golden/reality/l1-choice-formation/fixtures.json` | 24 fixtures (10 P / 8 U / 6 I) |
| `#26` / `#26b` | Sealed A1–A5 implementation boundary |
| `#25` / `#25b` | Candidate Option ↛ L1 |
| `#24` | Prior archaeology (reference) |
| `docs/design/phase-4/03_l1-production-boundary-v0.2.md` | Closed-label I/O companion |
| `golden/reality/lib/harness.js` | Reality claim harness — **not** L1 Choice Formation runner |
| packages/ | **No** L1 Observer runtime found |

**Conflict note (record only):** Roadmap historically showed `SR→Options→L1`; #25 SEALED rejects it. No document repair this round.

---

## 4. A1–A5 Coverage Matrix

| #26 Boundary | Fixture / SPEC support | Status |
|--------------|------------------------|--------|
| **A1** Input wall (prose + optional POV; forbid SR/Plan/…) | All 24 supply `prose`+`pov`; SPEC forbids other inputs; **no negative fixture** proving SR/Plan rejection | **PARTIAL** |
| **A2** Evidence taxonomy (E1–E5, Agency, Subject) | E1–E5 appear; Agency/Subject labeled in oracle `evidence` (Observer must not read these) | **PARTIAL** |
| **A3** VALID | 10 P fixtures + formula | **COVERED** (for represented patterns) |
| **A4** UNKNOWN | 8 U fixtures + first-class policy in #26 | **COVERED** (for represented patterns) |
| **A5** INVALID | 6 I fixtures + SubjectAbsent list; dissociation **unfixtured** | **PARTIAL** |

---

## 5. 24 Fixtures Coverage

### 5.1 Inventory

| ID | Group | Subtype | expected | Access (oracle) | Notes |
|----|-------|---------|----------|-----------------|-------|
| L1-P01 | P | negation_e2 | VALID | E2 | fear 心里一紧 |
| L1-P02 | P | negation_e2 | VALID | E2×2 | Agency from dual negation (see GAP-1) |
| L1-P03 | P | negation_e2 | VALID | E1+E2 | pain 嘴唇发麻 |
| L1-P04 | P | fork_e4 | VALID | E4 | pain persistence |
| L1-P05 | P | fork_e4 | VALID | E4 | fear + retract |
| L1-P06 | P | explicit_multi_option | VALID | E1 | 想了想+决定 |
| L1-P07 | P | coercion_presence | VALID | E4 | coercion triplet + |
| L1-P08 | P | fear_choice | VALID | E4 | fear ≠ absence |
| L1-P09 | P | negation_e2 | VALID | E2 | somatic agency metaphor |
| L1-P10 | P | pain_choice | VALID | E4 | 脑内算术 + pain |
| L1-U01 | U | pure_action | UNKNOWN | E5 | |
| L1-U02 | U | habit | UNKNOWN | E5 | no deliberation mark |
| L1-U03 | U | e2_without_second_path | UNKNOWN | partial E2 | L1-U03 core |
| L1-U04 | U | e3_insufficient | UNKNOWN | E3 | |
| L1-U05 | U | agency_without_access | UNKNOWN | insufficient | |
| L1-U06 | U | retrospective_reason | UNKNOWN | E5 | |
| L1-U07 | U | ambiguous_hesitation | UNKNOWN | insufficient | |
| L1-U08 | U | coercion_without_presence_signal | UNKNOWN | ambiguous | coercion triplet mid |
| L1-I01 | I | unconscious | INVALID | — | |
| L1-I02 | I | reflex | INVALID | — | |
| L1-I03 | I | sleepwalking | INVALID | — | sleep |
| L1-I04 | I | no_awareness | INVALID | — | |
| L1-I05 | I | explicit_loss_of_agency | INVALID | — | puppet-like |
| L1-I06 | I | puppet | INVALID | — | coercion triplet − |

### 5.2 Taxonomy pattern coverage

| Pattern | Coverage |
|---------|----------|
| E1 | COVERED (P06, P03) |
| E2 | COVERED (P01–P03, P09; U03 guard) |
| E3 | COVERED (U04) |
| E4 | COVERED (P04–P05, P07–P08, P10) |
| E5 | COVERED (U01, U02, U06) |
| Coercion triplet P07/U08/I06 | COVERED |
| Fear / pain under Presence | COVERED (P08, P04, P10) |
| Habit without deliberation | COVERED (U02) |
| Reader counterfactual | SPEC rule; forbidden_inference on several; **no dedicated prose fixture** → PARTIAL |
| Fact/knowledge without Option Access | Boundary in #26/v0.2; **no dedicated L1 fixture** → PARTIAL |
| Dissociation | SPEC list only; **no fixture** → NOT COVERED |
| Curiosity / duty / disgust / impulse / tendency as distinct Agency | SPEC list; **not separately fixtured** → PARTIAL |
| POV absent / multi-character ambiguity | **NOT COVERED** |

---

## 6. Q2 — Input Sufficiency

```text
Legal inputs: prose + optional POV (name resolution only)
```

| Check | Finding |
|-------|---------|
| Role identity in fixtures | All 24 use `pov: "林岚"`; prose uses 她 / 林岚 |
| POV changes evidence interpretation? | SPEC: name resolution **only** — must not change Access/Agency/Presence standards |
| Must depend on SR / Plan / Actual / Writer Context? | **No** fixture requires them; SPEC forbids them |
| POV omitted | **Unspecified** for ambiguous pronouns / multi-actor prose |

```text
Q2: PARTIAL sufficiency for the sealed input wall.
    Sufficient to forbid external objects.
    Insufficient to close POV-absent / multi-character name resolution
    without implementer invention → SEMANTIC GAP (GAP-4).
```

---

## 7. Q3 — Access Sufficiency (E1–E5)

| Level | Spec rule | Fixture force | Gap? |
|-------|-----------|---------------|------|
| E1 | Explicit multi-option → Access ✅ | P06 | No for this pattern |
| E2 | Negation → Access for **negated** path; U03 blocks second-path inference | P01–P03, P09, U03 | No for stated rule |
| E3 | Alone ❌ | U04 | No |
| E4 | Fork ✅ | P04–P05, P07–P08, P10 | No |
| E5 | Pure action ❌ | U01 | No |

```text
Q3: E1–E5 rules are EXISTING CONTRACT and fixture-backed for core cases.
    No Access-level SEMANTIC GAP that forces inventing a new Access ontology.
    Residual: classifying novel prose into E1–E5 is recognition work
    (see Q8) — not a missing Access level.
```

---

## 8. Q4 — Agency Sufficiency

SPEC Agency minimum: narrated internal state at *t* (listed cue families) **OR** conscious E4 fork.

| Distinction | Status |
|-------------|--------|
| Attribution `agencyCue` ≠ L1 Agency | Preserved (#26); no leakage required |
| Plan desire / Pressure / Conflict ≠ L1 Agency | Preserved |
| External plausibility ≠ Agency | SPEC + P05 forbidden_inference |
| Fear / pain / 想了想 / 决定 / 脑内算术 | Fixtured |
| Dual negation as Agency (P02) | Oracle VALID; **SPEC does not state a dual-E2⇒Agency rule** |
| Open cue list (curiosity, duty, disgust, …) | Named in SPEC; **no closed classifier** |
| P09 「喉咙里堵…」 vs U07 「数了三秒」 | Exemplar contrast; **no procedural boundary** |

```text
Q4: NOT fully sufficient for ZERO SEMANTIC INVENTION.
    GAP-1, GAP-2 (Agency) — see §14.
```

---

## 9. Q5 — SubjectPresent / SubjectAbsent

| Absence type (SPEC) | Fixture | Status |
|---------------------|---------|--------|
| unconscious | I01, I06 | COVERED |
| pure reflex | I02 | COVERED |
| sleep / sleepwalking | I03 | COVERED |
| acting without knowing | I04 | COVERED |
| explicit loss of agency / puppet | I05, I06 | COVERED |
| dissociation | — | **NOT COVERED** (GAP-3) |

Coercion ≠ Absence: P07 VALID / U08 UNKNOWN / I06 INVALID — **COVERED**.

Fear / pain / threat / pressure ↛ INVALID — **COVERED** by P07–P08 + SPEC.

```text
Q5: PARTIAL — core Absence set fixtured; dissociation underspecified.
```

**Reminder (#26b):** INVALID ⇔ SubjectAbsent applies **inside Question A only**.

---

## 10. Q6 — UNKNOWN Determinism

### Required policy (#26 / Golden)

```text
证据不足 / 模糊 → UNKNOWN
FORBIDDEN: LLM confidence → VALID
FORBIDDEN: 证据不足 → INVALID (unless SubjectAbsent)
```

### Pattern check

| Pattern | Fixture / rule | Determinable without confidence scores? |
|---------|----------------|----------------------------------------|
| Pure action | U01 | Yes **relative to E5 rule** |
| Habit w/o deliberation | U02 | Yes **if** “deliberation mark” recognized |
| Counterfactual reader | SPEC | Yes as **forbidden promotion**; recognition PARTIAL |
| Retrospective reason | U06 | Yes relative to “non-local *t*” rule |
| Ambiguous hesitation | U07 | Yes as exemplar; general pause→? **open** |
| Coercion + 只能 | U08 | Yes relative to triplet |
| Knowledge w/o Option Access | #26 / v0.2; no L1 fixture | Rule exists; **recognition open** |
| Fear / pressure alone | SPEC; U08 / contrast P08 | Partial |

### Core finding

```text
Against the 24-fixture oracle:
  UNKNOWN targets are fixed — Observer must hit them.
  That is scoring determinism, not an open decision procedure.

Against arbitrary production prose:
  Mapping text → {Access, Agency, Subject} labels still requires
  semantic recognition. Golden constrains *promotions* and *families*
  but does not provide a closed, non-judgmental algorithm for all prose.

Therefore Q6 for PRODUCTION ZERO-INVENTION Observer:
  NOT READY / SEMANTIC GAP (GAP-2, GAP-5)
```

UNKNOWN is **first-class in contract**; it is **not yet algorithmically closed** for open prose without residual judgment that could invent Access/Agency.

---

## 11. Q7 — Output Sufficiency

| Output | Status |
|--------|--------|
| `VALID \| UNKNOWN \| INVALID` | **EXISTING CONTRACT** (Golden) |
| Closed labels (access / agency / subject) | **EXISTING CONTRACT** direction in v0.2 `03` + #26 examples; Golden fixture `evidence` is **oracle-only**, not Observer I/O schema |
| Free-form options / should-choose / Candidate Option / Choice mint / L2 | **FORBIDDEN** — sufficient prohibition |

```text
Q7: Judgment enum = READY.
    Exact closed-label enum spelling = IMPLEMENTATION DETAIL
    if limited to Golden taxonomy names (E1–E5, present/absent/…).
    Must not emit Choice objects.
```

---

## 12. Q8 — Zero Semantic Invention Audit

Assume a future EO: `Golden → L1 Observer` only.

| Decision an implementer would face | Class |
|------------------------------------|-------|
| Wire harness: load fixtures; compare expected; RED until flag | **IMPLEMENTATION DETAIL** |
| Accept only prose + optional POV; reject other kwargs | **EXISTING CONTRACT** |
| Emit only VALID/UNKNOWN/INVALID | **EXISTING CONTRACT** |
| Optional labels using E1–E5 / present\|absent\|insufficient | **EXISTATION CONTRACT** / **IMPLEMENTATION DETAIL** (enum wiring) |
| Treat P02 dual negation as Agency without new SPEC rule | **SEMANTIC GAP (GAP-1)** |
| General classifier for “narrated internal state” vs pause/habit | **SEMANTIC GAP (GAP-2)** |
| Decide dissociation prose → INVALID | **SEMANTIC GAP (GAP-3)** |
| Resolve 她 without POV / multi-POV | **SEMANTIC GAP (GAP-4)** |
| Prefer UNKNOWN when unsure (policy) | **EXISTING CONTRACT** (#26) |
| Use SR/Plan to “improve” accuracy | **BOUNDARY VIOLATION** if done |
| Invent Candidate Options as side output | **BOUNDARY VIOLATION** |
| Pass 24 fixtures via pattern-match table of the 24 prose strings only | **IMPLEMENTATION DETAIL** (overfit) — **fails** production sufficiency intent |
| LLM classify with temperature/confidence→VALID | **FORBIDDEN** / fails Q6 |

```text
Q8: Cannot claim ZERO SEMANTIC INVENTION for a general Observer.
    Fixture-overfit engine ≠ production-ready under this Gate’s standard.
```

---

## 13. Q9 — Cross-layer Leakage Audit

| Object | Required for legal Observer? |
|--------|------------------------------|
| Character SR | **NO** — FORBIDDEN |
| Plan / causal_chain | **NO** — FORBIDDEN |
| Writer Context | **NO** — FORBIDDEN |
| Candidate Option | **NO** — FORBIDDEN / NOT AUTHORIZED |
| Actual Store | **NO** — FORBIDDEN |
| Attribution Registry | **NO** — FORBIDDEN |
| Character State | **NO** — FORBIDDEN |
| L2 / Choice Registry | **NO** — FORBIDDEN / ABSENT |

```text
Required I/O remains:
  in:  prose + optional POV
  out: VALID | UNKNOWN | INVALID (+ closed evidence labels)

No BOUNDARY VIOLATION forced by Golden.
Leakage would be implementer choice — not a Golden necessity.
```

---

## 14. Semantic Gaps

| ID | Gap | Why it blocks READY |
|----|-----|---------------------|
| **GAP-1** | **P02 Agency without SPEC-closed rule** — dual E2 prose has no explicit internal-state lexicon; oracle assigns Agency as「自觉克制」 | Implementer must invent a dual-negation⇒Agency rule or overfit P02 — **story-semantic**, not engineering |
| **GAP-2** | **Agency classifier not closed** — SPEC lists open cue families; P09 vs U07 boundary is exemplar-only | Open-prose Agency/UNKNOWN decisions invite semantic invention |
| **GAP-3** | **Dissociation** in SubjectAbsent list — zero fixtures, no operational prose criteria | INVALID path underspecified for that marker |
| **GAP-4** | **optional POV** underspecified when omitted or multi-actor | Name resolution may force invention or illegal SR use |
| **GAP-5** | **UNKNOWN determinism for open prose** — policy exists; closed decision procedure does not | Production Observer cannot be proven free of inventing Access/Agency to escape UNKNOWN |

**Non-gaps (do not escalate):**

- E1–E5 Access level set itself — complete enough as taxonomy  
- Coercion triplet — fixtured  
- Judgment enum — complete  
- Forbidding SR/Plan/Candidate Option — complete  

```text
Gaps are NOT auto-backlog for schema/modules.
They are STOP conditions for Observer EO authorization.
```

---

## 15. Implementation-only Notes

*(Not authorization. Valid only if a later Gate clears SEMANTIC GAPS.)*

| Note | Detail |
|------|--------|
| N1 | Dedicated L1 Choice Formation runner separate from Reality claim harness (`ENGINE_NOT_IMPLEMENTED` today) |
| N2 | `L1_OBSERVER_IMPLEMENTED` flag per SPEC |
| N3 | Closed-label JSON shape using Golden names only |
| N4 | Fixture loader + group pass rules (P/U/I) |
| N5 | Hard-reject API args outside `{prose, pov?}` |

These do **not** repair GAP-1…GAP-5.

---

## 16. Final Verdict

```text
╔══════════════════════════════════════════╗
║  #27 VERDICT                             ║
║                                          ║
║  NOT READY                               ║
║                                          ║
║  Golden constrains Question A strongly   ║
║  for the 24-fixture bench and forbids    ║
║  illegal inputs/outputs.                 ║
║                                          ║
║  It does NOT yet suffice to guarantee    ║
║  a production Observer with              ║
║  ZERO SEMANTIC INVENTION on open prose.  ║
║                                          ║
║  Blocking: GAP-1 … GAP-5                 ║
╚══════════════════════════════════════════╝
```

```text
NOT:
  READY
  READY WITH EXPLICIT IMPLEMENTATION NOTES
```

Reason IMPLEMENTATION NOTES path is unavailable: remaining issues are **semantic / contract completeness**, not pure engineering.

```text
This verdict ≠ “L1 is impossible.”
This verdict ≠ “expand ontology / add Candidate Option.”
This verdict = “do not open Observer EO yet.”
```

---

## 17. Explicit Non-goals (this Gate)

```text
NO code · NO Golden edits · NO fixture expansion this round
NO Roadmap edits · NO Candidate Option · NO VALID→??? design
NO Choice Adjudication · NO L2 · NO Choice schema/registry
NO Attribution/SR/Writer/AA20 changes · NO Observer EO
NO Cursor-invented semantic patches to “make READY”
```

---

## 18. STOP / Next Authorization Boundary

```text
STOP.

Do NOT open Observer Implementation EO.
Do NOT auto-propose Golden edits as an EO.
Do NOT mint modules from GAP-1…GAP-5.

If Human later authorizes work, the minimal next Gate would be
READ-ONLY clarification of SEMANTIC GAPS (especially GAP-1 Agency /
P02, GAP-2 Agency closure, GAP-4 POV, GAP-3 dissociation criteria)
— still NO CODE — deciding whether each gap is:
  · Golden clarification (Human-authored SPEC/fixture amendment), or
  · acceptable residual under prefer-UNKNOWN, or
  · out-of-scope for Question A.

#27 does not choose among those.
```

---

## Answers Q1–Q10 (compact)

| Q | Answer |
|---|--------|
| Q1 Fixture coverage A1–A5 | A3/A4 **COVERED** (patterns); A1/A2/A5 **PARTIAL** |
| Q2 Input sufficiency | **PARTIAL** (wall yes; POV edge **GAP-4**) |
| Q3 Access E1–E5 | **Sufficient as taxonomy**; recognition residual ≠ new Access ontology |
| Q4 Agency | **NOT sufficient** for zero invention (**GAP-1, GAP-2**) |
| Q5 Subject | **PARTIAL** (**GAP-3** dissociation) |
| Q6 UNKNOWN determinism | **NOT READY** for open prose (**GAP-5**) |
| Q7 Output | **Sufficient** for judgment enum; labels = closed taxonomy only |
| Q8 Zero invention | **Fail** for general Observer |
| Q9 Leakage | **No forced leakage**; illegal if added |
| Q10 Verdict | **NOT READY** |

---

## #27 STATUS

```text
Mode:              READ-ONLY / DESIGN GATE / NO CODE / NO EO
Files inspected:   SPEC.md, fixtures.json, #24–#26b, v0.2 L1 boundary,
                   golden/reality harness, packages (no Observer)
Files changed:     docs/design/phase-4.4/27_phase-4-l1-observer-production-readiness.md (this file ONLY)
Code changed:      NO
Golden changed:    NO
Roadmap changed:   NO
EO executed:       NO

Coverage Matrix:   §4–§5
Semantic Gaps:     GAP-1 … GAP-5 (§14)
Implementation-only Notes: §15 (non-authorizing)
Final Verdict:     NOT READY

--------------------------------------------------
STOP
--------------------------------------------------
NO AUTO-FIX
NO NEXT EO
NO SEMANTIC INVENTION
```
