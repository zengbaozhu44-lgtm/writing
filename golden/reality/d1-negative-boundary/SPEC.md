# D1 Negative Boundary — FROZEN

**Phase**: D1 Claim-Centric Ontology  
**Status**: `FROZEN`  
**Date frozen**: 2026-09-02  
**Scope**: Semantic contract only — **no production code, no schema, no Authority definition**

**Related artifacts**:
- `golden/reality/D1-STATUS.md` — D1 overall status (CLOSED / OPEN / BLOCKED)
- `golden/reality/ARCHITECTURE-REALITY-AUDIT.md` — architecture & pollution witnesses
- `golden/reality/BOUNDARY_MAP.json` — forbidden promotion paths (implementation drift documented)
- `golden/reality/PLAN_REALITY_LEAKS.json` — leak witnesses L01–L13

---

## Epistemology (frozen)

**Claim** is the minimum semantic unit for D1 discussion.

**Reality** (positive definition) is **NOT** frozen in this document.

This spec freezes only what **must not** be treated as a **sufficient condition** for:

> A Claim is already true in the story world — i.e. «世界已经如此».

**Narrative** is an expression carrier for Claims. It is **not** a Reality ontology type parallel to Plan, Possibility, or other categories.

---

## Master principle (frozen)

> **Process properties must not self-upgrade into world properties.**

中文：

> **过程属性不得自行升级为世界属性。**

The following describe **what happened to a Claim in the system**, not **whether the Claim holds in the story world**:

- Narrative occurrence
- Plan generation
- LLM inference
- Planner generation
- Validation success
- Consistency success
- Acceptance
- Persistence / storage
- Future usability

---

## Wording constraint (frozen)

**Incorrect** (do not use):

> «Even if all of the following hold, it can never become Reality.»

**Correct**:

> **Any one of the conditions below — alone or in combination — is not a sufficient condition for treating a Claim as «世界已经如此».**

This round freezes **insufficient conditions** only.

It does **not** define what **is** sufficient for Reality confirmation. A future Positive Reality Definition / Authority Contract may add confirming rules that **do not** treat N1–N9 process properties alone as sufficient.

---

## Negative rules N1–N9 (FROZEN)

### N1 — Narratability ≠ Reality

A Claim appears in Narrative / prose **does not** mean the Claim holds in the story world.

Example:

- Text: «林晓握紧了拳头.»
- **Insufficient alone** for any Canon Reality that «林晓已经握紧拳头」as a confirmed world event beyond narrative occurrence.

Narrative occurrence ≠ world fact confirmation.

---

### N2 — Derivability ≠ Reality

A Claim can be derived from existing information **does not** mean the Claim already holds in the world.

Example:

- «根据现有情况，林晓应该已经知道真相。」
- **Insufficient alone** for: «林晓已经知道真相。」

Derivation ≠ establishment.

---

### N3 — Storability ≠ Reality

A Claim is written to disk, database, or any Canon-related artifact **does not** mean it gains world truth.

Persistence / storage **does not produce** Reality.

---

### N4 — Acceptability ≠ Reality

Author clicks Accept, chapter enters `accepted` status, or workflow passes **does not** mean all world propositions in that chapter gain Reality.

Accept ≠ automatic Claim confirmation.

---

### N5 — Consistency ≠ Reality

A Claim does not contradict known Reality **does not** mean the Claim is established.

- No contradiction ≠ Truth  
- Consistency ≠ Reality  
- Validation success ≠ Reality confirmation  

---

### N6 — Generability ≠ Reality

Planner / LLM / Route can **generate** a Claim **does not** mean the Claim becomes a world fact.

---

### N7 — Plan ≠ Reality

What Plan states, predicts, schedules, or expects **does not** mean it has already happened.

Example:

- Plan: «林晓下一章会离开公司。」
- **Insufficient alone** for: «林晓已经离开公司。」

---

### N8 — Character Utterance ≠ Proposition Truth

A proposition spoken by a character **does not** mean that proposition is true in the world.

Example:

- 林晓说：「我觉得老板在骗我。」
- May support Claims about **utterance / cognition** (e.g. «林晓认为老板在骗她」) — subject to future Positive rules.
- **Insufficient alone** for: «老板确实在骗她。」

> **A character's statement about X ≠ X is true.**

---

### N9 — Future-Usability ≠ Reality

A Claim may be used as a premise for future reasoning, planning, or generation **does not** mean it is therefore Reality.

«Usable as a future premise» is a possible **consequence** of established Reality, not a **sufficient condition** for Reality.

**Forbidden reversal**:

> Because the system needs it as a future premise → therefore it is true.

---

## Relationship to Authority (frozen boundary, not Authority definition)

Whatever **Reality Authority** rule is adopted in the future:

- That rule **must not** treat any of N1–N9 process properties **alone or in combination** as a **sufficient** condition for Canon Reality.
- This spec **does not** name the Authority subject, target, or confirmation procedure.

Preserved from Authority Audit (2026-09-02):

- **CLAIM-LEVEL-AUTHORITY = NOT IMPLEMENTED** in production.
- Reality in practice still partially appears as **disk-write / module-write state**, not a unified Authority-governed Claim set.
- **This spec does not fix that drift.** Pollution paths remain documented; semantic illegality is named here; code is unchanged.

---

## Witness map (semantic only — implementation unchanged)

Documented production paths that **violate** N1–N9 if interpreted as sufficient confirmation. See `PLAN_REALITY_LEAKS.json` for file-level evidence.

| Witness | Violated rules (semantic) | Note |
|---------|---------------------------|------|
| L01 plan.cost → timeline | N7, N6, N3 | Plan consequence treated as occurred event |
| L02 mainGoal → facts | N7, N6, N3 | Plan completion → immutable fact |
| L03 intent → 08 | N7, N3 | Plan fields as current world state |
| L04 scene.consequence → timeline | N7, N6, N3 | Plan/inference as event |
| L05 inferWorldAfter → Writer | N2, N7 | Inference as world-after instruction |
| L06 deriveRelationshipState → anchor | N7, N2 | Plan as relationship fact |
| L07 newForeshadow → 12 | N7, N6 | Plan as canon hook |
| L08 generated 09 → Planner | N7, N9 | Generated plan as planning premise |
| L09 beatPlan → beat memory | N7, N6 | Plan as prose-derived delta |
| L10 prose → anchor emotion | N1, N3 | Narrative heuristic → state-like anchor |
| L13 evolveWorldState | N1, N2 | Prose heuristic → world proposal |
| validation pass → commit → 11/13 | N5, N4, N3 | Process success → Canon write |
| acceptChapter → commit | N4, N3 | Accept → Canon bundle |
| committed disk → loadBrainContext | N3 | Storability → read as truth |

**No remediation in this freeze.** Witnesses remain for future Authority / Gate design.

---

## Explicit non-goals (this document)

- Positive definition of Reality  
- Reality Authority subject / target / API  
- Status enum (`confirmed`, `verified`, `candidate`, …)  
- Claim schema / new fields  
- FACT / STATE / PLAN / POSSIBILITY / NARRATIVE ontology enum  
- Reality Gate, Extractor, State Projector  
- Writer → Reality implementation  
- Route P0, L1/L2 changes  
- Canon migration or production path fixes  

---

*End of D1 Negative Boundary — FROZEN.*
