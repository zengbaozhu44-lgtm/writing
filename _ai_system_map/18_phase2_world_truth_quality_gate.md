# 18. Phase 2.3 — World Truth & Quality Gate Contract（世界真相与质量闸契约 = 权力地图）

> 日期：2026-08-19 ｜ 状态：**✅ 已通过（用户拍板）** ｜ 性质：契约文档（代码零改动）
> 核心问题（用户重定义，替代原 2.3「Validator 出口收敛」）：**「谁有资格阻止故事继续生成？」**
> 契约原则（沿用 2.2，用户认可）：**契约必须描述已经存在的运行事实，不提前描述未来想拥有的能力。**

---

## 0. 一句话诊断 + 第一性原则

> **InkOS 当前真正的问题不是闸太多，而是权力分配错误。**
> **判据强度 ≠ 阻断权限**——今天两者倒挂：文学启发式（critic/metrics）拥有系统裁判权，唯一的真相闸（consistency）却无恢复入口。

这揭示了过去的设计倾向（过度工程化的根）：

```
为了保质量 → 看到问题 → 增加阻断 → 文学评分获得系统裁判权
```

作者系统应该像：

```
事实错误   → 阻止
故事停滞   → 提醒 / 有限阻止
写得普通   → 建议
```

**绝不能：写得不够精彩 → 判死刑。**

---

## 1. 现状否决权全景（证据：今天真正能 pass:false 的每一处）

| 阶段 | 闸 | 代码位置 | 读什么 | 失败时行为 | 可恢复? |
|---|---|---|---|---|---|
| **规划期**（正文前，仅无 authored plan） | decision `evaluateDecisions` | orchestrator.js:233 | ctx + intent | 内部 replan ≤ maxReplan(3) | ✅ 有界 |
| | conflict `evaluateConflict` | orchestrator.js:252 | ctx + intent | 同上 | ✅ 有界 |
| **章级**（正文后，两路径共用） | consistency `checkConsistency` 六维 | chapter-pipeline.js:48 | **ctx（characters / state['时间'] / timeline / worldBible）** | `return pass:false` **无 replanIntent** | ❌ 终端停 |
| | metrics `analyzeMetricsFeedback` | chapter-pipeline.js:63-71 | chapterText + intent | `needsReplan` → replanIntent | ✅ 有界 |
| | critic `runCritic` | chapter-pipeline.js:92 | chapterText + intent + metrics | `return pass:false` **无 replanIntent** | ❌ 终端停 |
| | validation `validateChapter` 八项 | chapter-pipeline.js:96-104 | intent + metrics + text | `fail` → replanIntent | ✅ 有界 |
| **场景级**（Studio） | SCENE_HARD_FAIL（writer 抛） | studio-llm-writer.js:491 → studio-orchestrator.js:208 | 防复读≥7字/身体禁令 | 章内场景重规划 ≤2 → 耗尽 `hardFail:true` | ✅ 有界 |
| | non-blocking scene pipeline | studio-orchestrator.js:261 → non-blocking-scene-pipeline.js | 有正文即 pass | analysisOnly（软分析） | — 不阻断 |
| **人类**（Studio 生产路径） | deferCommit → 作者 accept | routes.js:659 `/chapters/:n/accept` | 人类判断 | 不 accept 不 commit 不解锁下一章 | 人工 |

> 注：`force:true` 可绕过所有规则闸（诊断/测试闸，golden baseline 依赖，保留）。

---

## 2. 判据分界（谁读 facts，谁读 intent/text）——判定强度来源

| 闸 | 判据来源 | 判定性质 |
|---|---|---|
| **consistency**（character/timeline/world/knowledge/relationship/resource/ability 六维） | **ctx.characters / ctx.state['时间'] / ctx.timeline / ctx.worldBible**（= facts_db / timeline / anchor / state） | **世界真相**（规则、零 LLM） |
| validation 八项（plot/relationship/world/character/situation/new_goal/new_problem/dialogue） | intent + metrics + 正文（**不读 ctx facts**） | **推进校验**——「这章有没有推动故事」 |
| metrics（重复率/节奏等反馈） | chapterText + intent | 文学启发（规则） |
| critic（overall 打分） | chapterText + intent + metrics | 文学启发（规则） |
| decision/conflict | ctx + intent（规划期） | 规划期文学检查 |

**结论：今天唯一符合「World Truth Gate」定义（判据来自 facts_db/timeline/anchor/state）的闸是 `consistency`。** validation 名为「校验」实为推进门；metrics/critic 是文学启发。

---

## 3. 三轨权力模型（目标 · 已拍板）

```
                 Generated Chapter
                         |
          +--------------+--------------+
          |                             |
          v                             v
   World Truth Gate             Story Progress Gate
      （Hard）                     （Hard-ish）
   「这件事有没有违反世界？」    「这一章有没有发生有效变化？」
   判据：facts_db / timeline /   判据：chapter intent / state delta
         anchor / state
          |   fail 分级               |   fail 有界
          |                           |
          +-------------+-------------+
                        |
                        v
              Recovery Bridge → RecoveryIntent（见 17）
              recoverable → 有界恢复；terminal → stop
                        |
                        v
              Soft Review（不阻断 · suggestions[]）
   「写得好不好？」→ 节奏/情绪/文学性（metrics / critic）
                        |
                        v
              写回待审计 / 报告（人可看，不判死刑）
```

### 三轨定义

| 轨 | 回答的问题 | 检查 | 判据来源 | 阻断权限 |
|---|---|---|---|---|
| **World Truth Gate**（Hard） | 这件事有没有违反世界？ | 时间 / 事实 / 状态 / 人物存在 | facts_db / timeline / anchor | 唯一可「判死刑」的闸（但分级，见 §6 D1） |
| **Story Progress Gate**（Hard-ish） | 这一章有没有发生有效变化？ | 状态变化 / 目标推进 / 冲突结果 | chapter intent / state delta | 有界阻断（失败可恢复，不判死刑） |
| **Soft Review** | 写得好不好？ | 节奏 / 情绪 / 文学性 | critic / metrics | **无阻断权**，只给 suggestions[] |

---

## 4. 最终权限表（已拍板）

| 模块 | 权限 | 归位后角色 |
|---|---|---|
| **Consistency** | World Truth Gate（Hard） | 唯一真相闸；失败分级（recoverable / terminal） |
| **Validation** | Story Progress Gate（Hard-ish） | 有界阻断；保留「防空转章」责任 |
| **Metrics** | Soft Review | 取消阻断权：质量信号 ≠ 生成合法性，`fail → recommendation` |
| **Critic** | Soft Review | 取消阻断权：`pass/fail` → `suggestions[]`（文学建议不是事实裁判） |
| **Decision** | Planning advisory | 规划期建议（仅无 authored plan 运行） |
| **Conflict** | Planning advisory | 规划期建议（同上） |
| **SCENE_HARD_FAIL** | World Truth Gate（场景级） | ✅ 已是正确形态：writer 硬约束 → 有界恢复 → 耗尽停止 |
| **non-blocking scene** | Soft Review（场景） | ✅ 已是目标范例：有正文即 pass |
| **作者 accept** | 人类权威闸（最高） | 唯一保留的文学否决权（Studio 生产路径） |

---

## 5. 两个结构性发现（本次核查的硬证据）

### 5.1 软闸有硬权：critic 是「文学启发」却拥有「终端停」
- chapter-pipeline.js:92 —— critic 失败 `return pass:false`，**无 replanIntent、无降级**。它既不是世界真相闸，也没有恢复预算，是今天**最硬的一个软闸**。
- 后果：一次启发式打分不过，整章直接失败（两路径同用 chapter-pipeline，Studio 也受影响）。
- 拍板后：critic 归 Soft Review，`pass/fail` → `suggestions[]`。

### 5.2 硬闸无恢复：Recovery Bridge 今天挂错对象
- 今天触发 replanIntent 的两个来源是 **metrics（:63-71）和 validation（:96-104）**——按 §2 分界，它们都是**文学/推进类**闸（软闸）。
- 唯一符合 World Truth Gate 定义的 **consistency（:48）失败是终端停**——不产生 replanIntent，直接死。
- 即：**软闸有恢复、硬闸无恢复**，与目标契约正好相反。

---

## 6. 决策点拍板记录（2026-08-19，三项全定）

### D1：consistency 接 Recovery Bridge —— ✅ 接，但分级（不是所有 consistency fail 都恢复）

```
Consistency Failure
        |
        +-- recoverable ──> RecoveryIntent { reason: timeline_conflict, scope: scene, nextAction: retry_scene }
        |
        +-- terminal ──> RecoveryIntent { reason: world_truth_violation, scope: chapter, nextAction: stop }
```

| 分级 | 例子 | 语义 |
|---|---|---|
| **recoverable** | 场景顺序错了 | 重新生成当前场景（`retry_scene`） |
| **terminal** | 已杀死的人物突然出现且无解释 | 停止（**不让 Runtime 无限修**） |

> **Hard Gate 进入 Recovery Bridge，但 Hard Gate ≠ 自动重生成。**

### D2：validation / metrics / critic 是否降为非阻断 —— ✅ 拆开处理

| 模块 | 拍板 | 理由 |
|---|---|---|
| **metrics** | 取消阻断权 → Soft Review | 质量信号 ≠ 生成合法性；`fail → recommendation` |
| **critic** | 取消阻断权 → Soft Review | 权限错配；critic 是文学建议不是事实裁判；`pass/fail` → `suggestions[]` |
| **validation** | **保留有限阻断权** | 承担「CLI 防空转章」真实责任，不简单并入 Soft Review |

### D3：validation 归位 —— ✅ 第三轨 Story Progress Gate（不并入 Soft Review）

- 回答「这一章有没有发生有效变化」，检查状态变化/目标推进/冲突结果，判据来自 chapter intent / state delta。
- 权限：Hard-ish（有界阻断 + 有界恢复，不判死刑）。

---

## 7. Recovery Bridge 目标接线（现状挂偏 → 目标接线）

```
现状（挂偏）：
   validation/metrics ──> replanIntent        （软闸触发恢复；consistency 死）
目标：
   World Truth Gate ──┬─> 分级恢复 / stop
   Story Progress Gate ┘─> RecoveryIntent     （硬闸触发恢复；Soft Review 不触发）
```

- 接线变化是**契约层面**（17 的 reason 白名单随之扩展），代码不动、replanIntent 名称不动。
- 触发 D1 时才会用到 17 §11 的 `_replanSource` 结构化小修。

---

## 8. 对 2.4 的边界约束（Chapter Director 无权裁判世界规则）

2.3 之后，Chapter Director 的契约边界已经清晰：

```
Chapter Director 负责： 「这一章应该发生什么变化」        （Chapter Intent Authoring Layer）
Chapter Director 无资格： 「这一章是否符合世界规则」      ← 那个权力属于 Gate（consistency）
```

进入 2.4 时：Chapter Intent 四问（who_wants_what / who_blocks / what_changes / what_cannot_rollback）是**意图生产**契约；合法性由 §3 三轨闸在生成后裁决，不混入意图层。

---

## 9. 明确不做（2.3 边界）

- **不删/不合并 validator 实现**——只收敛出口角色（文档层面已定，代码零改动）。
- **不改 critic/metrics/validation 的阻断代码**——权限收敛属于代码阶段（各闸归位需在 2.x 后续或代码阶段实现，先文档）。
- **不提前改 17 §11 结构化**——除非 D1 进入实现。
- `force:true` 绕过保留（诊断/测试闸，golden baseline 依赖）。
- 人类 accept 闸不在收敛范围（唯一应保留的文学否决权）。

---

## 10. 变更记录

- 2026-08-19 起草 v1（否决权全景 + 判据分界 + 三层契约 + 归位差距 + 3 决策点）。
- 2026-08-19 v2 通过：三项拍板全录（D1 分级接桥 / D2 metrics、critic 降软评 + validation 保留 / D3 第三轨 Story Progress Gate）；三轨权力模型定稿；Recovery Bridge 目标接线；2.4 边界约束。
