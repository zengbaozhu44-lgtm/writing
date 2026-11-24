# InkOS Architecture Reality Audit

**Date**: 2026-09-01 (audit) · **D1 Negative Boundary frozen**: 2026-09-02  
**Mode**: Read-only audit — superseded for D1 **status** by `D1-STATUS.md`; Negative Boundary frozen separately  
**Directive**: Architecture Freeze — Implementation Directive §12  
**Related frozen artifacts**:
- `golden/reality/D1-STATUS.md` — **D1 overall status (authoritative for D1 phase)**
- `golden/reality/d1-negative-boundary/SPEC.md` — **D1 Negative Boundary N1–N9 FROZEN**
- `golden/reality/BOUNDARY_MAP.json`
- `golden/reality/PLAN_REALITY_LEAKS.json`
- `golden/reality/AUDIT_WRITE_READ_MAP.json`
- `golden/reality/story-route-v1/CONTRACT.json`
- `golden/reality/l1-choice-formation/SPEC.md`
- `experiments/story-route-v1/P0-STATUS.md` (`P0-EXPERIMENT-BASELINE-FROZEN`)

---

## 1. 当前真实架构

### 1.1 架构总图

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ ENTRY                                                                    │
│   inkos cli.js  → runtime run | brain run | context | route | post       │
│   Studio UI     → inkos-studio-server → StudioRuntimeOrchestrator        │
└───────────────────────────────┬──────────────────────────────────────────┘
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
        │             │ causal/validate │
        │             │ state-updater   │
        │             └────────┬────────┘
        │                      │
        ▼                      ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ CANON DISK                                                               │
│   novel/08,09,11,13,07,12,14,15 + bibles 01–06                          │
│   chapters/*.md + states/ch_*.{json,anchor.yaml}                         │
│ Primary write stack: MemoryUnit.commit → applyStateDiffToCanon →         │
│                      applyPostChapter → yaml-store                         │
└──────────────────────────────────────────────────────────────────────────┘

Parallel (outside Runtime loop):
  Studio ai-service / creator-intelligence → writeModule (human save)
  chapter-audit.acceptChapter → MemoryUnit.commit({ force: true })
  inkos post → applyPostChapter (manual delta)
  patchCurrentStateTime / writeNextChapterTask → 08 / 09
```

**名义 SSOT**：Runtime Pipeline 拥有 Canon 更新权。  
**实际 authority**：分散在 Runtime pipeline、作者 accept、CLI post、Studio writeModule、启发式 state-updater。

### 1.2 实际数据流（今日）

```text
loadBrainContext (unfiltered)
    → planChapter / authored plan              [PLAN — rule heuristics]
    → ensureChapterCausalChain (mockReason)  [CAUSAL — from plan/authored]
    → evaluateDecisions / evaluateConflict     [pre-write gates on scene.goal]
    → buildScenePlan + buildDynamicPrompt
    → Writer LLM                             [NARRATIVE — prose]
    → validateChapter (intent heuristics)    [NOT prose fact extraction]
    → buildStateDelta(intent, causalChain)    [REALITY WRITE — not from prose]
    → MemoryUnit.commit
    → planNextChapter → writeNextChapterTask [09 plan residue]

Possibility (Route): parallel CLI sidecar — NOT in loop
Choice (L1): golden fixtures only — ENGINE_NOT_IMPLEMENTED
```

### 1.3 对象分层（实际）

| 对象 | 今日存在形式 | 磁盘 / 运行时 |
|------|-------------|---------------|
| **FACT** | `13_facts_db.yaml` 条目 | Canon；部分来自 plan 模板 |
| **STATE** | `08`, `states/ch_*`, anchor | 混 plan + 少量 prose 启发式 |
| **INTERPRETATION** | Director situation、character brain | Prompt / sidecar；部分进 anchor |
| **INFERENCE** | `inferWorldAfter`, `deriveRelationshipState` | Prompt / anchor；非 Canon gate |
| **POSSIBILITY** | Route sidecar JSON | `novel/_system/story-route/` |
| **PLAN** | `09`, `chapter_plans/`, `ch_*_plan.json` | 喂 Planner；部分被当 Reality 读 |
| **CANON** | 11/13/08 + bibles | 多入口写入 |
| **NARRATIVE** | `chapters/*.md`, `scene.text` | 存储；不自动升格为 FACT |

**MISSING CONTRACT**：FACT / STATE / INTERPRETATION / INFERENCE / POSSIBILITY / PLAN / CANON / NARRATIVE 之间无正式类型系统；靠文件路径隐式区分。

---

## 2. Contract 架构（冻结目标）

### 2.1 核心闭环

```text
Reality → Possibility → Choice → Narrative → Reality
```

永久方向：

```text
Reality → Possibility    ✓
Possibility → Reality    ✗
```

### 2.2 五层职责（Contract）

| 层 | InkOS（确定性） | LLM（语义，可替换） |
|----|----------------|-------------------|
| Reality / Canon | 存储、验证、mutation control | — |
| Character State | provenance、certainty 分类 | 解释、比较 |
| Causality | 仅在有依据时建立关系 | 发现张力 |
| Choice | L1/L2 validation | — |
| Possibility | Route 投影边界 | 生成 direction / tensions |
| Narrative | Reality Gate | Writer prose |

原则：**系统负责「什么是真的」；模型负责「这意味着什么、可能是什么、如何表达」。**

### 2.3 已冻结 Contract（部分）

| Contract | 状态 | 位置 |
|----------|------|------|
| Story Route V1 P0 | **FROZEN** | `golden/reality/story-route-v1/{CONTRACT.json,SPEC.md}` |
| L1 Choice Formation | **FROZEN oracle only** | `golden/reality/l1-choice-formation/SPEC.md` |
| L2 Dominance | **MISSING CONTRACT** | — |
| D1 Reality Ontology | **MISSING CONTRACT** | — |
| D2 Character State | **MISSING CONTRACT** | — |
| D3 Causality | **MISSING CONTRACT** | — |
| D5 Writer → Reality Gate | **MISSING CONTRACT** | — |
| PROSE → CANDIDATE → GATE → CONFIRMED_REALITY | **MISSING CONTRACT** | `BOUNDARY_MAP.json` chain all MISSING |

### 2.4 目标写入链（Contract，未实现）

```text
prose
  → proposed narrative/state change (candidate)
  → Reality Gate validation
  → accepted consequence
  → Canon (11/13/08 with provenance)
```

---

## 3. 审计问答（§12 A–G）

### A. Reality — 当前系统实际有哪些 Reality 来源？

| # | 来源 | 分类 | 路径 / 模块 | Provenance |
|---|------|------|-------------|------------|
| A1 | 作者圣经 | **ALIGNED** — 人工 Canon | `novel/01–06_*.md/yaml` | 作者写入；Studio `writeModule` |
| A2 | 确认时间线 | **IMPLEMENTATION DRIFT** — 部分 plan 泄漏 | `novel/11_timeline.yaml` | `appendTimeline` via `buildStateDelta` ← causalChain.consequence |
| A3 | 确认事实库 | **IMPLEMENTATION DRIFT** — plan 模板事实 | `novel/13_facts_db.yaml` | `appendFacts` ← `mainGoal` 完成句 |
| A4 | 当前状态表 | **IMPLEMENTATION DRIFT** — 混 plan | `novel/08_current_state.md` | `buildCurrentStateTable(intent)` |
| A5 | 伏笔 / 资源 / NPC | **IMPLEMENTATION DRIFT** — 部分 plan 驱动 | `12`, `14`, `15` | `buildStateDelta` / `runNpcSimulation` |
| A6 | 章节正文 | **ALIGNED** — 存储不自动升格 | `chapters/*.md` | Writer / 人工；不进 11/13 自动解析 |
| A7 | Scene 文本 | **ALIGNED** — artifact | `novel/_system/brain/ch_*_scenes.json` | Writer LLM |
| A8 | 章锚点 | **IMPLEMENTATION DRIFT** — inference 混入 | `states/ch_*_anchor.yaml` | `buildChapterAnchor` ← intent + prose tail |
| A9 | 计划残留 | **NOT Reality** — 但被当 Reality 读 | `09`, `chapter_plans/` | generated / authored；`loadBrainContext` 无角色分离 |
| A10 | Route sidecar | **ALIGNED** — 非 Canon | `novel/_system/story-route/` | LLM；Contract 禁止写 Canon |
| A11 | Git Memory 快照 | **ALIGNED** — 版本化 | `novel/_system/snapshots/` | `MemoryUnit.commit` |

**结论**：Reality 名义上来自 Canon 模块；实际上 **11/13/08 与 plan/causal 高度耦合**，无统一 provenance 类型。

---

### B. State — 当前 Character State 从哪里产生？

| # | 维度 | 产生路径 | 代码 | 分类 |
|---|------|---------|------|------|
| B1 | knowledge | 作者矩阵 | `novel/06_knowledge_matrix.yaml` | **ALIGNED**（作者源） |
| B2 | belief / desire / fear | 角色圣经字段 | `03_character_bible/*.md` | **ALIGNED**（作者源） |
| B3 | relation | 关系图 + anchor 边 | `05_relationship_graph.yaml`; `deriveRelationshipState` | **IMPLEMENTATION DRIFT** — anchor 边来自 plan obstacles |
| B4 | constraint | intent.bannedElements, voiceDna | `memory-unit.js:buildChapterAnchor` | **IMPLEMENTATION DRIFT** — plan → anchor |
| B5 | tension | plan obstacles, situation | `situation-engine.js`, planner | **NOT Character State Contract** — 无 certainty/provenance |
| B6 | 运行时人物提案 | livingPrepare | `states/ch_*.json` `.livingPrepare` | **MISSING CONTRACT** — 侧车元数据 |
| B7 | 角色大脑 | Studio 分析 | `novel/_system/character_brains/*.yaml` | **ALIGNED** — sidecar；显式保存 |
| B8 | 世界模拟 | living-novel | `novel/_system/world_state.yaml` | **POLLUTION RISK** — prose 启发式提案 |

**结论**：Character State 无 D2 Contract。静态来自作者；运行时来自 **plan 投影 + 启发式**，不能回答「它从哪里来？是事实、认知还是推断？谁知道？」

---

### C. Causality — 当前因果关系在哪里产生？

| 步骤 | 模块 | 函数 | 输入 | 输出 | 持久化 | 分类 |
|------|------|------|------|------|--------|------|
| C1 | `causal-reasoner.js` | `projectStoryTruth` | bibles, 09, 08, 13, chapter_plans | `storyTruth` | 否 | plan 读入 |
| C2 | `causal-reasoner.js` | `assembleWorldPressure` | chapterTask, authoredPlan, facts | `world_pressure` | 否 | plan |
| C3 | `causal-reasoner.js` | `mockReason` | storyTruth | `causalChain` | 否 | **IMPLEMENTATION DRIFT** — plan→causal |
| C4 | `causal-reasoner.js` | `ensureChapterCausalChain` | intent | `intent.causalChain` | 内存 | 调用方：orchestrator |
| C5 | `state-updater.js` | `resolveTimelineEvents` | causalChain.consequence, scene.outcome | `timeline.events[]` | 经 commit | **POLLUTION RISK** L01/L04 |
| C6 | `situation-engine.js` | `inferWorldAfter` | plan.consequence | Writer prompt `situation.after` | 否 | **POLLUTION RISK** L05 |
| C7 | `compiler.js` / prompt | `renderCausalChain` | causalChain | Writer prompt | 否 | 只读注入 |

**调用链**：

```text
orchestrator._runScenesAndChapter
  → ensureChapterCausalChain(bookDir, intent)
  → scene.causalChain = intent.causalChain
  → buildStateDelta({ causalChain })
  → resolveTimelineEvents → 11_timeline.yaml
```

**结论**：Causality **不来自 Reality 观察到的 consequence**；来自 **plan/authored inputs → mockReason**。禁止方向 `Plan → causal explanation → Reality` **已被违反**（L01）。

---

### D. Choice — 当前系统判断的 Choice 到底是什么？

生产中存在 **三个不同「Choice」概念**，仅两个 live：

| 概念 | 是什么 | 代码 | 问的问题 | 分类 |
|------|--------|------|---------|------|
| **D1 — scene.goal** | Planner 规则骨架目标 | `planner.js:planChapter`, `scene.js:buildScenePlan` | 「这章 scene 该写什么方向？」 | **NOT Choice** — 是 PLAN |
| **D2 — decision.js** | 对 `scene.goal` 的六维可行性校验 | `decision.js:evaluateDecisions` — `action: scene.goal` | 「计划行动是否可行/合规？」 | **NOT L1** — 不同 Contract |
| **D3 — causalChain.choice** | 仅 authored plan 显式字段 | `causal-reasoner.js:buildCausalChain` | 「作者是否写了 choice？」 | **ALIGNED**（无 basis 则 null） |
| **D4 — L1 Choice Formation** | Access ∧ Agency ∧ SubjectPresent | `golden/reality/l1-choice-formation/` | 「正文是否显示角色真正形成选择？」 | **MISSING CONTRACT** — 未实现 |

**生产链（collapsed）**：

```text
planChapter → intent.scenes[].goal
    → evaluateDecisions (feasibility on plan)
    → Writer prompt (scene.goal as navigation)
    → prose (no L1 adjudication)
```

**确认**：当前 Choice **仍是 planned `scene.goal`**，**不是** prose-level L1 Choice。`decision.js` 与 L1 命名冲突但 Contract 不同。

---

### E. Writer — 当前所有 Writer 路径

| # | 路径 | 入口 | 代码 | 直接写入 | 间接 Canon |
|---|------|------|------|---------|-----------|
| E1 | Runtime CLI | `inkos runtime run` | `createLlmWriter` → `orchestrator._runScenesAndChapter` | `scene.text`, `ch_*_scenes.json` | **是** — `MemoryUnit.commit` |
| E2 | Studio 生产 | Studio UI 跑章 | `createStudioLlmWriter` → `StudioRuntimeOrchestrator` | 同上 + beat 分片 | **是** — 同 commit 栈 |
| E3 | 导入正文 | `--text` / `chapterText` | orchestrator skip writer | `chapters/*.md` | **是** — commit |
| E4 | Studio 手存 | PUT `/chapters/:n/text` | `chapter-service.saveChapterText` | `chapters/*.md` | **否** — 仅 prose 文件 |
| E5 | 预览 | Wizard trial | `ai-service.trialWriteOpening` | 无（previewOnly） | **否** |
| E6 | Reader 润色 | post-validation | `reader-simulator.polishChapterAfterReaderSim` | 替换 `workingText` | **是** — commit 前 |
| E7 | Studio optimizer | beat polish | `studio-llm-writer` `polishFn` | 替换 scene 片段 | **是** — commit 前 |

**Writer 输入（Contract 期望 vs 实际）**：

| 期望输入 | 实际输入 |
|---------|---------|
| validated Reality | `loadBrainContext`（unfiltered，含 09） |
| validated Character State | bibles + anchor（含 plan inference） |
| validated Choice | `scene.goal`（plan） |
| scene context | Director situation（含 inferWorldAfter） |

**Canon mutation 路径汇总**：

| 入口 | 验证 | 分类 |
|------|------|------|
| `chapter-pipeline` → `MemoryUnit.commit` | 8-check validation + critic + consistency | **ALIGNED**（路径存在；delta 来源 drift） |
| `acceptChapter` → `commit({ force: true })` | **无 validation replay** | **IMPLEMENTATION DRIFT** |
| `inkos post` → `applyPostChapter` | 无 | **IMPLEMENTATION DRIFT** |
| `writeModule` (bibles, 09) | 人工 | **ALIGNED**（人工 gate）；09 喂 plan 是 **POLLUTION RISK** L08 |
| `patchCurrentStateTime` | 无 | **IMPLEMENTATION DRIFT** — 08 时间行 |
| `writeNextChapterTask` | 无 | **POLLUTION RISK** — generated 09 |

**结论**：Writer **不能直接写 11/13**，但经 commit 的 `buildStateDelta` **从 intent/causal 写 Canon**，不经过 prose Reality Gate。**MISSING CONTRACT**（D5）。

---

### F. Possibility — Story Route 是否存在 Possibility → Reality 路径？

| 路径 | 存在？ | 证据 | 分类 |
|------|--------|------|------|
| Route sidecar → Runtime Orchestrator | **否** | `packages/inkos-runtime/**` 零 `inkos-route` / `selected_route` 引用 | **ALIGNED** |
| Route → Planner | **否** | 无 import | **ALIGNED** |
| Route → Canon 模块 | **否** | `CONTRACT.json forbidden: write_canon` | **ALIGNED** |
| Reality → Possibility（投影） | **是** | `projectRouteRealityInput` | **ALIGNED** |
| Possibility → Writer → Commit（间接） | **否** — 未接线 | spec 箭头 only | **ALIGNED**（隔离） |
| 未来错误接线风险 | — | `selected_route.direction` → `scene.goal` | **POLLUTION RISK**（潜在，今日未发生） |

**结论**：今日 **无 Possibility → Reality 实路径**。Route P0 隔离符合 Contract。

---

### G. LLM — 全部调用与 authority

**传输层**：`packages/inkos-brain/src/writer/llm-writer.js` → `chatCompletion()`

| # | 模块 | 函数 | 用途 | 输入 authority | 输出 authority | 可写 Canon | 可影响 state | 可创建 facts |
|---|------|------|------|---------------|---------------|-----------|-------------|-------------|
| G1 | `llm-writer.js` | `createLlmWriter` | Runtime scene prose | canon modules + plan (`scene.goal`) | `scene.text` | 经 commit **是** | `ch_*_scenes.json` | **否**（facts 来自 intent） |
| G2 | `studio-llm-writer.js` | `studioLlmWriter` | Studio beat/scene prose | 同上 + Director/beats/continuity | scene prose | 经 commit **是** | 同上 | **否** |
| G3 | `reader-simulator.js` | `callReviewer` | 章后 hook 评分 | chapter prose | JSON metrics | **否** direct | metrics | **否** |
| G4 | `reader-simulator.js` | `polishChapterAfterReaderSim` | 章润色 | prose + hints | rewritten text | 经 commit **是** | workingText | **否** |
| G5 | `generate-candidates.js` | `generateRouteCandidates` | Route 候选 | `projectRouteRealityInput` | sidecar JSON | **否** | sidecar only | **否** |
| G6 | `select-route.js` | `selectRouteQualitatively` | Route 选择 | candidates + trajectory | `selected_route.json` | **否** | sidecar only | **否** |
| G7 | `ai-service.js` | `generateModule` | 模块编辑/生成 | 用户 current content | MD/JSON | **人工 save 时** | module files | 模块内容 |
| G8 | `ai-service.js` | `trialWriteOpening` | 开篇试写 | wizard fields | preview text | **否** | **否** | **否** |
| G9 | `creator-intelligence.js` | `analyzeStoryDirector` 等 | DNA/世界/角色顾问 | pitch + modules | JSON advisory | **显式 save 时** | sidecar/system | **否** |
| G10 | `creator-loop.js` | `callIncrementalLlm` | 增量编辑 | current MD | updated MD | **save 时** | module | 可能 |
| G11 | `living-novel-engine.js` | `evolveWorldState` | 世界状态提案 | chapter prose | proposal JSON | 默认 **否** | proposal | **否** |

**规则层（无 LLM）**：`planner.js`, `decision.js`, `conflict.js`, `validation.js`, `causal-reasoner.js` (mock), `hard-filter.js`, `project-route-reality.js`

**原则确认**：**LLM 永远不是 Canon authority**。但 LLM prose 可经 `MemoryUnit.commit` 或 `acceptChapter(force)` 进入磁盘；facts/timeline **不来自 LLM 直接解析**，而来自 plan/causal 启发式 — 仍是 **POLLUTION RISK**。

---

## 4. Drift Matrix

| ID | Drift（§9） | 当前行为 | 期望 Contract | 代码路径 | 输入 | 输出 | 风险 | 所需 Contract |
|----|------------|---------|--------------|---------|------|------|------|--------------|
| DR-01 | L1 未成为 production gate | `scene.goal` 驱动 Writer；无 prose Choice 裁决 | L1: Access∧Agency∧SubjectPresent → VALID/UNKNOWN/INVALID | `planner.js` → `decision.js` → `llm-writer.js` | plan scenes | prose + commit | Choice→Action 坍塌；plan 冒充 Choice | **D4 L1/L2 Contract** |
| DR-02 | L2 未接 runtime | 无 dominance 判定 | L2 仅在 L1 VALID 后 | — | — | — | 无法研究支配性 | **D4 L2 Contract** |
| DR-03 | Canon 多 mutation entry | 6+ 独立写入路径 | 单一 Reality Gate + provenance | 见 §5 | 各异 | 08/11/13/chapters | 非确定性 Canon；回滚困难 | **D1 + D5** |
| DR-04 | Planner story-decision residue | `mainGoal`, scenes, obstacles 写 facts/timeline/09 | Planner = Possibility Map only；Planner ↛ Reality | `planner.js` → `buildStateDelta` → `writeNextChapterTask` | plan intent | 13/11/09/08 | Plan→Reality 污染 | **D1 + D3** |
| DR-05 | Route sidecar 不被 Runtime 消费 | CLI only | P0 冻结：隔离正确 | `inkos-route/cli` | filtered reality | sidecar | 今日 **无风险**；未来接线风险 | **ALIGNED**（P0） |
| DR-06 | Writer/CLI/Studio 不同 mutation 路径 | Runtime 有 validation；accept/post 绕过 | 所有路径经同一 Gate | `chapter-pipeline` vs `chapter-audit` vs `cli post` | 各异 | Canon | acceptChapter 无 replay（F01） | **D5 Writer→Reality Gate** |

### 4.1 细项 Drift 标签（实现 vs 冻结原则）

| 区域 | 标签 | 说明 |
|------|------|------|
| Story Route P0 隔离 | **ALIGNED** | 无 Possibility→Reality；Contract 遵守 |
| `causalChain.choice` null when no basis | **ALIGNED** | S8.2 无 mock default |
| S6.1 `scene.goal` 不进 timeline | **ALIGNED** | `resolveTimelineEvents` 不读 goal |
| `mainGoal` → immutable fact | **IMPLEMENTATION DRIFT** | L02 |
| plan consequence → timeline | **IMPLEMENTATION DRIFT** | L01 |
| `inferWorldAfter` → Writer prompt | **IMPLEMENTATION DRIFT** | L05 |
| `deriveRelationshipState` → anchor | **IMPLEMENTATION DRIFT** | L06 |
| `acceptChapter(force:true)` | **IMPLEMENTATION DRIFT** | 无 validation replay |
| PROSE → GATE → Canon | **MISSING CONTRACT** | 链全 MISSING |
| L1 Observer | **MISSING CONTRACT** | golden only |
| Character State provenance | **MISSING CONTRACT** | D2 未定义 |

---

## 5. Pollution Paths

来源：`PLAN_REALITY_LEAKS.json` + 代码审计验证。

| ID | 严重度 | 路径 | Producer | Consumer | 伪装为 | 标签 |
|----|--------|------|----------|----------|--------|------|
| L01 | CRITICAL | authoredPlan.cost → mockReason → causalChain.consequence → 11 | PLAN | timeline | 已发生 consequence | **POLLUTION RISK** |
| L02 | CRITICAL | intent.mainGoal → buildStateDelta.facts → 13 | PLAN | facts_db | immutable fact | **POLLUTION RISK** |
| L03 | HIGH | intent → buildCurrentStateTable → 08 | PLAN | current_state | 章后世界状态 | **POLLUTION RISK** |
| L04 | HIGH | scene.consequence defaults → resolveTimelineEvents → 11 | PLAN/INFERENCE | timeline | scene 实际 outcome | **POLLUTION RISK** |
| L05 | HIGH | plan.consequence → inferWorldAfter → Writer prompt | PLAN/INFERENCE | situation | 世界 after 指令 | **POLLUTION RISK** |
| L06 | HIGH | intent.obstacles → deriveRelationshipState → anchor | PLAN | relationship_state | 关系事实 | **POLLUTION RISK** |
| L07 | MED | intent.newForeshadow → 12 | PLAN | foreshadow_db | open hook | **POLLUTION RISK** |
| L08 | MED | acceptChapter → writeNextChapterTask → 09 | GENERATED | planNextChapter | Author Direction | **POLLUTION RISK** |
| L09 | MED | beatPlan → extractBeatStateDelta → beat memory | PLAN | writer prompt | prose-derived delta | **POLLUTION RISK** |
| L10 | LOW | prose tail → deriveClosingEmotion → anchor | PROSE-HEURISTIC | anchor emotion | 部分 reality | **POLLUTION RISK** |
| L11 | LOW | prose regex → continuity.json | PROSE-HEURISTIC | writer only | state | **ALIGNED**（不进 Canon） |
| L12 | MED | plan-derived facts → deriveBodyStateFromFacts | CANON-READ(plan) | continuity | body state | **POLLUTION RISK** |
| L13 | MED | evolveWorldState regex on prose | PROSE-HEURISTIC | world_state proposal | 世界事实 | **POLLUTION RISK** |

**读侧过滤不阻止写侧泄漏**：`filterCanonicalTimelineEvents`（S6.3）与 `projectRouteRealityInput` 仅保护 Route/Writer **读**；`buildStateDelta` **写**路径无 Gate。

**Witness 状态**：`golden/reality/lib/pollution-witnesses.js` 记录 L02 等泄漏；`SCOPE.json` 规定 leaks 存在时 witness expect PASS，Phase 3 后 invert。

---

## 6. LLM Authority Map

```text
                    ┌─────────────────────────────────────┐
                    │         LLM (semantic layer)         │
                    │  replaceable · never Canon authority │
                    └──────────────┬──────────────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
         ▼                         ▼                         ▼
   Writer prose              Route sidecar            Studio advisory
   (G1,G2,G4)                (G5,G6)                  (G7–G11)
         │                         │                         │
         │ scene.text              │ JSON only               │ MD/JSON draft
         ▼                         ▼                         ▼
   chapters/*.md            story-route/              novel/01–06, 09
   ch_*_scenes.json         (non-canon)               (human save gate)
         │
         │  NO prose→fact parser
         ▼
   MemoryUnit.commit ──→ buildStateDelta(intent, causalChain)
         │                      │
         │                      ├──→ 13_facts (plan template)  ⚠
         │                      └──→ 11_timeline (causal)     ⚠
         ▼
   CANON (08/11/13/12/14/15)

Bypass paths (no validation replay):
   acceptChapter(force) ──→ commit
   inkos post ──→ applyPostChapter
   writeModule ──→ bibles / 09
```

| Authority 类型 | 持有者 | LLM 可担任？ |
|---------------|--------|-------------|
| Canon FACT | 应为 Gate 后写入 | **否** |
| Canon STATE | 应为 Gate 后写入 | **否** |
| PLAN | Planner / 作者 | 可草稿，非 Reality |
| POSSIBILITY | Route sidecar | 可生成，非 Reality |
| NARRATIVE | Writer | 可生成，待 Gate |
| INTERPRETATION | 模型 | 可生成，不得自动升格 |

---

## 7. Missing Contracts

| ID | Contract | 阻塞项 | 当前状态 |
|----|----------|--------|---------|
| MC-01 | **D1 Reality Ontology** | FACT/STATE/PLAN/POSSIBILITY 正式定义；provenance；canonical status | 仅隐式文件路径 |
| MC-02 | **D2 Character State** | knowledge/belief/desire/fear/relation/constraint/tension + certainty | 分散在 bible/anchor/plan |
| MC-03 | **D3 Causality** | 何时可建立 causal relation；observed consequence 来源 | mockReason from plan |
| MC-04 | **D4 L1 Choice Formation** | Observer I/O；VALID/UNKNOWN/INVALID | golden SPEC only |
| MC-05 | **D4 L2 Dominance** | MULTI/DETERMINED/UNDER | 未定义 |
| MC-06 | **D5 Writer → Reality Gate** | prose → candidate → validate → Canon | 链全 MISSING |
| MC-07 | **PROSE → CANDIDATE type** | 候选事实类型；拒绝自动 promotion | 不存在 |
| MC-08 | **Author Confirmation Protocol** | acceptChapter 与 Gate 关系 | `force:true` 无 replay |
| MC-09 | **09 provenance / role** | generated vs authored vs Reality | 混读 |
| MC-10 | **Studio Canon write policy** | 与 ARCHITECTURE.md iron law 对齐 | 09/bibles 可写 |
| MC-11 | **Dream/Flashback/Retcon** | 特殊叙事态 | `SCOPE.json` DEFERRED |

---

## 8. D1 Phase Status (post–Negative Boundary freeze, 2026-09-02)

> **Authoritative tracker**: `golden/reality/D1-STATUS.md`

| Layer | Status |
|-------|--------|
| D1 Negative Boundary (N1–N9) | **FROZEN** — `d1-negative-boundary/SPEC.md` |
| D1 Positive Reality Definition | **OPEN** |
| Reality Authority | **OPEN** (BLOCKED for implementation) |
| Production remediation | **BLOCKED** — pollution witnesses remain; semantic illegality named in SPEC |

**This audit's §1.3 five-type table** remains a **2026-09-01 snapshot**; it is **not** re-frozen as ontology. Claim is the discussion unit; Narrative is expression carrier only.

**Next contract work (when unblocked)**: Positive Reality Definition and/or Authority — **after** architecture resolves OPEN items in `D1-STATUS.md`. Not inferred from this audit's former «五类并列» recommendation.

---

## 9. 最终判断

> **如果 LLM 明天消失，InkOS 还剩下什么？**

一个带门禁的章级 Canon 状态机：维护 `novel/` 与 `chapters/` 版本化存储、`MemoryUnit.commit` 原子提交、Git Memory 快照/回滚、确定性 Planner/Decision/Conflict/Validation 编排 — **但不能**从文本提取或确认故事事实。

> **InkOS 的真正核心是什么？**

**Reality / Canon / Provenance / Constraints 的存储、投影、状态转换边界** — LLM 是可替换语义层，永远不能自封 Canon authority。

> **今日最大架构风险是什么？**

**Plan 与 Inference 经 `buildStateDelta` 伪装为 confirmed Reality**（L01–L06），同时 **缺失 PROSE → GATE → Canon 链**。系统控制「什么是真的」这一职责 **部分失守**。

> **今日唯一符合冻结方向的生产模块？**

**Story Route P0** — Reality 投影干净、sidecar 隔离、无 Possibility→Reality 路径。

---

---

## 10. Post-audit addendum (2026-09-02)

D1 **Negative Boundary** frozen. Pollution paths (L01–L13, accept→commit, validation→commit) are **semantically illegal** under N1–N9 if treated as sufficient confirmation; **implementation unchanged** by design.

*End of audit. No production code changed. D1 Negative Boundary: documentation freeze only.*
