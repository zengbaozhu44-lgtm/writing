# Phase 3 — Minimal SR Design Gate

**Status:** PASS WITH BINDING CONSTRAINTS  
**Date:** 2026-09-09  
**Depends on:** `_AI_SR_RUNTIME_AUDIT.md`  
**Implementation:** **FORBIDDEN until this Gate is accepted; this document is not code.**

---

## Gate Decision

| Question | Decision |
|----------|----------|
| 可否进入 Minimal Implementation？ | **YES** — 仅在遵守本 Gate 全部绑定约束时 |
| 可否新建平行 Character Truth？ | **NO** |
| 可否实现 Choice / Cognitive / Emotion / Personality Engine？ | **NO** → STOP + 回 Design Gate |
| Carrier | **扩展既有** `packages/inkos-core/src/lib/minimal-sr.js`（+ 必要的脑侧更新器） |
| Living `character_brains` | **非 SR Authority**；保持 residual；不得升级为 CharacterSR |
| Phase 0 One Production Path 修复 | **本 Phase 不做** |

---

## 1. SR 到底是什么？

**精确定义（结合代码修订）：**

> **CharacterSR** 是以角色为作用域、对 Reality / Actual 信息的 **主观投影状态**：该角色当前 **可及（knowledge/awareness）、如何解释（interpretation）、相信什么（belief）、站在何处（stance）、以及对该信息的显著性（relevance）**。  
> 它是 **投影与可追踪状态**，不是 Reality Authority，不是 obtains，不是 Choice，不是 Memory Engine。

对齐既有常量：

- `MINIMAL_SR_ROLE = 'read_only_projection_view'`（消费侧仍可只读注入 Prompt）
- `IS_REALITY_AUTHORITY = false`
- `PRODUCES_OBTAINS = false`

Phase 3 新增的是：**经 Information Boundary 的 Actual→SR 更新路径**（带 provenance），不是把 Minimal SR 改成心理学数据库。

---

## 2. 最小字段（按审计裁剪）

| Field | Audit | Phase 3 决策 | 落盘？ |
|-------|-------|--------------|--------|
| **knowledge**（= Awareness） | PARTIAL（matrix 投影） | **KEEP + 可被 Actual 经 IB 更新** | YES（最小 SR state sidecar 或章级 attach；见 §5） |
| **interpretation** | ABSENT | **ADD 最小** `{ of, as, eventId? }` | YES |
| **belief** | PARTIAL / 分裂 | **ADD 最小命题信念**（可与 Canon 不符）；勿与 Desire `belief` 合并 | YES |
| **stance** | PARTIAL schema | **KEEP** 既有 enum；可从 authored + 显式更新填充 | YES |
| **relevance** | 角色显著性 ABSENT | **ADD 最小** `{ eventId\|info, level: high\|low\|omit }` — **禁止**复杂算法 | YES（可随 event 附带） |
| motive / affect_relationship / validity | 已有 Minimal SR | **KEEP 投影**；本 Phase **不**用 Actual 自动填 Motive/Affect | 沿用 omit 规则 |
| Desire belief / Situation belief / Director heroKnows | 平行 | **DEMOTE** — 非 CharacterSR Authority | 不并入 |

**不默认全部字段每场必有值：** 缺证据 → `omit`（fail-closed），禁止 LLM 补全。

---

## 3. 每个字段的 Source

```
knowledge / awareness
  ← 06_knowledge_matrix（基线）
  ← Actual Event 经 Information Boundary（角色可及的 evidence）
  ← authoredCharacterSR / characterFacing（显式 authored）
  ← ✗ Plan closingWorldState / heroKnows filler / Writer 指令

interpretation
  ← 角色可及 Actual/Scene evidence 上的显式解释事件
  ← authored interpretation（若有）
  ← ✗ Plan「角色将发现警察」
  ← ✗ 从 Canon 自动「纠正」为真解释

belief
  ← 显式 belief 更新（authored 或 SR updater 规则）
  ← 可错误；Canon≠Belief 时 **不修正**
  ← ✗ Desire Engine belief 自动导入（避免第二套真相）

stance
  ← 既有 projectStance 来源 + 显式更新
  ← ✗ Living suspicion 数值自动映射为 stance（本 Phase）

relevance
  ← 最小规则：事件 actors 含该角色 / 显式 impact 标签 → high；否则 low/omit
  ← ✗ context-ranking 分数直接当角色 salience（那是 Writer 预算，不是 SR）
```

---

## 4. Authority 关系

```
Canon Reality / Actual Event     = 世界已发生事实 Authority
Information Boundary (F1/F4)     = 角色可及性闸门（消费既有；不重建）
CharacterSR                      = 角色主观投影 Authority（仅描述主观；不写 Canon）
Plan / Expected / heroKnows      = 非 SR 事实源
Prompt / Writer                  = Consumer only
Memory (hierarchy/brains/…)      = 非 SR Authority（residual / 异构）
State Evolution timeline         = Canon 侧；SR 只读 Actual，不经 timeline 反推「警察来了」
```

**硬规则：**

> SR 只能描述角色主观现实，**不能**成为 Canon Authority。  
> SR update **不得**修改：`11_timeline.yaml`、`13_facts_db.yaml`、world Canon、Actual Event 记录。

---

## 5. Lifecycle

最小必要（不过度设计）：

| State | 含义 |
|-------|------|
| **CREATED** | 角色首次出现可追踪 SR 快照 |
| **UPDATED** | knowledge/interpretation/belief/stance/relevance 变更（带 provenance） |
| **SUPERSEDED** | 同键被更新替换（保留 last provenance；不强制全历史引擎） |
| **REMOVED** | **本 Phase 不做**删除语义（缺证据 = omit，非 tombstone） |

**持久化裁决：**

- Phase 1「无 writeback」对 **纯投影** 仍然成立。  
- Phase 3 允许 **最小 SR state 附件**（建议：`novel/_system/brain/character_sr/` 或章级 `ch_*_character_sr.json`），**仅**存 SR 字段 + provenance。  
- **禁止**写入 `character_brains` 冒充 SR。  
- **禁止**经 Evolution 写 timeline/facts 来「同步」SR 解释。

若实现时发现必须引入大型 Memory Engine 才能生命周期 — **STOP**，回本 Gate。

---

## 6. Consumer（Phase 3 只接必要）

| Consumer | Phase 3？ |
|----------|-----------|
| Writer Prompt（`formatCharacterSRForPrompt`） | **YES** — 已有；更新后仍注入 |
| F3 Provenance viewer | **YES** — 可标注新字段 |
| Information Boundary 测试 / Consistency | **YES** — 守卫 |
| Choice Formation | **NO** → DEFERRED TO PHASE 4 |
| Reader Model | **NO** |
| Auto Replan / Regenerate | **NO** |
| Living chapter-task brains 块 | **不升级为 SR**；可不删残差，但非 Authority |

---

## Negative Boundary（SR 不是）

```
SR ≠ Canon
SR ≠ Plan
SR ≠ Goal / Desire / Future intention（不强制）
SR ≠ Choice
SR ≠ Action
SR ≠ Emotion / Personality / Psychology Engine
SR ≠ Memory Engine（「经历过什么」的统一仓）
SR ≠ Writer intention
SR ≠ Pressure（未经过角色视角的世界压力）
SR ≠ context-ranking relevance
SR ≠ character_brains metrics
```

尤其：

```
SR ≠ Choice
```

发现 `SR → Choice` 才能「证明有用」→ 输出 `DEFERRED TO PHASE 4`，不得实现。

---

## 推荐 Runtime 结构（实现时）

```
Actual / Reality
      ↓
Information Boundary（复用 F1/F4；不新建 Boundary Engine）
      ↓
Character Perception（最小：可及 evidence 集合）
      ↓
CharacterSR（扩展 Minimal SR）
      ├── knowledge (awareness)
      ├── interpretation
      ├── belief
      ├── stance
      └── relevance
```

**Carrier 选择：**  
最自然 = `minimal-sr.js` 投影 + 新 `character-sr-updater.js`（或同目录）消费 Actual+IB。  
目录可用 `packages/inkos-brain/src/character/` **仅当**与 brain 事件管道更贴；**不得**机械新建后与 Minimal SR 双写。

---

## Provenance（强制）

每次 SR mutation 必须可回答：

```yaml
provenance:
  characterId: ...
  field: knowledge|interpretation|belief|stance|relevance
  source: actual_event|authored|matrix_baseline
  eventId: ...          # 若来自 Actual
  storyClock: ...       # F1 可用则填
  engine: character-sr
  version: character-sr-1
```

---

## 必测清单（实现阶段；本 Gate 只定范围）

1. SR creation / update / provenance  
2. Information Boundary（A 不知杀手 / B 看见）  
3. Interpretation ≠ Canon（黑影→警察 vs 小偷）  
4. Belief 可错；系统不纠正  
5. Irrationality 不纠正  
6. Relevance 同事件不同角色  
7. Character isolation（A≠B）  
8. Canon isolation（改 SR 不改 11/13/Actual）  
9. Plan contamination（Plan 说警察；Actual 仅影子 → SR 无警察）  
10. Writer contamination（Prompt「应相信 X」不改 SR）  
11. `npm run test:character-sr`  
12. Literary replay：Ch2 S3 **只**验 SR 主观保留，不修 Choice disappearance；误解案例验 Reality≠Interpretation  

---

## Success Criteria 映射（A–L）

| ID | Criterion | Gate 如何保证 |
|----|-----------|---------------|
| A | 明确 CharacterSR Runtime | 扩展 Minimal SR + 可选 sidecar |
| B | 可追溯 | provenance 强制 |
| C | 遵守 IB | 复用 F1/F4；禁止绕过 |
| D | 角色间不同 SR | isolation 测试 |
| E | Interpretation ≠ Canon | 字段分离 + 测试 |
| F | Belief 可错 | 禁止 Canon 纠偏 |
| G | Irrationality 不纠正 | 同上 |
| H | SR 不写 Canon | Canon isolation 测试 |
| I | SR 不读 Plan 当事实 | Plan contamination 测试 |
| J | Writer 不改 SR | Writer contamination 测试 |
| K | 无第二套 Character Truth | Carrier = Minimal SR；brains 非 Authority |
| L | 无 Cognitive Engine | Negative Boundary + STOP 规则 |

---

## 明确不能宣称完成

即使实现 PASS：

```
MINIMAL SR RUNTIME = PASS
```

**不得**宣称：

```
Character Causality = COMPLETE
Choice System = COMPLETE
Character Simulation = COMPLETE
Story Survival = COMPLETE
Actual → State = COMPLETE   # Phase 2 仅 timeline；人物腿仍待本 Phase 补投影
```

---

## Deferred

| Item | To |
|------|-----|
| SR → Access + Agency → L1/L2 Choice | Phase 4 |
| Open Loop 强制 | Phase 6 |
| Director Actual Migration | Phase 7 |
| Living/CLI 旁路 BLOCK | 独立迁移；非本 Phase |
| One Production Path | Phase 0 residual；非本 Phase |
| 复杂 salience / Memory Engine | STOP if required |

---

## Final Gate Verdict

```
Architecture Audit     = DONE（_AI_SR_RUNTIME_AUDIT.md）
Design Gate            = PASS WITH BINDING CONSTRAINTS（本文件）
Minimal Implementation = NOT STARTED
```

**Can Enter Step 3.2 Minimal Implementation？**

**YES** — 仅当实现严格遵守：

1. 扩展 Minimal SR，不新建平行真相  
2. Actual → SR 必须经 IB  
3. SR 永不写 Canon / 永不读 Plan 当事实  
4. 无 Choice / Cognitive / Emotion / Personality Engine  
5. 先测后扩；失败即 STOP  

**Can Enter Phase 4？**

**NO** — 须完成实现 + 回归 + Literary Replay + Completion Report。

---

## Freeze Statement

> Phase 3 的意义不是再加一个角色知识模块，而是补上：  
> **Reality 可被系统识别之后，角色看到的 Reality 与 Reality 本身必须分离，且可追溯、不污染 Canon。**  
> 若实现需要 Cognitive / Memory / Choice Engine — **立即 STOP**。
