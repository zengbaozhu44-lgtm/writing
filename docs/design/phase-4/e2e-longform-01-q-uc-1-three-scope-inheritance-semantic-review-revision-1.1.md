# Q-UC-1 — Three-Scope Inheritance Semantic Review · Rev1.1

**Status**: `THREE-SCOPE INHERITANCE SEMANTIC REVIEW REVISION 1.1 COMPLETE — AWAITING HUMAN REVIEW`
**Date**: 2026-11-01 · **Mode**: READ-ONLY DOCUMENT REVISION（零代码/零 Schema/零接口/零 Seal）
**Authority**: V2.2 FINAL + ERRATA · Q-UC-1 Packet · Rev2.1 · HS-7=SEALED A · Character World 冻结架构
**前置**: Rev0 + Rev1 保留为历史——本文件为当前权威
**标注**: 〔V2.2〕冻结 · 〔SEALED〕Human 已裁 · 〔SEALED-P〕原则级已裁 · 〔CW-FC〕CW 冻结契约 · 〔Rev2.1〕已定义 · 〔CODE〕代码架构事实 · 〔E2E〕生产实证 · 〔GLM〕本轮推理 · 〔PEND〕待 Human 裁决 · 〔AS〕ALREADY SEALED 不重复裁

## Rev1 → Rev1.1 修改对照表

| 项 | Rev1 问题 | Rev1.1 修正 |
|---|---|---|
| R1 | SI-7 E-2b「须经 Actual 提取+validator」可被误解为提取/validator 产生 Reality Authority | 修正为严格服从 Reality/Actual 冻结契约的表述 |
| R2 | SI-9 M-4b「既有通道」易被误读为生产运行已验证；且 SI-9 被表述为开放选择题 | 区分架构证据 vs 生产证据；SI-9 改为既有边界确认+证据状态说明 |
| R3 | SI-4 O-3/O-4 仍可能被合并裁决 | 严格拆为两个独立问题；SOURCE SUPPORT INSUFFICIENT 检查 |
| R4 | SI 依赖图存在视觉歧义（SI-7→SI-2 关系不清；SI-8/9 依赖表达不当） | 无歧义文字+图示；SI-8/SI-9 无默认先后依赖 |

---

## A. 已冻结原则（12 项——与 Rev1 相同，不重复列出）

引用 Rev1 §A。Rev1.1 新增两条依赖性标注：
- F-13〔V2.2/FC〕Reality = `obtains` SoA only——Actual 提取/validator/post 等状态不独立产生 Reality Authority
- F-14〔CW-FC/E2E〕CW 在 E2E 生产运行中为条件性未激活；未观察到 skip/failure/success 记录；实际 invocation 状态 UNKNOWN

---

## B. 六类语义问题（修正版——仅列 Rev1.1 变更部分）

### B-5 退出与失效（R1 修正：E-2b 表述）

**Rev1 E-2b 原文**：实际发生条件须经 Actual 提取+validator——不由计划直接证明。

**Rev1.1 修正后 E-2b**：

> **实际发生条件必须依据符合现有 Actual Authority 与 Admission 契约的 Actual 事实判定。**
>
> - Actual 提取属于证据处理过程，**不独立产生 Reality Authority**。〔V2.2〕
> - Validator 属于现有验证流程，**不独立产生 Reality Authority**。〔V2.2〕
> - `post`、`confirmed`、`verified` 等状态**本身不构成 Reality Authority**。〔V2.2/FC〕
> - Narrative Intent / 计划性标记**不能替代 Actual admission**。〔V2.2 Plan ≠ Actual〕
> - Reality = **`obtains` SoA only**——Author / delegated Operator 的 Authority 边界不变。〔V2.2/FC〕

其余 E-1/E-2a/E-2c/E-3 与 Rev1 相同（不变）。

### B-6 多来源合并（R2 修正：M-4b + SI-9 重新定性）

**Rev1 M-4b 原文**：CW 经合法 Projection→SR→Compiler→basePrompt——这是既有通道（非新设计）。

**Rev1.1 修正后 M-4b**（区分架构证据与生产证据）：

> **架构/代码层**：存在 Projection → SR 槽 → Compiler 消费的既有设计/代码通道。〔CODE〕
> projectWorldToSRScene 函数存在（character-world.js）；SR 槽可被 Compiler 的 character_sr 模块消费（compiler.js:660-674）。这是**代码架构事实**。
>
> **生产运行层**：某次 Studio Production Run 是否实际调用、成功执行并消费该通道，**需要独立 E2E 证据**。
> 既有 E2E 考古结论〔E2E〕：CW 当前为**条件性未激活**（E2E 书无 seed → sync 早退 → world.json 不存在）；未观察到明确的 skip/failure/success 记录；实际 invocation、skip 或 failure 状态**UNKNOWN / NOT OBSERVED**——不能仅凭静态代码证据判定。
>
> **不可推导线**：
> - 代码路径存在 ≠ 生产路径实际激活
> - Projection 函数存在 ≠ 某次运行已执行 Projection
> - SR 槽可被 Compiler 消费 ≠ 当前生产运行已消费该内容
> - UNKNOWN / NOT OBSERVED ≠ PASS、≠ FAIL、≠ 确定的 silent failure

**SI-9 重新定性**（Rev1.1 R2 核心修正）：

> SI-9 **不再作为开放选择题**（原「CW 是否进入 Core」二选一）。
>
> 改为：**既有冻结边界确认 + 生产运行证据状态说明。**
>
> - M-4a（CW 原始内容不作为通用 Core Truth 来源）：属于既有 CW 冻结架构边界〔CW-FC〕——**不重新开放 Human 选择**。
> - M-4b（合法 Projection→SR→Writer 消费路径）：属于既有架构边界——**不是允许 CW 原始内容直接进入 Core 的例外**。
> - CW 冻结链完整保留：ACTUAL → Access/IB → T2 Experience → Character World → Projection → SR(t) → Writer。〔CW-FC〕
> - Character World **不是通用 Truth DB**。〔CW-FC〕
> - T2/T3 既有职责、Projection 边界、Writer 消费边界不变。
> - 生产运行中 CW 通道是否实际激活=E2E 证据问题（F-14），非本轮语义裁决问题。

### B-3 覆盖（R3 修正：O-3/O-4 独立化）

**O-3 — Author Configuration Change**（独立问题 1）：

> 只回答：**作者是否可以通过显式的 Author Configuration Change 修改自己此前设定的 Book Core？**
>
> 审查范围仅涉及作者配置修改权威及其边界。
> - 不等同于 Planner 运行时修改权（Planner 禁降=〔AS〕不重复裁）。
> - 具体流程、审计机制、Schema **均未授权**——本轮不补充设计。

**来源依据检查**：Rev2.1 §2.5 原文——「作者后续修改自己的配置，应当作为显式 Author Configuration Change 处理，不得伪装成 Planner 自动调整」。该原文支持「显式处理」的原则，但**未明确**：①作者是否**有权**修改 Book Core（vs 仅修改 Optional 项）；②修改后对已生成内容是否有追溯效果；③是否有任何条件限制。
> **SOURCE SUPPORT INSUFFICIENT / HUMAN REVIEW REQUIRED**——Rev2.1 §2.5 支持原则性方向但不支持完整 O-3 裁决所需的具体权威边界。

**O-4 — Book Core Semantic Persistence**（独立问题 2）：

> 只回答：**在没有发生 Author Configuration Change 的前提下，Book Core 是否持续适用于其有效作用域？**
>
> 审查范围仅涉及语义持续性及有效作用域。
> - 作者拥有配置修改权（O-3），**不自动意味着** Book Core 默认不持续适用。
> - Book Core 持续适用（O-4），**不自动意味着**作者永远不能修改自己的配置。
> - 两个问题独立——可分别裁决，不可合并。

---

## C. 三层作用域关系矩阵

与 Rev1 §C 相同——不重复。所有维度标注不变。

## D. 边界与反例

与 Rev1 §D 相同——不重复。D-4 中条件失效表述对齐修正后 E-2a/b/c。

---

## E. 修正后 SI 问题清单（Rev1.1 版）

| # | 独立语义问题 | 性质 | Rev1→Rev1.1 变化 |
|---|---|---|---|
| SI-1 | Book Core **语义上**是否默认适用于全部下层？ | 开放选择 | 不变 |
| SI-2 | Volume/Scene 可否补充上层未规定的约束？ | 开放选择 | 不变 |
| SI-3 | 非 authored 系统默认项可否被 Volume/Scene 覆盖？ | 开放选择 | 不变（依赖 SI-1） |
| **SI-4a** | **作者是否可通过 Author Configuration Change 修改 Book Core？** | 开放选择 | **从 SI-4 拆出**；SOURCE SUPPORT INSUFFICIENT 标注 |
| **SI-4b** | **无 Author Configuration Change 时 Book Core 是否持续适用？** | 开放选择 | **从 SI-4 拆出**；与 SI-4a 独立 |
| SI-4-AS | Planner 禁降 authored Required | **ALREADY SEALED** | 不变（不重复裁） |
| SI-5 | 冲突识别的执行者？ | 开放选择 | 不变 |
| SI-6 | 真矛盾响应级别？ | 开放选择 | 不变 |
| SI-7 | 条件失效触发源（三类分别） | 开放选择 | E-2b 表述修正（R1）；三类不变 |
| SI-8 | 多来源合并的默认策略？ | 开放选择 | 修正为非简单 AND/OR（继承 Rev1）；独立问题 |
| **SI-9** | ~~CW 是否进入 Core~~ → **既有 CW 冻结边界确认+生产证据状态说明** | **边界确认** | **从开放选择题移出**；不重新裁决 CW 身份（R2） |
| SI-10 | Book→Scene 跳层继承是否需显式规则？ | 开放选择 | 不变（依赖 SI-1+SI-3） |

### SI 依赖图（R4 修正版）

```text
SI-1 ──→ SI-3 ──→ SI-10
  │
  └──→ SI-4a（独立裁决）
  └──→ SI-4b（独立裁决）

SI-2 ──→ SI-7
  │
  └──→ SI-5 ──→ SI-6

SI-8：独立的多来源合并原则（无对 SI-9 的默认先后依赖）

SI-9：既有 CW 冻结边界确认 + 生产证据状态说明
     （不作为开放选择题，不在依赖链上）
```

**文字依赖关系**（消除图示歧义）：
- SI-3 依赖 SI-1：须先定语义适用原则才能定覆盖范围。
- SI-10 依赖 SI-1+SI-3：跳层规则须先有基本继承+覆盖。
- SI-7 依赖 SI-2：条件性补充是补充的子类（补充规则先定，才能定其条件失效）。
- SI-5→SI-6：冲突识别先定，才能定真矛盾响应级别。
- SI-8 独立：通用合并原则，不依赖 SI-9。
- SI-9 不在依赖链上：它是既有边界的确认（非待裁选择），不与其他 SI 有先后关系。

**DEPENDENCY NOT ESTABLISHED 检查**：Rev1 原图中 SI-7 与 SI-2 的依赖已由 Rev1 文字支持（「条件性补充是补充的子类」）。SI-8 与 SI-9 无依赖——Rev1 曾建议「分开裁」暗示先后，Rev1.1 修正为独立。

---

## F. Human Review 建议顺序（Rev1.1 修正版）

**第一批：基础继承**
1. SI-1（语义适用原则）
2. SI-4a（Author Config Change——独立裁决）
3. SI-4b（Book Core Semantic Persistence——独立裁决）
4. SI-3（非 authored 覆盖）

**第二批：交互规则**
1. SI-2（补充规则）
2. SI-5（冲突识别）
3. SI-6（真矛盾响应）

**第三批：边界处理**
1. SI-7（三类条件分别审查）
2. SI-8（多来源合并）
3. SI-10（跳层规则）

**SI-9**：从开放选择题序列移出——作为既有 CW 冻结边界核对与生产证据状态说明，**不重新裁决 CW 身份**。可在任一批后核对。

> **注意**：审查顺序不自动等于逻辑依赖。不得把排列顺序当成授权或前置契约。

---

## G. 来源与证据状态说明

| 标注 | 含义 | Rev1.1 中的使用规则 |
|---|---|---|
| 〔V2.2〕 | V2.2 FINAL + ERRATA 冻结定义 | 直接支持冻结原则 |
| 〔SEALED〕 | Human 正式 Seal（a/HS-7） | 直接支持已裁结论 |
| 〔SEALED-P〕 | Human 原则级 Seal（b/c/d） | 支持原则方向——不支持具体 Schema/矩阵 |
| 〔CW-FC〕 | Character World 冻结架构契约 | 支持 CW 边界/链/非通用 Truth DB |
| 〔Rev2.1〕 | Rev2.1 已定义内容 | 支持设计定义——经 R3 检查确认 Rev2.1 §2.5 对 O-3 具体权威边界 SOURCE SUPPORT INSUFFICIENT |
| 〔CODE〕 | 代码架构事实 | 仅支持代码存在性——**不单独支持生产运行结论** |
| 〔E2E〕 | E2E 生产实证 | 保留 UNKNOWN/NOT OBSERVED 限定 |
| 〔GLM〕 | GLM 本轮推理 | 非契约——候选建议 |

---

## H. 未解决事项

| 问题 | 状态 |
|---|---|
| O-3 作者修改权具体权威边界 | SOURCE SUPPORT INSUFFICIENT / HUMAN REVIEW REQUIRED |
| Author Configuration Change 流程/审计/Schema | NOT AUTHORIZED（本轮不补充设计） |
| CW 生产运行实际激活状态 | UNKNOWN / NOT OBSERVED（须 E2E 证据） |
| Beat prompt 持续可用验证 | NOT OBSERVED（beat prompt 未持久化） |

## OUT OF SCOPE / NOT ACTIONED

本轮四项修订之外发现的问题（如有），记录于此——不修订：
- 无额外发现。

---

## I. 状态检查

| 检查 | 结果 |
|---|---|
| 未新增 SI | ✓（SI-4 拆为 4a/4b——是 Rev1 已有 SI-4 内部问题的独立化，非新增裁决项） |
| 未扩大任何 SI 裁决范围 | ✓ |
| 未创建 Named EO | ✓ |
| 未产生 Human Seal | ✓ |
| 未修改 Packet/Rev2.1/V2.2/Errata/Rev0/Rev1 | ✓ |
| 未启动 AN-1/Q-UC-2 | ✓ |
| 未重新讨论已 Seal 结论 | ✓（SI-4-AS 标注 AS 不重复裁） |
| PD 未写成冻结契约 | ✓ |
| 代码存在≠生产已验证（CODE 不单独支持运行结论） | ✓（M-4b 修正） |
| CW 冻结链完整保留 | ✓（F-11+M-4a/M-4b） |
| 依赖图无歧义 | ✓（文字+图示双表达） |
| 来源标注区分完整 | ✓（§G 表） |

---

> **THREE-SCOPE INHERITANCE SEMANTIC REVIEW REVISION 1.1 COMPLETE — AWAITING HUMAN REVIEW**
