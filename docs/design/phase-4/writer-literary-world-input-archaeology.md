# Writer Literary World Input Archaeology — Root Cause Report

```text
MODE: READ-ONLY · ZERO CODE · ZERO SCHEMA · ZERO ENGINE
证据: Batch #1 工件（fixture + sidecar + prompt + prose 全链）
日期: 2026-09-20
```

---

## ① World Inventory（W1）

**Fixture World Bible 实存内容（2,501 字）**：裂隙都市世界观——异能体系（五系+F→S）、势力（守夜人/裂隙教团/自由行者联盟/公司联合会）、地理（中心城/灰桥区/镜湖区/锈铁镇/深渊裂隙/回声隧道/雾霾沼泽）、禁忌。**丰富**。

**Faction Bible**：6 势力各~50 字（简介/领导者/成员）——**极简**。

**NPC Simulation**：`npcs: []`——**空**。模板存在但零数据。

**State Board**：`{势力 A} 正在调查/执行：__`——**全空模板**。

**表 1：World Inventory**

| 类别 | 已存在 | 来源 | 进入生产 | 进入 Writer |
|---|---|---|---|---|
| 世界规则 | ✅（裂隙/熵能/五系/等级） | 01_world_bible | ✅（compiler world_rules 模块） | ✅ |
| 地理 | ✅（4 城市+3 危险区+5 地点） | 01_world_bible | 部分（compiler world 模块受预算） | 部分 |
| 势力 | ✅（4 官方+6 bible） | 01+04 | ❌（faction 卡需 entity 命中才注入） | 极少 |
| NPC | ❌ **空** | 15_npc_simulation（空） | ❌ | ❌ |
| **时间** | ❌（story_day_zero=null, 10/11 null day） | 11_timeline | 部分（Story Clock=未标注） | **弱**（仅锁定约束非事实） |
| **工作** | ❌ | 无 carrier | ❌ | ❌ |
| **家庭** | ❌（bible 提到母亲，无 Truth） | bible 字面 | ❌ | ❌ |
| **社交** | ❌ | 无 carrier | ❌ | ❌ |
| **日常生活** | ❌ | 无 carrier | ❌ | ❌ |
| **偶然事件** | ❌ | 无 carrier | ❌ | ❌ |

**结论**：世界 Bible 丰富（规则/地理），但 **NPC/时间/工作/家庭/社交/日常/意外 全部为 INPUT GAP（系统无 carrier）**。Writer 只能收到 world_rules + 部分 geo + character 卡。

## ② Character World Inventory（W2）

**表 2**

| 角色 | T2 | T3 | 日常经历 | 社会关系 | 个性依据 | 当前 SR |
|---|---|---|---|---|---|---|
| 林逸 | 124 | 1 (belief) | ❌ | ❌ | seed 仅 3 项 plot 向 | aw=60, belief=2, stance=1 |
| 苏眠 | 0 | 0 | ❌ | ❌ | seed 3 项 plot 向 | seed only |
| 镜渊 | 0 | 0 | ❌ | ❌ | ❌（无 World 块） | ❌ |
| 老周 | 0 | 0 | ❌ | ❌ | ❌（无 World 块） | ❌ |

**W2 核心发现——T2 是 Plot Memory 还是人物世界？**

林逸 124 条 T2 中 **plot-related = 10，other = 114**——但 "other" 的样本是：

```
「林逸抽出最上面那份，翻开」「他摸到口袋里的手机」「他双手托住底边往上提了两寸」
「他蹲下身，从靴筒里抽出一截铁尺」「他把铁尺插进锁环，手腕一拧」
```

**PROVEN：T2 ≈ 微动作日志，非人物世界。** 它记录的是「Writer 写了什么身体动作」，不是「人物经历了什么有意义事件」。114 条 "other" 是提取器对物理操作的捕获——非生活、非社交、非情感、非认知。T2 实际上变成了 **prose-level action log**（剧情发生日志），不是 **character's private world**。

**分类**：
- A. Plot-relevant: 10 条（8%）
- B. Personal experience: **0**（无一条是「人物在生活中经历了什么」）
- C. Stable interpretation/belief/stance: 仅 T3×1 + seed×3
- D. Ordinary-life/social: **0**
- E. Personality/habit grounding: **0**

**结论**：Character World 在 Batch #1 中 **本质上是 Plot Memory + 微动作日志**，不是「人物自己的世界」。原因是 T2 的提取源 = LLM occurrence extraction（偏物理动作），而非生活/社交/情感事件。

## ③ Time / State（W3）

**PROVEN**：
- Timeline: 11 entries, **10/11 day=null**——时间不是真实世界状态，是 null 占位
- 08_current_state: 任务=—, 地点=未标注, 时间=未标注——**全空**
- Story Clock in prompt: 「Canonical：**未标注**（source=08_current_state）」——Writer 收到的是空值+锁定约束（「禁止改换月日」），**非事实时间**
- 人物无需工作/通勤/吃饭/睡觉——系统零 carrier
- Scene/Chapter 间 elapsed time 不可恢复

**结论**：**时间不存在于 Story Truth 中**——INPUT GAP。

## ④ Other Characters / Social World（W5）

**人物存在链**：

| 层 | 林逸 | 苏眠 | 镜渊 | 老周 |
|---|---|---|---|---|
| Character bible | ✅ | ✅ | ✅ | ❌（无 bible） |
| Character World | ✅ (T2=124) | ✅ (seed only) | ❌ | ❌ |
| Plan 可调用 | ✅ | ✅ | ✅ | ✅（authored plan 写入） |
| Writer Context | ✅（SR+char card） | ✅（char card） | ✅（char card） | ❌（无卡无 SR） |
| Prose | ✅（主语） | ✅ | ✅ | ✅（ch1/8/10 出场） |

**为什么大部分 Scene 只有林逸？——PROVEN：authored Plan 每场 goal 均以林逸为唯一主语**（「承接上章推进：林逸…」10/10 章 40/40 场）。Plan 层从源头决定了单主语结构。Writer 忠实执行。

## ⑤ Personality / Emotion 输入（W6/W7/W8）

**W7 镜渊纵向审计**：

| 问题 | 来源 | 状态 |
|---|---|---|
| 镜渊知道什么 | bible「世界意志的化身」+ authored plan 对白 | bible 字面 |
| 经历过什么 | ❌ T2=0 T3=0 | **INPUT ABSENT** |
| 相信什么 | bible「维持完美循环」 | bible 字面 |
| 害怕什么 | ❌ | **INPUT ABSENT** |
| 在意什么 | bible「永恒、秩序、无痛」 | bible 字面 |
| 讨厌什么 | ❌ | **INPUT ABSENT** |
| 与谁有关系 | ❌ | **INPUT ABSENT** |
| 平时是什么样的人 | ❌ | **INPUT ABSENT** |
| 习惯 | ❌ | **INPUT ABSENT** |
| 压力下如何变化 | ❌ | **INPUT ABSENT** |

**镜渊像机器人的根因 = INPUT ABSENT（7/10 项）+ 无 World 块 + 无 T2/T3 + 无 SR**。Writer 只有 bible 一句话（「冷静优雅，诗意隐喻，实则冷酷」）+ Plan 对白——这**不可能**产出有纵深的人物。**不是 Writer 不用，是系统没给。**

**W6 林逸个性输入审计**：
- bible: 「理性谨慎但内心热情」「善于观察分析」「偶尔自我怀疑」——**书面标签，非可执行 Truth**
- T2/T3: 零 personality 条目
- SR: belief=2, stance=1——全部 plot 向
- Writer Context: char card（whitelist 最小身份）——不含性格描述
- **「数到七」是唯一有 Truth 依据的行为签名（T3 投影产生）**

**W8 情绪**：
- World/CW/T2/T3/SR/Plan/Writer Context: **零情绪 carrier**
- Prose: Writer 自发产生「紧张/警觉/冷静/沉默」模板
- **INPUT GAP**——情绪无合法来源，Writer 只能用通用模板

## ⑥ Incidental / Daily Life（W9）

**INPUT GAP（全项不存在于系统）**：睡眠/饮食/工作/移动/卫生/金钱/手机功能/社会活动——零 carrier、零 State、零 CW 条目。Batch #1 中出现的手机/等待/身体描写全部为 Writer 自发。

## ⑦ 40 Scene 分类（W10）

```
纯 P:       10 场 (25%)
P+C:        18 场 (45%)
P+W:         6 场 (15%)
P+W+C:       6 场 (15%)
L (生活):    0 场 (0%)
```

**非 100% 纯 P**，但 **L = 0**——零生活场景。P+C 占 45% 说明 Writer 确实在利用 SR 做人物深化——但源头没有生活材料。

## ⑧ Writer Context 损耗（W11）

ch5_s1 prompt（4,199 字）包含模块：goal, conflict, prev_actual, SR, clock, chapter_goal, world_rules, char_cards。

**不含**：NPC（空）、日常（无 carrier）、时间事实（null）、家庭/社交（无 carrier）、faction（entity 未命中不注入）。

**结论：Writer Context 没有压缩掉世界——上游根本没给。**

## ⑨ Input Loss Map

```
World Bible (2,501字: 规则+地理+势力)     [存在]
  ↓ world_rules 模块注入 prompt           [保留 ~40%]
  ↓ faction/NPC 不命中 entity             [丢失 ~60% 世界信息]
Actual / State
  ↓ 08_current_state 全空                 [丢失 ~100%]
  ↓ 11_timeline day=null 10/11           [丢失 ~90% 时间]
Character World
  ↓ T2=124 全是物理微动作                 [非人物世界内容]
  ↓ T3=1 belief                          [唯一纵深来源]
  ↓ 投影到 SR (aw=60 belief=2 stance=1)  [进入但厚度极薄]
Writer Context
  ↓ SR 块 + world_rules + char cards      [提供]
  ↓ 无 NPC/日常/时间/社交/情绪            [INPUT GAP 直通]
Writer → Prose
  ↓ Writer 全力使用已有（P+C=45%）       [非不用]
  ↓ 无材料可用 → L=0 场
```

**第一次大量信息消失的位置 = World Bible → Writer Context**（faction/NPC/时间/日常在 entity 选择和 State 写入之间被丢弃/从未存在）。

---

## ⑩ Root Cause 表

| 问题 | World | CW | Time/State | Plan | Context | Writer | 证据等级 |
|---|---|---|---|---|---|---|---|
| 世界空 | **上游有但 faction/NPC 空** | — | — | — | **不上游空，是输入缺口** | — | PROVEN |
| 时间弱 | — | — | **无 carrier（null）** | — | Clock=空值锁定 | — | PROVEN |
| 人物少 | NPC=空 | 镜渊/老周零块 | — | **authored plan 单主语** | 老周无卡 | — | PROVEN |
| 个性趋同 | bible=书面标签 | **零 personality 条目** | — | — | char card=最小身份 | 用了但无料 | PROVEN |
| 情绪单一 | **零情绪 carrier** | 零 | 零 | 零 | 零 | 通用模板 | PROVEN |
| 意外少 | **零事件 carrier** | 零 | 零 | authored plan 无 | 零 | — | PROVEN |
| 信息过密 | — | T2=124 微动作灌入 SR | — | Plan 密集 | SR aw=60 | 全回应 | PROVEN |

## A–G 分类

### A. PROVEN
1. **World 输入断层**：Bible 有规则/地理，但 NPC/时间/日常/社交/情绪/意外 **零 carrier**——不是丢失而是从未存在
2. **T2 是微动作日志**：124 条中 114 条为物理操作（「抽出/翻起/拧」），非人物世界内容
3. **authored plan 单主语结构**：40/40 场以林逸为唯一主语
4. **镜渊 7/10 INPUT ABSENT**：无 World 块/T2/T3/SR/bible 深度——机器人形象是必然
5. **时间不存在**：10/11 day=null, 08_state 全空, Clock=空值

### B. SUSPECTED
- Writer 风格趋同（冷静理智）可能加剧个性单一，但主要根因是输入不足（无料可写差异）

### C. NOT A PROBLEM
- P+C=45% 说明 Writer **确实在用 SR** 做人物深化——认知塑造线有效
- 苏眠零 T2/T3 是 Plan 设计选择（当前合法）

### D. INPUT GAP（最大类）
- NPC 活动/社交网络/家庭/工作/日常生活/时间事实/情绪/个性/意外事件——**全部无系统 carrier**
- 镜渊/老周无 Character World 块

### E. PIPELINE LOSS
- Faction bible 6 势力因 entity 不命中而不注入 prompt
- World Bible 地理细节因预算截断部分丢失

### F. REALIZATION FAILURE
- 「指节发白×11」——Writer 风格 fallback，输入无关
- 心理解释过量——Beat goal 预设内心态 + Writer 解释本能

### G. ARCHITECTURE GAP
- 无——以上问题全部在 D/E/F 层，**不需要新 ontology**

---

## ⑪ FIRST REAL BLOCKER

> **INPUT GAP：世界生活层（NPC 活动/时间/日常/社交/情绪/个性）在系统中无 carrier——不是架构缺陷，是内容缺失。**

这是 D 类（INPUT GAP）中影响最大的单项：Writer 已证明会用 SR/world_rules（P+C=45%），但源头只给了 Plot 骨架。**下一阶段的最小解决方案是内容供给（authored channel / State 写入 / Bible 丰富），不是新 Engine。**

```
NO CODE · NO SCHEMA · NO ENGINE · READ-ONLY COMPLETE
```
