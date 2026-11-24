# Operator Proxy — EO-P3 Binding

**Status**: `BINDING`  
**EO**: `EO-P3`  
**Date**: 2026-09-03  
**Upstream**: `APPROVED.md` §3 · Audit W-10 / I-12 · Plan P3

---

## Binding identities

```text
Authority Subject = Author
Executor          = Operator   (when Operator runs a tool, e.g. inkos post)
```

```text
Operator executes
        ↓
effect (if any) is operational persistence / registration
        ↓
attributable Subject remains Author
        ↓
NO automatic Authority Act
NO automatic obtains
```

---

## Critical separation

| Claim | Status under EO-P3 |
|-------|--------------------|
| Operator is Authority Subject | **FORBIDDEN** |
| Operator execution = Authority Act | **FORBIDDEN** |
| Operator = automatic Author authorization | **FORBIDDEN** |
| Proxy identity ⇒ prior delegation | **FORBIDDEN** (false) |
| Explicit / prior / traceable delegation recording | **NOT IMPLEMENTED** |
| Authority Act | **NOT IMPLEMENTED** |
| Claim-level Authority / obtains | **NOT IMPLEMENTED** |

> **Proxy identity成立 ≠ 已获得具体 Author 授权。**

---

## `inkos post`

```text
post ↛ Authority
post ↛ Authority Subject = Operator
post ↛ Author Act (Act NOT IMPLEMENTED)
post  → Executor = Operator + operational persistence only
```

CLI stamps `d1OperatorProxy` on the JSON result:

- `authoritySubject: Author`
- `executor: Operator`
- `operatorIsAuthoritySubject: false`
- `authorDelegationAssumed: false`
- `authorityActExecuted: false`
- `producesObtains: false`

`applyPostChapter` remains the physical write helper for operational carriers.  
It does **not** assign Subject to the caller. Persistence ≠ Reality Status (EO-P1).

---

## Explicit non-goals (EO-P3)

```text
NO Authority Act
NO obtains / Claim-level Authority
NO realityStatus
NO authorization schema / Act API
NO default “all Operator actions = Author authorized”
NO Legacy rewrite
NO W-04 / P4 Anchor / Prompt / UI
NO auto-start P4
```

---

## STOP / REPORT notes (this EO)

1. **Author vs Operator**: Distinguished by role stamp + Contract; no identity store invented.  
2. **Implied authorization**: Explicitly **not** assumed (`authorDelegationAssumed: false`).  
3. **Authorization schema**: **Not** added — Act path remains NOT IMPLEMENTED.  
4. **Operator delta → 11/13**: Still possible as **operational registration** via raw delta; under Dual BLOCK A this is **not** obtains. Refusing all such writes was **not** required to isolate Subject and would expand beyond W-10; left as Transitional registration ≠ Reality Authority.  
5. **UNKNOWN Subject paths**: None found that forced Subject=Operator in code; if later discovered → STOP under next EO.

---

*Operator Proxy isolation only. Authority Act remains P5/P6.*
