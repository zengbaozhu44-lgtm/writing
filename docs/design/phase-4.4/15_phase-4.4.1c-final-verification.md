# 15 — Phase 4.4.1c Final Verification Report

```text
4.4.1c FINAL VERIFICATION REPORT

MODE: READ-ONLY
CODE / SCHEMA / GOLDEN / v0.2 / 4.4.1d/e / Phase 5: UNCHANGED BY THIS AUDIT

VERDICT:
  PASS WITH KNOWN LIMITATIONS → STOP

4.4.1d: NOT STARTED (forbidden this round)
```

## Runtime evidence (this audit)

```text
Node v22.22.0
npm run test:attribution-wiring   → OK 9 tests (W1–W9 PASS)
npm run test:attribution-gate     → OK 14 tests
npm run test:attribution-registry → OK 12 tests
```

Default shell `node` may be v12; suites require ≥20 (as previously noted).

---

## 1. Production caller coverage

### Code-wired (static proof)

| Path | File | Sequence | Soft? |
|------|------|----------|-------|
| Runtime | `packages/inkos-runtime/src/pipeline/orchestrator.js` ~511–538 | `ensureActualEvents` → `applyCharacterSRAfterActual` → **try** `applyAttributionAfterActual` | yes (`catch` warn) |
| Studio | `packages/inkos-studio-server/src/studio-llm-writer.js` ~571–599 | same order | yes |
| Chapter | `packages/inkos-runtime/src/pipeline/chapter-pipeline.js` ~185–203, then ~252 | `buildStateDiff` → **try** `enrichAttributionAfterStateDiff` → later `MemoryUnit.commit` | yes; **not** commit precondition |

### Test coverage

| Layer | Covered by `test:attribution-wiring`? |
|-------|----------------------------------------|
| `applyAttributionAfterActual` helper | YES |
| `enrichAttributionAfterStateDiff` helper | YES (W5) |
| `orchestrator` production path | **NO** integration test |
| `studio-llm-writer` production path | **NO** integration test |
| `chapter-pipeline` production path | **NO** integration test |

```text
STATUS = KNOWN LIMITATION
Wiring tests are helper-level. Production callers are code-proven, not exec-proven.
No implementation expansion performed this round.
```

---

## 2. W1–W9 inventory

**Source:** `scripts/test-attribution-wiring.js`  
**Run this audit:** all nine `PASS`.

### Why #14 listed W1–W6, W8 but not W7/W9

Not missing tests. Completion report **omitted** W7 and W9 from its regression table while still claiming “9 PASS”. Both exist in the suite and passed here.

| ID | Location | Exact assertion(s) | Result |
|----|----------|-------------------|--------|
| **W1** | `test-attribution-wiring.js` L32–51 | After plain action prose + Actual: `applyAttribution…`; `listAttributedActions` length **0**; records exist and every status is `UNKNOWN` or `INVALID` | **PASS** |
| **W2** | L54–76 | After UNKNOWN Attribution path: `evolveFromChapter(…)` returns truthy `diff` with `diff.evolution` | **PASS** |
| **W3** | L79–98 | After subjectAbsent-ish prose: Actual count unchanged; PASS history length **0**; ≥1 registry record. **Note:** `inv` filtered but `void inv` — does **not** require status===`INVALID` | **PASS** (weaker than name implies) |
| **W4** | L101–116 | `applyAttributionAfterActual(null,…)` → `skipped===true`; second call with bookDir does not throw (`error` null or string) | **PASS** (soft-skip / no-throw; **not** forced Gate throw) |
| **W5** | L119–139 | `enrichAttributionAfterStateDiff` with hints+timeline → `listAttributedActions` length **0** | **PASS** |
| **W6** | L142–162 | Agency excerpt → PASS count **1**, `characterId==='Alice'`, `provenance==='attribution_gate'` | **PASS** |
| **W7** | L165–170 | `detectAttributionCues('门开着。','Alice')` → `agencyCue===false`, `subjectPresentCue===false` | **PASS** / **NOT** the comment’s “hints never write Registry” claim (comment ≠ assertion) |
| **W8** | L173–190 | Coercion+tradeoff excerpt → `listAttributedActions` length ≥1 | **PASS** |
| **W9** | L193–198 | `loadAttributionChapter(bookDir,6)`: `meta.isAttributionAuthority===true`, `meta.writesCanon===false` | **PASS** |

---

## 3. Non-blocking invariant

| Condition | Evidence | Proven by |
|-----------|----------|-----------|
| Gate absent / unused | Main Actual→SR→State chain exists without Attribution as precondition; soft try/catch around callers | **Code review** (not a dedicated W-test) |
| UNKNOWN | W2: State evolution still succeeds | **Test** |
| INVALID / subjectAbsent path | W3: Actual retained; no PASS projection | **Test** (INVALID status optional) |
| Gate / wiring throws | Inner `try/catch` in `applyAttributionAfterActual` + outer try/catch at three callers; W4 only proves missing-args soft skip | **Code review** + partial W4; **no** forced-throw → Memory commit test |
| Memory | Enrichment before `MemoryUnit.commit` is soft; commit not gated on Attribution status | **Code review only** |

```text
KNOWN LIMITATION: Memory non-blocking and Gate-throw soft-fail are structural, not fully regression-asserted.
```

---

## 4. Authority wall

### Mint path (only)

```text
TypedEvidence[] → runAttributionGate → appendAttributionFromGate
  (writer=attribution_gate + ATTRIBUTION_GATE_WRITE_KEY Symbol)
  → Registry sidecar
```

Wiring calls **only** `runAttributionGate` with assembled TypedEvidence (`attribution-wiring.js` ~231–240). No Writer/plan/causal fields passed into Gate.

### Cannot direct-mint (still enforced)

| Source | Proof |
|--------|-------|
| Actual / Occurrence alone | Gate G3 → UNKNOWN; wiring does not write Registry without Gate |
| State / StateDiff alone | Gate G2; W5 enrichment ↛ PASS |
| SR | Adapter → Evidence only; Gate still requires prose+cues for PASS |
| characterHints | Adapter only; G5 + W5; no hints→Registry API in wiring |
| Situation / Plan / Desire / Pressure / causal_chain / Writer dump | `FORBIDDEN_EVIDENCE_SOURCES`; G1/G9; adapters throw/reject |
| Forged writer / missing Symbol | Registry T2/T2b; Gate G13 |

---

## 5. Cue policy

`detectAttributionCues` (`attribution-wiring.js` L29–64):

```text
A = all cues default false unless patterns fire
B = narrow regex on excerpt only:
    subjectAbsent | agency markers | coercion∩tradeoff
policy: 'A+narrow-B'
characterId unused for subjectPresent (avoids name+verb over-PASS)
```

Absent in attribution package (search): full-context LLM calls, hidden classifier, free-form reasoning, Plan/Desire/Pressure/causal_chain inference adapters, Writer-context dump into Gate.

---

## 6. causal_chain residual (unfixed — correct)

Still present (examples):

- `packages/inkos-prompt/src/compiler.js` — `renderCausalChain` protected Writer block
- `packages/inkos-runtime/src/compiler/prompt-compiler.js` — consumes chapter `causal_chain`
- `packages/inkos-brain/src/causal/causal-reasoner.js` — produces `causal_chain`
- Studio / context-provenance markers for causal_chain densification

```text
causal_chain → Writer → prose → Actual → State/SR
= KNOWN RESIDUAL (4.4.1d/e territory)
4.4.1c did not remediate (verified by presence + no attribution adapters for it)
```

---

## 7. Verdict

```text
PASS WITH KNOWN LIMITATIONS → STOP
```

### Limitations (explicit)

1. Production path coverage = **static wiring**, not orchestrator/Studio/chapter integration tests.  
2. #14 table omitted W7/W9 (docs gap; tests exist).  
3. W7 comment overclaims vs assertion (cue-only).  
4. W3/W4 do not fully encode “INVALID recorded” / “Gate throws → Memory commit”.  
5. Writer `causal_chain` densification residual remains.

### Frozen next step

```text
NO 4.4.1d this round
Await Human decision after this verification
```
