# E2E-LONGFORM-01 — Unified Production Context Contract · Design Gate Draft

**Status**: DESIGN GATE DRAFT — WAITING FOR HUMAN ADJUDICATION · NOT FROZEN
**Date**: 2026-10-26 · **Mode**: DESIGN ONLY（零实施/零代码/零数据/零 EO）
**标签体系**: 〔FC〕=DERIVED FROM FROZEN CONTRACT · 〔OI〕=SUPPORTED BY OBSERVED IMPLEMENTATION · 〔PD〕=PROPOSED DESIGN · 〔HA〕=REQUIRES HUMAN ADJUDICATION · 〔NP〕=NOT PROVEN
**输入**: e2e-longform-01-context-integrity-archaeology.md + unified-production-context-contract-archaeology.md + InkOS V2.0 冻结架构

---

## 1. Executive Summary

本设计基于一个已被实证的核心事实：**当前 Studio Living 生产链中，作者意图到 Beat LLM 请求的传递无任何契约保障**——四层递进衰减（初始化损坏→规划替换→编译排除→Beat 裁剪）中每一步都是实现默认而非语义决策。本提案不新增 Engine、不扩预算、不建平行 Lore；它做三件事：

1. **定义六层契约**（意图分类→传递规则→转换规则→POV 语义→架构边界→可观察性）使每个传递节点有明确的权威归属与缺失处理；
2. **将六个实现默认升格为显式 Human 裁决项**（Q-UC-1~6）——这些决策无法由实现者做出因为它们定义「作者意图在生产中的语义地位」，属于 Story Control 层宪法级选择；
3. **给出可验证的合同条款**——每条契约附带验证标准，使后续 EO 可以证明「契约被满足」而非「字段存在」。

## 2. Existing Frozen Contract Compatibility

| 冻结契约 | 兼容性 | 依据 |
|---|---|---|
| Story Truth/Control/Realization 三层分离 | **完全兼容**——本设计强化 Control 层内部契约，不触 Truth 层 | 〔FC〕V2.0 架构 |
| Writer ≠ Truth Authority | 兼容——Writer 上下文契约仅约束 Realization 层输入 | 〔FC〕 |
| Plan ↛ Actual / Prose↛Automatic Actual | 兼容——本设计不改变任何 Actual 准入门 | 〔FC〕EO-P2/S6.1 |
| G1-A Character Identity（03_bible 唯一录取） | 兼容——POV 契约引用 G1-A CharacterRef | 〔FC〕G1-A Seal |
| G1-B Affect Basis（图边不直投 SR） | 兼容——不动 affect 通道 | 〔FC〕G1-B Seal |
| G1-C Event Identity（证据锚） | 兼容——Actual 回读引用锚定 ID | 〔FC〕G1-C Seal |
| Q-S1-c（08.时间载体）+ Q-T1-B′（时间权威） | 兼容——Clock 契约直接引用 B′ 五规则 | 〔FC〕Gate 2 Seals |
| P6（不自动授权新门/载体/引擎） | **本设计全部为提案**——无一自动生效 | 〔FC〕 |

## 3. Unified Authority Model

```
Authorial Intent（作者意图——非 Truth 非 Control 而是权威的源头）
    ↓ 录取（各载体 admission，已冻结构）
Carriers（01/03/04/05/07/09/10/15/…各守其类）
    ↓ 规划转换（本章 §6 契约）
Planning Control（planChapter/story-map/beat plan——Control 层）
    ↓ 上下文编译（本章 §5 契约）
Production Context（basePrompt→beat prompt——Realization 输入）
    ↓ Writer 执行
Prose → Actual Admission（既有 Truth 门，本设计零触碰）
```

**关键分离**〔PD〕：本模型显式区分 **Intent（意图）**、**Carrier（载体）**、**Context（上下文）**、**Request（请求）** 四个存在层级——「意图被保存」（Carrier 层）、「上下文被编译」（Context 层）、「请求包含某段」（Request 层）是三个独立事实，各自需要独立证明。当前系统的根本缺陷是只有第一层存在（Carrier），后两层无契约。

## 4. Authorial Intent Contract 〔PD〕

### 4.1 意图分类

| 类别 | 载体 | 层级 | 权威性质 | 不能直接成为 |
|---|---|---|---|---|
| 世界设定 | 01_world_bible | 书级 | World information（Control 源） | Actual/Reality |
| 卷级叙事意图 | 10_volume_outline | 卷级 | Narrative constraint（Control 源） | 每章必须执行的 Actual |
| 章级意图 | chapter_plan yaml / 09 | 章级 | Chapter task（Control） | Actual |
| 角色设定 | 03_character_bible | 书级 | Character Canon〔FC G1-A〕 | 角色认知（须过 Access） |
| POV 政策 | writing bible / story-map | 书级 | Presentation policy | Scene POV 的事实 |
| 角色认知 | CW seeds / characterSR | 书级 | Character subjective〔FC〕 | 其他角色的认知 |
| NPC 场外动向 | 15_npc_simulation | 书级快照 | World layer input | 角色经验 |

### 4.2 层级继承规则〔PD〕

- **继承**：书级→卷级→章级→场景级，默认继承（下级未声明时用上级）。
- **细化**：下级可细化上级（卷级「三章揭示检测报告」→章级「本章揭示第一段」）。
- **冲突**：同层级内 authored 覆盖派生〔FC 对齐 09 authored_preserved 先例〕；跨层级时**下级细化不得否定上级书级 Canon**（角色身份/世界规则）——细化可改「如何」不可改「是什么」。
- **沉默降级**：上级意图缺失时，规划层不得发明替代意图占据其权威位——应标记 `SOURCE_MISSING` 并按 §9 观测协议上报。

### 4.3 不能自动成为 Actual/Reality 的红线〔FC 重申〕

一切 Authorial Intent → Actual 必须经既有 Actual Admission（extract→validator→G1-C 锚定）。本设计零触碰该门。

## 5. Production Context Contract 〔PD〕

### 5.1 Source Enrollment（上下文源注册）

每个进入编译的源须注册：

| 字段 | 语义 | 示例 |
|---|---|---|
| Source identity | `carrier:section` 唯一标识 | `01_world_bible:rules` |
| Authority | 意图层级（§4.1） | book-level world info |
| Semantic type | fact / policy / task / anchor / memory | fact |
| Scope | book/chapter/scene/beat | book |
| Required/Optional | **必需**=缺失即违规；**可选**=按需召回 | world: optional-by-relevance / clock: required |
| Min budget | 必需源的最低保证（如 >0） | clock: full / world: TBD by Q-UC-1 |

### 5.2 传递保证（核心条款）

**必需上下文**：`Required` 源必须在每个消费者请求中**可证明在场**——通过 §9 观测协议的 `INCLUDED` 状态或 `OMITTED_*` 显式原因。**缺失必需源=契约违规，应阻止请求或降级为可见告警**〔PD——阻止 vs 告警属 Q-UC-1 裁决范围〕。

**可选上下文**：按语义相关性召回（现有 ranking 机制可复用），被裁时记录 `OMITTED_BY_BUDGET/BY_POLICY/NOT_RELEVANT`。

**裁剪责任**：裁剪决策属于编译层（beat-slimmer/compiler），**裁剪者必须为每个被裁必需源留下原因码**——当前无 omission reason 是 E2E-1 的直接技术成因之一。〔OI→PD〕

**冲突处理**：同事实多源冲突时，权威层级决定（authored>derived>inferred；同层按 §4.2）；冲突须记录于观测协议。

### 5.3 与 token budget 的关系

**本契约不规定预算数值**〔设计原则：不以扩预算替代契约〕。契约规定的是：预算分配必须有明确的优先序声明（当前隐式=PROTECT_RE 白名单），必需源的最低保障，以及预算裁剪的原因码义务。预算数值调整属后续 EO 的工程决策。

## 6. Planning Transformation Contract 〔PD〕

| 规则 | 内容 | 依据 |
|---|---|---|
| T-1 volumeGoals 地位 | 卷纲=卷级叙事约束（Narrative constraint）。它**不是**每章 must-execute 事件，但规划层必须**可证明地消费**它——至少在章计划生成时作为约束输入（如 mainGoal 选材池、must_have 校验），并留转换痕迹 | Q-UC-2 裁决具体消费形式 |
| T-2 mainGoal 语义 | 「本章叙事目标」——**从卷纲/上章锚/story-map 三源派生的 Control 指令**，非作者意图本体。派生规则须显式（当前 planner 隐式选择） | OI：ch1 从卷纲/ch2+ 从里程碑 |
| T-3 milestone/required_event | milestone=Control 层导航标记（story-map 生成）；required_event=authored yaml 显式槽〔FC S3.3〕。两者**均非 Actual 前置**——是否达成由后续 prose→Actual 判定 | FC+OI |
| T-4 意图替换禁止 | 规划输出**不得静默替换**作者明确提供的同级意图——authored chapter_plan 存在时 mainGoal 从之（已实现〔FC authored_preserved〕）；不存在时，若 story-map 提供的目标与卷纲冲突，须记录冲突而非默认取一方 | OI：E2E ch2+ 里程碑静默替换卷纲 |
| T-5 Plan↛Actual 防线 | 全部规划产物不进 Actual 准入门——现有防线保持〔FC〕 | FC |

## 7. POV / Presence / Access / Participation Contract 〔PD〕

| 概念 | 数据权威 | 生命周期 | 允许转换 | 消费者 | 缺失行为 | 冲突规则 |
|---|---|---|---|---|---|---|
| **Primary POV** | 书级 authored（writing bible/角色档主角标记） | 建书时定，全书 | 不可被运行时改 | POV 轮换的默认起点 | 解析失败→上呈 Human（**禁止数组顺序默认**） | authored 标记>一切推断 |
| **Scene POV** | 章计划（authored plan 或 grid+规划派生） | 单场景 | primary→scene 是「选择」非「继承」；grid 有建议权、authored plan 有决定权、**锚只有连续性建议权** | writer povName、beat 渲染 | 无解析→`POV_UNRESOLVED`（非默认主角名） | authored plan>grid>锚建议；冲突记录 |
| **Presence** | 章计划的 cast/scene.characters（authored 或规划推导自场景目标涉及者） | 单场景 | POV∈Presence 恒真；**Presence⊇{POV}**（非=） | beat keys、IB 判定 | 未声明→从场景目标提取涉事者；仍无→仅 POV | 无 |
| **Access** | 既有 Access 链〔FC G1-A+CW〕 | 单事件 | 不变 | T2/SR/IB | 现行 fail-closed | 〔FC〕 |
| **Participation** | Actual 事件 actors/affected | 单事件 | 不变 | T2/attribution | 不变 | 〔FC〕 |

**关键修订**〔PD，对应 RC-3/RC-6〕：①`present=[pov]` 改为 `present=cast-derived set ⊇ {pov}`；②POV 解析全链废除数组首名兜底；③priorAnchor.pov 从「无限优先」降为「连续性建议」（仅在 grid 与 plan 均无 POV 时生效）；④POV warning 改读实际 POV 源。

## 8. Runtime Architecture Boundary 〔PD+HA〕

**身份边界保留**〔FC〕：Truth/Control/Realization 不变。

| 组件 | 共享/独立 | 理由 |
|---|---|---|
| Actual 提取+validator+G1-C 锚定 | **共享**（唯一 Truth 门） | 已共享确定性路径；LLM 提取分叉待 Q-UC-5 |
| G1-A entity-identity resolver | **共享** | 已共享（Studio 日志实证） |
| SR/minimal-sr+G1-B | **共享** | 已共享 |
| CW/T2/T3/投影 | **共享代码、条件性激活**（Studio 无 seed 时应显式告警而非静默跳过） | Q-UC-5 裁决 seed 供给义务 |
| Writer 上下文模型 | **分叉维持待裁**——Beat 模式（Studio）vs Scene 整段（Runtime）是 Realization 层两种实现，可并存但须同受 §5 契约约束 | Q-UC-5 |
| character_brains vs character_world | **同名概念双载体**——不得静默并存；选项见 Q-UC-5 | Q-UC-5 |

## 9. Production Observability Contract 〔PD〕

每 Beat LLM 请求须可关联一张 **Context Manifest**（sidecar/日志，非新 Truth 载体——纯审计）：

```
ContextManifest {
  beat_ref, source_id, inclusion_status, reason_code
}
inclusion_status ∈ {
  INCLUDED(附字符范围),
  OMITTED_BY_POLICY(附策略名),
  OMITTED_BY_BUDGET(附预算竞争者),
  NOT_RELEVANT(附相关性分数),
  SOURCE_MISSING(附缺失源),
  TRANSFORMATION_FAILED(附失败点),
  NOT_OBSERVED(仅历史数据)
}
```

**铁律**：`NOT_OBSERVED ≠ INCLUDED`——审计结论与传递事实严格分离。验证标准：任取一章，能对 §5.1 注册的每个 Required 源回答其 inclusion_status。〔设计——实现属后续 EO〕

## 10. Q-UC-1 ~ Q-UC-6 Human Adjudication Package

### Q-UC-1 世界事实进入 Beat 的权威与预算

**已证**：世界段在 Beat 层结构性不可达（keys 裁剪+220 字+PROTECT_RE 无世界）〔PROVEN〕；即使 bible 完好同样不可达（ch1 唯一通路=mainGoal 意外携带）。
**需裁决**：世界信息在 Beat 请求中的**语义地位**——每个 Beat 的必需背景，还是仅场景级/书级锚？
**方案 A（Beat 级必需要素）**：每 Beat 注入 ≤N 字书级世界锚（书名/核心规则/地点），入 PROTECT_RE。影响：全局 token ↑；世界永远在场。
**方案 B（Scene 级注入+Beat 继承）**：世界锚仅 scene 首拍注入，后续 beat 经 accumulatedText 继承。影响：省预算但 beat 可能丢失世界。
**方案 C（相关性召回+必需最低保障）**：世界段进入可选召回池（keys 扩展含地点/势力名），另设 ≤40 字「书级身份锚」（书名+核心地点+时代）为 Required。影响：平衡但需定义相关性。
**兼容性**：均不触冻结契约（纯 Control/Realization 层）。
**不能自决因**：定义「作者世界意图在每次生成中的最低在场权」= Control 层宪法级选择。
**建议 Human Decision Question**：「世界信息以何种最低保障进入每个 Beat 请求——A/B/C/维持现状？」
**推荐**：C（最小成本恢复可达性，保留预算灵活性）——**仅为建议**。

### Q-UC-2 volumeGoals 契约地位

**已证**：卷纲全文在 plan json 三章全程、零消费者〔PROVEN〕；ch2+ mainGoal 被 story-map 里程碑静默替换〔PROVEN〕。
**需裁决**：卷纲→章执行的消费形式。
**方案 A（选材池+冲突检测）**：mainGoal 派生时 volumeGoals 为第一选材源；story-map 目标若替换卷纲来源则记录 `INTENT_REPLACED`。影响：最小侵入、恢复 ch1 式传导。
**方案 B（must_have 校验）**：章计划生成后对照卷纲校验（本章是否偏离卷线），偏离时告警/上呈。影响：更强的约束但可能过度绑定。
**兼容性**：均 Control 层内。
**建议 Q**：「卷纲以 A/B/不消费（纯展示）进入规划？」**推荐 A**。

### Q-UC-3 POV 三机制优先序

**已证**：锚无限优先+grid 只填空+sync 回写=自锁〔PROVEN〕；grid 内容正确而未生效〔OBSERVED〕。
**需裁决**：Scene POV 的权威优先序。
**方案 A（authored>grid>锚建议）**：authored plan 有决定权；无 plan 时 grid 生效；锚仅在双缺时兜底且标记 `POV_INHERITED`。sync 回写只记录不决定。
**方案 B（维持现状+告警）**：仅修 warning 数据源，不改优先序。影响：POV 仍可能锁死。
**不能自决因**：「无 authored plan 时谁导航」=Control 层权威设计。
**建议 Q**：「Scene POV 优先序改为 A（authored>grid>锚兜底）还是 B？」**推荐 A**。

### Q-UC-4 present=[pov] 语义

**已证**：planner:360 将 Presence=[POV]〔PROVEN〕；ch2+ 四角色消失的直接机制。
**需裁决**：Presence 的推导权威。
**方案 A（场景目标涉事者推导）**：present=从 scene.goal/conflict 提取涉事角色（经 G1-A resolve）∪{pov}。
**方案 B（authored cast 声明）**：chapter_plan 增加 cast 槽，缺失时仅 [pov]。
**不能自决因**：Presence 与 G1-A 身份链交叉，且决定「谁可能被写入」。
**建议 Q**：「Presence 来源=A/B/混合（authored 优先+推导兜底）？」**推荐混合**。

### Q-UC-5 Studio/Runtime 双链

**已证**：两套 Writer 模型+两套角色载体+提取器分叉+CW 条件性失败〔OBSERVED〕；无架构文档授权双链〔PROVEN〕。
**需裁决**：双链关系（非「是否合并」而是「契约地位」）。
**方案 A（显式分工）**：Beat 模式（Studio）与 Scene 模式（Runtime）=Realization 层两种**同受 §5 契约约束**的实现；角色认知统一以 character_world 为 Truth 源、character_brains 降为 Studio 层 presentation 缓存（写经 CW 通道）。
**方案 B（桥接）**：维持双载体但定义同步桥（character_brains 从 CW 派生）。
**方案 C（维持现状+文档化）**：记录分叉为已知 Architecture Divergence，后续 Gate 再裁。
**不能自决因**：全局架构裁决，牵动 G1 系列在 Studio 的语义等价性。
**建议 Q**：「A/B/C？」**推荐 A（分阶段）**。

### Q-UC-6 Beat prompt 可观察性

**已证**：无法证明任何意图进入真实 LLM 请求〔PROVEN〕。
**方案 A（Context Manifest sidecar——§9 全量）**：每 beat 写 manifest。
**方案 B（抽样+哈希）**：仅记录 included 源 ID 集合+prompt 哈希（轻量）。
**不能自决因**：新观测载体（非 Truth）需授权边界。
**建议 Q**：「A/B？」**推荐 A（审计完备性优先）**。

## 11. Design Risks and Unresolved Dependencies

| 风险 | 说明 |
|---|---|
| 契约先于实现可能导致 EO 拆分复杂 | 缓解：每裁决项独立 EO 化（§10 各自可独立授权） |
| Required 源的阻止 vs 告警策略未定 | 归 Q-UC-1 附带裁决 |
| character_brains 消费链未证（UNKNOWN） | Q-UC-5 实施前需补一次只读考古 |
| 修复顺序依赖 | 建议：初始化缺陷（RC-2 纯实现）先行→Q-UC-3/4（POV 契约）→Q-UC-1/2（世界/卷纲契约）→Q-UC-5/6 |

## 12. Proposed Validation Criteria

每条契约的「被满足」证明标准：

| 契约 | 验证标准 |
|---|---|
| §4 意图 | 任一 authored 意图可在 Intent Propagation Matrix 中追踪到终态（INCLUDED 或带原因码的 OMITTED_*） |
| §5 传递 | Context Manifest 对全部 Required 源给出 status；随机抽 beat 可复核 |
| §6 转换 | volumeGoals 消费痕迹存在；INTENT_REPLACED 事件有记录 |
| §7 POV | Scene POV 解析路径可追溯；无数组首名兜底命中；Presence⊇{POV} 且含非 POV 时 beat keys 反映 |
| §9 观测 | E2E 重跑 2 章：对世界/卷纲/三线索逐条给出 inclusion_status |
| 端到端 | 修复 E2E 书后重生成 ch2：正文包含雾桥地名≥1、非 POV 角色≥1（**验证性指标而非成功定义**） |

## 13. STOP

> **DESIGN GATE DRAFT COMPLETE — WAITING FOR HUMAN ADJUDICATION — STOP**

本提案无一自动生效；Q-UC-1~6 各自独立等待裁决；未修改代码/数据/EO/测试书；未启动 E2E 扩大测试。
