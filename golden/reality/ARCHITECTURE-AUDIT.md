# InkOS Architecture Audit — Read-Only

**Date**: 2026-08-31  
**Scope**: Production paths, data flow, LLM map, Canon writes, leakage, duty overlap  
**Explicitly out of scope**: Code changes · P1 · Route P0 · Reality Engine · L1/L2 Contract edits · Prompt tuning

**Related frozen artifacts**:
- `golden/reality/BOUNDARY_MAP.json`
- `golden/reality/AUDIT_WRITE_READ_MAP.json`
- `golden/reality/PLAN_REALITY_LEAKS.json`
- `experiments/story-route-v1/P0-STATUS.md` (`P0-EXPERIMENT-BASELINE-FROZEN`)

---

## 1. 当前实际架构图

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  ENTRY                                                                  │
│  inkos cli.js → runtime run | brain run | context | route | memory     │
│  Studio UI → inkos-studio-server → StudioRuntimeOrchestrator           │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐     ┌─────────────────┐     ┌──────────────────┐
│ V4 Manual     │     │ Runtime 2.0     │     │ Story Route P0   │
│ context/post  │     │ Orchestrator    │     │ (CLI only)       │
│ delta/review  │     │ chapter/scene   │     │ sidecar only     │
└───────┬───────┘     │ pipeline        │     └────────┬─────────┘
        │             └────────┬────────┘              │
        │                      │                       │ read-only
        │                      ▼                       ▼
        │             ┌─────────────────┐     projectRouteRealityInput
        │             │ inkos-brain     │     generate/select (LLM)
        │             │ planner/decision│
        │             │ conflict/scene  │
        │             │ validation      │
        │             │ state-updater   │
        │             └────────┬────────┘
        │                      │
        ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  CANON DISK (novel/08,09,11,13,07,12,14,15 + chapters/ + states/)       │
│  Primary gate: MemoryUnit.commit → applyStateDiffToCanon → applyPostChapter │
└─────────────────────────────────────────────────────────────────────────┘

Parallel (NOT in Runtime loop):
  Studio ai-service / creator-intelligence → writeModule (human save)
  chapter-audit.acceptChapter → MemoryUnit.commit(force)
  inkos post → applyPostChapter (manual)
```

**Nominal SSOT** (`ARCHITECTURE.md`): Runtime Pipeline owns canon updates.  
**De facto**: Studio UI, author accept, CLI `post`, and `patchCurrentStateTime` also mutate canon-adjacent files.

---

## 2. Reality 数据流

| Layer | What it is today | On-disk / runtime |
|-------|------------------|-------------------|
| **Canon modules** | Declared story truth | `novel/11_timeline.yaml`, `13_facts_db.yaml`, bibles 01–06, `08`, `09`, `12`, `14`, `15` |
| **Prose artifact** | Chapter/scene text | `chapters/*.md`, `novel/_system/brain/ch_*_scenes.json` |
| **Operational state** | Planner/Director working set | `states/ch_*.json`, `states/ch_*_anchor.yaml`, `08`, runtime JSON |
| **Plan residue** | Not canon but feeds planner | `09` (generated), `novel/_system/chapter_plans/`, `ch_*_plan.json` |
| **Possibility** | Route sidecar only | `novel/_system/story-route/` — **not consumed by Runtime** |
| **Choice** | Golden L1 only | **No production type or gate** |

**Read path (unfiltered)**:
`loadBrainContext()` → reads all modules raw → feeds Planner, Writer context, causal chain.

**Read path (filtered projection)**:
- Writer timeline: `filterCanonicalTimelineEvents` (S6.3) in `inkos-context-ranking`
- Route: `projectRouteRealityInput` in `inkos-route` (chapter cap, L02, plan residue)

**Write path (confirmed reality)**:
`buildStateDelta(intent, scenes, causalChain)` → **does not parse prose** → timeline events from `causalChain.consequence` / scene outcome fields; facts from `mainGoal` template.

**Missing link** (`BOUNDARY_MAP.json`): `PROSE → CANDIDATE → GATE → CONFIRMED_REALITY` = **MISSING**.

---

## 3. LLM 调用地图

**Single transport**: `packages/inkos-brain/src/writer/llm-writer.js` → `chatCompletion()`

| # | Location | Stage | Output | Can reach Canon? |
|---|----------|-------|--------|------------------|
| 1 | `llm-writer.js` | Scene Writer (Runtime) | `scene.text` | **Yes** — via `MemoryUnit.commit` |
| 2 | `studio-llm-writer.js` | Beat/Scene Writer (Studio) | scene prose | **Yes** — same pipeline |
| 3 | `reader-simulator.js` | Post-validation polish | rewritten chapter | **Yes** — replaces `workingText` before commit |
| 4 | `inkos-route/generate-candidates.js` | Route candidates | JSON sidecar | **No** |
| 5 | `inkos-route/select-route.js` | Route selection | JSON sidecar | **No** |
| 6 | `studio-server/ai-service.js` | Module wizard | MD/JSON modules | **On human save** via `writeModule` |
| 7 | `creator-intelligence.js` | DNA/world/character advisory | JSON | **On explicit save** |
| 8 | `living-novel-engine.js` | World evolve (deprecated persist) | proposal | Default **No** |

**Rule-based (no LLM)**: `planner.js`, `decision.js`, `conflict.js`, `critic.js`, `validation.js`, `metrics.js`, Route `hard-filter.js`, projection layers.

---

## 4. Canon 写入地图

**Physical stack** (only path that touches 08/11/13 in normal Runtime):

```
chapter-pipeline.runChapterPipeline
  → [consistency, metrics, critic, validateChapter]
  → buildStateDelta
  → MemoryUnit.commit
  → applyStateDiffToCanon
  → applyPostChapter
  → yaml-store.appendTimeline / appendFacts + writeText
```

| Entry | File | Validation before 08/11/13? |
|-------|------|-------------------------------|
| Runtime pipeline | `chapter-pipeline.js` | **Yes** — 8-check validation + critic + consistency |
| Author accept | `chapter-audit.js` `acceptChapter` | **No replay** — `force: true` |
| CLI `inkos post` | `cli.js` → `applyPostChapter` | **None** — manual delta |
| `patchCurrentStateTime` | `state-updater.js` | **None** — 08 time row only |
| `writeNextChapterTask` | `state-updater.js` | **None** — writes generated `09` |
| Studio `writeModule` | `module-service.js` | **Human** — blocks 08/11/13 direct; allows 09, bibles |
| `applyRuntimeStateUpdate` | `state-updater.js` | **Deprecated, none** |

**Also written on commit**: `chapters/*.md`, `states/ch_*.json`, `states/ch_*_anchor.yaml`, git memory snapshot.

---

## 5. Reality → Possibility → Choice → Action → Reality 数据流

### Target chain (frozen principle)

```text
Reality → Possibility → Choice → Action → Reality
```

### Actual chain today

```text
loadBrainContext (raw + leaks)
    → planChapter / authored plan          [PLAN — rule heuristics]
    → evaluateDecisions / evaluateConflict [pre-write gates on scene.goal]
    → buildScenePlan + buildDynamicPrompt
    → Writer LLM                           [ACTION = prose in scenes.json / chapters.md]
    → validateChapter (intent heuristics)  [NOT prose fact extraction]
    → buildStateDelta(intent, causalChain) [REALITY WRITE — not from prose events]
    → MemoryUnit.commit
    → planNextChapter → writeNextChapterTask [09 plan residue]

Possibility (Route): parallel CLI sidecar — NOT in loop
Choice (L1): golden fixtures only — ENGINE_NOT_IMPLEMENTED
```

| Step | Status |
|------|--------|
| Reality → Possibility | **Partial** — Route P0 CLI only; not wired to Runtime |
| Possibility → Choice | **MISSING** |
| Choice → Action | **Collapsed** — `scene.goal` (plan) drives Writer; no L1 adjudication |
| Action → Reality | **PARTIAL_LEAK** — commit reads intent/causal, not validated prose facts |
| Forbidden shortcuts | **VIOLATED** — Plan→facts, Plan→timeline, inference→anchor (see §7) |

---

## 6. 当前职责冲突

| Conflict | Modules | Issue |
|----------|---------|-------|
| **Planner ≡ chapter plot engine** | `planner.js` | Produces `mainGoal`, scenes, obstacles — overlaps *conceptual* space with Route life-direction, but different granularity |
| **Dual prompt assembly** | `dynamic-prompt.js` (CLI Runtime) vs `prompt-compiler.js` (Studio) vs `inkos-prompt/compiler.js` | Same role, different code paths — drift risk |
| **Dual orchestrators** | `RuntimeOrchestrator` vs `StudioRuntimeOrchestrator` | Studio adds Director/beats; same commit path but extra LLM layers |
| **Decision vs L1** | `decision.js` vs golden L1 | Decision checks feasibility of **planned** `scene.goal`; L1 adjudicates **prose evidence of Choice** — different contracts, naming confusion risk |
| **Validation vs Reality gate** | `validation.js` | Checks plot_advanced against **intent**, not whether prose events are canon-true |
| **08 State vs Reality** | `08_current_state.md` | Holds POV/章节 + plan-derived 地点/时间/任务 — blurred with confirmed reality |
| **Studio vs ARCHITECTURE.md iron law** | `module-service`, `brain-context-sync` | Root doc says Studio must not write `novel/` business files; code allows 09, bibles, `patchCurrentStateTime` |
| **Metrics/Reader pressure** | validation + adaptive | Encourages "推进" patterns — semantic pressure toward plot, not life-direction |

---

## 7. 当前泄漏风险

| Leak type | Status | Evidence |
|-----------|--------|----------|
| **Plan → Reality** | **VIOLATED** | `mainGoal` → `13_facts_db` L02 fact; `causalChain.consequence` → `11_timeline` |
| **Plan → Canon** | **VIOLATED** | `writeNextChapterTask` generated `09` → `planNextChapter` input |
| **LLM → Canon** | **PARTIAL** | Writer prose → chapters (storage); **not** auto-facts; but reader-sim polish alters committed text |
| **Writer → Reality** | **FORBIDDEN but weak** | No prose→fact parser; anchor `deriveClosingEmotion` heuristic from text tail |
| **Possibility → Reality** | **Not wired** | Route sidecar isolated — safe today |
| **Inference → Reality** | **VIOLATED** | `inferWorldAfter`, `deriveRelationshipState` → anchor/situation treated as fact instructions |
| **Stale state** | **Mitigated (Route only)** | `projectRouteRealityInput` chapter cap; `loadBrainContext` still unfiltered for Runtime |
| **acceptChapter bypass** | **RISK** | `force:true` without validation replay (F01 degraded canon) |

Read-side filters (S6.3, Route projection) **do not block writes**.

---

## 8. 可删除 / 可合并模块

### Candidate deprecation (low or legacy traffic)

| Module | Path | Note |
|--------|------|------|
| Brain 1.0 legacy pipeline | `brain-runtime-legacy.js` | Only `--legacy` CLI |
| `applyRuntimeStateUpdate` | `state-updater.js` | Marked deprecated |
| `evolveWorldState` persist | `living-novel-engine.js` | `_proposal: true`; persist deprecated |
| `inkos-sdk` | placeholder | No implementation |
| `causal-reasoner` LLM path | `mock_llm_pending` | Mock only |

### Candidate merge (same duty, dual implementation)

| Duty | Instances |
|------|-----------|
| Prompt assembly | `dynamic-prompt.js`, `prompt-compiler.js`, `inkos-prompt/compiler.js` |
| Orchestration | `orchestrator.js`, `studio-orchestrator.js` |
| Writer polish | Runtime reader-sim optimizer + Studio writer-optimizer |
| Memory layers | `memory-hierarchy`, `git-memory`, `inkos-story-memory` packages |

**Do not delete without traffic audit** — audit identifies overlap, not removal orders.

---

## 9. 尚未解决的 Contract 问题

| ID | Issue |
|----|-------|
| C1 | **No Reality Gate** — prose never becomes confirmed facts through validation |
| C2 | **L1 not in production** — golden RED; no Observer implementation |
| C3 | **L2 not wired** — dominance separate from L1; no runtime |
| C4 | **Possibility layer isolated** — Route P0 frozen; P1 explicitly deferred |
| C5 | **Plan→Canon leaks** — documented in `PLAN_REALITY_LEAKS.json`, write path unchanged |
| C6 | **09 provenance** — generated task card feeds next plan; blurs author direction |
| C7 | **Trajectory/POV subject** — observed in Route experiments; no field |
| C8 | **Studio canon write policy** — tension with root `ARCHITECTURE.md` iron law |
| C9 | **PROSE→CANDIDATE type system** — missing from codebase |

---

## 10. 建议的最小核心架构

**Do not add modules.** Clarify boundaries on what exists:

```text
┌─────────────────────────────────────────┐
│  InkOS Core (deterministic)             │
│  • Canon file schema + paths            │
│  • MemoryUnit.commit (single write exit)│
│  • applyPostChapter / yaml-store        │
│  • Git Memory / provenance / rollback   │
│  • Context projection (S6.3, Route N)  │
│  • Contract enforcement hooks (future)│
│  • Chapter/scene artifact lifecycle     │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  Semantic layer (LLM, replaceable)      │
│  • Writer prose                         │
│  • Route possibility (sidecar)          │
│  • Studio advisory / module drafts      │
│  • Future: L1 Observer, fact candidates │
└─────────────────────────────────────────┘
```

**Minimal additions (conceptual only, not implemented)**:
1. **Fact candidate** type from prose — never auto-commit
2. **Reality gate** before `appendFacts` / `appendTimeline`
3. **Possibility consumer** — read sidecar, never write canon
4. **L1 gate** at Choice boundary — separate from `decision.js`

**Keep Route thin** — align with `P0-EXPERIMENT-BASELINE-FROZEN`.

---

## Q1–Q10 回答

### Q1 — 真正的 Canon authority 是谁？

**没有单一权威。** 名义上：`MemoryUnit.commit` 经 Runtime `chapter-pipeline` 门禁。实际上 authority 分散在：

1. **Runtime pipeline** — validation + critic + consistency 通过后 commit
2. **Human author** — `acceptChapter(force:true)` 无验证重放
3. **Human editor** — CLI `inkos post`, Studio `writeModule`, manual YAML
4. **Heuristic updater** — `buildStateDelta` 从 **intent/plan** 写 facts/timeline，非 prose 裁决

**LLM 永远不是 Canon authority** — 但 LLM 产出可经 (1) 或 (2) 进入磁盘。

### Q2 — 所有 Reality 写入点？

见 §4。汇总：`MemoryUnit.commit`（主路径）、`applyPostChapter`（CLI post）、`patchCurrentStateTime`（08）、`writeNextChapterTask`（09）、`writeModule`（bibles/09）、`runNpcSimulation`（15）、`module-service` 禁止直写 11/13/08。

### Q3 — 哪些 LLM 输出可绕过 Reality gate？

| Path | Bypass |
|------|--------|
| `acceptChapter` | 全文 + canon delta，无 validation replay |
| Studio `writeModule` on save | Bibles, 09 — human gate only |
| Reader-sim polish | Alters chapter before commit — passes pipeline gates but not fact extraction |
| Route LLM | Sidecar only — safe |
| `ai-service` trial/preview | No save — safe |

**No LLM output today goes through a prose→fact Reality gate** — because the gate does not exist.

### Q4 — State 与 Reality 边界？

| | State | Reality (Canon) |
|---|--------|-----------------|
| **Purpose** | 当前运行、规划、下一章输入 | 已成立事实、可追溯 |
| **Examples** | `08`, anchor, `states/ch_*.json`, plan JSON | `11` timeline, `13` facts, bibles |
| **Problem** | `08` 含 plan 字段；anchor 含 inference；`09` 混 generated/authored | L02 facts 写 plan 完成句；timeline 可收 causal 推断 |

**Boundary today: leaky.** State and Reality share files and `loadBrainContext` loads both without role separation.

### Q5 — Story Route 与 Planner 职责重叠？

| | Route (P0) | Planner |
|---|------------|---------|
| **Output** | Life-direction possibilities | Chapter intent: mainGoal, scenes, obstacles |
| **Layer** | Possibility (sidecar) | Plan (drives Writer) |
| **Wired?** | **No** — CLI only | **Yes** — every Runtime chapter |

**Conceptual overlap** — both shape "where the story goes." **Operational separation** — only Planner runs in production. Route does not replace or feed Planner today. **P1 deferred** — intentional.

### Q6 — Possibility 如何进入 Choice 而不变剧情？

**Today: it doesn't.** Route sidecar is not read by Orchestrator. No Possibility→Choice adapter. L1 golden defines Choice adjudication from prose — not implemented. Risk if wired wrong: selected Route `direction` could become `scene.goal` → immediate plot — would violate Possibility→Reality ban.

**Required (future, not designed here)**: Possibility as read-only overlay → Writer/L1 observes → Choice validated → then Action.

### Q7 — Choice / Action 如何形成新 Reality？

**Actual path**:
1. Planner sets `scene.goal` (planned action, not L1 Choice)
2. Writer generates prose (Action as text)
3. `validateChapter` checks intent-aligned heuristics
4. `buildStateDelta` writes timeline from `causalChain` / scene outcomes; facts from `mainGoal` template
5. `MemoryUnit.commit`

**Prose events are not extracted into facts.** New "Reality" is largely **plan completion metadata**, not confirmed story events from text.

### Q8 — Writer 如何提出事件而非宣布事件？

**Partially by accident**: prose lives in `chapters/*.md` without auto-ingest to `11`/`13`.  
**But**: commit still writes L02 "第N章完成：mainGoal" as immutable fact; anchor carries inferred emotion/relationship. Writer is **not** modeled as proposing `action_candidate` — it's full prose generation with plan instructions (`scene.goal` in prompt).

**Gap**: No typed proposal → gate → confirm loop for events in prose.

### Q9 — 确定性系统 vs LLM semantic work？

| Deterministic (must survive model swap) | LLM semantic |
|----------------------------------------|--------------|
| `book.js` paths, yaml-store | Scene/beat prose generation |
| MemoryUnit, applyPostChapter | Route generate/select |
| planChapter heuristics, story-map | Reader simulator, polish optimizer |
| decision, conflict, content-policy | Studio module wizard, creator-intelligence |
| validation, metrics, critic (rules) | — |
| state-updater, S6.1 timeline filter | — |
| S6.3 read filter, Route projection | — |
| git-memory, execution-guard | — |
| hard-filter (Route rules) | — |

### Q10 — 换 LLM 后哪些行为必须不变？

- V4 canon file layout and module numbering
- `MemoryUnit.commit` as write exit (when used)
- Chapter pipeline stage order and hard gates (validation 8-check, critic, consistency)
- Planner/decision/conflict rule behavior
- `buildStateDelta` / L02 fact shape / S6.1 timeline filter
- Route projection formula and sidecar non-canon invariant
- L1 golden fixtures and contract (Observer still adjudicates same evidence)
- Git memory snapshot/rollback semantics
- `inkos context` / `post` manual workflows

**What breaks without any LLM**: no scene prose, no Route candidates, no Studio AI drafts — Runtime can still plan, gate, commit template metadata, manage canon files.

---

## 最终判断

> **如果 LLM 明天消失，InkOS 还剩下什么？**

**一个带门禁的章级 Canon 状态机**：维护 `novel/` 模块与 `chapters/` 的版本化真相、通过 `MemoryUnit.commit` 做原子章提交、用 Git Memory 做快照/回滚、用确定性 Planner/Decision/Conflict/Validation 编排写作工序——但**不能**自动从文本中提取或确认故事事实。

**InkOS 的真正产品核心**不是「会写小说的 LLM」，而是：

> **Reality / Canon / Provenance / Constraints 的存储、投影、状态转换边界** — LLM 是可替换的语义层，挂在门禁之外，永远不能自封 Canon authority。

这与当前 Story Route P0 实验方向一致：**投影干净 → 显影可能 → 不制造未来**。
