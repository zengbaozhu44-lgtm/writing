# F2 — Final Context Viewer Report

**Date**: 2026-09-07  
**Verdict**: **F2 = PASS**  
**Mode**: READ-ONLY observability · Prompt 语义未改  

---

## Files changed

| File | Role |
|------|------|
| `packages/inkos-studio-server/src/writer-optimization/final-context-viewer.js` | **NEW** — L1–L4 snapshot / hash / load / integrity / read-only contract |
| `packages/inkos-studio-server/src/writer-optimization/index.js` | export |
| `packages/inkos-studio-server/src/studio-llm-writer.js` | 编译后记 L1–L3；`llmFn` 记实际 L4 userPrompt |
| `packages/inkos-studio-server/src/routes.js` | `GET .../final-context`（只读） |
| `packages/inkos-studio/src/api/client.ts` | `getFinalContext` + types |
| `packages/inkos-studio/src/components/drawers/PromptDrawer.tsx` | Final Context Viewer UI |
| `scripts/test-f2-final-context-viewer.js` | Test A–F |
| `package.json` | `test:f2-viewer` |
| `golden/story-architecture/run-validation-f2.js` | 真跑 |
| `golden/story-architecture/validation-f2/` | 产物 |

存储位置（debug artifact，非 Canon）：

```text
novel/_system/studio/writer-optimization/ch_NNNN/final-context/
  scene_XX.json
  scene_XX_L1.md … L4.md
```

---

## Observability

| Layer | Observable |
|-------|------------|
| L1 | present / hash / optional text |
| L2 | present / hash / Clock / IB |
| L3 | present / hash / sealedHash / Clock / IB / full sealed text |
| L4 | present / hash / beatUserPromptHash / Clock / IB / full userPrompt |

---

## Clock / IB visibility

Viewer 与 artifact 均报告：

```text
L3 Clock / IB
L4 Clock / IB
```

---

## Hash integrity

```text
L3.hash == L3.sealedHash
L4.hash == L4.beatUserPromptHash == last writerCall.hash
```

`verifyFinalContextIntegrity` PASS on all production scenes.

---

## Read-only integrity

```text
readOnly: true
writesCanon: false
writesSR: false
path ⊆ writer-optimization/…/final-context
```

不写 01/06/08/11 Canon；不改 SR；不改 Prompt 生成语义。

---

## Regression

| Suite | Result |
|-------|--------|
| `test:f2-viewer` (A–F) | **PASS** |
| `test:f1-survival` | **PASS** |
| `test:phase1-r2` | **PASS** |
| `test:phase1-sr` | **PASS** |
| `test:eo-d1-final` | **PASS** |

---

## Real Production

`凌晨四点世界刷新` · Ch2 · 3 Scenes

| Scene | L3 Clock | L3 IB | L4 Clock | L4 IB | hashMatch |
|-------|----------|-------|----------|-------|-----------|
| S1 | present | present | present | present | true |
| S2 | present | present | present | present | true |
| S3 | present | present | present | present | true |

Studio：PromptDrawer → **Final Context Viewer (F2 · READ-ONLY)**；API `GET /api/books/:id/final-context?chapter=N[&scene=i][&text=1]`。

---

## Remaining failure

```text
None (F2 scope)
```

L1 在 Studio 路径依赖 `scene.dynamic`；若上游未挂 dynamic，L1 可能 absent，不影响 L3/L4（最高优先级已满足）。

---

```text
F2 = PASS
F3+ = NOT STARTED
STOP
```
