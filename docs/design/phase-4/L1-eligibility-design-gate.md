# Phase 4.1 — L1 Eligibility Design Gate

```text
MODE: DESIGN GATE · READ-ONLY ARCHAEOLOGY · NO CODE · NO SCHEMA · NO RUNTIME · NO EO
日期: 2026-09-18
Frozen Inputs: H4.1-A/B/C/D · DG-042 · 4.4.1d-R · D1 · SubjectAbsence→INVALID
  · Coercion-may-be-VALID · Irrational-Choice-may-be-VALID · L1≠L2 · #35 · Phase 5–7 FROZEN
```

## 1. Frozen Evidence（考古所得）

- **观察者层（Golden L1 / observeL1，SEALED）**：Question A only；输入=prose ONLY（显式
  禁 SR/Plan/Actual/oracle）；`SubjectAbsent` 为封闭叙事标记集（昏迷/睡着/梦游/
  不知道自己正在做什么/像被线提着/失去意识/电击+抽动/替身操控）→ **INVALID**；
  `SubjectPresent` = 无缺席标记（**负定义，无正向标记集**）；VALID = access∧agency∧present
  （conjunct 结构）。test-only；audit 挂载为诊断（non-authoritative，在案）。
- **生产层**：presence 的唯一 Truth 级载体 = **Actual occurrence `actors`/`affectedEntities`**
  （Phase 1.3 后 100% 白名单+逐字 actorEvidence）；characterId 绑定遍布 CADE/Intent/
  CA/SR（身份层闭合）。SR=awareness(Actual+IB)+authored 三槽；**生产 SR 当前 POV 绑定**
  （非名单角色无 sidecar——实现覆盖缺口，非语义）。`characterCanAccessActualEvent`
  =Fact/IB Access（≠Option Access，且 CO 已不存在）。
- **关键约束（推导）**：生产 eligibility 若以**叙述 prose 直接判定**缺席/在场，即
  **Writer prose → Truth**——违反 Writer≠Truth。故生产缺席证据必须经
  `prose → 提取+闸门 → Actual`（缺席态作为被提取的 grounded occurrence，
  同 TERMINAL_NEGATION_MARKERS 高精度词表先例）。
- observer-only 语义误作生产 Truth？**当前无此错误**（l1-audit 已标 non-authoritative）。

## 2. Negative Boundary（§3 验证）

Plan/mainGoal/Goal/Desire/Writer/Prose(直接)/future-Actual/Choice/Action/Attribution/
CO/causal_chain.options 作为 eligibility 直接 Truth source：**全部排除**（DG-042/#25b/
H4.1-B/4.4.1d-R/Writer≠Truth，在案禁令无一需要新增）。四条不得自动 INVALID：
Coercion（封存明文）✓ / Capability（H4.1-A：≠Agency）✓ / Opportunity（同）✓ /
Irrationality（封存明文）✓——四个均与 subject-hood 无关，维持。

## 3. Minimality Comparison（§5，四模型）

| | A：Presence only | B：+SR availability | C：+Access | D：独立 predicate |
|---|---|---|---|---|
| 冻结支持 | SubjectAbsence→INVALID 已封；presence 为 L1 既有合取项 | 路线上 SR 先于 L1 | Access 本就是 L1 **独立**合取项 | seal A 用语「L1-**internal**」 |
| 冻结冲突 | 无 | 观察者封「NO SR input」（观察者域）；生产域无条款强制 SR | **与 L1 合取结构冲突**（Access 被双计，改 L1 结构） | 触碰 seal A 留白的「Agency runtime object」禁线 |
| ontology 风险 | 最小（复用 Actual actors+缺席词表） | **把实现覆盖缺口混入 Truth**（POV 绑定→非 POV 角色系统性不合格——正是 §6 要求区分的 implementation absence） | 层级错置 | 以新名复活 Agency Truth 之险 |
| 引入 inference | 无 | 无（但引入基础设施状态） | 无 | 视定义 |
| 与 Access/Attribution 重叠 | 无 | 无 | **直接重叠** | 与 Attribution 相似风险 |
| Coercion/Irrational VALID | ✓/✓ | ✓/✓ | ✓/✓ | 视定义 |
| SubjectAbsence INVALID | ✓（构造性） | ✓ | ✓ | 视定义 |

## 4. Three-State（§6）

三态可否唯一推出：**粗三态可以**——`INVALID`=缺席成立；`ELIGIBLE`=在场成立；
`UNKNOWN`=两者皆无证据（与观察者三态同形）。要求的四分（semantic UNKNOWN /
insufficient evidence / implementation absence / subject absence）中，
「implementation absence（如无 SR 记录/未评估）」与「insufficient evidence（评估了但
证据两无）」的区分**无冻结依据**，且当前无任何消费者需要该细分 → 若未来需要，
**HUMAN ADJUDICATION REQUIRED**；本轮不自行定义（采粗三态即可满足 Gate 问题）。

## 5. Boundary-Case Audit（§7，十例，仅 eligibility）

| # | 案例 | A | B | C/D |
|---|---|---|---|---|
| 1 | SR+无明确 Goal | ELIGIBLE（Goal 属 #35 域） | 同 | 同 |
| 2 | SR+胁迫 | ELIGIBLE（封存） | 同 | 同 |
| 3 | SR+低能力 | ELIGIBLE（能力≠主体资格，H4.1-A） | 同 | 同 |
| 4 | SR+信息有限 | ELIGIBLE（Access 另计） | 同 | C 下双计错乱 |
| 5 | 在场+SR 不可得 | **ELIGIBLE**（在场=Actual 事实；SR 缺失=实现缺口） | **不合格（伪阴性）** | — |
| 6 | 角色缺席 | INVALID（封存） | 同 | 同 |
| 7 | 信念矛盾 | ELIGIBLE（SR 内容问题） | 同 | 同 |
| 8 | 非理性选择 | ELIGIBLE（封存） | 同 | 同 |
| 9 | 无明确意图 | ELIGIBLE（意图≠主体资格） | 同 | 同 |
| 10 | 无 authored 选项空间 | ELIGIBLE（CO 不存在；#25b） | 同 | 同 |

十例在 A 下全部干净；B 在案例 5 产生**语义化实现缺口的伪阴性**；C 在 4 双计。

## 6. Contradiction Audit

A 与全部 Frozen Inputs 零冲突；唯一推导性约束（缺席证据须经 Actual 而非裸 prose）本身
是 Writer≠Truth 的必然推论，非新增语义。B/C/D 各有一处冲突/风险如上。

## 7. Critical Minimality（§8）

> 「Agency eligibility」是否仍需独立 runtime concept？

**结果 = B（可由既有语义表达）——在 Model A + Actual-grounded 证据源下**：
eligibility ≡ Subject Presence（缺席词表⊥ / Actual 在场 / 否则 UNKNOWN），
全部构件已封存（缺席集、Actual actors、高精度词表先例），seal A 所言
「L1-internal eligibility semantics」恰为此形状——**无独立 predicate、无新 ontology、
无 SR 依赖、无 Access 双计**。

## 8. Production Readiness（§9）

- semantic closure：**条件闭合**（待人类确认下述三点后闭合）
- production closure：**NO**（无实现——正确，无 EO）
- runtime / authority：L1 生产挂载 #32 NOT AUTHORIZED 维持；audit 诊断挂载照旧
- Named EO：**NONE**

## FINAL OUTPUT

**HUMAN ADJUDICATION REQUIRED（压缩为三点确认，均非开放设计）：**

1. **Eligibility 模型 = A（Subject Presence only）？**（B 语义化实现缺口 / C 双计 /
   D 触 Agency-runtime 禁线——分析均在本档）
2. **生产证据源 = Actual-grounded only？**（缺席态经 提取+闸门→Actual 的高精度词表
   判定；裸 prose 直接判定 = Writer→Truth，被禁）
3. **三态 = 粗三态（ELIGIBLE/INVALID/UNKNOWN）？**（四分细分无消费者，留白）

确认后本 Gate 转 **DESIGN CLOSED**，产生最小 Named EO 候选：
`EO: L1 subject eligibility (Model A, Actual-grounded, coarse three-state) —
L1-internal predicate only`；Forbidden 清单自动继承 H4.1 全部禁线。

```text
NO CODE · NO EO · STOP
```
