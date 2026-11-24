# D1 Implementation Plan

**Status**: `APPROVED`  
**Approved**: 2026-09-03 (human)  
**Mode**: DOCUMENT + named Execution Orders only  

**Anti-overreach (binding for every EO)**:

> Any EO may execute **only** dispositions listed in this Plan.  
> It must **not** add Reality / Authority / Subject / Canon semantics during execution.  
> If an UNKNOWN or unlisted Reality-like path is found: **STOP + REPORT** — no on-the-spot adjudication.

**Hard bans unless an EO explicitly names a phase**:

```text
NO Authority Act implementation outside EO
NO SCHEMA / API / PROMPT / UI / RENAME unless EO-P2-unavoidable (else STOP)
NO Legacy migration without EO
NO reopening D1 philosophy
```

**Upstream (immutable for this plan)**:
- `d1-sealed/SPEC.md` — SEALED
- `d1-implementation-contract/APPROVED.md` — APPROVED
- `d1-implementation-contract/TRANSITIONAL-AUDIT.md` — COMPLETE

**Execution log**:
- `EO-P2` — **ACCEPTED + VERIFIED** 2026-09-03 — see `EO-P2.md`
- `EO-P1` — **ACCEPTED + VERIFIED** 2026-09-03 — see `EO-P1.md` / `INTERPRETATION-BLOCK.md`
- `EO-P3` — **ACCEPTED + VERIFIED** 2026-09-03 — see `EO-P3.md` / `OPERATOR-PROXY.md`
- `EO-P4` — **ACCEPTED + VERIFIED** 2026-09-03 — see `EO-P4.md` / `INFERENCE-DEMOTION.md`
- `EO-P5` — **ACCEPTED + VERIFIED** 2026-09-03 — see `EO-P5.md` / `AUTHORITY-ACT-DESIGN-GATE.md`
- `EO-P6` — **ACCEPTED + VERIFIED** 2026-09-03 — see `EO-P6.md` / `AUTHORITY-ACT.md`
- `EO-TR-01` — **ACCEPTED + VERIFIED** 2026-09-03 — see `EO-TR-01.md`
- `EO-P7` — **ACCEPTED + VERIFIED** 2026-09-03 — see `EO-P7.md` / `LEGACY-READ-PREFERENCE.md`
- `EO-D1-FINAL-VERIFY` — **ACCEPTED + VERIFIED** 2026-09-03 — see `EO-D1-FINAL-VERIFY.md` / `FINAL-VERIFY.md`
- **D1 MILESTONE FROZEN** — see `D1-MILESTONE-FREEZE.md` / `D1-STATUS.md`
- Post-D1 Class A/B/C **NOT AUTHORIZED** (taxonomy only; do not auto-start)
- Open residue: `TRANSITIONAL-RESIDUE.md` (W-04 / W-19 / W-09 registered)


**Invariant (every phase)**:

```text
Authority Subject = Author
Executor           = Operator (only under explicit / prior / traceable delegation)
Persistence        ≠ Reality Status
Narrative          = evidence / provenance only (never Authority)
```

---

## 0. Objective

Translate Transitional Audit classifications into an ordered engineering program:

| Verb | Meaning |
|------|---------|
| **CUT** | Stop Reality-like write and/or Reality-like interpretation (**D1-BLOCKED**) |
| **KEEP** | Leave running as-is under APPROVED CONTINUE / **D1-COMPATIBLE** |
| **MIGRATE** | Reclassify / quarantine / demote without claiming obtains (**D1-TRANSITIONAL** + Legacy L1+L3+L4) |
| **IMPLEMENT** | Build Claim→SoA→Author Act→Scope→obtains layer (later) |
| **VERIFY** | Witnesses / regressions proving Dual BLOCK and invariants |

---

## 1. Path disposition (by Audit ID)

### 1.1 D1-BLOCKED → CUT (then VERIFY)

| Audit ID | Path | CUT action (when Execution Order allows) |
|----------|------|------------------------------------------|
| **W-01** | L02 `mainGoal` → `13` | Stop emitting plan completion as facts append |
| **W-02** | modelled `causalChain.consequence` → `11` | Stop registering planned/modelled causal as occurred timeline |
| **W-03** | scene consequence defaults → `11` | Stop plan/inference outcomes as timeline events |
| **W-04** | `newForeshadow` → `12` | Stop plan foreshadow as Reality-like Canon write |
| **W-05** | accept → canonDelta with plan facts | Narrow accept: no Reality-like 11/13 from plan; keep workflow separately (§1.2) |
| **W-06** | validation.pass → commit → 11/13 | Uncouple qualification from Reality-like Canon write |
| **W-07** | commit full canonDelta plan→11/13 | Stop plan-derived 11/13 in commit path |
| **W-10** | `inkos post` as Authority | CUT interpretation Subject=Operator; require Author Subject + delegation for any Act execution |
| **W-17** | deriveRelationshipState as relationship **fact** | CUT fact interpretation; optional MIGRATE to ops hint (§1.2) |
| **W-18** | deriveClosingEmotion as Character **Reality** | CUT Reality interpretation |
| **I-01…I-10, I-12, I-13** | commit/accept/validate/labels/narrative/post/delete as obtains | CUT **interpretation** (docs + future reader contracts); Dual BLOCK A |
| **R-01** (as obtains) | loadBrainContext treats disk as obtains | CUT obtains interpretation; KEEP provisional read as MIGRATE |

**CUT order (execution, when ordered)**:

```text
C1  Dual BLOCK A — interpretation contracts / comments / golden witnesses
    I-01…I-13 (interpretation), R-01-as-obtains

C2  Dual BLOCK B — stop new Reality-like writes
    W-01, W-02, W-03  (11/13 plan/causal)
    then W-04, W-07 plan branch
    then W-05/W-06 uncouple (accept/validation no longer drive plan→11/13)

C3  Operator Subject ban
    W-10, I-12  (post ≠ Authority Subject)

C4  Anchor Reality-like
    W-17/W-18 Reality interpretation CUT; demote or strip later
```

### 1.2 D1-TRANSITIONAL → MIGRATE / KEEP (narrowed)

| Audit ID | Path | Disposition |
|----------|------|-------------|
| **W-08** | commit → 08 / states / chapters | **KEEP** as operational persistence; document Persistence≠Reality |
| **W-09** | intent → 08 board | **MIGRATE**: ops board only; CUT obtains reading |
| **W-05** (workflow) | accept unlock + text retention | **KEEP** workflow; CUT Reality bundle |
| **W-11** | writeModule carriers | **KEEP** (write≠Act) |
| **W-12** | generated 09 | **MIGRATE**: plan carrier only; CUT Author-Direction / Reality reading |
| **W-13** | authored 09 | **KEEP** provenance; CUT Act equivalence |
| **W-14** | patchCurrentStateTime | **KEEP** ops |
| **W-17** (demoted) | relationship as planner hint | **MIGRATE** optional after CUT fact role |
| **W-18** (demoted) | emotion as ops hint | **MIGRATE** optional |
| **R-01** | loadBrainContext | **MIGRATE**: registered_legacy / provisional; never obtains |
| **R-02** | planNextChapter reads | **KEEP** consume; **CUT** re-emit to 11/13 |
| **R-03…R-06** | confirmed/verified/ranking/knowledge | **MIGRATE** label demotion (no rename) |
| **R-08** | legacy 11/13 | **MIGRATE** L1 quarantine + L3 provisional read |
| **I-05…I-08** demotion | immutable/confirmed/verified/authored | **MIGRATE** semantics in docs first |

**Legacy (L1+L3+L4)** binding:

```text
Existing 11/13/08 → registered_legacy (MIGRATE semantics)
Readable (L3)
No new plan→11/13 Reality-like (L4 = CUT W-01…W-03)
```

### 1.3 D1-COMPATIBLE → KEEP

| Audit ID | Path | Disposition |
|----------|------|-------------|
| **W-15** | Writer → chapters/scenes | **KEEP** |
| **W-16** | Route sidecar | **KEEP** |
| **W-20** | Git snapshot | **KEEP** |
| **W-21** | delete draft | **KEEP** (≠ ¬obtains) |
| **W-22** | rollback as restore | **KEEP** storage; CUT ¬obtains interpretation (I-13) |
| **R-07** | Route LLM projection read | **KEEP** |
| **I-11** | Narrative as evidence | **KEEP** policy |

### 1.4 D1-UNKNOWN → DECIDE then MIGRATE/CUT

| Audit ID | Path | Plan |
|----------|------|------|
| **W-19** | NPC → `15` | Default: treat as **TRANSITIONAL** ops; decide before any Reality claim |
| **W-04** / foreshadow role | already BLOCKED as plan→12 | If non-plan authored foreshadow later: reopen as UNKNOWN→MIGRATE under Act only |

---

## 2. Execution phases (ordered)

**Do not start a later phase without human Execution Order naming that phase.**

### Phase P0 — Plan freeze

- Deliverable: this Implementation Plan  
- Status: **APPROVED** (2026-09-03)

### Phase P1 — Interpretation Dual BLOCK A (docs + witnesses)

**EO-P1 EXECUTED + VERIFIED.** See `EO-P1.md` + `INTERPRETATION-BLOCK.md`.

**CUT**: I-01…I-10, I-12, I-13 obtains interpretations; R-01-as-obtains reading.  
**KEEP**: I-11 Narrative = evidence.  
**NO**: realityStatus schema, label rename, Act, Legacy re-auth, W-04, auto-P3.

### Phase P2 — Write Dual BLOCK B (stop new plan→11/13)

**EO-P2 ACCEPTED + VERIFIED.** See `EO-P2.md`.

**CUT**: W-01, W-02, W-03 (+ W-07 plan branch via same delta).  
**NOT in EO-P2**: W-04, W-05/W-06 full uncouple beyond delta, Operator, Authority Act.

### Phase P3 — Operator Proxy boundary

**EO-P3 EXECUTED + VERIFIED.** See `EO-P3.md` + `OPERATOR-PROXY.md`.

**CUT**: I-12, W-10 Authority-Subject reading on `inkos post`  
**DONE**: Subject=Author, Executor=Operator stamp; delegation **not** assumed; Act **NOT IMPLEMENTED**  
**NOT**: authorization schema, Act, obtains, auto-P4

### Phase P4 — Anchor / inference demotion

**EO-P4 EXECUTED + VERIFIED.** See `EO-P4.md` + `INFERENCE-DEMOTION.md`.

**CUT** Reality/fact reading of W-17, W-18, inferWorldAfter-as-fact, extractBeatStateDelta-as-Canon.  
**KEEP** carriers as candidate / ops hint / Writer instruction.  
**NOT**: Act, TR-01 Operator delta, W-04, auto-P5.

### Phase P5 — Authority Act Design Gate

**EO-P5 EXECUTED + VERIFIED.** See `EO-P5.md` + `AUTHORITY-ACT-DESIGN-GATE.md`.

**Verdict**: **CONDITIONAL CLEARANCE FOR ACT DESIGN** — D1 not redefined; no schema/API invented.  
**P6 implementation**: **NOT AUTHORIZED** until human clears Gate.  
**TR-01**: remains **OPEN**.

### Phase P6 — Authority Act implementation

**EO-P6 ACCEPTED + VERIFIED.** See `EO-P6.md` + `AUTHORITY-ACT.md`.

**DONE**: Minimal `applyAuthorityAct` = sole obtains / ¬obtains source.  
**NOT**: TR-01 closed, P7, Canon refactor, 11/13 persistence of Acts, wrapping commit/post as Act.  
**Runtime fully closed**: **false**.

**EO-TR-01 EXECUTED + VERIFIED.** See `EO-TR-01.md`.

Operator / raw `delta` ↛ 11/13. Commit path not widened. P7 **DEFERRED**.

**EO-P7 EXECUTED + VERIFIED.** See `EO-P7.md` + `LEGACY-READ-PREFERENCE.md`.

Legacy readable; confirmed/verified/immutable ≠ obtains. No data deletion. Final VERIFY not started.

### Phase P8 — VERIFY suite

| Check | Against |
|-------|---------|
| Dual BLOCK A | I-* interpretations absent in contracts/readers |
| Dual BLOCK B | W-01…W-03 no new writes |
| Persistence≠Reality | W-08 still works; no obtains claim |
| Subject=Author | W-10/I-12 |
| Narrative=evidence | I-10 CUT; I-11 KEEP |
| COMPATIBLE kept | W-15, W-16, W-20–W-22 |
| Route Possibility | W-16, R-07 |

---

## 3. Phase dependency graph

```text
P0 Plan APPROVED
         │
         ▼
P2 Write BLOCK B (EO-P2)  ◄── first code cut (P1 optional / deferred)
         │
         ├─► P1 Interpretation BLOCK A (when EO'd)
         ├─► P3 Operator Proxy guards
         ├─► P4 Anchor/inference demotion
         │
         ▼
P5 Act design gate
         │
         ▼
P6 Act implementation
         │
         ▼
P7 Legacy reader preference
         │
         ▼
P8 VERIFY continuous
```

---

## 4. Explicit non-goals

- Reopen D1-B / C-1…C-6  
- Rename `confirmed` / `verified` / `immutable` / `accepted` (demote meaning only)  
- Implement Authority Act in P0–P4 without EO  
- Kill entire Planner / Writer / commit / accept workflow  
- Treat rollback/delete as ¬obtains  
- Silent grandfather of 11/13 as obtains  

---

## 5. Success criteria for “Transitional compliant runtime”

When P1+P2 (+P3 as needed) are executed under EO:

1. No **new** plan→11/13 Reality-like rows (W-01…W-03 CUT).  
2. No code path **documented or typed** as commit/accept/validate ⇒ obtains (I-01…I-04 CUT).  
3. commit→08/states/chapters still function (W-08 KEEP).  
4. Writer chapters + Route sidecar unchanged in role (W-15, W-16 KEEP).  
5. Operator never appears as Authority Subject (I-12).  
6. Legacy readable as registered_legacy only (R-08).  

Authority Act **not** required for Transitional compliance.

---

## 6. Stop rule

```text
P1–P7 + TR-01 ACCEPTED.
EO-D1-FINAL-VERIFY ACCEPTED.
D1 semantic core CLOSED; Runtime NOT closed; D1 NOT complete.
MILESTONE FROZEN — no D1 philosophy; Class A/B/C not auto-started.
```

---

## Signature (Plan)

```text
Status: APPROVED
Signed: 2026-09-03
Anti-overreach: binding
First EO: EO-P2 (plan→11/13 write CUT)
```

---

*Plan APPROVED. Further code only under named EO.*
