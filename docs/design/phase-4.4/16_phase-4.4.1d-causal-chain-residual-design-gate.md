# 16 — Phase 4.4.1d Character Causality Bypass / Causal Chain Residual Design Gate

```text
PHASE 4.4.1d
CHARACTER CAUSALITY BYPASS / CAUSAL CHAIN RESIDUAL
DESIGN GATE AUDIT

MODE: READ-ONLY / NO CODE
GOLDEN / v0.2 / Phase 5: UNTOUCHED
4.4.1c: SEALED (not reopened)
causal_chain: OBSERVED ONLY — NOT A REMEDIATION TARGET THIS ROUND

STATUS:
  DESIGN GATE AUDIT     COMPLETE
  RESIDUAL              CONFIRMED (HIGH)
  IMPLEMENTATION        ⛔ NOT APPROVED / BLOCKED
  NEXT                  Human adjudication of remediation strategy
                        ≠ Cursor “delete causal_chain”
                        ≠ Phase 5
```

**Upstream seal:** 4.4.1a–1c PASS · `#15` PASS WITH KNOWN LIMITATIONS  
**Target question:** How does `causal_chain` (and parallel plan densifiers) re-inject planned/reasoned “character causality” into Occurrence → Actual → State → SR → Future Context **without** Attribution Registry?

---

## 0. Executive verdict

| Question | Answer |
|----------|--------|
| Does `causal_chain` mint Attribution Registry facts? | **NO** — FG-1 forbids; Gate rejects `causal_chain` Evidence |
| Does `causal_chain` mint ontological Choice objects? | **NO** — plan artifact + prompt presentation only |
| Does `causal_chain` still densify Writer → decision-shaped Prose? | **YES — HIGH** |
| Does that Prose re-enter as Actual → State → SR → next Writer? | **YES — loop confirmed** |
| Is that loop blocked by 4.4 Registry? | **NO** — Registry is parallel soft; **not** on Writer read-back |
| Second Attribution Authority (Registry-class)? | **NO** |
| Second **narrative / prompt** Choice Authority? | **YES** — `renderCausalChain` “Chosen（已选）” + Director plan Choice/Desire/Situation |
| Character Causality laundering (narrative)? | **CONFIRMED** |
| May Cursor implement remediation now? | **⛔ BLOCKED** — need Human Design Gate on *how* to wall this without collapsing Occurrence∥Attribution∥Choice |

```text
4.4 Registry walls hold for system-fact mint.
4.4.1d residual is Writer-context densification → Occurrence laundering.
≠ “just delete causal_chain”
≠ “Action must pass Attribution before Actual”
≠ “add Causality Engine”
```

---

## 1. Residual loop (authoritative map)

```text
[AUTHORED] bible / chapter plan / facts / climax|choice slots
      ↓
ensureChapterCausalChain(bookDir, intent)
  packages/inkos-brain/src/causal/causal-reasoner.js
      ↓
intent.causalChain → scene.causalChain
  orchestrator.js · studio-orchestrator.js
      ↓
┌─ Channel L1: compileScenePrompt → renderCausalChain APPENDED (unbudgeted)
│    packages/inkos-prompt/src/compiler.js
└─ Channel P1: Studio formatNarrativeTask → renderCausalChain (protected)
     packages/inkos-runtime/src/compiler/prompt-compiler.js
      + parallel: formatSituationBlock / formatCharacterDesireBlock / Beat choice
      ↓
Writer / LLM
      ↓
scene.text   ← decision-shaped prose (“她还是…交出…”)
      ↓
ensureActualEvents  (text-only; ignores causalChain)     ← Occurrence OK
      ↓
├─ applyCharacterSRAfterActual  (forbids causalChain as SR fact)
├─ applyAttributionAfterActual  (soft; causal_chain ≠ Evidence)  ← 4.4 parallel
└─ evolveFromChapter → MemoryUnit.commit → State / Memory
      ↓
N+1 Writer fuel:
  formatActualEventsBlock (actors · action)   ← Occurrence as “who did what”
  SR prompt projection
  story memory / timeline
  ensureChapterCausalChain AGAIN from plan/bible (not from prose)
      ↓
Writer ← Context ↺
```

**Fork that matters:** plan-causal prompt authority and Occurrence read-back converge on Writer **without** Registry coupling.

Persistence: `ch_*_scenes.json` carries `scenes[].causalChain` + `actualEvents` + `characterSRState`; Attribution sidecar is **not** consumed by prompt compilers (grep: no `listAttributedActions` in prompt/runtime compiler).

---

## 2. Production / storage index

| Stage | Locus | Role |
|-------|-------|------|
| Produce | `causal-reasoner.js` `mockReason` / `deriveCausalChain` / `ensureChapterCausalChain` | Project authored desire/pressure/options/**choice**/consequence → `causal_chain` |
| Mount | `orchestrator.js` ~398–426; `studio-orchestrator.js` ~122–157 | One chapter chain; copy onto each scene |
| Render | `renderCausalChain` | Header: **「因果链（已确定，禁止重推因果）」**; line **「Chosen（已选）」** |
| Dual channel | L1 append + Studio P1 | Provenance notes intentional duplicate |
| Parallel densifiers | Director `formatSituationBlock`, `formatCharacterDesireBlock`, `deriveSceneChoice` → Beat plan | Second plan→Writer path (not Registry) |
| Extract | `ensureActualEvents` | **Never reads** causalChain |
| SR | `character-sr-updater.js` | **Forbidden** source list includes `causal_chain` / `causalChain` |
| State timeline | `resolveTimelineEvents` | Explicitly voids modelled causalChain |
| Attribution | `typed-evidence.js` FORBIDDEN + Gate | `causal_chain` ↛ Evidence Authority |
| Feedback | `actual-events-prompt.js` | N+1 “actors · action” must-承接 language |

---

## 3. Attack matrix (required 1–14)

| # | Attack | Result | Severity |
|---|--------|--------|----------|
| 1 | `causal_chain → Writer` | **HIT** — protected / unbudgeted render; dual channel in Studio | **CRITICAL** |
| 2 | `causal_chain → decision prose` | **HIT** — “Chosen（已选）…由「X」做出” + desire/pressure/options steer LLM | **CRITICAL** |
| 3 | `decision prose → Actual` | **HIT** — text extractor creates Occurrence; plan fields stripped but **prose content** remains | **HIGH** |
| 4 | `Actual → State` | **HIT** — Phase 1–3 legal; Occurrence→State independent of Attribution | **EXPECTED** (Occurrence layer) |
| 5 | `State → SR` | **PARTIAL** — SR from Actual+IB; causalChain forbidden as SR *source*; agent-shaped awareness residual still possible from prose-derived Actual (AA19 surface) | **MEDIUM** |
| 6 | `SR → future Writer` | **HIT** — SR projected as context fuel (AA20); not certificate, still densifies | **MEDIUM–HIGH** |
| 7 | `future Writer → new Action` prose | **HIT** — prior Actual “must-承接” + plan causal re-mount | **HIGH** |
| 8 | new Action → Actual | **HIT** — same extractor | **HIGH** |
| 9 | Loop = **Character Causality laundering**? | **YES (narrative)** — plan “Chosen” → prose → Occurrence “actors·action” → treated as settled who-did-what **without** Gate PASS. **NO (Registry mint)** — does not create Attribution-equivalent system fact | **CRITICAL / SPLIT** |
| 10 | Second Attribution authority? | **NO** Registry-class competitor. Soft Attribution wiring remains sole mint path | **PASS wall** |
| 11 | Bypass 4.4 Registry? | **YES for narrative causality** (Writer never needs PASS). **NO for Registry write** | **CRITICAL gap (layer mismatch)** |
| 12 | Rebuild “她已经做过 / 她决定过” from State/SR/History? | **PARTIAL** — State alone ↛ Attribution (AA16 held). Actual Events block + SR can **narrate** “做过” to Writer without PASS (AA19/AA20 residual) | **HIGH** |
| 13 | Implicit Choice authority in `causal_chain`? | **YES** — prompt ontology: “已确定 / Chosen（已选） / 禁止重推因果”. Not v0.2 Choice object mint, but **Writer-facing Choice certificate language** (AA20 violation in spirit) | **CRITICAL** |
| 14 | Untyped causal data in Writer Context? | **YES** — full `causal_chain` object rendered as prose block; also JSON hashed into L1 cache key; Director Situation/Desire/Beat parallel | **HIGH** |

### Frozen inequalities stress

| Inequality | Under residual |
|------------|----------------|
| Occurrence ≠ Attribution | **Held** at Registry; **blurred** in Writer fuel (`actors · action` reads like attributed deed) |
| Attribution ≠ Choice | **Held** (Gate emits no Choice) |
| Choice ≠ Consequence | **Held** at object layer; prompt still pairs Chosen + consequence when choice present |
| Actual ≠ Character Causality | **Violated narratively** when plan-Chosen densifies Actual then SR/N+1 |
| Writer ≠ Choice Authority | **Violated in practice** when prompt says Chosen already decided |
| L1 ≠ Production Choice | **Held** (L1 oracle untouched); production uses plan causal, not L1 |

### AA16–AA22 against residual

| ID | Name | Residual interaction |
|----|------|----------------------|
| **AA16** | State Non-Minting | **Held** for Registry. State evolution from densified Actual is still legal Occurrence→State |
| **AA17** | Occurrence-Hint Provenance | Hints path separate; not primary residual. Still no hints→Registry |
| **AA18** | Dual Actor Ontology | Actual.actors from densified prose can be read as “Attributed Actor” by humans/future consumers if unlabeled |
| **AA19** | SR Causal-History Wall | Source ban on causal_chain **held**; prose→Actual→SR awareness can still agent-shape |
| **AA20** | Context Non-Certification | **PRIMARY FAIL SURFACE** — `### 因果链（已确定…）` + `Chosen（已选）` is certificate-shaped context |
| **AA21** | No Credit Densification | Registry UNKNOWN×N↛PASS **held**. Narrative densification **outside** Registry **open** |
| **AA22** | Phase 5 Interface Wall | Phase 5 frozen. Residual must not be “fixed” by wiring Occurrence Action → Attributed Cause for Phase 5 |

---

## 4. What 4.4.1c already walls (do not reopen)

```text
✅ TypedEvidence → Gate → Symbol write-key → Registry
✅ causal_chain ↛ Evidence adapter
✅ Soft Attribution never blocks Actual / State / Memory
✅ characterHints ↛ Registry
✅ State alone ↛ PASS
```

4.4.1c **correctly did not** fix Writer densification. That separation remains mandatory.

---

## 5. What must NOT be done if Human later opens implementation

```text
❌ Delete causal_chain without replacement Design Gate
❌ Require Attribution PASS before Actual / State
❌ Make Writer emit Choice IDs as system Choice mint
❌ Treat Actual.action as Attribution
❌ Build a second Causality Engine that writes Registry
❌ Feed causal_chain into Attribution Gate “to close the gap”
❌ Expand cue detector / LLM Attribution to absorb plan intent
❌ Phase 5 Consequence from densified Actual
❌ Golden / v0.2 edits under 4.4.1d remediation without separate Seal
```

---

## 6. Design options (observation only — no selection)

Human adjudication must pick a strategy class before any code:

| Option | Idea | Risk |
|--------|------|------|
| **D0** | Leave residual; document forever; rely on Registry for system facts only | Narrative laundering continues |
| **D1** | Demote prompt language: “Plan sketch / not Chosen” · strip certificate wording | Low–medium; may weaken Writer compliance |
| **D2** | Stop injecting `choice`/`Chosen` into Writer; keep desire/pressure as fuel only | Medium; authored climax path needs care |
| **D3** | Single channel + typed Writer Context schema (plan ≠ certificate) | Medium; Studio dual channel |
| **D4** | N+1 Actual Events block: explicit “Occurrence ≠ Attribution” labeling / no agent credit | Medium; does not stop upstream densify |
| **D5** | Quarantine Director Situation/Desire parallel densifiers in same Gate | Scope creep if bundled blindly |

**This audit does not approve D0–D5.**

---

## 7. Formal Design Gate outcome

```text
PHASE 4.4.1d DESIGN GATE AUDIT
  COMPLETE

FINDING
  causal_chain → Writer → Prose → Actual → State/SR → Future Writer
  = CONFIRMED Character Causality laundering (NARRATIVE / CONTEXT layer)

  Attribution Registry mint path
  = NOT BYPASSED (system-fact layer)

SPLIT CONCLUSION
  Layer A (system fact):     walls HOLD
  Layer B (Writer causality): residual OPEN / HIGH

IMPLEMENTATION (4.4.1d code)
  ⛔ BLOCKED

PHASE 5
  FROZEN

4.4.1c
  REMAINS SEALED

HUMAN MUST DECIDE
  remediation strategy class (D0–D5 or new)
  before any APPROVED implementation slice
```

### Recommended next Human action

1. Adjudicate whether Layer B residual is **in-scope for 4.4** or deferred (product risk acceptance).  
2. If in-scope: seal a **Writer Context Non-Certification remediation Design Gate** (AA20-focused) — still read-only plan first.  
3. Only then issue `PHASE 4.4.1d IMPLEMENTATION APPROVED` with a narrow slice (likely D1/D2/D4 — not Registry changes).

---

## 8. STOP

```text
NO CODE
NO causal_chain deletion
NO 4.4.1c reopen
NO Phase 5
AWAIT HUMAN DESIGN ADJUDICATION
```
