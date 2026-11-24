# 41 — Actual-Enabled Real Production Rebaseline

```text
MODE: REAL PRODUCTION VALIDATION / FORENSIC OBSERVATION
EO: EO-4.4-41-ACTUAL-ENABLED-REAL-PRODUCTION-REBASELINE

CODE CHANGED = NO (runtime executed as-is)
SCHEMA / GOLDEN / SPEC = UNCHANGED
CHOICE / CANDIDATE OPTION / L2 / L1 MOUNT = NOT AUTHORIZED
PHASE 5 = FROZEN · PHASE 6 = NOT STARTED · PHASE 7 = NOT STARTED

UPSTREAM:
  #35–#39 sealed consumer archaeology
  #40 historical corpus Actual=0 → must rebaseline on current path
```

**Single question:**

> When current code actually runs, do real occurrences enter next Scene/Chapter production and observably change the story?

---

## 1. Executive Verdict

```text
41 = PASS (experiment executed + forensics complete)

LIVE LLM RUN = EXECUTED
Book = books/我的小说/books/REAL-PRODUCTION-BASELINE-01
Chapters = 2 committed (≥3 scenes each; runtime produced 4 scenes/ch)

Matrix (summary):
  Prose → Actual                         PASS (persisted; quality FAIL)
  Actual → Persistence                   PASS
  Persistence → Next Scene (same ch)     PARTIAL / SOFT (OC+AE modules exist)
  Actual → Next Scene Context            PARTIAL (noisy AE; not high-value facts)
  Actual → Next Chapter Context          FAIL (Plan/09 re-drive, not Actual)
  SR → Next Production                   FAIL / EMPTY (sidecar characters={})
  State/Evolution → Next Production      NOMINAL (noisy timeline; openLoops=[])
  Attribution → Next Production          STORAGE ONLY (UNKNOWN records; unread)
  Actual → Story Effect (cross-ch)       FAIL
  Concrete obligation survival           FAIL (钥匙已交仍被 Ch2 复演)
  Intentional deferral vs silent loss    RESOLVED → SILENT LOSS / PLAN REPLAY
  New capability required                UNKNOWN (likely existing-path first)
  Irreplaceable Gap                      NOT PROVEN

DESIGN GATE = NOT ENTERED (no new module)
Failure Qualification dossier = OPENED as candidate (Human may authorize next)

STOP
```

---

## 2. Experiment setup

| Item | Value |
|------|--------|
| Book | `REAL-PRODUCTION-BASELINE-01` |
| LLM | Configured via repo `.env` (`isLlmConfigured=true`; model `upstage/solar-pro4` via openrouter) |
| Authored Ch1 plan | `novel/_system/chapter_plans/chapter_0001.yaml` (seeds F1–F5) |
| Authored Ch2 plan | **None** (observe natural next-chapter path) |
| Protocol | `novel/_system/rebaseline/EXPERIMENT_PROTOCOL.md` |
| Runs | `inkos runtime run … --chapter 1 --force` then `--chapter 2 --force` |
| Logs | `novel/_system/rebaseline/ch1_run_log.txt`, `ch2_run_log.txt` |

### Seed facts (hoped in Ch1; not forced into Ch2)

| ID | Kind | Ch1 prose? |
|----|------|------------|
| F1 | 钥匙交接 | **YES** |
| F2 | 周四下午三点 | **YES** |
| F3 | 与老何对质/协作撕裂 | **YES** |
| F4 | 漏水未修 | **YES** |
| F5 | 下楼/交出行动 | **YES** |

---

## 3. Production artifact inventory (post-run)

| Artifact | Ch1 | Ch2 |
|----------|-----|-----|
| `chapters/000N_*.md` | YES | YES |
| `ch_000N_scenes.json` | YES (4 scenes) | YES (4 scenes) |
| `actualEvents` count | 1+1+1+1 | 4+2+2+1 |
| `observedContinuity` | YES | YES |
| `character_sr/ch_NNNN.json` | YES file; **characters {}** | YES file; **characters {}** |
| `attribution/ch_NNNN.json` | YES (UNKNOWN) | YES (UNKNOWN) |
| `states/ch_NNNN.json` + evolution | YES; openLoops=[] | YES; openLoops=[] |
| `states/ch_NNNN_anchor.yaml` | YES | YES |
| `11_timeline.yaml` | Actual-noisy lines | Actual-noisy lines |
| `08_current_state.md` | Updated | Updated |

**#40 contrast:** This book **did** persist Actual / Attribution / Evolution sidecars. Historical books did not. Rebaseline premise confirmed.

---

## 4. Judgment matrix (required)

| 链路 | 判定 | Evidence |
|------|------|----------|
| Prose → Actual | **PASS** (quality **FAIL**) | Every scene has `actualEvents≥1`; high-value F1 not cleanly captured (actors `她`/`场面`; action fragments) |
| Actual → Persistence | **PASS** | On `ch_*_scenes.json` + Evolution timeline overlay |
| Persistence → Next Scene | **PARTIAL** | Same-chapter OC/AE compiler path exists (#39); AE content too weak to carry F1–F2 |
| Actual → Next Scene Context | **PARTIAL / FAIL for obligations** | No clean “钥匙已交老何” event for S2/S3 to consume |
| Actual → Next Chapter Context | **FAIL** | Ch2 plan goals **restate Ch1 climax** (“钥匙换修理协助”“把钥匙交给老何”) from `09`/planner — not from Actual “already handed” |
| SR → Next Production | **FAIL** | Sidecar `characters: {}`; no usable SR fuel |
| State → Next Production | **NOMINAL** | Noisy timeline in Canon; Anchor ops present; relationship_state still generic 对抗世界 |
| Attribution → Next Production | **FAIL (storage)** | Records written UNKNOWN; no production reader (#36) |
| Actual → Story Effect | **FAIL** (cross-chapter) | Ch2 **re-enacts** key handoff / “你还没把钥匙给我” after Ch1 already completed handoff |
| Concrete obligation survival | **FAIL** | 周四三点 soft-mentioned; **钥匙已交出** not respected as settled fact |
| Intentional deferral vs silent loss | **RESOLVED → SILENT LOSS / PLAN REPLAY** | Not H: Ch2 Plan explicitly re-asks completed action |
| New capability required | **UNKNOWN** | First suspect: Plan/09 overwrite + weak Actual extract + empty SR — **existing path may suffice if fixed** |
| Irreplaceable Gap | **NOT PROVEN** | Failure is expressible as “Actual/State not enforced against Plan replay”; not proven only Survival can fix |

---

## 5. Level A / B / C (Story-Truth grades)

### Level A — Persistence

```text
PASS (with quality FAIL)
```

Occurrences are saved, but extractor often misses the obligation-bearing act and mints pronoun/scene noise (`场面`).

### Level B — Consumption

```text
SAME CHAPTER: PARTIAL (soft modules exist; weak payload)
CROSS CHAPTER: FAIL — next context dominated by Plan/09 restatement + Anchor emotion, not Actual settled facts
```

Ch2 plan excerpt (forensic):

```text
mainGoal: 处理天花板漏水，并与老何当面把责任说清楚   ← Ch1 09 leftover
scenes:
  2 钥匙换修理协助
  3 …苏晚把钥匙交给老何，并得知周四物业要查楼     ← already done in Ch1
priorAnchor: closing_emotion 压抑·余波未平
contextFacts: []
```

### Level C — Story Effect

```text
FAIL
```

Ch1: 钥匙已交；空钥匙包；周四三点约定。  
Ch2: 多次仍持钥匙 / 再次递交 / “你还没把钥匙给我” — **settled Actual reversed by Plan-led generation**.

This is **not** “story continued so Truth works.” Continuity of *names* (老何/钥匙/周四) without respecting *settled state* = Plan soft memory, not Actual authority.

---

## 6. Scene → Scene (Ch1)

| Step | Result |
|------|--------|
| S1→S2 | Soft OC/AE possible; AE S1=`她转身上楼` — **does not encode** key conflict |
| S2→S3 | Presence blobs; F1 handoff in prose but **not** clean Actual |
| Intra-chapter Writer memory | Prose can continue locally; **system Actual not proven as the carrier** of F1 |

---

## 7. Chapter → Chapter chain (the smoking gun)

```text
CH1 ACTUAL (noisy, incomplete)
    ↓
Persistence YES
    ↓
CH2 CONTEXT drivers observed:
    · priorAnchor (emotion / bans)          REAL ops soft
    · 09 / planner goals (replay climax)    DOMINANT
    · timeline noisy Actual lines           SOFT / low signal
    · SR                                    EMPTY
    · Attribution                           UNREAD
    · Authored Ch2 plan                     ABSENT
    ↓
CH2 WRITER
    ↓
CH2 PROSE replays key handoff
```

```text
ACTUAL
 ↓
not effectively read as settled obligation
 ↓
Plan again tells Writer to perform completed action
```

This matches the #40/#41 critical investigation shape — now with **live Evidence**.

---

## 8. FAILURE-003 retest

| Hypothesis | Result |
|------------|--------|
| H = intentional deferral of 老周-like thread | **REJECTED for F1** — Ch2 Plan *re-requires* completed handoff |
| Systematic loss | **CONFIRMED** for settled key ownership |
| Soft motif survival (老何/钥匙/周四 words) | **YES** — but misleading if counted as Story Effect |

---

## 9. Failure Qualification (candidate — no fix)

### FAILURE-041-001 — Settled Actual overwritten by next-chapter Plan

```text
REAL FAILURE?     YES (this run)
REPRODUCIBLE?     YES on this book artifacts (Ch1 prose + Ch2 plan + Ch2 prose)
VIOLATES STORY TRUTH INTENT?  YES — occurrence not treated as settled for next gen
EXISTING PATH EXPRESS?        YES in principle (Actual + Anchor ban text exists)
EXISTING PATH ENFORCE?        NO in this run
READ / CONSUME / SEMANTIC?    CONSUME/WIRING + Plan authority over Actual
WRITER ONLY?                  NO — Plan goals explicitly re-ask handoff
NEED NEW MODULE?              UNKNOWN — try existing-path Design Gate first
IRREPLACEABLE GAP?            NOT PROVEN
```

### FAILURE-041-002 — Actual extractor quality

```text
High-value acts under-extracted; pronoun/scene actors; figurative risk (#40)
→ quality FAIL on otherwise PASS persist path
→ NOT a Choice/Survival ontology proof
```

### FAILURE-041-003 — Character SR empty after “successful” update

```text
characterSRState flag true; sidecar characters={}
→ SR nominal path broken in this run
→ report only; no fix this EO
```

### FAILURE-041-004 — Attribution still registry-only

```text
Confirms #36 under live production (UNKNOWN writes; no next-gen read)
```

---

## 10. Three outcome cases

| Case | Fits? |
|------|-------|
| A — Current system already closes loop | **NO** (cross-chapter Story Effect FAIL) |
| B — Actual saves but no story effect | **YES** |
| C — All paths correct but still cannot express | **NO** — paths not all correct (Plan replay; empty SR; weak AE) |

```text
→ Failure Qualification candidate OPEN
→ Design Gate for NEW Survival/Choice = NOT AUTHORIZED
→ If Human opens next Gate: compare
     A extend Actual/State consumption
     B Director/Planner must not replay settled Actual
     C new obligation/Survival
   and prove why A/B insufficient before C
```

---

## 11. Choice / Phase 5 freeze check

| Item | Status |
|------|--------|
| Choice Engine / Candidate Option / L2 / L1 mount | **NOT AUTHORIZED** — failure is settled action ownership, not option-selection ontology |
| Phase 5 Consequence | **FROZEN** — do not rename timeline/stateChanges as Consequence |

---

## 12. Explicit Non-Actions (honored)

```text
❌ No code/schema/golden/SPEC changes
❌ No Story Survival / Choice / Phase 5–7 implementation
❌ No “fix” of extractor / Plan / SR in this EO
❌ No automatic Design Gate entry for new modules
```

---

## 13. Next authorized step (Human only)

```text
1) OPTIONAL: Failure Qualification Design Gate on FAILURE-041-001
   (still NO CODE) — rank A/B/C remedies; prove irreplaceability before Named EO

2) OPTIONAL: literary re-run after a future Named EO
   (not now)

3) NOT: implement Story Survival because Ch2 “felt discontinuous”
```

---

## 14. Final freeze line

```text
CODE CHANGED = NO
SCHEMA CHANGED = NO
GOLDEN CHANGED = NO
SPEC CHANGED = NO
FIXTURES CHANGED = NO

CHOICE = NOT AUTHORIZED
CANDIDATE OPTION = NOT AUTHORIZED
L2 = NOT ENTERED
L1 PRODUCTION MOUNT = NOT AUTHORIZED
PHASE 5 = FROZEN
PHASE 6 = NOT STARTED
PHASE 7 = NOT STARTED

41 = PASS (validation complete)
IRREPLACEABLE GAP = NOT PROVEN
NEW MODULE = NOT AUTHORIZED
STOP
```

```text
Actual-enabled production now runs and persists.
Cross-chapter Story Effect does not:
Plan re-asked a completed key handoff, and prose complied.

That is a real, reproducible breakpoint on the existing mainline —
not a license to invent Story Survival or Choice.
```
