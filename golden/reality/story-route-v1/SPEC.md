# Story Route V1 — Implementation Contract

**Phase**: Story Route V1 (pre-implementation freeze)  
**Status**: FROZEN — implement against this spec only  
**Scope**: P0 CLI (`inkos route generate <book-dir>`); **no orchestrator wiring in V1**

## Epistemology

Story Route answers:

> **In an already-established world, what are the natural possible life-directions from here?**

It does **not** answer:

- what has already happened (Reality)
- whether a character truly became the subject of an action (L1 Choice)
- what will definitely happen (fate / ending prophecy)
- which chapter events to schedule (plot outline)

### Layer stack (frozen)

| Layer | Question |
|-------|----------|
| **Reality** | What has already happened? |
| **L1 Choice** | Did the character truly become the subject of this action? (Access ∧ Agency ∧ SubjectPresent) |
| **Story Route** | What natural life-directions are possible from confirmed reality? |
| **Q1 / Q2 / Q3** | Where is such a life? Whom should we follow long-term? Why might this life be worth witnessing? |

Q3 is **specification**, not a scorer. Literary orientation is an **observation direction**, not a generation objective.

### One-way arrows (non-negotiable)

```
Reality → Possibility     ✅ allowed
Possibility → Reality     ❌ forbidden at Route layer

Possibility → Writer → Actual prose → Existing Reality Gate → Confirmed Reality   ✅ only return path
```

Route must never write `08`, `11`, `13`, `09`, `chapter_plans`, anchors, or any canon module.

---

## Pipeline (frozen)

```
                  Author
                    │
                    ▼
         AUTHOR_INITIAL_TRAJECTORY
                    │
WORLD ──────────────┤
PEOPLE ─────────────┤
RELATIONS ──────────┤
HISTORY ────────────┤
CURRENT_REALITY ────┤
HARD_CONSTRAINTS ───┤
LITERARY_ORIENTATION
                    │
                    ▼
         Reality Input Projection      ← REQUIRED (§1)
                    │
                    ▼
           LLM Route Generator
                    │
              3–5 possibilities      ← engineering count, not literary law
                    │
                    ▼
          Hard Constraint Filter
                    │
            INVALID → discard
                    │
                    ▼
       LLM Route Qualitative Selector  ← REQUIRED (§2)
                    │
                    ▼
              SELECTED ROUTE
                    │
                    ▼
         (future) Story Generation
                    │
                    ▼
              Actual Prose
                    │
                    ▼
         Existing Reality Pipeline
                    │
                    ▼
         CONFIRMED CURRENT REALITY
                    │
                    └────→ next round
```

**V1 stops at sidecar output.** No `orchestrator.js` injection until P1 is explicitly approved.

---

## §1 — Reality Input Projection (MUST)

### Problem

`loadBrainContext()` returns a **mixed bag**:

- confirmed consequences (prose-backed or A-class timeline)
- planner residue (`mainGoal` facts, template timeline, generated `09`)
- plan-derived `08` fields (`location`, `time` from intent, not prose)

Feeding this directly into Route Generator violates:

> **Possibility must not be built on unconfirmed plan masquerading as reality.**

### Rule

V1 **must not** re-implement Reality Engine. It **must** add a read-side projection:

```
loadBrainContext(bookDir, { chapter })
       ↓
projectRouteRealityInput(ctx, priorAnchor)   // new module
       ↓
RouteInput { world, people, relations, history, currentReality, ... }
       ↓
LLM Route Generator
```

Projection **does not modify disk**. It only filters / annotates what Route may treat as factual.

### Projection sources (reuse existing read-side guards)

| Field | Allow | Reject |
|-------|-------|--------|
| **timeline** | S6.3 class **A** only (`filterCanonicalTimelineEvents`) | B/C/D templates, scene goals, hooks |
| **facts** | Author-entered immutable facts; prose-summary facts without plan verbs | `第N章完成：${mainGoal}` (L02); template fallbacks (`isTemplateFallback`) |
| **current_state / 08** | POV, chapter index, word count, last-updated | `intent.location`, `intent.time`, `intent.ending` plan fields |
| **09 / chapter task** | **Never** enter Route reality | Entire file — plan / generated direction |
| **anchor** | `pov`, `location` if prose-sourced; relationship edges with evidence | `relationship_state` from `deriveRelationshipState` (L06 plan heuristic) |
| **volume outline** | **Never** enter Route reality | Scene seeds, volume goals |
| **chapter_plans** | **Never** enter Route reality | Entire yaml |
| **world / people / relations bibles** | Static authored lore | — |

### Projection output contract

```yaml
projection:
  version: story-route-v1
  chapter: 1
  excluded:
    - { source: facts, reason: L02_mainGoal_fact, count: 1 }
    - { source: timeline, reason: B_class_template, count: 3 }
  confirmed:
  current_reality:
    timeline: [...]      # A-class only
    facts: [...]         # post-filter
    state: { pov, chapter }  # minimal table, no plan location/time
```

Route Generator LLM receives **only** `projection.confirmed` + contract slots below — never raw `ctx`.

### Witness test (P0 acceptance)

After `inkos route generate`:

- `11_timeline.yaml`, `13_facts_db.yaml`, `08_current_state.md`, `09_current_chapter.md` — **byte-identical** to pre-run
- sidecar written under `novel/_system/story-route/` only

---

## §2 — LLM Qualitative Selection (MUST)

### Wrong (rejected)

```text
generate candidates → human picks → or default first
```

### Correct (frozen)

```text
generate 3–5 candidates
        ↓
hard constraint filter (rule-based, not LLM score)
        ↓
LLM qualitative selector
        ↓
selected_route + reason[]
```

### Selector question (frozen wording)

> Among all **legal** routes, which one most naturally carries the author's initial trajectory, and is most likely to let an **already-existing life** unfold toward the given literary observation directions — without inventing events to satisfy those directions?

### Selector output (frozen shape)

```yaml
selected_route_id: R3
selected_route:
  id: R3
  title: ...
  direction: ...        # life-direction prose (see §4)
  tensions: [...]
  relationship_shifts: [...]
  open_space: ...

selection:
  method: llm_qualitative_v1
  reasons:
    - aligns with author trajectory because ...
    - preserves subject agency space because ...
    - opens 见自己/见众生 direction without prescribing events because ...
  rejected:
    - { id: R1, reason: violates hard constraint ... }
    - { id: R2, reason: plot-outline granularity ... }
```

### Forbidden selector outputs

```yaml
literary_score: 94          # ❌
classicness: 0.87           # ❌
ranking: [R3, R1, R2]       # ❌ numeric rank
must_include_events: [...]  # ❌
predicted_outcome: ...      # ❌
```

Tie-break: if LLM cannot distinguish, pick the route with **fewest prescriptive event clauses** (most open_space), not highest score.

---

## §3 — Input Contract Slots (MUST exist, MAY be empty)

All eight inputs are **always present** in Route I/O. Empty defaults are explicit — slots never disappear.

```yaml
route_input:
  world: ...                    # from projection
  people: ...                   # from projection
  relations: ...                # from projection
  history: ...                  # from projection (A-class timeline + filtered facts)
  current_reality: ...          # from projection (§1)
  author_initial_trajectory: ""  # sidecar author_trajectory.md; empty string if missing
  hard_constraints: []           # sidecar or []; always array
  literary_orientation:          # sidecar or {}; always object
    observe_self: false          # 见自己
    observe_others: false        # 见众生
    observe_world: false           # 见天地
    stuck_in_things: false       # 滞于物
    trapped_in_heart: false      # 困于心
    lost_in_others: false        # 乱于人
    lost_nature: false           # 失本性
    notes: ""                    # freeform observation notes, not targets
```

**Not optional.** Missing file → empty slot with `provenance: { kind: 'default_empty' }`.

Sidecar paths (V1):

```
novel/_system/story-route/
  author_trajectory.md
  hard_constraints.yaml
  literary_orientation.yaml
```

---

## §4 — Route Granularity (MUST)

Route is **life-direction**, not plot outline, not fate prophecy.

### Too much (reject in hard filter or selector)

| Bad pattern | Why |
|-------------|-----|
| "He will stay for his mother." | Ending / fate assertion |
| "Ch1 meets mother → Ch2 argues → Ch3 decides to stay" | Chapter event schedule |
| "She must betray him to grow." | Prescribed choice |
| "A secret will be revealed." | Invented future fact |

### Right granularity (example)

> He was preparing to leave, but his mother's situation gradually turns "leaving" from a simple personal decision into a redefinition of existing relationships and obligations; along the way, he may find it harder to maintain his previous understanding of his own life.

Provides:

- life-direction
- possible relationship tension
- internal pressure
- narrative open space

Does **not** provide:

- facts
- choices
- specific events
- endings

### Route candidate schema (frozen)

```yaml
candidates:
  - id: R1
    kind: possibility
    provenance: story-route-v1
    title: short label
    direction: |          # 80–200 chars life-direction prose
      ...
    tensions: []          # internal / relational pressures, not events
    relationship_shifts: []  # "X↔Y may be redefined", not "they fight"
    open_space: |         # what remains undecided for Writer/L1
      ...
    forbidden_inference:  # route must not smuggle
      - no_preset_choice
      - no_preset_outcome
      - no_chapter_schedule
```

---

## §5 — Literary Orientation (observation, not objective)

### Frozen principle

> Literary orientation is an **observation direction during route selection**, not a **generation objective**.

### Correct sequence

```
1. Is this route legal?           (hard filter)
2. Among legal routes, which lets an existing life naturally unfold
   toward these observation directions?   (LLM qualitative selector)
```

### Wrong sequence

```
To achieve 见天地 → invent a world-scale event   ❌
To achieve 流传千古 → add betrayal, death, era-spanning secret   ❌
Missing 困于心 → inject an extra inner-turmoil beat   ❌
```

Orientation labels (见自己 / 见众生 / 见天地 / 滞于物 / 困于心 / 乱于人 / 失本性) are **directions to notice**, not **checklist items to fill**.

**No scores. No weights. No maximize().**

"流传千古" / classicness lives only in orientation **notes** as author intent — never as `literary_score`, `classicness`, or optimizer target.

---

## Anti-patterns (explicitly forbidden in V1)

| Pattern | Status |
|---------|--------|
| "At least six characters" / fixed cast size | ❌ |
| Exactly 6 routes (must be **3–5**, flexible) | ❌ |
| Seven-deadly-sins style scoring | ❌ |
| "Missing orientation → add event" | ❌ |
| Route writes canon | ❌ |
| Route sets `mainGoal` / `09` / timeline | ❌ |
| Route prescribes L1 choices | ❌ |
| Default-first / human-pick as primary selector | ❌ |

---

## P0 Implementation Boundary

### Must build

1. `inkos route generate <book-dir> [--chapter N]`
2. `projectRouteRealityInput()` — §1 projection layer
3. `generateRouteCandidates()` — LLM, 3–5 outputs
4. `filterRouteCandidates()` — rule-based hard filter
5. `selectRouteQualitatively()` — LLM selector, §2 output shape
6. Sidecar writer: `latest_routes.json`, `selected_route.json`, `traces/route_*.json`
7. Pollution witness: canon files unchanged after generate

### May reuse (read-only)

- `loadBrainContext`, `loadPriorChapterAnchor`
- `filterCanonicalTimelineEvents` / `isTemplateFallback` (projection)
- `chatCompletion` infrastructure
- `golden/reality/PLAN_REALITY_LEAKS.json` as regression checklist

### Must not touch (V1)

- `orchestrator.js`, `MemoryUnit.commit`, `state-updater.js`
- L1 golden fixtures / contract
- `planChapter`, `causal-reasoner`, `situation-engine`
- `living-novel-engine`, `writeNextChapterTask`
- Metrics / replan loop

### Deferred (post-V1)

- P1 orchestrator overlay (`planCtx.routeContext`)
- Studio UI route picker
- Cross-chapter re-route trigger
- Route → Planner prompt injection protocol

---

## P0 Acceptance — 10 real-book runs

Success criteria are **qualitative**, not architectural:

1. Candidates read as **life-directions**, not chapter outlines
2. Illegal routes (fate assertion, event schedule, preset choice) are **filtered**
3. Selector `reason[]` references author trajectory + orientation **without scores**
4. No canon pollution (witness pass)
5. Model does not "start writing plot" in `direction` fields

Failure mode to watch:

> Route Generator narrates future events instead of opening directional space.

---

## Module layout (suggested)

```
packages/inkos-route/
  src/
    project-route-reality.js    # §1
    generate-candidates.js
    hard-filter.js
    select-route.js             # §2
    contract.js                 # slot defaults, schema validation
    cli.js
  package.json
```

CLI registration in `packages/inkos-core/src/cli.js` — subcommand only, no runtime change.

---

## Conclusion

> **Story Route V1 最小接入点：`inkos route generate` + `projectRouteRealityInput` + sidecar。原因：在不动 Reality Engine 的前提下，Projection 保证 Route 只吃 confirmed facts；LLM qualitative selector 保证选用的是承载作者方向的人生展开，而非分数最高或默认第一条；全程停留在 Possibility 层，经 Writer→Reality Gate 才能回流 Canon。**
