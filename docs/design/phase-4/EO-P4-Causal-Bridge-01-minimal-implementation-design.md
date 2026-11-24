# EO-P4-Causal-Bridge-01 — Minimal Implementation Design

```text
NAMED EO: EO-P4-Causal-Bridge-01
MODE: NAMED EO DESIGN ONLY
LAST MINIMAL GATE: CLOSED (accepted)

CODE: NO
SCHEMA: NO
PROMPT: NO
RUNTIME: NO
IMPLEMENTATION: NOT AUTHORIZED (design only)

OPEN-4 proposition (SEALED):
  Character X holds a character-attributable Action Intent
  whose content is Y.

FIRST MINIMUM SEMANTIC GAP (accepted):
  Production has no character-side action-decision evidence
  that can establish Action Intent(Y).

OUT OF SCOPE:
  Intent Authority Framework · Evidence Bundle · Choice Engine ·
  Candidate Option · Access · Agency · Goal/GGC · L1/L2 ·
  Consequence · Survival · Director · full Phase 4 ontology ·
  Design Gate recursion
```

**EO purpose:** Cross the first wall on the vertical route:

```text
Character SR
  → [this bridge]
  → Action Intent(Y) as STORY TRUTH
  → Character Action realization (Writer consumes; does not mint)
```

---

## A. EO 的最小语义目标

Introduce **one** production-usable semantic:

```text
Character-side Action Decision Evidence (CADE)
  → supports assertion of OPEN-4 Action Intent(Y) as STORY TRUTH
  → consumable by Character Action realization
```

| Must | Must not |
|------|----------|
| Bind Character X to a concrete Action content Y | Equate Intent with Choice |
| Be character-side decision evidence | Be Plan / Director / Writer authority |
| Be readable as STORY TRUTH before Writer realizes Y | Elevate SR / Desire / Attribution / GGC to Intent |
| Allow Writer to **realize** Y from that Truth | Allow Writer prose to **mint** prospective Intent |

```text
CADE ≠ Choice
CADE ≠ Candidate Option
CADE ≠ Agency
CADE ≠ Goal / GGC
CADE ≠ Attribution
CADE ≠ Character SR
Action Intent(Y) ≠ Choice (identity remains OPEN; EO does not seal it)
```

---

## B. 最小 producer

```text
Producer: Character-side Action Decision Evidence write path
          (narrow · explicit · non-Plan)
```

**What it produces:** A single evidence item: Character X has decided / is committed to do Action Y (character-side).

**Who may produce (design constraint):**

| Allowed | Forbidden |
|---------|-------------|
| Explicit character-decision authoring into the CADE channel (same *pattern* as authored Character SR / `characterFacing`: character-side material, separate semantic channel) | Copy/fill from `mainGoal`, `scene.goal`, `priorityGoal`, `causal_chain`, `expectedAction`, Director brief, Beat `action`/`choice`, Writer output, Desire-alone, GGC, SR slots, Attribution PASS, L1 VALID |

**Who must not produce:** Plan compiler, Director, Beat planner, Writer LLM, Reasoner, Living brain as Intent authority.

**Automation:** Not required by this EO. First bridge may be **explicit CADE only**. Auto-derivation from prose/Plan is **out of scope** and would reopen laundering.

**No more-foundational gap found:** The closed Gate already named this capability. This EO *is* that capability. No STOP for a deeper unproven semantic under CADE.

---

## C. 最小 carrier

Two thin STORY TRUTH layers (logical; not a schema commit):

```text
1) CADE
   — character-side action-decision evidence for (X, Y)

2) Action Intent Truth (derived only from CADE)
   — asserts OPEN-4: X holds Action Intent(Y)
   — status: asserted | absent
```

```text
Action Intent Truth
  may be asserted ⇔ CADE present for (X, Y) under allowed provenance
  must be absent if CADE absent
  must NEVER be asserted from Plan / Director / Writer / SR / Desire / Attribution / L1 alone
```

Carrier sits **beside** Character SR, not inside SR slots (SR remains ≠ Intent).

---

## D. 最小 consumer

```text
Consumer: Character Action realization path
          (Writer realization layer only)
```

**When Action Intent Truth = asserted for (X, Y):**

- Writer may treat Y as the character-side Action to **realize** (ordinary realization of already-established STORY TRUTH).
- Writer remains **non-authority**: may narrate; may not mint or alter Intent Truth.

**When Action Intent Truth = absent:**

- Writer must **not** invent prospective Intent(Y).
- Existing Plan-/SR-as-prompt path may still produce prose as today, but that prose **must not** be treated as establishing Character Causality / Action Intent (status quo; #08 bypass remains *unfixed* by this EO — EO only adds the legal bridge when CADE exists, does not claim to close all bypasses).

**Non-consumers (this EO):** Attribution Gate, L1 Observer, Goal/GGC, Consequence, State Evolution (no change required).

---

## E. 与现有 SR / Actual / Writer 的接点

```text
Actual
  → Fact IB
  → Character SR                         (unchanged · ≠ Intent)
  → [CADE → Action Intent Truth]         ← EO insert (parallel to SR, not via SR)
  → Writer realization of Action Y       (consumes Intent Truth if asserted)
  → Prose → Actual → …
```

| Contact | Rule |
|---------|------|
| **Character SR** | Remains subjective state. May *coexist* with CADE. Must not be copied into Intent Truth as sole basis. |
| **Actual** | Unchanged extract path. Actual ↛ Intent Truth (W2). No reverse: Writer prose ↛ CADE / Intent. |
| **Writer** | Reads Intent Truth as realization fuel when asserted. Forbidden to write CADE or Intent Truth. |
| **Plan / Director** | Continue as STORY CONTROL for other concerns. Forbidden as CADE/Intent source. |
| **Attribution** | Remains retrospective separate track. Not elevated; not a CADE producer. |

**Vertical Truth Route:** unchanged. EO adds a **side bridge** after SR for Causality→Action when CADE exists; does not rewrite Actual→IB→SR→…→Consequence.

---

## F. 最小数据形态（仅必要字段）

Design sketch only — **not** a schema change this round:

```text
CharacterActionDecisionEvidence
  characterId: string          # X
  actionContent: string        # Y (concrete action content)
  provenance: "character_action_decision"
  sourceRef: string            # must NOT be plan.* / director.* / writer.*
  # optional: sceneId / chapter for localization

ActionIntentTruth
  characterId: string
  actionContent: string        # Y
  status: "asserted" | "absent"
  evidenceRef: id of CADE      # required when asserted
```

No Choice id. No option set. No agency score. No goal id. No evidence-bundle graph.

**Candidate Option:** not an inevitable dependency of this EO → **not created**.

---

## G. 如何保证 Plan / Writer / Director 不成为 Intent authority

| Guard | Mechanism (design) |
|-------|-------------------|
| **Forbidden source list** | CADE producer rejects Plan goal/choice/causal_chain, Director brief, Beat action/choice, Writer output, Desire-alone, GGC, SR-alone, Attribution, L1 |
| **Channel separation** | CADE / Intent Truth are not Plan fields and not SR slots |
| **One-way Writer** | Writer may read Intent Truth; Writer write-back to CADE/Intent = forbidden |
| **No prose reverse mint** | `ensureActualEvents` / Attribution / observeL1 must not write CADE or assert Intent Truth |
| **Absent-by-default** | No CADE → Intent Truth = absent (fail-closed for Causality claim) |
| **Provenance required** | Asserted Intent must cite CADE with `provenance: character_action_decision` |

---

## H. 最小测试 / golden requirement

Design-level requirements only (no golden edits this round):

1. **Absent CADE → Intent Truth absent** (cannot claim Causality Intent).  
2. **CADE (X,Y) with legal provenance → Intent Truth asserted (X,Y)**.  
3. **Plan/Director/Writer/Desire/SR/Attribution/L1 as sole source → reject / no assert**.  
4. **Writer consumption:** when asserted, realization path can see Y; Writer cannot mint Intent.  
5. **No Choice / Option / Agency object** required for assert.  
6. **Attribution PASS does not assert Intent.**  
7. **SR update alone does not assert Intent.**

---

## I. 对主生产链的最小影响面

| Area | Impact |
|------|--------|
| `applyCharacterSRAfterActual` | Untouched |
| `ensureActualEvents` | Untouched (no Intent mint) |
| Attribution soft wiring | Untouched |
| Plan / Director / Beat plan | Untouched as CONTROL; blocked as Intent source |
| Writer / Beat execution | **Minimal:** optional read of Action Intent Truth when asserted; no mint |
| Prompt compiler | **Minimal:** if Intent asserted, expose as STORY TRUTH realization cue — never as Plan substitute authority narrative that claims Writer invented Intent |
| Consequence / Survival / State Evolution | Untouched |

---

## J. 是否存在任何不可避免的冻结契约冲突

```text
INEVITABLE FREEZE CONFLICT: NONE IDENTIFIED
```

| Freeze | Compatibility |
|--------|----------------|
| OPEN-4 Intent(Y) SEALED | EO implements support for that proposition only |
| SR ≠ Intent (W4) | Carrier beside SR; SR not sole basis |
| Plan/Writer ↛ Intent authority (W1/R9/R10) | Forbidden sources + no Writer write-back |
| Actual ↛ Choice/Intent (W2) | No Actual→Intent mint |
| Attribution ≠ Choice; retrospective | Not used as producer |
| H3.3 GGC ≠ Action/Choice | GGC not used |
| #25b CO ↛ L1; CO not proven necessary | No Candidate Option |
| L1 VALID ↛ production Choice | L1 not used |
| Vertical Truth Route | Not altered; side bridge only |
| #08 no-Choice Action bypass | EO does **not** claim to close all bypasses; only adds legal path when CADE present |

**Known limitation (not a conflict):** Without CADE, production may still run Plan→Writer→Action (#08). This EO’s pass condition is the **existence of the legal bridge**, not elimination of every illegal continuation.

---

## STOP / Authorization

```text
EO-P4-Causal-Bridge-01 DESIGN: COMPLETE

SCOPE: minimal CADE → Action Intent(Y) STORY TRUTH → Writer consume
EXPANSION: NONE
DEEPER UNPROVEN SEMANTIC UNDER CADE: NONE (STOP not required)

CODE: NO
SCHEMA: NO
PROMPT: NO
RUNTIME: NO
NAMED EO: EO-P4-Causal-Bridge-01 (design only · Human auth required to implement)
IMPLEMENTATION: NOT AUTHORIZED

STOP: YES
```
