# 13. "实际运行" vs "设计意图" 对照 —— 死代码 / 假功能 / 双轨清单

> 本文件是《系统认知包》第 23 节。基于全仓 grep import/调用证据，**不**依赖注释或 README 声明。
> 判定口径：一个模块是 ALIVE 还是 DEAD，以「是否被真实生成路径 import 并执行」为准。

---

## A. 代码实际执行的（真实生成链上的模块）

见 `02_runtime.md`（执行链）与 `07_prompt_llm.md`（Prompt/LLM）。要点：

- **CLI `inkos runtime run` / `inkos brain run`（默认）→ `RuntimeOrchestrator._runChapter`**（`packages/inkos-runtime/src/pipeline/orchestrator.js`）
- Brain 的 **Planner / Decision / Conflict / Scene / DynamicPrompt / LlmWriter / Memory / GitMemory / StateUpdater / Metrics / Reader / Critic / Validation / Consistency / StoryHealth / Adaptive** 全部被 runtime 在真实路径上调用（约 14 个 runtime 文件 import brain，见 `02_runtime.md` 与 agent-B 审计）
- Runtime `prompt-compiler.js:15-41` 从 `inkos-director` 拉入 20+ `format*Block` 函数 —— director 的 **prompt 块库** 是活的
- Studio 路径额外执行：`createStudioLlmWriter`（`studio-llm-writer.js`）→ `writer-optimization/beat-execution.js` 逐 Beat 写 → director 的 `scene-execution.js` 的 `buildSceneExecutionPlan`

## B. 代码中存在、设计上有、但从未被真实调用（ORPHANED）

### B1. `packages/inkos-director/src/narrative-runtime.js` —— 半活：状态机废弃，情绪能力仍被生产消费
- **废弃（仅测试消费）**：`createNarrativeState` / `applyNarrativeBeat` / `updateNarrativeStateAfterBeat` / `NarrativeRuntime` 类 —— 唯一调用者 `scripts/test-narrative-runtime.js`（Phase 2 外科拆分目标）
- **活（生产消费）**：`EMOTION_WAVE` / `PEAK_EMOTIONS` / `FLAT_EMOTIONS` / `validateEmotionWave` / `suggestNextEmotion`（`reader-emotion-engine.js:14-18` 导入 → 间接进 prompt）；`assertInformationGapMeaningful`（`chapter-director.js:50`、`scene-execution.js:57`）
- 文件头注释自认：「接入 validateWriterRuntimeV2 — 需要后续任务处理」「Promise Registry 与 activePromises 深度同步 — 需要后续任务处理」
- **判定：情绪能力活、状态机死；不是"全废"文件**

### B2. `packages/inkos-studio-server/src/director-bridge.js` —— Phase 1 已删
- 曾为 `scene-lifecycle-bridge.js` 的遗留重复实现（全文无人 import），**Phase 1 已删除**

### B2b. `packages/inkos-director/src/plan.js` 与 `checkpoint.js` —— Phase 1 已删
- `plan.js`：曾为 `@deprecated 请使用 scene-director.js` 的兼容别名（重导出 buildSceneDirectorBrief/runSceneDirector 为 buildDirectorPlanBrief/runDirectorPlan），零导入者
- `checkpoint.js:15 analyzeSceneCheckpoints`：director.js:19 导入但仅在 :233 重导出，生产 switch 内从未调用。**两者 Phase 1 已删除**

### B3. `packages/inkos-brain/src/planner/decision-check.js` —— Phase 1 已删
- 曾整文件无调用者（唯一"调用"是 `index.js:19` 重导出 `checkContentValues`，导出后无人 import）；决策检查实际由 `decision.js` 承担。**Phase 1 已删除**

### B4. director 的重引擎 —— agent-C 修正版（生产可达性修正）
- `scene-execution.js`（1272 行）**两条 Studio 生产路径可达**：① `runDirectorPhase('plan')` → `runSceneDirector` → `buildSceneExecutionPlan`；② beat 写作器 `beat-execution.js:74` → `buildSceneExecutionPlan`。`buildSceneEngineBundle`（scene-execution.js:75）把约 20 个引擎（situation/question/reward/hook/emotion/promise-lifecycle/question-lifecycle/tension-arc/hook-rotation/writer-scene-arc/character-transformation/character-behavior/reader-emotion + beat-library/beat-memory/reward-engine/reader-feedback/reader-preference/reader-satisfaction/chapter-blueprint/writer-runtime-v2）捆在一起。**但它们只对 Studio 编排/写作的书生效**；CLI 路径完全不触发
- `writer-runtime-v2.js`：被 `beat-execution.js:4-11` 直接导入（createWriterRuntimeSession/validateWriterRuntimeV2/applyBeatToRuntimeSession）—— **活的（仅 Studio）**
- 修正旧判定：B4 中多数模块经 `buildSceneEngineBundle` 可达，不再算"零外部 import"；原判"真正孤儿"（director-bridge.js / plan.js / checkpoint.js）**Phase 1 已删**，现存真死代码仅 narrative-runtime 状态机（见 B1）

### B5. 直接调用 `runChapterDirector` / `runSceneDirector` / `runStoryDirector` / `buildSceneDirectorBrief` 的生产入口
- 生产仅能经 `runDirectorPhase`（`director.js`）到达，而 `runDirectorPhase` 只在 **Studio 路径**（`scene-lifecycle-bridge.js`）执行
- 直接调用者全在 `scripts/`（test-director.js、test-beat-execution.js、test-writer-first.js、test-hook-reward.js、test-situation-question.js 等 13 个测试）

## C. 看起来设计了，但实际上没有生效 / 效果打折

| 项 | 声明/设计 | 实际 |
|---|---|---|
| **Scene 级质量校验** | Runtime `runScenePipeline` 会 review/consistency/decision，失败重规划 | **Studio 路径被 `runNonBlockingScenePipeline` 替换**（`studio-orchestrator.js:253-280`）：有正文即 pass，`analysisOnly:true, blocking:false` —— **scene 级审查永不拦截、永不重规划** |
| **Director 决策层** | "Story/Chapter/Scene Director" | 只在 Studio 路径执行；**纯 CLI/Daemon 路径完全不参与**（`cli.js:295/302/313` 不传 `sceneLifecycleHook`） |
| **Promise/Question 生命周期持久化** | 跨章伏笔账本 | `createPromiseManager` 注释明言「内存 registry，不落盘」；`promisePointer` 亦「不接 Promise Registry」。**每次 plan 重建，非持久化** |
| **Event Bus 事件驱动** | 14 种事件，Pipeline 通信 | 见 `02_runtime.md` §4：事件实际用于**通知/日志/SSE**，**核心生成链是同步函数调用**，不是事件驱动 |
| **"Runtime 是唯一真相(SSOT)"** | ARCHITECTURE.md 铁律 | Studio 直接写盘 novel/ 业务文件（见 E），且用自己的 writer 替换默认 writer |
| **`inkos brain run` 与 `inkos runtime run` 是两条管线** | AGENTS.md 暗示的版本差异 | **底层同一条路**：`brain run`（无 `--legacy`）→ `runBrainPipeline` → `createRuntime().runChapter()`；差异只在入口参数（`--legacy`/`--resume`/`--writer`） |

## D. 重复实现

| 重复对 | 说明 |
|---|---|
| `inkos-runtime/src/compiler/prompt-compiler.js` vs `inkos-prompt/src/compiler.js` | Runtime 用自己的 compiler（573 行，import director format*Block）；`inkos-prompt` 包有自己的 compiler + tiers/context-diff/cache。**runtime 是否用 inkos-prompt 由 agent-D 裁定**（若两者都在运行时会话中被调用，则是双编译器；否则 inkos-prompt 是独立/测试包） |
| `inkos-core/src/workflows/chapter-review.js` 的 `runChapterReview` vs `inkos-director/src/chapter-review.js` 的 `runChapterReview` | 同名不同模块。core 版：9 维阈值评分写 `16_chapter_review/*.yaml`（CLI `inkos review` 用）；director 版：Reader Curve + nextChapterGuidance（Studio `runtime-control.js` 用） |
| `inkos-core/src/workflows/post-chapter.js`（V4 章后 delta 落盘） vs `inkos-brain/src/memory/state-updater.js` | state-updater 内部调 `applyPostChapter` —— 是包装而非并列 |
| `director-bridge.js` vs `scene-lifecycle-bridge.js` | B2，前者是后者的遗留重复，已删（Phase 1） |
| CLI `inkos context/delta/post/review`（手动 tier 流程） vs `runtime run`（全自动闭环） | 两条 V4 写作路径共存，前者是"半自动"遗留，后者是官方推荐 |

## E. 废弃 / 只用于 UI 展示、不影响生成的字段

### E1. 只写不读的运行时产物
| 产物 | 写入方 | 读回方 |
|---|---|---|
| `relevance_stats.json`（prompt-cache 下） | prompt 层 | 需 agent-G 用真实书数据确认是否被读 |
| `context_diff.json` | 上下文 diff 记录 | 同上 |
| `prompt_metrics.json` | 同下 | 同上 |
| `adaptive_state.json` | `adaptive.js`/`adaptive-planner.js` | **Planner 读取做权重**（`loadAdaptiveState`，orchestrator.js:24）→ 是活的数据 |
| `scene_summary.json` | 场景摘要 | 需 agent-G 确认 |
| `conflict_history.yaml` / `decision_history.yaml` / `scene_history.yaml` | orchestrator `appendDecisionHistory`/`appendConflictHistory` | 写入即存档，**不读回生成**（决策链只依赖实时 evaluate） |
| `critic_history.json` / `metrics_dashboard.json` | chapter-pipeline | **不读回**（仅 dashboard/UI） |
| 各 `ch_XXXX_plan.json`（intent 存档） | saveChapterPlan | 下一章的 `planNextChapter` **会读上一章 anchor**（`loadPriorChapterAnchor`），但读的是 anchor 而非全 plan |

### E2. 只影响 UI 的字段
- 大量 `metrics_dashboard.json`、`story_health.json` 的历史曲线字段只供 Studio dashboard 展示
- `relevance_stats`、`prompt_metrics` 的统计字段（若未被 compiler 消费，则仅诊断 UI）

## F. 真正会影响 LLM 输出的字段（写进 Writer Prompt 的）

由 `07_prompt_llm.md` 详细展开。核心通道（确定性证据）：
- **plan → intent**：`serializeAuthoredPlanToIntent`（planner.js:288）+ `applyStoryMapToIntent`（story-map.js:257）→ `buildScenePlan` → `buildDynamicPrompt` → `buildSceneWritePrompt` → writer
- **director 块**：`prompt-compiler.js` 的 `formatNarrativeTask`（situation/question/conflict/emotion/hook 等 format*Block）→ P0/P1 prompt 层
- **memory 单元**：`MemoryUnit` 召回 → 注入下一章 prompt（agent-E 给证据）
- **novel 模块文件**：`08_current_state.md` / `09_current_chapter.md` / `07_state_board.md` / `01_world_bible.md` / `02_writing_bible.md` / `03_character_bible/*.md` / `11_timeline.yaml` / `12_foreshadow_db.yaml` / `13_facts_db.yaml` / `06_knowledge_matrix.yaml` / `14_resource_db.yaml` / `05_relationship_graph.yaml` —— 经 loader/`loadBrainContext` 进入上下文
- **`_system/story_dna.yaml` / `style_dna.yaml`**：Studio writer 读入 prompt（studio-llm-writer.js:200-201）

## G. 结论：系统"真实能力"与"文档声称"的偏差表

| 声称 | 实际 | 偏差性质 |
|---|---|---|
| Runtime 2.0 全自动闭环：Planner→Decision→Conflict→Scene→Writer→Review→Consistency→Decision（逐 Scene）→Metrics→Reader→Critic→Validation→Adaptive→GitMemory→StoryHealth→Next | **CLI 路径成立**；**Studio 路径把 Scene 层替换为"只分析不拦截"** | 双轨 |
| Studio 只包装，不实现业务 | Studio 有自己的一整套 writer + optimizer + 直写盘 | 铁律被违反 |
| Director 是决策层 | 只在 Studio 路径执行；纯计算/文案，不调 LLM，不硬拦截 | 半真 |
| 事件驱动 | 同步调用 + 事件用于通知/日志/SSE | 命名大于实际 |
| Memory 全链路 | **Studio 路径全激活**；CLI 路径只剩 anchor+canon+场景内续写 | 双轨 |
| Cause/Effect | 拍内启发式真实；跨场景/章零持久化；Brain 路径缺席 | 半真 |

---
> ✅ 七个 agent 已全部返回并合并（memory 只写不读清单见 `10_memory.md`；真实书"写但没读"字段见 `11_real_execution_trace.md` §20.3）。agent-C 修正版已并入 B2/B4（director 重引擎经 buildSceneEngineBundle 可达）。**Phase 1 已删 director-bridge.js / plan.js / checkpoint.js / decision-check.js；现存真死代码仅 narrative-runtime 状态机**（见 B1）。
