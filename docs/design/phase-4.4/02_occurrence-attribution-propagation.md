# 02 — Occurrence vs Attribution Propagation Matrix (DRAFT)

**Companion to:** `01_character-action-attribution-design-gate.md`  
**Patched after:** RA#02b → **AA16–AA21**  
**Next:** Attribution Reconstruction Attack #03  

Marks: `LEGAL` · `CONTEXT ONLY` · `FORBIDDEN` · `OPEN`

---

## 1. Consumers of Occurrence Action (no Attribution PASS)

| Consumer | Mark | Notes |
|----------|------|-------|
| Actual / timeline | **LEGAL** | Occurrence record |
| World State properties | **LEGAL** | location, occupancy, … |
| State alone → Attribution Authority | **FORBIDDEN** | AA16 |
| State alone → Attribution-equivalent system fact | **FORBIDDEN** | AA16 |
| State → Attribution Gate as evidence | **OPEN** (future LEGAL under Evidence Contract) | AA16 — not mint |
| characterHints as Occurrence-derived hint | **CONTEXT ONLY** | AA17 |
| characterHints → causality consumer as Attribution input | **FORBIDDEN** | AA17 |
| Writer Situation / context fuel | **LEGAL** | AA20 — not certificate |
| Situation / State/SR context as Attribution certificate | **FORBIDDEN** | AA20 |
| L1 Observer | **LEGAL** Question A · **FORBIDDEN** Attribution alone | |
| Character Causal History | **FORBIDDEN** | AA8 / AA21 |
| Attribution status upgrade via densification | **FORBIDDEN** | AA21 |
| Occurrence Actor as Attributed Actor | **FORBIDDEN** | AA18 |
| SR world-property awareness | **LEGAL** (narrow) | AA19 |
| SR → “做过/决定过” auto | **FORBIDDEN** | AA19 |
| Phase 5 as Attributed Cause | **FORBIDDEN** | interface wall |
| Production Choice mint | **FORBIDDEN** | v0.2 |

---

## 2. After Attribution Gate PASS

| Consumer | Mark |
|----------|------|
| Character Causal History | **LEGAL** |
| Agent-action SR history | **LEGAL** (sealed rules) |
| Phase 5 consumer | **LEGAL** (Phase 5 still frozen) |
| System “C performed X” fact | **LEGAL** (this is what PASS mints) |

---

## 3. Collapse / densification tests (must fail)

```text
State alone                    → Attribution / equivalent system fact   FAIL
StateDiff history alone        → Attribution Authority                  FAIL
characterHints bundle          → Attribution input (causality consumer) FAIL
Occurrence Actor               → Attributed Actor                       FAIL
Situation / context            → Attribution certificate                FAIL
SR property                    → “做过 leave / 决定” system fact         FAIL
Writer inference               → Attribution Authority                  FAIL
UNKNOWN × N cycles             → LIKELY / PASS                          FAIL
Occurrence Action              → Phase 5 Attributed Cause               FAIL
Attribution PASS               → Choice (auto)                          FAIL
```

**Allowed:**

```text
State + prose + SR(t) → Attribution Gate → PASS|UNKNOWN|INVALID   (future)
Writer → Attribution-like prose → Occurrence only                 LEGAL
```

---

## 4. Self-loop (must not densify)

```text
Writer → Occurrence → State → SR → Situation → Writer → …
  LEGAL as Occurrence/world/context cycle
  FORBIDDEN as Attribution status upgrade (AA21)
```
