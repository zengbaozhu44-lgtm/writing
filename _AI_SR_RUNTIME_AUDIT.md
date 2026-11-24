# Phase 3 Step 3.1 — Subjective Reality Runtime Audit

**Status:** COMPLETE（只读）  
**Date:** 2026-09-09  
**Mode:** READ-ONLY · 禁止改代码  
**Upstream freeze:** Phase 0–2（PASS / PASS WITH KNOWN LIMITATIONS）

**本轮目标：** 回答「角色主观现实今天在代码里是什么」，而不是实现 Cognitive Engine。

---

## Executive Verdict

```
Character “knows X”     = 非统一 Runtime 状态
生产主路径投影          = assembleMinimalSR（read-only view）
主知识源                = 06_knowledge_matrix.yaml（常为空）
Actual → CharacterSR    = ABSENT（writesSR=false；writesCharacterBrain=false）
Interpretation 类型     = ABSENT
Belief 统一表示         = PARTIAL / DUPLICATED
Stance schema           = EXISTS（authored；生产常 omit）
Character-event relevance = ABSENT（仅有 Writer context ranking）
Parallel Character Truth = YES（须 Design Gate 处理，禁止直接新增第二套）
```

**一句话：**  
系统已有 **Minimal SR 只读投影 + F4 知识过滤 + Living brains 旁路**，但 **没有**「Actual → 角色主观现实」的可追踪 Runtime 层。Phase 3 必须 **扩展既有 Minimal SR Carrier**，不得另起一套 Character Truth。

---

## Q1 — 当前 Character 已经知道什么？

| Layer | 能表达什么 | 路径 |
|-------|------------|------|
| Knowledge Matrix | 每条 info × 角色：`know` / `partial` / `unknown` | `novel/06_knowledge_matrix.yaml` · `loader.js` → `knowledge` |
| Minimal SR Awareness | 将 matrix know/partial（+ authored）投影为 `awareness.items[]` | `packages/inkos-core/src/lib/minimal-sr.js` |
| Character bible (03) | 身份/目标/性格 — **不作当前知识**；Motive seed only | `extractMotiveSeedsFromBible` |
| Character Brain (Living) | trust/fear/suspicion 等数值 — **非命题知识** | `character_brains/*.yaml` · `evolveCharacterBrains` |
| Director Information Gap | `heroKnows` / `readerKnows` 软字符串 | `scene-execution.js` |
| Desire `belief` | 欲望引擎 authored 字符串 | `character-desire-engine.js` |
| Evolution `characterHints` | Actual 演员/动作标签 — **未进 SR** | `state-evolution-engine.js` |

生产书常见：`matrix: []` → Awareness 几乎总是 `omit`。

---

## Q2 — 如何表示 Character knows X？

| 表示 | 形状 | 符号 |
|------|------|------|
| Matrix cell | `row[characterName] ∈ {know,known,partial}` + `row.info` | `06_knowledge_matrix.yaml` |
| SR Awareness item | `{ info, level, provenance }` · `status: present` | `projectAwareness` |
| Authored SR | `characterSubjective` / `characterSR` / `authoredCharacterSR` / `characterFacing` | `readAuthoredCharacterBlock` |
| Writer prompt | `- **Awareness**： - [know] …` | `formatCharacterSRForPrompt` |
| F4 TopK | POV level ≠ unknown 才进 Prompt | `filterKnowledgeForPrompt` |
| Info gap | `heroKnows: string[]`（Plan 软） | Director |

---

## Q3 — 如何表示 Character does NOT know X？

| 机制 | 行为 |
|------|------|
| Matrix `unknown` | 不进 Awareness（`normalizeKnowLevel` → null） |
| Cell 缺失 | 同 unknown → omit |
| SR slot omit | `{ status: 'omit', kind: 'awareness' }` |
| F4 | POV unknown → 该 `row.info` **不进** Writer TopK |
| Consistency | POV unknown 但正文出现 info → fail |
| IB 规则 | Awareness omit → 禁止「已经知道/亲眼看见」类措辞 |

**无**独立「否定知识集合」；unknown 与 absent 在显示上塌缩为 omit。

---

## Q4 — Character interprets X as Y？

**ABSENT**（无 typed SR 字段）。

近邻（皆 ≠ CharacterSR interpretation）：

- Stance `about`（立场话题，非事件解释）
- Situation `before.belief` / `after.belief`（authored 转变句）
- Beat `newFacts` 启发式（EO-P4 降权）
- StoryEvent `intent`（动作意图；`writesSR: false`）

---

## Q5 — Character believes Y？

**PARTIAL / DUPLICATED**

| Surface | 形式 | Authority |
|---------|------|-----------|
| Minimal SR Stance | enum 含 `believes` | Authored only；非 matrix/Actual 派生 |
| Desire Engine | `belief: string` | Authored DNA |
| Situation | `before/after.belief` | Authored/inferred demoted |
| Matrix | know/partial/unknown | 认识论约束，≠「错误信念」 |

生产路径 Stance 常为 `omit`。

---

## Q6 — Character has stance toward Y？

**PARTIAL** — schema 存在，来源薄。

- `stance.items[]`：`believes|suspects|uncertain|rejects|unknown` + optional `about`
- 来源：authored SR / `characterFacing`（测试可见；生产 Writer 少填充）
- Living Brain suspicion/trust = 情感代理，≠ Stance

---

## Q7 — Source？

```
06_knowledge_matrix ──► projectAwareness ──► characterSR.awareness
05_relationship_graph ──► affect_relationship
03_character_bible ──► motive seeds ONLY
authoredCharacterSR / characterFacing ──► awareness|stance|motive|affect|validity
scene.text ──► ActualEvents（≠ SR）· OC（≠ SR）· beat heuristics（≠ SR）
Living chapter text ──► character_brains（≠ Minimal SR）
Director plan ──► informationGap.*Knows（≠ Minimal SR）
```

**今日不是 Minimal SR 来源：** `actualEvents`、`characterHints`、`character_brains`、story-memory、beat `characterStateChanges`。

---

## Q8 — Authority？

| Artifact | Authority |
|----------|-----------|
| Minimal SR | **Read-only projection** · `IS_REALITY_AUTHORITY = false` · `PRODUCES_OBTAINS = false` |
| Knowledge matrix | Epistemic **constraint**（非 Reality Authority） |
| Actual / StoryEvent | Text-grounded Actual；提取层 `writesSR=false`；Phase 2 仅可写 timeline |
| F1 IB / Story Clock | 消费优先级保护（「非 SR」） |
| F3 Provenance | 诊断观察 |
| character_brains | Living sidecar residual |
| Beat / situation belief | Plan/heuristic；≠ obtains |

---

## Q9 — Lifecycle？

| Object | Create | Update | Persist | Cross-scene |
|--------|--------|--------|---------|-------------|
| Matrix | 人工/模块 | **无** Actual 写路径 | YAML | 静态 |
| Minimal SR | 每次 `compileScenePrompt` 重算 | 仅投影 | **无** writeback（Phase 1 freeze） | Validity 默认 current |
| Actual Events | 正文后 extract | 场级 | scenes.json + timeline（Phase 2） | N+1 Prompt 只读 |
| characterHints | Evolution | StateDiff | states JSON | 不写 brain |
| character_brains | Living / API | evolve → Prepare | `_system/character_brains/` | 跨章 residual |

---

## Q10 — Who consumes？

| Consumer | 消费什么 |
|----------|----------|
| Prompt Compiler | `character_sr` 模块 |
| F1 / Beat protect | IB 文案存活 |
| F4 ranking | 过滤后 knowledge TopK |
| F3 viewer | 溯源标签 |
| Decision / Consistency | matrix vs prose/goal |
| Living UI / chapter-task | brains 数值（旁路 Minimal SR） |
| Director | informationGap |
| **不消费 SR：** State Evolution、Actual Prompt block、OC |

---

## Input Map

| Input | Status | Notes |
|-------|--------|-------|
| Reality Source | PARTIAL | D1/EO；无单一 Character Reality store |
| Actual Source | EXISTS | `actualEvents`；驱动 timeline + N+1；**不驱动 SR** |
| Character State | DUPLICATED / CONFLICTING | Minimal SR · brains · beat · situation · desire · matrix |
| Knowledge Boundary | EXISTS（access filter） | F4 + IB + consistency — **闸门**，非演化知识库 |
| Context Provenance | EXISTS（diagnostic） | F3 |
| Memory | DUPLICATED | hierarchy · story-memory · beat · brains · git |
| POV | EXISTS | `ctx.pov` / scene.pov |
| Existing Character Knowledge | PARTIAL | Matrix + Awareness；常空 |
| Belief-like | PARTIAL | Stance / desire / situation |
| Interpretation-like | ABSENT | — |
| Stance-like | PARTIAL | Schema；少源 |
| Relevance-like | EXISTS（Writer）/ ABSENT（角色对事件显著性） | context-ranking ≠ character salience |

---

## Potential Parallel Character Truth

| # | Parallel | Overlap risk |
|---|----------|--------------|
| 1 | Minimal SR Awareness vs Matrix vs Living Brain metrics | 三套「角色知道/感觉」 |
| 2 | Minimal SR Stance vs Desire `belief` vs Situation `belief` | 信念分裂 |
| 3 | F4/IB「POV 不知」vs Director `heroKnows` filler | 信息不对称冲突 |
| 4 | Actual `characterHints` vs Brain evolutionLog vs Beat stateChanges | 事件→人物 多通道 |
| 5 | Relationship graph vs Brain trust vs Anchor relationship_state | 关系真相分裂 |

**裁决预告（供 Design Gate）：**  
禁止在 `character_brains` 上再建一套 CharacterSR。Phase 3 必须以 **Minimal SR** 为唯一 SR Carrier；Living brains 保持 residual / 非 Authority。

---

## F1 / F3 / F4 / F6 vs Information Boundary

| Series | 对「角色能否接触信息」 | 能否替代 CharacterSR？ |
|--------|------------------------|------------------------|
| F1 | 保护 IB 措辞；Awareness omit 禁「已知」措辞 | 仅消费纪律 |
| F3 | 标注 SR/IB/knowledge 溯源 | 诊断 |
| F4 | POV know/partial 才进 Writer knowledge TopK | **最接近 access API**；非演化存储 |
| F6.2 OC | 正文连续投影；`writesSR=false` | **明确 ≠ SR** |

**结论：** SR **必须消费** F1/F4，**禁止再造 Boundary Engine**。  
缺失的是：**Actual Event E →（经 IB）→ Character C 的 Awareness/Interpretation** 写路径。

---

## Actual Event 关系（SOURCE / AUTHORITY）

| Candidate | 今日是否读入 SR | Authority | 适合度 |
|-----------|-----------------|-----------|--------|
| Character Context（matrix/authored） | **YES — 唯一 assemble 输入** | Epistemic authored | 静态；常空 |
| Actual Event | **NO** | Text-grounded Actual；`writesSR=false` | 未来学习最佳上游；今日防火墙 |
| Scene Text | 间接（Actual/OC/beat） | Raw | 过粗；不应绕过 Actual |

**Archaeology 事实结论：**

- **SOURCE（今日）：** CharacterSR 只读 Character Context。  
- **AUTHORITY（今日）：** Minimal SR = projection ≠ authority；Actual = timeline Actual ≠ character knowledge。  
- **Design Gate 须裁决：** Actual 经 IB 更新 SR = **新绑定**（今日显式禁止）；保留 Context-only = Awareness 永不演化。

---

## Relevance Archaeology

| Kind | Status |
|------|--------|
| Context ranking relevance | EXISTS（`scoreRelevance`） |
| Entity importance | EXISTS |
| Relevance learning | EXISTS（usage boost） |
| Decision interest（goal 对齐） | EXISTS（弱） |
| Character-event salience / impact | **ABSENT** |

→ Design Gate：若 SR 需「同一 Reality 对不同角色显著性不同」，只需 **Minimal relevance representation**，禁止复杂算法。

---

## CharacterSR vs Character Memory（代码现实）

| | CharacterSR（Minimal SR） | Character Memory（散落） |
|--|---------------------------|--------------------------|
| 定义 | 瞬时 **view**：证据 → prompt | 异构持久/会话仓 |
| 家 | `minimal-sr.js` | brains · hierarchy · beat · story-memory · hints |
| 「知道 F」 | Awareness ← matrix | brains 无命题；hierarchy 实体日志 |
| Writeback | 禁止（Phase 1） | Living / MemoryUnit |
| Actual | 无 | hints 有；brain 无 |

**一句：** SR = fail-closed 认识论投影；Memory = 异构旁路 — **今日 Memory ≠ SR，也 ≠「经历过什么」的统一模型。**

---

## Phase 2 状态校正（用户裁决对齐）

```
                  ┌→ timeline.events   ✅（Phase 2）
Actual Events ────┤
                  └→ Character State   ❌
                         ↓
                       SR              ❌（本 Phase 目标）
```

不得把 `Actual → timeline.events` 误读为 `Actual → State` 完成。

---

## Key File Index

| Concern | Path |
|---------|------|
| Minimal SR | `packages/inkos-core/src/lib/minimal-sr.js` |
| F4 filter | `packages/inkos-prompt/src/entity-selector.js` |
| Compiler 注入 | `packages/inkos-prompt/src/compiler.js` |
| F1 IB | `packages/inkos-core/src/lib/prompt-survival.js` |
| Actual / writesSR | `packages/inkos-brain/src/events/story-event.schema.js` |
| Evolution hints | `packages/inkos-brain/src/memory/state-evolution-engine.js` |
| Living brains | `packages/inkos-studio-server/src/living-novel-engine.js` · `system-store.js` |
| Phase 1 SR spec | `golden/story-architecture/PHASE-1-SPEC.md` |

---

## Step 3.1 Completion

| Item | Status |
|------|--------|
| 只读扫描 | DONE |
| `_AI_SR_RUNTIME_AUDIT.md` | DONE（本文件） |
| 代码修改 | **NONE** |
| 可进入 Design Gate | **YES** |
| 可进入实现 | **NO** — 须 Design Gate PASS |
