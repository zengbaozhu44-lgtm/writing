# 05. Directors + Planner / Decision / Conflict

> 《系统认知包》第 7、8 节。基于 agent-B（brain）与 agent-C（director）的调用图证据。

---

## 7.1 Director 体系 —— 是什么，在哪激活

**定义**：`inkos-director` 提供 Story Director / Chapter Director / Scene Director 三层"导演"概念。本质是**非阻塞的规划/评审/格式化辅助层**（plan-time 软反馈，不调 LLM、不硬卡正文）。

**激活边界（关键）**：
- 生产路径唯一入口 = `director.js` 的 `runDirectorPhase` → 只在 **Studio 路径**经 `scene-lifecycle-bridge.js` 的 `sceneLifecycleHook('plan'|'reviewed'|'memorized')` 执行（scene-lifecycle-bridge.js:214/259/418/421）。
- `runDirectorPhase` 内部分发：`:76` runStoryDirector → `:77` runChapterDirector → `:102` runSceneDirector（其 `:151` 调 `buildSceneExecutionPlan`）→ `:155` runSceneReview。
- **纯 CLI/Daemon 路径完全不执行 director**（`cli.js:295` 不传 sceneLifecycleHook；`daemon.js:36` hook 默认 null）。
- `@inkos/director` 的 deps **只有 `@inkos/story-memory`**；`@inkos/runtime` 通过**相对路径 `../../../inkos-director/src/*` 未声明依赖地越权引用**（prompt-compiler/scene-pipeline/doctor），且只用格式化/校验函数。
- 直接调用 `runChapterDirector`/`runSceneDirector`/`runStoryDirector` 的生产入口**不存在**——全在 `scripts/` 测试里。

**Director 产出什么**：
- **Story Director**：故事层面指引（长线钩子/主线方向）
- **Chapter Director**：`_chapterDirector.brief`（`<!-- inkos-chapter-director -->`，3705 字符执行单）——读取 closing_emotion/tailExcerpt 等跨章锚（chapter-director.js:189-191/344-355）
- **Scene Director**：`directorBrief`（`<!-- inkos-scene-director -->`，执行单）
- **ExecutionPlan**：`buildSceneExecutionPlan`（scene-execution.js:74）把约 20 个引擎（situation/question/reward/hook/emotion/promise-lifecycle/question-lifecycle/tension-arc/hook-rotation/writer-scene-arc/character-transformation/character-behavior/reader-emotion）捆成 beats 执行计划
- **Adaptive**：`adaptive-planner.js recordAdaptiveHint` 落 `director/adaptive/ch_N/hints.json`
- **评审**：`scene-review.js` 软评审（质量评分/节奏报告）

**数据落点**：`novel/_system/studio/director/{ch_NNNN/scene_NN.json, adaptive/, reviews/, pacing/}`。

**判定**：Director 是"**Studio 专属富化层**"——对 runtime 它是格式装饰库（format*Block），对 studio-server 它是决策层（executionPlan/directorBrief 被 orchestrator 消费回填正文生成）。是否激活完全取决于谁驱动生成：Studio 编排 → 全量激活；CLI → 完全不激活。

**真死代码（agent-C 修正版）**：`director-bridge.js`（遗留重复的 createSceneLifecycleHook，零导入者）、`plan.js`（deprecated 别名，零导入者）、`checkpoint.js:15 analyzeSceneCheckpoints`（生产 switch 内从未调用）——三者 **Phase 1 已删**；`narrative-runtime.js` 半活（状态机废弃仅测试调用；情绪能力 EMOTION_WAVE/validateEmotionWave/suggestNextEmotion/assertInformationGapMeaningful 被生产消费，见 13 B1）。

## 7.2 StoryMap（故事地图）—— 长篇架构的来源

| 组件 | 文件 | 内容 | 消费方 |
|---|---|---|---|
| main-arc | `story-map/main-arc.yaml` | 全书主线弧 | `story-map.js deriveChapterFunction` |
| pov-grid | `story-map/pov-grid.yaml` | POV 轮换表 | `applyStoryMapToIntent`（pov 注入） |
| milestones | `story-map/milestones.yaml` | 里程碑事件 | `deriveChapterFunction`（distance_to_milestone） |
| plot-threads | `story-map/plot-threads.yaml` | 线索线程 | intent active_threads |
| chapter-functions | `story-map/chapter-functions.yaml` | 章功能标签 | intent |
| cognitive-gaps | `story-map/cognitive-gaps.yaml` | **认知缺口账本**（open/touched/resolved/cut）——伏笔库的"活"通道 | 协议渲染器 → 前缀进 writer prompt |

**关键函数**（`planner/story-map.js`）：`deriveChapterFunction`（距里程碑距离→功能）、`resolveChapterMapContext`、`applyStoryMapToIntent`（story-map 字段注入 intent，orchestrator.js:146 调用）。

> ⚠️ 记忆笔记 `inkos-gap-network-p0`：伏笔库 `12_foreshadow_db.yaml` 曾"只写不读"；缺口的活通道是 `07_state_board.md`，持久源是 `cognitive-gaps.yaml`。story-map 曾污染（pov-grid/milestones/chapter-functions 重写）已修复。

---

## 8.1 Planner —— 章规划核心

### `planChapter`（planner.js:67）
输入：`ctx`（loadBrainContext 产物）+ attempt + weights + priorAnchor（上一章锚）
输出：`intent`（pov/present/chapterIntent/mainGoal/obstacles/turningPoint/ending/bargain/mustGain/mustLose/newForeshadow/location/time/adaptiveWeights/scenes[]）
证据输入链：`09_current_chapter.md`（任务卡）→ `08_current_state.md` → `07_state_board.md` → `13_facts_db.yaml` → `10_volume_outline` → `adaptive_state.json` 权重。

### `loadAuthoredChapterPlan` + `serializeAuthoredPlanToIntent`（planner.js:210/288）
**authoritative plan 优先**：读 `chapter_plans/chapter_NNNN.yaml`，若 `isAuthoredPlanSpecific`（goal/scenes/cost/hook/foreshadow 白名单非空）→ 跳过 planner/decision/conflict 直接生成 intent。
> ⚠️ 记忆 `inkos-authored-plan-serializer`：serializer 曾丢弃 gap_focus/weave_mode 等字段（白名单收割）——现已在协议层修复为"零代码进模型必须渲染进 goal/scenes 文本"。

### `planNextChapter`（planner.js:402）
章末由 chapter-pipeline 调用：读上一章 anchor → 若有 authored plan 用其继续 → 否则从 `09_current_chapter.md` 派生下一章 intent。

### `applyAnchorConstraints`（planner.js:513-598）
上一章锚注入本章：
- `closing_emotion` → 本章情绪起点 + Scene1 goal（:575-595）
- `forbidden_openings` → 防开头雷同
- `voiceDna` → 文风约束
- `tailExcerpt`（120字）→ 续写起点
- `banned_elements` → 禁元素（如左臂焦毁知觉丧失 → 禁止写"左臂正常用力"）

### `replan`（planner.js:752）
失败闸：Scene 硬失败（SCENE_HARD_FAIL）或决策/冲突校验失败时重规划。CLI 路径无上限（递归 _runChapter），Studio 路径限 `MAX_SCENE_HARD_FAIL_REPLAN=2`（studio-orchestrator.js:19）。

### `planChapter` 的决策/冲突校验
```
evaluateDecisions(intent)  → 失败 → emit decisionRejected → replan（≤3 次）
evaluateConflict(intent)   → 失败 → replan
```
- **Decision**（`planner/decision.js`）：决策合理性（values/interest/resources/knowledge/relationship/risk 六维，每维 pass/fail）。
- **Conflict**（`planner/conflict.js`）：冲突类型（resource/rule/information）presence/agency/direction 校验，产出 conflictResult（primary/suggestObstacle）。

> 注意：`planner/decision-check.js` 已删（Phase 1，原为死代码，见 13 B3）。真正的决策检查在 `decision.js`。

## 8.2 从 plan 到 scenes 的转换

```
intent（章级） → buildScenePlan（brain scene.js）→ intent.scenes[] 打 status/wordTarget
             → [Studio] buildSceneExecutionPlan（director scene-execution.js:74）→ executionPlan
                 {version:"scene-execution-1", beats:[{order,id,structuralBeat,...}]}
```

真实案例（ch_0005 书）`executionPlan`：`{version:"scene-execution-1", beats:[{order,id,structuralBeat,...}]}`，scene 对象含 `sceneOutcome{success,failure}`/`scenePlan{goal,obstacle}`。

## 8.3 各"规划"模块谁真执行

| 模块 | 生产路径执行 | 证据 |
|---|---|---|
| story-map.js | ✅ | orchestrator.js:146 |
| planner.planChapter/planNextChapter | ✅ | orchestrator.js:182 / chapter-pipeline.js:316 |
| decision.evaluateDecisions | ✅ | orchestrator _runChapter 循环 |
| conflict.evaluateConflict | ✅ | orchestrator _runChapter 循环 |
| decision-check.js | ❌ 已删（Phase 1） | 原 index.js:19 重导出后无人 import |
| director runDirectorPhase | ⚠️ 仅 Studio | scene-lifecycle-bridge.js |
| buildSceneExecutionPlan | ⚠️ 仅 Studio | beat-execution.js:74 |
