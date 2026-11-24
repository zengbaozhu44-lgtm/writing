# 15. AI 接管手册（AI Handover）+ 系统核心认知图

> 《系统认知包》第 28 节。目的：让另一个 AI（无代码访问）能接管本系统的评审/设计/扩展/问题定位。
> 全部内容为前面 14 个文件的可执行浓缩。

---

## 28.1 一句话定位

**InkOS = "规划驱动 + 章级记忆 + 多层防复读 + 作者意图优先"的文件系统式中文网文生成引擎**。生产主路径是 **Studio（IDE + Studio Server + 自研 Writer）**；CLI/Daemon 是残缺的平行路径。

## 28.2 三条必须记住的第一性事实（错误理解会全盘皆错）

1. **双轨不对称是系统 DNA**：`inkos brain run`/`inkos runtime run`/CLI daemon 走 **RuntimeOrchestrator + brain writer**（单发、全量 commit、记忆层级/因果/自适应全部不工作）；**Studio 是生产规范**（StudioRuntimeOrchestrator + 逐 beat Studio writer + deferCommit 审计门控 + 记忆全链路 + 作者 accept）。评估质量/修复问题请以 Studio 路径为基准。
2. **唯一 LLM 入口**：一切正文/校验/生成调用最终汇到 `packages/inkos-brain/src/writer/llm-writer.js:143 fetch()`（`chatCompletion` 包装，OpenAI 兼容 DeepSeek）。想 hook LLM，只改这一处 + 各 writer 的调用参数。
3. **"事件驱动"是名不符实的**：核心链是同步函数调用；Event Bus 只做通知/SSE/guard 状态机。别按"事件架构"去扩展。

## 28.3 接管清单（按任务类型）

### A. 我要"继续写一本小说/生成下一章"
```
作者在 Studio 点"生成下一章"（POST /runtime/run-living 或 /runtime/next）
 → living-task.js → task-manager 异步 → runtime-control.runViaDaemon
 → daemon.runChapter → StudioRuntimeOrchestrator._runChapter
 → [authored plan 存在] chapter_plans/chapter_NNNN.yaml → serializeAuthoredPlanToIntent（作者意图免检）
 → [否则] planner.planChapter → evaluateDecisions → evaluateConflict（≤3 replan）
 → buildScenePlan → 逐 scene：
      buildDynamicPrompt → buildSceneWritePrompt → sceneLifecycleHook('plan')（director 软分析）
      → createStudioLlmWriter 逐 beat 写正文（P0-P3 prompt → chatCompletion）
      → runNonBlockingScenePipeline（有正文即 pass）
 → assembleChapter → runChapterPipeline（deferCommit=true）
 → pending_commit + writeChapterOnly → SSE"待审计"
 → 作者 POST /chapters/:n/accept → MemoryUnit.commit + planNextChapter + 解锁下一章
```
**要改的产出物优先级**：`chapter_plans/chapter_NNNN.yaml`（改意图最有效）> `novel/09_current_chapter.md` > 各 canon 模块 > `story-map/*.yaml`。

### B. 我要"诊断为什么这章崩了"
```
1. 看 brain/ch_XXXX_run.json（pass/metrics/reader/critic/validation）——最权威运行记录
2. 看 brain/ch_XXXX_plan.json 的 decisionResult/conflictResult/replanCount —— 规划是否被拒
3. 看 runtime/runtime_state.json + runtime-debug/events.log —— guard 状态/崩溃
4. 看 prompt-cache/ch_XXXX/prompts/*.txt —— 模型实际看到的 prompt
5. 看 _system/studio/prompt-metrics + writer-optimization —— beat 级信息
6. 已知崩溃模式：
   - 坏 pov（chapter_plans 的 pov 非角色名）→ loader 已按角色档过滤 null（记忆: inkos-bad-pov）
   - 空 chapterTask → 模板 plan → beat 全同（记忆: ch7-fragment）
   - 无正文待审计章无接受入口 → resolveNextWritable 跳过锁定章 + hasPending 接受入口（记忆: chapter-audit-unlock）
   - 防复读/身体禁令 → SCENE_HARD_FAIL → 有界 replan（记忆: hardfail-gate）
   - scene 级拒绝 → 直接看 studio-orchestrator.js:19 MAX_SCENE_HARD_FAIL_REPLAN=2
```

### C. 我要"改质量 / 换 LLM"
- 换模型：`.env` 的 LLM_MODEL/LLM_TEMPERATURE/LLM_MAX_TOKENS（DeepSeek/GLM OpenAI 兼容）
- 换正文策略：Studio 改 `writer-optimization/beat-slimmer.js`（7 元素块）与 `studio-llm-writer.js`；CLI 改 `brain/writer/llm-writer.js`
- 改 prompt：种子层 `inkos-prompt/compiler.js compileScenePrompt`；密封层 `inkos-runtime/compiler/prompt-compiler.js compile()`（仅 Studio）；Studio 专有块 `compile-writer-prompt.js`
- **改了源码必须重启 Studio server**（无 watch，不重启不生效 —— 记忆: inkos-server-restart-required）

### D. 我要"加一个引擎 / 新能力"
- 建议走 Studio 轨道（scene-lifecycle-bridge 是现成挂点：'plan'|'reviewed'|'memorized' 三阶段回调，可追加分析并回灌 prompt/落盘）
- 别碰 `packages/inkos-runtime/`（LOCKED 语义）；如需它 import 你的模块，注意现有越权相对路径模式，但最好改声明依赖
- 新能力要进模型，必须渲染进 goal/scenes 文本或 P0-P3 块——**零代码进模型的字段会被丢弃**（记忆: authored-plan-serializer）

### E. 我要"评审这套系统"
- 直接读 `14_architecture_problems.md`（Top10 全有证据）
- 五大历史坑：双轨不对称 / 伪特性收敛（生产伪 AB 已删、replanIntent 有界真、story-thread shouldReplan 降级、事件驱动名不副实）/ Memory 写而不读 / 依赖越权 / 文档失真
- 评级基准：作者意图表达 4.5、防复读 4、回滚 4、可观测 4、执行安全 4；文档一致性 1.5、扩展性 2、因果链 2.5

## 28.4 系统核心认知图（纯文本）

```
                        ┌──────────────────────────────┐
                        │  inkos-core / cli.js          │
                        │  runtime run = brain run      │
                        └──────────────┬───────────────┘
                                       │
      ┌────────────────────────────────▼──────────────────────────────┐
      │  inkos-runtime  Orchestrator（编排器，非决策者）               │
      │  _runChapter ─ plan → scenes → writer → chapter-pipeline      │
      │  [LOCKED 声明，但被 Studio 子类覆写 + 反向 import]              │
      └───────┬──────────────┬──────────────┬───────────────┬────────┘
              │ import       │ import       │ import        │ import(越权)
      ┌───────▼───────┐ ┌────▼───────┐ ┌─────▼──────┐ ┌─────▼──────┐
      │ inkos-brain    │ │ inkos-prompt│ │ inkos-director│ │ studio-server│
      │ 引擎库:        │ │ 种子层      │ │ Studio 富化层 │ │ 生产入口+Writer│
      │ planner/decision│ │ compileScene │ │ runDirectorPhase│ routes.js:151 │
      │ conflict/story-map│ │ Prompt(两路径)│ │ scene-execution │ 注入 createStudio│
      │ scene/loader    │ │ 缓存/分层   │ │ 20+ format*Block│ LlmWriter + 子类 │
      │ writer/llm-writer│ │             │ │ (重引擎仅Studio)│ orchestrator │
      │ critic/validation│ │             │ │               │ 直写 novel/    │
      │ memory/git-memory│ │             │ │               │ 逐beat writer   │
      └────────────────┘ └────────────┘ └───────────────┘ └──────────────┘
          │ chatCompletion/fetch (唯一LLM)          ▲ sceneLifecycleHook
          ▼                                          │ 'plan'|'reviewed'|'memorized'
      ┌──────────────────────────────────────────────┴──────────────┐
      │  文件系统 = 唯一数据源（novel/ + chapters/ + _system/ + git） │
      │  计划: chapter_plans/*.yaml (权威) > 09任务卡 > planner派生    │
      │  状态: 08_current_state / 07_state_board / canon 五库          │
      │  记忆: states/ch_*_anchor.yaml (跨章) + brain/ch_*_plan.json   │
      │        + git-memory snapshots (回滚) + adaptive_state.json     │
      │  质量: metrics_dashboard / critic_history / run.json           │
      │  触发: ExecutionGuard (task/lock/超时) + daemon(文件监听)       │
      └──────────────────────────────────────────────────────────────┘
```

### 关键状态机的"真/假"表
| 概念 | 真 | 假 |
|---|---|---|
| 规划链 Planner→Decision→Conflict | ✅ 无 authored plan 时 | 有 authored plan 时被短路 |
| 章级校验 8 项硬拦 | ✅ | force 可绕过；replanIntent 为有界真重入（≤3）；story-thread shouldReplan 降级为 adaptive hint |
| Scene 级校验 | CLI ✅ | Studio 替换为 non-blocking |
| 事件驱动 | 通知/SSE | 同步调用为主 |
| Memory 全链路 | Studio ✅ | CLI 只剩 anchor+canon+续写 |
| Cause/Effect | 拍内启发式 ✅ | 跨场景/章零持久化 |
| AB test | 生产入口已删（Phase 1） | ab-test.js 基础设施保留（report/load，诊断 UI 用） |

## 28.5 给接手的 AI 的 5 条纪律

1. **别信 README/注释**，信 `file:line` 的 import/调用证据（本认知包已替你做）。
2. **默认 Studio 路径 = 生产真相**；CLI 路径的一切"宣称能力"先验证再引用。
3. **改动源码后重启 Studio server**；改动 plan/canon 后重跑章节。
4. **进模型的字段必须渲染进 goal/scenes/P0-P3 文本**，别指望 serializer 带过去。
5. **遇到"看起来是 bug"先查是否双轨差异**（同一逻辑两条路径行为不同，常常不是 bug 而是设计）。

## 28.6 本认知包文件索引

| 文件 | 内容 |
|---|---|
| `00_system_overview.md` | 第 1 节：身份/技术栈/入口/端到端流程 |
| `01_architecture.md` | 第 2、3 节：完整目录地图 + 职责矩阵 |
| `02_runtime.md` | 第 3、4 节：执行链/入口/时序/产物 |
| `03_data_model.md` | 第 5 节：novel/ 数据模型 |
| `04_story_state.md` | 第 6 节：StoryState/WorldState |
| `05_directors.md` | 第 7、8 节：Directors + Planner/Decision/Conflict |
| `06_pipeline.md` | 第 9、10 节：Scene/Beat + Cause/Effect |
| `07_prompt_llm.md` | 第 11、12 节：Prompt 双编译器 + LLM 链 |
| `08_writer.md` | 第 13、14 节：双 Writer + 写作风格 |
| `09_validation.md` | 第 15、16 节：质量链路 |
| `10_memory.md` | 第 19 节：Memory 系统 |
| `11_real_execution_trace.md` | 第 4、20、21 节：真实 trace + 生命周期 + 数据流 |
| `12_dependency_graph.md` | 第 22 节：依赖图 |
| `13_dead_code_and_fake_features.md` | 第 23 节：死代码/假功能 |
| `14_architecture_problems.md` | 第 24-27 节：评级/问题/优势/哲学 |
| `15_ai_handover.md` | 第 28 节：本文件 |
| `16_phase2_ownership.md` | Phase 2 责任收敛：现状 Ownership Map + 目标 Authority 表 + 2.x 执行顺序（草稿） |
| `17_phase2_recoveryintent_contract.md` | Phase 2.2 RecoveryIntent Contract：五问 + 枚举白名单 + 字段映射 + 禁止行为 + ≠Replan（✅ 已通过） |
| `18_phase2_world_truth_quality_gate.md` | Phase 2.3 World Truth & Quality Gate Contract（✅ 已通过 = 权力地图）：判据强度≠阻断权限 + 三轨（World Truth / Story Progress / Soft Review）+ D1-D3 拍板 |
| `19_phase2_chapter_intent.md` | Phase 2.4 Chapter Intent Contract（✅ 已通过）：恢复语义非新增结构 + Minimum Contract 四问（goal/conflict/turningPoint/irreversibleChange）+ D4-D6 拍板 |
| `20_phase2_beat_contract.md` | Phase 2.5 Beat Contract（✅ 已通过）：最终 Beat Contract（position/beforeState/action/afterState/change）+ change=After−Before 第一原则 + 禁止文学 score 字段 + D7/D8/D9 + Phase 2 总原则（职责边界污染） |
| `21_phase2_state_board.md` | Phase 2.6 State Board 分层契约（✅ 已通过）：状态最小模型（Continuity Anchors/Writing Identity/Scene Memory）+ 分界线判据 + 连续性保护清单 + D10-D13 + 总原则（状态=未来故事分叉的最小事实集合） |
| `22_phase2_prompt_compiler.md` | Phase 2.7 Prompt Compiler 减法审计（✅ 已通过 = 语义所有权收敛）：三层 prompt 架构 + 语义重叠地图 + 总原则（唯一 owner，多模块只能消费不能重新定义）+ D14-D18 + 收敛方向 pipeline（Canon→…→Truth Gate） |
| `23_phase2_state_drive.md` | Phase 2.8 State Board 驱动 vs 装饰审计（✅ 已通过 = 单向数据流铁律）：Story State 定义（只有改变未来故事选择空间的状态才是 Story State）+ 三机制（一值多槽/派生链膨胀/纯装饰）+ D19-D23 + 单向数据流 + Phase 2 主线 ASCII（Canon→…→Gates→Recovery）+ InkOS 定义（故事驱动引擎） |
| `24_phase2_horizontal_ownership.md` | Phase 2.9 横向单向 Ownership 审计（✅ 已通过 = 作者散文层+渲染栈+状态环）：三发现（方向单向成立/Character→Chapter 边不存在/Chapter→Scene 字符串盖章）+ D24-D26 + Phase 2 红线（缺失的边不是缺陷，先过五问）+ 三层图定稿 + 最值得保留的一句话（作者层多源/执行层单向/状态环只向未来） |
| `25_phase2_negative_space.md` | Phase 2.10 Negative-Space Audit（✅ 已通过 = Phase 2 收口闸）：最小故事内核（Canon/Character/Chapter/Scene/Beat/State/Gate + 概念→能力映射）+ D27-D29 + Architecture Freeze 铁律 + 单图（Prompt/Planner/Director/Metrics 不在核心架构）+ Phase 3 Core Reduction 启动（P3.1-P3.5）+ Phase 3 KPI（One Story Truth→One Owner→Projection→Writer） |
| `26_phase3_cleanup.md` | **Phase 3 执行台账**：P3.1 Core State Cleanup ✅ CLOSED（7 目标删除 + 写端/导出端清理 + 负向删除证明 + Content Contribution Test 语言升级 + FOLLOW-UP A golden determinism / FOLLOW-UP B 05/06 loader 防御接口）+ P3.2 Redundant State Slots ⬜ NEXT（用户重定义：一个事实五个名字审计范围）+ Phase 3 进度 |
