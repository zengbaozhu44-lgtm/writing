# Phase 1.R2 — Story Clock Consumption · Root Cause Audit

**Date**: 2026-09-04  
**Mode**: READ-ONLY audit first · then minimal fix  

---

## A. Date source map

```text
Story Clock (intent.time / currentDate / 08)
  → buildSceneWritePrompt ## Story Clock
  → Writer prompt (Canonical = 10月27日)
  role: Scene Current Date ✓

disk ch_NNNN_scenes.json (prior scene.text)
  → loadPreviousSceneTexts(bookDir, chapter, index)
  → buildOrLoadSummaries
       ├─ prompt-cache/.../scene_summary.json  (STALE if text changed)
       └─ extractSceneSummary(old text)
  → formatPreviousSummaries → module「前序 Scene」
  → buildContinuationBlock → module「续写」Previous: …
  → Writer prompt
  role: treated as live continuity (WRONG when stale / conflicting)

intent.scenes[].text (in-session, Round 3 new S1 with 10月27日)
  → NOT read by compileScenePrompt today
  → Writer never sees Round3 S1 as prior
```

Other checked sources (R3 prompts):

| Source | Present in S2/S3 prompt? | Role |
|--------|--------------------------|------|
| Story Clock block | Yes · 10月27日 | Current |
| 前序 Scene 摘要 | Yes · **六月十七日** | Polluter |
| 续写 Previous: | Yes · **六月十七日** | Polluter |
| Character bible / world | No competing month-day as “today” | — |
| 08 Day 1 | Overridden by intent clock | — |

---

## B. R3-B1 pollution chain (exact)

```text
books/.../凌晨四点/novel/_system/brain/ch_0002_scenes.json
  Scene1.text (legacy) begins:
  「凌晨四点整。苏晚盯着手机屏幕上的日期——六月十七日。」
        ↓
packages/inkos-prompt/src/compiler.js
  loadPreviousSceneTexts()  // disk only; ignores intent.scenes
        ↓
  buildOrLoadSummaries()
  // reuses prompt-cache/ch_0002/scene_summary.json if entry exists
  // does NOT invalidate when underlying text changed
        ↓
  formatPreviousSummaries → 「### 前序 Scene 摘要」…六月十七日
  buildContinuationBlock  → 「Previous: …六月十七日」(priority 95)
        ↓
Writer prefers concrete Previous/摘要 narrative over Story Clock rule
        ↓
Scene2/3 prose = 六月十七日
```

**Why Round 3 S1 used 10月 but S2/S3 used 六月:**

- S1 had no「前序摘要」pollution → followed Story Clock.  
- S2+ loaded **legacy disk Scene1**, not the newly generated Round 3 Scene1 (saved only under `validation-round3/`, not book brain).  
- Even in production, **stale `scene_summary.json`** can keep 六月 after a rewrite until cache invalidates.

This is **Context Consumption / Summary Cache**, not SR Gap.

---

## C. Source Precedence (binding for fix)

```text
Scene Current Date     = Story Clock Canonical
Historical Date        = dates inside prior prose/summary (may remain as history)
Referenced Date        = characters citing past days

When conflict:
  Story Clock Canonical
    ≫
  前序摘要 / Previous / old continuity as “today”
```

Do **not** delete historical context.  
Do **label** and **prefer** Current Clock; invalidate stale summary when source text changes; prefer in-session `intent.scenes` texts when present.

---

## D. Minimal fix plan

| File | Function | Purpose |
|------|----------|---------|
| `packages/inkos-prompt/src/compiler.js` | `resolvePreviousScenes` / `loadPreviousSceneTexts` usage | Prefer `ctx.intent.scenes` texts over disk when available |
| `packages/inkos-prompt/src/compiler.js` | `buildOrLoadSummaries` | Rebuild summary when source text hash ≠ cached |
| `packages/inkos-prompt/src/scene-summary.js` | `formatPreviousSummaries`, `buildContinuationBlock` | Role label: historical continuity; not current calendar |
| `packages/inkos-core/src/lib/story-clock.js` | `annotateConflictingDates` (small) | Flag summary dates ≠ Canonical as non-current |
| `scripts/test-phase1-r2.js` | new | R3-B1 regression: clock wins over polluted prev summary |
| Round 4 harness | observation | ≥3 scenes; verify no 六月 as current when clock=10月 |

**Will not touch:** Minimal SR schema · D1 · L1 · Persistence · Planner · full Prompt Compiler rewrite · delete all summaries
