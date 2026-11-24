# GATE-2 — Q-S1-c Candidate Record & Consistency Review

**Status**: `HUMAN SEALED — C · 2026-10-15 · NO IMPLEMENTATION`（候选经 Human 正式确认；权威 Seal 文本见 Part 4）
**Date**: 2026-10-15 · 本文件 = 女王候选文本的逐字登记 + 只读一致性核验附件 + **Part 4 Seal 确认**

---

## Part 1 — 候选文本（逐字，权威来源为女王裁定原文）

> **〔历史文本——其 PENDING 状态已被 Part 4 Seal 确认取代；七项条款内容经确认后即为权威 Seal 文本〕**
>
> **Q-S1-c — Single Carrier with Explicit Category and Provenance**
> Status: CANDIDATE · PENDING HUMAN SEAL · Scope: Gate 2 — Time / State Authority · Implementation Authorization: NONE
>
> **1. Human Adjudication**：选择方向 C：保留现有单一 `08.时间` 文件，通过明确的字段类别与 provenance 区分普通 Control 回显和满足正式时间准入条件的值。本裁决只确定载体职责与消费边界，不裁决 Q-T1 的正式故事时间权威模型，也不替代时间证据类别表的独立裁决。
>
> **2. Carrier Boundary**：(1) `08.时间` 的存在、字段存在、历史写入或跨章持续回显，均不自动授予其内容正式故事时间权威。(2) 普通 Control/presentation 回显必须与具备正式时间准入资格的值明确区分。(3) 字段类别与 provenance 用于记录和验证值的类别及来源，不得单独创造 Truth 权威。(4) 不得仅因某值被写入 `08.时间`，就将其升级为正式时间事实。
>
> **3. Story Clock Source ③**：消费必须有条件——普通 Control 回显不得作为确立依据；只有明确满足独立裁决后所规定的类别、来源与准入条件的值才可参与正式时间推导；类别或 provenance 缺失/无效/无法确认时不得默认视为合格；无其他合格依据时允许 unknown，不得为连续性编造或继承未经授权的时间。本条不预先决定哪些证据类别获准——留待 Q-T1 与证据类别表。
>
> **4. Existing Data and Write Authority**：(1) 历史回显不得因本裁决自动升级。(2) 本裁决不授权任何生产写入者将 Control 值写为正式时间值。(3) 合格值的来源资格、写入权限、冲突规则及准入条件须由适用独立裁决明确。(4) 不得以增加标签或 provenance 字段的方式绕过 Truth/Control 分离边界。
>
> **5. Consistency with Frozen Principles**：已确立事实优先/冲突调未来；不足则 unknown 禁编造；正文提及≠当下；大纲/回显/章序不得凭存在取权威；Story Clock 是派生机制非独立 Truth Authority。
>
> **6. Explicit Exclusions**：不 Seal Q-S1 本身；不裁决/Seal Q-T1；不决定九类证据准入；不授权新门/新载体/新 Schema/新引擎；不授权代码/迁移/历史升级/生产写入变更；不关闭 Q-T2、Q-S2/S3/S4/S5。
>
> **7. Confirmation and Implementation Boundary**：仅在 Human 明确确认并正式 Seal 后，Q-S1-c 成为冻结契约。正式 Seal ≠ 实现授权；任何实现仍须遵循既定执行治理。

## Part 2 — 一致性核验（只读）

### 2.1 与冻结契约/既有材料对照

| 核验项 | 结论 |
|---|---|
| vs 修正案组合矩阵中 S1-c 格（单文件+字段类别/provenance、源③条件保留） | **一致**——候选文本与矩阵定义同构（相容+显式条件） |
| vs 边界 #3（文件存在≠写授权）/#6（存在≠权威） | **一致**——§2.1/§2.4 正是其语言化 |
| vs P4（回显不得凭存在自立） | **一致**——§2.1/§3 直接落实 |
| vs P3（unknown 合法禁编造） | **一致**——§3 末句 |
| vs Truth/Control 分离 | **一致且加固**——§4.4 明禁以标签绕界 |
| vs Q-T1 依赖结构（S1 先行、T1 后裁） | **一致**——§1/§3/§6 明确不预裁 T1/证据表 |
| vs Gate 2 七问开放性 | **一致**——§6 不关闭 Q-T2/Q-S2–S5 |

> **NO CONFLICT FOUND**

### 2.2 两项待办子项（随 Seal/后续 EO 处理，本轮不定义）

1. **provenance 词汇表**：类别/来源标注的具体词汇与验证规则未定义（候选 §3 要求其「明确」）——属后续 EO 的设计项，受 §4.4 约束（不得以标签造权威）。
2. **Q-T1 落地前的过渡语义**：在 Q-T1+证据类别表 Seal 之前，**没有任何值能满足 §3 的准入条件** ⇒ 一旦实现，源③在此期间**事实性不喂 canonical**（功能等效于临时停读）。此为候选语义的必然推论，如实记录；**当前未获实现授权，现行代码行为（raw-append 不对称）在 EO 前保持不变**。
3. （实现期注记）F-G2E-1 的 state 侧 raw-append 路径在将来 EO 中须按 §3 条件化——记录备查，不实施。

## Part 3 — 状态簿记

- Q-S1：**HUMAN SEALED — C（2026-10-15，见 Part 4）**。
- Q-T1 + 证据类别表：**下一裁决项**（PENDING HUMAN ADJUDICATION；S1-c 不预裁任何类别，依赖已就绪）。
- Q-T2 / Q-S2 / S3 / S4 / S5：开放未动。
- 本轮零代码/零 Schema/零迁移/零测试/零生产逻辑改动。

## Part 4 — Seal Confirmation（权威 Q-S1-c 决定文本）

**Human 于 2026-10-15 正式确认本候选。** 候选 §7 确认条件已满足；以下**七项冻结条款**为权威 Q-S1-c 决定文本（对应 Seal 指令 §1）：

1. 保留现有单一 `08.时间` 文件。
2. 通过字段类别与 provenance 区分普通 Control/presentation 回显和满足正式时间准入条件的值。
3. 文件存在、字段存在、历史写入、跨章回显或 provenance 标签本身均不授予 Truth 权威。
4. Story Clock 源③只能消费满足独立裁决所规定的类别、来源和准入条件的值。
5. 类别或 provenance 缺失、无效或无法确认时，不得默认将其视为合格值。
6. 没有其他合格依据时，正式时间允许为 `unknown`；不得为维持时间连续性而编造或继承未经授权的时间。
7. 本次 Seal 只冻结载体职责、类别/provenance 区分及源③消费边界。

**本 Seal 不授权**：Q-T1 或九类时间证据类别表的裁决；provenance 词汇表的具体设计；新资格门、新 Truth Carrier、新 Schema、新引擎；代码、生产逻辑、测试、迁移或历史数据修改；Q-T2、Q-S2、Q-S3、Q-S4、Q-S5 的关闭。
**Seal ≠ 实现授权**；过渡语义与 provenance 词汇（Part 2 §2.2）维持为未决后续工作。

---

> **Q-S1-c: HUMAN SEALED · NOT IMPLEMENTED**
