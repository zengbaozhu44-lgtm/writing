# Phase 4 Main-Path Vertical Slice Archaeology

```text
MODE:
READ-ONLY

CODE CHANGED:
NO

DESIGN CHANGED:
NO

SCHEMA / PROMPT / GOLDEN / RUNTIME:
UNCHANGED

NAMED EO:
NONE

IMPLEMENTATION:
NOT AUTHORIZED
```

**Single goal:** Walk the real production main path toward Character Causality; **STOP at the first place the path cannot legally continue.**

**Not this Gate:** Candidate Option / Access / Agency / Choice / Goal engines · L1 production mount · #41 fix · H3.3 reopen · Phase 5 / L2 / Consequence / Survival / Director.

---

## A. 实际生产主路

```text
getDaemon()                                          [packages/inkos-studio-server/src/routes.js]
  → createStudioLlmWriter(...)
  → new StudioRuntimeOrchestrator(..., { writer, autoWrite })
  → RuntimeDaemon / Living Run

StudioRuntimeOrchestrator._runScenesAndChapter()     [studio-orchestrator.js]
  → ensureChapterCausalChain(...)                    // Plan / causal_chain = STORY CONTROL
  → ensurePlanValidity(scene, intent)                // F8.3 · session/prompt demotion ≠ Causality
  → buildDynamicPrompt / buildSceneWritePrompt
  → (optional) sceneLifecycleHook('plan')            // Director brief / executionPlan
  → ensurePlanValidity again                         // F8.3
  → activeWriter({ bookDir, chapter, scene, prompt, ctx, intent })

createStudioLlmWriter → writer(fn)                   [studio-llm-writer.js]
  → executeBeatSequence(...)                         [beat-execution.js]
       → llmFn (DeepSeek Beat write)
       → applyProseBoundaryGate(text)                // RF-01
       → validateWriterRuntimeV2 / continuity / hardFail gates
  → scene.text = draftText                           // STORY REALIZATION
  → ensureObservedContinuity(scene)                  // F6.2 projection ≠ SR / Causality
  → ensureActualEvents(scene, { stripPlan: true })   // [event-extractor.js]
  → applyCharacterSRAfterActual(...)                 // [character-sr-updater.js]
  → applyAttributionAfterActual(...)                 // soft · [attribution-wiring.js]
  → buildExecutionIntelligence / readerFeedback      // Writer metrics ≠ Causality

Next scene (production continuation):
  compileScenePrompt / assembleMinimalSR
    → loadCharacterSRState / formatCharacterSRForPrompt   // [compiler.js]
    → Writer again
```

**Semantic labels on this spine:**

| Hop | Semantic type | Layer |
|-----|---------------|-------|
| Plan / causal_chain / Director / Beat plan | Narrative control | STORY CONTROL |
| Beat LLM + RF-01 → `scene.text` | Narrative realization | STORY REALIZATION |
| `ensureActualEvents` → `scene.actualEvents` | Text-grounded occurrence | STORY TRUTH |
| `applyCharacterSRAfterActual` | Actual → Fact IB → Character SR | Character subjective state (≠ Choice) |
| `applyAttributionAfterActual` | Soft retrospective TypedEvidence → Gate → Registry | Attribution evidence (≠ Choice; `choice: undefined`) |
| `formatCharacterSRForPrompt` → next Writer | SR as prompt lore | STORY CONTROL / REALIZATION |

---

## B. 已成功跨越的环节

### Writer → Prose

```text
STATUS: PASSED
```

- **Code:** `executeBeatSequence` → `applyProseBoundaryGate` (RF-01) → `scene.text = draftText` in `studio-llm-writer.js`
- **Semantic:** STORY REALIZATION (narrative prose)
- **Why legal to continue:** Prose is evidence/realization, not Choice. Crossing into Occurrence extraction is authorized as Phase 1 Actual-from-text.

### Prose → Occurrence / Actual

```text
STATUS: PASSED
```

- **Code:** `ensureActualEvents(scene, { stripPlan: true })` → `extractStoryEventsFromScene` (`event-extractor.js`); empty Actual with non-empty text → `ACTUAL_EVENT_REQUIRED` hardFail
- **Semantic:** STORY TRUTH (occurrence derived from prose; Plan stripped)
- **Why legal:** Actual ≠ Choice. Plan fields are refused as event sources. This is occurrence readback, not Character Causality.

### Actual → Character SR

```text
STATUS: PASSED (as Fact IB → SR; not as Choice)
```

- **Code:** `applyCharacterSRAfterActual` → `updateCharacterSRFromActual` + `characterCanAccessActualEvent` (`character-sr-updater.js`)
- **Semantic:** Character subjective state updated from Actual under Fact / Information Boundary
- **Why legal:** Phase 3.2 contract: Actual → IB → CharacterSR; forbidden Plan/Reasoner/Living as SR facts. This establishes **角色当下可获得的内部依据** (when SR is non-empty), not agency-to-act.
- **#41 note:** SR may often be thin/empty (QUALIFIED / UNFIXED). That is an **upstream quality** issue. Even with a fully populated SR, the next hop below still fails. Therefore **#41 is NOT the first blocking gap** of this vertical slice.

### Soft Attribution (retrospective)

```text
STATUS: PASSED AS SOFT MODULE · NOT Character Causality
```

- **Code:** `applyAttributionAfterActual` → `runAttributionGate` / `adjudicateAttribution` (`attribution-wiring.js`, `attribution-gate.js`)
- **Semantic:** Soft PASS / UNKNOWN / INVALID on TypedEvidence; **always** `choice: undefined` / `consequence: undefined`
- **Why it does not unblock Causality:** Soft (never blocks Actual/SR); production **does not consume** `listAttributionRecords` for next-action causality (registry write-only from this spine); PASS can still fire on **authorial deliberation prose** (regex agency cues). Attribution ≠ Character Causality entry.

---

## C. 第一阻塞点

```text
FIRST BLOCKING GAP:
After Character SR is available on the production spine,
there is no legal Character Causality evaluation / next-action entry.
The only production consumer of Character SR is Writer prompt compilation
(STORY CONTROL / REALIZATION), which is frozen as ≠ Character Causality.
```

```text
File:
  packages/inkos-prompt/src/compiler.js
  (consumer)
  packages/inkos-studio-server/src/studio-llm-writer.js
  packages/inkos-brain/src/character/character-sr-updater.js
  (producer — last successful Causality-relevant hop)

Function:
  compile path: assembleMinimalSR + formatCharacterSRForPrompt
  (priority ~88 block `character_sr`)
  Producer: applyCharacterSRAfterActual / updateCharacterSRFromActual

Caller:
  StudioRuntimeOrchestrator._runScenesAndChapter
  → buildSceneWritePrompt / compileScenePrompt
  → createStudioLlmWriter / executeBeatSequence (next scene)

Callee:
  Writer LLM (Beat) — not any Character Causality evaluator

Current input:
  characterSRState / loadCharacterSRState(bookDir, chapter)
  (+ Plan, causal_chain, Director, Beat plan, prompt)

Current semantic type:
  Character SR (subjective state) consumed as prompt lore
  = STORY CONTROL / STORY REALIZATION fuel
  ≠ Character Causality evaluation input contract

Expected next semantic step:
  Some production entry that evaluates / advances
  Character Causality from the character's own available basis
  (whatever that entry is named — not presupposed as Candidate Option)
  before authorial Writer realizes the next action as fait accompli

Why current path cannot legally cross:
  1. No production function exists that takes Character SR
     (and/or Attribution records) and evaluates character-causal
     next action / Choice Formation.
  2. observeL1 exists but is test-only; not mounted on this spine;
     and L1 VALID ↛ production Choice (Phase 4 freeze / #25b).
  3. The live continuation is:
        Character SR → formatCharacterSRForPrompt → Writer → Prose → Actual
     which is the documented no-Choice Action bypass (#08 Path E):
        SR → Writer → Action → Actual → State
  4. Treating that Writer hop as Character Causality would launder
     STORY CONTROL into character-owned causality.

Which frozen contract prevents crossing:
  · Phase 4: Character Causality ≠ Plan / Writer / Director execution
  · #08: SR-as-prompt → Writer → Action is BYPASS (no Choice)
  · #35 Choice = NOT PROVEN
  · observeL1 = test-only; L1 VALID ↛ production Choice
  · #25b: Candidate Option ↛ L1 (do not invent CO to “feed” L1)
  · H3.3: GGC ≠ Choice / ≠ Action / ≠ Candidate Option
  · Forbidden shortcuts: Plan/mainGoal/causal_chain.choice/Pressure/
    Conflict/Desire/Writer/Reasoner/GGC → Choice
```

**Call-site diagram at the cut:**

```text
[PASSED] applyCharacterSRAfterActual → scene.characterSRState / sidecar
[PASSED] applyAttributionAfterActual → Registry (soft; unused by next causality)
                ↓
         ┌──────┴──────┐
         │             │
    [ABSENT]      [EXISTS but ILLEGAL as Causality]
 Character        formatCharacterSRForPrompt
 Causality        → Writer → next Prose
 evaluation
 entry
         │
         ▼
   FIRST BLOCKING GAP
```

---

## D. 是否需要 Candidate Option

```text
IRRELEVANT TO CURRENT BLOCKER
```

This gap is the **absence of any legal Character Causality evaluation entry after Character SR**, not a proven requirement for a Candidate Option object.

Per #25b and this Gate: do **not** invent Candidate Option to unblock the path. Necessity of Candidate Option remains **NOT PROVEN** at this cut.

---

## E. 是否需要 Access / Agency / Subject Presence

Judged only for capabilities **touched before** the first blocker:

```text
Access:
NOT YET NEEDED
  · characterCanAccessActualEvent = Fact / Information Boundary for SR update
  · ≠ Option Access; Option Access not required to state this blocker

Agency:
PARTIAL
  · Touched only as Attribution Gate prose cues (agencyCue / coercionTradeoffCue)
  · computeAgencyScore / writer metrics ≠ Character Causality Agency
  · No Causality Agency object; not the first blocker

Subject Presence:
PARTIAL
  · Touched only as Attribution Gate prose cues (subjectAbsent / subjectPresentCue)
  · observeL1 classifiers = test-only; not on this spine
  · Not the first blocker
```

---

## F. 下一 Design Gate 的唯一问题

```text
ONE DESIGN QUESTION:

After Character SR is updated from Actual on the production spine,
what — if anything — is authorized to be the first legal Character Causality
evaluation entry, such that the next character-affecting action is not
merely Writer realization of Plan/Director/SR-as-prompt lore?

(Answer must not default to: Candidate Option Engine, Choice Engine,
 Goal Engine, GGC→Action, or mounting observeL1 as production Choice.)
```

---

## Gap Matrix (this slice only)

| Step | Status |
|------|--------|
| Writer → Prose | PASSED |
| Prose → Actual | PASSED |
| Actual → Character SR | PASSED (Fact IB) |
| Soft Attribution | PASSED as soft module; ≠ Causality |
| Character Causality entry after SR | **FIRST BLOCKING GAP — ABSENT** |
| L1 on production spine | NOT REACHED (test-only; downstream of blocker) |
| Candidate Option | IRRELEVANT TO CURRENT BLOCKER |
| #41 empty SR | Known upstream; not this slice's first blocker |

---

## Conflict Audit (frozen docs)

| Freeze | Relation to this slice |
|--------|------------------------|
| H3.3 #47 SEALED | No conflict; GGC not used as Causality entry |
| H2 #43 / DG-042 | Untouched |
| #41 QUALIFIED / UNFIXED | Recorded; not repaired; not first blocker |
| #25b CO ↛ L1 | Respected; CO not invented |
| observeL1 test-only | Respected; not mounted |
| Phase 4.1 CO/Access/Agency ABSENT | Consistent; this slice stops **before** needing those modules |
| #08 no-Choice Action bypass | Confirms illegal SR→Writer continuation |

---

## Final STOP

```text
ARCHAEOLOGY:
COMPLETE FOR CURRENT VERTICAL SLICE

FIRST BLOCKING GAP:
FOUND

Location:
Character SR (post-Actual) → [missing Character Causality evaluation entry]
→ illegal-only continuation: formatCharacterSRForPrompt → Writer

CODE:
NO CHANGES

DESIGN:
NOT PERFORMED

NAMED EO:
NONE

IMPLEMENTATION:
NOT AUTHORIZED

NEXT:
DESIGN GATE REQUIRED
(one question only — see §F)

STOP:
YES
```
