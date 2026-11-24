# D1 Implementation Contract — APPROVED

**Status**: `APPROVED`  
**Signed**: 2026-09-03 (human)  
**Supersedes**: `PROPOSED.md`, `APPROVED-CANDIDATE.md`  
**Upstream**: `d1-sealed/SPEC.md` (SEALED)  
**Next**: Transitional Audit (READ ONLY) — not Authority Act implementation

**Hard bans until separate code Execution Order**:

```text
NO CODE · NO SCHEMA CHANGE · NO API · NO PROMPT · NO UI
NO RENAME · NO MIGRATION EXECUTION
NO Authority Act implementation
```

Next engineering step after signature: **D1 Transitional Audit** (read-only), not Authority Act coding.

---

## Resolved OPEN (human adjudication 2026-09-03)

| Former OPEN | Adjudication |
|-------------|--------------|
| Operator | **B — Explicit Delegation**, with D1-C-1 semantics |
| Legacy | **L1 + L3 + L4** |
| BLOCK strength | **Dual BLOCK**: semantic interpretation + Reality-like new writes |
| commit → 08/states | **Allowed** as operational storage only |
| Narrative | **Allowed as evidence**; never Authority / obtains |

---

## 0. Goals

1. Separate **registration / workflow / carriers** from **obtains / Authority**.
2. Define **Transitional State** so production can run without treating disk-write as Reality.
3. Define **BLOCK** vs **CONTINUE**.
4. Define migration **Transitional → D1 Authority** (design only; no execution).
5. Fix Operator as **Proxy under Author**, never as independent Authority Subject.

---

## 1. Authority Act — Minimal Engineering Representation

**Not a schema. Not an API.**

Minimum **identifiable semantic properties** of an Act (for later implementation):

| Property | Requirement |
|----------|-------------|
| **Authority Subject** | Always **Author** (C-1) |
| **Executor** | Author, or Operator under §3 delegation |
| **Semantic function** | World-fact adjudication of SoA(s): obtains / ¬obtains |
| **Target Set** | Finite, bounded, recoverable from Act content (C-4) |
| **Polarity** | Each target: obtains **or** ¬obtains (not both) |
| **Non-identity** | Distinct from write / save / commit / validate / accept / delete / rollback |
| **Conflict detectability** | Opposite Acts on same SoA → Authority Conflict (C-5) |
| **Revocability** | Revocation ≠ ¬obtains (C-6) |

**Principle**:

> An Authority Act is whatever makes the above properties **deterministically recoverable**.  
> It need not contain the words `obtains`, `true`, or `false`.  
> It must not be inferable from Chapter acceptance, commit success, or file location alone.

**Not Acts**:

- Chapter `accepted`
- `MemoryUnit.commit` success
- `immutable: true`
- Route `confirmed`
- S6.3 `verified`
- presence in `11` / `13` / `08`
- Operator `inkos post` without explicit Author delegation

---

## 2. Authority Act — Semantic Boundaries (not I/O API)

### Materials that may inform an Act (never auto-promote)

| Material | Role |
|----------|------|
| Narrative / prose | **Evidence** / carrier / Claim provenance |
| Plan / causal model | Proposal / modelled relation |
| Existing registrations (11/13/08) | `registered_legacy` / operational records |
| Validation / consistency | Qualification signals |
| Character utterance | Evidence of speech/belief (N8) |
| Route possibility | Possibility only |

### Semantic effects an Act may have

| Effect | Meaning |
|--------|---------|
| Adjudication over Target Set | obtains(P) or ¬obtains(P) for recoverable Claim→SoA |
| Revocation of a prior Act | Clears that Authority; does **not** assert ¬obtains |
| Authority Conflict | Incompatible effective Acts on same SoA |

**Contract wording (binding)**:

> The **semantic effect** of an Authority Act may be adjudication over a Target Set (obtains / ¬obtains), Revocation, or Conflict.  
> Concrete engineering inputs, outputs, and data structures are **not** specified here and must not be inferred as an API from this Contract.

### Forbidden

```text
Act ↛ obtain(*) for entire Chapter / Artifact by carrier boundary
Act ↛ expand Scope by inference
Act ↛ equal commit / accept / validate
silence ↛ Act
Narrative alone ↛ Act ↛ obtains
Operator execution alone ↛ Act
```

### Author editing vs Act

| Behavior | Authority Act? |
|----------|----------------|
| Edit bible / 09 / volume | **No** by default |
| Accept chapter | **No** |
| World-fact adjudication over recoverable Target Set | **Yes** when semantic function holds |

---

## 3. Operator — Explicit Delegation (B adopted)

### Binding rule (D1-C-1)

```text
Authority Subject = Author
Executor           = Operator (optional)
Delegation         = explicit + prior + traceable
```

Operator is a **Proxy / Executor**, **not** a Delegated Authority Subject.

```text
Author
  │  explicit + prior + traceable authorization
  ▼
Operator
  │  execution only
  ▼
Authority Act   (Subject remains Author)
```

### Critical supplement

**Operator execution does not automatically constitute an Authority Act.**

Required recorded distinction:

| Field (conceptual) | Value |
|--------------------|-------|
| Authority Subject | Author |
| Executor | Operator |
| Delegation | explicit / prior / traceable |

### `inkos post`

If used as Operator interface, it must execute only under an **already existing** Author authorization for a bounded Target Set.

```text
post ↛ Authority
post + valid Author delegation ↛ may execute Act (Subject still Author)
post without delegation → not an Act; Reality-authorizing use = BLOCK
```

Without delegation, post may at most be **operational registration repair** under Transitional rules — never Reality Authority.

---

## 4. Legacy Canon — L1 + L3 + L4 (adopted)

**Legacy** = disk content in `11` / `13` / `08` (and related) written **without** Authority Act.

| Rule | Binding |
|------|---------|
| **L1** | Treat as `registered_legacy` — **not** obtains |
| **L3** | May be **read** as provisional operational context |
| **L4** | **Stop new** plan → 11/13 Reality-like writes |

```text
Legacy existing data
        ↓
registered_legacy
        ↓
readable (provisional context)
        ↓
must NOT be interpreted as obtains
        ↓
must NOT be newly produced via plan→11/13
```

**Forbidden dual semantics**:

```text
D1: obtains = Author Authority Act
AND
old system: commit/plan/validation/confirmed ≈ Reality
```

Legacy may be read and quarantined. Legacy must **not** be re-produced as Reality-like Canon.

Future Author Acts (L2-style re-adjudication) remain available later; not required to start Transitional.

---

## 5. Label Semantic Demotion (NO RENAME)

| Label | Transitional / D1 meaning |
|-------|---------------------------|
| `confirmed` (Route) | Projection **eligibility** ≠ obtains |
| `verified` (S6.3) | Morphology / read **eligibility** ≠ obtains |
| `accepted` | Workflow unlock ≠ Authority(all Claims) |
| `immutable` | Retention policy ≠ truth / Authority |
| `authored` | Source classification ≠ Authority Act |
| `canonical` (S6.3) | Context eligibility ≠ Reality Authority |

---

## 6. Coexistence with D1

| Path | Rule |
|------|------|
| `MemoryUnit.commit` | **Operational / registration persistence permitted.** Persistence does **not** confer or imply Reality Status. Not an Authority Act. |
| commit → `08` / `states/` | **ALLOWED** as **operational storage only** |
| commit → plan-derived `11`/`13` as Reality-like | **BLOCK** (new production) |
| `acceptChapter` | Workflow unlock + artifact retention; ≠ obtains(all Claims) |
| `buildStateDelta` plan→11/13 | **BLOCK** new Reality-like writes (L4) |
| `validateChapter` / consistency | Qualification only |
| `writeModule` | Carrier editing; ≠ Act by default |
| `inkos post` | §3 only |
| Route / Writer chapters | CONTINUE as possibility / narrative carrier |
| Narrative | Evidence / provenance only; ≠ Authority |

**Binding sentence**:

> **Operational persistence is permitted; persistence does not confer or imply Reality Status.**

---

## 7. Transitional State

1. D1 philosophy **SEALED** and binding for interpretation.
2. Claim-level Authority **NOT IMPLEMENTED**.
3. Disk may hold registrations / operational boards / narrative carriers.
4. No path interpreted as creating obtains / Authority Act without §1–§3.
5. Dual BLOCK (§8) in force for interpretation and Reality-like new writes.
6. CONTINUE paths (§9) for carriers / workflow / possibility / qualification / operational storage.
7. Migration (§10) not executed.

```text
Transitional ≠ disk write is Reality
Transitional = disk write is registration/carrier/operational; Reality Authority absent
```

---

## 8. Dual BLOCK (adopted)

### BLOCK A — Semantic interpretation

Absolute ban on interpreting:

```text
plan = obtains
validation = obtains
accept = obtains
commit = obtains
confirmed = obtains
verified = obtains
immutable = obtains
post (alone) = Authority
```

### BLOCK B — Reality-like new writes

Stop **new** production of:

```text
plan → 11_timeline (as occurred world events)
plan / mainGoal → 13_facts (as world facts)
planned/modelled causalChain.consequence → 11 as actual occurrence
```

**Not** a stop of Planner / Writer entirely.

```text
BLOCK Reality-like write
CONTINUE ordinary carrier / possibility / operational write
```

| Path | BLOCK layer |
|------|-------------|
| L02 / plan → 13 as world fact | A + B |
| planned causal → 11 as occurred | A + B |
| accept as Authority(all Claims) | A |
| validation/consistency as obtains | A |
| commit as obtains | A |
| `inkos post` as Authority without delegation | A (+ B if writing Reality-like Canon) |
| `inferWorldAfter` as world-after **fact** | A |
| delete/rollback → ¬obtains | A |

---

## 9. CONTINUE

| Path | Allowed as |
|------|------------|
| Writer → chapters / scenes | Narrative carrier |
| Route → sidecar | Possibility |
| writeModule bibles / volume / authored 09 | Carrier |
| validate / critic / metrics | Qualification / telemetry |
| acceptChapter | Workflow + artifact |
| commit → chapter text + **08/states** | **Operational storage** |
| patchCurrentStateTime | Operational clock |
| snapshot / rollback | Storage versioning |
| deleteChapterDraft | Carrier purge |
| S6.3 / Route read filters | Eligibility (demoted) |
| loadBrainContext | Operational / legacy provisional read (**not** obtains) |
| Narrative as evidence | Evidence only |

---

## 10. Migration (design only)

```text
T0  This Contract signed → Transitional declared
    Dual BLOCK binding; labels demoted in docs

T1  Stop new PLAN→11/13 Reality-like writes
    Legacy = registered_legacy inventory

T2  D1 Transitional Audit (read-only) → D1-COMPATIBLE / BLOCKED / TRANSITIONAL / UNKNOWN
    Then Authority Act mechanism (separate Execution Order; no schema in this doc)

T3  Author Acts (Operator may execute under §3)
    Conflict / Revocation per C-5 / C-6

T4  Readers prefer Authority-backed SoAs; legacy provisional only

T5  Optional retirement of Reality-like interpretation of commit/accept/validation
```

**After signature, first engineering work = Transitional Audit (read-only), not Act implementation.**

---

## Signature block

```text
Status: APPROVED
Signed: 2026-09-03
Human: APPROVED (no further philosophy; no new blockers)
Next Execution Order: D1 Transitional Audit (READ ONLY) only
```

---

*APPROVED. No production code changes authorized by this signature alone.*
