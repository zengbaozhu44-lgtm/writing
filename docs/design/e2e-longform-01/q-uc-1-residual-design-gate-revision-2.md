# Q-UC-1 — Residual Design Gate · Revision 2

**Status**: `Q-UC-1 — RESIDUAL DESIGN GATE REVISION 2 COMPLETE — AWAITING HUMAN REVIEW`
**Date**: 2026-11-01 · **Mode**: READ-ONLY DESIGN REVISION → CONSISTENCY AUDIT
**Implementation**: NOT AUTHORIZED · **Named EO**: NOT AUTHORIZED
**前置**: Revision 1（`q-uc-1-human-seal-and-residual-design.md`）保留为历史记录——本文件为修订版，不覆盖
**标注**: 〔SEALED〕Human 已裁 · 〔SEALED-P〕原则级已裁 · 〔V2.2〕冻结定义 · 〔CODE〕代码现状 · 〔E2E〕实证 · 〔PD〕GLM 新提候选（非契约） · 〔PEND〕需 Human 最终裁决

---

## 1. Q-UC-1-c 修订 BLOCK / DEGRADE / WARN 矩阵

### 1.1 三维度分离（Revision 1 问题 A 修正）

Revision 1 将 Inclusion Compliance / Data Quality Signal / Operational Response 混在同一列。本版拆分：

| 维度 | 含义 | 时机 |
|---|---|---|
| **Inclusion Compliance** | Inclusion Status 是否满足 Requirement 的包含面（V2.2 §5.2 14 格矩阵） | 事后审计 |
| **Data Quality Signal** | 独立的数据质量观测信号（非合规维度、不改变 Compliance 判定） | 事后观测 |
| **Operational Response** | 当前请求的运行时响应（BLOCK/DEGRADE/WARN/NONE） | 运行时 |

**Optional 状态消歧**（修正 Revision 1 第 6/7 行重叠）：

| Optional 状态 | Inclusion Compliance | Data Quality Signal | Operational Response |
|---|---|---|---|
| OMITTED_BY_POLICY / BY_BUDGET / NOT_RELEVANT | **PASS** | 无 | **NONE** |
| SOURCE_MISSING | **PASS** | **有** | **NONE**（质量信号走 WARN 级观测通道，不是响应） |
| TRANSFORMATION_FAILED | **PASS** | **有** | **NONE**（同上） |
| NOT_OBSERVED | **UNKNOWN** | 无 | **NONE**（不能自动视为 PASS——V2.2 铁律） |
| INCLUDED | **PASS** | 无 | **NONE** |

### 1.2 Truth 源 BLOCK 适用范围（Revision 1 问题 B 修正）

Revision 1 将 CW seeds / characterSR 无条件列为 BLOCK 候选——本版拆分三类：

| 类别 | 定义 | BLOCK 候选？ | 判定依据 |
|---|---|---|---|
| **T-1 契约证明的当前请求 Required** | 该源经 Requirement Classification 已判为当前请求 REQUIRED，且其缺失使下游合法运行不可能 | **是** | 须有契约证据（如 CW seeds 已 seed 且该章 T2/CW 链被 Required 分类激活） |
| **T-2 条件分支输入缺失** | 某条件分支（如 CW sync）的输入缺失，但当前请求未要求该分支激活 | **否**——按当前请求 Requirement Classification 判定 | 若当前请求未将其标为 Required→缺失不构成违规 |
| **T-3 存在性/消费未观察** | 来源存在与否、生产链是否实际消费——UNKNOWN / NOT OBSERVED | **否**——保持 UNKNOWN | 不得从条件性激活状态推导已证明故障（V2.2 Err-R2-B） |

**E2E 实证举例**：CW seeds 在 E2E 书中不存在→T-2（当前请求未 Require CW 链激活）→缺失=NONE+DATA_QUALITY_SIGNAL，非 BLOCK。

### 1.3 Clock / IB / 续写基准 / 目标链逐项（Revision 1 问题 C 修正）

Revision 1 将四项合并为「保护段」——本版逐项：

| 项 | 来源 | 何类请求必须拥有？ | 缺失是否使当前请求无法合法执行？ | 适用范围 | 证据等级 |
|---|---|---|---|---|---|
| **Story Clock** | resolveStoryClock → prompt-survival.js:74 buildProtectedSemanticContext | 任何包含时间/空间叙事的 Beat Request | **是**——缺失使 Writer 可虚构日期/时间→违反 Clock 契约 | 全部 Story Beat 请求 | 〔V2.2 §9 PROTECT_RE〕+〔CODE prompt-survival.js〕 |
| **Information Boundary** | buildProtectedSemanticContext 同上（固定文案） | 任何涉及 Character Subjective State 的请求 | **是**——缺失使 IB 约束（World≠Character Knowledge）失去提示 | 全部含 SR 块的请求 | 〔V2.2 §9〕+〔CODE〕 |
| **Beat 续写原文（Continuation Tail）** | takeContinuationTail（beat-slimmer.js:405-430）——取上一拍末句 | Beat 2+（首拍无续写基准） | **是**——缺失使模型重开场景→复读风险（AN-7 已证） | 仅非首拍 Beat | 〔CODE〕+〔E2E ch10 三次复读死锁实证〕 |
| **目标链（Strategic Goal）** | Scene goal → Plan Validity → Execution Privilege | Scene 级（每 Scene 首拍） | **是**——缺失使 Writer 失去叙事推进指令 | Scene 首拍 | 〔V2.2 §9 PROTECT_RE〕+〔CODE〕 |

**结论**：四项均为 BLOCK 候选但**适用范围不同**——Clock/IB 全请求、续写基准仅非首拍、目标链仅 Scene 首拍。

### 1.4 连续遗漏升级规则（Revision 1 问题 D 处理）

Revision 1 提出「DEGRADE 连续≥N 次升 BLOCK」——本版标记为 **PENDING**：

| 待裁项 | 说明 | 状态 |
|---|---|---|
| N 的累计范围 | 同一 Scene 内？同一章内？跨章？ | 〔PEND〕 |
| 跨 Scene 是否累计 | 若核心集=Scene 级 Required→跨 Scene 累计可能不适定 | 〔PEND〕 |
| 成功后是否重置 | 需定义「成功」=INCLUDED？还是 Full Compliance？ | 〔PEND〕 |
| 按来源分别累计 vs 全局累计 | 不同来源独立计数？ | 〔PEND〕 |
| 默认数值 | 无依据提出——不提默认 N | 〔PEND〕 |

### 1.5 完整修订矩阵（12 列）

| # | Source Type | Source Authority | Requirement | Applicability | Inclusion Status | Inclusion Compliance | Data Quality Signal | Operational Response | Downstream Impact | Evidence Level | Remaining Ambiguity |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Story Clock | Control（派生呈现） | REQUIRED | 全部 Beat 请求 | SOURCE_MISSING | **VIOLATION** | 有 | **BLOCK** | Writer 可虚构时间/日历 | 〔V2.2+CODE〕 | 无 |
| 2 | Information Boundary | Control（固定文案） | REQUIRED | 全部含 SR 的请求 | SOURCE_MISSING | **VIOLATION** | 无 | **BLOCK** | World≠Character Knowledge 约束失效 | 〔V2.2+CODE〕 | 无 |
| 3 | Beat 续写原文 | Control（上一拍正文） | REQUIRED | 仅非首拍 Beat | SOURCE_MISSING | **VIOLATION** | 无 | **BLOCK** | 模型重开→复读风险 | 〔CODE+E2E〕 | 首拍 Beat 的 N/A 处理 |
| 4 | 目标链 | Control（Scene 计划） | REQUIRED | 仅 Scene 首拍 | SOURCE_MISSING | **VIOLATION** | 无 | **BLOCK** | Writer 失去叙事推进指令 | 〔V2.2+CODE〕 | 无 |
| 5 | T-1 契约证明的 Required Truth 源 | Truth（经契约证明当前请求 Require） | REQUIRED | 当前请求确实 Require 该分支 | SOURCE_MISSING / TRANSFORMATION_FAILED | **VIOLATION** | 有 | **BLOCK** | 下游 Actual/T2 链无法合法运作 | 〔V2.2〕+〔SEALED-P c〕 | 「契约证明」的具体判定标准待定 |
| 6 | 核心世界约束（Q-UC-1-d 核心集） | Control（书级 authored→核心集） | REQUIRED | Scene 级 | OMITTED_BY_BUDGET | **VIOLATION** | 无 | **DEGRADE** | Scene Required 未满足 | 〔SEALED-P c〕+〔V2.2 §5.4〕 | 连续升级规则 PENDING |
| 7 | 核心世界约束 | 同上 | REQUIRED | Scene 级 | OMITTED_BY_POLICY | **VIOLATION** | 无 | **DEGRADE** | 同上 | 同上 | 同上 |
| 8 | 核心世界约束 | 同上 | REQUIRED | Scene 级 | SOURCE_MISSING | **VIOLATION** | **有** | **DEGRADE** | 上游数据质量（如 bible 损坏）→降级继续+信号 | 〔E2E AN-2〕 | 信号通道载体 G-6 |
| 9 | 召回世界信息（Q-UC-1-d 召回集） | Control（按需召回） | OPTIONAL | Beat 级 | OMITTED_BY_POLICY / BY_BUDGET / NOT_RELEVANT | **PASS** | 无 | **NONE** | 无违规 | 〔V2.2 §5.2〕 | 无 |
| 10 | 召回世界信息 | 同上 | OPTIONAL | Beat 级 | SOURCE_MISSING / TRANSFORMATION_FAILED | **PASS** | **有** | **NONE**（信号走观测通道） | 上游数据质量 | 〔V2.2 §5.2 COMPLIANT_WITH_DATA_QUALITY_SIGNAL〕 | 同上 |
| 11 | 召回世界信息 | 同上 | OPTIONAL | Beat 级 | NOT_OBSERVED | **UNKNOWN** | 无 | **NONE** | 不能自动视为 PASS | 〔V2.2 铁律〕 | 无 |
| 12 | T-2 条件分支输入 | 视分支 | 视当前请求分类 | 当前请求未 Require | SOURCE_MISSING | **PASS**（非 Required） | **有** | **NONE** | 非违规——条件分支未激活 | 〔V2.2 Err-R2-B〕 | 分支激活判定标准 G-7 |
| 13 | T-3 存在性/消费未观察 | 视来源 | UNKNOWN | UNKNOWN | NOT_OBSERVED | **UNKNOWN** | 无 | **NONE** | 不得从 UNKNOWN 升级为故障 | 〔V2.2 Err-R2-B〕 | 无 |
| 14 | OPTIONAL 反复 OMITTED_BY_POLICY | Control | OPTIONAL | Beat 级 | — | **PASS** | 可能有分类错位信号 | **WARN**（统计汇总） | 分类可能错位（Optional 被当作不可达） | 〔V2.2 §5.4〕 | 无 |

### 1.6 可推导性分类

| 规则类别 | 行号 |
|---|---|
| 直接从 V2.2 推导 | 1-4（PROTECT_RE/§9）、9-11（§5.2 矩阵）、13（Err-R2-B）、14（§5.4） |
| 来自 Human 已 Seal 原则 | 5（SEALED-P c「五维分级」）、6-8（SEALED-P c） |
| GLM 新提候选规则 | 1-4 的具体 BLOCK 建议（V2.2 定义了语义但未映射到具体来源）、12（T-2 分类） |
| 仍需 Human 最终裁决 | 全矩阵最终确认+行 6-8 连续升级规则+行 5 「契约证明」标准 |

---

## 2. Q-UC-1-d 三层作用域分类

### 2.1 三层定义

| 层 | 作用域 | 定义 | 核心集注入时机 |
|---|---|---|---|
| **Book-level Persistent** | 整本书 | 持续有效的作者指定约束——不因章节/阶段变化而失效 | 每章 Scene 首拍 |
| **Phase/Volume-level Scoped** | 指定卷/阶段 | 仅在指定范围内持续的约束——范围外自动退出核心集 | 当前卷内 Scene 首拍 |
| **Scene-level Local** | 特定 Scene | 仅在该 Scene 有效——其他 Scene 不注入 | 仅该 Scene 首拍 |

### 2.2 三层分类矩阵

| Element | Scope | Default Classification | Author Override | Planner Authority | Injection Unit | Omission Consequence | Evidence |
|---|---|---|---|---|---|---|---|
| 时代 | **Book** | **Core（Book）** | ✓ 可升/降 | ✗ | Scene 首拍 | Required VIOLATION → DEGRADE | 〔PD〕持续性约束 |
| 核心地点 | **Book** | **Core（Book）** | ✓ | ✗ | Scene 首拍 | 同上 | 〔PD〕 |
| 持续性世界规则 | **Book** | **Core（Book）** | ✓ | ✗ | Scene 首拍 | 同上 | 〔PD〕 |
| 主要势力基本格局 | **Book** | **Core（Book）**（仅主势力名+一句话） | ✓ 可增/删 | ✗ | Scene 首拍 | 同上 | 〔PD〕 |
| 作者指定的全书特殊约束 | **Book** | **Core（Book）**（作者指定即核心） | ✓（作者本人可修改） | ✗ 绝对不可降 | Scene 首拍 | 同上 | 〔SEALED-P b〕 |
| 当前阶段 Volume clues | **Volume** | **Core（Volume）**（当前阶段的活跃线索） | ✓ 可指定某线索全卷核心/全卷召回 | ✗ 不可降级活跃线索 | 当前卷 Scene 首拍 | Required VIOLATION → DEGRADE | 〔PD〕+〔E2E 三线索零落地〕 |
| 阶段性势力变化 | **Volume** | **Core（Volume）**（仅当前阶段的格局变化） | ✓ | ✗ | 同上 | 同上 | 〔PD〕 |
| 阶段性地点/环境约束 | **Volume** | **条件性**——若持续影响多 Scene→Core；若仅单 Scene→Scene Local | ✓ | 可建议（不可降级 Core） | 视分类 | 视分类 | 〔PD〕 |
| 延迟揭示线索（尚未揭示阶段） | **Volume** | **条件性**——保护「线索存在且约束在场」≠「当前 Scene 应揭示」；线索约束=Core；揭示时机=Scene Local | ✓ | ✗ | 线索约束=Scene 首拍；揭示=Scene 级判定 | 线索约束缺失=VIOLATION；揭示时机错=Scene 层问题 | 〔PD〕 |
| 关键人物与组织关系 | **Scene** | **Recall（Beat Optional）**（按 entities 命中召回） | ✓ 可指定某关系为 Scene Core | ✓ 可按章调整召回排序 | Beat 级 | Optional→PASS（质量信号可能） | 〔PD〕 |
| 当前章节局部背景 | **Scene** | **Recall（Beat Optional）** | ✓ | ✓ | Beat 级 | Optional→PASS | 〔PD〕 |
| 单次场景细节 | **Scene** | **Recall（Beat Optional）** | ✓ 若作者明确要求该 Scene 必须遵守→Scene Core | ✓ | Beat 级 / Scene 首拍 | 视分类 | 〔PD〕+〔SEALED-P d〕「作者明确=核心」 |

### 2.3 三层 vs Actual 的关键区分

〔SEALED-P d 之上新增 V2.2 红线重申〕：

- **Core 保障的是作者指定的生产约束**——即「该信息必须在 Scene 生成时在场」
- **Core ≠ 事件已发生**——线索进入 Core 不等于线索在正文/Actual 中已被揭示
- **Core ≠ 角色已发现**——角色是否获得信息须过 Information Boundary / Access
- **Core ≠ Canon**——Core 内容不自动成为 Actual/Reality

三个独立 Truth 状态：①线索约束在场（Core 保障）②当前 Scene 是否应揭示（Scene 计划/作者意图）③角色是否已获知（Access/IB）——**不同层，不同判定**。

### 2.4 Recall 独立职责

| 问题 | 回答 |
|---|---|
| Recall keys 如何产生 | 候选〔PD〕：Beat 内容关键词 + scene.entities + scene.location + 势力名 + 线索关键词——从现有 `slimLoreForBeat` keys 扩展；具体扩展规则=Gap G-5 |
| Recall 如何避免覆盖 Core | Core 与 Recall 为**分离层**——Core 在 Scene 首拍以 Protected 方式注入；Recall 在 Beat 层按 keys 命中——二者不共享预算槽位 |
| Recall 失败何时只是 Optional 质量信号 | Recall 项为 OPTIONAL→任何 OMITTED_* 均=PASS（含质量信号）——Recall 失败≠Required 违规 |
| 作者已把某 Recall 项提升为 Required 时如何保障 | 该项从召回池移出→进入核心集→按 Required 履约（Scene 首拍+VIOLATION 判定）——不可再被当作普通 Optional 省略 |

### 2.5 作者配置权与 Planner 权限三分

| 动作 | 权威 | 说明 |
|---|---|---|
| **修改系统默认分类** | 仅系统维护者/后续 Named EO | 不属于运行时动作 |
| **作者通过书级 Authored 配置指定 Required/Optional** | 作者（Authorial Source） | 〔SEALED-P b〕authored > 系统默认 |
| **Planner 在当前请求中做相关性排序和召回筛选** | Planner（Control） | 不可降级 Required；仅可排序召回池 |

**作者后续修改自己的配置**：显式 Author Configuration Change——不是 Planner 运行时自动调整，须留配置变更记录（具体载体=G-1 Schema 待裁）。

---

## 3. C 方案一致性审查（7 问）

| # | 问题 | 结论 | 说明 |
|---|---|---|---|
| 1 | Book Core 如何在 Scene 启动时获得 Required 身份？ | **语义缺口** | 继承路径未定义——候选：书级配置→每 Scene 启动时读取注入核心集。三种路径（直接读/经 planChapter/经 09）语义不同。**= G-2** |
| 2 | Volume Core 如何限定作用域？ | **语义缺口** | 需定义「当前章属于哪一卷」的判定+卷外自动退出机制。当前 planChapter 有 volumeGoals 但无卷范围字段。**= G-2 扩展** |
| 3 | Scene Local Required 如何与 Book/Volume Core 合并？ | **语义缺口** | 三层合并策略未定义——并集/优先级/冲突处理（如 Book Core 与 Scene Local 矛盾时）。**= G-2** |
| 4 | Recall 如何保证不能挤出 Core？ | **一致** | 二层分离设计（Core Protected+Recall Optional）天然保障——Recall 与 Core 不共享预算槽位 |
| 5 | Scene 首拍重规划后原 Inclusion 证据是否仍有效？ | **不一致——需失效** | 〔PD〕Scene HARD_FAIL→replan→新请求产生→原 Inclusion 证据**不应自动继承**（新请求=新 Context Manifest）。但 replan 保留 keptScenes（已完成场景）→已 done 场景的 Inclusion 可保留。**= G-4** |
| 6 | 后续 Beat NOT_OBSERVED 如何保持 UNKNOWN？ | **一致** | V2.2 统一规则②+铁律——NOT_OBSERVED ≠ INCLUDED ≠ COMPLIANT。设计已覆盖，实现待 Q-UC-6 |
| 7 | 如何区分 Core Inclusion / Core 持续可用性 / Writer 对 Core 的实际遵循？ | **三概念分离** | ①Core Inclusion=Scene 首拍 Inclusion Status 判定（Inclusion Compliance）②Core 持续可用性=后续 Beat 是否仍含核心信息（当前 NOT_OBSERVED=UNKNOWN）③Writer 实际遵循=Writer 是否在正文中体现核心信息（L4 语义满足——当前无标准=UNKNOWN）。三者为递进的独立证据层——不可互相替代 |

---

## 4. AN-1 能力边界修订

Revision 1 表述「A=完全解决 / C=大部分解决 AN-1」——**删除**。修订：

| 方案 | 能提供什么 | 不能提供什么 |
|---|---|---|
| **A** 每拍注入 | 每个 Beat Request 获得独立 Inclusion 证据 | 不证明 Writer 使用或遵循世界信息 |
| **B** Scene 首拍注入 | Scene 首拍获得 Inclusion 证据 | 不证明后续 Beat 持续可用 |
| **C** 混合 | Scene Core 获得首拍 Inclusion 证据；Recall 提供 Beat-level Optional 补充 | 不证明后续 Core 持续可用；不证明 Writer 遵循 |

**AN-1 是否改善必须通过真实生产 E2E + 文学结果验证**——Context Injection PASS ≠ AN-1 PASS。

---

## 5. G-1~G-6 缺口更新

| # | 缺口 | 类型 | 需 Human？ | 可从冻结契约推出？ | 需 Named EO？ | 依赖 |
|---|---|---|---|---|---|---|
| G-1 | 书级 Required 配置载体/Schema | **Design Gap** | **是**（Schema 定义=新数据契约） | 否 | 是（Schema 设计+实现） | G-2 |
| G-2 | Book→Scene Core 继承路径（含 Volume 范围+三层合并） | **Semantic Gap** | **是**（继承语义=权威链设计） | 否 | 是（继承路径实现） | G-1 |
| G-3 | Core 注入格式（影响 PROTECT_RE 匹配+预算） | **Design Gap** | 部分（格式选择可由 EO 决定但影响 PROTECT_RE 语义→需确认） | 否 | 是 | G-2 |
| G-4 | Scene 重规划后重新注入+Inclusion 证据失效规则 | **Semantic Gap** | **是**（证据继承=合规判定语义） | 否 | 是 | Q-UC-6（Manifest） |
| G-5 | Recall keys 扩展规则 | **Design Gap** | 否（纯实现设计——属 Named EO 范围） | 部分（可从 Q-UC-1-d 三层+Recall 职责推导扩展原则） | 是 | G-2 |
| G-6 | DATA_QUALITY_SIGNAL 载体与上报通道 | **Observability Gap** | 否（观测层设计——属 Named EO） | 是（V2.2 §9 已定义七态+信号概念） | 是 | Q-UC-6 |
| G-7（新） | T-2 条件分支激活判定标准（何种条件下 CW/T2 链成为当前请求的 Required） | **Semantic Gap** | **是**（分支激活=Required Classification 的适用范围判定） | 否 | 是 | Q-UC-1-b Schema |

---

## 6. Human 尚待 Seal 的具体项目

| # | 待裁项 | 性质 |
|---|---|---|
| HS-1 | Q-UC-1-c 最终映射矩阵（§1.5 十四行确认+修订/否决） | 契约 |
| HS-2 | Q-UC-1-d 三层分类矩阵确认（§2.2 各要素默认分类+作者覆盖权+Planner 权限） | 契约 |
| HS-3 | 连续遗漏升级规则（§1.4 五个 PENDING 项） | 契约 |
| HS-4 | T-1「契约证明的 Required Truth 源」判定标准（=G-7） | 语义 |
| HS-5 | G-1 书级 Required 配置 Schema 的设计方向 | 设计 |
| HS-6 | G-2 Book→Scene 继承路径选择 | 语义 |

## 7. 与 Revision 1 相比的修改清单

| 修改 | 原因 | 位置 |
|---|---|---|
| Optional 三态消歧（PASS vs UNKNOWN vs PASS+Signal） | Rev1 问题 A | §1.1 |
| Truth 源 BLOCK 拆分 T-1/T-2/T-3 | Rev1 问题 B | §1.2 |
| Clock/IB/续写/目标链逐项分析（含适用范围差异） | Rev1 问题 C | §1.3 |
| 连续遗漏 N 次规则降为 PENDING | Rev1 问题 D | §1.4 |
| 矩阵扩至 12 列+Applicability 列 | 本轮要求 | §1.5 |
| Core 拆分 Book/Volume/Scene 三层作用域 | 本轮要求 | §2 |
| 三层 vs Actual 三态区分（约束在场/应否揭示/角色已获知） | 本轮要求 | §2.3 |
| Recall 独立职责四问 | 本轮要求 | §2.4 |
| 作者/Planner 权限三分 | 本轮要求 | §2.5 |
| 一致性七问（含重规划 Inclusion 失效） | 本轮要求 | §3 |
| AN-1 能力边界修正（删除「完全/大部分解决」） | 本轮要求 | §4 |
| G-1~G-7 逐项分类+依赖 | 本轮要求 | §5 |
| HS-1~HS-6 待 Seal 清单 | 本轮要求 | §6 |

---

> **Q-UC-1 — RESIDUAL DESIGN GATE REVISION 2 COMPLETE — AWAITING HUMAN REVIEW**
