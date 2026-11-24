# 01 — Phase 4.4 Character Action Attribution Design Gate (DRAFT)

```text
PHASE 4.4 DESIGN GATE
STATUS: SUPERSEDED FOR SEAL BY 06_final-design-gate.md
         (working DRAFT retained as trail)
FINAL CONTRACT SEAL DOC: 06_final-design-gate.md
UNIQUE AUTHORITY ATTACK: 07_unique-authority-attack.md
CODE / GOLDEN / v0.2: UNCHANGED
IMPLEMENTATION: BLOCKED
HUMAN SEAL: NOT ISSUED
```

**Upstream:** `#08` · `#09` · RA `#02` · RA `#02b` · RA `#03` · Final Design Gate `06`  
**Supersedes roadmap label:** “Phase 4.4 Choice → Action” → **Character Action Attribution**

---

## 0. Absolute rules

```text
READ-ONLY DESIGN
NO CODE
NO SCHEMA MIGRATION
NO v0.2 PATCH
NO “Actual must pass L1”
NO “every Action needs Choice ID”
NO “Writer may not write 决定”
NO State refusing Writer Action
NO new Engine
NO Phase 5 Consequence design
```

Preserve Phase 1–2 Occurrence pipeline.

---

## 1. Core questions (this Gate must answer)

### Q1 — Positive attribution

> Under what conditions may an Action that already exists as Actual be called  
> **“this character performed this Action as subject”**  
> (Character-attributable Action)?

### Q2 — Negative propagation

> If Attribution is absent, how far may the Action remain as **occurrence fact**,  
> and where is it **forbidden** to propagate as character history / character causality?

Do not answer by inventing runtime Engines. Prefer: authority split · consumer restrictions · provenance marks · non-promotion rules.

---

## 2. Frozen vocabulary

| Term | Meaning | Not meaning |
|------|---------|-------------|
| **Occurrence Action** | Action-shaped event in prose / Actual (`StoryEvent.action`) | Attributable / intended / chosen |
| **Character-attributable Action** | Action the system may treat as performed by the character **as subject** | Mere occurrence; Plan instruction; Writer whim |
| **Choice / L1 VALID** | Evidence judgment (and/or later production Choice) that a formation was evidenced | Not required for every attributable Action |
| **Action Intent Authority** | OPEN-4 from v0.2 — production authority to realize attributed decisions | Plan / Desire / Pressure / Writer alone |
| **Character History (causal)** | History usable as basis for future Character Causality | Raw Actual occurrence feed |

```text
Choice ≠ Attributable Action
```

Attributable Action **may** come from:

- explicit Choice Formation (L1/L2 path);
- non-rational but Agency-bearing act;
- impulse with Subject Presence;
- coerced but conscious act (Golden P07-class);
- simple subject action without multi-option structure.

Therefore Phase 4.4 is **not** “all Action requires Choice.”

---

## 3. Three layers (reuse #09)

```text
Layer A Occurrence:  Prose → Actual → State          (what happened)
Layer B Attribution: SR / Access / Agency / Presence → Attributable Action
Layer C Consequence: Attributed Action → Consequence → Actual → State  (Phase 5)
```

Target chain (conceptual — not implemented):

```text
Occurrence Actual (may exist without Attribution)
        │
        ├── as world/fact occurrence → State (limited — see §5)
        │
        └── Attribution Gate (Phase 4.4)
                │
                ├── FAIL / UNKNOWN → must not become Character Causal History
                └── PASS → Character-attributable Action
                                │
                                └── Phase 5 Consequence (frozen)
```

---

## 4. Q1 — When may Actual Action be attributed? (DRAFT criteria)

An Actual Action may be labeled **Character-attributable** for character `C` only if **all** hold:

### A1 — Subject participation (not grammar)

Evidence that `C` participated as **subject of the act**, not merely as patient / prop / location of an event.  
Align with Golden Subject Presence / SubjectAbsent (sleep, unconscious, pure reflex, puppet, …).  
**Not:** grammatical subject alone.

### A2 — Agency (or explicit SubjectAbsent → not attributable)

Narrated internal-state traceability at relevant *t*, **or** conscious coerced tradeoff (P07-class), per Golden Agency / Presence — **without** requiring multi-option Choice structure.  
**Not automatic from:** Plan, Pressure, Desire, SR fields alone, Writer preference, environmental plausibility.

### A3 — No false promotion from occurrence

```text
StoryEvent.action mentioning C
  ↛
Character-attributable Action for C
```

Extraction / occurrence is **necessary input candidate**, never sufficient attribution.

### A4 — Choice is optional upstream

| Case | May be attributable? |
|------|----------------------|
| L1 VALID + local Agency/Presence | Yes (strong) |
| No multi-option, but Agency + Presence | Yes (possible) |
| E5 pure action only | Usually **not** yet attributable (UNKNOWN) — same spirit as L1 |
| SubjectAbsent | **No** (not attributable; may still be occurrence) |
| Plan/Writer-only origin with no local subject evidence | **No** as attributable; occurrence may still record |

### A5 — Temporal locality

```text
Attribution evidence at t0
  ↛
Attribution of Action at t1
```

without t1-local evidence (reuse v0.2 historical non-transfer spirit).

**OPEN-4.4-1:** Exact production recorder for “attributable = true/false/unknown” (sidecar vs event field) — **not chosen this Gate**; semantics only.

**OPEN-4.4-2:** Whether L1 Observer is required, optional, or parallel for attribution — **must not** collapse to “Actual blocked until L1.”

---

## 5. Q2 — Unattributed occurrence: allowed vs forbidden propagation

### 5.1 Allowed (Occurrence stays Occurrence)

Unattributed Actual Action **may**:

| Use | Why |
|-----|-----|
| Remain in Actual / timeline as **what the text says happened** | Layer A integrity |
| Drive **world/location/object** State as **properties/positions** (not as proof of subject action) | `location=outside`; `room.occupancy=empty` |
| Appear in Writer as **external situation** in **non-agent / property framing** where system-authored | Prefer “房间空了” / “门外的位置上有 Alice” — not system-true “Alice 主动离开了” |
| Update SR **world-property awareness** only (see 5.3) | Fact Access ≠ agent history |

### 5.2 Forbidden (must not gain Attribution-shaped status)

Unattributed Actual Action **must not**:

| Use | Why |
|-----|-----|
| Be treated as **Character-attributable Action** | #08 core |
| Be treated as **Production Choice** / proof of Choice | R13 spirit |
| Be cited as **Agency / Access / Presence proof** for later attribution | Circular |
| Enter **Character Causal History** used as basis for future Character Causality | Trace F |
| License Writer lines of the form “既然她已经决定…” as **system-true attribution** | History pollution |
| Auto-upgrade SR from “event involving C” → “C authored this act / C decided” | Non-promotion |
| Allow **State alone** to mint Attribution or Attribution-equivalent system fact | **AA16** |
| Allow **characterHints** bundle as Attribution input to causality consumers | **AA17** |
| Equate **Occurrence Actor** with **Attributed Actor** | **AA18** |
| Allow grammar-derived Actual.actors alone as Attribution evidence | **AA15/AA18** |
| Write **agent-shaped** SR awareness / “做过/决定” without PASS | **AA13/AA19** |
| System Situation as Attribution / Causal History / Choice **certificate** | **AA14/AA20** |
| Raise Attribution status via cycle densification | **AA21** |

### 5.3 SR / History pollution wall (Trace F) — PATCHED AFTER RA#02

```text
Unattributed Actual Action
  ↛ Character Causal History
  ↛ future Character Causality basis
  ↛ “she decided / she chose / she as agent did X” as system fact
  ↛ agent-shaped SR.awareness used as “做过” history
```

**Split (closes former OPEN on SR world-fact):**

| Kind | Unattributed allowed? | Example |
|------|----------------------|---------|
| **World-property awareness** | YES (narrow, IB-gated) | “我在门外” / “房间是空的” as **location/property** — ≠ “我选择离开” |
| **Agent-action awareness** | **NO** without Attribution PASS | “我：走出了房间” / “我做过离开” / “我决定了” |

**Forbidden SR / prompt contamination:**

```text
Fabricated Plan→Writer Action
  → Actual
  → SR agent-action awareness / “I decided”
  → Future Writer “既然她已经决定…”
  → Actual / State reinforce
```

**State reverse-inference wall — refined by AA16 (after RA#02b):**

```text
State / StateDiff / property history
  ↛ Attribution Authority
  ↛ Attribution-equivalent system fact (State alone)

State → Attribution Gate (as evidence under sealed Evidence Contract)
  = FUTURE LEGAL (does not mint by itself)
```

State answers **where/what is**. Alone it must not establish **who authored the change as subject**.  
Gate may later combine State + prose + SR(t) — that is **not** State minting.

**OPEN-4.4-3:** Exact serialization of world-property vs agent-action awareness in runtime SR — design sealed in principle; implementation later.

### 5.4 Dual Actual channels (conceptual — not schema)

| Channel | Content | Downstream |
|---------|---------|------------|
| **Occurrence Actual** | What prose says happened; `participants/actors` = text-related | World State; limited SR property awareness |
| **Attributed Action record** | Character-attributable Action (Gate PASS) | Character Causal History; Phase 5 consumer |

```text
Occurrence Actor / participants
  ≠
Attributed Actor
```

Same prose event may create Occurrence always; Attribution optionally.  
**Do not** require Attribution for Occurrence to exist.  
**Do not** delete Occurrence `actors` to “protect” Attribution.

### 5.5 Core structure (what 4.4 must eventually Seal)

```text
                 ┌──────────────┐
Occurrence ─────→│              │
State ──────────→│              │
SR ─────────────→│ Attribution  │
Situation ──────→│    Gate      │
Prose Evidence ─→│              │
                 └──────┬───────┘
                        │
                  ONLY HERE
                        ↓
                Attribution PASS
                        ↓
              Character Causal History
                        ↓
                  Phase 5 consumer
```

All side paths:

```text
Occurrence / State / SR / Situation / Writer / characterHints
  → may propagate information
  → may help writing
  → may change world state
  → may produce new Prose / Occurrence
  → must NOT independently mint
      “C performed X as subject” as system fact
```

### 5.6 Context Non-Certification (AA20)

```text
Situation = Context
Situation ≠ Evidence Authority
Situation ≠ Attribution Authority
```

Same for State-derived / SR-derived **context** fed to Writer:  
fuel for narration only — never Attribution / Causal History / Choice **certificate**.

Writer may infer and write Attribution-like prose; that output is **new Prose → Occurrence only**, never system-confirmed Attribution (AA3 + AA20 + AA21).

### 5.7 No Credit Densification (AA21)

```text
Unattributed Occurrence must not raise Attribution status
via repetition, re-narration, or State/SR accumulation.

UNKNOWN + UNKNOWN + …  ↛  LIKELY ATTRIBUTED
UNKNOWN × N             ↛  PASS
```

No Attribution Gate ⇒ no attribution upgrade.

---

## 6. Relation to Choice / L1 / v0.2

| v0.2 rule | Phase 4.4 stance |
|-----------|------------------|
| L1 VALID ↛ Production Choice | **Preserved** |
| Actual ↛ Choice Authority | **Preserved**; extend spirit: Actual ↛ Attribution Authority |
| Writer narration ≠ Causality Authority | **Preserved**; Writer Action ≠ Attributable Action |
| OPEN-1 / OPEN-4 | **Remain OPEN**; Attribution Gate ≠ filling them by convenience |
| Closed L1 I/O | **Preserved** when L1 used |

```text
Production Choice ⊂ possible grounds for Attribution
Production Choice ⊄ all Attributable Actions
Attribution ⊄ automatic Choice mint
```

---

## 7. Anti-collapse rules

### 7.1 Retained foundations (AA1–AA15)

| # | Rule |
|---|------|
| AA1–AA10 | As prior (Occurrence ≠ Attribution; Writer ≠ Authority; …) |
| AA11 | *Superseded in force by AA16* — keep as historical: no State **Authority** mint |
| AA12 | *Superseded in force by AA17* — hints are occurrence-derived |
| AA13 | SR agent-credit shaped awareness without PASS — forbidden (supports AA19) |
| AA14 | System voice agent-credit from unattributed Occurrence — forbidden (supports AA20) |
| AA15 | Grammar actors ↛ Attribution evidence (supports AA18) |

### 7.2 Converged core after RA#02b (AA16–AA21)

| # | Name | Rule |
|---|------|------|
| **AA16** | **State Non-Minting** | `State / StateDiff / property history ↛ Attribution Authority`. `State alone ↛ Attribution-equivalent system fact`. **Future legal:** State → Attribution Gate as evidence under sealed Evidence Contract (does not mint alone). |
| **AA17** | **Occurrence-Hint Provenance** | `characterHints` = **Occurrence-derived hint**, never Character Action fact. Any `{character, action, stateChanges}` bundle must not be ingested by causality consumers as Attribution input. |
| **AA18** | **Dual Actor Ontology** | `Occurrence Actor ≠ Attributed Actor`. `Occurrence Actor ↛ Attribution`. Keep Occurrence participants/actors for Phase 1–2. |
| **AA19** | **SR Causal-History Wall** | Allow property awareness (“Alice 在门外”). Forbid auto-upgrade to “离开过 / 做过 leave / 决定过离开” without Attribution/Choice legal path. Character-owned SR ≠ Causal History Authority. |
| **AA20** | **Context Non-Certification** | Situation / State-derived context / SR-derived context → Writer = **context fuel only**. ≠ Attribution / Causal History / Choice certificate. |
| **AA21** | **No Credit Densification** | Unattributed Occurrence must not raise Attribution status via repetition, re-narration, or State/SR accumulation. `UNKNOWN×N ↛ PASS`. |

**AA22 / Phase 5:** Not expanded in 4.4. Interface wall only:

```text
Phase 5 consumer requires Attributed Action
Occurrence Action ↛ Attributed Cause
```

No Consequence design this phase.

---

## 8. Subtraction / non-solutions

Prefer:

```text
authority split
+ consumer restrictions
+ provenance / attribution status on consumption
+ non-promotion / non-densification
+ dual actor ontology
```

Reject for this Gate:

```text
Causality Engine
Mandatory Choice ID on every Action
Blocking Actual extraction until L1
Banning decision vocabulary in Writer
Deleting Occurrence actors
“State may never be Attribution evidence” (over-strong — use AA16)
Infinite AA prohibition lists
Phase 5 Consequence design
```

---

## 9. Adversarial attack list

| Attack | Status |
|--------|--------|
| RA#02 | DONE — SUCCEEDED (`03_*.md`) |
| RA#02b Semantic reconstruction | DONE — SUCCEEDED (`04_*.md`) |
| AA16–AA21 DRAFT PATCH | **THIS REVISION** |
| **Attribution Reconstruction Attack #03** | **NEXT** (`05_*.md`) |
| Final Design Gate | After #03 PASS only |

---

## 10. Implementation readiness (this Gate)

| Item | Status |
|------|--------|
| Layer A Occurrence | **READY** (do not break) |
| Choice-mint walls v0.2 | **READY** (#07 retained) |
| AA16–AA21 | **DRAFT PATCH** — await #03 |
| Attribution Gate Evidence Contract | **OPEN** (needed for State→Gate legality) |
| System-fact registry definition | **OPEN** (needed to operationalize AA21) |
| Recorder / schema | **OPEN** |
| Phase 4.4 Final Design Gate | **NOT STARTED** |
| Implementation | **BLOCKED** |
| Phase 5 | **FROZEN** (interface wall only) |
| Human Seal | **NOT READY** |

---

## 11. Gate verdict (this document only)

Working DRAFT trail. **Authoritative Contract Seal:** `06_final-design-gate.md`.  
**Unique Authority Attack:** `07_unique-authority-attack.md` → PASS WITH KNOWN LIMITATIONS.

```text
PHASE 4.4: CONTRACT SEAL READY FOR HUMAN REVIEW
IMPLEMENTATION: BLOCKED
HUMAN SEAL: NOT ISSUED
PHASE 5: FROZEN
```
