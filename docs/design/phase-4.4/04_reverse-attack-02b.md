# 04 — Phase 4.4 Reverse Attack #02b (Semantic Reconstruction)

```text
PHASE 4.4 REVERSE ATTACK #02b

TARGET: AA11–AA15 patched DRAFT
  docs/design/phase-4.4/01_*.md
  docs/design/phase-4.4/02_*.md

MODE: SEMANTIC RECONSTRUCTION ATTACK · READ-ONLY
CODE CHANGED: NO
GOLDEN CHANGED: NO
v0.2 CHANGED: NO
DESIGN FILES THIS ROUND: NOT MODIFIED (attack only)
```

**Upgraded Seal standard (Human):**

> Attribution safety ≠ “no code sets attribution=true.”  
> Attribution safety = **without Attribution Authority / PASS, no legal propagation path may yield Attribution-equivalent system fact**  
> (“C performed / did / caused / intentionally / decided / previously did X”).

**Method (mandatory quadruple):** Producer · Authority · Consumer · Reconstruction

---

## 0. Executive verdict

```text
STATUS: ATTACK SUCCEEDED — SEMANTIC RECONSTRUCTION STILL REACHABLE

AA11–AA15: necessary but insufficient
  (they block agent-shaped strings / named inference edges;
   they do not make Attribution-equivalent meaning informationally unreachable)

CRITICAL:
  ①② StateDiff / property history reconstruction
  ③ characterHints {character, action, stateChanges} = Attribution-shaped bundle
  ④ SR property timeline → self-as-agent history
  ⑤ Situation property sets → causal reconstruction fuel
  ⑩ Self-reinforcing Occurrence loop (credit densification)

HOLD (under DRAFT text):
  ⑥ Writer ↛ Attribution Authority (authority split)
  ⑦ actors ↛ Attribution evidence (partial; dual ontology still OPEN)
  ⑧ Attribution ↛ Choice
  ⑨ Occurrence ↛ Phase 5 Attributed Cause (interface wall stated)

NEXT: DRAFT PATCH (AA16+) → RA #02c or re-#02b
NOT: Final Design Gate · Human Seal · Implementation · Phase 5
```

---

## Attack ① — StateDiff → movement → action → attribution

```text
inside → outside  (Alice.location)
```

| Slot | Instantiation |
|------|----------------|
| Producer | State Evolution from Occurrence Actual |
| Authority claimed | None named — but LEGAL StateDiff encodes transition |
| Consumer | Any Planner / Writer / future “action recovery” / LLM context |
| Reconstruction | `Δlocation` ⇒ moved ⇒ left room ⇒ performed leave ⇒ Attribution-equivalent |

**AA11** forbids treating State as Attribution **Authority**.  
**Reconstruction standard:** LEGAL StateDiff still contains enough semantics to **recompute** “C performed leave” without Gate PASS.

| Result | **BYPASS** (semantic) |
| Severity | **CRITICAL** |
| Missing | Ban **Action-recovery consumers**; forbid writing Attribution-equivalent **system facts** from StateDiff; State may record Δ without licensing “who authored Δ as subject” |

---

## Attack ② — Two States, no Actual.action

```text
t0: Alice.location = room
t1: Alice.location = corridor
```

No `Actual.action` required.

| Reconstruction | “Alice 从房间走到了走廊” / “Alice left the room” |
| AA11 | Forbids Authority use |
| Info sufficiency | **Sufficient** for agent-movement claim |

| Result | **BYPASS** |
| Severity | **CRITICAL** |
| Note | Property naming (`location`) ≠ safety if history+identity remain jointly consumable |

---

## Attack ③ — characterHints triple

```yaml
characterHints:
  character: Alice
  action: leave
  stateChanges: [...]
```

DRAFT: “occurrence tags only · ↛ Attribution” (AA12).

| Slot | Instantiation |
|------|----------------|
| Producer | `mapActualEventsToEvolution` (live today) |
| Authority | None sealed — but payload is Actor×Action×Δ |
| Consumer | Any module reading evolution hints |
| Reconstruction | Triple **is** Attribution input under another name |

Renaming to “hint” does **not** remove reconstructability.  
A consumer with this triple need not invent missing fields.

| Result | **BYPASS** |
| Severity | **CRITICAL** |
| Missing | Disassemble bundle: no single consumable `{character, action, stateChanges}` for causality-capable consumers; or seal **non-consumption** by Attribution / Causal History / Consequence / Director-as-causality / system-fact registries |

---

## Attack ④ — SR “I know where I am” → “I did leave”

```text
SR world-property: “我在门外” / “Alice is outside”
(+ prior “我在房间”)
  → “我之前去了外面”
  → “我做过离开”
```

| Slot | Instantiation |
|------|----------------|
| Producer | SR updater (world-property awareness LEGAL) |
| Authority | Character-owned SR ≠ Character Causal History Authority (stated) |
| Consumer | Future Writer / History builders |
| Reconstruction | Property **timeline** ⇒ self-as-agent movement history |

AA13 blocks agent-shaped strings; **does not** block reconstruction from legal property sequences.

| Result | **BYPASS** |
| Severity | **CRITICAL** |
| Missing | `SR property history ↛ self-as-agent action history system facts`; Character-owned ≠ Causal History Authority (explicit consumer wall) |

---

## Attack ⑤ — Situation property sets

Legal system Situation examples:

```text
Alice 在门外。
Alice 不在房间。
房间现在是空的。
门现在是打开的。
Alice 当前位于走廊。
```

| Reconstruction available to Writer/Planner | Alice left / chose / decided / intentionally left / caused emptiness |
| AA14 | Blocks system-asserted “决定/主动离开” |
| Hole | LEGAL property **sets** still fuel reconstruction; system does not assert, but **context adequacy** remains |

| Result | **BYPASS** (fuel for Attribution-equivalent claims in downstream) |
| Severity | **HIGH → CRITICAL** when combined with ⑩ |
| Missing | Treat Situation as **non-authoritative occurrence context**; forbid system-fact upgrade from Situation combinations; optional: separate “property sheet” from “narrative causal summary” |

---

## Attack ⑥ — Writer as semantic washer

```text
Writer may write: “她走出了房间。”
≠ system gains Attribution Authority
```

| Producer | Writer |
| Authority | Realization only (v0.2 / AA3) |
| Consumer | Actual → Occurrence only until Gate |
| Reconstruction | Prose can look attributed; mint still requires Gate |

| Result | **BLOCKED** for Authority mint (DRAFT holds) |
| Severity | SAFE for authority split |
| Residual | Output re-enters Attack ⑩ as Occurrence densification — see ⑩ |

**Do not** ban Writer decision/action vocabulary.

---

## Attack ⑦ — Occurrence Actor ≠ Attributed Actor

```text
occurrence.actors: [Alice]   # text-related / grammar-derived
↛ attributedActor / Attribution PASS
```

| AA15 | actors ↛ Attribution **evidence** — holds as slogan |
| Dual ontology | **Not required** in DRAFT (OPEN) |
| Risk | Consumers default `actors` = subject who performed |

| Result | **PARTIAL BYPASS** (ontology gap) |
| Severity | **HIGH** |
| Missing | Explicit freeze: `Occurrence Actor ≠ Attributed Actor`; Occurrence may keep `actors`; Attribution record separate; never equate by default |
| Anti-fix | Do **not** delete Occurrence `actors` (Phase 1–2 need event participation) |

---

## Attack ⑧ — Attribution-like evidence → L1 → Choice

```text
“她打开门。” → Attribution-like surface → L1 VALID? → Choice?
```

| Attribution ≠ Choice | DRAFT AA6 / §6 holds |
| L1 VALID ↛ Attribution | holds |
| Reverse: Attribution PASS ↛ Choice | holds in text |

Impulse/open-door: Attribution may YES, Choice UNKNOWN — consistent.

| Result | **BLOCKED** |
| Severity | SAFE |

---

## Attack ⑨ — Phase 5 consumer preview (not Phase 5 work)

```text
Unattributed Action → Consequence as Attributed Cause ?
```

| #02 matrix | FORBIDDEN until Attribution PASS |
| Required freeze | `Occurrence Action ↛ Attributed Cause ↛ Consequence` |
| Legal | `Attributed Action → Phase 5 → Consequence` |

| Result | **BLOCKED** as stated interface wall |
| Severity | SAFE **if** Final Gate seals this for Phase 5 |
| Residual | Must not be weakened when Phase 5 opens |

---

## Attack ⑩ — Self-reinforcing false Character Causality

```text
t0 Writer fabricated action
  → Actual Occurrence
  → State properties
  → SR world-property
  → Situation property set
  → Writer “既然她已经…” / denser leave prose
  → Actual
  → State
  → …
```

| Attribution PASS | Never required |
| Choice mint | Never required (R13 intact) |
| Per-step Authority mint | DRAFT forbids Causal History / system “决定” |
| Reconstruction question | Can the loop **raise system confidence** in “她确实做过/决定过” without PASS? |

**YES under current DRAFT + live pipeline:**

1. Each cycle adds LEGAL Occurrence + State + SR property + Situation fuel (①–⑤).  
2. Writer narration may re-assert agent language (⑥ allowed as prose).  
3. No Attribution object needed for densification of **story-real movement facts** bound to Alice.  
4. Downstream that conflates “stable story fact about Alice’s whereabouts change” with “Alice as subject performed leave” obtains **Attribution-equivalent credit**.

| Result | **BYPASS** |
| Severity | **CRITICAL** |
| Missing | No accumulation of unattributed Occurrence into Character Causal History, attribution confidence, or system-fact “C performed X”; Situation/SR must not become progressive causal certificates |

---

## Reconstruction matrix (①–⑩)

| # | Attack | Attribution-equivalent without PASS? | Status |
|---|--------|--------------------------------------|--------|
| ① | StateDiff → action | YES | **BYPASS CRITICAL** |
| ② | Dual State → agent move | YES | **BYPASS CRITICAL** |
| ③ | characterHints triple | YES | **BYPASS CRITICAL** |
| ④ | SR property timeline | YES | **BYPASS CRITICAL** |
| ⑤ | Situation property sets | YES (fuel) | **BYPASS HIGH/CRITICAL** |
| ⑥ | Writer prose → Authority | NO | **BLOCKED** |
| ⑦ | actors = attributed actor | DEFAULT RISK | **PARTIAL / HIGH** |
| ⑧ | Attribution → Choice | NO | **BLOCKED** |
| ⑨ | Occurrence → Consequence cause | NO (walled) | **BLOCKED** |
| ⑩ | Self-reinforcing loop | YES | **BYPASS CRITICAL** |

---

## Four-proof checklist (Seal standard)

| Requirement | Met? |
|-------------|------|
| No Attribution PASS ⇒ no Character Attribution object | Partial (object undefined; walls stated) |
| No Attribution-equivalent **system fact** | **NO** — ①②③④⑤⑩ |
| No Character Causal History from unattributed path | Stated; undermined by equivalent credit via State/SR/Situation |
| No future causal self-reinforcement | **NO** — ⑩ |

---

## Recommended DRAFT patches (do not apply this round — attack only)

| ID | Patch |
|----|-------|
| **AA16** | StateDiff / property history must not license Action-recovery or Attribution-equivalent system facts; Δ is property change only |
| **AA17** | Forbid causality-capable consumers from ingesting `{character, action, stateChanges}` as one Attribution-shaped bundle; disassemble or quarantine hints |
| **AA18** | Freeze dual ontology: `Occurrence Actor ≠ Attributed Actor` (keep Occurrence actors) |
| **AA19** | SR world-property timeline ↛ self-as-agent action-history system facts |
| **AA20** | Situation property sets are non-authoritative context; ↛ system agent credit; ↛ Causal History |
| **AA21** | Unattributed Occurrence loops must not accumulate attribution confidence / Causal History / “performed X” system facts |
| **AA22** | Seal Phase 5 interface: Occurrence Action ↛ Attributed Cause (strengthen #02 row) |

Then: **re-run semantic reconstruction attack** before Final Design Gate.

---

## What AA11–AA15 still correctly hold

- Agent-shaped string bans (necessary).  
- Named State→Attribution / hints→Attribution / L1→Attribution edges (necessary).  
- Writer ↛ Authority; Attribution ≠ Choice; Coercion/Impulse spirit (from prior).  
- Not deleting Occurrence pipeline.

**Insufficient alone** against informational reconstruction.

---

## Final verdict

```text
PHASE 4.4 REVERSE ATTACK #02b

STATUS:
ATTACK SUCCEEDED

CODE CHANGED:
NO

GOLDEN SPEC CHANGED:
NO

v0.2 CHANGED:
NO

DESIGN PATCHED THIS ROUND:
NO

AA11–AA15:
INSUFFICIENT UNDER SEMANTIC RECONSTRUCTION STANDARD

PHASE 4.4 FINAL DESIGN GATE:
NOT STARTED

IMPLEMENTATION:
BLOCKED

HUMAN SEAL:
NOT READY

PHASE 5 / NARRATIVE ATTENTION:
FROZEN
```

**One line:**

> Without Attribution PASS, patched DRAFT still leaves enough LEGAL State / SR / Situation / characterHints information for downstream consumers to reconstruct “C performed X as subject” — and the Writer→Actual→State loop can densify that credit without ever minting Attribution.
