# 25. Phase 2.10 — Negative-Space Audit（✅ 已通过 = Phase 2 收口闸 + 最小故事内核 + Architecture Freeze）

> 日期：2026-08-19 ｜ 状态：**✅ 已通过（用户拍板）＝ Phase 2 最重要的闸** ｜ 性质：契约文档（先文档后代码）→ Phase 3 转场令
> **审计问题（用户定）**：这套减法之后，InkOS 是否真的已经只剩下「故事不可缺少的状态与约束」？
> **方法（用户定）**：对 `Canon / Character / Chapter / Scene / Beat / State / Gate` 做 **negative-space audit**——每一个剩下的东西，删掉以后，哪个真实故事能力会立刻消失？答不出 → 待删名单。
> **Phase 2 结论（拍板）**：**Phase 2 收口，进入 Phase 3（Core Reduction）。**

---

## 0. 一句话定位

> 2.2-2.9 是「恢复职责边界 + 删除语义重复」。2.10 是**验证幸存者是否每个都承重**，并由此产出 **InkOS 最小故事内核** + **Architecture Freeze**。这不是「看起来重要」的保留，而是完成了负空间证明：**删除它 → 某个真实故事能力立即消失。**

---

## 1. 审计判据（用户定）

```
对每个剩下的东西：
  「删掉它，哪个真实故事能力会立刻消失？」
  答得出 → 保留（架构冻结）
  答不出 / 答案是「非故事能力」（UI 数字/诊断时间线/作者可见性）→ 待删候选
```

> 继承红线（2.9）：「缺失的边」不是缺陷；同理「多余的边角源」也不是立即删除理由——先过 2.6 警告（删除 ≠ 减复杂度），Phase 3 逐个用真实消费者证据确认。

---

## 2. 七概念负空间证明表（全部答得出 → 架构冻结保留清单成立，拍板 D27 ✅）

| 概念 | 当前形态（file:line） | 删除后消失的真实故事能力 | 结论 |
|---|---|---|---|
| **Canon** | `story_dna.yaml` / `13_facts_db.yaml` / `11_timeline.yaml` / anchors | 跨章稳定事实 + 角色稳定动机的**唯一源**；F013 身体禁令硬执行（beat-continuity.js:680） | ✅ **保留**——故事分叉空间崩塌，连续性主干消失 |
| **Character** | Character Intent（desire/fear/hiddenNeed/transformation），scene-execution:89 从 canon 现推 | Writer 的「角色为什么行动」——角色行动无动机、无变化弧 | ✅ **保留**——角色变纸片 |
| **Chapter** | Chapter Intent 四问（goal/conflict/turningPoint/irreversibleChange）= chapter_plans 散文 | 章目标/章冲突/不可逆变化——场景的方向源 | ✅ **保留**——场景无方向 |
| **Scene** | Scene execution input（scene plan + situation 三维 before→after） | 场景级状态变化驱动（每 scene ≥2 维变化，2.5 原则） | ✅ **保留**——场景无局势推进 |
| **Beat** | Beat Contract（position/beforeState/action/afterState/change） | **故事发动机**：`change = After − Before`（2.5 第一原则） | ✅ **保留**——逐拍推进消失 |
| **State** | anchors / facts_db / situation（状态变化通道，2.6 §4 保护清单） | 跨章连续性 + 状态变化传导（Story Event→Anchor→Continuity） | ✅ **保留**——每章失忆 |
| **Gate** | World Truth（consistency 硬闸）/ Story Progress（validation 有界阻断）/ Soft Review（不阻断建议） | **阻止世界规则违反 / 连续性断裂 / 空转章**的硬防线（2.3 权力地图） | ✅ **保留**（前两闸）；Soft Review = 可观测层 |

---

## 3. 拍板记录（2026-08-19，三项全定）

| 决策 | 结果 |
|---|---|
| **D27** 七概念负空间证明 | ✅ **InkOS 最小故事内核成立**。这七个成为架构骨架：`Canon / Character / Chapter / Scene / Beat / State / Gate`。每个概念对应一句故事能力：**Canon=世界允许什么 / Character=谁为什么行动 / Chapter=这一章要发生什么不可逆变化 / Scene=变化在哪里发生 / Beat=变化如何一步步发生 / State=变化留下什么 / Gate=什么不能被违反**。合起来 =「人物有目的 → 做选择 → 遭遇阻碍 → 产生结果 → 状态改变 → 故事继续」 |
| **D28** 待删名单 | ✅ **候删清单成立，但只是「删除候选」，不是删除命令**。**先证明「删除后没有故事能力损失」，再删除。** 尤其 09/08：它们属于 **Author View（作者可见性/诊断/UI）**，不是 Writer→Story State——**把 Story State 和 Author View 分离，而不是把 Author View 当死代码删除** |
| **D29** 架构冻结 | ✅ **升级为真正的架构铁律**（见 §5） |

### 候删清单（Phase 3，先证据后删）

```
Phase 3 待删候选（删除风险从低到高）：
  1. 05_relationship_graph / 06_knowledge_matrix（零内容贡献）  → ✅ P3.1 已删（2026-08-19）
  2. state_machine.yaml（空转，零读写）                         → ✅ P3.1 已删（2026-08-19）
  3. 07_state_board（Studio 零读零写；CLI legacy——删前确认 CLI 无硬依赖）  ← ⬜ 未排期
  4. decision/scene/conflict_history.yaml（历史文件，写端已清）  → ✅ P3.1 已删+清写端（2026-08-19）
  5. story_health.json（退役持久化，保留 Author View 实时计算）  → ✅ P3.1b 选 B 已落（2026-08-19）
  6. 09_current_chapter.md（generation 冗余——**作者可见性，分离不删除**）
  7. 08_current_state.md（generation 冗余——**作者可见性，分离不删除**）
```

> ⚠️ 每条删除前过 2.9 五问 + 2.6 警告，用真实消费者证据确认，不凭「看起来没用」。
> ✅ P3.1 删除记录见 `26_phase3_cleanup.md`（负向删除证明 + FOLLOW-UP 登记 + P3.2 审计范围）。
> 注：P3.1 起弃用「零读者」，统一用 **Content Contribution Test**（是否贡献故事语义）。05/06 实为「零内容贡献」而非「零读者」。

---

## 4. InkOS 最小故事内核图（拍板定稿，单图）

```
                 ┌──────────────┐
                 │    CANON     │
                 │ 世界真实约束 │
                 └──────┬───────┘
                        │
                        ▼
                 ┌──────────────┐
                 │  CHARACTER   │
                 │ 欲望 / 恐惧  │
                 │ 选择 / 行动  │
                 └──────┬───────┘
                        │
                        ▼
                 ┌──────────────┐
                 │   CHAPTER    │
                 │ 本章发生什么 │
                 │ 不可逆变化   │
                 └──────┬───────┘
                        │
                        ▼
                 ┌──────────────┐
                 │    SCENE     │
                 │ 局部冲突与变化│
                 └──────┬───────┘
                        │
                        ▼
                 ┌──────────────┐
                 │     BEAT     │
                 │ Action       │
                 │ Resistance   │
                 │ Consequence  │
                 └──────┬───────┘
                        │
                        ▼
                     WRITER
                        │
                        ▼
                 ┌──────────────┐
                 │     GATE     │
                 │ 世界真相     │
                 │ 连续性       │
                 │ 空转检测     │
                 └──────┬───────┘
                        │
                        ▼
                 ┌──────────────┐
                 │    STATE     │
                 │ 新事实 / 后果│
                 └──────┬───────┘
                        │
                        └──────────→ 下一 Scene / Chapter
```

> **这张图里特别重要的变化（拍板定稿）**：
> **Prompt 不在核心架构里。Planner 不在核心架构里。Metrics 不在核心架构里。Director 不在核心架构里。**
> `Brain / Runtime / Prompt Compiler / Planner / Director / Metrics / Memory` 都是**实现手段**，不是**故事本体**。

---

## 5. Architecture Freeze（拍板，真正的架构铁律）

> **Phase 2 Architecture Freeze：任何新增抽象、字段、状态、Validator、Director、Prompt Layer，必须证明它属于七个核心概念之一，并通过 Negative-Space Test；否则不得进入生产架构。**

再加一条：

> **「帮助模型更聪明」不是新增架构层的充分理由。**

只有下面这种理由才够：

```
删除它
↓
真实故事能力消失
```

---

## 6. Phase 3 — Core Reduction（拍板启动令）

> **Phase 2 收口。不建议继续 2.11/2.12。正式进入 Phase 3。**

按风险从低到高：

### P3.1 删除零读者状态 — ✅ CLOSED（2026-08-19）
`history.yaml` / `story_health` / 空文件 / `state_machine` 已全部删除 + 写端/导出端清理。负向删除证明全绿（executionPlan/promptFingerprint/pipeline/5 闸门 byte-identical；memoryMutation.added 精确移除 7 目标）。**证明：这些状态不是 Story Truth，也不是生成必需的中间状态。** 完整记录见 `26_phase3_cleanup.md`。

### P3.2 清理冗余状态槽
> **P3.2 目标重新定义（用户拍板）：不是「继续删字段」，而是「找出同一个 Story Truth 被存储两次、三次、五次的地方」。** P3.1 证明「减法不会伤故事」；P3.2 要证明「一个故事事实不应该拥有五个名字」。

重点审计：`characterDesire / priorityGoal / push / fear / choice`、`chapterGoal / authorIntent / sceneGoal / priorityGoal`、`scenePlan / executionPlan` 的重复存储，以及 `derive → 回写 → 再派生` 链（违反 D22 单向数据流铁律）。**这一刀会直接减少 Prompt 重复。** 审计范围与判据见 `26_phase3_cleanup.md`。

### P3.3 修正 Story Truth
最终形成 `Canon / Character / Chapter / Scene / Beat / State`——**每个核心事实只有一个 owner**。

### P3.4 处理 narrative-runtime
不是「删除整个 narrative-runtime」，而是：
```
死：NarrativeRuntime / NarrativeState / NarrativeBeat / 状态机
活：EMOTION_WAVE / validateEmotionWave / suggestNextEmotion / assertInformationGapMeaningful
```
把活能力迁到正确 owner。

### P3.5 最后才动 Prompt
因为已知：**Prompt 重复不是 Prompt 的根因，根因是 State / Intent 重复。**
```
State 减法 → Intent 收敛 → Prompt 自然变薄
```
不是反过来手工删 Prompt。

---

## 7. Phase 3 核心 KPI（拍板定稿）

> InkOS 的问题**不是缺少「故事智能」**，而是：
> **同一个故事事实被系统用不同名字、不同结构、不同 Prompt 块重复解释了太多次。**

因此 Phase 3 的 KPI **不是**：
```
删除多少文件 / 删除多少行代码 / 减少多少模块
```
而是：
```
一个故事事实 → 有几个 owner？
              → 经过几个中间翻译？
              → 最终有几个地方重新解释它？
```

最终目标接近：
> **One Story Truth → One Owner → 必要的 Projection → Writer**

做到这一点，InkOS 才真正从「复杂的小说生产流水线」变成**故事驱动引擎**。

---

## 8. 明确不做（2.10 边界）

- **不新增抽象**（Architecture Freeze，§5）。
- **不立即删除任何待删候选**（D28：先证明无故事能力损失再删）。
- **不重开已冻结的概念**（七概念保留清单是审计结果，不是重新设计的入口）。
- **不把 Author View 当死代码删除**（09/08 分离出 Story State，属作者可见性/诊断）。

---

## 9. 变更记录

- 2026-08-19 起草 v1：审计判据 + 七概念负空间证明表 + 边角源负空间 + 待删名单 + D27-D29 决策点。
- 2026-08-19 v2 通过：D27（最小故事内核 + 概念→能力映射）/ D28（候删清单，Author View 与 Story State 分离）/ D29（Architecture Freeze 铁律 +「帮助模型更聪明不是理由」）；InkOS 最小故事内核单图（Prompt/Planner/Metrics/Director 不在核心架构）；Phase 3 Core Reduction 启动（P3.1-P3.5 风险排序）；Phase 3 核心 KPI（一个故事事实几个 owner，目标 One Story Truth → One Owner → Projection → Writer）。
