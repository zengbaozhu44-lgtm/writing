# 35 — Character Choice Ontology Necessity Design Gate

```text
MODE: DESIGN GATE · READ-ONLY ARCHAEOLOGY · NO CODE
EO: EO-4.4-CHOICE-ONTOLOGY-NECESSITY-DESIGN-GATE

CODE CHANGED: NO
GOLDEN / SPEC / FIXTURES: UNCHANGED
CHOICE SCHEMA / REGISTRY / ENGINE: NOT DESIGNED
CANDIDATE OPTION / L2: NOT DESIGNED
PRODUCTION MOUNT: NO
ROADMAP: UNTOUCHED

UPSTREAM:
  #32 L1 Observer = SEALED (test-only)
  #33 L1 Consumer = NOT YET DEFINED
  #34 Post-A Bridge = BRIDGE UNKNOWN (PASS → STOP)
  Phase 4.4 FG: Occurrence ≠ Attribution ≠ Choice ≠ Consequence
  “every Action requires Choice” = NOT FROZEN
  OPEN-4 = concept for Question B IF minting; not proof of necessity
  Human Intervention = UNFROZEN USER INTENT
```

**Single question:**

> Does InkOS **need** an independent `Character Choice` production semantic object?

Not: how to implement · Candidate Option · L2 · fields · popup UI.

**Principle:** Prove the irreplaceable gap — or do not build.

---

## 1. Current Story-Truth Capability Inventory

Desired story questions → what existing (or frozen-but-separate) layers already address:

| Story question | Expressible today / under sealed layers? | Primary carriers |
|----------------|------------------------------------------|------------------|
| 人物做了什么？ | **YES** | Actual / Occurrence |
| 人物是否作为主体做了？ | **YES (partial production)** | Attribution Gate → Registry (PASS); soft path |
| 人物主观上知道/相信什么？ | **YES** | Character SR |
| 世界/人物状态如何变化？ | **YES** | State Evolution / StateDiff |
| 行为之后发生了什么？ | **YES as Occurrence aftermath**; Phase 5 Consequence authority **FROZEN** | Actual text-noted aftermath; Phase 5 not unfrozen |
| 正文是否显示“形成选择”的证据？ | **YES (test-only)** | L1 `observeL1` Question A |
| 人物“选择了哪一个”？ | **NO sealed production object** | Plan/causal_chain “choice” = Narrative Fuel only |
| 为何这么做（系统权威意图）？ | **NO Choice Intent object**; partial cues in prose / SR / Attribution evidence | Not a Choice mint |
| 该行为是否改变人格？ | **Partial** via SR/State evolution from Actual+Attribution-informed updates | No Choice→Personality edge required in code |
| 后续是否因此改变？ | **Partial** via State/SR continuity; Phase 5 frozen | — |

```text
Already available without Character Choice object:
  Actual + Attribution + Character SR + State Evolution
  (+ L1 as optional Formation evidence classifier)
  (+ Phase 5 Consequence still FROZEN — independent of Choice object)
```

---

## 2. Choice Formation / Selection / Action Occurrence

| Concept | What it is | Needs a distinct **runtime object**? |
|---------|------------|--------------------------------------|
| **Choice Formation** | Prose evidence that Access∧Agency∧SubjectPresent hold (Question A) | **Judgment** exists (`observeL1`) — not a Choice *record* |
| **Choice Selection** | Which path / dominance among alternatives | **Not sealed**; L2 not entered; no proof it needs a store |
| **Action Occurrence** | What happened | **Yes** — Actual / StoryEvent (already) |

```text
形成选择 ≠ 选择了哪个 ≠ 实际做了什么

Concept trichotomy is useful analytically.
It does NOT prove three production objects are required.
```

Frozen 4.4 examples already allow:

```text
Attribution PASS + Choice UNKNOWN   (e.g. impulse)
Attribution PASS + L1-style VALID    (conscious tradeoff)
Occurrence without Attribution
```

and explicitly:

```text
Not frozen: “every Action requires Choice.”
```

Gate outputs: **no Choice**, **no Consequence**.

---

## 3. Capability test — if Character Choice object is absent

| Capability | Lost without Choice object? |
|------------|-----------------------------|
| Record that an action occurred | **No** — Actual |
| Record attributability | **No** — Attribution Registry |
| Record subjective fuel | **No** — SR |
| Record state change | **No** — State Evolution |
| Audit whether prose shows formation evidence | **No** — L1 judgment (may stay diagnostic) |
| Stop Plan/Writer from *looking like* Choice | **Contract/AA20 demotion** — not solved by minting Choice objects |
| Authoritative “character selected option X at t” as system fact | **Would be missing as a typed Choice fact** — but that is a *desired certificate*, not yet proven necessary for story truth |
| Ranking / dominance among options | Missing as L2 — **not proven necessary** |
| Human popup payload | **Not proven** to require Choice object (see §6) |

```text
Absence of a Choice object does not by itself collapse
Actual / Attribution / SR / State story truth.

What collapses is only the ability to mint a sealed
“Chosen Action / Choice ID” system fact — which v0.2
already refuses to mint from Plan/Writer/Actual/L1 alone.
```

---

## 4. Irreplaceable semantic gap search

Sought: a story capability that **cannot** be expressed by:

```text
Actual + Attribution + Character SR + State Evolution
(+ optional L1 judgment)
(+ future Consequence without equating it to Choice)
```

and **requires** a Character Choice production object.

| Candidate “gap” | Assessment |
|-----------------|------------|
| Distinguishing impulse vs deliberated act | **Expressible** as Attribution ± L1 VALID/UNKNOWN without Choice ID |
| Distinguishing occurrence vs attributable deed | **Expressible** — Occurrence ≠ Attribution (already sealed) |
| Distinguishing narration of “选择” from system Choice | **Expressible** — AA20 Narrative ≠ certificate |
| Recording which of two forks was taken | Often **reduces to Actual action description** + optional L1 Access evidence; Selection store not proven required |
| Authorizing Writer to “realize Choice” | OPEN-4 *concept* — circular if used as necessity proof for Choice object |
| Phase 5 Consequence | Frozen; Consequence ≠ Choice; does not prove Choice object |

```text
CHOICE OBJECT NECESSITY = NOT PROVEN

No irreplaceable gap found that forces a Character Choice
production object under current frozen architecture.
```

This is **not** a claim that Choice can never be useful later.  
It is a claim that **necessity is unproven**, so **do not build**.

---

## 5. Personality / State Change — does it need Choice?

Human interest:

```text
Choice → Personality Change
```

Archaeology / contract-aligned alternative:

```text
Character SR / internal state (prose + IB)
  → Action narration → Actual
  → Attribution? (optional PASS)
  → State / SR Evolution
  → (later) Consequence consumers when unfrozen
```

| Claim | Status |
|-------|--------|
| Personality change **requires** Choice object | **NOT FOUND** in code or sealed contract |
| Personality/state change from Actual+SR+State | **PRESENT** path shape |
| L1 VALID required for personality change | **NOT FROZEN** (4.4: Choice not required for every attributable Action) |

```text
“Choice” as human language for deliberation
  ≠
Runtime Authority object
```

Do not add a system object merely to match English/Chinese vocabulary.

---

## 6. Human Intervention — minimal semantics (non-contract)

```text
Human Intervention Rule = UNFROZEN USER INTENT
```

Intervention, if ever designed, might need *information* such as:

```text
protagonist identity
decision-relevant situation (may be Narrative Context, not Choice)
behavioral divergence cues in prose or plan fuel
potential character-state impact (SR/State projections)
```

None of these **prove** a Character Choice production object is required.  
They might be satisfied by Situation + SR + Actual + human UI over Narrative Track.

```text
Do NOT freeze popup → Choice object
Do NOT implement popup this Gate
```

---

## 7. Candidate Option — still necessary?

```text
NO — not as a consequence of Choice-object necessity
     (necessity itself NOT PROVEN)

Remains:
  UNKNOWN / NOT AUTHORIZED
  NO PRODUCER / NO STORE
```

If Choice object is not proven necessary, Candidate Option as its upstream is **even less** justified.

---

## 8. L2 — still necessary?

```text
NO — not as default

L2 presupposes Selection among alternatives after Formation.
Without proven Choice / Selection production semantics,
L2 remains NOT ENTERED.
```

---

## 9. Character Choice Object Necessity Verdict

```text
CHOICE OBJECT NECESSITY:

NOT PROVEN
```

| Related claim | Status |
|---------------|--------|
| Must implement Choice because OPEN-4 exists as a name | **REJECTED** — name ≠ necessity proof |
| Must implement Choice because roadmap had Choice Engine | **REJECTED** — roadmap ≠ sealed necessity |
| Must implement Choice because L1 exists | **REJECTED** — L1 = Formation evidence; R13 forbids L1→Choice |
| Choice object conflicts with frozen architecture if auto-minted from Plan/Actual/L1 | **Yes that path conflicts** — but necessity NOT PROVEN is the primary verdict, not CONFLICTS for the ontology question itself |

```text
NOT PROVEN ≠ failure
NOT PROVEN = architectural subtraction success criterion met
```

---

## 10. Next-step recommendation

```text
STOP on Choice implementation.

If Human continues:
  Prefer Design Gates that strengthen what IS proven necessary:
    · Attribution completeness / consumers (already Layer B)
    · L1 diagnostic mount policy (still optional; #33/#34)
    · Phase 5 Consequence only when Human unfreezes
    · Human Intervention as its own Design Gate (UNFROZEN → freeze or reject)

Do NOT open:
  Choice Registry EO
  Candidate Option EO
  L2 EO
  Choice schema design
  “implement OPEN-4” EO solely because the label exists

OPEN-4 remains:
  a reserved Question-B authority slot IF Human later proves Choice object necessity
  — not a build order
```

---

## Final block

```text
DESIGN GATE RESULT:

PASS — CHOICE OBJECT NECESSITY NOT PROVEN

→ STOP
```

```text
NO CODE
NO CHOICE SCHEMA
NO CHOICE REGISTRY
NO CHOICE ENGINE
NO CANDIDATE OPTION
NO L2
NO L1 PRODUCTION MOUNT
NO SR/ACTUAL/ATTRIBUTION/PLAN → CHOICE
NO HUMAN POPUP IMPLEMENTATION
NO GOLDEN / SPEC / FIXTURE / ROADMAP EDIT

AWAIT HUMAN ADJUDICATION
STOP
```
