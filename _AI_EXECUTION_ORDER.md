# InkOS Next Phase Execution Order

本文件是 [`_AI_ROADMAP_NEXT_PHASE.md`](_AI_ROADMAP_NEXT_PHASE.md) 的可执行展开。

原则：

**每一步必须：审计 → 设计 → 小范围实现 → 测试 → 失败案例回放 → 冻结 → 下一步。**

目标：

将 InkOS 从：

```
F-Series Prompt Controlled Writing System
```

升级为：

```
Reality Driven Story Simulation System
```

---

# 总执行规则

## 每个 Phase 固定流程

所有阶段必须遵循：

```
STEP 0
当前状态调查

↓

STEP 1
设计影响分析

↓

STEP 2
定义最小实现

↓

STEP 3
代码修改

↓

STEP 4
自动测试

↓

STEP 5
真实失败案例回放

↓

STEP 6
生成 Audit Report

↓

STEP 7
冻结

↓

进入下一 Phase
```

## Phase 4+ 失败驱动协议（V2.0 引用）

当生产或文学出现 **REAL FAILURE** 时，优先走此链（**Read-only 阶段不得跳步写码**）：

```text
REAL FAILURE
  → FAILURE QUALIFICATION
  → READ-ONLY ARCHAEOLOGY / ROOT CAUSE
  → DESIGN GATE
  → Human Adjudication / Seal
  → NAMED EO（仅 Human 授权）
  → MINIMAL IMPLEMENTATION
  → REGRESSION
  → REAL LITERARY VALIDATION
  → COMPLETION REPORT
  → STOP
```

**必要性证明顺序（冻结）：**

```text
Irreducible Gap → Ontology → Design → Find Use → Necessity → Named EO
```

禁止：发现语义空洞 → 直接造 Goal/Survival/Consequence/Replay Guard 模块。

---

# Phase 0

# Production Path Consolidation

## 目标

先确认唯一生产入口。

当前问题：

存在：

* Studio Beat
* Runtime CLI
* Brain Legacy
* writer bypass

必须先知道：

谁是真正生产路径。

---

# Step 0.1

扫描：

```
packages/
apps/
bin/
cli/
```

寻找所有：

```
writer
generate
llm
scene
execute
```

入口。

---

输出：

建立：

```
_AI_AUDIT_PRODUCTION_PATH.md
```

内容：

```
入口名称:

调用链:

是否生产:

是否经过:

F8.3

RF-01

Validation

```

---

# 成功标准

必须得到：

一张完整入口地图。

例如：

```
Studio
 PASS

Runtime
 NEED MIGRATION

Legacy
 DISABLE

CLI Writer
 BLOCK
```

---

# Phase 1

# Actual Event Foundation

## 目标

建立：

> 真实发生事件层。

---

## Step 1.1

寻找当前 Actual 来源

调查：

```
scene.text
chapter markdown
state updater
timeline writer
memory writer
```

回答：

当前：

“正文生成后，系统如何知道发生了什么？”

---

输出：

```
_AI_ACTUAL_FLOW_AUDIT.md
```

---

## Step 1.2

设计 StoryEvent

新增：

```
packages/inkos-brain/src/events/
```

创建：

```
story-event.schema.js
event-extractor.js
event-validator.js
```

---

Schema:

必须包含：

```yaml
id

sceneId

actors

action

consequence

stateChanges

affectedEntities
```

---

## Step 1.3

连接：

Scene 完成后：

现在：

```
Writer
 ↓
Save Text
```

改为：

```
Writer
 ↓
Extract Actual Event
 ↓
Validate
 ↓
Save Text
 ↓
State Update
```

---

## 成功标准

测试：

```
npm test event
```

必须证明：

删除 Plan 后：

系统仍能知道：

* 谁做了什么
* 世界改变什么
* 人物改变什么

---

# Phase 2

# State Evolution Engine

## 目标

所有状态只能通过一个入口变化。

---

## Step 2.1

寻找所有：

```
timeline write

character update

memory update

relationship update
```

---

建立：

```
_AI_STATE_WRITE_AUDIT.md
```

记录：

| 模块        | 写状态 | 是否允许 |
| --------- | --- | ---- |
| timeline  | yes | 改    |
| memory    | yes | 改    |
| character | yes | 改    |

---

## Step 2.2

创建：

```
state-evolution-engine.js
```

规则：

所有：

```
Actual Event

↓

State Evolution
```

---

禁止：

其他模块：

直接：

```
state.xxx =
```

---

## Step 2.3

迁移：

旧：

```
Writer
 ↓
timeline update
```

改：

```
Writer
 ↓
Actual Event
 ↓
State Evolution
```

---

## 成功标准

代码搜索：

```
writeTimeline
updateCharacter
modifyMemory
```

只能出现：

State Evolution 内。

---

# Phase 3

# Minimal SR Runtime

## 目标

让角色拥有主观世界。

---

## Step 3.1

设计：

```
CharacterSR
```

不要扩展心理系统。

只实现：

```yaml
knowledge

belief

interpretation

stance

relevance
```

---

## Step 3.2

建立：

Reality → SR Projection

流程：

```
Actual Event

↓

Character Perception

↓

SR Update
```

---

## Step 3.3

接入 Prompt

但是：

注意：

SR 只能：

提供角色视角。

不能：

修改 Reality。

---

## 成功标准

同一事件：

两个角色：

得到不同：

```
belief
interpretation
choice
```

---

# Phase 4

# Choice Formation Engine

## 目标

实现：

角色选择判断。

---

## Step 4.1

实现 L1:

```
Choice Formation
```

输入：

```
Character SR

Situation

Options
```

---

判断：

## Access

角色知道选项吗？

## Agency

行动来自内部状态吗？

---

输出：

```
VALID

INVALID
```

---

## Step 4.2

实现 L2:

```
Choice Dominance
```

判断：

为什么选 A 而不是 B。

---

## 成功标准

测试：

案例：

```
角色被绑架

必须选择

A 跳海
B 等待
```

结果：

```
VALID Choice
```

不是：

INVALID。

---

测试：

睡梦自动动作：

```
INVALID
```

---

# Phase 5

# Action Consequence Engine

## 目标

行动必须改变未来。

---

## Step 5.1

定义：

Consequence Schema

```yaml
action

immediate_effect

delayed_effect

state_change
```

---

## Step 5.2

连接：

```
Choice

↓

Action

↓

Consequence

↓

State Update
```

---

## 成功标准

改变选择：

未来 Scene 输入必须变化。

---

# Phase 6

# Open Loop Ledger

## 目标

解决：

剧情承诺消失。

---

## Step 6.1

创建：

```
open-loop-ledger
```

记录：

```
Choice

Promise

Threat

Question
```

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

## Step 6.2

接入 Planner。

Planner 必须读取：

```
Open Loop
```

---

规则：

存在：

PRESSING

不能生成无关 Scene。

---

## 成功标准

复现：

Ch2 S3：

“跟我走还是留下？”

下一场：

不能直接跳走。

---

# Phase 7

# Director Actual Migration

## 修改：

当前：

```
Director.before

=
Plan closingWorldState
```

---

改：

```
Director.before

=

Actual Projection
+
OC
+
SR
+
Open Loop
```

---

## 成功标准

删除 Plan：

Director 仍然正确。

---

# Phase 8

# Chapter Continuity

## 建立：

```
Scene

↓

Chapter State

↓

Character Arc

↓

Story Thread

↓

Next Chapter
```

---

新增：

Character Change Tracker

记录：

```
Experience

↓

Interpretation

↓

Belief Change

↓

Behavior Change
```

---

## 成功标准

20章后：

系统可以回答：

为什么角色变化。

---

# Phase 9

# Literary Validation

## 目标

判断：

是不是好故事。

---

增加：

Hard Validator。

检查：

## Causality

角色行为是否有原因。

---

## Value Shift

场景是否改变状态。

---

## Payoff

是否兑现承诺。

---

## Emotional Movement

是否产生变化。

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

最后。

建立：

```
Reality

Character Knowledge

Reader Knowledge
```

---

实现：

```
Suspense

Surprise

Reveal

Dramatic Irony
```

---

# 每个 Phase 完成必须提交

Cursor 每阶段必须输出：

```
PHASE X COMPLETION REPORT
```

格式：

---

## 1. Changed Files

---

## 2. Architecture Change

---

## 3. Tests Added

---

## 4. Test Result

---

## 5. Failure Replay

使用真实失败案例：

例如：

* Ch2 S3 Choice disappearance
* Hospital cold open
* Plan override

---

## 6. Remaining Risks

---

## 7. Can Enter Next Phase?

YES / NO

---

# 最终验收

InkOS 必须达到：

## 世界层

```
Reality → Actual → State
```

成立。

---

## 人物层

```
SR → Choice → Action
```

成立。

---

## 因果层

```
Action → Consequence → Future
```

成立。

---

## 长篇层

```
Scene → Chapter → Arc → Story
```

成立。

---

## 文学层

```
Story State → Writer → Reader Experience
```

成立。

---

# 最终禁止事项

在 Phase 6 前：

禁止：

* 增加更多 Prompt 模板
* 增加 Beat 模板
* 增加 Writer 风格优化
* 增加 UI 功能

因为当前瓶颈不是“写得不像人”。

而是：

**故事状态没有成为系统真正驱动力。**

---

# 核心判断

先把 InkOS 从：

> “知道很多故事信息的 AI”

变成：

> “维护一个会发生事情、会留下后果、会改变角色的故事世界”

然后再追求文学高度。
