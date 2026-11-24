# Phase 4 — State → Next Scene → Writer Causal Consumption Audit

```text
MODE: PRODUCTION-ROUTE AUDIT (+ one minimal Studio wiring fix)
UPSTREAM: Character Action / WCT bridges exist; Choice NOT PROVEN; Survival FUTURE
CODE: Studio Living path aligned to Runtime WCT attach (only)
```

---

## 1. 真实生产链（call chain）

### Scene N（Runtime Orchestrator）

```text
StudioRuntimeOrchestrator / RuntimeOrchestrator._runScenesAndChapter
  → activeWriter / createStudioLlmWriter
  → executeBeatSequence → scene.text
  → ensureActualEvents(scene)
  → attachCharacterActionTruth(scene)          // Intent + matching occurrence
  → attachWorldConsequenceTruth(scene)         // Character Action + grounded W
                                                 // ★ Studio 此前缺失；本轮已对齐 Runtime
  → applyCharacterSRAfterActual
  → applyAttributionAfterActual (soft)
  → intent.scenes[i] copy (actualEvents, CA, WCT, SR…)
  → persistScenes → ch_NNNN_scenes.json
```

### Chapter end → State

```text
runChapterPipeline
  → buildStateDiff → evolveFromChapter
       · collectActualEventsFromScenes → timeline / worldHints(from stateChanges)
       · collectWorldConsequencesFromScenes → evolution.worldConsequences
         + worldHints `wct:…` (consume-only; absent → empty)
  → MemoryUnit.commit → states blob (+ canonDelta timeline Actual-only)
```

**Note:** `08_current_state.md` / `currentStateMd` is **not** rewritten from `evolution.worldConsequences`.  
WCT→State is recorded in **evolution JSON**, not as the primary N+1 Writer state table.

### Scene N+1 → Writer

```text
compileScenePrompt / beat-slimmer (Beat1)
  → resolvePreviousScenes(intent.scenes)           // same chapter
    OR loadPriorChapterScenesForActual(ch_scenes) // chapter seam
  → collectPreviousActualEvents(prev)
       · actualEvents (occurrence readback)
       · worldConsequenceTruth asserted → worldConsequences[]
  → formatActualEventsBlock
       · ### Previous Scene Occurrence Events
       · ### Proven World Consequences   (only if WCT asserted)
  → prompt module key `actual_events` (priority ~91)
  → (+ Plan Validity demotion block if F8.3 INVALID)
  → (+ scene.goal / mainGoal as STORY CONTROL — still present)
  → Writer
```

---

## 2. State 消费证明

| Step | Where | What |
|------|-------|------|
| Produce CA | `attachCharacterActionTruth` | `scene.characterActionTruth` |
| Produce WCT | `attachWorldConsequenceTruth` | `scene.worldConsequenceTruth` |
| Persist scenes | `persistScenes` / intent.scenes copy | JSON on disk + in-session |
| State Evolution | `evolveFromChapter` | `evolution.worldConsequences`, `worldHints` `wct:…` |
| Canon table | `applyStateDiffToCanon` / `08_current_state` | **Does not ingest WCT as table rows** |
| N+1 read | `collectPreviousActualEvents` | Reads **scene** Actual + WCT, not evolution JSON |
| Writer sees | `formatActualEventsBlock` | Occurrence + optional Proven World Consequences |

**Conclusion:** The **live** N+1 causal fuel is **Actual/WCT scene readback**, not `currentStateMd`.  
State Evolution **does** consume WCT into evolution records (not a pure dead-end), but Writer continuity for same/next scene does **not** depend on that blob.

---

## 3. Plan 覆盖审计

| Finding | Detail |
|---------|--------|
| Plan/Beat consequence | STORY CONTROL only |
| F8.3 | Demotes **opening execution privilege** when Plan conflicts with Actual/OC; keeps strategic Goal |
| Prompt soft rule | Actual block:「不得用 Plan 覆盖」Occurrence |
| Hard authority | **No** hard delete of `scene.goal` / `mainGoal` from Writer input |
| Conflict shape | Actual/WCT can say X; Plan can still say ¬X in goal lines |

```text
Authority situation:
  Actual/WCT readback = continuity fuel (high priority module)
  Plan goal = still present as CURRENT INTENT / 章目标
  Priority = soft (prompt + F8.3 demotion), not sealed hard Story Truth ranking
```

This is a **known soft conflict**, not newly invented. Not fixed this round (would need Human semantic gate if treated as hard STOP-3). Continuity path exists; Plan laundering is constrained but not eliminated.

---

## 4. 最小确定性实验

Script: `scripts/test-state-next-scene-writer-consumption-audit.js`

```text
N with X (CA+WCT asserted, grounded aftermath)
vs
N without X (no CA/WCT)
```

| Check | Result |
|-------|--------|
| N+1 `formatActualEventsBlock` differs | YES |
| with X includes Proven World Consequences + W | YES |
| without X has no Proven section | YES |
| `evolveFromChapter` worldConsequences differs | YES |
| Studio source wires `attachWorldConsequenceTruth` | YES (after fix) |

---

## 5. 文学验证（结构层）

With grounded aftermath on the same occurrence chain:

> Scene N: 林夜推开铁门 → 警报/熄灯（W）  
> Scene N+1 Writer input: must see Occurrence + 「已发生的世界变化: …警报…」

Without X: N+1 does not receive that W block.  

Whether the LLM **obeys** vs Plan ¬X is still soft (see §3) — structure delivers the changed world; absolute Plan override is not hard-blocked.

---

## 6. Blocker 判定

### Discovered production gap (fixed this round)

```text
Studio Living path lacked attachWorldConsequenceTruth
→ Character Action could assert without WCT mint
→ N+1 / State could not consume WCT from Studio scenes
```

**Fix:** mirror Runtime — call `attachWorldConsequenceTruth` after Character Action in `studio-llm-writer.js`.  
Uses existing sealed bridge; no new Engine; no WCT grounding relaxation.

### Remaining known limitations (not STOP this round)

1. WCT often **absent** under conservative deterministic extraction (accepted).  
2. State Evolution WCT → **evolution JSON**, not `08_current_state` table → Writer N+1 primarily via scene readback.  
3. Plan/Actual soft coexistence (F8.3 demotion ≠ hard Story Truth priority).

### Final verdict

```text
B. MINIMAL IMPLEMENTATION (done) → CONTINUE route scan

Studio WCT attach aligned.
N with X vs without X changes N+1 Writer Actual/WCT readback.
Choice / Survival not opened.
No Human Semantic Gate required for this wiring gap.
```

Next real node after re-scan (not implemented here): whether Plan soft-override needs hard Story Truth priority — only if production still writes “pre-N world” despite readback; that would be a separate evidence-driven STOP-3/6.

---

```text
CODE CHANGED: YES (studio-llm-writer WCT attach only)
DESIGN CHANGED: NO
SCHEMA CHANGED: NO
NAMED EO: NONE (wiring alignment to existing EO)
CHOICE: NOT REOPENED
SURVIVAL: NOT STARTED
STOP: NO — CONTINUE after fix + audit PASS
```
