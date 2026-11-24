# 47 — H3.3 Grounded Goal Candidate Formation Design Audit

```text
MODE: DESIGN GATE · SEMANTIC AMENDMENT (Human Adjudication)
GATE: H3.3
DOC: 47_phase-4-h3-3-grounded-goal-formation-design-audit.md

STATUS: PASS WITH REQUIRED SEMANTIC AMENDMENTS · NOT YET SEALED
CODE MODIFIED: NO
SCHEMA / PROMPT / GOLDEN / RUNTIME: UNCHANGED
NAMED EO: NONE
Goal Engine / CharacterGoal object: NOT AUTHORIZED
Planner / 09 / Writer / Anchor / Replay Guard: NOT TOUCHED
Phase 5–10: FROZEN
#41: QUALIFIED / UNFIXED

UPSTREAM (Human Adjudication — frozen):
  H3.2 #46 = APPROVED / PASS WITH KNOWN LIMITATIONS / SEALED / STOP
  H3.1 #45 ontology SEALED · H3.0 #44 scope SEALED
  DG-042 SEALED · H2 #43 binding: SETTLED ACTUAL ↛ PENDING PLAN WITHOUT EXPLICIT BASIS
  4.4.1d-R SEALED · #35 Choice NOT PROVEN · V2.0 FROZEN · Phase 4 OPEN
  H3.3 body ACCEPTED · Seal deferred pending this amendment
```

**Single question:**

> Given H3.2-approved Goal-eligible evidence, what semantic conditions suffice to form a **Grounded Goal Candidate**, and when must the system remain **Unknown / No Grounded Goal**?

**Not this Gate:** Goal Engine · Character Goal Authority · Goal→Plan · Goal→Choice · #41 fix · schema · H3.4+.

---

## 1. Executive Summary

```text
Runtime Character Goal Formation     = ABSENT
Pseudo-Goal paths (Plan/Director/Reasoner) = PRESENT as Story Control / fuel
H3.2 provenance contract             = INHERITED · NO CONFLICT

Formation (this Gate) defines:
  Goal-eligible Evidence
    → (semantic conditions)
  Grounded Goal Candidate (GGC)
    ↛ Character Goal Authority (still NONE)
    ↛ Choice / Action / Plan identity
```

**Core formation rule (semantic — post-amendment):**

```text
GGC requires ALL of:
  F1  Agent-bound character-owned G-A
      (or semantically equivalent authored character-facing evidence —
       Goal-eligible only; ≠ Character Goal Authority)
  F2  Orientation is commitment / decision / character-endorsed obligation,
      not mere Desire / Pressure / external command / external constraint
  F3  Positive currentness within the Formation evaluation window
      (C-span = evaluation-relative; ≠ persistent active=true lifecycle)
  F4  No unresolved conflict / supersession / fulfillment that defeats the candidate
  F5  Non-Plan / non-inference source (H3.2 B3–B4)

External pressure / command / recognized necessity alone ≠ Character Goal
Desire / Behavior / SR / Plan / H2 alone → NO GROUNDED GOAL or UNKNOWN
must(X) ≠ character-owned goal(X) without ownership + self-endorsement
```

**Verdict:** PASS WITH REQUIRED SEMANTIC AMENDMENTS · **NOT YET SEALED** · IMPLEMENTATION NOT AUTHORIZED · HUMAN ADJUDICATION REQUIRED · STOP

---

## 2. Archaeology Scope

| Checked | Result |
|---------|--------|
| Conflict with H3.2 SEALED | **NONE** — H3.3 fills Formation deferred by #46 §B/§C |
| Conflict with H2 / DG-042 / L1 / 4.4.1d-R | **NONE** |
| Doc `47_*` pre-existing | **NONE** — this file is new |
| Code / schema / prompt changed | **NO** |

---

## 3. Existing Goal-like Paths

### 3.1 Is there real Goal Formation?

```text
Prose → extraction → character orientation → Desire → Goal → continuation
```

| Layer | Exists? | Type |
|-------|---------|------|
| Code path forming Character Goal | **NO** | — |
| Typed Goal evidence from Prose | **NO** | Actual = action/presence, not Goal |
| Prompt “本章目标 / Scene 目标” | **YES** | **Plan** (`intent.mainGoal` / `scene.goal`) |
| Planner `mainGoal` / 09 | **YES** | **Authorial / Story Control** |
| Reasoner `desire` | **YES** | **Fuel** (bible or `world_pressure.event`) |
| Director desire / priorityGoal | **YES** | **Ops densifier** / Plan pass-through |
| SR Goal slot | **NO** | awareness/belief/stance/motive only |
| CharacterGoal object / Authority | **ABSENT** | H3.2 confirmed |

**Document-only:** H3.0–H3.2 design semantics. **Must not treat docs as runtime capability.**

### 3.2 Misread-as-Formation chains (record only)

| SOURCE → TRANSFORMATION → DESTINATION | SEMANTIC TYPE | AUTHORITY |
|----------------------------------|---------------|-----------|
| `chapterTask`/`09` → `planChapter` → `intent.mainGoal` → Writer | Plan / Story Control | Authorial |
| `scene.goal` → `derivePriorityGoal` → Beat/Writer | Plan pass-through | Authorial |
| `scene.goal` ← empty → `intent.mainGoal` fill (`buildPlanFromScene`) | Plan fallback | Authorial |
| Bible `目标` → Reasoner `desire` | Seed → fuel | **Not** Character Goal |
| `world_pressure.event` → Reasoner `desire` | **Plan laundering risk** | Forbidden as Goal |
| Director `buildCharacterDesireProfile` → Beat densifier | Explicit or `missing` | Ops fuel |
| `characterFacing.motive` / authored motive → minimal-sr | Authored SR cue | **Not** Goal; scene goal **explicitly excluded** |
| Actual → SR awareness | Occurrence → SR | Context only |
| `open_loop:*` → evolution | Storage | Unread |
| LLM / ReaderSim polish | Inference | Forbidden Goal Authority |

**Suspected pollution patterns (no fix):**

```text
Plan → Character Goal          FOUND as risk (#41 G-H/G-A′)
Desire → Character Goal        FOUND as fuel confusion (Reasoner/Director)
SR → Character Goal            NOT FOUND as auto; FORBIDDEN if added
Behavior → Character Goal      NOT FOUND as miner; FORBIDDEN
LLM inference → Character Goal FOUND as Writer fill risk; FORBIDDEN Authority
H2 replay → Character Goal     NOT FOUND as code; FORBIDDEN semantically
```

### 3.3 Explicit non-formation hardening already in code (evidence)

- `derivePriorityGoal`: no desire/mainGoal competition; empty > fake complete  
- `deriveSceneChoice`: no goal+fear synthesis of Choice  
- `minimal-sr`: chapter/scene goal **NOT** character Motive; bible seeds `activates_current_motive: false`  
- These protect **Choice/Motive pollution**, not Character Goal Formation (which still **does not exist**)

---

## 4. H3.2 Contract Inheritance

| H3.2 rule | H3.3 use |
|-----------|----------|
| G-A = Goal-eligible evidence only | **Input** to Formation |
| G-A′ Plan/09 = NOT eligible | **Hard exclude** |
| G-B Desire-eligible only | May **corroborate**; never sole GGC |
| G-C not default eligible | **Corroboration only** under §12 |
| G-D inference FORBIDDEN Authority | **Cannot** form GGC |
| G-E…G-J sole → No Grounded Goal | **Inherited** |
| B1–B6 eligible bundle | **Necessary but not sufficient** for GGC |
| Currentness Unknown legal | **Inherited**; Formation may refuse GGC |
| Character Goal Authority = NONE | **Unchanged** |

```text
NO CONFLICT WITH H3.2 → proceed
```

---

## 5. Goal Formation Semantic Model

### 5.1 Three layers (mandatory)

| Layer | Meaning | H3.3 may produce? | Runtime today |
|-------|---------|-------------------|---------------|
| **1. Goal-eligible Evidence** | H3.2-approved cues (esp. G-A) | Input | Partial (prose only) |
| **2. Grounded Goal Candidate (GGC)** | Semantically formed, non-authoritative candidate orientation | **YES — design only** | **ABSENT** |
| **3. Character Goal Authority** | Production mint / store / consumer | **NO** | **NONE** |

```text
Eligible Evidence ↛ automatic GGC
GGC ↛ Character Goal Authority
GGC ↛ Choice ↛ Action ↛ Plan identity

Human-authored character-facing evidence
  = Goal-eligible Evidence (H3.2)
  ≠ Character Goal Authority
  ≠ automatic GGC / automatic Character Goal
```

### 5.2 Formation operators (semantic, not API)

```text
ORIENTATION_CLASS ∈ {
  desire, concern,
  commitment, decision, character_endorsed_obligation,
  external_constraint, external_command, external_pressure, recognized_necessity,
  plan_task, narrator_gloss, hypothesis
}
AGENT_BINDING ∈ { named_character, ambiguous, plan_voice, scene_blob }
OWNERSHIP ∈ { character_owned, external, mixed_or_unclear }
CURRENTNESS ∈ { current, historical, fulfilled, blocked, weakened, abandoned, superseded, unknown }
CONFLICT ∈ { none, unresolved_conflict, multiple_unresolved }
```

**must(X) boundary (amendment):**

```text
Surface “必须 / 得 / 必须做 X”
≠ Character-owned Goal

Distinguish:
  External Constraint / External Command / External Pressure
  Recognized Necessity          (knows must(X) but no self-endorsed orientation)
  Character-owned Commitment    (commitment / decision / character-endorsed obligation)

Only character ownership + commitment/decision/self-endorsed orientation
  → may count as G-A / GGC input
If ownership cannot be determined → UNKNOWN (no inference fill)
```

GGC only when:

```text
ORIENTATION_CLASS ∈ { commitment, decision, character_endorsed_obligation }
  ∧ OWNERSHIP = character_owned
  ∧ AGENT_BINDING = named_character
  ∧ CURRENTNESS ∈ { current }   // evaluation window; see §8 C-span
  ∧ CONFLICT = none
  ∧ source satisfies H3.2 B1–B4, B6
  ∧ NOT solely external_constraint|command|pressure|recognized_necessity
```

```text
External pressure ≠ Character Goal
External command ≠ Character Goal
Recognized necessity ≠ Character Goal
Desire ≠ Character Goal
Behavior ≠ Character Goal
```

unless independent character-owned orientation evidence exists.

---

## 6. Desire → Goal Analysis (H3.3-A)

| Language class | Examples | Alone → |
|----------------|----------|---------|
| Desire / want | 想要 / 希望 / 不愿 X | **G-B → NO GROUNDED GOAL** |
| Concern | 在意 / 担心 | **NO GROUNDED GOAL** |
| Soft wish | 要是能… | **Desire / Unknown** |
| External must | 「他们逼我离开」「父亲命令我离开」 | **NOT G-A**; **NO GGC** (unless separate ownership evidence) |
| Recognized necessity | 「如果不离开我就会死」without self-endorsement | **NOT automatic GGC**; often **UNKNOWN** |
| Character-endorsed obligation | 「我必须离开」**with** clear self-endorsement / ownership | **G-A-eligible** only if OWNERSHIP=character_owned; else **UNKNOWN** |
| Decision / commitment | 「我决定…」「没人逼我。我要…」 | **G-A-eligible**; GGC if F1–F5 |
| Future prediction | 我会… (narrator/character) | **Ambiguous** — often **Unknown** without decision force |
| Plan task | 下一章寻找… | **G-A′ → NO GROUNDED GOAL** |

**Forbidden auto-rules:**

```text
出现 want/想/希望 → Goal          FORBIDDEN
出现 必须/得 → Goal               FORBIDDEN
强烈 Desire → Goal                FORBIDDEN
Desire + intensity → GGC          FORBIDDEN
Desire + G-C behavior → GGC       FORBIDDEN without G-A commitment
must(X) → character-owned goal    FORBIDDEN without ownership proof
```

**Desire may become GGC-eligible only if** upgraded by **separate** commitment/decision / character-endorsed language (new G-A) — not by Desire intensity alone. Authored character-facing blocks remain **eligible evidence only** (§7.1).

---

## 7. Explicit Goal Language ≠ Automatic GGC

| Surface text | Voice check | Result |
|--------------|-------------|--------|
| 「苏晚决定找到老何。」 | Character-attributed prose | **Eligible**; **GGC if currentness+no conflict+ownership** |
| 「我要找到他。」 (in dialogue, named speaker) | Character | Same |
| 「下一章苏晚寻找老何」 | Plan/09 | **NO GROUNDED GOAL** |
| 「本章让苏晚去找老何。」 | Authorial task / Plan | **NO GGC** (name≠ownership) |
| 「本章目标：交钥匙」 | Plan | **NO** |
| 「苏晚现在要找到老何。」 (author task voice) | Authorial / Plan-like | **NOT automatic Goal**; G-A only if truly character-facing + non-task ownership; else **NO GGC** |
| 「她必须离开」（narrator / external must） | Narrator / unclear ownership | **Unknown / No GGC** |
| 「父亲命令我今晚离开。」 | External command | **NOT automatically GGC** |
| 「没人逼我。我决定今晚离开。」 | Character-owned commitment | **G-A + current + no conflict → GGC** |
| LLM paraphrase of Plan as “她想…” | Inference | **FORBIDDEN** as GGC source |
| Authorial bible 「目标：…」 | Seed G-I | **NO** current GGC |

```text
Keyword detection ≠ semantic grounding
「目标」「goal」「我要」「必须」 alone ≠ GGC
Character name in authorial task ≠ G-A
```

### 7.1 Human-authored character-facing evidence (H3.2 inheritance)

```text
Human-authored character-facing evidence
  = Goal-eligible Evidence
  ≠ Character Goal Authority
  ≠ automatic Character Goal / automatic GGC
```

**Forbidden laundering (#41-class):**

```text
Author writes: “苏晚现在要找到老何。”
  ↓ automatic Character Goal     FORBIDDEN
```

May count as G-A / enter Formation **only if** the text itself satisfies:

```text
character-facing
+ agent-bound
+ non-Plan
+ non-task
+ semantic ownership (character-owned)
```

**Even with the character’s name, the following remain Plan / Story Control — NOT G-A:**

```text
Authorial task wording · authorial Plan wording
chapterTask · mainGoal · scene.goal · 09 · Writer instruction
```

| Anti-example | Layer | Formation |
|--------------|-------|-----------|
| 「本章让苏晚去找老何。」 | Plan / task | **NO GGC** |
| 「苏晚决定去找老何。」 | Character-bound orientation | **GGC candidate** if currentness/conflict/ownership hold |

---

## 8. Currentness Semantics

### 8.1 Asymmetry (frozen)

```text
No evidence Goal ended     ≠  evidence Goal still active
No currentness evidence    ≠  abandonment
```

### 8.2 Positive currentness evidence (sufficient classes)

| Class | Examples | Notes |
|-------|----------|-------|
| **C-now** | 仍要 / 还要 / 我还必须 / 我没有放弃 / 再次明确「我要…」 | Strong |
| **C-span** | G-A uttered in **current scene** under evaluation | Same-span = **current for this Formation evaluation window only** |

### 8.2.1 C-span scope (amendment)

```text
C-span current
  ≠ persistent active Goal
  ≠ active=true
  ≠ lifecycle state

Currentness here is evaluation-relative,
not persistent runtime lifecycle.
No lifecycle schema in H3.3.
```
| **C-chapter** | G-A in **current chapter** with no later voiding evidence | Weaker than C-now; if only early chapter + long silence → often **Unknown** |

### 8.3 Behavior and currentness

```text
Consistent actions with orientation = corroboration ONLY (needs G-A)
≠ positive currentness alone
≠ GGC alone
```

### 8.4 Outcomes

| Situation | CURRENTNESS | Formation |
|-----------|-------------|-----------|
| G-A this scene | current | May GGC |
| G-A prior chapter; silence; no fulfill | **unknown** | **UNKNOWN** or eligible+CURRENTNESS=UNKNOWN → **not confirmed GGC** |
| G-A + C-now | current | May GGC |
| End-state Actual achieved | fulfilled | **HISTORICAL / FULFILLED** |
| Explicit 「不管了/放弃」 | abandoned | **ABANDONED** |
| New incompatible G-A | superseded (if clear) | Old **SUPERSEDED**; new evaluated alone |
| Explicit block without abandon | blocked | **BLOCKED** (not GGC pending act) |

**Default when prior G-A + no new evidence:**

```text
Historical + CURRENTNESS=UNKNOWN
→ NO GROUNDED CURRENT GOAL (confirmed)
→ NOT abandoned by default
→ NOT still-active by default
```

---

## 9. Historical / Fulfilled / Abandoned / Superseded

### 9.1 Fulfillment

```text
FULFILLED only if:
  Goal candidate's target / end-state
        ↕
  Actual-established satisfying state
  (semantic satisfaction of that same target)
```

**Must distinguish:**

```text
Goal target
vs partial progress
vs incidental occurrence
vs thematic similarity
vs narrator implication
```

**NOT automatically Fulfilled:**

```text
partial progress
similar event
incidental occurrence
symbolic / thematic resemblance
LLM inference
narrator implication without Actual grounding
```

```text
If (and only if) Actual-established state satisfies the candidate's target/end-state
→ HISTORICAL / FULFILLED
→ must NOT remain Pending GGC for same orientation
```

Aligns with H2: settled occurrence ↛ pending Plan task; similarly **fulfilled orientation ↛ current GGC**.

```text
FULFILLED ≠ invent next Goal
```

H2 independence: fulfillment evidence ≠ invent next Goal.

#### False-positive counterexample (amendment C)

```text
Goal candidate: 「我要找到老何。」
Actual: 「苏晚在车站看到一个陌生老人。」
→ NOT FULFILLED
（semantic similarity / LLM guess ≠ target satisfaction）
```

### 9.2 Abandonment

**Sufficient (semantic):** explicit character-bound abandon / renounce language.

**Insufficient:** temporary silence · chapter change · Plan change · Writer shift · soft Anchor ban.

### 9.3 Supersession

```text
Old G-A₁ + new clear G-A₂ (same agent, incompatible ends)
→ A₁ SUPERSEDED; evaluate A₂ under Formation
```

**Insufficient for supersession:** Plan changed · Scene changed · Chapter changed · Writer changed · Director densifier changed.

### 9.4 Weakened / Blocked

Require explicit prose (or clear Actual constraint). Else **Unknown** — do not invent.

---

## 10. Conflicting Evidence

| Pattern | Result |
|---------|--------|
| G-A “我要救他” then G-A “算了，我不管了” (same agent, later) | Later wins if clear → **ABANDONED** or new eval; if timing unclear → **UNKNOWN** |
| Two concurrent incompatible G-A same scene | **MULTIPLE / UNRESOLVED** or **UNKNOWN** — **do not pick one** |
| G-A vs Plan task | Plan ignored for Formation; G-A evaluated alone |
| G-A vs fulfilled Actual | Prefer **FULFILLED** over pending GGC |

```text
System convenience must not force a single GGC under conflict
```

---

## 11. G-C Behavioral Corroboration

**Inherited:** `Repeated behavior ≠ Goal`.

| Role of G-C | Allowed? |
|-------------|----------|
| Sole formation input | **FORBIDDEN** |
| Corroborate existing G-A currentness | **CONDITIONAL** — never upgrades Desire→GGC alone |
| Infer intention then Goal | **FORBIDDEN** (inference laundering) |

```text
behavior → inferred intention → Goal   FORBIDDEN
G-A + consistent behavior              may support CURRENTNESS confidence in H3.4+ research;
                                       H3.3: still requires F1–F5; G-C optional weak corroborator
```

---

## 12. SR Relationship

| SR slot | Support Goal evidence? | Auto → GGC? |
|---------|------------------------|-------------|
| Awareness | Context (knows fact) | **FORBIDDEN** |
| Interpretation | Context | **FORBIDDEN** |
| Belief | Context | **FORBIDDEN** |
| Stance | Context | **FORBIDDEN** |
| Relevance | Context | **FORBIDDEN** |
| Motive (authored) | Seed/cue | **FORBIDDEN** as GGC alone; ≠ Plan goal |

```text
SR ≠ Goal
belief/stance/relevance → Goal   FORBIDDEN
```

---

## 13. H2 / H3 Separation

| Claim | Status |
|-------|--------|
| Settled Actual ↛ Pending Plan | H2 — holds |
| Settled Actual → Character Goal | **FORBIDDEN** |
| Replay blocked → Goal exists | **FORBIDDEN** |
| H2 cannot continue → invent Goal | **FORBIDDEN** |
| Fulfilled Actual voids matching pending GGC | **ALLOWED** (fulfillment), still ≠ invent next Goal |

```text
H2 = Continuation Authority (settlement vs pending Plan)
H3.3 = Formation of GGC from character-owned evidence
Independent · no laundering either direction
```

---

## 14. Formation Decision Matrix

| Evidence | Currentness | Conflict | Result |
|----------|-------------|----------|--------|
| G-A explicit orientation | clear current | none | **GROUNDED GOAL CANDIDATE** |
| G-A historical | unknown | none | **UNKNOWN** / **NO GROUNDED CURRENT GOAL** |
| G-A + G-B | current | none | **GROUNDED GOAL CANDIDATE** (G-A drives; G-B corroborates) |
| G-B only | current | none | **NO GROUNDED GOAL** |
| G-C only | repeated | none | **NO GROUNDED GOAL** |
| G-A conflicting | unknown | yes | **UNKNOWN** or **MULTIPLE / UNRESOLVED** |
| G-A fulfilled | fulfilled | none | **HISTORICAL / FULFILLED** |
| G-A + abandonment | abandoned | none | **ABANDONED** |
| G-A + superseding G-A | superseded | yes | Old **SUPERSEDED**; form new row for successor |
| G-E SR only | current unknown | none | **NO GROUNDED GOAL** |
| G-F pressure only | current | none | **NO GROUNDED GOAL** |
| G-G open loop only | current | none | **NO GROUNDED GOAL** |
| G-H old Plan only | current | none | **NO GROUNDED GOAL** |
| G-D LLM inference only | current | none | **NO GROUNDED GOAL** |
| H2 replay blocked | unknown | none | **NO GROUNDED GOAL** |
| G-A′ Plan language as “goal” | any | none | **NO GROUNDED GOAL** |
| Narrator gloss without agent binding | any | none | **UNKNOWN** / **NO GROUNDED GOAL** |
| G-A + CURRENTNESS=UNKNOWN | unknown | none | **UNKNOWN** (not confirmed GGC) |
| External command / pressure (“父亲命令我离开”) | any | none | **NO GROUNDED GOAL** (not automatic GGC) |
| Character-owned commitment (“没人逼我。我决定今晚离开。”) | clear current | none | **GROUNDED GOAL CANDIDATE** |
| Thematic/similar Actual vs Goal target | — | — | **NOT FULFILLED** (see §9.1) |

---

## 14.1 Minimum counterexamples (Human Adjudication)

### A. External obligation

```text
「父亲命令我今晚离开。」
→ NOT automatically GGC
→ external_command / unclear character-owned commitment
```

### B. Character-owned commitment

```text
「没人逼我。我决定今晚离开。」
→ G-A + current + no conflict → GGC
```

### C. Fulfillment false positive

```text
Goal: 「我要找到老何。」
Actual: 「苏晚在车站看到一个陌生老人。」
→ NOT FULFILLED
```

---

## 15. Unknown / No Grounded Goal Rules

```text
Unknown and No Grounded Goal are LEGAL outcomes
Insufficient evidence ↛ infer ↛ Goal
Story may continue without GGC:
  wait | observe | authorial non-goal continuation | other world events
```

**H3.3 does not design** continuation runtime — only affirms semantic allowance of not-knowing.

---

## 16. Formation Pollution Audit

| Path | Status | Reason |
|------|--------|--------|
| Plan → Goal | **FORBIDDEN** | G-A′ / Story Control |
| 09 → Goal | **FORBIDDEN** | Same |
| chapterTask → Goal | **FORBIDDEN** | Same |
| mainGoal → Goal | **FORBIDDEN** | Planner intent |
| scene.goal → Goal | **FORBIDDEN** | Plan scene task |
| Writer Context → Goal | **FORBIDDEN** | Realization fuel ≠ Formation Authority |
| Reasoner → Goal | **FORBIDDEN** | Fuel; may launder Plan |
| Director → Goal | **FORBIDDEN** | Ops densifier / missing |
| world_pressure → Goal | **FORBIDDEN** | Plan/world task |
| Open Loop → Goal | **FORBIDDEN** | Unowned storage |
| Survival → Goal | **FORBIDDEN** | Phase 6 frozen; Goal ≠ sole Survival upstream |
| SR → Goal | **FORBIDDEN** | Context only |
| Behavior → Goal | **FORBIDDEN** alone; **CONDITIONAL** corroboration with G-A |
| LLM inference → Goal | **FORBIDDEN** | G-D |
| H2 replay failure → Goal | **FORBIDDEN** | Settlement ≠ orientation |
| External command/pressure → Goal | **FORBIDDEN** | must(X) ≠ character-owned goal |
| Authorial task with character name → Goal | **FORBIDDEN** | Plan/task laundering (#41-class) |
| Partial/thematic Actual → Fulfilled | **FORBIDDEN** | Need target/end-state satisfaction |

---

## 17. Open Semantic Questions (→ later Gates, not answered here)

1. Exact threshold: early-chapter G-A + mid-chapter silence → Unknown vs weak C-chapter (H3.4?)  
2. How strong must C-now language be across dialects/genres?  
3. Competing GGC adjudication UI / Human (not L1 Choice)  
4. Whether GGC list is stored or ephemeral judgment  
5. Goal → Continuation Candidate mapping (**H3.5**, unproven)  
6. Whether CharacterGoal **object** is irreplaceable (**Necessity Gate**, #35 discipline)  
7. Typed Prose→G-A extraction quality (depends on #41-002; **UNKNOWN** capability)  

Any conclusion needing unimplemented extractors stays **UNKNOWN**, not filled by invention.

---

## 18. Implementation Preconditions

Before any Named EO for Formation-related code:

```text
1. Human Seal H3.3 Formation Decision Matrix
2. H3.4 Lifecycle (if currentness operationalization required) — not started
3. Necessity proof if claiming CharacterGoal object
4. Explicit non-goals: no Plan consumer, no Choice mint, no #41 silent repair via Goal
5. Named EO with regression + literary validation plan
```

```text
H3.3 alone DOES NOT authorize implementation
```

---

## 19. STOP Conditions

```text
❌ Do not enter H3.4 Lifecycle automatically
❌ Do not enter H3.5–H3.6 Goal→Plan
❌ Do not create Goal Engine / schema / CharacterGoal object
❌ Do not patch Planner / 09 / Writer / Reasoner / Director
❌ Do not fix #41
❌ Do not open Phase 5 / Survival / L1 production
```

---

## 20. Verdict

```text
H3.3 DESIGN AUDIT — SEMANTIC AMENDMENT COMPLETE

Code modified: NO
Schema modified: NO
Prompt modified: NO
Runtime modified: NO
Golden modified: NO

Character Goal Authority: NONE
Goal Engine: NOT AUTHORIZED
#41: QUALIFIED / UNFIXED
Phase 5: FROZEN

H3.3:
PASS WITH REQUIRED SEMANTIC AMENDMENTS

SEALED:
NOT YET

HUMAN ADJUDICATION:
REQUIRED

STOP
```

**Amendments applied (this turn only):**

1. `must(X)` / obligation ≠ character-owned Goal without ownership + self-endorsement  
2. Human-authored character-facing = eligible evidence ≠ Authority; Plan/task with name ≠ G-A  
3. Fulfillment = Actual satisfaction of candidate target/end-state; false-positive counterexample  
4. C-span = evaluation-relative currentness ≠ persistent lifecycle / `active=true`  
5. Three minimum counterexamples A/B/C  

**Retained unchanged:** three-layer model · F1–F5 skeleton · currentness asymmetry · Unknown legal · conflict unresolved · G-C corroboration only · SR ≠ Goal · H2/H3 separation · pollution audit spine · Implementation NOT AUTHORIZED  

**Do not enter H3.4.**

---

## Appendix — Modified files this Gate

```text
AMENDED (semantic only): docs/design/phase-4.4/47_phase-4-h3-3-grounded-goal-formation-design-audit.md
CODE/SCHEMA/PROMPT/GOLDEN/RUNTIME: unchanged
OTHER FROZEN DOCS: untouched
```
