# L1-Access-Production-Design-Gate — RESULT

```text
MODE: DESIGN GATE · READ-ONLY · NO CODE · NO CARRIER IMPLEMENTATION
日期: 2026-09-20 · 授权: Human APPROVED（仅 Design Gate）
输入冻结: Golden SPEC L1（E1/E2/E4/E3/E5 + L1-U03）· H4.1-A/B/C/D · 4.4.1d-R SEALED
```

## 1. Frozen Access Semantics

`L1 Access = 「行动选项进入角色模型」的证据级成立`（SPEC:42-52）——E1 显式多选项✓ /
E2 否定路径入模✓（L1-U03：仅证被否路径）/ E4 取舍叉✓ / E3 纯「没做X」✗ / E5 纯行动✗。
**输入约束，不重定义。**

## 2. Existing Evidence Carriers（考古）

| 载体 | 结构 | 可复用性裁决 |
|---|---|---|
| **TypedEvidence（4.4.1b, FG-1）** | `{source∈9枚举, role:'evidence', provenance, eventRef, sceneId, payload, forbiddenAsAuthority:true}` + Gate 独占写键 + Registry | **REUSE（骨架级）**——Evidence/Gate/Registry 分层、`forbiddenAsAuthority` 语义、`writer_context/plan/desire` 全禁源表与本 Gate 需求完全同构 |
| occurrenceRef / actualRef | Actual 稳定 id（Phase 1.3） | REUSE（引用层） |
| provenance 族 | source/engine/version/basis/accessKind（CW 系） | REUSE（模式级） |
| characterId 绑定 | CADE/SR/World 全系 | REUSE |
| observeL1.assessAccess | prose 启发式 | **REJECT as Truth**（降级为 adapter 候选源之一，见 §5） |

## 3. Candidate Carrier Designs（Q1 A/B/C/D）

| | A：Prose→TypedEvidence→Access Gate | B：Authored explicit | C：Runtime option-in-model state | D：混合 |
|---|---|---|---|---|
| 语义合法性 | ✅——prose 是「选项入模」表现的**唯一自然证据现场**（角色考量只能经叙述显形）；4.4.1d-R 的 `prose` 源已在 EVIDENCE_SOURCES | ✅——同 authored CADE/SR 先例（作者声明人物侧事实） | ⚠️——需先有「选项入模」的 runtime 产生者＝变相 Candidate Option 前置（#25b 风险） | A+B 各自权威分明 |
| Writer 洗白风险 | 中——须 Gate 封（§5/§6） | 无 | 低但语义错位 | 各源各防 |
| Pollution C（行动回溯） | 须 E5 防火墙（§11） | 须 authored 边界 | 高（state 从何而来？） | — |
| 结论 | **主通道候选** | **辅助通道候选**（同 authored 模式） | **REJECT**（阻塞于 #25b——option 状态对象即 CO 变体） | **推荐形态** |

## 4. Authority Analysis

Truth authority = **Access Gate（确定性，复用 4.4.1b Gate-write-key 模式）**。
prose/authored 均为 **evidence only**（`forbiddenAsAuthority:true` 原样继承）。
Authority 分层：Author（authored 源声明）→ Evidence → **Gate（唯一 Truth 判定）** → Access Truth。
Plan/Writer-context/Desire/LLM-plausibility 沿用 FORBIDDEN_EVIDENCE_SOURCES（零新增例外）。

## 5. Writer Non-Certification Analysis

**Writer ≠ Truth Authority 维持**。prose 只提供候选证据：
`Writer→Prose→TypedEvidence(source:'prose')→Access Gate→Truth`。
Gate 位置/执行/PASS 条件：见 §10-12。**防 Writer 自证**（「我考虑过A/B」伪造）：Gate 判据
不采信自由文本声明——只认 **SPEC 冻结的结构证据形**（E1 须≥2 显式路径措辞并存；E2 须
否定构式+被否路径内容明确；E4 须取舍构式+两支内容明确），且每条 evidence 必须锚定
grounded occurrence 的 excerpt（字面 grounding 沿 Phase 1.3 模式）——Writer 写什么词
不构成 certificate，结构+grounding 双验才入。authoritative 方向与 4.4.1d-R「Writer Context
Non-Certification」完全同构（该 Gate 已证明此架构可防 certificate-shaped laundering）。

## 6. Information Boundary Analysis

即使 prose 声称「他考虑到了 X」：X 须先属角色合法信息范围——Access Gate 前置
`characterCanAccessActualEvent` 族检查（选项对象在角色 IB 内）。`Writer knows X →
Character Access X` 禁止（复用 Reality≠Belief 管线，零新增语义）。

## 7. SR Boundary：`SR → Access Truth` 禁止（knowledge/interpretation/belief/stance
均 holdings 非 option-in-model——反例 R1/R2 判死）。`Access Truth → SR` 接口留白（无消费者；
未来若 L1 生产评估需要，Access Truth 作为其输入而非 SR 输入）。

## 8. Character World Boundary：`CW ≠ Choice Access` 维持——T2=经历、T3=稳定认识，
均非「选项入模」证据形；CW 全支线零冻结条款赋予 access authority。**不改 CW。**

## 9. Agency Boundary：H4.1-A 原样（Agency 非 Truth；主体资格=eligibility 内语义）。
本 Gate 零 Agency 卷入——Access 独立成义，`Access ≠ Agency ≠ L1 ≠ L2 ≠ Choice ≠ Action`。

## 10. E1/E2/E4/E3/E5 Final Mapping（Gate 判据规格）

| 级 | Gate 结构判据（确定性，无 LLM） | 输出 |
|---|---|---|
| E1 | 同一考量语境中 ≥2 条显式路径措辞（「是A还是B」构式/分号对举等 SPEC fixture 形），各锚 grounded excerpt | PASS(type:E1) |
| E2 | 否定构式（「决定不/没有走X」）+ 被否路径内容明确 + grounded | PASS(type:E2, scope:仅被否路径) |
| E4 | 取舍构式（「…还是/可她没/痛得…但」SPEC frozen 形）+ 两支内容明确 + grounded | PASS(type:E4) |
| E3 | 纯「没做X」（无入模构式） | 不产生 evidence |
| E5 | 纯行动叙述 | 不产生 evidence（**Pollution C 封死：行动≠此前入模**） |

## 11. Negative Evidence Firewall（硬边界）

「没做X」≠考虑过X：缺**入模构式**（consideration marker）——SPEC:48 明文；「做了X」
≠X曾是模型内选项：E5✗——Pollution C；R6「本可以…但没」＝counterfactual ≠ Access
（SPEC:33 Reader counterfactual 边界）。三防均为 Gate 的 not-PASS 即弃（fail-closed）。

## 12. PASS / UNKNOWN / INVALID Design

- **PASS(type, scope)**：E1/E2/E4 结构+grounding+IB 三验全过（E2 的 scope 受 L1-U03 约束）。
- **UNKNOWN**：无合格 evidence（**≠没有 Access**——默认态，禁止翻转为否定）。
- **INVALID**：本 Gate 域内仅一种——evidence 存在但 IB 检查失败（角色不可能合法获得
  选项对象）＝「伪 Access」判定。三态与 eligibility 粗三态同形。

## 13. Minimal Future Carrier（推导自 TypedEvidence/Registry 模式，不实现）

```text
AccessTruth { characterId, status: PASS|UNKNOWN|INVALID, type: E1|E2|E4,
  scope(仅E2), optionRefs[](grounded excerpt refs), provenance{source:'prose'|'authored',
  gateVersion, evidenceRefs}, formedAt(scene/chapter), forbiddenAsAuthority 无需——
  它是 Truth 但 Authority=Gate 非 Writer }
存储：sidecar-only（attribution-registry 同构）；消费者：未来 L1 生产评估（唯一）
```

## 14. Required Human Seals（精确问题集）

- **HS-1 载体形态**：D 混合（A prose-TypedEvidence 主通道 + B authored 辅通道，
  C 已 REJECT）是否批准？
- **HS-2 prose 证据资格**：prose 经「SPEC 结构判据+字面 grounding+IB 前置」三验后
  可作为生产 Access 证据（4.4.1d-R 同构）是否批准？
- **HS-3 Gate 判据冻结**：§10 结构判据表（E1/E2/E4 构式形）作为 Gate v1 冻结集？
- **HS-4 三态边界**：§12（含 INVALID 仅=IB 伪 Access）是否批准？
- **HS-5 authored 通道**：authored Access evidence 是否允许（同 authored CADE/SR
  先例；缺则 A 单通道）？

## 15. FIRST REAL BLOCKER = NONE（维持）——Access carrier 未实现仍无生产消费者；
本 Gate 产出使其成为 **SAFE-TO-IMPLEMENT 待 Seal**（§16）。

## 16. SAFE-TO-IMPLEMENT：**待 HS-1…5 Seal 后 YES**——语义唯一（SPEC 冻结输入）/
carrier 边界唯一（§13）/authority 唯一（Gate）/provenance 唯一（复用模式）/
Writer laundering 已封（§5 同构证明）/与 Actual-Access/SR/CW/Agency 四边界全部已证。

## 17. NEXT NAMED EO（建议，待 Seal 后授权）：`EO-L1-Access-Carrier-01`
（Access Gate + 双源 evidence adapters + sidecar Registry + 测试矩阵 R1-R8/Gate 判据/
隔离/幂等；Forbidden 全继承）。

## 18. CODE CHANGED = NO

## Verdict

```text
RESULT B — DESIGN COMPLETE WITH HUMAN ADJUDICATION REQUIRED
（语义/carrier/authority/provenance/四边界均已完成设计且唯一；
  HS-1…HS-5 为真正的人类语义选择点——主要在 prose 证据资格与 authored 通道）
反例映射核验：R1✗ R2✗ R3✗(E5) R4→E1/E4 候选 R5→E2受U03 R6✗(counterfactual)
  R7✗(writer_context 禁源) R8✗(characterId 隔离+IB)——全过。
STOP · 不实现 · 等待 Human Seal
```

---

# HUMAN SEAL — 2026-09-20（正式入档）

```text
HS-1  APPROVED            —— 载体 D 混合（A prose 主通道 + B authored 辅通道；C runtime-state REJECT）
HS-2  APPROVED WITH HARD LIMITATION —— prose 三验（SPEC 结构 + grounded occurrence + IB）
                                        后可为生产 Evidence；Writer→Access Truth 绝对禁止
HS-3  APPROVED            —— Gate v1 判据冻结（E1/E2[U03 scope]/E4 PASS；E3/E5 不产 evidence；
                              Action ≠ Prior Option Access 特别冻结）
HS-4  APPROVED            —— 三态：PASS/UNKNOWN[absence≠evidence-of-absence]/INVALID[仅=IB 伪 Access]
HS-5  APPROVED WITH HARD LIMITATION —— authored 只产 Evidence 须过同一 Gate；
                              无 certificate-shaped 直授字段；≠Agency/Choice/Action

GATE = SEALED
冻结不等式：Actual/IB Access ≠ L1 Choice Access ≠ Observer Access；
           Knowing ≠ Considering Options ≠ Choice；Action ≠ Prior Option Access
Authority 链：Evidence(prose|authored) → TypedEvidence → Access Gate → Access Truth
Agency 边界：H4.1-A 完全保持（零恢复/零载体/零分数）
CW 边界：T2/T3/SR ≠ Choice Access；CW 不改
实施边界：本 Seal ≠ 实施授权；实施须另行授权 EO-L1-Access-Carrier-01
Route：Access semantics=SEALED · carrier=NOT IMPLEMENTED · L1 eval=NOT IMPLEMENTED
      · L2=NOT READY · Choice=NOT PROVEN · FIRST REAL BLOCKER=NONE
STOP · 等待 EO-L1-Access-Carrier-01 实施授权（若下达）
```

---

## EO-L1-Access-Carrier-01 — Implementation Record（2026-09-20 · EXECUTED under Human GO）

- `packages/inkos-brain/src/l1/access-gate.js`：确定性 Access Gate（唯一 Truth Authority；
  Symbol 写键 Gate 独占）+ 三态 + E1/E2[U03]/E4/E3/E5/counterfactual 冻结构式判据
  + prose adapter（仅绑 occurrence **actor**——见证者不可及他人内心）+ authored adapter
  （HS-5：Evidence-only 同过 Gate）+ sidecar `l1_access/access_truth.json`
  （唯一消费者=未来 L1 生产评估；幂等去重）。
- 复用确认：TypedEvidence `validate/forbiddenAsAuthority/禁源表` 全复用（唯一增量：
  EVIDENCE_SOURCES 追加 `'authored'`——HS-5 授权的新合法 Evidence 源，非第二套架构）；
  `characterCanAccessActualEvent` 作 IB 原语；occurrenceRef 稳定 id 作 grounding。
- orchestrator 挂载（T2 后，soft）；Gate 无 LLM/embedding/score——纯构式+grounding+IB。
- 测试 **38/38**（R1-R8 + 24 附加：grounding 缺失→UNKNOWN、IB 伪 Access→INVALID、
  禁源六项、authored 非法形状/直授拒、E5/counterfactual 零回填、六类零污染、
  三连跑幂等、跨章持久）。回归 **14/14** PASS（含 CW 四 EO/eligibility/phase13）。
- **生产验证（正式 orchestrator 链）**：载体挂载零错误；本章物理动作型 prose 未把
  取舍句提取为 occurrence → 零 Truth 落盘（诚实 UNKNOWN）。真实生产数据上链路验证：
  真实取舍句「等，还是不等。等…不等…」分类器正确判 **E1**；authored Evidence 引用
  **真实 occurrence id** 过 Gate → sidecar `PASS(type=E4)` 带 grounding/provenance。
- **已知限制**：prose 通道依赖 Phase 1.3 提取器把取舍句捕获为 occurrence——当前
  提取器偏物理动作，纯考量句可能不成为 occurrence（evidence 捕获缺口，非语义缺口；
  authored 通道与未来提取增强可补）。文学验证：Access 表达「曾把路径纳入考量」，
  不涉 Choice/Goal/谁该选——符合 §29。
- 零 STOP 条件触发；无 CandidateOption/Agency/Choice/Action/L2；SR/CW 未动。

**GATE STATUS: IMPLEMENTED / VALIDATED（PASS WITH KNOWN LIMITATION：prose 捕获率）**
