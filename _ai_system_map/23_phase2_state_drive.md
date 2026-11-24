# 23. Phase 2.8 — State Board 驱动 vs 装饰审计（✅ 已通过：哪些状态真驱动故事，哪些只是「让系统感觉记得很多」）

> 日期：2026-08-19 ｜ 状态：**✅ 已通过（用户拍板）** ｜ 性质：契约文档（先文档后代码）
> **用户假设（已验证）**：Prompt 层重复，很可能只是 **State 层膨胀的结果**。
> **拍板总纲**：不要因为发现了死状态就立刻「大扫除」。**先把 State 的所有权契约钉死，再做代码收敛。**
> **核心结论（拍板新增，Story State 的定义压缩成一句）**：
> **「只有会改变未来故事选择空间的状态，才属于 Story State。」**

---

## 0. 一句话定位

> 2.6 问「状态属于哪个生命周期」（Story Truth / Scene Memory / Writing Identity）；2.8 问「状态到底**驱动**生成，还是只是**让系统感觉记得很多**」。2.7 的 Prompt 重复，根源在 State 层的**一值多槽（副本）**、**派生链膨胀（解释权分散）**、**纯装饰（写了没人读）**。
> **总原则（拍板新增）**：**一个值只有一个槽位；一个根只派生必需的下游；写了没人读的状态是感知记忆，不是故事状态。**

---

## 1. 判据（驱动 vs 装饰，两问）+ Story State 主判据

一个状态，问两件事：

```
1. 有读者吗？        谁把它的值送进生成 / 门闸 / 分支？
2. 信息唯一吗？      它到达模型时携带的信息，别的通道也有一份吗？
```

| 类别 | 定义 | 判据 |
|---|---|---|
| **驱动 Driving** | 值变化 → 生成输出 / 门闸 / 分支变化 | 有读者进生成 + 信息唯一 |
| **冗余载体 Redundant Carrier** | 值会进生成，但同源同值已在另一字段 | 有读者 + 信息不唯一（副本/派生） |
| **装饰 Decorative** | 写了没人读，或只进 UI / Soft Review 不进生成 | 无读者，或读者不送生成 |
| **正交 Orthogonal** | 与故事状态无关（写作调参 / 审计） | 2.6 已定（D12/D13） |

> **主判据（拍板新增，最强标准）**：**只有会改变未来故事选择空间的状态，才属于 Story State。**
>
> 属于（会改变「下一步可以发生什么」）：
> - 张北已经知道某个秘密
> - 张北与某人关系破裂
> - 某阵营失去关键资源
> - 某人物受伤
> - 某事件已经发生
>
> 不属于（是 Telemetry，不是 Story State）：
> - 这一章写了多少字
> - 上一次 critic 得分
> - 某次运行耗时
> - 某次生成的历史记录
> - 某个 prompt hash

---

## 2. 三个真相（调查结论，全部 file:line 证据）

### 真相 1：三个历史文件零读者 —— 已归类 Telemetry/Audit History（D19）

`decision_history.yaml` / `scene_history.yaml` / `conflict_history.yaml`：

| 文件 | 写端 | 读者 |
|---|---|---|
| `scene_history.yaml` | `appendSceneHistory`（memory.js:109-124）——**Studio 路径也写**（chapter-pipeline.js:210/:286） | **零** |
| `decision_history.yaml` | `appendDecisionHistory`（memory.js:91-107）——仅无 authored plan 分支（orchestrator.js:275） | **零** |
| `conflict_history.yaml` | `appendConflictHistory`（memory.js:126-140）——同上（orchestrator.js:276） | **零** |

> 全仓 grep `decision_history|scene_history|conflict_history|historyPath(` 的**非写端读者为零**。系统「记得」每一章的决策/场景/冲突，但没有任何生成路径回读。
> **已拍板（D19）**：归类 **Telemetry / Audit History**，不是 Story Memory。**不进入 Prompt / Story Context / Planner 输入 / Runtime 决策依据。**

### 真相 2：审计层全部「写了不喂回」

| 源 | 写端 | 读者（全部非生成） |
|---|---|---|
| `story_health.json` | chapter-pipeline.js:180（Studio 路径也写） | 只有 book-stats.js:23（stats UI）、runtime-reader.js:40（诊断 UI）、cli.js:318 |
| `reader_sim_baseline.json` | reader-simulator.js:364 | reader-simulator.js:321（评分）→ **Soft Review suggestions，不阻断**（2.3 已定）+ diagnosis-service.js:113 |
| `brain/ch_*_run.json` | saveBrainRun（memory.js:142） | 审计/诊断 UI |

> 结论：这类状态价值在**可观测**，不在驱动。2.3 已定 Soft Review 不阻断生成。

### 真相 3：真驱动链全部是「状态变化」而非「状态快照」——呼应 2.6 §4 保护清单

| 驱动源 | 来源 | 进 prompt |
|---|---|---|
| `situation`（三维局势） | situation-engine 每 scene 新鲜派生 | prompt-compiler.js:199 |
| `beats` / `beatStatePlans` | beat engine 每 scene 新鲜派生 | formatBeatPlan / formatBeatStateSequenceBlock（:196-197） |
| `conflict` | conflict-engine | formatConflictBlock（:198） |
| `characterDesire`（根源） | character-desire-engine.js:49，读 storyDna / 角色卡 / intent | formatCharacterDesireBlock（:200） |
| `emotionCurve` / `informationGap` | 引擎从 beats 派生 | formatEmotionCurveBlock（:204）/ P1 铁律（:1142） |

> 这些正是 2.6 §4 连续性保护清单的「状态变化」通道——**2.8 只标注、不触碰。**

---

## 3. State 层膨胀的三机制（Prompt 重复的 State 根源）

### 机制 1：一值多槽（副本膨胀）

**executionPlan 双层嵌套**：`buildSceneExecutionPlan` 返回对象（scene-execution.js:1046-1136）把 ~30 个 director 产物放了两份——顶层（:1065-1094）+ `scenePlan` 嵌套（:1103-1136）。嵌套槽在 executionPlan 内**零专用读者**（全仓唯一 `scenePlan.` 命中是 reward-engine.js:66，读的是**计划层** scenePlan，不是 executionPlan 内的）。

**plan 回写**：`derivePriorityGoal` 优先读 `plan.priorityGoal`（scene-execution.js:227），derive 后**写回 plan**（:695-696/705 `plan.priorityGoal / plan.fear / plan.choice = 派生值`）。同一值 3+ 槽：plan 对象 + executionPlan 顶层 + executionPlan.scenePlan 嵌套。

**prompt 双槽 fallback**：`scene.conflict || ep.scenePlan?.obstacle`（prompt-compiler.js:190）——plan 里 `conflict`/`obstacle` 两个槽位存同一语义，渲染时才二选一。2.7 的 `冲突==阻碍` 根在这。

### 机制 2：派生链膨胀（解释权分散）

```
characterDesire（根）──► characterPush ──► priorityGoal ──► sceneFear ──► choice
（character-desire-engine:49）  (buildSceneCharacterPush)  (derive:216)  (derive:278)  (derive:302)
```

一个 Story Truth（角色想要什么）铺成 **5 个字段**，每个 prompt block 拿自己的「解释」——正是 2.7 D15（角色三引擎）/ D16（priorityGoal 危险）的 **State 层根源**。派生字段还写回 plan（机制 1 的 plan 污染）。

### 机制 3：纯装饰（感知记忆）

- 三个 history yaml（真相 1，零读者 → 已归类 Telemetry/Audit，D19）
- `story_health` / `reader_sim_baseline`（真相 2，只进 UI/Soft Review）
- `adaptive_state`：`applyWeightsToIntent` 在 planner.js:189，位于 `planChapter`——**只在无 authored plan 分支运行**；生产主路径（authored plan → serializeAuthoredPlanToIntent）**短路不驱动**。2.6 D12 已定 adaptive history = telemetry；2.8 确认 **adaptive = Planner 的生成调节机制 + telemetry**（D23）。

---

## 4. 驱动 vs 装饰总表（以 2.6 五层为基础打标）

| 状态源 | 层 | 进生成？ | 信息唯一？ | 标签 |
|---|---|---|---|---|
| anchors | A Story Truth | ✅（memory-hierarchy/continuation） | ✅ | **驱动** |
| facts_db F013 型 | A | ✅（beat-continuity 硬执行） | ✅ | **驱动** |
| `situation` | B Scene | ✅（prompt-compiler:199） | ✅ | **驱动** |
| `beats` / `beatStatePlans` | B | ✅（formatBeatPlan） | ✅ | **驱动** |
| `conflict` | B | ✅（formatConflictBlock） | ✅ | **驱动** |
| `characterDesire`（根） | B | ✅ | ✅（根） | **驱动** |
| `emotionCurve` / `informationGap` | B | ✅ | ✅ | **驱动** |
| `characterPush` / `priorityGoal` / `sceneFear` / `choice` | B | ✅ | ❌（desire 派生事实，D21） | 派生事实 |
| `characterTransformation` / `characterBehavior` | B | ✅ | ❌（desire 同源） | 冗余载体 |
| `writerSceneArc` | B | ✅ | ❌（situation/reward/hook/conflict 重排） | 冗余载体 |
| `executionPlan.scenePlan` 嵌套 | B | ❌（零专用读者） | ❌（副本） | 副本 |
| `plan.priorityGoal/fear/choice` 回写 | B | ✅ | ❌（派生副本） | 副本+污染 |
| `scene/decision/conflict_history` | D | ❌（零读者） | — | **Telemetry/Audit**（D19） |
| `story_health` / `reader_sim_baseline` | D | ❌（只 UI/Soft Review） | — | **Telemetry（可观测）** |
| `adaptive_state` | C | 仅无 authored plan 分支 | — | Planner 调参 + telemetry（D23） |
| `07_state_board` | E | ❌ | — | 已定（2.6 D11 CLI legacy） |
| `05` / `06` | E | ❌ | — | 已定（2.6 D13 Reserved） |

---

## 5. 拍板记录（2026-08-19，五项全定）

| 决策 | 问题 | 拍板 |
|---|---|---|
| **D19** 历史文件零读者 | decision/scene/conflict_history 怎么处置？ | ✅ **归类 Telemetry / Audit History**（不是 Story Memory）：不进入 Prompt / Story Context / Planner 输入 / Runtime 决策。**暂不直接删写端**——保留诊断/UI 用途，Phase 3 做一次历史存储清理；decision/conflict_history 还有 CLI/兜底分支写入，别把「没人读」和「未来可能还有诊断价值」混在一起 |
| **D20** executionPlan 双层 | 同一 ~30 对象存两份，嵌套槽零读者 | ✅ **单一语义槽位**，Phase 3 代码收敛。铁律：**顶层字段必须有顶层语义；没有独立语义的字段不得因为「方便 prompt」而复制**。目标形态 `ExecutionPlan { chapter-level facts, scenes[] scene-local facts }`。Phase 3 根据真实消费者逐字段删除 |
| **D21** 派生链 | desire → push/priorityGoal/fear/choice 一串 | ✅ **Character Intent 为源，派生值只向下流**。修正：push/priorityGoal/fear/choice 不能全部叫「渲染槽位」，其中有些是**派生事实**；不把「派生逻辑」和「Prompt 渲染」混为一谈。**尤其 `choice` 是故事行为，不只是 prompt 字段** |
| **D22** derive 回写 | derive 写回 plan 形成读-派生-写回循环 | ✅ **终止回写，改单向派生**——D19-D23 中**最该进 Phase 3 的代码改动**。铁律：`source → derive() → executionPlan`；禁止 `source → derived → source mutation → next derivation`（状态污染）。**「单向数据流」是本轮减法真正留下的一条架构铁律** |
| **D23** adaptive | 只在无 authored plan 分支驱动 | ✅ **不升格**。adaptive = **Planner 的生成调节机制 + telemetry**；不是 Story Truth / Character Intent / Chapter Intent / Runtime authority。Studio authored-plan 路径短路后更不应污染主权威链；**不要为了「统一架构」把 adaptive 拉回主路径** |

### D21 派生结构（拍板修正的 ASCII）

```
Character Intent
      │
      ├── desire
      ├── fear
      └── transformation
             │
             ▼
      Scene / Beat derivation
             │
      ┌──────┼──────┐
      ▼      ▼      ▼
    push   choice  priority
```

---

## 6. 核心结论：Story State 定义（拍板新增）

> **「只有会改变未来故事选择空间的状态，才属于 Story State。」**

这是一个非常强的标准：

| 属于 Story State（改变「下一步可以发生什么」） | 不属于（Telemetry） |
|---|---|
| 张北已经知道某个秘密 | 这一章写了多少字 |
| 张北与某人关系破裂 | 上一次 critic 得分 |
| 某阵营失去关键资源 | 某次运行耗时 |
| 某人物受伤 | 某次生成的历史记录 |
| 某事件已经发生 | 某个 prompt hash |

---

## 7. 总原则（拍板，2.8 版）

> 2.6：「状态不是系统拥有的信息总量，而是未来故事分叉所依赖的最小事实集合。」
> 2.8 的推论（本步新增）：
> 1. **一个值只有一个槽位**（值进 prompt 前，先在 State 层去重，副本不渲染）。
> 2. **一个根只派生必需的下游**（不派生到「每个模块都有专属字段」）。
> 3. **写了没人读的状态是感知记忆，不是故事状态**（标账 + 停止心理负担）。
> 4. **单向数据流**：`source → derive() → executionPlan`，派生值永不写回源对象（D22 铁律）。

---

## 8. 明确不做（2.8 边界）

- **不删除任何状态字段**（用户警告：删除 ≠ 减复杂度；先钉死所有权契约，再代码收敛）。
- **不动真驱动链**（2.6 §4 保护清单：anchors / facts_db / situation / beats / conflict / characterDesire）。
- **不为装饰层造读者**（history → 生成 回读是新增故事抽象，禁止）。
- **不删 history 写端**（D19：保留诊断/UI 用途，Phase 3 统一清理）。
- **不改 adaptive 驱动性**（D23：不升格、不拉回主路径）。
- **不新增状态抽象**（Phase 2 总原则）。

---

## 9. Phase 2 主线 + 2.9 预告（用户拍板收口）

> **Phase 2 主线（拍板确认，这就是 InkOS 收敛方向）**：

```
        Canon
          │
          ▼
   Character Intent
          │
          ▼
    Chapter Intent
          │
          ▼
     Scene Intent
          │
          ▼
    Beat Execution
          │
          ▼
        Writer
          │
      ┌───┴───┐
      ▼       ▼
 World Truth  Story Progress
    Gate          Gate
      │
      └──────► Recovery
```

旁边只保留：

```
Soft Review
Telemetry
```

> 它们**不能反过来定义故事本身**。
>
> **InkOS 到底是什么**（拍板定论）：不是一个「拥有很多智能模块」的小说操作系统，而是一个——
> **「维护故事因果、人物选择和状态变化，同时把语言生成权交给模型的故事驱动引擎。」**

**2.9 预告（用户定方向）**：2.8 收口，**不再往 Prompt/State 里挖字段**。下一步做一次**横向审计**：`Canon → Character → Chapter → Scene → Beat → State` 是否**真的形成单向 ownership**——而不是再新增一个抽象层。

---

## 10. 变更记录

- 2026-08-19 起草 v1：三真相（零读者 history / 审计层写了不喂回 / 真驱动链=状态变化）+ 三机制（一值多槽 / 派生链膨胀 / 纯装饰）+ 驱动 vs 装饰总表 + D19-D23 决策点。
- 2026-08-19 v2 通过：D19-D23 全定（D19 降 Telemetry 暂不删写端 / D20 单一语义槽 Phase 3 / D21 派生事实修正 + choice 是故事行为 / D22 单向数据流铁律 = 最该进 Phase 3 的改动 / D23 不升格）；核心结论「只有会改变未来故事选择空间的状态才属于 Story State」；单向数据流架构铁律；Phase 2 主线 ASCII + InkOS 定义（故事驱动引擎）；2.9 预告（横向单向 ownership 审计）。
