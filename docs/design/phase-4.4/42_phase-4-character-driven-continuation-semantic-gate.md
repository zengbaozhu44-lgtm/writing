# 42 — DG-042 Character-Driven Continuation Semantic Gate

```text
MODE: DESIGN GATE · SEMANTIC RESEARCH · READ-ONLY
GATE: DG-042
DOC: 42_phase-4-character-driven-continuation-semantic-gate.md

HUMAN SEAL: §14 — ontology walls SEALED; implementation NOT AUTHORIZED
NEXT: H2 (#43) · H3 Character Goal Necessity DEFERRED

CODE CHANGED = NO
SCHEMA / PROMPT / GOLDEN = UNCHANGED
EO IMPLEMENTATION = NOT AUTHORIZED
REPLAY GUARD / PLANNER FIX / WRITER FIX = NOT AUTHORIZED
STORY SURVIVAL / PHASE 5–7 = NOT AUTHORIZED
D1 = FROZEN · 4.4.1d-R = SEALED · FAILURE-041-001 = QUALIFIED (frozen; not fixed)

UPSTREAM:
  #35 Character Choice Necessity     = NOT PROVEN
  #36 Attribution consumer           = REGISTRY-ONLY
  #37 SR production consumption      = NOMINAL
  #38 State Evolution consumer       = NOMINAL / openLoops unread
  #39 Story-Truth mainline map
  #40–#41 Actual-enabled rebaseline
  FAILURE-041-001 Qualification      = Plan/chapterTask replay; Actual not consumed by Planner
```

**Single research question:**

> After an Actual occurs, how — without inventing character psychology, without treating SR as Choice, without treating Author Plan as Choice — can the system form a grounded answer to “what does this character want now?”, and from that let the story continue?

**Not this Gate:**

```text
❌ Fix FAILURE-041-001
❌ Replay Guard / ban Plan reuse
❌ Patch Planner / 09 / Anchor / Writer
❌ Implement Character Goal Engine
❌ Mint Choice / Candidate Option / L2
❌ Open Story Survival / Phase 5–7
❌ Auto-generate Goal or Choice every chapter
```

---

## 0. Freeze line (Step 1)

```text
FAILURE-041-001 = QUALIFIED · NOT FIXED
4.4.1d-R        = SEALED
D1              = FROZEN
Phase 4         = OPEN
Phase 4.4       = NOT SEALED
Implementation  = STOP until Named EO after this Gate (if any)
```

Symptom-blocking (replay guard) is **forbidden** until this semantic chain is clear. Otherwise we only change *how* Plan keeps driving the story.

---

## 1. Two intents (corrected)

| Layer | Role | Authority for character interior? |
|-------|------|-----------------------------------|
| **Authorial Intent** (“作者希望发生什么”) | Upper narrative direction / constraint / fuel | **NO** — not character want |
| **Character Motive Core** (“故事中人物想发生什么”) | Object of this Gate | **YES — if and only if grounded** |

```text
Authorial Intent  ≠  Character Goal
Authorial Intent  ≠  Character Desire
Authorial Intent  ≠  Character Intention
Authorial Intent  ≠  Character Choice
```

AA20 already demotes Plan→Writer certificates. DG-042 asks the **next** question: what *should* drive continuation when Authorial Intent is only an upper bound.

---

## 2. Ontology walls (must not merge)

| Concept | Meaning (working) | Runtime today |
|---------|-------------------|---------------|
| **Belief** | Character holds proposition P | SR `belief` — **authored only**; Actual does **not** auto-mint |
| **Stance** | Attitude toward P (believes/suspects/…) | SR `stance` — **authored only** |
| **Desire** | Attractive end-state / want (may be unchosen) | Director `character-desire-engine` = **explicit authored/DNA projection**; else `missing`. Causal Reasoner may **launder** bible/`world_pressure.event` as desire fuel ≠ Authority |
| **Character Goal** | Currently active end the character is oriented toward | **NO production semantic object** |
| **Intention** | Commitment to pursue a means toward a goal | **NO production object** |
| **Choice** | Formation / selection among options under Access∧Agency | L1 Observer = **test-only** Question A; Choice object **NOT PROVEN** (#35) |
| **Action / Occurrence** | What happened in prose | Actual / StoryEvent |
| **Attribution** | Who-as-subject did it | Soft Gate → Registry; **no production read** (#36) |

```text
Desire ≠ Intention ≠ Choice ≠ Action ≠ Attribution
Belief ≠ Stance ≠ Goal
Pressure ≠ Choice · Conflict ≠ Choice · Plan ≠ Choice · Expected Action ≠ Choice
```

Bible `目标` / `extractMotiveSeedsFromBible` = **long-term seeds only** — `minimal-sr.js` explicitly: never auto-current Motive.

---

## 3. Q1 — After Actual, what changed for characters? (fact layer)

```text
Actual → World / Character-relevant State   = FACT LAYER
禁止：Actual → “所以主角肯定想……”
```

### 3.1 Designed path (code)

```text
Prose → ensureActualEvents → StoryEvent[]
  → evolveFromChapter → timelineEvents / characterHints / worldHints / openLoops
  → Canon 11_timeline + soft 08 (via MemoryUnit)
```

| Output | Semantic | #41 key handoff |
|--------|----------|-----------------|
| `timelineEvents` | Occurrence strings for Canon | Noise (`她：转身`, presence blobs) — **not** clean “钥匙已交老何” |
| `characterHints` | Actor-tagged action crumbs | Actors often `她` / `场面` |
| `worldHints` | From `stateChanges` | Weak (`action:她:转身`, `presence:…`) |
| `openLoops` | Only if `stateChanges` contains `open_loop:*` | **`[]`** |

### 3.2 Semantic worksheet (ideal handoff, not code claim)

If Actual were clean “苏晚把钥匙交给老何”:

| Question | Fact-layer answer (example) |
|----------|-----------------------------|
| 谁获得了什么？ | 老何：配电间备用钥匙占有 |
| 谁失去了什么？ | 苏晚：对该钥匙的独自掌控 |
| 谁知道了什么？ | 苏晚、老何（参与者）；在场者可能目击 |
| 谁不知道？ | 未出场者；未告知的第三方 |
| 关系？ | 邻里协作/撕破脸后的勉强合作 — **needs evidence**, not invented |
| 资源/约束？ | 苏晚开配电间侧门的能力依赖老何；周四三点约定悬着 |
| 目标是否“因此改变”？ | **NOT a fact-layer conclusion** — only: prior resource/constraint changed |

### 3.3 Verdict Q1

```text
Actual → State Evolution WRITE PATH = EXISTS (nominal)
Actual → usable character-relevant settled facts for continuation = FAIL on #41 quality
+ openLoops unread (#38) = STORAGE WITHOUT CONSUMER
```

**Gap at Q1 is partially extraction quality + partially “no consumer of settled facts,” not yet “need Character Goal.”**

---

## 4. Q2 — How does Actual enter Character SR?

```text
Actual → Information Boundary → Perception → Interpretation → Belief/Stance → Character SR(t)
```

### 4.1 What code actually does (`updateCharacterSRFromActual`)

| Slot | From Actual (+ IB)? | From authored bags? |
|------|---------------------|---------------------|
| **relevance** | YES (actor/witness) | optional override |
| **awareness** | YES (grounded excerpt/action if accessible) | optional |
| **interpretation** | **NO auto from Actual** | authored only |
| **belief** | **NO auto from Actual** | authored only |
| **stance** | **NO auto from Actual** | authored only |

IB rule: actor / affected / same-scene present witness (`characterCanAccessActualEvent`).

Forbidden SR fact bags: causal_chain, Situation/Desire belief, Plan, Living, heroKnows, Writer intention, etc.

### 4.2 Know vs Think (must stay split)

```text
Reality (World / Actual):     老何拿到了钥匙
A perceives (awareness):      老何拿了钥匙   ← may be grounded from Actual if IB ok
A interprets:                 …             ← NOT auto; omit unless authored
A believes:                   …             ← NOT auto
A stance:                     …             ← NOT auto
```

Illegal leap:

```text
A believes X  ⇒  A wants Y  ⇒  A chooses Z
```

### 4.3 #41 SR reality

```text
character_sr/ch_0001.json → characters: {}
```

So even the **awareness** path did not land usable per-character SR for continuation. Cross-chapter SR load = current chapter sidecar only (#37).

### 4.4 Verdict Q2

```text
Actual → SR awareness/relevance PATH = DESIGNED
Actual → interpretation/belief/stance = NOT AUTO (correct freeze)
Production SR → next chapter = NOMINAL / EMPTY on #41
SR ≠ Choice · SR ≠ Goal   (intact)
```

---

## 5. Q3 — What is “人物想要什么”?

### 5.1 Candidate sources (semantic inventory — not fields)

| Source | May inform Desire/Goal? | Risk |
|--------|-------------------------|------|
| Current need (漏水未修) | YES if evidenced | Inventing urgency |
| Long-term bible goal | Seed only | Promoting seed → current Motive |
| Interest / values / fear | Seed / authored | LLM psychology fill |
| Relationship change | If evidenced | Inventing trust |
| Unfinished obligation (周四三点) | YES as **world/open fact** | Treating as Choice |
| Past promise | If in Actual/SR | Plan restating promise as new Choice |
| Identity | Seed | — |
| Future expectation | Thin | Fiction |

### 5.2 Required distinctions

```text
Character Desire     = want / attraction (may be passive, conflicting, unacted)
Character Goal       = currently active orientation (still ≠ Choice)
Character Belief     = held proposition
Character Stance     = attitude toward proposition
Character Intention  = committed means (still ≠ Choice)
Character Choice     = Access∧Agency formation / selection (L1 / future object if ever)
```

### 5.3 Runtime inventory (honest)

| Mechanism | Is it Character Goal Authority? |
|-----------|----------------------------------|
| `03` bible 目标 / motive seeds | **NO** — seeds |
| Director `buildCharacterDesireProfile` | **NO** — explicit projection or `missing`; ops densifier |
| Causal Reasoner `desire` | **NO** — may copy bible or **world_pressure.event** (Plan/task) → **BOUNDARY RISK** as narrative fuel |
| Plan `mainGoal` / scene.goal | **Authorial / Director task** ≠ Character Goal |
| SR slots | Belief/stance/awareness — **no goal slot** |
| Evolution openLoops | Storage only; unread |

```text
Semantic position for “人物当前朝向什么” = NEEDED IN CONTINUATION STORY
CharacterGoal runtime object / formation engine   = NOT PROVEN
Production grounded Goal path                     = ABSENT (as path, not as proven module debt)
```

### 5.4 Verdict Q3

The deepest **semantic** hole for “人物驱动继续” is not “Planner validity” alone — it is the **unanswered position**:

```text
Continuation must eventually face “人物当前朝向什么” with:
  · grounding from Actual + SR + State when evidence allows
  · Unknown / missing legal
  · forbidden Plan-fill
  · still not a Choice
```

This does **not** prove a `CharacterGoal` runtime object (#35 discipline).  
**Semantic gap ≠ runtime object ≠ module necessity ≠ implementation.**

---

## 6. Q4 — Goal → action possibility (without minting Choice)

Frozen analytic chain:

```text
Goal
 → Candidate Options
 → Access
 → Agency
 → Choice (L1 Question A = evidence only; production mount NOT AUTHORIZED)
 → Action
 → Actual
```

**Illegal compressions:**

```text
Goal → Choice
Goal → Action
Pressure → Choice
Conflict → Choice
Plan → Choice
Expected Action → Choice
SR → Choice
```

**What “want X” must mean in DG-042:**

> At most: a **non-authoritative**, evidence-bounded orientation (Desire/Goal candidate), which may open an **option space** for later observation — never a minted Choice, never a Writer certificate that “the character chose.”

L1 remains: observes Formation evidence in prose; does **not** create Choice records; production mount **NOT AUTHORIZED** (#32).

Candidate Option / L2: **NOT AUTHORIZED** (#25 / #35).

---

## 7. Q5 — If the character wants nothing / Unknown

**Mandatory legal outcomes** (must remain representable):

```text
Goal exists
Goal changed
Goal blocked
Goal unresolved
No sufficiently grounded goal
Unknown
No action
Waiting
Observation only
```

**Forbidden design:**

```text
every chapter end → must emit Character Goal
                 → must emit Choice
                 → must continue story
```

That would be an **artificial plot engine** and would violate Unknown discipline (same family as D1 / Attribution UNKNOWN / L1 omit).

Continuation without Choice is already conceptually allowed (#35: not every Action requires Choice). Continuation without Goal must also be allowed — otherwise we invent motive to feed Plan.

---

## 8. Q6 — Author Plan’s place (last)

Expected shape (semantic, not implementation):

```text
                 Authorial Intent
                       │  direction / constraint / fuel (AA20)
                       ▼
Actual → State → Character SR → (Goal/Desire?) → Options? → L1? → Action → Actual
                       │
                       └──→ Director / Narrative Control (ops; ≠ Character interior Authority)
```

**Forbidden:**

```text
Author Plan → Character Goal
Author Plan → Character Choice
Author Plan → Character Belief (as fact)
```

**#41 observed shape (failure):**

```text
Authorial/seeded 09 + chapterTask
  → planNext derived Ch2 Plan
  → Writer Context
  → Prose replays completed handoff
```

Actual/SR/State did not adjudicate “already settled.” Anchor bans were soft notes only.

---

## 9. Sole validation case — Ch1 key → Ch2

### 9.1 What happened

```text
Author Plan (Ch1 authored yaml): 交钥匙 …
Prose (Ch1):                     交钥匙 (多次；含空钥匙包)
Actual:                          persisted, but NOT clean handoff event
State Evolution:                 noisy timeline; openLoops=[]
Character SR:                    characters {}
Authorial 09 seed (experiment):  still describes handoff as TODO
planNext (derived):              re-issues handoff as Ch2 goals
Writer:                          Case A — executes Plan (FAILURE-041-001)
```

### 9.2 Ideal semantic walk (if facts were clean)

| Step | Ideal | #41 actual |
|------|-------|------------|
| State change | 钥匙占有权：苏晚→老何；周四约定悬着；漏水未修 | Partial at prose; **not** clean in Evolution |
| Who affected | 苏晚、老何 | Prose yes; SR empty |
| Who knows | 双方 | No SR awareness record |
| Interpretation / Belief / Stance | **Unknown unless authored/evidenced** | omit / empty |
| Grounded Goal/Desire? | **Candidates only**, e.g. 苏晚仍要解决漏水；履行/等待周四；恢复掌控感 — each needs evidence | **No Goal layer**; Plan supplies “再交一次钥匙” |
| Candidate Options? | e.g. 等老何、催修、自己再碰阀、不管… | **NOT AUTHORIZED / absent** |
| Real Choice? | Only if prose later shows Access∧Agency formation | Ch2 Plan **forced** handoff replay ≠ Choice |
| Continue without Choice? | YES — waiting / observation / authorial soft direction **without** replaying settled act | System **re-planned the settled act** |

### 9.3 Where #41 actually breaks on this chain

```text
① Actual → clean State          WEAK / FAIL (quality)
② State → Character SR          FAIL (empty) + belief not auto (OK)
③ SR → Goal / Desire            ABSENT (no layer)
④ Goal → Options                ABSENT / NOT AUTHORIZED
⑤ Options → Access/Agency/L1    L1 test-only; unused in production
⑥ Choice                        NOT PROVEN / not formed as object
⑦ Continuation authority        Plan/09 WINS → REPLAY

Primary architectural break for “character-driven continue”:
  no grounded Character Goal path + Plan remains sole continuation issuer

Primary observed break for FAILURE-041-001 (already qualified):
  Plan/chapterTask replay without Actual consumption
```

These are **related but not identical**. Fixing only Planner replay without Goal semantics risks: Plan stops repeating handoff but still invents the next beat without character want. Inventing Goal from Plan is the other failure mode.

---

## 10. Three required conclusions

### A. Capabilities that already exist

| Capability | Status |
|------------|--------|
| Actual persistence | **YES** (#41) |
| State Evolution write | **YES** (nominal; quality/openLoops weak) |
| State → Planner/Director hard consume | **NO** (#38 / #41) |
| Actual → SR awareness/relevance | **DESIGNED**; **EMPTY on #41 run** |
| SR belief/stance from Actual | **NO (by design)** |
| SR → Writer soft fuel | **NOMINAL** (#37) |
| Character Goal formation | **NO** |
| Desire as Character Authority | **NO** (Director/Reasoner = ops/fuel) |
| Candidate Option space | **NOT AUTHORIZED** |
| Choice formation object | **NOT PROVEN** (#35); L1 test-only |
| Character-driven Continuation | **NO** |
| Authorial Plan → next chapter | **YES (dominant)** — cause of #41 replay |

### B. Truly missing semantic layer(s) (evidence-based)

Ordered by dependency (not implementation priority):

1. **Settled Actual → character-relevant State that continuation can respect**  
   (quality + consume; not Survival-by-default)

2. **Actual → SR perception that survives into next context**  
   (awareness path exists but failed empty / not cross-chapter)

3. **Continuation semantics needs a place to answer “人物当前朝向什么”**  
   (semantic position; Unknown must be legal; must not be Plan-filled; must not be Choice)  
   **≠ proven missing runtime layer / ≠ proven `CharacterGoal` object**

4. **Goal → option space** without Choice mint  
   (only after necessity of Goal semantics is proven; Candidate Option still NOT AUTHORIZED)

5. **Continuation policy when Goal/Choice = Unknown**  
   (waiting / observation / soft Authorial Intent without replaying settled Actual)

```text
Semantic gap (character orientation in continuation) = DISCOVERED
Runtime object (CharacterGoal)                    = NOT PROVEN
Independent module necessity                      = NOT PROVEN
Implementation                                    = NOT AUTHORIZED
```

```text
We thought the hole might be “Planner.”
Planner is the *issuer* of the bad continuation (#41).
“Why should the next beat happen?” is a separate question (character-driven).
Do NOT collapse them into one Goal Engine.
```

**Irreplaceable new module? NOT PROVEN this Gate.**  
Necessity of a distinct `CharacterGoal` object vs extending State/SR/continuation policy = **OPEN**; Human routes **H3 deferred** — see Human Seal.

### C. May we enter implementation?

```text
→ Named EO / Goal Engine / #41 fix = NOT AUTHORIZED
→ See §14 Human Seal for sealed walls + next Gate = H2
```

---

## 11. Hard non-actions

```text
❌ Code / schema / prompt / golden
❌ Replay Guard
❌ Planner / Writer / 09 / Anchor edits
❌ Story Survival / Phase 5–7
❌ Auto Goal every chapter
❌ Auto Choice every chapter
❌ Author Plan → Character Goal wiring
❌ Treat Director Desire / Reasoner desire as Character Goal Authority
❌ Reopen D1 / demote 4.4.1d-R
❌ Skip to Character Goal Engine because story “felt stuck”
```

---

## 12. Human options (adjudicated)

| Option | Content | Adjudication |
|--------|---------|--------------|
| **H1** | Seal DG-042 ontology walls | **DONE** — §14 |
| **H2** | Settled Actual vs next Plan authority | **NEXT** — open Gate `#43` |
| **H3** | Character Goal object necessity | **DEFERRED** (after H2) |
| **H4** | Leave research frozen only | Not selected |

**Proof order (frozen):**

```text
Irreducible Gap → Ontology → design ≠ Roadmap name → design → find use → Named EO
```

```text
#41 issuer failure  ≠  character-driven “why continue”
H2 answers the first; H3 (later) may address the second.
H2 complete ≠ Character-Driven Continuation achieved.
```

---

## 13. Pre-seal freeze (superseded by §14)

```text
DG-042 research draft completed; Human Seal follows.
FAILURE-041-001 remains QUALIFIED / UNFIXED.
```

---

## 14. Human Seal — DG-042

```text
╔══════════════════════════════════════════════════╗
║ DG-042 CHARACTER-DRIVEN CONTINUATION             ║
║                                                  ║
║ STATUS: SEALED (ontology walls + route)          ║
║ RESULT: SEMANTIC RESEARCH PASS                   ║
║         ≠ IMPLEMENTATION APPROVED                ║
║         ≠ CHARACTER GOAL ENGINE AUTHORIZED       ║
║                                                  ║
║ H1 walls     SEALED                              ║
║ H2           NEXT GATE (#43)                     ║
║ H3 Goal Nec. DEFERRED                            ║
║ #41          QUALIFIED / UNFIXED                 ║
║ D1 / L1 / 4.4.1d-R / Phase 5–7   FROZEN        ║
║                                                  ║
║                 STOP (this Gate)                 ║
╚══════════════════════════════════════════════════╝
```

**Date:** 2026-09-11  
**Human adjudication:** Seal core ontology walls; **do not** enter Character Goal Engine; **next = H2**.

### Sealed walls

```text
Authorial Intent ≠ Character Goal / Desire / Intention / Choice
Belief ≠ Stance ≠ Desire ≠ Goal ≠ Intention ≠ Choice ≠ Action ≠ Attribution
Desire ≠ Intention ≠ Choice
“人物想做什么” ≠ “人物已经决定做什么”
Unknown / No grounded goal / No action / Waiting / Observation = LEGAL
Plan ≠ Character Goal
Plan ≠ Character Choice
SR ≠ Choice
Pressure / Conflict / Expected Action ≠ Choice
```

### Explicit non-claims

```text
Semantic gap for “人物当前朝向什么” = ACKNOWLEDGED
CharacterGoal runtime object          = NOT PROVEN
Independent Goal module               = NOT PROVEN
Character-Driven Continuation closed  = NO
Named EO / code                       = NOT AUTHORIZED
```

### Formal route after this Seal

```text
DG-042 (sealed)
  → H2 Settled Actual vs Next Plan Authority (#43)
      prove: settled Actual must not be re-issued as pending Plan task without basis
      ≠ Goal Engine · ≠ Choice · ≠ Survival · ≠ Phase 5
  → STOP
  → H3 Character Goal Necessity (deferred; only after H2)
  → Named EO only if necessity proven
```

### Permanent continuation hard rule (sealed wording)

> Fixing only Planner replay without later Goal/character semantics risks: Plan stops repeating a settled act but still invents the next beat without character want.  
> **H2 ≠ Character-Driven.** H2 only establishes: already-happened must not be treated as not-yet-happened in continuation planning.

```text
CODE CHANGED BY THIS SEAL: NO
GOLDEN / SCHEMA / PROMPT: UNCHANGED
STOP
```
