# Phase 1.R2 — Pre-change Audit (R3-B1)

**Date**: 2026-09-04  

---

## A. Date source map

```text
Story Clock (intent.time / currentDate / 08)
  → buildSceneWritePrompt 「Story Clock Canonical」
  → Writer Prompt

Legacy ch_0002_scenes.json Scene1（六月十七日）
  → loadPreviousSceneTexts
  → buildOrLoadSummaries / scene_summary.json
  → formatPreviousSummaries / buildContinuationBlock（曾未传 clock）
  → 「前序 Scene」「Previous」
  → Writer

Studio/Runtime：整章结束才 persistScenes + 曾未挂 ctx.intent
  → 中途编译只能打到磁盘旧稿
```

---

## B. Pollution chain

```text
disk legacy 六月
→ loadPreviousSceneTexts（未走 resolvePreviousScenes）
→ unlabeled Previous
→ Writer 六月 as today
```

---

## C. Precedence

```text
Scene Current Date = Story Clock Canonical
Historical Date    = prior summary / disk（≠ 今天）
Referenced Date    = 引用过去事件
```

---

## D. Minimal fix

| File | Change |
|------|--------|
| `compiler.js` | `resolvePreviousScenes` + pass clock + hash |
| `scene-summary.js` | (already clock-aware; call sites fixed) |
| Runtime + Studio orchestrator | `ctx.intent = intent` before compile |
| `test-phase1-r2-clock.js` | R3-B1 regression |

See `PHASE-1-R2-REPORT.md` for post-fix validation.
