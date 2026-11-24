# 17. Phase 2.2 — RecoveryIntent Contract

> 日期：2026-08-19 ｜ 状态：**✅ 已通过（用户审核）** ｜ 性质：契约文档（概念正式化，**代码零改动**）
> 起草约束（用户定）：**只抽象当前 replanIntent 已证明存在的行为，再向未来留扩展位**；不设计"理想中的恢复系统"。RecoveryIntent 概念正式化，代码暂留 replanIntent。
> 审核结论（2026-08-19）：通过，全部保留。✅ reason 白名单（critic 不产 replanIntent 是文档能力 < 代码能力的正确收敛）✅ chapter/scene scope（三计数器 = 抽象既有事实）✅ Runtime 不拥有故事方向。⚠️ 唯一标记者为 `_replanSource`（未来结构化改造点，见 §5/§11）。

---

## 0. 一句话定义

> **RecoveryIntent = 当前执行结果无法满足硬约束时，Runtime 发起的一次有限恢复流程。**

它不代表任何创作意图。它只回答：*这次执行不可接受，怎么收束、收束多少次、什么时候必须停。*

---

## 1. 五问契约

| # | 问题 | 回答 | 代码证据 |
|---|---|---|---|
| 1 | **谁产生？** | 章级：metrics / validation 校验链；场景级：scene 硬失败闸（SCENE_HARD_FAIL） | chapter-pipeline.js:63-71（metrics）、:96-104（validation）；studio-llm-writer.js:491 抛 `SCENE_HARD_FAIL` → studio-orchestrator.js:208 |
| 2 | **为什么产生？** | 硬约束未满足：validation 八项未过 / metrics 反馈 `needsReplan` / 防复读 ≥7 字 + 身体禁令 | chapter-pipeline.js:59 `needsReplan && !force`；metrics.js:174-175；studio-orchestrator.js:208-212 |
| 3 | **谁消费？** | Runtime：章级 `_resolveChapterResult`（**唯一** replanIntent 重入出口）；场景级 studio-orchestrator 重规划分支 | orchestrator.js:336-354；studio-orchestrator.js:212-243 |
| 4 | **恢复范围是什么？** | `chapter`（章级重入整章）或 `scene`（场景重规划，保留已完成场景） | orchestrator.js:342（chapter）；studio-orchestrator.js:226-236（`_keptScenes` 跨重规划保留） |
| 5 | **什么时候必须停止？** | 预算用尽即停：`chapterReplanCount >= maxReplan` → `replanExhausted`；`sceneHardFailCount > MAX_SCENE_HARD_FAIL_REPLAN` → `hardFail:true` | orchestrator.js:342-348；studio-orchestrator.js:244-247 |

---

## 2. Schema（枚举白名单）

```yaml
RecoveryIntent:
  reason:            [validation_failed, metrics_failed, scene_hard_fail]
  source:            [validation, metrics, scene]
  scope:             [chapter, scene]
  nextAction:        [retry_chapter, retry_scene, regenerate_with_intent, stop]
  maxRetry:          number
  exhaustedBehavior: [replan_exhausted, stop_with_error]
```

---

## 3. 枚举为什么只有这些（代码事实，禁止扩）

| 枚举 | 允许值 | 为什么是这些（不是更多） |
|---|---|---|
| `reason` | `validation_failed` / `metrics_failed` / `scene_hard_fail` **+ 2.3 D1 批准（契约级）：`timeline_conflict`（consistency recoverable）/ `world_truth_violation`（consistency terminal）** | **critic / reader-sim 失败不产生 replanIntent**——chapter-pipeline.js:85-88 critic 拒绝直接 return（无 replanIntent）；reader-sim 走 Optimizer 润色而非恢复。未来若它们成为恢复触发者再加 `emotion_failed` 等（见 §8）。**2.3 D1 后**：consistency 进入恢复桥（分级：场景顺序错 → `timeline_conflict`/`retry_scene`；已死人物复活且无解释 → `world_truth_violation`/`stop`）。⚠️ 仍是契约级，代码未动 |
| `source` | `validation` / `metrics` / `scene` | 只有这三者今天实际触发恢复。planner/director/writer/reader **不是恢复触发者**（planner.replan() 只是意图生产工具，见 §7） |

> **语义层说明（用户审核补充，不拆字段）**：`reason` 今天混着两个问题——"为什么需要恢复"（trigger：validation 八项未过 / metrics 反馈 / 场景硬失败）与"谁发现的问题"（source：validation / metrics / scene）。两者在现状代码里是同一对象（同一处 `pass:false` 同时是触发者与来源），所以**暂不拆字段**；拆的前提是未来出现"来源与触发不同"的真实运行链（如 writer 触发但 metrics 记录），到那时才需结构化。
| `scope` | `chapter` / `scene` | 恢复层级越大风险越高。book/volume/world 无任何跨层恢复机制存在 |
| `exhaustedBehavior` | `replan_exhausted`（章级）/ `stop_with_error`（场景级） | orchestrator.js:348 置 `replanExhausted:true`；studio-orchestrator.js:244-247 置 `hardFail:true` + error |

---

## 4. nextAction 命名（为什么不叫 `action`）

- `action` 与角色行为（beat.actor/action）混淆；`nextAction` 明确是**恢复流程的下一步**。
- 语义（全部有现有行为对应）：

| nextAction | 含义 | 现有代码对应 |
|---|---|---|
| `retry_chapter` | 重跑整章 | replanIntent 重入 `_runChapter`（orchestrator.js:337-354） |
| `retry_scene` | 重规划场景 | SCENE_HARD_FAIL → 带 `_hardFailCorrection` 重进 `_runChapter`（studio-orchestrator.js:212-243） |
| `regenerate_with_intent` | 重入携带新意图 | `replan()` 产物 → `presetIntent`（orchestrator.js:149-172） |
| `stop` | 预算用尽终止 | `replanExhausted:true` / `hardFail:true` |

---

## 5. 现有字段 → RecoveryIntent 映射表（迁移不靠猜）

| 现字段 | RecoveryIntent | 现状备注 |
|---|---|---|
| `replanIntent=true`（chapter-pipeline.js:70/103 置） | `RecoveryIntent exists` | 触发标志 |
| `replan()` 产物（新 intent） | `payload`（nextAction 上下文） | 重入携带的新意图 |
| `_replanSource`（orchestrator.js:354；:351 **从 error 文本推断**） | `source` | ⚠️ **Phase 2.x 唯一未来小修点**：今天启发式（`error.includes('Validation')` 二选一）；目标 = 生产侧直接声明 source/reason，而非消费侧猜。**现在不改**（见 §11） |
| error 文本（'Metrics 反馈触发重新规划' / 'Validation 八项未全部通过'） | `reason` | ⚠️ 今天推断，目标结构化 |
| `chapterReplanCount` / `maxReplan`（orchestrator.js:39 默认 3） | `currentRetry` / `maxRetry`（chapter scope） | 章级预算 |
| `sceneHardFailCount` / `MAX_SCENE_HARD_FAIL_REPLAN`（studio-orchestrator.js:20 默认 2） | `currentRetry` / `maxRetry`（scene scope） | 场景级预算 |
| `replanExhausted`（orchestrator.js:348） | `exhaustedBehavior: replan_exhausted` | 章级耗尽 |
| `hardFail:true`（studio-orchestrator.js:246） | `exhaustedBehavior: stop_with_error` | 场景级耗尽 |
| `execCtx.reasons[]`（orchestrator.js:352） | 恢复轨迹日志 | 已存在，逐次记录 `chapter_replan#N(source): error` |

---

## 6. 禁止行为（比 schema 更重要）

```
RecoveryIntent is NOT:
- story planning              —— 不是重新规划故事
- quality improvement request —— 不是"写得更好"
- creative suggestion         —— 不是创作建议
- alternative plot generation —— 不是换一条剧情线
```

它只代表：**当前执行结果无法满足硬约束，需要一次有限恢复。** 超出此语义的任何需求都不该塞进 RecoveryIntent。

---

## 7. RecoveryIntent ≠ Replan

- "replan" 名号有误导：它确实调用了 `planner.replan()`（chapter-pipeline.js:63/96），但那只是**生产替换意图的内部工具**；契约本身描述的是**恢复控制流**（谁触发、何时停、耗尽怎么办），不是故事规划。
- 真正含义：**当前执行结果不可接受 → 进入有限恢复流程。**
- 因此它归 **Runtime** 拥有，而不是 Planner：触发条件是"执行结果不可接受"（运行时质量门），不是"故事走向决策"。Planner 仍是"未来可能发生什么"的所有者（16 §1），`replan()` 只是它借给 Runtime 的意图生产工具。

---

## 8. 扩展位（显式预留，未启用）

| 预留位 | 启用条件（必须先有真实运行链，否则不启用） |
|---|---|
| `reason: emotion_failed / reader_failed / style_failed` | critic / reader-sim 成为恢复触发者（今天它们失败不产 replanIntent） |
| `scope: book / volume / world` | 存在跨层恢复机制（今天没有） |
| `source: planner / director / writer / reader` | 它们成为恢复触发者（今天不是） |
| `nextAction: 更多值` | 出现新的有限恢复动作（今天只有重跑/重规划/带意图重入/停止） |

> 原则：**字段先存在、能力以后补** = 抽象膨胀。本契约只写白名单；扩展位仅作记录。

---

## 9. 审核对照（用户三点）

1. **不是万能修复入口** —— 枚举白名单（§3）+ 禁止行为（§6）+ 五问"何时停止"（§1-5）三重约束。
2. **创作决策不进 Runtime** —— 契约只描述"硬约束失败 → 有限恢复"，不描述"怎么写/写什么"（§7）；`planner.replan()` 仅作意图生产工具。
3. **不超出现有代码事实** —— 每个字段附 `file:line` 证据；唯一"未来态"是 reason/source 从 error 字符串推断改为结构化（§5 标注 ⚠️），迁移路径已给出且**代码零改动**。

## 11. 未来唯一结构化改造点（⚠️ 现在不改）

- **对象**：`_replanSource` 的消费侧字符串推断（orchestrator.js:351 `error.includes('Validation') ? 'validation_replan' : 'metrics_replan'`）。
- **为什么现在不改**：结构化需要生产侧（chapter-pipeline.js）在 `return` 时直接声明 `source` / `reason` 字段——这是行为不变的重构，非 Phase 2 文档收敛任务；且改后需同步 golden baseline（promptFingerprint 不变但 gateOutputs 结构变）。
- **触发条件**：等 2.3（World Truth & Quality Gate Contract）定稿后，若 Recovery Bridge 需要多来源区分，再一并做；否则保持现状。
- **恢复粒度原则（用户审核补充）**：恢复粒度保持小——book/volume/world 级恢复**不出现**，除非"整个故事状态不可恢复"真实出现。

## 12. 变更记录

- 2026-08-19 起草 v1（五问 + schema 白名单 + 映射表 + 禁止行为 + ≠Replan）。
- 2026-08-19 审核通过：补审核结论、reason/source 语义层说明（§3）、`_replanSource` 定位未来唯一小修点（§5/§11）、恢复粒度原则（§11）。
- 2026-08-19 2.3 D1 批准：reason 白名单契约级扩展 `timeline_conflict` / `world_truth_violation`（consistency 分级进入恢复桥，代码未动；实现时触发 §11 小修）。见 `18_phase2_world_truth_quality_gate.md` §6。
