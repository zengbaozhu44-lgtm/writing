# #32 — L1 Production Evaluation: Read-only Archaeology + Design Gate

```text
MODE: READ-ONLY · NO CODE · NO RUNTIME CONSUMER · NO L2 · NO CHOICE
日期: 2026-09-20
输入冻结: Golden SPEC L1 · H4.1-A…D · HS-1…5(Access) · EO-L1-Subject-Eligibility-01
  · EO-L1-Access-Carrier-01 · 4.4.1d-R SEALED · #35 NOT PROVEN · L1≠L2
```

## ① 只读考古（A–G）

**A. AccessTruth 提供什么**：`{characterId, status: PASS|UNKNOWN|INVALID, type: E1|E2|E4,
scope(E2=仅被否路径), optionRefs(grounded occurrence), provenance(Gate 权威)}`——回答
「行动选项进入角色模型」证据级成立与否，**不含**任何选择/倾向/权重。

**B. Subject Eligibility 提供什么**：`{characterId, state: ELIGIBLE|INVALID|UNKNOWN,
reason, evidenceOccurrenceIds}`——Actual-grounded Subject Presence 判定（缺席封闭词表
→ INVALID；无证据 → UNKNOWN）。**Model A：eligibility ≡ Subject Presence，别无他物。**

**C. 语义重叠**：**零重叠、正交**——Access 关乎「选项世界」，Eligibility 关乎「主体
在场」。独立性有结构证据：AccessTruth 以 occurrence 的 **actor 身份**为证据绑定
（考量者本人），Eligibility 以 **actors/affectedEntities 在场**为证据——同一 occurrence
可同时供两者而语义不换（如「他停住，是A还是B」：actor=主体在场 → ELIGIBLE；取舍构式
→ Access PASS；两判互不蕴含）。observeL1 的 `access ∧ agency ∧ subjectPresent` 合取
（L79）恰证明三轴在 Golden 域本就独立。

**D. 已有 L1 判定 carrier**：无——observeL1 是 prose-only test/audit（禁 SR/Actual
输入），非生产合流判定；无生产 L1 evaluator 存在。

**E. 旧 Choice/Agency 逻辑可复用**：无（grep 零命中）；可复用的是**模式**：
observeL1 的三轴合取形状（作为语义参考，非代码）。

**F. 偷偷做 L1 的旁路**：**无**——AccessTruth 全仓唯一引用=orchestrator 挂载（写入侧），
零消费者；eligibility 同（scene.l1Eligibility 附加+sidecar，零消费者）。

**G. 生产链第一次需要 L1 的位置**：**当前不存在**——主环经作者因果线+认知塑造线运转；
L1 的消费者只能是未来 L2/Choice 层（均 NOT READY/NOT PROVEN）。⇒ 本 Gate 属
**语义前置设计**，非 blocker 触发。

## ② L1 Production Evaluation 输入（冻结）

```text
L1 Input = AccessTruth(characterId)
          + SubjectEligibility(characterId)
          + [Subject Presence 已内含于 Eligibility Model A]
```

**禁止入参**：Goal/Desire/Motivation/Expected Consequence/Personality/State preference/
Plan/mainGoal/causal_chain/Writer Context/Character World/LLM plausibility/
Choice Candidate/Candidate Option（全数维持禁线）。**L1 ≠ L2 硬墙**：L1 只答
「是否具备形成 Choice 的基本条件」，绝不答「为何选 A / 该选 A 还是 B」。

## ③ 三态判定语义（Design Gate 核心提案——待 Human Adjudication）

**合流规则（proposal P1，三轴短路序）**：

```text
L1 := f(Access, Eligibility)

Eligibility = INVALID (Subject Absence)      → L1 = INVALID（短路，无论 Access）
Access = INVALID (伪 Access，IB 违反)         → L1 = INVALID（证据被证伪）
Eligibility = ELIGIBLE ∧ Access = PASS        → L1 = VALID
其余（任一 UNKNOWN 且无 INVALID）              → L1 = UNKNOWN
```

**关键裁决点（本 Gate 提交人类的核心问题）**：

- **P1-a 缺证据≠不存在**：`Access UNKNOWN ∧ Eligibility ELIGIBLE → L1 UNKNOWN`
  （**非 INVALID**）——维持 HS-4 absence≠evidence-of-absence；生产含义：L1 默认输出
  UNKNOWN 占多数（诚实），只有证据到场才 VALID。
- **P1-b 双 UNKNOWN**：`UNKNOWN ∧ UNKNOWN → UNKNOWN`（不叠加为 INVALID）。
- **P1-c Access INVALID 语义**：仅=IB 伪 Access（选项对象不可合法获得）——判定为
  「该特定选项的伪」，L1 整体 INVALID 或仅该 optionRefs 作废？**提案：仅作废该
  evidence 记录，L1 回落 UNKNOWN**（INVALID 留给主体缺席与全证据伪证）——此为
  最细裁决点，需人类定夺（见 HA-3）。
- **Subject Absence → INVALID 的理由**：无主体则无 Choice Formation 主体资格
  （Golden 边界 3：unconscious/puppeted = INVALID）——结构上由 Eligibility 短路
  承担，与 coercion 无关。
- **External Coercion → VALID 的理由**：胁迫是**处境内容**非**主体资格**——
  Golden SPEC 边界 3 明文「Forced but conscious choice may be VALID」；Model A
  的缺席词表不含胁迫构式（结构性保证：coercion 永不触发 INVALID）。

## ④ H4.1-A 重检

**完全保持，零触碰**。合流式中**不存在** Agency 项——H4.1-A 已把「主体资格」并入
eligibility（Model A），故 L1 = Access + Eligibility 二轴合流，**无需任何新 Agency
carrier**。若未来有人要求第三轴 Agency runtime → 即违反 H4.1-A，STOP。
（本设计未创建 AgencyTruth/Score/State/Engine 任何一个。）

## ⑤ SPEC 判定矩阵（五行 × 提案 P1）

| 情况 | Access | Subject | L1（提案） |
|---|---|---|---|
| 选项入模证据+主体存在 | PASS | ELIGIBLE | **VALID** |
| 无 Access 证据 | UNKNOWN | ELIGIBLE | **UNKNOWN**（P1-a） |
| Access 伪证据（IB 违反） | INVALID | ELIGIBLE | **UNKNOWN + 该证据作废**（P1-c 提案）/ 或 INVALID（HA-3 待裁） |
| Subject Absence | 任意 | INVALID | **INVALID**（短路） |
| External Coercion | PASS | ELIGIBLE（缺席词表不含胁迫） | **VALID** |
| 纯行动无 prior option | UNKNOWN（E5 封死） | PRESENT | **UNKNOWN** |
| 只有「知道 X」 | UNKNOWN | PRESENT | **UNKNOWN** |
| Writer Context「可以选择」 | 禁源，零 evidence | PRESENT | **UNKNOWN** |
| Plan「角色决定…」 | 禁源 | PRESENT | **UNKNOWN** |

后四行的 UNKNOWN 正是防偷渡的证据：**不知道≠没资格，Plan/Writer 声明≠入模证据**。

## ⑥ L1/L2 硬墙

```text
L1: Access + Subject Eligibility → 「是否存在形成 Choice 的基本条件」（三态）
L2: 仅 L1=VALID 后进入 State/Goal/Constraints/Expected Consequence/Identity → dominance/selection
```
本轮零 L2 设计；「角色更想选哪个」类分支一律不存在。

## 八问回答

1. **输入**：AccessTruth + SubjectEligibility（二轴；Presence 内含于 Model A）。
2. **合流**：短路序合流（③P1）；两载体正交（①C 结构证明）。
3. **三态**：VALID=ELIGIBLE∧PASS；INVALID=Subject Absence（或全证据伪证——HA-3）；
   UNKNOWN=缺证据组合（绝不翻转为否定）。
4. **Subject Absence→INVALID**：无主体即无 Choice Formation 主体（Golden 边界 3；
   Eligibility 短路承担）。
5. **Coercion→VALID**：胁迫是处境非资格；缺席词表结构性不含胁迫。
6. **H4.1-A 完全保持**：合流式无 Agency 轴；零新 carrier。
7. **L1/L2 边界**：⑥ 硬墙；L2 未设计未授权。
8. **可否安全授权实现**：**语义上已可（本 Gate 已闭合）**，但有 **3 个人类裁决点**：

## Human Adjudication（最小裁决集）

- **HA-1**：合流规则 P1（四行短路序 + P1-a/b 缺证据语义）是否 Seal？
- **HA-2**：生产 L1 输出的**消费者边界**——本 Gate 提案「L1 三态 sidecar-only、
  零消费者（消费者=未来 L2 Gate 授权）」是否 Seal？
- **HA-3**：Access INVALID 的传染粒度——提案「仅作废该 evidence，L1 回落 UNKNOWN」
  vs 备选「整体 INVALID」？（最细点；提案偏 fail-open 于主体侧、fail-closed 于证据侧）

## RESCAN

**FIRST REAL BLOCKER = NONE**（①G：L1 无生产消费者；本 Gate 为前置语义设计）。
**SAFE-TO-IMPLEMENT NEXT NODE**：HA-1…3 Seal 后 = L1 Production Evaluation
evaluator（二轴合流 + sidecar，模式与 eligibility/access 完全同构，~1 文件+测试）。
在此之前 **NOT AUTHORIZED**。

```text
CODE CHANGED = NO · STOP · 等待 HA-1/2/3 裁决
```

---

# #32 HUMAN SEAL — 2026-09-20（正式入档）

```text
HA-1  APPROVED / SEALED —— P1 合流：Eligibility INVALID→L1 INVALID（短路）；
                          ELIGIBLE∧PASS→VALID；其余合法未知组合→UNKNOWN；
                          缺证据永不翻为否定；Coercion≠Absence→ELIGIBLE+PASS+Coercion=VALID
HA-2  APPROVED / SEALED WITH HARD BOUNDARY —— 三态 sidecar-only；零生产消费者；
                          L1=VALID 不自动产生 Choice/Option/Selection/Goal 消费；
                          「未来 L2 是消费者」非当前运行依赖
HA-3  APPROVED / SEALED —— Access INVALID 仅作废该 Evidence；L1 回落 UNKNOWN
                          （伪证据≠无 Access≠INVALID subject；单一失败 Evidence
                          不污染角色 L1 Truth；其他合法 Evidence 可继续参与）

#32 = SEALED
完整公式：
  Eligibility INVALID ──────────→ L1 INVALID
  Eligibility ELIGIBLE ∧ Access PASS → L1 VALID
  其他合法未知组合 ────────────→ L1 UNKNOWN
  （Access INVALID Evidence → rejected → 非 PASS → 回落 UNKNOWN）

Next Named EO: EO-L1-Production-Evaluation-01（窄域：evaluator+sidecar only）
L2 = NOT AUTHORIZED · Choice = NOT PROVEN
```

---

## EO-L1-Production-Evaluation-01 — Implementation Record（2026-09-20 · EXECUTED under Human GO）

- `packages/inkos-brain/src/l1/l1-evaluation.js`：`evaluateSceneL1`（P1 短路合流：
  Eligibility INVALID→L1 INVALID；ELIGIBLE∧Access PASS→VALID；其余合法未知→UNKNOWN）
  + **HA-3 语义**（Access INVALID evidence 仅作废该证据并留档 rejectedEvidenceCount，
  不传染——其他合法 PASS 照常参与）+ `runL1ProductionEvaluation`（读两类既有 sidecar →
  合流 → `l1_evaluation/l1_evaluation.json`，sidecar-only、幂等、无输入不落盘）。
- orchestrator 挂载（Access carrier 后，soft）；HA-2 硬边界：零消费者、
  VALID 不产生 Choice/Option/Selection/Goal（meta 声明 + 测试锁定）。
- 测试 **23/23**（P1 全组合/HA-3 不传染/Coercion→VALID/隔离/禁字段/端到端/幂等/
  零输入不落盘/零污染 Canon·SR·CW）。回归 **15/15** PASS。
- **生产验证（正式链）**：挂载零错误，sidecar 落盘 林逸 UNKNOWN
  （access_unknown——诚实缺证据非否定）；生产书三载体全链实证：
  Eligibility(ELIGIBLE)+Access(Gate PASS E4)→**L1 VALID(eligible_and_access_pass)**。
- 禁线全守：L2/Choice/CandidateOption/Agency/Goal/CW/SR/Access/Eligibility/Phase1.3 零触碰。

**STATUS: IMPLEMENTED / VALIDATED**
