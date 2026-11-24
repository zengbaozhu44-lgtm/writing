# GATE-2 — TIME / STATE AUTHORITY DESIGN GATE

**Mode**: READ-ONLY ARCHAEOLOGY（零代码/零 schema/零迁移）· **Date**: 2026-10-08
**前置**: Gate 1 SEALED；G1-A / G1-B / G1-C CLOSED

---

## 1. Current Sealed Semantics（在案冻结）

| 契约 | 原文依据 | 状态 |
|---|---|---|
| Plan/modelled ↛ 11 timeline events | S6.1 + EO-P2（state-updater 头注；F-06 已在 runtime 咽喉执行） | 🟢 Sealed+Executed |
| 「Persistence of empty day metadata ≠ Reality Status」 | EO-P2 注（state-updater:53） | 🟢 Sealed |
| 日历串 ≠ Day-N 序数（10月27日 是 Story Clock material，不是 Day 27） | time-semantics.resolveWorldEventDay 显式分支 → day:null（宁 null 不乱猜） | 🟢 代码级冻结 |
| authored explicit day 合法 | resolveWorldEventDay explicit_day 分支 | 🟢 |
| WL-01 判定 A | time/world grounding → Truth 进 SR（**信息可用性**）——**canonical 权威未裁** | 🟡 半冻结 |
| story-clock「Explicit plan lock first」 | Round 3 修 bug 的实现决定（防 prev-summaries 污染）——**非 Seal** | 🔴 未 Seal 的实现默认 |
| Event Identity 无时间组分 | Gate 1 Q6（sceneId+excerpt+offset） | 🟢 Sealed |
| 09 任务卡 authored_preserved 防洗白 | S3.4 | 🟢（Control 防护先例） |

## 2. Eight-Topic Archaeology（每项：证据→分类）

### T1 Time Authority ownership —— **Semantic Gap (H)**
六载体：plan.time（Control）/ Story Clock（运行时 canonical 展示）/ 11 day+time / 08 时间字段 / chapter 元数据 / **事件无时戳**。canonical 解析序（story-clock.js:54-74 源码实证）：**① intent.currentDate/time+scene 字段（Control）→ ② 前场文本 → ③ 08 状态表**。WL-01-KNOWN-LIMITATION（authored ch10=03:40 压 state 链 06:15）是该序的必然产物，非 bug。**谁拥有 Story Time 从未被裁决。**

### T2 Event timestamp semantics —— **Semantic Frontier（prove-or-rule）**
StoryEvent 无 time 字段；identity 时间无关（Q6）；11 行内排序=提取序。生产中**无任何被授权的 Truth 因缺事件时戳而无法表达**（T2/T3/SR/WCT 全不消费事件时间）→ 必要性 NOT PROVEN，但「须证明或裁否定」按令属裁决项。

### T3 载体与消费者地图
plan.time → Clock canonical + day 派生 · Clock → scene seed「故事钟（锁定）」prompt 展示 · 11 → 持久化 + timeline TopK 展示 · 08 时间 → Clock 源③ + studio 单字段修补（state-updater:206-215 注明 AUTHORIZED 的 Brain 侧写入口）· 锚（buildChapterAnchor 字段=pov/present/entities/relationship_state/banned/voiceDna——**无时间字段**）· 11.meta.current_day。跨载体漂移根因=T1。

### T4 `08` 写者与授权 —— **Semantic Gap (H)**
活跃写者三：①engine 表（buildCurrentStateTable，输入=intent=**Control**+wordCount）②applyPostChapter 手动 delta body（post-chapter:69）③brain-context-sync（studio）。**无 provenance 区分、无授权表**；「任务板(Control)」与「Actual 派生状态」两种语义混于同文件。

### T5 锚保护与章继承 —— **Semantic Gap (H)**
锚=runtime 每章写（writeChapterAnchorFile）、内容由 Control(intent)+scenes 派生；**无 authored_preserved 类保护**（对照 09 有）；rerun 覆写；planner 经 loadPriorChapterAnchor 消费作继承。锚的 Authority（Control 快照 or Truth 继承）未定义。

### T6 day 派生权威 —— **Semantic Gap (H)**
explicit authored day ✓ / plan-time day token ✓ / 日历串→null（设计）/**无 Actual 前进机制**（事件不推进 day）。生产实证：计划无 day/time 时 ch2+ 全 day:null → meta.current_day 永冻于 1。**「什么使 day+1」无契约。**

### T7 CLI / Brain / legacy 写路径 —— **Implementation Gap（守卫部分）+ S-A 依赖（授权部分）**
`cli.js:170` 与 `brain-chapter.js:28` 直调 applyPostChapter——**绕过 F-06 守卫**（守卫只在 runtime 咽喉 applyStateDiffToCanon）。timeline 守卫补齐=纯实现（S6.1 已 Seal）；通道存废政策=Q-S4 裁决。

### T8 rerun 幂等与历史一致性 —— **Implementation Gap（待 S-C/S-E 定键）**
appendTimeline 无条件 push → **同章重跑 = 11 重复 day 条目**；锚/08/ch_XXXX.json 覆写（快照语义待裁）；T2 幂等已由 G1-C 恢复 ✓；git 快照留档历史 ✓。

## 3. Time Carrier Authority Map

| 载体 | 现行角色 | 应然（待裁） |
|---|---|---|
| plan.time | **canonical 第一优先**（Control 越权嫌疑） | Q-T1 |
| Story Clock | 派生展示（锁定日历） | 随 Q-T1 |
| 11.day/time | 持久化（day 常缺） | Q-S3 |
| 08.时间 | Clock 源③+studio 修补 | Q-S1 |
| 锚 | 无时间 | （不涉） |
| 事件 | 无时戳 | Q-T2 |

## 4. State Writer / Consumer Map

07：authored ✓（runtime 零写者；仅手动 delta 通道可写=Q-S4）。08：三写者混语义（T4）。11：engine（守卫✓）+delta（守卫✗）+append-only 无章幂等。锚：runtime 独写无保护。消费者：loader（08/11/07→ctx）、planner（锚/09）、Clock（plan/08/前场）、TopK（11）、memory-unit（全链）。

## 5. Control → Truth Boundary Audit

①plan.time→canonical（**T1 待裁**——现行=Control 直通 Time Truth）②intent→08 表（T4）③intent+scenes→锚→下章继承（T5）④手动 delta→07/08/11（T7）⑤plan day token→11.day（T6）。**唯一已有防护**：S6.1 拦 plan 文本进 11.events；F-06 拦 runtime delta 通道。

## 6. Rerun / Cross-Chapter / Legacy Audit

见 T8/T7/T5。Cross-chapter：锚链继承=唯一跨章状态通道（Authority 未定）；11 跨章 day=null 时无序（T6）。

## 7. Root-Cause Chains（四条 H 级发现同构）

```
Symptom（03:40≠06:15 / 08 混写 / 锚无保护 / day 永冻）
↓ Local：canonical 序 Control 优先 / 写者无授权表 / 锚无 authored 位 / 无 day 前进源
↓ System：Time 与 State 的 Authority 从未进入任何 Seal
↓ Semantic：「何时」与「何态」的 Truth 权属未定义
↓ ROOT：与 Character Identity 同族——根节点（何时/何态）未 Seal，下游按工程默认运转
```
FIRST OBSERVED FAILURE（03:40 覆写、day:null、rerun 重行）≠ DEEPEST REAL BLOCKER（Time/State Authority 缺失）。

## 8. Semantic Gaps → 最小 Human Adjudication（七问）

**Q-T1 Story Time Authority**：A) plan-lock 成契（Control 拥有 canonical，现状合法化）／B) Actual/状态链派生为真（plan 仅 presentation，Clock 改派生）／C) authored canon-time 载体（新 Truth Carrier，须特批）。
**Q-T2 Event 时戳必要性**：须携带（scene-clock 派生、derived 非 authority）？或裁定 NOT NEEDED（scene 粒度时序足够，事件时间无关性成契）。
**Q-S1 08 语义**：Control 任务板／Actual-derived 状态／分拆（写者授权表+provenance 标注）。
**Q-S2 锚**：是否加 authored 保护；继承 Authority 归属。
**Q-S3 Day 前进权威**：authored 显式／跨夜 Actual 证据／plan 声明；day:null 的合法表示（已是 EO-P2 注）。
**Q-S4 手动/legacy 通道**：cli/brain-chapter 的 applyPostChapter 保留加守卫／退役。
**Q-S5 11 rerun 幂等键**：按章去重（同章重跑=同一天）／历史追加。

## 9. Implementation Gaps（Seal 后即可执行，零新语义）

legacy 通道 timeline 守卫 · 11 按章幂等 · 08 provenance 标注 · 锚保护位 · Clock 解析序按 Q-T1 重排。

## 10. First Real Blocker：**NONE**（生产 10/10 全通；day:null 等均为质量/语义前沿非阻断）。

## 11. First Unresolved Semantic Authority Gap：**Gate 2 本体**——Q-T1（Time canonical）与 Q-S1（08 分层）为最上游两问。

## 12. Proposed Named EO 序列（以 Seal 为条件）

EO-G2-A Story Clock Authority（Q-T1/Q-T2 → 解析序重排±事件时戳）→ EO-G2-B State Carrier Discipline（Q-S1/Q-S2/Q-S4 → 08/锚/通道）→ EO-G2-C Day & Rerun Idempotency（Q-S3/Q-S5 → day 前进+11 幂等）。各自带回归/生产/文学/双扫描链。

## 13. Non-Scope

Agency/L1/L2/Choice 实现 · 新 Truth carrier（除 Q-T1-C 特批路径）· 历史 11/08/锚迁移 · Gate 1 重开 · Phase 路线改动。

## 14. Final Verdict

> **HUMAN ADJUDICATION REQUIRED**——七问最小集（Q-T1/T2/S1–S5）；证据充分（无 EVIDENCE INSUFFICIENT 项）；四条 H 级发现同根（何时/何态未 Seal）。

**STOP——零实现；等待 Human Seal。**
