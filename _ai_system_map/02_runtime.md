# 02. 核心架构 + 完整 Runtime 执行链

> 《系统认知包》第 3、4 节。基于实际 import/调用证据（agent-A/B/C/D/F 交叉验证）。

---

## 3.x 谁是系统"大脑"？—— 各角色定位

| 问题 | 答案 | 证据 |
|---|---|---|
| **谁是系统"大脑"？** | `inkos-brain` 是"引擎库"（意图工厂 + 校验链 + LLM 封装）；`inkos-runtime` 的 `RuntimeOrchestrator` 是"导演/指挥"。**没有单一大脑**，是"引擎库 + 编排器"分工 | runtime 约 14 文件 import brain；orchestrator 调用 planner/decision/conflict |
| **谁负责故事规划（长篇架构）？** | `inkos-brain/src/planner/story-map.js`（读 story-map/main-arc/pov-grid/milestones/plot-threads → deriveChapterFunction/resolveChapterMapContext/applyStoryMapToIntent）+ Studio `story-map/store.js` | orchestrator.js:11/146 |
| **谁负责章节规划？** | `inkos-brain/src/planner/planner.js` 的 `planChapter` / `planNextChapter`（读任务卡/状态板/事实库/卷纲/上一章 anchor → intent）；authored plan 优先 | orchestrator.js:182 |
| **谁负责场景规划？** | `inkos-brain/src/scene/scene.js` 的 `buildScenePlan`（给 intent.scenes 打 status/wordTarget）+ Studio 路径的 director `buildSceneExecutionPlan`（产出 beats/tensionArc/hookRotation） | orchestrator.js:259；beat-execution.js:74 |
| **谁真正调用 LLM？** | **唯一 HTTP 调用点** `inkos-brain/src/writer/llm-writer.js:143 fetch()`。所有调用经 `chatCompletion` 包装。正文路径：brain `createLlmWriter`（CLI）或 Studio `studio-llm-writer`（Studio） | agent-D |
| **谁负责 Prompt？** | 双层：`inkos-prompt/src/compiler.js` 的 `compileScenePrompt`（**上下文种子层**，两条路径都用）→ Studio 路径再经 `inkos-runtime/src/compiler/prompt-compiler.js` 的 `compile()`（**P0-P3 密封层**，仅 Studio 用） | 详见 07 |
| **谁负责上下文？** | `buildDynamicPrompt`（dynamic-prompt.js → compileScenePrompt）+ 实体选择 + MemoryUnit/MemoryHierarchy + 缓存 | orchestrator.js:298 |
| **谁负责状态？** | 读取：`loadBrainContext`（loader.js）。修改：`MemoryUnit.commit`（→ git-memory snapshot + state-updater → applyPostChapter 写 canon + 09 任务卡 + anchor）；`adaptive_state.json` 由 adaptive 层 | chapter-pipeline.js:302-321 |
| **谁负责质量检查？** | 章级：chapter-pipeline 的 consistency/metrics/reader/critic/dedup/validation/reader-simulator（**硬闸在章级**）；Scene 级：CLI 路径 reviewScene/checkConsistency/evaluateDecisions（**软分析**），Studio 路径被替换为 non-blocking | 见 §10/§16 |
| **谁决定下一步做什么？** | `planNextChapter`（planner.js:402，读上一章 anchor → 优先 authored plan → 派生）+ daemon 自动下一章 / Studio 审计门控 | chapter-pipeline.js:316 |
| **谁负责记忆？** | `inkos-runtime/src/memory/memory-unit.js`（`MemoryUnit.commit`：anchor/state/git 快照/正文/任务卡）+ `memory-hierarchy.js` + brain `git-memory.js` | 详见 10 |
| **谁负责最终写作？** | CLI 路径：brain `createLlmWriter`（每 scene 一次 chatCompletion）。**Studio 路径（生产主路径）**：`createStudioLlmWriter`（逐 Beat 调 LLM + Optimizer + 连续性状态机） | 见 §13/08 |

**"真正执行" vs "只是定义/包装"**：
- 真执行：`RuntimeOrchestrator._runChapter`、`chapter-pipeline`、`scene-pipeline`、`MemoryUnit.commit`、`createLlmWriter`/`createStudioLlmWriter`、`compileScenePrompt`/`prompt-compiler.compile`
- 定义/包装：`inkos-sdk`（占位）、`event-pipeline.js`（死代码）、`tiers.js`（deprecated）、`ranking.js`（零引用）；director 的 `plan.js`（deprecated 别名）Phase 1 已删

---

## 4.1 入口（两处 CLI + 一处 HTTP）

```
inkos runtime run   → runFullPipeline (orchestrator.js:529) → createRuntime().runChapter()
inkos brain run(默认)→ runBrainPipeline (brain-runtime.js:17) → createRuntime().runChapter()   ← 同一条路
Studio POST /runtime/run → daemon.runChapter → StudioRuntimeOrchestrator.runChapter           ← 生产主路径
```

## 4.2 `_runChapter` 完整阶段（orchestrator.js:109-271）

```
1. loadBrainContext(bookDir, opts)                         读全部 novel/*.md|yaml → ctx
2. createChapterTrace + ensureBrainDir                      调试 trace
3. loadPriorChapterAnchor(prior, {required:true})          读 states/ch_(N-1)_anchor.yaml，失败即抛错
4. [短路] authored plan 存在且具体：
      loadAuthoredChapterPlan → isAuthoredPlanSpecific
      → serializeAuthoredPlanToIntent (planner.js:288)    作者意图优先，跳过 planner/decision/conflict
      → applyStoryMapToIntent → buildScenePlan → _runScenesAndChapter
5. [循环 ≤maxReplan=3] 无 authored plan：
      planChapter(ctx, attempt, {weights, priorAnchor})    → intent
      evaluateDecisions(intent)  失败 → emit decisionRejected → replan → continue
      evaluateConflict(intent)   失败 → replan → continue
6. saveChapterPlan + appendDecisionHistory + appendConflictHistory
7. buildScenePlan(intent) → _runScenesAndChapter
```

## 4.3 `_runScenesAndChapter`（orchestrator.js:273-518）逐 Scene

```
对每个 scene：
  buildDynamicPrompt(ctx, scene)        → 上下文种子（compileScenePrompt）
  buildSceneWritePrompt(ctx, intent, scene, dynamic)   → "# Scene Lore Seed"
  sceneLifecycleHook('plan')            [Studio] runDirectorPhase → promptAppend 追加进 scene.prompt
  scene.text = await writer({...})      ← 正文在此产出（CLI: createLlmWriter；Studio: createStudioLlmWriter）
  回写 intent.scenes[].text
  runScenePipeline(...)                 CLI: 软分析(仅空正文阻断)；Studio: runNonBlockingScenePipeline(有正文即pass)
  失败 → sceneRejected → replan → 递归 _runChapter（CLI 无上限；Studio 限 MAX_SCENE_HARD_FAIL_REPLAN=2）
  sceneLifecycleHook('reviewed') / ('memorized')   [Studio]
全部 scene 后：
  persistScenes → ch_XXXX_scenes.json
  assembleChapter → 章节正文（空则 awaiting:'writer'）
  runChapterPipeline(...)               ← 章级硬校验 + Memory 出口
  pass && saveChapter!==false → saveChapterFile → chapters/NNNN_*.md
  autoNextChapter → pipeline.autoNext
```

## 4.4 `runChapterPipeline`（chapter-pipeline.js:36-386）

```
bus.emit('chapterFinished')            ← 注意：在校验前发出（重入隐患见 14）
checkConsistency                       ← 硬拦（!force）
computeMetrics → metrics_dashboard.json
analyzeMetricsFeedback                 low+needsReplan → 返回失败+replanIntent（orchestrator.js:336 有界重入 _runChapter，≤maxReplan=3）
simulateReaders                        启发式，无 LLM
runCritic → critic_history.json        ← 硬拦（!force）
runDedupReview                         软信号
validateChapter (八项)                  ← 硬拦（!force）
Reader Simulator (2×LLM)               → softFail 触发 Optimizer (polish LLM)
Temperature AB (每5章)                 生产伪 AB 调用块已删（Phase 1）；ab-test.js 基础设施保留给测试/诊断
applyAdaptiveFeedback → adaptive_state.json
computeStoryHealth / saveStoryHealth
buildStateDiff
[deferCommit 分支]（Studio living）
   → 写 pending_commit/ch_N.json + writeChapterOnly（只写正文）→ pass:true, pendingAudit:true
[正常分支]
   → MemoryUnit.commit（anchor + state + git snapshot + real git commit + 正文 + canon）
   → planNextChapter（读 anchor → authored/派生）→ writeNextChapterTask（09 任务卡）
   → appendSceneHistory → saveChapterPlan(chapter+1)
saveBrainRun → ch_XXXX_run.json → emit pipelineCompleted
```

## 4.5 一次完整章节生成的真实执行时序（Studio 生产路径）

```
POST /api/books/:id/runtime/run（或 run-living，202+taskId）
  → runtime-control.js controlRun → guard.beginTask + acquireChapterRun
  → daemon.runChapter(N) → scheduler.enqueue → StudioRuntimeOrchestrator.runChapter
  → RuntimeOrchestrator._runChapter
      → loadBrainContext → trace → loadPriorChapterAnchor(N-1)
      → planChapter / evaluateDecisions / evaluateConflict（或 authored plan 短路）
      → buildScenePlan
  → _runScenesAndChapter（每 scene）：
      buildDynamicPrompt → buildSceneWritePrompt
      → sceneLifecycleHook('plan')：runDirectorPhase（Story→Chapter→Scene Director 软分析）
      → activeWriter = createStudioLlmWriter：
          acquireSceneLock → runHashDependencyCheck（canon 变了?→重编译 basePrompt）
          → compileStudioWriterPrompt → prompt-compiler.compile（P0-P3 密封）
          → executeBeatSequence/executeSceneWrite → 逐 beat：
              compileSlimBeatUserPrompt（beat-slimmer 组装 7 元素块+守卫+指令）
              → llmFn → chatCompletion → fetch（DeepSeek）→ beat 正文
          → 防复读硬失败检查（SCENE_HARD_FAIL → 有界 replan）
          → Optimizer 条件触发（polishFn LLM）
          → scene.text = finalText
      → runNonBlockingScenePipeline（只分析，不拦截）→ adaptive hints 落盘
      → persistScenes
  → assembleChapter → runChapterPipeline（deferCommit=true）
      → consistency→metrics→reader→critic→dedup→validation→reader-simulator(2×LLM)→optimizer→adaptive→storyHealth
      → 写 pending_commit + writeChapterOnly（不 commit/不 planNext）
  → 回 runtime-control：guard.completeTask → markPendingAudit → runPostChapterEvolution（AI 编辑反馈）
  → SSE 推送事件 → UI 显示"待审计"
  → 作者 POST /chapters/:n/accept → MemoryUnit.commit + planNextChapter + 解锁下一章
```

## 4.6 状态变化 / 数据产物（每章）

| 产物 | 路径 | 决定故事？ |
|---|---|---|
| 章节正文 | `chapters/NNNN_*.md`（+ 可能重复一份 saveChapterFile） | ✅ |
| 场景对象 | `_system/brain/ch_XXXX_scenes.json` | ✅（正文来源） |
| 章节计划 | `_system/brain/ch_XXXX_plan.json` | ✅（下一章 anchor） |
| Anchor | `states/ch_XXXX_anchor.yaml`（voiceDna/relationship_state/banned_elements/narrative_momentum/pov/location/current_date） | ✅（下一章必须读取） |
| 聚合状态 | `states/ch_XXXX.json`（含 nextChapter 回填） | ✅ |
| 任务卡 | `novel/09_current_chapter.md` | ✅ |
| canon 更新 | `08_current_state.md`+facts/timeline/foreshadow/knowledge/relationships/resources | ✅ |
| manifest | `_system/manifest.json` | ✅ |
| git 快照 | git-memory snapshots + real git commit/tag `inkos-ch-N` | ✅ |
| adaptive 权重 | `_system/brain/adaptive_state.json` | ✅（影响下一章 plan） |
| 指标/审计 | metrics_dashboard/critic_history/decision_history/conflict_history/scene_history/story_health/reader_sim_baseline/ab-tests/prompts/traces/runtime_state | ❌（UI/审计） |

## 4.7 LLM 调用总账（每章）

| 调用 | 次数 | 模型 | 用途 |
|---|---|---|---|
| Studio writer `llmFn` | 每 beat 1 次（≈3-6/场景） | deepseek-chat temp≈0.85 | **正文** |
| brain writer（CLI） | 每 scene 1 次 | temp 0.55 | **正文** |
| Reader Simulator | 每章 2 次（primary 0.3 + secondary 0.7） | temp 0.3/0.7, maxTok 500 | hookScore 诊断 |
| 章/场景 Optimizer polish | softFail 时 0~N 次 | temp≤0.85, maxTok 900 | 局部润色 |
| Studio 旁路（canon/world/character-brain/editor-feedback） | 按操作 | — | 设定生成/编辑 |

---

## 结论（架构判断）

1. **Runtime 2.0 的"事件驱动"名不符实**：核心链是同步函数调用，Event Bus 只做通知/SSE/guard 状态机；Dispatcher 仅 daemon `start()` 时接线，生产主流程（runViaDaemon）不接线。
2. **两条路径行为不对称**：CLI/Daemon（brain writer + scene 软分析 + 全量 MemoryUnit.commit + autoNext）vs Studio（Studio writer + beat + non-blocking scene + deferCommit 审计门控 + 作者 accept）。这是理解本系统质量差异的钥匙。
3. **多处"声明 ≠ 实际"**：PromptCompiler 非统一入口、生产伪 AB 调用块已删（Phase 1）、replanIntent 为 orchestrator 消费的有界恢复信号（story-thread shouldReplan 仍降级为 adaptive hint）、event-pipeline 死、daemon 自动重试被 guard 禁用、`chapterFinished` 早发。详见 `14_architecture_problems.md`。
