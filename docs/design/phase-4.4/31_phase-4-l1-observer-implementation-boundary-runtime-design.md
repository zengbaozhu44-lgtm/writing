# 31 — L1 Observer Implementation Boundary / Minimal Runtime Design Audit

```text
MODE: READ-ONLY / DESIGN GATE / NO CODE / NO EO

CODE CHANGED: NO
GOLDEN CHANGED: NO
SPEC CHANGED: NO
EO EXECUTED: NO

UPSTREAM:
  #25/#25b SEALED · #26/#26b SEALED · #27 NOT READY · #28 SEALED
  #29 COMPLETE · P02 fixture EO PASS · #30 READY FOR NEXT BOUNDARY
  GAP-1 = FIXTURE-QUALITY RESOLVED
  Candidate Option = UNKNOWN / NOT AUTHORIZED
  L2 / Phase 5 = NOT ENTERED / FROZEN
  SR → Candidate Option → L1 = REJECTED
  SR → L1 Observer input = FORBIDDEN

#30 means: Golden suffices to constrain Observer.
#30 ≠ Observer implementation authorization.
```

**Single question answered:**

> Where may a minimal future L1 Observer Runtime live, what may it read/write, what must it forbid, and what is the smallest implementable surface — without changing Golden L1 semantics?

---

## A. Existing Runtime Archaeology

| Question | Finding |
|----------|---------|
| **Observer exists?** | **NO** — no `observeL1` / L1 Choice Formation runtime in `packages/` |
| **Existing L1 classifier?** | **NO** — no E1–E5 / L1 Access·Agency·Subject classifier |
| **Existing Reality Engine?** | **NO** — `golden/reality/lib/harness.js` expects `ENGINE_NOT_IMPLEMENTED` for prose claims |
| **L1 Choice Formation runner?** | **NO** — fixtures under `golden/reality/l1-choice-formation/` are SPEC+JSON only; not wired into `test:reality-golden` prose section as L1 judgments |
| **Reusable evidence logic?** | **Partial / parallel only** — see below |
| **Forbidden dependencies in a non-existent Observer?** | **N/A** — no Observer to leak; neighboring modules have related-but-**≠L1** logic |

### Neighboring modules (must NOT be reused as L1 authority)

| Module | What it is | Relation to L1 |
|--------|------------|----------------|
| `attribution/detectAttributionCues` | Narrow regex cues for Attribution Gate | **≠ L1 Agency**; Attribution track; must not become Observer core |
| `attribution/evidenceFromL1` | Adapter: wraps an L1 judgment into TypedEvidence | **Consumer stub only** — nothing produces L1 today; L1 ≠ Attribution Authority (`sufficientAlone: false`) |
| `characterCanAccessActualEvent` | Fact Access Actual→SR | **≠ L1 Option Access / E1–E5** |
| `writer-metrics.computeAgencyScore` | Literary “主动性” scoring | **≠ L1 Agency** |
| `plan-validity` VALID/INVALID | Plan vs Observed Continuity | **≠ L1 Choice Formation** |
| Production path | Prose → Actual → SR (+ Attribution soft) | **No L1 Observer hop** |

```text
L1 Observer runtime = ABSENT

Current production:
  Writer prose → Actual → Character SR (+ soft Attribution)
  ↛ L1 Observer

This Gate does NOT authorize production integration.
```

### Forbidden-path scan

No live `SR → L1` / `Plan → L1` / `Candidate Option → L1` / `oracle evidence → L1` production path found (Observer absent).  
Hard STOP conditions 1–15 for **design** are not triggered by existing code forcing illegal inputs.

---

## B. Frozen Input Contract

| Input | Status |
|-------|--------|
| **prose** | **PASS** — required |
| **optional POV** | **PASS** — name resolution only (#26) |
| SR | **FORBIDDEN** |
| Plan / causal_chain | **FORBIDDEN** |
| Candidate Option | **FORBIDDEN** |
| Actual Event store | **FORBIDDEN** |
| Character State | **FORBIDDEN** |
| Attribution Registry / cues as L1 input | **FORBIDDEN** |
| Writer Context | **FORBIDDEN** |
| fixture `evidence.*` / `expected` / `forbidden_inference` | **FORBIDDEN** (oracle / test only) |
| L2 / Choice Registry | **FORBIDDEN** |

```text
Legal API shape:
  observeL1({ prose, pov? }) → judgment (+ optional closed labels)
```

---

## C. Semantic Boundary

| Dimension | Verdict | Notes |
|-----------|---------|-------|
| **Access** | **READY** | Express E1–E5 from prose only; no SR/Plan; no new Access ontology. Runtime recognition = classifier work under Golden, not ontology gap (#30). |
| **Agency** | **READY** | Use frozen Agency minimum only. **No** hesitation/silence/refusal/dual-negation/pain/pressure auto-rules. P02 dual-negation path **closed** via fixture repair. Insufficient → UNKNOWN. |
| **SubjectPresent** | **READY** | SubjectAbsent set frozen; coercion/fear/pressure ↛ INVALID. Ambiguous → UNKNOWN (#28). |
| **UNKNOWN** | **READY** | Fail-closed / UNKNOWN-first when Access∧Agency∧SubjectPresent not all proven. No LLM confidence / plot plausibility / SR/Plan/oracle rescue. |
| **Output** | **READY** | `VALID \| UNKNOWN \| INVALID` + optional closed labels only. |

```text
VALID   := Access ∧ Agency ∧ SubjectPresent
UNKNOWN := required evidence insufficient / ambiguous
INVALID := SubjectAbsent (Question A)

UNKNOWN ≠ NO CHOICE
INVALID ≠ COERCION
VALID ≠ WHICH ACTION
VALID ≠ production Choice
VALID ↛ Choice / Candidate Option / Action mint
```

### Candidate Option necessity check

```text
Can Question A be implemented without Candidate Option?
YES — Golden / #25/#30: L1 adjudicates formation evidence in prose,
      does not consume or emit Candidate Option lists.

SEMANTIC CONFLICT requiring Candidate Option: NOT FOUND
```

### LLM-assisted classification?

```text
LLM-assisted classification?  NO (recommended default for first EO)

Rationale:
  · Attribution already demonstrates narrow deterministic cue style
  · #26/#30 prefer closed labels + UNKNOWN-first over open generation
  · Introducing LLM is a separate Human decision, not required by Golden

If a future EO proposes LLM (NOT this Gate):
  input: prose + optional POV only
  output: closed enum + optional closed labels only
  fallback: UNKNOWN on ambiguity / malformed model output
  forbid: SR, Plan, oracle, free-form options, Choice mint
```

---

## D. Runtime Placement

```text
proposed module:
  packages/inkos-brain/src/l1/observe-l1.js
  (optional barrel: packages/inkos-brain/src/l1/index.js)

proposed export (optional, later EO):
  packages/inkos-brain/src/index.js  — re-export observeL1 only

proposed caller (first EO):
  NONE in production pipeline
  Tests only: scripts/test-l1-observer.js (or packages test)
  reading golden/reality/l1-choice-formation/fixtures.json
  as ORACLE for expected — never as Observer input

dependency direction:
  tests → observeL1(prose, pov?)
  observeL1 → (no SR, Plan, Attribution, Actual, Writer)

NOT under:
  golden/reality/l1-choice-formation/   ← SPEC/fixture authority only
  packages/.../attribution/            ← parallel track; do not merge

Pollution risk:
  Mixing Observer implementation into golden/ would blur
  test/spec authority vs production runtime — AVOID.
```

```text
Neighboring (informational only):
  attribution/     — parallel Layer B
  character/       — SR / Fact Access
  events/          — Actual occurrence
```

---

## E. Minimal Implementation Surface

```text
FILES TO CREATE (future Named EO — not this Gate):
  packages/inkos-brain/src/l1/observe-l1.js
  packages/inkos-brain/src/l1/index.js          (optional thin barrel)
  scripts/test-l1-observer.js                  (or equivalent test entry)
    — loads fixtures read-only; calls observeL1 with prose+pov only;
      compares to expected; never passes evidence.* into observeL1

FILES TO MODIFY (future EO, minimal):
  packages/inkos-brain/src/index.js            (optional export only)
  package.json                                 (optional test:l1-observer script)

FILES FORBIDDEN TO MODIFY:
  golden/reality/l1-choice-formation/SPEC.md
  golden/reality/l1-choice-formation/fixtures.json
  golden/reality/lib/forbidden-guards.js       (environment debt — separate)
  packages/**/attribution/**                   (except zero coupling)
  packages/**/character/character-sr-updater.js
  packages/**/causal/**
  packages/**/writer/**
  orchestrator / studio-llm-writer production hooks  (no integration EO yet)

NEW PUBLIC API:
  observeL1({ prose: string, pov?: string }) → {
    judgment: 'VALID' | 'UNKNOWN' | 'INVALID',
    labels?: {
      access?: 'E1'|'E2'|'E3'|'E4'|'E5'|'insufficient'|'ambiguous',
      agency?: 'present_cue'|'insufficient'|'ambiguous',
      subject?: 'present'|'absent'|'ambiguous'
    }
  }
  // labels optional, closed, non-authoritative classification only

INPUT:
  prose (required string)
  pov? (optional string — name resolution only)

OUTPUT:
  judgment enum + optional closed labels
  NO Candidate Option / Choice / ranking / Attribution PASS / Intent

DEPENDENCIES:
  none of: SR, Plan, Actual store, Attribution registry, Writer, LLM (v1)

SIDE EFFECTS:
  NONE
  — no DB / StoryState / SR / Choice Registry / Canon / Actual / Plan / Writer mutation

SEMANTIC SOURCES:
  Golden L1 SPEC + fixtures as test oracle only
  #26/#26b input/output walls
  #28 UNKNOWN-first / anti-invention
  #30 post-GAP1 readiness

FORBIDDEN SOURCES:
  SR, Plan, causal_chain, Candidate Option, Actual store,
  Attribution-as-L1-input, Writer Context, fixture evidence.*,
  expected, forbidden_inference, L2, Choice Registry, Phase 5
```

### Error vs UNKNOWN

```text
Runtime input error (not a semantic judgment):
  — missing/non-string prose
  — unexpected extra authoritative fields if strict mode rejects them
  → throw or return structured { ok:false, error:'...' }
  → do NOT emit judgment UNKNOWN for programmer errors

Semantic UNKNOWN:
  — well-formed prose+pov where evidence insufficient
  → judgment: 'UNKNOWN'
```

### Pure function requirement

```text
observeL1 = read-only evidence classifier
≠ state transition engine
```

---

## F. Test Boundary (design only — not written this Gate)

```text
Golden fixtures:
  P01–P10 → expect VALID
  U01–U08 → expect UNKNOWN
  I01–I06 → expect INVALID
  Load fixtures.json; pass only {prose, pov} into observeL1;
  assert judgment === expected
  Never feed evidence.* / forbidden_inference into Observer

Isolation (design requirements):
  Injecting SR / Plan / Candidate Option / oracle evidence into the
  function call must not change judgment
  (API must ignore or hard-reject extras — prefer ignore+document
   or strict reject as input error; Human EO picks)

Regression:
  npm run test:reality-golden
  = ENVIRONMENT BLOCKER (Node v12.18.1 / optional chaining
    in forbidden-guards.js)
  DO NOT FIX in L1 Observer EO
  Separate environment debt
```

---

## G. Semantic Invention Audit

| Question | Answer |
|----------|--------|
| Did this design introduce new Agency rules? | **NO** |
| Did this design introduce Candidate Option? | **NO** |
| Did this design use SR? | **NO** |
| Did this design use Plan? | **NO** |
| Did this design mint Choice? | **NO** |
| Did this design alter Golden semantics? | **NO** |
| Reopen dual-negation → Agency? | **NO** |
| Production pipeline wiring? | **NO** (explicitly deferred) |

---

## H. Final Verdict

```text
READY FOR HUMAN SEAL / NAMED EO
```

Meaning:

> A minimal pure `observeL1({prose, pov?})` boundary can be implemented under frozen Golden / #26 without new ontology, without Candidate Option, without SR bridge, and without Choice mint. First EO should be **Observer-only + fixture bench tests**, **no** production pipeline integration, **no** Golden/SPEC edits, **no** Node harness fix.

```text
≠ Observer Implementation Authorized (needs Human Seal + Named EO)
≠ Production integration authorized
≠ Environment blocker cleared
```

### Suggested future Named EO diff budget (advisory only)

```text
Production:
  ≤ 1–2 new modules under packages/inkos-brain/src/l1/
  ≤ 1 optional export line in brain index.js
  0 production pipeline callers

Tests:
  new L1 Observer unit suite
  reuse 24 fixtures read-only as oracle

Golden / SPEC / fixtures: 0 changes
SR / Choice / L2 / Phase 5 / Attribution / Node harness: 0 changes
```

If an EO exceeds this, it must justify — likely scope violation.

### Environment blocker (separate)

```text
ENVIRONMENT BLOCKER
  Node v12.18.1 → optional chaining SyntaxError
  in golden/reality/lib/forbidden-guards.js
  ≠ L1 semantic gap
  DO NOT FIX in Observer EO
```

---

## STOP

```text
NO CODE
NO SPEC EDIT
NO GOLDEN EDIT
NO FIXTURE EDIT
NO OBSERVER IMPLEMENTATION
NO AGENCY ENGINE
NO CANDIDATE OPTION
NO L2
NO CHOICE REGISTRY
NO SR BRIDGE
NO PHASE 5
NO NODE FIX
NO AUTO EO
NO PRODUCTION INTEGRATION

STOP
```
