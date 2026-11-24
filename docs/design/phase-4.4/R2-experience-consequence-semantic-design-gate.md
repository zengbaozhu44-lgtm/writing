# R2 — Experience Extraction / Empty Consequence Semantic Design Gate

**模式**: READ-ONLY ARCHAEOLOGY → DESIGN GATE → STOP（本轮零代码/schema/prompt/validator 改动）
**Date**: 2026-10-08
**Evidence base**: 源码逐处 + ch10_s4 法医样本 + EXTRACT-HARDEN-01 生产 batch（10/10，0 提取失败）

---

## 1. Executive Summary

核心问题：**一个合法的 Actual-grounded Character Experience，是否必须同时拥有 World Consequence，才能成为合法 Experience？**

考古结论（三句话）：

1. **consequence 必填不是被文档化的冻结契约**——它是一条 Phase 1 实现细节：头注释写「for hard events」但代码无条件套用；无任何测试锚定、无任何设计文档/Named EO/Human Seal 定义过它（§4）。
2. ** shipped code 里已经存在两套并存的 consequence 语义**：确定性路径 4/5 kind 用公式化「证据地位描述」（如『对白成为场面已发生事实』），WL-02 LLM 路径用「世界变化原文逐字摘录，没有则留空」——validator 恰好是两者各自契约的违反者：拒掉后者合法的空、放过前者无 grounding 的公式（§3/§4）。
3. **没有任何消费者在语义上依赖 consequence**：T2 不存储它；WCT 只把它当「待独立复验的声明」（公式串必死于 aftermath grounding）；State Evolution 的 timeline 通道被 EO-P2 冻结为恒空；其余消费全是辅助匹配/展示（§5）。

**Design Gate**：R2-i = HUMAN ADJUDICATION REQUIRED（机械安全、语义混浊）；R2-ii = HUMAN ADJUDICATION REQUIRED（NEW SEMANTIC CONTRACT REQUIRED，边界清晰）；R2-iii = CURRENTLY VALID / QUALITY LOSS（章存活已由 R3 保证）。**R2 = Semantic Frontier / Quality Loss，NOT Story Truth Execution Blocker**（生产证据：R1+R3 后 10/10 章零提取失败）。

---

## 2. Current Frozen Contract（主干，不改）

```
CANON REALITY → ACTUAL → Information Boundary → Perception → Interpretation
→ SR → Access + Agency → L1 → L2 → Choice → Action → Consequence → ACTUAL
→ State Evolution → SR / Survival → Next Scene → Writer
```

R2 只研究入口处 `Prose → Extraction → ACTUAL / Experience evidence` 的 consequence 语义。本轮不开 L2/Choice/Goal/Desire/T4/Personality/Emotion Engine/新 Truth Carrier。

关于三层区分的现行事实：ACTUAL EVENT（文本锚定的事实条目）≠ CHARACTER EXPERIENCE（Actual 之上、角色侧的经历记录，T2）≠ WORLD CONSEQUENCE（世界层变化，WCT 管辖，authored 锚定 + 独立复验）。Experience ≠ Belief/Goal/Choice/Action 的隔离现状见 §10。

---

## 3. Producer Archaeology

| # | 发现 | 证据 | 标注 |
|---|------|------|------|
| P1 | WL-02 提取 SYSTEM_PROMPT **明文授权空**：`"consequence": "该事件之后正文明确呈现的世界变化原文短语（≤50字，逐字摘自正文）；没有则填空字符串"` | event-extractor-llm.js:38 | **Evidence** |
| P2 | LLM 侧 `gateCandidate` 容忍空；**非空才**查 echo/aftermath grounding（复用 WCT 桥谓词，严格） | event-extractor-llm.js:151-154 | **Evidence** |
| P3 | 确定性路径 4/5 kind 的 consequence 全是**公式化证据/叙事地位描述，非世界变化**：open_choice『选择压力仍悬置；下一场必须回答或明确延期』、choice_settled『开放选择已结算为已发生行动』、speech『对白成为场面已发生事实』、presence『场面叙述成为后续可引用事实』 | event-extractor.js:57/77/102/158 | **Evidence** |
| P4 | presence 公式串来源 = Phase 1（WL 系列之前）；**无任何文档/Seal 记载其合法性理由** | docs grep 零命中 | **Evidence（缺失即证据）** |
| P5 | kind 语义已有明确枚举定义（social/relational/informational/environmental/daily/action/speech/discovery/movement + Phase 1 的 choice/presence），WL-02 prompt 对每类有优先级描述 | event-extractor-llm.js SYSTEM_PROMPT | **Evidence** |
| P6 | experiential 候选允许空 consequence **曾被 producer 正式允许**（P1+P2 即 WL-02 EO 的实现） | WL-02 EO 记录 + P1/P2 | **Evidence** |
| P7 | 「两套语义并存」意味着 consequence 字段在 shipped 代码中已是**双态**：世界变化引文（LLM 路径）vs 证据地位公式（确定性路径） | P3 vs P1 综合 | **Inference** |

---

## 4. Validator Archaeology

| # | 发现 | 证据 | 标注 |
|---|------|------|------|
| V1 | `if (!normalized.consequence) errors.push('missing_consequence')` ——**无条件，所有 kind** | event-validator.js:32 | **Evidence** |
| V2 | 头注释：`action / consequence not empty **for hard events**` ——暗示原意是按事件类别，实现未做 | event-validator.js:6 | **Evidence** |
| V3 | **零测试**锚定 missing_consequence（scripts 全 grep 无命中） | grep | **Evidence** |
| V4 | **零设计文档 / Named EO / Human Seal** 定义过该必填（docs 仅命中本轮与 EXTRACT-HARDEN 文档） | grep docs/ | **Evidence** |
| V5 | validator 中不存在任何 hard/soft 判别逻辑；kind 参数未参与验证分支 | 源码 | **Evidence** |
| V6 | 结论：missing_consequence 是「**尚未完成语义分层的统一 gate**」——头注释意图（按类）与实现（一律）脱节，且从未被契约化 | V1–V5 综合 | **Inference**（不写成 frozen contract；按冻结对待待裁） |

对 §3.B 四选一的回答：**最接近「尚未完成语义分层的统一 gate」**。无证据支持其余三项的历史意图，不推测。

---

## 5. Consumer Archaeology

| Consumer | 消费 consequence? | 用途 | 性质 | 标注 |
|----------|------------------|------|------|------|
| **T2 append**（appendT2Experiences） | **否——不存储**。T2 条目字段：experienceId/characterId/actualRef/chapterRef/sceneRef/access/kind/**summary(=action 行)**/provenance | 无 | 语义零依赖 | **Evidence**（character-world.js:366） |
| **CW→SR 投影**（projectWorldToSRScene） | 是 | consequence 并入 activation 重叠语料（世界项激活的匹配信号） | 辅助匹配启发式，非 Truth 推导 | **Evidence**（character-world.js:503） |
| **WCT**（world-consequence-truth） | 是 | `occurrence.consequence` 作为 Candidate-1 世界变化**声明**，但必须独立通过 non-echo + aftermath 逐字复验；公式串必死于复验 | **自证式消费**——字段值不产生 W，只触发一次会失败的验证 | **Evidence**（wct:104-105 + isGroundedInAftermath） |
| **Character Action Truth**（对应关系 v2） | 是 | terminalSpanOf = [consequence, ...stateChanges] 作链尾接地证据跨度 | 匹配信号；空值只是跨度变小（质量影响，非污染） | **Evidence**（character-action-truth.js:120） |
| **L1 eligibility** | 是 | actualSpan 语料（主体在场信号） | 辅助信号 | **Evidence**（l1-eligibility.js:44-48） |
| **Prompt 接缝回读**（actual-events-prompt） | 是 | 渲染 `text-noted aftermath: …` 给 Writer N+1，带 consume-only 边界注记（≠Choice/Plan；不得新增改写 W） | 展示（有边界标注） | **Evidence**（actual-events-prompt.js:121-135） |
| **State Evolution / 11_timeline** | **否——无活跃通道**：`resolveTimelineEvents` 无条件返回 `[]`（EO-P2 冻结：plan/modelled 禁入，actual 通道未开） | — | **Experience → consequence → State Evolution 的真实 consumer 不存在** | **Evidence**（state-updater.js:58-64） |
| SR updater（applyCharacterSRAfterActual） | 否 | — | — | **Evidence**（grep 零命中） |
| Reality Registry / reality-golden | 否 | 基准不含 consequence 维度 | — | **Evidence**（grep 零命中） |

**§3.C 核心问题回答**：T2 对 consequence **零语义依赖**（不存储、不消费）；所有消费要么辅助匹配（投影激活/eligibility/对应链尾）、要么展示（prompt 回读）、要么自证复验（WCT）。**唯一语义级消费（WCT）恰恰是防伪造的**：公式化或编造的 consequence 无法通过 aftermath 逐字复验，不可能洗成 World Consequence。

---

## 6. Semantic Matrix

（E=Existing Contract〔有文档/EO/Seal 背书〕；Ev=Evidence〔shipped 代码/生产观测〕；I=Inference）

| kind | Actual-grounded（excerpt+grounding 门） | Experience 合法性（T2 kind） | consequence 语义必要? | 当前 validator | T2 使用 | 产生 World Consequence? |
|------|------|------|------|------|------|------|
| action | 是（E） | 是（E） | 争议区：两套语义并存（P3/P7） | 必填（公式可满足） | 不存 consequence | 仅当 WCT 独立复验通过（E） |
| speech | 是（E） | 是（E） | **否**——『对白成为场面已发生事实』即证据地位（Ev:P3） | 公式满足 | 同上 | 否（Ev） |
| informational | 是（E） | 是（WL-02 EO，E） | **否**——信息体验的变化即「知道了」，无独立世界事件（Ev:P1 授权空） | **必填→体验型被拒**（Ev:ch10_s4 六候选全灭） | 同上 | 否（除非正文有 aftermath，WCT 复验） |
| environmental | 是 | 是（WL-02，E） | 否（同上） | 同上 | 同上 | 否 |
| social | 是 | 是（WL-02，E） | 否 | 同上 | 同上 | 否 |
| daily | 是 | 是（WL-02，E） | 否 | 同上 | 同上 | 否 |
| presence | 是 | 是（Phase 1 既有，E） | **否**——公式化串为既有先例（Ev:P4） | 公式满足 | 同上 | 否 |

矩阵要点：**没有一个 experience kind 的 consequence 语义必要性能从现有契约推出「必填」**；能推出「可空」的有 WL-02 的 P1 授权（LLM 路径全部 experiential kinds）与 Phase 1 公式先例（speech/presence/choice）。「validator 必填」本身无契约出处（V3/V4）。

---

## 7. R2-i Analysis（producer/prompt 补公式化 consequence）

| 问题 | 回答 |
|------|------|
| 制造伪 World Consequence? | **机械上不会**：WCT 把它当 Candidate-1 声明并独立复验，公式串必死于 aftermath grounding，W 不会产生（Ev:§5-WCT 机制） |
| 把「记录 Experience」伪装成「世界发生后果」? | **语义上会**：字段从「世界变化引文」双态化为「世界变化引文 ∨ 证据地位公式」，且无类型标记区分——这是本方案的真实代价（I，基于 P7 加深） |
| 污染 Actual? | 不污染事实性（excerpt/grounding 门不动），污染的是字段的**可读性/可审计性**（I） |
| 污染 State Evolution? | 无通道（Ev:§5，timeline 恒空） |
| 污染未来 Character World? | T2 不存 consequence（Ev）→ 无直接污染；但 prompt 回读/激活语料加入公式噪声（I，辅助层） |
| Truth laundering? | 无（WCT 复验拦截） |
| 只为满足 validator 填无语义内容? | **部分是**——对 speech/presence 与 Phase 1 先例一致；对 informational/social/daily/environmental 是**扩展**先例到新 kind（I，无契约背书） |

**Gate：R2-i = HUMAN ADJUDICATION REQUIRED**——机械安全（有 WCT 复验兜底），但确立「字段双态无标记」为新常态需要裁决，且女王已明示「presence 先例 ≠ 所有 Experience 可套用」。

## 8. R2-ii Analysis（validator 按语义类型分流）

| 问题 | 回答 |
|------|------|
| 1. 已存在合法 hard/soft distinction? | **否**——validator 无任何 kind 分支（Ev:V5）；但 kind 语义本体已在 WL-02 EO 冻结（E:P5），缺的只是 validator 未内化 |
| 2. 需要 新 ontology? | 不需要新 kind；需要**新的判别规则**（哪些 kind 免除必填）→ **NEW SEMANTIC CONTRACT REQUIRED** |
| 3. 改变 Truth Validation contract? | 是——这正是必须 Seal 的原因：从「一律必填」改为「按类必填」 |
| 4. 扩大 prose→Actual 入口? | **否**——excerpt 逐字门、grounding 门（含 R1 修复）、actorEvidence 门、source 禁令全部不动；被放宽的只有一个字段的非空性 |
| 5. 影响 reality-golden? | 否（基准无 consequence 维度，Ev:§5） |
| 6. 影响 State Evolution? | 否（无活跃通道，Ev:§5） |
| 7. 影响 downstream? | prompt 回读少显示无意义行（更干净）；对应关系 v2 链尾跨度变小（质量影响，I）；其余无 |
| 8. 需要新 Named EO? | 是（若裁决通过）——含 kind 分界表 + 回归清单 |
| 9. 必须 Human Seal? | **是**（新语义契约） |

**Gate：R2-ii = HUMAN ADJUDICATION REQUIRED（NEW SEMANTIC CONTRACT REQUIRED）**——语义基础最扎实（WL-02 kind 本体已冻结、validator 脱节已证），但按类免除必填是新的验证契约。

## 9. R2-iii Analysis（保持现状 + R3 兜底）

| 维度 | 举证 |
|------|------|
| 契约合规 | **CURRENTLY VALID**——validator 未动，一切现行 EO/Seal 不受影响（E） |
| 丢失哪类 Experience | 纯内心节拍（无外部 aftermath 可引）的 experiential 候选：整场 T2 退化为单条 presence |
| 生产实证 | EXTRACT-HARDEN batch（10/10）：presence 仅 2/40 场景、T2 101 条多类共存——**退化罕见但集中在章末情感高潮场**（ch10_s4 法医：6 体验候选→0，现为 1 presence）。WL-02 deepseek batch 的 informational 34% 证明有 aftermath 时体验型大量通过——损失面=纯内心场（Ev） |
| T2 退化 | 内心高潮场丢失 social/informational/daily 纹理 → **恰是角色最关键时刻的 CW/T3 材料变薄**（I） |
| SR 影响 | 经投影激活语料间接变薄（轻微，I） |
| QUALITY LOSS vs BLOCKER | **QUALITY LOSS**——章完成率已由 R3 保证（10/10 生产证据）；无任何 Truth 路径被阻断 |

**Gate：R2-iii = CURRENTLY VALID / QUALITY LOSS**。

---

## 10. Truth Boundary Audit

| Risk | 判定 | 路径说明 |
|------|------|---------|
| 1. Experience → 自动 World Consequence | **无路径** | WCT 独立复验（non-echo + aftermath 逐字）；公式/编造串必死。R2-i 的公式同样过不了（Ev:§5-WCT） |
| 2. prose→Candidate→Actual 门被放宽 | **无**（条件性安全） | R2-i 不触门；R2-ii 只动一个字段非空性，excerpt/grounding/source 门不变。实现纪律：EO 中明文禁止触碰其余门 |
| 3. Experience → State Evolution | **无活跃通道** | resolveTimelineEvents 恒空（EO-P2 冻结，Ev）。未来若开 actual→timeline，须独立 Gate |
| 4. Experience → Belief | **无单步桥** | T2 只存 action 行；CW 投影映射的是 world 项非 T2；T3 成型需 ≥2 独立实际（通道 A）或 authored seal（通道 B）——单次经历永不直接成 Belief（E:CW 冻结契约） |
| 5. Experience → Goal/Desire | **无消费者**（grep 零命中） | 无 Goal Engine；L2-B 已负边界封闭 |
| 6. Experience → Choice | **无消费者** | Choice = NOT PROVEN（L2-B 裁决维持） |
| 7. 公式化 consequence 被未来 consumer 当真 | **真实风险（standing risk）** | 唯一需要立法的边界：任何未来 consequence 消费者**必须像 WCT 一样再 grounding，禁止信任字段存在性/非空性**。现行唯一展示位（prompt 回读）已带边界注记。此条应写入 Seal 附件 |
| 8. 分流后未发生事件进入 Actual | **无** | 事件的文本接地由 excerpt 逐字 + action grounding（R1 修复后仍严格核心匹配）保证，与 consequence 无关 |

---

## 11. Production Quality Impact（量化）

- **EXTRACT-HARDEN-01 batch**（R1+R3 后，zhipu glm-4-flash，10/10 章 40 场景）：提取失败 0；presence 2/40（兜底未滥用）；T2 101 条：action 55 / speech 21 / informational 9 / environmental 6 / social 4 / daily 4 / presence 2——体验多样性整体保持，**退化集中在纯内心场的 2 个场景**。
- **ch10_s4 法医**（deepseek 时代样本）：6 体验候选全部 missing_consequence（4 兼 R1）→ 整场 T2=0，章死。R3 后章活、T2=1 条 presence。**该场丢失的 6 条里 5 条属体验型**——R2-iii 的单位代价样本。
- 文学层结论以 deepseek 恢复后的干净 batch 为准（本节 glm-4-flash 数据仅证明管道与组成，不宣称文学质量）。

## 12. FIRST REAL BLOCKER Assessment

- **R2 = Semantic Frontier / Quality Loss，NOT Story Truth Execution Blocker**。生产证据：R1+R3 后 10/10 章零提取失败；R2 残留影响是特定场景类的 T2 质量，无 Truth 路径阻断。
- **代码层：无 FIRST REAL BLOCKER**（维持 EXTRACT-HARDEN-01 RESCAN 结论）。
- 非代码阻塞不变：① deepseek 余额（文学质量验证前置）；② R2 Seal 本身；③ （新增记录）§10-Risk7 的立法约束应随 Seal 一并冻结。

## 13. WL-05 Dependency Assessment

**R2 不阻止 WL-05**。分层正交：WL-05（Character World Grounding）作用于 CW 内容层；R2 作用于提取入口字段语义。唯一耦合是质量向的：R2-iii 下内心场 T2 变薄会略削弱 WL-05 的 grounding 材料（I）——影响优先级权重，不构成阻塞。WL-05 的授权与设计本轮不涉及。

## 14. Human Seal Questions（最小问题集）

1. **Q1（语义正题）**：一个 Actual-grounded Character Experience，是否必须同时拥有 World Consequence 才合法？（考古答案倾向「否」：无消费者语义依赖；两套既有语义均已容纳空/公式——但这是 Evidence-based inference，须 Seal 定契）
2. **Q2（方案选择）**：若 Q1=否——R2-i（producer 补公式，字段双态无标记）／R2-ii（validator 按类分流，NEW SEMANTIC CONTRACT，附 kind 分界表）／R2-iii（维持现状，接受内心场 T2 质量损失）。
3. **Q3（随 Seal 立法，无论选哪个）**：冻结「任何未来 consequence 消费者必须再 grounding（WCT 模式），禁止以字段存在性/非空性当世界变化证据」。
4. **Q4（仅 R2-ii 需要）**：kind 分界表——哪几类免除必填（候选：social/relational/informational/environmental/daily/speech/presence 免除；action/discovery/movement/choice* 维持必填或同样免除，由您划线）。

## 15. Design Gate Conclusion

| 方案 | 裁决 |
|------|------|
| R2-i | **HUMAN ADJUDICATION REQUIRED**（机械安全〔WCT 复验兜底〕；代价=consequence 字段双态化无类型标记） |
| R2-ii | **HUMAN ADJUDICATION REQUIRED — NEW SEMANTIC CONTRACT REQUIRED**（语义基础最完整：WL-02 kind 本体已冻结、validator 脱节已证；需 kind 分界表 Seal） |
| R2-iii | **CURRENTLY VALID / QUALITY LOSS**（章存活由 R3 保证；内心高潮场 T2 退化为 presence，生产已观测） |

Frozen Contract 部分：主干不变、WCT 复验机制、T2 冻结契约（append-only/idempotent/Actual-grounded/Access-gated/character-isolated/provenance）、L2-B 负边界。
Evidence-based inference 部分：missing_consequence 的「历史意图」不可考（只证脱节，不猜意图）；「所有 experience kind 无语义必要」由消费面考古推出。
FIRST REAL BLOCKER：代码层无；R2 非执行阻塞。
WL-05：不被 R2 阻止。

**STOP——等待 Human Seal。**
