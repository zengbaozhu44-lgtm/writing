# Vertical Slice Archaeology + Design Gate Skeleton — Outline → World → Initial Character World Projection

```text
MODE: READ-ONLY · NO CODE · NO SCHEMA · NO RUNTIME OBJECT · 不触 Choice/L1/L2/
  Consequence/Survival/Director · 不重开 H4.1 / #25b
日期: 2026-09-18
验证链: AUTHORED OUTLINE → WORLD FORMATION → CANON → ACTUAL → ACCESS →
  PERCEPTION → INTERPRETATION → CHARACTER WORLD → SR(t) → TASK/WRITER CONTEXT
```

## A–K 逐题作答

**A. Outline → World Formation 在哪发生？**
不在 Runtime。发生在**作者侧**：人工/Studio 辅助（创作向导、volume-plan、
creator-intelligence 的「生成第一卷卷纲」建议项）产出 **authored 文件**（01_world_bible、
03_character_bible、10_volume_outline、story_dna/style_dna、story map）。系统对这些
只有 loader 消费。**「Formation」作为系统过程不存在**——存在的是 authored 输入面。

**B. World Formation → Canon Reality 权威入口？**
D1 SEALED。Canon 载体 = authored bible/facts + **11_timeline（唯一 Actual 自动写入的
canon 文件，EO-P2 反洗白）**。`syncContextToCanon` 实测只写 09 任务卡（任务层，
非 Reality——名称唬人但无 Plan→Canon 污染）。生成式入口不存在。

**C. Canon → Actual 生产链？**
Canon 不直接产 Actual：Canon(lore)→prompt→Writer prose→提取+闸门→Actual。**已存在。**

**D. Actual → Character Access？** `characterCanAccessActualEvent`（IB 层）+ knowledge
TopK。**已存在。**

**E. Access → Perception？** awareness 逐事件入 SR。**已存在。**

**F. Perception → Interpretation？** **authored-only**（三槽）；runtime 自动解释被
Reality≠Belief 墙挡住。**已存在但 by-design 语义不足**（自动内化=已知未来缺口）。

**G. Character World 持久 Truth？** **不存在——且本轮新发现更基础的数据层缺口：**
`loadCharacterSRState(bookDir, chapter)` **只读本章 sidecar，无跨章回退**——
`applyCharacterSRAfterActual` 的 prior 仅用于本章重跑恢复。**第 N+1 章的 SR 从零起步**。
跨章主观连续性目前完全由 prompt 层（bible 卡 + timeline + readback + anchor）承担，
SR/World 层每章清零。「World」连「章间持存」都没有。

**H. 初始自我世界投影应投影自什么？**
合法候选唯一可推：**作者 authored 的初始主观内容**（人类权威，同 chapter 级
characterSR 先例）。自动 bible→belief 被禁（Outline→profile→belief 偷渡线）。
但 **book 级 authored 入口当前不存在**（characterSR 只在 chapter_plans 层），
投影机制与载体**无冻结语义** → 真缺口。

**I. World → SR 合法 Projection/Activation？** 不存在运行时投影。唯一「投影」是
prompt 层 character cards（bible→prompt，非 SR）。

**J. Task 消费什么？** **混合上下文**：authored plan（chapter_plans/09/story map/
anchor）+ SR 投影(p88) + lore（bible 卡/canon 摘要）+ Actual/WCT 读回 + 续写锁。
任务层 goal/conflict 全部 authored。

**K. FIRST REAL BLOCKER？** 按「生产路径真实断点」判据：**无**（故事不因此断）。
但按本轮问题域（纵向链语义成熟度）：缺口明确且**不是 wiring**（见裁决）。

## 五类分类表

| 链段 | 分类 |
|---|---|
| Outline→World Formation | **仅 authored**（作者侧工具辅助，产物人写） |
| World→Canon 入口 | **已存在（authored）**；生成式=不存在 |
| Canon→Actual / Actual→Access / Access→Perception | **已存在并可复用** |
| Perception→Interpretation | **已存在但语义不足**（authored-only，by design） |
| Interpretation→World 持存 | **完全不存在**（SR 不跨章——新发现） |
| World 初始投影（book 级 authored 入口+投影契约） | **完全不存在** |
| World→SR Projection/Activation | **完全不存在** |
| Task 消费 | 已存在（混合上下文） |

## 反偷渡核查

`Outline→profile→belief→goal→action`：不成立（bible 只进 prompt 实体卡，无 Truth 通道；
belief 唯一来源=authored 三槽）。`Actual→Belief`：不成立（Reality≠Belief，awareness
止步于知晓）。`Plan→Canon`：不成立（syncContextToCanon 仅任务卡）。七条不等式全部维持。

---

# 裁决

## **B — DESIGN GATE REQUIRED**

三层间存在**新语义缺口**（非 wiring、非不可判定）：
1. **World 无持久载体**（SR 章级清零——即使全 authored，世界也无章间持存）；
2. **初始投影无合法入口**（book 级 authored characterSR 不存在）与**无投影契约**；
3. 自动内化未实现（已知，独立缺口，不在本 Gate 强行并入）。

非 A（Safe Derivable）：载体形态、投影纪律、继承语义均无冻结语义可推。
非 C（Blocked）：问题集可被明确枚举，无需先做存在性裁决。

## Design Gate 骨架（只列问题，不设计）

| # | Gate 问题 | 已知约束 |
|---|---|---|
| G1 | World 持久载体形态：book 级 World store vs SR 跨章继承（ch N 起步=ch N-1 终态+authored 增量） | 两种形态均在契约字面内；Character World Frozen Contract（World≠Engine） |
| G2 | 初始投影来源：book 级 authored characterSR（人类权威）；**自动 bible→belief 永久禁止** | authored 三槽先例；反偷渡线 |
| G3 | 投影的认知边界纪律：authored-seed 是否按角色可及性审查，或 authored 即入但 provenance=authored_seed | IB 封存；provenance 先例 |
| G4 | World↔SR 合并语义：SR(t)=f(World, 本章 Actual, authored chSR) 的继承/覆盖规则 | Phase 3.2 封存（Actual→IB→SR 不得改） |
| G5 | Task/Writer 消费面：World 是否新增投影通道，或维持 SR-only 消费 | HPA-01/投影保全先例 |

**成功标准**（女皇定义的重心）：大纲产生的世界经真实事件与认知边界后，
**不同角色拥有「这是我的世界」的不同初始内部视图**——而非字段串联。

```text
READ-ONLY COMPLETE · DESIGN GATE REQUIRED · NO CODE · STOP
```
