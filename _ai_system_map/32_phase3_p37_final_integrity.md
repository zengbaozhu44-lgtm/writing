# P3.7 Phase 3 Final Integrity Audit（只读验收，未改代码）

> 2026-08-20 · **只读，未改任何源代码**。用户拍板：P3.7 是 Phase 3 总验收，目的不是继续找字段，而是确认 P3.1~P3.6 的减法没有留下「半删除 / 死引用 / 文档与代码不一致 / 测试门禁缺口」。
> 停止规则：发现分 A（Phase 3 必须修）/ B（可独立开下一任务）/ C（纯观察项），只有 A 才进入拍板。不要看到新问题就继续修。

---

## §1 六项扫描结果

### ① P3.1~P3.6 删除目标写端清零 / fallback 复活 / 漏扫

**结论：CLEAN，唯一例外是 regression.js（见 A1）。**

| 检查项 | 结果 | 证据 |
|---|---|---|
| 7 个 P3.1 退役持久化目标写端清零 | ✅ | 全仓无 `writeFile` 到 05/06/state_machine/三个 *_history/story_health；story_health 仅剩 log 行 |
| 兼容路径表非复活 | ✅ | book.js:29-30、labels.js:19-20 是**只读** compat 映射，无写端 |
| READONLY_KEYS 兼容 | ✅ | module-service.js:37 `'state_machine'` 仅读 |
| 漏扫（scripts/tests/TS/API） | ⚠️ | **regression.js:23/26/27 TRACKED 仍引用 3 个已删文件** → `:61-62` "file missing" → npm test:regression exit=1（**P3.1 造成**，见 §2 A1） |

### ② Story Truth / Render Slot 边界（goal/obstacle/choice/consequence/authorIntent/priorityGoal 唯一链）

**结论：CLEAN。**

| 事实 | owner 链 | 状态 |
|---|---|---|
| scene.goal / obstacle / choice / consequence / authorIntent / conflict | scene authored 标量 = 唯一 source | ✅ 无 plan 形态回写（D22：plan.priorityGoal/fear 禁回写，P3.2 C1 无写点） |
| priorityGoal | ② 嵌套派生 owner，禁回写 | ✅ 单一派生 owner |
| authorIntent | source → ④ scene.scenePlan 唯一载体 → beat-slimmer 单链 | ✅ P3.5-1 后双载体已删 |
| sceneSeed | 零（P3.2 C3 后为别名） | ✅ |

未发现 One Truth → Multi Owner；migrateScenePlan 浅拷贝 = 变异隔离仍在。

### ③ P3.6 后 Engine 一致性（④→②→① 是否仍同字段不同语义）

**结论：一致。P3.6-1 已消除分叉。**

- bundle 2 调用点（attachSceneEngines / buildSceneExecutionPlan）；climaxRole 唯一计算点 = buildSceneClimaxRole。
- P3.6-1 后：④.climaxRole 与 ②/① 同为 chapter-aware（`EP.scenePlan.climaxRole === EP.climaxRole` 不变量成立）；④.conflict 与 ②/① 同一对象（reuse 传播，无第二套计算路径）。
- conflict-engine:110-113 的章级注入（maxCost/maxConflict）**已在生产兑现**（fixture Case A 8/8 绿 + before/after diff 局限预期链）。
- 残留观察：④.climaxRole 仍 0 消费者（C2），但已与 ① 一致，不再分叉。

### ④ Dead code

| 项 | 状态 |
|---|---|
| deriveSceneFear 桶导出孤儿（index.js:223，0 call sites） | C/B 项（scene-execution.js:271 定义，:690 注释自记「孤儿待后续决定」） |
| ④.climaxRole 0 消费者 | C2（冻结，已与 ① 一致） |
| chapterRhythm bundle 死入参（scene-execution.js:76/:87） | C3（冻结；getSceneRhythmRole 在 chapter-rhythm.js:81-84 仍消费 chapterRhythm 对象，bundle 死参 ≠ 系统死） |
| ② 内 buildSceneConflict({chapterClimax}) 死分支 | 已收敛（P3.6-1 后 ④ 带 conflict，reuse 守卫仍短路，但 ④ 已 chapter-aware → 分支与生产同语义） |
| P3.3/P3.4 兼容读取 | 无残留消费者（顶层 choice/narrativeReward 0 读；tensionRewardThreat/revealPolicy/narrativeRewardText 全清） |

### ⑤ 测试可信度

**formal gate（15）**：8 通过 / 7 前置失败（**无一 Phase 3 造成**）：

| 失败测试 | 根因 | 类别 |
|---|---|---|
| test-director | 断言 version `scene-review-4`，实际 `scene-review-5-analysis` | 前置 stale |
| test-writer-optimizer | 断言 `writer-optimizer-4`，实际 `-5` | 前置 stale |
| test-story-memory | 断言 `'Story Memory Hint'`，实际 `'## Story Memory · …'` | 前置 stale |
| test-context-ranking | facts 5/5 未触发预算裁剪 | 前置逻辑失配 |
| test-runtime | `validateChapter` 7/7 LLM-key reader 抖动 | 前置 flake |
| test-writer-prompt | worldBible 空 fixture | 前置 |
| test-living-novel | 世界观叛乱模拟 | 前置 |

**phase-gate（5）**：decision-conflict-null / memory-unit / chapter-audit-flow / module-4 / p36-engine-semantic-guard —— **全部 exit=0**（P3.5-1/P3.6-1 回归门逐次验证）。

**scripts/*.js 分类（72）**：formal 15 + phase-gate 5 + debug-repro 8 + **orphan 44（61%）**。tests/ 与 scripts/ 零交叉引用；formal/phase-gate 全靠 package.json + md 文档点名维系。

**Golden 覆盖地图**（详见 §4）：实际跑 **ch1 派生规划零重试**（非 README 所写 authored-plan），4 场景 × 3 相位 `_invokeSceneLifecycleHook` 全 no-op（orchestrator.js:40/44）→ **director/④②① executionPlan/真实 LLM/replan 重试 全不覆盖**。replan 三态由单元层覆盖。

**test:regression**：**BROKEN（P3.1 造成）** → A1。

### ⑥ 文档 / memory / 代码一致性

**结论：MAJOR DRIFT（P3.1 退役持久化仍被描述为当前架构）。**

| 文件 | 位置 | 失实 |
|---|---|---|
| AGENTS.md | :55 | `story_health.json` 列为 Studio 数据源 |
| docs/runtime-boundary.md | :12/:17-18/:34/:43/:54 | Story Health / Relationship Graph / Knowledge Matrix 列为 Runtime 负责产出物 + Studio 读取源 |
| _ai_system_map/01_architecture.md | :64-86 | 退役持久化写入当前架构 |
| _ai_system_map/03_data_model.md | :26-49 | 列出已删写端 patchRelationship/patchKnowledge/saveStoryHealth |
| _ai_system_map/04_story_state.md | :20-35 | 退役状态文件作为当前状态 |
| _ai_system_map/09_validation.md | :95 | 引用已删文件 |
| _ai_system_map/11_real_execution_trace.md | :34/:73-74 | 追踪里含已删文件 |
| tests/golden-baseline/README.md | :45 | 「authored-plan 路径」失实——实际跑派生规划零重试 |

---

## §2 A/B/C 分类（拍板清单）

### A —— Phase 3 必须修（1 项）

**A1. `tests/runtime-regression/regression.js` TRACKED 引用 3 个 P3.1 已删文件 → npm test:regression 必挂**
- 位置：regression.js:23/26/27（`story_health.json`/`decision_history.yaml`/`conflict_history.yaml`）+ :61-62 file-missing 失败模式。
- 根因：P3.1 删 7 持久化目标时未同步删 TRACKED 条目；旧 golden manifest 含已删文件 hash → runRegression 遍历时 `fs.existsSync` false。
- 这是 Phase 3 自己造成的唯一测试破坏。不修则「Phase 3 完成证明」带着一个 Phase 3 打红的 npm suite。
- 修复极小：TRACKED 去掉 3 项 + 重 capture（adaptive_state.json 哈希漂移为前置，另判）。

### B —— 可独立开下一任务（4 项）

**B1. 文档一致性修复**（AGENTS.md:55、docs/runtime-boundary.md 6 行、_ai_system_map 01/03/04/09/11 共 5 处）——把 P3.1 退役持久化从「当前架构」描述中移除/标注已删除（类比 Phase 1.6 的 CHANGELOG 事实校正）。

**B2. Golden README 失实更正**（tests/golden-baseline/README.md:45）——「authored-plan」应为「派生规划一次通过、零重试」。证据链：fixture 无 `chapter_plans/` 目录（planner.js:213-215）+ baseline `pipeline.stages` 含 planner/decision/conflict（仅派生循环产生，orchestrator.js:230-270）。

**B3. 孤儿脚本清理**——44 orphan（36 零引用 + 8 仅文档提及）+ 8 debug-repro 逐一审保留价值后删。独立「script graveyard」任务，不入 Phase 3。

**B4. deriveSceneFear 桶导出孤儿删除**（packages/inkos-director/src/index.js:223，0 call sites）——可并进 B3 或单独 1 行。

### C —— 纯观察项（冻结清单，全部已有边界）

| 项 | 状态 |
|---|---|
| C1 sparse scene + authored conflict → SD brief 崩溃（writer-scene-arc.js:91） | 已冻结，FOLLOW-UP 已记（用户拍板不立 P3.7） |
| C2 ④.climaxRole 0 消费者 | 已冻结（P3.6-1 后与 ① 一致） |
| C3 chapterRhythm bundle 死入参 | 已冻结，FOLLOW-UP 已记 |
| C4 test-beat-slimmer / test-beat-continuity stale | 已冻结 |
| C5 choice 时序（P3.4 记录） | 已冻结 |
| C6 golden 覆盖窄（无 director/EP/LLM/replan 重试） | 观察项；replan 三态已由单元层覆盖 |
| C7 44 孤儿脚本 | C3 分解为 B3 前先观察 |

---

## §3 Phase 3 完成证明 — 关键数字

| 指标 | 数值 | 口径 |
|---|---|---|
| 删除的持久化概念（文件级） | **7** | P3.1：05_relationship_graph、06_knowledge_matrix、state_machine.yaml、brain/{decision,scene,conflict}_history.yaml、story_health.json |
| 状态写点清除 | **~19** | P3.1 写端清零（7 目标的主/导出端）+ 各阶段删除出口；cumulative 记录 |
| 冗余 output slot 删除 | **~11** | P3.3 顶层 choice/narrativeReward（2）+ P3.4-1 四死槽（4）+ P3.5-1 ② authorIntent 载体（1）+ P3.1 导出字段（~4） |
| dead projection 收敛 | **3 已收敛** / 3 残留观察 | 已删：②buildSceneConflict 生产死分支语义、②/④ authorIntent 双载体、P3.3/P3.4 兼容读取；残留观察：deriveSceneFear 孤儿 / ④.climaxRole 死值 / chapterRhythm 死参 |
| Story Truth owner | **7 个事实全部 ≤1 owner** | 6 authored 标量（goal/obstacle/choice/consequence/authorIntent/conflict）+ 1 派生（priorityGoal，禁回写） |
| 已知 stale/broken 测试 | **10** | 7 正式门前置失败 + regression.js（P3.1 造成）+ beat-slimmer/beat-continuity 前置 stale |
| 孤儿脚本 | **44/72 = 61%** | 36 零引用 + 8 仅文档提及 |
| Golden 覆盖 runtime 路径 | **ch1 派生规划零重试窄路径** | 覆盖：planChapter/decision/conflict 一次通过 + 四道闸计算值（force pin，不执行拒绝）+ memory commit；**不覆盖**：director/④②① EP、真实 LLM writer/reader、replan 重试循环、authored-plan、ch2+、Studio/IDE |

---

## §4 Golden 覆盖地图（2.4 节结论）

**`_invokeSceneLifecycleHook` 被调用但从不执行 director 钩子，永远返回 null**：
- golden 构造 orchestrator 未传 `sceneLifecycleHook`（tests/golden-baseline/lib.js:223）→ orchestrator.js:40 默认 null → :44 短路 return null → :420/548/572 三相位 × 4 场景 = 12 次调用全 no-op。
- 因此 director/scene-director/scene-execution 的 ④②① executionPlan **从未构建**；baseline.json `executionPlan.scenes[*]` 无嵌套 executionPlan 键（plan 级字段，非 director ④）。
- **P3.6 语义由 fixture + 回归门证明，非 golden**（31 文档 §6.2 自证）。

---

## §5 结论与建议

**Phase 3 结构性减法完成。** 六项扫描 1/2/3 干净，4/5 全部可归因前置或冻结，6 文档漂移为独立任务。唯一 Phase 3 自己造成的破坏 = **A1 regression.js**（极小修复）。

建议：
1. **拍板 A1**（1 行 + 重 capture）—— 唯一 A，修完即 Phase 3 完全收口；
2. **B1/B2 文档对账** 与 **B3/B4 死码清理** 作为独立下一任务（不扩大 Phase 3 边界）；
3. **停止 Phase 3 减法**，转下一阶段功能/质量任务——C 清单全部有边界，不值得为「更干净」继续削。

related: [[inkos-p36-engine-dual-compute]]、[[inkos-p35-plan-truth]]、[[inkos-phase2-ownership]]、[[inkos-golden-baseline]]

---

## §6 A1 执行记录（2026-08-20，Phase 3 封版前最后一刀 ✅）

**改动（唯一文件 tests/runtime-regression/regression.js）**：TRACKED 删除 `story_health.json` / `decision_history.yaml` / `conflict_history.yaml` 三项 + 注释说明 P3.1 退役。decision/conflict_history 文件已删（P3.1），story_health.json **数据文件仍留磁盘**（git-tracked、0 writer、内容 2026-07-08 陈旧）——概念已退役、数据文件未清，记为观察项不动（B3 清理候选）。

**门禁全绿**：
- 重 capture（5 files）+ `npm test:regression` exit=0（4 checks）
- 第一层 P3.6 fixture：Case A 8/8 + Case B + invariants exit=0
- 第二层：module-4 / decision-conflict-null / memory-unit / chapter-audit-flow / beat-execution 全 exit=0
- 第三层 golden 3× exit=0，verify 对照 baseline.json 全绿；log 哈希差异仅随机临时目录名（归一化后 byte-identical，确定性三坑之一）
- manifest 变更：adaptive_state.json 哈希 891bf362→8e54e176（**前置漂移**，重 capture 授权接受）

**Phase 3 状态：STRUCTURAL REDUCTION — CLOSED / FROZEN。** FOLLOW-UP/OBSERVATION 清单（sparse 崩溃 / ④.climaxRole 死值 / chapterRhythm 死参 / beat-slimmer+continuity stale / choice 时序 / golden 窄覆盖 / 44 orphan scripts / story_health.json 数据文件残留）全部冻结，不污染 Phase 3 完成边界。
