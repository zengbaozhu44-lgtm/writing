# EXTRACT-HARDEN — Archaeology Report + Design Gate

**Status**: READ-ONLY ARCHAEOLOGY + DESIGN GATE（未实现，未授权）
**Date**: 2026-09-21
**Evidence**: `extraction_failures/ch10_s4.json`（完整尸检）+ ch6_s4/ch3_s2（日志级）+ 只读反事实调用

---

## 1. Archaeology Report

### 1.1 R1 — 中文 grounding false negative（确定性代码缺陷）

| 问题 | 答案 |
|------|------|
| candidate generation | `event-extractor-llm.js defaultProposer`（deepseek，temp 0.1，≤6 条）|
| grounding 发生处 | 两层：`gateCandidate`（LLM 侧：actorEvidence 逐字包含 + consequence echo/aftermath）→ `validateStoryEvent.actionGroundedInText`（共用 validator） |
| tokenization | `actionGroundedInText`：按标点/空白切 token（`[\s，。！？、：:·\-—\/（）()]+`）——**中文无标点串 = 单 token**，`text.includes(整串)` 必败 |
| excerpt normalization | `collapseWs`（仅空白归一）；excerpt 逐字门（`evidence_not_in_text`）独立且**未失守**——失败样本中零例 |
| 改写破坏包含 | LLM 习惯输出 `action:"林逸摸到录音带"`（文本原文是「**他**左手摸到录音带」）→ 前缀不同 → excerpt-prefix containment 双向都断；而 candidate 自带 `actorEvidence:"他左手摸到录音带"` 已过逐字门，**未被用于 grounding** |
| validator authority | Phase 1 StoryEvent validator：只读 scene.text、禁伪造 source、false 权限位。其 Truth 门槛=「action 须有文本依据」——R1 是该门槛**实现层的假阴性**，非门槛本身 |
| Studio/Runtime 共用 | 是（`StudioRuntimeOrchestrator extends RuntimeOrchestrator`，`_runScenesAndChapter` 同一代码路径） |
| 其他调用方 | `state-evolution-engine.js:133`、`character-sr-updater.js:192`（用确定性 `ensureActualEvents`，不经 LLM 层） |
| 修复可否局限 Realization | **可以**：只动 `actionGroundedInText` 的匹配实现（CJK 感知 + actor 前缀剥离 + actorEvidence 作包含锚点），不动任何门槛语义 |

**反事实验证（只读）**：`cand2.action` 剥角色名前缀后 `摸到录音带` ∈ 文本 = true。R1 确认为纯实现层假阴性。

### 1.2 R3 — fallback suppression（确定性代码缺陷）

精确控制流（`event-extractor.js`）：

```
candidates = 正则候选（choice/speech/action）
if (!candidates.length) → presence 兜底      ← 抑制条件 = 有候选，非有有效候选
passed = candidates.filter(validateStoryEvent)
return passed（可为 0）
```

**抑制因子 = candidate count，不是 VALID candidate count。** ch10_s4：1 个 speech 候选（自身被拒）抑制了 presence；外层 double-fallback（extractor-llm:194）已按「零**有效**事件」正确触发，缺陷仅在内层。

**反事实验证（只读）**：ch10_s4 文本构造 presence 事件过完整 validator → **通过（errors=[]）**。即 R3 单独修复即可救活该章。

### 1.3 R2 — consequence 硬性要求（SEMANTIC FRONTIER）

考古结论：

1. **要求位置**：`event-validator.js:32` `if (!normalized.consequence) errors.push('missing_consequence')` ——**无条件套用所有 kind**
2. **来源**：Phase 1 StoryEvent validator（反伪造设计：防止无文本依据的「世界变化」声明）；文件头注释写「action / consequence not empty **for hard events**」——**注释与代码不一致**，暗示原意是仅硬事件，实现时未分 kind
3. **冻结状态**：未在 git 历史（未提交）；docs/design 无其独立 Seal 记录 → **非显式 Human-Sealed 冻结契约，但属既定 Truth 门槛，按冻结对待**
4. **契约内自相矛盾（关键证据）**：
   - WL-02 提取 SYSTEM_PROMPT 明文授权：`consequence: "…没有则填空字符串"`
   - LLM 侧 `gateCandidate` 容忍空 consequence（仅非空时查 echo/aftermath）
   - 共用 `validateStoryEvent` 无条件拒绝空
   - 即：**producer 被设计为可空，validator 被设计为必填**——WL-02 的 10/10 是靠运气穿过的不匹配
5. **experiential 候选实际字段**：kind/action/actors/excerpt/actorEvidence/stateChanges(`experience:*`)/affectedEntities——consequence 为空
6. **已有合法先例**：确定性 presence 路径的公式化 consequence「场面叙述成为后续可引用事实」（Phase 1 既有合法模式——描述证据地位，非编造情节）
7. **消费面影响**：`appendT2Experiences` 对 consequence 仅作去重语料拼接（character-world.js:503），**无语义消费**；WCT/CADE/L1 不读 T2 的 consequence
8. **非法桥接风险**：若放宽为「体验自动产生 consequence」= 违禁（Experience→Consequence 桥）；若仅免除必填、不生成内容 = 无桥接

**裁决：SEMANTIC FRONTIER — HUMAN SEAL REQUIRED**（详见 §2.C 三选项）。

### 1.4 Truth / Realization 分层权限（§五 对照）

| 层 | 权限 | 现状 |
|----|------|------|
| Prose | 唯一事实源 | ✓ 只读 |
| Evidence（excerpt/actorEvidence） | 逐字包含门 | ✓ 未失守（失败样本零例 evidence_not_in_text） |
| Grounding | action 须有文本依据 | 实现层假阴性（R1），门槛本身未破 |
| Candidate | 提案，无权限 | ✓ |
| Validation | Truth 门 | consequence 必填语义待裁（R2） |
| T2 | Actual-grounded + Access-gated + character-isolated + provenance + append-only + idempotent | ✓ 全保持（本轮零改动） |

无 Writer→Actual、无 Prose→automatic Actual、无 Experience→Belief/Goal/Choice、无 failed-validation→invented fact（presence 公式化 consequence 为 Phase 1 既有先例，非本轮新增）。

## 2. Design Gate

### A. R1 — **SAFE TO IMPLEMENT UNDER EXISTING CONTRACT**

最小边界（仅 `event-validator.js::actionGroundedInText`）：
1. CJK 感知 token 化：无标点中文串按 2-gram 滑窗或字符重叠率匹配（阈值如 ≥60% 字符命中）
2. actor 前缀剥离：action 以已知 actor 名开头时先剥再包含匹配
3. `actorEvidence` 作包含锚点：action-core ⊆ actorEvidence（已过逐字门）即视为 grounded
- 不动：excerpt 逐字门、consequence 门、source 禁令、权限位

### B. R3 — **SAFE TO IMPLEMENT UNDER EXISTING CONTRACT**

最小边界（`event-extractor.js` 一处条件）：`if (!candidates.length)` → `if (!candidates.length || passed.length === 0)`（presence 兜底仍在完整 validator 之下，零新事实类别）。外层 double-fallback 已正确，不动。

### C. R2 — **HUMAN SEAL REQUIRED**（三选项，不由本轮决定）

| 选项 | 内容 | 性质 |
|------|------|------|
| R2-i | proposer prompt 层：空 consequence 时填公式化描述（presence 先例：「该经历成为角色的既成事实」）——validator 零改动 | prompt/Realization 层，最接近既有先例 |
| R2-ii | validator 按 kind 分流：soft kinds（social/relational/informational/environmental/daily）免除 missing_consequence，action/excerpt 门不变 | 语义层新增 kind 分类规则——**须 Seal** |
| R2-iii | 不动 R2，依赖 R3 presence 兜底保章（体验型 T2 丢失=质量降级，管道存活） | 零语义改动 |

### D. Truth Carrier Gap — **NO NEW TRUTH CARRIER**

现有 schema 字段（kind/action/actors/excerpt/actorEvidence/consequence/stateChanges/provenance）足以表达全部合法语义。

### E. 需要的 EO

- **EO-EXTRACT-HARDEN-01**（scope = R1 + R3 + 回归；R2 按 Seal 结果可选附加快照，默认不含）
- **R2 Semantic Design Gate**（单独，Human Seal：i/ii/iii 三选一）

## 3. Failure Taxonomy（§六）

| 样本 | 法医级 | R1 | R2 | R3 | 备注 |
|------|--------|----|----|----|------|
| ch10_s4（WL-04 run1） | ✅ 落盘 | 4/6 候选 | 6/6 候选 | 1 坏候选抑制 presence（反事实：presence 可过） | 唯一完整尸检 |
| ch6_s4（WL-03 run1） | ❌ 仅日志截断 | ? | ? | candidateCount=1 全拒（签名一致） | 仪表前，**insufficient evidence**（R1/R2 分布不可恢复） |
| ch3_s2（WL-03 run2） | ❌ 仅日志截断 | ? | ? | candidateCount=2 全拒（签名一致） | 同上 |
| （第四类）402 余额 | 基础设施 | — | — | — | writer LLM 层，与提取无关；提取 LLM 同账户，未来 402 将走 llm_error→确定性降级（优雅） |

- **同源性**：同根不同层——上游触发=R2（WL-02 让 producer 正确产出体验型候选，validator 仍是 Phase 1 硬事件设计）；R1 复合放大；R3 把「提取质量损失」变成「整章死亡」。三个失败场景同型：**章末内心高潮、POV 独处、对白稀疏**
- 确定性代码缺陷：R1、R3；LLM 随机性：候选具体内容；语义未定义：R2

## 4. 实际调用链（§七）

```
Production Scene（Runtime=Studio 共用，orchestrator.js:549）
→ ensureActualEventsWithExtraction            [shared·生产]
  → defaultProposer（deepseek）               [shared·生产·LLM]
  → gateCandidate（actorEvidence 逐字/consequence echo） [shared·生产]
  → validateStoryEvent（excerpt 逐字/grounding/consequence 必填/权限位） [shared·生产·Truth 门]
  → 双兜底 ensureActualEvents（确定性正则→validator；presence 仅零候选时） [shared·生产·R3 缺陷处]
→ scene.actualEvents
  ├─ applyCharacterSRAfterActual（sr-updater:192 再跑 ensureActualEvents，幂等） [shared·生产]
  ├─ appendT2Experiences → character_world/world.json        [shared·生产·T2 持久化]
  ├─ L1 eligibility / access evidence / attribution / WCT / CADE [shared·生产]
  └─ chapter-pipeline → memory-unit → state-evolution-engine（Actual→timeline/08 合法演化） [shared·生产]
—— 确定性 ensureActualEvents 另两调用方：state-evolution-engine:133、sr-updater:192（不经 LLM 层）
—— test-only：scripts/test-* 直调（**单元通过≠生产执行**——rosterNames2 教训适用：本次已核 orchestrator:549 真实执行，提取路径无 wiring 缺口）
—— soft-swallowed：全部 try/catch console.warn（l1/t2/access 块）；提取本身失败会硬抛 ACTUAL_EVENT_REQUIRED（非吞）
—— dead/legacy：validator/extractor 无死调用方
```

**对 WL-04 State 考古的修正记录**：Runtime 存在合法 State 演化通道（`state-evolution-engine`，Actual→timeline/08，生产经 chapter-pipeline 执行）；WL-04 所记「无 runtime mutation」应收窄为「**07_state_board 无 runtime mutation**（演化引擎写 08/11，不写 07）」。

## 5. Regression Impact（若授权 R1/R3）

受影响面：`test:phase13-extraction`、`test:eo-p4-*`（bridge/consumption/seam/cade×2/correspondence，构造事件的断言可能因 grounding 放宽/presence 触发而翻转）、`test:eo-l1-*`、`test:eo-cw-trace-01`。R3 触发条件变化可能使「敌意文本零事件」类断言变为「presence 存在」。实现时全量跑 17 项 + golden。

## 6. FIRST REAL BLOCKER 最终确认

**确认：Realization 层 Experience Extraction Robustness = 当前 FIRST REAL BLOCKER。**
依据：4 次真实 batch 3 次命中（75%），每次杀死 1 章并级联后续章；R3 反事实证明 presence 本可通过；R1 为已证假阴性；均为确定性代码缺陷，修复不触 Truth 语义。Truth 层无阻塞。

## 7. 下一 Named EO 建议

**EO-EXTRACT-HARDEN-01**（R1+R3，scope 见 §2.A/§2.B）+ **R2 Semantic Design Gate**（Human Seal 三选一：i prompt 层公式化 / ii kind 分流 / iii 不动）。
另：DeepSeek 账户余额需充值（402），否则一切真实生产 batch 阻塞。

**本轮到此 STOP——未改任何代码/schema/语义，等待授权。**
