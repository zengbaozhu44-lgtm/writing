# 12. 文件级依赖图

> 《系统认知包》第 22 节。基于全仓 grep import 证据（agent-A/B/C/D/E/F/G 交叉验证）。

---

## 22.1 包级依赖（声明层面 package.json）

```
inkos-core → runtime, brain, director, prompt, writer, story-memory, ...
inkos-runtime → brain, director(未声明!), prompt(未声明?), studio-server(未声明! ← chapter-pipeline:11)
inkos-brain → writer, prompt, director(部分)
inkos-studio-server → runtime, brain, director, context-ranking, dynamic-budget, prompt-metrics,
                      story-memory, story-thread, hash-dependency, adaptive-learning, writer-optimizer
inkos-director → story-memory
inkos-writer-optimizer → director
inkos-sdk → (占位)
```

## 22.2 未声明依赖（越权相对导入）—— 风险点

| 越权方 | 目标 | 证据 |
|---|---|---|
| `inkos-runtime` → `inkos-director` | `../../../inkos-director/src/*` | prompt-compiler.js:15-41（20+ format*Block）、scene-pipeline.js:22（adaptive-planner）、doctor.js:12（hook-rotation） |
| `inkos-runtime` → `inkos-studio-server` | `../../../inkos-studio-server/src/writer-optimization/beat-continuity.js` | chapter-pipeline.js:11（similarityRatio）—— **LOCKED runtime 依赖 Studio，方向性铁律被打破** |
| `inkos-brain` → `inkos-director` | 相对导入 | 部分（见下） |
| `inkos-studio-server` → `inkos-runtime` 源码 | 相对导入 | studio-orchestrator.js extends RuntimeOrchestrator；compile-writer-prompt.js:27 import runtime prompt-compiler |

**结论**：monorepo 内大量"源码级相对路径越权 import"，绕过包声明边界。这使 `npm workspaces` 的依赖管理形同虚设，也让"Runtime LOCKED、Studio 只包装"的单向依赖声明不成立。

## 22.3 核心调用图（数据流视角，真实生产路径）

```
┌─────────────────────────────────────────────────────────────────┐
│  inkos-core/cli.js                                               │
│   runtime run → runFullPipeline → createRuntime().runChapter()   │
│   brain run (默认) → runBrainPipeline → 同一条 runChapter()        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│  inkos-runtime  RuntimeOrchestrator                              │
│   _runChapter:                                                  │
│     loadBrainContext (brain/loader.js)                          │
│     loadPriorChapterAnchor (states/ch_*_anchor.yaml)            │
│     planChapter/evaluateDecisions/evaluateConflict              │
│       (brain/planner/{planner,decision,conflict,story-map}.js)  │
│     buildScenePlan (brain/scene.js)                             │
│     buildDynamicPrompt (inkos-prompt/compiler.js)               │
│     _runScenesAndChapter:                                       │
│       sceneLifecycleHook('plan') → scene-lifecycle-bridge       │
│         → runDirectorPhase (director/director.js)               │
│       activeWriter:                                             │
│         CLI: brain/llm-writer.js createLlmWriter                │
│         Studio: studio-llm-writer.js createStudioLlmWriter      │
│           → compileStudioWriterPrompt (compile-writer-prompt.js)│
│             → prompt-compiler.compile (runtime, P0-P3)          │
│             → format*Block (director 20+ 模块)                  │
│           → executeBeatSequence (beat-execution.js)             │
│             → buildSceneExecutionPlan (director/scene-execution)│
│             → compileSlimBeatUserPrompt (beat-slimmer.js)       │
│             → llmFn → chatCompletion → fetch                    │
│           → validateWriterRuntimeV2 (director/writer-runtime-v2)│
│           → Optimizer polish (writer-optimizer)                 │
│       runNonBlockingScenePipeline (Studio) / runScenePipeline   │
│     runChapterPipeline:                                         │
│       consistency/metrics/reader/critic/dedup/validation/       │
│       reader-simulator(2×LLM)/optimizer/adaptive/storyHealth │
│       MemoryUnit.commit (runtime/memory-unit.js)                │
│         → state-updater applyStateDiffToCanon / writeNextChapter│
│         → git-memory snapshot                                   │
│       planNextChapter → writeNextChapterTask                    │
└─────────────────────────────────────────────────────────────────┘
```

## 22.4 关键文件级依赖明细（Top 20 证据）

| 文件 | import | 意义 |
|---|---|---|
| `runtime/pipeline/orchestrator.js:10` | brain planner `serializeAuthoredPlanToIntent` | **brain 已接入 runtime（核心）** |
| `runtime/pipeline/chapter-pipeline.js:11` | studio `writer-optimization/beat-continuity.js similarityRatio` | **runtime → studio 反向依赖** |
| `runtime/compiler/prompt-compiler.js:15-41` | director 20+ `format*Block` | director prompt 块库（Studio writer 用） |
| `runtime/pipeline/scene-pipeline.js:22` | director adaptive-planner `recordAdaptiveHint` | 动态 import |
| `runtime/pipeline/doctor.js:12` | director hook-rotation `validateHookRotation` | 校验函数 |
| `runtime/runtime/execution-guard.js:574` | `applyDaemonExecutionGuard` | 禁用 daemon 自动重试 |
| `brain/writer/llm-writer.js:7` | writer optimizer `optimizeWriterPrompt` | writer 包活（仅 Brain 路径） |
| `brain/writer/llm-writer.js:143` | `fetch` | **唯一 HTTP 点** |
| `brain/loader.js:190-268` | 读 novel/ 全部 canon 模块 | 上下文唯一装载口 |
| `studio-server/routes.js:151-154` | `createStudioLlmWriter` + `StudioRuntimeOrchestrator` 注入 daemon | **Studio 替换默认 writer** |
| `studio-server/studio-orchestrator.js:112` | `extends RuntimeOrchestrator` + 覆写 `_runScenesAndChapter` | **Studio 改写 Runtime 行为** |
| `studio-server/studio-orchestrator.js:253` | `runNonBlockingScenePipeline` | 替换 scene 校验 |
| `studio-server/writer-optimization/beat-execution.js:4-11` | director 5 符号（buildSceneExecutionPlan 等） | director 重引擎的 Studio 接线 |
| `studio-server/scene-lifecycle-bridge.js:214/259` | director `runDirectorPhase` | director 唯一生产入口 |
| `studio-server/compile-writer-prompt.js:27/155` | runtime `prompt-compiler.compile` | Studio 用 runtime 密封编译器 |
| `studio-server/living-novel-engine.js:305` | MemoryUnit.commitLivingPrepare | Studio → runtime memory |
| `studio-server/brain-context-sync.js:270` | writeModule('chapter-task') | **Studio 直改 09 任务卡** |
| `studio-server/chapter-audit.js:187` | acceptChapter → MemoryUnit.commit + planNextChapter | accept 门控记忆落地 |
| `director/scene-execution.js:75` | `buildSceneEngineBundle`（20 引擎） | 重引擎装配器 |
| `core/workflows/post-chapter.js` | applyPostChapter（写 canon+快照） | state-updater 内部调用 |

## 22.5 依赖方向问题（Top 3）

1. **Runtime LOCKED 被 Studio 反向依赖打破**（chapter-pipeline.js:11）
2. **Runtime 未声明 director 依赖**（相对路径越权）
3. **Studio 大量直写 novel/ 业务文件**（system-store/module-service/chapter-service/brain-context-sync/volume-plan/living-novel-engine）违反"Studio 只读"铁律

## 22.6 死亡/孤立模块（无入边）

- `studio-server/director-bridge.js`（零导入）
- `director/plan.js`（deprecated 别名，零导入）
- `director/checkpoint.js` 的 analyzeSceneCheckpoints（生产从不调用）
- `brain/planner/decision-check.js`（导出后无人 import）
- `runtime/event/event-pipeline.js`（事件管线，无生产接线）
- `inkos-sdk`（占位）
- `_runtime-test/story/state/*`（孤儿产物）
