# Phase 1 Step 1.1 — Actual Flow Audit

**Status:** COMPLETE（2026-09-08 源码复核）  
**Question:** 正文生成后，系统如何知道「发生了什么」？

**Short answer:**  
唯一**耐久真相**仍是散文（`scene.text` → scenes JSON / `chapters/*.md`）。  
现已有确定性 **StoryEvent 提取层**（`packages/inkos-brain/src/events/`），挂到 Studio Writer + Runtime Orchestrator，并随 scenes JSON 可落盘。  
但 StoryEvent **不写 Canon、不驱动 Director N+1、不进入 Prompt 作为 Reality**。  
N+1「世界」仍主要来自 Plan `closingWorldState`。

---

## Verdict

```
Durable Actual          = scene.text / chapters/*.md          （权威 #1）
Structured Actual       = scene.actualEvents[]               （已提取+门闩；不写 Canon）
Soft Actual projection  = F6.2 observedContinuity            （Prompt；writesCanon/SR=false）
Canon timeline.events   = []                                 （EO-P2；resolveTimelineEvents 恒空）
Director N+1 world      = Plan closingWorldState             （PLAN BRIDGE 仍在）
Delete Plan → recover?  = 事件标签 PASS；世界/人物/下一场操作输入 FAIL
```

**相对旧版本 audit：** 「StoryEvent 完全缺失」已过时。  
**相对 roadmap 验收：** 「删 Plan 仍恢复世界·人物·下一场输入」仍 **FAIL**。

---

## 1. Current Actual Sources（按权威排序）

| Rank | Source | Authority | 符号 / 路径 |
|------|--------|-----------|-------------|
| 1 | `scenes[].text` / `chapters/*.md` | **唯一耐久 ground truth** | Writer → `persistScenes` / `saveChapterFile` |
| 2 | `intent.scenes[].text` | 会话内镜像 | Runtime orch 回写；Studio orch 只回写 `text` |
| 3 | `scene.actualEvents[]` | **结构化 Actual（Phase 1）** | `ensureActualEvents`；**不进 Canon / Director** |
| 4 | `scene.observedContinuity`（F6.2） | 软投影 | `buildObservedContinuity` / `ensureObservedContinuity` |
| 5 | Prior tails / `extractSceneSummary` | 续写粘合 | `scene-summary.js`；`newFacts: []` |
| 6 | Beat `extractBeatStateDelta` | 启发式 / Plan residue | `beat-memory.js` |
| 7 | Chapter anchor / memory hierarchy | 缝合提示 | `MemoryUnit.buildChapterAnchor` |
| 8 | Living `evolveWorldState` / `evolveCharacterBrains` | 章级延迟提案 | `living-novel-engine.js` |
| 9 | Canon `11_timeline` / `13_facts` | **空事件壳** | `resolveTimelineEvents` → `[]` |
| 10 | Plan `closingWorldState` / Beat Expected | **操作影响最高，Actual 合法性最低** | `scene-execution.js` → `buildSceneSituation` |

---

## 2. Post-Write Flow（当前）

```
Writer
  · Studio: createStudioLlmWriter → beatExecution → scene.text
  · CLI/Runtime: createLlmWriter / activeWriter
  ↓
RF-01 / hardFail（Studio Beat）
  ↓
ensureObservedContinuity(scene)          [studio-llm-writer + runtime orch]
ensureActualEvents(scene, {stripPlan})   [同上]
  · 正文非空但无 valid actualEvents → throw ACTUAL_EVENT_REQUIRED
  ↓
intent.scenes[i].text (+ Runtime 可挂 OC / actualEvents)
  · Studio orch：主要 mirror text（不主动挂 OC/events；依赖 Writer 对象）
  ↓
runScenePipeline（分析 Hint；不写事实）
  ↓
persistScenes → saveSceneArtifacts
  · {bookDir}/novel/_system/brain/ch_NNNN_scenes.json
  · 可含 text、observedContinuity、actualEvents
  ↓
assembleChapter → runChapterPipeline
  ↓
buildStateDiff → buildStateDelta
  · timeline.events = resolveTimelineEvents() → []
  · 08_current_state ← intent 元数据（POV/地点/字数），非 actualEvents
  ↓
MemoryUnit.commit / writeChapterOnly / saveChapterFile
  · chapters/NNNN_*.md
  · states/ch_NNNN.json + anchor
  · applyPostChapter → 11/13/08（events 空）
  ↓
[optional] Living prepare proposals

Next Scene N+1:
  ensurePlanValidity(prev.text + OC vs goal)     ← 软降权
  Director plan ← prev Plan closingWorldState  ← PLAN BRIDGE（未读 actualEvents）
  Prompt ← OC + prior text/summary + Plan/Expected
  Writer…
```

---

## 3. Area-by-Area Findings

### 3.1 scene.text persistence

| Item | Detail |
|------|--------|
| In-memory | `studio-llm-writer.js`：`scene.text = draftText` |
| OC | `ensureObservedContinuity` — Runtime orch + studio-llm-writer |
| Actual Events | `ensureActualEvents` — Runtime orch + studio-llm-writer |
| Disk | `persistScenes` → `saveSceneArtifacts`（`scene-pipeline.js` → `memory.js`） |
| File | `{bookDir}/novel/_system/brain/ch_NNNN_scenes.json` |

### 3.2 Chapter markdown

| Path | Symbol | Output |
|------|--------|--------|
| 章通过后 | `saveChapterFile` | `chapters/NNNN_*.md` |
| MemoryUnit | `writeChapterMarkdown` / `commit` | 同上 |
| 手存 API | `saveChapterText`（Phase 0：**BLOCK**） | 同上 |

### 3.3 State updater / world after write

| Symbol | File | vs Actual |
|--------|------|-----------|
| `buildStateDelta` | `inkos-brain/.../state-updater.js` | 来自 **intent**，**不读** `actualEvents` |
| `resolveTimelineEvents` | 同上 | **恒返回 `[]`**（EO-P2） |
| `applyPostChapter` | `post-chapter.js` | 写 11/13/08 壳 |
| `MemoryUnit.commit` | `memory-unit.js` | 唯一物理 Canon 写路径 |

**08 Current State：** 无 actors/actions/consequences。

### 3.4 Timeline writer

今日 payload：`events: []`。StoryEvent **不**写入 timeline（设计：`writesCanon: false`）。正确：禁止 Plan→伪史；缺口：Actual 亦未入 timeline（Phase 2）。

### 3.5 Memory writer

| Layer | 从 Actual 存什么 |
|-------|------------------|
| Scene artifacts | `text` + OC + **actualEvents（若已挂）** |
| MemoryUnit / Hierarchy | 文本切片 — **不消费** StoryEvent |
| Story Memory pkg | 伏笔集合 — **无** prose→event 消费 |

### 3.6 Character state

| Mechanism | Actual? |
|-----------|---------|
| Plan / authored characterPush | Expected |
| `extractBeatStateDelta` | 启发式，非 SR |
| StoryEvent.stateChanges（如 `speech:苏晚`） | **标签级**；无 SR / bible 写入 |

**无** `actualEvents` → Character SR 路径。

### 3.7 Observed Continuity（F6.2）

- 文件：`packages/inkos-prompt/src/scene-observed-continuity.js`
- Flags：`writesCanon: false`，`writesSR: false`
- **≠** StoryEvent；**≠** Canon Reality

### 3.8 StoryEvent 层（已存在）

| 文件 | 职责 |
|------|------|
| `packages/inkos-brain/src/events/story-event.schema.js` | schema + `createStoryEvent` + `stripPlanFromScene` |
| `event-extractor.js` | 确定性提取：open_choice / choice_settled / speech / action / presence fallback |
| `event-validator.js` | evidence ∈ text；禁 Plan sources；Phase1 禁 writesCanon/SR/Reality |
| `index.js` | 导出 `ensureActualEvents` 等 |

Schema 必含字段：`id, sceneId, actors, action, consequence, stateChanges, affectedEntities`（+ evidence/source/kind）。

接线：

- Runtime：`orchestrator.js` — 空数组硬失败 `ACTUAL_EVENT_REQUIRED`
- Studio Writer：`studio-llm-writer.js` — 同上
- Studio orch：**不直接调用**；依赖 Writer 路径
- Prompt compiler：**不读** `actualEvents`
- Director：**不读** `actualEvents`

测试：

```
npm run test:event-foundation   → PASS（Node ≥20）
```

证明：删 Plan 字段后仍可从正文恢复 actors / action / stateChanges 标签。

### 3.9 Director.before / Plan → N+1

```94:114:packages/inkos-director/src/scene-execution.js
  const prevClosing = prevScene?.scenePlan?.situation?.closingWorldState
    || prevScene?.executionPlan?.situation?.closingWorldState
    || null;
  // ...
  buildSceneSituation({ ..., prevSceneClosingState: prevClosing, ... });
```

→ **N+1 `worldBefore` = 上一场 Plan closing**，不是 `actualEvents`。

### 3.10 Plan 能否不读 Actual 仍驱动「现实」？

**能 — 操作面上仍成立。**

| Next-scene input | Plan? | Actual text / Events? |
|------------------|-------|------------------------|
| Goal / beats / situation | **Yes** | F8.3 软降权 |
| Director `worldBefore` | **Yes** | **No**（不读 actualEvents） |
| Writer Expected / Beat After | **Yes** | OC/Validity 软约束 |
| Continuation / prior summaries | No | **Yes**（散文） |
| OC block | No | **Yes**（投影） |
| `actualEvents` 进 Prompt / State | — | **未消费** |
| Canon facts | Neither（空） | Neither |

---

## 4. Gaps vs Roadmap StoryEvent Acceptance

| Field / Requirement | Exists? | Gap |
|---------------------|---------|-----|
| id / sceneId / actors / action / consequence / stateChanges / affectedEntities | Yes | 质量仍为启发式标签 |
| Persist with scenes | Yes（若 Writer 挂载） | 无独立 event store |
| Gate before next scene（正文非空须有事件） | Yes（Writer/Runtime） | Studio orch / chapterText 旁路风险 |
| Feed N+1 Prompt / Director | **No** | Phase 1 剩余 / Phase 7 |
| Drive State Evolution / Canon | **No** | Phase 2（且须保持 EO-P2） |
| 删 Plan → 世界/人物/下一场输入 | **FAIL** | 仅事件标签 PASS |

---

## 5. Delete Plan Recovery（实测）

| Recoverable from prose alone? | Verdict |
|-------------------------------|---------|
| StoryEvent 标签（actors/action/stateChanges） | **PASS**（`test:event-foundation`） |
| 叙事连续（tails、OC） | Partial **yes** |
| 结构化世界状态（08 / situation / Living） | **No** |
| Character SR / 关系事实 | **No** |
| Canon timeline / facts | **No**（刻意空） |
| Director situation / Beat Expected | **No** |
| Next-scene goal / 因果链 | **No** |

---

## 6. What Exists vs Remaining Phase 1 Work

### Exists（脚手架 + 门闩）

- `packages/inkos-brain/src/events/` 全套
- Studio Writer + Runtime orch 挂载 + `ACTUAL_EVENT_REQUIRED`
- `npm run test:event-foundation` PASS
- EO-P2 空 timeline 未回退
- F6.2 OC 保持投影

### Phase 1 仍须完成（相对 roadmap 验收 / 冻结）

1. **最小消费面（推荐仍属 Phase 1 收尾，不做 State Evolution）：**  
   下一场 Prompt 或 Director situation 至少能 **只读** `prev.actualEvents` 回答「谁做了什么」，且不依赖 Plan closing 作为唯一来源。
2. **挂载一致性：** Studio orch / chapterText import 与 Runtime 同等保证 `ensureActualEvents`；persist 前 OC+events 回写 intent。
3. **验收补强：** 测试不仅证明事件标签，还证明「无 Plan 时下一场输入仍含 Actual 摘要」（仍可不写 Canon）。

### Explicitly out of Phase 1

- 统一 `state-evolution-engine`（Phase 2）
- Character SR（Phase 3）
- Director Actual Migration 全量（Phase 7）
- Canon timeline 写入（须等 Authority / Phase 2）

### Design freeze（仍有效）

> EO-P2 不得回退：禁止 Plan/modelled → timeline。  
> StoryEvent 只来自 `scene.text`（或 annotated+evidence）。  
> OC / Beat delta 保持投影，不得升级为 Canon Reality。  
> Phase 1 events：`writesCanon/writesSR/writesReality = false`。

---

## 7. Key File Index

| Concern | Path | Symbols |
|---------|------|---------|
| Studio write + gate | `packages/inkos-studio-server/src/studio-llm-writer.js` | `ensureActualEvents` |
| Studio orch | `packages/inkos-studio-server/src/studio-orchestrator.js` | 仅 mirror text |
| Runtime orch | `packages/inkos-runtime/src/pipeline/orchestrator.js` | OC + Actual + gate |
| StoryEvent | `packages/inkos-brain/src/events/*` | schema / extractor / validator |
| State / timeline | `packages/inkos-brain/src/memory/state-updater.js` | `resolveTimelineEvents` → `[]` |
| Director bridge | `packages/inkos-director/src/scene-execution.js` | `prevClosing` → `worldBefore` |
| F6.2 OC | `packages/inkos-prompt/src/scene-observed-continuity.js` | `buildObservedContinuity` |
| Tests | `scripts/test-event-foundation.js` | Plan-delete recovery |

---

## PHASE 1.1 COMPLETION REPORT

### 1. Changed Files

- `_AI_ACTUAL_FLOW_AUDIT.md`（本文件，相对旧版重写为「脚手架已存在」）

### 2. Architecture Change

- 无新代码。审计结论从「StoryEvent 缺失」修正为「已提取未消费；Plan bridge 仍在」。

### 3. Tests Added

- 无（已有 `test:event-foundation`）

### 4. Test Result

```
npm run test:event-foundation → PASS（Node v20.16.0）
```

### 5. Failure Replay（路径级）

| Case | 机制 | 今日 |
|------|------|------|
| Plan override | Director `prevClosing` ← Plan | **仍成立** |
| Choice disappearance（Ch2 S3） | 可抽 `open_choice` event；Open Loop 未建；不能阻止跳走 | 审计/标签级 |
| Hospital cold open | F8.3 软降权；非 Actual 驱动 | 部分缓解 |

### 6. Remaining Risks

1. 事件已提取但未消费 → 给人「Actual First 已达成」的假象。  
2. Studio orch / 旁路路径可能漏挂 `actualEvents`。  
3. 提取器启发式 → presence fallback 可能产出弱事件；宁缺勿滥仍须守住。  
4. 默认 shell Node v12 会让测试语法失败；需 Node ≥20。

### 7. Can Enter Next Step?

**YES — 但不是从零做 1.2。**

| Step | 状态 |
|------|------|
| 1.1 Actual Flow Audit | **DONE**（本文件） |
| 1.2 StoryEvent schema/extractor/validator | **DONE**（代码已在） |
| 1.3 Writer → Extract → Validate → Save | **PARTIAL**（门闩有；消费与下一场输入无） |
| Phase 1 Freeze / roadmap 验收 | **NO** — 须完成最小消费面 + 验收补强后再冻结 |

**下一步：** Phase 1 收尾 — Actual 只读注入 N+1（Prompt 或 Director situation 摘要），证明删 Plan 后下一场仍见 Actual；然后出 `PHASE 1 COMPLETION REPORT`。
