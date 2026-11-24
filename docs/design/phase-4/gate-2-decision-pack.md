# GATE-2 — Decision Pack：Q-S1 → Q-T1 → 可采时间证据类别表

**Mode**: DECISION PACK PREPARATION ONLY · NO CODE / NO SCHEMA / NO MIGRATION / NO SEAL / NO IMPLEMENTATION
**Date**: 2026-10-15 · **输入**: gate-2-time-evidence-qualification-audit.md + gate-2-adjudication-consistency-correction.md
**用法**：本包只呈现选择与后果；**无默认已选项**。

---

## 1. Q-S1 — `08.时间` 与 Story Clock 源③（四选项，普通语言）

| 选项 | 防止哪种小说错误 | 生产代价 | Clock 源③ | 冻结边界 | 额外授权 |
|---|---|---|---|---|---|
| **S1-a Control/presentation only** | 「过期回显伪装成已确立时间」——ch7 的意图时间经 08 在 ch8+ 被当作故事事实（对质量目标#1 的现实威胁源） | 无其他时间源的章得到「未确立」时钟（Writer 现有规则本就可无时间续写——审计已证） | **停读**（或降为 presentation 提示，不产 canonical） | 完全合规（拆除一处 Control→Truth 渗漏） | 仅本 S1 Seal |
| **S1-b 仅承载授权的 Actual/state-derived 时间** | 同 a，且保留合法的状态时间连续性通道 | 最高实现面：engine 写者须去 Control 化、手动/studio 时间写入门控、回填语义 | 保留，但仅 Truth 类值可喂 canonical | 合规（前提 T1=B′ 类权威） | 证据类别表 + 写者门设计 |
| **S1-c 单文件 + 字段类别/来源权限严格区分（provenance 标注）** | 同 a（靠逐写标注区分回显与合法值） | 三写者全接 provenance 词汇与标注 | 条件保留（仅 Truth 类标注喂 canonical） | 合规 | provenance 词汇子 Seal |
| **S1-d 拆分 Control 与 Truth 载体** | 根除混载 | 新载体 + 迁移问题 + loader/compiler 改造 | 改读 Truth 子载体 | 合规但**新载体须特批**（边界#10/#11） | 显式新载体授权 |

## 2. Q-T1 — 正式故事时间权威（普通语言比较）

| 方向 | 一句话语义 | 对质量三目标 | 架构成分 | 依赖/标记 |
|---|---|---|---|---|
| **A′** | 大纲显式时间声明=Truth | **与目标#1/#2 正面冲突**（大纲错时以 Truth 压已写出的事实） | **AMENDMENT-REQUIRED**（修正案两读解均成立：Control 拥 Truth／authored 越载体） | 须附冲突裁决规则；不得包装为配置项 |
| **B′** | 只有经授权的 Actual/state-derived 依据能确立正式时间；大纲仅规划呈现 | 最佳契合#1/#2/#3——**但「已成立事实」的判定标准（证据类别表）必须同 Seal** | 无修订需求 | **硬依赖 Q-S1**（08 回显不得为依据）；不得静默切源③ |
| **C′** | 新独立载体持有正式时间 | 契合——**但载体只解决权威归属，不解决证据资格**（②的门仍须立） | 新 Truth Carrier 特批 | 与 S1-d 联动 |
| **混合** | authored 显式=Truth＋派生链连续性＋plan=presentation | 取决于 authored 部分权重；冲突规则不得被「混合」掩盖 | authored-Truth 部分**携带与 A′ 同级 AMENDMENT** | 同 Seal 冲突规则 |

**全方向共同禁令**：实现解析序≠Truth Authority；任何方案不得把未知自动补成确定时间。

## 3. 可采时间证据类别表（Q-T1 Seal 的必要组成）

| # | 证据类 | 能证明 | 不能证明 | 准入条件（候选，未 Seal） | 冲突处理要求 | 定性 |
|---|---|---|---|---|---|---|
| 1 | 大纲计划时间 | 作者意图的场景时间 | 故事实际发生时间 | **仅 A′/混合（AMENDMENT）下可采** | 按 T1 冲突规则 | Control（事实A） |
| 2 | 前场正文时间提及 | 正文逐字出现过该时间串 | 「提及=当下」；未经门时连「接地」都未受验证 | 候选门：G1-C 式逐字锚+offset＋准入验证＋「过去提及 vs 当下确立」语义判定 | 不得无规则覆盖已确立值 | **现无门（事实A）**；门设计=候选政策B；可采性=Seal C |
| 3 | 锚定的 Actual-grounded 事件时间 | （若 Q-T2 定义后）事件锚定时刻 | —（现不存在） | 依赖 Q-T2 裁定＋锚设计 | — | 未定义（Q-T2 待裁） |
| 4 | 08.时间历史回显 | 「上一章 intent.time 曾被回显」这一事实 | 任何故事时间事实 | **不可采为 Truth（除非 S1-b/c 授权其承载合法派生值且值本身合格）** | 禁止以回显身份参与冲突 | Control 回显（事实A）；可采性=Seal C |
| 5 | 显式 authored 时间声明 | 作者显式声明 | （Truth 级须 A′/混合）声明正确性 | day 维度**已合法**（Sealed）；时刻维度随 T1 | — | day=已 Seal；时刻=Seal C |
| 6 | 场景顺序/章号推测 | 叙事顺序 | **任何世界时间** | **无——已 Seal 禁止**（classifySceneIndex 契约＋F5＋日历串→null） | — | **已 Seal（事实A）** |
| 7 | day 维度 authored 值/未知 | 显式 day 合法；无源=unknown 合法 | 未 Seal 的前进机制 | 前进来源=Q-S3 | — | 宁缺已 Seal；前进=Seal C |

## 4. 最小冲突案例（仅 WL-01，按给定四步：前文记录 03:40 → 后续 intent 指定 06:15 → 08.时间回显 06:15 → 下章 Clock 读 08 沿用 06:15）

| 方向 | 结果 | 未知时 |
|---|---|---|
| **A′** | 06:15（大纲）胜——**已记录的 03:40 被 Control 覆写**（目标#2 反例） | 双方皆缺才未知 |
| **B′** | 03:40（若经门确认为已成立事实）胜，**大纲侧须调整**；若 03:40 未过门（现无门）→ **未知，时钟未确立**（目标#3 允许） | 允许且预期 |
| **C′** | 载体里被授权类写入的值胜：若 03:40 已按授权类入载体→胜；若只有回显在→随 S1 对回显的裁定；否则未知 | 允许 |
| **混合** | 03:40 属派生/已确立（plan=presentation 不护 06:15）→ **03:40 胜**；若 06:15 走 authored-explicit 通道则触发显式冲突规则（须写明谁胜） | 允许 |

（无新增语义假设修饰任何方案。）

## 5. 三类问题区分

**A 已确认事实（考古）**：F-G2E-1 覆盖机制=正则不对称+raw-append 实现细节；08.时间=intent.time 回显（Control）；②prose 提及零门；⑥顺序/章号禁令与⑤day 宁缺已 Seal；未知合法且 Writer 无时间可续写；六源均无完整资格。
**B 候选政策（为质量目标推荐，未 Seal）**：②的资格门设计（逐字锚+准入+提及语义）；S1-c 的 provenance 词汇；源③停读/条件保留的实现形态；三项纯函数回归测试。
**C 只能 Human Seal**：Q-S1 四选一；Q-T1 四选一（含 AMENDMENT 认领与冲突规则）；证据类别表各行可采性；Q-S3 前进来源。

## 6. 状态

> **NOT SEALED · NO IMPLEMENTATION** —— 本包为最小裁决材料；Gate 2 开放中，未宣称完成。
