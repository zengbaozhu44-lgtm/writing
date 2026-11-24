# 06 — Phase 4.4 Final Design Gate (Contract Seal)

```text
PHASE 4.4 FINAL DESIGN GATE
STATUS: CONTRACT SEAL CANDIDATE — awaiting Unique-Authority Attack #04
MODE: Seal the Contract · NOT Seal the Implementation
CODE CHANGED: NO
GOLDEN CHANGED: NO
v0.2 CHANGED: NO
PHASE 5: FROZEN (interface wall only)
IMPLEMENTATION: BLOCKED
HUMAN SEAL: NOT ISSUED THIS DOCUMENT
```

**Upstream:** RA#01–#03 · AA16–AA21 DRAFT ACCEPTED · Human adjudication of #03  

**This Gate seals only:**

```text
FG-1  Evidence Contract
FG-2  Attribution system-fact locus (unique Authority)
FG-3  AA16–AA21 final wording + consumer boundaries
      (+ frozen ontology)
```

---

## 0. Master safety standard (FROZEN)

> **Attribution safety ≠ no code sets `attribution=true`.**  
> **Attribution safety = without Attribution Authority / PASS, no legal propagation path may produce an Attribution-equivalent system fact.**

```text
Prose → Occurrence
  ├──→ State / SR / Situation / Writer Context / Occurrence Actor / Hints
  │         (may inform; must not self-upgrade)
  └──→ [ATTRIBUTION GATE]  ← ONLY HERE
              ↓
        Attribution PASS
              ↓
     Character Causal History
              ↓
          Phase 5 consumer
```

---

## 1. Frozen ontology (FROZEN)

```text
Occurrence ≠ Attribution ≠ Choice ≠ Consequence

Occurrence Actor ≠ Attributed Actor

Attributed Action ≠ Chosen Action
```

| May hold together | Example |
|-------------------|---------|
| Attribution PASS + Choice UNKNOWN | Impulse: hear cry → rush to child |
| Attribution PASS + Choice VALID | Coerced conscious tradeoff / E4 fork |
| Occurrence without Attribution | Grammar-extracted action; Plan-fed Writer prose |

**Not frozen:** “every Action requires Choice.”

---

## 2. FG-1 — Evidence Contract (SEALED)

### 2.1 Roles

| Source | Role in 4.4 | May enter Attribution Gate? | As what? | Must not be |
|--------|-------------|----------------------------|----------|-------------|
| **Prose** | Primary narrative surface | YES | **Evidence** (subject / agency / presence cues) | Attribution itself |
| **Occurrence / Actual** | Event candidate + text grounding | YES | **Evidence candidate** (that an event was extracted; not that it is attributable) | Attribution; Attributed Actor |
| **Occurrence Actor / participants** | Text-related persons | YES | **Evidence of participation mention** only | Attributed Actor; Attribution PASS |
| **State / StateDiff** | World/character **properties** | YES | **Evidence** under this contract (AA16) | Attribution Authority; sole mint |
| **Character SR** | Subjective projection | YES | **Evidence** of awareness/belief/stance at *t* (IB-gated); property awareness OK | Causal History Authority; auto “做过/决定” |
| **Situation** | Writer/Planner **Context** | **NO** as Evidence Authority | Context fuel only (AA20) | Evidence Authority; Attribution; certificate |
| **characterHints** | Occurrence-derived hint | YES **only if** provenance-tagged | **Evidence** (occurrence-derived), never Attribution object | Character Action fact; Causal History input |
| **Historical Attribution PASS** | Prior Gate results | YES | **Evidence of past attribution** for *other* decisions — **↛** auto Attribution at *t1* (AA10/A5) | Current PASS without local evidence |
| **Historical Occurrence / timeline** | Past what-happened | YES | **Context / occurrence evidence** | Current Attribution; densification fuel toward PASS |
| **L1 VALID** | Choice Formation judgment | YES | **Optional evidence** of formation — **↛** Attribution alone; **↛** Choice≡Attribution | Attribution Authority; Production Choice mint (v0.2) |
| **Plan / Desire / Pressure / Writer intent** | Instruction / influence | **NO** | — | Attribution Evidence; Attribution Authority |
| **Writer Context aggregate** | Prompt packaging | **NO** as Authority | May *carry* sealed Evidence copies with provenance | Second Attribution truth |

### 2.2 Forbidden Gate input pattern

```text
FORBIDDEN:
  all context dumped into LLM
    → LLM decides Attribution
    → mint PASS
```

**Required:**

```text
Evidence Source
  → typed under Evidence Contract (role + provenance)
  → Attribution Gate
  → PASS | UNKNOWN | INVALID
```

### 2.3 Gate outputs (only)

```text
PASS     → may write Attribution Record (see FG-2)
UNKNOWN  → no Attribution-equivalent system fact; Occurrence may remain
INVALID  → not attributable (e.g. SubjectAbsent); Occurrence may remain
```

Gate does **not** output Choice. Gate does **not** output Consequence.

### 2.4 OPEN for implementation (not blocking Contract Seal of *roles*)

- Exact serialization / sidecar schema  
- Whether Gate is deterministic rules, constrained classifier, or hybrid  
- OPEN-4.4-2 L1 required vs optional  

---

## 3. FG-2 — Unique Attribution system-fact locus (SEALED)

### 3.1 Single Authority

> **Attribution-equivalent system fact MUST have one authoritative locus.**

**Name (conceptual):** `Attribution Record` / **Attribution Registry**  
(Implementation shape OPEN — sidecar vs field — but **semantic uniqueness is SEALED**.)

```text
Attribution Record (sole Authority for system fact)
  characterId
  occurrenceRef / eventId (optional link)
  actionDescription (what is attributed)
  status: PASS | UNKNOWN | INVALID
  evidenceRefs[] (contract-typed)
  storyClock / sceneId
  provenance: attribution_gate
```

**ONLY** a Gate PASS (or explicit Gate INVALID/UNKNOWN write) may create/update this locus for that (character, action, t) claim.

### 3.2 What other stores MUST NOT be

| Store | Allowed | Forbidden |
|-------|---------|-----------|
| State | Properties; may be cited as evidence | Second “she performed X” truth |
| SR | Property / subjective fields; may cite evidence | Shadow Attribution / “做过” as Authority |
| Situation | Context | Certificate / Attribution truth |
| Actual / Timeline | Occurrence | Attribution truth |
| characterHints | Occurrence-derived hint | Attribution truth |
| Character Causal History | **Projection/consumer of Registry PASS only** | Independent mint |
| Writer Context | May **reference** Registry status if present | Invent system PASS |
| Derived / Implicit / Confidence scores | — | **Forbidden** shadow Attribution (AA21) |

```text
Canonical Attribution Registry
  + Shadow Attribution
  + Implicit Attribution
  + Derived Attribution
= FORBIDDEN architecture
```

### 3.3 Character Causal History

```text
Character Causal History
  = projection / ordered view of Attribution Record where status=PASS
  ≠ independent Authority
```

Future Context may expose History **only** as references to Registry PASS entries — not as a second mint surface.

### 3.4 OPEN for implementation

Exact file/table name; indexing; migration — **not** sealed here.

---

## 4. FG-3 — AA16–AA21 final wording + consumers (SEALED)

| ID | Final wording |
|----|----------------|
| **AA16** | State / StateDiff / property history **↛ Attribution Authority**. State **alone ↛** Attribution-equivalent system fact. State **may** be Evidence into Attribution Gate under FG-1. |
| **AA17** | `characterHints` = **Occurrence-derived hint**, never Character Action fact. Causality consumers must not ingest `{character,action,stateChanges}` as Attribution. Hints may enter Gate **only as Evidence** with provenance — never as Attribution object. |
| **AA18** | Occurrence Actor ≠ Attributed Actor. Occurrence Actor ↛ Attribution. Keep Occurrence participants for Phase 1–2. |
| **AA19** | SR may hold world-property awareness. SR ↛ auto “离开过/做过/决定过” without legal Attribution/Choice path. SR ≠ Causal History Authority. |
| **AA20** | Situation / State-derived / SR-derived context → Writer = **context fuel**. ≠ Evidence Authority, ≠ Attribution / Causal History / Choice **certificate**. |
| **AA21** | Unattributed Occurrence must not raise Attribution status via repetition, re-narration, or State/SR accumulation. `UNKNOWN×N ↛ PASS`. No `attributionConfidence` / movement score shadow. |

### characterHints consumer boundary (SEALED)

| Consumer | Allowed? |
|----------|----------|
| Evolution / debug / non-causal context | YES (as occurrence-derived hint) |
| Character Causal History | **NO** |
| Attribution Registry mint | **NO** |
| Attribution Gate as **Evidence** (provenance-tagged) | YES under FG-1 |
| Attribution Gate as **Attribution** | **NO** |
| Phase 5 Attributed Cause | **NO** |

### Phase 5 interface wall (unchanged)

```text
Phase 5 consumer requires Attributed Action (Registry PASS)
Occurrence Action ↛ Attributed Cause
```

No Consequence design in 4.4.

---

## 5. What this Final Design Gate does NOT seal

```text
NO implementation
NO schema migration
NO runtime characterHints code change
NO L1 Observer
NO Choice Engine
NO Phase 5
NO Human Seal of full Phase 4
NO Narrative Attention
```

**Semantic contract safety** may PASS after Unique-Authority Attack.  
**Implementation enforceability** remains NOT SEALED until implementation + tests.

---

## 6. Prerequisites before Human Seal (4.4)

| Item | Status after this doc |
|------|------------------------|
| FG-1 Evidence Contract | **SEALED (design)** |
| FG-2 Unique locus | **SEALED (design)** |
| FG-3 AA16–21 + hint consumers | **SEALED (design)** |
| Unique-Authority Attack #04 | **REQUIRED NEXT** |
| Human Seal | After #04 PASS + Human decision |
| Implementation | After Human Seal |

---

## 7. Document index

| File | Role |
|------|------|
| `01_*.md` | Working design (historical DRAFT trail) |
| `02_*.md` | Propagation matrix |
| `03`–`05` | Attacks |
| **`06_final-design-gate.md`** | **This Contract Seal** |
| `07_unique-authority-attack.md` | Final reverse attack on unique Authority |
