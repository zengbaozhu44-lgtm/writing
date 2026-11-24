# GATE-2 — HUMAN ADJUDICATION PACKET（NO IMPLEMENTATION · NO SEAL IMPLIED）

**Date**: 2026-10-15 · **Input**: gate-2-time-state-authority-design-gate.md（证据输入，其建议不构成权威）
**Boundaries**: 本包 12 条冻结边界全程持有（Plan≠Actual / Clock 行为≠Seal / 08 存在≠写授权 / StateDiff≠后果 / 推断时间≠Actual 时戳 / 日历≠Day-N / 未知保持未知 / 事件身份不加时间 / 不重开 Gate 1 / 无认知引擎 / 无新载体无授权不动 / 宏观路线不动）

---

# A. Human Adjudication Matrix（七问 × 十要素）

## Q-T1 — Story Time Authority

1. **裁决请求**：谁拥有 Story Time 的 canonical Truth 权威——授权表将据此重排 Clock 解析序。
2. **现行行为（源证）**：story-clock.js:54-74 解析序 = ①intent.currentDate/time+scene 字段（Control）→ ②前场文本 → ③08.时间；「plan lock first」为 Round 3 修 bug 的实现决定，未 Seal。生产实证：authored ch10 03:40 压 state 链 06:15（WL-01-KNOWN-LIMITATION）。
3. **已 Seal / 未 Seal**：已 Seal——日历串≠Day-N、空 day≠Reality、authored explicit day 合法；**未 Seal**——canonical 权威归属、回退链各源的地位。
4. **选项后果**：
   - **A) plan-lock 成契**：Control 拥有 canonical。保留：无冻结契约被字面违反（此为显式授权而非「解析器优先即成真」）。风险：作者笔误即成 Canon；跨章连续性由 authored 输入驱动（rerun 稳定）；残留——无 plan 时间章的回退链地位仍需子裁（②③源此时是 Control 还是派生？）。
   - **B) Actual/状态链派生为真**：plan 降为 presentation。后果：03:40 案翻转（state 链胜）；**硬依赖 Q-S1**——现 08.时间源自 intent（Control），B 要求先重分类 08 的时间字段，否则循环；且 prose 时间提及=推断（边界#5 禁作 Actual 时戳）→ 可用非推断源收窄为「authored 显式时间」。
   - **C) authored canon-time 新载体**：最干净分离，但新 Truth Carrier（边界#11——仅本 Seal 可特批）；载体冗余风险。
   - **混合必要？是（不代选）**：语义上存在自然混合式——「authored 显式时间=Truth；章间连续性由派生链维持；plan 永不 authoritative」。若您选混合，须同时裁回退链全序。
5. **契约交互**：A 需明示「显式授权 Control 拥有 Time」以区别边界#1 的禁止情形；B 受边界#5 收窄；C 需特批。
6. **依赖**：被 Q-T2、Q-S3 依赖；与 Q-S1 交互（B 硬依赖）。
7. **最小 Seal 语**：「Story Time canonical Authority 归 <X>；<X> 缺失时回退序为 <…>；plan.time 的语义类别为 <Truth/presentation>；推断时间永不入 Truth。」
8. **选后残留**：回退链证据类别表；prose 时间提及的类别（presentation?）。
9. **混合/条件式**：见 4。
10. **后续证据**：无（现有充分）。

## Q-T2 — Event 时戳必要性

1. **裁决请求**：Actual Event 是否须携带时间属性（注意：≠ 加入身份——边界#8）。
2. **现行**：schema 无 time；11 行内序=提取序；T2/T3/SR/WCT 零消费事件时间（消费者审计在案）。
3. **已/未 Seal**：身份无时间组分已 Seal（Q6）；时戳必要性从未裁。
4. **选项后果**：(a) **NOT NEEDED（限定式）**——裁定「现役+已授权语义不依赖事件时戳；scene 粒度时序足够」；保留边界#5（无推断时戳）；rerun 零影响。(b) **派生 presentation 戳**——事件携带 scene-clock 派生时戳，provenance=derived，永不入 Actual 类；后果：11 行内可排序，但派生源权威取决于 Q-T1；持久化进 11 需 Q-S5 配合。
5. **契约交互**：(b) 必须以「presentation 类」实施否则触#5；(a) 须限定范围——**「当前无消费者」不是「未来永不需要」的证明**（交叉审计项）。
6. **依赖**：Q-T1（派生源的语义取决于 canonical 归属）。
7. **最小 Seal 语**：「Actual Event <须/无须>携带时间属性；若须，其类别为 derived-presentation，来源 <Clock 权威>，永不作为 Actual timestamp；本裁定范围=<现役+已授权语义>，新语义需要时须重开。」
8. **选后残留**：(a) 留下「未来消费者出现即重开」的触发条款；(b) 留下戳的精度/表示。
9. **混合必要？否**（两互斥）。
10. **后续证据**：无。

## Q-S1 — `08` 语义与写者授权

1. **裁决请求**：08 是 Control 任务板、Actual-derived 状态、还是分拆。
2. **现行（源证）**：三活跃写者——engine 表（输入=intent=Control+wordCount，state-updater:95）、手动 delta（post-chapter:69）、studio brain-context-sync（:206-215 自注 AUTHORIZED）；无 provenance 区分。
3. **已/未 Seal**：09 的 authored_preserved 是**邻域先例**非 08 契约；08 从未裁。
4. **选项后果**：(a) **Control 任务板**——三写者全合法但须 provenance；其时间字段=Control 输入（若 Q-T1=B 则该字段不得再作 Clock 源③→联动重排）。(b) **Actual-derived**——engine 写者合法化须先重定义其输入（现含 Control）；手动/studio 写者需逐个授权或废。(c) **分拆**——最清晰但**可能触及新载体/schema（边界#11：仅 Seal 可批）**。
   - **混合必要？是（不代选）**：「单文件+逐写 provenance 标注」是语义上成立的轻量混合式（不新建载体）。
5. **契约交互**：边界#3（存在≠授权）——任何选项都以本 Seal 为授权来源；与 Q-T1-B 联动。
6. **依赖**：被 Q-S2/Q-S4 依赖；与 Q-T1 交互。
7. **最小 Seal 语**：「08_current_state 的语义类别为 <…>；合法写者及其 provenance 标注为 <表>；其『时间』字段类别为 <…>。」
8. **选后残留**：provenance 词汇表；studio 通道细则。
9. 见 4。
10. **后续证据**：无。

## Q-S2 — 锚保护与章继承

1. **裁决请求**：章锚是否加 authored 保护；继承（planner 消费前锚）的 Authority。
2. **现行**：runtime 独写（memory-unit:536）、内容 Control(intent)+scenes 派生、rerun 覆写、无 authored 位（对照 09 有）。
3. **已/未 Seal**：未裁。
4. **选项后果**：(a) **加 authored_preserved 类守卫**——防覆写；**注意交叉审计：保护≠锚整体成 Truth**（它是防洗白机制，与 Truth 类别正交——锚的分类仍随 Q-S1 家族）。(b) **维持 runtime 独写**——rerun 覆写为合法自修正。(c) **退役继承**——跨章连续性改走其他载体（波及 planner，重）。
5. **契约交互**：a 与 S3.4 先例同构；任何选项不使锚自动升 Truth（边界#4：StateDiff≠后果）。
6. **依赖**：Q-S1（锚属 state 家族，分类平行）。
7. **最小 Seal 语**：「章锚的覆写政策为 <…>；其语义类别为 <Control 快照/派生状态>；继承消费的 Authority 为 <…>。」
8. **选后残留**：authored 锚的格式（若 a）。
9. **混合必要？否**（可组合但非必要）。
10. **后续证据**：无。

## Q-S3 — Day 前进权威

1. **裁决请求**：什么使 day+1；day:null 的合法表示。
2. **现行（源证）**：resolveWorldEventDay——authored explicit ✓、plan-time day token ✓、日历串→null（已 Seal 的宁缺）、**无 Actual 前进机制**；生产 ch2+ 全 null→current_day 冻 1。
3. **已/未 Seal**：日历≠Day-N、空≠Reality 已 Seal；**前进机制未裁**。
4. **选项后果**：(a) **仅 authored 显式**——最保守；day 缺失保持 unknown（边界#7）；文学层：时间轴常缺（现状）。(b) **Actual 证据类**（如「已 Seal 的跨夜证据类」）——注意从 prose 推「夜过境」=推断，须以**显式授权的证据类别**呈现而非解析即真（边界#1/#5）。(c) **plan 声明前进**——Control→Truth 直通风险。
   - **混合必要？是（不代选）**：「authored 显式优先 + 有限列举的 Actual 证据类兜底」语义上成立。
5. **契约交互**：#6/#7 全选项持有；b 需本 Seal 显式列举证据类。
6. **依赖**：Q-T1（时间权威决定 day 属谁的时间语义）。
7. **最小 Seal 语**：「day 前进的合法来源为 <枚举>；无来源时 day=unknown 且禁止填充；chapter 序数/date 串/plan intent 不得隐式推进。」
8. **选后残留**：b 时的证据类清单细则。
9. 见 4。
10. **后续证据**：无。

## Q-S4 — legacy 手动通道政策

1. **裁决请求**：cli.js:170 与 brain-chapter.js:28 直调 applyPostChapter（绕 F-06 守卫）的处置。
2. **现行**：两通道存在；timeline 守卫只在 runtime 咽喉；**可达性区分**：cli=人工手动、brain-chapter=legacy 工作流（生产主链不经过）。
3. **已/未 Seal**：S6.1 语义已 Seal（守卫补齐=实现）；**通道存废政策未裁**。
4. **选项后果**：(a) **补守卫**（同谓词过 isActualTimelineEvent）——语义零新。(b) **退役**——须区分：生产可达性（低）、兼容性（旧书流程）、权威政策（谁可手写 state）三件事（交叉审计项）。(c) **显式 flag 门控**。
5. **契约交互**：无违；b 的权威面并入 Q-S1 写者授权表。
6. **依赖**：Q-S1（写者纪律）。
7. **最小 Seal 语**：「applyPostChapter 手动通道 <保留并守卫/退役/flag 门控>；其写者权威并入 08/11 授权表。」
8. **选后残留**：无。
9. **混合必要？否**。
10. **后续证据**：brain-chapter 的现存调用方清单（实现期核，非裁决前置）。

## Q-S5 — 11 rerun 幂等

1. **裁决请求**：同章重跑的 day 条目处置。
2. **现行**：appendTimeline 无条件 push——重跑即重复行（实证）；无章键。
3. **已/未 Seal**：append-only 倾向（EO-P2 氛围）未就 rerun 明裁。
4. **选项后果**：(a) **按章键自修正**——同章重跑覆盖本章程内行（自修正≠改写他人历史；**注意交叉审计：严禁滑向「按语义相似去重全部历史」**——键=chapter，非内容）。(b) **历史追加**——重跑留双行+observability 标注。
5. **契约交互**：#7（不发明值）；a 的「覆盖本章程内条目」需 Seal 语显式授权（append-only 例外仅限 self-chapter）。
6. **依赖**：Q-S3（同章=同一天与否决定键语义）；轻依赖 Q-T2。
7. **最小 Seal 语**：「11_timeline 的 rerun 语义为 <按章自修正/追加>；去重键=chapter（禁止内容相似度去重）；跨章历史永不改写。」
8. **选后残留**：无。
9. **混合必要？否**。
10. **后续证据**：无。

---

# B. Decision Order Proposal（依赖驱动；不假定原序权威）

- **第一波（相互独立，可并行裁）**：**Q-T1、Q-S1**。
- **第二波**：Q-T2（需 T1）、Q-S3（需 T1）、Q-S2（需 S1）、Q-S4（需 S1）。
- **第三波**：Q-S5（需 S3）。
硬依赖仅四条：T2←T1；S3←T1；S2←S1；S4←S1；S5←S3。其余组合自由。

# C. Semantic Residuals（七问全裁后仍开放——仅列不造架构）

① 任意 T1 选择下的**回退链证据类别表**（各源：Control/派生/authored 的逐类地位）；② prose 时间提及的语义类别；③ 08 provenance 词汇与 studio 通道细则；④ authored 锚格式（若 S2-a）；⑤ S3-b 的 Actual 证据类清单；⑥ 派生时间戳可否持久化进 11（T2-b×S5 交点）；⑦ 多载体间 canonical 同步刷新时机（实现层）。

# Cross-Question Audit（七项混淆逐条核验）

1. 「Plan 非 Truth Authority」⇏「Actual 必供时戳」——Q-T2 独立裁决，消费者审计为据，且 NOT NEEDED 须限定范围。✓ 已隔离
2. 「08 应分拆」⇏「自动授权新载体/schema」——S1-c 明示须经本 Seal 特批（边界#11）。✓
3. 「authored-preserved」⇏「锚整体成 Truth」——S2-a 明示保护与 Truth 类别正交。✓
4. 「Day 前进」禁从章数/date 串/plan intent 隐式推断——S3 各选项显式持 #6/#7。✓
5. 「同章 rerun 幂等」⇏「按语义相似去重历史」——S5 键=chapter，明令禁止内容去重。✓
6. 「legacy 退役」三分可达性/兼容性/权威政策——S4-4 已三分。✓
7. 「事件时戳不需要」须以消费者审计支撑而非「现在没人用」——T2-4(a) 限定式+重开触发条款。✓

# D. Final Classification

> **READY FOR HUMAN SEAL**

理由：七问各自证据充分（无 insufficient 项）；每问的选项、后果、契约交互、最小 Seal 语与依赖均已完备；交叉审计七项混淆全部隔离；残余项均为选后细则级，不构成裁决阻塞。

**STOP——本包不含任何选项选择；等待 Human Seal（建议按 B 序：先 T1+S1）。**
