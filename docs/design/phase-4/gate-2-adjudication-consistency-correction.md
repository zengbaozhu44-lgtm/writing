# GATE-2 — ADJUDICATION CONSISTENCY CORRECTION

**Mode**: READ-ONLY REVIEW · NO CODE / NO SCHEMA / NO MIGRATION · 不蕴含 Seal · 不代选
**Date**: 2026-10-15 · **对象**: gate-2-time-state-authority-design-gate.md + gate-2-human-adjudication-packet.md 的两处一致性问题

---

## Issue 1 — Q-T1 × Q-S1 依赖一致性修正

### 三层区分（矛盾的消解）

1. **并行讨论/准备**：永远可行（两问可同时摆在桌上）。
2. **独立终裁**：仅当一问的 Seal 有效性不预设另一问的内容时成立。**T1-A 与 T1-C 满足；T1-B 不满足。**
3. **条件终裁**：T1-B 的有效性以 S1 对 08.时间字段的再分类为前提（现行该字段源自 intent=Control，是 Clock 源③）。

原裁决序的「T1 与 S1 可并行」只对 A/C 成立；对 B 为**条件依赖**。此为原包表述矛盾，现修正。

### 组合相容矩阵（T1 × S1）

| 组合 | 判定 | 条件/说明 |
|---|---|---|
| A × Control 板 | **相容** | canonical=Control①，回退③=Control——单一 Control 属 time 链 |
| A × Actual-derived | 相容（显式条件） | 混合权威链（Control 主＋Actual 回退）；Seal 须明示该链**或**在 A 下禁用③以保持单一权威 |
| A × 分拆 | 相容 | 须指定哪个子载体喂③ |
| A × 单文件+provenance | 相容（条件） | ③仅读 Truth 类标注的写 |
| **B × Control 板** | **语义不相容（唯一硬冲突）** | Control 字段作 canonical 源③违反 B 自身定义与边界#1精神。**唯一条件式相容路径**：S1-Control 板同时把时间字段降为 presentation 且 Clock 停读③——代价是 B 的证据基础收缩至 authored-explicit＋前场文本（后者属推断受#5限）→ B 近乎空转。不得在代码中静默化解；若您要 B×Control，须按上述条件显式 Seal |
| B × Actual-derived | **相容（自然配对，含子条件）** | 子条件在 S1 内部：engine 写者的时间字段输入须去 Control 化（authored-explicit 或 actual-derived），否则循环 |
| B × 分拆 | 相容（条件） | 仅 Actual 子载体时间可喂 Clock；Control 子载体时间=presentation |
| B × 单文件+provenance | 条件相容 | Clock 只读 Actual/authored 类标注写 |
| C × 任意 S1 | **相容（最独立）** | 条件：Clock 源③停读 08 改读新载体；08 时间降 presentation |
| 混合 × Control 板 | 条件相容 | 派生连续性链不得途经 Control 源的 08.时间（切断或重标注） |
| 混合 × Actual-derived | 相容（自然配对） | — |
| 混合 × 分拆/provenance | 相容（读类条件） | 同上 |

**当前证据无法终定的遗留**（须 Seal 填而非考古填）：各 S1 结果下 08.时间字段是否保留 Clock 喂养角色——此为政策格，非证据缺口。

### 修正后裁决序

- **准备**：并行。
- **终裁安全序**：**S1 先行**（其结果约束 T1 各选项的现势可行性）；或 **T1 先行但仅当您已知选 A 或 C**（二者 S1 无关）；若倾向 B/混合，S1 必须先裁或与 B 同 Seal。
- 波次：第一波 **Q-S1**（±T1 若已定 A/C）；第二波 T1（若未裁）+T2+S3+S2+S4；第三波 S5。

## Issue 2 — Q-T1-A 与冻结 Truth/Control 分离的修正定性

### 两类权威的严格区分

- **(A) Control 权威**：对「计划/呈现时间」的控制层权威——plan 告诉生产系统作者意图的场景时间。
- **(B) Truth 权威**：对「Actual 故事时间」的 Truth 层权威——包括与 Actual-grounded/state-derived 时间冲突时的裁决权。

### Q-T1-A 的真实语义定性（修正原包「不字面违反」的不充分表述）

T1-A 实际授权的是 **(B)——Truth 级权威**，且有且只有两种可读解：

1. **读解一（Control 拥有 Truth）**：plan-lock 为权威声明、Actual/状态时间永不覆盖 → **收窄**冻结的 Truth/Control 分离（创造一个受制裁的例外：Control 载体内容凭其载体地位成为 Truth）→ **架构级修订**。
2. **读解二（authored 内容越载体为 Truth）**：plan.time 是 authored 内容，其**显式时间字段**被指定为 authored-Truth 通道（其余 plan 内容维持 Control）→ 创造**载体类别≠内容类别**的时间字段例外——同样是一处（较窄的）**架构级修订**，且与 G1-A 建立的「载体权威」纪律（03 bible 先例）形成显式例外。

**两种读解都不是「维持分离」**。是否为架构修订不取决于措辞而取决于授予的是 (A) 还是 (B)——T1-A 语义上必然授予某种 (B)。

- 是否需要正式架构级修订：**是**（任一读解）。
- 是否在 Gate 2 现行授权内：**Gate 2 可提议修订，但修订本身须以显式修订语言 Seal**——不得以「填补权威空白」的名义静默成立。Gate 2 的开启授权是定义边界；修订边界是更高阶裁决，本包将其标为 **AMENDMENT-REQUIRED** 项呈报。
- 不因「不寻常」而拒绝 T1-A：其语义后果如上如实分类。

### 防「实现细节静默成 Truth」的最小 Seal 语言（模板，不含选择）

> 「plan.time 的语义类别为 <authored time declaration（Truth 级）——仅限显式时间字段 / Control presentation>；plan 其余内容维持 Control。Story Clock 的实现解析序**不构成 Authority**。当 Actual-grounded 或 state-derived 时间与 plan 声明冲突时：<plan 声明胜 / 冲突上呈人工裁决 / 派生链胜>。本条为 Truth/Control 分离之 <时间字段例外修订/不修订>，系**显式修订**而非默认。」

### 修订后的 T1 选项措辞（语义范围显式化）

- **T1-A′（Plan-time-as-authored-Truth）**：授予显式 authored 时间声明以 Truth 级（读解二为主形态）；**AMENDMENT-REQUIRED**；含冲突裁决子问（上模板空格 3）。
- **T1-B′（Actual/state-derived Truth）**：plan=presentation；对 S1 条件依赖（见矩阵）；证据基础因边界#5 收窄为 authored-explicit＋actual-derived；**无修订需求**（在既有分离内）。
- **T1-C′（authored canon-time 新载体）**：最干净分离；新 Truth Carrier 须特批；无修订需求（是扩建非例外）。
- **混合式**：authored-explicit=Truth＋派生链连续性＋plan-presentation——其 authored-explicit 部分携带与 A′ 相同的 AMENDMENT-REQUIRED 标记。

## 4. 仍需您判断的决策清单（穷举）

1. **Q-S1**：08 语义＋写者授权表＋时间字段类别（含「是否保留 Clock 喂养」政策格）。
2. **Q-T1**（A′/B′/C′/混合，按修正措辞；若 A′/混合需同时认领 AMENDMENT 语言＋冲突裁决子问）。
3. **Q-T2**：事件时戳（限定式 NOT NEEDED vs derived-presentation）。
4. **Q-S2**：锚保护与继承权威。
5. **Q-S3**：day 前进来源枚举。
6. **Q-S4**：legacy 通道（守卫/退役/flag）。
7. **Q-S5**：11 rerun 键（章自修正 vs 追加）。

## 5. Final Classification

> **READY FOR HUMAN SEAL**

理由：两处矛盾/不充分均已修正——依赖已正确表述为条件式（唯一硬冲突组合 B×Control 已显式标记且给出唯一条件路径）；T1-A 的架构修订性质已如实分类并配 AMENDMENT-REQUIRED 标记与防静默模板。无证据缺口、无阻塞性歧义；修正后信息足以支撑七问 Seal（建议序：**S1 先行**，或 T1 先行仅当您已定 A′/C′）。

**STOP——仅交付修正；无实现、无选择、无推断 Seal。**
