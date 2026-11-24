# Phase 2 Step 2.1 — State Write Audit

**Status:** COMPLETE  
**Date:** 2026-09-08  
**Phase context:** Phase 1 已冻结 — Actual Events 提取 + N+1 Prompt 只读；Director 仍用 Plan `closingWorldState`；Canon `timeline.events` 刻意 `[]`（EO-P2）。

**Question:** 今天有哪些模块会写故事状态？哪些允许保留、哪些必须迁入 State Evolution？

---

## Verdict

```
state-evolution-engine.js     ABSENT
独立写路径（故事状态相关）     ~14
Canon 物理载体族              3（MemoryUnit→applyPostChapter / CLI 直写 / patch+writeModule）
actualEvents → Canon          NO PATH
成功标准符号 writeTimeline 等  代码中不存在（仅路线图命名）
```

**最小策略：Wrap，不 Rewrite。**  
引入 `state-evolution-engine` 作为唯一语义写入口；物理 I/O（appendTimeline / MemoryUnit.commit 壳）保留在其后。

---

## Freeze Constraints（Phase 1 → Phase 2 不得回退）

| Constraint | Evidence | Phase 2 含义 |
|------------|----------|--------------|
| EO-P2：Plan/modelled → timeline.events 禁止 | `resolveTimelineEvents` → `[]` | Evolution **不得**用 Plan closing 填 11/13；只能从 Actual Events（+ 未来 Authority）填充 |
| StoryEvent `writesCanon/SR/Reality = false` | `story-event.schema.js` / `event-validator.js` | 提取器本身仍不写 Canon；Evolution 另辟 Authority 写路径 |
| Actual → N+1 Prompt 只读 | `actual-events-prompt.js` | Prompt 保持只读；写侧 = Evolution |
| Director Plan bridge | `situation-engine.js` | Plan closing ≠ Canon Reality（Phase 7） |
| Persistence ≠ Authority | MemoryUnit / applyPostChapter EO 注释 | Commit/post 为操作载体，直至 Evolution 接管语义 |

---

## Inventory Table

| Module / Symbol | File | What it writes | Trigger | Reads Actual? | Phase 2 | Recommendation |
|-----------------|------|----------------|---------|---------------|---------|----------------|
| `appendTimeline` | `inkos-core/.../yaml-store.js` | `11_timeline.yaml` | `applyPostChapter` | No（今日 events≈[]） | 物理载体 | **KEEP_VIA_EVOLUTION** |
| `appendFacts` | 同上 | `13_facts_db.yaml` | `applyPostChapter` | No（facts=[]） | 物理载体 | **KEEP_VIA_EVOLUTION** |
| `patchHooks` / foreshadow | 同上 + `post-chapter.js` | `12_foreshadow_db.yaml` | intent.newForeshadow | No | Plan residue | **MIGRATE** / **DEMOTE** |
| `patchResources` / `patchNpcSim` | 同上 | 14 / 15 | Operator delta | No | 侧表 | **MIGRATE** 或 Operator-only |
| `applyPostChapter` | `inkos-core/.../post-chapter.js` | 11/13/07/08/09/12/14/15 | MemoryUnit.commit；**亦** CLI `inkos post` / `runBrainChapter` | No | 载体 OK；直调 = 旁路 | **KEEP_VIA_EVOLUTION**；非 Evolution 调用 **BLOCK** |
| `applyStateDiffToCanon` | `inkos-brain/.../state-updater.js` | 委托 applyPostChapter | MemoryUnit.commit；deprecated `applyRuntimeStateUpdate` | No | 薄包装 | **MIGRATE** → Evolution 拥有 |
| `buildStateDelta` / `resolveTimelineEvents` | 同上 | 内存 delta（events=[]；08←intent） | buildStateDiff / commit | **No** | 输入须改 Actual | **MIGRATE**（换输入源） |
| `buildStateDiff` | `inkos-runtime/.../memory-unit.js` | StateDiff 包装 | chapter-pipeline | No | 编排 | **MIGRATE** 喂 Actual → Evolution |
| `MemoryUnit.commit` | 同上 | chapters + states + anchor + hierarchy + Canon | chapter-pipeline / acceptChapter | No（scenes 上有 actualEvents 未消费） | I/O 壳 OK | **MIGRATE** Canon 步进 Evolution；KEEP 原子 I/O |
| `commitLivingPrepare` | 同上 | states `livingPrepare` | runPostChapterEvolution | No | 提案仓 | **DEMOTE**；应用走 Evolution |
| `writeAggregatedState` | 同上 | `states/ch_XXXX.json` | commit 内部 | No | 镜像 | **KEEP_VIA_EVOLUTION** |
| `deriveRelationshipState` / anchor | 同上 | `states/ch_XXXX_anchor.yaml` | commit | No | 启发式 | **MIGRATE** / **DEMOTE** |
| `writeChapterOnly` | 同上 | chapters/*.md | deferCommit | N/A | 正文 | KEEP（非状态演化） |
| `updateMemoryHierarchy` / `saveMemoryHierarchy` | `memory-hierarchy.js` | `memory_hierarchy.json` | commit | No | Memory | **MIGRATE**（= modifyMemory 类比） |
| `patchCurrentStateTime` | `state-updater.js` | 外科改 08 时间行 | brain-context-sync（F5 常挡） | No | 旁路 | **BLOCK** 独立路径；**MIGRATE** |
| `writeNextChapterTask` | `state-updater.js` | `09_current_chapter.md` | commit / planNext | No | 规划卡 | **DEMOTE**（非核心世界态） |
| `applyRuntimeStateUpdate` | `state-updater.js` | 全 Canon | deprecated | No | 旁路 | **BLOCK** |
| CLI `inkos post` | `cli.js` | applyPostChapter | Operator | No | 旁路 | **MIGRATE** + Authority |
| `runBrainChapter` → applyPostChapter | `brain-chapter.js` | 同上 | Legacy | No | 旁路 | **MIGRATE** / **BLOCK** |
| `persistScenes` / `saveSceneArtifacts` | scene-pipeline → memory.js | `ch_*_scenes.json`（可含 actualEvents） | orch 场末 | **存** Actual；不演化 Canon | 制品 | **DEMOTE** 为制品；Evolution **读** |
| `saveChapterPlan` / `saveBrainRun` | memory.js | plan/run JSON | Planner | No | 日志 | **DEMOTE** |
| `syncPlanTimeForRun` / POV | `brain-context-sync.js` | plan JSON | Studio 预跑 | No | Plan 缓存 | **DEMOTE** |
| `writeWorldState` | `system-store.js` | `_system/world_state.yaml` | Living / API | 启发式，非 StoryEvent | 平行世界 | **MIGRATE** |
| `writeCharacterBrain` | 同上 | `character_brains/*.yaml` | Living / save | 同上 | 平行人物 | **MIGRATE**（= updateCharacter 类比） |
| `evolveWorldState` / `evolveCharacterBrains` | `living-novel-engine.js` | 默认内存提案；`persist:true` 可落盘 | 章后 | 非 StoryEvent | 提案机 | **MIGRATE**；**BLOCK** persist:true |
| `applyLivingPrepareToRuntime` | 同上 | 应用提案→world/brains | 下场 prepare | No | 旁路写 | **MIGRATE** / **BLOCK** |
| `runPostChapterEvolution` | 同上 | commitLivingPrepare | Studio 章后 | No | 提案生产 | **KEEP** 作 producer |
| API `writeWorldState` | `routes.js` | 直写 world_state | HTTP | No | 人工 | **DEMOTE** / 未来 Authored Authority |
| `extractBeatStateDelta` | `beat-memory.js` | **仅内存/Prompt**（EO-P4） | Beat 循环 | 启发式 | 禁 Canon | **DEMOTE** |
| `deriveRelationship`（causal） | `causal-reasoner.js` | 内存图 | reasoner | No | Modelled | **DEMOTE** / **BLOCK** from Canon |
| Studio `writeModule` | `module-service.js` | 任意 novel 模块 | UI/API | Human | Authored | **DEMOTE**（Author 路径） |
| story-thread / story-memory / adaptive | 各 pkg | `_system/studio/*` / adaptive_state | 进度/诊断 | No | Ops | **DEMOTE** |
| `createSnapshot` | `git-memory.js` | 备份 | commit | N/A | 备份 | KEEP |
| `ensureActualEvents` 等 | `inkos-brain/src/events/*` | 内存；经 scenes.json 落盘 | 正文后 | **是** Actual | writesCanon=false | **KEEP**；供 Evolution 消费 |
| `formatActualEventsBlock` | actual-events-prompt | Prompt only | N+1 | Yes | 只读 | **KEEP**（非 writer） |

---

## Call Graph（今日 Canon 主链）

```
Writer → scene.text
  → ensureActualEvents (writesCanon=false)
  → persistScenes (scenes.json sidecar)

Chapter end:
  buildStateDiff → buildStateDelta (events=[], facts=[], 08←intent)
  → MemoryUnit.commit
       → chapters + states + anchor + memory_hierarchy
       → applyStateDiffToCanon → applyPostChapter
            → appendTimeline([]) / appendFacts([]) / 08 rebuild

Bypasses:
  inkos post / runBrainChapter → applyPostChapter
  patchCurrentStateTime → 08
  Living applyLivingPrepareToRuntime → world_state + character_brains
  Studio writeModule / API → novel modules
```

---

## Independent Path Count

| Tier | Count | Paths |
|------|------:|-------|
| A. Canon carriers (11/13/08/…) | 3 families | MemoryUnit→applyPostChapter；CLI/brain-chapter；patchCurrentStateTime + writeModule |
| B. Living world/character | 2 | writeWorldState；writeCharacterBrain |
| C. Runtime mirrors | 3 | states JSON；anchor/relationship；memory_hierarchy |
| D. Scene/plan artifacts | 3 | scenes.json；plan/run；plan sync |
| E. Diagnostic / adaptive | 3 | story-memory；story-thread；adaptive |
| **Total** | **~14** | |

---

## Answers to Phase 2 Gate Questions

### 1. 是否已有 `state-evolution-engine.js`？

**No。** 最近似栈：`buildStateDelta` → `MemoryUnit.commit` → `applyStateDiffToCanon` → `applyPostChapter`。

### 2. 今日多少独立写路径？

**~14** 故事状态相关通道；其中 Canon 物理入口约 **3** 族。

### 3. Wrap vs Rewrite？

**Wrap。** 新增 Evolution API；迁调用点；降启发式；不重写 Writer/Director。

### 4. 成功标准里的符号名？

路线图中的 `writeTimeline` / `updateCharacter` / `modifyMemory` **代码中不存在**。验收搜索应改用：

```
appendTimeline
appendFacts
applyPostChapter
applyStateDiffToCanon
buildStateDelta
resolveTimelineEvents
buildStateDiff
MemoryUnit.commit
commitLivingPrepare
patchCurrentStateTime
writeNextChapterTask
updateMemoryHierarchy
saveMemoryHierarchy
writeWorldState
writeCharacterBrain
evolveWorldState
evolveCharacterBrains
applyLivingPrepareToRuntime
deriveRelationshipState
extractBeatStateDelta
saveSceneArtifacts
persistScenes
writeModule
writesCanon
```

**Phase 2 成功 =** 上述物理写 timeline / character / memory 的语义变更，只能从 `state-evolution-engine`（或等价 API）到达。

---

## Gap（相对 roadmap）

| Gap | 状态 |
|-----|------|
| `actualEvents` 已在 scenes.json | YES |
| `actualEvents` → 11/13/08 / character | **NO** |
| 唯一 state mutation 入口 + provenance | **NO** |
| 禁止旁路直写 Canon | **NO**（CLI / Living / writeModule 仍在） |

---

## Minimal Phase 2 Design Sketch（供 Step 2.2）

```
Actual Events (from scenes)
        ↓
state-evolution-engine.evolveFromActual(...)
        ↓
  StateDiff { timeline?, facts?, current_state?, character?, memory? }
        ↓
  provenance attached
        ↓
MemoryUnit.commit / physical carriers ONLY via Evolution
```

**P0 迁移目标（最小）：**

1. 新增 `state-evolution-engine.js` + provenance  
2. `buildStateDelta` / commit 的语义字段改由 Evolution 产出（仍可 EO-P2 空 timeline，直到 Actual→timeline 映射就绪）  
3. **BLOCK** / 包装：`applyRuntimeStateUpdate`、Living `persist:true`、`applyLivingPrepareToRuntime` 直写  
4. 测试：mutation provenance；旁路调用失败或告警  

**Explicitly not Phase 2：** Director Actual Migration（Phase 7）；Character SR（Phase 3）；Open Loop（Phase 6）。

---

## PHASE 2.1 COMPLETION REPORT

### 1. Changed Files

- `_AI_STATE_WRITE_AUDIT.md`（本文件，新增）

### 2. Architecture Change

- 无代码变更。完成写路径地图与 WRAP 策略裁决。

### 3. Tests Added

- 无（审计）

### 4. Test Result

- N/A

### 5. Failure Replay（路径级）

| Case | 今日 |
|------|------|
| Plan → 伪 timeline | EO-P2 挡住（events=[]）— **保持** |
| Actual 不驱动世界 | actualEvents 未入 Canon — **仍成立** |
| Living 旁路改人物/世界 | applyLivingPrepare / writeCharacterBrain — **仍成立** |

### 6. Remaining Risks

1. 误把 Living / Beat delta 当 Reality 写入 Canon。  
2. 一次迁完所有旁路范围过大 → 必须最小 WRAP。  
3. 过早 `writesCanon=true` 会破坏 Phase 1 冻结。

### 7. Can Enter Next Step?

**YES** — Step 2.2：定义最小 `state-evolution-engine` API + Design Gate，再小范围实现。
