# 08 — No-Choice Character Action Bypass Audit

**Mode:** DIRECTED BYPASS ATTACK · READ-ONLY  
**Target:** Contract v0.2 + live Actual / State / SR pipeline  
**Does not:** modify Contract · roll back #07 · implement gates · add Engines  

**Human pre-adjudication (accepted as framing):**

```text
PHASE 4 CONTRACT v0.2: PASS WITH A MATERIAL UNRESOLVED ATTACK
Implementation: BLOCKED
Human Seal: NOT READY YET
```

**Preserved from #07:** Choice-mint loops A–F remain **BLOCKED** (R13/R14 hold for *Choice object* mint).

---

## 0. Attack Objective

#07 proved:

> L1 VALID cannot mint Production Choice.

This audit asks the deeper question:

> Can a Writer-generated, Plan/Pressure/Desire-shaped **decision/action** still become **Canonical Actual**, drive **State Evolution** / **SR**, and acquire **de facto Character Causality status** — **without** any Production Choice / Action Intent Authority?

I.e. not **forging a Choice object**, but **bypassing Choice entirely**.

```text
Choice laundering     ≠   Character Causality laundering
(R13/R14 target)          (this audit target)
```

---

## 1. Two questions (must stay separate)

| | Question A (Choice mint) | Question B (Occurrence → attributed reality) |
|--|--------------------------|-----------------------------------------------|
| Asks | Is a Production Choice object minted? | Can fabricated decision/action enter Canon-as-happened and be treated as the character’s doing? |
| #07 | **Blocked** by R13/R14 | **Not fully answered** |
| This audit | Retained | **Primary** |

```text
Actual ≠ Choice          — true, and insufficient
Actual ≠ attributable character action as system meaning — NOT automatically true
```

---

## 2. Concrete live pipeline (code evidence)

No Character Causality / L1 / OPEN-4 gate exists before these steps today.

| Step | Mechanism | Gate for Choice / Causality? |
|------|-----------|------------------------------|
| Writer emits prose | Studio LLM Writer / prompts (Plan, pressure, desire, SR as **context**) | **None** |
| Prose → Actual | `ensureActualEvents` / `event-extractor.js` from `scene.text` | **None** — text-grounded only |
| Decision-shaped extract | `CHOICE_SETTLED_RE` (`决定跟|选择了|…`) → kind `choice_settled` | **None** — lexical, not L1 |
| Action extract | `ACTION_RE` → kind `action` | **None** |
| Actual → State | `evolveFromChapter` / `state-evolution-engine.js` from `actualEvents` | **None** — timeline from Actual |
| Actual → SR | `character-sr-updater.js` (Actual+IB+matrix) | **None** for Choice; forbids Plan as SR *fact*, but **allows Actual-derived awareness** |
| Future Writer | Prompt may include timeline / SR / prior Actual | **None** preventing “既然她已经逃走…” |

**Contract v0.2 explicitly marks LEGAL:**

```text
Writer → Prose → Actual
Actual → State Evolution
Actual → SR awareness (where IB allows)
```

So the path is not an accidental leak past a sealed wall — it is an **authorized occurrence pipeline** with **no attribution gate**.

---

## 3. Trace matrix A–G

| Trace | Path | Reachable today? | Violates R13/R14? | De facto Character Causality? | Severity |
|-------|------|------------------|-------------------|-------------------------------|----------|
| **A** | Plan → Writer → Action → Actual → State | **YES** | No | **YES** (occurrence as character act) | **CRITICAL*** |
| **B** | Plan → Writer → decision prose → Actual → State | **YES** (incl. `choice_settled` regex) | No | **YES** | **CRITICAL*** |
| **C** | Pressure → Writer → Action → Actual → State | **YES** | No | **YES** | **CRITICAL*** |
| **D** | Desire → Writer → Action → Actual → State | **YES** | No | **YES** | **CRITICAL*** |
| **E** | SR → Writer → Action → Actual → State | **YES** (SR as prompt context, not Option mint) | No | **YES** | **CRITICAL*** |
| **F** | Writer → Action → Actual → SR → future Action | **YES** | No | **YES** (compounded) | **CRITICAL*** |
| **G** | Writer decision prose → L1 VALID ↘ Actual → State | **YES** (both forks independent) | R13 blocks Choice mint only | **YES** on Actual fork | **CRITICAL*** |

\*CRITICAL for **Character Causality completeness / Human Seal**, not as a contradiction of #07’s Choice-mint BLOCKED results.

### Trace G detail (upgraded Trace D)

```text
Plan / Pressure / Desire
        ↓
Writer
        ↓
“She realized this was her only chance and decided to leave.”
        ├──→ L1 VALID          → Production Choice   ✗ R13 BLOCKED (#07)
        └──→ Actual (escape / choice_settled)
                ↓
             State Evolution (timeline / location-like hints)
                ↓
             Character SR awareness
                ↓
             next Writer: “既然她已经决定逃走 / 已经逃走…”
```

**Agency-shaped prose → Action-shaped Canon:** **YES, reachable.**

---

## 4. Primary question — answer

> Can a Writer-generated Action without Production Choice / Action Intent / sealed Character Causality attribution **legally** become Canonical Actual and continue to drive State Evolution?

### Under Contract v0.2

```text
YES
```

Concrete consumer gates that would block it: **absent**.  
Authority map marks Actual←Writer prose and Actual→State/SR as **LEGAL**.

### Under runtime (Phase 1–3.2)

```text
YES — live path
```

Producer: Writer (+ Plan/Pressure/Desire/SR context).  
Transformation: prose → StoryEvent (`action` / `choice_settled` / …).  
Consumer: State Evolution + Character SR updater + later prompts.  
Authority claimed: **occurrence / awareness**, not Choice — but **no consumer requires attribution**.

### Exact bypass (no Choice object needed)

```text
Promotion point:
  Writer decision/action prose
    → Actual occurrence record
    → State / SR / future narrative premise

Missing gate:
  No sealed requirement that character-attributed Action
  enter Actual only with OPEN-4 / L1-grade attribution

Not a R13/R14 violation:
  No Production Choice is minted;
  Actual is not used as Choice Authority —
  it is used as Happening Authority for character-shaped acts.
```

---

## 5. What is (and is not) being laundered

| Claim after bypass | Licensed? | Notes |
|--------------------|-----------|-------|
| “Escape happened” (Actual) | **YES** under current Actual contract | Text-grounded |
| “Timeline/SR may reflect escape” | **YES** | Phase 2/3.2 |
| “Production Choice = escape” | **NO** | #07 / R13 |
| “Actual proves Character Chose” | **NO** as Choice Authority | R14 / R8 |
| “System may narratively treat escape as her doing / prior decision” | **De facto YES** | No anti-attribution gate |
| “Character Causality holds” | **UNPROVEN / FAKEABLE** | Core Phase 4 goal gap |

---

## 6. Scope classification — Phase 4 vs Phase 5

**Do not modify Contract in this round. Do not add Engines. Do not require “Actual only after L1” yet.**

| Lens | Classification |
|------|----------------|
| Choice-object mint walls (#07) | **Intact** — retain PASS |
| Phase 4 Design Gate “can we seal Character Causality?” | **Material unresolved** — Seal **NOT READY** |
| Premature Phase 4 contract fixes (Actual needs Choice ID; ban “决定”; State rejects Writer actions) | **Too early** — risks locking Action/Choice/Consequence/Actual before Phase 5 |
| Phase 5 (`Choice → Action → Consequence → Actual → State`) | Owns **reality closure assuming Choice→Action**; current pipeline is **pre-Choice Actual** (Phase 1–2) |
| Phase 4.4 roadmap intent (`Choice → Action` not `Plan → Writer`) | **Unimplemented**; bypass proves the **old bridge still is Canon** |

**Recommended disposition (design-only, not applied):**

```text
Record as:
  PHASE-4 MATERIAL OPEN — No-Choice Canonical Action Bypass
  CROSS-CUTTING with Phase 5 Actual/State closure

Do NOT:
  - treat #07 as failed
  - silently “fix” by expanding R13 to ban Actual
  - implement Character Causality gate this round

DO (later, after Human):
  - decide whether Phase 4 must define
    “attributable Action admission” vs defer gate design to Phase 5
  - keep Decision Narration ≠ Decision Authority
  - keep Actual ≠ Choice
```

---

## 7. Relation to #07 HIGH Trace D

#07:

> HIGH: Writer can create Agency-shaped prose.

**Upgrade:**

> **CRITICAL (Causality completeness):** Agency-/decision-shaped prose can become **Action-shaped Canon** via Actual→State→SR **without** Choice mint and **without** violating R13/R14.

Undervaluing this as “only L1 evidence manufacturing” misses the **no-Choice laundering loop**.

---

## 8. Forbidden-edge style verification (this attack)

| Edge | Choice-mint status (#07) | Occurrence→Canon status (this audit) |
|------|--------------------------|--------------------------------------|
| Plan→Writer→L1→Choice | BLOCKED | n/a |
| Plan→Writer→Actual→State | n/a (not Choice) | **REACHABLE / LEGAL** |
| World→Option→Choice | BLOCKED | n/a |
| SR→Option→Choice | BLOCKED | n/a |
| Writer→Actual→Choice | BLOCKED | n/a |
| Writer→Actual→State→SR→future premise | n/a | **REACHABLE / LEGAL** |
| Actual→Choice Authority | BLOCKED | Holds |
| Actual→character-attributed happening (de facto) | — | **UNGATED** |

---

## 9. Contract change recommendations

**None this round** (Human instruction + Phase 5 risk).

If Human later wants a Phase 4 *documentation-only* note (still not seal):

> Distinguish **Happening Authority** (Actual) from **Attribution Authority** (Character Causality).  
> v0.2 blocks Attribution→Choice mint; it does **not** yet gate Happening of character-shaped actions.

No Engine. No Golden change. No “must L1 before Actual” freeze yet.

---

## 10. Final Verdict

```text
PHASE 4 — NO-CHOICE CHARACTER ACTION BYPASS AUDIT

STATUS:
PASS WITH MATERIAL UNRESOLVED ATTACK

CODE CHANGED:
NO

GOLDEN SPEC CHANGED:
NO

DESIGN CONTRACT CHANGED:
NO

#07 CHOICE-MINT RESULTS:
RETAINED (BLOCKED)

NO-CHOICE ACTION → ACTUAL → STATE BYPASS:
CONFIRMED REACHABLE

PHASE 4 IMPLEMENTATION:
BLOCKED

HUMAN SEAL:
NOT READY
```

### Bottom line

1. **Choice 没被伪造** — #07 正确；R13/R14 有效。  
2. **Character Causality 仍可被旁路伪造** — Writer decision/action prose → Actual → State → SR → 后续叙事，**不需要 Choice object**。  
3. 这是比 Trace A 更深的风险：**绕过 Choice，而不是伪造 Choice。**  
4. **不要盖 Human Seal；不要改 v0.2；不要回滚 #07；不要提前加 Engine / Actual-L1 硬门。**  
5. 下一步应由 Human 裁决：该 MATERIAL OPEN 记在 Phase 4 Seal 阻断项，还是明确 **defer gate design to Phase 5** 后再 Seal Phase 4 的 Choice-mint 子契约。
