# F1 — Final Prompt Survival Report

**Date**: 2026-09-07  
**Verdict**: **F1 = PASS**  
**Scope**: Clock + Information Boundary survival L2→L3→L4 only  
**Not authorized**: F2–F5 · SR · D1 · Plan→Reality  

---

## Implementation

### Files changed

| File | Why |
|------|-----|
| `packages/inkos-core/src/lib/prompt-survival.js` | **NEW** — extract/build Semantic Protected Context；Historical prior wrap；survival predicates |
| `packages/inkos-runtime/src/compiler/prompt-compiler.js` | Clock+IB → **P1** absolute protection；`filterLore` alwaysKeep；P3 prior/continuation Historical demotion |
| `packages/inkos-studio-server/src/studio-llm-writer.js` | **mustRecompile** → `buildSceneWritePrompt(compileScenePrompt(...))`，禁止裸 L1 |
| `packages/inkos-studio-server/src/writer-optimization/compile-writer-prompt.js` | priorExcerpt / continuation Historical wrap at assemble |
| `packages/inkos-studio-server/src/writer-optimization/beat-slimmer.js` | Beat userPrompt 注入 protected block；PROTECT_RE + clip 回补 F1 |
| `scripts/test-f1-prompt-survival.js` | Test A–E |
| `package.json` | `test:f1-survival` |
| `golden/story-architecture/run-validation-f1.js` | 真实路径 ≥3 Scene |
| `golden/story-architecture/validation-f1/` | 产物 |

未改：Minimal SR · D1 · Canon · Memory · State Authority · Writer 语义责任。

---

## Regression

| Suite | Result |
|-------|--------|
| `test:f1-survival` (A–E) | **PASS** |
| `test:phase1-r2` | **PASS** |
| `test:phase1-sr` | **PASS** |
| `test:eo-d1-final` | **PASS** |

| Check | Result |
|-------|--------|
| L2 Clock / IB | present |
| L3 Clock / IB (P1) | present |
| L4 Clock / IB | present |
| mustRecompile | **PASS**（full L2 path） |
| Beat slimming | **PASS** |
| P3 Historical precedence | **PASS** |

---

## Real Production (`validation-f1/`)

Clock lock = **10月27日** · book = 凌晨四点世界刷新 · Ch2 · 3 Scenes

| Scene | L2 c/ib | L3 c/ib | L4 c/ib | 正文六月 | 正文十月族 |
|-------|---------|---------|---------|----------|------------|
| 1 进入局面 | ✓/✓ | ✓/✓ | ✓/✓ | 无 | 相对日/未强制写出十月（无六月回退） |
| 2 受阻与博弈 | ✓/✓ | ✓/✓ | ✓/✓ | 无 | 有 |
| 3 转折与代价 | ✓/✓ | ✓/✓ | ✓/✓ | 无 | 有 |

```text
allSurvive = true
noJuneCurrent = true
F1 = PASS
```

---

## Remaining failure

```text
None for F1 scope.
```

Scene 1 未强制写出「10月」字样属文风选择；L4 Canonical 仍在；未回退六月。  
若后续要「正文必须显式月日」，属 Writer 风格约束，非 F1 survival。

**Root cause (pre-fix, closed):**

```text
Clock/IB 仅在可裁 P2 lore
→ filterLore / Beat slim / mustRecompile 裸 L1
→ 最终 userPrompt 丢失或败给 raw Historical excerpt
```

**Fix:**

```text
Semantic Protected → P1 (+ Beat PROTECT)
mustRecompile → buildSceneWritePrompt
P3 prior → Historical Continuity（保留文本，降优先级）
```

---

## STOP

```text
F1 = PASS
F2/F3/F4/F5 = NOT STARTED
Minimal SR = FROZEN
Phase 2 = NOT AUTHORIZED
```
