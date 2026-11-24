# F3 — Context Provenance Trace Report

**Date**: 2026-09-07  
**Verdict**: **F3 = PASS**  
**Mode**: Observability / Diagnostic Trace · Prompt 语义未改  

---

## Implementation

| File | Why |
|------|-----|
| `packages/inkos-studio-server/src/writer-optimization/context-provenance.js` | Trace builder：`key/type/source/priority/kept/reason/layers` |
| `packages/inkos-studio-server/src/writer-optimization/final-context-viewer.js` | 编译/Writer 调用时写入 provenance（复用 F2 artifact） |
| `packages/inkos-studio-server/src/studio-llm-writer.js` | 传入 intent/ctx/l1Modules（已接线） |
| `packages/inkos-studio/src/components/drawers/PromptDrawer.tsx` | **Context Provenance** 只读区 |
| `scripts/test-f3-provenance.js` | Test A–G |
| `package.json` | `test:f3-provenance` |
| `golden/story-architecture/run-validation-f3.js` | 真跑 |
| `golden/story-architecture/validation-f3/` | 产物 |

存储（debug only）：

```text
…/writer-optimization/ch_NNNN/final-context/
  scene_XX.json              (+ provenance)
  scene_XX_provenance.json
```

---

## Trace Schema

```text
fields: key, type, source, priority, kept, reason, layers
types:  canon | projection | plan | sr | historical | temporary | guard | derived | unavailable
priority: P0 | P1 | P2 | P3
kept: final Writer L4（若有）否则 sealed L3
```

Tracked keys（非全 token）：

`story_clock` · `information_boundary` · `character_sr` · `prior_excerpt` · `prev_summary` · `chapter_goal` · `scene_goal` · `causal_chain` · `character_context` · `knowledge`

---

## Layer Coverage

| Layer | How |
|-------|-----|
| L1 | compileScenePrompt text + modules keys |
| L2 | buildSceneWritePrompt |
| L3 | sealed compile |
| L4 | actual Beat userPrompt |

Presence: `present` / `absent` / `trimmed` / `unavailable`

---

## F2 Integration

PromptDrawer → Final Context Viewer → **Context Provenance (F3 · diagnostic)**  
显示每块的 source / type / priority / kept / reason / L1–L4。  
不重做 Viewer；不编辑 Prompt。

---

## Regression

| Suite | Result |
|-------|--------|
| `test:f3-provenance` | **PASS** |
| `test:f2-viewer` | **PASS** |
| `test:f1-survival` | **PASS** |
| `test:phase1-r2` | **PASS** |
| `test:phase1-sr` | **PASS** |
| `test:eo-d1-final` | **PASS** |

---

## Real Production

`凌晨四点世界刷新` · Ch2 · 3 Scenes

| Scene | story_clock | IB | prior type | June demotion explained | body 六月 |
|-------|-------------|-----|------------|-------------------------|-----------|
| S1 | source=`intent.time` type=plan P1 kept L2–L4 | guard P1 kept | historical | yes | none |
| S2 | same | same | historical | yes | none |
| S3 | same | same | historical | yes | none |

解释力：

```text
Story Clock  = intent.time → plan → P1 → semantic_protected → L4 kept
六月 prior   = historical → P3 → historical_continuity → 不得覆盖 Canonical
```

---

## Remaining Gaps

1. 非优先模块（部分 faction / timeline 行）可能 `unavailable` — 故意不全量追踪。  
2. L1 modules 依赖 `scene.dynamic.modules`；缺失时用文本探测，宁可 `unavailable` 不伪造。  
3. `causal_chain` 双通道标为 `intentional_projection` — F3 不重构 Prompt。  
4. Beat slim 后部分 P2 块 L4=`trimmed`/`absent` — reason=`budget_trim`，≠ 事实不存在。

---

## Verdict

```text
F3 = PASS

1. 关键 Blocks 有可靠 provenance
2. source 可定位
3. L2/L3/L4 survival 可观察
4. trim/priority 可解释
5. F2 Viewer 可看
6. 无新 State/Canon/Memory/SR
7. Prompt 语义未改
8. 回归全过
9. 真跑 3 Scene 过
```

```text
F4+ = NOT STARTED
STOP
```
