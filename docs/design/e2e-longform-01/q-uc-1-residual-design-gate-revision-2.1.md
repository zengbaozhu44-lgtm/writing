# Q-UC-1 — Residual Design Gate · Revision 2.1

**Status**: `Q-UC-1 — HS-7 HUMAN SEALED — OPTION A — STATUS SYNCHRONIZED`
**Date**: 2026-11-01（创建+Rev2.1 修正+HS-7 Seal 同步）· **Mode**: READ-ONLY DESIGN DOCUMENT REVISION（零代码/零数据）
**前置**: Rev2 保留为历史（`q-uc-1-residual-design-gate-revision-2.md`）——本文件为当前权威修订版
**标注**: 〔SEALED〕Human 已裁 · 〔SEALED-P〕原则级已裁 · 〔V2.2〕冻结定义 · 〔CODE〕代码现状 · 〔E2E〕实证 · 〔PD〕GLM 新提候选（非契约）· 〔PEND〕需 Human 最终裁决 · 〔HR〕HUMAN REVIEW REQUIRED

## Rev2 → Rev2.1 修改对照表

| 项 | Rev2 问题 | Rev2.1 修正 |
|---|---|---|
| R1 | §2.3 将三态称为「三个独立 Truth 状态」——分类不准确 | 改为 Context Control State / Narrative Intent State / Character Knowledge State（三个独立但不同 Authority 层） |
| R2 | §1.3/§1.5 将 Clock/IB/续写/目标链 BLOCK 映射写成接近 V2.2 推导 | 全部降级为 `PD — HUMAN REVIEW REQUIRED`；Requirement Classification 标为 `UNKNOWN / PENDING` |
| R3 | G-1↔G-2 循环依赖未解决 | 显式标记循环+提供候选 A/B（不自行选择） |
| R4 | §5 标题写 G-1~G-6 但含 G-7 | 统一为 G-1~G-7 |

---

## 1. Q-UC-1-c 修订 BLOCK / DEGRADE / WARN 矩阵

### 1.1 三维度分离

| 维度 | 含义 | 时机 |
|---|---|---|
| **Inclusion Compliance** | Inclusion Status 是否满足 Requirement 的包含面（V2.2 §5.2 14 格矩阵） | 事后审计 |
| **Data Quality Signal** | 独立的数据质量观测信号（非合规维度、不改变 Compliance 判定） | 事后观测 |
| **Operational Response** | 当前请求的运行时响应（BLOCK/DEGRADE/WARN/NONE） | 运行时 |

**Optional 状态消歧**：

| Optional 状态 | Inclusion Compliance | Data Quality Signal | Operational Response |
|---|---|---|---|
| OMITTED_BY_POLICY / BY_BUDGET / NOT_RELEVANT | **PASS** | 无 | **NONE** |
| SOURCE_MISSING | **PASS** | **有** | **NONE**（质量信号走观测通道） |
| TRANSFORMATION_FAILED | **PASS** | **有** | **NONE**（同上） |
| NOT_OBSERVED | **UNKNOWN** | 无 | **NONE**（不能自动视为 PASS） |
| INCLUDED | **PASS** | 无 | **NONE** |

### 1.2 Truth 源 BLOCK 适用范围

| 类别 | 定义 | BLOCK 候选？ | 判定依据 |
|---|---|---|---|
| **T-1 契约证明的当前请求 Required** | 经 Requirement Classification 已判 REQUIRED 且缺失破坏合法运行 | **PD — HR**：BLOCK 资格需 Human 确认 T-1 判定标准（=G-7/HS-4） | 须有契约证据 |
| **T-2 条件分支输入缺失** | 条件分支（如 CW sync）输入缺失但当前请求未 Require 该分支 | **否**——按当前请求 Requirement Classification 判定 | 未 Require→缺失不构成违规 |
| **T-3 存在性/消费未观察** | 来源存在与否/生产链是否实际消费——UNKNOWN | **否**——保持 UNKNOWN | 不得从条件性激活状态推导已证明故障 |

**E2E 实证**：CW seeds 在 E2E 书中不存在→T-2→缺失=NONE+DATA_QUALITY_SIGNAL，非 BLOCK。

### 1.3 Clock / IB / 续写基准 / 目标链逐项分析

**关键降级（R2）**：以下四项的 BLOCK 映射全部为 **PD — HUMAN REVIEW REQUIRED**（Rev2 曾写为可从 V2.2 推导——不准确）。

**降级理由**：
- PROTECT_RE 存在不自动证明某来源属于 Required（PROTECT_RE 是代码中的保护段清单，非契约定义的 Requirement Classification）
- 代码中存在某个保护段不自动证明其在每次请求中成功注入（注入效果当前 NOT_OBSERVED——beat prompt 未持久化）
- 缺失与下游风险之间的关系（如续写原文缺失→复读风险）是**经验关联**而非「当前请求无法合法执行」的契约推导
- 若缺少契约证据证明 Required → Requirement Classification 应为 **UNKNOWN / PENDING**

| 项 | 来源 | 适用请求范围 | 代码保护机制 | Requirement Classification | BLOCK 建议 | 证据等级 |
|---|---|---|---|---|---|---|
| **Story Clock** | resolveStoryClock → buildProtectedSemanticContext | 全部含时间叙事的 Beat | PROTECT_RE 含 Clock | **PENDING**（V2.2 §9 保护意图存在，但「全部 Beat 必须 Required」未 Seal） | **PD — HR**：候选 BLOCK | 〔V2.2 §9 保护意图〕+〔CODE PROTECT_RE〕 |
| **Information Boundary** | buildProtectedSemanticContext 固定文案 | 全部含 SR 块的请求 | PROTECT_RE 含 IB | **PENDING**（同上） | **PD — HR**：候选 BLOCK | 同上 |
| **Beat 续写原文** | takeContinuationTail——取上一拍末句 | 仅非首拍 Beat | PROTECT_RE 含【续写原文】 | **PENDING**（续写基准缺失→复读风险=经验关联；「无法合法执行」未证） | **PD — HR**：缺失时可选 BLOCK 或 DEGRADE——复读风险是经验证据（E2E ch10 三次死锁）但非契约定义的非法执行 | 〔CODE〕+〔E2E〕 |
| **目标链** | Scene goal → Plan Validity → PROTECT_RE | 仅 Scene 首拍 | PROTECT_RE 含目标链 | **PENDING**（缺失→Writer 失去叙事指令=功能损失但非非法执行） | **PD — HR**：候选 DEGRADE 或 BLOCK | 〔V2.2 §9〕+〔CODE〕 |

### 1.4 连续遗漏升级规则

全部 PENDING（不提默认数值）：

| 待裁项 | 状态 |
|---|---|---|
| N 的累计范围 | 〔PEND〕 |
| 跨 Scene 是否累计 | 〔PEND〕 |
| 成功后是否重置 | 〔PEND〕 |
| 按来源分别 vs 全局 | 〔PEND〕 |
| 默认数值 | 〔PEND〕 |

### 1.5 完整修订矩阵（14 行 12 列）

**R2 修正**：行 1-4 的 Requirement/Operational Response 全部标注为 PD — HR。

| # | Source Type | Source Authority | Requirement | Applicability | Inclusion Status | Inclusion Compliance | Data Quality Signal | Operational Response | Downstream Impact | Evidence Level | Remaining Ambiguity |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Story Clock | Control | **PENDING** | 全部含时间叙事的 Beat（PD） | SOURCE_MISSING | **UNKNOWN**（Requirement 未定→不判 VIOLATION） | 有 | **PD — HR：候选 BLOCK** | Writer 可能虚构时间 | 〔V2.2 §9 保护意图〕+〔CODE PROTECT_RE〕+〔PD BLOCK〕 | Required 未 Seal；BLOCK 资格未 Seal |
| 2 | Information Boundary | Control | **PENDING** | 全部含 SR 的请求（PD） | SOURCE_MISSING | **UNKNOWN** | 无 | **PD — HR：候选 BLOCK** | IB 约束失效 | 同上 | 同上 |
| 3 | Beat 续写原文 | Control | **PENDING** | 仅非首拍（PD） | SOURCE_MISSING | **UNKNOWN** | 无 | **PD — HR：候选 BLOCK/DEGRADE** | 复读风险（经验非契约） | 〔CODE〕+〔E2E ch10〕+〔PD〕 | 续写缺失→复读=经验关联非「无法执行」 |
| 4 | 目标链 | Control | **PENDING** | 仅 Scene 首拍（PD） | SOURCE_MISSING | **UNKNOWN** | 无 | **PD — HR：候选 BLOCK/DEGRADE** | 叙事指令缺失 | 〔V2.2 §9〕+〔CODE〕+〔PD〕 | 同上 |
| 5 | T-1 契约证明 Required Truth 源 | Truth | REQUIRED（前提=T-1 判定成立） | 当前请求确实 Require | SOURCE_MISSING / TRANSFORMATION_FAILED | **VIOLATION** | 有 | **PD — HR：候选 BLOCK** | 下游链无法合法运作 | 〔V2.2〕+〔SEALED-P c〕 | T-1 判定标准未 Seal（HS-4/G-7） |
| 6 | 核心世界约束（核心集） | Control（书级 authored→核心集） | REQUIRED | Scene 级 | OMITTED_BY_BUDGET | **VIOLATION** | 无 | **DEGRADE**（SEALED-P c 原则级） | Scene Required 未满足 | 〔SEALED-P c〕+〔V2.2 §5.4〕 | 连续升级 PENDING（HS-3） |
| 7 | 核心世界约束 | 同上 | REQUIRED | Scene 级 | OMITTED_BY_POLICY | **VIOLATION** | 无 | **DEGRADE** | 同上 | 同上 | 同上 |
| 8 | 核心世界约束 | 同上 | REQUIRED | Scene 级 | SOURCE_MISSING | **VIOLATION** | **有** | **DEGRADE** | 上游数据质量 | 〔E2E AN-2〕 | 信号通道 G-6 |
| 9 | 召回世界信息（召回集） | Control | OPTIONAL | Beat 级 | OMITTED_BY_POLICY / BY_BUDGET / NOT_RELEVANT | **PASS** | 无 | **NONE** | 无违规 | 〔V2.2 §5.2〕 | 无 |
| 10 | 召回世界信息 | 同上 | OPTIONAL | Beat 级 | SOURCE_MISSING / TRANSFORMATION_FAILED | **PASS** | **有** | **NONE** | 上游数据质量 | 〔V2.2 §5.2〕 | 同上 |
| 11 | 召回世界信息 | 同上 | OPTIONAL | Beat 级 | NOT_OBSERVED | **UNKNOWN** | 无 | **NONE** | 不能视为 PASS | 〔V2.2 铁律〕 | 无 |
| 12 | T-2 条件分支输入 | 视分支 | 视当前请求 | 当前请求未 Require | SOURCE_MISSING | **PASS**（非 Required） | **有** | **NONE** | 非违规 | 〔V2.2 Err-R2-B〕 | 分支激活判定 G-7 |
| 13 | T-3 存在性/消费未观察 | 视来源 | UNKNOWN | UNKNOWN | NOT_OBSERVED | **UNKNOWN** | 无 | **NONE** | 不得升级为故障 | 〔V2.2 Err-R2-B〕 | 无 |
| 14 | OPTIONAL 反复 OMITTED_BY_POLICY | Control | OPTIONAL | Beat 级 | — | **PASS** | 可能有分类错位信号 | **WARN**（统计） | 分类可能错位 | 〔V2.2 §5.4〕 | 无 |

### 1.6 可推导性分类

| 规则类别 | 行号 |
|---|---|
| 直接从 V2.2 推导 | 9-11（§5.2 矩阵）、12-13（Err-R2-B）、14（§5.4） |
| 来自 Human 已 Seal 原则 | 5-8（SEALED-P c「五维分级」+ DEGRADE 原则级） |
| **GLM 新提候选（PD — HR）** | **1-4 的 BLOCK 映射**、行 12 T-2 分类 |
| 仍需 Human 最终裁决 | 全矩阵确认+行 1-4 Requirement/Response+行 5 T-1 标准+HS-3 |

---

## 2. Q-UC-1-d 三层作用域分类

### 2.1 三层定义

| 层 | 作用域 | 定义 | 核心集注入时机 |
|---|---|---|---|
| **Book-level Persistent** | 整本书 | 持续有效的作者指定约束 | 每章 Scene 首拍 |
| **Phase/Volume-level Scoped** | 指定卷/阶段 | 仅在范围内持续的约束——范围外退出核心集 | 当前卷内 Scene 首拍 |
| **Scene-level Local** | 特定 Scene | 仅在该 Scene 有效 | 仅该 Scene 首拍 |

### 2.2 三层分类矩阵

（与 Rev2 §2.2 相同——10 要素×8 列不变，此处不重复。引用 Rev2 该节。）

### 2.3 三层 vs Actual 的关键区分〔REVISED per R1〕

Rev2 将三态称为「三个独立 **Truth** 状态」——**不准确**。修正为三个**相互独立、不属于同一 Authority 层**的状态：

#### 状态 1：Context Control State
- **定义**：作者指定的约束是否被纳入生产上下文
- **Authority 层**：Story Control / Production Context
- **判定**：Core Inclusion（Scene 首拍 Inclusion Status）
- **不等于**：Reality、Actual、Canon——纳入上下文不产生任何 Truth 事实

#### 状态 2：Narrative Intent / Plan State
- **定义**：当前 Scene 是否**计划**揭示某线索
- **Authority 层**：Authorial Intent / Planning Control
- **判定**：Scene 计划（goal/required_event/story-map）
- **不等于**：事件已发生——计划揭示≠Actual Consequence；Plan ≠ Actual

#### 状态 3：Character Knowledge State
- **定义**：角色是否通过合法 Access / Information Boundary 获得信息
- **Authority 层**：Story Truth（Character Subjective）
- **判定**：须由 Actual + Access 等既有契约约束
- **不等于**：可被 Context Injection 或 Writer prose 直接授予——Context 不获得 Truth Authority；Prose 不是 Reality Authority

#### 五条不可推导线

- **Core ≠ Actual**：约束进入 Core 不产生事件事实
- **Core ≠ Canon**：约束进入 Core 不成为 Canon
- **Scene Plan ≠ Actual Consequence**：计划揭示不等于已发生
- **Writer prose ≠ Reality Authority**：Writer 写出某事实不使其成为 Reality
- **三者相互独立，不得相互推导**：Context Control 不推导 Character Knowledge；Plan 不推导 Actual

### 2.4 Recall 独立职责

（与 Rev2 §2.4 相同——引用。）

### 2.5 作者配置权与 Planner 权限三分

（与 Rev2 §2.5 相同——引用。）

---

## 3. C 方案一致性审查

（与 Rev2 §3 七问相同——引用。结论不变：4 个语义缺口+3 项一致。）

---

## 4. AN-1 能力边界

（与 Rev2 §4 相同——引用。三方案能力边界已修正，不再声称「完全/大部分解决」。）

---

## 5. G-1~G-7 缺口更新〔REVISED per R3/R4〕

### G-1 与 G-2 的循环依赖〔REVISED per R3〕

Rev2 写 G-1→G-2 且 G-2→G-1——**循环未解决**。本版显式标记并提供两个候选顺序（**不自行选择**）：

| 候选 | 步骤 | 优点 | 风险 |
|---|---|---|---|
| **A 语义先行** | ①Human 裁定 Book/Volume/Scene 继承语义与作用域边界→②依据已裁语义设计最小 Schema→③设计继承实现 | 语义定则 Schema 稳；避免 Schema 反向约束语义 | 语义裁定需理解三层全部边界——审查负担大 |
| **B 最小结构先行** | ①Human 裁定最小 Schema 须表达的语义维度→②确定最小概念结构（不冻字段名）→③裁继承路径与冲突规则→④完成 Schema | 分步小裁；快速进入可实现阶段 | 概念结构可能遗漏语义维度→后续返工 |

### 完整缺口表

| # | 缺口 | 类型 | 需 Human？ | 可从冻结契约推出？ | 需 Named EO？ | 依赖 |
|---|---|---|---|---|---|---|
| G-1 | 书级 Required 配置载体/Schema | **Design Gap** | **是**（HS-5） | 否 | 是 | **与 G-2 循环——待 Human 选 A/B 路径** |
| G-2 | Book→Scene Core 继承路径（含 Volume 范围+三层合并） | **Semantic Gap** | **是**（HS-6） | 否 | 是 | **与 G-1 循环——待 Human 选 A/B 路径** |
| G-3 | Core 注入格式 | **Design Gap** | 部分（格式影响 PROTECT_RE 语义→需确认） | 否 | 是 | G-2 |
| G-4 | Scene 重规划后重新注入+Inclusion 证据失效规则 | **Semantic Gap** | **是** | 否 | 是 | Q-UC-6（Manifest） |
| G-5 | Recall keys 扩展规则 | **Design Gap** | 否（纯实现设计） | 部分（可从三层+Recall 职责推导原则） | 是 | G-2 |
| G-6 | DATA_QUALITY_SIGNAL 载体与上报通道 | **Observability Gap** | 否（观测层设计） | 是（V2.2 §9 已定义概念） | 是 | Q-UC-6 |
| G-7 | T-2 条件分支激活判定标准 | **Semantic Gap** | **是**（HS-4） | 否 | 是 | Q-UC-1-b Schema |

---

## 6. Human Seal 状态

| # | 项目 | 性质 | 状态 |
|---|---|---|---|
| HS-1 | Q-UC-1-c 最终映射矩阵（含行 1-4 的 Requirement/Response 确认） | 契约 | **PENDING** |
| HS-2 | Q-UC-1-d 三层分类矩阵确认 | 契约 | **PENDING** |
| HS-3 | 连续遗漏升级规则 | 契约 | **PENDING** |
| HS-4 | T-1「契约证明的 Required Truth 源」判定标准（=G-7） | 语义 | **PENDING** |
| HS-5 | G-1 Schema 设计方向 | 设计 | **PENDING** |
| HS-6 | G-2 继承路径选择 | 语义 | **PENDING** |
| HS-7 | G-1/G-2 循环依赖解决顺序 | 流程 | **SEALED — OPTION A (SEMANTIC-FIRST)** |

### HS-7 Seal Record

> Human 已正式选择 **Option A（Semantic-first）**。
>
> 后续设计审查顺序：①Book / Volume / Scene inheritance semantic principles → ②Minimum conceptual structure → ③Schema design。
>
> - 该 Seal **只冻结审查顺序**——不代表 G-2 三个子缺口已裁决。
> - 不代表任何具体继承机制或 Schema 已确定。
> - A/B 候选分析保留为历史审查记录（见 `docs/design/phase-4/e2e-longform-01-q-uc-1-hs-7-human-review.md`）。
> - A 已选，B 未选。
> - 不授权 Named EO 或生产实现。

## 7. 冻结边界一致性检查

| 检查 | 结果 |
|---|---|
| Q-UC-1-a SEALED C 未被修改 | ✓ |
| Q-UC-1-b SEALED-P 未被扩张为 Schema Seal | ✓ |
| Q-UC-1-c SEALED-P 未被扩张为矩阵 Seal | ✓ |
| Q-1-d SEALED-P 未被扩张为分类 Seal | ✓ |
| R1 未修改 Truth/Control/Realization 架构 | ✓（三态归属修正为不同 Authority 层——不改架构本身） |
| R2 未将 PD 写成 V2.2 契约 | ✓（全部标注 PD — HR） |
| R3 提供候选 A/B 未自行选择 | ✓（原 Rev2.1 R3——现已由 Human Seal 选 A） |
| HS-7 Seal 仅冻结顺序 | ✓（G-2 三子缺口仍 PENDING；无具体继承机制/Schema 确定） |
| HS-1~HS-6 全部保持 PENDING | ✓ |
| V2.2 FINAL+ERRATA 未修改 | ✓ |
| 生产代码未修改 | ✓ |

## 8. 仍无法由现有证据确定的问题

| 问题 | 缺失证据 |
|---|---|
| Clock/IB/续写/目标链在每次真实请求中是否实际成功注入 | Beat prompt 未持久化（NOT_OBSERVED） |
| 续写原文缺失是否真的导致复读死锁（因果 vs 相关） | E2E ch10 三次死锁为经验关联，未做因果对照实验 |
| 核心集注入后 Writer 是否实际使用世界信息 | 无 L4 语义满足标准 |
| ~~G-1/G-2 的最优解决顺序~~ | ~~已由 HS-7=SEALED A 解决~~ → 下一步=裁决三层继承语义原则 |
| T-2 分支激活的具体判定条件 | 须先定 Q-UC-1-b Schema |

---

> **Q-UC-1 — RESIDUAL DESIGN GATE REVISION 2.1 COMPLETE — AWAITING HUMAN REVIEW**
