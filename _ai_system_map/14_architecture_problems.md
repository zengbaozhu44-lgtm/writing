# 14. 能力评级 + Top 10 架构问题 + 最大优势 + 生成哲学

> 《系统认知包》第 24-27 节。每项评分附带代码证据（agent-A-G 交叉验证）。

---

## 24.1 能力评级表（0-5 分，全部有证据）

| # | 能力 | 评分 | 关键证据 |
|---|---|---|---|
| 1 | **长篇故事规划（StoryMap）** | 4 | story-map.js 6 文件 + applyStoryMapToIntent 注入 intent；但 CLI 路径不跑 story-map（仅 orchestrator:146），Studio 是主消费者 |
| 2 | **章节规划** | 4 | planChapter/planNextChapter + authored plan 优先 + applyAnchorConstraints 跨章注入；免检分支弱化决策/冲突校验 |
| 3 | **场景规划** | 3.5 | buildScenePlan（基础）+ director ExecutionPlan（Studio 富化）；CLI 只有基础 scene，无 beats/tensionArc |
| 4 | **正文生成（LLM 写手）** | 4 | Studio 逐 beat + 连续性状态机 + Optimizer（生产主路径）；CLI 单发弱；真实书可读性尚可 |
| 5 | **一致性（人物/世界观/时间线）** | 3 | checkConsistency 章级硬拦 + facts_db/timeline 追加 + anchor banned_elements；无语义实体对齐，靠正则/启发式 |
| 6 | **因果链（Cause/Effect）** | 2.5 | writer-runtime-v2 拍内启发式正则 + lastEvent 注入；跨场景/章零持久化；Brain 路径完全缺席 |
| 7 | **伏笔/缺口管理** | 3.5 | cognitive-gaps.yaml（P0 已修）+ 协议渲染器前缀 + 07_state_board 活通道；但 12_foreshadow_db 长期只写不读的历史遗留 |
| 8 | **记忆（跨章）** | 3.5 | anchor + MemoryUnit.commit + git 快照；memory_hierarchy/story-memory/adaptive 只 Studio 读，CLI 写而不读 |
| 9 | **质量校验** | 3 | 章级八项 + reader-simulator(2×LLM) + optimizer + critic 硬拦；scene 级 Studio 全替换为 non-blocking；生产伪 AB 已删（Phase 1）；replanIntent 为有界真重入 |
| 10 | **防复读** | 4 | SCENE_HARD_FAIL（≥7字）+ beat-continuity 滑窗 + forbidden_openings + banned_elements；多层，Studio 路径生效 |
| 11 | **自适应调优** | 3 | adaptive_state 权重 + adaptive-learning（仅 Studio）；CLI 只写不读；效果未闭环验证 |
| 12 | **作者意图表达（Authored plan）** | 4.5 | chapter_plans/yaml 权威源 + serializeAuthoredPlanToIntent + IRP 前缀 + 预览抽屉 commit；白名单字段全保留 |
| 13 | **可回滚/崩溃恢复** | 4 | git-memory snapshots/rollback + recoverFailedChapter + task ledger sweepStaleTasks；锁文件留存 |
| 14 | **可观测性（trace/metrics/日志）** | 4 | 每章 run.json + metrics_dashboard + critic_history + prompt_metrics + runtime_state + events.log + SSE |
| 15 | **并发/执行安全** | 4 | ExecutionGuard（task/lock/超时/单调闸/状态落盘）；但 chapterFinished 早发存在重入隐患 |
| 16 | **扩展性（新引擎接入）** | 2 | monorepo 17 包但依赖大量越权相对导入；无包边界；新包大多只被 Studio 接线，CLI 是孤岛 |
| 17 | **文档-实现一致性** | 1.5 | RUNTIME_ARCHITECTURE.md 声称事件驱动/pipeline/SSOT 大量与实际不符（见 §25） |
| 18 | **生产主路径稳定性** | 3 | 双轨不对称导致"同一接口两种行为"；Studio 直写盘绕过 Runtime；真实书只到 5 章，长篇 200 章压力未验证 |

## 24.2 加权结论

- **最强**：作者意图表达（4.5）、防复读（4）、可回滚（4）、可观测性（4）、执行安全（4）
- **最弱**：文档一致性（1.5）、扩展性（2）、因果链（2.5）
- **主路径（Studio）**明显强于 CLI 路径；CLI 的"全自动闭环"只兑现了一半（记忆/自适应/因果在 CLI 都不工作）。

---

## 25.1 Top 10 架构问题（问题→证据→影响→严重程度→是否需改架构）

### #1 Runtime 与 Studio 双轨不对称（记忆链断裂）
- **问题**：同一 `runChapter` 入口，CLI/Daemon 用 brain writer + 全量 commit；Studio 用 Studio writer + deferCommit 审计门控 + non-blocking scene。
- **证据**：`routes.js:151-154` 注入 Studio writer/orchestrator；`studio-orchestrator.js:253` runNonBlockingScenePipeline；`brain/llm-writer.js` vs `studio-llm-writer.js` 完全不同。
- **影响**：同一本书在两种方式下生成质量、记忆、校验行为都不同；CLI 测试不能代表生产（Studio）行为。
- **严重程度**：★★★☆☆ 高
- **需改架构**：否（已是双入口设计），但**必须明确"Studio 路径= 生产规范"**，文档统一。

### #2 "Runtime LOCKED / SSOT" 声明被打破
- **问题**：LOCKED runtime 反向 import Studio（相似度函数）；Studio 子类覆写 runtime 核心行为；Studio 大量直写 novel/ 业务文件。
- **证据**：`chapter-pipeline.js:11` import `similarityRatio` from studio beat-continuity；`studio-orchestrator.js:112 extends`；`system-store.js:63`/`module-service.js:135`/`chapter-service.js:119`/`brain-context-sync.js:270` 直写。
- **影响**：单向依赖铁律失效；无法单独演进 runtime。
- **严重程度**：★★★☆☆ 高
- **需改架构**：否（已是既成事实），但**需重构依赖注入**：把相似度函数移回 runtime 或声明依赖。

### #3 事件驱动名不符实
- **问题**：`RUNTIME_ARCHITECTURE.md` 声称 Event-driven + Dispatcher/Scheduler/Trigger；实际核心链是同步函数调用，事件只做通知/SSE/guard 状态机。
- **证据**：`event-bus.js` 仅 emit/on；`dispatcher.js` 仅 daemon start() 接线；生产主流程 runViaDaemon 不接线；14 种事件全为通知型。
- **影响**：重入风险（chapterFinished 早发）、无法异步编排、SSE 依赖手工 emit。
- **严重程度**：★★☆☆☆ 中
- **需改架构**：否（同步链当前工作正常），但文档必须改。

### #4 双 Prompt 编译器并存，且"统一编译器"只服务 Studio
- **问题**：`inkos-prompt/compiler.js`（种子层，两路径）与 `inkos-runtime/compiler/prompt-compiler.js`（P0-P3 密封，仅 Studio）。
- **证据**：compile-writer-prompt.js:155 调 compile；brain llm-writer 不调 runtime compile。
- **影响**：CLI 与 Studio 的 prompt 完全不同 → 质量差异 + 缓存不共享。
- **严重程度**：★★☆☆☆ 中
- **需改架构**：建议（统一入口，P0-P3 应用到两路径）。

### #5 Memory 分层"写而不读"
- **问题**：memory_hierarchy/story-memory/story-thread/adaptive-learning/decision_history/conflict_history/scene_history 在 CLI 路径全部写而不读。
- **证据**：agent-E 黑名单（memory.js:93/110/129 只追加；formatHierarchyContext 仅 Studio；story-memory 仅 studio-llm-writer:274）。
- **影响**：CLI 路径的记忆投入浪费；两路径记忆深度不一致。
- **严重程度**：★★☆☆☆ 中
- **需改架构**：否（Studio 已激活），CLI 可选择性接入。

### #6 Scene 级校验在 Studio 被永久关闭
- **问题**：runScenePipeline（review/consistency/decision，可 replan）被 runNonBlockingScenePipeline 替换（有正文即 pass）。
- **证据**：studio-orchestrator.js:253-280；scene-lifecycle-bridge 把 story-thread shouldReplan 降级为 adaptive hint。
- **影响**：坏场景直接进入章级，靠章级硬闸兜底 + 作者 accept 门控；但无 scene 级 replan 会放大坏稿。
- **严重程度**：★★★☆☆ 高（质量兜底下移）
- **需改架构**：否（有意识设计），但应保留"硬失败闸"（SCENE_HARD_FAIL 已在）。

### #7 AB test / replan —— 已收敛（Phase 1）
- **现状（已修正）**：生产伪 AB 调用块（原 chapter-pipeline.js:198-207）**已删**；chapter 级 replanIntent 为**真**（orchestrator.js:336 `_resolveChapterResult` 有界重入 `_runChapter`，≤maxReplan=3，预算打满置 replanExhausted）。
- **残留的"假"**：story-thread `shouldReplan/replanReason` 降级为 adaptive hint（见 #6）；`ab-test.js` 基础设施保留给测试/诊断（diagnosis-service `loadAbReport`）。
- **影响**：原"伪信号污染决策"已消除；仅诊断 UI 可读历史 AB 报告。
- **严重程度**：★☆☆☆☆ 已收敛
- **需改架构**：否，Phase 1 已处理。

### #8 因果（Cause/Effect）跨场景/跨章断裂
- **问题**：lastEvent 只存在拍内 runtime session，每场景重建；continuity 不存 lastEvent。
- **证据**：beat-execution.js:567（每场景新 session）；studio-llm-writer.js:461-464（saveChapterContinuity 只存 body state）。
- **影响**：跨场景因果只能靠 tailExcerpt/身体状态间接延续；长线因果弱。
- **严重程度**：★★☆☆☆ 中
- **需改架构**：建议（lastEvent 持久化到 anchor/continuity）。

### #9 依赖边界混乱（越权相对导入 + 未声明依赖）
- **问题**：runtime→director/studio 未声明依赖；包间用源码相对路径。
- **证据**：prompt-compiler.js:15-41、scene-pipeline.js:22、doctor.js:12、chapter-pipeline.js:11、compile-writer-prompt.js:27。
- **影响**：包边界形同虚设；重命名/升级某包会静默炸整链；扩展性评级 2。
- **严重程度**：★★☆☆☆ 中
- **需改架构**：建议（声明依赖 + 收敛相对路径）。

### #10 文档与实现系统性偏差
- **问题**：AGENTS.md/RUNTIME_ARCHITECTURE.md 声称的 pipeline/事件/SSOT/统一编译器均与实际不符；两代 writer 落盘（ch_0001~0003 旧命名 vs ch_0004+ 悬念标题）说明迁移无文档。
- **证据**：见 13 的 G 表 + 11 的真实书代差。
- **影响**：新加入者（包括 AI）按文档会得出错误判断；本认知包即为此而生。
- **严重程度**：★★☆☆☆ 中
- **需改架构**：否，改文档。

---

## 26.1 最大优势（按证据排序）

1. **作者意图第一**：Authored plan 优先级 + IRP 前缀 + 预览抽屉 commit 闭环（plan 一旦确认，模型不能覆盖）——这是长篇可控性的基石。
2. **多层防复读**：SCENE_HARD_FAIL + 滑窗相似度 + forbidden_openings + banned_elements + 硬失败有界 replan——针对网文最大痛点。
3. **跨章记忆锚**：anchor（closing_emotion/forbidden_openings/tailExcerpt/voiceDna/banned_elements）是轻量但有效的续写约束。
4. **全量可观测**：每章 run.json + metrics + critic + prompt_metrics + git 快照 + runtime_state——生产诊断能力完整。
5. **崩溃可恢复**：ExecutionGuard + git-memory 回滚 + task ledger 回收残留任务。
6. **Studio 闭环设计**：从建书→设定→故事地图→章计划→生成→审计→接受的完整 IDE 工作流，把"人工介入点"放在最有效的位置（计划确认 + accept）。

## 26.2 生成哲学（系统隐含的写作观）

1. **"计划驱动而非自由创作"**：writer 收到的不是"写一段故事"，而是"执行这份 7 元素执行计划"（beat-slimmer 的强约束）。系统相信：给 LLM 越具体的结构性任务，长篇越稳。
2. **"质量靠闸门而非靠单次生成"**：宁可多调几次 LLM（reader-sim/optimizer/polish）也不依赖一次完美输出；但 Scene 级把闸门放宽（分析不拦截），把硬拦截放在章级 + 人工 accept。
3. **"记忆是约束不是知识库"**：跨章只传递 anchor（情绪/禁忌/尾文/文风），不把整本设定塞进去——用"遗忘"保上下文窗口与一致性。
4. **"双轨并存是历史惯性"**：CLI 是"纯自动理想"（但记忆断裂），Studio 是"人工在环务实"（更好用）。哲学上系统偏爱 Studio 的"作者确认"循环。

---

## 27 一句话总结（评级与问题）

**InkOS 的架构核心是"规划驱动 + 章级记忆 + 多层防复读 + 作者意图优先"**，在 Studio 生产路径上这是一套能工作的网文长篇生成器（能力中上）；但它同时背负：双轨不对称、伪特性收敛（生产伪 AB 已删、replanIntent 有界真、story-thread shouldReplan 降级、事件驱动名不副实）、Memory 写而不读、依赖边界混乱、文档系统性失真五座山。**接手的 AI 应默认"Studio 路径 = 真相"，并把 CLI 路径视为残缺分支而非规范**。
