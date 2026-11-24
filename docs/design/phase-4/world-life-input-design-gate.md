# World Life Input Design Gate — Archaeology + Semantic Boundary

```text
MODE: READ-ONLY · ZERO CODE · ZERO SCHEMA · ZERO ENGINE
日期: 2026-09-20
上游: writer-literary-world-input-archaeology.md（INPUT GAP 定位）
```

## A. Time Truth Archaeology

**现状证据**：
- `story_day_zero = null`（fixture 未提供，无写入方——grep 零命中 producer）
- `timeline.day: null` × 10/11（`resolveWorldEventDay` 只从显式 Day-N 文本提取，intent 无 time → null）
- `08_current_state.time = 未标注`（`resolveStateTimeLabel({time: intent.time, currentDate, chapter})` → intent.time=undefined → 未标注）
- `intent.time`：**authored chapter_plans 中 `time` 字段全 10 章均未填写**（ch1/ch5/ch10 均 `(none)`）

**四层时间语义已冻结**（time-semantics.js）：Narrative Order / Story Clock / Historical Reference / World Event Day——**语义存在**，producer 存在（`resolveStateTimeLabel`、`resolveStoryClock`、`resolveWorldEventDay`），schema 存在（08_current_state 时间字段、timeline days[].day）。

```
TIME: PARTIAL — 语义+producer+carrier 全部已有；data 全空（authored 未填 + 实际 prose 无显式 Day-N/时刻）
AUTHORITY: 08_current_state (Story Clock) / 11_timeline (World Event Day)
CURRENT CARRIER: buildCurrentStateTable '时间' 字段 / Story Clock 模块
FIRST LOSS: authored plan 不填 time → resolveStateTimeLabel 返回未标注 → Writer 收到空值+锁定约束
```

**分类：CONTENT GAP + PRODUCER GAP（fixture/authored 未填 data；producer 在但输入空）**——**不是 Carrier Gap**。

## B. NPC / Social World Archaeology

**现状证据**：
- `15_npc_simulation.yaml`：`npcs: []`——**有 carrier + 有 template**
- `runNpcSimulation(bookDir, day, npcNames)` 存在于 `inkos-core/workflows/npc-simulation.js`（**创建模板占位并写入 yaml**）
- **全仓零调用方**（grep `runNpcSimulation|npc-simulation` 零命中——从未被接入 runtime）
- `05_relationship_graph.yaml`：**不存在**（fixture 未提供；`minimal-sr.js:307` 有读取逻辑（relationship→affect_relationship），但文件不存在 → 无数据）
- `07_state_board.md`：**空模板**（`{势力 A}` 占位——buildChapterAnchor 使用它做 relationship_state 但空值输出模板）

**Truth 类型归属**：

| 命题 | Truth 类型 | 现有承载位置 |
|---|---|---|
| 「林逸认识老周」 | Relationship（World/State） | 05_relationship_graph（文件不存在）+ CW authored seed |
| 「老周今天值夜班」 | **NPC current activity** | 15_npc_simulation（carrier 存在，空）+ 07_state_board（空） |
| 「老周刚刚和某人吵架」 | Actual Event（非 POV） | 可经 ensureActualEvents 捕获（但需在 prose 中出现） |
| 「林逸路上碰到老周」 | Actual Event（POV） | 可捕获（T2/T3 已支持） |
| 「NPC identity」 | Canon/World | 03_character_bible（有）+ faction bible |

**结论**：NPC carrier **存在**（npc_simulation + state_board + relationship_graph），producer **部分存在**（runNpcSimulation 从未被调用），data **全空**。这是 **PRODUCER GAP + CONTENT GAP**——不是 Carrier Gap。

## C. Daily Life 逐项分类

| 生活事实 | 合法归属 | 现有 carrier | 状态 |
|---|---|---|---|
| 「档案管理员通常 18:00 下班」 | World Fact（Canon） | 01_world_bible | 不存在（bible 无此内容——**CONTENT GAP**） |
| 「林逸今天 18:17 还没离开」 | Actual | ensureActualEvents | 可产生（prose 需写入——**PRODUCER 依赖**） |
| 「林逸当前疲劳」 | State / SR | 08_current_state / CW | 不存在（**CONTENT GAP**） |
| 「林逸长期夜班」 | CW / T2 experience | T2 可承载 | 未产生（prose 无此叙事——**上游 CONTENT 依赖**） |
| 「林逸习惯推迟晚饭」 | T3 stance/habit | T3 可承载 | 未形成（T4 disposition 已 DELAYED） |

**核心发现**：日常生活的 **carrier 分布在五层（World/Actual/State/CW/SR），全部已有合法承载位置**——但内容全空，因为上游 authored plan/bible/prose 从未生产这些事实。

## D. Character World 边界重检

**T2/T3 能否承载生活经历？**——**能，语义已够**。

T2 experience 的冻结语义：「这个角色经历过/合法获知过与自己有关的实际事件」——**无内容类型限制**。「林逸长期夜班」「林逸认识老周」「林逸习惯提前检查门锁」都是合法 T2/T3 材料。**不需要新 carrier。**

**但实际 T2 内容被动作日志污染**（kind: action=65, movement=28, discovery=24——0 条生活/社交/情感）。

**根因 = Phase 1.3 LLM 提取器的 prompt 偏物理动作**——提取器 system 指令「动作重述」「world-change」「aftermath」，无「生活事件」「社交事件」「关系变化」分类。

**分类：PRODUCER GAP（提取 prompt 偏差）+ CONTENT GAP（上游 prose 本身无生活内容——作家因果线 10 章全 plot 向）**。

## E. Personality 合法产生路径

**现有路径已够——无需新 carrier**：

```
Actual repeated behavior → T2 experience → T3 interpretation/stance → SR → Writer
```

「小气」「粗心」「怕麻烦」「对某人特殊关照」等个性可以合法产生于：
- T3 stance（「suspects·管理员的动机」——已在生产中产生「数到七」行为签名）
- T2 repeated experience（需提取器捕获重复生活行为——目前偏动作）
- authored seed belief/stance（已有通道）

**「数到七」是活证**：一个 T3 belief + Writer realization = 12 次跨 8 章的行为签名。**路径已验证可行，只是目前只有 1 条 T3 在生产。**

**分类：CONTENT GAP + PRODUCER GAP（提取偏差）——不是 Carrier Gap。**

## F. 生活/剧情关系

**当前世界不拥有「即使主线暂停也仍然存在」的连续性**——因为：
1. authored plan 40/40 场全是 Plot Event（零 World Activity / Social Activity / Incidental Event 写入）
2. NPC simulation 从未运行（零 NPC 日常活动）
3. State Board 空（零势力运转）
4. Timeline day=null（零时间推进）

**但这不是架构缺陷**——是 fixture/authored 内容全 plot 向。

## G. 七类缺口分类汇总

| 缺口 | 类型 | 证据 |
|---|---|---|
| 世界 Bible 无生活事实 | **CONTENT GAP** | bible 有规则/地理，无工作/社交/日常 |
| authored plan 无 time | **CONTENT GAP** | ch1-10 time=(none) |
| authored plan 40场全 Plot | **CONTENT GAP** | 40/40 单主语纯 P |
| `runNpcSimulation` 未接入 | **PRODUCER GAP** | 零调用方 |
| 05_relationship_graph 不存在 | **CONTENT GAP** | fixture 未提供 |
| 07_state_board 空 | **CONTENT GAP** | 模板占位 |
| T2 提取偏物理动作 | **PRODUCER GAP** | kind: action=65/124, 生活=0/124 |
| T3 仅 1 条在生产 | **CONTENT GAP** | authored seal 仅 1 belief |
| Faction 不进 prompt | **PIPELINE GAP** | entity 不命中不注入 |
| Writer 指节发白×11 | **REALIZATION FAILURE** | Writer 风格 fallback |
| 心理解释×26 | **REALIZATION + CONTROL** | Beat goal 预设内心态 |
| 镜渊无纵深 | **CONTENT GAP** | 7/10 INPUT ABSENT（上游没给） |
| 情绪无来源 | **CONTENT GAP** | 零情绪 carrier 使用（但 CW/T3 可承载） |
| 意外/日常无来源 | **CONTENT GAP** | 零 authored/runtime 生活事件 |

**关键发现：零个 TRUTH CARRIER GAP**——全部是内容缺失或生产偏差。

## H. 最终结论

### 情况 2：EXISTING CARRIER UNDERUSED ✅

现有 `Actual / State / T2 / T3 / Character World / SR / NPC simulation / relationship graph / state board / timeline / world bible` **全部已有合法承载位置**——问题是：
1. **内容全空**（fixture/authored 未填）
2. **Producer 未运行**（runNpcSimulation 零调用；提取 prompt 偏动作）
3. **上游 prose 全 plot 向**（authored plan 设计选择）

**不需要新 Truth Carrier。**

### 最小可行路径（仅记录）：

```
① authored plan 填 time + 写入非纯 P 场景 → State/Timeline 自然有事实
② authored seed/characterSR 丰富（镜渊 belief/老周 stance） → SR 有纵深
③ T2 提取 prompt 增加生活/社交/关系事件分类 → T2 不再只记录微动作
④ runNpcSimulation 接入 runtime → NPC 有日常活动
⑤ 05_relationship_graph + 07_state_board authored 填充 → 社会关系/势力运转有 Truth
```

每项都是 **authored/producer/prompt 层最小修改，零新 ontology**。

---

## 最终状态

```
NEW TRUTH CARRIER NEEDED = NO
EXISTING CARRIER UNDERUSED = YES（主因）
CONTENT GAP = YES（次因）
PRODUCER GAP = YES（T2 提取 + NPC simulation 未接入）
PIPELINE GAP = YES（faction → prompt 路径丢失）
REALIZATION FAILURE = YES（指节发白/心理解释——次要）

FIRST REAL BLOCKER = 内容供给 + Producer 接线（非架构）
```
