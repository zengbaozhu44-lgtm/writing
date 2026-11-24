# Runtime 边界 — Studio 与 Runtime 永久分工

## Runtime 负责（LOCKED，Studio 禁止介入）

| 领域 | 模块 | 产出物 |
|------|------|--------|
| 规划 | Planner, Decision, Conflict | `ch_*_plan.json` |
| 写作 | Scene Pipeline, Writer | `ch_*_scenes.json`, `chapters/` |
| 评审 | Review, Consistency | Scene `review`, `consistency` 字段 |
| 质量 | Metrics, Reader, Critic, Validation | `ch_*_run.json` |
| 记忆 | Git Memory, State Updater | `git/snapshots/`, `novel/*.yaml` |
| 健康 | Story Health | 实时计算（不落盘） |
| 自适应 | Adaptive Planner | `adaptive_state.json` |
| 状态 | State Machine | `08_current_state.md`, `07_state_board.md` |
| 事实 | Facts DB | `13_facts_db.yaml` |
| 时间 | Timeline | `11_timeline.yaml` |
| 资源 | Resource DB | `14_resource_db.yaml` |

**以上全部文件的写入权归 Runtime Pipeline。**

## Studio 负责（Console Only）

| 领域 | 说明 |
|------|------|
| Dashboard | 聚合展示 Runtime 状态 |
| Runtime Console | 底部 Pipeline 进度条 |
| Scene Pipeline View | 只读展示 Scene 列表与状态 |
| Brain Panel | 只读展示 Pipeline 阶段 |
| Planner View | 只读展示 Planner 产出 |
| Prompt Viewer | 只读展示 Dynamic Prompt（调试） |
| Memory Diff Viewer | 只读展示 Git Memory diff |
| Story Health Display | 只读展示实时 health（现算，不落盘） |
| Event Timeline | 监听 Runtime Event Bus |
| Runtime Controls | 调用 `runtime/run`, `resume`, `rollback` 等 |

## Studio 禁止

- ❌ 修改 Runtime Pipeline 顺序或逻辑
- ❌ 直接 POST 写入 Facts / Timeline / Resource / State
- ❌ 直接 PUT Scene 正文（须通过 `runtime/run` 或 Writer）
- ❌ 自行计算 Story Health（health 由 Runtime 现算，Studio 只读展示）
- ❌ 自行解析并推导人物关系逻辑
- ❌ 自行修改 Planner 权重或决策
- ❌ 监听文件系统变化驱动 UI（须监听 Runtime Event）

## 短期 vs 长期

| 数据 | 短期（Stability 1.0） | 长期目标 |
|------|----------------------|----------|
| Current State | Studio 读取 `08_current_state.md` 展示 | Runtime API 直接输出 `state` 对象 |
| State Board | Studio 读取 `07_state_board.md` 展示 | Runtime API 直接输出 `world` 对象 |
| Story Health | Studio 经 Runtime 实时 health（现算） | Runtime API 输出 `health` 对象（已达成） |
| Events | Runtime Event Bus → SSE | 不变 |

**Stability 1.0 允许 Studio Server 读取 Runtime 产出文件用于展示，但禁止任何业务计算或写入。**

## 事件驱动 UI

Studio UI 刷新触发源（唯一合法来源）：

```
sceneChanged       ← sceneFinished
chapterFinished    ← chapterFinished
plannerUpdated     ← nextChapterPlanned
healthUpdated      ← pipelineCompleted（含 health）
memoryUpdated      ← memoryUpdated
runtimeStopped     ← daemon stop / pipelineFailed
```

收到事件 → 重新 GET 只读 API → 刷新 UI。  
**禁止**收到事件后自行重新计算业务数据。

## 回归保障

`tests/runtime-regression/` 确保 Studio / API Wrapper 变更不影响 Runtime 产出。

CI 失败条件：同一输入下 Runtime 产出与 golden snapshot 不一致。
