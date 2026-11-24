# E2E-LONGFORM-01 — Unified Production Context Contract · Design V2

**Status**: DESIGN V2 DRAFT — WAITING FOR HUMAN ADJUDICATION — NOT FROZEN
**Date**: 2026-10-26 · **Mode**: READ-ONLY REVISION（零实施）
**标注**: PRESERVED（V1 不变）/ REVISED（V2 修正）/ DEFERRED（延后）/ HA（需 Human 裁决）/ FC（冻结契约派生）/ OI（实证）/ PD（提案）
**V1→V2 变更**: R1~R5 五项审查修订，逐节标注

---

## 1. Executive Summary 〔PRESERVED+REVISED〕

V2 保持 V1 的核心发现与六层结构，修正五处语义问题：①Authorial Intent 从「独立权威层」修正为「来源概念」（R1）；②Required/Inclusion 拆为三概念并引入 `REQUIRED_CONTRACT_VIOLATION`（R2）；③Presence 拆分 Planned/Actual 并条件化 POV∈Presence（R3）；④Character World 回归其冻结语义——受 Actual+Access 约束的角色主观载体，非通用 Truth 库；character_brains 定位推迟至前置考古完成（R4）；⑤Q-UC-1 移除 ≤40 字预设，聚焦语义保障而非预算数值（R5）。

## 2. Existing Frozen Contract Compatibility 〔PRESERVED〕

（与 V1 §2 一致——八项冻结契约全部兼容；本设计零触碰 Actual 准入门。）

## 3. Unified Authority Model 〔REVISED per R1〕

### 3.1 Authorial Source ≠ 权威层

**Authorial Intent 是来源概念**（描述输入从哪里来），不是独立于 Truth/Control/Realization 的第四层。作者输入进入系统后，其**权威性由 Semantic Classification 决定**——同一作者输入可落入不同权威类别。

### 3.2 四阶段管线

```
Authorial Source（来源：谁在什么载体上提供了什么）
    ↓ 语义分类（§3.3）
Semantic Classification（该内容的权威类别：Truth-source / Control-source / Realization-guidance）
    ↓ 录取（各载体 admission——已冻结构）
Authoritative Carrier（被录取的权威载体，各守其类）
    ↓ 生产消费（§5/§6/§7 契约）
Production Consumer（规划/编译/Writer/Actual 门——各消费者按其层权取用）
```

### 3.3 权威分类表〔REVISED——不再全归 Control〕

| Authorial Source | Semantic Classification | Authoritative Carrier | Production Consumer | V1→V2 |
|---|---|---|---|---|
| World Bible 内容 | **混合**：世界事实（Reality 层 Canon 源）+ 呈现规则（Control 源）——分节判定 | 01_world_bible（整载体，内部段落权威不同） | compiler world 块 / Writer / 未来 Canon 录取 | REVISED：非纯 Control |
| Character Bible | **Truth 层 Character Canon**〔FC G1-A：唯一身份录取权威〕 | 03_character_bible | G1-A resolver / entities TopK / CW seed 通道 | REVISED：非 Control，是 Truth 层身份权威 |
| Volume Outline | **Control 层叙事约束**（作者意图）——非 Reality | 10_volume_outline | 规划层（Q-UC-2 裁决消费形式） | PRESERVED |
| Chapter Plan（authored yaml） | **Control 层章任务** | chapter_plans/*.yaml | planner（authored_preserved 已冻） | PRESERVED |
| POV Policy（writing bible/story-map） | **Control 层呈现政策** | 02_writing_bible / pov-grid | POV 解析链（Q-UC-3） | PRESERVED |
| CW Seeds | **Truth 层角色主观内容**（authored grounding 通道，受 Access 约束）〔FC G1-A S-A〕 | character_world_seeds.yaml | CW sync（Reference-only） | REVISED：非 Control，是 Truth 层主观源 |
| 关系图 05 | **Truth 层关系事实**（authored）——受 G1-B affect basis 约束〔FC〕 | 05_relationship_graph.yaml | TopK 展示/SR affect 门 | REVISED：非纯 Control |
| 角色认知（authored SR） | Truth 层 Character Subjective | scene.characterSR | SR 槽（basis 门） | REVISED |

**关键修正**：V1 将全部作者输入置于 Control 源——V2 修正为「作者输入的权威性取决于内容的语义类别而非来源本身」。角色档是 Truth 层身份权威；CW seed 是 Truth 层主观源；世界 bible 内部分节异构。

## 4. Authorial Intent Contract 〔REVISED per R1〕

### 4.1 意图分类（更新表——加入语义分类列）

| 类别 | 载体 | 语义分类 | 层级 | 不能直接成为 |
|---|---|---|---|---|
| 世界事实 | 01 §事实节 | Reality Canon 源 | 书级 | Actual（须过提取门） |
| 世界呈现规则 | 01 §规则节 / 02 | Control | 书级 | — |
| 卷级叙事意图 | 10 | Control（叙事约束） | 卷级 | 每章 must-execute Actual |
| 章级意图 | chapter_plan | Control（章任务） | 章级 | Actual |
| 角色身份 | 03 | **Truth（身份 Canon）**〔FC〕 | 书级 | 角色认知 |
| POV 政策 | 02/story-map | Control（呈现政策） | 书级 | Scene POV 事实 |
| 角色主观 | CW seeds/characterSR | **Truth（主观源）**〔FC〕 | 书级 | 其他角色认知 |

### 4.2 层级继承规则 〔PRESERVED〕

### 4.3 红线 〔PRESERVED〕

## 5. Production Context Contract 〔REVISED per R2〕

### 5.1 三概念拆分

| 概念 | 定义 | 时机 | 责任者 |
|---|---|---|---|
| **Requirement Classification** | 该源对某消费者是 REQUIRED / OPTIONAL——**合同属性**，编译前即已确定 | 源注册时 | 契约定义（Q-UC-1 裁决哪些源 Required） |
| **Inclusion Status** | 该源在某次实际请求中是否被包含——**事实属性**，运行时观测 | 每次 LLM 请求 | 编译层（须留原因码） |
| **Contract Compliance** | Inclusion Status 是否满足 Requirement——**合规判定**，事后审计 | 审计时 | 观测协议 |

### 5.2 合规模型〔REVISED〕

```
if (Required ∧ INCLUDED)                              → COMPLIANT
if (Required ∧ OMITTED_BY_BUDGET)                     → REQUIRED_CONTRACT_VIOLATION
if (Required ∧ OMITTED_BY_POLICY)                     → REQUIRED_CONTRACT_VIOLATION
if (Required ∧ SOURCE_MISSING)                        → REQUIRED_CONTRACT_VIOLATION (upstream)
if (Required ∧ TRANSFORMATION_FAILED)                 → REQUIRED_CONTRACT_VIOLATION
if (Required ∧ NOT_RELEVANT)                          → CLASSIFICATION_CONFLICT (Required 不应 NOT_RELEVANT)
if (Optional ∧ any OMITTED_*)                         → COMPLIANT (omission tracked)
NOT_OBSERVED                                          → COMPLIANCE_UNKNOWN (≠ COMPLIANT)
```

**`OMITTED_*` 只证明遗漏原因可追踪，不代表 Required 契约已满足**——V1 隐含混淆此点，V2 显式分离。

### 5.3 违规响应分级〔PD——具体策略 HA〕

| 级别 | 行为 | 适用 |
|---|---|---|
| **BLOCK** | 阻止请求发出 | REQUIRED_CONTRACT_VIOLATION(SOURCE_MISSING) 且源为关键 Truth 源 |
| **DEGRADE** | 降级继续+显式告警+审计标记 | REQUIRED_CONTRACT_VIOLATION(OMITTED_BY_BUDGET) |
| **WARN** | 记录+继续 | 首次违规观测 |

哪类源触发哪级=**HA**（并入 Q-UC-1 裁决）。

### 5.4 传递保证与冲突处理 〔PRESERVED——术语更新为三概念体系〕

## 6. Planning Transformation Contract 〔PRESERVED〕

T-1~T-5 不变。volumeGoals 必须可证明消费（T-1）；意图替换禁止（T-4）；Plan↛Actual（T-5）。

## 7. POV / Presence / Access / Participation Contract 〔REVISED per R3〕

### 7.1 概念定义（拆分 Planned/Actual Presence）

| 概念 | 定义 | 数据权威 | 来源 | 生命周期 | 消费者 | 缺失行为 |
|---|---|---|---|---|---|---|
| Primary POV | 书级默认主视角 | authored 标记 | writing bible/角色档 | 建书时定 | POV 轮换默认起点 | 解析失败→上呈（禁数组默认） |
| Scene POV | 单场景视角 | 章计划 | authored plan>grid>锚兜底 | 单场景 | writer/beat | POV_UNRESOLVED |
| **Planned Presence** | 规划层预期在场角色集 | 章计划 | authored cast 或场景目标涉事者推导 | 单场景（规划期） | beat keys/IB 预算 | 未声明→推导→仅 POV |
| **Actual Presence** | 正文实际在场证明 | **Actual Events**（prose 提取） | 提取门（既有） | 单事件 | T2/SR/Access | 现行 fail-closed |
| Access | 角色可获得的信息 | 既有 Access 链〔FC〕 | — | 单事件 | T2/SR | fail-closed |
| Participation | 事件实际参与 | Actual actors/affected | 提取门 | 单事件 | T2/attribution | — |

### 7.2 Planned vs Actual 边界〔REVISED——核心新增〕

- **Plan 推导结果不得直接成为 Actual Presence**——Planned Presence 是 Control 层预算/上下文工具，Actual Presence 唯一来源=prose→提取门→Actual Events。〔PD，Plan↛Actual 冻结原则的直接应用〕
- **Planned Presence 不得绕过 Actual/Information Boundary 直接制造角色知识**——它仅影响 prompt 预算分配（谁的可能段被召回），不影响任何 Truth 槽。〔PD〕
- 消费者义务区分：Control 层消费者（beat keys）可读 Planned；Truth 层消费者（T2/SR）只读 Actual。

### 7.3 POV∈Presence 条件化〔REVISED〕

V1 将 `POV ∈ Presence` 设为恒真——V2 条件化：

- **Planned Presence ⊇ {Scene POV}**：恒真（规划层 POV 必然预期在场）。
- **Actual Presence ⊇ {Scene POV}**：**不恒真**——POV 角色可在某事件发生时不在场（例：POV 离场后场景尾事件）；实际在场由 Actual Events 的 actors 判定。

### 7.4 POV 三机制修订 〔PRESERVED——与 V1 §7 关键修订一致〕

## 8. Runtime Architecture Boundary 〔REVISED per R4〕

### 8.1 Character World 的正确定位〔REVISED——V1 误述〕

**Character World 是受 Actual + Access 约束的角色长期经验和主观形成载体**〔FC——CW 四层冻结语义〕，**不是通用 Truth 数据库**。其内容纪律（反洗白/槽仅 seed/T2 六契约/T3 双通道）全部维持。

V1 §8 将 character_brains 定义为「降为 Studio 层 presentation 缓存」——**此判定缺乏证据支持**（character_brains 的实际消费链尚未完成考古，UNKNOWN）。V2 撤回该定位，改为：

| 载体 | V2 定位 | 依据 |
|---|---|---|
| character_world（world.json） | Truth 层角色主观载体〔FC〕——CW/T2/T3/投影链 | 冻结契约 |
| character_brains（*.yaml） | **UNKNOWN——定位待前置考古** | 消费链未证 |

### 8.2 Q-UC-5 前置依赖〔REVISED〕

Q-UC-5 在裁决前**必须完成一次只读考古**：character_brains 的完整读写链（谁初始化、谁消费、与 CW 的数据流向）。无此考古则双链关系裁决无事实基础。

### 8.3 其余共享/分叉清单 〔PRESERVED〕

## 9. Production Observability Contract 〔REVISED per R2——增加合规层〕

Context Manifest 七态保持（INCLUDED / OMITTED_BY_POLICY / OMITTED_BY_BUDGET / NOT_RELEVANT / SOURCE_MISSING / TRANSFORMATION_FAILED / NOT_OBSERVED）。

**V2 新增合规判定层**：在七态之上按 §5.2 模型计算 Contract Compliance（COMPLIANT / REQUIRED_CONTRACT_VIOLATION / CLASSIFICATION_CONFLICT / COMPLIANCE_UNKNOWN）。

**铁律不变**：NOT_OBSERVED ≠ INCLUDED ≠ COMPLIANT。〔PRESERVED〕

## 10. Q-UC-1 ~ Q-UC-6 Human Adjudication Package 〔REVISED per R4/R5〕

### Q-UC-1 世界事实进入 Beat 的语义保障 〔REVISED per R5〕

**已证**：不变。
**需裁决**（焦点修正——移除预设数值）：
1. **书级世界信息的最低语义保障**：哪些世界要素（核心地点/时代/关键规则/势力格局）属于每个 Beat 的 REQUIRED 背景，哪些属于 OPTIONAL-by-relevance？
2. **消费范围**：REQUIRED 世界保障在 Beat 级注入还是在 Scene 级注入+Beat 继承？
3. **Required/Optional 区分**：由谁定义（书级 authored 配置/系统默认模板/Human 逐书裁决）？
4. **预算分配**：属后续实现 EO——不提前冻结数值（V1 的 ≤40 字建议撤回）。

**方案（语义层）**：
- A（固定核心集 REQUIRED）：书级身份（核心地点+时代）+ 关键规则为 REQUIRED，其余 OPTIONAL。
- B（Scene 级 REQUIRED + Beat 继承）：世界锚 Scene 首拍 REQUIRED，Beat 间经 accumulatedText 继承（继承效果 NOT_OBSERVED 可接受）。
- C（分层混合）：核心集 REQUIRED（Scene 级）+ 相关性召回 OPTIONAL（Beat 级）。
**不能自决因**：定义「作者世界意图在每次生成中的最低在场权」=Control 层宪法级。
**建议裁决问题（Decision Question）**：「世界信息的 REQUIRED 集与消费范围采 A/B/C？」（推荐 C——仅为建议）
**附带裁决**：REQUIRED_CONTRACT_VIOLATION 的响应分级（§5.3 BLOCK/DEGRADE/WARN 何源适用何级）。

### Q-UC-2 volumeGoals 契约地位 〔PRESERVED〕

方案 A（选材池+替换留痕）/ B（must_have 校验）/ 不消费。推荐 A。

### Q-UC-3 POV 三机制优先序 〔PRESERVED〕

方案 A（authored>grid>锚兜底）/ B（现状+告警）。推荐 A。

### Q-UC-4 Presence 来源 〔REVISED per R3〕

**方案 A（场景目标涉事者推导）**：Planned Presence = 从 scene.goal/conflict 提取涉事角色（经 G1-A resolve）∪ {Scene POV}——仅作 Control 层预算工具。
**方案 B（authored cast 声明）**：chapter_plan 增加 cast 槽，缺失时推导兜底。
**新增约束**：无论 A/B，Planned Presence 不进任何 Truth 槽（§7.2）。
**推荐**：混合（B 优先+A 兜底）。

### Q-UC-5 Studio/Runtime 双链 〔REVISED per R4〕

**前置依赖（新增）**：必须先完成 character_brains 只读考古（初始化者/消费者/与 CW 数据流向/同名概念语义差异）。
**方案调整**：
- A（显式分工）——须等考古证明 character_brains 消费链后方可裁决其「降级/桥接/维持」。
- B（桥接）——同上。
- C（维持现状+Architecture Divergence 文档化）——可立即裁决。
**V2 表述**：不预设 character_brains 为 presentation cache；双链裁决拆为两步——C 可先裁；A/B 待考古。

### Q-UC-6 Beat prompt 可观察性 〔PRESERVED〕

方案 A（全量 Manifest）/ B（抽样+哈希）。推荐 A。

## 11. Design Risks and Unresolved Dependencies 〔PRESERVED+REVISED〕

| 风险 | V2 补充 |
|---|---|
| character_brains 考古缺失 | 升级为 Q-UC-5 **硬前置**（V1 列为建议） |
| REQUIRED 违规响应策略 | 显式并入 Q-UC-1 附带裁决 |
| 修复顺序 | 维持 V1 §11；增加「character_brains 考古」为独立先行项 |

## 12. Proposed Validation Criteria 〔PRESERVED——术语对齐三概念〕

| 契约 | 验证标准 |
|---|---|
| §4 意图 | 任一 authored 源可追踪至 Inclusion Status + Contract Compliance（非仅 INCLUDED） |
| §5 传递 | Manifest 对全部 Required 源给出 Compliance 判定 |
| §6 转换 | volumeGoals 消费痕迹/INTENT_REPLACED 记录 |
| §7 POV | Planned≠Actual Presence 分离可验证（Actual Presence 仅从 Actual Events 提取） |
| §9 观测 | 七态+合规判定完整 |
| 端到端 | 同 V1 |

## 13. STOP

> **DESIGN V2 DRAFT COMPLETE — WAITING FOR HUMAN ADJUDICATION — STOP**

V1→V2 变更清单：R1（Authorial=来源概念+权威分类表修正）/ R2（三概念拆分+REQUIRED_CONTRACT_VIOLATION）/ R3（Planned/Actual Presence+条件化 POV∈Presence）/ R4（CW 回归冻结语义+撤回 brains 定位+Q-UC-5 前置考古）/ R5（Q-UC-1 移除数值预设）。保留项：六层结构/四层区分/Plan↛Actual/volumeGoals 可证明消费/Manifest/NOT_OBSERVED≠INCLUDED/六项 HA 框架。
