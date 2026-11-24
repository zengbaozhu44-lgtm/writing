# Phase 1.R — Pre-change Analysis (read-only)

**Date**: 2026-09-04  
**Mode**: Analysis before fix · Minimal SR remains FROZEN  

---

## 1. R2-A1 / R2-A2 — Writer / Prompt Consumption

### Call chain (actual)

```text
loadBrainContext
  → ctx.characterSR (often Awareness=omit when 06 empty)
RuntimeOrchestrator._runScenesAndChapter
  → buildDynamicPrompt → compileScenePrompt
       → assembleMinimalSR
       → formatCharacterSRForPrompt  → lore「Character Subjective State」
  → buildSceneWritePrompt(ctx, intent, scene, dynamicPrompt)
       → prepends Scene Goal / 冲突 / 章目标  (WORLD / TASK facts)
       → appends lore
  → createLlmWriter
       → optimizeWriterPrompt
       → LLM
```

### Root cause

| Layer | Finding |
|-------|---------|
| Minimal SR | **Correct** — omit when no evidence |
| Prompt | Goal/conflict carry plot facts **above** SR; no hard rule separating World vs Character Knowledge |
| Writer | Treats Goal facts as character-prior knowledge (`亲眼看见` / `确知`) |

**Root files (consumption)**:
- `packages/inkos-brain/src/scene/scene.js` — `buildSceneWritePrompt` (Goal injection)
- `packages/inkos-core/src/lib/minimal-sr.js` — `formatCharacterSRForPrompt` (omit wording)
- `packages/inkos-brain/src/writer/llm-writer.js` — system prompt (no boundary)

**Not root**: `assembleMinimalSR` field model · D1 · L1 · Persistence

### Minimal fix scope (A)

1. Explicit **Information Boundary** block in `buildSceneWritePrompt` (World ≠ Character Knowledge; omit ⇒ no prior-know).  
2. Same rules inside `formatCharacterSRForPrompt` / `formatInformationBoundaryRules`.  
3. One-line reinforcement in Writer **system** message.  

**Do not**: add SR fields · Persistence · Character Brain · Planner/Choice · D1/L1

---

## 2. R2-B1 — Date Plan / State Failure

### Call chain (actual)

```text
08_current_state「时间」= Day 1
09 / scene.goal = no concrete calendar
chapter_plans / prior polished drafts = competing 10月* vs 六月*
world bible = ~2045 only
        ↓
buildSceneWritePrompt (no canonical clock)
        ↓
Writer invents 2045-10-14 then 六月十七
```

### Root cause

No single **story clock** projected into Writer prompt. Continuity block says “time continues” but does not lock a calendar token. Writer invents conflicting month-day systems.

**Root files**:
- `packages/inkos-brain/src/scene/scene.js` — missing clock injection
- `packages/inkos-brain/src/writer/llm-writer.js` — `buildRuntimeContinuationBlock` (generic continuity only)
- Book state: `08` = `Day 1` (operational, not calendar)

**Not SR**: do not add SR time fields.

### Minimal fix scope (B)

1. `resolveStoryClock({ ctx, intent, scene })` — prefer prior-scene calendar hint → intent.time/currentDate → 08「时间」.  
2. Inject **Story Clock** into `buildSceneWritePrompt`.  
3. Lock same clock in `buildRuntimeContinuationBlock` for scene 2+.  
4. If only `Day N`: forbid inventing unrelated 月/日 calendars unless already established in prior scene text.

---

## 3. Modules NOT modified

```text
authority-act.js / operator-proxy / TR-01
D1 sealed docs / L1 Choice Formation
assembleMinimalSR field schema (no new SR slots)
character_brains / Living Evolution / MemoryUnit Canon semantics
Planner / Decision / Conflict / Choice engines
Phase 2 Causality
```

---

## 4. Regression plan

| Test | Purpose |
|------|---------|
| `npm run test:phase1-sr` | SR View still A–H |
| `npm run test:eo-d1-final` | D1 unchanged |
| `npm run test:phase1-r` | A1/A2 boundary in prompt; clock lock; no SR schema growth |
| Round 3 generation | ≥3 scenes on shared path; Case A omit + Case B with ephemeral evidence overlay |

---

## 5. Proceed

Analysis complete → implement A+B minimal Prompt/Context fixes only.
