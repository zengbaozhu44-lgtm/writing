# 40 — Real Production Baseline / Story-Truth Failure Discovery

```text
MODE: REAL PRODUCTION BASELINE · OBSERVE / AUDIT · NO CODE
EO: REAL-PRODUCTION-BASELINE-STORY-TRUTH-FAILURE-DISCOVERY

NOT: Phase 4.4 Consumer Archaeology (#35–#39 remain sealed)
NOT: Implementation · Schema · Golden · New modules · Design Gate invent

CODE CHANGED = NO
SCHEMA / GOLDEN / SPEC / FIXTURES = UNCHANGED
CHOICE / CANDIDATE OPTION / L2 / L1 MOUNT = NOT AUTHORIZED
PHASE 5/6/7 = FROZEN / NOT STARTED

UPSTREAM BASELINE (SEALED — no further consumer audits):
  #35 Choice Necessity PASS
  #36 Attribution Consumer PASS
  #37 SR Consumer PASS
  #38 State Evolution Consumer PASS
  #39 Story-Truth Reconciliation PASS
```

**Question:**

> In real continuous novel production, does what happened last Scene/Chapter actually change the next story — and if not, what is the first reproducible literary/system failure?

---

## 0. Method & run constraints

### 0.1 What was done

| Activity | Result |
|----------|--------|
| Inventory all `books/我的小说/books/*/…/ch_*_scenes.json` | **8 books · 146 scenes · `actualEvents` total = 0** |
| Forensic corpus | **二手书店老板的最后一周** (Ch1–Ch2 committed prose + scenes + states + anchors + timeline + Ch3 plan) |
| Cross-check | 疯神纪元 / 赛博修仙 / 凌晨四点 — same: **no persisted Actual / SR / Attribution** |
| In-memory Actual extract on Ch1 scenes | Ran `ensureActualEvents` + `evolveFromChapter` **in memory only**; **disk unchanged** (`actualEvents` still 0 on disk) |
| Live `inkos runtime run` multi-chapter LLM | **BLOCKED BY ENVIRONMENT** — no LLM API keys in shell; would also mutate books (forbidden without Human EO) |

### 0.2 What this baseline is / is not

```text
IS:  Real production artifact archaeology + literary survival scoring
IS:  Failure candidates with qualification (no auto-fix)
IS NOT: Fresh multi-chapter LLM generation (blocked)
IS NOT: Consumer Archaeology #41
IS NOT: Proof that Story Survival / Choice / Phase 5 must be built
```

```text
Live LLM continuous run = NOT EXECUTED (environment)
Historical multi-chapter production = EXECUTED (forensic)
```

---

## 1. Production run record (forensic corpus)

### Book under baseline

| Field | Value |
|-------|--------|
| Book | `books/我的小说/books/二手书店老板的最后一周` |
| Chapters on disk | Ch1, Ch2 (committed); Ch3 **plan only** |
| Scenes / chapter | 3 + 3 |
| POV | 林守常 |
| Commit eras | Anchor Ch1 `2026-08-15`; Ch2 `2026-08-18` |
| Story-Truth sidecars | **NO** `character_sr/` · **NO** `attribution/` · **NO** `states/*.json` `evolution` |

### Pipeline signals present

| Artifact | Present? |
|----------|----------|
| `chapters/0001–0002_*.md` | YES |
| `ch_*_scenes.json` with prose | YES |
| `states/ch_*_anchor.yaml` | YES |
| `08_current_state.md` | YES (ops table) |
| `11_timeline.yaml` | YES (**plan-shaped events**) |
| `actualEvents` on scenes | **NO (0)** |
| Observed Continuity on scenes | **NO** |
| Character SR sidecar | **NO** |
| Attribution Registry | **NO** |
| Evolution openLoops | **NO** |

### Corpus-wide Actual absence

All scanned production books:

```text
2055日常切片, _runtime-test, _sv_r2_凌晨四点, 二手书店…,
凌晨四点世界刷新, 旧车站维修师, 疯神纪元, 赛博修仙…
→ scenes with persisted actualEvents = 0
```

**Baseline fact:** Real literary production in this repo **did not persist** the Phase 1 Actual mainline that #39 describes as PROVEN CLOSED for *current code*. Continuity in these books was carried by **Plan / scene goals / Anchor / prose soft memory**, not by Actual→SR→Attribution→Evolution consumers.

---

## 2. Scene → Actual → Next Scene

### Same-chapter (Ch1 S1→S2→S3) — literary

| From | Notable occurrence | Into next scene? |
|------|--------------------|------------------|
| S1 | 梧桐叶夹入《植物名实图考》; 煤炉; 猫「目录」 | S2 continues shop frame — **soft prose continuity** |
| S2 | 老周还《陶庵梦忆》; 修书; 橘子; 「三天 / 下周三」 | S3: 老周不在 (goal forbids) — **intentional**; 橘子/钉子/纸片推进 |
| S3 | 剥橘; 摸旧钉; 门缝「等你」纸片; 关门 | End of chapter |

**Actual on disk:** none. Continuity = Writer + scene goals, not Actual store.

### In-memory Actual extract (Ch1, read-only)

Extractor produced sparse/noisy events (examples):

```text
门板刚推开…叶子卡在门槛
像一只攥紧又松开的手          ← weak / figurative false-positive risk
老周/林守常 … 橘子 …
没人想起拔掉它
他转身…橘子还在
openLoops: []
```

**Observation:** Even if Actual had been wired at write time, **current extractor quality** may miss high-value obligations (「下周三」、纸片「等你」、修好书脊) and may mint low-value figurative actions. That is a **production-path quality** finding — not a license to invent Story Survival.

### Ch1 → Ch2 Scene1 (cross-chapter)

Ch2 S1 goal explicitly continues **「等你」纸片**. Prose opens on that paper.  
→ **Literary soft survival of one hook: YES** (Plan/goal mediated).

---

## 3. Chapter → Next Chapter

### Anchor handoff (system)

| Field | Ch1 → Ch2 |
|-------|-----------|
| POV 林守常 | Inherited |
| `closing_emotion` 压抑·余波未平 | Present on Ch1 anchor; Ch2 opens mid-action (not weather/alarm) — **partial ops honor** |
| `forbidden_openings` | Present |
| `relationship_state` | **Always** `林守常 → 世界/系统 / 对抗` — **does not encode 老周 / 纸片 / 约定** |
| `location` | `未标注` both |

Anchor = **ops continuity**, not Story-Truth obligation store (#38/#39).

### Timeline (system)

`11_timeline.yaml` events are **scene-goal / plan briefs** (“承接上章推进：场景1：…”), **not** prose-grounded Actual lines.

```text
Timeline survival class = PLAN-AS-HISTORY (legacy pollution in this corpus)
≠ Actual-derived Canon events (current evolveFromChapter design)
```

### Ch3 plan (next intent)

Ch3 plan advances **阿婆 + 橘子 + 地砖** motif; volume notes schedule 老周 later.  
「下周三」约会 **not** encoded as hard obligation in Anchor/State.

---

## 4. What facts changed later story vs what did not

### Fact survival matrix (Ch1 prose → Ch2 prose)

| Fact | Ch1 | Ch2 | Survival |
|------|-----|-----|----------|
| 「等你」纸片 | YES | YES | **YES** (soft) |
| 橘子 / 橘味 | YES | YES | **YES** (motif) |
| 《植物名实图考》 | YES | YES | **YES** (prop) |
| 梧桐叶 | YES | NO | **LOST** |
| 《陶庵梦忆》 / 修书 | YES | NO | **LOST** |
| 老周 | YES | NO | **LOST** (thread pause) |
| 「三天 / 下周三」 | YES | NO | **LOST** |
| 门框旧钉子 | YES | NO | **LOST** |
| 周岚 | NO | YES | **NEW** (plan) |
| 小满 / 2015 | NO | YES | **NEW** (plan) |

### What truly changed Ch2 generation conditions?

| Driver | Evidence |
|--------|----------|
| **Plan / scene goals** | Ch2 goals name 等你、周岚/扉页2015、小满 — prose follows |
| **Anchor ops** | POV / emotion / ban phrases — weak structural |
| **Actual store** | **Absent** |
| **SR / Attribution / openLoops** | **Absent** |
| **Timeline** | Plan text; not proven as hard constraint |

```text
In this corpus, next-chapter story is Plan-led soft continuity,
not Actual-led Story-Truth enforcement.
```

---

## 5. Failure candidates

### FAILURE-001 — Production corpus has no persisted Actual

```text
FAILURE-001
Scene: Corpus-wide (8 books / 146 scenes)
Fact: Modern Story-Truth mainline expects Prose → Actual (HARD).
Expected: Continuous production persists actualEvents for next Scene/Chapter.
Actual: actualEvents = 0 everywhere; no character_sr; no attribution.
Existing system today (code): Actual path exists in Runtime/Studio (#39).
Failure locus: Production era / path gap — these runs predate or bypass persisted Actual.
Type: B (saved? NO) + systemic baseline gap
```

**Qualification (see §6):** REAL as **corpus observation**; does **not** by itself prove need for Story Survival — first prove **new** runs persist Actual, then re-test survival.

---

### FAILURE-002 — Plan briefs written into timeline as “events”

```text
FAILURE-002
Scene: Ch1–Ch2 Canon timeline
Fact: 11_timeline lists “承接上章推进：场景N：…” plan copy.
Expected: Timeline events = occurred Actual (EO-P2 / Evolution contract).
Actual: Plan-shaped pseudo-history.
Type: Pollution / wrong authority (Plan → State-like Canon)
```

**Note:** Current `resolveTimelineEvents` empties plan path; overlay is Actual-only. This failure is **historical corpus** + possible old writer. Re-verify on **next** MemoryUnit.commit after Actual-enabled run before claiming current code still does this.

---

### FAILURE-003 — Concrete Ch1 obligations do not constrain Ch2

```text
FAILURE-003
Scene: Chapter 1 → Chapter 2
Fact: 老周说「三天。下周三。」; 修好《陶庵梦忆》; 梧桐叶夹入图考; 摸旧钉.
Expected (literary pressure): Ch2 should feel residual obligation / object persistence
  OR explicitly defer with tracked pressure — not silently drop all but「等你」/橘味.
Actual: Ch2 pivots to 周岚/小满; 老周/下周三/陶庵/钉子/梧桐叶 absent from prose.
System had: Anchor (generic 对抗世界); timeline (plan); Plan contextFacts (summary);
  NO Actual; NO openLoop consumer; NO obligation object.
Failure locus: ??? mixed — Plan intentionally rotated visitors (volume notes) vs
  missing enforcement of open appointment.
Type candidates: D / E / F / G / H (see qualification)
```

---

### FAILURE-004 — Anchor relationship_state is non-informative

```text
FAILURE-004
Scene: Ch1 & Ch2 anchors
Fact: edges = 林守常→世界/系统 对抗 (template).
Expected: If relationship_state is meant to survive, it should reflect 老周/访客压力.
Actual: Same generic edge; expectedTransition “知情对抗” unrelated to bookstore guests.
Type: C (state exists) + ineffective / wrong content
```

---

### FAILURE-005 — In-memory Actual extract misses high-value acts; noise events

```text
FAILURE-005
Scene: Ch1 S1–S3 extract (read-only)
Fact: 「等你」纸片 / 「下周三」 speech not clearly extracted as first-class events;
  figurative lines may become actions.
Expected: Actual should ground next-stage continuity on high-value occurrences.
Actual: Sparse/noisy event set; openLoops=[].
Type: Extractor coverage (production quality) — not Choice/Survival ontology
```

---

## 6. Failure Qualification

### FAILURE-001

| Q | Answer |
|---|--------|
| Deterministic system failure? | **Corpus gap YES**; current Runtime code path exists — **not proven still failing on new runs** |
| Stable reproduce? | YES on this corpus |
| Violates frozen Story Truth? | Violates **intended** Actual mainline; frozen D1 not specifically “must have Actual on disk in Aug books” |
| Why can’t express? | At run time, Actual wasn’t persisted |
| Existing module solve? | **YES path exists**: ensureActualEvents + persist on scenes (#39) |
| Read / consume / semantic miss? | **Production wiring/persistence era** |
| Writer didn’t write? | N/A |
| Need new capability? | **NO** for this failure — need **Actual-enabled re-baseline** first |
| IRREPLACEABLE GAP? | **NOT PROVEN** |

### FAILURE-002

| Q | Answer |
|---|--------|
| Deterministic? | On this corpus YES |
| Current code still? | **UNKNOWN** until new commit with Actual — design forbids Plan→timeline |
| Need new module? | **NO** — verify/regress existing EO-P2 Evolution |
| IRREPLACEABLE GAP? | **NOT PROVEN** |

### FAILURE-003

| Q | Answer |
|---||--------|
| Deterministic system failure? | **UNKNOWN** — volume plan *schedules* 老周 later (visitor sequence); may be **H literary choice** |
| Reproducible pattern? | Plan-led thread rotation with soft hook retention (等你) — **YES as pattern** |
| Violates frozen Story Truth? | **NO sealed contract** says every speech appointment must hard-constrain next chapter |
| Expressible today? | Partially via **Plan/Director contextFacts** (Ch3 plan *remembers* Ch1–2 summaries); **not** via Actual obligation enforcement |
| Existing module solve? | Possible **A**: richer Plan/Director carry of open threads; **B**: Actual→Writer soft already designed; **C**: Survival — **not proven necessary** |
| Writer ignore? | Ch2 Writer followed **Ch2 goals**, not Ch1 appointment |
| Need new capability? | **NOT YET** — must separate intentional deferral (H) from untracked broken promise after Actual-enabled runs |
| IRREPLACEABLE GAP? | **NOT PROVEN** |

### FAILURE-004 / 005

| | |
|--|--|
| Need Story Survival / Choice? | **NO** |
| IRREPLACEABLE GAP? | **NOT PROVEN** |

---

## 7. Irreplaceable Gap (this EO)

```text
IRREPLACEABLE GAP = NOT PROVEN
```

**Reasons:**

1. No live Actual-enabled multi-chapter run was possible this session → cannot claim Actual→next is broken **under current code**.  
2. Strongest hard finding (no persisted Actual) is solved by **using existing path**, not new ontology.  
3. Literary drop of 老周/下周三 is **not yet** distinguished from intentional multi-visitor pacing (H).  
4. #35–#39 forbid inventing Survival/Choice from diagram anxiety.

```text
NEXT DESIGN GATE = NOT AUTHORIZED from this baseline alone
```

---

## 8. Answers to required deliverables

| # | Deliverable | Result |
|---|-------------|--------|
| 1 | Production run record | Forensic: 二手书店 Ch1–2 (+ corpus Actual=0); live LLM **blocked** |
| 2 | Scene→Actual→Next Scene | Actual **absent** on disk; soft prose/goal continuity only |
| 3 | Chapter→Next Chapter | Anchor ops + Plan goals; timeline plan-polluted; no SR/Attr/openLoops |
| 4 | Facts that changed later story | 「等你」、橘味、植物名实图考; Plan-introduced 周岚/小满 |
| 5 | Facts that did not | 老周/下周三/陶庵/钉子/梧桐叶 (Ch2) |
| 6 | Reproducible literary failures | FAILURE-001…005 (candidates) |
| 7 | Qualification | §6 — none reach IRREPLACEABLE GAP PROVEN |
| 8 | Existing capability enough? | **Likely for 001/002/005**; **003 needs Actual-enabled literary re-test** |
| 9 | Irreplaceable Gap | **NOT PROVEN** |
| 10 | Enter Design Gate? | **NO — STOP** (or Human-only: Actual-enabled production re-baseline) |

---

## 9. Recommended next step (Human-gated only)

```text
NOT authorized automatically:

❌ Story Survival implementation
❌ Attribution reader
❌ SR cross-chapter handoff
❌ Choice Engine
❌ Phase 5/6/7 unfreeze
❌ Another Consumer Archaeology
```

```text
Authorized only by Human EO:

1) REAL PRODUCTION RE-BASELINE (Actual-enabled)
   - Provide LLM credentials / Studio run
   - Run ≥2 chapters × ≥3 scenes on a dedicated book
   - Persist Actual / (soft) SR / Attribution / Evolution
   - Re-score fact survival + FAILURE-003 style obligations
   - Still NO CODE changes unless a Named EO says so

2) If after (1) a failure is:
   REAL + REPRODUCIBLE + cannot express/enforce with existing paths
   → Failure Qualification PASS
   → then Design Gate (compare extend Actual/State vs Director consume vs new Survival)
```

---

## 10. Freeze reminder

```text
#35–#39 = SEALED BASELINE
No further Phase 4.4 Consumer Archaeology.

This #40 = Production Baseline / Failure Discovery only.
PASS as archaeology of real production constraints.
NOT a build order.
```

---

## 11. Final

```text
40 = PASS (baseline discovery complete)

LIVE LLM MULTI-CHAPTER RUN = BLOCKED BY ENVIRONMENT
FORENSIC MULTI-CHAPTER PRODUCTION = OBSERVED

IRREPLACEABLE GAP = NOT PROVEN
DESIGN GATE = NOT ENTERED
CODE CHANGED = NO

CHOICE = NOT AUTHORIZED
CANDIDATE OPTION = NOT AUTHORIZED
L2 = NOT ENTERED
L1 PRODUCTION MOUNT = NOT AUTHORIZED
PHASE 5 = FROZEN
PHASE 6 = NOT STARTED
PHASE 7 = NOT STARTED

STOP
```

```text
The first real breakpoint exposed is not “missing Story Survival module.”

It is: real books were produced without persisted Actual,
and next-chapter continuity was Plan-led soft memory —
while concrete obligations can silently drop without system enforcement.

Until Actual-enabled continuous production is re-baselined,
do not invent Phase 6/7/Choice to close a diagram.
```
