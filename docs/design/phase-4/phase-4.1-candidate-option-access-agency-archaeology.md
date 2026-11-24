# Phase 4.1 — Candidate Option / Access / Agency Archaeology

```text
MODE: READ-ONLY ARCHAEOLOGY · DESIGN GATE · NO CODE
DOC: docs/design/phase-4/phase-4.1-candidate-option-access-agency-archaeology.md

CODE CHANGED: NO
SCHEMA / PROMPT / GOLDEN / RUNTIME: UNCHANGED
NAMED EO: NONE
IMPLEMENTATION: NOT AUTHORIZED
L1 Choice Engine / Choice object / Goal Engine: NOT AUTHORIZED
Phase 5 / Survival / Director / L2: OUT OF SCOPE

UPSTREAM (frozen — do not reopen):
  Phase 4 OPEN · 4.4.1d-R SEALED · #35 Choice NOT PROVEN
  #41 QUALIFIED / UNFIXED · DG-042 SEALED
  H2 #43 BINDING · H3.0–H3.3 SEALED (#44–#47)
  Character Goal Authority = NONE · Goal Engine = NOT AUTHORIZED
  #25 / #25b Candidate Option → L1 = REJECTED / SEALED
  L1 Observer = test-only (#32); production mount = NOT AUTHORIZED
```

**Single question:**

> In current InkOS code and production paths, where — if anywhere — does a character form **Candidate Options**, then obtain **Access** and **Agency**, such that L1 Choice Formation could theoretically hold?

```text
Character SR(t)
      ↓
Candidate Option
      ↓
Access
      ↓
Agency
      ↓
Subject Presence
      ↓
L1 Choice Formation → VALID / INVALID
```

**Not this Gate:** implement L1/Choice/Goal · L2 · Consequence · Survival · Director · #41 fix · reopen H3.3.

---

## 1. Executive Verdict

```text
ARCHAEOLOGY: COMPLETE

Candidate Option (Character Causality sense):  ABSENT
  Pseudo carriers exist (Plan / authored causal_chain.options) ≠ Character Option

Access (Option Access / SR→option-in-model):   ABSENT as production object
  PARTIAL / PSEUDO:
    · observeL1.assessAccess = prose-heuristic Question A only (test path)
    · characterCanAccessActualEvent = Fact/IB access ≠ Option Access
    · filterKnowledgeForPrompt = Writer knowledge IB ≠ Option Access

Agency (Character Causality sense):            ABSENT as production object
  PARTIAL / PSEUDO:
    · observeL1.assessAgency = prose-heuristic Question A only
    · writer-metrics agencyScore = style metric ≠ L1 Agency

Subject Presence:                              PARTIAL
  · observeL1 SubjectAbsent/Present classifiers (prose regex; test path)
  · No production Subject Presence store; Coercion ≠ Absence (respected in L1 code comments)

SR → Candidate Option → Access → Agency → Subject Presence → L1:
  NOT PROVEN

L1 Choice (production):                        NOT PROVEN
  · observeL1 EXISTS (test-only); input = prose only
  · Explicitly FORBIDDEN: Candidate Option / SR / Plan as Observer input (#25b + observeL1)

Critical nail:
  The roadmap spine assumes Candidate Option as a middle object between SR and L1.
  Production has no such object.
  Golden L1 + #25b already operate WITHOUT Candidate Option (Prose → Judgment).
  Therefore the Phase 4.1 “missing foundation” is NOT “need Choice Engine first”;
  it is: (1) no Character Candidate Option producer/store;
         (2) no SR-bounded Option Access;
         (3) no SR-bounded Agency evidence path into production;
         (4) L1 not production-mounted — and must not be fed Plan/Goal/CO.
```

---

## 2. Current Phase 4 Frozen Preconditions

| Item | Status |
|------|--------|
| H3.3 GGC | **SEALED** — orientation evidence only; **≠** Candidate Option · Goal Authority · Goal→Choice |
| #25b | Candidate Option **↛** L1; BEFORE L1 **REJECTED** |
| #35 | Choice object **NOT PROVEN** |
| observeL1 | Question A only; **NO** Candidate Option mint |
| Goal → Candidate Option auto | **NOT ASSUMED**; code **NOT FOUND** |
| Plan → Character Candidate Option | **FORBIDDEN** (semantic); **PSEUDO** carriers present |

**H3.3 tension check:** None. GGC is character **orientation** evidence; Candidate Option is **admissible alternative-in-model**. Different ontology. Do not merge. Do not reopen #47.

---

## 3. Candidate Option Archaeology

### 3.1 Phase 4 sense vs name collisions

| Name in code/docs | Is Character Candidate Option? |
|-------------------|--------------------------------|
| `causal_chain.options` | **NO** — authored Plan options / Narrative Fuel (`causal-reasoner.js`) |
| `authoredPlan.options` | **NO** — Story Control |
| `scene.goal` / `mainGoal` | **NO** — Plan task |
| `deriveSceneChoice` / `scene.choice` | **NO** — explicit authored choice string or null |
| `observeL1` | Does **not** consume or emit Candidate Option |
| Character Option store / registry | **ABSENT** |

### 3.2 Search result

```text
Candidate Option (Character Causality / Phase 4.1):
  FOUND as sealed design concept (#24/#25)
  FOUND as roadmap language (V2.0 Phase 4.2)
  NOT FOUND as production semantic object / mint / consumer for Character Causality
```

Prior archaeology `#24` / seal `#25b` remain binding: positive producer **UNKNOWN**; L1 path placement **NONE**.

---

## 4. Candidate Option Source Map

| Alleged source | Runtime path | Semantic type | Character Option? |
|----------------|--------------|---------------|-------------------|
| Character SR | awareness/belief/stance/motive only | SR projection | **NO** mint of options |
| Grounded Goal Candidate (H3.3) | Design only; no runtime | Orientation evidence | **NO** auto → Option |
| Desire / Director desire | `buildCharacterDesireProfile` | Ops fuel | **NO** |
| Situation / Pressure / Conflict | Plan obstacles; Reasoner pressure | Story Control / fuel | **NO** |
| Plan / 09 / chapterTask / mainGoal | `planner.js` → intent | Authorial | **PSEUDO risk** |
| causal_chain.options | `deriveCausalChain` ← authored options only | Narrative Fuel | **PSEUDO** |
| Beat / Scene goal | `scene-execution.js` | Plan pass-through | **PSEUDO** |
| Writer / LLM | Prompt realization | Realization | **FORBIDDEN** as Option Authority |
| Reasoner inference | mock derive; missing → `no_causal_basis` | Fuel | **FORBIDDEN** |

```text
Plan Action → Candidate Option     PSEUDO (authored options / goals as fuel) — NOT Character Option Authority
Expected Action → Candidate Option  PSEUDO / FORBIDDEN as Character Option
Pressure / Conflict → Candidate Option  NOT FOUND as Option mint; present as Plan/Reasoner fuel
Goal / GGC → Candidate Option       NOT FOUND in code; H3.3 forbids Goal Authority
```

**#41 relevance (report only):** stale Plan/09 re-issues pending tasks — Story Control pollution of **continuation**, not a Candidate Option mint. Does not create Character Options. **UNFIXED; no repair this Gate.**

---

## 5. Access Archaeology

### 5.1 Three different “Access” notions (must not collapse)

| Notion | Code | Phase 4.1 Option Access? |
|--------|------|---------------------------|
| **A. Fact/IB Access to Actual** | `characterCanAccessActualEvent` | **NO** — event witness/actor for SR awareness |
| **B. Writer Knowledge IB** | `filterKnowledgeForPrompt` + `06_knowledge_matrix` | **NO** — Prompt hygiene; POV know/partial |
| **C. L1 Access (option-in-model cues)** | `observeL1` → `assessAccess(prose)` | **PARTIAL** — prose heuristics for Question A; **not** SR-derived; **not** a store |
| **D. Director heroKnows** | `buildExecutionInformationGap` | **PSEUDO / FORBIDDEN** as Character Access Authority (forbidden SR fact bag) |

### 5.2 Answers

1. **Option Access runtime representation?** **ABSENT** as object. L1 Access = ephemeral boolean inside `observeL1`.  
2. **Inputs?** For L1: **prose only**. For Fact Access: Actual + scene presence. For Knowledge: matrix rows.  
3. **Canon/Plan/Writer steal?** Knowledge filter reduces Writer leak; Plan/heroKnows remain separate risks; **no** Option Access from SR.  
4. **Different characters know different X?** **PARTIAL** for knowledge matrix / Actual IB → SR awareness; **NOT** expressed as Option Access A≠B option sets.

```text
Character SR → Access (to options) = NOT FOUND
```

---

## 6. Access Boundary Audit

| Path | Boundary status |
|------|-----------------|
| SR awareness of Actual | Legal Fact/IB path (#37 family); ≠ Option Access |
| `filterKnowledgeForPrompt` | Writer IB; ≠ L1 Access |
| `assessAccess(prose)` | Golden-aligned surface cues; **≠** SR; test-only consumer |
| Plan/goal as “options available” | **FORBIDDEN** as Character Option Access |

---

## 7. Agency Archaeology

| Carrier | File / function | Phase 4 Agency? |
|---------|-----------------|-----------------|
| `observeL1.assessAgency` | `packages/inkos-brain/src/l1/observe-l1.js` | **PARTIAL** — prose Agency minimum; test-only |
| `computeAgencyScore` | `writer-metrics.js` | **NO** — style/agency score for Writer quality |
| Attribution deliberation markers | `attribution-wiring.js` | **NO** — Attribution evidence cues ≠ L1 Agency |
| Scene Goal / Beat / Desire / Pressure | Director / Plan | **PSEUDO** if treated as Agency — **FORBIDDEN** |

```text
Character → Agency evidence → L1 (production): NOT FOUND
Character → Agency evidence → observeL1 (tests): PARTIAL (prose-only)
```

---

## 8. Agency Pollution Audit

| Source | Pollutes Agency? | Notes |
|--------|------------------|-------|
| Scene Goal / Beat Action | **RISK if wired** | Currently not fed into `observeL1` |
| causal_chain | **FORBIDDEN** as Agency | Rejected as `observeL1` input key |
| Pressure / Conflict / Desire | **FORBIDDEN** auto-Agency | Explicit in `assessAgency` comments |
| Living brain / Writer intention | **FORBIDDEN** | Not L1 inputs |
| Plan expected action | **PSEUDO** production path to Writer | ≠ L1 Agency |
| H3.3 GGC | **NOT** Agency | Orientation ≠ Agency |

`deriveSceneChoice`: returns **null** without explicit choice — does **not** synthesize Choice from goal+fear (good). Still **not** Character Agency formation.

---

## 9. Subject Presence Archaeology

| Capability | Status | Evidence |
|------------|--------|----------|
| Detect Subject Absence (sleep / coma / puppet / no consciousness) | **PARTIAL** | `assessSubjectAbsent` regex set |
| Subject Present default when not absent | **PARTIAL** | `assessSubjectPresent` → true if not absent |
| Production Subject Presence field | **ABSENT** | — |
| Coercion → INVALID | **NOT** in L1 code | Correct: Coercion ≠ Absence |
| Distinguish pure reflex / author convenience broadly | **UNKNOWN / weak** | Limited regex; not full ontology |

---

## 10. Pseudo-Choice Path Audit

| Path | Code | Semantic | Violates Phase 4 freeze if treated as Character Choice? |
|------|------|----------|--------------------------------------------------------|
| `mainGoal` → Writer → prose | `planner.js` → prompt compiler | Plan task | **YES** if called Choice |
| `scene.goal` → priorityGoal / Beat | `scene-execution.js` | Plan | **YES** |
| `causal_chain.choice` | `causal-reasoner.js` | Authored climax/choice or null | **YES** if Character Choice |
| `causal_chain.options` | authored only | Plan options | **YES** if Character Candidate Option |
| Pressure / Conflict → “choice” | Plan obstacles; densifiers | Fuel | **YES** if Choice |
| Desire → choice | Reasoner/Director | Fuel | **YES** if Choice |
| Writer instruction → choice | Prompt | Realization | **YES** if Choice |
| `observeL1` VALID | test Observer | Question A judgment | **NOT** Choice mint (by design) |

**No code fixed.** Production still drives action via Plan/Writer; L1 does not gate production.

---

## 11. Actual Code Path Diagram

```text
[Reality / Actual]                    FOUND (Phase 1–2)
       ↓
[Information Boundary]                PARTIAL
       · Actual IB: characterCanAccessActualEvent → SR awareness
       · Knowledge IB: filterKnowledgeForPrompt (Writer)
       ↓
[Character SR]                        FOUND (nominal write; #41 often empty)
       ↓
[Candidate Option ?]                  ABSENT (Character)
       · PSEUDO: causal_chain.options / Plan goals
       ↓
[Access ?]                            ABSENT (Option Access)
       · PARTIAL: assessAccess(prose) test-only
       · Fact Access ≠ Option Access
       ↓
[Agency ?]                            ABSENT (production)
       · PARTIAL: assessAgency(prose) test-only
       ↓
[Subject Presence ?]                  PARTIAL (prose classifiers; test-only)
       ↓
[L1 Choice ?]                         PARTIAL object / NOT production
       · observeL1({prose}) → VALID|UNKNOWN|INVALID
       · NO Candidate Option input (forbidden)
       · NOT mounted on production Writer path
```

---

## 12. Gap Matrix (nail the missing ring)

| Link | Status | Why it cannot be legally inferred from existing paths |
|------|--------|------------------------------------------------------|
| SR → Candidate Option | **ABSENT** | SR has no option set; auto-gen forbidden (#24/#25); GGC ≠ options |
| Candidate Option store | **ABSENT** | No type/registry/consumer |
| Option Access from SR | **ABSENT** | Fact IB ≠ “option enters character model as Choice Access” |
| Agency from SR / interior | **ABSENT** in production | Only prose heuristics in test Observer |
| Subject Presence production | **ABSENT** store | Classifiers exist only inside observeL1 |
| Full chain into production L1 | **NOT PROVEN** | L1 not on production path; CO not L1 input |
| Plan/Writer → Action | **FOUND** | Pseudo-causality — not legal Character Choice chain |

**Smallest concrete missing ring for the *roadmap* spine:**

```text
NO Character Candidate Option object/producer
```

**Smallest concrete missing ring for *Golden L1 production readiness*:**

```text
L1 not production-mounted
+ no requirement for Candidate Option (#25b)
+ Access/Agency remain prose-surface judgments, not SR-derived stores
```

These are **two different gaps**. Do not collapse into “build Choice Engine.”

---

## 13. Evidence / File / Function / Call Chain

| Evidence | Path |
|----------|------|
| L1 Observer | `packages/inkos-brain/src/l1/observe-l1.js` — `observeL1`, `assessAccess`, `assessAgency`, `assessSubjectAbsent/Present` |
| Fact Access | `packages/inkos-brain/src/character/character-sr-updater.js` — `characterCanAccessActualEvent` |
| Knowledge IB | `packages/inkos-prompt/src/entity-selector.js` — `filterKnowledgeForPrompt` |
| Plan options/choice | `packages/inkos-brain/src/causal/causal-reasoner.js` — `options`, `choice` |
| Plan goals | `packages/inkos-brain/src/planner/planner.js` — `mainGoal` |
| Scene goal / no synthetic choice | `packages/inkos-director/src/scene-execution.js` — `derivePriorityGoal`, `deriveSceneChoice` |
| Writer agency metric | `packages/inkos-studio-server/src/writer-optimization/writer-metrics.js` — `computeAgencyScore` |
| Prior seals | `#24`, `#25`, `#25b`, `#32`, H3.3 `#47` |

Call chain **not found:**

```text
SR → mint CandidateOption[] → OptionAccess → AgencyEvidence → observeL1
```

Call chain **found (pseudo):**

```text
09/chapter_plans → planChapter → intent.mainGoal / scenes[].goal
  → Director / prompt compiler → Writer → prose
  (+ optional causal_chain.options/choice as fuel)
```

---

## 14. Conflict Audit

| Against | Result |
|---------|--------|
| H3.3 SEALED | **NO CONFLICT** — GGC ≠ Candidate Option; no Goal→Option assumed |
| H2 #43 | **NO CONFLICT** — settlement policy ≠ Option/Access |
| DG-042 | **NO CONFLICT** |
| #41 | **RELATED** only as Plan-continuation pollution evidence; **no fix** |
| #25b | **ALIGNED** — CO ↛ L1; this archaeology reconfirms ABSENT CO object |
| Golden L1 | **ALIGNED** — Observer prose-only; no CO required |
| V2.0 roadmap spine `SR→Options→L1` | **ASPIRATION vs sealed contracts** — still hypothesis for L1 architecture (**#25 REJECTED** as L1 spine); report only, no roadmap edit |

---

## 15. Phase 4.1 Readiness Verdict

```text
READY TO IMPLEMENT Choice / Candidate Option / L1 production?
  NO

READY FOR NEXT Design Gate (questions only)?
  YES — after Human adjudication of this archaeology

If next Design Gate is opened, it should ask (not implement):
  1) Is a Character Candidate Option object still needed for anything
     *outside* Golden L1 Question A — given #25b REJECTED it for L1?
  2) If L1 production mount is desired, what is the Named EO boundary
     (prose-only Observer vs SR-derived Access/Agency — currently divergent)?
  3) How to quarantine pseudo options (causal_chain.options / Plan goals)
     without inventing Character Option Authority?
```

**Do not** invent Candidate Option schema / Agency Engine / Access store in this Gate.

---

## 16. Explicit STOP

```text
PHASE 4.1 — CANDIDATE OPTION / ACCESS / AGENCY

ARCHAEOLOGY:
COMPLETE

Candidate Option:
ABSENT
(PSEUDO Plan/authored options exist — not Character Option)

Access:
ABSENT (Option Access)
PARTIAL (L1 prose assessAccess; Fact/Knowledge IB separate)

Agency:
ABSENT (production)
PARTIAL (L1 prose assessAgency)

Subject Presence:
PARTIAL

SR → Candidate Option → Access → Agency:
NOT PROVEN

L1 Choice:
NOT PROVEN
(test-only Observer exists; production mount NOT AUTHORIZED;
 Candidate Option NOT an L1 input — #25b)

CODE:
NO CHANGES

DESIGN GATE:
REQUIRED

NAMED EO:
NONE

IMPLEMENTATION:
NOT AUTHORIZED

STOP:
YES
```

```text
H3.3 untouched · Goal Engine not created · Choice Engine not created
#41 unrepaired · Phase 5 frozen · L2 not entered
```

---

## Re-verification Addendum — 2026-09-18（Character World Formation 冻结后）

自本考古初版以来新增的生产能力，逐一复核其对三判结论的影响：

| 新增能力 | 是否构成 CO/Option Access/Agency 载体 | 判定 |
|---|---|---|
| authored CADE + anchors（EO-P4-Authored-CADE / Correspondence-V2） | 否——CADE 是**已决**行动证据（decisionKind=commits），非「可选方案在模型中」；anchors 是评估辅助；`isCandidateOption:false` 显式恒定 | 三判不变 |
| authored Character SR 三槽（interpretation/belief/stance） | 否——主观世界状态（Character World 载体），描述「如何理解」而非「有何选项/有无行动能力」 | 三判不变 |
| L1 audit-only observation | 否——诊断旁路（OBSERVED/NOT_OBSERVED/UNKNOWN），非 Truth，非生产对象 | 三判不变 |
| Correspondence v2 / WCT / State 消费链 | 否——均在 Action 之后的下游 | 三判不变 |

全仓 grep 复验：`candidateOption(s)` / `agency(Score)` 在生产代码中**仅存在于 FORBIDDEN 字段防御表**（cade.js / character-action-truth.js / world-consequence-truth.js），零生产载体。

**维持原判**：Candidate Option = ABSENT；Option Access = ABSENT（伪载体：Fact/IB access ≠ Option Access）；Agency = ABSENT as Truth（伪载体：observeL1 启发式 test-only）。

**FIRST REAL BLOCKER 判定（2026-09-18 · Human 纠正后定稿）**：
**No currently triggered implementation blocker —— ≠ Character Causality complete。**

- 正确表述：当前生产**没有任何已运行节点要求** Candidate Option Truth / Option Access /
  Agency Truth（多轮真实双章实证），故未触发「必须立即实现」的 blocker →
  STOP / NO NEW EO。
- **纠正记录**：本附录初版曾写「Access+Agency+Choice 段由 authored CADE 通道合法承载」——
  该表述被 Human 裁决否决。authored CADE 是**作者行动事实/证据的合法承载路径**
  （Author → CADE → Action evidence/correspondence → WCT），
  **不构成** `SR → Access → Agency → Choice → Action` 人物因果语义链的实现。
  二者是不同的东西，不得合并。
- 因此 **Phase 4 仍 OPEN**（非 PASS）；#35 Choice NOT PROVEN；SR→Choice 保持断开
  （故意的语义防火墙，与 Character World Formation FROZEN CONTRACT 一致：
  Character World → SR → Writer perception 已成立；SR → Goal/Option/Choice 未实现）。
- 硬条件（Human 裁决）：若未来要把 CO/Agency 变成 Story Truth 接入生产链，
  必须重新经 Necessity → Design Gate → Named EO；不得因考古发现其不存在而反向制造。
