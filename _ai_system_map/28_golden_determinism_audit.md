# 28. Golden Determinism Hardening — 确定性边界审计（只读，2026-08-20）

> 审计令（用户拍板，2026-08-20）：golden 还不是完全可信的裁判。只读审计 golden harness 确定性边界，追踪 readerSimulator 入口→config→API key→model→fallback/degraded→baseline 写入→verify 比较全链。回答 7 问 + 输出 Golden Determinism Boundary + 最小修复方案。**本轮不改代码。**
> 背景：P3.1-P3.3 连续几轮见「readerSimulator 漂移簇」「有 key 偷走真实 LLM」「degraded 不强制」「reader_sim_baseline.json 被成功路径创建」。

---

## 0. 顶层结论

**golden 复用生产 `loadInkOsConfig()`，`.env` 里的 `LLM_API_KEY` 直接流入 readerSimulator → 真实双评审 LLM。这是全部 readerSimulator 簇漂移的根因。**

决定性证据（baseline.json 实测）：`gateOutputs.readerSimulator` 含 `model / reviewers / raw / conservative` 键 + `hookScore: 0` + **无 `degraded`** —— 这些键只存在于真实 LLM 成功路径（reader-simulator.js:96-109）；heuristic 路径（:392-409）只返回 `summary/hookScore/dragSections/softFail`。**已提交的 golden baseline 本身就是用真实 LLM 构建的，verify 永不可能稳定。**

---

## 1. readerSimulator 全链（实证 file:line）

```
tests/golden-baseline/baseline.js build|verify
  → captureChapter (lib.js:209) → RuntimeOrchestrator(workDir, {deterministic writer stub})
  → chapter-pipeline.js:113 runChapterReaderSimulator(workingText, { bookDir, chapter, dualReviewer:true })
       ├─ loadHookBaseline (reader-simulator:58)         读 novel/_system/brain/reader_sim_baseline.json
       ├─ computeDynamicHookThreshold (:59)              基于历史（确定性）
       ├─ config = loadInkOsConfig().llm (:61)           ←── 读 .env → LLM_API_KEY（有）
       │     └─ config.apiKey 真值 → 真实双评审 LLM (:66-114)
       │           ├─ callReviewer ×2 (temperature 0.3 + 0.7, dualReviewer) → chatCompletion → 非确定
       │           ├─ mergeConservativeReviewers (:95)   min(hookScore) + 合并 dragSections → 非确定
       │           └─ persistHookSample (:111-113)       ←── 写 reader_sim_baseline.json（含 at: ISO 时间戳）
       └─ config.apiKey 空值 → heuristicReaderSim (:62-64)  确定性规则，返回前不 persist
  → shouldTriggerOptimizer (chapter-pipeline:138)        hookScore < 6 → polishChapterAfterReaderSim
       └─ 有 key → 真实 LLM polishFn 改写正文 (:209-242)   ←── 灾难级漂移：正文变 → 下游 gate 全变
  → captureChapter gateOutputs.readerSimulator = canonicalizeJson(result.readerSimulator) (lib.js:235)
  → diffBaselines 深比较 (lib.js:252-264)                 readerSimulator 整体进比较
```

## 2. 七问回答

### Q1 同一代码有无 key 为何不同 golden？
golden harness **没有任何 key 隔离**：它复用生产 `loadInkOsConfig()`，而 `.env`（仓库根）有 `LLM_API_KEY`。
- 有 key → readerSimulator 走真实 LLM（:66-114）+ persist（:111-113）+ 可能 polish 改写正文
- 无 key → 确定性 heuristic（:62-64）
- 同一代码、同一 fixture，环境不同 → golden 不同。**golden 不是环境无关的。**

### Q2 哪些测试触发真实 LLM？
**只有 readerSimulator**。实证：
- 正文：确定性 stub writer（lib.js:146-168，固定模板行）→ 无 LLM
- metrics/critic/reader/validation：确定性规则读确定性正文 → 无 LLM
- replan-three-state.js：无 LLM（文件头注释「无需真实 LLM」）
- ab-test：golden 跑 ch1，`shouldRunAbTest(1)` = 1 % 5 ≠ 0 → **不触发**（orchestrator/chapter-pipeline 无 ab-test 命中）
- readerSimulator 默认 `dualReviewer: true`（chapter-pipeline:113）→ 每次 **2 次**真实 LLM 调用

### Q3 哪些 artifact 会漂移？
| artifact | 漂移机制 |
|---|---|
| `gateOutputs.readerSimulator` | hookScore/summary/dragSections/reviewers/raw/model/softFail 全非确定 |
| `memoryMutation` → `reader_sim_baseline.json`（**added**） | persistHookSample 在 workDir 里创建（fixture 无此文件）；`isVolatilePath` 不排除它 |
| `memoryMutation` → `run.json`（**modified**） | run.json 持久化 readerSimulator 块 + hookScore |
| 若 softFail 触发 polish | 真实 LLM polishFn 改写正文 → **下游 metrics/critic/validation/prompt 全变**（最严重） |
| `executionPlan`（结构） | 不变（确定性计划） |

### Q4 reader_sim_baseline.json 应否隔离？
**应从源头消掉，而非事后隔离。** 最小修复（golden 强制无 key）使该文件根本不生成——no-api-key 路径（:62-64）在 persist（:111）之前 return。若选 artifact 隔离路线，才需加进 `isVolatilePath`。

### Q5 degraded 模式能否成为 golden 唯一强制模式？
**能，且应该。** `heuristicReaderSim`（:392-409）是纯规则：字符数 + 尾文正则（`/[？?]|倒计时|消失|系统|异常|必须|来不及/`）+ 环境长句 regex → 确定性。强制后 golden 全确定性，且**顺带覆盖 degraded 分支**（golden 成为「degraded 可达性」的回归守卫）。

### Q6 其它非确定性源清单
| 来源 | 入口 | 触发条件 | 影响 artifact | 已有 fallback | 修复成本 |
|---|---|---|---|---|---|
| **真实 LLM response（readerSimulator）** | chapter-pipeline:113 | `.env` 有 LLM_API_KEY | readerSimulator gate + reader_sim_baseline + run.json + 可能正文 | heuristic 兜底（catch:115-125） | 低（强制 heuristic） |
| ISO 时间戳（`at`/`updatedAt` 等） | persistHookSample:375/:379 等 | 写文件 | 字符串打码 `ISO_TS`（lib.js:35）→ 已中和 | ✅ canonicalizeText/Json | 无 |
| compile_ms 嵌 prompt | llm-writer | 真实 LLM 调用 | `COMPILE_MS` 打码（lib.js:37） | ✅ | 无 |
| 临时工作目录路径 | createWorkDir:132 | 每运行 | `WORKDIR_PATH` 归一（lib.js:40） | ✅ | 无 |
| traceId 随机（Math.random+Date.now） | trace.js:10/:18 | trace 生成 | `isVolatilePath` brain/traces/ + VOLATILE 'traceId' | ✅ | 无 |
| git 快照随机 id | git-memory.js:57 | git 提交 | `isVolatilePath` brain/git/ + VOLATILE 'snapshot' | ✅ | 无 |
| task 锁随机 id | execution-guard.js:21 | 任务锁 | 未观察漂移（runtime 基建） | 需回归确认 | 低 |
| promise_<ts> id | promise-lifecycle.js:49 | 无 id fallback | 未观察漂移（fixture 显式 id） | 需回归确认 | 低 |
| ab-test latencyMs（Date.now） | ab-test.js:126/:147 | 每 5 章 | **golden 不触发**（ch1） | ✅ 天然豁免 | 无 |
| 网络/模型失败 | chatCompletion | key 有效但网络断 | 走 catch→heuristic+degraded（:115-125），结果不同 | ✅ 有兜底但结果漂移 | 低 |
| 环境变量（key 有无） | config.js:25-28 | `.env` | 整体路径分叉 | ❌ 无隔离 | 低（golden 入口隔离） |

**活跃非确定性源只有一个：真实 LLM response（及其 persist 副作用）。** 其余全部已中和或天然豁免。

### Q7 最小修复方案（不改码，供拍板）

**方案 B（推荐，零生产代码改动）**：golden 入口强制无 key。
- `tests/golden-baseline/lib.js` captureChapter（或 baseline.js 顶部）设置 `process.env.INKOS_LLM_API_KEY=''` / `process.env.LLM_API_KEY=''`
- 效果：loadInkOsConfig() 读空 → `config.apiKey` falsy → readerSimulator 走确定性 heuristic（:62-64）→ 不 persist、不 polish、gateOutputs 稳定
- 成本：2-3 行测试侧代码；复用既有「无 key → degraded」设计，golden 顺带覆盖 degraded 分支
- 风险：config.js `.env` loader 只在 import 时若未设置才填充（:15），golden 设空后不再被覆盖 ✓；loadInkOsConfig 每次调用现读 process.env ✓

**方案 A（可选加固，生产侧 1 参数）**：给 `runChapterReaderSimulator` 加 `forceHeuristic` 选项，orchestrator 透传；golden 显式传 `forceHeuristic: true`。比 B 更显式（不依赖 env 技巧），但动生产代码。

**方案 C（最弱，不推荐单独用）**：`reader_sim_baseline.json` 加进 isVolatilePath + diffBaselines 剥离 readerSimulator + run.json 剥离 readerSimulator 块。会降低 reader gate 覆盖，且不解决 polish 正文漂移。

**回归标准（拍板后执行）**：`npm run test:golden` 连续 3 次 → run1==run2==run3（readerSimulator 簇零漂移）；golden rebuild 一次（baseline.json 的 readerSimulator 换为 heuristic 输出）。

## 3. Golden Determinism Boundary

```
                    ┌──────────────┐
                    │ Golden Input │  (fixture 只读 → 仓库外临时目录)
                    └──────┬───────┘
                           ↓
                   deterministic?
                           ↓
         ┌─────────────────┴─────────────────┐
         │                                   │
   deterministic                        nondeterministic
   (golden compare)                      (isolate/mock)
         │                                   │
         ↓                                   ↓
  ┌─────────────────────────┐    ┌──────────────────────────────┐
  │ prose (stub writer)     │    │ readerSimulator 真实 LLM      │ ←── 唯一活跃源
  │ promptFingerprint       │    │  (dualReviewer ×2, 有 key)    │
  │  (compileMs 已打码)      │    │ reader_sim_baseline.json 副作用│
  │ executionPlan (结构)     │    │  (persistHookSample)          │
  │ gateOutputs             │    │ polish 改写正文 (softFail 时)  │
  │  consistency/metrics/   │    │ env 条件分叉 (key 有无)         │
  │  critic/reader/         │    └──────────────┬───────────────┘
  │  validation             │                   ↓
  │ memoryMutation          │          isolate/mock 手段：
  │  (volatile 已排除+TS打码) │         B: golden 入口强制无 key → heuristic
  │ replan 三态             │         A: forceHeuristic 参数显式透传
  │  (无 LLM 单元测试)       │         (degraded 成为 golden 唯一强制模式)
  └─────────────────────────┘
```

## 4. 影响评估

- **这是减法审计可信度的前置条件**：P3.3 Choice 删除、P3.4 Engine 双层、P3.5 Prompt 语义重复，全部依赖 golden 稳定。「绿了 / 漂了」必须先能区分代码变化 vs 环境变化。
- **当前状态**：golden baseline 本身已被真实 LLM 污染（readerSimulator 含 model/reviewers/raw 键）→ verify 的 readerSimulator 簇漂移是**必然**，不是偶发。
- **修复后**：golden 全确定性；degraded/heuristic 分支被 golden 覆盖；baseline.json 换为 heuristic 输出后每次 build/verify 稳定。

## 5. 记忆关联

[[inkos-golden-baseline]]、[[inkos-phase15-readiness]]、[[inkos-p33-residual-audit]]（P3.3 Choice 删除在此修复之后执行）
