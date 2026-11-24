# Plan–Actual Conflict — Real Production Experiment

```text
MODE: PRODUCTION EXPERIMENT (read-only + deterministic prompt/clip observation)
QUESTION: When Scene N establishes Actual and Scene N+1 Plan conflicts on world facts,
          does real production Writer fuel obey Actual or Plan?
LLM BODY: UNAVAILABLE (OpenRouter 401 / TLS failure) — verdict uses prompt consumption + clip survival
CHOICE / SURVIVAL / Phase 3.2: NOT OPENED
```

---

## 1. Actual call chain (production)

```text
Scene N.text
  → ensureActualEvents(scene)                    // occurrence from prose
  → attachCharacterActionTruth / WCT (if grounded)
  → persist intent.scenes / ch_*_scenes.json

Scene N+1 Beat1 (Studio Living path)
  → compileSlimBeatUserPrompt (beat-slimmer.js)
       · collectPreviousActualEvents(prev)
       · formatActualEventsBlock
            → ### Previous Scene Occurrence Events
            → soft:「不得用 Plan 覆盖或假装未呈现」
            → ### Proven World Consequences (only if WCT asserted)
       · ensurePlanValidity / formatPlanValidityDemotionBlock   // F8.3
       · sceneGoalLine ← scene.goal / executionPlan.scenePlan.goal
       · 章目标 ← intent.mainGoal
       · beatInstr ← beat content / narrativePush (often mirrors goal)
  → clipBeatPromptToBudget(parts, BEAT_PROMPT_CHAR_BUDGET=1400 default)
  → Writer (LLM)

Runtime compiler path (parallel):
  actual_events module priority ≈ 91
  Plan/goal modules remain separate STORY CONTROL (not deleted)
```

Artifacts: `tmp-plan-actual-conflict/` · runner: `scripts/experiment-plan-actual-conflict.js`

---

## 2. Archaeology answers (no code change)

| # | Finding |
|---|--------|
| 1 | **Actual/WCT → prompt** via `formatActualEventsBlock` → part `actualEventsLine` (before OC / after F1). Compiler key `actual_events` p≈91. |
| 2 | **scene.goal / mainGoal → prompt** as `Scene explicit goal〔CURRENT INTENT〕` + `章目标（导航）` + often Beat `指令`. |
| 3 | **F8.3 on this conflict** = `VALID` / `executionPrivilege=direct` / no demotion block. Room leave vs remain-inside is **outside** F8.3 location patterns (hospital/company/rooftop + object rules only). |
| 4 | **Module survival priority (Studio clip)** — PROTECT_RE includes Scene explicit goal / OC / F1 / Plan Validity / Beat; **does NOT** include Previous Scene Occurrence Events or Proven World Consequences. Last-resort compact **keeps Plan goal, drops Actual**. |
| 5 | **Writer sees (full budget)** — both Actual outside occurrence **and** Plan inside goal + soft Continuity line. |
| 6 | **Hard override?** — **None.** No code deletes Plan goal; no code forces Actual prose. |
| 7 | **Soft only** — Continuity sentence in Actual block + optional F8.3 demotion text (when INVALID). |

### F8.3 actual behavior (this round)

```text
F8.3 = Plan validity / opening-execution-privilege demotion only
     ≠ Actual > Plan Story Truth authority
     ≠ generic location leave/stay detector
When INVALID: goal text retained (strategicGoalPreserved=true); demotion soft block injected.
```

Detectable control (company Actual vs hospital-bed Plan): `INVALID` + demoted — still does **not** delete Plan goal.

---

## 3. Experiment construction

**Scene N (Actual established):**

```text
苏晚推开房门，头也不回地走了出去。…她已经离开了房间，不在房间里。
actualEvents.action = 苏晚推开房门，头也不回地走了出去
WCT: not forced / not relaxed (absent OK — use Actual occurrence)
```

**Case A Plan (consistent):** `苏晚在走廊里继续追查线索…`  
**Case B Plan (conflict):** `苏晚仍在房间内翻找抽屉…`

---

## 4. Case A — Writer input (full budget)

| Signal | Present |
|--------|---------|
| Occurrence action (推开房门…) | YES |
| Outside cues (离开了房间 / 走廊) | YES |
| Scene explicit goal (走廊追查) | YES |
| Continuity soft「不得用 Plan 覆盖」 | YES |
| F8.3 demotion | NO (VALID) |

**Writer output:** not obtained (LLM 401 / network).  
**Baseline structure:** Plan and Actual agree on “outside” — no authority conflict in input.

---

## 5. Case B — Writer input (full budget) × prompt observation

| Signal | Present |
|--------|---------|
| Occurrence action (推开房门 / outside) | YES |
| Plan inside (仍在房间 / 抽屉) | YES |
| Both in same Writer input | **YES** |
| F8.3 demotion | **NO** |
| Hard Actual>Plan | **NO** |

**Case B Writer body ×3:** **NOT RUN** — LLM configured but OpenRouter returns `401 User not found` / TLS disconnect.  
Cannot attribute Result 1/2/3 to model stochasticity this round.

---

## 6. Deterministic production proof (stronger than one LLM sample)

### Full budget (~12k): coexistence

Both Actual-outside and Plan-inside are present → soft conflict only.

### Default / tight budget clip (Studio production default = 1400; forced last-resort ≤700)

Observed on **identical Case B parts**:

| Budget | Actual occurrence content | Plan「仍在房间/抽屉」/ Scene explicit goal |
|--------|---------------------------|---------------------------------------------|
| 12000  | YES                       | YES                                         |
| 1400   | NO (header truncates; action lost) | often lost via mid-clip path        |
| **700** | **NO (fully dropped)**   | **YES (survives)**                          |
| **500** | **NO**                    | **YES**                                     |

`tmp-plan-actual-conflict/caseB-clip700.txt` shows Plan goal + Beat instruction “仍在房间内翻找抽屉” with **zero** Occurrence action / outside cue / Continuity soft line.

```text
Production node: clipBeatPromptToBudget last-resort
Mechanism: PROTECT_RE protects Scene explicit goal; Actual Occurrence unprotected
Effect: Plan world-fact can be the only surviving location instruction
= Plan → Story Truth cover by fuel starvation (not by Writer preference)
```

This is **independent of LLM**. It is reproducible.

---

## 7. Verdict

### Plan→Story Truth cover?

**YES — at prompt assembly under budget pressure (Studio beat path).**  
When both survive (large budget): cover is **not hard-blocked**; only soft Continuity + optional F8.3 (which does **not** fire on this room conflict).

### Does soft mechanism already prevent Plan from rewriting established Actual?

**NO — not reliably.**

1. F8.3 does not demote this conflict class.  
2. Soft Continuity text is itself dropped in last-resort.  
3. Last-resort prefers Plan goal survival over Actual Occurrence survival.

### STOP?

```text
C. STOP / HUMAN SEMANTIC GATE
```

Not inventing `Actual > Plan`. Reporting the first real authority conflict on the production route:

**Conflict node:** `packages/inkos-studio-server/src/writer-optimization/beat-slimmer.js` → `clipBeatPromptToBudget` (PROTECT_RE + last-resort).

**Module allowing Plan to cover Actual:** PROTECT_RE / last-resort compact keeps `Scene explicit goal` (+ Beat instr) and **drops** `Previous Scene Occurrence Events` / Proven WCT.

**Why F8.3 did not stop:** room leave/stay ∉ F8.3 patterns; status stayed VALID; even INVALID would only soft-demote and still preserve Goal text.

**Multiple legitimate readings (need human, do not auto-pick):**

1. **Wiring gap:** Continuity fuel was always required to survive (like F1/OC); missing PROTECT for Occurrence is a bug → candidate MINIMAL IMPLEMENTATION = protect Occurrence/WCT readback only (no new ontology).  
2. **Intentional budget policy:** Plan navigation must survive; Actual may be sacrificed → accepts Plan world-fact dominance under pressure.  
3. **When both present:** soft Continuity vs CURRENT INTENT — still no hard Story Truth precedence; Writer body not proven this round.

**Unique semantic question for human:**

> Under Writer prompt budget pressure, may STORY CONTROL (`scene.goal` / Beat instruction) remain while already-established Actual Occurrence / WCT readback is discarded — and if not, is protecting Actual survival (without deleting Plan) enough, or is a hard world-fact precedence required when both remain?

---

## 8. What was NOT done

- No new Engine / authority ontology / `Actual > Plan` rule  
- No Choice / Survival / Phase 3.2 changes  
- No baseline mutation to “pass” the experiment  
- No Writer output forced  
- WCT grounding not relaxed  

---

## 9. Next node (blocked until gate)

Route scan **paused** at Plan–Actual prompt authority / survival asymmetry.  
Do **not** proceed to Choice or Survival until the human question in §7 is answered.

```text
CODE CHANGED: NO (experiment + report only)
DESIGN CHANGED: this report only (not a sealed contract)
SCHEMA CHANGED: NO
CHOICE: NOT OPENED
SURVIVAL: NOT OPENED
STOP: YES — HUMAN SEMANTIC GATE
```
