# Phase 4.1 — Character Causality Read-only Archaeology

**Date:** 2026-09-09  
**Mode:** READ-ONLY · 禁止改代码 · 禁止实现 L1 / Choice / Action Causality  
**Upstream:** Phase 3.2 PASS WITH KNOWN LIMITATIONS · V2.0 FROZEN  
**Question:** 现有代码是否已有真实、可追溯、非 Plan/Writer/Reasoner fabricated 的路径：

```text
Candidate Option → Access → Agency → Candidate Action
```

---

## 1. Executive Verdict

```
BLOCKED → STOP
```

**一句事实：**

> Phase 3.2 已建立 `Actual → IB → CharacterSR`（主观现实投影）。  
> **不存在** `CharacterSR → Candidate Option → Access(to option) → Agency → Action` 的生产路径。  
> 生产主桥仍是：`Plan/Authored choice|goal + causal_chain → Writer → prose Action`。  
> L1 Choice Formation 仅存在于 `golden/reality/l1-choice-formation/SPEC.md`（read-only oracle），**无 Runtime Observer / Formation**。

因此系统 **尚无资格** 直接实现 Choice Formation：若现在实现，极易把 Plan/Reasoner/Writer 伪因果包装成 Choice。

---

## 2. Candidate Option Archaeology

### 发现的结构（Producer → Representation → Consumer）

| Structure | Producer | Representation | Consumer |
|-----------|----------|----------------|----------|
| `causalChain.options[]` | `causal-reasoner.js` `mockReason` | `{ action, benefit, cost, derivation:'authored' }` | `renderCausalChain` → Writer Prompt |
| `authoredPlan.options` | Authored chapter/scene plan | string[] / objects | Reasoner `assembleWorldPressure` |
| `plan.choice` / `scene.choice` | Authored / Director | string | `deriveSceneChoice` → Beat Plan → Writer |
| Beat `choice` / `choiceHint` | `beat-state.js` structural templates | hint strings（「做还是不做」等） | Beat prompt / library |
| Beat Library `Decision` | F7 beat-library | CONSTRAINT hint | L4 Writer instruction（FAKE_CHOICE 风险） |
| Conflict / Pressure / countdown | Conflict engine / Hook Ladder | pressure text（三十秒等） | Writer Situation |
| Desire profile | `character-desire-engine.js` | externalGoal/fear/belief | characterPush / Writer |
| Scene Goal / Beat Action | Planner / Director | goal/action strings | **Writer 主行动指令** |
| CharacterSR fields | Phase 3.2 updater | awareness/interpretation/belief/stance/relevance | Prompt SR block only |
| L1 fixtures | golden SPEC | prose oracle | **无生产消费** |

### 五问抽样

| Candidate | 1 Who | 2 From what | 3 Whose Reality | 4 Character knows? | 5 SR→Option path? |
|-----------|-------|-------------|-----------------|--------------------|-------------------|
| causalChain.options | Reasoner from authored plan | authored options | System/Author plan | **UNPROVEN**（不查 SR） | **NO** |
| plan.choice | Authored/Director | scene/intent.choice | Plan | **UNPROVEN** | **NO** |
| Beat choiceHint | Template library | structural beat type | System drama | NO | **NO** |
| Pressure「三十秒」 | Hook/Conflict | plan pressure | World/Plan pressure | 可能进入正文 Actual，≠ Option 对象 | **NO typed Option** |
| CharacterSR.belief | SR updater / authored | Actual+IB / authored | Character SR | YES（belief） | **≠ Candidate Option** |

### Table A — Candidate Option

| Item | Producer | Source | Character SR | Character-visible | Classification |
|------|----------|--------|--------------|-------------------|----------------|
| `causalChain.options` | causal-reasoner | authored plan options | Not input | Prompt only（系统认为可选） | **D Reasoner**（authored）/ **B Plan** |
| `plan.choice` / `scene.choice` | deriveSceneChoice | explicit authored only | No | Via Writer if rendered | **B Plan / Authored** |
| Beat `choice` / library Decision | beat-state / library | templates / structural | No | Writer hint | **E Conflict/Pressure** 或 **F Expected** 戏剧提示；FAKE_CHOICE |
| Desire / characterPush | desire-engine | DNA/intent authored | No（Desire≠SR） | Writer | **B/G**（authored parallel） |
| Scene Goal / Beat Action | Planner/Director | plan | No | Writer primary | **B Plan** / **F Expected Action** |
| CharacterSR awareness/belief | character-sr-updater | Actual+IB / authored | **Yes** | Writer SR block | **≠ Option**（知识/信念，非候选行为集） |
| L1 golden options-in-prose | human fixtures | prose evidence | N/A | Oracle only | **G Unknown for runtime**（SPEC only） |

**结论：**  
**Genuine Character Option（A）= ABSENT in production runtime.**  
`System thinks Character can do X` ≠ `Character subjectively has X as accessible option`。

```text
Character SR
    ↓
???
    ↓
Candidate Option
```

= **MISSING PRIMITIVE / DESIGN QUESTION**（本轮不补）

---

## 3. Access Archaeology

### 已有（Phase 3.2）— Character 对 **事实/证据** 的 Access

| Access | Producer | Input | Character SR relation | Proven? |
|--------|----------|-------|----------------------|---------|
| Awareness of Actual evidence | `character-sr-updater` + IB | Actual Event actors/present | Direct write to SR.awareness | **YES**（事实 Access） |
| Matrix know/partial | `06_knowledge_matrix` → `projectAwareness` | authored matrix | Baseline SR | **YES**（epistemic） |
| Interpretation / Belief | authored facing + SR merge | authored only | SR fields | **YES** if authored |
| F4 filterKnowledgeForPrompt | entity-selector | matrix + POV | Writer TopK gate | **YES**（Writer 可见性，非 Option Access） |
| heroKnows / informationGap | Director | plan/emotion | **Forbidden for SR** | Plan soft — **≠ Character Access** |

### Table B — Access（对 Candidate Option）

| Access | Producer | Input | Character SR relation | Proven? |
|--------|----------|-------|----------------------|---------|
| Access(Option A) | — | — | — | **MISSING / UNPROVEN** |
| Access(Actual fact F) | SR updater | Actual+IB | awareness | **PROVEN** |
| Access(Plan option) | Reasoner/Plan | authored options | None | **NOT Character Access** |

**四层混淆检查：**

| Layer | Exists? |
|-------|---------|
| Canon knows X | Partial（timeline/facts） |
| System knows X | Yes（Plan/Reasoner/Prompt） |
| Writer knows X | Yes（full prompt） |
| Character knows X | Yes for **facts** via SR；**No typed “knows Option A”** |

**最低证据链：**

```text
Actual → IB → Perception → Interpretation → SR → Candidate Option
```

今日：前半（到 SR 事实/解释）**PARTIAL/YES**；最后一跳 **→ Candidate Option = MISSING**。

---

## 4. Agency Archaeology

### 生产 Action 真实来源

| Action path | Producer | Causal Input | Character State/SR | Attributable? | Evidence |
|-------------|----------|--------------|--------------------|---------------|----------|
| Beat/Scene Writer prose | LLM Writer | scene.goal, beat.action, causal_chain, Situation, SR **prompt text** | SR is **consumer context only**；不决定 Action | **FABRICATED / NOT CHARACTER CAUSALITY**（Case F） | `studio-llm-writer` / `executeBeatSequence`；无归因层 |
| Beat.action / plan.goal | Director/Planner | plan | No SR | **PSEUDO-CAUSAL / INVALID FOR L1**（Case E） | `beat-state.js`；`scene-execution` |
| causal_chain.choice.action | Reasoner | authored choice/climax | Input ≠ CharacterSR | **UNPROVEN→PSEUDO**（Case G） | `causal-reasoner.js`；明确 authored/plan |
| Desire → characterPush | desire-engine | DNA/intent | Parallel to SR | **UNPROVEN**（Case C parallel，非 SR） | desire-engine |
| Pressure → “must act” | Conflict/Hook | plan pressure | No deliberation object | **NOT auto Agency**（Case D） | FAKE_CHOICE audits |
| Actual StoryEvent.action | Extractor | scene.text | Records what happened | **Event happened ≠ Character chose** | event-extractor |
| Character Goal→Action (bible) | — | — | Motive seeds ≠ current Motive auto | **No runtime Agency path**（Case A absent） | minimal-sr bible seeds |
| Character Belief→Action | — | — | Belief in SR exists | **No code maps Belief→Action**（Case B absent） | character-sr-updater |

### Table C — Agency

| Action | Producer | Causal Input | Character State/SR | Attributable? | Evidence |
|--------|----------|--------------|--------------------|---------------|----------|
| Prose character action | Writer | Goal/Beat/causal/SR prompt | SR not authority | **NO（Writer）** | Production path |
| Plan-stated choice action | Plan/Reasoner | authored | No | **NO（Plan）** | deriveSceneChoice / mockReason |
| Extracted Actual action | Extractor | text | Post-hoc record | **NOT proven Choice** | StoryEvent |
| Belief-driven action | — | — | — | **ABSENT** | no link |

**Cause ≠ Agency：** 代码有大量“原因”（goal/pressure/cost），**无一**把 Action 归因回 CharacterSR。

---

## 5. Subject Presence / Subject Absence Archaeology

| Primitive | Status | Evidence |
|-----------|--------|----------|
| Runtime Subject Presence check | **ABSENT** | 无 `subjectPresent` / sleepwalk / reflex gate in packages runtime |
| L1 SubjectAbsent taxonomy | **SPEC only** | `golden/reality/l1-choice-formation/SPEC.md` — Observer **not implemented** |
| “action has cause → subject present” | Would be wrong | 当前也无此错误实现；亦无正确实现 |
| Character evaluation / selection object | **ABSENT** | 无 selection / deliberation structure from SR |

**报告：** Subject Presence primitive **缺失**。不得用“有因果原因”代替。

---

## 6. External Coercion Boundary

| Finding | Detail |
|---------|--------|
| Frozen rule in L1 SPEC | Coercion ≠ Subject Absence；conscious forced choice may VALID |
| Runtime L1 | **Not implemented** — 故 **不会**在 Runtime 错误判 coercion=absence（也 **不能**正确判） |
| Pressure / FAKE_CHOICE | Beat Decision hints / 三十秒 pressure → Writer 假二难（F7 audit）——制造 **假 Choice 压力**，非 Subject Absence 判定 |
| S8.2 | 无 authored choice → `choice=null` / options=[] — 防假完整，**不是** Coercion 语义 |

**结论：** 代码 **未混同** Coercion 与 Subject Absence（因无 Runtime 判定器）；亦 **无能力**表达“被迫但仍 VALID”。

---

## 7. Plan / Reasoner / Writer Contamination

### Table D — Contamination

| Path | Origin | Destination | Classification | Risk |
|------|--------|-------------|----------------|------|
| Plan → scene.goal → Writer → prose Action | Planner | Actual text | **FABRICATED / PSEUDO-CAUSAL** | PLAN-DERIVED ACTION / NOT PROVEN CHARACTER CHOICE |
| Plan → Expected/Situation → Writer | Situation engine | Writer | **PSEUDO-CAUSAL** | 假世界/假预期行动 |
| Authored options → causal_chain.options → Prompt | Reasoner | Writer | **PSEUDO-CAUSAL**（authored） | 冒充角色可选空间 |
| Authored choice → causal_chain.choice → Prompt | Reasoner | Writer | **PSEUDO-CAUSAL** | 冒充已选 |
| Beat Decision library → FAKE_CHOICE hint | Library | Writer | **FABRICATED** | 假二选一 |
| Desire/belief → Prompt | Desire engine | Writer | **PSEUDO-CAUSAL** parallel | 与 CharacterSR 撞车 |
| Living brain → chapter-task | Living | Writer旁路 | **PSEUDO-CAUSAL** residual | 非 SR Authority |
| CharacterSR → Prompt only | SR updater | Writer context | **LEGITIMATE as context** | **≠ Choice authority** |
| Writer → Action (no attribution) | LLM | Actual | **FABRICATED** | Writer-generated Action ≠ Character Choice |

**隐形 Plan → Choice：**

```text
Plan / authored choice|goal
  → Expected Action / Beat action / causal_chain
  → Writer
  → Actual Action
```

**存在。** 标记：`PLAN-DERIVED ACTION / NOT PROVEN CHARACTER CHOICE`

**Writer → Action：**  
存在且为主路径。无独立 Character Causality 归因层。

---

## 8. Four Boundary Cases

### Table E — Boundary Cases

| Case | Current behavior | Correct semantic result | Code support | Gap |
|------|------------------|-------------------------|--------------|-----|
| **1 Access** Character 不知 Option A | 无 Option 对象；Plan 仍可把 A 塞进 Prompt/Goal | A 不能成为 Character Choice | Fact Access via SR **YES**；Option Access **NO** | 无法把“不知 Option”绑到 Choice gate |
| **2 Agency** SR 有 A，Action 非 SR | SR 可有 belief；Action 仍由 Writer/Goal 产生；**无检测** | 应识别 non-attributable | **NO** | 无 Agency checker |
| **3 Subject Absence** sleepwalk/reflex | 无 Runtime 区分「角色做了」vs「发生在角色身上」 | SubjectAbsent → INVALID | SPEC only | Missing primitive |
| **4 External Coercion** 被迫仍取舍 | Pressure 进 Writer；无 L1；不会自动 INVALID coercion | Coercion 仍可能 VALID | SPEC 正确；Runtime 无 | 无法表达 VALID coerced choice |

---

## 9. Authority Map

| Concern | Who actually holds authority today |
|---------|-----------------------------------|
| Candidate Option | Authored Plan / Reasoner（透传）/ Beat templates — **NOT CharacterSR** |
| Access (facts) | CharacterSR + matrix + F4 | 
| Access (options) | **Nobody legitimate** — Plan pretends |
| Agency / Action | **Writer**（服从 Plan/Goal/Beat） |
| Choice Formation L1 | **Nobody in runtime**（golden SPEC only） |
| Dominance L2 | **Nobody** |
| Competing Choice authorities | Plan choice · Reasoner choice · Beat choice · Writer improvisation · Desire push |

```text
CharacterSR Authority = subjective facts/interpretations/beliefs (Phase 3.2)
Choice Authority      = NOT CharacterSR — Plan/Writer/Reasoner cluster
```

---

## 10. Readiness Matrix

```text
Candidate Option     BLOCKED   （无 Genuine Character Option；仅有 Plan/Reasoner/Beat）
Access               BLOCKED*  （*事实 Access READY；Option Access BLOCKED）
Agency               BLOCKED   （Action 归因不到 CharacterSR）
Subject Presence     BLOCKED   （primitive 缺失；仅 SPEC）
L1 Boundary          BLOCKED   （无 Runtime L1；SPEC 冻结但未接线）
L2 Inputs            BLOCKED   （无 VALID Choice 集合可喂 L2）
```

\* 拆开写更准确：

```text
Access(facts)        READY（Phase 3.2）
Access(options)      BLOCKED
```

---

## 11. Known Limitations

1. Phase 3.2 SR 是 Choice 的**必要前置**，不是 Choice 本身。  
2. S8.2 / F7 已减轻假选项/假选择，但权威仍在 Plan/Writer。  
3. L1 golden SPEC 已正确冻结 Coercion≠Absence，但 **无 Observer**。  
4. Prompt 中同时存在 SR 与 causal_chain — 易被误读为“角色因果已闭合”。  
5. Living/Desire 平行人物态仍在（已知 residual）。

---

## 12. Missing Primitives

```text
MISSING: Character-derived Candidate Option set
MISSING: Access(Option) from CharacterSR
MISSING: Agency attribution Action ← CharacterSR
MISSING: Subject Presence / Subject Absence runtime primitive
MISSING: L1 Choice Formation runtime (only golden SPEC)
MISSING: Separation enforcement Plan-Option vs Character-Option
```

**DESIGN QUESTION（不实现）：**  
Candidate Option 的合法 Producer 应仅为 CharacterSR（经 Access），还是允许 authored seed 经 SR 认证后进入？——须 Design Gate，本轮不定案。

---

## 13. Optimization Candidates

（记录 only · **本轮不实施**）

| ID | Note |
|----|------|
| OPT-1 | Prompt 中 `causal_chain` 与 `character_sr` 并列 — 标注/隔离，防误读为 Choice |
| OPT-2 | `deriveSceneChoice` 命名含 Choice — 易与 L1 混淆；可改名 plan.choiceHint |
| OPT-3 | Beat Library Decision → FAKE_CHOICE 已审计，可降级提示 |
| OPT-4 | L1 SPEC ↔ Prompt L1/L2 命名冲突 — 文档消歧 |
| OPT-5 | Desire.belief vs CharacterSR.belief — 继续 DEMOTE Desire 为非 Authority |

---

## 14. STOP Conditions Triggered

| ID | Triggered? | Evidence |
|----|------------|----------|
| STOP-1 Candidate Option 非 CharacterSR | **YES** | Table A — 无 Classification A |
| STOP-2 Access 来自 Plan/Writer/Reasoner（对 Option） | **YES** | Option Access 仅 Plan/Reasoner |
| STOP-3 Agency 只能靠“有因果原因”推断 | **YES** | 无 SR→Action；仅 Writer/Plan cause |
| STOP-4 Subject Presence 与 Agency 无法区分 | **YES** | 两者皆缺 Runtime primitive |
| STOP-5 Coercion 与 Absence 混同 | **NO**（无 Runtime 混同；亦无正确分离能力） | — |
| STOP-6 须改 Phase 3.2 SR 基础模型 | **UNKNOWN / 可能** | Option 原语是否进 SR = Design Gate；**不在本轮改** |
| STOP-7 须重定义 L1/L2 | **NO** | L1 SPEC 仍适用；问题是未实现 |
| STOP-8 多个竞争 Choice authority | **YES** | Plan/Reasoner/Beat/Writer |
| STOP-9 须新 Cognitive/Emotion/Drama/Causal Engine | **NO requirement proven** | 缺的是 Option/Access/Agency **边**，不是新大 Engine；若有人主张先造 Engine → 另 STOP |
| STOP-10 与 V2.0 冲突 | **NO** if we STOP implementation | 进入 4.2 实现会冲突 |

---

## 15. Final Verdict

```
BLOCKED → STOP
```

**不得进入 Phase 4.2 实现。**  
**不得进入 L1 runtime / Choice Formation / Action Causality 实现。**  
**Consequence / Survival / Director 继续冻结。**

### 允许的下一步（仅讨论 / Design Gate，非本文件实施）

1. 人工审阅本考古报告。  
2. 若确认缺口：开 **Phase 4 Design Gate**，裁决 Candidate Option 的合法 Producer / Representation / 是否扩展 SR。  
3. Design Gate 批准后，才允许 Phase 4.2 最小实现任务。

### 明确非宣称

```
NOT READY FOR PHASE 4 DESIGN   （因核心边 BLOCKED；非“有局部 limitation 的 READY”）
Character Causality ≠ started
Choice System ≠ started
Phase 3.2 ≠ license for Choice
```

---

## Authority one-liner

> **CharacterSR 今天能回答「角色知道/相信什么」。**  
> **不能回答「角色有哪些可选项、为何选、为何行动」。**  
> **后者仍由 Plan → Writer 伪因果承担。**

*End of Phase 4.1. No code modified. No Design Gate crossed.*
