# InkOS Next Phase Execution Roadmap

## Document Purpose

本文件定义 InkOS 从：

> F-Series 防御型生成系统

升级到：

> Story Survival System（故事生存系统）

的完整执行路线。

本阶段禁止无目标增加模块。

所有开发必须围绕：

```
Reality
 ↓
Actual Event
 ↓
State Evolution
 ↓
Character SR
 ↓
Choice Formation
 ↓
Action
 ↓
Consequence
 ↓
Future Story State
```

这一核心生命链展开。

---

# 一、当前系统状态（Baseline）

## 已完成能力

### 1. Prompt / Context 防御体系

已完成：

* F1 Story Clock Survival
* F2 Final Context Viewer
* F3 Provenance
* F4 Entity/Knowledge Hygiene
* F5 Time Contract
* F6.2 Observed Continuity Bridge
* F6.3 OC Audit
* F7.1 Beat Semantic Hardening
* F8.3 Plan Validity
* RF-01 Prose Boundary Gate

状态：

```
PASS WITH KNOWN LIMITATIONS
```

---

## 当前最完整生产路径

```
Studio UI

↓

studio-orchestrator

↓

Plan Validity

↓

Director

↓

Beat Execution

↓

Prompt Compiler

↓

OC Injection

↓

Writer

↓

RF-01 Gate

↓

Validation

↓

Persist Actual
```

---

# 二、当前核心问题

## P0 问题

## 1. Plan 仍然影响 Reality

当前风险：

```
Plan
 ↓
Plan
 ↓
Writer
```

而正确：

```
Actual
 ↓
State
 ↓
Next Plan
```

---

## 2. Prompt Hard 不是真正 Hard

当前：

```
Prompt Rule

↓

LLM 自觉遵守
```

问题：

LLM 可以违反。

必须升级：

```
Rule

↓

Validator

↓

Reject / Retry
```

---

## 3. Character 还没有真正活起来

当前：

有：

* Character
* State
* Memory

但是没有：

```
Character Subjective Reality

↓

Choice

↓

Action
```

---

## 4. 未结算叙事压力没有成为系统状态

当前：

发现：

* Choice disappearance
* Conflict disappearance
* Cliffhanger evaporation

但是：

只能审计。

不能阻止。

---

# 三、最高优先级原则（冻结）

## Principle 1

# Actual First

唯一事实来源：

```
scene.text

↓

Actual Event

↓

State Update
```

禁止：

任何：

```
Plan closingWorldState
```

进入下一场事实判断。

---

# Principle 2

# Projection Cannot Create Reality

以下只能读取：

不能写事实：

* OC
* Summary
* Memory
* SR Projection

---

# Principle 3

# Writer Is Renderer

Writer 不负责：

* 决定事件
* 修改世界
* 创建因果

Writer:

```
Story State

↓

Narrative Text
```

---

# Principle 4

# One Production Path

最终：

所有生成必须：

```
Runtime

↓

Unified Scene Pipeline

↓

Gate Stack

↓

Writer

↓

Validation
```

禁止：

* legacy writer
* bypass writer
* debug writer

直接生产正文。

---

# 四、执行阶段

---

# Phase 1

# Actual Event Foundation

## 目标

建立真正事件层。

---

## 新增核心对象

路径建议：

```
packages/inkos-brain/src/events/
```

新增：

```
story-event.js
event-extractor.js
event-validator.js
```

---

## StoryEvent Schema

示例：

```yaml
event:

id:

sceneId:

actors:

action:

intent:

consequence:

stateChanges:

affectedEntities:
```

---

## 执行要求

Scene 完成后：

必须生成：

```
Actual Event
```

否则：

禁止进入下一章。

---

## 验收

测试：

```
npm run test:event-foundation
```

必须证明：

删除 Plan 后。

系统仍能恢复：

* 世界状态
* 人物状态
* 下一场输入

---

# Phase 2

# State Evolution Engine

## 目标

统一所有状态写入。

---

当前：

多个地方修改状态：

需要统一：

```
state-updater
```

成为唯一入口。

---

结构：

```
Actual Event

↓

State Evolution

↓

World

Character

Relationship

Thread

SR
```

---

禁止：

其他模块直接：

```
write timeline
write character
write memory
```

---

验收：

所有 state mutation 有 provenance。

---

# Phase 3

# Minimal SR Runtime Integration

## 目标

让角色拥有主观现实。

---

新增：

```
CharacterSR
```

结构：

```yaml
knowledge:

belief:

interpretation:

stance:

relevance:
```

---

数据来源：

Reality Event

↓

Perception

↓

Interpretation

↓

SR Update

---

注意：

不要实现：

* 人格模拟
* 情绪模拟
* 全心理模型

第一阶段只需要：

“角色为什么认为如此”。

---

验收：

同一个 Reality。

不同 SR。

产生不同 Choice。

---

# Phase 4

# Choice Formation Engine

## 目标

实现 InkOS 核心能力。

---

链：

```
SR

↓

Access

+

Agency

↓

Choice
```

---

L1：

判断：

是否是真正选择。

---

规则：

INVALID:

* Subject Absence

VALID:

* External Constraint
* Pressure
* Irrational Choice

仍然有效。

---

验收：

必须区分：

```
被迫选择

vs

没有主体存在
```

---

# Phase 5

# Choice → Action → Consequence

## 目标

建立故事因果。

---

新增：

```
Consequence Engine
```

---

每个 Action：

生成：

```yaml
consequence:

immediate:

delayed:

stateImpact:
```

---

链：

```
Choice

↓

Action

↓

Consequence

↓

State Update

↓

Next Scene
```

---

验收：

改变 Choice。

未来剧情必须不同。

---

# Phase 6

# Narrative Survival System

## 目标

解决最大文学失败：

故事承诺消失。

---

新增：

```
Open Loop Ledger
```

---

记录：

## Choice

## Promise

## Threat

## Question

---

状态：

```
OPEN

PRESSING

PAID

TRANSFORMED

ABANDONED
```

---

规则：

OPEN LOOP:

不能无理由消失。

---

例如：

上一场：

```
跟我走还是留下？
```

下一场：

必须：

1. 回答

或者

2. 明确延期

否则：

Reject。

---

验收：

Ch2 S3 类失败无法再次发生。

---

# Phase 7

# Director Actual Migration

## 修改：

禁止：

```
Director.before

=

Plan closingWorldState
```

改：

```
Actual Projection
```

---

输入：

```
Previous Actual

+

OC

+

Current SR

+

Open Loop
```

---

验收：

Plan 不再可以覆盖现实。

---

# Phase 8

# Chapter Long Continuity

## 目标

形成长篇生命。

---

统一：

```
Scene

↓

Chapter State

↓

Character Arc

↓

Story Thread

↓

Plant Payoff
```

---

新增：

Character Arc Tracker

记录：

```
Experience

↓

Interpretation

↓

Belief Change

↓

Choice Change
```

---

验收：

20章后：

可以解释：

人物为什么变化。

---

# Phase 9

# Hard Literary Validation

## 目标

从：

一致性

进入：

文学质量。

---

Validator 增加：

## Causality

角色行为是否合理。

---

## Value Shift

场景是否改变价值状态。

---

## Payoff

承诺是否处理。

---

## Emotional Movement

情绪是否变化。

---

输出：

```
PASS

REVISE

REJECT
```

---

# Phase 10

# Reader Layer

最后实现。

---

新增：

三层知识：

```
Reality

Character Knowledge

Reader Knowledge
```

---

能力：

* Suspense
* Surprise
* Dramatic Irony
* Reveal

---

# 五、明确禁止事项

在 Phase 1-6 完成前：

禁止：

## 1.

增加更多 Prompt Layer。

原因：

当前问题不是 Prompt 少。

---

## 2.

增加更多 Beat 模板。

原因：

Beat 不是核心缺陷。

---

## 3.

继续优化 Writer Style。

原因：

Writer 不是当前瓶颈。

---

## 4.

开发 UI 新功能。

原因：

核心闭环未完成。

---

# 六、最终目标状态

完成后：

InkOS 架构：

```
Reality Engine

↓

Actual Event System

↓

State Evolution Engine

↓

Character SR

↓

Choice Formation

↓

Action

↓

Consequence

↓

Story Memory

↓

Chapter Evolution

↓

Reader Model

↓

Writer Rendering
```

---

# 七、最终验收标准

InkOS 达成目标必须回答：

## 世界

> 发生了什么？

---

## 人物

> 为什么这个角色会这么做？

---

## 选择

> 这是角色选择还是作者安排？

---

## 因果

> 如果角色选择不同，未来是否改变？

---

## 连续性

> 20章后故事是否仍然自洽？

---

## 文学

> 为什么读者会继续读？

---

# 八、开发顺序最终裁决

必须严格：

```
1. Actual Event Foundation

2. State Evolution Engine

3. Minimal SR Runtime

4. Choice Formation

5. Consequence Engine

6. Open Loop Ledger

7. Director Actual Migration

8. Long-term Continuity

9. Literary Validation

10. Reader Layer
```

---

## 最终定义

InkOS 不再是：

```
LLM + Prompt + Memory
```

而是：

```
A narrative simulation system where
characters perceive,
choose,
act,
change the world,
and create their own future.
```

---

这份路线作为执行总纲即可。每完成一个 Phase，都必须先做 **Architecture Audit + Test Evidence + Failure Case Replay**，不能直接进入下一阶段。
