# Inference / Anchor Demotion — EO-P4

**Status**: `BINDING`  
**EO**: `EO-P4`  
**Date**: 2026-09-03  
**Upstream**: Audit W-17 / W-18 · Inference→Reality map · Plan P4

---

## Binding rule

```text
Inference
   ↓
candidate / evidence / ops hint / Writer instruction
```

```text
Inference ↛ fact
Inference ↛ obtains
Inference ↛ Reality Authority
```

This EO **does not** define what obtains. Authority Act remains **NOT IMPLEMENTED**.

---

## Covered paths

| Path | Demotion |
|------|----------|
| `inferWorldAfter` → `worldState.after` | inference_candidate / Writer instruction ≠ world fact |
| `deriveRelationshipState` → anchor | operational_planner_hint ≠ relationship fact |
| `deriveClosingEmotion` → narrative_momentum | ops hint ≠ Character Reality |
| `extractBeatStateDelta` | heuristic / plan residue ≠ Canon facts / obtains |
| related Anchor / inference → state carriers | same demotion stamp |

Carriers may still exist for Writer / planner continuity.  
**Presence ≠ Reality Authority** (EO-P1 Dual BLOCK A).

---

## Explicit non-goals

```text
NO Authority Act / obtains / Claim-level Authority / realityStatus
NO new “correct fact” system
NO Legacy migration
NO Operator delta → 11/13 handling (see TRANSITIONAL-RESIDUE)
NO W-04 foreshadow write cut
NO authorization / Act schema/API
NO auto-start P5
```

---

## Stamp

Outputs attach `d1InferenceDemotion`:

- `producesObtains: false`
- `isRealityAuthority: false`
- `role: inference_candidate | operational_planner_hint`
- `authorityAct: NOT_IMPLEMENTED`

---

*Demotion only. Correct Reality remains Author Authority Act (future EO).*
