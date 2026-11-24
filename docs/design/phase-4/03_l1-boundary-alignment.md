# 03 — L1 Boundary Alignment

**Golden:** `golden/reality/l1-choice-formation/SPEC.md` — FROZEN  
**This document does not modify Golden.**

---

## Golden SPEC says (verbatim constraints)

1. `L1_VALID(R,t) := Access ∧ Agency ∧ SubjectPresent`
2. Observer reads: **prose**, optional **pov** only
3. Observer must NOT read: expected, evidence, Plan, intent, scene goal, causalChain, canon, metrics
4. L1 is Evidence-Based Observation, **not** Choice Generation
5. Legal direction: `Prose → L1 Evidence → L1 Judgment`
6. Never from Planner / causalChain.choice / Canon retroactive
7. Coercion triplet: L1-P07 VALID · L1-U08 UNKNOWN · L1-I06 INVALID
8. L1-U03: one E2 ≠ infer second chosen path
9. Until Observer implemented, fixtures expect RED (ENGINE_NOT_IMPLEMENTED)

---

## DeepSeek/Grok propose

```text
Character SR + Narrative Evidence → L1 Observer → Candidate Option match
```

---

## Conflict

| Dimension | Golden | Proposal | Result |
|-----------|--------|----------|--------|
| Observer input | Prose (+pov) | + Character SR | **CONFLICT** |
| L1 role | Adjudicate evidence | Match/generate options from SR | **CONFLICT** |
| Choice object | No ontological Choice required for VALID | Option as SR fact | **CONFLICT** (different ontology) |

**Resolution for Design Gate DRAFT (not Human-approved yet):**

> **REJECT SR as L1 Observer input.**  
> Keep Golden input contract intact.  
> If production needs SR-linked availability, that is a **separate** object/layer (OPEN-1/OPEN-2), **not** an L1 Observer redesign.

---

## Alignment matrix

| Topic | Align with Golden? | Note |
|-------|--------------------|------|
| L1 ≠ Option Generator | YES | R12 |
| Access E1–E5 | YES | Freeze |
| Agency narrated internal state | YES | Freeze |
| SubjectAbsent set | YES | Freeze |
| Coercion ≠ Absence | YES | P07/U08/I06 |
| Reader counterfactual ≠ Access | YES | |
| Env explanation ≠ Agency | YES | |
| SR-driven L1 | **NO** | Reject proposal |
| Three Engines before L1 | **NOT FROZEN** | Architecture proposal only |

---

## Phase 7.7 note

Golden “Next Phase” = L1 Observer Specification (semantic), still no production implementation.  
Phase 4 Design Gate must not jump past that into production Choice Engines.
