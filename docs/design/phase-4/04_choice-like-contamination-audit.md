# 04 — Choice-like Contamination Audit

**Source:** Phase 4.1 Archaeology + runtime symbols  
**Action this round:** classify only — **NO FIX**

| Object | File / Symbol | Classification | May enter L1? | May claim Character Choice? |
|--------|---------------|----------------|---------------|-----------------------------|
| plan.choice / scene.choice | scene-execution `deriveSceneChoice` | PLAN ARTIFACT | NO | NO |
| deriveSceneChoice | only explicit authored choice | PLAN ARTIFACT | NO | NO |
| causalChain.options | causal-reasoner authored options | PLAN ARTIFACT / Reasoner guidance | NO | NO |
| causalChain.choice | authored choice/climax | PLAN ARTIFACT | NO | NO |
| beat.choice / choiceHint | beat-state.js | NARRATIVE OPPORTUNITY / template | NO | NO |
| Beat Library Decision | F7 | FABRICATED CHOICE-LIKE (FAKE_CHOICE) | NO | NO |
| pressure / conflict / 三十秒 | conflict / hook | PRESSURE | NO (alone) | NO |
| desire / characterPush | desire-engine | DESIRE | NO | NO |
| scene.goal / beat.action | Director/Planner | NARRATIVE INSTRUCTION | NO | NO |
| Writer instructions | prompts | WRITER REALIZATION | NO | NO |
| CharacterSR.* | minimal-sr / updater | Character subjective fact | NO as Observer input | NO as Choice |
| L1 fixture expected | golden fixtures | ORACLE ANNOTATION | NO (Observer must not read) | N/A |
| Prose itself | chapters/scenes | NARRATIVE SURFACE | **YES (sole L1 input)** | Evidence only |

### Contamination path (live)

```text
Plan / Authored choice|goal
  → Beat / causal_chain / Situation
  → Writer
  → Prose Action
  → Actual
```

**Illegal reinterpretation:**

```text
Character → Choice → Action
```

**Mark:** CONTAMINATION PRESENT · DO NOT REPAIR IN DESIGN GATE

### Freeze candidate (Proposal F — for Human seal)

Plan / Reasoner / Beat / Director / Writer **may** produce:

- World Possibility  
- Pressure / Obstacle / Opportunity  
- Narrative Situation / Instruction  

They **must not** issue:

- Character Choice  
- Character Agency  
- Character Causality Authority  

**Care:** Do not mis-kill legitimate Narrative Situation / Pressure by over-broad “no Choice-like objects” bans — classify, don’t delete this round.
