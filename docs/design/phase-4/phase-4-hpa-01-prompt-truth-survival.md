# HPA-01 — Plan–Actual Prompt Truth Survival

```text
MODE: MINIMAL IMPLEMENTATION (approved Human Gate HPA-01)
SCOPE: Truth-preserving prompt compression only
NOT: Actual>Plan · Choice · Survival · F8.3 rewrite · Plan deletion
```

---

## 1. Archaeology

```text
compileSlimBeatUserPrompt
  → formatActualEventsBlock (Actual/WCT part)
  → sceneGoalLine / Beat / F1 / …
  → clipBeatPromptToBudget(parts, BEAT_PROMPT_CHAR_BUDGET=1400)
       · soft trunc lore/map/章目标
       · mid-clip head+tail (can truncate Actual mid-block)
       · last-resort rebuild from PROTECT_RE parts
  → Writer
```

**Loss point:** `PROTECT_RE` + last-resort kept `Scene explicit goal` / Beat / F1 / OC, but **not** verbose `Previous Scene Occurrence Events` / Proven WCT → tight budget dropped Story Truth while Plan survived.

---

## 2. Root Cause

Compression treated verbose Actual as disposable mid-body text. Last-resort compact package omitted Actual/WCT entirely. Not an authority ranking bug — a **presentation survival** gap.

---

## 3. Minimal Fix

| File | Change |
|------|--------|
| `actual-events-prompt.js` | `compactActualTruthForBudget` + `promptPreservesActualTruth` (presentation-only extract; no fabricate) |
| `beat-slimmer.js` `clipBeatPromptToBudget` | Over budget → compact Actual/WCT in-place; protect **compact** markers only; reserve truth in last-resort; reinject if lost; force last-resort if Beat/truth dropped by mid-clip |
| `beat-slimmer.js` `compileSlimBeatUserPrompt` | Align Runtime chapter-seam: Scene1 / empty same-chapter → `loadPriorChapterScenesForActual` |
| null-safe | `scene?.planValidity` when scene omitted |
| tests | `test-hpa-01-prompt-truth-survival.js`; chapter-seam §7 Studio Beat; beat-slimmer assertion align |

**Not done:** whole verbose Actual forced into PROTECT_RE; Plan deletion; F8.3 change; WCT grounding relax; Choice/Survival.

---

## 4. Truth Preservation Matrix

| Budget | Actual | WCT | Plan | Beat |
| ------ | ------ | --- | ---- | ---- |
| large (12000) | PASS | PASS | PASS | PASS |
| medium (2800) | PASS | PASS | PASS | PASS |
| 1400 | PASS | PASS | PASS | PASS |
| 700 | PASS | PASS | PASS | PASS |
| 500 | PASS | PASS | PASS | PASS |

Tests A–G + negatives PASS (`npm run test:hpa-01-prompt-truth-survival`).

---

## 5. Authority Safety

```text
No Actual mutation
No WCT fabrication (absent → no compact WCT)
No Plan→Actual / Plan→WCT
No SR / State / Choice / Survival changes
Plan / Goal / Beat may coexist with Truth
```

---

## 6. Regression

| Suite | Result |
|-------|--------|
| HPA-01 | PASS |
| F1 survival | PASS |
| F8.3 | PASS |
| event foundation | PASS |
| EO-P4 causal / CA / WCT / consumption | PASS |
| chapter seam (+ Studio Beat §7) | PASS |
| state→writer audit | PASS |
| authored CADE channel/production | PASS |
| beat-slimmer | PASS |
| attribution S3 | PASS |

---

## 7. Route Rescan

**HPA-01 closed.** Soft Plan+Actual coexistence when both present = **known soft risk**, not hard STOP (Writer adjudication still out of scope).

**Follow-on wiring done this round:** Studio Beat chapter-seam Actual/WCT inject (aligned to Runtime `compileScenePrompt`).

**Next first real attention (not opened):** when both Truth + conflicting Plan survive in Writer input, F8.3 does not demote generic leave/stay — **soft risk only**. Do **not** invent Actual>Plan. Do **not** open Choice/Survival.

Safe continue: production observation of Writer obedience under coexistence, or scan for other silent drops — without new authority ontology.
