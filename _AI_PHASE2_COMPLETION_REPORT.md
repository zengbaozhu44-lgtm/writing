# PHASE 2 COMPLETION REPORT

**Phase:** State Evolution Engine（最小 WRAP）  
**Date:** 2026-09-08  
**Gate process:** Audit → Design → Minimal impl → Test → Failure replay → Freeze

---

## 1. Changed Files

| File | Change |
|------|--------|
| `_AI_STATE_WRITE_AUDIT.md` | **新增** Step 2.1 写路径审计 |
| `_AI_STATE_EVOLUTION_DESIGN.md` | **新增** Step 2.2 设计冻结 |
| `packages/inkos-brain/src/memory/state-evolution-engine.js` | **新增** `evolveFromChapter` / Actual→timeline 映射 |
| `packages/inkos-brain/src/index.js` | 导出 Evolution API |
| `packages/inkos-runtime/src/memory/memory-unit.js` | `buildStateDiff` → Evolution；states 落盘 evolution/provenance |
| `scripts/test-state-evolution.js` | **新增** 回归 |
| `package.json` | `test:state-evolution`（若尚未存在则已对齐） |

---

## 2. Architecture Change

```
BEFORE:
  chapter-pipeline → buildStateDiff → buildStateDelta
    timeline.events = [] (EO-P2)
    actualEvents 未消费

AFTER (Phase 2 freeze):
  chapter-pipeline → buildStateDiff → evolveFromChapter
    operational shell = buildStateDelta (仍 EO-P2 空 Plan 路径)
    timeline.events = Actual Event 派生句（isActualTimelineEvent 过滤）
    evolution + provenance 写入 StateDiff / states JSON
    facts 仍 []
    writeCharacterBrain 仍不调用
```

**冻结边界：**

- Canon timeline **只**接受 `scene.actualEvents` 派生；Plan/modelled **永不**回填。  
- `resolveTimelineEvents` / 直接 `buildStateDelta` 的 Plan 路径保持 `[]`。  
- Living / CLI `applyPostChapter` 旁路仍为 **residual**（未在本步 BLOCK）。  
- Director Plan bridge 未动（Phase 7）。

---

## 3. Tests Added

- `scripts/test-state-evolution.js`（Cases A–E）

---

## 4. Test Result

```
npm run test:state-evolution       → PASS
npm run test:s6-1-timeline-events  → PASS（EO-P2 未回退）
npm run test:event-foundation      → PASS
npm run test:reality-golden        → OK
```

（需 Node ≥20。）

---

## 5. Failure Replay

| Case | 结果 |
|------|------|
| **Plan override → 伪 timeline** | EO-P2 + Evolution 双闸：Plan 字段不进 events — **仍挡住** |
| **Actual 不驱动世界** | Actual → `timeline.events` + `evolution.*` — **部分修复**（11 可写；08 仍 intent 元数据；人物 brain 未写） |
| **Ch2 S3 Choice disappearance** | open_loop 进 `evolution.openLoops`；**仍不能阻止跳走**（Phase 6） |
| **Living 旁路** | `writeWorldState` / `writeCharacterBrain` — **仍存在** |

---

## 6. Remaining Risks

1. Living / CLI / `writeModule` 仍可绕过 Evolution 写平行状态。  
2. `timeline.events` 句式仍偏 excerpt；文学质量非本步目标。  
3. `facts=[]`；13_facts 未接 Actual。  
4. Character hints 未进 SR / bible（Phase 3）。  
5. 成功标准里的符号名 `writeTimeline` 等仍不存在 — 验收以真实符号清单为准（见 Audit）。

---

## 7. Can Enter Next Phase?

**YES** — 进入 **Phase 3: Minimal SR Runtime**（先设计 CharacterSR，禁止扩心理模拟）。

**Phase 2 冻结声明：**

> State Evolution 已成为 `buildStateDiff` 的唯一语义构造入口；  
> Actual Events 可驱动 Canon `timeline.events` 并带 provenance。  
> 「所有写路径仅 Evolution」**尚未**达成（Living/CLI residual）— 不得宣称 State Survival 完成。  
> 扩大 BLOCK 旁路或接 facts/character brain = 新 EO，不得无审计塞进本冻结。

---

## Acceptance vs Roadmap

| Roadmap 验收 | 状态 |
|--------------|------|
| 统一 state-updater / Evolution 入口（章 commit 路径） | **PASS（WRAP）** |
| Actual → State Evolution → timeline | **PASS** |
| 所有 mutation 有 provenance（经 Evolution 的 diff） | **PASS** |
| 禁止其它模块直写 timeline/character/memory | **PARTIAL**（主链收口；旁路 residual） |
| 删 Plan → 世界状态从 Actual 恢复（timeline 级） | **PASS（标签/事件句）** |
| Character / SR 写入 | **NO**（Phase 3） |
