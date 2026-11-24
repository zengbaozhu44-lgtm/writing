# EO-L1-Subject-Eligibility-01 — Definition（H4.1→L1 Human Seal 定稿）

```text
STATUS: DEFINED · NOT YET AUTHORIZED FOR EXECUTION
上游: H4.1-adjudication-record · L1-eligibility-design-gate · Human Seal A/B/C（2026-09-18）
```

## Human Seal（逐字入档）

**A — SEALED**：`L1 Eligibility Model = Model A；eligibility ≡ Subject Presence`。
不建 Independent Agency Truth / Agency runtime object；Eligibility 不吸收 Access、SR、
Capability、Opportunity、Coercion、Goal、Option；`Subject Absence → INVALID`；
`Subject Presence → ELIGIBLE`；两者均无充分证据 → `UNKNOWN`。

**B — SEALED（含 Scope Clarification）**：`Production Eligibility Evidence =
Actual-grounded only`——L1 Eligibility 只能消费**已经合法进入 Actual 的 grounded
evidence**；裸 Prose 不具有 Eligibility Truth Authority。链
`Prose→Extraction→Actual→Eligibility` 的**语义方向被确认**，但本 EO 只负责最后一段
`Actual→Eligibility`；Prose→Evidence→Actual 若缺能力（如缺席识别），属**独立能力缺口**，
须单独考古 + 单独 Design Gate + 单独 Named EO，**不得借本 EO 偷渡实现**。

**C — SEALED**：`ELIGIBLE | INVALID | UNKNOWN` 粗三态；不定义
semantic-UNKNOWN / insufficient-evidence / implementation-absence 的进一步区分。

## EO Scope

```text
允许：Actual-grounded Subject Presence → L1-internal eligibility → ELIGIBLE/INVALID/UNKNOWN
```

## Forbidden / Non-Scope（写入 EO 本体）

Agency Truth · Agency runtime object · Candidate Option Truth · Option Access ·
Goal/Desire · SR availability · Capability/Opportunity · Coercion test · Choice ·
Action · Attribution · L2 · Consequence · Survival · Director，以及：

```text
❌ prose → Actual 缺席识别系统（本 EO 不得新增、实现、扩展或顺带修复该能力）
```

## Implementation Archaeology 结论（2026-09-18，只读）

1. **在场证据源（ELIGIBLE）**：就绪——Actual occurrence `actors/affectedEntities`
   （Phase 1.3 后 100% 白名单 + 逐字 actorEvidence），Truth 级、可审计。
   ⚠️ 现有 l1-audit 的 `presence_event` 混用了 `scene.pov/present`（plan 侧 roster）——
   **诊断用途可留，但 EO 的 eligibility 谓词必须只用 Actual 字段**（Seal B 硬约束）。
2. **缺席证据源（INVALID）**：**当前 Actual 提取能力不存在缺席态识别**（事件 kinds 无
   absence 类；全 events 包无昏迷/失去意识词表）——且按 Seal B 本 EO 不得补建。
   ⇒ 生产上 INVALID 结构性不可达，该类情形落 **UNKNOWN**（fail-closed，诚实，预期行为；
   缺席识别属独立能力缺口，留待单独 EO）。
3. **挂载点**：可复用 l1-audit 的 sidecar 基础设施模式（旁路、零 Truth 消费者）或其
   sibling；orchestrator 已有 soft 挂载先例。
4. **#32 阻塞点定位**：#32 = 「observeL1 test-only；**production mount NOT AUTHORIZED**」
   ——为**授权约束**而非语义约束。本 EO 的全部语义已由 Human Seal A/B/C 冻结，
   实现可完全由冻结语义推出（Safe Derivable 部分），
   **唯一缺失 = #32 所指的生产挂载执行授权**（Category C：Missing Authority/EO）。

## 分流结论（TOTAL STORY ROUTE 新原则）

```text
语义：Safe Derivable ✓（Model A + Actual 在场源 + 粗三态，全构件已封存）
实现：BLOCKED —— 唯一阻塞 = Named EO 执行授权（#32 范畴）
⇒ STOP at Category C：等待 Human 对 EO-L1-Subject-Eligibility-01 的执行 GO
```

---

## Implementation Record（2026-09-18 · EXECUTED under Human GO）

- `packages/inkos-brain/src/l1/l1-eligibility.js`：`evaluateSubjectEligibility`
  （Actual-only：actors/affectedEntities → ELIGIBLE；结构化字段载封存缺席词表 → INVALID；
  两无 → UNKNOWN）+ `evaluateSceneSubjectEligibility` + `saveL1Eligibility`
  （sidecar `l1_eligibility/ch_NNNN.json`，零 Truth 消费者）。
- orchestrator soft 挂载（SR/L1-audit 之后）；`scene.l1Eligibility` 附加字段。
- Frozen #10 执行：`l1-audit.js` presence_event 移除 scene.pov/present 混用（仅此修正）。
- 挂载层修正一枚：枚举名单初版并入 occurrence actors（回退路径伪 actor 被枚举为
  ELIGIBLE）→ 改回 knownNames-only（枚举≠证据）。谓词本身无改动。
- 测试 18/18（F1-F3 + G 反洗白：pov/present/goal/options/SR/desire 注入全部无效 +
  冻结边界 provenance + sidecar）；l1-audit 22/22；全量回归 PASS
  （story-route/prompt/reality-golden/character-sr/correspondence-v2/phase13/
  authored-cade-production）。
- 生产复跑（正式 orchestrator 链 + 真实 LLM）：sidecar 干净——林逸 s1/s3/s4 ELIGIBLE
  （Actual-grounded），s2 UNKNOWN（该场提取方差，诚实 fail-closed）；无伪 actor 条目。
- Literary relevance：无（sidecar 谓词，零叙事消费者——by design；其消费者=未来 L1
  生产评估，仍 #32 域外）。
- Invalid 结构性罕见如预期（无 Actual 缺席提取；不补建——Seal B）。
- 状态：**IMPLEMENTED / VALIDATED**；无新 FIRST REAL BLOCKER（路线重扫描：
  其余未完成节点——L1 生产评估[Access 生产语义未冻结+无需求]、L2、#35、内化自动化、
  Survival——均维持 B/C 类预留，零生产触发）。
