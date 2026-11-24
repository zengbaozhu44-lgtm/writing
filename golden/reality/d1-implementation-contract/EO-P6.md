# EO-P6 — Minimal Authority Act Implementation

**Status**: `EXECUTED` + `VERIFIED` + **ACCEPTED** (human 2026-09-03)  
**Date**: 2026-09-03  
**Authorized**: human (after EO-P5 ACCEPTED)  
**Prior**: EO-P2…P5 **ACCEPTED** · TR-01 **OPEN** (untouched)

---

## Anti-overreach

```text
EO-P6 = Authority Act Implementation
        only frozen D1 semantics
TR-01 remains OPEN
UNKNOWN semantic gap → STOP + REPORT
NO reopen D1
NO Operator as Subject
NO default delegation
NO wrap commit/accept/validate as Act
NO Legacy auto-auth
NO Narrative upgrade
NO Canon/Memory refactor
NO auto-start P7 / TR-01 EO
```

## Objective

Implement the **sole** mechanism whose semantic function is SoA adjudication:

```text
Authority Act → obtains / ¬obtains
```

Module: `packages/inkos-core/src/lib/authority-act.js`  
Binding: `AUTHORITY-ACT.md`

## Not wired

`commit` / `accept` / `validate` / `post` / `applyPostChapter` / inference / Writer / 11/13 **do not** call `applyAuthorityAct`.

## VERIFY

```text
node scripts/test-eo-p6-authority-act.js
npm run test:eo-p1 && npm run test:eo-p3 && npm run test:eo-p4 && npm run test:eo-p5
npm run test:reality-golden
```

Then **STOP**.

---

*P6 ACCEPTED. Unique obtains source established. Runtime not fully closed. TR-01 OPEN — wait for named EO-TR-01. P7 deferred.*
