# 05 — Attribution Reconstruction Attack #03

```text
PHASE 4.4 ATTRIBUTION RECONSTRUCTION ATTACK #03

TARGET: AA16–AA21 patched DRAFT
  01_character-action-attribution-design-gate.md
  02_occurrence-attribution-propagation.md

MODE: SEMANTIC RECONSTRUCTION · SYSTEM-FACT STANDARD
CODE CHANGED: NO
GOLDEN CHANGED: NO
v0.2 CHANGED: NO
```

**Standard (Human-sealed intent for this attack):**

> Without Attribution PASS: no Attribution object **and** no legal path may mint  
> Attribution-equivalent **system fact** (“C performed/did/caused/intentionally/decided/previously did X”).  
> Writer may still narrate reconstructions → new Prose/Occurrence only.  
> `UNKNOWN×N ↛ PASS` (AA21).

**Not tested as failure:** Writer inventing “她离开了” prose (LEGAL narration).  
**Tested as failure:** that invention (or State/SR/Situation/hints alone) becoming **system-confirmed** Attribution credit.

---

## 0. Executive verdict

```text
STATUS: PASS WITH KNOWN LIMITATIONS

Licensed mint of Attribution-equivalent system fact
  from State-only / hints / Situation certificate / densification:
  BLOCKED under AA16–AA21 DRAFT text

Residual (not CRITICAL under contract text; BLOCK Final Seal until closed):
  OPEN Evidence Contract (State→Gate)
  OPEN system-fact registry / enforcement locus
  Runtime still emits Attribution-shaped characterHints (unenforced)

NEXT: may enter 4.4 Final Design Gate ONLY to seal
  Evidence Contract + system-fact definition + AA16–AA21
  — NOT Human Seal of full Phase 4, NOT Implementation
```

---

## Scenario 1 — State-only (t0 location → t1 location)

```text
t0: Alice.location = room
t1: Alice.location = corridor
```

| Producer | State Evolution |
| Authority to mint Attribution? | **None** (AA16) |
| Consumer may reconstruct narratively? | Yes (Writer) |
| May write Attribution-equivalent **system fact** from State alone? | **FORBIDDEN** |

| Result | **BLOCKED** for system-fact mint |
| Severity if violated in impl | CRITICAL |
| Note | State→Gate as evidence remains **OPEN** future path — not this scenario’s mint |

---

## Scenario 2 — State-history (multiple StateDiffs)

Continuous Δlocation / occupancy changes.

| Reconstruction as narration | Possible |
| System fact / Causal History without Gate | **FORBIDDEN** (AA16 + AA21) |
| Densification of UNKNOWN→LIKELY | **FORBIDDEN** (AA21) |

| Result | **BLOCKED** |
| Residual | Impl must not keep a shadow “movement attribution score” |

---

## Scenario 3 — State + SR

```text
State: Alice.location = outside
SR: “我在门外”
```

| Combination fuel | LEGAL as world/property |
| Auto “我做过 leave / 决定过” | **FORBIDDEN** (AA19) |
| Mint without Gate | **FORBIDDEN** |

| Result | **BLOCKED** |
| Residual | Property timeline still *informationally* rich — safety = non-mint + non-upgrade, not zero information |

---

## Scenario 4 — State + Situation (context aggregation)

```text
Alice 在门外 + 房间空了 + 门开着
```

| Situation role | Context only (AA20) |
| Certificate / Attribution Authority | **FORBIDDEN** |
| Writer reconstruction → prose | LEGAL → Occurrence only |

| Result | **BLOCKED** for system certification |
| Residual | Prompt packing that *labels* Situation as “confirmed character action” would violate AA20 — must be sealed in Final Gate prompt rules |

---

## Scenario 5 — State + characterHints

```yaml
character: Alice
action: leave
stateChanges: [...]
```

| As Occurrence-derived hint | CONTEXT ONLY (AA17) |
| As Attribution input to causality consumer | **FORBIDDEN** (AA17) |
| Informational completeness | Still high — **name “hint” insufficient; AA17 consumer ban is the wall** |

| Result | **BLOCKED** under DRAFT consumer rule |
| Residual **HIGH** | Live runtime still produces the triple; Final Gate must define **who may read** hints (evolution debug vs causality path) |

---

## Scenario 6 — Writer loop (one cycle)

```text
Occurrence → State → Writer → Attribution-like prose → Occurrence
```

| Writer gains Attribution Authority? | **NO** (AA3 + AA20) |
| New Actual | Occurrence only until Gate |
| System PASS minted? | **NO** |

| Result | **BLOCKED** for Authority mint |
| Matches Human correction | Writer may write; cannot certify |

---

## Scenario 7 — Repeated loop (2–3 cycles) — densification

```text
Cycle1: UNKNOWN
Cycle2: UNKNOWN
Cycle3: UNKNOWN
```

vs illegal:

```text
UNKNOWN → MORE LIKELY → EFFECTIVELY TRUE
```

| AA21 | Explicitly forbids status upgrade via accumulation |
| DRAFT | Clear |

| Result | **BLOCKED** under contract text |
| Residual **HIGH** | No sealed definition of *where* Attribution status lives / what “system fact” store is — without that, densification is hard to *enforce* though **forbidden to license** |
| Seal blocker | Final Gate must define Attribution status locus + forbid shadow scores |

---

## Scenario 8 — Legal evidence vs inference vs system fact

| Kind | Example | May enter Attribution Gate? | Is system fact without PASS? |
|------|---------|----------------------------|------------------------------|
| Legal future evidence | State + prose + SR(t) per Evidence Contract | **OPEN** (AA16 allows State as evidence) | No until PASS |
| Inference / narration | Writer concludes “她离开了” | No — becomes Prose | No |
| Forbidden mint | State alone / hints as Attribution / Situation certificate | No | Must not |

| Occurrence Actor | Text-related participant | ≠ Attributed Actor (AA18) |
| Attributed Actor | Only after Gate | System fact only on PASS |

| Result | **BLOCKED** for illicit mint; Evidence Contract **OPEN** |
| Severity of OPEN | **MEDIUM–HIGH** — Final Gate dependency, not a licensed bypass |

---

## Dual ontology & Phase 5 interface (spot)

| Occurrence Actor kept | YES — do not delete |
| Occurrence Actor → Attribution | **FORBIDDEN** (AA18) |
| Phase 5 needs Attributed Action | Interface wall — **BLOCKED** unattributed cause |
| Consequence design | Not entered |

---

## Reconstruction matrix (#03)

| # | Scenario | Attribution-equivalent **system fact** without PASS? | Status |
|---|----------|------------------------------------------------------|--------|
| 1 | State-only | No (forbidden) | **BLOCKED** |
| 2 | State-history | No | **BLOCKED** |
| 3 | State+SR | No | **BLOCKED** |
| 4 | State+Situation | No as certificate | **BLOCKED** |
| 5 | State+hints | No as Attribution input | **BLOCKED** (runtime residual) |
| 6 | Writer one loop | No Authority | **BLOCKED** |
| 7 | Repeated densification | No (AA21) | **BLOCKED** (registry OPEN) |
| 8 | Evidence vs inference | Illicit mint blocked; Gate contract OPEN | **BLOCKED** / **OPEN** |

**Licensed BYPASS of system-fact mint under AA16–AA21 text:** **None found.**

---

## PASS criteria check

| Criterion | Met in DRAFT? |
|-----------|----------------|
| No PASS ⇒ no Attribution object mint from side paths | **Yes** (conceptual) |
| No Attribution-equivalent system fact from legal combo alone | **Yes** under AA16–21 |
| No Causal History from unattributed path | **Yes** |
| No densification UNKNOWN→PASS | **Yes** (AA21 text) |
| Writer narration ≠ certification | **Yes** |
| State usable later only via Gate | **Yes** (AA16 refined) |

| Enforcement / registry / Evidence Contract sealed? | **No** — Known Limitations |

---

## Known Limitations (not CRITICAL licensed bypass)

1. **Evidence Contract** for `State → Gate` not written — required before claiming Gate design complete.  
2. **System-fact / Attribution-status locus** undefined — AA21 enforceable only after this exists.  
3. **Runtime characterHints** still Attribution-shaped — contract forbids causal consumption; code unchanged.  
4. Prompt/Situation packaging rules not fully specified beyond AA20.

These block **Human Seal / Implementation**, not the finding that AA16–21 close **licensed** reconstruction mint paths in the DRAFT.

---

## Final verdict

```text
PHASE 4.4 ATTRIBUTION RECONSTRUCTION ATTACK #03

STATUS:
PASS WITH KNOWN LIMITATIONS

CODE CHANGED:
NO

GOLDEN SPEC CHANGED:
NO

v0.2 CHANGED:
NO

AA16–AA21:
SUFFICIENT TO BLOCK LICENSED SYSTEM-FACT RECONSTRUCTION MINT
(INSUFFICIENT ALONE FOR HUMAN SEAL / IMPLEMENTATION)

PHASE 4.4 FINAL DESIGN GATE:
ELIGIBLE TO START (seal Evidence Contract + system-fact locus + AA16–21)
NOT AUTOMATICALLY PASSED

IMPLEMENTATION:
BLOCKED

HUMAN SEAL (Phase 4 / 4.4 full):
NOT READY

PHASE 5 / NARRATIVE ATTENTION:
FROZEN
```

**One line:**

> Under AA16–AA21, legal side paths may still *inform* Writer and change world properties, but the DRAFT no longer *licenses* minting Attribution-equivalent system facts or densifying UNKNOWN→PASS without Attribution Gate — residual risk is OPEN enforcement locus, not an approved bypass.
