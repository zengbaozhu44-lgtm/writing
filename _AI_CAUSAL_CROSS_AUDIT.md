# Phase 3.1-C — Causal Chain Cross-Audit

**Status:** COMPLETE（READ-ONLY）  
**Date:** 2026-09-09  
**Mode:** 禁止改代码 · 禁止实现 Causal / Choice / SR updater · 禁止修 Ch2  
**Upstream freeze:** Phase 0–2；Phase 3.1 SR Audit + Design Gate **PASS WITH BINDING CONSTRAINTS**

**本轮只回答：**  
现在系统里的「因果」在哪里？它是否已能作为 `SR → Choice → Action → Consequence` 的统一骨架？

---

## 1. Executive Verdict

```
A — CAUSAL STRUCTURE SUFFICIENT (FOR PHASE 3.2 ONLY)
```

**一句裁决：**

> 文学因果环 **未闭合**；Writer 侧存在大量 **Plan / Expected / Causal Reasoner / Living** 伪因果载体；但 Canon 侧大多已被 EO-P2 / `writesSR=false` 挡住。  
> **这些并不阻断**「扩展 Minimal SR：Actual → IB → CharacterSR」。  
> 它们 **会阻断** 任何把 `causal_chain` / Situation belief / Living brain / `heroKnows` 当作 Character Causality Authority 的实现。

| Alternative | 何时改选 |
|-------------|----------|
| **B — CAUSAL GAP BLOCKS SR** | 若坚持 SR 必须先有完整 Character State→Action 调用链才可建 — **当前不选**（Interpretation 缺失正是 3.2 范围） |
| **C — CAUSAL POLLUTION → STOP** | 若有人主张用 Reasoner/Situation/Living **填** SR / 修 RF-02 — **立即升级为本选项并 STOP** |

**明确非宣称：**

```
Causal chain ≠ COMPLETE
Character Causality ≠ COMPLETE
Choice System ≠ COMPLETE
Proceed 3.2 ≠ license for Causal Engine
```

---

## 2. Causal Carrier Inventory

| Carrier | File / Symbol | Produces | Consumes | Authority | Actual? | Plan? | Persist? | Writer-visible? |
|---------|---------------|----------|----------|-----------|---------|-------|----------|-----------------|
| StoryEvent / actualEvents | `events/story-event.schema.js` · `event-extractor.js` | actors, action, consequence*, stateChanges | `scene.text` | Actual record（writesCanon/SR/Reality=false） | YES | NO | scenes.json（常空直至 reextract） | YES（Actual block） |
| Actual→Prompt | `actual-events-prompt.js` | N+1 who-did-what | prior actualEvents | Read-only Actual | YES | NO | prompt only | YES |
| Observed Continuity | `scene-observed-continuity.js` | confirmed / unresolved（含 open_choice） | scene.text | Continuity ≠ Canon/SR | YES | NO | 可挂 scene | YES soft |
| Plan Validity F8.3 | `plan-validity.js` | VALID/INVALID demotion | OC + text + goal | Diagnostic | PARTIAL | 判 Plan | no | YES |
| Situation Engine | `situation-engine.js` | world/character before→after, closingWorldState | plan + **prev Plan closing** | Plan / inference_candidate | NO | YES | executionPlan | YES |
| Scene choice / info gap | `scene-execution.js` | plan.choice, heroKnows… | authored/plan/emotion | Plan soft | NO | YES | plan | YES |
| Beat Memory | `beat-memory.js` | newFacts, characterStateChanges | beat text + beatPlan | HEURISTIC / plan-residue | PARTIAL | PARTIAL | beat merge | YES |
| Beat structural | `beat-state.js` | action/choice/newInformation slots | authored concrete | Plan structure | NO | YES | beatPlan | YES |
| Character Desire | `character-desire-engine.js` | desire + belief string | DNA/intent | Authored | NO | authored | no | YES |
| Conflict Engine | `conflict-engine.js` | opposition/risk/cost | plan obstacle | Pressure ≠ Choice consequence | NO | YES | plan | YES |
| **Causal Reasoner** | `causal/causal-reasoner.js` | intent.causalChain | bible, authored plan, facts, gaps | **Modelled / Authored diagnostic** | NO | YES | intent/章 | YES（protected） |
| State Evolution | `state-evolution-engine.js` | timeline events, characterHints, openLoops | actualEvents | Canon timeline + sidecar | YES timeline | NO | states + 11 | hints 非主 Prompt |
| State Updater shell | `state-updater.js` | day/time；events=[] | intent | EO-P2 空 Plan 路径 | NO events | blocked | via Evolution | NO |
| MemoryUnit | `memory-unit.js` | commit | StateDiff | Persistence ≠ Authority | via Evolution | NO | YES | NO |
| Minimal SR | `minimal-sr.js` | awareness/stance/… | matrix + authored | Projection；非 Reality Authority | NO today | NO | **无 writeback** | YES |
| Knowledge matrix | `06_knowledge_matrix.yaml` | know/partial/unknown | authored | Epistemic constraint | NO | NO | YAML | via SR/F4 |
| Living brains | `living-novel-engine.js` | trust/fear/suspicion 提案 | chapter text | Residual ≠ SR/Canon | HEURISTIC | NO | character_brains | 旁路 |
| Story Thread | `story-thread` engine | progress / replan | scene vs DNA | Plot heuristic | PARTIAL | intent | state | replan |
| Story Memory | `story-memory` | foreshadow/promise | ctx/DNA | Plot memory ≠ causal | NO | PARTIAL | studio | hints |
| Story Health | `story-health.js` | scores | dashboard | Metric | NO | NO | JSON | Studio |

\* StoryEvent.consequence 常为模板句 → Action→Consequence **PARTIAL**。

---

## 3. Actual Causal Edge Map

标签：`[REALITY]` `[ACTUAL]` `[PLAN]` `[EXPECTED]` `[HEURISTIC]` `[AUTHORED]` `[DERIVED]`

```
[REALITY] modules / facts
    ↛ Character Perception                         [ABSENT]

scene.text
  → [ACTUAL] StoryEvent (actors/action/templated consequence)
  → [ACTUAL] observedContinuity (open_choice / cliff)
  → [HEURISTIC] beatMemory.characterStateChanges

StoryEvent
  → [DERIVED][ACTUAL] timeline.events              Evolution
  → [DERIVED] evolution.openLoops / characterHints （非 SR；无强制）
  → [ACTUAL] N+1 Actual Events prompt
  ↛ CharacterSR                                   writesSR=false

prev Plan.closingWorldState
  → [PLAN] next situation.worldBefore              scene-execution
  → [EXPECTED] Writer Situation after              inferWorldAfter

authored/plan goal|choice|cost
  → [AUTHORED|PLAN] causal_chain                   ensureChapterCausalChain
  → [PLAN] scene.plan.choice / beats
  → [PLAN] N+1 Scene Goal                          （可覆盖 Actual 压力）

Minimal SR / matrix
  → [DERIVED] Prompt Awareness
  ↛ Choice / Action                               Phase 4

L1 Choice Formation (golden SPEC)
  → [ABSENT in production]

Writer prose
  → [ACTUAL] next scene.text                       环重启
```

**今日生产主桥：**

```
[PLAN] Goal / Situation / causal_chain
        ↓
     Writer
        ↓
     [ACTUAL] text
```

旁路软腿：`[ACTUAL] OC / ActualEvents`（可被 Goal 压过）。  
**不是：** `[ACTUAL] → State → SR → Choice → Action`。

---

## 4. Character Causality Audit

### Q1 — Character sees X？

**PARTIAL**

| | |
|--|--|
| 有 | 正文可含感知；Actual actors；F4/matrix 过滤「可知」；`heroKnows` 软串 |
| 无 | typed Perception；Actual→「sees」写路径；经 IB 进入 CharacterSR |
| IB | F1/F4 管 Writer 可见性，**不**产生 Perception 状态 |

### Q2 — Character interprets X as Y？

**ABSENT**（CharacterSR interpretation）

近邻（≠ SR）：

- Situation `before/after.belief` — AUTHORED/PLAN  
- Desire `belief` — AUTHORED  
- Beat `newFacts` — HEURISTIC  
- StoryEvent `intent` — 动作意图，`writesSR=false`

### Q3 — Character chooses Z because of SR？

**NOT CONNECTED**（允许；属 Phase 4）

- `deriveSceneChoice` ← authored/plan choice  
- `mockReason.choice` ← authored plan choice/climax  
- **不读** Minimal SR  
- golden L1 Choice Formation = SPEC only，生产未挂

```
SR → Choice = NOT CONNECTED
```

### Q4 — Action 由哪个 Character State 导致？

**PARTIAL / CONFLICTING**

生产 Action 主跟：**Scene Goal / Beat action / causal_chain**（Plan/Authored）。  
Situation characterState 常 missing；Desire / Living / Minimal SR = **并行异构**，无一是 Action Authority。

---

## 5. Action → Consequence Audit

| Layer | 存在 | Verdict |
|-------|------|---------|
| StoryEvent.consequence | 必填；常模板 | **PARTIAL** |
| OC unresolved / settlement | 软可见；不强制 N+1 | **PARTIAL** |
| F8.3 | unresolved alone ≠ INVALID | **PARTIAL**（RF-02 放过） |
| Causal Reasoner consequence | ← cost/plan | **PLAN/AUTHORED** ≠ Actual |
| Evolution openLoops | 标签；无 Ledger | **PARTIAL** |

```
ACTION → CONSEQUENCE = PARTIAL
```

有 actor+action；文学后果弱；**无**「后果必改下一场条件」硬环。

---

## 6. Consequence → State Audit

| Target | Path | Persistence ≠ Evolution? |
|--------|------|---------------------------|
| World Canon | Actual → timeline.events → commit → 11 | Persist OK；语义 Evolution **仅 timeline**；facts=[] |
| World Plan-state | closingWorldState / inferWorldAfter | **非 Evolution** — Writer instruction |
| Character Canon/SR | characterHints only；writesCharacterBrain=false | **ABSENT SR** / PARTIAL hints |
| Living | evolveCharacterBrains | Residual |
| Memory | hierarchy / story-memory / beat | Persist/hints ≠ 后果→状态演化 |
| Open loops | evolution.openLoops | Persist tags；**不**硬驱 Planner |

```
Actual → timeline.events     = YES（Phase 2）
Actual → Character State/SR  = NOT COMPLETE
Persistence ≠ State Evolution
```

---

## 7. State → Next Scene Audit

| Bridge | Kind | Status |
|--------|------|--------|
| prev closingWorldState → next worldBefore | PLAN→PLAN | **PRESENT（主桥）** |
| N+1 Scene Goal | PLAN→PLAN | 可覆盖 Actual 压力 |
| OC / Actual Events → Prompt | ACTUAL→PROMPT | Soft |
| F8.3 demotion | ACTUAL 诊断 | 仅 premiseDenied |
| Evolution timeline → N+1 Plan | — | **不自动改 Plan/SR** |
| Open Loop force | — | **ABSENT**（Phase 6） |

```
PLAN → PLAN CAUSAL BRIDGE     = PRESENT
ACTUAL → STATE → NEXT SCENE   = INCOMPLETE
```

下一场「为什么必须发生」今日主要来自：**Plan says next scene should happen**，不是 **Actual State makes it necessary**。

---

## 8. Causal Reasoner Audit

文件：`packages/inkos-brain/src/causal/causal-reasoner.js`

| 问题 | 答案 |
|------|------|
| 推理什么？ | desire→pressure→options→choice→consequence→next_pressure（+ no_causal_basis） |
| 输入？ | bible、authored plan、facts、gaps — **非** scene.text Actual |
| 输出？ | `intent.causalChain` → 逐 scene 挂载 → `renderCausalChain` |
| 进 Canon？ | **否**（EO-P2；resolveTimelineEvents void causalChain） |
| 进 Writer？ | **是**（P1 protected 模块） |
| 改 State？ | **否**（Evolution 禁止读） |
| 决定 Character Action？ | 仅 Writer 指导；非 Runtime Action Authority |
| analysis/modelled？ | **是** |
| 误当 Reality 风险？ | Writer 语义上高；Canon 低 |

```
CAUSAL REASONER

[ ] Reality Authority
[ ] Actual Authority
[ ] State Evolution Authority
[x] Modelled inference
[x] Diagnostic only (no_causal_basis)
[x] Writer guidance
```

> **不得**成为 Canon Truth Producer。  
> **不得**成为 CharacterSR Authority。  
> 注释「causal_chain 是 Beat 唯一因果来源」= Writer 工程约定 ≠ 文学 Actual 因果环。

---

## 9. Pseudo-Causal Pollution Audit

| Pseudo-causal edge | Source | Consumer | Risk | Protection |
|--------------------|--------|----------|------|------------|
| Plan → Expected → 「State」 | Situation / inferWorldAfter | Writer；N+1 prevClosing | 假世界状态 | EO-P4；↛ timeline |
| Goal → Action | scene.goal / beat | Writer | Choice 蒸发 | F8.3 部分；OC soft |
| Pressure → Choice | conflict / hook 三十秒 | Writer | FAKE_CHOICE | S8.2：无 authored → choice null |
| Cost → 「Consequence」 | authored cost | causal_chain | 计划代价≠已发生 | ↛ timeline |
| Writer → Actual | prose | extractor | 正确腿；下游可不消费 | ensureActualEvents |
| Inference → Canon | beat newFacts；Living | 若误写 11/13 | 假历史 | EO-P2；demotion |
| Living brain → Canon/SR | evolveCharacterBrains | Studio | 第二人物真 | Gate：非 Authority |
| Desire belief → SR | desire-engine | Desire prompt | 信念撞车 | Gate：DEMOTE |
| heroKnows → SR | informationGap | Writer soft | Plan 冒充 knows | ≠ Minimal SR source |
| causal_chain → 「角色为何行动」 | Reasoner | Writer | 假 Character Causality | 禁入 SR |
| Story-thread % → Survival | thread engine | replan | ≠ Story Survival | 独立 metric |
| Prompt L1/L2 ↔ Choice L1/L2 | 命名冲突 | 文档 | 误接 Choice | 冻结区分 |

---

## 10. Causal Edge Completeness Matrix

| Edge | Status | Source | Authority | Current Carrier | Evidence |
|------|--------|--------|-----------|-----------------|----------|
| Reality → Actual | PARTIAL | scene.text | Actual extractor | StoryEvent | 非全 Reality |
| Actual → Perception | ABSENT | — | — | — | 无 typed Perception |
| Perception → Interpretation | ABSENT | — | — | — | SR Design Gate ADD |
| Interpretation → Belief | ABSENT | — | — | — | stance PARTIAL authored |
| Belief/SR → Choice | ABSENT | — | — | — | NOT CONNECTED |
| Choice → Action | ABSENT（生产用 Goal） | Plan/Authored | Plan | Goal/Beat/causal_chain | — |
| Action → Consequence | PARTIAL | text + templates | Actual soft | StoryEvent + OC | 模板后果 |
| Consequence → Actual | PARTIAL | Writer 须写回正文 | — | — | 环不硬 |
| Actual → State | PARTIAL | Evolution | timeline only | state-evolution-engine | Character ❌ |
| State → SR | ABSENT | — | — | writesSR=false | Phase 3 目标 |
| State → Survival | ABSENT / HEURISTIC | health/thread | metric | story-health | Phase 6 |
| State → Next Scene | PLAN-BRIDGED | Plan closing/Goal | Plan | situation-engine | Actual soft |

---

## 11. Ch2 S3→S4 Replay（凌晨四点世界刷新）

**已知文学失败：** S3 逼出「跟我走还是留下 / 三十秒」类压力；S4 转向「效率助手」等 ordinary execution，选择蒸发。

追踪：

```
S3 Choice pressure (text / OC-capable)
  ↓
S3 Action (offer choice — often unsettled)
  ↓
S3 Actual (可抽 open_choice；磁盘常未挂 actualEvents)
  ↓
S4 State (Plan Goal / Situation — NOT Actual-driven SR)
  ↓
S4 SR (无 Actual→SR；无「被逼选择」主观态)
  ↓
S4 Choice (无 L1；Goal 覆盖)
```

**Choice disappeared because:**

```
[ ] no Actual                          — 可提取；常未硬消费 / 磁盘可空
[x] no Character State                 — Actual 未改 Character State
[x] no SR                              — 无「正被逼选」主观态
[x] no Survival                        — Open Loop 未强制（Phase 6）
[x] Director Plan overwrite            — N+1 Goal / PLAN→PLAN 桥
[x] Expected Action overwrite          — Situation Expected / Beat
[x] Writer obedience                   — 服从新 Goal
[x] Plan Validity soft                 — unresolved alone → 仍 VALID
[ ] Canon timeline Plan pollution      — EO-P2 挡住；非主因
```

**Primary break:**  
`Consequence → Next Scene` 硬环 **ABSENT** + **PLAN Goal 覆盖**。  
**本轮不修。** Phase 3 只可验「若角色获得该事件，SR 能否保留主观态」；不得偷做 Open Loop。

---

## 12. Reality ≠ Interpretation Replay

| Need | Now? |
|------|------|
| Canon/Actual ≠ Character interpretation 字段 | **Not yet**（ABSENT；3.2 ADD） |
| Actual 证据不经 Plan 贴「警察」标签 | **Yes**（extractor 禁 Plan） |
| IB：A 见 / B 不见 | **Yes**（F1/F4 + matrix） |
| Belief 错且不纠偏 | **After** belief 字段 |
| 不修 Choice disappearance | **Yes**（Gate 已写） |

Phase 3 fixture 可证明：`Reality=门外有人` / `SR interpretation=警察` / `Canon≠警察`。  
**不可**借此宣称 Character Causality 完成。

---

## 13. Gaps

1. Actual → Perception → Interpretation → SR：**断**（3.2 目标）  
2. SR → Choice → Action：**断**（Phase 4）  
3. Action → Consequence 硬消费 / Open Loop：**断**（Phase 5–6）  
4. 跨场状态主桥仍 Plan situation（Phase 7）  
5. StoryEvent.consequence 模板化  
6. 多套 belief/state：**DUPLICATED**  
7. 磁盘 scenes 常缺 actualEvents/OC → 软腿更软  

---

## 14. Risks

1. Phase 3.2 误接 `causal_chain` / Situation / Living / `heroKnows` → **第六套人物因果**  
2. 把 Prompt L1/L2 当成 Choice L1/L2  
3. 用 Causal Reasoner「补」Character Causality → 固化 Plan 因果  
4. 把 `characterHints` 当 CharacterSR  
5. 以为 timeline.events = Actual→State 完成  

---

## 15. Phase 3 Impact

| 问题 | 答案 |
|------|------|
| 能否干净做 `Actual → IB → CharacterSR`？ | **能** — 只要拒绝伪因果载体 |
| 会不会变成第六套真相？ | **会** — 若接 Reasoner/Situation/Living |
| Design Gate 是否仍有效？ | **是** — Carrier=Minimal SR；brains 非 Authority |
| 本审计是否要求先建 Causal Engine？ | **否** |
| Choice disappearance 是否要在 3.2 修？ | **否** → DEFERRED Phase 4/6 |

**真正需要的不是 Causal Engine，而是未来的 Causal Traceability：**

```
Action A
  ← Choice C
      ← SR(t)
          ← Interpretation I
              ← Perception P
                  ← Actual Event E
```

每一段 provenance — **不是** `character-causality-engine.js`。

---

## 16. Final Gate Verdict

```
Proceed Phase 3.2 Minimal SR
```

**条件（已冻结，不新开 Causal Design Gate）：**

1. 扩展 `minimal-sr.js` — **禁止**新建平行 Character Truth  
2. 更新源仅：`Actual Event`（经 F1/F4 IB）+ matrix + authored  
3. **禁止**消费：`causal_chain`、Situation belief、Desire belief、Living brain、`heroKnows`、Beat stateChanges、Plan closing 作为 SR 事实  
4. 不实现 Choice / Cognitive / Emotion / Drama Manager  
5. Ch2 S3 只做 SR 主观保留验证，不修 Choice disappearance  

**若实现偏离上述任一条 → 立即 STOP → 升为 C（Root Cause / Design Gate）。**

```
Can enter Causal Design Gate now?   NO（除非偏离）
Can enter Phase 4 now?              NO
Can enter Step 3.2 now?             YES（纪律如上）
```

---

## Freeze Reminder

> 因果链不是一个模块；是边的关系结构。  
> 本轮成功 = 每条关键边的生产者 / 所有者 / 消费者 / 来源标签已标明。  
> Phase 3 补的是 **Character 看见的 Reality 与 Reality 本身分离**，不是假装角色「为什么行动」已可追溯。

*End of Phase 3.1-C. No code modified.*
