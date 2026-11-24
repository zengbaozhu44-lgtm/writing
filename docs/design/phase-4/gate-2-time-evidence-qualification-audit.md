# GATE-2 — Time Evidence Qualification Audit（Q-S1 / Q-T1 前置证据包）

**Mode**: READ-ONLY ARCHAEOLOGY · NO CODE / NO SCHEMA / NO MIGRATION / NO SEAL / NO IMPLEMENTATION
**Date**: 2026-10-15 · **入口**: gate-2-time-state-authority-design-gate.md + gate-2-human-adjudication-packet.md + consistency-correction
**核心问题**：InkOS 在什么条件下才有资格认定「故事现在是什么时间」，而非仅知「大纲希望故事发生在什么时间」。

---

## 1. 执行范围与禁止事项

仅证据资格审计。用户三项小说质量目标（不为大纲破坏既有事实／冲突时保留已成立事实优先调后续／未知允许未知禁编造）作为**后果评估基准**，不转写为 Seal。全部 12 条冻结边界持有；不重开 Gate 1；不裁 Q-S1/Q-T1。

## 2. 代码证据与真实时间数据流（本轮新钉死的关键机制）

### F-G2E-1 — WL-01「03:40 被 06:15 覆盖」的精确路径（实现细节，非 Sealed 权威）

story-clock.js:54-74 逐行核验：

1. `extractCalendarHints`（:18-26）正则集 = **仅** 年月日/月日/中文月日/Day-N/第N天——**裸时刻（03:40/06:15）不产生任何 hint**。
2. `fromIntent = extractCalendarHints(intent.time…)`（:58）——ch10 authored `03:40` → **零 hint → intent 分支为空**。
3. `fromState = extractCalendarHints(stateTime).concat([stateTime])`（:62）——**原始串无条件追加**：08.时间 里的 `06:15` 直接成为候选。
4. 三级 if（:66-74）：intent 空 → prior-scene 空 → **state 胜**：canonical=`06:15`，source=`08_current_state`。

**结论**：覆盖的根因是一处**正则不对称 + raw-append 实现细节**——intent 侧须命中日历 hint 才锁，state 侧原始串保底直入。**这不是任何已 Seal 的 Truth 规则**（「plan lock first」注释只对月日类生效）。

### F-G2E-2 — 08.时间 的身份与循环链（确认 Clock 源③仍在）

buildCurrentStateTable（state-updater:273-287）：08.时间行 = `resolveStateTimeLabel({time: intent.time…})` = **intent.time 原样回显**（time-semantics:111-116：有则原样、无则 `unknown`——不发明，F5 注「never invent Day ${chapter}」）。→ **08.时间 = Control 回显**；经 loader→ctx.state→Clock 源③ 回流 → **上一章的 intent.time 回显在后续章成为 canonical**（06:15 即 ch7 的 intent.time 经 08 继承）。08 仍是源③，且因 F-G2E-1 不对称，**它是时刻类值事实上的唯一 canonical 来源**。

### F-G2E-3 — 消费者清单（终到端）

Clock canonical → scene seed clockBlock（scene.js:20-21）+ compiler 时钟块（含 source 标注与 lockRule 文案）→ Writer prompt；resolveWorldEventDay（plan.time→day token；日历串→null）→ 11.day + meta.current_day；锚**无时间字段**（buildChapterAnchor: pov/present/entities/relationship_state/banned/voiceDna）；scene.index 契约=「narrative order only，isWorldDate:false」（time-semantics:118-129——**已 Seal**：章序≠世界日期）。

## 3. 时间来源证据资格矩阵（六源 × 七问）

| 源 | 能证明 | 不能证明 | 类别 | 能否单独确立正式时间 | 缺什么 | 冲突时现行处理 | Sealed 还是实现 |
|---|---|---|---|---|---|---|---|
| ①plan.time/authored 计划字段 | 作者**意图**的场景时间 | 故事**实际**发生时间 | Control 载体中的 authored 内容 | **否** | Truth 授权（A′/混合才授予，且须 AMENDMENT） | 仅月日类能锁；时刻类被③压过（F-G2E-1） | 实现优先级 |
| ②prior scene text（前场正文正则） | 正文**逐字出现**过某月日/Day-N（文本接地） | 该月日=「现在」（提及≠当下）；无 admission 门 | **Actual-grounded 证据候选**——但零资格门（无 excerpt/offset 锚、无验证、无冲突裁决） | **否**（无准入） | G1-C 级别的证据资格门 + 「提及 vs当下」语义 | 排在 intent 之后（仅 intent 空时生效） | 实现（且是六源中唯一 prose 接地路径却无门） |
| ③08.时间 | 上一章 intent.time 的回显曾被写下 | 该时间的故事事实性 | **Control 回显的派生 presentation state** | **事实上在充当**（F-G2E-1/2）——**资格真空** | Q-S1 再分类 | 原始串保底胜出（覆盖 03:40 的直接机制） | 实现 |
| ④Story Clock canonical | 派生展示（锁定文案） | 权威本身 | derived presentation | 否（应随 T1 定权威后重排） | — | — | 实现（无 Seal） |
| ⑤11.day/time | 持久化的 day（authored explicit/day-token 可信；日历串→null 已 Seal） | 未 Seal 的前进机制；时刻 Truth | 混合（day 部分：authored+Sealed 宁缺） | day 维度部分合法 | Q-S3 | day=null 合法保留 | **部分 Sealed**（日历≠Day-N；空≠Reality） |
| ⑥章序/锚/chapter metadata | 叙事顺序 | 任何世界时间 | Control 元数据 | **否——已 Seal 禁**（classifySceneIndex 契约 + F5） | — | — | **已 Seal** |

**矩阵核心结论**：六源中**没有一源具备「确立正式故事时间」的完整资格**——①⑥被禁止或需修订；②有接地无门；③④是资格真空的回显/派生；⑤仅 day 维度部分合法。**InkOS 目前不拥有「认定故事现在是什么时间」的合法机制**——这正是 Gate 2 要 Seal 的东西，且比原报告更精确：不是六源排序问题，而是**唯一 prose 接地源（②）没有证据资格门 + 唯一时刻源（③）是 Control 回显**。

## 4. 事件发生时间 vs 时间推测（C 节任务）

实际存在的 Actual-grounded 时间证据 = **②一类**（正则命中的正文月日串）。与各推测形态的界线：正文时间提及（②，接地无门）≠大纲声明（①，意图）≠场景序/章隔推导（⑥，已 Seal 禁）≠先前状态继承（③，Control 回显）≠authored 显式声明（⑤day 维度已合法；时刻维度待 T1）。**遵守指令**：不因当前无事件时间消费者而推断永不需要（Q-T2 独立待裁）；不把 prose extraction 自动视为时间 Truth Authority（②现无门，恰恰是缺陷）。

## 5. 未知时间传播审计（D 节任务）

- **合法保留 ✓**：day=null（EO-P2 Sealed）；08.时间=`unknown`（resolveStateTimeLabel 不发明）；Clock canonical=null 时 lockRule 文案=「未确立…不要无故发明」（story-clock:78-84）——**Writer 可以在无精确时间下继续创作而不伪造**（prompt 明文约束），无阻塞点。
- **静默变确定 ✗（两处）**：①F-G2E-1 的 raw-append——state 侧任何非空串（含过期回显）即成 canonical；②③回显继承链——ch7 的 intent.time 经 08 在 ch8+ 成为「已确立时间」，**过期 Control 回显伪装成状态事实**（对质量目标 #1 的实际威胁源）。
- 下游把 presentation 当 Actual：Clock 块自带「Phase 1.R · Plan/State · 非 SR」标注（形式上已声明非 Truth）——但 canonical 值本身无类别标注，消费者无法区分 authored 锚/回显/prose 接地。

## 6. A′ / B′ / C′ / 混合的最终小说质量后果（以用户三目标为基准，不选）

| 方向 | 对目标#1（不为大纲毁事实） | 目标#2（冲突保事实调后续） | 目标#3（允许未知） | 架构 | 备注 |
|---|---|---|---|---|---|
| **A′** plan-time-as-authored-Truth | **最高风险**——大纲时间错时以 Truth 压已写出的事实 | 冲突时 plan 胜=反目标 | 可保留 | **AMENDMENT-REQUIRED**（修正案已定性的两读解均成立） | 不得包装成配置项；须附冲突裁决规则 |
| **B′** Actual/state-derived | 最佳契合 | 最佳契合——**前提是「已成立事实」的判定标准先立**（②需资格门） | 天然支持 | 无修订需求；**硬依赖 Q-S1**（08.时间再分类）+ 需定义可采 Actual-grounded 时间证据类 | 不得静默切源③——切断属 S1 Seal 后实现 |
| **C′** 新载体 | 契合 | 契合（载体+证据类双立后） | 支持 | 无修订（扩建）但**新 Truth Carrier 须特批** | 载器解决权威归属，**解决不了证据资格**（②的门仍要立） |
| **混合** | 取决于 authored 部分权重 | 须显式冲突规则（不得用混合掩盖） | 支持 | authored-explicit 部分携带与 A′ 同级 **AMENDMENT** 标记 | — |

**三方向共同前置**（无论选哪个）：②prose 接地源的证据资格门（G1-C 式逐字锚+准入）与「提及≠当下」语义——不立此门，B′/C′/混合的「已成立事实」无从谈起。

## 7. Q-S1 / Q-T1 依赖确认

**确认**（与修正案一致）：B′ 硬依赖 S1（08.时间再分类）；本轮新增——**任何方向都依赖一个共同子裁**：「可采时间证据类别表」（②是否入门、③回显是否可采、⑤时刻维度地位）——该表是 T1 Seal 语言的必要组成部分，不是新考古。

## 8. 证据已支持 vs 仍须 Human Seal

**证据已支持（可直接写进 Seal 附录的事实）**：F-G2E-1 覆盖机制=实现细节非权威；③=Control 回显；②无门；未知传播两处静默点；⑥禁令与⑤day 宁缺已 Seal；Writer 无时间可写不阻塞。
**必须 Human Seal**：Q-S1（08 语义+时间字段类别+源③存废）→ Q-T1（A′/B′/C′/混合+冲突裁决规则+**可采时间证据类别表**；A′/混合附 AMENDMENT 认领）。

## 9. 最小裁决问题（不代选）

1. **Q-S1**：08.时间字段类别=<Control 回显 presentation／Actual-derived／authored 通道>；Clock 源③=<停读/保留/改读新类>。
2. **Q-T1**：权威=<A′[含 AMENDMENT+冲突规则]/B′[含证据类别表]/C′[特批]/混合[含两者]>；**证据类别表**：prose 逐字月日（②入门须门）、08 回显（③可采性）、authored 显式时刻——各列可采/不可采/须门。

## 10. 回归测试建议（仅纯函数，不改系统状态）

`extractCalendarHints` 对裸时刻/月日/Day-N 的行为快照；`resolveStoryClock` 三级序+raw-append 不对称的显式用例；`resolveStateTimeLabel` unknown 路径——三者均纯函数测试，建议随 Gate 2 EO 实现时落盘（本轮未执行任何写状态测试）。

## 11. 状态声明

> **NOT SEALED · NO IMPLEMENTATION** —— 本审计为 Q-S1/Q-T1 的证据资格包；Gate 2 语义权威缺口**仍然开放**（本审计不宣称闭合）。

## Rescan（执行纪律要求）

FIRST REAL BLOCKER：**无新增**（生产链 10/10 在案；本审计全部为只读发现）。FIRST UNRESOLVED SEMANTIC AUTHORITY GAP：不变——Gate 2（Q-S1→Q-T1，现含证据类别表子裁）。**本审计不误报为已解除缺口。**
