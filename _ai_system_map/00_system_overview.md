# 00. 系统总览（System Overview）

> 《系统认知包》第 1 节。本文件给你一个"从上到下"的完整视图；详细证据在后续各文件。

---

## 1.1 项目身份

| 项 | 值 |
|---|---|
| **项目名** | InkOS（小说InkOS / Novel OS V4 + Brain + Runtime 2.0） |
| **定位** | AI 自动生成中文网络小说的「事件驱动小说引擎」+「Studio 可视化创作台」 |
| **核心目标** | 从「作者的一个想法」出发，自动完成 世界观→人物→卷纲→章节计划→场景→正文 的生成、校验、记忆与续写闭环，目标长篇稳定连载（单本 targetChapters 常为 200） |
| **当前版本** | root `package.json` → `2.0.0`（"Novel OS V4 + Brain + Runtime 2.0 — Event Driven AI Novel Engine"）；Runtime LOCKED 冻结版本 `2.0.0`（`packages/inkos-runtime/RUNTIME_ARCHITECTURE.md`） |
| **语言** | Node.js（ESM, `"type":"module"`, Node ≥ 20），中文输出 |
| **LLM** | **DeepSeek**（`deepseek-chat`，`https://api.deepseek.com/v1`，temp 0.55，max_tokens 4096），OpenAI-compatible 协议（`.env`） |
| **仓库形态** | npm workspaces monorepo：`packages/*`（17 个包）+ `scripts/`（73 个测试/工具）+ `tests/`（回归）+ `books/`（真实生成的书）+ `.inkos/`（schema/模板/会话） |

## 1.2 技术栈

- Node ≥ 20，ESM
- 唯一运行时依赖：`yaml`（root package.json）—— 大量 YAML 数据文件
- LLM 调用：自研 OpenAI-compatible `chatCompletion` 封装（brain `llm-writer.js`），无 SDK 依赖
- Studio 前端：React + TypeScript（`packages/inkos-studio`），通过 HTTP/SSE 连 Studio Server
- 无数据库：全部状态 = 文件系统（`novel/` 下 markdown + yaml + json + git 快照）

## 1.3 运行方式 / 主要入口

| 方式 | 命令 | 说明 |
|---|---|---|
| **全自动生成一章** | `inkos runtime run <book-dir> --chapter N [--text 正文.md]` | Runtime 2.0 完整管线（CLI 路径：Brain 规划 + Runtime 编排 + Brain writer） |
| **同义旧入口** | `inkos brain run <book-dir>`（默认） | 无 `--legacy` 时与 `runtime run` 同一条路 |
| **守护进程** | `inkos runtime daemon <book-dir>` | 监听文件变化自动跑 Pipeline（独立进程模式） |
| **Studio 服务器** | `npm run studio:server`（→ `node packages/inkos-studio-server/src/server.js`，端口 4567） | HTTP API + 前端；**这是真正的日常生产入口** |
| **手动 V4 流程（遗留）** | `inkos context` → 作者写正文 → `inkos delta` → `inkos post` → `inkos review` | 半自动"组装上下文-填表"式工作流 |
| **诊断** | `inkos doctor <book-dir> [--chapter N]` | anchor/lore/prompt/repetition/tension/cost 检查 |
| **记忆** | `inkos memory snapshot/list/diff/rollback/branch` | git 式快照 |
| **测试** | `npm test`（`scripts/test-runtime.js`）、`npm run test:*`（73 个专项） | 大量功能测试脚本 |

**CLI 入口文件**：`packages/inkos-core/src/cli.js`（407 行，命令分发器）。真正的管线在 `packages/inkos-runtime/` 与 `packages/inkos-brain/`。

## 1.4 核心目录地图（一句话版）

| 包 | 角色 | 是否核心链路 |
|---|---|---|
| `packages/inkos-core` | CLI + 手动 V4 workflows | 入口（runtime 子命令接核心链） |
| `packages/inkos-runtime` | **Runtime 2.0**：Orchestrator / Chapter-Scene Pipeline / Prompt Compiler / Memory Unit / Execution Guard / Daemon / Event Bus | ✅ 核心 |
| `packages/inkos-brain` | **引擎库**：Planner / Decision / Conflict / Scene / Writer(LLM) / Critic / Validation / Consistency / Reader / Metrics / Memory / StoryHealth / Adaptive / GitMemory | ✅ 核心（被 runtime 重度调用） |
| `packages/inkos-director` | Director 引擎库 + prompt 块库（Studio 路径激活） | ⚠️ 半核心（Studio 专属增强） |
| `packages/inkos-writer` | 写作优化规则库（被 brain llm-writer 反向 import） | 辅助 |
| `packages/inkos-prompt` | Prompt 编译器/分层/缓存（独立包） | 待定（见 07） |
| `packages/inkos-context-ranking` / `inkos-dynamic-budget` / `inkos-prompt-metrics` / `inkos-story-memory` / `inkos-story-thread` / `inkos-hash-dependency` / `inkos-adaptive-learning` / `inkos-writer-optimizer` | 各专项引擎 | ⚠️ 部分接入，部分测试专用（见 13） |
| `packages/inkos-studio-server` | **HTTP API 服务器**（含自己的 writer 与直写盘） | ✅ 日常生产入口 |
| `packages/inkos-studio` | React 前端 | UI |
| `packages/inkos-sdk` | 占位（未来 SDK） | 未实现 |
| `books/` | 真实书数据（book.json + novel/ + chapters/ + _system/） | 数据 |
| `.inkos/` | schema / 模板 / workflows / 会话 / 全局风格库 | 配置 |
| `scripts/` | 73 个测试与工具脚本 | 测试 |

## 1.5 系统到底解决什么问题

**问题域**：网络小说长篇连载（200 章级）用 LLM 自动生成时的四类崩溃：
1. **一致性崩溃**（人物/世界观/时间线漂移）
2. **规划崩溃**（章节没有目标、场景没有冲突、无伏笔回收）
3. **记忆崩溃**（下一章不知道上一章发生了什么）
4. **质量失控**（复读、水文、断章、文风漂移）

**解法骨架**（代码实证）：
- 用「规划→决策→冲突→场景→写作→校验→记忆→续写」的**多阶段管线**把单一 LLM 调用拆成多个受控小步（brain planner 产 intent，runtime 编排，writer 只写正文）
- 用「**权威 plan 优先 + 自动 replan**」保证作者意图（authored plan）不被模型覆盖
- 用「**MemoryUnit + git 快照**」做章级记忆提交与回滚
- 用「**多个 validator**」在章级拦截坏输出（硬失败闸）

**但请务必同时读 `13_dead_code_and_fake_features.md` 与 `14_architecture_problems.md`** —— 这套骨架在「CLI 路径」和「Studio 路径」上的执行强度不一致，这是理解本系统最重要的单一事实。

## 1.6 从"用户输入想法"到"生成章节"的完整过程（文字架构图）

```
作者想法 / 已有书 → Studio UI 或 CLI
        ↓
[Studio 路径] BookWizard 建书 / 卷纲 / Story DNA / 世界生成（Studio Server 直接调 LLM 写 canon）
        ↓
任务卡（novel/09_current_chapter.md）+ 上一章 anchor（planner.loadPriorChapterAnchor）
        ↓
Runtime Orchestrator._runChapter
   ├─ 有已确认 authored plan（chapter_plans/chapter_NNNN.yaml）→ serializeAuthoredPlanToIntent（作者意图优先）
   └─ 无 → Planner.planChapter（读任务卡/状态板/事实库/卷纲 → 产出 intent：主目标/阻碍/转折/结尾/场景骨架）
            → Decision.evaluateDecisions（决策引擎校验，失败 replan，≤3 次）
            → Conflict.evaluateConflict（冲突类型校验，失败 replan）
        ↓
buildScenePlan（brain scene.js：给 intent.scenes 打 status/wordTarget）
        ↓
buildDynamicPrompt + buildSceneWritePrompt（场景级 Prompt 组装）
        ↓
Writer（逐 Scene 调 LLM 写正文）
   ├─ CLI/Daemon 路径：brain createLlmWriter（单发 writer）
   └─ Studio 路径：createStudioLlmWriter（五 Beat 序列 + Writer Optimizer + 连续性状态机）
        ↓
[Studio 路径] sceneLifecycleHook('plan') → runDirectorPhase（Story→Chapter→Scene Director 软分析，只追加 prompt 不拦截）
        ↓
Scene 校验（CLI 路径：reviewScene/checkConsistency/evaluateDecisions，可重规划；Studio 路径：runNonBlockingScenePipeline，有正文即 pass）
        ↓
assembleChapter → runChapterPipeline
   ├─ checkConsistency → computeMetrics → simulateReaders（多 persona 阅读）→ runCritic（商业性）
   ├─ validateChapter（七项验收，硬闸）→ applyAdaptiveFeedback
   ├─ computeStoryHealth + saveStoryHealth
   ├─ MemoryUnit.commit（git 快照 + state-updater 写 canon + 写 09 任务卡 + 落盘正文）
   └─ planNextChapter（读上一章 anchor → 预写下一章任务/plan）
        ↓
作者在 Studio "接受"（POST /chapters/:n/accept）→ 解锁下一章 → 循环
```

## 1.7 一次生成的真实时序（详见 `02_runtime.md` 与 `11_real_execution_trace.md`）

```
用户输入
  ↓
故事理解（Story DNA / 卷纲 / 世界生成，Studio 直调 LLM）
  ↓
故事规划（StoryMap：main-arc / pov-grid / milestones / plot-threads → deriveChapterFunction）
  ↓
章节规划（Planner.planChapter / planNextChapter → intent）
  ↓
场景规划（buildScenePlan → 每 scene 的 goal/conflict/beat + [Studio] Director ExecutionPlan/beats）
  ↓
写作执行（Writer → LLM → scene.text）
  ↓
质量检查（Metrics / Reader / Critic / Validation，章级硬闸）
  ↓
状态更新（MemoryUnit.commit → 快照 + canon 更新 + 09 任务卡）
  ↓
下一章（planNextChapter / 作者 accept）
```

> 注意：图里"故事理解/故事规划"在**Studio 路径**由 Studio Server 的 `creator-intelligence.js` / `story-map/store.js` 直接调 LLM 完成；在 **CLI 路径**只有 `planner` 读既有 canon 文件，没有"故事理解"阶段。

## 1.8 一句话总结

**InkOS 是一个"规划驱动 + 写作执行 + 章级记忆"的文件系统式小说引擎**：大脑是 `inkos-brain`（意图工厂 + 校验链），骨架是 `inkos-runtime`（Orchestrator + Pipeline + MemoryUnit），增强层是 `inkos-director`（仅 Studio 路径激活），日常生产入口是 `inkos-studio-server`（HTTP + 自己的 writer），存储是 `novel/` 下的 markdown/yaml/json + git 快照。

> ✅ 七个分析 agent（runtime/brain/director/prompt/LLM/writer-memory/studio-server/真实书产物）已全部返回并校准。细节见 `01`-`15` 各文件。
