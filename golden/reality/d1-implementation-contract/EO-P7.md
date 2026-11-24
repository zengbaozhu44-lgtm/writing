# EO-P7 — Legacy Read Preference / Interpretation Retirement

**Status**: `EXECUTED` + `VERIFIED` + **ACCEPTED** (human 2026-09-03)  
**Date**: 2026-09-03  
**Authorized**: human (EO-P7)

---

## Anti-overreach

```text
NO authority-act.js · NO Subject / Proxy · NO TR-01 / W-04 / W-19
NO auto-start final VERIFY · UNKNOWN → STOP + REPORT
```

## Modified read-side paths

| Path | Audit | Change |
|------|-------|--------|
| `loadBrainContext` | R-01 / R-08 | `d1LegacyReadPreference` = registered_legacy |
| `projectRouteRealityInput` | R-03 / I-05 / I-06 | `confirmed` kept; stamp eligibility; immutableRole=retention |
| `generate-candidates` prompt | R-03 | “已确认现实” → eligibility slice ≠ obtains |
| `timeline-canon` | R-04 / R-05 / I-07 | `TIMELINE_CANON_READ_ROLE` eligibility |
| `collectFacts` / `scoreImportance` | I-05 | immutable retained; ranking = retention not truth |
| `decision.checkKnowledge` | R-06 | epistemic ≠ obtains |
| `checkConsistency` knowledge | R-06 / I-04 | qualification ≠ obtains |

## Fields kept (demoted)

`confirmed`, `immutable`, S6.3 A-class / “canonical” eligibility, `accepted` workflow (EO-P1).

## Untouched (reason)

| Path | Why |
|------|-----|
| `authority-act.js` | Sole obtains source; P7 ban |
| Operator Proxy | P3 frozen |
| TR-01 partition | Already ACCEPTED |
| W-04 foreshadow → 12 | Out of EO |
| W-19 NPC 15 | UNKNOWN |
| yaml-store `immutable: true` write | Write-side retention flag; read demoted |
| Legacy disk rows | Not deleted (interpretation retirement) |

## VERIFY

`npm run test:eo-p7` then STOP.
