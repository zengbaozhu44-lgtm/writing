# PHASE 3.2 COMPLETION REPORT

**Phase:** Minimal SR Runtime Implementation  
**Date:** 2026-09-09  
**Depends:** Phase 0–2 · `_AI_SR_RUNTIME_AUDIT.md` · `_AI_SR_DESIGN_GATE.md` · `_AI_CAUSAL_CROSS_AUDIT.md`

---

## 1. Audit

Pre-impl code audit confirmed:

| Item | Finding |
|------|---------|
| Carrier | `packages/inkos-core/src/lib/minimal-sr.js` — extend, do not fork |
| Actual | `ensureActualEvents` / StoryEvent — sufficient for grounded awareness |
| IB | F4 `filterKnowledgeForPrompt` + presence/actor access for Actual |
| Persistence | New sidecar only: `novel/_system/brain/character_sr/` |
| Forbidden | causal_chain / Situation / Desire / Living / heroKnows / Plan — refused |

No C1–C8 escalation triggered. Actual could supply awareness without Reasoner/Plan.

---

## 2. Design Gate

Followed `_AI_SR_DESIGN_GATE.md` PASS WITH BINDING CONSTRAINTS.

---

## 3. Changed Files

| File | Change |
|------|--------|
| `packages/inkos-brain/src/character/character-sr-updater.js` | **NEW** Actual→IB→SR updater + sidecar I/O |
| `packages/inkos-brain/src/index.js` | Export CharacterSR API |
| `packages/inkos-core/src/lib/minimal-sr.js` | interpretation / belief / relevance + runtime merge |
| `packages/inkos-prompt/src/compiler.js` | Load sidecar / scene.characterSRState into assemble |
| `packages/inkos-studio-server/src/studio-llm-writer.js` | After Actual: `applyCharacterSRAfterActual` |
| `packages/inkos-runtime/src/pipeline/orchestrator.js` | Same wiring + intent mirror |
| `packages/inkos-studio-server/src/studio-orchestrator.js` | Mirror `characterSRState` |
| `scripts/test-character-sr.js` | **NEW** T1–T11 + literary replay |
| `package.json` | `test:character-sr` |

---

## 4. Architecture Changes

```
BEFORE:
  Actual Events → timeline (Phase 2) + N+1 prompt
  Minimal SR ← matrix + authored only

AFTER (Phase 3.2):
  Actual Events
        ↓
  Information Boundary (actor/affected/present witness)
        ↓
  CharacterSR updater (awareness + authored interpretation/belief/stance/relevance)
        ↓
  character_sr sidecar + scene.characterSRState
        ↓
  assembleMinimalSR merge → Writer prompt

NEVER:
  SR → Canon / timeline / facts / Actual mutation
  SR ← causal_chain / Situation / Desire / Living / heroKnows / Plan
  SR → Choice (Phase 4)
```

---

## 5. New State

- Fields: `awareness` (knowledge), `interpretation`, `belief`, `stance`, `relevance`
- Sidecar: `novel/_system/brain/character_sr/ch_NNNN.json`
- Scene attach: `scene.characterSRState`

---

## 6. Authority

| Layer | Role |
|-------|------|
| Canon / Actual | World Truth |
| F1/F4 + access helper | Accessibility |
| CharacterSR | Subjective projection only |
| Plan / Reasoner / Living | **NOT** SR Authority |
| Writer | Consumer only |

`IS_REALITY_AUTHORITY = false` · `writesCanon/Timeline/Facts/Actual = false`

---

## 7. Provenance

Each mutation records:

```
characterId, field, source, eventId?, storyClock?, engine=character-sr, version=character-sr-1
```

Missing clock/eventId → omit (never forged).

---

## 8. Tests

```
npm run test:character-sr       → PASS
npm run test:phase1-sr          → PASS
npm run test:event-foundation   → PASS
npm run test:state-evolution    → PASS
npm run test:s6-1-timeline-events → PASS
```

Covered: T1 creation · T2 isolation · T3 interpretation≠Canon · T4 false belief · T5 irrationality · T6 relevance · T7 SR isolation · T8 Canon isolation · T9 Plan contamination · T10 Writer/Reasoner refuse · T11 authority flags.

---

## 9. Literary Failure Replay

Ch2 S3→S4 used **only** as subjective retention fixture:

- S3 Actual → SR retains choice-pressure evidence  
- S4 still has CharacterSR after update  
- **DEFERRED (not fixed):** Choice survival, Open Loop, Director Plan bridge, F8.3 unresolved validity

---

## 10. Negative Boundary Verification

| Not done | Status |
|----------|--------|
| Choice Engine | DEFERRED Phase 4 |
| Consequence Engine | DEFERRED Phase 5 |
| Open Loop / Survival | DEFERRED Phase 6 |
| Director Actual Migration | DEFERRED Phase 7 |
| Causal Engine | NOT created |
| Parallel Character Truth | NOT created (extended Minimal SR) |
| Living brain upgraded | NO |

---

## 11. Remaining Risks

1. Speech-regex edge cases can reject weak Actual extracts → SR awareness omit (extractor residual; not fixed here).  
2. Interpretation/belief still require authored facing for “shadow→police”; no LLM invent.  
3. Living / CLI / Plan bridges still parallel residuals (Phase 0/2 known).  
4. Causal Traceability incomplete by design until Phase 4+.

---

## 12. Deferred Items

```
SR → Choice → Action          Phase 4
Action → Consequence          Phase 5
Narrative Survival            Phase 6
Director Actual Migration     Phase 7
Ch2 Choice disappearance fix  Phase 4/6/7 (not 3.2)
```

---

## 13. Regression

Phase 1 Minimal SR, Event Foundation, State Evolution, EO-P2 timeline guards — all PASS.

---

## 14. Final Verdict

```
PASS WITH KNOWN LIMITATIONS
```

**Claim allowed:**

> Minimal CharacterSR Runtime is implemented and validated for **Actual → IB → CharacterSR**.

**Claims forbidden:**

```
Character Causality COMPLETE
Choice System COMPLETE
Character Simulation COMPLETE
Story Survival COMPLETE
Actual → State COMPLETE
Causal Chain COMPLETE
```

---

## 15. Can Enter Phase 4?

**NO — STOP here.**

Await explicit human go-ahead for Phase 4 (SR → Access + Agency → L1/L2 Choice).

---

## Freeze Statement

> Phase 3.2 supplies the first true subjective leg: characters can retain Actual-grounded awareness and authored interpretation/belief without polluting Canon.  
> It does **not** close the literary causal loop. Causal Traceability ≠ Causal Engine remains frozen.
