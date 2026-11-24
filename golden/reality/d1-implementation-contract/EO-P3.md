# EO-P3 — Operator Proxy

**Status**: `EXECUTED` + `VERIFIED` + **ACCEPTED** (human 2026-09-03)  
**Date**: 2026-09-03  
**Authorized**: human (EO-P3)  
**Prior**: EO-P2 **ACCEPTED** · EO-P1 **ACCEPTED**

---

## Anti-overreach (binding)

> Listed dispositions only. No on-the-spot Reality / Authority / Subject / Canon invention.  
> UNKNOWN / unlisted path → **STOP + REPORT**.

**EO-P3 bans**:

```text
NO Authority Act / obtains / Claim-level Authority / realityStatus
NO authorization schema / Act API
NO default Operator→Author authorization
NO post = Authority Subject
NO Legacy / W-04 / P4 / Prompt / UI / auto-P4
```

---

## Scope

| Item | Action |
|------|--------|
| W-10 | CUT Operator-as-Subject reading on `inkos post` |
| I-12 | Enforce Subject=Author; Executor=Operator on CLI post |
| APPROVED §3 | Bind Proxy ≠ prior delegation |

## Done

- `packages/inkos-core/src/lib/operator-proxy.js` — stamp + assert (no Act schema)
- CLI `post` → `stampOperatorCliPost(applyPostChapter(...))`
- `post-chapter.js` / HELP: Execution ≠ Authority
- `OPERATOR-PROXY.md` binding
- VERIFY: `scripts/test-eo-p3-operator-proxy.js`

## VERIFY

```text
node scripts/test-eo-p3-operator-proxy.js
npm run test:eo-p1
npm run test:reality-golden
```

Then **STOP** — do not open P4.

## REPORT (no STOP required)

- No code path set Subject=Operator; isolation was missing → stamp added.  
- Delegation recording remains NOT IMPLEMENTED; therefore Act cannot run and is not inferred.  
- Raw Operator delta may still write 11/13 as operational registration; Dual BLOCK A forbids obtains reading. Not expanded to refuse writes under W-10-only EO.

---

*EO-P3 complete. Await human ACCEPTED before EO-P4.*
