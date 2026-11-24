# Phase 4 — OPEN-4 Minimal Character-Side Input Gate

```text
MODE: LAST MINIMAL GATE · READ-ONLY · NO IMPLEMENTATION

CODE / SCHEMA / PROMPT / GOLDEN / RUNTIME: UNCHANGED
NAMED EO: NONE
IMPLEMENTATION: NOT AUTHORIZED

FROZEN:
  OPEN-4 proposition PROVEN:
    Character X holds a character-attributable Action Intent whose content is Y
  Carrier / producer / consumer of Intent(Y) on production spine: ABSENT
  SR ≠ Intent · Plan/Director/Writer ↛ Intent authority
  Attribution = retrospective · not elevated
  Choice / Candidate Option / Agency / Goal / GGC / L1 production = not proven necessary
```

**Only question:**

> What is the **minimal character-side input** needed to produce the OPEN-4 Action Intent(Y) proposition for the production main path?

**Not this Gate:** Intent Authority system · Choice Engine · Option/Access/Agency/Goal · L1 · Consequence · full ontology · Evidence Bundle framework.

---

## 1. Does production already have character-side “decided / preparing to do Y” evidence?

```text
NO
```

Searched for non-Plan, non-Director, non-Writer-authority, non-Desire-alone evidence that Character X themselves decided or is preparing to take a **specific** Action Y.

### Audited near-misses (all fail as OPEN-4 minimal input)

| Candidate | File / function | Producer | Semantic | Why insufficient |
|-----------|-----------------|----------|----------|------------------|
| SR awareness / belief / stance / relevance | `character-sr-updater.js` `updateCharacterSRFromActual` | Actual → Fact IB → SR | Knows / interprets what happened | State ≠ decision-to-do-Y |
| SR / facing motive | `minimal-sr.js` `projectMotive` | authored / `characterFacing` / bible seed | Motive / long-term seed | Motive ≠ Action Intent(Y); authored/facing ≠ character-side decision evidence; bible `activates_current_motive: false` |
| Desire profile | `character-desire-engine.js` | storyDna / intent / authored desire | Desire / fear / wound | **Desire-alone** forbidden; does not bind next Action Y |
| `evaluateDecisions` | `decision/decision.js` | chapter plan loop | `action: scene.goal` + six checks | **Plan scene.goal** gate — STORY CONTROL, not character Intent |
| `deriveSceneChoice` / Beat action·choice | `scene-execution.js` | explicit Plan / scene fields | Plan choice / beat action | Plan ≠ character decision evidence |
| Attribution PASS + `actionDescription` | `attribution-wiring.js` | after Actual | Retrospective attributability | Wrong track; past Action ≠ prospective Intent(Y) |
| `StoryEvent.intent` | `event-extractor.js` / schema | text extract / templates | Occurrence annotation | Actual-layer; Actual ↛ Intent authority |
| observeL1 deliberation cues | `observe-l1.js` | test-only on prose | Question A evidence | Not production; Writer prose ≠ authority |

```text
EXISTING CHARACTER-SIDE ACTION-DECISION EVIDENCE
(suitable as OPEN-4 Intent(Y) input):
  NOT FOUND
```

---

## 2. If exists → reuse

```text
N/A
```

---

## 3. If absent → first minimum semantic gap

```text
FIRST MINIMUM SEMANTIC GAP:

  Production has no character-side action-decision evidence
  that can establish:

    “Character X holds Action Intent(Y)”

  (non-Plan · non-Director · non-Writer-authority · non-Desire-alone)
```

```text
MINIMUM NEW CAPABILITY:

  Only: establish / carry the minimal character-side
  action-decision evidence required to support the
  already-PROVEN OPEN-4 proposition Action Intent(Y)
  as STORY TRUTH for production consumption
  (so Writer can realize Y from that basis,
   not from Plan / SR-as-prompt alone).

  Not: Action Intent Authority Engine
  Not: Choice / Option / Agency / Goal Engine
  Not: full ontology / Evidence Bundle / Authority framework
```

**What this enables on the main route (conceptual only):**

```text
Character SR
  → [character-side action-decision evidence]   ← MISSING (this gap)
  → Action Intent(Y) as STORY TRUTH
  → Writer realizes Action Y
```

**Still OPEN (do not solve here):** how evidence is authored/extracted; Intent ≡ Choice; Option necessity; L1 mount.

---

## STOP

```text
LAST MINIMAL GATE: COMPLETE

QUESTION 1 (existing evidence?): NO / NOT FOUND

FIRST MINIMUM SEMANTIC GAP: FOUND
  = no character-side action-decision evidence
    for Action Intent(Y)

MINIMUM NEW CAPABILITY: NAMED ONLY
  = minimal character-side action-decision evidence
    to support OPEN-4 Intent(Y) STORY TRUTH

REUSE: NONE
DESIGN OF AUTHORITY SYSTEM: NOT PERFORMED
FULL PHASE 4: NOT DESIGNED

NAMED EO: NONE
CODE: NO CHANGES
SCHEMA: NO CHANGES
PROMPT: NO CHANGES
GOLDEN: NO CHANGES
RUNTIME: NO CHANGES
IMPLEMENTATION: NOT AUTHORIZED

STOP: YES
```
