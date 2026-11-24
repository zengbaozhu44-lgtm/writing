# L1 Choice Formation — Golden Fixture Specification

**Phase**: 7.6  
**Status**: FROZEN (read-only oracle; no Observer implementation)  
**Contract**: Phase 7.4 L1 Semantic Contract (frozen)

## Epistemology

L1 does **not** assert that prose contains an objective `Choice` object.

L1 asserts that prose may contain **semantic evidence** sufficient for an Observer to **adjudicate** Choice Formation:

```
L1_VALID(R,t) := Access(R,t) ∧ Agency(R,t) ∧ SubjectPresent(R,t)
```

Observer output: `VALID | UNKNOWN | INVALID` only. No L2 Dominance.

## Oracle Architecture

```
                 ┌── prose (+ optional pov) ──→ Observer ──→ actual
Fixture ─────────┤
                 └── expected + evidence ─────→ oracle (human runner only)
```

- **Observer** reads: `prose`, optional `pov` (name resolution only).
- **Observer** must NOT read: `expected`, `evidence`, `forbidden_inference`, Plan, intent, scene goal, causalChain, canon, metrics.
- **`evidence`** is **human-authoritative rationale / oracle annotation** — explains why humans expect `expected`; not an input to Observer.

## Three Non-Negotiable Boundaries

1. **Reader counterfactual cannot create Access.**  
   「她当然也可以不捡」≠ Access evidence.

2. **Environmental explanation cannot auto-create Agency.**  
   「脚步声 → 所以她害怕 → 所以缩手」without text-world internal state = insufficient Agency.

3. **External coercion cannot auto-create Subject Absence.**  
   Forced but conscious choice may be VALID; unconscious / puppeted action is INVALID.

## Access Evidence Levels (frozen from 7.4)

| Level | Form | Sufficient for Access? |
|-------|------|------------------------|
| E1 | Explicit multi-option | ✅ |
| E2 | Negation of an action | ✅ (negated path entered model) |
| E3 | 「没做 X」alone | ❌ (does not prove Y was chosen) |
| E4 | Fork /取舍 narrative | ✅ |
| E5 | Pure action | ❌ |

**Critical rule (L1-U03):** One E2 proves the **negated** path was in model; it does **not** license inferring a second chosen path.

## Agency Minimum (frozen from 7.4)

Agency requires traceability to **narrated internal state** at moment *t*:

- desire, fear, habit (when text marks deliberation), curiosity, duty, judgment, disgust, impulse, character tendency
- OR E4 fork where the sustained/refused branch is **conscious** (e.g. 「痛得吸气…可她没放开」)

**Insufficient:**

- External facts alone (「机器还在动」)
- Environmentally plausible inference without text (footsteps → fear → withdraw, unless prose states fear)

## Subject Presence → INVALID

Only `SubjectAbsent` yields `INVALID`:

- sleep / unconscious / dissociation
- pure reflex without awareness
- acting without knowing one acts
- explicit loss of agency (puppet, another's hand on hers)

**Not INVALID:** fear, pain, threat, irrationality, coercion while conscious.

## Fixture Groups

```
L1 Choice Formation Golden
│
├── P  positive          → expected: VALID
│   ├── explicit multi-option (E1)
│   ├── negation (E2)
│   ├── fork narrative (E4)
│   ├── coercion + presence
│   ├── fear + choice
│   └── pain + persistence
│
├── U  unknown_boundary  → expected: UNKNOWN
│   ├── pure action (E5)
│   ├── habit / routine
│   ├── reader counterfactual trap
│   ├── E2 without second path (L1-U03 core)
│   ├── action + retrospective reason
│   └── ambiguous hesitation
│
└── I  invalid_boundary  → expected: INVALID
    ├── unconscious
    ├── reflex
    ├── sleepwalking
    ├── no awareness
    └── explicit loss of agency (incl. puppet)
```

## Runner Rules (when Observer exists)

| Group | Pass condition |
|-------|----------------|
| P | actual === VALID (zero false negative) |
| U | actual === UNKNOWN (zero false positive) |
| I | actual === INVALID (zero false positive) |

Until `L1_OBSERVER_IMPLEMENTED = true`, all fixtures **expect RED** (ENGINE_NOT_IMPLEMENTED).

## Forbidden Observer Inputs

Planner, intent, scene goal, causalChain, decision module, metrics, reader, critic, canon, `evidence` field, `expected` field.

## Relation to `golden/reality/*` claim fixtures

L1 Choice Formation fixtures are **orthogonal** to action/negation/belief claim fixtures.  
They adjudicate **Choice Formation observability**, not world-state claims.

---

## Phase 7.6 Closure (Frozen)

**Status:** FROZEN / APPROVED — 24 fixtures (`10 P / 8 U / 6 I`). Do not expand for coverage.

### Architectural Iron Law

> **L1 is Evidence-Based Observation, not Choice Generation.**

The only legal direction:

```
Prose → L1 Evidence → L1 Judgment
```

**Never** produce L1 Choice from:

- Planner → 「林岚应该选择 A/B」
- `causalChain.choice = X`
- Canon → 「林岚后来做了 X」（retroactive）

### What VALID Means

**VALID ≠** an ontologically proven Choice object in the world.

**VALID =** prose provides **sufficient evidence** under the L1 observation contract.

The Golden bench tests whether Observer **adjudicates faithfully** when given certain evidence — not whether Observer detects all real-world Choices in arbitrary prose.

### Oracle Supremacy

If Observer fails Golden:

> **Fix Observer. Do not modify Oracle or the L1 contract.**

Do not tune fixtures from production runs. Do not weaken L1-U03, P07/U08/I06, or Agency minimums because a strong model “feels right.”

### Coercion Triplet (frozen boundary set)

| Fixture | Prose pattern | Expected |
|---------|---------------|----------|
| L1-P07 | 枪口 + **清醒取舍** | VALID |
| L1-U08 | 枪口 + 「只能」+ **无取舍证据** | UNKNOWN |
| L1-I06 | **失去意识** + 他人代行 | INVALID |

Constraint ≠ Access ≠ Agency ≠ Subject Presence — each dimension judged independently.

### Next Phase (spec only)

**Phase 7.7 — L1 Observer Specification:** semantic spec, I/O boundaries, observation principles, fixture alignment. No production implementation, no schema, no Plan, no L2.
