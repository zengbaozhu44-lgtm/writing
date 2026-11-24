# Golden Baseline — 生成行为保护（Phase 1.5）

> **双轨说明**：本目录是 **legacy generation baseline**（旧 Runtime 章节骨架）。  
> 新因果路径请用 `tests/golden-causal-baseline/`（`npm run test:golden-causal`）。  
> 两者并行、互不替代。

把 Runtime 章节生成的**确定性骨架**固化为可对比基线，确认架构清理（Phase 1 删死代码）没有改变生成结果，并为 Phase 2/3 的每次改动提供回归护栏。

## 命令

```bash
# 跑 fixture → 固化 baseline.json（首次 / 有意改动后）
node tests/golden-baseline/baseline.js build

# 重跑 → 与基线对比，漂移即非零退出（CI 用）
node tests/golden-baseline/baseline.js verify

# 输入变更时从 books/我的小说/books/_runtime-test 重新冻结 fixture，然后重新 build
node tests/golden-baseline/baseline.js refresh-fixture

# replan 三态单元测试（build/verify 已自动执行，也可单独跑）
node tests/golden-baseline/replan-three-state.js
```

npm：`npm run test:golden`（= verify）。

## 捕获的产物（baseline.json → artifacts）

| 产物 | 内容 | 对应 Phase 1.5 项 |
|---|---|---|
| `executionPlan` | 每个派生 scene 的 executionPlan 投影（goal/conflict/beat/wordTarget/entities；planner 不构建嵌套 executionPlan） | 固化 execution plan |
| `promptFingerprint` | 每 scene **最终编译 prompt**（lore seed + 续写硬约束 + optimizer 块）的 sha256 | 固化 prompt fingerprint |
| `gateOutputs` | consistency / metrics / critic / reader / validation / readerSimulator 计算值 | 固化 validation output |
| `memoryMutation` | 运行后相对 fixture 的新增/修改文件 → canonical hash（brain states / anchor / canon / 任务卡 / run / scenes …） | 固化 memory mutation |
| `pipeline` | pass / awaiting / error / stages | 运行状态 |

## 确定性设计（关键）

- **fixture 只读**，每次运行复制到仓库外临时目录（`os.tmpdir`）。原因：`tryRealGitCommit` 沿目录向上找 git 根，若在仓库内运行会把 fixture 文件 `git add` 进主仓库。
- **不用真实 LLM**：确定性 writer stub 返回模板正文（含 POV 名/对话/世界词，metrics 有真实数值）；reader-simulator 无 key 走 `degraded` 分支。
- **`force: true` 跑通全链**（含 memory commit），四道闸（consistency/metrics/critic/validation）的**计算值仍被 pin**；闸的结构逻辑（是否重入/拒绝）由 replan 三态测试覆盖。
- **易变内容打码**：ISO 时间戳、prompt-compiler 嵌入的 `compile=<ms>`（wall-clock）、workdir 绝对路径、`snapshot` 键（raw 短哈希含 compileMs）。
- **易变路径排除**：`brain/traces/`（tr_ch_<ts>_<rand>）、`brain/git/`（snap_<ts>_<rand>）— 运行时诊断/基础设施，非生成行为。

## 覆盖边界（诚实声明）

- 不含真实 LLM 写作质量（writer / reader-sim 判定）— 那些本就不确定。
- `force` 绕过闸的**阻断动作**，因此「闸拒绝 → replan」的集成行为由 replan 三态测试在单元层覆盖。
- 只跑章节 1 的**派生规划零重试**路径：`planChapter → decision → conflict → scenes → chapter_pipeline` 一次通过；`force` pin 闸计算值、不执行拒绝 → 无 replan。
- **不在覆盖内**：authored-plan 路径（fixture 无 `chapter_plans/`）、「闸拒绝 → replan」循环、场景重规划重入 —— 后两者由 replan 单元测试覆盖。

## 何时需要重新 build

- 任何**有意的**生成行为变更（Phase 2/3）落地后。
- `refresh-fixture` 重新冻结输入后。
- 不要为「加了新死代码」build — verify 应该继续通过；这正是它的价值。

## 文件

```
tests/golden-baseline/
  fixtures/book/        # 冻结输入书（从 _runtime-test 快照）
  lib.js                # 核心：fixture 复制 / canonicalizer / 捕获 / 比较
  baseline.js           # CLI：build / verify / refresh-fixture
  replan-three-state.js # _resolveChapterResult 三态 + guardReset 单元测试
  baseline.json         # committed golden
  README.md
```
