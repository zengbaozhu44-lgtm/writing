# InkOS 反馈收敛架构 v0.1（Feedback Convergence Architecture）

> 状态：设计草案 v0.1 · 2026-08-17 · **只读调研产出，不含代码改动**
> 定位：Phase 2 第一份设计文档 —— **Retry Ownership + Feedback Contract**。
> 依据：三份代码级调研报告（Retry 架构 / 八条反馈链 / 双 Writer 路径），全部行号实测于当前工作区。
> 目标：把八条反馈链下面的共同基础设施抽出来，先修骨架，不增加第九条链。

---

## 0. 一句话

InkOS 不是缺少反馈系统——它已经有 Metrics / Validation / Reader / Critic / Consistency / Dedup / Adaptive / Beat Review 八套机制。
真正的问题是：**反馈系统已经超过了它的反馈基础设施。** 各链信号各自产生、各自传输、各自喂给 replan，途中普遍丢字段；
重试权限被 orchestrator 与 daemon 两个控制器分持；两条 Writer 路径维护两套 prompt 组装与两套 feedback reader。

本文定下四条设计决策，让系统收敛到：

```
                    ┌─ Metrics ─┐
                    ├─ Validation
                    ├─ Reader ───┤
                    ├─ Critic ───┤
                    ├─ Consistency┤
                    ├─ Dedup ────┤
                    ├─ Adaptive ─┤
                    └─ Beat Review┘
                              │
                              ▼
                     Feedback Normalizer
                              │
                              ▼
                    Feedback Contract
                    ┌──────────┴──────────┐
                    ▼                     ▼
            Replan Intent           Adaptive State
                    │                     │
                    ▼                     ▼
            Retry Controller        Prompt Compiler
              （唯一 owner）             （唯一 sealer）
                    │                     │
                    └─────────┬───────────┘
                              ▼
                        Next Execution
```

---

## 1. 调研结论：审计判定的代码级验证（Step 1 只读调研）

### 1.1 Retry 架构 —— 判定成立，有一处重要修正

**审计判断：重试控制权分裂，maxReplan 只是单次调用预算。成立。** 代码里实际是**三层**控制器：

| 层 | 载体 | 位置 | 预算 |
|---|---|---|---|
| 内层（有界 replan） | `orchestrator._runChapter` | `orchestrator.js:109-328` | `execCtx` + `maxReplan`（默认 3，`orchestrator.js:39` / `config.js:60`） |
| 外层（无界重试） | `daemon._guardedChapterRun` | `daemon.js:113-124` → `:115` 再调 `runtime.runChapter` | **无**，每次获得全新 `execCtx` |
| 稳定层 | `execution-guard` | `execution-guard.js` | 不参与 retry，只做锁/abort/事件过滤 |

**execCtx 单次性确认**（`orchestrator.js:121-123`）：

```js
const execCtx = options._execCtx
  || { attempt: 1, chapterReplanCount: 0, sceneReplanCount: 0, sceneHardFailCount: 0, reasons: [] };
```

daemon 重触发时只传 `{ chapter, ...options }`（`daemon.js:115`），永不携带 `_execCtx` → 每次外层重跑都拿到全新 execCtx → **replan 预算清零**。全仓无持久化预算计数（`runtime_state.json` 只记 status/lastFailure，`daemon.js:342-345`）。`config.js:59` 的 `maxSceneRetries` 是**死配置**（定义后零消费）。

**最危险点确认 —— 同一次拒绝被两个控制器消费**（`chapter-pipeline.js:112-124`，validation 分支）：

```js
if (!validation.pass && !payload.force) {
  await bus.emit('validationRejected', { bookDir, chapter, validation });   // → daemon 外层重试
  const newIntent = replan(ctx, [{ type: 'validation', attempt: intent.attempt }]);
  return { pass: false, validation, replanIntent: newIntent, ... };          // → orchestrator 内层 replan
}
```

`validationRejected` 喂给 daemon（外层整章重跑），`replanIntent` 喂给 orchestrator（内层有界重入，`orchestrator.js:336-379`）——**同一次失败同时走上两条重试路径**。sceneRejected / criticRejected / metricsLow 的 daemon handler 同理会 `_guardedChapterRun` 整章重跑（`daemon.js:251-257, 287-293, 279-285`）。

**重要修正（审计未覆盖）**：Studio 下 daemon 自动重试已被 `applyDaemonExecutionGuard` 屏蔽（`execution-guard.js:600-619`，block `onSceneRejected/onSceneReviewFailed/onCriticRejected/onValidationRejected/onMetricsLow`，`routes.js:160` 装配）。所以双控制器并行只发生在 **CLI/daemon 模式**；Studio 已是「orchestrator 唯一 owner + 显式 controlRetry/controlReplan」。**P0-1 的本质是把 CLI 模式对齐到 Studio 已证明的单 owner 模型。**

**额外发现 1 —— 旁路直跑质检**：`daemon._onChapterFinished` 在 plan 文件已存在时**直接调 `runChapterPipeline`**（`daemon.js:216`），绕过 orchestrator 的预算与重入逻辑，且与 orchestrator 内 `_runScenesAndChapter` 调用的同一质检存在双 commit 风险（与 memory 中「chapterFinished 移到 saveBrainRun 后防 daemon 双 commit」一致）。

**额外发现 2 —— 事件集没有 `chapterRejected`**：真实事件是 `chapterReviewFailed`，daemon 只 `_saveState` 不重试（`daemon.js:259-262`）。审计报告里描述的 `chapterRejected` 概念需要在设计里换成真实事件名。

### 1.2 八条反馈链 —— 判定基本成立，四处精修

统一抽象检查：**不存在 `FeedbackSignal` / `normalizeFeedback` / `buildReplanIntent`**（grep 零命中）。唯一共同入口是 `replan(ctx, reasons)`（`planner.js:752-776`），但它只读 `type / suggestObstacle / suggestGoal`，各链传进去的形态不一致，定向字段普遍丢失：

| 链 | 信号产生 | 传输 | 是否进 replan | 丢失/断点 |
|---|---|---|---|---|
| Metrics | `computeMetrics`（`metrics.js:6-41`）；`plannerHint` 产生于 `metrics.js:137,169` | dashboard → `analyzeMetricsFeedback` → `replan()` | 是（走 `suggestObstacle/suggestGoal`） | **`plannerHint` 是孤儿字段：两个写位点，零读位点**；`chapter-pipeline.js:59-77` 映射进 replan 时只带 obstacle/goal，plannerHint 被丢弃 |
| Validation | `validateChapter` 8 项（`validation.js:6-30`，不是 7 项）；失败返回 `failures[]` 维度名 | `chapter-pipeline.js:112-124` | 是（generic replan） | **replan 只收到 `{type:'validation',attempt}`，`failures[]` 维度被丢弃** —— 不是按失败维度定向重规划 |
| Reader | 两个 reader：brain 启发式（`reader.js:10-28`，观测→critic/adaptive）+ runtime LLM 追读（`reader-simulator.js:37-126`） | softFail → optimizer 局部润色（`chapter-pipeline.js:156-171`），不进 replan | 否 | 属于**软反馈链**，不是坏链 |
| Critic | `runCritic`（`critic.js:4-43`）返回 `{pass, plannerHints[], issues[]}` | 失败即 `return {pass:false}` 硬停（`chapter-pipeline.js:88-96`） | **否（硬停）** | **`critic.plannerHints` 消费是死分支**：只在 `adaptive.js:46-51`，而 adaptive 只在 critic 通过（`overall>=62`）后被调用 |
| Consistency | 7 类（`consistency.js:10-18`），失败 `{dimension, reason}` 平铺 | 章级：硬停无 replan（`chapter-pipeline.js:46-52`）；场景级：analysis-only → `recordAdaptiveHint` 写 hints.json（`scene-pipeline.js:17-41,58-71`） | 章级否 | **无 recoverable/non-recoverable 分级**；章/场景两层语义割裂最明显 |
| Dedup | 两层语义相反：章级 `runDedupReview` soft（`chapter-pipeline.js:98-110,412-437`，`hardBlock:false`）；Beat 级 hard gate（`beat-execution.js:311-352`） | 章级→log+事件；Beat 级→rewriteHint/硬失败 | 章级否 | 符合审计「观测链，别伪装成反馈链」的判断 |
| Adaptive | **三套互相独立的系统**：A) brain 规划权重 `adaptive_state.json`（`adaptive.js:17-27`）；B) `inkos-adaptive-learning` prompt 预算 `state.json`；C) director 覆盖层 `hints.json + director_overrides.json`（`adaptive-planner.js:43-83`） | — | — | **authored plan 绕过 A**（`planner.js:377` `adaptiveWeights:null`、authored 分支 `planner.js:425-469` 不调 `applyWeightsToIntent`）**但不绕过 B/C**（`compile-writer-prompt.js:86-88` 仍读） |
| Beat Review | `buildHardFailCorrection`（`studio-orchestrator.js:30-44`）+ hard/soft 分类（`beat-execution.js:458-466`） | correction 字符串经 `scene._hardFailCorrection` 注入重写 prompt（`beat-slimmer.js:725-727`） | 是（场景级有界，≤`MAX_SCENE_HARD_FAIL_REPLAN=2`） | **最成熟**：唯一「把具体失败信号翻译成定向修正并注入重执行」的实现 |

**结论**：`replan(ctx, reasons)` 是唯一共同入口，但 reasons 各链字段不一致（type 取值 `metrics/validation/decision/conflict/scene`；suggestObstacle 时而是语义化障碍、时而是原始 error 字符串）；`plannerHint` / `dimensions` / `issues` 这类定向字段在传输途中普遍被丢弃。系统出现「**分析越来越聪明，重规划越来越盲**」。

### 1.3 双 Writer 路径 —— 判定成立，且比审计描述的更分裂

**两条路径使用两套完全不同的 prompt 组装代码，两个 feedback reader：**

| | Runtime 路径 | Studio 路径 |
|---|---|---|
| 场景实体/lore 编译 | `buildDynamicPrompt`（brain 薄包装→`inkos-prompt/compiler.js` `compileScenePrompt`，`dynamic-prompt.js:1-8`） | 同一 `compileScenePrompt` 作为 basePrompt 输入 |
| 最终 Writer prompt | `buildSceneWritePrompt` 字符串拼装（`scene.js:13-33`）+ `optimizeWriterPrompt` 追加静态块（`inkos-writer/optimizer.js`）。**不调用** runtime `prompt-compiler.js` 的 `compile()` | `compileStudioWriterPrompt`（`compile-writer-prompt.js`）→ 调用 runtime `prompt-compiler.js` `compile()`，把 basePrompt 整个塞进 `loreText` |
| feedback 读取 | 仅 `getAdaptiveBudget → loadAdaptiveAdjustments`（adaptive-learning state.json，`adaptive-budget.js:22-44`）。**不读 hints.json / director_overrides / adaptive_state.json** | `loadAdaptiveHints` + `loadDirectorOverrides` + `loadAdaptiveAdjustments` 三源（`compile-writer-prompt.js:85-95`） |

**三个 feedback store 读写方分离**（不是「Studio 写 Runtime 不读」这么简单）：

| 存储 | 路径 | 写入方 | 读取方 |
|---|---|---|---|
| `adaptive_state.json` | `novel/_system/brain/adaptive_state.json` | `applyAdaptiveFeedback`（`adaptive.js:23-27`，`chapter-pipeline.js:229-236`，两条路径都会触发） | planner / orchestrator（改 intent 结构）**/ 无任何 prompt 组装层** |
| `hints.json` + `director_overrides.json` | `novel/_system/studio/director/adaptive/ch_XXXX/` | `recordAdaptiveHint`（scene-pipeline / scene-review / chapter-review / reader-feedback / scene-lifecycle-bridge） | `loadAdaptiveHints`（`director.js:52-65` plan + `compile-writer-prompt.js:86-88`）—— **仅 Studio 路径** |
| adaptive-learning `state.json` | `novel/_system/studio/adaptive-learning/state.json` | `runAdaptiveLearning`（scene-lifecycle-bridge 触发） | `loadAdaptiveAdjustments`（`compile-writer-prompt.js` + `inkos-prompt/adaptive-budget.js`）—— 两路径都读 |

**核心差异**：feedback（hints.json / director overrides / adaptive-learning）只有 Studio 的 `compileStudioWriterPrompt` 会编译进 Writer 约束（P3 Adaptive 层，`prompt-compiler.js:382-393`）；Runtime 路径是「静态实体 + 静态规则」旁路，feedback 只回流到 planner 改 intent 结构，**不进入 Writer 的 prompt 文本**。且 `prompt-compiler.js` 的 `compile()` 本身不读任何文件（无 fs），是纯 sealer —— **谁填 `adaptiveBlock` 才算数**。这符合「Prompt Compiler 才应该负责把当前有效 feedback 编译成 Writer 约束」的改造方向：缺口在喂料侧，不在 sealer 侧。

---

## 2. 四条设计决策（Step 2）

### Decision 1 — Retry Ownership：orchestrator 是唯一 retry/replan owner

**目标**：一次 Chapter Run 的全部 rejection 统一进入 orchestrator，共用同一 `execCtx`、同一 `maxReplan` 预算；超过预算 → 明确终态，不静默重跑。

**现状 → 目标**：

```text
现状（CLI/daemon）：
  chapter-pipeline 失败
    ├─ emit validationRejected → daemon → 新 runChapter → 新 execCtx → 预算清零
    └─ return replanIntent → orchestrator → 有界重入

目标（两种模式一致）：
  chapter-pipeline 失败
    └─ return replanIntent → orchestrator（唯一 owner）
        ├─ execCtx 预算未耗尽 → 有界重入 _runChapter
        └─ 预算耗尽 → replanExhausted 终态 → chapterReviewFailed + needsHumanReview
```

**关键语义**：
1. **daemon 降级为 trigger/scheduler**：仍负责 autoNextChapter、文件监听、状态持久化；**不再拥有「再完整执行一遍 Chapter」的权限**。daemon 对 rejection 事件的处理对齐 Studio 现状（`applyDaemonExecutionGuard` 的行为成为默认，而非 Studio 特例）。
2. **拒绝事件与 replanIntent 二选一**：`chapter-pipeline.js:112-124` 一类位置不再「既 emit 重试事件又返回 replanIntent」。重试语义只走 replanIntent 返回通道；事件通道只发**纯通知**（改名，如 `chapterRejectedNotice`，供 UI/日志），无重试副作用。
3. **maxReplan 从「单次调用预算」变成「单章生命周期预算」**：因为整个章生命周期由一次 top-level runChapter 拥有，`execCtx.chapterReplanCount` / `sceneReplanCount` / `sceneHardFailCount` 才真正代表一章的总消耗。
4. **`_onChapterFinished` 旁路（`daemon.js:216` 直跑 `runChapterPipeline`）必须消除**：质检管线只能在 orchestrator 的所有权下运行（作为 `_runScenesAndChapter` 的一部分），daemon 侧不再直跑，杜绝双 commit。

**边界**：
- 不要求一次 runChapter 吞下全部章节（一本长书仍可逐章触发）；预算只在「同一章」的生命周期内累计。
- 跨手动重跑（Studio `controlRetry`）的**跨调用累计预算**列为 P1（见 §4.2），首版不做持久化计数，靠终态 + 人工介入兜底。
- `execution-guard` 保持稳定层定位，不参与 retry 决策，仅保留锁/abort/事件过滤。

### Decision 2 — Feedback Contract：先标准化，再进 replan，禁止手写 mapping 丢字段

**目标**：所有反馈源先归一化成 `FeedbackSignal`，经 `normalizeFeedback` → `buildReplanIntent` 进入有界 replan。以后加 Reader / Dedup / Decision / Style / Commercial 链，复用同一套传输协议。

**契约管道**：

```text
各链原始输出 ──normalizeFeedback──▶ FeedbackSignal ──buildReplanIntent──▶ replanIntent ──▶ Retry Controller
        （per-source adapter）        （canonical）        （合并 corrective intent）     （有界重入）
```

**两条硬规则**：
1. **禁止在 pipeline 边界通过手写 mapping 丢字段**。metrics 的 `plannerHint`、validation 的 `failures[]`、critic 的 `plannerHints[]` 必须原样进入 signal，任何「只挑两个字段继续走」的代码视为 bug。
2. **correction 统一为一个可执行的「定向修正」**：不是所有失败都叫「重规划」。按修正类型分流（见 §3.3）：`obstacle` / `goal` / `weight` / `dimension` / `directive`（Beat Review 的文本修正指令）。Beat Review 的 `buildHardFailCorrection` 语义向上抽象为 `directive` 类型 + 翻译函数，Chapter / Scene / Beat 三层共用同一 contract。

### Decision 3 — Adaptive Semantics：authored plan 是 base，adaptive 是 overlay

**目标**：Adaptive 只能 **augment** authored plan，不能 **override** authored plan 的核心剧情约束。

```text
Authored Plan ──▶ base intent ──▶ Adaptive Overlay ──▶ final intent
```

**Overlay 白名单（可增量修改）**：`sceneCount`（`sceneCountBias`）、`wordTarget`（缩放）、hook 字数、`conflictPriority`、`actionSceneWeight`、`dialogueTarget`、`styleStrictness` —— 体验参数。

**Overlay 黑名单（authored 优先，禁改）**：`obstacles`（含「不能暴露身份」类硬约束）、`climax`、`pov`、`cost`、`foreshadow`、`character identity`、`knowledge foundation`、`core canon`。

**落地要点**：当前 `applyWeightsToIntent`（`adaptive.js:71-107`）同时干「体验参数」与「补 obstacle」两件事，会越过黑名单。需拆成两层：
- `applyExperienceOverlay` —— authored 路径可用（解决 `planner.js:377` `adaptiveWeights:null` 造成的「authored 完全不看 adaptive_state.json」与「全量 override」两个极端）。
- 结构性调整（obstacle / climax 等）—— 仅非 authored 路径可用。

**边界**：场景数 +1 允许（5→6），obstacle 改写不允许——这正是审计报告的边界，设计照此锁定。

### Decision 4 — Writer Feedback：Studio / Runtime 消费同一套编译后的 feedback contract

**目标**：Writer 不关心 feedback 来自哪个 Validator；Prompt Compiler 是**唯一**把「当前有效 feedback」编译成 Writer 约束的角色，两条路径都走它。

**收敛路径**：
1. **统一 sealer**：Runtime 路径废弃 `buildSceneWritePrompt` + `optimizeWriterPrompt` 的旁路串装，改走 `prompt-compiler.js` 的 `compile()`（或经 `compileStudioWriterPrompt` 提炼出的共享 `compileWriterPrompt`）。
2. **统一喂料**：定义一个共享读取接口 `loadActiveFeedback(bookDir, chapter, sceneIndex)`，合并 hints.json / director_overrides.json / adaptive-learning state.json / adaptive_state.json 中的 **Writer 可见**部分，作为 `compile()` 的 `adaptiveBlock` 输入。物理文件可保留，但读取逻辑只剩一处。
3. **Runtime 路径开启 director/consistency hints 注入**：当前 `sceneLifecycleHook` 默认 `null`（`orchestrator.js:42`）导致纯 Runtime 完全收不到 hints。首版至少让 Runtime 路径经共享读取接口拿到 hints（不要求全量 director 编排）。

**边界**：这是最可能引起 Writer prompt 回归的改动（Runtime 的 Writer 将首次看到新的 feedback 块）。必须配 `tests/prompt-regression` 金样测试；**不与 Decision 2 同批落地**（先契约后喂料，见 §5）。

---

## 3. 契约定义

### 3.1 FeedbackSignal（canonical schema）

```js
{
  // 来源链（决定谁负责 normalize）
  source: 'metrics' | 'validation' | 'critic' | 'consistency' | 'reader'
        | 'dedup' | 'beat' | 'scene' | 'decision' | 'conflict' | 'adaptive',

  // 严重度（决定进 replan 还是进观测）
  severity: 'info' | 'warning' | 'high' | 'critical',

  // 作用范围（决定预算用哪一档）
  scope: 'beat' | 'scene' | 'chapter' | 'book',

  // 第几次尝试（execCtx.attempt）
  attempt: number,

  // 失败/建议维度 —— validation.failures[] / consistency failures 的 dimension 原样进这里
  dimensions: string[],          // e.g. ['dialogue_balance'] | ['timeline','relationship']

  // 人类可读原因
  reason: string,

  // 定向修正（replan 消费它，而不是只凭 source 猜）
  correction?: {
    type: 'obstacle' | 'goal' | 'weight' | 'dimension' | 'directive',
    value: any,
  },

  // 权重微调（metrics.plannerHint 原样进这里，不再丢弃）
  plannerHint?: { [weightKey: string]: number },   // e.g. { actionSceneWeight: +0.05, conflictPriority: +0.10 }
}
```

### 3.2 per-source normalize 映射

| 源 | 原始输出 | → correction / plannerHint | 现缺失字段（必须补进） |
|---|---|---|---|
| metrics | `feedback.suggestions[]`（`metrics.js:106-176`） | `plannerHint` → signal.plannerHint；`suggestObstacle/suggestGoal` → `correction:{type:'obstacle'/'goal'}`；`replan:false` 的条目降为 `severity:'warning'` 只观测 | **`plannerHint` 全程透传**（现在 `chapter-pipeline.js:59-77` 丢弃） |
| validation | `{pass, failures[], checks, message}` | `failures[]` → `dimensions` + `correction:{type:'dimension', value:failures}` | **`failures[]` 进入 replan reason**（现在只传 `{type:'validation',attempt}`） |
| critic | `{pass, issues[], plannerHints[], overall}` | `plannerHints[]` → 多条 signal；`issues[]` 的 `critical` → `severity:'critical'` | **`plannerHints[]` 从死分支（`adaptive.js:46-51`）救活**，进入正常信号流 |
| consistency | `{dimension, reason}[]` | 按 recoverable 分类（§4.2 新增 classifier）：recoverable → replan；non-recoverable → `severity:'critical'` 硬停 | **recoverable/non-recoverable 分级**（现在平铺 `{dimension,reason}`） |
| reader | `readerSimulator.{softFail, hookScore, dragSections}` | `softFail` 原因 → `severity:'warning'` signal（观测） | —（保持软链） |
| dedup | 章级 hits | `severity:'info'`，只观测，不 gate | —（保持观测链） |
| beat | `buildHardFailCorrection` 输出字符串 + hard/soft 分类 | `correction:{type:'directive', value:'【修正指令：复读】…'}` + 可翻译函数 | 把 `studio-orchestrator.js:30-44` 的分类逻辑提升为通用 translation |

### 3.3 buildReplanIntent：signal → 定向 replan

```js
// 伪码：契约模块的语义，非最终实现
export function buildReplanIntent(ctx, signals, execCtx) {
  const active = signals.filter(s => s.scope <= 'chapter');      // 章内有效
  const replanSignals = active.filter(s => s.severity === 'high' || s.severity === 'critical');

  // 按修正类型合并
  const obstacles  = replanSignals.map(s => s.correction?.type === 'obstacle'  ? s.correction.value : null).filter(Boolean);
  const goals      = replanSignals.map(s => s.correction?.type === 'goal'      ? s.correction.value : null).filter(Boolean);
  const weights    = replanSignals.reduce((acc, s) => Object.assign(acc, s.plannerHint || {}), {});
  const directives = replanSignals.map(s => s.correction?.type === 'directive' ? s.correction.value : null).filter(Boolean);
  const dimensions = replanSignals.flatMap(s => s.dimensions || []);

  return replan(ctx, replanSignals.map((s, i) => ({
    type: s.source,                       // 兼容现有 replan 的分流
    attempt: s.attempt,
    suggestObstacle: obstacles[i],        // 兼容现有字段
    suggestGoal: goals[i],
    dimensions,                           // 新增：validation/consistency 定向维度
    plannerHint: weights,                 // 新增：metrics 权重微调
    directives,                           // 新增：beat 文本修正
  })));
}
```

`replan`（`planner.js:752`）扩展为消费 `dimensions` / `plannerHint` / `directives`，并**保持对 `type / suggestObstacle / suggestGoal` 的向后兼容**，避免一次性重构全部调用方。

### 3.4 Retry Controller：execCtx 扩展

```js
// orchestrator.js:121 的 execCtx 扩展（示意）
const execCtx = options._execCtx || {
  attempt: 1,
  chapterReplanCount: 0, sceneReplanCount: 0, sceneHardFailCount: 0,
  exhausted: false,          // 新增：预算耗尽终态标记
  reasons: [],
  signals: [],               // 新增：本执行已消费的 FeedbackSignal（供审计/UI）
};
```

预算语义不变（`maxReplan` 上限），但 **owner 唯一化**后 `maxReplan` 才真正是单章预算。`chapterReplanCount >= maxReplan` 时（`orchestrator.js:342` 现逻辑）除 `replanExhausted: true` 外，**不再有任何外层重试机会**，直接进入 `chapterReviewFailed` + `needsHumanReview` 终态。

### 3.5 Prompt Compiler：唯一 feedback sealer

`prompt-compiler.js` `compile()`（`:531-537`）已具备 sealer 结构（P0-P3 分层 + `clipPriorityStack`）。**不需要改 compile 本身，改喂料侧**：

- 新增共享 `loadActiveFeedback(bookDir, chapter, sceneIndex)`：合并 hints.json / director_overrides.json / adaptive-learning state.json（Writer 可见部分），作为 `adaptiveBlock` 的唯一来源。
- Runtime 与 Studio 都经它喂 `compile()`。
- `formatAdaptive`（`:382-393`）成为「当前有效 feedback → Writer 约束」的唯一编译点。

---

## 4. 影响清单（Step 3）

### 4.1 必须改动（P0，与四条决策一一对应）

| 决策 | 文件 | 改动 | 风险 |
|---|---|---|---|
| D1 | `packages/inkos-runtime/src/daemon.js` | 移除/禁用 rejection 自动重试 handler（sceneRejected / criticRejected / validationRejected / metricsLow 的 `_guardedChapterRun`），保留 autoNextChapter 与状态持久化；消除 `_onChapterFinished` 直跑 `runChapterPipeline` 旁路（`:216`） | **CLI 行为变化**：rejection 不再整章自动重跑（由 orchestrator 有界 replan 承担）。最大行为变化点 |
| D1 | `packages/inkos-runtime/src/pipeline/chapter-pipeline.js` | `:115-124` 等位置去掉重试事件的 emit，只留 replanIntent 返回 + 纯通知事件 | 消除双消费 |
| D1 | `packages/inkos-runtime/src/pipeline/orchestrator.js` | execCtx 加 `exhausted` 标记；终态路由到 `chapterReviewFailed`+`needsHumanReview` | 低 |
| D1 | `execution-guard.js` | `applyDaemonExecutionGuard` 语义成为默认（可选：把 daemon 重试行为从设计上移除，guard 只留锁/abort） | 低 |
| D2 | 新模块（建议 `packages/inkos-brain/src/feedback/` 或 runtime 内 `feedback/`） | `contract.js`：FeedbackSignal schema + normalizeFeedback + buildReplanIntent + per-source adapter 注册表 | 新增代码，无存量破坏 |
| D2 | `packages/inkos-brain/src/planner/planner.js` | `replan()` 消费 `dimensions/plannerHint/directives`，向后兼容 `type/suggestObstacle/suggestGoal` | 中：replan 是各链共同入口 |
| D2 | `metrics.js` / `chapter-pipeline.js:59-77` | plannerHint 透传（不再丢弃） | 低 |
| D2 | `critic.js` / `chapter-pipeline.js:88-96` | 可恢复 issues → replanIntent；不可恢复 → 保留硬停 | 中：critic 首次有 replan 出口，需要分类边界 |
| D3 | `adaptive.js` | `applyWeightsToIntent` 拆 `applyExperienceOverlay`（authored 可用）与结构性调整（非 authored） | 中：authored 路径首次收到 adaptive overlay，需回归 |
| D4 | `compile-writer-prompt.js` + Runtime prompt 组装 | 共享 `compileWriterPrompt` + `loadActiveFeedback`；Runtime 路径弃旁路串装 | **高**：Runtime Writer prompt 首次见到 feedback 块，需 prompt-regression 金样 |
| 全部 | — | 改源码需重启 Studio server（memory: inkos-server-restart-required） | — |

### 4.2 允许改动（P1，紧跟 P0 之后）

| 项 | 内容 |
|---|---|
| Validation 定向重规划 | `dialogue_balance` / `timeline` / `plot_advanced` 等维度 → dimension→correction 映射表，替代现在的整章 generic replan |
| Consistency recoverable 分级 | `recoverable: timeline/relationship/state/minor world contradiction` → replan；`non-recoverable: character identity/knowledge foundation/core canon` → hard stop（新增 classifier，`consistency.js` 输出补 `recoverable` 标记） |
| 跨调用预算 | Studio `controlRetry` 触发新 runChapter 时，累计单章预算计数（持久化到 runtime_state.json 或 guard store） |
| Dedup soft correction | 待 Feedback Contract 成熟后，决定是否把章级 dedup 从 observation 升级为 soft correction（**不在 Phase 2 首版**） |
| Critic 硬停降级为可恢复 replan 的详细边界 | critical 级 character/conflict 问题 vs 可补强问题，需基于实际生成数据定阈值 |

### 4.3 明确不动（Non-goals）

- **Dedup 保持观测链**：章级 soft（`hardBlock:false`）、Beat 级 hard gate 现状不动。审计「Dedup hard gate 误杀风险高（首章合法重复/固定术语/口癖/伏笔回收/有意意象）」的判断采纳。
- **Reader 保持软反馈链**：optimizer 局部润色不动，不进 replan。
- **不新增第九条反馈链**。
- **不为 Runtime 新增 Markdown 知识库文件**（AGENTS.md 铁律）。
- **不改 `prompt-compiler.js` 的 `compile()` 结构本身**（P0-P3 sealer 已够用，改喂料侧）。

### 4.4 行为变化汇总

1. **CLI/daemon 模式**：rejection 不再整章自动重跑 → 有界 replan 承担 → 预算耗尽进入 `chapterReviewFailed` + `needsHumanReview` 终态（需要人工或 autoNext 决策）。这是用户最需要感知的变化。
2. **Runtime Writer prompt**（D4 落地后）：首次包含 hints/director/adaptive-learning 的 feedback 块 → 生成文本可能变化，需金样回归。
3. **authored plan**（D3 落地后）：首次接收体验参数 overlay（场景数/字数/hook），obstacles 等核心约束不变。
4. **critic / consistency**（D2 落地后）：可恢复失败从「硬停」变为「有界 replan」，硬停收敛到不可恢复类。

### 4.5 回归策略

- `scripts/test-runtime.js`（`test:runtime`）+ `tests/runtime-regression/`：覆盖 D1（CLI 拒绝不再重跑、终态路径、无双 commit）。
- `tests/prompt-regression/`（金样）：覆盖 D4（Runtime Writer prompt 新增 feedback 块）、D3（authored 路径 overlay）。
- `scripts/test-beat-execution.js` / `test-director.js`：覆盖 D2 的 directive 翻译与 beat 契约。
- 每项改动后重启 Studio server 再验证。

---

## 5. 分阶段落地顺序

```text
Phase 2.1（P0-1）Retry Ownership
  daemon 降级为 trigger → orchestrator 唯一 owner → 终态路由
  ✅ 最优先：消除双消费 + 预算唯一化

Phase 2.2（P0-2）Feedback Contract
  新契约模块 + replan 扩展 + 各链 adapter 接入（metrics/validation 先行）
  → critic/consistency 从硬停接入 replan（需分类边界）

Phase 2.3（P0-3）Beat Review 语义上提
  buildHardFailCorrection → correction.type='directive' 翻译函数
  三层共用同一 correction contract

Phase 2.4（P0-4）Writer Feedback 统一
  loadActiveFeedback + 共享 compileWriterPrompt
  Runtime 路径接入（prompt 回归金样）

Phase 2.5（P1）Validation 定向 / Consistency 分级 / 跨调用预算
```

**依赖**：2.1 先于 2.2（契约要建在单一 owner 之上，否则 normalize 后仍会被 daemon 旁路）；2.4 最后（Writer prompt 回归风险最高，等契约稳定再动）。

---

## 6. 验收标准（怎么证明收敛）

- [ ] `plannerHint` grep 有 ≥1 个读位点（现在为零），且从 `metrics.js` 到 `replan` 全程透传。
- [ ] validation 失败时 `replan()` 收到的 reason 携带 `dimensions`（`failures[]` 不再丢弃）。
- [ ] critic 可恢复失败产出 replanIntent（不再只硬停）；`plannerHints` 不再走死分支。
- [ ] consistency 输出带 recoverable 标记，recoverable → replan、non-recoverable → hard stop。
- [ ] `chapter-pipeline` 的失败分支不再「既 emit 重试事件又返回 replanIntent」。
- [ ] `maxReplan` 成为单章生命周期预算：CLI 下 rejection 不再重置 execCtx；预算耗尽进入终态，无静默重跑。
- [ ] Runtime Writer 与 Studio Writer 经同一 `compile()` 消费同一 `loadActiveFeedback`。
- [ ] authored plan 只收到体验参数 overlay，obstacles / climax / pov / cost / foreshadow 不变。

---

## 附：调研证据索引

三份调研报告基于的源码（文件:行号均在正文给出）：

- Retry 架构：`daemon.js` / `orchestrator.js` / `chapter-pipeline.js` / `scene-pipeline.js` / `execution-guard.js` / `config.js` / `runtime-control.js` / `studio-orchestrator.js` / `event-bus.js` / `dispatcher.js`
- 八条反馈链：`metrics.js` / `validation.js` / `reader.js` / `reader-simulator.js` / `critic.js` / `consistency.js` / `adaptive.js` / `planner.js` / `adaptive-planner.js` / `beat-execution.js` / `beat-continuity.js` / `beat-slimmer.js` / `studio-orchestrator.js`
- 双 Writer 路径：`prompt-compiler.js` / `compile-writer-prompt.js` / `dynamic-prompt.js` / `scene.js` / `llm-writer.js` / `studio-llm-writer.js` / `adaptive-budget.js` / `director.js` / `scene-pipeline.js` / `adaptive-planner.js` / `inkos-adaptive-learning`

---

**一句话**：先把 Retry Ownership 与 Feedback Contract 这两根骨架立起来，八条链的后续能力（Validation 定向、Consistency 分级、Critic replan、Dedup soft）才能低成本往上挂——而不是继续给每条链单独打补丁。
