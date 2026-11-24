# ROOT-CAUSE ARCHAEOLOGY-01 — 八项定向 Identity 考古 + 语义缺口依赖图

**Mode**: READ-ONLY · **Date**: 2026-10-08 · **前置**: 全路线 22 节点扫描（story-truth-root-cause-archaeology-01.md）
**新控原则已采纳**：每 EO 后除 FIRST REAL BLOCKER 外，必检 **FIRST UNRESOLVED SEMANTIC AUTHORITY GAP**（区分 FIRST OBSERVED FAILURE vs DEEPEST REAL BLOCKER；上游身份/Authority 缺口优先 Gate，不在下游打补丁）。

---

## ① Event Identity —— 凭什么是「同一个 Event」？

**机制**：StoryEvent id = **位置性**（`evt_${sceneId}_${kind}_${i}`；LLM 路径 `_llm_${i}`、确定性 `_action_${i}`——**producer 路径切换即换 id**）。双层去重：内存 dedupeEvents 用内容键（kind|action|excerpt），T2 幂等用 actualRef=id。Occurrence **不是类型**——是 CAT/WCT 消费 actualEvent 时的用法称呼；occurrenceRef = id，**fallback = 动作前缀 `occurrence:${action.slice(0,40)}`**（内容当 id，同名动作跨场可碰撞）。State change = 事件内字符串数组，无自身 identity。
**隐式 identity**：位置 id（session 内）+ 内容键（内存）+ 前缀 fallback（跨层引用）——三者互不等价。
**生产风险实证**：`ensureActualEventsWithExtraction` 仅同 session 防重提（`reextract!==true`）；跨 run 重跑章 → events 重建 → 新 id → **T2 actualRef 幂等失效 → 同一事件双记**。
**判定**：**B-lite（可修实现缺口）**——id 语义规则（稳定 id 策略 / refOf fallback 禁用）可并入实体身份 Gate 裁决或独立小 EO。

## ② Actual Identity —— Actual 有正式 identity/provenance/admission 吗？

**Admission**：有——validateStoryEvent（R1/R2 Seal 后的门）是真实准入边界。**Provenance**：有但弱——`source` 仅两类语义（scene.text/annotated）+ actualEventMeta（版本/fallback 标记）；能答「哪个提取器」不能答「第几次提取/是否重跑产物」。**Identity**：无跨 run 稳定身份（①）；actualEvents 无独立 registry（栖身 scenes json，重跑覆盖）。
**判定**：「extractor 输出+validator pass 即 Actual」**在准入意义上成立**（门是真的），但**身份与溯源在重跑语义上未定义**——②的一半是 ①，另一半是 B 级（registry/重跑语义，待 Gate 定）。

## ③ Attribution Identity —— 归因主体与合流

**冻结原则 Occurrence ≠ Attribution 守住**（CAT/WCT 分离）。但 `candidatesFromScene`（attribution-wiring:170）：**归因主体 = event.actors 原样展开，actors 空则 pov 兜底**——归因主体**完整继承 actors 的身份问题**：伪名可被归因（`车门` 若在 actors 即得 attribution record）；pov 兜底=Control 兜底。recordId=`attr_${ev.id}_${characterId}` 继承 id 弱稳定性。
**合流清单实证**：speaker=speech 事件 actors[0]（构造时隐式）；witness=T2 `access:'present_witness'`（Control 在场集判定）；participant=actors∪affectedEntities **同权**（物件/主体共谓词）；subject=L1 eligibility（actors/affected 命中即在场）。
**判定**：**③ = F-01/F-02 的第二层实例**（归因边界身份真空），并入实体身份族 Gate。

## ④ State Identity —— current/previous/derived/authored 谁是 authority？会被大纲覆盖吗？

- **previous state** = states/ 章锚（`writeChapterAnchorFile` runtime 写，**无 authored 保护标记**——对照：09 任务卡有 authored_preserved 防洗白，锚没有）
- **current state** = 08（四写者混语义，F-05）
- **derived state** = 11（engine 路径有 S6.1/EO-P2 守卫）+ 08 部分
- **authored state** = 07（runtime 零写者 ✓）
- **Actual consequence 作 State authority**：不存在——engine 直接吃 actualEvents，WCT 断言不进 state（Consequence→State 边未接，与 WCT dormant 无关，是设计现状）
- **大纲覆盖**：可能——`applyPostChapter` delta 通道可写 07/08/11 且零 provenance（F-06 实证计划骨架已入 11）；锚可被重跑覆写
**判定**：**State 家族 Authority 未分层**（H 候选，Gate 2），F-06 是其中唯一契约已足、可先行修复的 B。

## ⑤ Relationship Identity —— 事实/观察/角色认知/图结构分离了吗？

**四层现状**：05 全局图（authored 事实）→ prompt 关系 TopK（Writer 上下文，信息边界文案防护）→ **SR affect 槽（全局边直接投影进角色 SR）** → knowledge/stance（有 basis 门）。
**关键发现**：SR 的 knowledge/belief/stance 槽都有 epistemic basis 要求，**唯独 affect_relationship 槽没有**——`projectAffectRelationship` 把全局图的 trust/hostility 直接投进角色主观槽，仅靠 prompt 文案软性防护「角色未必知道这段关系的立场值」。WL-04 修的是**方向**折叠；**epistemic 门缺失是另一层**（fact↔cognition 混流点：全局关系事实未经验知即成角色 affect）。
**判定**：**H-lite（endpoint 身份属 CR1 族 + affect 槽 basis 门缺失）**——并入实体身份 Gate，或作其姊妹裁决项。

## ⑥ Time Identity —— Time 在 InkOS 到底是什么？

`resolveStoryClock` canonical 权威序（源码实证）：**① intent.currentDate/time + scene 字段（=Plan，Control 层）→ ② prior scene text → ③ ctx.state.时间（08 表）**。
即：**Time 的 canonical Authority 是 Control 层 plan 字段优先**——WL-01-KNOWN-LIMITATION（authored ch10=03:40 压过 state 链 06:15）不是 bug，是权威序的必然结果。Time 现有六种载体：plan.time（Control）/ Story Clock（运行时 canonical 展示，锁定日历）/ 11 day+time（持久化，day:null 缺口）/ 08 时间字段（状态表，另有单字段修补通道）/ chapter metadata / 事件自身**无时间戳**（StoryEvent 无 time 字段——Actual 无时序身份）。
**判定**：**H 候选（CR2 Control→Truth 族核心实例）**——Time Authority 从未被裁决（何为 Canon time？plan 锁 vs Actual 链推定优先级），入 Gate 2。

## ⑦ Location Identity —— 「去过某地」vs「地存在于世界」

两者**确实是两个不同 Truth 且载体已分**：「去过某地」=T2 经历（文本内、有证据门）；「地存在于世界」=authored bible（04b 孤儿/未来接线）。但**地点实体身份=字符串相等**（prose 中「档案馆」vs faction 文件名 vs 未来 location 文件名）——无 membership/别名/坐标，无统一 identity。
**判定**：CR1 族成员（字符串=实体），当前消费面极浅（仅 clock 展示）→ **低危，随实体身份 Gate 顺带定原则，不单独处理**。

## ⑧ Faction Identity —— 谁定义 Faction，五层是否严格分离？

**定义者=04_faction_bible 文件（authored）**。五层现状：plan 提及（Control）→ detectFactions **名字 substring** 注入 prompt（当上下文，不当 fact——信息边界文案防护）；World Bible faction=authored 叙述；**Actual faction membership 不存在**（StoryEvent 无 faction 字段，无成员提取）；character knows faction=knowledge 文本行（无类型）；believes faction=belief 命题（无类型）。分层=**按惯例（自由文本），非按契约**；伪造面=authored-only ⇒ 当前低危。
**判定**：CR1 族 + E（记录）；成员语义（Actual 层 faction 事实）从未被定义也从未被生产需要——**不建架构，防过度设计**。

---

## 语义缺口依赖图（STEP 3）

```
CR1 实体身份族（"字符串=实体"根因）
 ├── F-01 Character Identity [H·已证实] ←─ 生产腐蚀中
 │     ├─ ③ Attribution 主体继承 actors（伪名可归因）
 │     ├─ F-02 participant/物件合流
 │     └─ F-08 默认名 fallback
 ├── ⑤ Relationship endpoint 身份 + SR affect 槽缺 basis 门 [H-lite]
 ├── ⑦ Location 字符串身份 [同族·低危]
 ├── ⑧ Faction 文件名身份 [同族·低危]
 └── ①/② Event id 位置性 + T2 重提取双记 [B-lite·可并入裁决]

CR2 Control→Truth / State-Time 族
 ├── ⑥ Time canonical 权威 = Control plan 优先 [H 候选]
 ├── F-04 knownNames/present 越权当 Truth 锚
 └── F-05 State 家族 Authority 未分层（08 四写者/锚无 authored 保护/07-08-11 未分层）
       └── F-06 timeline delta 零守卫 [B·契约已足·独立可修·不依赖任何 Gate]

独立内容/管线（不阻塞、不建架构）
 ├── F-11 上层链 authored decisions 缺 [D]
 ├── F-09 Location 载体孤儿 [C/D]
 └── F-12 excerpt 漂移容忍 / F-10 / day:null 记录项 [E/F]
```

## 分类汇总（STEP 2，并入上一轮 14 项后的最终摊牌）

**H（Semantic Frontier，须 Design Gate+Seal）——恰好两族**：
- **Gate 1 实体身份族**：Character Identity（主体）并案 attribution 主体、participant 合流、endpoint 身份、affect basis 门、Event id 规则、location/faction 字符串身份、默认名、存量清洗
- **Gate 2 Time/State Authority 族**：Time canonical 序、State 家族分层（07/08/11+锚）、08 多写者、day 解析、锚保护

**B（契约已足，可直接 Named EO）——两项**：F-06 timeline delta 守卫（最高优先：Plan 已被写成历史）；①/② id 稳定+重提取双记（或并入 Gate 1）
**C/D/E/F/G**：Location 孤儿、authored decisions、faction/关系低危、漂移容忍、历史数据（伪实体块/11 旧条目/旧 actors 字段）——按上轮记录不变

## 执行序建议（STEP 4-8 投影；不冻结无关生产）

1. **即刻可授权**：F-06 最小 EO（S6.1/EO-P2 契约足够，零语义依赖）
2. **Gate 1**：Character/Entity Identity Boundary Design Gate → Seal → Named EO（下游：attribution/T2/CW/投影全链受益）
3. **Gate 2**：Time Authority + State 分层 Design Gate → Seal → Named EO
4. **并行不冻结**：内容供给（ch 计划补 authored decisions 激活上层链）、Location 接线评估（WL-05/06 时再议）
5. 每 EO 后：Regression/Production/Literary → **Root-Cause Rescan（含 AUTHORITY GAP 检查）** 闭环

## 最终计数（对「多少个 Character-Identity 级缺口」的精化答案）

八项定向考古的答案**没有产生八个独立缺口**，而是收敛为：**2 个 Gate 级语义族（CR1 实体身份、CR2 Time/State Authority）+ 2 个独立可修实现缺口（F-06、Event id）+ 若干内容/质量项**。系统真正「从未成为语义」的维度恰好两个：**「谁/什么」（实体身份）与「何时/何态」（时间与状态权威）**——与上轮「3 个」的差别是 F-04 确认并入 CR2、⑤ 确认并入 CR1 后的收敛结果。

**STOP——全部发现已摊开，依赖图已建，零修复。等待裁决：① F-06 最小 EO 授权；② Gate 1 召开；③ Gate 2 召开。**
