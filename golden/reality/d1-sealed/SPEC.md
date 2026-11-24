# D1 — Sealed Contract Record

**Status**: `SEALED`  
**Date sealed**: 2026-09-03  
**Rule**: Do not expand D1. Do not reopen closed philosophy. Implementation requires a separate Implementation Contract.

This document **records** frozen decisions. It does **not** invent new ontology.

---

## Seal map

| Layer | Status | Content |
|-------|--------|---------|
| D1 Negative Boundary (N1–N9) | **FROZEN** | `d1-negative-boundary/SPEC.md` |
| D1-B Reality / Actuality / Obtains | **FROZEN** | §1 below |
| D1-C-1 Authority Subject | **FROZEN** | §2 |
| D1-C-2 Authority Target | **FROZEN** | §2 |
| D1-C-3 Authority Act | **FROZEN** | §2 |
| D1-C-4 Authority Scope | **FROZEN** | §2 |
| D1-C-5 Authority Conflict | **FROZEN** | §2 |
| D1-C-6 Authority Revocation | **FROZEN** | §2 |
| Production implementation | **BLOCKED** | Final Compliance Audit 2026-09-03 |

---

## 1. D1-B — Minimal Positive Reality Definition (FROZEN)

Reality concerns **states of affairs** in the story world.

A state of affairs is actual insofar as it **obtains** in that world.

`obtains` is an ontological primitive.

`obtains` is **not** reducible to: observation, knowledge, belief, narrative, confirmation, validation, registration, storage, writing, commit, acceptance, or causal efficacy.

```text
commit(P) ≠ obtains(P)
accept(P) ≠ obtains(P)
validate(P) ≠ obtains(P)
confirm(P) ≠ obtains(P)
write(P)  ≠ obtains(P)
register(P) ≠ obtains(P)
```

### Negation (FROZEN)

```text
obtains(¬P) ≡ ¬obtains(P)
```

No independent Negative SoA category.  
`¬obtains(P)` does not require another positive `obtains(Q)` as explanation.

---

## 2. D1-C — Reality Authority (FROZEN)

### C-1 Subject

**Author** is the sole ultimate Reality Authority Subject.

Runtime / Planner / Writer / LLM / Validation / Route / Memory / Commit / Consistency / Metrics / CLI process have **no** independent final Reality Authority.

Author identity alone does **not** make arbitrary P obtain.

**OPEN (not sealed)**: Non-Author Operator delegation.

### C-2 Target

Final semantic Target = **State of Affairs**.

Claim = minimum propositional pointing unit (not the Reality ontology unit).

Chapter / Artifact / Prose / File / Bundle = carriers only.

```text
Authority(Chapter) ≠ obtains(all claims in Chapter)
Authority(Artifact) ≠ obtains(all claims in Artifact)
Authority(Bundle) ≠ obtains(Bundle)
```

### C-3 Act

A Reality Authority Act is an Author act whose **semantic function** is to adjudicate whether a specific State of Affairs obtains or does not obtain.

Defined by semantic function, not UI / syntax / schema / magic words.

```text
write / save / commit / validate / register / accept(Chapter) / silence / delete / rollback
  ≠ AuthorityAct
```

unless the semantic function is explicit world-fact adjudication.

### C-4 Scope

Scope is determined by the Act’s semantic content: a **finite, bounded, semantically recoverable Target Set**.

Scope **must not** expand via inference, carrier boundaries, logic, causation, common sense, or incidental inclusion.

### C-5 Conflict

Conflicting Authority Acts on the same SoA → **Authority Conflict** (Authority layer).

Not a third Reality truth value. No automatic latest/timestamp/version/score wins.

Unresolved adjudication ≠ `obtains = UNKNOWN`.

### C-6 Revocation

```text
Revocation(Authority(P)) ≠ ¬obtains(P)
Revocation(Authority(P)) ≠ obtains(P)
```

Revocation retracts prior Authority. Negation requires a separate Negative Authority Act.

---

## 3. How a Claim obtains Reality Status (FROZEN chain)

```text
Claim  (points to)
  → State of Affairs
  → Author Authority Act (C-3)
  → Authority Scope (C-4 Target Set)
  → obtains(P) | ¬obtains(P)
```

Anything outside this chain is **not** Reality Status.

**Production code**: `CLAIM-LEVEL-AUTHORITY = NOT IMPLEMENTED` (Final Compliance Audit).

---

## 4. Who can produce Authority (FROZEN)

| Actor | Can produce Reality Authority? |
|-------|--------------------------------|
| Author | **Yes** — only via Authority Act (C-3), not via ordinary write/accept/save |
| Non-Author Operator | **OPEN** — delegation undecided |
| Character | **No** — utterance ≠ proposition truth (N8) |
| Planner | **No** |
| Writer / LLM | **No** |
| Runtime / Validation / Commit / Route / System | **No** |

---

## 5. Evidence / Observation / Belief / Proposal (not Authority)

| Kind | Role |
|------|------|
| Evidence | Material that may support an Act; not obtains |
| Observation | Epistemic; ≠ obtains |
| Knowledge / Belief | Epistemic; ≠ world fact |
| Narrative / Prose | Carrier / expression; ≠ obtains |
| Plan / Possibility / Proposal | Generative; ≠ obtains |
| Validation / Consistency pass | Process qualification; ≠ obtains |
| Registration / Storage / Commit | Persistence; ≠ obtains |

---

## 6. Explicit non-expansion

D1 is **sealed**. Do not add:

- new Reality ontology
- new truth values
- Dream / Flashback / Retcon semantics (still deferred)
- Character State → Reality (D2)
- Writer → Reality Gate design (D5)
- Batch Authority mechanism design
- Operator delegation decision (wait for Implementation Contract / human)

---

*Sealed record only. No production implementation authorized.*
