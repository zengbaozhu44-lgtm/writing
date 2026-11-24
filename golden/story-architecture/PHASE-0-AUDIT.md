# Phase 0 — Story-Centered Architecture Read-only Audit

**Status**: COMPLETE (read-only)  
**Date**: 2026-09-04  
**Mode**: NO production code changes · STOP pending Phase 1 authorization  

**Frozen constraints**: D1 Milestone FROZEN_STOP · L1 Choice Formation frozen · Reader Model = research-only  

---

## 0. One-sentence answer (Minimal SR mount)

> **Minimal SR 应挂在 `loadBrainContext` → `ctx` → `compileScenePrompt` 这条共享读链上，作为 per-character 投影字段进入 Writer lore；不要挂在 Studio `character_brains`，也不要挂在 Director `situation.characterState`  alone。**

理由：这是 CLI Runtime 与 Studio Writer **共同**走过的唯一角色上下文入口；改动面最小，且不新增第三条状态写轨。

**Phase 0 human corrections (binding for Phase 1)**:

```text
03 Bible → Motive Seed / long-term context only
         ↛ automatic current Motive

Current Validity → Phase 1 = projection flag only (default current)
         ↛ cross-scene SR persistence / sidecar
```

---

## 1. 真实数据流（生产）

### 1.1 两条 Writer 路径

```text
CLI:  inkos runtime run / brain run
  → RuntimeOrchestrator._runChapter
  → loadBrainContext
  → plan / Decision / Conflict
  → buildScenePlan
  → [per scene]
       buildDynamicPrompt → compileScenePrompt(ctx, scene)   ← lore seed
       buildSceneWritePrompt
       createLlmWriter → scene.text
  → persistScenes → assembleChapter → MemoryUnit.commit

Studio: same Orchestrator + hooks
  → sceneLifecycleHook('plan')
       Director / BeatPlan / Situation / StoryMemory
  → createStudioLlmWriter
       lore + PromptCompiler.compile() (P1 Narrative Task)
  → scene.text → (deferCommit) → accept → MemoryUnit.commit
```

| 路径 | Scene Director / Beat / Situation | `compileScenePrompt` lore | 密封 `PromptCompiler.compile` |
|------|----------------------------------|---------------------------|-------------------------------|
| CLI 裸 Runtime | **否** | **是** | **否** |
| Studio Console | **是** | **是**（再加厚） | **是** |

**Writer 不规划。** Replan 在 Orchestrator / Decision / Conflict。

### 1.2 Canon 写链（单一名义入口）

```text
MemoryUnit.commit
  → chapters / states/ch_*.json / anchor.yaml
  → applyStateDiffToCanon → applyPostChapter
       08, 11 (events=[]), 12?, 13 (facts=[]), 15?, 09
```

### 1.3 第二写轨（已存在风险）

| 轨 | 内容 | 文件 |
|----|------|------|
| A Runtime Canon | 08 表 / timeline / foreshadow | `novel/08…15` |
| B Anchor 启发式 | `relationship_state` | `states/ch_*_anchor.yaml` |
| C Studio Living | trust/fear 数值脑 | `_system/character_brains/*.yaml` + `world_state.yaml` |
| D 09 注入 | Living Intelligence 文本块 | `09_current_chapter.md` |
| E Story Memory/Thread | 分析 / writerBlock | `_system/studio/story-*` |

**Phase 1 不得再开 F 轨。**

---

## 2. 现有「人物相关」结构（无统一 Character State）

| 结构 | 磁盘 / 位置 | 进 CLI Writer | 进 Studio Writer | 与 Minimal SR 的贴合度 |
|------|-------------|----------------|------------------|------------------------|
| Character bible | `03_character_bible/*.md` → `ctx.characters` | 是（raw） | 是 | **Long-term context / Motive Seed only** — 不得自动成为当前 Motive |
| 08 Current State | `08_current_state.md` | 是 | 是 | 全书此刻表（POV/地点/时间）；**非** per-character SR |
| Knowledge matrix | `06_knowledge_matrix.yaml` | 是（ranked） | 是 | **Awareness 最近邻**（know/partial/unknown） |
| Relationship graph | `05_relationship_graph.yaml` | TopK | TopK | Affect/Relationship **边**；Runtime commit **不写** |
| Anchor relationship | `states/ch_*_anchor.yaml` | 间接（Planner） | 间接 | ops hint（EO-P4）；≠ SR truth |
| Director situation.characterState | 内存 before/after 字符串 | **否** | 是 | 场景变化轴；常 missing；≠ SR 五元组 |
| Character Desire | Director engine | **否** | 是 | 接近 Motive，但缺 provenance / Stance |
| **character_brains** | `_system/character_brains/*.yaml` | **否**（仅经 09 文本） | 间接 | LLM 数值量表；**违反** Evidence-grounded / 禁止猜心理 |

**结论：今天没有 `CharacterState` / Minimal SR 权威对象。**

---

## 3. 11 个设计 → 挂载点 / 处置

| # | 设计 | 现有挂载 | 处置 |
|---|------|----------|------|
| 1 | Scene Causality | Beat Plan / Situation / state-updater | **REUSE** + Phase 2 硬化 gap（已有 choice≠goal） |
| 2 | Character Agency | L1 + Scene Director + Beat | **REUSE**；接 Minimal SR → Access+Agency |
| 3 | Progressive Complications | Planner / Director / Story Thread | **LIGHT ADD** 诊断（Phase 5） |
| 4 | Opposing Wants | Motive + Conflict + relationship | **LIGHT ADD**（Phase 3；靠 SR.Motive） |
| 5 | Information Asymmetry | 06 knowledge + loadBrainContext | **REUSE 06 + LIGHT ADD** Reality≠Awareness 投影 |
| 6 | Uncertainty | — | **LIGHT ADD** → SR.Stance enum |
| 7 | Plant→Payoff | foreshadow + story-memory + thread | **REUSE**（Phase 6） |
| 8 | Character Change | StoryState fragments / arc / thread | **REUSE**；只记录发生的变化 |
| 9 | Scene/Sequel Rhythm | Director / Review | **LIGHT ADD** 诊断；不改主 pipeline |
| 10 | Subtext | Writer craft / prompt | **NOT Engine**；Prompt 层 |
| 11 | Failed Action | Choice→Consequence 自然产生 | **NOT Engine** |

**NOT WORTH IMPLEMENTING as new engines：** Causality / Relationship Conflict / Plant-Payoff / Failure / Persistence / Meta-cognition / Reader Model / 概率推理。

---

## 4. Minimal SR — 推荐挂载（Phase 1 决策建议）

### 4.1 读路径（必须）

```text
evidence sources (existing)
  ├─ 03 bible          → Motive seeds (publicGoal/fear) [static]
  ├─ 06 knowledge      → Awareness (know|partial|unknown)
  ├─ 05 relationships  → Affect/Relationship edges
  ├─ authored scene / plan fields (if present) → Stance / Motive overrides
  └─ omit if no evidence → unknown
        ↓
  assembleMinimalSR(ctx, scene)     ← NEW thin projector (Phase 1)
        ↓
  ctx.characterSR[name] = {
    awareness[], stance[], motive[], affect[], validity,
    provenance[]
  }
        ↓
  compileScenePrompt                  ← BOTH CLI + Studio
        ↓
  Writer lore module「人物主观状态」
```

可选（Studio only，**消费同一对象，不另写**）：

```text
ctx.characterSR → Director desire / situation before（只读透传）
```

### 4.2 明确不挂

| 候选 | 拒绝原因 |
|------|----------|
| `character_brains` | Studio 第二轨；数值猜心理；CLI 不读；易成第三条写轨 |
| 仅 Director situation | CLI 路径拿不到；before/after 常推断/missing |
| 仅 08 | 非 character-specific cognition |
| 新建 Cognitive DB / Persistence Engine | 违反批准的 Minimal SR 边界 |
| 经 commit 写 11/13 为 SR | D1 禁止（Persistence ≠ obtains；SR ≠ Authority） |

### 4.3 写路径（Phase 1 — human binding）

**Phase 1 = 纯投影，零跨 Scene SR 写入。**  
不建 sidecar；不经 MemoryUnit writeback。  
Validity 默认 `current`；仅当已有数据明确 past/changed/uncertain 时反映。  
若实测 Writer 因缺跨 Scene SR 而稳定写歪 → 另开具名 Phase 1.1 申请，不得在 Phase 1 偷做。

---

## 5. 若进入 Phase 1 — 预计修改文件

| 文件 | 职责 |
|------|------|
| `packages/inkos-core/src/lib/minimal-sr.js`（新） | 投影器：证据 → SR 五元组 + provenance；无 LLM |
| `packages/inkos-brain/src/loader.js` | `loadBrainContext` 附加 `characterSR`（或懒组装钩） |
| `packages/inkos-prompt/src/compiler.js` | lore 增加「人物主观状态」模块；缺证据则 omit |
| `packages/inkos-brain/src/prompt/dynamic-prompt.js` | 薄透传（若需） |
| 测试 `scripts/test-phase1-minimal-sr.js` | 无证据→unknown；禁止 LLM 补全；D1/L1 不变量 |

### 不动（Phase 1）

```text
authority-act.js / operator-proxy / TR-01
D1 sealed docs / EO-P*
applyPostChapter Reality-like 11/13 语义
L1 Choice Formation 定义
character_brains / Living Evolution 写逻辑（不扩）
Reader Model
新 Engine 包
Writer Optimizer 必跑逻辑
Beat Plan hardening（已有；Phase 2 再碰 Causality）
```

---

## 6. 风险

| 风险 | 严重度 | 说明 |
|------|--------|------|
| Studio / CLI 双路径不一致 | 高 | SR 只进 Director → CLI 永久缺失 |
| character_brains 被当成 SR | 高 | 违反 Evidence-grounded；双轨加剧 |
| LLM 补全 Stance/Motive | 高 | 明确禁止 |
| SR → obtains / Reality | 高 | D1：Character ≠ Authority Subject |
| 第三条写轨 | 高 | Living + Runtime + SR 并行 |
| Goal → Choice 回潮 | 中 | Phase 2；已有 hardening 勿拆 |
| 06 空矩阵 → 全 unknown | 中 | 正确行为；勿用 LLM 填 |
| bible「真实目标」冒充当前 Motive | 中 | 静态档 ≠ Current；需 provenance 标记 |

---

## 7. 测试计划（Phase 0 不跑改码；Phase 1 预案）

1. **装配：** 有 06 行 → Awareness；无 → unknown/omit  
2. **无 LLM：** projector 纯函数；fixture 无网络  
3. **双路径：** CLI `compileScenePrompt` 与 Studio lore 均含同一 SR 块（或同等 omit）  
4. **边界：** SR 字段不得进入 `sourceProducesObtains`；不得写 11/13  
5. **回归：** `test:eo-d1-final` / `test:reality-golden` / story-route 仍绿  
6. **负例：** 禁止 Goal 复制为 Choice（既有 beat hardening 仍 PASS）

---

## 8. STOP

```text
Phase 0 = COMPLETE / APPROVED
Phase 1 = ACCEPTED / FROZEN
NO Phase 1.1 · NO auto Phase 2
Next = Phase 1 Story Validation (observation only)
Production SR code = frozen mirror on shared compile path
```
