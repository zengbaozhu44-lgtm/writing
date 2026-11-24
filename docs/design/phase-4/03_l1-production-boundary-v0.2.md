# 03 — L1 Production Boundary v0.2

**Companion to:** Semantic Contract v0.2  
**Golden:** `golden/reality/l1-choice-formation/SPEC.md` — authoritative for Question A

---

## 1. Legal L1 pipeline

```text
Prose (+ optional pov)
        ↓
Evidence classification
  (closed Golden taxonomy: Access E1–E5, Agency cues, SubjectAbsent)
        ↓
Judgment: VALID | UNKNOWN | INVALID
```

```text
L1_VALID(R,t) := Access(R,t) ∧ Agency(R,t) ∧ SubjectPresent(R,t)
```

---

## 2. Explicitly prohibited pipeline

```text
Prose
  → invented Candidate Options
  → Choice
```

Also prohibited:

```text
Prose + Plan/SR/canon/expected
  → Observer
```

Observer must **not** read: expected, evidence annotation, Plan, intent, scene goal, causalChain, canon, metrics, Character SR.

---

## 3. Closed I/O constraint (Necessary extension)

**Allowed outputs:** judgment enum + optional structured evidence **labels** drawn from Golden taxonomy (e.g. access_level ∈ {E1…E5, insufficient, ambiguous}, agency ∈ {present_cue, insufficient, …}, subject ∈ {present, absent, ambiguous}).

**Forbidden outputs:** free-form option strings invented by plausibility (escape, stay, fight, take key, run away, …).

| Input prose | Legal | Illegal |
|-------------|-------|---------|
| 他看着门。 | UNKNOWN (insufficient Access/Agency) | Option=leave |
| 她知道钥匙在桌上。 | Fact cue only; not Option Access for escape | Option=take key and escape |
| 他很害怕。 | Fear ≠ Choice; UNKNOWN unless more evidence | Option=run |
| E5 pure action | UNKNOWN for formation | Infer Choice |
| E3 没做 X | No automatic Y | Infer chosen Y |
| E2 only | Access for **negated** path only (L1-U03) | Infer second chosen path |

---

## 4. L1 vs Production

| | L1 Judgment | Production Choice |
|--|-------------|-------------------|
| Question | A — evidence sufficiency | B — authority to instantiate Choice |
| Bridge | **None sealed** | OPEN-4 required for mint |
| Rule | `L1 VALID ↛ production Character Choice` | Cannot use L1 VALID as laundering stamp |

L1 may later run on production prose for **audit / diagnostics**.  
That use still does **not** mint production Choice.

---

## 5. Golden alignment

| Rule | Class |
|------|-------|
| Prose-only input | Explicitly supported |
| E1–E5 / L1-U03 | Explicitly supported |
| Agency / SubjectAbsent / P07 U08 I06 | Explicitly supported |
| VALID ≠ ontological Choice | Explicitly supported |
| Closed-label I/O (no option invention) | **Necessary extension** of iron law |
| L1 VALID ↛ production Choice | **Necessary extension** (production layer) |
| SR as Observer input | **Conflict** if proposed — **rejected** |
