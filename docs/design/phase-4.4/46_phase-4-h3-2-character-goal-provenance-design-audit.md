# 46 — H3.2 Character Goal Provenance Design Audit

```text
MODE: DESIGN GATE · READ-ONLY ARCHAEOLOGY + SEMANTIC DESIGN
GATE: H3.2
DOC: 46_phase-4-h3-2-character-goal-provenance-design-audit.md

CODE MODIFIED: NO
SCHEMA / PROMPT / GOLDEN / RUNTIME: UNCHANGED
NAMED EO: NONE
Goal Engine / CharacterGoal object: NOT AUTHORIZED
Planner / 09 / Writer / Anchor / Replay Guard: NOT TOUCHED
Phase 5–10: FROZEN
#41: QUALIFIED / UNFIXED

UPSTREAM (frozen inputs):
  V2.0 FROZEN · Phase 4 OPEN · 4.4.1d-R SEALED · #35 NOT PROVEN
  DG-042 SEALED · #44 H3.0 · #45 H3.1
  H2 premise: SETTLED ACTUAL ↛ PENDING PLAN WITHOUT EXPLICIT BASIS (#43 binding research)
```

**Single question:**

> What source, evidence, and semantic conditions allow a character’s current orientation to count as a **Grounded Goal Candidate** — and what must remain **Unknown / No Grounded Goal**?

**Not this audit:** Goal Engine · Goal→Plan · Goal→Choice · #41 fix · schema.

---

## A. Provenance Matrix

Legend:

- **Goal-eligible** = may enter H3.3 Formation as *evidence* (not Goal Authority)
- **Goal authority** = may mint production Character Goal — **none** today; H3.2 forbids auto-mint from all rows unless Human seals Formation later

| ID | Source | Producer | Authority (design) | Representation | Temporal scope | Character-owned? | Goal-eligible? | Max support (not Goal) | Must Unknown? | Forbidden promotion | Runtime path exists? |
|----|--------|----------|-------------------|----------------|----------------|-----------------|----------------|------------------------|---------------|---------------------|----------------------|
| **G-A** | Prose explicit **character** orientation (决定/要/必须…由 POV 或明确主体) | Writer→Prose | **None** (Occurrence evidence) | Text excerpt / future StoryEvent if extracted | Utterance time | **Yes** if POV/agent explicit | **Yes — Goal-eligible evidence only** | Orientation cue | If ambiguous agent or plan-voice | Plan-voice → Goal; narrator task → Goal | **PARTIAL** — Actual stores action/presence; **no** dedicated “character goal” field |
| **G-A′** | Plan / 09 / `chapterTask` / `mainGoal` / scene.goal | Planner / `writeNextChapterTask` | **Authorial / Story Control** | Task card YAML/MD | Chapter-scoped plan | **NO** (author/director task) | **NO** | N/A — **Plan** | Treat as Character Goal | Plan/09 → Character Goal | **YES** — dominant #41 path; **wrong layer** |
| **G-B** | Prose explicit Desire / Want (想/希望/不愿…) | Writer→Prose | None | Text / weak Actual | Scene | Yes if attributed | **Desire-eligible only** | Desire candidate | If only implied | Desire → Goal auto | **PARTIAL** — via prose; not typed Desire object |
| **G-C** | Persistent behavior / state pattern | Prose→Actual patterns; metrics | None | Repeated Actual / narrative pattern | Multi-scene | Uncertain | **CAUTION — not default eligible** | Hypothesis / pattern | Default without commitment language | Behavior → Goal unconditional | **PARTIAL** — timeline noise; **no** goal miner |
| **G-D** | System / LLM inference | ReaderSim / replan / model fill | **FORBIDDEN** | Generated text | N/A | N/A | **NO** | Hypothesis only | **YES** unless human-authored | Inference → Goal | **YES** as **fuel** (Director/Writer); **not** Goal Authority |
| **G-E** | SR: awareness / interpretation / belief / stance / relevance | `updateCharacterSRFromActual`; `assembleMinimalSR` | **SR projection ≠ Goal** | Sidecar slots | Scene/chapter sidecar | Subjective | **NO** (evidence context only) | SR slots | If slot empty | Belief/Stance/Awareness → Goal | **YES** write/read nominal; belief/stance **authored or omit**; Actual→awareness only |
| **G-F** | Situation / Pressure / Conflict (world or scene) | Plan, causal_chain, Director beats | **Story Control / fuel** | Plan obstacles, conflict strings | Scene/chapter | **NO** (world/task) | **NO** | Pressure narrative | **YES** as sole input | Pressure/Conflict → Goal | **YES** — Planner obstacles; Reasoner `world_pressure` |
| **G-G** | Open Loop / Survival hook | `stateChanges` `open_loop:*`; evolution blob | Storage only (#38) | String tags in evolution | Chapter+ | **Unclear ownership** | **NO** | Thread hook (future Phase 6) | Open Loop → Goal | **YES** write; **NO** production consumer |
| **G-H** | Previous Plan / `chapter_plans` / 09 / `chapterTask` | `planNextChapter`; seeded 09 | Authorial | Parsed 09 fields | Stale possible | **NO** | **NO** | Plan continuity | **YES** if only source (#41) | 09 → Character Goal | **YES** — #41 issuer |
| **G-I** | Bible / long-term motive / `03` 目标 | `loadCharacter`; `extractMotiveSeedsFromBible` | **Seed only** | Markdown fields | Series-long | Background | **NO** | Motive seed | **YES** as current Goal | Bible → current Goal | **YES** read; **`activates_current_motive: false`** |
| **G-J** | Director `character-desire-engine` / Reasoner `desire` | `buildCharacterDesireProfile`; `causal-reasoner` | **Ops / narrative fuel** | `externalGoal` or `missing` | Scene/chapter | Explicit authored only | **NO** | Desire profile or missing | If `missing` | Director/Reasoner → Character Goal | **YES** — explicit or missing; Reasoner may use **world_pressure.event** |
| **G-U** | Insufficient / contradictory / unavailable | — | None | — | — | — | **NO** | — | **YES — No Grounded Goal / Unknown** | Any → invent Goal | N/A |

### G-A deep check (required)

```text
Authorial Plan statement     ≠ Character Goal statement
“下一章寻找老何” (09/Plan)   → G-A′ → NOT Goal-eligible
“苏晚决定找到老何。” (Prose) → G-A → Goal-eligible evidence ONLY
Formation (H3.3) decides whether eligible evidence becomes Grounded Goal Candidate record
```

**No rule:** “contains 目标/goal keyword” ⇒ Character Goal.

### G-C deep check (required)

```text
Repeated Action ≠ Current Goal

Behavior may reflect: habit · coercion · reflex · environment · survival response ·
  unconscious pattern · stale historical goal · hidden cause · narrator reading

FORBIDDEN unconditional rule:
  Repeated behavior → CharacterGoal
```

G-C may **support** a hypothesis or ** corroborate** G-A/G-B **only** with separate commitment/orientation evidence — **not** in H3.2 Formation (deferred H3.3).

---

## B. Grounded Goal Candidate criteria (eligible evidence only)

**Not** final Goal formation. **Minimum bundle to enter H3.3 Formation Gate:**

| Criterion | Requirement |
|-----------|-------------|
| **B1 Source class** | At least one **G-A** (prose-attributed character orientation), **or** Human-authored **character-facing** goal block (same semantic as G-A, not Plan task) |
| **B2 Agent binding** | Orientation bound to **named character** (POV or explicit subject); not “场面” / Plan voice / narrator task |
| **B3 Non-Plan** | Evidence **not** solely from G-H / G-A′ / G-J world_pressure fallback |
| **B4 Non-inference** | Not solely G-D; not LLM-only paraphrase of Plan |
| **B5 Currentness hint** | See §C — at H3.2, if currentness **Unknown**, bundle is **Goal-eligible with CURRENTNESS=UNKNOWN**, not Grounded Goal Candidate **confirmed** |
| **B6 H2 independent** | Settlement / replay block does **not** add Goal evidence |

```text
Eligible evidence bundle (H3.2)
  = { G-A (or equivalent authored character-facing), optional corroborators }
  EXCLUDES { sole G-H, sole G-F, sole G-G, sole G-E, sole G-C, sole G-I, G-D alone }

Grounded Goal Candidate (confirmed) — NOT defined in H3.2
  → H3.3 Formation + currentness rules
```

**Corroborators (optional, never sufficient alone):** G-B Desire line; bounded G-C pattern **with** B1; SR G-E **awareness of fact**, not belief→goal.

---

## C. Currentness problem (semantic only — no lifecycle runtime)

```text
Historical Goal ≠ Current Goal
```

| Question | H3.2 semantic answer (evidence types, not code) |
|----------|--------------------------------------------------|
| Prove “still active”? | New G-A/G-B in **current** scene/chapter; or explicit “仍要/还没放弃”; or **not** contradicted by fulfilled Actual |
| Fulfilled? | Actual/prose shows end-state achieved → historical orientation; **not** current pending Goal |
| Blocked? | Explicit prose constraint; else **Unknown** |
| Weakened / abandoned / superseded? | Explicit prose or new G-A replaces old; else **Unknown** |
| Unknown currentness? | **Legal** — treat as **Goal-eligible + CURRENTNESS=UNKNOWN** or **No Grounded Goal** per Human Formation policy (H3.3) |

**No** `active=true` schema in H3.2. **No** auto-expiry from Anchor bans alone (soft notes ≠ Goal state machine).

---

## D. Unknown / No Grounded Goal battery (≥10)

| # | Case | Legal outcome |
|---|------|---------------|
| 1 | Only Desire (G-B) | **No Grounded Goal** |
| 2 | Only Concern / Interest | **No Grounded Goal** |
| 3 | Only Pressure (G-F) | **No Grounded Goal** |
| 4 | Only Conflict (G-F) | **No Grounded Goal** |
| 5 | Only Open Loop (G-G) | **No Grounded Goal** |
| 6 | Only old Plan / 09 / chapterTask (G-H) | **No Grounded Goal** |
| 7 | Only Bible motive seed (G-I) | **No Grounded Goal** |
| 8 | Director desire `missing` (G-J) | **No Grounded Goal** |
| 9 | Reasoner desire from world_pressure.event only (G-J) | **No Grounded Goal** |
| 10 | Only persistent behavior (G-C) | **No Grounded Goal** (hypothesis at most) |
| 11 | Only SR belief/stance/awareness (G-E) | **No Grounded Goal** |
| 12 | Conflicting G-A lines | **Unknown** |
| 13 | G-A exists but currentness unclear | **Unknown** or eligible+CURRENTNESS=UNKNOWN |
| 14 | Only LLM inference (G-D) | **Unknown / No Grounded Goal** |
| 15 | H2 replay blocked but no G-A | **No Grounded Goal** (H2 ≠ H3) |

```text
Story may continue without Grounded Goal (wait / observe / Authorial new non-Goal Plan direction)
```

---

## E. Runtime Archaeology (facts only)

| Path | Producer | Importer / caller | Consumer | Bypass / legacy |
|------|----------|-------------------|----------|-----------------|
| **Plan mainGoal** | `planChapter` ← `chapterTask` / volume / tone | `loadBrainContext` → `parseChapterTask(09)` | Orchestrator intent → Writer prompts | **#41 stale 09** |
| **Authored chapter_plan.yaml** | Human file | `loadAuthoredChapterPlan` | Same as Plan intent | Ch2 absent → derived |
| **09 write** | `writeNextChapterTask` after `planNext` | `chapter-pipeline.js` | Next `loadBrainContext` | Resets template in `applyPostChapter` |
| **Bible 目标** | `03_character_bible` | `loadCharacter` / Reasoner char map | Reasoner `desire`; **not** current Goal | `minimal-sr` seeds demoted |
| **Director desire** | `buildCharacterDesireProfile` | `scene-execution.js` | Beat / Writer densifier | `missing` common |
| **Reasoner desire** | `causal-reasoner` mock | `assembleWorldPressure` | `causal_chain` Writer fuel | **world_pressure.event** from Plan |
| **SR sidecar** | `updateCharacterSRFromActual` | post-scene orchestrator | `compileScenePrompt` nominal | #41 `characters:{}` |
| **minimal-sr motive** | authored / characterFacing | prompt compile | Writer view | **Explicit:** scene/chapter goal **NOT** motive |
| **Actual** | `ensureActualEvents` | MemoryUnit / evolution | Same-ch OC modules; **not** Planner | Weak handoff encoding |
| **openLoops** | evolution map | `evolveFromChapter` | **NONE** production read | Storage only |
| **Character Goal object** | — | — | — | **ABSENT** |

```text
Semantic gap: no production "Character Goal" store or Planner consumer
Do NOT create module because gap is listed
```

---

## F. Forbidden promotion matrix

| Source | Forbidden target |
|--------|------------------|
| Plan / 09 / chapterTask / scene.goal | Character Goal · Grounded Goal Candidate **confirmed** |
| Desire (G-B alone) | Goal |
| SR belief / stance / interpretation / awareness / relevance | Goal |
| Emotion / Concern | Goal |
| Pressure / Conflict / Situation | Goal |
| Open Loop / Survival hook | Goal |
| Bible / motive seed | Current Goal |
| Reasoner / Director desire fuel | Character Goal Authority |
| Persistent behavior (G-C alone) | Goal |
| LLM / Hypothesis (G-D) | Goal |
| H2 settlement / replay blocked | Goal exists |
| Goal | Choice · L1 VALID · Action |
| Goal | Plan (identity) · Writer instruction authority |

---

## G. Boundary reaffirmation

### H2 (#43 premise)

```text
Settled Actual ↛ Pending Plan without basis     ✓ holds
Settled Actual ↛ therefore Character Goal       ✗ forbidden
Replay blocked ↛ therefore Goal exists          ✗ forbidden
```

### L1 / Choice

```text
Goal ≠ Choice
Goal ↛ Choice / L1 VALID / Action
H3.2 does not enter Candidate Option / Access / Agency
```

### Plan

```text
Character Goal ≠ Plan
H3.2 does not design Goal → Planner / 09 / Writer Context
Future research question only:
  Grounded Goal → Continuation Candidate → Director → Plan  (unproven arrows)
```

---

## H. H3.2 Verdict

```text
VERDICT: PASS WITH KNOWN LIMITATIONS
```

| Aspect | Result |
|--------|--------|
| Provenance map G-A…G-U | **COMPLETE** (design) |
| Runtime Character Goal Authority | **ABSENT** (expected) |
| Plan→Goal laundering risk | **DOCUMENTED** (#41, G-H/G-A′) |
| G-C / currentness | **Semantic rules drafted**; Formation deferred H3.3 |
| Conflict with D1 / L1 / H2 / DG-042 | **NONE** |

**Known limitations:**

- Prose G-A detection not implemented as typed evidence (extractor quality #41-002).
- Reasoner/Director paths can **look like** desire/goal fuel — must stay **non-Authority**.
- Currentness not operationalized — H3.3+ only.

---

## I. STOP

```text
H3.2 DESIGN AUDIT COMPLETE

Code modified: NO
Schema modified: NO
Prompt modified: NO
Runtime modified: NO
Golden modified: NO

Goal Engine: NOT AUTHORIZED
Phase 5: FROZEN
#41: QUALIFIED / UNFIXED

Verdict:
PASS WITH KNOWN LIMITATIONS

Next:
HUMAN ADJUDICATION REQUIRED
(H3.3 Formation ONLY if Human authorizes — NOT automatic)

STOP
```

**Do not enter:** H3.3 Formation · H3.4 Lifecycle · H3.5–H3.6 · Goal Engine · #41 repair · Phase 5.
