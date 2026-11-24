# 28 — L1 Observer Semantic Gap Adjudication

```text
MODE: READ-ONLY / DESIGN GATE / NO CODE / NO EO
GATE TYPE: Semantic Gap Adjudication (not remediation)
STATUS: COMPLETE

AUTHORITY:
  A1 Golden L1 SPEC
  A2 Golden 24 fixtures / oracle
  A3 #26 / #26b Observer boundary
  A4 #25 / #25b Candidate Option boundary
  A5 #27 readiness audit (input — not supreme)

#27 = NOT READY  ≠  “GAP-1…5 must all be fixed”
```

---

## 1. Scope

Adjudicate each of #27’s GAP-1…GAP-5 into exactly one of:

```text
REAL SEMANTIC GAP
ACCEPTABLE UNKNOWN-FIRST RESIDUAL
EXEMPLAR / FIXTURE LIMITATION
IMPLEMENTATION DETAIL
OUT OF SCOPE
FALSE POSITIVE
```

No remediation. No Golden/fixture/code/EO changes.

---

## 2. Frozen Authority

| Item | Status |
|------|--------|
| #25 / #25b | SEALED |
| #26 / #26b | SEALED |
| #27 | NOT READY (input) |
| Golden SPEC / 24 fixtures | UNCHANGED |
| v0.2 / AA20 | UNCHANGED |
| Candidate Option | UNKNOWN / NOT AUTHORIZED; → L1 REJECTED |
| Observer implementation | NOT AUTHORIZED |
| L1 VALID → ??? / L2 | OPEN / NOT AUTHORIZED |
| Roadmap | NOT TOUCHED |

**Unused as semantic authority:** Roadmap `SR→Options→L1`, Plan, Writer Context, SR, Attribution cues, LLM intuition.

---

## 3. #27 Input Summary

#27 blocked Observer EO on five gaps:

| GAP | #27 claim |
|-----|-----------|
| GAP-1 | P02 VALID needs Agency; SPEC lacks dual-E2⇒Agency |
| GAP-2 | Open Agency cue families / no procedural classifier; P09 vs U07 |
| GAP-3 | dissociation listed; no fixture / operational criterion |
| GAP-4 | optional POV underspecified (absent / multi-character) |
| GAP-5 | open prose lacks closed algorithm for UNKNOWN determinism |

#28 re-tests whether each claim is a **Question A contract failure** or a mis-upgrade of recognition / coverage / implementation difficulty.

---

## 4. GAP-1 Adjudication — P02 Agency / Dual Negation

### Facts

```text
P02 prose:
  「她没有按下任何按钮。她没有报警。」

Oracle:
  expected = VALID
  access   = E2 (dual paths in model)
  agency   = 「审慎克制（双否定表达的自觉克制）」  ← oracle annotation
  subject  = present
```

SPEC Agency minimum:

```text
narrated internal state at t
  (desire / fear / habit-with-deliberation / …)
OR
E4 conscious fork
```

P02 surface: **no** explicit internal-state lexicon; **not** E4.

### Q1 — Does P02 VALID depend on Agency?

```text
YES.

L1_VALID := Access ∧ Agency ∧ SubjectPresent

Access alone (dual E2) ↛ VALID.
Without Agency, P02 cannot be VALID under the formula.
```

### Q2 — Is narrated internal state already in the prose under existing contract?

```text
NO — not on the prose surface.

「没有按下」「没有报警」 = Access-class negation evidence (E2).
They do not, by themselves, narrate desire/fear/deliberation/judgment/…

Oracle annotation invents the Agency reading 「自觉克制」.
Observer must NOT read fixture `evidence` (Golden).
```

### Q3 — Does dual negation alone entail Agency?

```text
NO under SPEC as written.

Inventing:
  dual E2 → Agency
= SEMANTIC INVENTION
= NOT AUTHORIZED (#28 / #26)
```

### Q4 — Oracle vs SPEC

```text
REAL tension inside Golden:
  · Fixture oracle requires VALID ⇒ Agency must hold
  · SPEC Agency minimum does not license Agency from this prose alone

This is not mere “missing exemplar coverage.”
It is a Question A contract conflict affecting the P-group pass rule
(zero false negative on P02).
```

Classification options considered:

| Option | Why rejected / accepted |
|--------|-------------------------|
| UNKNOWN-first absorb P02 as UNKNOWN | **Incompatible** with frozen oracle `expected: VALID` |
| FALSE POSITIVE | #27 correctly identified the tension |
| EXEMPLAR LIMITATION | Undersells: P02 is binding positive; not just “add more cases” |
| IMPLEMENTATION DETAIL | Agency rule is story semantics, not harness wiring |

### Q5 — P02 → UNKNOWN compatible with Golden?

```text
NO — would fail Golden P-group (false negative on P02).
```

### GAP-1 VERDICT

```text
GAP-1 VERDICT: REAL SEMANTIC GAP

Reason:
  P02 VALID requires Agency; prose lacks SPEC-licensed Agency evidence;
  dual-E2⇒Agency is not an existing contract; Observer cannot both
  (a) pass P02 and (b) obey SPEC Agency literally without inventing a rule
  or reading oracle annotations.

No-change consequence:
  Observer Implementation EO remains blocked for any EO that must
  pass all 24 fixtures under current SPEC+oracle as jointly binding.
  Do NOT invent dual-E2 Agency. Do NOT edit P02 this round.
  Resolution path (NOT authorized here): Human Golden clarification only.
```

**Blocks Observer EO:** **YES**

---

## 5. GAP-2 Adjudication — Agency Classifier / Open Cue Families

### Q1 — Does #26 require a complete open-text Agency classifier?

```text
NO.

#26 / Golden require:
  · closed I/O
  · prefer UNKNOWN when evidence insufficient
  · no invention of Access/Agency to escape UNKNOWN

They do NOT require exhaustive NL Agency enumeration.
```

### Q2 — Can the contract express sufficient vs insufficient without exhaustiveness?

```text
YES.

明显 narrated internal state / conscious E4
  → Agency sufficient (toward VALID if Access ∧ Presence)

不足以证明 Agency (or Access)
  → UNKNOWN

No need to list every Chinese idiom.
```

### Q3 — Are open cue families compatible with UNKNOWN-first?

```text
YES.

known evidence families = guidance for recognition
unresolved evidence → UNKNOWN

“Open cue family” ≠ “missing ontology object.”
```

### Q4 — P09 vs U07

| Fixture | Prose cue | Oracle |
|---------|-----------|--------|
| P09 | 「喉咙里堵了点什么东西」+ E2 「没走开」 | VALID (Agency via somatic/affect cue) |
| U07 | 「数了三秒，又继续拔」 | UNKNOWN (Access insufficient; pause ↛ deliberation) |

```text
Different semantic evidence, not a missing rule pair.
U07 forbidden_inference already blocks pause_implies_deliberation.

If an Observer is unsure on a novel pause/somatic blend:
  → UNKNOWN
  NOT invent VALID
  NOT invent new Agency subtype ontology
```

### Critical correction of #27’s “ZERO SEMANTIC INVENTION”

```text
WRONG reading:
  Observer must deterministically classify all open prose.

CORRECT reading (Golden / #26):
  Observer must not invent definitive Formation conclusions
  without sufficient evidence.
  Leaving UNKNOWN is compliance, not failure.
```

### GAP-2 VERDICT

```text
GAP-2 VERDICT: ACCEPTABLE UNKNOWN-FIRST RESIDUAL

Reason:
  Absence of a procedural Agency classifier is not a Question A hole.
  Contract already: sufficient evidence → classify; else UNKNOWN.
  P09/U07 is exemplar contrast + forbidden_inference, not a new rule demand.
  Recognition difficulty ≠ semantic gap.

No-change consequence:
  Future Observer may leave hard Agency cases UNKNOWN.
  Must still hit fixtured P/U/I expectations where evidence is clear.
```

**Blocks Observer EO:** **NO** (alone)

---

## 6. GAP-3 Adjudication — Dissociation

### A / B / C

| Reading | Finding |
|---------|---------|
| A — listed in SubjectAbsent, no fixture | **True** — EXEMPLAR / FIXTURE LIMITATION component |
| B — word only, no operational prose criteria | Partially true for edge medical/psychological language |
| C — unsure → UNKNOWN, not guess INVALID | **Required** by #26b INVALID scope + UNKNOWN-first |

### Question A need

```text
Question A needs:
  When prose explicitly evidences SubjectAbsent (incl. dissociation
  as a named Golden category), judge INVALID.

Question A does NOT need:
  A medical dissociation detector for all NL paraphrases.
  External psych ontology.
```

```text
Ambiguous / non-explicit “dissociation-like” prose
  → UNKNOWN
  ≠ invent INVALID
```

### GAP-3 VERDICT

```text
GAP-3 VERDICT: EXEMPLAR / FIXTURE LIMITATION

Reason:
  SPEC already places dissociation ∈ SubjectAbsent.
  Missing fixture is coverage, not missing ontology membership.
  Operational edge cases absorb via UNKNOWN-first (do not guess INVALID).
  Not REAL SEMANTIC GAP for Question A completeness.

No-change consequence:
  No dissociation module. No Golden edit required for EO-block clearance
  on this GAP alone. Optional future Human fixture = coverage hygiene only.
```

**Blocks Observer EO:** **NO**

---

## 7. GAP-4 Adjudication — Optional POV

### Q1 — POV role

```text
#26 SEALED: POV = name resolution only.
No expansion of POV semantic authority.
```

### Q2 — POV absent + 她 + multiple candidates

```text
Subject / actor resolution ambiguous
  → Subject / formation target ambiguous
  → UNKNOWN

LEGAL under UNKNOWN-first.
No SR / Character State / POV Engine required.
```

### Q3 — POV absent + unique clear subject in prose

```text
Use explicit prose subject (name / unique referent).
POV optional ⇒ not mandatory when prose already resolves.
```

### Q4 — Multi-character ambiguity

```text
UNKNOWN-FIRST handling.
NOT: new resolver ontology, SR, Character State.
```

### Q5

```text
Golden / #26 already allow ambiguity → UNKNOWN.
GAP-4 is not a missing POV contract.
```

### GAP-4 VERDICT

```text
GAP-4 VERDICT: ACCEPTABLE UNKNOWN-FIRST RESIDUAL

Reason:
  Optional POV underspecification for hard pronoun cases is absorbed by
  ambiguous → UNKNOWN. Does not expand Question A inputs.

No-change consequence:
  Observer API remains {prose, pov?}. Ambiguity → UNKNOWN.
```

**Blocks Observer EO:** **NO**

---

## 8. GAP-5 Adjudication — Open-prose UNKNOWN Determinism

### Q1 — What does Golden actually require?

| Scheme | Claim | Golden? |
|--------|-------|---------|
| **A** | All open prose → deterministic VALID/UNKNOWN/INVALID always | **NO** — not stated; fixtures are a bench, not a universal classifier proof |
| **B** | Sufficient evidence → VALID; insufficient/ambiguous → UNKNOWN; explicit SubjectAbsent → INVALID | **YES** — SPEC formula + epistemology + #26 |

```text
Authoritative scheme: B
```

### Q2 — Is “no complete algorithm for all prose” a semantic gap under B?

```text
NO.

不知道 / 证据不足 → UNKNOWN
is the legal result, not a hole in the contract.
```

### Q3 — Confidence / plausibility excluded?

```text
YES — must remain excluded (#26 A4).
Cannot prove VALID → UNKNOWN
is sufficient anti-laundering.
```

### Q4 — Avoid fake capability (everything → UNKNOWN)

```text
“Evidence sufficient” is already defined:
  Access ∧ Agency ∧ SubjectPresent
  with E1–E5 / Agency minimum / SubjectAbsent set.

Observer obligation:
  can prove conjuncts → VALID
  explicit SubjectAbsent → INVALID
  else → UNKNOWN

Recognition difficulty implementing that test
  = IMPLEMENTATION DETAIL / residual
  ≠ ontology gap
  ≠ license to invent new Formation semantics
```

### GAP-5 VERDICT

```text
GAP-5 VERDICT: FALSE POSITIVE

Reason:
  #27 treated “open prose lacks a closed total algorithm” as a semantic gap.
  Under Golden Scheme B, total determinism over all prose is not required.
  UNKNOWN-first is the contract. Remaining hardness is recognition /
  implementation difficulty, not missing Question A ontology.

Caveat (not a re-upgrade to REAL GAP):
  Fake-capability risk (always UNKNOWN) is an implementation / eval concern
  for a future Implementation Gate — scored against fixtures + prefer-UNKNOWN
  policy — not a Golden sufficiency hole of type #27 GAP-5.
```

**Blocks Observer EO:** **NO** (as stated in #27)

---

## 9. Reverse Audit

> Did #27 upgrade implementation / recognition / coverage issues into semantic gaps?

| GAP | Golden already gives principle? | UNKNOWN absorb? | Affects Question A? | #28 outcome |
|-----|--------------------------------|-----------------|---------------------|-------------|
| GAP-1 | Agency minimum yes; **P02 licensing no** | Cannot (P02 must VALID) | **YES** | Keep **REAL SEMANTIC GAP** |
| GAP-2 | Sufficient vs insufficient Agency | **YES** | Only if forced to invent | Downgrade to **UNKNOWN-FIRST RESIDUAL** |
| GAP-3 | dissociation ∈ SubjectAbsent | **YES** if unclear | Only explicit absence | **FIXTURE LIMITATION** |
| GAP-4 | optional POV; ambiguity → ? | **YES** → UNKNOWN | Resolution only | **UNKNOWN-FIRST RESIDUAL** |
| GAP-5 | Scheme B formula | **YES** | Misframed total determinism | **FALSE POSITIVE** |

```text
#27 correctly blocked EO overall (GAP-1 real).
#27 over-blocked on GAP-2/4/5 (and partially GAP-3).
```

---

## 10. Final Classification Matrix

| GAP | #27 judgment | Final classification | Blocks Observer EO? | Reason |
|-----|--------------|----------------------|---------------------|--------|
| **GAP-1** | P02 Agency / dual negation | **REAL SEMANTIC GAP** | **YES** | P02 VALID needs Agency SPEC does not license from prose; cannot invent dual-E2⇒Agency; cannot UNKNOWN P02 |
| **GAP-2** | Agency classifier open | **ACCEPTABLE UNKNOWN-FIRST RESIDUAL** | NO | Classifier exhaustiveness not required; unsure → UNKNOWN |
| **GAP-3** | Dissociation | **EXEMPLAR / FIXTURE LIMITATION** | NO | Category already in SPEC; missing fixture; unclear → UNKNOWN not INVALID |
| **GAP-4** | Optional POV | **ACCEPTABLE UNKNOWN-FIRST RESIDUAL** | NO | Ambiguous subject → UNKNOWN; no SR |
| **GAP-5** | Open-prose UNKNOWN | **FALSE POSITIVE** | NO | Scheme B does not require total deterministic classification |

---

## 11. Remaining Real Semantic Gaps

```text
ONLY:

  GAP-1 — P02 Agency vs SPEC Agency minimum
```

```text
Count(REAL SEMANTIC GAP) = 1  >  0
⇒ Observer EO still blocked
```

---

## 12. Non-gaps / Accepted Residuals

```text
GAP-2  ACCEPTABLE UNKNOWN-FIRST RESIDUAL
GAP-3  EXEMPLAR / FIXTURE LIMITATION
GAP-4  ACCEPTABLE UNKNOWN-FIRST RESIDUAL
GAP-5  FALSE POSITIVE
```

These must **not** trigger Golden expansion, Agency Engine, POV Engine, dissociation module, or confidence scores.

---

## 13. Implementation Boundary (unchanged)

```text
Input:  prose + optional POV
Output: VALID | UNKNOWN | INVALID (+ closed labels)
Forbidden: SR, Plan, causal_chain, Candidate Option, Actual store,
           Attribution, Writer Context, L2, Choice mint, confidence→VALID
```

```text
READY FOR SEPARATE IMPLEMENTATION GATE
  requires REAL SEMANTIC GAP count = 0
  — NOT MET (GAP-1 remains)
```

---

## 14. Final Verdict

```text
╔══════════════════════════════════════════╗
║  #28 OBSERVER READINESS                  ║
║                                          ║
║  NOT READY                               ║
║                                          ║
║  Remaining REAL SEMANTIC GAP: GAP-1 only ║
║                                          ║
║  GAP-2 / GAP-4 = UNKNOWN-FIRST residual  ║
║  GAP-3 = fixture limitation              ║
║  GAP-5 = FALSE POSITIVE                 ║
║                                          ║
║  ≠ Observer Implementation Authorized    ║
║  ≠ authorize Golden edit                 ║
║  ≠ invent dual-E2 Agency rule            ║
╚══════════════════════════════════════════╝
```

```text
#27 NOT READY retained, but narrowed:
  blocking cause = GAP-1 alone (not the full GAP-1…5 bundle).
```

---

## 15. Explicit Non-goals

```text
NO CODE
NO GOLDEN EDIT
NO FIXTURE EDIT
NO SCHEMA
NO OBSERVER RUNTIME
NO AGENCY / POV / DISSOCIATION MODULE
NO CANDIDATE OPTION
NO CHOICE OBJECT / L2 / VALID→???
NO ROADMAP EDIT
NO EO
NO “顺手改 Golden” to force READY
```

---

## 16. STOP

```text
CODE CHANGED: NO
GOLDEN CHANGED: NO
FIXTURES CHANGED: NO
ROADMAP CHANGED: NO
SCHEMA CHANGED: NO
EO EXECUTED: NO

DO NOT enter #29 automatically
DO NOT enter Observer Implementation
DO NOT remediate GAP-1

If Human later acts on GAP-1, that is a separate
Golden clarification / Human Seal question —
NOT an Observer EO and NOT Cursor semantic authorship.

STOP
```
