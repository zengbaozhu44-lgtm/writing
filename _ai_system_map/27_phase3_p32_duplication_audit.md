# 27. P3.2 Redundant State Slots — 重复存储审计

> 审计令（用户拍板，2026-08-19）：**不是「继续删字段」，而是「找出同一个 Story Truth 被存储两次、三次、五次的地方」**。
> P3.1 证明「减法不会伤故事」；P3.2 要证明「**一个故事事实不应该拥有五个名字**」。
> 判据沿用 **Content Contribution Test**：每个字段问「谁是 source of truth？谁只是 projection / render slot？同一事实是否被多个载体存储/多次重新解释？」
> 依据 D20（executionPlan 双层嵌套 = 副本）、D21（push/priorityGoal/fear/choice 是派生事实非渲染槽位）、D22（source→derive()→executionPlan，禁回写）。
> **本审计只给地图与候选，拍板后再动代码，不预先删。**

---

## 0. 审计范围（用户指定）

```
A. characterDesire / priorityGoal / push / fear / choice
B. chapterGoal / authorIntent / sceneGoal / priorityGoal
C. scenePlan / executionPlan
D. derive → write back → another layer derives again
```

---

## 1. 顶层结论

**同一故事事实在 InkOS 里平均有 4-6 个载体**，分两类：

1. **同值多槽（存储重复）**：同一派生值被复制进 plan → planWithChapter → executionPlan 顶层 + 嵌套 scenePlan → beats 内容 → studio 双轨 re-derive。
2. **中间翻译（解释重复）**：同一底层事实（scene.goal）被 `derivePriorityGoal` 清洗成 priorityGoal、被 `deriveSceneFear` 清洗成 fear、被 planner 写成三个别名字段（authorIntent/sceneSeed/lore）——每个名字是一次「重新解释」。

**关键修正（审计中发现，纠正 2.8 旧印象）**：`executionPlan.priorityGoal` 顶层**存在**，不是幽灵槽。真正的幽灵槽是 `scene.priorityGoal` / `scene.fear` / `scene.immediateGoal`——**全仓 authored 计划从不携带**（见 §5），**C1 后 derive 函数不再读它们**。

**C1 收敛后**：`plan.priorityGoal`/`plan.fear` 中间槽已从代码消失（禁回写，D22），派生值只在 executionPlan 边界落 2 份 render slot（顶层 + 嵌套 scenePlan）。「一个故事事实五个名字」在 drive/fear 上已压到 4 个载体。

---

## 2. 事实 × 载体地图（文件:行 实证）

### 集群 A — 角色驱动 drive（priorityGoal）【C1 后】

| # | 载体 | 位置 | 写入者 | 类型 |
|---|---|---|---|---|
| 1 | `scene.priorityGoal` / `immediateGoal` | authored scene | 无（从不写） | 幽灵源（derive 分支已删） |
| 2 | `scene.goal` / `plan.goal` | authored/planner | 导演/planner | **source of truth** |
| 3 ~~| `plan.priorityGoal` | 工作 plan | `:695` 回写~~ | ❌ **C1 已删（禁回写）** |
| 4 ~~| `planWithChapter.priorityGoal` | 变体3 | 继承 `...plan`~~ | ❌ **C1 后随之消失** |
| 5 ~~| `executionPlan.priorityGoal` | 顶层 | 局部派生值投影~~ | ❌ **C2 已删（收敛嵌套单层）** |
| 6 | `executionPlan.scenePlan.priorityGoal` | 嵌套 | `scene-execution.js`（局部派生值） | **唯一 owner** |
| 7 | `beat-continuity.js:976 drive.priority` | studio | 读 `plan.priorityGoal`（plan=executionPlan.scenePlan），缺则自 derive | 消费者/双轨派生 |
| 8 | `continuation-engine.js:85-94 prevGoal/curGoal` | studio | 读 `executionPlan.scenePlan?.priorityGoal` | 消费者 |

→ **C1+C2 后：同一事实载体 6+ → 1 owner（嵌套）+ 3 消费边，无冗余存储。**

### 集群 B — 角色恐惧 fear【C1 后】

| # | 载体 | 位置 | 写入者 | 类型 |
|---|---|---|---|---|
| 1 | `desire.fear` | storyDna → character-desire-engine | 作者 | **source of truth** |
| 2 | `scene.fear` | authored scene | 无（从不写） | 幽灵源（derive 分支已删） |
| 3 ~~| `plan.fear` | 工作 plan | `:696` 回写~~ | ❌ **C1 已删（禁回写）** |
| 4 | `conflict.risk` | conflict-engine | 派生回退源 | 二级源 |
| 5 ~~| `executionPlan.sceneFear` | 顶层 | 局部派生值投影~~ | ❌ **C2 已删（0 消费者）** |
| 6 ~~| `executionPlan.scenePlan.sceneFear` | 嵌套 | 局部派生值投影~~ | ❌ **C2 已删（0 消费者）** |
| 7 | `beat-continuity.js:1024-1028 drive.fear` | studio | `desireObj?.fear \|\| scene?.fear`（scene.fear 幽灵槽） | 消费者/双轨 |

→ **C1+C2 后：fear 无独立存储槽。source = desire.fear（作者），派生局部 feeding deriveSceneChoice，不持久化。载体 5+ → 仅 source + 局部派生。**

### 集群 C — 场景抉择 choice

| # | 载体 | 位置 | 写入者 | 类型 |
|---|---|---|---|---|
| 1 | `scene.scenePlan.choice` / `scene.choice` | authored/planner | 导演/planner | **source of truth** |
| 2 | `plan.choice` | 工作 plan | `scene-execution.js:705`（`deriveSceneChoice` 条件回写） | 派生 |
| 3 | `planWithChapter.choice` | 变体3 | `:801`（`plan.choice \|\| chapterNarrative?.choice`） | 派生副本 |
| 4 | `executionPlan.choice` | 顶层 narrativeFields | `:831/:1073` | 派生副本 |
| 5 | `executionPlan.scenePlan.choice` | 嵌套 | `:1108`（继承 planWithChapter） | 派生副本 |
| 6 | `beat.choice` | 拍级 | `:937`（仅 choice 拍） | 渲染 |
| 7 | `beatContent` 逐拍 `map.choice` | 拍内容 | `:389-419` | 渲染 |

→ **同一事实 5+ 载体 + 2 个渲染出口。**

### 集群 D — 作者意图 authorIntent（一个值三个字段名）

| 载体 | 位置 | 写入者 |
|---|---|---|
| `scene.authorIntent` | authored scene | 作者/planner |
| `sceneSeed` | `planner.js:743` | planner（写**同一值**） |
| `authorIntent` | `planner.js:744` | planner（写**同一值**） |
| `lore` | `planner.js:745` | planner（写**同一值**） |
| `scene-director.js:85` | 透传 | scene-director |
| `executionPlan.scenePlan.authorIntent` | 嵌套副本 | 继承 |
| `beat-slimmer.js:606-609` | 消费 | `scene?.authorIntent \|\| executionPlan.scenePlan?.authorIntent` |

→ **planner.js:743-745 把同一值同时写进 3 个字段名**，consumers 再双 carrier pick。D18 判据（同一事实多载体 = 重复）命中。

### 集群 E — scenePlan / executionPlan 双层嵌套（D20 实证）

```
scene.scenePlan (authored/planner)                 ← source
  → migrateScenePlan { ...plan }  (beat-state.js:398) ← 拷贝1
    → buildSceneExecutionPlan 工作 plan (派生写入)     ← 拷贝2 + 派生
      → planWithChapter { ...plan, +章叙事兜底 } (:801) ← 拷贝3
        → executionPlan.scenePlan { ...planWithChapter, +派生 } (:1108) ← 拷贝4
        → executionPlan 顶层 priorityGoal/sceneFear/choice (:1073/:1103) ← 提副本
          → beats 内容 (beatContent :389)               ← 渲染
          → run.json 持久化整份双层嵌套
```

→ 同一 plan 数据在 executionPlan 内存在 **2 层**（顶层 + 嵌套 scenePlan），顶层还单独提 `priorityGoal/sceneFear/choice/cost/escalation` 等字段副本。`continuation-engine.js:85-94` 的 `plan.priorityGoal || plan.scenePlan?.priorityGoal` 就是读这两层。

---

## 3. 派生链形态（A 事实「角色最高驱动」为例）

```
storyDna.character_desires ──► character-desire-engine.buildCharacterDesireProfile
    │                             │  desire{externalGoal, internalDesire, fear, wound, changeArc}
    │                             └─► characterPush {before, after}            [派生1]
    │
    ├─► derivePriorityGoal(scene.goal+desire) ──► executionPlan.priorityGoal[顶层] + scenePlan.priorityGoal[嵌套]  [派生2 → C1后 2 render slot]
    ├─► deriveSceneFear(desire.fear+conflict.risk) ──► executionPlan.sceneFear[顶层] + scenePlan.sceneFear[嵌套]   [派生3 → C1后 2 render slot]
    ├─► deriveSceneChoice(显式choice) ──► plan.choice（一等字段）──► executionPlan.choice[顶层] + beat.choice + beatContent [真实内容 → 3出口]
    │
    └─► studio 双轨：beat-continuity drive.priority/fear（读 executionPlan 出口，缺则自 derive） [双轨 re-derive — C4 待收]
         continuation-engine prevGoal/curGoal（读 executionPlan 顶层/嵌套）                    [双轨 re-read — C4 待收]
```
**C1 收敛点**：`plan.priorityGoal` / `plan.fear` 中间槽删除（禁回写，D22）；derive 函数不再读幽灵槽；派生一次 → 只在 executionPlan 边界暴露。

---

## 4. 哪些是「可收敛的中间翻译」，哪些是「该保留的消费者投影」

### ✅ 保留（消费者投影，有独立职责）
- **compiler P1 Character Goal 块**（`prompt-compiler.js:200` `formatCharacterDesireBlock`）：唯一源渲染点，读 `ep.characterDesire + ep.characterPush`——该保留（这是作者可见的意图块）。
- **`beatContent` 逐拍渲染**（`:389-419`）：执行渲染，必然出口。
- **`chapterGoal`**（chapter-blueprint）：近单 owner（build → blueprint 对象 → 消费），低重复。
- **`sceneGoal`**（compiler `:284/:358`）：`sceneGoal` 只是 `scene.goal` 的别名渲染，无独立派生，低危。

### ⚠️ 可收敛（中间翻译/同值多槽）
- **C1｜priorityGoal/fear/choice 的中间槽**：`plan.priorityGoal/fear` 回写已删（✅ DONE）；`plan.choice` 保留（一等字段）。executionPlan 顶层/嵌套双份（`:1103-1109`）为 **render slot，保留**——C2 再判是否去重。
- **C2｜executionPlan 双层嵌套**：✅ DONE（收窄版）——复证证明两层**不等价**（compiler 混合读），完整 owner 化会断 compiler；只收敛真冗余：priorityGoal 顶层投影删 → 嵌套单层 owner；sceneFear 顶层+嵌套双删（0 消费者）。**不动 compiler/beats/characterDesire**。
- **C3｜authorIntent/sceneSeed/lore 三别名合一**：✅ DONE（写一个字段，consumers 统一读）。
- **C4｜studio 双轨 re-derive**：beat-continuity/continuation-engine 复用 runtime 的 derive 输出或共享单一 derive 模块，不各自 re-derive/re-read。❌ 本轮不做，单独立项（执行责任重复非状态重复）。

### ❌ 幽灵槽（无写入者，可直接确认死）
- `scene.priorityGoal` / `scene.immediateGoal`（derivePriorityGoal 显式分支 `:226-227`，从不命中）
- `scene.fear`（deriveSceneFear 的 scene 分支 `:280-283`，从不命中）
- `beat-continuity.js:976` `executionPlan?.priorityGoal` 与 `scene?.priorityGoal`（有顶层值但 studio 走双轨时是同一值再 pick）

---

## 5. 幽灵槽验证（全仓实证）

```
全仓 authored 计划（books/**/chapter_plans/*.yaml + scenePlan）携带 priorityGoal / fear / immediateGoal？
→ 无。grep priorityGoal 于 books/**/*.yaml（排除 snapshots）= 0 命中。
→ 结论：derivePriorityGoal 的「显式优先」分支（scene.priorityGoal/plan.priorityGoal/immediateGoal）在真实数据流中从不命中，
   priorityGoal 永远是 goal+desire 的派生投影，却存在 4+ 载体。
```

---

## 6. 拍板项（本审计不预删，等拍板定范围）

| 项 | 内容 | 风险 | 涉及文件 | 状态 |
|---|---|---|---|---|
| **C1** | priorityGoal/fear/choice 派生不落中间槽，一次派生直渲染 beats | 中（动 beats 渲染链 + compiler 消费） | scene-execution / beat-state / prompt-compiler | ✅ **DONE（2026-08-19）** |
| **C2** | executionPlan 顶层与嵌套 scenePlan 同值去重（选嵌套为 owner，顶层字段删/指针化） | 中（golden executionPlan fingerprint 会变） | scene-execution / continuation-engine / beat-slimmer | ✅ **DONE（2026-08-19，收窄版）** |
| **C3** | authorIntent/sceneSeed/lore 三别名合一 | 低（纯字段名收敛，planner+consumers 同步） | planner.js / scene-director / beat-slimmer | ✅ **DONE（2026-08-19）** |
| **C4** | studio 双轨 re-derive 对齐单一 derive 源 | 中（studio 与 runtime 行为对齐，需双轨回归） | beat-continuity / continuation-engine / writer-optimization | ❌ 本轮不做（执行责任重复非状态重复；单独立项） |

**执行顺序（已执行）**：C3 → 全绿 → C1 → 全绿 → 重新生成 ownership map → **再确认 C2**。每刀过 golden 回归（executionPlan/promptFingerprint 若变，需同步 golden fixture——P3 代码改动须同步 golden 指纹，见 [[inkos-golden-baseline]]）。

---

## 6.1 C3 执行记录（authorIntent/sceneSeed/lore 三别名合一）— ✅ DONE

**改动**（4 处，值保持不变，prompt 内容不变，executionPlan 语义不变）：
- `planner.js:743-748`：scene 返回对象删除 `sceneSeed:` 与 `lore:` 两个别名键，只留 `authorIntent`（goal 不再拼 authorIntent，作者意图作导航旁注）。
- `scene-director.js:57-61`：authorIntent 回退链只剩 `scene.authorIntent || intent.sceneSeeds?.[N]?.seed || null`（sceneSeed/lore 别名移除）。
- `scene-director.js:84-86`：raw plan 只写 `authorIntent`，删 `lore:`/`sceneSeed:` 别名写入。
- `beat-slimmer.js:604-615`：6 路回退坍缩为 `scene?.authorIntent || executionPlan.scenePlan?.authorIntent || ''`。

**全绿证明**：golden build → executionPlan/promptFingerprint/pipeline/gateOutputs(5/6) byte-identical；memoryMutation 唯一 diff = `ch_0001_plan.json` modified（删 2 个 alias 键，值相同）；added 33 / modified 6 不变；`sceneSeed` 剩余引用均为复数 `sceneSeeds`（卷纲种子数组，独立概念）。3 回归绿。

## 6.2 C1 执行记录（derive 链收敛）— ✅ DONE

**铁律（用户拍板）**：**派生值不是故事状态（Derived value is not Story State）**。priorityGoal/fear/choice 可以存在为运行时派生结果 / render slot，但**不能写回 plan、不能有独立持久状态身份**。

**改动**（scene-execution.js，4 刀，单一回归）：
1. `derivePriorityGoal` 删显式分支（scene.priorityGoal/plan.priorityGoal/immediateGoal 幽灵槽读）——派生源唯一（scene.goal/plan.goal + desire）。
2. `deriveSceneFear` 删 scene.fear/plan.fear 分支 + **签名不再收 plan**——派生源唯一（desire.fear → conflict.risk/cost）。
3. `:695-696` 删 `plan.priorityGoal = priorityGoal; plan.fear = sceneFear;` 回写（D22 单向派生禁回写），只留局部 const。
4. executionPlan 顶层 + 嵌套 scenePlan 的 `priorityGoal/sceneFear` 改由局部派生值暴露（**render slot 出口保留，不删最终执行出口**）。
- **保留**：`plan.choice` 回写（:705，一等 beat 字段）+ `plan.consequence/cost`（真实内容非派生）。

**全绿证明**：
- golden verify：12 处漂移**全部为 readerSimulator 簇**（本次 LLM fetch failed → heuristic 兜底，baseline 为真实 LLM——FOLLOW-UP A 已知环境 flake）。**executionPlan / promptFingerprint / pipeline / gateOutputs(5/6) byte-identical，plan.json 无 diff**；run.json + reader_sim_baseline.json hash 变化仅为 readerSimulator 下游。
- 3 回归全绿：test-decision-conflict-null OK / test-memory-unit OK / test-chapter-audit-flow All 13 checks passed。
- **studio 双轨零行为影响**：`resolvePriorityDrive` 的 `plan = executionPlan.scenePlan || scene.scenePlan`——读 executionPlan 嵌套（`priorityGoal` 由 local 继续暴露）或 authored plan（本就不带）；`plan.fear` 因嵌套 key 是 `sceneFear` 而非 `fear`，C1 前即死读。continuation-engine 读 `executionPlan.priorityGoal || executionPlan.scenePlan.priorityGoal`，两出口均保留。

**收敛后事实地图（C1 后）**：
```
storyDna → desire ──► derivePriorityGoal(scene.goal+desire) ──► executionPlan[顶层 priorityGoal + 嵌套 scenePlan.priorityGoal]  [render slot ×2]
                  └──► deriveSceneFear(desire.fear+conflict) ──► executionPlan[顶层 sceneFear + 嵌套 scenePlan.sceneFear]       [render slot ×2]
                  └──► plan.choice（一等字段）──► executionPlan.choice + beat.choice + beatContent                                 [真实内容，保留]
```
**不再存在**：`plan.priorityGoal` / `plan.fear` 中间槽、`planWithChapter.priorityGoal/fear` 继承副本、derive 函数的幽灵槽显式分支。

## 6.3 C2 执行记录（executionPlan 双层去重·收窄版）— ✅ DONE

**拍板（用户，2026-08-19）**：不做「完整 owner 化」（复证证明完整方案会把不同语义消费者强行压成一个 owner）。**固定判断顺序**：这个值是什么 → 是否影响故事 → 是否被消费 → 是否需要跨边界传递 → 才讨论 owner。三类字段：Story State / Derived Runtime Value / Historical-Render Slot（第三类直接消失）。

**复证关键发现**：
1. **executionPlan 双层不等价**：compiler 读 engine 块（characterDesire/beats/situation/emotionCurve…）走**顶层**、读 goal/obstacle 走**嵌套**（:189-190）→ 原「选嵌套为 owner、顶层字段全删」会断 compiler。
2. **priorityGoal/sceneFear 零 prompt 渲染**（runtime/brain/director 全 grep 无渲染点）+ 零 API/IDE/持久化消费 → 纯 director→studio 内部交接值。
3. **sceneFear 全仓 0 代码消费者**（代码读的是 `plan.fear`/`desireObj.fear`，无 `sceneFear` 键读）→ 顶层+嵌套都是 Historical/Render Slot。
4. **priorityGoal 3 消费者双层 fallback 值相同** → 删顶层、收敛嵌套单层，fallback 全吸收。

**改动**（4 文件）：
- `scene-execution.js`：return 删顶层 `priorityGoal`/`sceneFear` + 嵌套 `sceneFear`；嵌套 `priorityGoal` 保留为唯一 owner。`const sceneFear = deriveSceneFear(...)` 局部保留（feeding `deriveSceneChoice` 的 fear 参数，C1 契约）。
- `continuation-engine.js:85/93`：`prevPlan.priorityGoal`/`curPlan.priorityGoal` 顶层读删除 → 只读 `scenePlan.priorityGoal`。
- `beat-slimmer.js:587`：`executionPlan?.priorityGoal` 读删除 → 只读 `scenePlan.priorityGoal`。
- `beat-continuity.js:976/982`：`executionPlan?.priorityGoal` 读删除 → `plan.priorityGoal`（plan=executionPlan.scenePlan）即唯一 owner 读点。

**全绿证明**：
- **结构断言 ✅ PASS**（直接调 buildSceneDirectorBrief）：ep 顶层无 priorityGoal/sceneFear；ep.scenePlan 有 priorityGoal（值正确派生）无 sceneFear；characterDesire/beats 未动。
- **golden build ✓**：executionPlan 4 scenes / promptFingerprint 4 / memoryMutation 33 added + 6 modified（计数与 C1 一致）；verify 仅 5 处 readerSimulator 簇漂移（FOLLOW-UP A 已知）。
- 3 回归全绿（decision-conflict / memory-unit / audit-flow All 13）。

**收敛后最终形态**：
```
characterDesire ──► derivePriorityGoal() ──► executionPlan.scenePlan.priorityGoal（唯一 owner）
                                                  ├── continuation-engine
                                                  ├── beat-slimmer
                                                  └── beat-continuity
sceneFear：derive 保留（feeding deriveSceneChoice），executionPlan 暴露双份删除（0 消费者）
```
**同一事实载体**：priorityGoal 6+ → **1 owner + 3 消费边**（无冗余存储）；fear 5+ → 仅 desire.fear source + derive 局部（无独立存储槽）。

**明确不碰**（C2 证据边界外）：characterDesire / goal / obstacle / choice / beats / compiler P1。

---

## 7. 待确认边界

- **C2 删顶层字段会让 executionPlan fingerprint 变** → golden fixture 需 refresh；先确认哪一层是 prompt 实际读的 owner（compiler 读 `ep.characterDesire`（顶层）而 beat 从嵌套来 → **顶层 characterDesire 是 compiler 唯一读点，不可删**；priorityGoal/fear 顶层是否被读需逐 consumer 确认）。
- **C4 双轨对齐**可能触及 Studio 手写场景的兜底路径——不能假设 studio 永远有 runtime executionPlan（Studio 可能只有 authored plan 直接写）。
- 本章审计未覆盖：`promisePointer/promiseLifecycle`、`emotionWave/readerEmotion`、`informationGap` 等跨场景载体的重复度（P3.2 若收 C1-C4 后再决定是否扩审）。

---

## 8. 关联

- P3.1 删除记录与 P3.2 范围：`26_phase3_cleanup.md`
- D18 判据（同一事实多载体=重复）、D20（双层嵌套=副本）、D21（派生事实）、D22（单向派生禁回写）：`23_phase2_state_drive.md`
- D16 priorityGoal 危险标记：`22_phase2_prompt_compiler.md`
- Studio 双轨差异：记忆 [[inkos-writer-dual-track]]

---

## 9. P3.2 Final Residual Audit → P3.3 候选表（只读，2026-08-19）

> 审计令（用户拍板）：**P3.2 核心收口**，C4 冻结。只读不改码，全仓复证 `goal/obstacle/choice/fear/priorityGoal/authorIntent/sceneSeed/lore/immediateGoal` 的 producer→derivation→consumer→persistence→API/UI→tests，贴标签，回答「还有没有同一事实 2+ owner 残留」，输出 P3.3 候选表。**不预判删除，先 ownership 证明。**

### 9.1 已收敛（C1/C2/C3 完成，无残留）

| 字段 | 链（实证） | 标签 | 状态 |
|---|---|---|---|
| **priorityGoal** | derive(单点 scene-exec:688) → `scenePlan.priorityGoal`（唯一 owner）→ continuation-engine:85/93 · beat-slimmer:587 · beat-continuity:976/982 | **Derived Value** | ✅ 1 owner + 3 消费边，零旧写点 |
| **sceneFear** | deriveSceneFear(局部 :689) → feeding deriveSceneChoice；executionPlan 暴露双份已删 | **Derived → 局部** | ✅ 无存储槽；唯一残留 = deriveSceneChoice 的 `fear` 参数未用（函数体只读 scene.choice/intent.choice） |
| **authorIntent** | planner:738（seed 源）→ scene-director:58（回退链）→ 嵌套 scenePlan → beat-slimmer:606 | **Story Truth** | ✅ 单层嵌套，无顶层投影，零 API/UI 读 |
| **sceneSeed/lore 别名** | C3 已删；残留仅复数 `sceneSeeds`（卷纲种子数组，独立概念）+ 无关 local `lore`（scene.js:15 文本提取 / writer-metrics:71 词频 / beat-slimmer:529 正文） | — | ✅ 干净 |
| **immediateGoal** | 幽灵（全仓 authored 从不携带） | **Dead** | ⚠️ 仅 beat-continuity:983 幽灵候选读（防御，C4 冻结内） |

### 9.2 P3.3 候选（ownership 已证，待拍板）

**候选 1｜`executionPlan.choice` 顶层投影（scene-exec:1066）**
- **实证**：全仓 `executionPlan.choice`/`ep.choice` 读点 = **0**（同 C2 前 priorityGoal-top 模式）。choice 的真实读点：`plan.choice`（8 engine 文件 + beatContent:393 + writer-runtime）+ `scenePlan.choice`（director.js:133）+ `narrativeBeatPlan.choice`（director brief:176）+ `beat.choice`（:930 渲染）。
- 载体链：authored `scene.choice`（**Story Truth**）→ `plan.choice`（一等 beat 字段，C1 保留）→ planWithChapter:798 → **executionPlan.choice 顶层（0 读，冗余投影）** + nested scenePlan:1110 → narrativeBeatPlan:596（投影）→ beat:930（渲染）。
- **标签**：choice = **Story Truth（authored，非 Derived）**；顶层 executionPlan.choice = **Render Slot / 冗余投影**。
- 风险：低（0 消费者）｜收益：中（去 1 冗余载体）｜建议：C2 明确「不碰 choice」，P3.3 拍板后删顶层投影；**同族候选**：`cost/escalation/targetEmotion/narrativeReward` 顶层（:1066-1070 vs 嵌套 :1110-1113）同一模式，一并审计。
- **不预判**：choice 本体不能删（8 engine 消费 + beats 渲染 + 一等字段），只收敛顶层投影。

**候选 2｜deriveSceneChoice 死参数（scene-exec:298）**
- `fear`/`goal` 参数声明但函数体未用（只读 scene.choice/plan?.choice/intent.choice）。`fear: sceneFear` 传参是 C1 保留 derive 的副产物。
- 标签：**Dead（参数）**｜风险：极低｜建议：1 行清理，属 scene-execution 内部（非 C4 studio 双轨），可独立。

**候选 3｜~29 个 engine 字段双层（top+nested）**
- compiler 读**顶层**（characterDesire/beats/situation/emotionCurve/readerEmotion/sceneRhythm/writerSceneArc/conflict/climaxRole/chapterAuthorGoal…）；studio/归档读**嵌套**。
- **C2 已证两层不等价**（compiler 混合读）→ 非「同一事实 2 owner」干净候选，是 **D20 双职责结构**（顶层=compiler/执行 owner，嵌套=plan 归档/studio 双轨）。
- 建议：**留给 P3.4 narrative-runtime 迁移统一收**，现在不动（避免重蹈完整 owner 化的编译器断链风险）。

**候选 4｜beat-continuity:983 幽灵候选读**
- `scene?.immediateGoal` 等 candidates 防御读（authored 从不携带，从不命中）。
- 标签：**Dead（防御）**｜风险：极低｜建议：C4 冻结内，待 C4 审计时一并清理。

### 9.3 结论回答

- **「一个事实多个 owner」残留？** priorityGoal/fear/authorIntent 已收敛到 1 owner + 消费边（C1/C2/C3）。**唯一干净残留 = executionPlan.choice 顶层投影（0 消费者）**。~29 个 engine 字段双层是「双职责非双 owner」，留给 P3.4。
- **choice 是 Story Decision 还是可重算 Derived？** 审计证明：**Story Truth（authored）**，deriveSceneChoice 只处理模板兜底（:693-699），不是「每次可重算的 Derived Value」→ **不改 derive() 化**。正确形态 = authored → plan.choice 单一 owner → 投影（narrativeBeatPlan/beat/顶层），可收敛的只是**顶层投影**。
- 记忆关联：[[inkos-p32-c1-c3]]、[[inkos-phase2-ownership]]。

---

## 10. P3.3 Choice/Decision Ownership & Projection Audit（只读，2026-08-19）

> 审计令：只读零代码，完整追踪 `choice` producer→consumer 全链，cost/narrativeReward 同族横向，confirm deriveSceneChoice fallback 性质，输出可删/不可删投影 + Story Truth owner + golden 影响预测。**不执行删除。**

### 10.1 choice 全链（实证 file:line）

```
authored scene.choice (Story Truth 源1) ─┐
intent.choice (Story Truth 源2, 章级)   ─┤→ chapter-director:464 独立消费（P3.5 章级语义层）
                                         ▼
buildPlanFromScene:318  scenePlan.choice = scene.choice || null
                                         ▼
plan.choice (:698)  ← Story Truth owner（一等 beat 字段，C1 保留）
                                         ▼
planWithChapter.choice (:798)  ← 拷贝+章叙事兜底
   ├─► narrativeBeatPlan.choice (:596) → scene-director:157/287 → brief(:176) → prompt     [消费]
   ├─► narrativeFields.choice (:825)
   │     ├─► rules 渲染 (:1135) → prompt                                              [消费]
   │     ├─► 顶层 executionPlan.choice (:1066)                                         【0 消费者】
   │     └─► 嵌套 scenePlan.choice (:1110) → 8 engines + director:133 + studio×2       [消费]
   └─► beat.choice (:930, choice 拍) → beatContent (:393) → prompt                     [消费]
```

### 10.2 每个 carrier 的 owner / 标签

| carrier | owner | 消费者（实证） | 标签 |
|---|---|---|---|
| `scene.choice` (authored) | 作者/planner | → plan.choice | **Story Truth 源** |
| `plan.choice` | 一等字段 | planWithChapter/narrativeBeatPlan/beat | **Story Truth owner** |
| `planWithChapter.choice` | 拷贝 | narrativeBeatPlan/narrativeFields | Derived 副本 |
| `narrativeBeatPlan.choice` | 投影 | scene-director:157/287 → brief | Render Slot（消费） |
| `narrativeFields.choice` | 投影 | rules:1135 → prompt | Render Slot（消费） |
| **`executionPlan.choice`（顶层）** | 投影 | **全仓 0** | **Render Slot（冗余，可删）** |
| `scenePlan.choice`（嵌套） | 投影 | character-behavior:30 / situation-engine:124 / scene-entertainment:39 / character-desire-engine:117 / character-transformation:22,67 / conflict-engine:40,64 / writer-runtime:100,132,346 + director.js:133 + studio(beat-continuity:984/commercial-writer-rules:254) | Render Slot（消费） |
| `beat.choice` | 渲染 | choice 拍 → writer prompt | Render Slot（消费） |

### 10.3 persistence / API / UI / prompt

- **persistence**：run.json 持久化整份 executionPlan（含顶层 choice）→ 数据级存在，**无代码消费者**。
- **API/UI**：studio-server 非 writer-optimization **0 处**读 choice/narrativeReward；ab-test(diagnosis-service) 读 executionPlan 但 grep `executionPlan.choice`/`ep.choice` 全仓 **0 命中**。
- **prompt 进入点**：rules:1135（读局部 narrativeFields）、director brief:176、beatContent:393、writer scene.choice（director:133 读嵌套投影）——**全部不读顶层 executionPlan.choice**。

### 10.4 同族候选（顶层 narrativeFields 投影全查）

| 顶层字段 | 嵌套对应 | 顶层消费者 | 判定 |
|---|---|---|---|
| `choice` (:1066) | scenePlan.choice (:1110) 消费 | **0** | 冗余投影 |
| `cost` (:1067) | scenePlan.cost (:1111) 消费 | **0** | 冗余投影 |
| `escalation` (:1068) | scenePlan.escalation (:1112) 消费 | **0** | 冗余投影 |
| `targetEmotion` (:1069) | scenePlan.targetEmotion (:1113) 消费（beat-slimmer:687 读的是 `targetEmotionZh` 前缀字段，非顶层） | **0** | 冗余投影 |
| `narrativeReward` (:1070) | **无嵌套对应** | **0** | **纯死投影**（narrativeFields.reward 无其它出口；rules 不渲染 reward；narrativeBeatPlan.reward 用 rewardText 独立构建） |

### 10.5 deriveSceneChoice 确认

- **纯 fallback 守卫**：:692-699 仅在 `plan.choice` 缺失或命中模板正则（`/必须做出选择|有限选项|二选一|冲突升级|代价逼近|外部阻力/`）时调用；函数体只读 `scene.choice, scene.plan?.choice, intent.choice, intent.chapterChoice`；无显式 → `null`，**从不合成**。
- **死参数**：签名 `goal`/`fear`（:295）函数体未用；调用处 :698 传 `goal: priorityGoal, fear: sceneFear`。P3.3.1 可安全删（1 行）。

### 10.6 golden 影响预测（删除顶层 5 投影 + 死参数后）

- **executionPlan artifact：不变**（实证 baseline.json 4 scenes 均无 `executionPlan` 键——normalizeScenePlan:180 的 pin 未触发）。
- **promptFingerprint：不变**（rules/brief/beats 均读局部/嵌套，prompt 语义零变化）。
- **gateOutputs / pipeline：不变**（readerSimulator 为独立 flake 源，与本次无关）。
- **memoryMutation：一次确定性 modified**（run.json 持久化整份 executionPlan → 顶层键减少 → 文件 hash 变）→ 需**一次 rebuild**，无 flake。
- 结论：**C2 同模式、极低风险、可预期一次性基线更新。**

### 10.7 删除方案（拍板后执行，不自动）

1. **P3.3-1**：删 scene-execution.js return 顶层 5 个 narrativeFields 投影（:1066-1070 choice/cost/escalation/targetEmotion/narrativeReward）。`narrativeFields` 局部对象保留（rules:1135-1138 + 嵌套:1110-1113 仍读它）。narrativeBeatPlan 顶层保留（scene-director 消费）。
2. **P3.3-1b**：narrativeReward 整链死（含 narrativeFields.reward 键）——安全起见先删顶层，narrativeFields.reward 键是否删待 rules 复核后定。
3. **P3.3-2**：deriveSceneChoice 删 `goal`/`fear` 签名参数 + :698 传参。
4. **观察项（非本审计范围）**：director.js:135 `escalation: sceneDir.scenePlan?.choice || scene.escalation`——读 choice 当 escalation（复制粘贴残留，影响 writer scene.escalation），单独标记待修；chapter-director:464 章级 choice → P3.5 语义层。

### 10.8 结论

- **Story Truth owner**：`plan.choice`（authored → 一等字段），不改 derive() 化。
- **可删投影**：顶层 `executionPlan.choice/cost/escalation/targetEmotion/narrativeReward`（全 0 消费者）+ deriveSceneChoice 死参数。
- **不可删**：嵌套 scenePlan.choice（8 engines + director + studio 消费）、narrativeBeatPlan.choice（brief）、beat.choice、rules 渲染。
- **验证了规则**：不是看到重复字段就删，而是先区分 Story Truth / Derived / Render Slot / Dead。choice 是 Story Truth，其冗余只在**顶层投影**（Render Slot 层）。

### 10.9 执行记录（P3.3 Choice 删除，2026-08-20 ✅ 全绿）

> 用户拍板（Golden Determinism 之后）：scope 收窄为**恰好 3 件事**——① 删 `executionPlan.choice` 顶层投影；② 删 `narrativeReward` 纯死投影 + `narrativeFields.reward` 死键；③ 清 `deriveSceneChoice` 死参数（goal/fear，仅签名+调用处）。**保留** cost/escalation/targetEmotion 顶层（本审计 §10.4 证其 0 消费者，但拍板取渐进，未列入本次）。

**已执行 5 处 code edit（scene-execution.js）+ 2 处 test update**：
- :295 签名 `deriveSceneChoice({ scene={}, intent={}, desire={} }={})`（删 goal/fear）
- :689 sceneFear 局部删除（其唯一用途是 feeding 死参数 fear；`deriveSceneFear` 函数保留——index.js:223 桶导出孤儿）
- :698 调用处 `deriveSceneChoice({ scene, intent, desire: characterDesire })`
- :827 narrativeFields 删 `reward:` 键（narrativeFields 现 = choice/cost/escalation/targetEmotion/informationGap/promisePointer）
- :1066-1070 return 顶层删 `choice` + `narrativeReward`（cost/escalation/targetEmotion/promisePointer 保留；嵌套 :1110 scenePlan.choice 保留）
- test-module-4-chapter-execution.js：version→`scene-execution-10`；断言环删 'choice'；:75 `!ep.narrativeBeatPlan?.reward`；:102 改读 `ep.scenePlan?.choice || ep.narrativeBeatPlan?.choice`（拍板「更新到保留字段」）

**回归门（全绿）**：
- ✅ executionPlan 结构：仅顶层 choice/narrativeReward 减少；`cost/escalation/targetEmotion/promisePointer` 在；嵌套 `scenePlan.choice`/`narrativeBeatPlan.choice`/`narrativeBeatPlan.reward` 在；`beat[].choice` 渲染 byte-identical（promptFingerprint 证明）
- ✅ **promptFingerprint byte-identical**（raw diff = 唯一 `meta.builtAt`）
- ✅ pipeline/deterministic gates byte-identical（同 diff）
- ✅ memoryMutation **零变化**（比 §10.7 预测的「run.json 一次 modified」更强——run.json canonical 不含被删顶层键）
- ✅ golden **3× verify exit=0** 且 run1==run2==run3（日志差异仅临时目录随机后缀，canonicalizer 已归一）
- ✅ 3 回归全绿：decision-conflict-null / memory-unit / chapter-audit-flow（13 checks）
- ✅ 全仓 grep：无 `narrativeReward`（整链）/顶层 `.choice` 残留消费者

**强制不碰已确认**：authored→plan.choice owner 链、chapter-director 章级 intent.choice、scenePlan.choice、narrativeBeatPlan.choice、beat/prompt 渲染、escalation←choice bug（director.js:135 独立）、C4、P3.4 29 字段。

**观察项（未修，非本 scope）**：`scripts/test-execution-narrative-plan.js:53` 断言 `scene-execution-9/-8` 而实际 -10（版本 bump 早于 P3.3，前置陈旧；读的是保留字段 narrativeBeatPlan.choice，非删除字段；不在任何 npm suite）。
