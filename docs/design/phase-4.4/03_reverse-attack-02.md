# 03 — Phase 4.4 Reverse Attack #02

```text
PHASE 4.4 REVERSE ATTACK #02

TARGET:
  docs/design/phase-4.4/01_*.md
  docs/design/phase-4.4/02_*.md
  (runtime cited as evidence of live promotion surfaces — not modified)

MODE: ADVERSARIAL · READ-ONLY CODE · DESIGN AUDIT
CODE CHANGED: NO
GOLDEN CHANGED: NO
v0.2 CHANGED: NO
```

**Question:** Can the DRAFT’s **LEGAL** Occurrence → State / SR / Writer edges reconstruct **Character Attribution** (or Attribution-equivalent causal credit) without an Attribution Gate PASS?

**Standard:** “FORBIDDEN in a table” is insufficient. Need unreachable promotion (no legal authority / consumer / inference edge).

---

## 0. Executive verdict

```text
STATUS: ATTACK SUCCEEDED — DESIGN NOT SEAL-READY

CRITICAL holes in DRAFT legal propagation:
  B  State / StateDiff → Attribution inference
  C  World State → Writer Context → causal language → Actual loop
  A  Occurrence → SR awareness (agent-shaped) → “她做过”

DESIGN DRAFT (pre-patch): BLOCKED for Final Gate
IMPLEMENTATION: BLOCKED
HUMAN SEAL: NOT READY
```

Choice-mint walls (#07) and AA “Attribution ≠ Choice” principles are **not** the failure mode.  
Failure mode = **Occurrence-facing LEGAL consumers silently reconstructing agent credit.**

---

## Attack A — Occurrence → SR → “她做过”

### Trace

```text
Unattributed Action (Writer/Plan-shaped prose)
  → Actual (actors: [Alice], action: "走出了房间")
  → State / timeline
  → Character SR.awareness
  → future “她之前已经做过 X” / agent history
```

### Runtime evidence (live, not fixed this round)

`character-sr-updater.js`: if `accessible` and event has `info`, writes awareness:

```text
info ≈ "Alice：走出了房间"   (actors：action)
relevance = high when isActor
```

`groundedInfoFromEvent` formats **actor-colon-action**. That is **agent-shaped fact language**, not merely “room empty.”

### DRAFT defense

| Rule | Holds? |
|------|--------|
| SR “I chose / I as agent did X” FORBIDDEN | Stated — but **not** defined against agent-shaped awareness strings |
| SR world-fact awareness OPEN | **Hole:** OPEN + actor:action format ⇒ Attribution-equivalent history |
| Unattributed ↛ Character Causal History | Stated — no consumer wall on SR.awareness → Future Writer |

### Promotion point

```text
Actual.actors + Actual.action
  → SR.awareness.info (agent-shaped)
  → Future Writer / History treats as “她做过”
```

### Missing gate

1. Awareness payload must be **occurrence/world-framed**, or tagged `attributionStatus: none`.  
2. `isActor` must **not** upgrade relevance/history into causal self-credit without Attribution PASS.  
3. Consumer wall: SR.awareness ↛ Character Causal History / “做过” claims.

### Result

| Can bypass occur? | **YES** (DRAFT + runtime) |
| Severity | **CRITICAL** |
| Status | **BYPASS** |

World state may change; DRAFT does **not** yet make “no reverse attribution from SR” unreachable.

---

## Attack B — Occurrence → StateDiff → Attribution (highest risk)

### Trace

```text
Prose: 她走出了房间。
Actual: { action: leave_room, actors: [Alice] }
State:  { Alice.location: outside, room.occupancy: empty }

Later inference:
  Alice.location == outside
    ⇒ Alice 主动离开了房间
    ⇒ Agency / Attribution
```

### DRAFT defense

Collapse tests forbid `Actual → Attribution` auto.  
**No explicit rule:**

```text
State ↛ Attribution
StateDiff ↛ Agency
location(C) ↛ “C performed leave”
characterHints { character, action } ↛ Attribution
```

Runtime `mapActualEventsToEvolution` emits `characterHints: { character, action, stateChanges }` — a ready-made **Actor×Action** bundle for future consumers.

### Promotion point

```text
State.location / occupancy / characterHints.action
  → inferred Actor Action
  → inferred Agency
  → Attribution
```

### Missing gate

Seal:

```text
World/character State facts ↛ Attribution Authority
StateDiff ↛ Agency / Attribution
characterHints ↛ Attribution (hints are occurrence tags only)
```

Plus: State must be consumable as **positions/properties**, never as **proof of subject action**.

### Result

| Can bypass occur? | **YES** — DRAFT silent; runtime surfaces exist |
| Severity | **CRITICAL** |
| Status | **BYPASS** |

---

## Attack C — World State → Future Writer → self-proving loop

### Trace

```text
Actual: Alice 在门外
  → State / Situation prompt: “Alice 已经离开房间”
  → Writer: “既然 Alice 已经决定离开……”
  → Actual (decision-shaped)
  → State / SR reinforce
```

### DRAFT defense

| Edge | Mark | Hole |
|------|------|------|
| Writer as external situation | LEGAL (“room empty”) | Ambiguous: “Alice已经离开” is agent-implicating |
| Prompt “既然她已经决定” as system truth | FORBIDDEN | Does not stop Writer **generating** that language from situation, then Actual absorbing it (#08 loop) |

### Promotion point

```text
LEGAL Situation phrasing (character-as-mover)
  → Writer fabricated causal language
  → Actual occurrence
  → State (self-proving)
```

This reconstructs **Attribution-equivalent narrative credit** without Attribution Gate and without Choice mint.

### Missing gate

1. System Situation/context from unattributed Occurrence must be **non-agent** framed where possible (`门外有人` / `房间空了` / `Alice.location=outside` as fact — not “Alice离开了” as agent claim in system voice).  
2. Even if prose uses agent verbs historically, **system-backed** context must not assert Attribution.  
3. Writer output causal language remains narration; must not mint Attribution (already) — but **Situation templates** must not invite “决定” upgrades.

### Result

| Can bypass occur? | **YES** |
| Severity | **CRITICAL** |
| Status | **BYPASS** |

---

## Attack D — Grammar subject pollution

### Trace

```text
“她打开门。” → subject=她, verb=打开 → Attribution PASS?
“她被人操纵着打开了门。” → same grammatical subject
```

### DRAFT defense

A1: Grammar ≠ Narrative Subject ≠ Causal Subject — **stated**.

Runtime extractor (`ACTION_RE`) assigns `actors: [grammatical actor]` — **live pollution surface** for Occurrence (allowed) that later attacks A/B abuse.

### Result

| Design principle | **HOLDS** if sealed |
| Runtime Occurrence labeling | **Pollutes actors list** — feeds A/B |
| Attribution auto from grammar | **BLOCKED in DRAFT text** |
| Severity | **HIGH** (Occurrence actor tagging → later reverse inference) |
| Status | Principle **BLOCKED** (good); feeder **OPEN** |

---

## Attack E — L1 VALID → Attribution smuggle

```text
Prose → L1 VALID → Attribution ?
```

DRAFT: L1 LEGAL for Question A; FORBIDDEN as Attribution authority alone; collapse `L1 VALID → Attribution` FAIL.

```text
L1 VALID ≠ Production Choice ≠ Attribution
```

| Result | **BLOCKED** (DRAFT) |
| Severity | SAFE if sealed |
| Residual | Impl must not wire L1 VALID → attribution flag |

---

## Attack F — Attribution → Choice reverse pollution

```text
Attribution PASS ↛ Choice
```

Example: hear child cry → rush over → Attribution YES, Choice UNKNOWN.

DRAFT vocabulary + AA6 / Choice ≠ Attributable Action — **HOLDS**.

| Result | **BLOCKED** |
| Severity | SAFE |

---

## Attack G — Coercion / Impulse

| Case | Expected | DRAFT |
|------|----------|-------|
| Gun + hesitate + open door | Attribution may YES; Coercion ≠ Absence | Aligns A2 / Golden |
| Impulse rush, no multi-option | Attribution may YES; Choice UNKNOWN; not Choice-required | Aligns §2 |

| Result | **BLOCKED** (no reverse break of frozen principles) |
| Severity | SAFE |

---

## Attack H — Historical Attribution transfer

```text
Attribution(t0) PASS ↛ Attribution(t1) auto
```

DRAFT A5 / AA10 — **HOLDS**.

| Result | **BLOCKED** |
| Severity | SAFE |

---

## Summary matrix

| Attack | Reconstruct Attribution / agent credit? | DRAFT status | Severity |
|--------|----------------------------------------|--------------|----------|
| A SR “做过” | YES | **BYPASS** | CRITICAL |
| B StateDiff → Attribution | YES | **BYPASS** | CRITICAL |
| C State → Writer causal loop | YES | **BYPASS** | CRITICAL |
| D Grammar → Attribution | No (principle) | BLOCKED | HIGH feeder |
| E L1 → Attribution | No | BLOCKED | SAFE |
| F Attribution → Choice | No | BLOCKED | SAFE |
| G Coercion/Impulse reverse break | No | BLOCKED | SAFE |
| H Historical transfer | No | BLOCKED | SAFE |

---

## Required design changes (before re-attack)

Do **not** implement. Patch DRAFT only:

1. **AA11:** `State / StateDiff / location / occupancy ↛ Attribution / Agency`  
2. **AA12:** `characterHints` = occurrence tags only; `↛ Attribution`  
3. **AA13:** Unattributed SR.awareness must not be agent-credit shaped; forbid promotion to “做过/决定” history  
4. **AA14:** System Situation from unattributed Occurrence: prefer non-agent / property framing; system voice ↛ “决定/主动离开” as fact  
5. **AA15:** `Actual.actors` (grammar-derived) ↛ Attribution evidence  
6. Close `#02` OPEN on SR world-fact: split **world property awareness** vs **agent-action awareness** (latter FORBIDDEN without Attribution PASS)

Then: **Reverse Attack #02b** on patched DRAFT.

---

## Final verdict

```text
PHASE 4.4 REVERSE ATTACK #02

STATUS:
ATTACK SUCCEEDED

CODE CHANGED:
NO

GOLDEN SPEC CHANGED:
NO

v0.2 CHANGED:
NO

DESIGN CONTRACT (4.4 DRAFT):
NOT SEALED — CRITICAL PROPAGATION HOLES

PHASE 4.4 FINAL DESIGN GATE:
NOT STARTED

IMPLEMENTATION:
BLOCKED

HUMAN SEAL:
NOT READY
```

**One line:**

> LEGAL Occurrence→State/SR/Writer paths in the current DRAFT can still reconstruct Attribution-equivalent “她做过 / 她决定” credit — especially via StateDiff reverse inference and agent-shaped SR/Situation — without ever minting Choice or Attribution PASS.
