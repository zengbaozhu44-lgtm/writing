# STORY TRUTH ROOT-CAUSE ARCHAEOLOGY-01

**Mode**: READ-ONLY（零代码/零 schema/零 EO/零 whitelist/零 Seal 假设）· **Date**: 2026-10-08
**Mission**: 以 Character Identity 缺失为样本，反向扫描两条冻结路线的全部 22 节点，寻找「实现存在、语义不存在」的同类结构性缺口。

---

## I. Root-Cause Map（22 节点 × 定义/Authority/准入/消费者）

| # | 节点 | Definition | Authority | Admission | 状态 |
|---|------|-----------|-----------|-----------|------|
| 1 | CANON | reality/witness 契约 | Actual-only 写入（Canon 写入口唯一：memory-unit ②c） | 逐字门+禁令 | 🟢 Sealed |
| 2 | ACTUAL | StoryEvent（R1/R2 Seal 修订后） | prose 提取（LLM/确定性双 producer） | excerpt 逐字+grounding+source 禁令 | 🟢 Sealed（主体侧见 F-01） |
| 3 | INFORMATION BOUNDARY | SR omit 语义+prompt 边界块 | — | — | 🟢 Sealed |
| 4 | PERCEPTION | SR awareness 槽 | Actual/CW 投影 | basis 必需 | 🟢 Sealed |
| 5 | INTERPRETATION | SR interpretation 槽 | 同上 | 同上 | 🟢 Sealed |
| 6 | SR | 只读 View（≠ Reality Authority） | 投影引擎 | evidence→slot | 🟢 Sealed |
| 7 | **CHARACTER IDENTITY** | **无** | **无** | **无** | 🔴 **F-01** |
| 8 | CHARACTER ACCESS | Experience 级（participant/witness） | characterCanAccessActualEvent | Control 在场枚举作 witness 集 | 🟡 F-02/F-04 |
| 9 | L1 ELIGIBILITY | Actual-grounded 主体在场 | 确定性谓词 | Frozen #10（枚举≠证据） | 🟢 Sealed |
| 10 | L1 EVALUATION | P1 合流三态 | 确定性 | AccessTruth+Eligibility | 🟢 Sealed（sidecar 零消费者=设计） |
| 11 | L2 DOMINANCE | 负边界封闭 | — | 11 因子全 NOT PROVEN | ⚪ Sealed 冻结 |
| 12 | CHOICE | NOT PROVEN | attribution gate（Choice 域） | typed evidence | 🟡 dormant（F-11，内容缺） |
| 13 | ACTION | CADE→Intent→CharacterAction v2 | authored decisions + Actual occurrence | 对应关系 v2 锚定链 | 🟡 dormant（F-11） |
| 14 | CONSEQUENCE | WCT（Risk 7 立法后） | authored 锚 + occurrence 独立复验 | non-echo+aftermath | 🟢 Sealed |
| 15 | STATE | 07=authored 快照；11=Actual 流；**08=多写者混杂** | 07 authored / 11 engine / **08 四写者** | 11 有守卫但**delta 通道无** | 🔴 F-05/F-06 |
| 16 | SURVIVAL | SR 预算槽优先级 | compiler | — | 🟢 Sealed |
| 17 | NEXT SCENE | 章锚链+authored 计划 | anchor（states/） | authored_preserved 防洗白 | 🟢 Sealed |
| 18 | WRITER | 只填正文，非真相权威 | prose 唯一源 | 回流经 ACTUAL 门 | 🟢 Sealed |
| 19 | T2 EXPERIENCE | 六契约（append-only/idempotent/…） | appendT2 | **Access 级有、Identity 级无** | 🟡 F-01 实例 |
| 20 | T3 FORMATION | 双通道（≥2 独立实际/authored seal） | 确定性验证+authored | basisRefs 命中同角色 T2 | 🟢 Sealed（通道 A=DEFINED NOT MATERIALIZABLE=合法态） |
| 21 | CHARACTER WORLD | seed 物化+T2 追加，不删不盖 | authored seed+Actual | 反洗白（槽仅 seed） | 🟡 subjects 无界（F-01） |
| 22 | PROJECTION | 保留合并 world→SR | 确定性 | fail-closed 空 World 不投 | 🟢 Sealed |

**边界授权审计（§6 十六边）**：15 条边有 Named EO/Sealed 契约背书（PROSE→EVIDENCE Phase1.3、EVIDENCE→ACTUAL R1/R2、ACTUAL→EXPERIENCE CW-Trace、CW→SR CW-Projection、SR→L1 Frozen#10、L1→L2/L2→CHOICE 封闭裁决、ACTION→CONSEQUENCE WCT+Risk7、OUTLINE→CARRIERS WL-01/03/04+authored_preserved、PROJECTION→WRITER consume-only）。**2 条边无契约：CONTROL→TRUTH（F-04）；ACTUAL→EXPERIENCE 的 Subject 准入（F-01）。**

## II. 发现清单

### F-01 Character Identity 契约缺失 —— 分类 A（PROVEN SEMANTIC GAP）· 严重度 HIGH · 非执行 blocker · **需 Human Seal**
症状：world.json 10 伪实体；苏眠 T2=0 体验挂伪名下。
证据链：正则捕获组=actor 首个定义 → actors 无身份校验 → ensureCharacterBlock 无界建块。
最深根因：`SYMPTOM 伪角色入库 ↓ LOCAL ensureCharacterBlock 无条件建块 ↓ SYSTEM T2 准入只验 Experience 级 Access ↓ SEMANTIC Subject Identity 从未定义 ↓ ROOT 「字符串=实体」的 reification 默认——无任何冻结原则覆盖「什么使名字成为角色」`。

### F-02 Subject/Object/Participant 合流 —— A（F-01 实例）· MEDIUM
`characterCanAccessActualEvent` 与 appendT2 中 actors/affectedEntities 同权 participant——物件与主体共用一条准入谓词。根因同 F-01（无 identity ⇒ 无法分流）。并案处理。

### F-03 Event/Occurrence Identity 弱 —— B/E · LOW-MEDIUM
id 位置性（`evt_${sceneId}_${kind}_${i}`）；CAT `refOf` 有 `occurrence:${action.slice(0,40)}` 前缀 fallback——内容前缀当 id，同名动作跨场可碰撞。根因：occurrence 无语义身份 ⇒ 引用退化。可在 F-01 Gate 顺带裁决（refOf fallback 是否禁用）。

### F-04 Control 枚举越权当 Truth 锚 —— A（候选并案）· MEDIUM-HIGH
knownNames/scene.characters/pov/present（plan 字段）承担三重 Truth 角色：LLM actor 白名单、present-witness access 集、eligibility 枚举。Frozen #10 只封了 eligibility 一处的「枚举→证据」。根因：**Control→Truth 映射无契约**。与 F-01 同 Gate 并案。

### F-05 State 家族语义未分层（08 多写者）—— A-lite / H 候选 · MEDIUM-HIGH
08_current_state 四写者：buildCurrentStateTable（ctx=**intent 即 Control**）、post-chapter delta（手写）、brain-context-sync（studio）、engine（Actual 派生）。同一载体混「任务板」与「Actual 派生状态」两语义，无 provenance 区分。07（authored）/08（混合）/11（actual+delta）三载体 Authority 未分层。Pattern 8 实证。**需独立 Design Gate。**

### F-06 timeline 双写者纪律不齐 —— **B（PROVEN IMPLEMENTATION GAP）**· HIGH
契约存在且 Sealed（S6.1 + EO-P2：「Planner/Scene 骨架短语不得升级为 Canon timeline.events」），engine 路径执行守卫；但 `applyPostChapter` 的 `delta.timeline → appendTimeline` 通道**零守卫**。生产实证：R2 batch 11_timeline ch1 day-1 混入计划骨架（`建立 POV（主角）当下目标：进入世界`/`克服阻碍：资源不足或时间压力`）——**Plan 被持久化为已发生事实**。Pattern 5+10 同时命中。契约足够 ⇒ **可建议最小 Named EO**（delta 通道过 isActualTimelineEvent + 拒绝骨架 + provenance 标注）。

### F-07 timeline `day: null` —— B/E · MEDIUM
ch2+ 全部 day:null → 时间轴无日序。根因：Story Clock 存在（WL-01）但 day 解析仅吃 plan.time；时间身份部分实现。WL-01 已知限制家族，随 F-05 Gate 顺带裁决。

### F-08 inferActorsFromText 硬编码默认名 —— B/E · LOW
`['苏晚','林夜','陈默']`（golden 遗留）作为零名单 fallback ⇒ fallback 可创造 Subject（Pattern 10）。生产极少触发（pov 恒在）。随 F-01 EO 处理。

### F-09 Location 载体孤儿 —— C/D · LOW
04b_location_bible 仅 studio module-service 列名，生产 prompt 链零消费（WL-04 前 faction 同型）。非语义缺口；若接线属 C，无内容属 D。**不建架构。**

### F-10 Faction/Relationship 端点身份 —— E · LOW
faction=文件名 substring；relationship from/to 无身份校验（继承 F-01）。作 authored 通道无伪造面 ⇒ 记录。

### F-11 上层真相链 dormant —— D · 非缺口
Intent 1/40、Action 0/40、WCT 0/40：能力经六套 EO 测试证明，缺 authored decisions 内容。**不建架构，属作者通道供给。**

### F-12 excerpt 轻漂移容忍 —— E/F · LOW
`textIncludesEvidence` 允许 ≥8 字 excerpt 40 字前缀命中。设计选择（LLM 标点漂移容忍）；「string exists→accepted」软点，reality-golden 持续监督。记录不修。

### F-13 presence 公式化 consequence —— 已关闭
R2 Seal 立法收编（消费者必须再 grounding；公式串不可造 W——行为级已验）。列为**已关闭先例**，非缺口。

### F-14 seed 同步 vs T2 追加（Pattern 8 检查）—— 无发现
sync 物化不删 T2（EO-CW「不删除 Actual 项」）；writeNextChapterTask authored_preserved 防洗白。安全，记录。

## III. Cross-Cutting Root Causes

- **CR1 Subject Identity 缺失**（F-01/02/03/08/10 共因）：字符串=实体；无 admission boundary。
- **CR2 Control→Truth 映射无契约**（F-04；Frozen#10 只封一处）。
- **CR3 Admission 边界碎片化**（F-01/05/06）：每个存储各自为政，无统一「准入即 Truth」关卡；validator 查存在性不查语义。
- **CR4 Producer 语义分岔**（已证 consequence=R2 关闭；actors=F-01；timeline candidates=F-06）。
- **CR5 Persistence Reification**（world.json 建块即真；11 追加即已发生——delta 通道无守卫时把 Plan 变历史）。
- **CR6 Fallback 升真**（F-06 计划骨架入 timeline=实证；F-08 默认名=潜在；R2 已立法 consequence 侧）。

## IV. Semantic Frontier（现有冻结契约无法安全推出，须 Human Seal）

1. **Character Identity Boundary**（并案 F-02/03/04/08：身份载体、层位、admission 位、代词共指、存量清洗）
2. **State 家族 Authority 分层**（F-05/07：07/08/11 三载体语义、08 多写者、day 解析）

## V. Implementation Gaps（契约已足，可建议 Named EO）

1. **F-06 timeline delta 通道守卫**（S6.1/EO-P2 已 Sealed，单点绕过）——最小 EO 候选
2. F-08 默认名移除（随 F-01 EO）

## VI. Production Risks（已影响真实生产）

伪角色污染 CW（F-01，每 run）；苏眠体验误归属（F-01）；11_timeline ch1 计划骨架成史（F-06）；时间轴 day:null 无日序（F-07）。

## VII. Historical Data Risks（不可直接清理）

world.json 伪实体块（须等 F-01 Seal 定清洗通道，防误删真积累）；11_timeline 既有 day-1 条目（须按 F-06 EO 定 provenance 重整，不手删）；历代 batch 的 actors 字段（语义未定前不回改）。

## VIII. Recommended Execution Order

1. **F-06 → 直接最小 Named EO**（契约足够，不须新 Gate）：delta.timeline 过 isActualTimelineEvent + 骨架拒绝 + provenance。
2. **F-01 家族 → Character Identity Boundary Design Gate → Human Seal → Named EO**（并案 F-02/03/04/08 与存量清洗）。
3. **F-05 家族 → State Authority Design Gate → Human Seal → Named EO**（并案 F-07）。
4. F-09/F-11 → 不建架构（内容/接线延后至 WL-05/WL-06 评估）。
5. F-12 → 记录 + reality-golden 监督。

## IX. 最终决断与计数

- **REAL BLOCKER：无**（按 §10 严格标准：伪角色污染限于 CW 支线内部，未进 SR/Writer；无 Truth 污染扩散已证路径）。
- **「Character Identity 级」隐性语义缺口计数**：**已证实 1 个（Character Identity）；候选同级 2 个（State 家族 Authority 分层、Control→Truth 映射——后者可与 1 并案）**。即系统内真正「概念只是代码里的名字、从未成为系统语义」的重量级缺口共 **3 个**（其中 2 个可并案一次 Seal）。
- 其余：6 个已封边界外的可修实现缺口（1 个可即刻最小 EO）、2 个管线/内容缺口、4 个质量/观测项、1 个已关闭先例。

**STOP——零修复，等待裁决：① F-06 最小 EO 授权；② Character Identity Boundary Design Gate 召开；③ State Authority Design Gate 召开。**
