# InkOS Runtime 2.0 — Architecture (LOCKED)

> **Status: LOCKED**  
> 本文档冻结 Runtime 核心架构。任何修改须经过架构评审。

## 冻结范围

以下模块属于 **Runtime Core**，状态 **LOCKED**：

| 模块 | 路径 | 职责 |
|------|------|------|
| Event Bus | `src/event-bus.js` | 14 种事件类型，Pipeline 通信 |
| Trigger | `src/trigger.js` | 文件监听触发 |
| Dispatcher | `src/dispatcher.js` | 事件 → Handler 路由 |
| Scheduler | `src/scheduler.js` | 串行任务队列 |
| Daemon | `src/daemon.js` | 全自动 Pipeline 闭环 |
| Orchestrator | `src/pipeline/orchestrator.js` | 章节编排 |
| Scene Pipeline | `src/pipeline/scene-pipeline.js` | 逐 Scene 执行 |
| Chapter Pipeline | `src/pipeline/chapter-pipeline.js` | 章级 Review/Metrics |
| Event Pipeline | `src/pipeline/event-pipeline.js` | 事件驱动管线 |

## Brain 集成（LOCKED，via Runtime 调用）

| 模块 | 职责 |
|------|------|
| Planner | 章意图 + Scene 分解 |
| Decision | 决策引擎校验 |
| Conflict | 冲突类型检测 |
| Scene | Scene Review |
| Consistency | 一致性校验 |
| Reader | 多 persona 阅读模拟 |
| Critic | 商业性评审 |
| Metrics | 节奏/密度指标 |
| Validation | 七章验收 |
| Memory / Git Memory | Snapshot / Diff / Rollback |
| Story Health | 全书健康度计算 |
| Adaptive Planner | 权重自适应 |
| Dynamic Prompt | Scene 级 Prompt 组装 |
| Writer (LLM) | 正文生成 |

## Pipeline 顺序（不可变更）

```
Planner → Decision → Conflict → Scene Writer
  → Review → Consistency → Decision（逐 Scene）
  → Metrics → Reader → Critic → Validation
  → Adaptive → Git Memory → Story Health → State Update → Next Planner
```

**禁止**调整顺序、跳过步骤、合并步骤。

## 允许修改

- Bug Fix（不改变 Pipeline 行为语义）
- 性能优化（不改变输出结果）
- 安全修复

## 禁止修改

- Planner / Decision / Conflict / Scene / Review / Consistency
- Reader / Critic / Metrics / Memory / Pipeline 顺序
- **任何 Studio 发起的修改**

## 版本

当前冻结版本：**2.0.0**（见 `package.json` → `version`）

## Studio 边界

Studio **不得** import 或调用 Runtime 内部模块。  
Studio **只能**通过 Studio Server API Wrapper 间接调用 `inkos runtime` 公开接口。
