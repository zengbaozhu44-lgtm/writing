# 08 — No-Choice Character Action Bypass Audit

**Mode:** DIRECTED BYPASS AUDIT · READ-ONLY  
**Contract target:** v0.2 (unchanged)  
**Prior:** `07_concrete-adversarial-trace-audit.md` — Choice-mint loop results **retained**  
**Code / Golden / Design Contract:** NO CHANGES  

**Human adjudication context:** PASS on Choice-mint walls ≠ ready for Human Seal.

---

## 0. Attack Class Distinction

| Class | Question | #07 result |
|-------|----------|------------|
| **Choice mint laundering** | Can the system mint a Production Choice object without authority? | Walls **BLOCKED** — retained |
| **No-Choice Action laundering** | Can a fabricated decision/action become Canonical Actual → State → SR and act as *de facto* Character Causality **without** any Choice object? | **This audit** |

InkOS objective is not “no Choice object appears.”  
It is: **distinguish Character-real choice/action from author/system fabricated choice/action.**

```text
Problem A: Production Choice object mint?
  → v0.2 has walls (R13). #07 PASS retained.

Problem B: Writer-generated decision/action enters story reality
         and is later treated as “what the character did”
         without Character Causality / Action Intent attribution?
  → #07 did not close this. This audit attacks it.
```

---

## 1. Primary Question

> Can a Writer-generated Action that lacks Production Choice / Action Intent Authority (and lacks sealed Character Causality attribution) **legally** become Canonical Actual and continue to drive State Evolution / SR — thereby obtaining **factual Character Causality status** without a Choice object?

---

## 2. Concrete Authority Trace (live + contract-legal)

### Proven runtime chain (Phase 1–3.2 + Studio production)

```text
Plan / Pressure / Desire / Goal / causal_chain
        ↓
Writer (createLlmWriter / Studio writer)
        ↓
Prose (decision-shaped or action-shaped)
        ↓
ensureActualEvents (event-extractor)  → StoryEvent.action from text
        ↓
evolveFromChapter (state-evolution-engine)  → timeline / state diffs from Actual
        ↓
character-sr-updater  → SR awareness from Actual+IB
        ↓
Next scene Writer (SR + state as context)
```

Archaeology (`_AI_PHASE4_1_CAUSALITY_ARCHAEOLOGY.md` §7):  

```text
Plan → Writer → Actual Action = FABRICATED / PSEUDO-CAUSAL (primary path)
Writer → Action (no attribution) = FABRICATED
```

### Contract v0.2 explicitly licenses the occurrence half

From `02_ontology-authority-map-v0.2.md` / `04_anti-laundering-matrix-v0.2.md`:

| Edge | Mark |
|------|------|
| Plan → Writer (instruction/situation) | **LEGAL** |
| Writer → Prose (incl. decision narration) | **LEGAL** |
| Prose → Actual (occurrence) | **LEGAL** |
| Actual → State Evolution | **LEGAL** |
| Actual → SR awareness (fact) | **LEGAL** |
| Actual → Choice Authority | **FORBIDDEN** |

**R13 / R14 are not violated** by this path: no Choice object is minted; Actual does not claim Choice Authority.

**Yet de facto Character Causality is obtained:** the character’s world-state and SR now record that **they did the thing**, and future narration can treat it as given (“既然她已经决定逃走…” / location updated / awareness of escape).

---

## 3. Directed Traces A–G

| Trace | Path | Can Action become Canonical Actual→State→SR without Choice/Action Intent? | Violates R13/R14? | Status |
|-------|------|-----------------------------------------------------------------------------|-------------------|--------|
| **A** | Plan → Writer → Action → Actual → State | **YES** | No | **BYPASS (no-Choice)** |
| **B** | Plan → Writer → decision prose → Actual → State | **YES** | No | **BYPASS** |
| **C** | Pressure → Writer → Action → Actual → State | **YES** | No | **BYPASS** |
| **D** | Desire → Writer → Action → Actual → State | **YES** | No | **BYPASS** |
| **E** | SR → Writer → Action → Actual → State | **YES** (SR as prompt context ≠ attribution gate) | No | **BYPASS** |
| **F** | Writer → Action → Actual → SR → future Action | **YES** (compounded: prior fabricated Actual shapes next Writer) | No | **BYPASS** |
| **G** | Writer decision prose → L1 VALID ↘ Actual → State | **YES** for Actual→State; L1 VALID still ↛ Choice | No | **BYPASS** (dual surface) |

### Trace detail — promotion without Choice mint

```text
Producer:     Plan / Pressure / Desire / Writer improvisation
Artifact:     Decision-shaped or Action-shaped prose
Consumer:     Actual extractor (occurrence authority)
Authority:    Text-grounded Actual (Phase 1) — NOT Character Causality
Transformation: “system wanted escape” → “escape happened in story”
Promotion point: Prose action phrase → StoryEvent.action → StateDiff / SR.awareness
Missing gate:   Character Causality / Action Intent attribution before
                treating Action as character-attributable Canon driver
Exact bypass:   Entire LEGAL occurrence pipeline; Choice object never required
```

### Trace G (upgraded Trace D)

```text
Plan / fear / pressure
  → Writer: “She realized… and decided to leave.”
  → L1 VALID?     (Question A only — R13 holds)
  → Actual escape (LEGAL occurrence)
  → State / SR    (LEGAL)
  → future Writer uses that as given character history
```

**Agency-shaped prose → Action-shaped Canon: YES.**

#07’s HIGH (“Writer can create Agency-shaped prose”) **understates** the issue: the prose is not only L1-readable; it is **Actual-extractable and State-driving**.

---

## 4. Answer to the Single Question

```text
ANSWER: YES

A Writer-generated Action without Production Choice / Action Intent Authority,
and without sealed Character Causality attribution, CAN legally become
Canonical Actual and drive State Evolution / SR under current Phase 1–3.2
runtime and under Contract v0.2 occurrence rules.
```

This is **not** Choice-object laundering.  
It is **Character Causality laundering by Action-canonization**.

```text
Choice mint walls: intact
Character Causality (attributability) in production: NOT established
```

---

## 5. Severity

| Claim | Severity |
|-------|----------|
| R13/R14 Choice-mint bypass | Not demonstrated (walls hold) |
| No-Choice Action → Canon as de facto character-attributable history | **CRITICAL** for Phase 4 **objective** |
| Human Seal of “Phase 4 Design Gate complete for Character Causality” | **NOT READY** |

**CRITICAL** here means: Seal would falsely imply Character Causality is design-complete while the production main bridge remains `Plan → Writer → Actual Action` (archaeology).

---

## 6. Phase Ownership (do not premature-fix Phase 4 contract)

### What this is NOT (premature fixes — **rejected this round**)

```text
❌ Actual must pass L1 before Canon
❌ Every Character Action must have Choice ID first
❌ Writer forbidden to write “决定”
❌ State must refuse Writer Action
❌ Actual must carry Choice ID
❌ New Causality Engine
```

Any of these would prematurely lock Action / Choice / Consequence / Actual boundaries that Phase 5 still owns for closure semantics.

### What this IS

| Layer | Ownership |
|-------|-----------|
| Occurrence pipeline Prose → Actual → State (facts happened) | Phase 1–2 — **must remain**; stories need events |
| Choice **object** mint anti-laundering | Phase 4 Contract v0.2 — **DONE for Design Gate walls** (#07) |
| Missing **Action attribution** before Action is treated as character-causal | **Phase 4 incomplete goal** — V2.0 **Phase 4.4 Choice → Action** (`Character SR → … → Choice → Action`; replace `Plan → Expected Action → Writer`) |
| Consequence fidelity / world closure after attributed Action | **Phase 5** (`Choice → Action → Consequence → Actual → State`) — assumes attribution chain exists |

**Verdict on ownership:**

> This bypass is a **Phase 4 Design Gate residual** against the Phase 4 objective (Character Causality / attributability).  
> It is **not** fixed by editing v0.2 Choice-mint text.  
> It is **not** “only Phase 5” in a way that lets Phase 4 claim Seal-complete.  
> Implementation of Action attribution gates belongs to **Phase 4.4+** (and Phase 5 consumption), after Human acknowledges this residual — **without** insurance-patching v0.2 now.

---

## 7. Relationship to #07

| #07 retained | This audit adds |
|--------------|-----------------|
| Plan→…→L1→Choice **BLOCKED** | Plan→…→Actual→State **OPEN as LEGAL occurrence / CRITICAL for attributability** |
| World/SR→Option→Choice **BLOCKED** | Irrelevant to this bypass class |
| Actual→Choice **BLOCKED** | Actual→**character-attributable history without Choice** **REACHABLE** |
| Writer↛ production Agency/Choice Authority | Writer→**Canon Action** still **REACHABLE** |

#07 is **not rolled back**. Its Choice-mint PASS stands.  
Seal criteria that only check Choice mint are **insufficient** for Phase 4’s stated goal.

---

## 8. Contract Change Recommendations

```text
DESIGN CONTRACT CHANGED: NO (this round)
```

**Do not** revise v0.2 to close this with premature Actual/L1/Choice-ID rules.

**Do** record for Human Seal packet:

1. Choice-mint anti-laundering: PASS (#07).  
2. No-Choice Action bypass: **ATTACK SUCCEEDED** — CRITICAL residual.  
3. Human Seal of Phase 4 Design Gate for **full Character Causality** = **NOT READY** until residual is either:  
   - explicitly scoped as accepted Design Limitation → Phase 4.4 work item, with Human eyes open; or  
   - addressed in a later Phase 4 design increment that defines Action attribution **without** freezing Phase 5 Consequence mechanics.  
4. Implementation remains **BLOCKED**.

---

## 9. Final Verdict

```text
PHASE 4 — NO-CHOICE CHARACTER ACTION BYPASS AUDIT

STATUS:
ATTACK SUCCEEDED — MATERIAL UNRESOLVED

CHOICE-MINT WALLS (#07):
RETAINED PASS

CONTRACT v0.2:
UNCHANGED · CHOICE-MINT WALLS STAND

CODE CHANGED:
NO

GOLDEN SPEC CHANGED:
NO

DESIGN CONTRACT CHANGED:
NO

PHASE 4 IMPLEMENTATION:
BLOCKED

HUMAN SEAL:
NOT READY
```

### One-line finding

> **Agency-shaped / decision-shaped Writer prose can become Action-shaped Canon (Actual → State → SR) without minting Choice and without Character Causality attribution — and Contract v0.2 currently licenses the occurrence half of that path.**

### Combined Design Gate posture

```text
PHASE 4 CONTRACT v0.2:
  PASS WITH A MATERIAL UNRESOLVED ATTACK

Implementation: BLOCKED
Human Seal: NOT READY YET
```

**PHASE 4 DESIGN GATE APPROVED:** not claimed.  
Next: Human decides whether to (a) acknowledge residual and scope Phase 4.4, or (b) commission a Phase 4 design increment on Action attribution — **still no code, no v0.2 insurance patch.**
