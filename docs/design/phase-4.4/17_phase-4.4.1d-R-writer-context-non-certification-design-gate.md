# 17 — Phase 4.4.1d-R Writer Context Non-Certification Design Gate

```text
PHASE 4.4.1d-R
WRITER CONTEXT NON-CERTIFICATION
DESIGN GATE

MODE: READ-ONLY DESIGN / NO CODE
UPSTREAM:
  4.4.1a–1c          SEALED
  4.4.1d Audit (#16) COMPLETE
  4.4.1d Impl        BLOCKED
  Phase 5            FROZEN
  Golden / L1 / v0.2 UNCHANGED

STATUS:
  DESIGN GATE        COMPLETE
  §1–§2              ALIGN / APPROVED (Human)
  §3                 AMEND + SEALED (Authorial Planned Direction only; no union)
  §9 P-R1–P-R12      SEALED (Human)
  IMPLEMENTATION     EO-4.4.1d-R-S1 only (when authorized) · S2–S5 NOT APPROVED
  STOP               after each EO slice · FOR HUMAN REVIEW
```

**Target:** AA20 — Writer Context must not certify Plan / causal_chain / Desire / Pressure / Situation / SR / Occurrence as Character Choice, Attribution, or Character Causal Fact.

**Non-goal:** Kill all Writer “causality.” Preserve novel-production fuel. Kill **certificate-shaped** narrative laundering only.

```text
Narrative Causality  ≠  Character Causality
Narrative Track      ≠  Attribution Track
```

---

## 0. Dual-track freeze (proposed)

```text
         STORY / NARRATIVE TRACK                    CHARACTER ATTRIBUTION TRACK
                    │                                         │
 Plan / Situation / Desire / Pressure                      Prose
                    │                                         ↓
                    ↓                                    TypedEvidence
              Writer Context                                  ↓
                    │                                    Attribution Gate
                    ↓                                         ↓
                  Writer                              PASS / UNKNOWN / INVALID
                    │                                         ↓
                    ↓                                      Registry
                  Prose                                       ↓
                    │                              Character Causal History
                    ↓                                    (PASS projection)
               Occurrence
                    ↓
            Actual / State / SR
                    │
                    └──→ Future Narrative Context

Tracks MAY exchange information.
Narrative Track MUST NEVER impersonate Attribution Track.
```

Legal production path (must remain):

```text
Plan → Writer → Prose → Occurrence → Actual → State / SR → Future Context
```

Illegal auto-upgrade:

```text
… → Actual  ⇏  Character-attributable Action
… → Actual  ⇏  Character Choice
… → Actual  ⇏  Character Causal History
```

Attribution remains sole mint:

```text
Prose → Evidence → Gate → Registry
```

---

## 1. Writer Context semantic taxonomy (R1)

Authority levels (design):

| Level | Meaning |
|-------|---------|
| **N0** | Style / craft / format only |
| **N1** | Narrative guidance (direction, pressure, desire-as-plan) |
| **N2** | Continuity fuel (what text already showed) — Occurrence-shaped |
| **N3** | Subjective fuel (what character knows/believes) — SR-shaped |
| **X** | **Forbidden as certificate** — must not imply Choice / Attribution / Causal History Authority |

No confidence / score / heuristic may raise level toward Authority.

### 1.1 Taxonomy table

| Context class | Primary sources today | Semantic role | Auth | Narrative guidance? | Evidence for Gate? | May imply Character Choice? | May imply Attribution? | May become system fact? |
|---------------|----------------------|---------------|------|---------------------|--------------------|----------------------------|------------------------|-------------------------|
| **Authored / chapter plan** | intent goals, scene goal/conflict, authored choice/climax slots | Authorial direction | N1 | YES | NO | **NO** (must not) | NO | NO via Writer |
| **causal_chain** | `ensureChapterCausalChain` → `renderCausalChain` L1+P1 | Plan sketch / narrative constraint package | N1→**X if certificate-worded** | YES | **NO** (FORBIDDEN source) | **NO** | NO | NO |
| **causal_chain.choice** | authored plan choice/climax projected | See §3 ruling | N1 | YES | NO | **NO** under proposed ruling | NO | NO |
| **Desire (Director)** | `formatCharacterDesireBlock` | Character-facing narrative push (plan-derived) | N1 | YES | NO | NO | NO | NO |
| **Pressure / Conflict** | causal pressure; `formatConflictBlock` | Obstacle / risk fuel | N1 | YES | NO | NO | NO | NO |
| **Situation** | `formatSituationBlock` | World/relationship situation fuel | N1 | YES | **NO** (AA20) | NO | NO | NO |
| **Beat plan / Beat choice** | `formatBeatPlan`, beat-state, `deriveSceneChoice` | Scene execution instruction | N1 | YES | NO | NO | NO | NO |
| **Beat EXPECTED Before/After** | beat-state / narrative-renderer | Expected narrative target ≠ Actual | N1 | YES | NO | NO | NO | NO |
| **Actual Events (N+1)** | `formatActualEventsBlock` | Occurrence read-back | N2 | continuity | YES (as Occurrence Evidence only) | **NO** | **NO auto** | Occurrence yes; Attribution only via Gate |
| **Observed Continuity** | `formatObservedContinuityBlock` | Scene-local occurrence projection | N2 | YES | fuel only | NO | NO | NO Attribution |
| **Character SR** | `formatCharacterSRForPrompt` | Subjective slots | N3 | YES | YES (SR Evidence under FG-1) | NO | NO alone | NO Attribution alone |
| **Timeline / facts / memory** | ranked timeline, story-memory | World/history continuity | N1–N2 | YES | limited | NO | NO | Canon≠Attribution |
| **Character cards / bible** | public card projection | Setting fuel | N1 | YES | NO | NO | NO | NO |
| **Story Clock / IB** | F1 protected | Meta continuity / knowledge wall | N0–N1 | YES | NO | NO | NO | NO |
| **Craft / guardrails / golden** | P0 policies | Style | N0 | NO | NO | NO | NO | NO |
| **Attribution Registry** | *(not in prompts today)* | Character Causal History | — | — | — | — | — | PASS only |

**D5 note:** Director Situation / Desire / Beat Choice are **parallel N1 densifiers**; deferred (§8).

---

## 2. Certificate-language inventory (R3)

### 2.1 Primary offenders (`renderCausalChain`)

| Current wording | Current semantics | Risk | Certificate-shaped? | Design substitute (proposal only) |
|-----------------|-------------------|------|---------------------|-----------------------------------|
| `### 因果链（已确定，禁止重推因果）` | Chain is settled fact; Writer must not re-derive | Frames plan as ontological causality | **YES** | `### Narrative Causal Sketch（作者向 · 非角色已决事实）` + `不得另造对立主线；≠ Character Choice / Attribution` |
| `Chosen（已选）: … —— 由「X」做出` | Character already chose | Direct Character Choice certificate | **YES** | `Authored direction / Planned action beat: …（执行导航；≠ Character Choice Fact）` |
| `Options…不得另选` | Options locked as chosen set | OK as authorial constraint; dangerous next to “Chosen” | **PARTIAL** | `Authored option space（文学化表达允许；不得升级为已选事实）` |
| `后果（consequence）:` paired with Chosen | Paid cost of choice | Choice→Consequence certificate pair | **YES** when choice present | `Authored / Declared outcome（剧情约束）` always; reserve “Choice consequence” for future Choice Seal only |
| `此选择由世界角色「X」做出` | Assigns chooser | Character Choice actor certificate | **YES** | `若呈现该方向，行动主体叙事焦点为「X」（≠ Attribution / Choice mint）` |
| Comment in source: Writer不得改变已选选项 | Treats options as selected | Certificate in engineering voice | **YES** | “不得违背 authored direction” |

### 2.2 Adjacent / secondary (Narrative Track — monitor)

| Wording | Where | Risk | Certificate? | Design stance |
|---------|-------|------|--------------|---------------|
| `下一场必须承接这些已发生事实` | Actual Events | Occurrence continuity OK; “事实” easy to read as attributable deed | **PARTIAL** | Keep continuity; add Occurrence ≠ Attribution header (§4) |
| `actors · action` line | Actual Events | Natural-language Attribution | **PARTIAL** | Relabel as Occurrence Event (§4) |
| `后果：` under Actual | Actual Events | Consequence without Choice Seal | **PARTIAL** | `text-noted aftermath（Occurrence）` |
| `confirmed（上一场已发生）` | Observed Continuity | Occurrence OK | NO if scoped | Keep + “≠ Attribution” |
| Beat `Choice` / `POV 必须…做出选择` | Director beat-state | Pushes decision prose | **N1 densifier** | **D5 deferred** |
| `Character Goal · 角色必推进` | Desire block | Strong push | N1 | D5 |
| `勿写成人物已选定并已承担结果` | Conflict block | Already anti-certificate | Good | Preserve pattern |
| `Before/After = EXPECTED TARGET ≠ Actual` | Beat state | Correct demotion | Good | Preserve |
| SR `禁止写成…已经知道` | Minimal SR | Anti-certificate | Good | Preserve / extend to action ownership |

**Writer prose** may still contain “她决定了”. That is **new Prose → Occurrence**, not Context certificate (AA3/AA20).

---

## 3. causal_chain.choice semantic ruling (R2)

### 3.1 Options considered

| ID | Definition | Violates Plan≠Choice Authority? |
|----|------------|----------------------------------|
| A | Authorial planned direction | No |
| B | Candidate narrative path | No |
| C | Scene execution instruction | No (if not “character already chose”) |
| D | **Character Choice** | **YES — forbidden** |
| E | Other | — |

### 3.2 Design ruling — HUMAN SEALED (AMEND)

```text
STATUS: SEALED (Human Review of #17)

causal_chain.choice
  = Authorial Planned Direction   (Writer-facing semantic only)
  ≠ Character Choice
  ≠ Choice Authority
  ≠ Attribution
  ≠ Consequence Authority
  ≠ Scene Execution Instruction   (DO NOT UNION)

If Scene Execution Instruction is needed later:
  → separate N1 execution-guidance field / Design Gate
  → NOT unioned with causal_chain.choice
```

**P-R5 (sealed):** `causal_chain.choice = Authorial Planned Direction`

Field rename / Chosen demotion / `authoredDirection` projection = **S2+** (not S1).

---

## 4. Actual Event read-back boundary (R4)

### 4.1 Allowed meaning

```text
Occurrence Event (N+1 Writer Context)
  = what prior scene TEXT presented as having happened
  = continuity fuel
  ≠ Character-attributable Action
  ≠ proof of Agency / intentionality
  ≠ Character Causal History
```

### 4.2 Must not delete

Actual Events remain required for continuity (`必须承接` / demoted plan bridge). Deletion would break Plan Validity / Scene join.

### 4.3 Minimal non-certification expression (design)

Proposed Writer-facing shape:

```text
### Previous Scene Occurrence Events
> role: occurrence_readback (continuity only)
> ≠ Attribution  ≠ Character Choice  ≠ Character Causal History
> ≠ proof that named actors intentionally chose the action

- [S2/action] participants: Alice · reported happening: 推开门走进房间
  text-aftermath: …
  state_mentions: …
```

Avoid:

```text
Alice · 推开门   → readable as “Alice did (attributably)”
后果：           → readable as Choice consequence
已发生事实       → without Occurrence qualifier
```

Gate may still take Occurrence as **Evidence**; Context must not pre-certify PASS.

---

## 5. SR read-back boundary (R5)

### 5.1 Allowed → Writer

| Slot | OK as context |
|------|----------------|
| awareness | what character is treated as aware of (property / info) |
| belief | what they believe |
| stance | attitude |
| motive / desire-as-SR | only if already legal SR source |
| interpretation / affect | subjective |

Existing IB lines (“禁止写成已经知道”) are aligned; keep.

### 5.2 Forbidden auto-implications

```text
SR → Writer OK
SR → “performed X” / “chose X” / causal ownership / intentionality  FORBIDDEN
SR ≠ Causal History Authority (AA19)
SR alone ≠ Attribution (Gate may use as Evidence only)
```

Design: if awareness items are agent-shaped (“我离开了房间”), prompt must label **subjective report ≠ Attribution**.

---

## 6. Plan → Writer → Prose → Actual legal boundary (R6)

| Step | Legal? | Note |
|------|--------|------|
| Plan → Writer | **YES** | Narrative guidance |
| Writer → Prose | **YES** | May include decision-shaped language |
| Prose → Occurrence / Actual | **YES** | Text-grounded; Phase 1 |
| Actual → State / SR | **YES** | Phase 2–3; independent of Attribution |
| Actual → “Character Causality established” | **NO** | Requires Gate PASS → Registry |
| Plan → Registry / Choice mint | **NO** | |
| Context “Chosen” → treat as Choice Fact | **NO** | AA20 |

```text
ALLOWED:  Narrative Track full loop
FORBIDDEN: Narrative Track impersonating Attribution Track
REQUIRED: Attribution only via Evidence → Gate → Registry
```

---

## 7. D1 / D2 / D4 design comparison (R7)

| | **D1** Demote certificate language | **D2** Choice≠Writer Chosen fact | **D4** Occurrence label on Actual read-back |
|--|--------------------------------------|-----------------------------------|-----------------------------------------------|
| **Solves** | AA20 certificate header/Chosen wording; attacks #1–2, #13 partially | Implicit Choice authority; #2, #13 core | N+1 Attribution misread; #3–4, #12 partially; AA18 surface |
| **Does not solve** | Parallel Desire/Situation/Beat (D5); dual-channel duplication alone; Registry unread | Upstream desire/pressure densify; Actual line shape | Upstream Chosen densify; decision prose birth |
| **Regression risk** | Writer may ignore softer plan | Authored climax may under-execute | Writers may under-weight continuity if over-hedged |
| **Narrative-quality risk** | Medium if over-softened | Medium–High if direction too weak | Low if continuity verbs kept |
| **Architecture risk** | Low (prompt-only) | Low–Medium (field semantics) | Low (prompt-only) |
| **Studio dual channel** | Must change **shared** `renderCausalChain` (fixes L1+P1 together) | Same | L1 + L4 beat1 Actual blocks |
| **N+1** | Indirect | Indirect | Direct |
| **Frozen boundaries** | Aligns AA20; must not touch Gate/Registry/Actual extract | Aligns Plan≠Choice; must not mint Choice IDs | Aligns Occurrence≠Attribution; must not delete Actual |

### Combination (design tendency — **not frozen**)

```text
D1 + D2 + D4
  = complementary layers on ONE residual
D1/D2 = upstream certificate kill
D4    = downstream fuse

Each independently necessary for AA20 closure on this residual:
  D1 alone → Chosen may remain under other labels
  D2 alone → header still “已确定”
  D4 alone → new densified prose still born upstream
```

**D0 rejected** (Human): accepts laundering.  
**D5 deferred** (§8).

---

## 8. D5 deferred scope

```text
FUTURE DESIGN GATE (not this round):
  Director Situation / Desire / Beat Choice / Beat-state “必须做出选择”
  = parallel N1 densifiers

Do NOT fold into first AA20 implementation mega-PR.
```

---

## 9. Frozen principles — HUMAN SEALED

```text
STATUS: SEALED (Human Review of #17)

P-R1  Narrative Causality ≠ Character Causality
P-R2  Narrative Track ≠ Attribution Track
P-R3  Writer Context ≠ Character Fact certificate
P-R4  Plan / Reasoner / causal_chain.choice ≠ Character Choice
P-R5  causal_chain.choice = Authorial Planned Direction
      (≠ Scene Execution Instruction union)
P-R6  Occurrence Event read-back ≠ Attribution / Agency proof
P-R7  SR → Writer OK; SR → Choice/Attribution Authority FORBIDDEN
P-R8  Plan→Writer→Prose→Actual legal; auto Character Causality ILLEGAL
P-R9  Sole Attribution mint: Evidence → Gate → Registry (unchanged)
P-R10 AA20 remediation ≠ new Causality/Choice Engine; ≠ Phase 5; ≠ Gate Actual on PASS
P-R11 No confidence densification as wall bypass
P-R12 D5 parallel densifiers = separate Gate
```

---

## 10. Implementation slices proposed (NOT authorized)

Only after Human: `4.4.1d-R IMPLEMENTATION APPROVED` with selected slice set.

| Slice | Scope | Out of scope |
|-------|-------|--------------|
| **S1 (D1)** | Rewrite `renderCausalChain` certificate strings; update source comments | No reasoner logic change; no delete chain |
| **S2 (D2)** | Stop emitting Chosen/已选/由X做出; expose authoredDirection wording; keep authored constraint strength without Choice Fact | No Choice object mint; no Writer Choice IDs |
| **S3 (D4)** | `formatActualEventsBlock` (+ L4 uses) Occurrence labeling | No Actual extractor change; no State/SR/Attribution change |
| **S4** | Shared tests: prompt snapshot / string absence of Chosen|已确定证书; Occurrence header present | No Golden plot edits |
| **S5** | Provenance note: channels remain dual but both non-certifying | No L1/P1 merge required in first slice |

**Explicit non-slices:** Registry, Gate, cues, Actual extraction, State, SR updater, Phase 5, D5, delete `causal_chain`, Attribution PASS gates.

Recommended order if approved: **S1 → S2 → S3 → S4** (S1+S2 may land together if Human wants single `renderCausalChain` PR).

---

## 11. Formal status

```text
4.4.1d-R DESIGN GATE     COMPLETE
§1–§2                    ALIGN / APPROVED
§3                       AMEND + SEALED
§9 P-R1–P-R12            SEALED
EO-4.4.1d-R-S1           COMPLETE — STOP FOR HUMAN REVIEW
S2–S5                    NOT APPROVED
Phase 4.4 overall        NOT SEALED
Phase 5                  FROZEN
```

---

## STOP FOR HUMAN REVIEW

```text
NO CODE
NO D1/D2/D4 auto-implement
NO causal_chain deletion
NO Writer / Prompt / Studio / Actual / State / SR / Attribution edits
NO Phase 5
```
