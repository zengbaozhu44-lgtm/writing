# L2 Choice Dominance — Read-only Archaeology + Design Gate

```text
MODE: READ-ONLY · NO CODE · NO L2 RUNTIME · NO CHOICE
日期: 2026-09-20 · 输入冻结: H4.1-A…D · HS-1…5 · #32/HA-1/2/3 · H3.2/H3.3 ·
  #35 NOT PROVEN · #25b · 4.4.1d-R · Character World FROZEN CONTRACT
```

## A. Archaeology Findings

**L2 runtime / dominance evaluator / choice ranking / candidate selection / Choice carrier：全数不存在**（grep 零命中；唯一 Choice 相邻物=observeL1 的 L1≠L2 注释与禁令表）。`L2 = NOT IMPLEMENTED · Choice = NOT PROVEN` 确认。

**关键考古发现——Desire 伪载体**：`causal-reasoner.js:199-210` 存在唯一 desire 生产逻辑：
(1) `povChar.desire ← character_bible.core_desire`（**作者人设卡**）；(2) 回退 `wp.event ←
world_pressure ← chapter_task|authored_plan.goal`（**Plan 链**）。其消费端=compiler 的
causal_chain 渲染块——该块自带逐行降权（「Authorial Planned Direction · ≠ Character
Choice Fact · 叙事草图」）。**判定：PLAN→REALITY 通道上的作者向叙事燃料，非 Character
Truth，已被 AA20 降权墙隔离**——但它是未来 L2 最危险的偷渡候选（若 L2 采 desire 输入，
该伪载体必然试图供给）。

## B. L2 Ontology Map / 输入矩阵（14 输入，四态）

| Concept | Carrier | Provenance | Char-grounded | Epistemic bounded | **L2 eligibility** | Evidence |
|---|---|---|---|---|---|---|
| Plan | authored plan | 作者 | ❌（故事控制） | — | **FORBIDDEN** | DG-042/#43 |
| mainGoal | intent.mainGoal | Plan | ❌ | — | **FORBIDDEN** | 同上 |
| causal_chain | reasoner | bible/plan 混源 | ❌ | — | **FORBIDDEN** | AA20 降权墙 |
| Writer Context | compiler | 装配期 | ❌ | — | **FORBIDDEN** | Writer≠Truth |
| Writer intention | — | — | — | — | **FORBIDDEN** | 同上 |
| LLM plausibility | — | — | — | — | **FORBIDDEN** | 禁源表 |
| **Goal** | **无 carrier**（H3.2 封存：无 CharacterGoal runtime；Plan/GC/SR/Desire/H2→Goal 全 blocked；Unknown/No-Grounded-Goal 合法） | — | — | — | **NOT PROVEN** | H3.2 SEALED |
| **Desire** | 伪载体（bible/plan，见 A）——非 Truth | bible/plan | ❌ | ❌ | **NOT PROVEN**（且唯一现存供给是被禁源） | causal-reasoner:199 |
| **Motivation** | 无 carrier（SR `motive` 槽 status=omit 恒空；Bible 不得自动生成——minimal-sr 明文） | — | — | — | **NOT PROVEN** | minimal-sr.js |
| **Constraint** | 无独立 Truth（conflict 字段=Plan） | — | — | — | **NOT PROVEN** | — |
| **Expected Consequence** | **无 Character 侧载体**（见 D） | — | — | — | **NOT PROVEN** | grep 零命中 |
| **Identity** | 无 Truth 载体（bible 人设=作者资料） | — | — | — | **NOT PROVEN** | Case F 先例 |
| State（World） | State Evolution（timeline/worldHints） | Actual | ❌（世界非角色） | — | **PARTIAL**——世界处境可作**情境背景**，非角色内部主导因素；禁止 State→Goal/倾向解读 | §8 分析 |
| Character World | T2/T3/seed（✅ 有 Truth） | authored+Actual | ✅ | ✅ | **PARTIAL**——T3 belief/stance/disposition 是**候选合法输入**（认知 holdings 有 carrier！），但 **World→Choice 禁线在先**，入 L2 须经新 Gate 明确「holdings 作为 dominance 因素」的语义 | CW CONTRACT |
| Character SR | awareness/interp/belief/stance（✅） | Actual+IB+authored | ✅ | ✅ | **PARTIAL**（同上；SR≠Goal/Choice 冻结） | Phase 3.2 |
| AccessTruth | ✅ 有 | Gate | ✅ | ✅ | **LEGAL 但仅限 L1 域**——optionRefs 是入模**证据引用**，非可排序选项集 | §E |
| Eligibility | ✅ 有 | Actual | ✅ | ✅ | **LEGAL 仅 L1 输入** | #32 |

## C. Goal / Desire / Motivation Provenance Audit

六条旁路逐一：`Plan→Goal→L2→Choice` **NOT FOUND**（无 Goal carrier 可达）；
`Desire→Goal→…` **NOT FOUND**（desire 伪载体止于叙事草图渲染，无 Goal 写径）；
`CW→Goal→Choice` **NOT FOUND**（Formation 防火墙锁定）；`SR→Goal→Choice` **NOT FOUND**；
`WriterCtx→Goal→Choice` **NOT FOUND**；`LLM→Goal→Choice` **NOT FOUND**。
**结论：零 laundering 在案**；但 Desire 伪载体（§A）是未来唯一高危供给点，L2 Gate
必须前置封禁 bible/plan 系 desire 入 L2。

## D. Expected Consequence Audit

**Character Expected Consequence = NOT IMPLEMENTED / NOT PROVEN**——全仓无独立载体。
唯一 consequence 相邻物：WCT（Actual 已然世界变化，Authority=Character Action+Gate）与
causal_chain.consequence（作者向 declared outcome，渲染自带 ≠ 标）。两者均**非**角色
前瞻预期。禁止：Actual Consequence 回溯为 Expected（已然≠预期）；Writer 预测→Truth。
**L2 若需 Expected Consequence 输入 ⇒ 新 Truth carrier 需求 ⇒ Human Adjudication。**

## E. Candidate / Option Boundary Audit

`AccessTruth.optionRefs` = **grounded occurrence 引用**（「该路径入模」的证据锚点，
E2 时 scope 仅为被否路径）——**≠ CandidateOption**：无选项内容对象、无完整集合
（U03 明令单一 E2 不证全集）、无排序资格。Access Carrier 实现与测试零 OptionSet/
ChoiceCandidate 结构；#25b 维持。**任何把 optionRefs 升格为可排序选项集的设计 = STOP。**

## F. L2 Semantic Proposal

**NOT READY——不能安全提出**。理由（三重）：①「某个可能方向从哪里来」无法从冻结契约
推出——L1 Access 只证「有路径入模」，不产完整选项集（#25b 禁 CO；optionRefs≠选项集
§E），L2 的 dominance **对象**缺合法来源；②主导因素集合无 Truth 供给——Goal/Desire/
Motivation/Constraint/Expected Consequence/Identity 全 NOT PROVEN（§B），唯一有 carrier
的候选输入是 CW/SR holdings，但 holdings→dominance 的语义（belief 如何成为「倾向性
重量」？）未设计且触碰 World→Choice 禁线；③L2 result→Choice 的转化 Authority 不存在
（#35）。三者任一都需 Human Adjudication，非 wiring。

## G. Human Adjudication（最小集——依赖序）

- **L2-A（对象问题）**：dominance 的对象从何而来？选项：(i) 仅 Access PASS 路径
  （E1/E4 的已入模路径；E2 被否路径是否参与？）——最小但可能太窄；(ii) 需要新
  「选项呈现」Truth（≈重开 #25b 的 CO 议题——需明确裁 #25b reopen 与否）；
  (iii) L2 延期直至真实文学需求定义对象。**为何不可推**：#25b 封了 CO 置于 L1 前，
  但 L2 的对象是 L1 后问题——冻结契约对「L1 后选项呈现」零条款。
- **L2-B（因素问题）**：哪些 holdings 可作 dominance 因素？（候选：T3 belief/stance
  【有 carrier】、SR interpretation、World State 情境【PARTIAL】；Goal/Desire/
  ExpectedConsequence 均需先建载体或判不需要）。**为何不可推**：CW CONTRACT 只禁
  World→Choice 直连，未定义「经 L2 的间接因素角色」；H3.2 封 Goal 无载体。
- **L2-C（ Authority 问题）**：dominance 结果如何（或是否）转化为 Actual Character
  Choice？即 #35 的正面攻坚入口。**为何不可推**：#35 NOT PROVEN 是冻结现状本身。

## H. Route Rescan

**FIRST REAL BLOCKER = L2 semantic ambiguity（L2-A/B/C 三重未决）**——这是主路第一次
抵达「冻结语义不足以安全推出下一步」的节点；但因 **L1 sidecar 零消费者、生产故事经
作者因果线完整运转**，按判据（生产需求触发）它仍是**语义预留区的前沿**而非运行阻塞
——精确表述：**FIRST REAL BLOCKER（语义推进意义）= L2-A；FIRST REAL BLOCKER（生产
运行意义）= NONE**。

**SAFE-TO-IMPLEMENT NEXT NODE = NONE**（L2 无 wiring 可推出；任何推进需先裁 L2-A/B/C）。

```text
CODE CHANGED = NO · STATUS = STOP · 等待 L2-A/B/C 人类裁决（或维持预留）
```
