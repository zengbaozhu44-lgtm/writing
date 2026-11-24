# F7 — Beat Integration Read-only Audit

**Date**: 2026-09-07  
**Verdict**: **F7 = AUDIT COMPLETE**  
**Mode**: READ-ONLY ARCHITECTURE + REAL PRODUCTION TRACE  
**Code changed**: none（仅 audit artifact）

---

## Executive answer

InkOS **已形成** Beat 执行链（Director → 六拍 Execution Plan → L3/L4 → Writer），但 Beat 的语义主体是：

```text
CONSTRAINT（结构） + PLAN / EXPECTED（任务与模板 After）
```

**不是** Reality / Observed Continuity 权威。

Observed Continuity（F6.2）与 Beat Expected **并行注入**；OC 对象不被 Beat 覆盖，但 **Scene Goal + Beat 堆叠仍可把 Writer 推向 Expected 路径**（Ch2 S3 医院），导致 actual 未结算选择被旁路——与 F6.1 连续性问题同源，F7 归因于 **PLAN/Beat 过指定**，而非 Beat 升格 Reality。

---

## A. Beat source

```text
Planner (intent.scenes)
  → Director buildScenePlan / attachSceneEngines
  → buildSceneExecutionPlan (+ beat-state + beat-library)
  → scene.executionPlan
  → compileStudioWriterPrompt (L3)
  → executeBeatSequence / compileSlimBeatUserPrompt (L4)
  → Writer prose
  → scene.text → Observed Continuity
```

| Source | Role |
|--------|------|
| Authored / Planner scene.goal | PLAN |
| Director scenePlan | PLAN |
| Execution Plan 六拍 | CONSTRAINT |
| LibraryBeat / hint | CONSTRAINT（可含假选择提示） |
| beat-state `afterState` | EXPECTED（模板） |
| Writer | ACTION prose（**不能**改六拍结构） |
| scene.text → OC | OBSERVATION |

**Writer-generated Beat**：**否**（结构锁定）。Writer 仅在 plan 缺口处补具体动作文案。

分类：**EXISTING** · 结构 **APPROPRIATE**（作为 Façade/层次化）· 语义堆叠见下。

---

## B. Beat semantic classification

| Field | Class |
|-------|-------|
| `structuralBeat` / order / mustComplete | CONSTRAINT |
| `content` / `action` / scene.goal | PLAN |
| `choice`（字段） | PLAN / EXPECTED |
| `libraryInstruction` Decision | CONSTRAINT → **FAKE_CHOICE** 风险 |
| `beforeState` / `afterState` | **EXPECTED**（模板链） |
| `targetEmotion` | PLAN / EXPECTED |
| `beatStateDelta` / beat-memory | OBSERVATION heuristic |
| `observedContinuity` | OBSERVATION（F6.2） |

**Expected-as-Actual 风险点**：**EXISTING**

- `beat-state.js`：`afterState: template.afterState`
- `writer-runtime-v2`：rewrite 目标 After 优先 plan after
- `beat-memory`：`**已确立事实**` 标注启发式 newFacts → **PLAN_LEAK**（prompt 措辞）

---

## C. Beat → Choice

- Scene 级 `deriveSceneChoice`：有守卫（不合成假 choice 字段）→ **APPROPRIATE**
- **F7-A FAKE_CHOICE（EXISTING）**：`beat-library` 可把 `Decision` 分给 **goal** 拍；hint「POV 必须在有限选项中做出选择」进 L4  
  - 生产证据：Ch2 **S2 / S3** goal 拍 `libraryBeat: Decision`
- 不等于 L1 Choice Formation；是 **模板戏剧提示**，可制造「假二选一压力」→ **FAKE_CHOICE**

Beat.goal ≠ Choice；Beat.action ≠ Character decision — **概念上正确，注入上偶发混淆**。

---

## D. Beat → Actual Result（Ch2）

| Scene | Beat / Scene Expected | Writer Actual | Class |
|-------|----------------------|---------------|-------|
| S1 | 建立清醒者 / 刷新认知（泛化） | 天台·快跑·笔记本·秒针 | **DEVIATION**（合理文学偏离；结果更具体） |
| S2 | 克服阻碍 / goal 拍 Decision 提示 | 公司证据 + 「跟我走」三十秒 | **DEVIATION** → 实际建立 open_choice |
| S3 | **医院病床 4:00**（Scene Goal） | 开场已在病床刷新 | **MATCH**（跟 Goal） |

偏离 Beat 细节 **不自动失败**（S1/S2）。  
真正问题：S2 actual 的未结算选择 **未** 成为 S3 行动前提 → 见 E。

---

## E. Beat → Observed Continuity

```text
理想: Intent → Beat → Writer → Observed Result → OC → Next Scene
现实: Intent/Beat Expected 与 OC 并行；OC 防 Plan 静默结算；Writer 仍可跟 Scene Goal
```

| Check | Result |
|-------|--------|
| OC 对象被 Beat afterState 覆盖？ | **否** |
| S2 `open_choice_s2` 进入 →S3 OC？ | **是**（F6.2） |
| S3 正文是否结算该选择？ | **否** |
| S3 是否写医院 Goal？ | **是** |

**F7-C RESULT_IGNORED（生产）**：下一场戏剧路径跟 **Scene Goal / Beat 堆叠**，未跟 S2 actual 选择结算。  
OC 注入存在但 **未赢得 Writer 行为** → 与 F6.1 连续；F7 标明 Beat/Plan **过指定竞态**。

分类：**RESULT_IGNORED** + **PLAN_LEAK**（Expected 路径优先于 Actual 选择）

正确方向要求：`Observed Result > Beat Expected` — **尚未在 Writer 行为层保证**。

---

## F. Beat Writer burden

Writer L3/L4 同时可见大量：

Goal · Conflict · Expected After · Emotion · Causal/engines · Hook · Situation · InformationGap · Continuity · OC …

| Mark | Why |
|------|-----|
| **OVER-SPECIFIED** | 六拍强制 + 「不得自由发挥」+ 模板 After + Library Decision |
| **DUPLICATED** | Planner / ScenePlan / Beat content / L3 / L4 重复同一 goal |

层次化（Dramatron 式降载）**意图 APPROPRIATE**；当前实现 **过载**。

---

## G. Existing Beat State / CauseEffect roles

| Module | Role |
|--------|------|
| `evaluateStoryStateChange` | **heuristic validator**（rewrite 硬闸；session only） |
| `evaluateCauseEffect` | **heuristic diagnostic**（soft） |
| `beat-memory` | **heuristic** 拍间 prompt 饲料 |
| `beat-continuity` | **heuristic** 身体/复读闸 |
| `observedContinuity` | **observation projection**（非 Canon） |

名称含 StoryState / CauseEffect **≠** 故事状态权威。  
**EXISTING** · 非 Reality Authority。

---

## H. Real production S1→S2→S3

### S1

```text
Scene Intent: PLAN（建立刷新认知）
Beat: 六拍 CONSTRAINT + PLAN/EXPECTED
Writer: 天台 / 快跑 / 笔记本 / 秒针
Observed Continuity: door_warning, notebook_message, clock_anomaly + unresolved
```

Beat **帮助分段写作**；**未**预先规定快跑纸片 — 结果来自 Writer → OC **正确方向**。

### S2

```text
Scene Intent: PLAN（克服阻碍）
Beat: goal 拍 Library=Decision（FAKE_CHOICE hint）
Writer: 证据对峙 + 「跟我走」三十秒
OC: open_choice_s2, tail_cliff_s2
```

### S3

```text
Scene Intent: PLAN 医院病床
Beat: 执行该 Goal
Writer: 病床刷新（未结算 S2 选择）
OC in: open_choice_s2 仍在；Writer 路径 RESULT_IGNORED
```

产物：`golden/story-architecture/validation-f7/audit.json`

---

## I. Real failures / findings

| ID | Class | Notes |
|----|-------|-------|
| F7-A | **FAKE_CHOICE** | Decision library on goal beat（S2/S3） |
| F7-B | **PLAN_LEAK** | template afterState；beat-memory「已确立事实」 |
| F7-C | **RESULT_IGNORED** | S2 choice vs S3 hospital Goal（行为层） |
| F7-D | **OVER-SPECIFIED** | 六拍+多引擎堆叠 |
| F7-E | **DUPLICATED** | 三层重复 goal |

未发现 Beat 模块自称 Reality Authority（诚实）。  
未改 F1–F6.3。

---

## J. Recommendation（最多 3 · **不实现**）

1. **Decision library 门控**：仅 `structuralBeat === 'choice'`（或显式 authored choice）才注入 Decision hint — 针对 F7-A。  
2. **Expected 标签硬化**：`afterState` / beat-memory newFacts 在 prompt 中强制标为 `EXPECTED / heuristic`，禁止「已确立事实」措辞 — 针对 F7-B。  
3. **OC vs Scene Goal 竞态策略（最小）**：当 `unresolved open_choice` 存在时，下一 Scene Goal 不得在 L4 被表述为「已到达 Goal 结局」；或要求 Writer 先结算/显式偏离 — 针对 F7-C（仍≠ Causality Engine）。

---

## Regression

**PASS**（audit 后跑）：f6.3 · f6.2 · f5 · f4.1 · f4 · f3 · f2 · f1 · phase1-r2 · phase1-sr · eo-d1-final

---

## Final

Beat = **结构约束 + PLAN/EXPECTED 注入**，减轻「整章一次想完」的负担，但当前 **过指定** 且与 Observed Continuity **并行竞态**。  
真实生产仍见 **RESULT_IGNORED / FAKE_CHOICE / PLAN_LEAK**；连续性主失败已由 F6.1 记录，F7 完成归因与边界。

```text
F7 = AUDIT COMPLETE
```

STOP。
