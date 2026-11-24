# EO-P4 — Anchor / Inference Semantic Demotion

**Status**: `EXECUTED` + `VERIFIED` + **ACCEPTED** (human 2026-09-03)  
**Date**: 2026-09-03  
**Authorized**: human (EO-P4)  
**Prior**: EO-P3 **ACCEPTED** · EO-P2/P1 **ACCEPTED**

---

## Anti-overreach

> Listed dispositions only. UNKNOWN → STOP + REPORT.  
> Do **not** invent a new truth / Reality system.

**Bans**:

```text
NO Authority Act / obtains / Claim-level Authority / realityStatus
NO Legacy migration
NO Operator delta→11/13 handling (TR-01 stays OPEN)
NO W-04 foreshadow
NO new schema/API beyond demotion stamp
NO auto-start P5
```

---

## Scope (CUT interpretation)

| Path | Action |
|------|--------|
| `inferWorldAfter` | stamp inference_candidate ≠ fact |
| `deriveRelationshipState` | stamp ops hint ≠ relationship fact |
| `deriveClosingEmotion` | stamp ops hint ≠ Character Reality |
| `extractBeatStateDelta` | stamp heuristic / plan residue ≠ Canon fact |
| Anchor carriers | same demotion on `buildChapterAnchor` |

## Done

- `packages/inkos-core/src/lib/inference-demotion.js`
- Situation / beat / memory-unit stamps + comments
- `INFERENCE-DEMOTION.md`
- `TRANSITIONAL-RESIDUE.md` (TR-01 Operator delta→11/13 OPEN)
- VERIFY: `scripts/test-eo-p4-inference-demotion.js`

## VERIFY

```text
node scripts/test-eo-p4-inference-demotion.js
npm run test:eo-p1 && npm run test:eo-p3
npm run test:reality-golden
```

Then **STOP**.

---

*EO-P4 complete. Await human ACCEPTED before next EO.*
