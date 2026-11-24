# 23 — Phase 4.4 Remainder Mainline-Blocker Adjudication

```text
PHASE 4.4 REMAINDER
MAINLINE-BLOCKER ADJUDICATION

MODE: READ-ONLY / NO CODE / NO EO
AUTHORIZED: ADJUDICATION ONLY

4.4.1d-R AA20: SEALED (22) — NOT REOPENED
Phase 5: FROZEN
Observed Continuity: MONITOR ONLY
D5: NOT FOLDED INTO 4.4.1d-R
S4/S5: NOT REQUIRED — NOT REOPENED
```

**Core question:** Without fixing a remainder item, can the Character Causality chain

```text
Character SR → Candidate Options → Access → Agency
  → L1 Choice Formation → VALID/INVALID → L2 Dominance
  → Actual Character Choice
```

exist on the **Studio / Runtime production path**?

Evidence base: production call sites + packages code + tests + frozen contracts — **not** design aspiration alone.

---

## 1. Executive Verdict

```text
Q1: Is there a TRUE MAINLINE BLOCKER for Character Causality?
    YES

Q2: What is it?
    The Choice Formation spine itself is ABSENT in production.
    Primary break: SR → Candidate Options (MISSING)
    Cascade: Option Access / L1 Agency-for-Choice / L1 Observer /
             VALID|INVALID / L2 Dominance / Choice mint — all MISSING.

    NOT 4.4.1b · NOT 4.4.1c · NOT Literary Validation · NOT D5.

Q3: Ready for next implementation stage?
    NOT READY
    (Choice Formation production path does not exist.)
    This is a readiness report — ≠ EO authorization.

Q4: Classification of named remainders:
    4.4.1b              → ALREADY SUFFICIENT (for Attribution track)
                          / NON-BLOCKING DEBT (full Attribution ontology)
    4.4.1c              → NON-BLOCKING DEBT (test coverage)
    Literary Validation → DOWNSTREAM DEPENDENCY
                          (presupposes Choice Formation exists)
    D5                  → SEPARATE NARRATIVE-CONTROL CONCERN
```

**One-line truth:**

> Phase 4.4 Attribution (1a–1c + AA20) closed a **parallel** track.  
> Character Causality **Choice Formation** mainline was never production-wired.  
> Completing Writer/Attribution remainders will not create SR→…→Actual Choice.

---

## 2. Frozen Constraints Verified

| Constraint | Status this audit |
|------------|-------------------|
| 4.4.1d-R AA20 SEALED | Respected — not reopened |
| S4/S5 NOT REQUIRED | Respected — no reopen |
| Observed Continuity MONITOR | No AA20 breach found on OC → Choice/Attribution certificate path |
| D5 not folded into 1d-R | Respected |
| Phase 5 FROZEN | Respected — not unfrozen; not used as default blocker |
| Attribution ≠ Choice | Contract + Gate code (`choice: undefined`) |
| Occurrence ≠ Attribution | S3 sealed; Actual extractor ≠ Choice mint |

---

## 3. Character Causality Mainline Definition (adjudication scope)

```text
IN SCOPE (this adjudication):
  SR → Options → Access → Agency → L1 → VALID/INVALID → L2 → Actual Character Choice

OUT OF SCOPE as “mainline substitutes”:
  Plan → causal_chain → Writer (Narrative Track)
  Prose → Actual → State / SR (Occurrence Track)
  Prose → Attribution Gate → Registry (Attribution Track — Layer B)
  Director Situation/Desire/Beat (Narrative Control)
```

Frozen inequality (08 / phase-4.4):

```text
Occurrence ≠ Attribution ≠ Choice ≠ Consequence
```

---

## 4. Production Call-Path Trace

### 4.1 What Studio / Runtime actually run after prose

```text
Writer prose
  → ensureActualEvents
  → applyCharacterSRAfterActual     [HARD path; production]
  → applyAttributionAfterActual     [SOFT; 4.4.1c; never Choice]
  → (later) State / Memory commit

Parallel (pre-write / chapter):
  ensureChapterCausalChain → renderCausalChain → Writer Context
    (authored options / Authorial Planned Direction — Narrative Fuel)
```

Evidence:

- `packages/inkos-runtime/src/pipeline/orchestrator.js` ~511–538  
- `packages/inkos-studio-server/src/studio-llm-writer.js` ~570–599  
- `packages/inkos-brain/src/causal/causal-reasoner.js` — options from **authored plan only**

### 4.2 What production does **not** call

```text
listAttributedActions          → tests only (scripts/test-attribution-*)
evidenceFromL1                 → tests only; unused in attribution-wiring
L1 Observer / Choice Formation → ABSENT in packages/
L2 Dominance adjudicator       → ABSENT
Choice Registry / Choice mint  → ABSENT
SR → Candidate Option producer → ABSENT
```

Prompt compile loads Character SR for Writer fuel (`compiler.js` ~540–556).  
**Does not** load Attribution Registry or L1 judgments into Choice Formation (there is none).

---

## 5. Node / Edge Evidence Matrix

| Mainline Node / Edge | Production Implementation | Production Wiring | Test Evidence | Current Status | Blocker? |
|----------------------|---------------------------|-------------------|---------------|----------------|----------|
| **Character SR** | YES — `character-sr-updater.js` | YES — orchestrator + studio-llm-writer | `test:character-sr` | CONNECTED (Occurrence→SR) | No (node exists) |
| **SR → Candidate Options** | NO | NO | — | **MISSING** | **YES (primary break)** |
| **Candidate Options** | NO (authored options ≠ SR-derived) | Plan→causal_chain only | causal reasoner tests | FAKE / PLAN SUBSTITUTE | YES (as mainline node) |
| **Candidate Options → Access** | NO Option Access store | NO | — | **MISSING** | YES (cascade) |
| **Access (Fact)** | PARTIAL — `characterCanAccessActualEvent` | YES — inside SR updater | character-sr tests | CONNECTED for IB/SR only | No for Fact Access; ≠ Option Access |
| **Access → Agency (L1)** | NO chain | NO | — | **MISSING** | YES (cascade) |
| **Agency (L1)** | NO L1 Agency module | — | golden SPEC only | **MISSING** | YES |
| **Agency cues (Attribution)** | YES — `detectAttributionCues` | YES — soft Attribution | attribution-wiring/gate | PARALLEL TRACK | No for Choice |
| **Agency → L1 Formation** | NO | NO | — | **MISSING** | YES |
| **L1 Choice Formation** | NO Observer runtime | NO | golden SPEC/fixtures; **no package runner** | GOLDEN ONLY | **YES** |
| **L1 → VALID/INVALID** | NO runtime | NO | human oracle fixtures | GOLDEN ONLY | YES |
| **VALID → L2 Dominance** | NO | NO | SPEC says no L2 in L1 golden | **MISSING** | YES |
| **L2 → Actual Character Choice** | NO Choice mint / registry | NO | — | **MISSING** | YES |
| **Attribution → Choice** | Gate forbids Choice output | Soft parallel only | gate tests | NOT A PRECONDITION | No (correctly separate) |

---

## 6. 4.4.1b Adjudication

**What it is:** Typed Evidence + deterministic Attribution Gate + Symbol write-key Registry mint (Layer B).

**What it is not:** Choice Formation, L1 Observer, L2, Choice mint.

| Question | Evidence-based answer |
|----------|----------------------|
| Is Attribution a precondition for Choice Formation? | **No** — contract (4.4 Design Gate) + Gate returns `choice: undefined` |
| Must Causality go through Attribution first? | **No** — Attribution ∥ Occurrence; Choice is separate (and absent) |
| Is Gate/Registry consumed by Choice mainline? | **No** — `listAttributedActions` unused outside attribution tests |
| Can Choice mainline run without full Attribution ontology? | **N/A** — Choice mainline does not run; conservative Gate does not block a missing Choice path |
| Is incomplete Attribution ontology the Choice blocker? | **No** — that is Attribution-track depth, not SR→Choice connectivity |

```text
CLASSIFICATION: ALREADY SUFFICIENT (Attribution Layer B operational subset)
                + NON-BLOCKING DEBT (≠ complete Attribution ontology)
≠ TRUE MAINLINE BLOCKER for Character Causality Choice spine
```

---

## 7. 4.4.1c Adjudication

**What it is:** Soft post-Actual wiring of Evidence→Gate→Registry in production callers.

| Distinction | Finding |
|-------------|---------|
| Production capability missing? | **No** for Attribution soft path — wired in orchestrator / studio-llm-writer / chapter-pipeline |
| Helper-level test limitation? | **Yes** — `#15` KNOWN LIMITATION; tests call helpers, not full Studio integration |
| Affects SR→…→Actual Choice? | **No** — Attribution soft path ≠ Choice Formation |

```text
CLASSIFICATION: NON-BLOCKING DEBT
  (test coverage / integration proof gap)
≠ runtime absence of Choice Formation
≠ TRUE MAINLINE BLOCKER
```

---

## 8. Literary Validation Adjudication

| Question | Answer |
|----------|--------|
| Is literary validation a runtime precondition of Choice mint? | **No** such gate in production |
| Does literary RED prove Choice Engine missing? | **Only if** semantic formation exists and fails literary criteria — today formation is **absent**, so literary is not the primary semantic blocker |
| Ch2 S3→S4 Choice loop | Roadmap: Phase 3.2 only proved SR retention; Phase 4 literary proof **presupposes** L1/L2/Action; Open Loop / survival → Phase 6 |
| Literary quality ≠ semantic completeness | Enforced this audit |

```text
CLASSIFICATION: DOWNSTREAM DEPENDENCY
  (validation / Phase 6 survival concerns after Choice Formation exists)
≠ TRUE MAINLINE BLOCKER of SR→…→Actual Choice formation itself
```

---

## 9. D5 Adjudication

Situation / Desire / Beat Choice / beat-continuity densifiers feed **Writer Narrative Context**.

| Question | Answer |
|----------|--------|
| Does Choice Formation require D5 to form Access/Agency/L1/L2/Choice? | **No** — D5 not on Choice Formation contract path; L1 Observer must not read Plan/Director (golden SPEC) |
| Is D5 Narrative Guidance? | **Yes** |
| Does unfinished D5 block Character Causality formation? | **No** |

```text
CLASSIFICATION: SEPARATE NARRATIVE-CONTROL CONCERN
≠ TRUE MAINLINE BLOCKER
(Do not fold into 4.4.1d-R; do not create D5 EO this round)
```

---

## 10. False-Blocker Check

| Temptation | Rejected because |
|------------|------------------|
| Plan options/choice exist → Choice Engine exists | Authored plan ≠ SR→L1 Choice; AA20 demoted to Narrative Fuel |
| Writer still has narrative fuel → Choice dependency | Narrative Track ≠ Choice Track (AA20 sealed) |
| Actual open_choice events → Character Choice | Occurrence kinds ≠ Choice mint (`event-extractor.js`) |
| SR in prompt → Choice Formation | SR→Writer fuel ≠ SR→Candidate Options→L1 |
| Attribution incomplete → Choice blocked | Attribution ≠ Choice; Gate not Choice precondition |
| Literary not done → Choice blocked | Literary validates after formation exists |
| Phase 5 frozen → Choice blocked | Consequence is downstream; Formation does not require Phase 5 to *exist* |

Observed Continuity: no production certificate path to Choice/Attribution/Agency found → remain **KNOWN RESIDUE / NON-BLOCKING / MONITOR**.

---

## 11. Final Classification Matrix

| 对象 | 实际问题 | 阻塞主链? | 分类 | 证据 | 下一步（报告 only） |
|------|----------|-----------|------|------|---------------------|
| **Choice Formation spine** | Production path ABSENT from SR→Choice | **YES** | **TRUE MAINLINE BLOCKER** | No Options-from-SR; no L1 Observer; no L2; no Choice mint | Independent READ-ONLY Design/Archaeology Gate for Choice Formation |
| **4.4.1b** | Conservative Attribution subset | No | ALREADY SUFFICIENT + NON-BLOCKING DEBT | Gate/Registry exist; unused by Choice | Do not treat as Choice EO |
| **4.4.1c** | Helper-level test limitation | No | NON-BLOCKING DEBT | Production soft-wired | Optional later test hygiene — not Choice Gate |
| **Literary Validation** | Ch2 loop / quality | No (formation first) | DOWNSTREAM DEPENDENCY | Roadmap Phase 4/6 split | After Formation exists |
| **D5** | Director densifiers | No | SEPARATE NARRATIVE-CONTROL | Prompt/Director only | Separate Gate if ever |
| **Observed Continuity** | 「已发生」wording | No | NON-BLOCKING / MONITOR | Not Actual formatter; no Choice cert path | Leave MONITOR |
| **Phase 5** | Consequence frozen | No (for Formation) | DOWNSTREAM DEPENDENCY | FROZEN by Human | Remain FROZEN |

---

## 12. TRUE MAINLINE BLOCKER(s)

```text
PRIMARY TRUE MAINLINE BLOCKER:

  Name: Character Choice Formation production spine ABSENT

  Break point (first missing edge):
    Character SR  ↛  Candidate Options

  Missing cascade:
    Option Access
    L1 Agency (as Choice Formation input)
    L1 Choice Formation Observer
    L1 VALID | UNKNOWN | INVALID runtime
    L2 Dominance
    Actual Character Choice mint / storage

  Runtime path:
    Studio/Runtime production NEVER enters this spine.
    Surrogates (authored causal_chain, scene.goal, Actual open_choice)
    are Narrative / Occurrence / Plan — not Actual Character Choice.

  Contract mismatch:
    Phase 4 V2.0 / golden L1 SPEC describe the spine;
    packages/ contain no Observer / Option / L2 / Choice Registry wiring.
```

**Not the primary blocker:** 4.4.1b, 4.4.1c, Literary Validation, D5, AA20 residues, Phase 5 freeze.

---

## 13. Non-Blocking Debt

```text
- 4.4.1b Attribution ontology completeness (beyond conservative Gate)
- 4.4.1c production-path integration tests (helper-only coverage)
- Observed Continuity MONITOR wording
```

---

## 14. Downstream Dependencies

```text
- Literary validation of Choice survival (Ch2 S3→S4) after Formation exists
- Phase 6 Open Loop / Story Survival
- Phase 5 Consequence (FROZEN; after Attributed/Chosen Action semantics exist)
```

---

## 15. Separate Narrative-Control Concerns

```text
- D5 Situation / Desire / Beat Choice / beat-continuity densifiers
- Writer narrative fuel (post-AA20: non-certifying)
```

---

## 16. Unknown / Unverified

```text
- Exact future Observer I/O binding to production SR slots: DESIGN OPEN
  (not inventable this round; golden L1 forbids Plan/SR as Observer input —
   contract tension with “SR → Options” roadmap language remains DESIGN-LEVEL,
   not a second production blocker beyond “spine ABSENT”)
- Whether Human will treat Choice Formation as “Phase 4.2/4.3” vs “4.4.x”:
  PROCESS UNKNOWN — out of this adjudication’s EO power
```

No UNKNOWN used to invent semantics or EO.

---

## 17. Recommended Next Gate (report only — NO EO)

```text
IF Human continues:
  Open a READ-ONLY DESIGN / ARCHAEOLOGY GATE titled e.g.
    “Character Choice Formation Production Path”
  Focus ONLY:
    SR → Candidate Options → Option Access → Agency → L1 Observer
    (+ later L2 / Choice mint as separate seals)
  Explicitly OUT:
    4.4.1d-R reopen · S4/S5 · D5 impl · Phase 5 · Writer AA20 redo
    · Attribution Gate redesign · literary polish EO

DO NOT:
  Create EO this round
  Auto-implement Choice / Agency / Options
```

---

## 18. STOP Confirmation

```text
NO CODE
NO EO
NO SEAL of Phase 4.4 overall
NO PHASE-5 UNFREEZE
NO D5 IMPLEMENTATION
NO 4.4.1d-R REOPEN
NO S4/S5 REOPEN
NO Observed Continuity “cleanup”

ADJUDICATION COMPLETE → STOP
```

---

## Answers to mandated Q1–Q4

**Q1:** YES — TRUE MAINLINE BLOCKER exists.  
**Q2:** Choice Formation production spine absent; first edge **SR → Candidate Options** MISSING.  
**Q3:** Character Causality Choice mainline **NOT READY** for implementation authorization (report only).  
**Q4:** 4.4.1b / 4.4.1c / Literary / D5 are **not** the primary Choice mainline blockers (see §11).
