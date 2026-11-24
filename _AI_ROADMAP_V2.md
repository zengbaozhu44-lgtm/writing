# InkOS V2.0 FINAL ROADMAP

## System Execution Bus Update — 2026-09-21

**宏观状态：`V2.0 FINAL ROADMAP — FROZEN`**

> 本次更新不改变 Phase 0–10 的名称、顺序、编号、边界与宏观结构。
>
> 本次更新仅同步：
>
> 1. EO-CW-Formation-01 的最新完成状态；
> 2. Character World vertical slice 的下一阶段执行重点；
> 3. Character-specific World Self-Projection 作为当前 Character World 核心验证目标；
> 4. Outline Revision → World/Character/Faction/Relationship/Time 等现有 carrier 的同步要求；
> 5. 正式生产后允许继续修改大纲的 Revision / Impact 思路；
> 6. 已生成正文的保留、局部补救、重写边界；
> 7. WL-01 前置 Outline/World/Character Sync + Self-Projection Archaeology；
> 8. TOTAL STORY ROUTE CONTINUOUS EXECUTION CONTROL 的上游输入完整性优先原则。

---

# 一、执行状态更新

| Item                                       | State                                                             |
| ------------------------------------------ | ----------------------------------------------------------------- |
| Phase 4 overall                            | **OPEN / NOT SEALED**                                             |
| 4.4.1d-R AA20                              | **SEALED**                                                        |
| #41 FAILURE-041-001                        | **QUALIFIED / UNFIXED**                                           |
| DG-042 (#42)                               | **SEALED**                                                        |
| #35 Choice                                 | **NOT PROVEN**                                                    |
| H2 #43                                     | **BINDING**                                                       |
| H3 #44/#45                                 | **SEALED**                                                        |
| L1 Production Evaluation                   | **IMPLEMENTED / VALIDATED**                                       |
| L1 Access Production                       | **IMPLEMENTED / VALIDATED**                                       |
| L2 Dominance                               | **NEGATIVE BOUNDARY SEALED / POSITIVE FACTOR SEMANTICS DEFERRED** |
| L2-C                                       | **BLOCKED**                                                       |
| Choice runtime                             | **NOT PROVEN**                                                    |
| Phase 5–10                                 | **FROZEN / NOT STARTED**                                          |
| Character World Contract                   | **FROZEN**                                                        |
| Character World Store + Seed               | **IMPLEMENTED / VALIDATED**                                       |
| Character World Projection                 | **IMPLEMENTED / VALIDATED**                                       |
| Character World T2 Trace                   | **IMPLEMENTED / VALIDATED**                                       |
| **Character World T3 Formation**           | **IMPLEMENTED / VALIDATED — EO-CW-Formation-01 COMPLETE**         |
| T4 Disposition                             | **NOT IMPLEMENTED**                                               |
| Automatic Goal / Desire / Choice formation | **NOT IMPLEMENTED**                                               |

### 当前执行指针

EO-CW-Formation-01 已完成。

因此当前执行不再停留于：

```text
T2 → T3
```

而进入：

```text
TEST
→ REGRESSION
→ FORMAL PRODUCTION
→ LITERARY VALIDATION
→ TOTAL STORY ROUTE RESCAN
```

在此之后，必须寻找新的：

```text
FIRST REAL BLOCKER
```

---

# 二、TOTAL STORY ROUTE CONTINUOUS EXECUTION CONTROL

继续保持：

```text
完成当前 EO
    ↓
扫描完整 Story Truth Route
    ↓
寻找 FIRST REAL BLOCKER
    ↓
若下一步可由冻结契约 + 已有语义安全推出
    → 最小实现并继续
    ↓
若存在真正语义歧义 / 多重解释 /
Human Adjudication / Named EO 缺失 / Authority 缺失
    → STOP
```

但新增一个优先级：

> **在继续生产前，优先检查是否存在阻断 Character World 形成的上游输入 / 同步 / Projection 问题。**

因此：

```text
DEFINED / NOT AUTHORIZED
≠ blocker

未来 Phase 存在
≠ blocker

某模块尚未实现
≠ blocker

但：

最新作者世界无法同步
或
角色无法形成自己的 World Projection
或
不同角色被错误地共享同一世界认知

= 当前生产路径上的真实 blocker
```

---

# 三、Character World 当前核心目标升级

Character World 不成为 Macro Phase。

但其当前建设目标进一步明确为：

# Character-specific World Self-Projection

最终需要证明：

> **作者不断修改、扩展、生成的世界、角色、势力、关系、时间、地点、经历等信息，能够在合法 Character Access 与 Information Boundary 下，形成每个角色自己的持续世界模型，并通过 Projection 形成角色自己的 SR(t)。**

因此：

```text
GLOBAL WORLD
    ≠
CHARACTER WORLD
    ≠
CURRENT SR
```

---

# 四、Character World 的最终目标不是“更多世界资料”

World Life、NPC、时间、势力、关系、日常信息本身不是最终目标。

它们只是：

```text
WORLD INPUT
```

真正需要观察的是：

```text
World Input
    ↓
Character Access
    ↓
Character Experience / Knowledge
    ↓
Character World
    ↓
Projection / Activation
    ↓
Character SR(t)
    ↓
Writer
```

最终文学问题是：

> **这些输入是否真的让角色拥有了一个“自己的世界”？**

而不是：

> 数据库里是否多了几个字段。

---

# 五、Character-specific World Self-Projection 定义

角色自己的 World Projection 至少允许包含：

### 1. 世界认知

角色合法知道哪些世界事实。

### 2. 空间世界

角色熟悉哪些地点、进入过哪些地点、哪些地点陌生或危险。

### 3. 社会世界

角色认识谁、谁属于什么关系网络、谁属于什么势力。

### 4. 经历世界

角色真正经历过什么。

对应：

```text
T2 Episodic Experience
```

### 5. 解释世界

角色如何解释自己经历过的事情。

对应合法：

```text
T3 interpretation
T3 belief
T3 stance
```

### 6. 关系世界

角色对其他人物形成的、具有来源的关系认识。

### 7. Knowledge Boundary

尤其必须保留：

> **角色不知道什么。**

不能因为全局 World / Plan / Writer 知道某事实，就让角色自动知道。

### 8. 当前激活世界

Character World 不全部进入当前 SR。

当前 SR 仍由：

```text
Character World
+
Current ACTUAL
+
Character Access
+
Information Boundary
+
Current Context
```

形成有限 Projection。

---

# 六、同一个世界必须允许产生不同角色世界

永久保持：

```text
Shared Actual
≠ Shared Access
≠ Shared Perception
≠ Shared Interpretation
≠ Shared Character World
≠ Shared SR
≠ Shared Goal
≠ Shared Choice
≠ Shared Action
```

因此：

```text
同一个 ACTUAL
       ↓
不同 Character Access
       ↓
不同 Experience
       ↓
不同 Interpretation
       ↓
不同 Character World
       ↓
不同 Projection
       ↓
不同 SR
```

这是 Character World 的核心文学价值。

不得通过复制 Global World / World Bible 形成所谓 Character World。

---

# 七、Character World 与 T2 / T3 的关系

保持原冻结契约。

```text
T1 = Current SR

T2 = Episodic Experience

T3 = Durable Formation

T4 = Derived Disposition / Habit
```

### T2

回答：

> 我经历过什么？

必须：

* Actual-grounded
* Access-gated
* character-isolated
* append-only
* idempotent
* cross-chapter persistent
* provenance-bearing

不得把：

```text
T2 → Belief
T2 → Goal
T2 → Choice
T2 → Action
```

### T3

回答：

> 我因此形成了什么稳定认识？

当前合法：

```text
interpretation
belief
stance
```

仍不得：

```text
T3 → Goal
T3 → Desire
T3 → Choice
T3 → Action
```

---

# 八、大纲与 Character World 的新同步原则

正式生产中的大纲允许持续修改。

但必须严格区分：

```text
Authorial Revision
≠
Actual Revision
```

大纲可以修改：

* World design
* Character design
* Faction design
* Relationship design
* Time
* Location
* Chapter plan

并在合法范围内同步到已有 authored carriers。

但：

```text
Outline
→ Actual
```

不是合法自动边。

同样：

```text
Outline
→ Goal
→ Choice
→ Dominance
```

不得被 WL / Character World 工作顺手建立。

---

# 九、Outline Revision → Existing Carrier

未来正式目标：

```text
OUTLINE REVISION
        ↓
CHANGE SET
        ↓
AUTHORITATIVE EXISTING CARRIERS
        ↓
Character Access
        ↓
Character World
        ↓
Projection
        ↓
SR
```

至少需要调查并建立清晰映射：

| Outline 信息                    | 合法目标                   |
| ----------------------------- | ---------------------- |
| World Rules                   | World                  |
| Faction                       | Faction                |
| Character identity            | Character / World      |
| Relationship                  | Relationship Graph     |
| Time                          | Time / Plan / Timeline |
| Location                      | World / Plan           |
| Past experience               | 合法 CW / T2 来源          |
| Stable authored belief/stance | Authored Formation     |
| Current state                 | State                  |
| Chapter presentation          | Plan / Presentation    |

但：

```text
Goal
Desire
Choice
Dominance
Actual
```

不得因为“出现在大纲”就自动获得 Story Truth 权威。

---

# 十、正式生产开始后允许继续修改大纲

这是正式冻结原则：

> **大纲不是生产启动后不可修改的静态文件。**

允许：

```text
Outline v1
→ Production
→ Outline v2
→ Production
→ Outline v3
→ ...
```

但每次变化必须被理解为：

```text
AUTHORIAL REVISION
```

而不是：

```text
RETCON WITHOUT IMPACT
```

---

# 十一、已生成正文不得因为大纲修改自动废弃

正式生产后的正文至少需要区分：

```text
NO IMPACT

AFFECTED-BUT-COMPATIBLE

STALE

CONTRADICTED
```

### NO IMPACT

大纲变化不影响正文。

→ 保留。

### AFFECTED-BUT-COMPATIBLE

正文涉及相关信息，但新设定仍然兼容。

→ 保留。

### STALE

正文基于旧版本设定，但尚未产生直接矛盾。

→ 可以暂时保留，但未来生产不得继续把旧设定当作最新 Authorial Truth。

### CONTRADICTED

正文与新的 Authorial Design 发生明确冲突。

→ 进入 Repair / Regenerate。

---

# 十二、正文修复原则

未来目标：

```text
Outline Revision
      ↓
Change Set
      ↓
Impact Analysis
      ↓
Affected Objects
      ↓
Affected Scenes / Chapters
      ↓
KEEP / REPAIR / REGENERATE
```

默认优先：

```text
局部冲突
→ 局部修复

局部场景无法修复
→ Chapter-level regeneration

基础世界观发生大规模因果改变
→ 更大范围重写
```

不得：

```text
大纲改一个字段
→ 全书删除
```

也不得：

```text
大纲改一个字段
→ 历史正文自动被判定正确
```

---

# 十三、Actual 与 Character History 不得被静默覆盖

如果旧生产已经形成：

```text
Actual
```

或者角色已经合法形成：

```text
T2 Experience
T3 Formation
Character World history
```

新大纲不能直接覆盖它们。

例如：

```text
旧 Actual = 22:30
新 Outline = 23:30
```

不得直接：

```text
Actual := 23:30
```

必须：

```text
Revision
→ Impact Analysis
→ 保留旧历史
或
→ 重写相关 Scene
→ 重新生产新的 Actual
```

同理：

> 已形成的 Character Historical Experience 不能被新大纲静默删除。

---

# 十四、WL-01 当前执行前置条件

原 WL-01：

```text
Authored World + Time Grounding
```

暂不直接执行。

在 WL-01 前新增：

# Outline Revision / World-Character-Faction Synchronization + Character Self-Projection Archaeology

模式：

```text
READ-ONLY
ZERO CODE
ZERO SCHEMA
ZERO NEW ENGINE
```

必须回答：

### A. 最新大纲在哪里？

确认真正 Authoritative Outline 来源。

### B. 大纲修改了什么？

至少检查：

* World
* Character
* Faction
* Relationship
* Time
* Location
* Experience
* Character World grounding

### C. 修改后的信息目前能否同步？

逐项追踪：

```text
Outline
→ Existing Carrier
```

### D. Carrier 是否进入 Character Access？

确认：

```text
Global World
≠
Character Knowledge
```

### E. 是否能形成 Character World？

确认：

```text
Access
→ Experience / Knowledge
→ Character World
```

### F. 是否能形成不同 Projection？

确认：

```text
Character A
→ Projection A

Character B
→ Projection B
```

而不是：

```text
World
→ Same Context
→ All Characters
```

### G. Writer 最终消费什么？

必须仍然是：

```text
Character SR
```

而不是：

```text
Global World
Outline
Writer Reasoning
```

---

# 十五、WL-01 的 CW Seed 限制

如果同步审计确认确实需要 WL-01 增加少量 CW authored grounding：

只允许：

> **最小验证 grounding。**

不得借此：

* 扩张 Character World ontology
* 自动生成 T3
* 开启 T4
* 开启 Personality Engine
* 开启 Emotion Engine
* 开启 Goal Engine
* 开启 Desire Engine
* 开启 L2
* 开启 Choice

不得把：

> “人物变丰富”

本身作为新的 Truth。

---

# 十六、WL-01 的真正文学验证目标

不再以：

> “增加多少时间 / NPC / 日常信息”

作为最终目标。

真正观察：

### 1. World Continuity

世界是否持续存在。

### 2. Character Difference

不同角色是否形成不同世界理解。

### 3. Social Density

角色是否生活在社会关系中。

### 4. Temporal Continuity

时间是否自然流动。

### 5. Knowledge Boundary

角色是否保持“知道 / 不知道”的差异。

### 6. Character World Persistence

上一阶段形成的世界是否在后续仍然存在。

### 7. SR Projection Delta

同一个 Actual 对不同角色是否产生不同 SR。

### 8. Writer Realization

Writer 是否真正把这种差异写出来，而不是所有角色再次被写成同一种声音。

---

# 十七、Character World 的最终验证命题

未来所有 Character World 生产验证最终应能够回答：

> **同一个世界事实进入两个角色之后，他们是否拥有两个不同的世界？**

例如：

```text
ACTUAL:
老周深夜值班
```

不能只验证：

```text
World:
老周深夜值班
```

而应该观察：

```text
林逸 World:
老周 = 工作十几年、通常不多问的人

苏眠 World:
老周 = 一个可能影响行动路径的变量

镜渊 World:
老周 = 是否值得关注取决于其位置，而非林逸所理解的关系
```

这些不同理解必须有合法 provenance。

这才是：

> **Character-specific World Self-Projection。**

---

# 十八、当前执行顺序正式更新

```text
EO-CW-Formation-01
        │
        ▼
TEST
        │
        ▼
REGRESSION
        │
        ▼
FORMAL PRODUCTION
        │
        ▼
LITERARY VALIDATION
        │
        ▼
TOTAL STORY ROUTE RESCAN
        │
        ▼
Outline / World / Character / Faction
Synchronization Archaeology
        │
        ▼
Character Self-Projection Archaeology
        │
        ▼
DESIGN GATE
        │
        ▼
HUMAN SEAL（如必要）
        │
        ▼
NAMED EO
        │
        ▼
决定 WL-01 是否真正需要执行
        │
        ▼
WL-01 Authored World + Time Grounding
        │
        ▼
REGRESSION
        │
        ▼
REAL PRODUCTION
        │
        ▼
LITERARY VALIDATION
        │
        ▼
TOTAL STORY ROUTE RESCAN
```

---

# 十九、当前不允许发生的路线漂移

绝不因为“角色世界不够丰富”而直接建立：

```text
Personality Engine
Emotion Engine
Life Simulation Engine
Random Event Engine
Goal Engine
Desire Engine
Cognitive Engine
Choice Engine
```

也绝不：

```text
Outline
→ Goal
→ Choice
```

或：

```text
Writer
→ Character World
```

或：

```text
Global World
→ All Character SR
```

---

# 二十、核心防火墙继续有效

```text
Plan ≠ Actual

Plan ≠ Character Truth

Writer ≠ Truth Authority

Writer ≠ Character World Producer

Reality ≠ Belief

Experience ≠ Belief

Character World ≠ Canon

Character World ≠ Goal

Character World ≠ Choice

Character World ≠ Action

World ≠ Character World

Character World ≠ SR

SR ≠ Choice

Choice ≠ Survival

Survival ≠ Director

Occurrence ≠ Attribution

Attribution ≠ Choice

Choice ≠ Consequence

Coercion ≠ Subject Absence

L1 ≠ L2

Authorial Revision ≠ Actual Revision

Outline Revision ≠ Historical Erasure
```

---

# 二十一、当前路线判断

## Main Story Truth Route

保持：

```text
CANON
→ ACTUAL
→ INFORMATION BOUNDARY
→ PERCEPTION
→ INTERPRETATION
→ SR
→ ACCESS
→ L1
→ L2
→ CHOICE
→ ACTION
→ CONSEQUENCE
→ ACTUAL
→ STATE
→ SR
→ SURVIVAL
→ NEXT SCENE
→ WRITER
→ ACTUAL
```

不改变。

---

## Character World Route

现在正式明确为：

```text
ACTUAL
→ CHARACTER ACCESS
→ T2 EXPERIENCE
→ CHARACTER WORLD
→ T3 FORMATION
→ PROJECTION
→ CHARACTER SR
→ WRITER
```

并进一步验证：

```text
WORLD INPUT
→ DIFFERENT CHARACTER ACCESS
→ DIFFERENT CHARACTER WORLD
→ DIFFERENT PROJECTION
→ DIFFERENT SR
```

---

# 二十二、当前 FIRST REAL BLOCKER 判断原则

Character World 工作中：

> **“世界资料不足”本身不是自动要求新增架构。**

首先检查：

```text
CONTENT GAP
PRODUCER GAP
PIPELINE GAP
ACCESS GAP
PROJECTION GAP
WRITER REALIZATION GAP
```

只有证明：

> 现有 carrier 无法合法表达所需语义

才允许：

```text
Necessity
→ Archaeology
→ Design Gate
→ Human Seal
→ Named EO
→ Implementation
```

不得因为文学上“似乎需要”就直接新增 Truth Carrier。

---

# 二十三、当前北极星正式补充

InkOS 最终不是：

```text
Planner
+
Prompt Compiler
+
Choice Engine
+
Psychology Engine
+
Drama Manager
```

而是：

```text
WORLD
   ↓
ACTUAL
   ↓
CHARACTER ACCESS
   ↓
CHARACTER EXPERIENCE
   ↓
CHARACTER WORLD
   ↓
CHARACTER-SPECIFIC PROJECTION
   ↓
CURRENT SR
   ↓
REAL CHOICE
   ↓
ACTION
   ↓
CONSEQUENCE
   ↓
WORLD CHANGE
   ↓
NEXT EXPERIENCE
```

其中最重要的新表达是：

> **世界不是只有一个。**

客观世界只有一个现实来源，但：

> **每个角色都有一个受自身经历、Access、Information Boundary、Interpretation 和 Formation 约束的“自己的世界”。**

最终我们希望达到：

```text
同一个 WORLD
      ↓
不同人物
      ↓
不同人生历史
      ↓
不同 Access
      ↓
不同 Character World
      ↓
不同 SR
      ↓
不同 Choice
      ↓
不同 Action
      ↓
不同 Consequence
```

---

# 二十四、最终冻结声明

**V2.0 FINAL ROADMAP — FROZEN**

Phase 0–10：

> **不重编号、不改名、不拆分、不合并。**

Character World：

> **仍然不是 Macro Phase。**

Character World：

> **继续在冻结 Formation Contract 下通过 Named EO 逐层建设。**

新增的：

> **Character-specific World Self-Projection**

不是新的 Truth Carrier，也不是新的 Phase。

它是对现有：

```text
World
→ Access
→ T2
→ T3
→ Character World
→ Projection
→ SR
```

这条路线的**核心目标与验证命题**。

大纲：

> **允许持续修改。**

正文：

> **不因大纲修改自动废弃。**

Actual / Character History：

> **不得被大纲静默覆盖。**

未来修订：

> **Revision → Impact Analysis → Keep / Repair / Regenerate。**

最终目标：

> **不是让系统拥有更多世界资料，而是让每一个角色真正拥有一个属于自己的、持续生长、受信息边界约束、能够影响当前 SR 的世界。**

**V2.0 主结构保持冻结。**

**Current execution pointer：**

```text
Formation EO 完成
→ Regression / Production / Literary Validation
→ Outline Sync + Character Self-Projection Archaeology
→ Design Gate
→ 再决定 WL-01
```

**不得绕过上述顺序直接扩展 Character World / Goal / Choice / Cognitive Engine。**
