# EO-TR-01 — Operator raw delta ↛ 11/13

**Status**: `EXECUTED` + `VERIFIED`  
**Date**: 2026-09-03  
**Authorized**: human (explicit EO-TR-01)  
**Prior**: EO-P6 **ACCEPTED** · P7 **DEFERRED**

---

## Anti-overreach

```text
EO-TR-01 = Operator / raw delta → 11/13 residue only
NO Authority Act changes
NO D1-C-1 reopen
NO Subject/Executor change
NO Dual BLOCK expansion
NO Legacy / P7
NO W-04 foreshadow
NO NPC 15 (UNKNOWN)
UNKNOWN → STOP + REPORT
NO auto-start P7
```

## Scope

| Path | Action |
|------|--------|
| `inkos post` raw `delta.timeline` → 11 | **CUT** write (partition before `applyPostChapter`) |
| `inkos post` raw `delta.facts` → 13 | **CUT** write |
| `runBrainChapter` `options.delta` | **CUT** same 11/13 (equivalent raw-delta applicator) |
| MemoryUnit.commit → `applyPostChapter` | **unchanged** (EO-P2 already emptied plan facts/events) |
| 08 / 07 / 09 / resources | **KEEP** operational |
| 12 foreshadow / 15 NPC | **untouched** (W-04 / W-19) |

## Done

- `packages/inkos-core/src/lib/tr01-operator-delta.js`
- CLI `post` + `brain-chapter` partition 11/13
- `applyAuthorityAct` **not** modified

## REPORT (no STOP)

- W-04 `newForeshadow` / delta.foreshadow → 12 left in place (not TR-01).  
- W-19 NPC `15` left in place (UNKNOWN).  
- Commit may still pass a `timeline` object with empty `events` (EO-P2); not Operator raw delta.

## VERIFY

```text
node scripts/test-eo-tr01-operator-delta.js
npm run test:eo-p3 && npm run test:eo-p6
```

Then **STOP** — P7 not started.

---

*TR-01 write residue cut. Runtime still not fully closed (Legacy / P7).*
