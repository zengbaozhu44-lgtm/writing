# 43 — H2 Settled Actual vs Next Plan Authority  
## Continuation Policy Design Gate — FINAL DRAFT

```text
MODE: DESIGN GATE · READ-ONLY AUDIT · SEMANTIC ADJUDICATION DRAFT
GATE: H2 (DG-042 Human Seal → next)
DOC: 43_phase-4-settled-actual-vs-next-plan-authority-design-gate.md

STATUS: **BINDING（Human 裁决已完成 · 状态对账 2026-09-18）**
  核心条款「SETTLED ACTUAL ↛ PENDING PLAN WITHOUT EXPLICIT BASIS」= BINDING
  （裁决出处：#46 头部上游块「H2 #43 binding」；#47 头部同引；V2.0 总控 PRINCIPLE 7
   冻结清单含 H2 premise；运行载体 = F8.3 Plan Validity + HPA-02-L1 Writer 契约）
  本文档其余 FINAL DRAFT 细节作为条款的展开说明保留，不再悬置
CODE CHANGED = NO
SCHEMA / PROMPT / GOLDEN = UNCHANGED
NAMED EO = NONE
REPLAY GUARD / PLANNER / 09 / WRITER = NOT TOUCHED
CHARACTER GOAL / H3 = NOT ENTERED
CHOICE / L1 / PHASE 5–7 = OUT OF SCOPE
D1 = FROZEN · 4.4.1d-R = SEALED
FAILURE-041-001 = QUALIFIED / UNFIXED

UPSTREAM:
  DG-042 (#42) Human Seal — H2 next; H3 deferred
  #41 rebaseline + FAILURE-041-001 Qualification
  #38 / #39 State & Story-Truth maps
```

---

## 0. Single question (narrow)

> **May an event that has already been settled by Actual be re-entered into the next-chapter Plan as a pending / not-yet-done task, when there is no new explicit basis?**

```text
#43 answers: Continuation Authority (already-happened vs pending)
H3 answers:  Character-Driven Continuation (why this want next)
DO NOT MERGE
```

**Not this Gate:**

```text
❌ Character Goal / Desire Engine / H3
❌ Choice / L1 / Candidate Option
❌ Story Survival / Phase 5–7
❌ Replay Guard implementation
❌ Planner / 09 / Writer / Anchor code changes
❌ “Actual always overrides Plan”
❌ “What should happen next?” as character motive
```

---

## 1. Split (sealed discipline from DG-042)

| Gate | Question |
|------|----------|
| **#43 H2** | Why must a settled occurrence not become “still to do” without basis? |
| **H3 (later)** | Why should the next beat be what the character wants? |

```text
H2 Seal ≠ Character-Driven Continuation achieved
H2 Seal ≠ license to invent next Plan beat
H2 Seal ≠ Named EO
```

---

## 2. Read-only production path audit (#41)

### 2.1 Call chain (evidence)

```text
Ch1 Prose (钥匙已交 / 空钥匙包 / 周四三点)
  → Actual extract → scene.actualEvents (persisted; quality WEAK)
  → MemoryUnit / evolveFromChapter → timeline noise; openLoops=[]
  → Anchor written (soft bans: 禁止复述 / 钥匙已不在苏晚手里)
  → planNextChapter(finished=1)
        · no chapter_0002.yaml → source=derived
        · planChapter reads chapterTask from ctx (seeded/stale 09)
        · NO read of actualEvents / evolution / SR
        · applyAnchorConstraints: attach ban notes; does NOT strip handoff goals
  → writeNextChapterTask → 09 with pending handoff semantics
  → Ch2 orchestrator loads 09 / derived intent
  → Writer Context projects pending goals
  → Ch2 Prose replays handoff   ← FAILURE-041-001
```

| Step | Exists? | Consumes settled Actual as “already done”? |
|------|---------|--------------------------------------------|
| Actual persist | YES | N/A (writer) |
| State Evolution | YES (nominal) | Does not feed Planner |
| Planner / planNext | YES | **NO** |
| chapterTask / 09 | YES | Carries **pending** task text |
| Writer | YES | Case A — executes Plan |

**Breakpoint (issuer):**  
`Settled story event → (gap) → Plan pending task`  
occurs at **derived planNext from stale chapterTask/09**, not at Writer invention.

### 2.2 Two Plan uses (must distinguish)

| Use | Example | H2 judgment |
|-----|---------|-------------|
| **Continuity context** — Plan/fuel *refers* to past as already true | “钥匙已在老何处；周四约定仍在” | **ALLOWED** (factual reference) |
| **Pending task** — Plan *assigns* the same act as still to perform | “把钥匙交给老何” / “不肯立刻交出” as goals | **FORBIDDEN without new explicit basis** |

#41 Ch2 Plan is the **second** kind (bargain / turningPoint / scene goals).

---

## 3. Required answer matrix

| 问题 | 裁决 |
|------|------|
| **什么叫 Settled Actual？** | 见 §4.1 — 最小语义定义 |
| **Actual 如何证明某事件已发生？** | 见 §4.2 — Provenance |
| **Plan 能否再次描述该事件？** | **YES** — 仅作 continuity / already-true 引用，或带明确新依据的再演 |
| **Plan 能否把它重新标成 pending task？** | **NO**，除非有新的明确依据（§4.4） |
| **什么算“新的明确依据”？** | 见 §4.4 — **禁止 LLM 猜测** |
| **Actual 与 Plan 谁“更高”？** | **Neither absolute.** 见 §5 — Continuation Policy，**不是** `Actual > Plan` |
| **Plan 是否仍有权提出未来的新行动？** | **YES** |
| **Unknown 怎么处理？** | 不得自动升级为 pending；也不得伪造 settled（§4.5） |
| **需要 Character Goal 才能判断 replay 吗？** | **NO**（§6） |
| **是否需要实现？** | **本 Gate 不实现**；Seal ≠ Named EO |

---

## 4. Semantic definitions

### 4.1 Settled Actual (minimal)

An event **E** is **settled for continuation planning** when all hold:

```text
S1  Grounding: E is evidenced by prose Occurrence
    and/or persisted Actual / StoryEvent derived from that prose
S2  Completion: E asserts a completed change of affairs
    (not merely proposed, feared, or discussed)
S3  Non-supersession: no later Occurrence/Actual in the same continuity
    reverses or replaces E’s completed outcome
```

**Not required:** Attribution PASS · Choice · Character Goal · perfect extractor wording.

**#41 note:** Prose satisfies S1–S2 for key handoff; Actual persist is noisy (FAILURE-041-002). Settlement for H2 may rest on **prose-grounded occurrence**; weak Actual does not authorize treating E as unsettled pending.

### 4.2 Provenance / how “already happened” is shown

```text
Primary:   scene.text (Occurrence in prose)
Secondary: scene.actualEvents (structured read-back; may be incomplete)
Tertiary:  Evolution timeline strings (operational; may be noisy)
NOT proof of settlement for H2:
  · Plan goals / 09 task cards
  · Anchor emotion / relationship ops hints
  · SR belief/stance (subjective; ≠ world settlement)
  · Authorial “should happen” without prose
```

### 4.3 Plan may describe E again — only as which semantics?

| Allowed Plan semantics for past E | Disallowed |
|-----------------------------------|------------|
| Continuity fact: “E already occurred” | Pending goal: “perform E” |
| Constraint: “do not undo E without basis” | Obstacle that assumes E incomplete when E is complete |
| Soft Authorial direction about **consequences / aftermath** of E | Climax/bargain that re-requires E as unfinished act |
| Explicit re-enactment with basis (§4.4) | Silent copy of prior chapter task |

### 4.4 “New explicit basis” (closed classes — no LLM invent)

Re-issuing E as pending is allowed **only if** at least one class is present as **authored or Actual evidence**, not model inference:

| ID | Basis class | Meaning |
|----|-------------|---------|
| **B1** | **Reversal Actual** | Later prose/Actual shows E’s outcome undone or replaced |
| **B2** | **Explicit Authorial re-task** | Authored plan/task **marks** re-enact / retry / tell-again (not silent reuse of old task text) |
| **B3** | **Framed fiction device** | Dream / lie / flashback / false memory with clear provenance that E is not “world still pending” |
| **B4** | **New distinct act** | Surface similarity but different obligation (e.g. different key, different party) — identity of E fails |

```text
NOT basis:
  · Stale 09 / chapterTask leftover
  · “Story needs conflict”
  · Soft Anchor ban text that was ignored
  · LLM “probably should hand over again”
  · Empty / Unknown Actual extraction
```

### 4.5 Unknown

```text
Unknown whether E is settled
  ≠  Treat E as pending task
  ≠  Invent that E settled
  ≠  Invent Character Goal to decide

Legal: omit · wait · Authorial new (non-replay) direction · Observation
Illegal: auto-upgrade Unknown → pending replay of suspected E
```

---

## 5. Continuation Policy (not Actual > Plan)

**Rejected oversimplification:**

```text
Actual > Plan     ← FORBIDDEN as architecture slogan
```

**Adjudicated shape:**

```text
Actual
  │
  ├── records what has occurred (Occurrence / facts-for-planning)
  │
  └── supplies settlement evidence for
      “is this act still an open pending task?”
                         │
                         ▼
                 Continuation Policy
                         │
              ┌──────────┴──────────┐
              │                     │
     Settled + no new basis    New explicit basis (B1–B4)
              │                     │
     MUST NOT be pending       MAY form Plan pending
     task for that same E      (including rare re-enact)
              │                     │
              └──────────┬──────────┘
                         ▼
                        Plan
              (still may propose NEW future acts)
```

| Authority | Scope |
|-----------|--------|
| **Actual / Occurrence** | Evidence of what happened; input to settlement question |
| **Continuation Policy** | Whether that event may appear as **pending** |
| **Plan / Authorial Intent** | Future direction, new acts, constraints; **not** license to erase settlement silently |
| **Writer** | Realizes Plan; not settlement authority (#41 Case A) |

```text
Plan retains full right to propose new future actions
Plan loses silent right to re-open settled E as unfinished work
```

Operational policy ≠ D1 Reality / obtains / Authority Act.  
H2 does **not** elevate Plan or Actual into Reality Authority.

---

## 6. Character Goal not required to judge replay

| Claim | Verdict |
|-------|---------|
| Detecting “pending re-issue of settled E” needs Character Goal | **FALSE** |
| Replay is a **time / settlement** error, not a motive error | **TRUE** |
| Blocking replay answers “what character wants next” | **FALSE** — that is H3 |

```text
Need Character Goal to adjudicate H2?  NO
H3 remains DEFERRED
Do not smuggle Goal into Continuation Policy
```

---

## 7. Soft mechanisms today — insufficient

| Mechanism | Role today | Enough for H2 wall? |
|-----------|------------|---------------------|
| Anchor bans / forbidden_openings | Soft notes on scenes | **NO** — #41 goals still pending handoff |
| AA20 | Writer fuel ≠ certificate | **NO** — does not stop Plan re-issue |
| Evolution / openLoops | Storage; unread by Planner | **NO** |
| SR | Empty / nominal on #41 | **NO** |
| Authored chapter_NNNN | Ch2 absent → derived stale task | **Amplifies** issuer failure |

---

## 8. Frozen boundary impact

| Boundary | Impact |
|----------|--------|
| Plan ≠ Reality / Actual | Reinforced: Plan must not *silently* treat settled as unfinished |
| Plan ≠ Choice / Goal | Intact — H2 does not mint either |
| Writer ≠ Authority | Intact |
| D1 | **UNTOUCHED** |
| L1 / Choice | **OUT OF SCOPE / UNTOUCHED** |
| 4.4.1d-R | **UNTOUCHED** |
| Phase 5–7 | **UNTOUCHED** |
| DG-042 walls | **INTACT**; H3 still deferred |

---

## 9. Semantic adjudication (FINAL DRAFT)

```text
╔════════════════════════════════════════════════════════╗
║ H2 / #43 SEMANTIC CONTRACT (DRAFT FOR HUMAN SEAL)     ║
║                                                        ║
║ SETTLED ACTUAL ↛ PENDING PLAN TASK                     ║
║         without explicit basis (B1–B4)                 ║
║                                                        ║
║ Plan MAY reference settled events as continuity.       ║
║ Plan MAY propose new future acts.                      ║
║ Plan MUST NOT silently re-issue settled E as pending.  ║
║                                                        ║
║ NOT: Actual > Plan                                     ║
║ YES: Actual → settlement evidence → Continuation Policy║
║                                                        ║
║ Character Goal NOT required for this judgment.         ║
║ Unknown ↛ pending.                                     ║
║                                                        ║
║ IMPLEMENTATION = NOT AUTHORIZED                        ║
║ NAMED EO = NONE                                        ║
║ H3 = NOT ENTERED                                       ║
╚════════════════════════════════════════════════════════╝
```

### Failure mapping

```text
FAILURE-041-001 = violation of this contract (issuer path)
STATUS          = QUALIFIED / UNFIXED
Fix             = requires future Named EO after Seal — not this document
```

---

## 10. What Seal means / does not mean

**If Human Seals §9:**

```text
✓ Semantic contract established
✓ #41 issuer class named against a wall
✓ H2 ≠ Character-Driven (still true)
✓ H3 still deferred
✓ STOP implementation
```

**Seal does not:**

```text
✗ Patch Planner / add Replay Guard
✗ Rewrite 09 / Anchor
✗ Authorize Character Goal Engine
✗ Answer what Ch2 should have been
✗ Close Phase 4 / 4.4
✗ Clear FAILURE-041-001 as fixed
```

**After Seal, recommended state:**

```text
DG-042 = SEALED
#41    = QUALIFIED / UNFIXED
#43    = SEALED
         ├── semantic rule established
         ├── no implementation
         └── no Named EO
STOP
(then Human may open H3 — not automatic)
```

---

## 11. Human adjudication options

| Option | Effect |
|--------|--------|
| **Seal** | Accept §9 contract; STOP; no code |
| **Amend** | Edit basis B1–B4 / settlement S1–S3; re-issue draft |
| **Reject** | Document why; do not treat soft Anchor as sufficient substitute |
| **Do not open H3 in this turn** | Remains deferred |

---

## 12. Hard non-actions (this Gate)

```text
❌ Code / schema / prompt / golden
❌ Replay Guard / Planner / 09 / Writer / Anchor edits
❌ Character Goal / H3
❌ Choice / L1 / Survival / Phase 5–7
❌ Slogan “Actual > Plan”
❌ Named EO
❌ Merge H2 with H3
```

---

## 13. STOP — FINAL DRAFT DELIVERED

```text
#43 = FINAL DRAFT COMPLETE
STATUS = AWAITING HUMAN SEAL
CODE = UNCHANGED
NAMED EO = NONE
H3 = NOT ENTERED
FAILURE-041-001 = QUALIFIED / UNFIXED
D1 / L1 / 4.4.1d-R / Phase 5–7 / DG-042 = AS PRIOR

STOP
```

```text
#43: already-happened must not silently become not-yet-done.
H3:  next beat should follow what the character wants — later, separately.
```
