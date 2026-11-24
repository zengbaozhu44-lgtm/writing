# 01. 完整目录地图 + 核心架构（谁负责什么）

> 《系统认知包》第 2、3 节。基于全仓实际文件清单与 import/调用证据（agent-B/C/E/F 交叉验证）。

---

## 2.1 仓库全貌（monorepo / npm workspaces）

```
InkOS/
├── packages/           # 17 个包
├── scripts/            # 73 个测试/工具脚本
├── tests/              # 回归测试
├── books/              # 真实生成的书（数据，非代码）
├── _tools/             # 协议渲染器（P1 生成器）generate-chapter-plan.mjs
├── docs/               # 设计文档（含 IRP v0.1、AB report、preview-drawer schema）
└── .inkos/             # schema / 模板 / workflows / 会话 / 全局风格库
```

## 2.2 包级目录地图（一句话 + 关键文件）

### 核心执行链（真调用、真执行）
| 包 | 角色 | 关键文件 |
|---|---|---|
| **inkos-runtime** | **Runtime 2.0 编排器**（LOCKED 声明但被 Studio 违反） | `src/pipeline/orchestrator.js`（_runChapter）、`src/pipeline/chapter-pipeline.js`（章后硬闸+Memory 出口）、`src/pipeline/scene-pipeline.js`（Scene 校验）、`src/pipeline/non-blocking-scene-pipeline.js`（Studio 替换版）、`src/compiler/prompt-compiler.js`（P0-P3 密封编译器）、`src/memory/memory-unit.js`（MemoryUnit.commit）、`src/memory/memory-hierarchy.js`、`src/runtime/execution-guard.js`、`daemon.js`、`scheduler.js`、`trigger.js`、`src/event/event-bus.js`、`src/event/dispatcher.js` |
| **inkos-brain** | **引擎库**（意图工厂+校验链+LLM 封装，被 runtime 约 14 文件 import） | `src/planner/planner.js`（planChapter/planNextChapter/serializeAuthoredPlanToIntent/replan）、`src/planner/story-map.js`、`src/planner/decision.js`、`src/planner/conflict.js`、`src/planner/adaptive.js`、`src/scene/scene.js`（buildScenePlan）、`src/writer/llm-writer.js`（**唯一 fetch 点**）、`src/critic/`、`src/validation/`、`src/consistency/`、`src/reader/`、`src/metrics/`、`src/memory/memory.js`、`src/memory/git-memory.js`、`src/memory/state-updater.js`、`src/health/story-health.js`、`src/loader.js`（loadBrainContext）、`src/dynamic-prompt.js`、`src/runtime/brain-runtime.js` |
| **inkos-director** | **Director 引擎库 + 20+ prompt 块**（仅 Studio 路径激活） | `src/director.js`（runDirectorPhase）、`src/scene-execution.js`（buildSceneExecutionPlan，1272 行）、`src/adaptive-planner.js`（recordAdaptiveHint）、`src/chapter-review.js`（Reader Curve+nextChapterGuidance）；prompt 块：`writer-craft-runtime`/`writer-runtime`/`human-writing-policy`/`chapter-author-goal`/`writer-scene-arc`/`conflict-engine`/`situation-engine`/`character-desire-engine`/`character-transformation`/`character-behavior`/`hook-ladder`/`climax-engine`/`emotion-curve-engine`/`reader-emotion-engine`/`beat-state`/`chapter-rhythm`/`voice-dna`/`writer-first`；Studio 重引擎（多数经 buildSceneEngineBundle 可达，非死，见 13 B4）：`chapter-blueprint.js`/`reader-feedback.js`/`reward-engine.js`/`beat-library.js`/`beat-memory.js`/`reader-preference.js`/`reader-satisfaction.js`；`writer-runtime-v2.js` 活（仅 Studio，beat-execution 经 @inkos/director 消费）；`narrative-runtime.js` 半活（状态机废弃，情绪能力仍被生产消费，见 13 B1） |
| **inkos-prompt** | **Prompt 编译器/分层/缓存**（上下文种子层） | `src/compiler.js`（compileScenePrompt:143）、`src/cache.js`、`src/cache-validator.js`、`src/metrics.js`、`src/relevance-learning.js`、`src/entity-selector.js` |

### Studio 生产面（日常入口）
| 包 | 角色 | 关键文件 |
|---|---|---|
| **inkos-studio-server** | HTTP API + 自己的 Writer（生产主路径） | `src/routes.js`（1082 行手写 if 链，handleApi:178）、`src/api-gateway.js`（FORBIDDEN 才真执行）、`src/studio-orchestrator.js`（extends RuntimeOrchestrator，覆写 _runScenesAndChapter，runNonBlockingScenePipeline）、`src/studio-llm-writer.js`（llmFn:356，executeBeatSequence/executeSceneWrite）、`src/runtime-control.js`（runViaDaemon:42）、`src/living-novel-engine.js`、`src/living-task.js`、`src/task-manager.js`、`src/chapter-audit.js`（accept/optimize）、`src/chapter-service.js`（直写正文）、`src/module-service.js`、`src/system-store.js`、`src/brain-context-sync.js`（直改 plan/current_state）、`src/execution-guard-store.js`、`src/scene-lifecycle-bridge.js`（hash/budget/context-ranking/director 软分析）、`src/creator-loop.js`、`src/creator-intelligence.js`、`src/ai-service.js`（Wizard 直调 LLM）、`src/story-dna-context.js`、`src/volume-plan.js`、`src/style-store.js`、`src/presets.js`、`src/runtime-reader.js`、`src/book-service.js`、`src/compatibility.js`、`src/diagnosis-service.js`、`src/story-context-provider.js`、`src/director-bridge.js`（**死文件**）、`src/story-map/store.js`、`src/writer-optimization/`（beat-continuity.js 1151、beat-slimmer.js 808、beat-execution.js 670、sample-driven-writer.js 521、compile-writer-prompt.js 263）、`src/style-genebank/` |
| **inkos-studio** | React 前端（IDE） | UI 组件（PlanPreviewDrawer 等） |

### 独立专项包（部分接线，见 13）
| 包 | 角色 | 接线状态 |
|---|---|---|
| **inkos-writer** | 写作优化规则库 | ✅ 被 brain llm-writer import（仅 Brain 路径） |
| **inkos-context-ranking** | 上下文排序 | ⚠️ 仅 Studio scene-lifecycle-bridge |
| **inkos-dynamic-budget** | 动态 token 预算 | ⚠️ 仅 Studio |
| **inkos-prompt-metrics** | prompt 指标落盘 | ⚠️ Studio + compiler 读 |
| **inkos-story-memory** | 故事记忆 | ⚠️ 仅 Studio（studio-llm-writer:274） |
| **inkos-story-thread** | 主线推进分析 | ⚠️ 仅 Studio（降级为 hint） |
| **inkos-hash-dependency** | canon hash 依赖 | ⚠️ 仅 Studio |
| **inkos-adaptive-learning** | 自适应学习 | ⚠️ 仅 Studio |
| **inkos-writer-optimizer** | 打磨器 | ⚠️ Studio + reader-simulator |
| **inkos-sdk** | 占位 SDK | ❌ 未实现 |
| **inkos-core** | CLI + 手动 V4 workflows | ✅ 入口（runtime 子命令接核心链） |

## 2.3 磁盘数据目录（books/ 与 novel/ 地图）

```
books/<书>/
├── book.json                      schemaVersion:4 / brainEnabled / targetChapters / chapterWordCount
├── chapters/
│   ├── index.json                 ← 空壳死文件（从未被当前管道写，见 11）
│   └── 0001_标题.md …             ← 章节正文（首行 `# 标题`）
└── novel/
    ├── 01_world_bible.md          世界圣经（可编辑 canon）
    ├── 02_writing_bible.md        写作圣经/文风规则
    ├── 03_character_bible/*.md    角色档（含"当前状态快照"块）
    ├── 04_faction_bible/*.md      势力档
    ├── 07_state_board.md          世界态势板（缺口活通道）
    ├── 08_current_state.md        当前状态表（每章覆盖）
    ├── 09_current_chapter.md      章任务卡（每章覆盖，planner 权威输入）
    ├── 10_volume_outline/vol_01.md 卷纲 + _vol_NN_meta.json 指纹
    ├── 11_timeline.yaml           时间线
    ├── 12_foreshadow_db.yaml      伏笔库
    ├── 13_facts_db.yaml           不可逆事实库
    ├── 14_resource_db.yaml        资源库
    ├── 15_npc_simulation.yaml     NPC 模拟
    ├── 16_chapter_review/*.yaml   章评审
    └── _system/
        ├── manifest.json  refs.json
        ├── story_dna.yaml  style_dna.yaml  world_simulation.yaml  world_state.yaml
        ├── chapter_plans/chapter_NNNN.yaml   ← 导演/人工 YAML 计划（权威源）
        ├── character_brains/*.yaml  editor_feedback/*.yaml
        ├── snapshots/ch_NNNN/*        ← 章后快照副本
        ├── runtime/{runtime_state.json, locks/, runtime-debug/}
        ├── studio/                    ← Studio 轨产物（writer-optimization/, director/, story-memory/, story-thread/, adaptive-learning/, context-ranking/, dynamic-budget/, hash-dependency/, prompt-metrics/）
        ├── brain/
        │   ├── ch_NNNN_{plan,scenes,run}.json
        │   ├── adaptive_state.json  metrics_dashboard.json
        │   ├── critic_history.json
        │   ├── prompt-cache/ch_NNNN/{prompts/*.txt, cache_validator.json, context_diff.json, context_snapshot.json, prompt_metrics.json, relevance_stats.json, cache/{world,writing}.*}
        │   └── git/{refs.json, snapshots/snap_*/}
        └── story-map/                ← main-arc / pov-grid / milestones / plot-threads / chapter-functions / cognitive-gaps.yaml
```

---

## 3.1-3.12 谁负责什么（完整职责矩阵）

| # | 职责 | 承担者（代码） | 调用位置 |
|---|---|---|---|
| 3.1 | **故事规划（长篇架构）** | brain `story-map.js`：`deriveChapterFunction`/`resolveChapterMapContext`/`applyStoryMapToIntent`；Studio `story-map/store.js`（写 main-arc/pov-grid/milestones/plot-threads/cognitive-gaps） | orchestrator.js:11/146 |
| 3.2 | **章节规划** | brain `planner.js`：`planChapter`(:67)/`planNextChapter`(:402)/`loadAuthoredChapterPlan`(:210)/`serializeAuthoredPlanToIntent`(:288)/`applyAnchorConstraints`(:513)/`replan`(:752) | orchestrator.js:182 |
| 3.3 | **决策规划** | brain `planner/decision.js` `evaluateDecisions`（决策合理性：values/interest/resources/knowledge/relationship/risk） | orchestrator.js（_runChapter 循环内） |
| 3.4 | **冲突规划** | brain `planner/conflict.js` `evaluateConflict`（冲突类型 resource/rule/information，校验 presence/agency/direction） | orchestrator.js（同上） |
| 3.5 | **场景规划** | brain `scene/scene.js` `buildScenePlan`（给 intent.scenes 打 status/wordTarget）；Studio director `scene-execution.js` `buildSceneExecutionPlan`（beats/tensionArc/hookRotation） | orchestrator.js:259；beat-execution.js:74 |
| 3.6 | **场景编排执行** | runtime `orchestrator._runScenesAndChapter`（逐 scene：prompt→writer→pipeline→回写）；Studio 覆写版 `studio-orchestrator._runScenesAndChapter` | orchestrator.js:273；studio-orchestrator.js:112 |
| 3.7 | **正文生成（Writer）** | CLI：brain `createLlmWriter`；Studio：`createStudioLlmWriter`（逐 beat）→ 同一 `chatCompletion`→`fetch` | orchestrator.js:354；studio-llm-writer.js:162 |
| 3.8 | **Prompt 组装** | 双层：`inkos-prompt/compiler.js compileScenePrompt`（上下文种子，两路径）→ Studio 再经 `inkos-runtime/compiler/prompt-compiler.js compile()`（P0-P3 密封）→ `compile-writer-prompt.js`（Studio 专有块） | 见 07 |
| 3.9 | **上下文加载** | brain `loader.js loadBrainContext`（读全部 novel/*.md|yaml → ctx）；`entity-selector.js`（相关性裁剪） | orchestrator.js:91 |
| 3.10 | **状态维护与记忆** | runtime `MemoryUnit.commit`（正文+聚合状态+anchor+memory_hierarchy+canon 五库+09 任务卡+git snapshot/tag）+ brain `git-memory.js` + `state-updater.js`（buildStateDelta/applyStateDiffToCanon/writeNextChapterTask） | chapter-pipeline.js:302-321 |
| 3.11 | **质量检查** | brain `consistency`/`metrics`/`reader`/`critic`/`validation`/`dedup` + reader-simulator（2×LLM）+ optimizer；章级硬闸（!force 拦截）；Studio scene 级替换为 `runNonBlockingScenePipeline` | chapter-pipeline.js:36-386 |
| 3.12 | **下一步决策（续写）** | `planNextChapter`（读 anchor → authored plan 优先 → 派生）+ daemon autoNext + Studio accept 门控 | chapter-pipeline.js:316；chapter-audit.js:187 |

---

## 3.13 关键耦合关系（谁 import 谁）

```
inkos-core (CLI) ──→ inkos-runtime, inkos-brain, inkos-director
inkos-runtime ──→ inkos-brain (约14文件), inkos-director (prompt块), inkos-prompt (种子层),
                  inkos-studio-server (beat-continuity.js similarityRatio ← 反向依赖!)
inkos-brain ──→ inkos-writer (optimizer), inkos-prompt (compiler), inkos-director (部分)
inkos-studio-server ──→ inkos-runtime (子类+注入), inkos-brain (loader), inkos-director (scene-execution),
                        inkos-context-ranking/dynamic-budget/prompt-metrics/story-memory/story-thread/
                        hash-dependency/adaptive-learning/writer-optimizer
inkos-director ──→ inkos-context-ranking (自用), inkos-prompt-metrics (自用)
```

**三个需要记住的异常**：
1. **Runtime LOCKED 被打破**：`chapter-pipeline.js:11` `import { similarityRatio } from inkos-studio-server/src/writer-optimization/beat-continuity.js`（章内防复读滑窗）。即 LOCKED 的 runtime 依赖 Studio 模块。
2. **两条 writer 并存**：brain `createLlmWriter`（CLI 路径）与 studio `createStudioLlmWriter`（Studio 主路径）完全不同（见 08）。
3. **两个 prompt 编译器并存**：`inkos-prompt`（种子层，两路径）与 `inkos-runtime/compiler`（P0-P3 密封层，仅 Studio 路径）——runtime 的 compile 也从 director import 20+ format*Block。

---

## 3.14 一句话架构判断

**"Brain 是引擎库，Runtime 是编排器，Director 是 Studio 专属增强库，Studio Server 是日常生产入口 + 自研 Writer"**。核心执行链是同步函数调用链（不是事件驱动）；双轨（CLI 与 Studio）行为不对称是理解本系统的钥匙。
