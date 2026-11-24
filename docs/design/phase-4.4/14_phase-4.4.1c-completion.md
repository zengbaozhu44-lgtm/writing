# 14 — Phase 4.4.1c Soft Wiring Completion Report

```text
PHASE 4.4.1c SOFT WIRING

STATUS: COMPLETE — STOP FOR REVIEW

CODE CHANGED: YES (wiring only)
GOLDEN / v0.2: UNCHANGED
PHASE 5 / 4.4.1d / 4.4.1e: NOT TOUCHED
```

## Delivered

| Item | Location |
|------|----------|
| Soft apply after Actual | `packages/inkos-brain/src/attribution/attribution-wiring.js` |
| Cue policy | **A defaults** + **narrow B** excerpt-only (`detectAttributionCues`) |
| Runtime wire | `orchestrator.js` after SR, try/catch soft |
| Studio wire | `studio-llm-writer.js` after SR, try/catch soft |
| Optional chapter enrichment | `chapter-pipeline.js` after `buildStateDiff`, soft; **not** commit precondition |
| Tests | `npm run test:attribution-wiring` (9 PASS) |

## Architecture (enforced)

```text
Prose → Actual → State / SR / Memory     (unchanged, independent)
              ↘ soft TypedEvidence → Gate → Registry
```

## Regression proofs (ran)

| Test | Result |
|------|--------|
| W1 plain action → UNKNOWN not PASS | PASS |
| W2 UNKNOWN → State evolution still succeeds | PASS |
| W3 subjectAbsent keeps Actual; no PASS history | PASS |
| W4 soft skip / no throw | PASS |
| W5 hints+state enrichment ↛ PASS | PASS |
| W6 agency prose → PASS → Registry | PASS |
| W8 coercion tradeoff → PASS | PASS |

Also: registry 12 + gate 14 still green.

## Hard red lines kept

```text
❌ Full-context LLM cues
❌ Situation / Plan / Desire / Pressure / causal_chain → Evidence
❌ Writer dump → Gate
❌ characterHints → Registry (only via evidenceFromCharacterHint)
❌ State → direct Attribution
❌ Actual → direct Attribution
❌ Attribution blocks State / deletes Actual
❌ 4.4.1d/e / Phase 5 / Golden / v0.2
```

## Cue policy note

```text
4.4.1b/1c Gate = conservative operational subset
≠ complete Attribution ontology
UNKNOWN 偏多 = 安全策略
```

## Explicitly NOT done

- causal_chain Writer densification fix (4.4.1d/e)
- Phase 5
- Expanding B into NLP/LLM

## Next

Human review 4.4.1c → then decide **4.4.1d** only if approved.
